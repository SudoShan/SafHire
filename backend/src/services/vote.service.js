const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');
const { getJobById } = require('./common.service');
const { getVoteWeight } = require('../helpers/visibility');

async function recalculateEmployerCredibility(employerId) {
  const { data: jobs } = await serviceClient.from('jobs').select('id').eq('employer_id', employerId);
  const jobIds = (jobs || []).map((job) => job.id);
  if (jobIds.length === 0) {
    return 50;
  }

  const { data: votes } = await serviceClient.from('votes').select('job_id, vote_type, weight').in('job_id', jobIds);
  let score = 50;

  if ((votes || []).length > 0) {
    const total = votes.reduce((sum, vote) => sum + vote.weight, 0);
    const sentiment = votes.reduce((sum, vote) => {
      if (vote.vote_type === 'upvote') return sum + vote.weight;
      if (vote.vote_type === 'downvote' || vote.vote_type === 'report_scam') return sum - vote.weight;
      return sum;
    }, 0);
    score = Math.max(0, Math.min(100, 50 + (sentiment / total) * 50));
  }

  await serviceClient.from('employers').update({ credibility_score: Number(score.toFixed(2)) }).eq('id', employerId);
  return Number(score.toFixed(2));
}

async function castVote(jobId, user, voteType) {
  await getJobById(jobId);

  const weight = getVoteWeight(user.roleCode);
  const { data: existing } = await serviceClient
    .from('votes')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing && existing.vote_type === voteType) {
    await serviceClient.from('votes').delete().eq('id', existing.id);
  } else if (existing) {
    await serviceClient.from('votes').update({ vote_type: voteType, weight }).eq('id', existing.id);
  } else {
    await serviceClient.from('votes').insert({
      job_id: jobId,
      user_id: user.id,
      vote_type: voteType,
      weight,
    });
  }

  const { data: job } = await serviceClient.from('jobs').select('employer_id').eq('id', jobId).single();
  const credibilityScore = await recalculateEmployerCredibility(job.employer_id);

  const { data: votes } = await serviceClient.from('votes').select('vote_type, weight').eq('job_id', jobId);
  const upvotes = (votes || []).filter((vote) => vote.vote_type === 'upvote').length;
  const downvotes = (votes || []).filter((vote) => vote.vote_type === 'downvote').length;
  const reports = (votes || []).filter((vote) => vote.vote_type === 'report_scam').length;

  return {
    credibility_score: credibilityScore,
    upvotes,
    downvotes,
    reports,
    user_vote: existing && existing.vote_type === voteType ? null : voteType,
  };
}

async function getVoteStatus(jobId, userId) {
  const [job, { data: vote }, { data: votes }] = await Promise.all([
    getJobById(jobId),
    serviceClient.from('votes').select('vote_type').eq('job_id', jobId).eq('user_id', userId).maybeSingle(),
    serviceClient.from('votes').select('vote_type').eq('job_id', jobId),
  ]);

  return {
    user_vote: vote?.vote_type || null,
    employer_credibility_score: job.employer?.credibility_score || 50,
    upvotes: (votes || []).filter((entry) => entry.vote_type === 'upvote').length,
    downvotes: (votes || []).filter((entry) => entry.vote_type === 'downvote').length,
    reports: (votes || []).filter((entry) => entry.vote_type === 'report_scam').length,
  };
}

module.exports = {
  castVote,
  getVoteStatus,
};
