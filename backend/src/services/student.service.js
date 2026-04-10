const { serviceClient } = require('../config/supabase');
const AppError = require('../helpers/AppError');
const { extractResumeSkills } = require('./ai.service');
const { getStudentByUserId, getUserById } = require('./common.service');
const { computeTrustScore } = require('../helpers/trustScore');

function normalizeSkills(skills = []) {
  return [...new Set(skills.map((skill) => String(skill).trim()).filter(Boolean))];
}

function matchesEligibility(student, job) {
  const rules = job.eligibility_rules || {};
  const requiredSkills = job.required_skills || [];

  if (rules.min_cgpa && Number(student.cgpa) < Number(rules.min_cgpa)) {
    return false;
  }

  if (rules.max_backlogs !== undefined && Number(student.active_backlogs) > Number(rules.max_backlogs)) {
    return false;
  }

  if (Array.isArray(rules.departments) && rules.departments.length > 0 && !rules.departments.includes(student.department)) {
    return false;
  }

  if (Array.isArray(rules.graduation_years) && rules.graduation_years.length > 0 && !rules.graduation_years.includes(student.graduation_year)) {
    return false;
  }

  if (requiredSkills.length > 0) {
    const knownSkills = new Set([...(student.skills || []), ...(student.parsed_resume_skills || [])].map((skill) => skill.toLowerCase()));
    const matchingSkills = requiredSkills.filter((skill) => knownSkills.has(skill.toLowerCase()));
    if (matchingSkills.length === 0) {
      return false;
    }
  }

  return true;
}

async function listCollegesWithBatches() {
  const { data: colleges, error } = await serviceClient
    .from('colleges')
    .select('id, code, name, domain, location')
    .eq('status', 'approved')
    .order('name');

  if (error) {
    throw new AppError(500, 'Failed to load colleges');
  }

  const { data: batches, error: batchError } = await serviceClient
    .from('batches')
    .select('id, college_id, name, graduation_year, department')
    .eq('status', 'active')
    .order('graduation_year');

  if (batchError) {
    throw new AppError(500, 'Failed to load batches');
  }

  return (colleges || []).map((college) => ({
    ...college,
    batches: (batches || []).filter((batch) => batch.college_id === college.id),
  }));
}

async function getProfile(userId) {
  return getStudentByUserId(userId);
}

async function upsertProfile(userId, payload) {
  const user = await getUserById(userId);

  if (!['student', 'alumni'].includes(user.role_code)) {
    throw new AppError(403, 'Only students and alumni can update student profiles');
  }

  const { data: batch, error: batchError } = await serviceClient
    .from('batches')
    .select('*')
    .eq('id', payload.batchId)
    .eq('status', 'active')
    .single();

  if (batchError || !batch) {
    throw new AppError(400, 'Selected batch is invalid');
  }

  const studentPayload = {
    user_id: userId,
    college_id: batch.college_id,
    batch_id: batch.id,
    department: batch.department,
    graduation_year: batch.graduation_year,
    enrollment_number: payload.enrollmentNumber,
    cgpa: payload.cgpa ?? 0,
    active_backlogs: payload.activeBacklogs ?? 0,
    history_backlogs: payload.historyBacklogs ?? 0,
    skills: normalizeSkills(payload.skills),
    preferred_role: payload.preferredRole,
    linkedin_url: payload.linkedinUrl,
    github_url: payload.githubUrl,
    is_alumni: user.role_code === 'alumni',
  };

  const { data, error } = await serviceClient
    .from('students')
    .upsert(studentPayload, { onConflict: 'user_id' })
    .select(`
      *,
      batch:batches(*),
      college:colleges(id, name, code, domain, slug, location, status)
    `)
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to save student profile');
  }

  return data;
}

