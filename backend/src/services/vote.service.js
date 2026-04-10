/**
 * vote.service.js
 * Handles vote casting, trust score computation, and the decision engine.
 *
 * Flow on castVote:
 *  1. Resolve user's effective weight (role base × accuracy multiplier)
 *  2. Upsert/delete the vote record
 *  3. Recompute employer credibility
 *  4. Compute the job's aggregate trust score
 *  5. Run the decision engine (flag / restrict if thresholds hit)
 *  6. Notify super admins if threshold crossed
 */

const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');
const { getJobById } = require('./common.service');
const { getVoteWeight } = require('../helpers/visibility');
const { computeTrustScore, evaluateTrustAction } = require('../helpers/trustScore');
const { writeAuditLog } = require('../helpers/audit');
const axios = require('axios');
const env = require('../config/env');

// ------------------------------------------------------------------
// Internal: send a notification row to the user_id
// ------------------------------------------------------------------
async function notify(userId, type, title, message, data = {}) {
  await serviceClient.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    data,
  });
}

// ------------------------------------------------------------------
// Internal: notify all super admins
// ------------------------------------------------------------------
async function notifySuperAdmins(type, title, message, data = {}) {
  const { data: admins } = await serviceClient
    .from('users')
    .select('id')
    .eq('role_code', 'super_admin')
    .eq('is_active', true);

  if (!admins || admins.length === 0) return;

  const rows = admins.map((admin) => ({
    user_id: admin.id,
    type,
    title,
    message,
    data,
  }));

  await serviceClient.from('notifications').insert(rows);
}

// ------------------------------------------------------------------
// Recalculate employer credibility from all votes across all their jobs
// ------------------------------------------------------------------
async function recalculateEmployerCredibility(employerId) {
  const { data: jobs } = await serviceClient
    .from('jobs')
    .select('id')
    .eq('employer_id', employerId);

  const jobIds = (jobs || []).map((job) => job.id);

  if (jobIds.length === 0) {
    return 50;
  }

  const { data: votes } = await serviceClient
    .from('votes')
    .select('vote_type, weight')
    .in('job_id', jobIds);

  const { score } = computeTrustScore(votes || []);

  await serviceClient
    .from('employers')
    .update({ credibility_score: score })
    .eq('id', employerId);

  return score;
}

// ------------------------------------------------------------------
// Decision engine: check trust score and take automated action
// ------------------------------------------------------------------
async function runDecisionEngine(jobId, votes, currentStatus, employerId) {
  const { score, totalWeight } = computeTrustScore(votes);
  const { action, newStatus, reason } = evaluateTrustAction(score, totalWeight, currentStatus);

  if (action === 'none') {
    return { trust_score: score, action_taken: null };
  }

  if (action === 'restrict' && newStatus) {
    // Update job status to restricted
    await serviceClient
      .from('jobs')
      .update({ status: newStatus, status_reason: reason })
      .eq('id', jobId);

    // Notify the employer that their job was restricted
    const { data: employer } = await serviceClient
      .from('employers')
      .select('user_id')
      .eq('id', employerId)
      .maybeSingle();

    if (employer?.user_id) {
      await notify(
        employer.user_id,
        'job_restricted',
        'Job Restricted by Trust System',
        reason,
        { job_id: jobId, trust_score: score },
      );
    }
  }

  // Always notify super admins when action is flag or restrict
  await notifySuperAdmins(
    `job_trust_${action}`,
    action === 'restrict' ? '⚠️ Job Auto-Restricted' : '🔔 Job Trust Warning',
    reason,
    { job_id: jobId, trust_score: score },
  );

  await writeAuditLog({
    action: `job_trust_${action}`,
    entityType: 'job',
    entityId: jobId,
    metadata: { trust_score: score, total_weight: totalWeight, new_status: newStatus },
  });

  return { trust_score: score, action_taken: action };
}

