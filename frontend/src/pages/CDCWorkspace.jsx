import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineBuildingLibrary,
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineEnvelope,
  HiOutlineExclamationCircle,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineXCircle,
  HiXMark,
} from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';
import { sentenceCase } from '../lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview', icon: HiOutlineBuildingLibrary },
  { id: 'batches', label: 'Batches', icon: HiOutlineAcademicCap },
  { id: 'jobs', label: 'Job Drives', icon: HiOutlineBriefcase },
  { id: 'employers', label: 'Employers', icon: HiOutlineBuildingOffice2 },
  { id: 'invitations', label: 'Invitations', icon: HiOutlineEnvelope },
  { id: 'groups', label: 'Groups', icon: HiOutlineUserGroup },
];

function splitCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// ─── Batch Drawer ─────────────────────────────────────────────────────────────
function BatchDrawer({ batch, batches, onClose }) {
  const [students, setStudents] = useState([]);
  const [batchJobs, setBatchJobs] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (!batch) return;
    setLoadingStudents(true);
    setLoadingJobs(true);
    setStudents([]);
    setBatchJobs([]);

    api.get(`/cdc/batches/${batch.id}/students`)
      .then(({ data }) => setStudents(data.students || []))
      .catch(() => toast.error('Unable to load students'))
      .finally(() => setLoadingStudents(false));

    api.get(`/cdc/batches/${batch.id}/jobs`)
      .then(({ data }) => setBatchJobs(data.jobs || []))
      .catch(() => toast.error('Unable to load batch jobs'))
      .finally(() => setLoadingJobs(false));
  }, [batch]);

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      await api.post('/cdc/invitations', { email: inviteEmail.trim(), batch_id: batch.id });
      toast.success('Invitation sent!');
      setInviteEmail('');
    } catch (error) {
      toast.error(getApiError(error, 'Unable to send invitation'));
    } finally {
      setSendingInvite(false);
    }
  };

  if (!batch) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(4,8,16,0.6)', backdropFilter: 'blur(4px)', zIndex: 9000 }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className="th-drawer fixed right-0 top-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          width: 'min(560px, 100vw)',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-default)',
          zIndex: 9001,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-start justify-between gap-4 p-6 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: 'rgba(99,102,241,0.15)' }}
              >
                <HiOutlineAcademicCap className="h-4.5 w-4.5" style={{ color: '#818cf8', width: '1.125rem', height: '1.125rem' }} />
              </div>
              <h2 className="text-xl font-bold text-ink truncate">{batch.name}</h2>
            </div>
            <p className="text-sm text-ink-soft">
              {batch.department} · Class of {batch.graduation_year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-full p-2 text-ink-soft hover:text-ink transition-colors"
            style={{ background: 'var(--bg-elevated)' }}
            aria-label="Close drawer"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex-shrink-0 px-4 pt-3">
          <div className="th-tab-bar">
            {[
              { id: 'students', label: 'Students', count: students.length },
              { id: 'jobs', label: 'Job Drives', count: batchJobs.length },
              { id: 'invite', label: 'Invite' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`th-tab ${activeTab === tab.id ? 'th-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: activeTab === tab.id ? 'rgba(99,102,241,0.25)' : 'var(--bg-elevated)',
                      color: activeTab === tab.id ? '#818cf8' : 'var(--text-muted)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Students Tab */}
          {activeTab === 'students' && (
            loadingStudents ? (
              <LoadingScreen label="Loading students…" />
            ) : students.length === 0 ? (
              <EmptyState title="No students" description="No students have joined this batch yet. Send invitations below." />
            ) : (
              students.map((student) => (
                <div
                  key={student.id}
                  className="th-panel p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                    >
                      {student.user?.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{student.user?.full_name}</p>
                      <p className="text-xs text-ink-soft truncate">{student.user?.email}</p>
                      <p className="text-[10px] text-ink-soft mt-0.5">
                        CGPA: {student.cgpa ?? '—'} · Backlogs: {student.active_backlogs ?? 0}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/cdc"
                    className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-full transition-colors"
                    style={{
                      background: 'rgba(99,102,241,0.1)',
                      color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.2)',
                    }}
                  >
                    Profile
                  </Link>
                </div>
              ))
            )
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            loadingJobs ? (
              <LoadingScreen label="Loading jobs…" />
            ) : batchJobs.length === 0 ? (
              <EmptyState
                title="No jobs assigned"
                description="No job drives have been assigned to this batch yet. Approve incoming job requests from the Job Drives tab."
              />
            ) : (
              batchJobs.map((assignment) => {
                const job = assignment.job;
                if (!job) return null;
                return (
                  <div key={assignment.id} className="th-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{job.title}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: '#818cf8' }}>
                          {job.employer?.company_name}
                        </p>
                        {job.description && (
                          <p className="mt-1.5 text-xs text-ink-soft line-clamp-2">{job.description}</p>
                        )}
                      </div>
                      <StatusBadge status={assignment.visibility_status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[10px] text-ink-soft">
                        {new Date(assignment.created_at).toLocaleDateString()}
                      </p>
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-xs font-semibold"
                        style={{ color: '#818cf8' }}
                      >
                        View Job →
                      </Link>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* Invite Tab */}
          {activeTab === 'invite' && (
            <div className="space-y-4">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.12)',
                }}
              >
                <p className="text-sm text-ink-soft">
                  Invite a student directly to <strong className="text-ink">{batch.name}</strong>. They'll receive an
                  in-app notification and can accept from their Invitations page.
                </p>
              </div>
              <form onSubmit={sendInvite} className="space-y-3">
                <input
                  className="th-input"
                  type="email"
                  placeholder="Student email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <button
                  className="th-btn-primary w-full justify-center"
                  type="submit"
                  disabled={sendingInvite}
                >
                  {sendingInvite ? 'Sending…' : 'Send Invitation'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CDCWorkspace() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [batches, setBatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [incomingJobs, setIncomingJobs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  // Forms
  const [batchForm, setBatchForm] = useState({ name: '', department: '', graduation_year: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', batch_id: '' });
  const [groupForm, setGroupForm] = useState({
    name: '', description: '', department: '', min_cgpa: '', max_backlogs: '', graduation_year: '', required_skills: '',
  });

  // Modal states
  const [resolveModal, setResolveModal] = useState({ isOpen: false, id: null, status: '', notes: '' });
  const [reviewModal, setReviewModal] = useState({ isOpen: false, id: null, status: '', internalNotes: '', batchId: '', groupId: '' });
  const [revokeModal, setRevokeModal] = useState({ isOpen: false, id: null });

  // Drawer
  const [drawerBatch, setDrawerBatch] = useState(null);

  const loadWorkspace = useCallback(async () => {
    try {
      const [batchesRes, groupsRes, requestsRes, jobsRes, incomingRes, invitesRes, dashRes] = await Promise.all([
        api.get('/cdc/batches'),
        api.get('/cdc/groups'),
        api.get('/cdc/employer-requests'),
        api.get('/cdc/jobs'),
        api.get('/cdc/incoming-jobs'),
        api.get('/cdc/invitations'),
        api.get('/cdc/dashboard').catch(() => ({ data: null })),
      ]);
      setBatches(batchesRes.data.batches || []);
      setGroups(groupsRes.data.groups || []);
      setRequests(requestsRes.data.requests || []);
      setJobs(jobsRes.data.jobs || []);
      setIncomingJobs(incomingRes.data.assignments || []);
      setInvitations(invitesRes.data.invitations || []);
      setDashboard(dashRes.data);
    } catch (error) {
      toast.error(getApiError(error, 'Unable to load CDC workspace'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  // ── Actions ──
  const createBatch = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cdc/batches', batchForm);
      toast.success('Batch created.');
      setBatchForm({ name: '', department: '', graduation_year: '' });
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to create batch'));
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
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
      toast.success('Group created.');
      setGroupForm({ name: '', description: '', department: '', min_cgpa: '', max_backlogs: '', graduation_year: '', required_skills: '' });
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to create group'));
    }
  };

  const handleResolveRequest = async () => {
    try {
      await api.patch(`/cdc/employer-requests/${resolveModal.id}`, { status: resolveModal.status, notes: resolveModal.notes });
      toast.success(`Employer request ${resolveModal.status}.`);
      setResolveModal({ isOpen: false, id: null, status: '', notes: '' });
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to update employer request'));
    }
  };

  const handleReviewJob = async () => {
    try {
      await api.patch(`/cdc/incoming-jobs/${reviewModal.id}`, {
        status: reviewModal.status,
        internal_notes: reviewModal.internalNotes,
        batch_id: reviewModal.batchId || undefined,
        group_id: reviewModal.groupId || undefined,
      });
      toast.success(`Job request ${reviewModal.status}.`);
      setReviewModal({ isOpen: false, id: null, status: '', internalNotes: '', batchId: '', groupId: '' });
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to review job request'));
    }
  };

  const handleRevokeInvitation = async () => {
    try {
      await api.delete(`/cdc/invitations/${revokeModal.id}`);
      toast.success('Invitation revoked.');
      setRevokeModal({ isOpen: false, id: null });
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to revoke invitation'));
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

  const sendInvitation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cdc/invitations', inviteForm);
      toast.success('Invitation sent.');
      setInviteForm({ email: '', batch_id: '' });
      loadWorkspace();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to send invitation'));
    }
  };

  if (loading) return <AppShell><LoadingScreen label="Loading CDC workspace…" /></AppShell>;

  const pendingJobs = incomingJobs.filter((j) => j.is_pending);
  const pendingRequests = requests.filter((r) => r.status === 'requested');
  const pendingInvites = invitations.filter((i) => i.status === 'pending');

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="CDC operations"
          title="Campus Drive Workspace"
          description={`Manage batches, campus drives, employer access, and student invitations${dashboard?.college?.name ? ` for ${dashboard.college.name}` : '.'}`}
        />
      </section>

      {/* Tab Bar */}
      <div
        className="th-section p-2"
        style={{ padding: '0.5rem 1rem' }}
      >
        <div className="th-tab-bar">
          {TABS.map((tab) => {
            const badgeCount =
              tab.id === 'jobs' ? pendingJobs.length :
              tab.id === 'employers' ? pendingRequests.length :
              tab.id === 'invitations' ? pendingInvites.length : 0;
            return (
              <button
                key={tab.id}
                className={`th-tab ${activeTab === tab.id ? 'th-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                {tab.label}
                {badgeCount > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: 'rgba(239,68,68,0.2)',
                      color: '#f87171',
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Tab: Overview ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* Stats */}
          <div className="th-grid-autofit stagger">
            {[
              { label: 'Batches', value: batches.length, helper: 'Active student groups', color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
              { label: 'Campus Jobs', value: jobs.length, helper: 'Approved drives', color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
              { label: 'Pending Reviews', value: pendingJobs.length, helper: 'Awaiting your action', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
              { label: 'Employer Requests', value: pendingRequests.length, helper: 'Access requests', color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="th-panel p-5"
                style={{ cursor: 'default' }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl mb-3"
                  style={{ background: stat.bg }}
                >
                  <HiOutlineSparkles style={{ width: '1.25rem', height: '1.25rem', color: stat.color }} />
                </div>
                <p className="text-2xl font-extrabold text-ink">{stat.value}</p>
                <p className="text-sm font-semibold text-ink mt-0.5">{stat.label}</p>
                <p className="text-xs text-ink-soft mt-0.5">{stat.helper}</p>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {pendingJobs.length > 0 && (
            <div
              className="th-section flex items-start gap-4"
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              <HiOutlineExclamationCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">
                  {pendingJobs.length} job request{pendingJobs.length !== 1 ? 's' : ''} awaiting review
                </p>
                <p className="text-xs text-ink-soft mt-0.5">
                  Campus drive requests from employers need your approval before students can see them.
                </p>
              </div>
              <button className="th-btn-primary text-xs flex-shrink-0" onClick={() => setActiveTab('jobs')}>
                Review Now
              </button>
            </div>
          )}

          {pendingRequests.length > 0 && (
            <div
              className="th-section flex items-start gap-4"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
              }}
            >
              <HiOutlineExclamationCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">
                  {pendingRequests.length} employer access request{pendingRequests.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-ink-soft mt-0.5">
                  Employers want to hire from your campus. Review and approve or reject their access.
                </p>
              </div>
              <button className="th-btn-primary text-xs flex-shrink-0" onClick={() => setActiveTab('employers')}>
                Review Now
              </button>
            </div>
          )}

          {pendingJobs.length === 0 && pendingRequests.length === 0 && (
            <div
              className="th-section flex items-center gap-4"
              style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <HiOutlineCheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#34d399' }} />
              <p className="text-sm text-ink-soft">All caught up! No pending reviews or requests.</p>
            </div>
          )}

          {/* Quick access to recent batches */}
          <div className="th-section space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="th-label">Quick access</p>
                <h2 className="mt-1 text-lg font-bold text-ink">Recent Batches</h2>
              </div>
              <button className="th-btn-secondary text-xs" onClick={() => setActiveTab('batches')}>
                All Batches
              </button>
            </div>
            <div className="space-y-2">
              {batches.length === 0 ? (
                <EmptyState title="No batches" description="Create your first batch in the Batches tab." />
              ) : (
                batches.slice(0, 3).map((batch) => (
                  <button
                    key={batch.id}
                    className="th-panel w-full p-4 flex items-center justify-between text-left"
                    onClick={() => { setDrawerBatch(batch); }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{batch.name}</p>
                      <p className="text-xs text-ink-soft">{batch.department} · Class of {batch.graduation_year}</p>
                    </div>
                    <HiOutlineUsers className="h-4 w-4 text-ink-soft" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Batches ─── */}
      {activeTab === 'batches' && (
        <div className="grid gap-4 animate-fade-in xl:grid-cols-[1fr_1.4fr]">
          {/* Create batch form */}
          <form className="th-section space-y-4 self-start" onSubmit={createBatch}>
            <div>
              <p className="th-label">New Batch</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Create a batch</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Batches group students by department and graduation year. Students must be in a batch to receive campus drive notifications.
              </p>
            </div>
            <input
              className="th-input"
              placeholder="Batch name (e.g. CSE 2025)"
              value={batchForm.name}
              onChange={(e) => setBatchForm((c) => ({ ...c, name: e.target.value }))}
              required
            />
            <input
              className="th-input"
              placeholder="Department (e.g. Computer Science)"
              value={batchForm.department}
              onChange={(e) => setBatchForm((c) => ({ ...c, department: e.target.value }))}
              required
            />
            <input
              className="th-input"
              placeholder="Graduation year (e.g. 2025)"
              type="number"
              value={batchForm.graduation_year}
              onChange={(e) => setBatchForm((c) => ({ ...c, graduation_year: e.target.value }))}
              required
            />
            <button className="th-btn-primary w-full justify-center" type="submit">
              Create Batch
            </button>
          </form>

          {/* Batches list */}
          <div className="space-y-3">
            {batches.length === 0 ? (
              <div className="th-section">
                <EmptyState title="No batches yet" description="Create your first batch to start managing students." />
              </div>
            ) : (
              batches.map((batch) => (
                <article
                  key={batch.id}
                  className="th-section"
                  style={{ padding: '1.25rem 1.5rem' }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: 'rgba(99,102,241,0.12)' }}
                      >
                        <HiOutlineAcademicCap className="h-5 w-5" style={{ color: '#818cf8' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-ink">{batch.name}</p>
                        <p className="text-xs text-ink-soft mt-0.5">
                          {batch.department} · Class of {batch.graduation_year}
                        </p>
                      </div>
                    </div>
                    <button
                      className="th-btn-primary text-xs flex-shrink-0"
                      onClick={() => setDrawerBatch(batch)}
                    >
                      <HiOutlineUsers style={{ width: '1rem', height: '1rem' }} />
                      Manage
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Job Drives ─── */}
      {activeTab === 'jobs' && (
        <div className="space-y-4 animate-fade-in">
          {/* Pending review queue */}
          <div className="th-section space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)' }}>
                <HiOutlineClipboardDocumentList className="h-5 w-5" style={{ color: '#fbbf24' }} />
              </div>
              <div>
                <p className="th-label">Action required</p>
                <h2 className="text-lg font-bold text-ink">Pending job requests</h2>
              </div>
              {pendingJobs.length > 0 && (
                <span className="ml-auto th-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>
                  {pendingJobs.length} Pending
                </span>
              )}
            </div>

            <div className="space-y-3">
              {pendingJobs.length === 0 ? (
                <EmptyState title="No pending requests" description="Campus drive requests from employers will appear here for your review." />
              ) : (
                pendingJobs.map((request) => (
                  <article key={request.id} className="th-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink">{request.job?.title}</p>
                        <p className="text-sm font-medium mt-0.5" style={{ color: '#818cf8' }}>
                          {request.job?.employer?.company_name}
                        </p>
                        {request.job?.description && (
                          <p className="mt-2 text-xs text-ink-soft line-clamp-2">{request.job.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          className="th-btn-primary py-1 px-3 text-xs"
                          onClick={() => setReviewModal({ isOpen: true, id: request.id, status: 'approved', internalNotes: '', batchId: '' })}
                        >
                          <HiOutlineCheckCircle style={{ width: '1rem', height: '1rem' }} />
                          Approve
                        </button>
                        <button
                          className="th-btn-secondary py-1 px-3 text-xs"
                          onClick={() => setReviewModal({ isOpen: true, id: request.id, status: 'rejected', internalNotes: '', batchId: '' })}
                        >
                          <HiOutlineXCircle style={{ width: '1rem', height: '1rem' }} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* Approved / active drives */}
          <div className="th-section space-y-4">
            <div>
              <p className="th-label">Active drives</p>
              <h2 className="text-lg font-bold text-ink">All campus job drives</h2>
            </div>
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <EmptyState title="No active drives" description="Approved campus drives will appear here." />
              ) : (
                jobs.map((job) => (
                  <article key={job.id} className="th-panel p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{job.title}</p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {job.employer?.company_name} · {sentenceCase(job.status)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={job.status} />
                      <Link to={`/jobs/${job.id}`} className="th-btn-ghost py-1 px-3 text-xs">
                        View
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Employers ─── */}
      {activeTab === 'employers' && (
        <div className="th-section space-y-4 animate-fade-in">
          <div>
            <p className="th-label">Employer access queue</p>
            <h2 className="text-xl font-bold text-ink mt-1">College access requests</h2>
            <p className="text-sm text-ink-soft mt-1">
              Employers requesting to recruit from your campus. Approve to let them post campus drives.
            </p>
          </div>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <EmptyState title="No employer requests" description="When employers request campus access, they'll appear here." />
            ) : (
              requests.map((request) => (
                <article key={request.id} className="th-panel p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-ink">{request.employer?.company_name}</p>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="mt-1.5 text-sm text-ink-soft">{request.reason || 'No reason supplied.'}</p>
                    </div>
                  </div>
                  {request.status === 'requested' && (
                    <div className="mt-4 flex gap-2">
                      <button
                        className="th-btn-primary text-sm"
                        onClick={() => setResolveModal({
                          isOpen: true, id: request.id, status: 'approved',
                          notes: 'CDC access approved.',
                        })}
                      >
                        <HiOutlineCheckCircle className="h-4 w-4" />
                        Approve Access
                      </button>
                      <button
                        className="th-btn-secondary text-sm"
                        onClick={() => setResolveModal({
                          isOpen: true, id: request.id, status: 'rejected',
                          notes: 'Access request rejected by CDC.',
                        })}
                      >
                        <HiOutlineXCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Invitations ─── */}
      {activeTab === 'invitations' && (
        <div className="grid gap-4 animate-fade-in xl:grid-cols-[1fr_1.4fr]">
          {/* Send invitation form */}
          <form className="th-section space-y-4 self-start" onSubmit={sendInvitation}>
            <div>
              <p className="th-label">Student enrollment</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Invite a student</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Send a campus invitation to a student email. They'll be notified and can accept to join your college platform.
              </p>
            </div>
            <input
              className="th-input"
              placeholder="Student email address"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((c) => ({ ...c, email: e.target.value }))}
              required
            />
            <select
              className="th-input"
              value={inviteForm.batch_id}
              onChange={(e) => setInviteForm((c) => ({ ...c, batch_id: e.target.value }))}
            >
              <option value="">Select target batch (optional)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.department})</option>
              ))}
            </select>
            <button className="th-btn-primary w-full justify-center" type="submit">
              Send Invitation
            </button>
          </form>

          {/* Invitations history */}
          <div className="space-y-3">
            <div className="th-section" style={{ padding: '1rem 1.25rem' }}>
              <p className="th-label">Sent invitations</p>
              <h2 className="mt-1 text-lg font-bold text-ink">Invitation history</h2>
            </div>
            {invitations.length === 0 ? (
              <div className="th-section">
                <EmptyState title="No invites sent" description="Your sent invitations will appear here." />
              </div>
            ) : (
              invitations.map((invite) => (
                <article key={invite.id} className="th-panel p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{invite.email}</p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      Batch: {invite.batch?.name || 'Any'} · {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={invite.status} />
                    {invite.status === 'pending' && (
                      <button
                        className="text-xs font-semibold transition-colors"
                        style={{ color: '#f87171' }}
                        onClick={() => setRevokeModal({ isOpen: true, id: invite.id })}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Groups ─── */}
      {activeTab === 'groups' && (
        <div className="grid gap-4 animate-fade-in xl:grid-cols-[1fr_1.4fr]">
          {/* Create group form */}
          <form className="th-section space-y-4 self-start" onSubmit={createGroup}>
            <div>
              <p className="th-label">Dynamic grouping</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Create filtered cohort</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Groups auto-sync students matching your criteria for targeted job assignments.
              </p>
            </div>
            <input
              className="th-input"
              placeholder="Group name"
              value={groupForm.name}
              onChange={(e) => setGroupForm((c) => ({ ...c, name: e.target.value }))}
              required
            />
            <textarea
              className="th-input min-h-20"
              placeholder="Description / criteria notes"
              value={groupForm.description}
              onChange={(e) => setGroupForm((c) => ({ ...c, description: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="th-input"
                placeholder="Min CGPA"
                type="number"
                max="10"
                step="0.1"
                value={groupForm.min_cgpa}
                onChange={(e) => setGroupForm((c) => ({ ...c, min_cgpa: e.target.value }))}
              />
              <input
                className="th-input"
                placeholder="Max backlogs"
                type="number"
                min="0"
                value={groupForm.max_backlogs}
                onChange={(e) => setGroupForm((c) => ({ ...c, max_backlogs: e.target.value }))}
              />
            </div>
            <input
              className="th-input"
              placeholder="Department filter (optional)"
              value={groupForm.department}
              onChange={(e) => setGroupForm((c) => ({ ...c, department: e.target.value }))}
            />
            <input
              className="th-input"
              placeholder="Required skills (comma-separated)"
              value={groupForm.required_skills}
              onChange={(e) => setGroupForm((c) => ({ ...c, required_skills: e.target.value }))}
            />
            <button className="th-btn-primary w-full justify-center" type="submit">
              Create Group
            </button>
          </form>

          {/* Groups list */}
          <div className="space-y-3">
            {groups.length === 0 ? (
              <div className="th-section">
                <EmptyState title="No dynamic groups" description="Create a group to enable targeted job assignments based on student criteria." />
              </div>
            ) : (
              groups.map((group) => (
                <article key={group.id} className="th-panel p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{group.name}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{group.description || 'No description'}</p>
                    {group.criteria && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.criteria.min_cgpa && (
                          <span className="th-badge" style={{ background: 'rgba(6,182,212,0.08)', color: '#22d3ee' }}>
                            Min CGPA: {group.criteria.min_cgpa}
                          </span>
                        )}
                        {group.criteria.max_backlogs !== undefined && (
                          <span className="th-badge" style={{ background: 'rgba(6,182,212,0.08)', color: '#22d3ee' }}>
                            Max Backlogs: {group.criteria.max_backlogs}
                          </span>
                        )}
                        {group.criteria.department && (
                          <span className="th-badge" style={{ background: 'rgba(6,182,212,0.08)', color: '#22d3ee' }}>
                            Dept: {group.criteria.department}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button className="th-btn-secondary py-1.5 px-3 text-xs flex-shrink-0" onClick={() => refreshGroup(group.id)}>
                    Refresh
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Batch Detail Drawer ─── */}
      {drawerBatch && (
        <BatchDrawer
          batch={drawerBatch}
          batches={batches}
          onClose={() => setDrawerBatch(null)}
        />
      )}

      {/* ─── Modals ─── */}

      {/* Resolve employer request */}
      <Modal
        isOpen={resolveModal.isOpen}
        onClose={() => setResolveModal({ ...resolveModal, isOpen: false })}
        title={`${resolveModal.status === 'approved' ? '✅ Approve' : '❌ Reject'} Employer Request`}
        description="Add notes for the employer explaining your decision."
        footer={
          <>
            <button className="th-btn-ghost" onClick={() => setResolveModal({ ...resolveModal, isOpen: false })}>Cancel</button>
            <button className="th-btn-primary" onClick={handleResolveRequest}>Save Resolution</button>
          </>
        }
      >
        <textarea
          className="th-input min-h-[120px]"
          value={resolveModal.notes}
          onChange={(e) => setResolveModal({ ...resolveModal, notes: e.target.value })}
          placeholder="Resolution notes for the employer…"
        />
      </Modal>

      {/* Review job request */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
        title={`${reviewModal.status === 'approved' ? '✅ Approve' : '❌ Reject'} Campus Job Drive`}
        description="Review the incoming campus drive request and optionally assign it to a specific batch."
        footer={
          <>
            <button className="th-btn-ghost" onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}>Cancel</button>
            <button className="th-btn-primary" onClick={handleReviewJob}>Finalize Review</button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="th-label">Internal notes</span>
            <textarea
              className="th-input min-h-[80px] mt-2"
              value={reviewModal.internalNotes}
              onChange={(e) => setReviewModal({ ...reviewModal, internalNotes: e.target.value })}
              placeholder="Internal tracking notes (not shown to employer)…"
            />
          </label>
          {reviewModal.status === 'approved' && (
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <label className="block">
                <span className="th-label">Target batch</span>
                <p className="text-[10px] text-ink-soft mt-1 mb-2">
                  Visible to this batch only.
                </p>
                <select
                  className="th-input"
                  value={reviewModal.batchId}
                  onChange={(e) => setReviewModal({ ...reviewModal, batchId: e.target.value, groupId: '' })}
                >
                  <option value="">None (all batches)</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.department})</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="th-label">Target group</span>
                <p className="text-[10px] text-ink-soft mt-1 mb-2">
                  Visible to this dynamic group only.
                </p>
                <select
                  className="th-input"
                  value={reviewModal.groupId}
                  onChange={(e) => setReviewModal({ ...reviewModal, groupId: e.target.value, batchId: '' })}
                >
                  <option value="">None</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {reviewModal.status === 'approved' && !reviewModal.batchId && !reviewModal.groupId && (
            <div
              className="mt-4 p-3 rounded-xl text-[10px] text-ink-soft"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}
            >
              <span className="font-bold text-ink mr-1">Note:</span>
              Since no target is selected, this job will be visible to <span className="text-ink font-semibold">all students</span> in your college.
            </div>
          )}
        </div>
      </Modal>

      {/* Revoke invitation */}
      <Modal
        isOpen={revokeModal.isOpen}
        onClose={() => setRevokeModal({ ...revokeModal, isOpen: false })}
        title="Revoke Invitation"
        description="Are you sure? The invitation link will be immediately disabled and the student won't be able to accept it."
        footer={
          <>
            <button className="th-btn-ghost" onClick={() => setRevokeModal({ ...revokeModal, isOpen: false })}>Cancel</button>
            <button
              className="th-btn-secondary text-sm"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', borderColor: 'rgba(239,68,68,0.25)' }}
              onClick={handleRevokeInvitation}
            >
              Revoke Invitation
            </button>
          </>
        }
      />
    </AppShell>
  );
}
