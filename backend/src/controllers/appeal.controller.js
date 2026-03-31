const appealService = require('../services/appeal.service');

async function listAppeals(req, res) {
  const appeals = await appealService.listMyAppeals(req.user);
  res.json({ appeals });
}

async function createAppeal(req, res) {
  const appeal = await appealService.createAppeal(req.user, {
    jobId: req.body.job_id || req.body.jobId,
    reason: req.body.reason,
  }, { ipAddress: req.ip });
  res.status(201).json({ appeal });
}

async function reviewAppeal(req, res) {
  const appeal = await appealService.reviewAppeal(
    req.user.id,
    req.params.appealId,
    req.body.status,
    req.body.resolution_notes || null,
    { ipAddress: req.ip },
  );
  res.json({ appeal });
}

module.exports = {
  createAppeal,
  listAppeals,
  reviewAppeal,
};
