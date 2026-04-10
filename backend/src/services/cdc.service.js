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

async function listBatchStudents(userId, batchId) {
  const cdc = await getContext(userId);
  
  // Verify batch belongs to this college
  const { data: batch } = await serviceClient
    .from('batches')
    .select('id')
    .eq('id', batchId)
    .eq('college_id', cdc.college_id)
    .single();

  if (!batch) throw new AppError(404, 'Batch not found in your college');

  const { data, error } = await serviceClient
    .from('students')
    .select(`
      *,
      user:users(id, full_name, email, college_email)
    `)
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'Failed to load batch students');
  return data || [];
}

async function listBatchJobs(userId, batchId) {
  const cdc = await getContext(userId);

  // Verify batch belongs to this college
  const { data: batch } = await serviceClient
    .from('batches')
    .select('id, name, department, graduation_year')
    .eq('id', batchId)
    .eq('college_id', cdc.college_id)
    .single();

  if (!batch) throw new AppError(404, 'Batch not found in your college');

  const { data, error } = await serviceClient
    .from('job_assignments')
    .select(`
      *,
      job:jobs(
        *,
        employer:employers(id, company_name, verification_status, credibility_score, company_logo_url),
        ai_review:job_ai_reviews(*)
      )
    `)
    .eq('college_id', cdc.college_id)
    .or(`batch_id.eq.${batchId},and(batch_id.is.null,group_id.is.null)`)
    .in('visibility_status', ['approved', 'restricted', 'pending'])
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'Failed to load batch jobs');
  return { batch, jobs: data || [] };
}

module.exports = {
  assignJob,
  createBatch,
  createGroup,
  getDashboard,
  inviteStudent,
  listAssignableJobs,
  listBatchJobs,
  listBatchStudents,
  listBatches,
  listEmployerRequests,
  listGroups,
  listIncomingJobRequests,
  listInvitations,
  listStudents,
  refreshGroupMembers,
  resolveEmployerRequest,
  reviewJobRequest,
  revokeInvitation,
};

// ─── Student Invitations ────────────────────────────────────────────────────

async function inviteStudent(userId, payload, reqMeta = {}) {
  const cdc = await getContext(userId);

  // Validate batch belongs to this college (if provided)
  if (payload.batchId) {
    const { data: batch } = await serviceClient
      .from('batches')
      .select('id')
      .eq('id', payload.batchId)
      .eq('college_id', cdc.college_id)
      .single();
    if (!batch) throw new AppError(400, 'Batch not found in your college');
  }

  // Check for existing pending invitation
  const { data: existing } = await serviceClient
    .from('student_invitations')
    .select('id, status')
    .eq('college_id', cdc.college_id)
    .eq('email', payload.email.toLowerCase().trim())
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    throw new AppError(409, 'A pending invitation for this email already exists');
  }

  const { data, error } = await serviceClient
    .from('student_invitations')
    .insert({
      college_id: cdc.college_id,
      batch_id: payload.batchId || null,
      email: payload.email.toLowerCase().trim(),
      invited_by: userId,
    })
    .select(`
      *,
      batch:batches(id, name, department, graduation_year),
      college:colleges(id, name, code)
    `)
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to create invitation');
  }

  // If the user already has an account with this email, notify them
  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('email', payload.email.toLowerCase().trim())
    .maybeSingle();

  if (existingUser) {
    await serviceClient.from('notifications').insert({
      user_id: existingUser.id,
      type: 'college_invitation',
      title: '🎓 College Invitation',
      message: `You have been invited to join ${data.college?.name || 'a college'} on SafHire${data.batch ? ` (${data.batch.name})` : ''}.`,
      data: { invitation_id: data.id, college_id: cdc.college_id },
    });
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: cdc.college_id,
    action: 'student_invited',
    entityType: 'student_invitation',
    entityId: data.id,
    metadata: { email: payload.email, batch_id: payload.batchId },
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

async function listInvitations(userId) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient
    .from('student_invitations')
    .select(`
      *,
      batch:batches(id, name, department, graduation_year),
      inviter:users!invited_by(id, full_name, email)
    `)
    .eq('college_id', cdc.college_id)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'Failed to load invitations');
  return data || [];
}

async function revokeInvitation(userId, invitationId, reqMeta = {}) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient
    .from('student_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('college_id', cdc.college_id)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error || !data) throw new AppError(404, 'Invitation not found or already resolved');

  await writeAuditLog({
    actorId: userId,
    collegeId: cdc.college_id,
    action: 'student_invitation_revoked',
    entityType: 'student_invitation',
    entityId: invitationId,
    ipAddress: reqMeta.ipAddress,
  });

  return data;
}

