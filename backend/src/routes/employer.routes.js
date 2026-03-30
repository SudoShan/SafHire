const express = require('express');
const router = express.Router();
const dns = require('dns').promises;
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// POST /api/employers/profile - Create/update employer profile
router.post('/profile', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { company_name, company_type, official_email, company_domain, website, linkedin_url, company_logo_url, company_size } = req.body;

    if (!company_name || !official_email || !company_domain) {
      return res.status(400).json({ error: 'Company name, email, and domain are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('employers')
      .upsert({
        user_id: req.user.id,
        company_name,
        company_type,
        official_email,
        company_domain,
        website,
        linkedin_url,
        company_logo_url,
        company_size
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ profile: data, message: 'Profile saved successfully' });
  } catch (err) {
    console.error('Employer profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/employers/profile - Get profile
router.get('/profile', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('employers')
      .select('*, verifications:employer_verifications(*)')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ profile: data || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/employers/colleges - Fetch colleges and the employer's access status
router.get('/colleges', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { data: employer } = await supabaseAdmin.from('employers').select('id').eq('user_id', req.user.id).single();
    if (!employer) return res.status(400).json({ error: 'Employer profile not found' });

    // We fetch all approved colleges and merge access requested array
    const { data: colleges } = await supabaseAdmin.from('colleges').select('*').eq('status', 'approved');
    const { data: access } = await supabaseAdmin.from('employer_college_access').select('*').eq('employer_id', employer.id);

    const mappedColleges = colleges.map(c => {
      const match = access.find(a => a.college_id === c.id);
      return {
        ...c,
        bridge_status: match ? match.status : 'unrequested',
        requested_at: match ? match.requested_at : null
      };
    });

    res.json({ colleges: mappedColleges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

// POST /api/employers/request-college - Request access to a college
router.post('/request-college', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { college_id } = req.body;
    if (!college_id) return res.status(400).json({ error: 'College ID is required' });

    const { data: employer } = await supabaseAdmin.from('employers').select('id, global_status').eq('user_id', req.user.id).single();
    if (!employer) return res.status(400).json({ error: 'Employer profile not found' });

    // If global policy dictates you must be verified first
    if (employer.global_status === 'blocked') {
      return res.status(403).json({ error: 'Your account is currently restricted from platform expansion' });
    }

    const { data, error } = await supabaseAdmin
      .from('employer_college_access')
      .upsert({
        employer_id: employer.id,
        college_id: college_id,
        status: 'requested',
        requested_at: new Date().toISOString()
      }, { onConflict: 'employer_id,college_id' })
      .select().single();

    if (error) throw error;
    res.json({ access: data, message: 'Access request securely transmitted to the college CDC' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request access' });
  }
});

// POST /api/employers/verify-domain - Basic Domain DNS Verification
router.post('/verify-domain', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { data: employer } = await supabaseAdmin.from('employers').select('id, company_domain').eq('user_id', req.user.id).single();
    if (!employer || !employer.company_domain) return res.status(400).json({ error: 'Domain missing in profile' });

    const domain = employer.company_domain;
    let checks = { has_mx: false, has_a: false, is_valid: false };

    try { checks.has_mx = (await dns.resolveMx(domain)).length > 0; } catch (e) {}
    try { checks.has_a = (await dns.resolve4(domain)).length > 0; } catch (e) {}

    checks.is_valid = checks.has_mx && checks.has_a;

    // Log the verification attempt
    await supabaseAdmin.from('employer_verifications').insert({
      employer_id: employer.id,
      verification_type: 'domain_dns',
      status: checks.is_valid ? 'approved' : 'rejected'
    });

    res.json({ domain, checks, verified: checks.is_valid, message: checks.is_valid ? 'Domain fully verified.' : 'DNS missing.' });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// GET /api/employers/my-jobs - Fetch jobs posted by the logged in employer
router.get('/my-jobs', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { data: employer } = await supabaseAdmin.from('employers').select('id').eq('user_id', req.user.id).single();
    if (!employer) return res.status(400).json({ error: 'Complete your Employer Profile first to unlock jobs!' });

    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('employer_id', employer.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ jobs: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

module.exports = router;
