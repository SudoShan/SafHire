const aiService = require('../services/ai.service');
const { getJobById, getStudentByUserId } = require('../services/common.service');

async function analyzeJob(req, res) {
  const result = await aiService.predictScam(req.body);
  res.json(result);
}

async function matchJob(req, res) {
  const student = await getStudentByUserId(req.user.id, { required: true });
  const job = await getJobById(req.body.job_id);
  const result = await aiService.matchJob({
    student_skills: [...(student.skills || []), ...(student.parsed_resume_skills || [])],
    job_description: job.description,
    job_requirements: job.required_skills || [],
  });
  res.json(result);
}

async function generatePrep(req, res) {
  const job = await getJobById(req.body.job_id);
  const result = await aiService.generatePrep({
    job_title: job.role,
    job_description: job.description,
    required_skills: job.required_skills || [],
  });
  res.json(result);
}

module.exports = {
  analyzeJob,
  generatePrep,
  matchJob,
};