// ─── Incoming Job Requests ──────────────────────────────────────────────────

async function listIncomingJobRequests(userId) {
  const cdc = await getContext(userId);
  const { data, error } = await serviceClient
    .from('job_assignments')
    .select(`
      *,
      job:jobs(
        *,
        employer:employers(id, company_name, verification_status, credibility_score, company_logo_url),
        ai_review:job_ai_reviews(*)
      )
    `)
    .eq('college_id', cdc.college_id)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'Failed to load job requests');

  return (data || []).map((assignment) => ({
    ...assignment,
    // Separate pending vs. actioned for the UI to distinguish
    is_pending: assignment.visibility_status === 'pending',
  }));
}

async function reviewJobRequest(userId, assignmentId, payload, reqMeta = {}) {
  const cdc = await getContext(userId);

  // Fetch the assignment first to verify it belongs to this college
  const { data: assignment, error: fetchError } = await serviceClient
    .from('job_assignments')
    .select('*, job:jobs(*)')
    .eq('id', assignmentId)
    .eq('college_id', cdc.college_id)
    .single();

  if (fetchError || !assignment) throw new AppError(404, 'Assignment not found');
  if (assignment.visibility_status !== 'pending') {
    throw new AppError(400, 'This request has already been reviewed');
  }

  const newStatus = payload.status; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(newStatus)) {
    throw new AppError(400, 'status must be approved or rejected');
  }

  // Validate batch/group if provided
  if (payload.batchId) {
    const { data: batch } = await serviceClient
      .from('batches')
      .select('id')
      .eq('id', payload.batchId)
      .eq('college_id', cdc.college_id)
      .single();
    if (!batch) throw new AppError(400, 'Batch not found in your college');
  }

  if (payload.groupId) {
    const { data: group } = await serviceClient
      .from('groups')
      .select('id')
      .eq('id', payload.groupId)
      .eq('college_id', cdc.college_id)
      .single();
    if (!group) throw new AppError(400, 'Group not found in your college');
  }

  const { data: updated, error } = await serviceClient
    .from('job_assignments')
    .update({
      visibility_status: newStatus,
      batch_id: payload.batchId || null,
      group_id: payload.groupId || null,
      assigned_by: userId,
      internal_notes: payload.internalNotes || null,
      override_reason: payload.overrideReason || null,
    })
    .eq('id', assignmentId)
    .select('*')
    .single();

  if (error || !updated) throw new AppError(500, 'Failed to update assignment');

  // If approved, ensure a discussion scope exists for this college
  if (newStatus === 'approved') {
    await ensureDiscussionForScope({
      jobId: assignment.job_id,
      collegeId: cdc.college_id,
      createdBy: userId,
    });

    // Notify students in the targeted batch (if specified)
    if (payload.batchId) {
      const { data: batchStudents } = await serviceClient
        .from('students')
        .select('user_id')
        .eq('batch_id', payload.batchId)
        .eq('college_id', cdc.college_id);

      if (batchStudents?.length > 0) {
        await serviceClient.from('notifications').insert(
          batchStudents.map((s) => ({
            user_id: s.user_id,
            type: 'new_campus_job',
            title: '💼 New Job Opportunity',
            message: `A new campus job has been made available to your batch: "${assignment.job?.title || 'Job'}"`,
            data: { job_id: assignment.job_id },
          })),
        );
      }
    }
  }

  // Notify the employer of the decision
  const { data: employerUser } = await serviceClient
    .from('employers')
    .select('user_id')
    .eq('id', assignment.job?.employer_id)
    .single();

  if (employerUser) {
    const collegeName = cdc.college?.name || 'A college';
    await serviceClient.from('notifications').insert({
      user_id: employerUser.user_id,
      type: newStatus === 'approved' ? 'campus_job_approved' : 'campus_job_rejected',
      title: newStatus === 'approved' ? '✅ Campus Job Approved' : '❌ Campus Job Rejected',
      message: `${collegeName} has ${newStatus === 'approved' ? 'approved and assigned' : 'declined'} your campus job "${assignment.job?.title || ''}" to their students.`,
      data: { job_id: assignment.job_id, college_id: cdc.college_id },
    });
  }

  await writeAuditLog({
    actorId: userId,
    collegeId: cdc.college_id,
    action: `campus_job_${newStatus}`,
    entityType: 'job_assignment',
    entityId: assignmentId,
    metadata: { status: newStatus, batch_id: payload.batchId, group_id: payload.groupId },
    ipAddress: reqMeta.ipAddress,
  });

  return updated;
}

