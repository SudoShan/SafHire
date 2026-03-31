const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');
const { ensureDiscussionForScope, getCdcAdminByUserId, getEmployerByUserId, getJobById, getStudentByUserId } = require('./common.service');
const { summarizeDiscussion } = require('./ai.service');
const { matchesEligibility } = require('./student.service');

async function getAssignments(jobId, collegeId = null) {
  const query = serviceClient.from('job_assignments').select('*').eq('job_id', jobId);
  if (collegeId) {
    query.eq('college_id', collegeId);
  }
  const { data, error } = await query;
  if (error) {
    throw new AppError(500, 'Failed to load discussion assignments');
  }
  return data || [];
}

async function resolveCampusCollegeScope(job, user, requestedCollegeId = null) {
  if (['student', 'alumni'].includes(user.roleCode)) {
    const student = await getStudentByUserId(user.id, { required: true });
    const assignments = await getAssignments(job.id, student.college_id);
    const { data: memberships, error } = await serviceClient
      .from('group_membership')
      .select('group_id')
      .eq('student_id', student.id);

    if (error) {
      throw new AppError(500, 'Failed to load group membership');
    }

    const groupIds = new Set((memberships || []).map((item) => item.group_id));
    const authorized = assignments.some((assignment) => {
      const batchMatches = !assignment.batch_id || assignment.batch_id === student.batch_id;
      const groupMatches = !assignment.group_id || groupIds.has(assignment.group_id);
      return ['approved', 'restricted'].includes(assignment.visibility_status) && batchMatches && groupMatches;
    });

    if (!authorized || !matchesEligibility(student, job)) {
      throw new AppError(403, 'You are not authorized to view this campus discussion');
    }

    return student.college_id;
  }

  if (user.roleCode === 'cdc_admin') {
    const cdc = await getCdcAdminByUserId(user.id, { required: true });
    const assignments = await getAssignments(job.id, cdc.college_id);
    if (assignments.length === 0) {
      throw new AppError(403, 'This campus job is not assigned to your college');
    }
    return cdc.college_id;
  }

  if (user.roleCode === 'employer') {
    const employer = await getEmployerByUserId(user.id, { required: true });
    if (job.employer_id !== employer.id) {
      throw new AppError(403, 'You can only access discussion for your own jobs');
    }

    const candidateCollegeId = requestedCollegeId || (await getAssignments(job.id))[0]?.college_id || null;
    if (!candidateCollegeId) {
      throw new AppError(400, 'college_id is required for campus employer discussion views');
    }

    const assignments = await getAssignments(job.id, candidateCollegeId);
    if (assignments.length === 0) {
      throw new AppError(404, 'No campus assignment found for that college');
    }

    return candidateCollegeId;
  }

  const candidateCollegeId = requestedCollegeId || (await getAssignments(job.id))[0]?.college_id || null;
  if (!candidateCollegeId) {
    throw new AppError(400, 'college_id is required to inspect this campus discussion');
  }
  return candidateCollegeId;
}

async function resolveDiscussionScope(jobId, user, collegeId = null) {
  const job = await getJobById(jobId);

  if (job.distribution_mode === 'off_campus_public') {
    return {
      discussion: await ensureDiscussionForScope({ jobId, collegeId: null, createdBy: user ? user.id : null }),
      scope: 'global',
    };
  }

  if (!user) {
    throw new AppError(401, 'Authentication required to access campus discussion');
  }

  const resolvedCollegeId = await resolveCampusCollegeScope(job, user, collegeId);

  return {
    discussion: await ensureDiscussionForScope({ jobId, collegeId: resolvedCollegeId, createdBy: user.id }),
    scope: 'college',
    collegeId: resolvedCollegeId,
  };
}

async function getThread(jobId, user, collegeId = null) {
  const { discussion } = await resolveDiscussionScope(jobId, user, collegeId);

  const { data: replies, error } = await serviceClient
    .from('discussion_replies')
    .select(`
      *,
      user:users(id, full_name, role_code, avatar_url)
    `)
    .eq('discussion_id', discussion.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(500, 'Failed to load discussion replies');
  }

  return {
    discussion,
    replies: replies || [],
  };
}

async function addReply(jobId, user, body, collegeId = null) {
  const { discussion } = await resolveDiscussionScope(jobId, user, collegeId);

  const { data, error } = await serviceClient
    .from('discussion_replies')
    .insert({
      discussion_id: discussion.id,
      user_id: user.id,
      body,
    })
    .select(`
      *,
      user:users(id, full_name, role_code, avatar_url)
    `)
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to post discussion reply');
  }

  return data;
}

async function summarize(jobId, user, collegeId = null) {
  const { discussion } = await resolveDiscussionScope(jobId, user, collegeId);

  const { data: replies, error } = await serviceClient
    .from('discussion_replies')
    .select(`
      body,
      user:users(full_name, role_code)
    `)
    .eq('discussion_id', discussion.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(500, 'Failed to load discussion for summarization');
  }

  if (!replies || replies.length === 0) {
    throw new AppError(400, 'No discussion messages found to summarize');
  }

  const messages = replies
    .map((reply) => `${reply.user?.full_name || 'User'} (${reply.user?.role_code || 'user'}): ${reply.body}`)
    .join('\n');

  const summary = await summarizeDiscussion({
    messages,
    job_id: jobId,
  });

  const payload = {
    summary: summary.summary,
    common_questions: summary.common_questions || [],
    interview_difficulty: summary.interview_difficulty || 'medium',
    preparation_topics: summary.preparation_topics || [],
  };

  const { data, error: updateError } = await serviceClient
    .from('discussions')
    .update({
      ai_summary: payload,
      last_summarized_at: new Date().toISOString(),
    })
    .eq('id', discussion.id)
    .select('*')
    .single();

  if (updateError || !data) {
    throw new AppError(500, 'Failed to store AI summary');
  }

  return data;
}

module.exports = {
  addReply,
  getThread,
  summarize,
};
