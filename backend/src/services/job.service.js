const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');
const env = require('../config/env');
const { ensureDiscussionForScope, getCdcAdminByUserId, getEmployerByUserId, getJobById, getStudentByUserId } = require('./common.service');
const { predictScam } = require('./ai.service');
const { matchesEligibility } = require('./student.service');
const { writeAuditLog } = require('../helpers/audit');

async function getAssignmentSummaries(jobId, collegeId = null) {
  const query = serviceClient.from('job_assignments').select('*').eq('job_id', jobId);
  if (collegeId) {
    query.eq('college_id', collegeId);
  }
  const { data } = await query;
  return data || [];
}

async function getStudentJobState(studentId, jobId) {
  const [{ data: application }, { data: saved }] = await Promise.all([
    serviceClient
      .from('applications')
      .select('status')
      .eq('student_id', studentId)
      .eq('job_id', jobId)
      .maybeSingle(),
    serviceClient
      .from('saved_jobs')
      .select('id')
      .eq('student_id', studentId)
      .eq('job_id', jobId)
      .maybeSingle(),
  ]);

  return {
    application_status: application?.status || null,
    is_saved: Boolean(saved),
  };
}

function deriveJobStatus(aiResult) {
  if (aiResult.scam_score >= env.scamThreshold) {
    return {
      status: 'blocked',
      aiScreeningStatus: 'flagged',
      statusReason: 'Blocked automatically due to a high scam score.',
    };
  }

  if (aiResult.scam_score >= 50) {
    return {
      status: 'restricted',
      aiScreeningStatus: 'reviewed',
      statusReason: 'Published in restricted mode due to moderate risk.',
    };
  }

  return {
    status: 'approved',
    aiScreeningStatus: 'reviewed',
    statusReason: 'AI review passed.',
  };
}

async function listPublicJobs() {
  const { data, error } = await serviceClient
    .from('jobs')
    .select(`
      *,
      employer:employers(id, company_name, verification_status, credibility_score, company_logo_url),
      ai_review:job_ai_reviews(*)
    `)
    .eq('distribution_mode', 'off_campus_public')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load jobs');
  }

  return data || [];
}

async function createJob(user, payload, reqMeta = {}) {
  const employer = await getEmployerByUserId(user.id, { required: true });

  if (employer.verification_status === 'blocked') {
    throw new AppError(403, 'This employer is blocked from posting jobs');
  }

  const aiResult = await predictScam({
    title: payload.title,
    description: payload.description,
    salary_min: payload.salaryMin,
    salary_max: payload.salaryMax,
    requirements: payload.requiredSkills,
  });

  const state = deriveJobStatus(aiResult);
  // If AI was unavailable (fallback), always put under_review regardless of employer status
  if (aiResult.fallback) {
    state.status = 'under_review';
    state.aiScreeningStatus = 'pending';
    state.statusReason = 'AI service unavailable. Queued for manual review.';
  } else if (employer.verification_status !== 'verified') {
    state.status = 'under_review';
    state.aiScreeningStatus = 'reviewed';
    state.statusReason = 'Employer verification is pending. Super admin review required before publication.';
  }
  const publishTime = state.status === 'approved' ? new Date().toISOString() : null;

  const { data: job, error } = await serviceClient
    .from('jobs')
    .insert({
      employer_id: employer.id,
      distribution_mode: payload.distributionMode,
      title: payload.title,
      role: payload.role,
      description: payload.description,
      location: payload.location,
      job_type: payload.jobType,
      salary_min: payload.salaryMin,
      salary_max: payload.salaryMax,
      eligibility_rules: payload.eligibilityRules,
      required_skills: payload.requiredSkills,
      attachment_urls: payload.attachmentUrls,
      application_deadline: payload.applicationDeadline,
      status: state.status,
      status_reason: state.statusReason,
      ai_screening_status: state.aiScreeningStatus,
      published_at: publishTime,
    })
    .select('*')
    .single();

  if (error || !job) {
    throw new AppError(500, 'Failed to create job');
  }

  await serviceClient.from('job_ai_reviews').insert({
    job_id: job.id,
    scam_score: aiResult.scam_score,
    risk_level: aiResult.risk_level,
    explanation: aiResult.explanation,
    extracted_red_flags: aiResult.extracted_red_flags || aiResult.keyword_flags || [],
    role_match_quality: aiResult.match_quality || null,
    classifier_version: 'trusthire-hybrid-v1',
    raw_payload: aiResult,
  });

  if (job.distribution_mode === 'off_campus_public' && job.status === 'approved') {
    await ensureDiscussionForScope({
      jobId: job.id,
      collegeId: null,
      createdBy: user.id,
    });
  }

  await writeAuditLog({
    actorId: user.id,
    action: 'job_created',
    entityType: 'job',
    entityId: job.id,
    metadata: {
      distribution_mode: job.distribution_mode,
      status: job.status,
      scam_score: aiResult.scam_score,
    },
    ipAddress: reqMeta.ipAddress,
  });

  return {
    job,
    ai_review: aiResult,
  };
}

