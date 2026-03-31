import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function MyApplications() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    async function loadApplications() {
      try {
        const { data } = await api.get('/students/applications');
        setApplications(data.applications || []);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load applications'));
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen label="Loading your applications…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Application tracker"
          title="Follow every submitted application"
          description="TrustHire keeps one timeline for public roles and campus drives so you can check progress without searching through email threads."
        />
      </section>

      <section className="th-section">
        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Applications will appear here after you apply to a public or campus-assigned job."
            action={<Link className="th-btn-primary" to="/jobs">Browse jobs</Link>}
          />
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <article key={application.id} className="th-panel p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link className="text-2xl text-ink hover:text-teal-800" to={`/jobs/${application.job?.id}`}>
                      {application.job?.title}
                    </Link>
                    <p className="mt-2 text-sm text-ink-soft">
                      {application.job?.employer?.company_name || 'Employer'} · Applied on {formatDate(application.applied_at)}
                    </p>
                  </div>
                  <StatusBadge status={application.status} />
                </div>
                {application.cover_letter ? (
                  <p className="mt-4 text-sm leading-7 text-ink-soft">{application.cover_letter}</p>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-ink-soft">No cover letter submitted for this application.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
