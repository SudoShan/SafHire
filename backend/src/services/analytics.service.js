const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');
const { getCdcAdminByUserId, getEmployerByUserId, getStudentByUserId } = require('./common.service');

async function getStudentAnalytics(userId) {
  const student = await getStudentByUserId(userId, { required: true });
  const [{ count: applications }, { count: shortlisted }, { count: savedJobs }] = await Promise.all([
    serviceClient.from('applications').select('*', { count: 'exact', head: true }).eq('student_id', student.id),
    serviceClient.from('applications').select('*', { count: 'exact', head: true }).eq('student_id', student.id).in('status', ['shortlisted', 'interviewing', 'offered']),
    serviceClient.from('saved_jobs').select('*', { count: 'exact', head: true }).eq('student_id', student.id),
  ]);

  const completionFields = [
    student.resume_url,
    student.linkedin_url,
    student.github_url,
    student.preferred_role,
    (student.skills || []).length > 0,
    student.college_email_verified,
    student.marksheet_verified,
  ];

  const profileCompletion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  return {
    profile_completion: profileCompletion,
    application_count: applications || 0,
    shortlisted_count: shortlisted || 0,
    saved_jobs_count: savedJobs || 0,
  };
}

async function getCdcAnalytics(userId) {
  const cdc = await getCdcAdminByUserId(userId, { required: true });
  const [{ data: collegeStudents, count: students }, { data: access }] = await Promise.all([
    serviceClient.from('students').select('id', { count: 'exact' }).eq('college_id', cdc.college_id),
    serviceClient.from('employer_college_access').select('status').eq('college_id', cdc.college_id),
  ]);

  const studentIds = (collegeStudents || []).map((student) => student.id);
  const { data: applications } = studentIds.length
    ? await serviceClient
        .from('applications')
        .select(`
          id,
          status,
          job:jobs(id, title)
        `)
        .in('student_id', studentIds)
    : { data: [] };

  const perJob = {};
  for (const application of applications || []) {
    const title = application.job?.title || 'Untitled';
    perJob[title] = (perJob[title] || 0) + 1;
  }

  const approvedEmployers = (access || []).filter((entry) => entry.status === 'approved').length;
  const requestedEmployers = (access || []).filter((entry) => entry.status === 'requested').length;

  return {
    student_count: students || 0,
    approved_employer_count: approvedEmployers,
    pending_employer_requests: requestedEmployers,
    applications_per_job: perJob,
  };
}

async function getPlatformAnalytics() {
  const results = await Promise.all([
    serviceClient.from('colleges').select('*', { count: 'exact', head: true }),
    serviceClient.from('employers').select('*', { count: 'exact', head: true }),
    serviceClient.from('jobs').select('*', { count: 'exact', head: true }),
    serviceClient.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
    serviceClient.from('appeals').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
  ]);

  const [colleges, employers, jobs, blockedJobs, approvedAppeals] = results;
  return {
    college_count: colleges.count || 0,
    employer_count: employers.count || 0,
    job_count: jobs.count || 0,
    blocked_job_count: blockedJobs.count || 0,
    approved_appeals_count: approvedAppeals.count || 0,
  };
}

module.exports = {
  getCdcAnalytics,
  getPlatformAnalytics,
  getStudentAnalytics,
};
