const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const SCAM_THRESHOLD = parseInt(process.env.SCAM_THRESHOLD) || 70;

// GET /api/jobs - Global Job Feed for the native Jobs tab
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select('*, employer:employers(company_name, company_logo_url, credibility_score)')
      .eq('global_status', 'verified')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json({ jobs: data || [], pagination: { totalPages: 1 } });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/jobs/:id - Fetch specifically requested job
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select('*, employer:employers(company_name, company_logo_url, credibility_score, company_description)')
      .eq('id', req.params.id)
      .single();
      
    if (error) throw error;
    res.json({ job: data });
  } catch (err) {
    res.status(500).json({ error: 'Job fetch failed' });
  }
});

// POST /api/jobs - Create a core Job (An Employer global draft)
router.post('/', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { title, description, salary_min, salary_max, location, job_type, application_deadline, target_college_id } = req.body;

    const { data: employer } = await supabaseAdmin.from('employers').select('id').eq('user_id', req.user.id).single();
    if (!employer) return res.status(400).json({ error: 'Employer profile not found' });

    // Step 1: Run AI Engine for Fraud/Scam analysis!
    let scamResult = { scam_score: 0, risk_level: 'low', explanation: 'AI Offline' };
    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict-scam`, { title, description, salary_min, salary_max }, { timeout: 15000 });
      scamResult = aiResponse.data;
    } catch (aiErr) {
      console.warn('AI offline during job post');
    }

    const isFlagged = scamResult.scam_score >= SCAM_THRESHOLD;
    const globalStatus = isFlagged ? 'flagged_scam' : 'under_ai_review'; // 'verified' requires Super Admin normally or immediate pass

    // Step 2: Insert into core jobs table
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        employer_id: employer.id, title, description,
        salary_min, salary_max, location, job_type,
        application_deadline, global_status: isFlagged ? 'flagged_scam' : 'verified'
      })
      .select().single();

    if (jobError) throw jobError;

    // Step 3: Insert detailed AI review 
    await supabaseAdmin.from('job_ai_reviews').insert({
      job_id: job.id, scam_score: scamResult.scam_score,
      risk_level: scamResult.risk_level, explanation: scamResult.explanation
    });

    // Step 4: If employer specified a target college when creating, request assignment
    if (target_college_id && !isFlagged) {
      await supabaseAdmin.from('job_assignments').insert({
        job_id: job.id,
        college_id: target_college_id,
        visibility_status: 'pending_cdc_approval'
      });
    }

    res.status(201).json({ job, scam_analysis: { flagged: isFlagged, ...scamResult }});
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// POST /api/jobs/:id/apply - Apply to a Job
router.post('/:id/apply', authenticate, authorize('student', 'alumni'), async (req, res) => {
  try {
    const { cover_letter } = req.body;

    const { data: student } = await supabaseAdmin.from('students').select('id, college_id').eq('user_id', req.user.id).single();
    if (!student) return res.status(400).json({ error: 'Complete Profile first' });

    const { data: job } = await supabaseAdmin.from('jobs').select('global_status').eq('id', req.params.id).single();
    if (!job) return res.status(404).json({ error: 'Job missing' });

    // Ensure the user actually has permission to apply:
    // If the job isn't globally active, it must be explicitly routed to their college via the CDC Admin.
    if (job.global_status !== 'verified') {
      if (!student.college_id) return res.status(403).json({ error: 'This is a private campus job.' });

      const { data: assignment } = await supabaseAdmin
        .from('job_assignments')
        .select('visibility_status')
        .eq('job_id', req.params.id)
        .eq('college_id', student.college_id)
        .single();

      if (!assignment || assignment.visibility_status !== 'approved') {
        return res.status(403).json({ error: 'Job is not actively assigned to your exact college' });
      }
    }

    // Insert Application Tracker
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .insert({ job_id: req.params.id, student_id: student.id, cover_letter })
      .select().single();

    if (error) throw error;
    res.status(201).json({ application, message: 'Successfully applied' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// GET /api/jobs/:id/applications - Get applications for an Employer's job
router.get('/:id/applications', authenticate, authorize('employer', 'cdc_admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        student:students(
          cgpa, resume_url, department, batch_year,
          user:profiles(full_name, email)
        )
      `)
      .eq('job_id', req.params.id)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    res.json({ applications: data });
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

module.exports = router;