async function uploadResume(userId, file) {
  if (!file) {
    throw new AppError(400, 'Resume file is required');
  }

  const student = await getStudentByUserId(userId, { required: true });

  const fileName = `students/${student.id}/${Date.now()}-${file.originalname}`;
  const upload = await serviceClient.storage.from('resumes').upload(fileName, file.buffer, {
    contentType: file.mimetype,
    upsert: true,
  });

  if (upload.error) {
    throw new AppError(500, 'Failed to upload resume');
  }

  const { data: publicUrlData } = serviceClient.storage.from('resumes').getPublicUrl(fileName);
  const extracted = await extractResumeSkills(file);

  const mergedSkills = normalizeSkills([
    ...(student.skills || []),
    ...((extracted.skills || extracted.extracted_skills) || []),
  ]);

  const updatePayload = {
    resume_url: publicUrlData.publicUrl,
    skills: mergedSkills,
    parsed_resume_skills: normalizeSkills((extracted.skills || extracted.extracted_skills) || []),
  };

  // Enforce updating profile with AI extracted data if student fields are empty
  if (!student.linkedin_url && extracted.linkedin_url) {
    updatePayload.linkedin_url = extracted.linkedin_url;
  }
  if (!student.preferred_role && extracted.preferred_role) {
    updatePayload.preferred_role = extracted.preferred_role;
  }
  if (!student.department && extracted.department) {
    updatePayload.department = extracted.department;
  }

  const { data, error } = await serviceClient
    .from('students')
    .update(updatePayload)
    .eq('id', student.id)
    .select(`
      *,
      batch:batches(*),
      college:colleges(id, name, code, domain, slug, location, status)
    `)
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to update student resume profile');
  }

  // Update name and email in users table if parsed
  if (extracted.name || extracted.email) {
    const userUpdatePayload = {};
    if (extracted.name) {
      userUpdatePayload.full_name = extracted.name;
    }
    if (extracted.email) {
      userUpdatePayload.email = extracted.email;
    }

    const { error: userError } = await serviceClient
      .from('users')
      .update(userUpdatePayload)
      .eq('id', userId);

    if (userError) {
      console.error('Failed to update user profile with extracted data:', userError);
      // Not throwing AppError here so we don't fail the whole resume upload
    }
  }

  await serviceClient.from('student_documents').insert({
    student_id: student.id,
    document_type: 'resume',
    storage_path: fileName,
    public_url: publicUrlData.publicUrl,
    verification_status: 'verified',
  });

  return {
    profile: data,
    extracted_data: extracted,
    resume_url: publicUrlData.publicUrl,
  };
}

async function getEligibleJobs(userId) {
  const student = await getStudentByUserId(userId, { required: true });

  const { data: groupMemberships } = await serviceClient
    .from('group_membership')
    .select('group_id')
    .eq('student_id', student.id);

  const groupIds = new Set((groupMemberships || []).map((membership) => membership.group_id));

  const { data: jobs, error } = await serviceClient
    .from('jobs')
    .select(`
      *,
      employer:employers(id, company_name, verification_status, credibility_score, company_logo_url),
      ai_review:job_ai_reviews(*)
    `)
    .in('status', ['approved', 'restricted', 'under_review'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load jobs');
  }

  const { data: assignments } = await serviceClient
    .from('job_assignments')
    .select('*')
    .eq('college_id', student.college_id)
    .in('visibility_status', ['approved', 'restricted']);

  const assignmentMap = new Map();
  for (const assignment of assignments || []) {
    if (!assignmentMap.has(assignment.job_id)) {
      assignmentMap.set(assignment.job_id, []);
    }
    assignmentMap.get(assignment.job_id).push(assignment);
  }

  const { data: applications } = await serviceClient
    .from('applications')
    .select('job_id, status')
    .eq('student_id', student.id);

  const applicationMap = new Map((applications || []).map((application) => [application.job_id, application.status]));

  const { data: saved } = await serviceClient
    .from('saved_jobs')
    .select('job_id')
    .eq('student_id', student.id);

  const savedJobIds = new Set((saved || []).map((item) => item.job_id));

  const feed = [];

  for (const job of jobs || []) {
    let visible = false;
    let scope = 'public';

    if (job.distribution_mode === 'off_campus_public' && job.status === 'approved') {
      visible = true;
      scope = 'global';
    } else if (job.distribution_mode === 'campus_cdc') {
      const jobAssignments = assignmentMap.get(job.id) || [];
      // For campus CDC jobs: visibility is driven by the assignment approval,
      // not the job-level status. The CDC's review is the gate.
      visible = jobAssignments.some((assignment) => {
        const batchMatches = !assignment.batch_id || assignment.batch_id === student.batch_id;
        const groupMatches = !assignment.group_id || groupIds.has(assignment.group_id);
        return batchMatches && groupMatches;
      });
      scope = visible ? 'college' : scope;
    }

    if (!visible || !matchesEligibility(student, job)) {
      continue;
    }

    feed.push({
      ...job,
      application_status: applicationMap.get(job.id) || null,
      is_saved: savedJobIds.has(job.id),
      discussion_scope: scope,
    });
  }

  // Batch fetch votes for all eligible job IDs at once
  const feedJobIds = feed.map((j) => j.id);
  let votesByJob = {};
  if (feedJobIds.length > 0) {
    const { data: allVotes } = await serviceClient
      .from('votes')
      .select('job_id, vote_type, weight')
      .in('job_id', feedJobIds);
    for (const vote of allVotes || []) {
      if (!votesByJob[vote.job_id]) votesByJob[vote.job_id] = [];
      votesByJob[vote.job_id].push(vote);
    }
  }

  const enrichedFeed = feed.map((job) => {
    const jobVotes = votesByJob[job.id] || [];
    const { score } = computeTrustScore(jobVotes);
    return {
      ...job,
      trust_score: jobVotes.length > 0 ? score : null,
      vote_count: jobVotes.length,
      upvotes: jobVotes.filter((v) => v.vote_type === 'upvote').length,
      downvotes: jobVotes.filter((v) => v.vote_type === 'downvote').length,
      reports: jobVotes.filter((v) => v.vote_type === 'report_scam').length,
    };
  });

  return {
    profile: student,
    jobs: enrichedFeed,
  };
}

async function getSavedJobs(userId) {
  const student = await getStudentByUserId(userId, { required: true });
  const { data, error } = await serviceClient
    .from('saved_jobs')
    .select(`
      created_at,
      job:jobs(
        *,
        employer:employers(id, company_name, credibility_score, verification_status, company_logo_url),
        ai_review:job_ai_reviews(*)
      )
    `)
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load saved jobs');
  }

  return data || [];
}

