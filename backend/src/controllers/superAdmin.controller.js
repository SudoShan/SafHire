const superAdminService = require('../services/superAdmin.service');

async function listColleges(_req, res) {
  const colleges = await superAdminService.listColleges();
  res.json({ colleges });
}

async function createCollege(req, res) {
  const college = await superAdminService.createCollege(req.user.id, req.body, { ipAddress: req.ip });
  res.status(201).json({ college });
}

async function updateCollegeStatus(req, res) {
  const college = await superAdminService.updateCollegeStatus(req.user.id, req.params.collegeId, req.body.status, {
    ipAddress: req.ip,
  });
  res.json({ college });
}

async function provisionCdcAdmin(req, res) {
  const cdcAdmin = await superAdminService.provisionCdcAdmin(req.user.id, {
    collegeId: req.body.college_id,
    fullName: req.body.full_name,
    email: req.body.email,
    password: req.body.password,
    designation: req.body.designation,
  }, { ipAddress: req.ip });
  res.status(201).json({ cdc_admin: cdcAdmin });
}

async function listEmployers(_req, res) {
  const employers = await superAdminService.listEmployers();
  res.json({ employers });
}

async function updateEmployerStatus(req, res) {
  const employer = await superAdminService.updateEmployerStatus(
    req.user.id,
    req.params.employerId,
    req.body.status,
    req.body.blocked_reason || null,
    { ipAddress: req.ip },
  );
  res.json({ employer });
}

async function listFlaggedJobs(_req, res) {
  const jobs = await superAdminService.listFlaggedJobs();
  res.json({ jobs });
}

async function listUsers(_req, res) {
  const users = await superAdminService.listUsers();
  res.json({ users });
}

module.exports = {
  createCollege,
  listColleges,
  listEmployers,
  listFlaggedJobs,
  listUsers,
  provisionCdcAdmin,
  updateCollegeStatus,
  updateEmployerStatus,
};
