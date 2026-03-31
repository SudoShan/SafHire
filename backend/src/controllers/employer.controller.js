const employerService = require('../services/employer.service');
const jobService = require('../services/job.service');

async function getProfile(req, res) {
  const profile = await employerService.getProfile(req.user.id);
  res.json({ profile });
}

async function upsertProfile(req, res) {
  const profile = await employerService.upsertProfile(req.user.id, req.validated, {
    ipAddress: req.ip,
  });
  res.json({ profile, message: 'Employer profile saved' });
}

async function listCollegeAccess(req, res) {
  const colleges = await employerService.listCollegeAccess(req.user.id);
  res.json({ colleges });
}

async function requestCollegeAccess(req, res) {
  const access = await employerService.requestCollegeAccess(req.user.id, req.validated, {
    ipAddress: req.ip,
  });
  res.status(201).json({ access, message: 'College access request submitted' });
}

async function verifyDomain(req, res) {
  const verification = await employerService.verifyDomain(req.user.id, {
    ipAddress: req.ip,
  });
  res.json({ verification });
}

async function listMyJobs(req, res) {
  const jobs = await jobService.listEmployerJobs(req.user.id);
  res.json({ jobs });
}

module.exports = {
  getProfile,
  listCollegeAccess,
  listMyJobs,
  requestCollegeAccess,
  upsertProfile,
  verifyDomain,
};
