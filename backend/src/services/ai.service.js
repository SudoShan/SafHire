const axios = require('axios');
const FormData = require('form-data');
const env = require('../config/env');
const AppError = require('../helpers/AppError');

const aiClient = axios.create({
  baseURL: env.aiServiceUrl,
  timeout: 30000,
  headers: {
    'x-internal-secret': env.aiInternalSecret,
  },
});

// Safe fallback when AI service is unavailable — job still gets created as under_review
const SCAM_FALLBACK = {
  scam_score: 0,
  risk_level: 'low',
  explanation: 'AI service unavailable. Job queued for manual review.',
  extracted_red_flags: [],
  match_quality: null,
  fallback: true,
};

async function predictScam(payload) {
  try {
    const { data } = await aiClient.post('/predict-scam', payload);
    return data;
  } catch (_error) {
    // Return safe fallback — do NOT block job creation
    return { ...SCAM_FALLBACK };
  }
}

async function matchJob(payload) {
  try {
    const { data } = await aiClient.post('/match-job', payload);
    return data;
  } catch (_error) {
    throw new AppError(503, 'AI matching is currently unavailable');
  }
}

async function summarizeDiscussion(payload) {
  try {
    const { data } = await aiClient.post('/summarize-discussion', payload);
    return data;
  } catch (_error) {
    throw new AppError(503, 'AI discussion summarization is currently unavailable');
  }
}

async function generatePrep(payload) {
  try {
    const { data } = await aiClient.post('/generate-prep', payload);
    return data;
  } catch (_error) {
    throw new AppError(503, 'AI preparation service is currently unavailable');
  }
}

async function extractResumeSkills(file) {
  try {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const { data } = await aiClient.post('/extract-resume-skills', form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });

    return data;
  } catch (_error) {
    // Return empty extraction — resume still uploads, skills just aren't parsed
    return { skills: [], extracted_skills: [], name: null, email: null };
  }
}

module.exports = {
  extractResumeSkills,
  generatePrep,
  matchJob,
  predictScam,
  summarizeDiscussion,
};