async function getJobDetail(jobId, user = null) {
  const job = await getJobById(jobId);

  if (!user) {
    if (job.distribution_mode !== 'off_campus_public' || job.status !== 'approved') {
      throw new AppError(403, 'This job is not publicly accessible');
    }

    return {
      ...job,
      discussion_scope: 'global',
    };
  }

  if (['student', 'alumni'].includes(user.roleCode)) {
    const student = await getStudentByUserId(user.id, { required: true });
    const state = await getStudentJobState(student.id, job.id);
    if (job.distribution_mode === 'off_campus_public') {
      // If student has already applied, they skip the 'approved' only restriction.
      if (!state.application_status && job.status !== 'approved') {
        throw new AppError(403, 'This job is under review and unavailable for new applicants');
      }
      if (!matchesEligibility(student, job)) {
        throw new AppError(403, 'You are not eligible to view this job');
      }
      return { ...job, ...state, discussion_scope: 'global' };
    }

    const assignments = await getAssignmentSummaries(job.id, student.college_id);

    const { data: memberships } = await serviceClient
      .from('group_membership')
      .select('group_id')
      .eq('student_id', student.id);

    const groupIds = new Set((memberships || []).map((item) => item.group_id));
    const authorized = (assignments || []).some((assignment) => {
      const batchMatches = !assignment.batch_id || assignment.batch_id === student.batch_id;
      const groupMatches = !assignment.group_id || groupIds.has(assignment.group_id);
      return batchMatches && groupMatches;
    });

    if (!authorized || !matchesEligibility(student, job)) {
      throw new AppError(403, 'You are not authorized to view this campus job');
    }

    return { ...job, ...state, discussion_scope: 'college', discussion_college_id: student.college_id };
  }

  if (user.roleCode === 'cdc_admin') {
    const cdcAdmin = await getCdcAdminByUserId(user.id, { required: true });
    if (job.distribution_mode === 'campus_cdc') {
      const { data: assignment } = await serviceClient
        .from('job_assignments')
        .select('id')
        .eq('job_id', job.id)
        .eq('college_id', cdcAdmin.college_id)
        .maybeSingle();

      if (!assignment) {
        throw new AppError(403, 'This campus job is not assigned to your college');
      }
    }
    return { ...job, discussion_scope: job.distribution_mode === 'off_campus_public' ? 'global' : 'college', discussion_college_id: cdcAdmin.college_id };
  }

  if (user.roleCode === 'employer') {
    const employer = await getEmployerByUserId(user.id, { required: true });
    if (job.employer_id !== employer.id) {
      throw new AppError(403, 'You can only view jobs you own');
    }
    if (job.distribution_mode === 'campus_cdc') {
      const assignments = await getAssignmentSummaries(job.id);
      return {
        ...job,
        discussion_scope: 'college',
        discussion_college_id: assignments[0]?.college_id || null,
      };
    }
  }

  if (job.distribution_mode === 'campus_cdc') {
    const assignments = await getAssignmentSummaries(job.id);
    return {
      ...job,
      discussion_scope: 'college',
      discussion_college_id: assignments[0]?.college_id || null,
    };
  }

  return {
    ...job,
    discussion_scope: 'global',
  };
}

async function listEmployerJobs(userId) {
  const employer = await getEmployerByUserId(userId, { required: true });
  const { data, error } = await serviceClient
    .from('jobs')
    .select(`
      *,
      ai_review:job_ai_reviews(*),
      assignments:job_assignments(*)
    `)
    .eq('employer_id', employer.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load employer jobs');
  }

  return data || [];
}

