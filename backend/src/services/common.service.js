const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');

async function getUserById(userId) {
  const { data, error } = await serviceClient.from('users').select('*').eq('id', userId).single();

  if (error || !data) {
    throw new AppError(404, 'User not found');
  }

  return data;
}

async function getStudentByUserId(userId, { required = false } = {}) {
  const { data, error } = await serviceClient
    .from('students')
    .select(`
      *,
      batch:batches(*),
      college:colleges(id, name, code, domain, slug, location, status)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if ((error || !data) && required) {
    throw new AppError(404, 'Student profile not found');
  }

  return data || null;
}

async function getEmployerByUserId(userId, { required = false } = {}) {
  const { data, error } = await serviceClient
    .from('employers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if ((error || !data) && required) {
    throw new AppError(404, 'Employer profile not found');
  }

  return data || null;
}

async function getCdcAdminByUserId(userId, { required = false } = {}) {
  const { data, error } = await serviceClient
    .from('cdc_admins')
    .select(`
      *,
      college:colleges(id, name, code, domain, slug, location, status)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if ((error || !data) && required) {
    throw new AppError(403, 'CDC admin is not assigned to a college');
  }

  return data || null;
}

async function getJobById(jobId) {
  const { data, error } = await serviceClient
    .from('jobs')
    .select(`
      *,
      employer:employers(*),
      ai_review:job_ai_reviews(*)
    `)
    .eq('id', jobId)
    .single();

  if (error || !data) {
    throw new AppError(404, 'Job not found');
  }

  return data;
}

async function getDiscussionForScope(jobId, collegeId = null) {
  const query = serviceClient
    .from('discussions')
    .select('*')
    .eq('job_id', jobId);

  if (collegeId) {
    query.eq('college_id', collegeId);
  } else {
    query.is('college_id', null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new AppError(500, 'Failed to load discussion scope');
  }

  return data || null;
}

async function ensureDiscussionForScope({ jobId, collegeId = null, createdBy }) {
  const existing = await getDiscussionForScope(jobId, collegeId);
  if (existing) {
    return existing;
  }

  const scope = collegeId ? 'college' : 'global';
  const { data, error } = await serviceClient
    .from('discussions')
    .insert({
      job_id: jobId,
      college_id: collegeId,
      scope,
      created_by: createdBy,
      title: scope === 'global' ? 'Global Job Discussion' : 'Campus Job Discussion',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to initialize discussion');
  }

  return data;
}

module.exports = {
  ensureDiscussionForScope,
  getCdcAdminByUserId,
  getDiscussionForScope,
  getEmployerByUserId,
  getJobById,
  getStudentByUserId,
  getUserById,
};
