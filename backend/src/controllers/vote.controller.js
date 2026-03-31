const voteService = require('../services/vote.service');

async function castVote(req, res) {
  const result = await voteService.castVote(req.params.jobId, req.user, req.body.vote_type);
  res.json(result);
}

async function getVoteStatus(req, res) {
  const result = await voteService.getVoteStatus(req.params.jobId, req.user.id);
  res.json(result);
}

module.exports = {
  castVote,
  getVoteStatus,
};
