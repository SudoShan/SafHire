const dns = require('node:dns').promises;
const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');
const { getEmployerByUserId } = require('./common.service');
const { writeAuditLog } = require('../helpers/audit');

async function getProfile(userId) {
  const employer = await getEmployerByUserId(userId);
  if (!employer) {
    return null;
  }

  const [{ data: verifications }, { data: access }, { data: appeals }] = await Promise.all([
    serviceClient.from('employer_verifications').select('*').eq('employer_id', employer.id).order('created_at', { ascending: false }),
    serviceClient
      .from('employer_college_access')
      .select('*, college:colleges(id, name, code, location, status)')
      .eq('employer_id', employer.id)
      .order('created_at', { ascending: false }),
    serviceClient
      .from('appeals')
      .select('id, job_id, reason, status, created_at, resolved_at')
      .eq('employer_id', employer.id)
      .order('created_at', { ascending: false }),
  ]);

  return {
    ...employer,
    verifications: verifications || [],
    college_access: access || [],
    appeals: appeals || [],
  };
}

async function upsertProfile(userId, payload, reqMeta = {}) {
  const { data, error } = await serviceClient
    .from('employers')
    .upsert(
      {
        user_id: userId,
        company_name: payload.companyName,
        company_type: payload.companyType,
        official_email: payload.officialEmail,
        company_domain: payload.companyDomain,
        website: payload.website,
        linkedin_url: payload.linkedinUrl,
        company_logo_url: payload.companyLogoUrl,
        company_size: payload.companySize,
        registration_document_url: payload.registrationDocumentUrl,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to save employer profile');
  }

  await writeAuditLog({
    actorId: userId,
    action: 'employer_profile_saved',
    entityType: 'employer',
    entityId: data.id,
    metadata: {
      company_name: data.company_name,
      verification_status: data.verification_status,
    },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function listCollegeAccess(userId) {
  const employer = await getEmployerByUserId(userId, { required: true });

  const [{ data: colleges, error }, { data: access }] = await Promise.all([
    serviceClient.from('colleges').select('id, code, name, location, status').eq('status', 'approved').order('name'),
    serviceClient.from('employer_college_access').select('*').eq('employer_id', employer.id),
  ]);

  if (error) {
    throw new AppError(500, 'Failed to load colleges');
  }

  const accessMap = new Map((access || []).map((item) => [item.college_id, item]));

  return (colleges || []).map((college) => ({
    ...college,
    access: accessMap.get(college.id) || null,
  }));
}

async function requestCollegeAccess(userId, payload, reqMeta = {}) {
  const employer = await getEmployerByUserId(userId, { required: true });

  if (employer.verification_status === 'blocked') {
    throw new AppError(403, 'Blocked employers cannot request college access');
  }

  // Check for existing pending or approved requests
  const { data: existing } = await serviceClient
    .from('employer_college_access')
    .select('status')
    .eq('employer_id', employer.id)
    .eq('college_id', payload.collegeId)
    .maybeSingle();

  if (existing && ['requested', 'approved'].includes(existing.status)) {
    throw new AppError(400, `You already have an ${existing.status} access record for this college.`);
  }

  const { data, error } = await serviceClient
    .from('employer_college_access')
    .upsert(
      {
        employer_id: employer.id,
        college_id: payload.collegeId,
        status: 'requested',
        requested_by: userId,
        requested_at: new Date().toISOString(),
        reason: payload.reason,
      },
      { onConflict: 'employer_id,college_id' },
    )
    .select('*, college:colleges(id, name, code, location)')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to request college access');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: payload.collegeId,
    action: 'employer_college_access_requested',
    entityType: 'employer_college_access',
    entityId: data.id,
    metadata: { status: data.status },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function verifyDomain(userId, reqMeta = {}) {
  const employer = await getEmployerByUserId(userId, { required: true });
  const evidence = {
    mx_records: false,
    a_records: false,
  };

  try {
    evidence.mx_records = (await dns.resolveMx(employer.company_domain)).length > 0;
  } catch (_error) {
    evidence.mx_records = false;
  }

  try {
    evidence.a_records = (await dns.resolve4(employer.company_domain)).length > 0;
  } catch (_error) {
    evidence.a_records = false;
  }

  const status = evidence.mx_records && evidence.a_records ? 'approved' : 'rejected';

  const { data, error } = await serviceClient
    .from('employer_verifications')
    .insert({
      employer_id: employer.id,
      verification_type: 'domain_dns',
      status,
      evidence,
      notes: status === 'approved' ? 'Domain DNS checks passed.' : 'DNS checks failed.',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to record verification result');
  }

  await writeAuditLog({
    actorId: userId,
    action: 'employer_domain_verification_requested',
    entityType: 'employer_verification',
    entityId: data.id,
    metadata: evidence,
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

module.exports = {
  getProfile,
  listCollegeAccess,
  requestCollegeAccess,
  upsertProfile,
  verifyDomain,
};
