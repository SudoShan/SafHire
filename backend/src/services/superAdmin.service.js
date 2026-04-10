/**
 * superAdmin.service.js
 * All services available to the super_admin role.
 * Includes the Feedback Learning System via finalizeJobOutcome().
 */

const AppError = require('../helpers/AppError');
const env = require('../config/env');
const { serviceClient } = require('../config/supabase');
const { writeAuditLog } = require('../helpers/audit');
const { recordVoteOutcome } = require('../helpers/userStats');

// ------------------------------------------------------------------
// Colleges
// ------------------------------------------------------------------

async function listColleges() {
  const { data, error } = await serviceClient
    .from('colleges')
    .select(`
      *,
      cdc_admins:cdc_admins(id, user_id, status)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load colleges');
  }

  return data || [];
}

async function createCollege(userId, payload, reqMeta = {}) {
  const { data, error } = await serviceClient
    .from('colleges')
    .insert({
      code: payload.code,
      name: payload.name,
      slug: payload.slug,
      domain: payload.domain,
      location: payload.location,
      status: 'approved',
      created_by: userId,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to create college');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: data.id,
    action: 'college_created',
    entityType: 'college',
    entityId: data.id,
    metadata: { status: data.status },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function updateCollegeStatus(userId, collegeId, status, reqMeta = {}) {
  const { data, error } = await serviceClient
    .from('colleges')
    .update({
      status,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', collegeId)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to update college status');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: data.id,
    action: 'college_status_updated',
    entityType: 'college',
    entityId: data.id,
    metadata: { status },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

// ------------------------------------------------------------------
// CDC Admins
// ------------------------------------------------------------------

async function provisionCdcAdmin(userId, payload, reqMeta = {}) {
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.fullName,
      role: 'cdc_admin',
    },
  });

  if (authError || !authData.user) {
    throw new AppError(400, authError?.message || 'Failed to create CDC auth user');
  }

  const { error: userError } = await serviceClient.from('users').insert({
    id: authData.user.id,
    role_code: 'cdc_admin',
    email: payload.email,
    full_name: payload.fullName,
    college_email: payload.email,
  });

  if (userError) {
    await serviceClient.auth.admin.deleteUser(authData.user.id);
    throw new AppError(500, 'Failed to create CDC profile');
  }

  const { data, error } = await serviceClient
    .from('cdc_admins')
    .insert({
      user_id: authData.user.id,
      college_id: payload.collegeId,
      designation: payload.designation,
      status: 'active',
      assigned_by: userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    await serviceClient.from('users').delete().eq('id', authData.user.id);
    await serviceClient.auth.admin.deleteUser(authData.user.id);
    throw new AppError(500, 'Failed to assign CDC admin');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: payload.collegeId,
    action: 'cdc_admin_provisioned',
    entityType: 'cdc_admin',
    entityId: data.id,
    metadata: { email: payload.email },
    ipAddress: reqMeta.ipAddress,
  });

  return {
    ...data,
    bootstrap_secret_hint: env.bootstrapSecret ? 'configured' : 'missing',
  };
}

// ------------------------------------------------------------------
// Employers
// ------------------------------------------------------------------

async function listEmployers() {
  const { data, error } = await serviceClient
    .from('employers')
    .select(`
      *,
      user:users(id, full_name, email),
      verifications:employer_verifications(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load employers');
  }

  return data || [];
}

async function updateEmployerStatus(userId, employerId, status, blockedReason, reqMeta = {}) {
  const payload = {
    verification_status: status,
    verified_by: status === 'verified' ? userId : null,
    verified_at: status === 'verified' ? new Date().toISOString() : null,
    blocked_reason: status === 'blocked' ? blockedReason : null,
  };

  const { data, error } = await serviceClient
    .from('employers')
    .update(payload)
    .eq('id', employerId)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to update employer status');
  }

  await writeAuditLog({
    actorId: userId,
    action: 'employer_status_updated',
    entityType: 'employer',
    entityId: employerId,
    metadata: { status, blocked_reason: blockedReason || null },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

// ------------------------------------------------------------------
// Jobs
// ------------------------------------------------------------------

async function listFlaggedJobs() {
  const { data, error } = await serviceClient
    .from('jobs')
    .select(`
      *,
      employer:employers(id, company_name, verification_status, credibility_score),
      ai_review:job_ai_reviews(*)
    `)
    .in('status', ['restricted', 'blocked'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load flagged jobs');
  }

  return data || [];
}

// ------------------------------------------------------------------
// Users
// ------------------------------------------------------------------

async function listUsers() {
  const { data, error } = await serviceClient
    .from('users')
    .select('id, full_name, email, role_code, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load users');
  }

  return data || [];
}

// ------------------------------------------------------------------
// Feedback Learning System: Finalize Job Outcome
// ------------------------------------------------------------------

/**
 * Finalize the outcome of a job (confirmed_genuine | confirmed_scam).
 * This triggers the feedback learning loop:
 *   1. Stamps the outcome on the job record.
 *   2. Fetches all votes cast on the job.
 *   3. For each voter, determines if their vote was "correct" and updates
 *      their user_vote_stats (accuracy + weight_multiplier).
 *   4. Sends a notification to the employer.
 *   5. Writes an audit log entry.
 *
 * "Correct" vote logic:
 *   - outcome = confirmed_scam   → downvote/report_scam is CORRECT, upvote is WRONG
 *   - outcome = confirmed_genuine → upvote is CORRECT, downvote/report_scam is WRONG
 *
 * @param {string} adminUserId - the super admin performing the action
 * @param {string} jobId
 * @param {'confirmed_genuine'|'confirmed_scam'} outcome
 * @param {Object} reqMeta
 */
async function finalizeJobOutcome(adminUserId, jobId, outcome, reqMeta = {}) {
  const VALID_OUTCOMES = ['confirmed_genuine', 'confirmed_scam'];
  if (!VALID_OUTCOMES.includes(outcome)) {
    throw new AppError(400, `outcome must be one of: ${VALID_OUTCOMES.join(', ')}`);
  }

  // 1. Fetch job and verify it exists
  const { data: job, error: jobError } = await serviceClient
    .from('jobs')
    .select('id, employer_id, title, outcome')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new AppError(404, 'Job not found');
  }

  if (job.outcome) {
    throw new AppError(409, `Job outcome is already finalized as '${job.outcome}'`);
  }

  // 2. Stamp the outcome on the job and set final status
  const finalStatus = outcome === 'confirmed_scam' ? 'blocked' : 'approved';
  const statusReason = outcome === 'confirmed_scam'
    ? 'Confirmed as fraudulent by admin. Job blocked.'
    : 'Confirmed as genuine by admin. Job approved.';

  const { data: updatedJob, error: updateError } = await serviceClient
    .from('jobs')
    .update({ outcome, status: finalStatus, status_reason: statusReason })
    .eq('id', jobId)
    .select('*')
    .single();

  if (updateError || !updatedJob) {
    throw new AppError(500, 'Failed to finalize job outcome');
  }

  // 3. Fetch all votes on this job
  const { data: votes } = await serviceClient
    .from('votes')
    .select('user_id, vote_type')
    .eq('job_id', jobId);

  // 4. Update each voter's accuracy stats (in parallel; use allSettled so one failure doesn't abort others)
  if (votes && votes.length > 0) {
    await Promise.allSettled(
      votes.map((vote) => {
        const wasCorrect = outcome === 'confirmed_scam'
          ? (vote.vote_type === 'downvote' || vote.vote_type === 'report_scam')
          : (vote.vote_type === 'upvote');

        return recordVoteOutcome(vote.user_id, wasCorrect);
      }),
    );
  }

  // 5. Notify the employer
  const { data: employer } = await serviceClient
    .from('employers')
    .select('user_id')
    .eq('id', job.employer_id)
    .maybeSingle();

  if (employer?.user_id) {
    const notifTitle = outcome === 'confirmed_scam'
      ? 'Your job posting has been removed'
      : 'Your job posting has been verified as genuine';

    const notifMessage = outcome === 'confirmed_scam'
      ? `The job "${job.title}" was confirmed as fraudulent and has been permanently removed.`
      : `The job "${job.title}" was reviewed and confirmed as a genuine posting.`;

    await serviceClient.from('notifications').insert({
      user_id: employer.user_id,
      type: `job_outcome_${outcome}`,
      title: notifTitle,
      message: notifMessage,
      data: { job_id: jobId, outcome },
    });
  }

  // 6. Audit log
  await writeAuditLog({
    actorId: adminUserId,
    action: 'job_outcome_finalized',
    entityType: 'job',
    entityId: jobId,
    metadata: {
      outcome,
      final_status: finalStatus,
      voters_updated: (votes || []).length,
    },
    ipAddress: reqMeta.ipAddress,
  });

  return {
    ...updatedJob,
    voters_updated: (votes || []).length,
  };
}

// ------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------

module.exports = {
  createCollege,
  finalizeJobOutcome,
  listColleges,
  listEmployers,
  listFlaggedJobs,
  listUsers,
  provisionCdcAdmin,
  updateCollegeStatus,
  updateEmployerStatus,
};
