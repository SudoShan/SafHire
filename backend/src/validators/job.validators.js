const { ensureArray, ensureEnum, ensureNumber, ensureString } = require('./common');

function validateJob(req) {
  return {
    title: ensureString(req.body.title, 'title'),
    role: ensureString(req.body.role, 'role'),
    description: ensureString(req.body.description, 'description'),
    location: ensureString(req.body.location, 'location', { required: false }),
    jobType: ensureEnum(req.body.job_type, 'job_type', ['full_time', 'internship', 'part_time', 'contract', 'remote']),
    distributionMode: ensureEnum(req.body.distribution_mode, 'distribution_mode', ['off_campus_public', 'campus_cdc']),
    salaryMin: ensureNumber(req.body.salary_min, 'salary_min', { required: false, min: 0 }),
    salaryMax: ensureNumber(req.body.salary_max, 'salary_max', { required: false, min: 0 }),
    applicationDeadline: ensureString(req.body.application_deadline, 'application_deadline', { required: false }),
    eligibilityRules: req.body.eligibility_rules || {},
    requiredSkills: ensureArray(req.body.required_skills, 'required_skills'),
    attachmentUrls: ensureArray(req.body.attachment_urls, 'attachment_urls'),
  };
}

function validateAssignment(req) {
  return {
    collegeId: ensureString(req.body.college_id, 'college_id', { required: false }),
    batchId: ensureString(req.body.batch_id, 'batch_id', { required: false }),
    groupId: ensureString(req.body.group_id, 'group_id', { required: false }),
    visibilityStatus: ensureEnum(req.body.visibility_status, 'visibility_status', ['pending', 'approved', 'restricted', 'rejected'], { required: false }),
    overrideReason: ensureString(req.body.override_reason, 'override_reason', { required: false }),
    internalNotes: ensureString(req.body.internal_notes, 'internal_notes', { required: false }),
  };
}

function validateApplication(req) {
  return {
    coverLetter: ensureString(req.body.cover_letter, 'cover_letter', { required: false }),
  };
}

module.exports = {
  validateApplication,
  validateAssignment,
  validateJob,
};
