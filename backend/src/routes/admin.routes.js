const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/admin/dashboard - Admin dashboard stats
router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: totalJobs },
      { count: flaggedJobs },
      { count: pendingAppeals },
      { count: totalApplications }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),
      supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }).eq('appeal_status', 'pending'),
      supabaseAdmin.from('job_applications').select('*', { count: 'exact', head: true })
    ]);

    // Get role distribution
    const { data: roleCounts } = await supabaseAdmin
      .from('profiles')
      .select('role');

    const roleDistribution = {};
    roleCounts?.forEach(r => {
      roleDistribution[r.role] = (roleDistribution[r.role] || 0) + 1;
    });

    res.json({
      stats: {
        totalUsers,
        totalJobs,
        flaggedJobs,
        pendingAppeals,
        totalApplications,
        roleDistribution
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/admin/flagged-jobs - Get flagged/under review jobs
router.get('/flagged-jobs', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select(`
        *,
        employer:employer_profiles(
          company_name, company_email, credibility_score, domain_verified, email_verified
        )
      `)
      .in('status', ['under_review', 'appealed'])
      .order('scam_score', { ascending: false });

    if (error) throw error;
    res.json({ jobs: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flagged jobs' });
  }
});

// PUT /api/admin/jobs/:id/review - Review a flagged job
router.put('/jobs/:id/review', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { action, reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    const updateData = {
      status: action === 'approve' ? 'active' : 'rejected',
      appeal_status: action === 'approve' ? 'approved' : 'rejected'
    };

    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ job: data, message: `Job ${action}d successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to review job' });
  }
});

// GET /api/admin/users - List all users
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' });

    if (role) query = query.eq('role', role);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + parseInt(limit) - 1)
                 .order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      users: data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/employers - List employers with verification status
router.get('/employers', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('employer_profiles')
      .select(`
        *,
        user:profiles(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ employers: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employers' });
  }
});

// PUT /api/admin/employers/:id/approve - Approve an employer
router.put('/employers/:id/approve', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('employer_profiles')
      .update({ is_approved: true })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ employer: data, message: 'Employer approved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve employer' });
  }
});

module.exports = router;
