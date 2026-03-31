const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');
const { ensureDiscussionForScope, getCdcAdminByUserId, getJobById } = require('./common.service');
const { writeAuditLog } = require('../helpers/audit');

function studentMatchesCriteria(student, criteria = {}) {
  if (criteria.department && student.department !== criteria.department) {
    return false;
  }
  if (criteria.min_cgpa && Number(student.cgpa) < Number(criteria.min_cgpa)) {
    return false;
  }
  if (criteria.max_backlogs !== undefined && Number(student.active_backlogs) > Number(criteria.max_backlogs)) {
    return false;
  }
  if (criteria.graduation_year && Number(student.graduation_year) !== Number(criteria.graduation_year)) {
    return false;
  }
  if (Array.isArray(criteria.required_skills) && criteria.required_skills.length > 0) {
    const knownSkills = new Set((student.skills || []).map((skill) => skill.toLowerCase()));
    const missing = criteria.required_skills.some((skill) => !knownSkills.has(String(skill).toLowerCase()));
    if (missing) {
      return false;
    }
  }
  return true;
}

async function getContext(userId) {
  return getCdcAdminByUserId(userId, { required: true });
}

async function getDashboard(userId) {
  const cdc = await getContext(userId);
  const [{ count: studentCount }, { count: employerRequests }, { count: assignmentsCount }] = await Promise.all([
    serviceClient.from('students').select('*', { count: 'exact', head: true }).eq('college_id', cdc.college_id),
    serviceClient
      .from('employer_college_access')
      .select('*', { count: 'exact', head: true })
      .eq('college_id', cdc.college_id)
      .eq('status', 'requested'),
    serviceClient
      .from('job_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('college_id', cdc.college_id),
  ]);

  return {
    college: cdc.college,
    stats: {
      students: studentCount || 0,
      employer_requests: employerRequests || 0,
      job_assignments: assignmentsCount || 0,
    },
  };
}

async function listStudents(userId) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient
    .from('students')
    .select(`
      *,
      user:users(id, full_name, email, college_email),
      batch:batches(id, name, graduation_year, department)
    `)
    .eq('college_id', cdc.college_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load students');
  }

  return data || [];
}

async function listBatches(userId) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient.from('batches').select('*').eq('college_id', cdc.college_id).order('graduation_year');
  if (error) {
    throw new AppError(500, 'Failed to load batches');
  }
  return data || [];
}

