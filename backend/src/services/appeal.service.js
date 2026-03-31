const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');
const { getEmployerByUserId } = require('./common.service');
const { writeAuditLog } = require('../helpers/audit');

async function listMyAppeals(user) {
  if (user.roleCode === 'super_admin') {
    const { data, error } = await serviceClient
      .from('appeals')
      .select(`
        *,
        employer:employers(id, company_name),
        job:jobs(id, title, role)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(500, 'Failed to load appeals');
    }
    return data || [];
  }

  const employer = await getEmployerByUserId(user.id, { required: true });
  const { data, error } = await serviceClient
    .from('appeals')
    .select(`
      *,
      job:jobs(id, title, role)
    `)
    .eq('employer_id', employer.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load appeals');
  }
  return data || [];
}

async function createAppeal(user, payload, reqMeta = {}) {
  const employer = await getEmployerByUserId(user.id, { required: true });
  const { data, error } = await serviceClient
    .from('appeals')
    .insert({
      job_id: payload.jobId,
      employer_id: employer.id,
      submitted_by: user.id,
      reason: payload.reason,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to submit appeal');
  }

  await writeAuditLog({
    actorId: user.id,
    action: 'appeal_created',
    entityType: 'appeal',
    entityId: data.id,
    metadata: { job_id: payload.jobId },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function reviewAppeal(userId, appealId, status, resolutionNotes, reqMeta = {}) {
  const { data, error } = await serviceClient
    .from('appeals')
    .update({
      status,
      resolution_notes: resolutionNotes,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', appealId)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to review appeal');
  }

  if (status === 'approved') {
    await serviceClient
      .from('jobs')
      .update({
        status: 'under_review',
        status_reason: 'Appeal approved. Job returned to review queue.',
      })
      .eq('id', data.job_id);
  }

  await writeAuditLog({
    actorId: userId,
    action: 'appeal_reviewed',
    entityType: 'appeal',
    entityId: appealId,
    metadata: { status },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

module.exports = {
  createAppeal,
  listMyAppeals,
  reviewAppeal,
};
