const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate, authorize('cdc_admin'));

// Middleware to inject `req.college_id` for isolated querying
router.use(async (req, res, next) => {
  try {
    const { data: cdc, error } = await supabaseAdmin
      .from('cdc_admins')
      .select('college_id')
      .eq('user_id', req.user.id)
      .single();

    if (error || !cdc) {
      return res.status(403).json({ error: 'You are not assigned to any college CDC.' });
    }
    req.college_id = cdc.college_id;
    next();
  } catch (err) {
    res.status(500).json({ error: 'CDC verification failed' });
  }
});

// GET /api/cdc/students - Get isolated list of students from this CDC's college
router.get('/students', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*, user:profiles(full_name, email, is_active)')
      .eq('college_id', req.college_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ students: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST /api/cdc/batches - Create a new student batch (e.g. "2024 CS")
router.post('/batches', async (req, res) => {
  try {
    const { name, graduation_year, department } = req.body;
    const { data, error } = await supabaseAdmin
      .from('batches')
      .insert({ college_id: req.college_id, name, graduation_year, department })
      .select().single();

    if (error) throw error;
    res.status(201).json({ batch: data, message: 'Batch successfully created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// GET /api/cdc/employer-requests - View global employers asking for access to this college
router.get('/employer-requests', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('employer_college_access')
      .select('*, employer:employers(*)')
      .eq('college_id', req.college_id)
      .eq('status', 'requested');

    if (error) throw error;
    res.json({ requests: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employer requests' });
  }
});

// POST /api/cdc/jobs/:id/assign - Explicitly map a job to a specific batch
router.post('/jobs/:id/assign', async (req, res) => {
  try {
    const { target_batch_id, target_group_id, cdc_internal_notes } = req.body;
    
    // Create the isolated job assignment mapped strictly to this college
    const { data, error } = await supabaseAdmin
      .from('job_assignments')
      .insert({
        job_id: req.params.id,
        college_id: req.college_id,
        target_batch_id: target_batch_id || null,
        target_group_id: target_group_id || null,
        visibility_status: 'approved',
        cdc_internal_notes
      })
      .select().single();

    if (error) throw error;
    res.json({ assignment: data, message: 'Job successfully routed to targeted students' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign job' });
  }
});

module.exports = router;
