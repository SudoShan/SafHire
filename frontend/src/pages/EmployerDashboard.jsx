import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineBriefcase,
  HiOutlineCheckBadge,
  HiOutlinePlusCircle,
} from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import JobCard from '../components/JobCard';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';

export default function EmployerDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [colleges, setColleges] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, jobsRes, collegesRes] = await Promise.all([
          api.get('/employers/profile').catch(() => ({ data: { profile: null } })),
          api.get('/employers/my-jobs').catch(() => ({ data: { jobs: [] } })),
          api.get('/employers/colleges').catch(() => ({ data: { colleges: [] } })),
        ]);
        setProfile(profileRes.data.profile || null);
        setJobs(jobsRes.data.jobs || []);
        setColleges(collegesRes.data.colleges || []);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load employer dashboard'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <AppShell><LoadingScreen label="Loading employer workspace…" /></AppShell>;

  const approvedCount = colleges.filter((c) => c.access?.status === 'approved').length;
  const pendingCount = colleges.filter((c) => c.access?.status === 'requested').length;
  const flaggedJobs = jobs.filter((j) => ['restricted', 'blocked', 'under_review'].includes(j.status)).length;

  const verificationColor = {
    verified: '#10b981',
    pending: '#f59e0b',
    blocked: '#ef4444',
  }[profile?.verification_status] || '#94a3b8';

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Employer workspace"
          title={profile?.company_name || 'Set up your employer profile'}
          description="Manage company trust signals, post jobs, and track applicant pipelines."
          actions={
            <>
              <Link className="th-btn-secondary" to="/employer/profile">
                <HiOutlineCheckBadge className="h-4 w-4" />
                Company Profile
              </Link>
              <Link className="th-btn-primary" to="/employer/post-job">
                <HiOutlinePlusCircle className="h-4 w-4" />
                Post a Job
              </Link>
            </>
          }
        />
      </section>

      <div className="th-grid-autofit stagger">
        <StatCard
          label="Verification"
          value={profile?.verification_status?.toUpperCase() || 'PENDING'}
          helper="Global employer status"
          tone="teal"
        />
        <StatCard
          label="Credibility Score"
          value={Math.round(profile?.credibility_score || 0)}
          helper="Weighted by trust history"
          tone="rust"
        />
        <StatCard
          label="College Access"
          value={approvedCount}
          helper={`${pendingCount} pending requests`}
          tone="slate"
        />
        <StatCard
          label="Needs Review"
          value={flaggedJobs}
          helper="Restricted or blocked jobs"
          tone="rose"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Verification panel */}
        <div className="th-section space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="th-label">Trust status</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Verification overview</h2>
            </div>
            {profile?.verification_status && <StatusBadge status={profile.verification_status} />}
          </div>

          {profile ? (
            <div className="space-y-3">
              {/* Credibility gauge */}
              <div className="th-panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="th-label">Credibility score</p>
                  <span className="text-2xl font-extrabold" style={{ color: verificationColor }}>
                    {Math.round(profile.credibility_score || 0)}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(profile.credibility_score || 0, 100)}%`,
                      background: `linear-gradient(90deg, ${verificationColor}, ${verificationColor}99)`,
                      transition: 'width 0.7s ease',
                    }}
                  />
                </div>
              </div>

              <div className="th-panel p-4">
                <p className="th-label mb-2">Company details</p>
                <p className="text-sm font-semibold text-ink">{profile.official_email}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {profile.company_type?.toUpperCase()} · {profile.company_domain || 'Domain not set'}
                </p>
              </div>

              {/* Recent verifications */}
              {profile.verifications?.length > 0 && (
                <div className="th-panel p-4 space-y-3">
                  <p className="th-label">Recent verification events</p>
                  {profile.verifications.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{item.verification_type}</p>
                        <p className="text-xs text-ink-soft mt-0.5">{item.notes || 'No notes'}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="Create your employer profile first"
              description="TrustHire cannot verify your employer or publish jobs until the company profile exists."
              action={<Link className="th-btn-primary text-sm" to="/employer/profile">Create profile</Link>}
            />
          )}
        </div>

        {/* Jobs panel */}
        <div className="th-section space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="th-label">Live job board</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Your published roles</h2>
            </div>
            <Link className="th-btn-secondary text-xs" to="/employer/jobs">
              <HiOutlineBriefcase className="h-3.5 w-3.5" />
              Manage all
            </Link>
          </div>

          <div className="space-y-3">
            {jobs.length === 0 ? (
              <EmptyState
                title="No jobs posted yet"
                description="Create a role to start receiving AI trust reviews and candidate applications."
                action={<Link className="th-btn-primary text-sm" to="/employer/post-job">Post your first job</Link>}
              />
            ) : (
              jobs.slice(0, 3).map((job) => <JobCard key={job.id} compact job={job} />)
            )}
          </div>

          {jobs.length > 3 && (
            <Link className="th-btn-secondary w-full justify-center text-sm" to="/employer/jobs">
              View all {jobs.length} jobs
              <HiOutlineArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