async function toggleSavedJob(userId, jobId) {
  const student = await getStudentByUserId(userId, { required: true });
  const { data: existing } = await serviceClient
    .from('saved_jobs')
    .select('id')
    .eq('student_id', student.id)
    .eq('job_id', jobId)
    .maybeSingle();

  if (existing) {
    await serviceClient.from('saved_jobs').delete().eq('id', existing.id);
    return { saved: false };
  }

  const { error } = await serviceClient.from('saved_jobs').insert({
    student_id: student.id,
    job_id: jobId,
  });

  if (error) {
    throw new AppError(500, 'Failed to save job');
  }

  return { saved: true };
}

async function getApplications(userId) {
  const student = await getStudentByUserId(userId, { required: true });
  const { data, error } = await serviceClient
    .from('applications')
    .select(`
      *,
      job:jobs(
        *,
        employer:employers(id, company_name, verification_status, credibility_score, company_logo_url),
        ai_review:job_ai_reviews(*)
      )
    `)
    .eq('student_id', student.id)
    .order('applied_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load applications');
  }

  return data || [];
}

module.exports = {
  acceptInvitation,
  getApplications,
  getCampusDrives,
  getEligibleJobs,
  getProfile,
  getSavedJobs,
  listCollegesWithBatches,
  listMyInvitations,
  matchesEligibility,
  toggleSavedJob,
  updateProfile: upsertProfile,
  uploadResume,
};

