const jobService = require('../services/job.service');
const uploadToCloudinary = require('../helpers/cloudinaryUpload');

async function listJobs(_req, res) {
  const jobs = await jobService.listPublicJobs();
  res.json({ jobs });
}

async function getJob(req, res) {
  const job = await jobService.getJobDetail(req.params.jobId, req.user || null);
  res.json({ job });
}

async function createJob(req, res) {
  const result = await jobService.createJob(req.user, req.validated, {
    ipAddress: req.ip,
  });
  res.status(201).json(result);
}

async function apply(req, res) {
  let resumeUrl = null;
  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.buffer, 'safhire/resumes');
      resumeUrl = result.secure_url;
    } catch (err) {
      return res.status(500).json({ error: 'Failed to upload resume to Cloudinary' });
    }
  }

  const payload = { ...req.validated, resumeUrl };
  const application = await jobService.applyToJob(req.params.jobId, req.user.id, payload, {
    ipAddress: req.ip,
  });
  res.status(201).json({ application, message: 'Application submitted' });
}

async function getApplicants(req, res) {
  const applicants = await jobService.getApplicants(req.params.jobId, req.user);
  res.json({ applicants });
}

async function updateApplicationStatus(req, res) {
  const application = await jobService.updateApplicationStatus(
    req.params.applicationId,
    req.user,
    req.body.status,
    { ipAddress: req.ip },
  );
  res.json({ application, message: 'Application status updated' });
}

async function updateJobStatus(req, res) {
  const job = await jobService.updateJobStatus(
    req.params.jobId,
    req.user,
    req.body.status,
    req.body.reason || null,
    { ipAddress: req.ip },
  );
  res.json({ job, message: 'Job status updated' });
}

module.exports = {
  apply,
  createJob,
  getApplicants,
  getJob,
  listJobs,
  updateApplicationStatus,
  updateJobStatus,
};
