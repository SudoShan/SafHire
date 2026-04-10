import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import JobCard from '../components/JobCard';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import api, { getApiError } from '../lib/api';
import { formatDate } from '../lib/utils';
import { HiOutlineArrowTopRightOnSquare, HiOutlineBriefcase, HiOutlinePlus } from 'react-icons/hi2';

export default function MyJobs() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    async function loadJobs() {
      try {
        const { data } = await api.get('/employers/my-jobs');
        setJobs(data.jobs || []);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load jobs'));
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

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
          kicker="Employer workspace"
          title="Your Active Postings"
          description="View and manage your roles. Click on any job to review applicants, update hiring phases, and see AI match scores."
          actions={
            <Link to="/employer/post-job" className="th-btn-primary">
              <HiOutlinePlus className="h-4 w-4" />
              Post New Job
            </Link>
          }
        />
      </section>

      <section className="th-section">
        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs created yet"
            description="Create a role to start receiving AI trust reviews and candidate applications."
            action={
              <Link to="/employer/post-job" className="th-btn-primary mt-4">
                Post your first job
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {jobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                action={
                  <Link 
                    to={`/jobs/${job.id}`} 
                    className="th-btn-primary text-xs px-4"
                  >
                    Manage Applicants
                  </Link>
                } 
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
