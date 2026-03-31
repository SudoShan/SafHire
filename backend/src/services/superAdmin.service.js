const AppError = require('../helpers/AppError');
const env = require('../config/env');
const { serviceClient } = require('../config/supabase');
const { writeAuditLog } = require('../helpers/audit');

async function listColleges() {
  const { data, error } = await serviceClient
    .from('colleges')
    .select(`
      *,
      cdc_admins:cdc_admins(id, user_id, status)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load colleges');
  }

  return data || [];
}

async function createCollege(userId, payload, reqMeta = {}) {
  const { data, error } = await serviceClient
    .from('colleges')
    .insert({
      code: payload.code,
      name: payload.name,
      slug: payload.slug,
      domain: payload.domain,
      location: payload.location,
      status: 'approved',
      created_by: userId,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to create college');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: data.id,
    action: 'college_created',
    entityType: 'college',
    entityId: data.id,
    metadata: { status: data.status },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function updateCollegeStatus(userId, collegeId, status, reqMeta = {}) {
  const { data, error } = await serviceClient
    .from('colleges')
    .update({
      status,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', collegeId)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to update college status');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: data.id,
    action: 'college_status_updated',
    entityType: 'college',
    entityId: data.id,
    metadata: { status },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function provisionCdcAdmin(userId, payload, reqMeta = {}) {
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.fullName,
      role: 'cdc_admin',
    },
  });

  if (authError || !authData.user) {
    throw new AppError(400, authError?.message || 'Failed to create CDC auth user');
  }

  const { error: userError } = await serviceClient.from('users').insert({
    id: authData.user.id,
    role_code: 'cdc_admin',
    email: payload.email,
    full_name: payload.fullName,
    college_email: payload.email,
  });

  if (userError) {
    await serviceClient.auth.admin.deleteUser(authData.user.id);
    throw new AppError(500, 'Failed to create CDC profile');
  }

  const { data, error } = await serviceClient
    .from('cdc_admins')
    .insert({
      user_id: authData.user.id,
      college_id: payload.collegeId,
      designation: payload.designation,
      status: 'active',
      assigned_by: userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    await serviceClient.from('users').delete().eq('id', authData.user.id);
    await serviceClient.auth.admin.deleteUser(authData.user.id);
    throw new AppError(500, 'Failed to assign CDC admin');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: payload.collegeId,
    action: 'cdc_admin_provisioned',
    entityType: 'cdc_admin',
    entityId: data.id,
    metadata: { email: payload.email },
    ipAddress: reqMeta.ipAddress,
  });

  return {
    ...data,
    bootstrap_secret_hint: env.bootstrapSecret ? 'configured' : 'missing',
  };
}

async function listEmployers() {
  const { data, error } = await serviceClient
    .from('employers')
    .select(`
      *,
      user:users(id, full_name, email),
      verifications:employer_verifications(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load employers');
  }

  return data || [];
}

async function updateEmployerStatus(userId, employerId, status, blockedReason, reqMeta = {}) {
  const payload = {
    verification_status: status,
    verified_by: status === 'verified' ? userId : null,
    verified_at: status === 'verified' ? new Date().toISOString() : null,
    blocked_reason: status === 'blocked' ? blockedReason : null,
  };

  const { data, error } = await serviceClient
    .from('employers')
    .update(payload)
    .eq('id', employerId)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to update employer status');
  }

  await writeAuditLog({
    actorId: userId,
    action: 'employer_status_updated',
    entityType: 'employer',
    entityId: employerId,
    metadata: { status, blocked_reason: blockedReason || null },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function listFlaggedJobs() {
  const { data, error } = await serviceClient
    .from('jobs')
    .select(`
      *,
      employer:employers(id, company_name, verification_status, credibility_score),
      ai_review:job_ai_reviews(*)
    `)
    .in('status', ['restricted', 'blocked'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load flagged jobs');
  }

  return data || [];
}

async function listUsers() {
  const { data, error } = await serviceClient
    .from('users')
    .select('id, full_name, email, role_code, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load users');
  }

  return data || [];
}

module.exports = {
  createCollege,
  listColleges,
  listEmployers,
  listFlaggedJobs,
  listUsers,
  provisionCdcAdmin,
  updateCollegeStatus,
  updateEmployerStatus,
};
