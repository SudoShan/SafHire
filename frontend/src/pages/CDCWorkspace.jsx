import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';

function splitCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CDCWorkspace() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [batchForm, setBatchForm] = useState({ name: '', department: '', graduation_year: '' });
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    department: '',
    min_cgpa: '',
    max_backlogs: '',
    graduation_year: '',
    required_skills: '',
  });
  const [assignmentForm, setAssignmentForm] = useState({
    job_id: '',
    batch_id: '',
    group_id: '',
    visibility_status: 'approved',
    override_reason: '',
    internal_notes: '',
  });

  const loadWorkspace = async () => {
    try {
      const [batchesResponse, groupsResponse, requestsResponse, jobsResponse] = await Promise.all([
        api.get('/cdc/batches'),
        api.get('/cdc/groups'),
        api.get('/cdc/employer-requests'),
        api.get('/cdc/jobs'),
      ]);

      setBatches(batchesResponse.data.batches || []);
      setGroups(groupsResponse.data.groups || []);
      setRequests(requestsResponse.data.requests || []);
      setJobs(jobsResponse.data.jobs || []);
    } catch (error) {
      toast.error(getApiError(error, 'Unable to load CDC workspace'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const createBatch = async (event) => {
    event.preventDefault();
    try {
      await api.post('/cdc/batches', batchForm);
      toast.success('Batch created.');
      setBatchForm({ name: '', department: '', graduation_year: '' });
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to create batch'));
    }
  };

  const createGroup = async (event) => {
    event.preventDefault();
    try {
      await api.post('/cdc/groups', {
        name: groupForm.name,
        description: groupForm.description,
        criteria: {
          department: groupForm.department || undefined,
          min_cgpa: groupForm.min_cgpa ? Number(groupForm.min_cgpa) : undefined,
          max_backlogs: groupForm.max_backlogs ? Number(groupForm.max_backlogs) : undefined,
          graduation_year: groupForm.graduation_year ? Number(groupForm.graduation_year) : undefined,
          required_skills: splitCsv(groupForm.required_skills),
        },
      });
      toast.success('Dynamic group created.');
      setGroupForm({
        name: '',
        description: '',
        department: '',
        min_cgpa: '',
        max_backlogs: '',
        graduation_year: '',
        required_skills: '',
      });
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to create group'));
    }
  };

  const resolveRequest = async (accessId, status) => {
    const notes = prompt(`Enter resolution notes for the employer (${status}):`, status === 'approved' ? 'CDC access approved.' : 'Access request rejected by CDC.');
    if (notes === null) return;

    try {
      await api.patch(`/cdc/employer-requests/${accessId}`, {
        status,
        notes: notes,
      });
      toast.success(`Employer request ${status}.`);
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to update employer request'));
    }
  };

  const refreshGroup = async (groupId) => {
    try {
      await api.post(`/cdc/groups/${groupId}/refresh-members`);
      toast.success('Group membership refreshed.');
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to refresh group members'));
    }
  };

  const assignJob = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/cdc/jobs/${assignmentForm.job_id}/assignments`, {
        batch_id: assignmentForm.batch_id || undefined,
        group_id: assignmentForm.group_id || undefined,
        visibility_status: assignmentForm.visibility_status,
        override_reason: assignmentForm.override_reason || undefined,
        internal_notes: assignmentForm.internal_notes || undefined,
      });
      toast.success('Job assignment saved.');
      setAssignmentForm({
        job_id: '',
        batch_id: '',
        group_id: '',
        visibility_status: 'approved',
        override_reason: '',
        internal_notes: '',
      });
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to assign job'));
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen label="Loading CDC workspace…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="CDC operations"
          title="Batch, group, access, and assignment controls"
          description="This workspace lets the college team build audience segments, approve employer access, and route campus drives to the right students."
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          <form className="th-section space-y-4" onSubmit={createBatch}>
            <div>
              <p className="th-label">Batch management</p>
              <h2 className="mt-2 text-3xl text-ink">Create a batch</h2>
            </div>
            <input className="th-input" placeholder="Batch name" value={batchForm.name} onChange={(event) => setBatchForm((current) => ({ ...current, name: event.target.value }))} required />
            <input className="th-input" placeholder="Department" value={batchForm.department} onChange={(event) => setBatchForm((current) => ({ ...current, department: event.target.value }))} required />
            <input className="th-input" placeholder="Graduation year" type="number" value={batchForm.graduation_year} onChange={(event) => setBatchForm((current) => ({ ...current, graduation_year: event.target.value }))} required />
            <button className="th-btn-primary" type="submit">
              Create batch
            </button>
          </form>

          <form className="th-section space-y-4" onSubmit={createGroup}>
            <div>
              <p className="th-label">Dynamic group</p>
              <h2 className="mt-2 text-3xl text-ink">Create a filtered student group</h2>
            </div>
            <input className="th-input" placeholder="Group name" value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} required />
            <textarea className="th-input min-h-24" placeholder="Description" value={groupForm.description} onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))} />
            <input className="th-input" placeholder="Department filter" value={groupForm.department} onChange={(event) => setGroupForm((current) => ({ ...current, department: event.target.value }))} />
            <div className="grid gap-4 md:grid-cols-3">
              <input className="th-input" placeholder="Min CGPA" type="number" max="10" step="0.1" value={groupForm.min_cgpa} onChange={(event) => setGroupForm((current) => ({ ...current, min_cgpa: event.target.value }))} />
              <input className="th-input" placeholder="Max backlogs" type="number" min="0" value={groupForm.max_backlogs} onChange={(event) => setGroupForm((current) => ({ ...current, max_backlogs: event.target.value }))} />
              <input className="th-input" placeholder="Graduation year" type="number" value={groupForm.graduation_year} onChange={(event) => setGroupForm((current) => ({ ...current, graduation_year: event.target.value }))} />
            </div>
            <input className="th-input" placeholder="Required skills (comma separated)" value={groupForm.required_skills} onChange={(event) => setGroupForm((current) => ({ ...current, required_skills: event.target.value }))} />
            <button className="th-btn-primary" type="submit">
              Create group
            </button>
          </form>

          <form className="th-section space-y-4" onSubmit={assignJob}>
            <div>
              <p className="th-label">Campus routing</p>
              <h2 className="mt-2 text-3xl text-ink">Assign an approved employer job</h2>
            </div>
            <select className="th-input" value={assignmentForm.job_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, job_id: event.target.value }))} required>
              <option value="">Select a campus job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} · {job.employer?.company_name}
                </option>
              ))}
            </select>
            <select className="th-input" value={assignmentForm.batch_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, batch_id: event.target.value }))}>
              <option value="">All batches</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
            <select className="th-input" value={assignmentForm.group_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, group_id: event.target.value }))}>
              <option value="">No dynamic group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <select className="th-input" value={assignmentForm.visibility_status} onChange={(event) => setAssignmentForm((current) => ({ ...current, visibility_status: event.target.value }))}>
              <option value="approved">Approved</option>
              <option value="restricted">Restricted</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
            </select>
            <input className="th-input" placeholder="Override reason" value={assignmentForm.override_reason} onChange={(event) => setAssignmentForm((current) => ({ ...current, override_reason: event.target.value }))} />
            <textarea className="th-input min-h-24" placeholder="Internal notes" value={assignmentForm.internal_notes} onChange={(event) => setAssignmentForm((current) => ({ ...current, internal_notes: event.target.value }))} />
            <button className="th-btn-primary" type="submit">
              Save assignment
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="th-section">
            <p className="th-label">Employer access queue</p>
            <h2 className="mt-2 text-3xl text-ink">College access requests</h2>
            <div className="mt-5 space-y-3">
              {requests.length === 0 ? (
                <EmptyState
                  title="No employer requests"
                  description="Employers requesting to hire through this college will appear here."
                />
              ) : (
                requests.map((request) => (
                  <article key={request.id} className="th-panel p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{request.employer?.company_name}</p>
                        <p className="mt-1 text-sm text-ink-soft">{request.reason || 'No reason supplied.'}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    {request.status === 'requested' ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button className="th-btn-primary" type="button" onClick={() => resolveRequest(request.id, 'approved')}>
                          Approve
                        </button>
                        <button className="th-btn-secondary" type="button" onClick={() => resolveRequest(request.id, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="th-section">
            <p className="th-label">Groups and assignments</p>
            <h2 className="mt-2 text-3xl text-ink">Current dynamic groups</h2>
            <div className="mt-5 space-y-3">
              {groups.length === 0 ? (
                <EmptyState
                  title="No dynamic groups yet"
                  description="Create a group to target jobs using department, CGPA, backlog, or skill filters."
                />
              ) : (
                groups.map((group) => (
                  <article key={group.id} className="th-panel p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-ink">{group.name}</p>
                        <p className="mt-1 text-sm text-ink-soft">{group.description || 'No description provided.'}</p>
                      </div>
                      <button className="th-btn-secondary" type="button" onClick={() => refreshGroup(group.id)}>
                        Refresh members
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
