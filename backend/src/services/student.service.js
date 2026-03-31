const { serviceClient } = require('../config/supabase');
const AppError = require('../helpers/AppError');
const { extractResumeSkills } = require('./ai.service');
const { getStudentByUserId, getUserById } = require('./common.service');

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
    .in('status', ['approved', 'restricted'])
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

  return {
    profile: student,
    jobs: feed,
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
  getApplications,
  getEligibleJobs,
  getProfile,
  getSavedJobs,
  listCollegesWithBatches,
  matchesEligibility,
  toggleSavedJob,
  updateProfile: upsertProfile,
  uploadResume,
};
