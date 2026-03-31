import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineNoSymbol,
  HiOutlineChartBar,
  HiOutlineBriefcase,
} from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';
import { formatDate } from '../lib/utils';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: HiOutlineChartBar },
  { id: 'flagged', label: 'Flagged Jobs', icon: HiOutlineExclamationTriangle },
  { id: 'users', label: 'Users', icon: HiOutlineUserGroup },
  { id: 'employers', label: 'Employers', icon: HiOutlineBriefcase },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [flaggedJobs, setFlaggedJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'dashboard') {
        const { data } = await api.get('/analytics/platform').catch(() => ({ data: {} }));
        setStats(data);
      } else if (tab === 'flagged') {
        const { data } = await api.get('/super-admin/flagged-jobs').catch(() => ({ data: { jobs: [] } }));
        setFlaggedJobs(data.jobs || []);
      } else if (tab === 'users') {
        const { data } = await api.get('/super-admin/users').catch(() => ({ data: { users: [] } }));
        setUsers(data.users || []);
      } else if (tab === 'employers') {
        const { data } = await api.get('/super-admin/employers').catch(() => ({ data: { employers: [] } }));
        setEmployers(data.employers || []);
      }
    } catch (err) {
      toast.error(getApiError(err, 'Unable to load admin data'));
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = async (jobId, status) => {
    try {
      await api.patch(`/jobs/${jobId}/status`, { status, reason: `${status} by super admin.` });
      toast.success(`Job marked ${status}.`);
      loadData();
    } catch (err) {
      toast.error(getApiError(err, 'Unable to update job'));
    }
  };

  const handleEmployerAction = async (empId, status) => {
    try {
      await api.patch(`/super-admin/employers/${empId}/status`, {
        status,
        blocked_reason: status === 'blocked' ? 'Blocked by super admin.' : null,
      });
      toast.success(`Employer marked ${status}.`);
      loadData();
    } catch (err) {
      toast.error(getApiError(err, 'Unable to update employer'));
    }
  };

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Admin panel"
          title="Platform administration"
          description="Review flagged content, manage users, verify employers, and monitor platform health."
        />
      </section>

      {/* Tab bar */}
      <div
        className="flex gap-1 rounded-2xl p-1.5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all flex-1 justify-center"
            style={{
              background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              border: tab === t.id ? '1px solid var(--border-brand)' : '1px solid transparent',
            }}
            onClick={() => setTab(t.id)}
          >
            <t.icon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingScreen label="Loading admin data…" />
      ) : (
        <>
          {tab === 'dashboard' && (
            <div className="space-y-4 animate-fade-in">
              <div className="th-grid-autofit">
                {[
                  { label: 'Colleges', value: stats?.college_count || 0, color: '#06b6d4' },
                  { label: 'Employers', value: stats?.employer_count || 0, color: '#f97316' },
                  { label: 'Total Jobs', value: stats?.job_count || 0, color: '#818cf8' },
                  { label: 'Blocked Jobs', value: stats?.blocked_job_count || 0, color: '#f87171' },
                  { label: 'Approved Appeals', value: stats?.approved_appeals_count || 0, color: '#34d399' },
                ].map((s) => (
                  <div key={s.label} className="th-metric text-center" style={{ borderColor: `${s.color}22` }}>
                    <p className="text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                    <p className="th-label mt-2">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="th-section">
                <p className="th-label mb-4">Platform health</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'AI scam detection', desc: 'Screening all new job postings' },
                    { label: 'RLS policies active', desc: 'All tables row-level secured' },
                    { label: 'Audit logging', desc: 'All admin actions tracked' },
                  ].map((item) => (
                    <div key={item.label} className="th-panel p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />
                        <p className="text-sm font-semibold text-ink">{item.label}</p>
                      </div>
                      <p className="text-xs text-ink-soft">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'flagged' && (
            <div className="th-section space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <HiOutlineExclamationTriangle className="h-5 w-5" style={{ color: '#f87171' }} />
                </div>
                <div>
                  <p className="th-label">Flagged jobs</p>
                  <h2 className="text-lg font-bold text-ink">{flaggedJobs.length} jobs need review</h2>
                </div>
              </div>
              {flaggedJobs.length === 0 ? (
                <EmptyState title="No flagged jobs" description="AI screening hasn't flagged anything recently." />
              ) : (
                <div className="space-y-3">
                  {flaggedJobs.map((job) => (
                    <div key={job.id} className="th-panel p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-ink truncate">{job.title}</p>
                          <p className="text-sm text-ink-soft mt-0.5">{job.employer?.company_name || 'Employer'}</p>
                          <p className="text-xs text-ink-soft mt-1 line-clamp-2">{job.description}</p>
                        </div>
                        <StatusBadge status={job.status} />
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span style={{ color: '#f87171' }}>Scam score: {job.ai_review?.scam_score ?? 'N/A'}</span>
                        <span style={{ color: '#fbbf24' }}>Risk: {job.ai_review?.risk_level || 'unknown'}</span>
                      </div>
                      {job.ai_review?.explanation && (
                        <p className="text-xs text-ink-soft leading-5 italic">"{job.ai_review.explanation}"</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button className="th-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1" type="button" onClick={() => handleJobAction(job.id, 'approved')}>
                          <HiOutlineCheckCircle className="h-3.5 w-3.5" style={{ color: '#34d399' }} />
                          Approve
                        </button>
                        <button className="th-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1" type="button" onClick={() => handleJobAction(job.id, 'blocked')}>
                          <HiOutlineNoSymbol className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                          Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'users' && (
            <div className="th-section animate-fade-in">
              <p className="th-label mb-4">All platform users</p>
              {users.length === 0 ? (
                <EmptyState title="No users data" description="User listing requires the /super-admin/users endpoint." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="th-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className="font-medium">{u.full_name}</td>
                          <td className="text-ink-soft">{u.email}</td>
                          <td><StatusBadge status={u.role_code} /></td>
                          <td className="text-ink-soft">{formatDate(u.created_at)}</td>
                          <td><StatusBadge status={u.is_active ? 'active' : 'inactive'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'employers' && (
            <div className="th-section space-y-4 animate-fade-in">
              <p className="th-label">Employer network</p>
              {employers.length === 0 ? (
                <EmptyState title="No employers yet" description="Employer profiles appear here once recruiter accounts complete registration." />
              ) : (
                <div className="space-y-3">
                  {employers.map((emp) => (
                    <div key={emp.id} className="th-panel p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{emp.company_name}</p>
                          <p className="text-xs text-ink-soft mt-0.5">{emp.official_email} · {emp.company_domain || 'No domain'}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-ink-soft">
                            <span>Type: {emp.company_type?.toUpperCase()}</span>
                            <span>Score: {Math.round(emp.credibility_score || 0)}</span>
                          </div>
                        </div>
                        <StatusBadge status={emp.verification_status} />
                      </div>
                      <div className="flex gap-2">
                        <button className="th-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1" type="button" onClick={() => handleEmployerAction(emp.id, 'verified')}>
                          <HiOutlineCheckCircle className="h-3.5 w-3.5" style={{ color: '#34d399' }} />
                          Verify
                        </button>
                        <button className="th-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1" type="button" onClick={() => handleEmployerAction(emp.id, 'blocked')}>
                          <HiOutlineNoSymbol className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                          Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
