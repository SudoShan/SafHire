const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Every route inside this file is protected by Super Admin scope!
router.use(authenticate, authorize('super_admin'));

// GET /api/super-admin/colleges - List all colleges
router.get('/colleges', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('colleges').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ colleges: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

// POST /api/super-admin/colleges - Create a new college
router.post('/colleges', async (req, res) => {
  try {
    const { name, domain, location } = req.body;
    const { data, error } = await supabaseAdmin
      .from('colleges')
      .insert({ name, domain, location, status: 'approved' })
      .select().single();
      
    if (error) throw error;
    res.status(201).json({ college: data, message: 'College officially added to platform' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create college' });
  }
});

// GET /api/super-admin/employers - Review all employers platform-wide
router.get('/employers', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('employers')
      .select('*, verifications:employer_verifications(*)')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json({ employers: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employers' });
  }
});

// PUT /api/super-admin/employers/:id/verify - Approve an employer globally
router.put('/employers/:id/verify', async (req, res) => {
  try {
    const { global_status } = req.body; // 'verified' or 'blocked'
    const { data, error } = await supabaseAdmin
      .from('employers')
      .update({ global_status })
      .eq('id', req.params.id)
      .select().single();
      
    if (error) throw error;

    // Log the verification
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: req.user.id,
      action: 'global_employer_verification',
      entity_type: 'employer',
      entity_id: req.params.id,
      details: { status_applied: global_status }
    });

    res.json({ employer: data, message: `Employer globally ${global_status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify employer' });
  }
});

module.exports = router;
