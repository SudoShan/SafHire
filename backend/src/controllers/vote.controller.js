const voteService = require('../services/vote.service');
const { getUserVoteStats } = require('../helpers/userStats');
const { getVoteWeight, getBaseWeight } = require('../helpers/visibility');

async function castVote(req, res) {
  const result = await voteService.castVote(req.params.jobId, req.user, req.body.vote_type);
  res.json(result);
}

async function getVoteStatus(req, res) {
  const result = await voteService.getVoteStatus(req.params.jobId, req.user.id);
  res.json(result);
}

async function getMyVoteStats(req, res) {
  const stats = await getUserVoteStats(req.user.id);
  const baseWeight = getBaseWeight(req.user.roleCode);
  // Effective weight = base * multiplier, clamped [1, 15]
  const effectiveWeight = Math.max(1, Math.min(15, Math.round(baseWeight * (stats.weight_multiplier ?? 1.0))));
  res.json({
    vote_stats: {
      ...stats,
      base_weight: baseWeight,
      effective_weight: effectiveWeight,
    },
  });
}

module.exports = {
  castVote,
  getMyVoteStats,
  getVoteStatus,
};
