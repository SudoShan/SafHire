const discussionService = require('../services/discussion.service');

async function getThread(req, res) {
  const thread = await discussionService.getThread(req.params.jobId, req.user || null, req.query.college_id || null);
  res.json(thread);
}

async function addReply(req, res) {
  const reply = await discussionService.addReply(req.params.jobId, req.user, req.body.body, req.body.college_id || null);
  res.status(201).json({ reply });
}

async function summarize(req, res) {
  const discussion = await discussionService.summarize(req.params.jobId, req.user, req.body.college_id || null);
  res.json({ discussion });
}

module.exports = {
  addReply,
  getThread,
  summarize,
};
