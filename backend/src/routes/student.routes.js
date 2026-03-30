const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /api/students/colleges - Get valid colleges for registration
router.get('/colleges', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('colleges').select('id, name').eq('status', 'approved');
    res.json({ colleges: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/students/profile - Get student profile
router.get('/profile', authenticate, authorize('student', 'alumni'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*, college:colleges(name, domain)')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ profile: data || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// POST /api/students/profile - Update student profile
router.post('/profile', authenticate, authorize('student', 'alumni'), async (req, res) => {
  try {
    const { college_id, enrollment_number, department, batch_year, cgpa, skills, preferred_role } = req.body;

    const { data, error } = await supabaseAdmin
      .from('students')
      .upsert({
        user_id: req.user.id,
        college_id: college_id || null, // Nulled for global job seekers
        enrollment_number: enrollment_number || null,
        department: department || null,
        batch_year: batch_year || null,
        cgpa: cgpa || 0,
        skills: skills || [],
        preferred_role
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/students/resume - Upload resume to Supabase Storage and Parse
router.post('/resume', authenticate, authorize('student', 'alumni'), upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Resume file is required' });

    const fileName = `resumes/${req.user.id}/${Date.now()}_${req.file.originalname}`;
    const { error: uploadError } = await supabaseAdmin.storage.from('resumes').upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseAdmin.storage.from('resumes').getPublicUrl(fileName);
    const resumeUrl = urlData.publicUrl;

    let parsedSkills = [];
    try {
      const formData = new FormData();
      formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/parse-resume`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      parsedSkills = aiResponse.data.skills || [];
    } catch (aiErr) {
      console.warn('Resume parsing service unavailable:', aiErr.message);
    }

    // Must ensure the profile actually exists before updating it!
    const { data: existingStudent } = await supabaseAdmin.from('students').select('id').eq('user_id', req.user.id).single();
    if (!existingStudent) {
       return res.status(400).json({ error: 'Please submit your basic "Academic Linkage" profile form at the top first before uploading a resume.' });
    }

    const { data, error } = await supabaseAdmin
      .from('students')
      .update({ resume_url: resumeUrl, skills: parsedSkills })
      .eq('user_id', req.user.id)
      .select().single();

    if (error) throw error;
    res.json({ profile: data, parsed_skills: parsedSkills, resume_url: resumeUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload resume' });
  }
});

// GET /api/students/eligible-jobs - V2: Hybrid Job Feed (Global + College Silo)
router.get('/eligible-jobs', authenticate, authorize('student', 'alumni'), async (req, res) => {
  try {
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id, college_id, batch_year, cgpa, skills')
      .eq('user_id', req.user.id)
      .single();

    if (!student) return res.status(400).json({ error: 'Complete your profile first' });

    // 1. Fetch Global verified Jobs natively (Employers posting for everyone)
    const { data: globalJobs } = await supabaseAdmin
      .from('jobs')
      .select('*, employer:employers(company_name, company_logo_url, credibility_score)')
      .eq('global_status', 'verified');
      
    let validJobs = globalJobs || [];

    // 2. Fetch specific private jobs routed ONLY to this student's college CDC
    if (student.college_id) {
      const { data: assignments } = await supabaseAdmin
        .from('job_assignments')
        .select(`
          id, visibility_status,
          job:jobs (
            *, 
            employer:employers(company_name, company_logo_url, credibility_score)
          )
        `)
        .eq('college_id', student.college_id)
        .eq('visibility_status', 'approved');

      if (assignments) {
        const privateJobs = assignments.map(a => a.job).filter(job => job.global_status !== 'blocked');
        
        // Merge the two sources and deduplicate by job.id
        const uniqueJobsMap = new Map();
        validJobs.forEach(j => uniqueJobsMap.set(j.id, j));
        privateJobs.forEach(j => uniqueJobsMap.set(j.id, j));
        validJobs = Array.from(uniqueJobsMap.values());
      }
    }

    res.json({ jobs: validJobs, student_cgpa: student.cgpa, student_skills: student.skills });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch authorized jobs' });
  }
});

// GET /api/students/applications - Fetch tracked applications
router.get('/applications', authenticate, authorize('student', 'alumni'), async (req, res) => {
  try {
    const { data: student } = await supabaseAdmin.from('students').select('id').eq('user_id', req.user.id).single();
    if (!student) return res.status(400).json({ error: 'Complete your profile first' });

    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        job:jobs(
          title, location, job_type, global_status,
          employer:employers(company_name, company_logo_url)
        )
      `)
      .eq('student_id', student.id)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    res.json({ applications: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

module.exports = router;