// ------------------------------------------------------------------
// Public: cast a vote
// ------------------------------------------------------------------
async function castVote(jobId, user, voteType) {
  if (user.roleCode === 'employer') {
    throw new AppError(403, 'Employers are not permitted to vote on job trust.');
  }

  const job = await getJobById(jobId);

  // Resolve the effective weight (async — fetches multiplier from DB)
  const weight = await getVoteWeight(user.roleCode, user.id);

  // Fetch existing vote for this user on this job
  const { data: existing } = await serviceClient
    .from('votes')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .maybeSingle();

  // Toggle off if same vote_type; otherwise upsert
  let userVote;
  if (existing && existing.vote_type === voteType) {
    // Toggle: remove the vote
    await serviceClient.from('votes').delete().eq('id', existing.id);
    userVote = null;
  } else if (existing) {
    // Change vote type
    await serviceClient
      .from('votes')
      .update({ vote_type: voteType, weight })
      .eq('id', existing.id);
    userVote = voteType;
  } else {
    // New vote
    await serviceClient.from('votes').insert({
      job_id: jobId,
      user_id: user.id,
      vote_type: voteType,
      weight,
    });
    userVote = voteType;
  }

  // Recompute employer credibility
  const credibilityScore = await recalculateEmployerCredibility(job.employer_id);

  // Fetch all votes for trust score computation
  const { data: allVotes } = await serviceClient
    .from('votes')
    .select('vote_type, weight')
    .eq('job_id', jobId);

  const { score: trustScore } = computeTrustScore(allVotes || []);

  // Decision engine — runs asynchronously (don't await to keep response fast;
  // but we DO await here for correctness since status must be updated before response)
  const { action_taken } = await runDecisionEngine(
    jobId,
    allVotes || [],
    job.status,
    job.employer_id,
  );

  // Fire-and-forget fraud check (non-blocking — never delays vote response)
  runFraudCheck(jobId, job.employer_id).catch((err) => {
    console.warn('[vote.service] Fraud check error (non-blocking):', err?.message);
  });

  const votes = allVotes || [];

  return {
    user_vote: userVote,
    trust_score: trustScore,
    employer_credibility_score: credibilityScore,
    upvotes:  votes.filter((v) => v.vote_type === 'upvote').length,
    downvotes: votes.filter((v) => v.vote_type === 'downvote').length,
    reports:  votes.filter((v) => v.vote_type === 'report_scam').length,
    vote_weight_used: weight,
    action_taken,
  };
}

// ------------------------------------------------------------------
// Internal: run fraud check against the AI service (fire-and-forget)
// ------------------------------------------------------------------
async function runFraudCheck(jobId, employerId) {
  // Fetch votes with user account age
  const { data: votes } = await serviceClient
    .from('votes')
    .select('user_id, vote_type, weight, created_at, user:users(created_at)')
    .eq('job_id', jobId);

  if (!votes || votes.length === 0) return;

  const now = Date.now();
  const votePayload = votes.map((v) => {
    const accountCreated = v.user?.created_at ? new Date(v.user.created_at).getTime() : now;
    const ageDays = Math.floor((now - accountCreated) / (1000 * 60 * 60 * 24));
    return {
      user_id: v.user_id,
      vote_type: v.vote_type,
      weight: v.weight,
      created_at: v.created_at,
      account_age_days: ageDays,
    };
  });

  const { data: result } = await axios.post(
    `${env.aiServiceUrl}/check-fraud`,
    { job_id: jobId, votes: votePayload },
    { headers: { 'x-internal-secret': env.aiInternalSecret }, timeout: 5000 },
  );

  if (result?.is_suspicious && result?.risk_level === 'high') {
    await notifySuperAdmins(
      'fraud_detected',
      '🚨 Suspicious Voting Pattern Detected',
      `Job ${jobId} may have coordinated voting activity. Reasons: ${(result.reasons || []).join('; ')}`,
      { job_id: jobId, fraud_check: result },
    );
  }
}

// ------------------------------------------------------------------
// Public: get current vote status for a job
// ------------------------------------------------------------------
async function getVoteStatus(jobId, userId) {
  const [job, { data: vote }, { data: allVotes }] = await Promise.all([
    getJobById(jobId),
    serviceClient
      .from('votes')
      .select('vote_type, weight')
      .eq('job_id', jobId)
      .eq('user_id', userId)
      .maybeSingle(),
    serviceClient
      .from('votes')
      .select('vote_type, weight')
      .eq('job_id', jobId),
  ]);

  const { score: trustScore } = computeTrustScore(allVotes || []);

  return {
    user_vote: vote?.vote_type || null,
    user_vote_weight: vote?.weight || null,
    trust_score: trustScore,
    employer_credibility_score: job.employer?.credibility_score ?? 50,
    upvotes:  (allVotes || []).filter((v) => v.vote_type === 'upvote').length,
    downvotes: (allVotes || []).filter((v) => v.vote_type === 'downvote').length,
    reports:  (allVotes || []).filter((v) => v.vote_type === 'report_scam').length,
  };
}

module.exports = {
  castVote,
  getVoteStatus,
};
