import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import DiscussionBoard from '../components/DiscussionBoard';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';
import { formatDate, sentenceCase } from '../lib/utils';

export default function DiscussionThread() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);

  useEffect(() => {
    async function loadJob() {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        setJob(data.job);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load discussion context'));
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen label="Loading discussion thread…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Back link */}
      <div>
        <Link
          to={`/jobs/${id}`}
          className="th-btn-ghost text-sm inline-flex"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to job
        </Link>
      </div>

      <section className="th-section">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: 'rgba(6,182,212,0.1)' }}
          >
            <HiOutlineChatBubbleLeftRight className="h-5 w-5" style={{ color: '#22d3ee' }} />
          </div>
          <div>
            <p className="th-label">Discussion thread</p>
          </div>
        </div>

        <PageHeader
          title={job?.title || 'Job discussion'}
          description="Share interview experiences, preparation topics, and role-specific signals with the appropriate audience for this job."
        />

        {job && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={job.status} />
            {job.distribution_mode && (
              <span
                className="th-badge"
                style={{
                  background: 'rgba(99,102,241,0.1)',
                  color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              >
                {sentenceCase(job.distribution_mode)}
              </span>
            )}
            <span className="text-xs text-ink-soft">
              {job.employer?.company_name} · Deadline {formatDate(job.application_deadline)}
            </span>
          </div>
        )}
      </section>

      <DiscussionBoard
        canPost
        collegeId={job?.discussion_scope === 'college' ? job?.discussion_college_id : null}
        jobId={id}
      />
    </AppShell>
  );
}
