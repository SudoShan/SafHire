const cdcService = require('../services/cdc.service');

async function dashboard(req, res) {
  const data = await cdcService.getDashboard(req.user.id);
  res.json(data);
}

async function listStudents(req, res) {
  const students = await cdcService.listStudents(req.user.id);
  res.json({ students });
}

async function listBatches(req, res) {
  const batches = await cdcService.listBatches(req.user.id);
  res.json({ batches });
}

async function createBatch(req, res) {
  const batch = await cdcService.createBatch(req.user.id, req.validated, { ipAddress: req.ip });
  res.status(201).json({ batch });
}

async function listGroups(req, res) {
  const groups = await cdcService.listGroups(req.user.id);
  res.json({ groups });
}

async function createGroup(req, res) {
  const group = await cdcService.createGroup(req.user.id, req.validated, { ipAddress: req.ip });
  res.status(201).json({ group });
}

async function refreshGroupMembers(req, res) {
  const result = await cdcService.refreshGroupMembers(req.user.id, req.params.groupId);
  res.json(result);
}

async function listEmployerRequests(req, res) {
  const requests = await cdcService.listEmployerRequests(req.user.id);
  res.json({ requests });
}

async function listAssignableJobs(req, res) {
  const jobs = await cdcService.listAssignableJobs(req.user.id);
  res.json({ jobs });
}

async function resolveEmployerRequest(req, res) {
  const request = await cdcService.resolveEmployerRequest(
    req.user.id,
    req.params.accessId,
    req.body.status,
    req.body.notes || null,
    { ipAddress: req.ip },
  );
  res.json({ request });
}

async function assignJob(req, res) {
  const assignment = await cdcService.assignJob(req.user.id, req.params.jobId, req.validated, {
    ipAddress: req.ip,
  });
  res.status(201).json({ assignment });
}

module.exports = {
  assignJob,
  createBatch,
  createGroup,
  dashboard,
  listAssignableJobs,
  listBatches,
  listEmployerRequests,
  listGroups,
  listStudents,
  refreshGroupMembers,
  resolveEmployerRequest,
};
