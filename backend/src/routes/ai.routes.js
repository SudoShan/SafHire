const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// POST /api/ai/analyze-job - Analyze a job for scam indicators
router.post('/analyze-job', authenticate, async (req, res) => {
  try {
    const { title, description, salary_min, salary_max, requirements } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/predict-scam`, {
      title,
      description,
      salary_min,
      salary_max,
      requirements: requirements || []
    }, { timeout: 15000 });

    res.json(response.data);
  } catch (err) {
    console.error('AI analysis error:', err.message);
    res.status(503).json({ error: 'AI service unavailable' });
  }
});

// POST /api/ai/preparation - Generate interview preparation
router.post('/preparation', authenticate, async (req, res) => {
  try {
    const { job_title, job_description, required_skills } = req.body;

    if (!job_title) {
      return res.status(400).json({ error: 'Job title is required' });
    }

    let prepData;
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/interview-prep`, {
        job_title,
        job_description: job_description || '',
        required_skills: required_skills || []
      }, { timeout: 30000 });
      prepData = response.data;
    } catch (aiErr) {
      // Fallback: generate basic preparation
      prepData = generateFallbackPrep(job_title, required_skills || []);
    }

    // Store preparation history
    if (req.body.job_id) {
      await supabaseAdmin
        .from('ai_preparations')
        .insert({
          user_id: req.user.id,
          job_id: req.body.job_id,
          job_title,
          topics: prepData.topics || [],
          questions: prepData.questions || []
        });
    }

    res.json(prepData);
  } catch (err) {
    console.error('Preparation error:', err);
    res.status(500).json({ error: 'Failed to generate preparation materials' });
  }
});

// GET /api/ai/preparation-history - Get user's preparation history
router.get('/preparation-history', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_preparations')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ preparations: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/ai/match - Calculate Math-Based Hybrid TF-IDF Student Fit Score
router.post('/match', authenticate, async (req, res) => {
  try {
    const { job_id, job_description, job_requirements } = req.body;
    
    const { data: student } = await supabaseAdmin.from('students').select('skills').eq('user_id', req.user.id).single();
    if (!student) return res.status(400).json({ error: 'Please set up your student profile first' });
    
    const response = await axios.post(`${AI_SERVICE_URL}/match-job`, {
      student_skills: student.skills || [],
      job_description: job_description || '',
      job_requirements: job_requirements || []
    }, { timeout: 15000 });
    
    res.json(response.data);
  } catch (err) {
    console.error('Match error:', err.message);
    res.status(503).json({ error: 'Smart Matcher offline' });
  }
});

// Fallback preparation generator
function generateFallbackPrep(jobTitle, skills) {
  const title = jobTitle.toLowerCase();

  const topicMap = {
    'engineer': ['Data Structures & Algorithms', 'System Design', 'Object-Oriented Programming', 'Database Design', 'API Design'],
    'developer': ['Web Development Fundamentals', 'Frontend/Backend Architecture', 'Version Control (Git)', 'Testing Methodologies', 'CI/CD'],
    'data': ['Statistics & Probability', 'Machine Learning Basics', 'SQL & Data Modeling', 'Data Visualization', 'A/B Testing'],
    'design': ['UI/UX Principles', 'Design Systems', 'Prototyping Tools', 'User Research Methods', 'Accessibility'],
    'manager': ['Agile/Scrum Methodology', 'Stakeholder Management', 'Risk Assessment', 'Team Leadership', 'Product Strategy'],
    'analyst': ['Data Analysis', 'Business Intelligence', 'SQL', 'Excel/Spreadsheets', 'Reporting & Dashboards'],
    'intern': ['Core CS Fundamentals', 'Problem Solving', 'Communication Skills', 'Basic Coding', 'Team Collaboration']
  };

  let topics = ['Problem Solving', 'Communication Skills', 'Technical Aptitude'];
  for (const [key, value] of Object.entries(topicMap)) {
    if (title.includes(key)) {
      topics = value;
      break;
    }
  }

  if (skills.length > 0) {
    topics.push(...skills.slice(0, 3).map(s => `${s} - Deep Dive`));
  }

  const questions = [
    `Tell me about your experience relevant to the ${jobTitle} role.`,
    `What excites you about this position?`,
    `Describe a challenging project you've worked on.`,
    `How do you approach problem-solving in a team environment?`,
    `Where do you see yourself in 5 years?`,
    `What is your greatest strength and how does it apply to this role?`,
    `Tell me about a time you had to learn a new technology quickly.`,
    `How do you handle tight deadlines and pressure?`
  ];

  return { topics, questions, generated_by: 'fallback' };
}

module.exports = router;