async function applyToJob(jobId, userId, payload, reqMeta = {}) {
  const student = await getStudentByUserId(userId, { required: true });
  const detail = await getJobDetail(jobId, { id: userId, roleCode: student.is_alumni ? 'alumni' : 'student' });

  const { data: existing } = await serviceClient
    .from('applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('student_id', student.id)
    .maybeSingle();

  if (existing) {
    throw new AppError(409, 'You already applied to this job');
  }

  const { data, error } = await serviceClient
    .from('applications')
    .insert({
      job_id: jobId,
      student_id: student.id,
      cover_letter: payload.coverLetter,
      status: 'applied',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to submit application');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: student.college_id,
    action: 'job_applied',
    entityType: 'application',
    entityId: data.id,
    metadata: {
      job_id: detail.id,
      distribution_mode: detail.distribution_mode,
    },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function getApplicants(jobId, user) {
  const job = await getJobById(jobId);

  if (user.roleCode === 'employer') {
    const employer = await getEmployerByUserId(user.id, { required: true });
    if (job.employer_id !== employer.id) {
      throw new AppError(403, 'You can only view applicants for your own jobs');
    }
  } else if (user.roleCode === 'cdc_admin') {
    const cdcAdmin = await getCdcAdminByUserId(user.id, { required: true });
    const { data: assignment } = await serviceClient
      .from('job_assignments')
      .select('id')
      .eq('job_id', jobId)
      .eq('college_id', cdcAdmin.college_id)
      .maybeSingle();

    if (!assignment) {
      throw new AppError(403, 'This job is not assigned to your college');
    }
    const { data: students } = await serviceClient.from('students').select('id').eq('college_id', cdcAdmin.college_id);
    const studentIds = (students || []).map((student) => student.id);
    if (studentIds.length === 0) {
      return [];
    }

    const { data, error } = await serviceClient
      .from('applications')
      .select(`
        *,
        student:students(
          *,
          user:users(id, full_name, email, college_email),
          batch:batches(id, name, graduation_year, department),
          college:colleges(id, name, code)
        )
      `)
      .eq('job_id', jobId)
      .in('student_id', studentIds)
      .order('applied_at', { ascending: false });

    if (error) {
      throw new AppError(500, 'Failed to load applicants');
    }

    return data || [];
  } else if (user.roleCode !== 'super_admin') {
    throw new AppError(403, 'You cannot view applicants for this job');
  }

  const { data, error } = await serviceClient
    .from('applications')
    .select(`
      *,
      student:students(
        *,
        user:users(id, full_name, email, college_email),
        batch:batches(id, name, graduation_year, department),
        college:colleges(id, name, code)
      )
    `)
    .eq('job_id', jobId)
    .order('applied_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load applicants');
  }

  return data || [];
}

async function updateApplicationStatus(applicationId, user, status, reqMeta = {}) {
  const { data: application, error: fetchError } = await serviceClient
    .from('applications')
    .select(`
      *,
      student:students(*),
      job:jobs(*)
    `)
    .eq('id', applicationId)
    .single();

  if (fetchError || !application) {
    throw new AppError(404, 'Application not found');
  }

  if (user.roleCode === 'employer') {
    const employer = await getEmployerByUserId(user.id, { required: true });
    if (application.job.employer_id !== employer.id) {
      throw new AppError(403, 'You can only update applicants for your own jobs');
    }
  } else if (user.roleCode === 'cdc_admin') {
    const cdcAdmin = await getCdcAdminByUserId(user.id, { required: true });
    if (application.student.college_id !== cdcAdmin.college_id) {
      throw new AppError(403, 'You can only update applications in your college');
    }
  } else if (user.roleCode !== 'super_admin') {
    throw new AppError(403, 'You cannot update application statuses');
  }

  const { data, error } = await serviceClient
    .from('applications')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to update application status');
  }

  await writeAuditLog({
    actorId: user.id,
    collegeId: application.student.college_id,
    action: 'application_status_updated',
    entityType: 'application',
    entityId: applicationId,
    metadata: { status },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function updateJobStatus(jobId, user, status, reason, reqMeta = {}) {
  const ALLOWED = ['draft', 'under_review', 'approved', 'restricted', 'blocked', 'closed'];
  if (!ALLOWED.includes(status)) {
    throw new AppError(400, `status must be one of: ${ALLOWED.join(', ')}`);
  }

  const { data, error } = await serviceClient
    .from('jobs')
    .update({
      status,
      status_reason: reason || `Status set to ${status}.`,
      published_at: status === 'approved' ? new Date().toISOString() : undefined,
    })
    .eq('id', jobId)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to update job status');
  }

  await writeAuditLog({
    actorId: user.id,
    action: 'job_status_updated',
    entityType: 'job',
    entityId: jobId,
    metadata: { status, reason },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

module.exports = {
  applyToJob,
  createJob,
  getApplicants,
  getJobDetail,
  listEmployerJobs,
  listPublicJobs,
  updateApplicationStatus,
  updateJobStatus,
};