async function getCampusDrives(userId) {
  const student = await getStudentByUserId(userId, { required: true });

  // Must have a college to get campus drives
  if (!student.college_id) {
    return { jobs: [], batch: student.batch || null };
  }

  // Query 1: batch-specific assignments (only if student has a batch)
  let batchAssignments = [];
  if (student.batch_id) {
    const { data, error } = await serviceClient
      .from('job_assignments')
      .select(`
        *,
        job:jobs(
          *,
          employer:employers(id, company_name, verification_status, credibility_score, company_logo_url),
          ai_review:job_ai_reviews(*)
        )
      `)
      .eq('college_id', student.college_id)
      .eq('batch_id', student.batch_id)
      .in('visibility_status', ['approved', 'restricted'])
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to load campus drives');
    batchAssignments = data || [];
  }

  // Query 2: group-based assignments
  let groupAssignments = [];
  const { data: memberships } = await serviceClient
    .from('group_membership')
    .select('group_id')
    .eq('student_id', student.id);

  const groupIds = (memberships || []).map(m => m.group_id);
  if (groupIds.length > 0) {
    const { data, error } = await serviceClient
      .from('job_assignments')
      .select(`
        *,
        job:jobs(
          *,
          employer:employers(id, company_name, verification_status, credibility_score, company_logo_url),
          ai_review:job_ai_reviews(*)
        )
      `)
      .eq('college_id', student.college_id)
      .in('group_id', groupIds)
      .in('visibility_status', ['approved', 'restricted'])
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to load campus drives');
    groupAssignments = data || [];
  }

  // Query 3: college-wide assignments (batch_id IS NULL AND group_id IS NULL)
  const { data: collegeWideAssignments, error: cwError } = await serviceClient
    .from('job_assignments')
    .select(`
      *,
      job:jobs(
        *,
        employer:employers(id, company_name, verification_status, credibility_score, company_logo_url),
        ai_review:job_ai_reviews(*)
      )
    `)
    .eq('college_id', student.college_id)
    .is('batch_id', null)
    .is('group_id', null)
    .in('visibility_status', ['approved', 'restricted'])
    .order('created_at', { ascending: false });

  if (cwError) throw new AppError(500, 'Failed to load campus drives');

  const allAssignments = [...batchAssignments, ...groupAssignments, ...(collegeWideAssignments || [])];

  // Deduplicate by job_id (prefer batch-specific assignment if both exist)
  const seen = new Set();
  const uniqueJobs = [];
  for (const assignment of allAssignments) {
    if (assignment.job && !seen.has(assignment.job.id)) {
      seen.add(assignment.job.id);
      uniqueJobs.push({
        ...assignment.job,
        assignment_id: assignment.id,
        visibility_status: assignment.visibility_status,
        batch_id: assignment.batch_id,
      });
    }
  }

  return { jobs: uniqueJobs, batch: student.batch || null };
}

// ─── Student Invitations ─────────────────────────────────────────────────────

async function listMyInvitations(userId) {
  const user = await getUserById(userId);
  const { data, error } = await serviceClient
    .from('student_invitations')
    .select(`
      *,
      college:colleges(id, name, code, location, logo_url),
      batch:batches(id, name, department, graduation_year)
    `)
    .eq('email', user.email.toLowerCase())
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'Failed to load invitations');
  return data || [];
}

async function acceptInvitation(userId, invitationId, reqMeta = {}) {
  const user = await getUserById(userId);

  // Fetch and validate invitation
  const { data: invitation, error: invErr } = await serviceClient
    .from('student_invitations')
    .select(`*, college:colleges(*), batch:batches(*)`)
    .eq('id', invitationId)
    .eq('email', user.email.toLowerCase())
    .single();

  if (invErr || !invitation) throw new AppError(404, 'Invitation not found');
  if (invitation.status !== 'pending') throw new AppError(400, 'This invitation is no longer valid');
  if (new Date(invitation.expires_at) < new Date()) {
    // Mark as expired
    await serviceClient
      .from('student_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId);
    throw new AppError(400, 'This invitation has expired');
  }

  // Check if user already has a student profile
  const existingStudent = await getStudentByUserId(userId, { required: false });

  if (existingStudent) {
    // If already enrolled in this college, just mark accepted
    if (existingStudent.college_id === invitation.college_id) {
      await serviceClient
        .from('student_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitationId);
      return { message: 'Invitation accepted. You are already enrolled in this college.', student: existingStudent };
    }
    throw new AppError(409, 'You already have a student profile linked to a different college');
  }

  // No profile yet — invitation acts as college enrollment prerequisite.
  // Mark as accepted so when the student creates their profile they have context.
  const { error: updateErr } = await serviceClient
    .from('student_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (updateErr) throw new AppError(500, 'Failed to accept invitation');

  return {
    message: 'Invitation accepted! Complete your student profile to join the college.',
    college: invitation.college,
    batch: invitation.batch,
    batch_id: invitation.batch_id,
    college_id: invitation.college_id,
  };
}

