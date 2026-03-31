import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineMagnifyingGlass, HiOutlineAdjustmentsHorizontal, HiOutlineBookmark } from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import JobCard from '../components/JobCard';
import LoadingScreen from '../components/LoadingScreen';
import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import api, { getApiError } from '../lib/api';

const JOB_TYPES = ['all', 'full_time', 'internship', 'part_time', 'contract', 'remote'];

function JobsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const endpoint = user && ['student', 'alumni'].includes(user.role) ? '/students/feed' : '/jobs';
        const { data } = await api.get(endpoint);
        setJobs(data.jobs || []);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load jobs'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const filteredJobs = useMemo(() => {
    let result = jobs;

    if (typeFilter !== 'all') {
      result = result.filter((j) => j.job_type === typeFilter || j.role === typeFilter);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((job) =>
        [job.title, job.role, job.location, job.employer?.company_name, ...(job.required_skills || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }

    return result;
  }, [jobs, query, typeFilter]);

  const toggleSave = async (jobId) => {
    try {
      const { data } = await api.post(`/students/saved-jobs/${jobId}/toggle`);
      setJobs((cur) => cur.map((j) => (j.id === jobId ? { ...j, is_saved: data.saved } : j)));
      toast.success(data.saved ? 'Job saved.' : 'Removed from saved jobs.');
    } catch (error) {
      toast.error(getApiError(error, 'Unable to update saved jobs'));
    }
  };

  if (loading) return <LoadingScreen label="Loading jobs…" />;

  return (
    <>
      <section className="th-section space-y-4">
        <PageHeader
          kicker={user ? 'Role-aware job feed' : 'Public jobs'}
          title={
            user && ['student', 'alumni'].includes(user.role)
              ? 'Your eligible jobs'
              : 'Verified open opportunities'
          }
          description={
            user && ['student', 'alumni'].includes(user.role)
              ? 'Blends platform-wide public jobs with campus-assigned drives that match your profile.'
              : 'Browse public off-campus jobs that cleared TrustHire verification and AI screening.'
          }
        />

        {/* Search */}
        <div className="relative">
          <HiOutlineMagnifyingGlass
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            className="th-input pl-10"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, skill, company, or location…"
          />
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: typeFilter === type ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)',
                color: typeFilter === type ? '#818cf8' : 'var(--text-secondary)',
                border: `1px solid ${typeFilter === type ? 'rgba(99,102,241,0.3)' : 'var(--border-subtle)'}`,
              }}
              onClick={() => setTypeFilter(type)}
            >
              {type === 'all' ? 'All types' : type.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="text-xs text-ink-soft">
          {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
          {query && ` for "${query}"`}
        </p>
      </section>

      <section className="space-y-3 stagger">
        {filteredJobs.length === 0 ? (
          <EmptyState
            title="No jobs match your filter"
            description="Try broadening the search, updating your profile, or checking back when new employers publish roles."
          />
        ) : (
          filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              action={
                user && ['student', 'alumni'].includes(user.role) ? (
                  <button
                    className="th-btn-ghost text-xs px-2 py-1"
                    type="button"
                    onClick={() => toggleSave(job.id)}
                  >
                    <HiOutlineBookmark className="h-3.5 w-3.5" />
                    {job.is_saved ? 'Saved' : 'Save'}
                  </button>
                ) : null
              }
            />
          ))
        )}
      </section>
    </>
  );
}

export default function Jobs() {
  const { user } = useAuth();

  if (user) {
    return (
      <AppShell>
        <JobsContent />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="th-container mt-6">
        <JobsContent />
      </div>
    </div>
  );
}