async function createBatch(userId, payload, reqMeta = {}) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient
    .from('batches')
    .insert({
      college_id: cdc.college_id,
      name: payload.name,
      department: payload.department,
      graduation_year: payload.graduationYear,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to create batch');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: cdc.college_id,
    action: 'batch_created',
    entityType: 'batch',
    entityId: data.id,
    metadata: { name: data.name },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function listGroups(userId) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient.from('groups').select('*').eq('college_id', cdc.college_id).order('created_at', { ascending: false });
  if (error) {
    throw new AppError(500, 'Failed to load groups');
  }
  return data || [];
}

async function createGroup(userId, payload, reqMeta = {}) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient
    .from('groups')
    .insert({
      college_id: cdc.college_id,
      name: payload.name,
      description: payload.description,
      criteria: payload.criteria,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to create group');
  }

  await refreshGroupMembers(userId, data.id);

  await writeAuditLog({
    actorId: userId,
    collegeId: cdc.college_id,
    action: 'group_created',
    entityType: 'group',
    entityId: data.id,
    metadata: { criteria: data.criteria },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function refreshGroupMembers(userId, groupId) {
  const cdc = await getContext(userId);
  const { data: group, error: groupError } = await serviceClient
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .eq('college_id', cdc.college_id)
    .single();

  if (groupError || !group) {
    throw new AppError(404, 'Group not found');
  }

  const { data: students, error } = await serviceClient.from('students').select('*').eq('college_id', cdc.college_id);
  if (error) {
    throw new AppError(500, 'Failed to load students for group refresh');
  }

  const matches = (students || []).filter((student) => studentMatchesCriteria(student, group.criteria));

  await serviceClient.from('group_membership').delete().eq('group_id', groupId);

  if (matches.length > 0) {
    await serviceClient.from('group_membership').insert(
      matches.map((student) => ({
        group_id: groupId,
        student_id: student.id,
        added_by: userId,
      })),
    );
  }

  return {
    group,
    member_count: matches.length,
  };
}

async function listEmployerRequests(userId) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient
    .from('employer_college_access')
    .select(`
      *,
      employer:employers(*)
    `)
    .eq('college_id', cdc.college_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'Failed to load employer requests');
  }

  return data || [];
}

async function listAssignableJobs(userId) {
  const cdc = await getContext(userId);

  const [{ data: access, error: accessError }, { data: jobs, error: jobsError }, { data: assignments }] = await Promise.all([
    serviceClient
      .from('employer_college_access')
      .select('employer_id')
      .eq('college_id', cdc.college_id)
      .eq('status', 'approved'),
    serviceClient
      .from('jobs')
      .select(`
        *,
        employer:employers(id, company_name, verification_status, credibility_score),
        ai_review:job_ai_reviews(*)
      `)
      .eq('distribution_mode', 'campus_cdc')
      .in('status', ['under_review', 'approved', 'restricted']),
    serviceClient
      .from('job_assignments')
      .select('*')
      .eq('college_id', cdc.college_id),
  ]);

  if (accessError || jobsError) {
    throw new AppError(500, 'Failed to load assignable jobs');
  }

  const allowedEmployerIds = new Set((access || []).map((item) => item.employer_id));
  const assignmentMap = new Map();

  for (const assignment of assignments || []) {
    if (!assignmentMap.has(assignment.job_id)) {
      assignmentMap.set(assignment.job_id, []);
    }
    assignmentMap.get(assignment.job_id).push(assignment);
  }

  return (jobs || [])
    .filter((job) => allowedEmployerIds.has(job.employer_id))
    .map((job) => ({
      ...job,
      assignments: assignmentMap.get(job.id) || [],
    }));
}

async function resolveEmployerRequest(userId, accessId, status, notes, reqMeta = {}) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient
    .from('employer_college_access')
    .update({
      status,
      notes,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', accessId)
    .eq('college_id', cdc.college_id)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to resolve employer request');
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: cdc.college_id,
    action: 'employer_access_resolved',
    entityType: 'employer_college_access',
    entityId: accessId,
    metadata: { status },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function assignJob(userId, jobId, payload, reqMeta = {}) {
  const cdc = await getContext(userId);
  const job = await getJobById(jobId);

  if (job.distribution_mode !== 'campus_cdc') {
    throw new AppError(400, 'Only campus CDC jobs can be assigned to college scopes');
  }

  const targetCollegeId = payload.collegeId || cdc.college_id;
  if (targetCollegeId !== cdc.college_id) {
    throw new AppError(403, 'CDC admins can only assign jobs within their own college');
  }

  const { data: access } = await serviceClient
    .from('employer_college_access')
    .select('id, status')
    .eq('employer_id', job.employer_id)
    .eq('college_id', targetCollegeId)
    .maybeSingle();

  if (!access || access.status !== 'approved') {
    throw new AppError(403, 'Employer does not have approved access to this college');
  }

  const visibilityStatus = payload.visibilityStatus || 'approved';

  const { data, error } = await serviceClient
    .from('job_assignments')
    .upsert(
      {
        job_id: jobId,
        college_id: targetCollegeId,
        batch_id: payload.batchId,
        group_id: payload.groupId,
        assigned_by: userId,
        visibility_status: visibilityStatus,
        override_reason: payload.overrideReason,
        internal_notes: payload.internalNotes,
      },
      { onConflict: 'job_id,college_id,batch_id,group_id' },
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to create job assignment');
  }

  if (visibilityStatus === 'approved' || visibilityStatus === 'restricted') {
    await ensureDiscussionForScope({
      jobId,
      collegeId: targetCollegeId,
      createdBy: userId,
    });
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: targetCollegeId,
    action: 'job_assignment_saved',
    entityType: 'job_assignment',
    entityId: data.id,
    metadata: {
      visibility_status: visibilityStatus,
      batch_id: payload.batchId || null,
      group_id: payload.groupId || null,
    },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

module.exports = {
  assignJob,
  createBatch,
  createGroup,
  getDashboard,
  listAssignableJobs,
  listBatches,
  listEmployerRequests,
  listGroups,
  listStudents,
  refreshGroupMembers,
  resolveEmployerRequest,
};
