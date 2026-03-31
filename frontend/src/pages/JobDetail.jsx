import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBookmark,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineMapPin,
  HiOutlineBriefcase,
  HiOutlineCurrencyRupee,
  HiOutlineCalendar,
} from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import DiscussionBoard from '../components/DiscussionBoard';
import LoadingScreen from '../components/LoadingScreen';
import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import api, { getApiError } from '../lib/api';
import { arrayFrom, formatCurrency, formatDate, sentenceCase } from '../lib/utils';

function JobDetailContent() {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [match, setMatch] = useState(null);
  const [prep, setPrep] = useState(null);
  const [applying, setApplying] = useState(false);

  const isStudent = user && ['student', 'alumni'].includes(user.role);

  useEffect(() => {
    async function loadJob() {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        setJob(data.job);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load job'));
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [id]);

  useEffect(() => {
    if (!job || !isStudent) return;
    async function loadAI() {
      try {
        const [matchRes, prepRes] = await Promise.all([
          api.post('/ai/match-job', { job_id: job.id }).catch(() => ({ data: null })),
          api.post('/ai/generate-prep', { job_id: job.id }).catch(() => ({ data: null })),
        ]);
        setMatch(matchRes.data);
        setPrep(prepRes.data);
      } catch (_) {}
    }
    loadAI();
  }, [job, isStudent]);

  const salaryLabel = useMemo(() => {
    if (!job) return '';
    if (job.salary_min && job.salary_max) return `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`;
    if (job.salary_min) return `From ${formatCurrency(job.salary_min)}`;
    if (job.salary_max) return `Up to ${formatCurrency(job.salary_max)}`;
    return 'Salary not disclosed';
  }, [job]);

  const applyToJob = async () => {
    setApplying(true);
    try {
      await api.post(`/jobs/${job.id}/apply`, { cover_letter: '' });
      toast.success('Application submitted.');
      setJob((cur) => ({ ...cur, application_status: 'applied' }));
    } catch (error) {
      toast.error(getApiError(error, 'Unable to apply'));
    } finally {
      setApplying(false);
    }
  };

  const saveJob = async () => {
    try {
      const { data } = await api.post(`/students/saved-jobs/${job.id}/toggle`);
      setJob((cur) => ({ ...cur, is_saved: data.saved }));
      toast.success(data.saved ? 'Job saved.' : 'Removed from saved jobs.');
    } catch (error) {
      toast.error(getApiError(error, 'Unable to update saved state'));
    }
  };

  if (loading) return <LoadingScreen label="Loading job details…" />;

  if (!job) {
    return (
      <div className="th-section">
        <p className="text-base font-semibold text-ink">Job not found.</p>
      </div>
    );
  }

  const scamScore = job.ai_review?.scam_score;
  const riskLevel = job.ai_review?.risk_level;
  const riskColor = riskLevel === 'low' ? '#10b981' : riskLevel === 'medium' ? '#f59e0b' : riskLevel === 'high' ? '#ef4444' : '#94a3b8';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <section className="th-section space-y-5">
        <PageHeader
          kicker={job.distribution_mode === 'campus_cdc' ? 'Campus drive' : 'Public opportunity'}
          title={job.title}
          description={job.description}
          actions={
            isStudent ? (
              <>
                <button className="th-btn-secondary" type="button" onClick={saveJob}>
                  <HiOutlineBookmark className="h-4 w-4" />
                  {job.is_saved ? 'Saved' : 'Save'}
                </button>
                <button
                  className="th-btn-primary"
                  type="button"
                  disabled={applying || Boolean(job.application_status)}
                  onClick={applyToJob}
                >
                  {job.application_status ? 'Already applied' : applying ? 'Applying…' : 'Apply now'}
                </button>
              </>
            ) : null
          }
        />

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={job.status} />
          {riskLevel && <StatusBadge status={riskLevel} />}
          {job.employer?.verification_status && <StatusBadge status={job.employer.verification_status} />}
        </div>

        {/* Meta grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: HiOutlineBriefcase, label: 'Employer', value: job.employer?.company_name || 'Employer' },
            { icon: HiOutlineMapPin, label: 'Location', value: job.location || 'Flexible' },
            { icon: HiOutlineCurrencyRupee, label: 'Compensation', value: salaryLabel },
            { icon: HiOutlineCalendar, label: 'Deadline', value: formatDate(job.application_deadline) },
          ].map((item) => (
            <div key={item.label} className="th-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <item.icon className="h-4 w-4 text-ink-soft" />
                <p className="th-label">{item.label}</p>
              </div>
              <p className="text-sm font-semibold text-ink">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Eligibility + Prep */}
      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Eligibility */}
        <div className="th-section space-y-4">
          <p className="th-label">Eligibility & trust</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Skills */}
            <div className="th-panel p-4">
              <p className="text-sm font-semibold text-ink mb-3">Required skills</p>
              <div className="flex flex-wrap gap-1.5">
                {arrayFrom(job.required_skills).length === 0 ? (
                  <span className="text-xs text-ink-soft">No explicit skills listed.</span>
                ) : (
                  arrayFrom(job.required_skills).map((skill) => (
                    <span
                      key={skill}
                      className="th-badge"
                      style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.2)' }}
                    >
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Eligibility rules */}
            <div className="th-panel p-4">
              <p className="text-sm font-semibold text-ink mb-3">Eligibility rules</p>
              <div className="space-y-1.5 text-xs text-ink-soft">
                <p>Min CGPA: <span className="text-ink font-medium">{job.eligibility_rules?.min_cgpa ?? 'Not set'}</span></p>
                <p>Max backlogs: <span className="text-ink font-medium">{job.eligibility_rules?.max_backlogs ?? 'Not set'}</span></p>
                <p>Departments: <span className="text-ink font-medium">{arrayFrom(job.eligibility_rules?.departments).join(', ') || 'All eligible'}</span></p>
              </div>
            </div>
          </div>

          {/* AI trust review */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: scamScore > 60 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
              border: `1px solid ${scamScore > 60 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HiOutlineShieldCheck className="h-4 w-4" style={{ color: riskColor }} />
                <p className="text-sm font-semibold text-ink">AI trust review</p>
              </div>
              {scamScore !== undefined && scamScore !== null && (
                <span
                  className="text-sm font-bold"
                  style={{ color: riskColor }}
                >
                  Scam score: {scamScore}
                </span>
              )}
            </div>
            <p className="text-xs leading-6 text-ink-soft">
              {job.ai_review?.explanation || 'No AI explanation recorded yet.'}
            </p>
            {arrayFrom(job.ai_review?.extracted_red_flags).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {arrayFrom(job.ai_review.extracted_red_flags).map((flag) => (
                  <span
                    key={flag}
                    className="th-badge"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prep + fit score */}
        <div className="th-section space-y-4">
          <div className="flex items-center gap-2">
            <HiOutlineSparkles className="h-4 w-4" style={{ color: '#818cf8' }} />
            <p className="th-label">Student preparation</p>
          </div>
          <h2 className="text-lg font-bold text-ink">Fit score & prep roadmap</h2>

          {isStudent ? (
            <div className="space-y-3">
              {/* Fit score */}
              <div className="th-panel p-4">
                <p className="th-label mb-2">AI fit score</p>
                <div className="flex items-end gap-3">
                  <p
                    className="text-4xl font-extrabold"
                    style={{ color: match?.fit_score >= 70 ? '#10b981' : match?.fit_score >= 40 ? '#f59e0b' : '#94a3b8' }}
                  >
                    {match?.fit_score ?? '—'}{match ? '%' : ''}
                  </p>
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  {match?.explanation || 'Complete your profile to improve AI matching.'}
                </p>
                {match?.fit_score !== undefined && (
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${match.fit_score}%`,
                        background: match.fit_score >= 70 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                        transition: 'width 0.7s ease',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Roadmap */}
              {arrayFrom(prep?.roadmap).length > 0 && (
                <div className="th-panel p-4">
                  <p className="text-sm font-semibold text-ink mb-3">Preparation roadmap</p>
                  <div className="space-y-2">
                    {arrayFrom(prep.roadmap).map((step, i) => (
                      <div key={i} className="flex gap-3 text-xs text-ink-soft">
                        <span
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                        >
                          {i + 1}
                        </span>
                        <p className="leading-5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions */}
              {arrayFrom(prep?.likely_questions).length > 0 && (
                <div className="th-panel p-4">
                  <p className="text-sm font-semibold text-ink mb-3">Likely interview questions</p>
                  <div className="space-y-1.5">
                    {arrayFrom(prep.likely_questions).slice(0, 5).map((q) => (
                      <p key={q} className="text-xs text-ink-soft leading-5">• {q}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="th-panel p-4">
              <p className="text-xs leading-6 text-ink-soft">
                Personalized match scoring and preparation are shown to students and alumni after sign-in.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Discussion */}
      <DiscussionBoard
        canPost={Boolean(user)}
        collegeId={job.discussion_scope === 'college' ? job.discussion_college_id : null}
        jobId={job.id}
      />

      {/* Attachments */}
      {arrayFrom(job.attachment_urls).length > 0 && (
        <section className="th-section space-y-4">
          <p className="th-label">Attachments</p>
          <div className="flex flex-wrap gap-3">
            {arrayFrom(job.attachment_urls).map((url) => (
              <a key={url} className="th-btn-secondary text-sm" href={url} rel="noreferrer" target="_blank">
                Open attachment
                <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function JobDetail() {
  const { user } = useAuth();

  if (user) {
    return (
      <AppShell>
        <JobDetailContent />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="th-container mt-6">
        <JobDetailContent />
      </div>
    </div>
  );
}
