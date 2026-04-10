import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineBookmark,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineUserCircle,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import JobCard from '../components/JobCard';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import api, { getApiError } from '../lib/api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, feedRes, analyticsRes] = await Promise.all([
          api.get('/students/profile').catch(() => ({ data: { profile: null } })),
          api.get('/students/feed').catch(() => ({ data: { jobs: [] } })),
          api.get('/analytics/student').catch(() => ({ data: {} })),
        ]);
        setProfile(profileRes.data.profile || feedRes.data.profile || null);
        setJobs(feedRes.data.jobs || []);
        setAnalytics(analyticsRes.data || null);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load dashboard'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleSave = async (jobId) => {
    try {
      const { data } = await api.post(`/students/saved-jobs/${jobId}/toggle`);
      setJobs((cur) => cur.map((j) => (j.id === jobId ? { ...j, is_saved: data.saved } : j)));
      toast.success(data.saved ? 'Job saved.' : 'Removed from saved jobs.');
    } catch (error) {
      toast.error(getApiError(error, 'Unable to update saved jobs'));
    }
  };

  if (loading) return <AppShell><LoadingScreen label="Loading your dashboard…" /></AppShell>;

  const completion = analytics?.profile_completion || 0;

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Student workspace"
          title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'Student'} 👋`}
          description="Track your profile strength, review matched jobs, and manage your applications."
          actions={
            <>
              <Link className="th-btn-secondary" to="/student/profile">
                <HiOutlineUserCircle className="h-4 w-4" />
                Edit Profile
              </Link>
              <Link className="th-btn-primary" to="/jobs">
                Browse Jobs
                <HiOutlineArrowRight className="h-4 w-4" />
              </Link>
            </>
          }
        />
      </section>

      {/* Stats */}
      <div className="th-grid-autofit stagger">
        <StatCard label="Profile Completion" value={`${completion}%`} helper="Resume, skills, verification" tone="teal" />
        <StatCard label="Applications" value={analytics?.application_count || 0} helper="Total submitted" tone="rust" />
        <StatCard label="Shortlisted" value={analytics?.shortlisted_count || 0} helper="Interviewing or offered" tone="slate" />
        <StatCard label="Saved Jobs" value={analytics?.saved_jobs_count || 0} helper="Tracked for follow-up" tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Profile card */}
        <div className="th-section space-y-4">
          <div>
            <p className="th-label">Profile readiness</p>
            <h2 className="mt-2 text-xl font-bold text-ink">Academic snapshot</h2>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-ink-soft">Completion</span>
              <span className="text-xs font-semibold" style={{ color: completion >= 70 ? '#10b981' : completion >= 40 ? '#f59e0b' : '#ef4444' }}>
                {completion}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${completion}%`,
                  background: completion >= 70
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : completion >= 40
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)',
                }}
              />
            </div>
          </div>

          {profile ? (
            <div className="space-y-3">
              <div className="th-panel p-4">
                <p className="text-sm font-semibold text-ink">{profile.college?.name || 'College not set'}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {profile.department || 'Department pending'} · Batch {profile.batch?.name || 'Not assigned'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="th-panel p-4 text-center">
                  <p className="th-label">CGPA</p>
                  <p className="mt-2 text-2xl font-extrabold" style={{ color: '#06b6d4' }}>
                    {profile.cgpa ?? '—'}
                  </p>
                </div>
                <div className="th-panel p-4 text-center">
                  <p className="th-label">Backlogs</p>
                  <p className="mt-2 text-2xl font-extrabold" style={{ color: profile.active_backlogs > 0 ? '#f87171' : '#34d399' }}>
                    {profile.active_backlogs ?? 0}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="th-panel p-4">
                <p className="th-label mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...(profile.skills || []), ...(profile.parsed_resume_skills || [])].slice(0, 8).map((skill) => (
                    <span
                      key={skill}
                      className="th-badge"
                      style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.2)' }}
                    >
                      {skill}
                    </span>
                  ))}
                  {!profile.skills?.length && !profile.parsed_resume_skills?.length && (
                    <span className="text-xs text-ink-soft">Upload a resume to extract skills.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Complete your student profile"
              description="Your job feed, eligibility, and AI fit score improve once your batch, CGPA, skills, and resume are set."
              action={<Link className="th-btn-primary text-sm" to="/student/profile">Set up profile</Link>}
            />
          )}

          <div className="flex gap-2 pt-1">
            <Link className="th-btn-secondary text-xs flex-1 justify-center" to="/student/applications">
              <HiOutlineDocumentText className="h-3.5 w-3.5" />
              Applications
            </Link>
            <Link className="th-btn-secondary text-xs flex-1 justify-center" to="/student/profile">
              <HiOutlineBookmark className="h-3.5 w-3.5" />
              Saved Jobs
            </Link>
          </div>
        </div>

        {/* Job feed */}
        <div className="space-y-4">
          {/* Campus Drives Section */}
          <div className="th-section space-y-4 border-2 border-indigo-500/10 bg-indigo-500/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="th-label flex items-center gap-1.5 text-indigo-500">
                  <HiOutlineSparkles className="h-3.5 w-3.5" />
                  Campus recruitment
                </p>
                <h2 className="mt-1 text-xl font-bold text-ink">Active campus drives</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="th-badge bg-indigo-500 text-white border-transparent">
                  {jobs.filter(j => j.distribution_mode === 'campus_cdc').length} Jobs
                </span>
                <Link
                  className="th-btn-secondary text-xs"
                  to="/student/campus-drives"
                >
                  <HiOutlineBuildingOffice2 className="h-3.5 w-3.5" />
                  All Drives
                  <HiOutlineArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {jobs.filter(j => j.distribution_mode === 'campus_cdc').length === 0 ? (
                <p className="text-xs text-ink-soft py-4 text-center">No active campus drives for your batch right now.</p>
              ) : (
                jobs.filter(j => j.distribution_mode === 'campus_cdc').slice(0, 3).map((job) => (
                  <JobCard
                    key={job.id}
                    compact
                    job={job}
                  />
                ))
              )}
            </div>

            {jobs.filter(j => j.distribution_mode === 'campus_cdc').length > 3 && (
              <Link
                className="th-btn-primary w-full justify-center text-sm"
                to="/student/campus-drives"
              >
                View all {jobs.filter(j => j.distribution_mode === 'campus_cdc').length} campus drives
                <HiOutlineArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Recommended Feed */}
          <div className="th-section space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="th-label">Smart feed</p>
                <h2 className="mt-1 text-xl font-bold text-ink">Recommended for you</h2>
              </div>
              <Link className="th-btn-secondary text-xs" to="/jobs">
                All jobs
                <HiOutlineArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {jobs.filter(j => j.distribution_mode !== 'campus_cdc').length === 0 ? (
                <EmptyState
                  title="No other recommendations"
                  description="Check back later for curated job opportunities."
                />
              ) : (
                jobs.filter(j => j.distribution_mode !== 'campus_cdc').slice(0, 4).map((job) => (
                  <JobCard
                    key={job.id}
                    compact
                    job={job}
                    action={
                      <button
                        className="th-btn-ghost text-xs px-2 py-1"
                        type="button"
                        onClick={() => toggleSave(job.id)}
                      >
                        <HiOutlineBookmark className="h-3.5 w-3.5" />
                        {job.is_saved ? 'Saved' : 'Save'}
                      </button>
                    }
                  />
                ))
              )}
            </div>

            {jobs.length > 0 && (
              <div className="pt-1">
                <Link className="th-btn-primary w-full justify-center text-sm" to="/jobs">
                  <HiOutlineSparkles className="h-4 w-4" />
                  View all {jobs.length} eligible jobs
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
