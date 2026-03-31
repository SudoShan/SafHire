const { ensureArray, ensureNumber, ensureString } = require('./common');

// student.validators.js — department and graduation_year come from the batch,
// so only batch_id and enrollment_number are required from the client
function validateStudentProfile(req) {
  return {
    batchId: ensureString(req.body.batch_id, 'batch_id'),
    enrollmentNumber: ensureString(req.body.enrollment_number, 'enrollment_number'),
    cgpa: ensureNumber(req.body.cgpa, 'cgpa', { required: false, min: 0, max: 10 }),
    activeBacklogs: ensureNumber(req.body.active_backlogs, 'active_backlogs', { required: false, min: 0 }),
    historyBacklogs: ensureNumber(req.body.history_backlogs, 'history_backlogs', { required: false, min: 0 }),
    skills: ensureArray(req.body.skills, 'skills'),
    preferredRole: ensureString(req.body.preferred_role, 'preferred_role', { required: false }),
    linkedinUrl: ensureString(req.body.linkedin_url, 'linkedin_url', { required: false }),
    githubUrl: ensureString(req.body.github_url, 'github_url', { required: false }),
  };
}

module.exports = {
  validateStudentProfile,
};
