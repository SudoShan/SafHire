const studentService = require('../services/student.service');

async function listColleges(req, res) {
  const colleges = await studentService.listCollegesWithBatches();
  res.json({ colleges });
}

async function getProfile(req, res) {
  const profile = await studentService.getProfile(req.user.id);
  res.json({ profile });
}

async function updateProfile(req, res) {
  const profile = await studentService.updateProfile(req.user.id, req.validated);
  res.json({ profile, message: 'Student profile saved' });
}

async function uploadResume(req, res) {
  const result = await studentService.uploadResume(req.user.id, req.file);
  res.json(result);
}

async function getFeed(req, res) {
  const result = await studentService.getEligibleJobs(req.user.id);
  res.json(result);
}

async function getSavedJobs(req, res) {
  const items = await studentService.getSavedJobs(req.user.id);
  res.json({ jobs: items });
}

async function toggleSavedJob(req, res) {
  const result = await studentService.toggleSavedJob(req.user.id, req.params.jobId);
  res.json(result);
}

async function getApplications(req, res) {
  const applications = await studentService.getApplications(req.user.id);
  res.json({ applications });
}

module.exports = {
  getApplications,
  getFeed,
  getProfile,
  getSavedJobs,
  listColleges,
  toggleSavedJob,
  updateProfile,
  uploadResume,
};
