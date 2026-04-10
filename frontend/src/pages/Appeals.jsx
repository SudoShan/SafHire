import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import api, { getApiError } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function Appeals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appeals, setAppeals] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState('');
  const [reason, setReason] = useState('');

  // Modal state
  const [reviewModal, setReviewModal] = useState({ isOpen: false, id: null, status: '', notes: '' });

  const loadAppeals = async () => {
    try {
      const [appealResponse, jobResponse] = await Promise.all([
        api.get('/appeals'),
        user.role === 'employer' ? api.get('/employers/my-jobs').catch(() => ({ data: { jobs: [] } })) : Promise.resolve({ data: { jobs: [] } }),
      ]);
      setAppeals(appealResponse.data.appeals || []);
      setJobs(jobResponse.data.jobs || []);
    } catch (error) {
      toast.error(getApiError(error, 'Unable to load appeals'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppeals();
  }, [user.role]);

  const submitAppeal = async (event) => {
    event.preventDefault();
    try {
      await api.post('/appeals', { jobId, reason });
      toast.success('Appeal submitted.');
      setJobId('');
      setReason('');
      loadAppeals();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to submit appeal'));
    }
  };

  const handleReviewAppeal = async () => {
    try {
      await api.patch(`/appeals/${reviewModal.id}`, {
        status: reviewModal.status,
        resolution_notes: reviewModal.notes,
      });
      toast.success(`Appeal ${reviewModal.status}.`);
      setReviewModal({ isOpen: false, id: null, status: '', notes: '' });
      loadAppeals();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to review appeal'));
    }
  };

  const openReviewModal = (id, status) => {
    setReviewModal({
      isOpen: true,
      id,
      status,
      notes: status === 'approved' ? 'Returned to review queue.' : 'Appeal declined after review.',
    });
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen label="Loading appeals…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Appeals"
          title={user.role === 'super_admin' ? 'Moderate appeal decisions' : 'Challenge a blocked or restricted outcome'}
          description="Appeals create an auditable review trail when employers believe a job decision should be reconsidered."
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        {user.role === 'employer' ? (
          <section className="th-section">
            <p className="th-label">Submit appeal</p>
            <h2 className="mt-2 text-3xl text-ink">Request a second review</h2>
            <form className="mt-5 space-y-4" onSubmit={submitAppeal}>
              <select className="th-input" value={jobId} onChange={(event) => setJobId(event.target.value)} required>
                <option value="">Select a job</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} · {job.status}
                  </option>
                ))}
              </select>
              <textarea className="th-input min-h-28" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why the job should be reviewed again." required />
              <button className="th-btn-primary" type="submit">
                Submit appeal
              </button>
            </form>
          </section>
        ) : (
          <section className="th-section">
            <p className="th-label">Super admin policy</p>
            <h2 className="mt-2 text-3xl text-ink">Appeal handling rules</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-ink-soft">
              <p>Approved appeals return the job to the review queue instead of publishing instantly.</p>
              <p>Rejected appeals preserve the trust decision and keep the audit trail intact.</p>
              <p>Use the notes and job context before changing any platform status.</p>
            </div>
          </section>
        )}

        <section className="th-section">
          <p className="th-label">Appeal queue</p>
          <h2 className="mt-2 text-3xl text-ink">Current appeals</h2>
          <div className="mt-5 space-y-3">
            {appeals.length === 0 ? (
              <EmptyState
                title="No appeals found"
                description="Submitted employer appeals or platform review outcomes will appear here."
              />
            ) : (
              appeals.map((appeal) => (
                <article key={appeal.id} className="th-panel p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-ink">{appeal.job?.title || `Job ${appeal.job_id}`}</p>
                      <p className="mt-1 text-sm text-ink-soft">{appeal.reason}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink-soft">Submitted {formatDate(appeal.created_at)}</p>
                    </div>
                    <StatusBadge status={appeal.status} />
                  </div>

                  {user.role === 'super_admin' && appeal.status === 'pending' ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button className="th-btn-primary" type="button" onClick={() => openReviewModal(appeal.id, 'approved')}>
                        Approve
                      </button>
                      <button className="th-btn-secondary" type="button" onClick={() => openReviewModal(appeal.id, 'rejected')}>
                        Reject
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
        title={`Review Appeal: ${reviewModal.status}`}
        description="Provide resolution notes for this appeal."
        footer={
          <>
            <button className="th-btn-ghost" onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}>Cancel</button>
            <button className="th-btn-primary" onClick={handleReviewAppeal}>Submit Review</button>
          </>
        }
      >
        <textarea
          className="th-input min-h-[120px]"
          value={reviewModal.notes}
          onChange={(e) => setReviewModal({ ...reviewModal, notes: e.target.value })}
          placeholder="Resolution notes..."
        />
      </Modal>
    </AppShell>
  );
}
