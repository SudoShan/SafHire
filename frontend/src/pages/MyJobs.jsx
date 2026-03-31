import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import JobCard from '../components/JobCard';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function MyJobs() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [applicants, setApplicants] = useState([]);

  useEffect(() => {
    async function loadJobs() {
      try {
        const { data } = await api.get('/employers/my-jobs');
        const items = data.jobs || [];
        setJobs(items);
        if (items[0]) {
          setSelectedJobId(items[0].id);
        }
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load jobs'));
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setApplicants([]);
      return;
    }

    async function loadApplicants() {
      try {
        const { data } = await api.get(`/jobs/${selectedJobId}/applicants`);
        setApplicants(data.applicants || []);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load applicants'));
      }
    }

    loadApplicants();
  }, [selectedJobId]);

  const updateStatus = async (applicationId, status) => {
    try {
      await api.patch(`/jobs/applications/${applicationId}/status`, { status });
      toast.success(`Application marked as ${status}.`);
      // Refresh current applicants
      const { data } = await api.get(`/jobs/${selectedJobId}/applicants`);
      setApplicants(data.applicants || []);
    } catch (error) {
      toast.error(getApiError(error, 'Unable to update status'));
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen label="Loading your jobs…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Employer jobs"
          title="Manage your posting pipeline"
          description="Review AI status, see which roles are public versus campus-routed, and inspect applicants without leaving the employer workspace."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <EmptyState
              title="No jobs created yet"
              description="Create a role to start receiving AI trust reviews and candidate applications."
            />
          ) : (
            jobs.map((job) => (
              <button
                key={job.id}
                className="block w-full text-left"
                type="button"
                onClick={() => setSelectedJobId(job.id)}
              >
                <JobCard compact job={job} action={selectedJobId === job.id ? <StatusBadge status="selected" /> : null} />
              </button>
            ))
          )}
        </div>

        <section className="th-section">
          <div>
            <p className="th-label">Applicant panel</p>
            <h2 className="mt-2 text-3xl text-ink">Selected role applicants</h2>
          </div>
          <div className="mt-5 space-y-3">
            {!selectedJobId ? (
              <EmptyState
                title="Choose a job to review applicants"
                description="Applicant cards and status updates will load here once you select a job."
              />
            ) : applicants.length === 0 ? (
              <EmptyState
                title="No applicants yet"
                description="Once students apply through TrustHire, their profile snapshot will appear here."
              />
            ) : (
              applicants.map((application) => (
                <article key={application.id} className="th-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{application.student?.user?.full_name}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {application.student?.department} · {application.student?.college?.name}
                      </p>
                    </div>
                    <StatusBadge status={application.status} />
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-ink-soft sm:grid-cols-2">
                    <p>Applied on {formatDate(application.applied_at)}</p>
                    <p>CGPA {application.student?.cgpa ?? 0}</p>
                  </div>
                  {application.cover_letter ? <p className="mt-3 text-sm leading-7 text-ink-soft italic font-serif">"{application.cover_letter}"</p> : null}
                  
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button 
                      className="th-btn-primary text-xs py-1.5 px-3" 
                      onClick={() => updateStatus(application.id, 'accepted')}
                      disabled={application.status === 'accepted'}
                    >
                      Accept
                    </button>
                    <button 
                      className="th-btn-secondary text-xs py-1.5 px-3" 
                      onClick={() => updateStatus(application.id, 'rejected')}
                      disabled={application.status === 'rejected'}
                    >
                      Reject
                    </button>
                    {application.student?.resume_url && (
                      <a 
                        className="th-btn-ghost text-xs py-1.5 px-3" 
                        href={application.student.resume_url} 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        View Resume/Profile
                      </a>
                    )}
                    <Link 
                      className="th-btn-ghost text-xs py-1.5 px-3" 
                      to={`/jobs/${selectedJobId}/discussion`}
                    >
                      Chat (Discuss)
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
