import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineCheckBadge,
  HiOutlineNoSymbol,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [flaggedJobs, setFlaggedJobs] = useState([]);
  const [employers, setEmployers] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [analyticsRes, flaggedRes, employersRes] = await Promise.all([
          api.get('/analytics/platform').catch(() => ({ data: null })),
          api.get('/super-admin/flagged-jobs').catch(() => ({ data: { jobs: [] } })),
          api.get('/super-admin/employers').catch(() => ({ data: { employers: [] } })),
        ]);
        setAnalytics(analyticsRes.data);
        setFlaggedJobs(flaggedRes.data.jobs || []);
        setEmployers(employersRes.data.employers || []);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load platform dashboard'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const updateEmployerStatus = async (employerId, status) => {
    try {
      await api.patch(`/super-admin/employers/${employerId}/status`, {
        status,
        blocked_reason: status === 'blocked' ? 'Blocked by super admin during trust review.' : null,
      });
      toast.success(`Employer marked ${status}.`);
      const res = await api.get('/super-admin/employers');
      setEmployers(res.data.employers || []);
    } catch (error) {
      toast.error(getApiError(error, 'Unable to update employer status'));
    }
  };

  if (loading) return <AppShell><LoadingScreen label="Loading platform controls…" /></AppShell>;

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Super admin"
          title="Platform governance"
          description="Approve colleges, verify or block employers, and monitor fraud patterns across the TrustHire network."
          actions={
            <>
              <Link className="th-btn-secondary" to="/super-admin/colleges">
                College Setup
              </Link>
              <Link className="th-btn-primary" to="/analytics">
                Analytics
                <HiOutlineArrowRight className="h-4 w-4" />
              </Link>
            </>
          }
        />
      </section>

      <div className="th-grid-autofit stagger">
        <StatCard label="Colleges" value={analytics?.college_count || 0} helper="Approved on the network" tone="teal" />
        <StatCard label="Employers" value={analytics?.employer_count || 0} helper="Global company entities" tone="rust" />
        <StatCard label="Total Jobs" value={analytics?.job_count || 0} helper="Public + campus hiring" tone="slate" />
        <StatCard label="Blocked Jobs" value={analytics?.blocked_job_count || 0} helper="Stopped by trust controls" tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Flagged jobs */}
        <div className="th-section space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              <HiOutlineExclamationTriangle className="h-5 w-5" style={{ color: '#f87171' }} />
            </div>
            <div>
              <p className="th-label">Flagged jobs</p>
              <h2 className="text-lg font-bold text-ink">Needs platform attention</h2>
            </div>
          </div>

          <div className="space-y-3">
            {flaggedJobs.length === 0 ? (
              <EmptyState
                title="No flagged jobs right now"
                description="Restricted and blocked jobs will appear here when AI screening or moderation flags them."
              />
            ) : (
              flaggedJobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  className="th-panel flex items-start justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{job.title}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {job.employer?.company_name || 'Employer'} · Scam score{' '}
                      <span style={{ color: job.ai_review?.scam_score > 60 ? '#f87171' : '#fbbf24' }}>
                        {job.ai_review?.scam_score ?? 'N/A'}
                      </span>
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Employer network */}
        <div className="th-section space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="th-label">Employer network</p>
              <h2 className="text-lg font-bold text-ink">Recent employer entities</h2>
            </div>
            <Link className="th-btn-secondary text-xs" to="/super-admin/colleges">
              Provision CDC
            </Link>
          </div>

          <div className="space-y-3">
            {employers.length === 0 ? (
              <EmptyState
                title="No employers yet"
                description="Employer profiles appear here once recruiter accounts complete verification."
              />
            ) : (
              employers.slice(0, 5).map((employer) => (
                <div key={employer.id} className="th-panel p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{employer.company_name}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        Score: {Math.round(employer.credibility_score || 0)} · {employer.company_type?.toUpperCase()}
                      </p>
                    </div>
                    <StatusBadge status={employer.verification_status} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="th-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                      type="button"
                      onClick={() => updateEmployerStatus(employer.id, 'verified')}
                    >
                      <HiOutlineCheckBadge className="h-3.5 w-3.5" style={{ color: '#34d399' }} />
                      Verify
                    </button>
                    <button
                      className="th-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                      type="button"
                      onClick={() => updateEmployerStatus(employer.id, 'blocked')}
                    >
                      <HiOutlineNoSymbol className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                      Block
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
