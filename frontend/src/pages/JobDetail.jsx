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
  HiOutlineHandThumbUp,
  HiOutlineHandThumbDown,
  HiOutlineFlag,
} from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import DiscussionBoard from '../components/DiscussionBoard';
import LoadingScreen from '../components/LoadingScreen';
import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import TrustMeter from '../components/TrustMeter';
import { useAuth } from '../context/AuthContext';
import api, { getApiError } from '../lib/api';
import { arrayFrom, formatCurrency, formatDate, sentenceCase } from '../lib/utils';

function JobDetailContent() {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [match, setMatch] = useState(null);
  const [prep, setPrep] = useState(null);
  const [applying, setApplying] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [profile, setProfile] = useState(null);
  const [voteStatus, setVoteStatus] = useState(null);
  const [voting, setVoting] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [viewingCoverLetter, setViewingCoverLetter] = useState(null);

  const isStudent = user && ['student', 'alumni'].includes(user.role);
  const isOwner = user && job && (job.employer_id === user.id || job.employer?.user_id === user.id);
  const isAuthorizedAdmin = user && user.role === 'cdc_admin';
  const canManage = isOwner || isAuthorizedAdmin;
  const canVote = user && user.role !== 'employer';

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

  // Load vote status for authenticated users
  useEffect(() => {
    if (!id || !user) return;
    api.get(`/votes/jobs/${id}`)
      .then(({ data }) => setVoteStatus(data))
      .catch(() => {}); // non-critical
  }, [id, user]);

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

  useEffect(() => {
    if (!isStudent || !user) return;
    api.get('/students/profile')
      .then(({ data }) => setProfile(data))
      .catch(() => {});
  }, [isStudent, user]);

  useEffect(() => {
    if (!id || !canManage || !job) return;
    async function load() {
      setLoadingApplicants(true);
      try {
        const { data } = await api.get(`/jobs/${id}/applicants`);
        setApplicants(data.applicants || []);
      } catch (err) {
        toast.error(getApiError(err, 'Unable to load applicants'));
      } finally {
        setLoadingApplicants(false);
      }
    }
    load();
  }, [id, canManage, job]);

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      await api.patch(`/jobs/applications/${applicationId}/status`, { status });
      toast.success(`Candidate moved to ${status}`);
      // Refresh applicants
      const { data } = await api.get(`/jobs/${id}/applicants`);
      setApplicants(data.applicants || []);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update status'));
    }
  };

  const closeJob = async () => {
    if (!window.confirm('Are you sure you want to close this job application? No more students will be able to apply.')) return;
    try {
      await api.patch(`/jobs/${id}/status`, { status: 'closed' });
      toast.success('Job hiring closed successfully.');
      setJob(prev => ({ ...prev, status: 'closed' }));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to close job'));
    }
  };

  const salaryLabel = useMemo(() => {
    if (!job) return '';
    if (job.salary_min && job.salary_max) return `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`;
    if (job.salary_min) return `From ${formatCurrency(job.salary_min)}`;
    if (job.salary_max) return `Up to ${formatCurrency(job.salary_max)}`;
    return 'Salary not disclosed';
  }, [job]);

  const isDeadlinePassed = useMemo(() => {
    if (!job || !job.application_deadline) return false;
    return new Date(job.application_deadline) < new Date();
  }, [job]);

  const applyToJob = async (e) => {
    if (e) e.preventDefault();
    setApplying(true);
    try {
      const formData = new FormData();
      formData.append('cover_letter', coverLetter);
      if (resumeFile) formData.append('resume', resumeFile);

      await api.post(`/jobs/${job.id}/apply`, formData);
      toast.success('Application submitted.');
      setJob((cur) => ({ ...cur, application_status: 'applied' }));
      setShowApplyForm(false);
      setCoverLetter('');
      setResumeFile(null);
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

  const castVote = async (voteType) => {
    if (!user) { toast.error('Sign in to vote.'); return; }
    setVoting(true);
    try {
      const { data } = await api.post(`/votes/jobs/${job.id}`, { vote_type: voteType });
      setVoteStatus(data);
      toast.success(
        data.user_vote === voteType
          ? 'Vote recorded!'
          : 'Vote removed.',
      );
    } catch (error) {
      toast.error(getApiError(error, 'Unable to record vote'));
    } finally {
      setVoting(false);
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
                {job.require_resume && !job.application_status && !isDeadlinePassed ? (
                  <button
                    className="th-btn-primary"
                    type="button"
                    onClick={() => setShowApplyForm(true)}
                  >
                    Apply with Resume
                  </button>
                ) : (
                  <button
                    className="th-btn-primary"
                    type="button"
                    disabled={applying || Boolean(job.application_status) || isDeadlinePassed}
                    onClick={applyToJob}
                  >
                    {job.application_status ? 'Already applied' : isDeadlinePassed ? 'Deadline Passed' : applying ? 'Applying…' : 'Apply now'}
                  </button>
                )}
              </>
            ) : null
          }
        />

        {showApplyForm && (
          <form
            className="p-6 rounded-2xl border border-ink-faint bg-white shadow-xl shadow-ink/5 space-y-6 animate-slide-up"
            onSubmit={applyToJob}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
                <HiOutlineSparkles className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="font-bold text-ink text-lg">Complete your application</p>
                <p className="text-xs text-ink-soft">Tell the employer why you're a great fit for this role.</p>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="th-label">Statement of Interest / Cover Letter</span>
              <textarea
                className="th-input min-h-[120px] py-3 text-sm leading-6"
                placeholder="Briefly explain your relevant experience and motivation…"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </label>

            <label className="block space-y-2">
              <span className="th-label flex justify-between">
                <span>Resume Upload</span>
                {job.require_resume && !profile?.resume_url && (
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Required</span>
                )}
                {profile?.resume_url && !resumeFile && (
                  <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Profile resume available</span>
                )}
              </span>
              <div className={`relative group border-2 border-dashed rounded-xl p-6 transition-all ${resumeFile ? 'border-teal-500 bg-teal-50/30' : 'border-ink-faint hover:border-ink-soft bg-ink-faint/5'}`}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  required={job.require_resume}
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center text-center gap-2">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${resumeFile ? 'bg-teal-100 text-teal-600' : 'bg-white text-ink-soft shadow-sm group-hover:text-ink'}`}>
                    {resumeFile ? (
                      <HiOutlineShieldCheck className="h-6 w-6" />
                    ) : (
                      <HiOutlineArrowTopRightOnSquare className="h-6 w-6" />
                    )}
                  </div>
                  {resumeFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-ink">{resumeFile.name}</p>
                      <p className="text-[10px] text-teal-600 font-bold uppercase">Ready for upload • {(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-ink">Click to upload or drag and drop</p>
                      <p className="text-xs text-ink-soft">PDF, DOC, DOCX up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="th-btn-ghost text-sm px-5"
                onClick={() => setShowApplyForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="th-btn-primary text-sm px-8"
                disabled={applying || (job.require_resume && !resumeFile && !profile?.resume_url)}
              >
                {applying ? (
                   <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                    Submitting...
                   </>
                ) : profile?.resume_url && !resumeFile ? 'Apply with Profile Resume' : 'Submit Application'}
              </button>
            </div>
          </form>
        )}

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

      {/* Applicant Management - For Employers/Admins only */}
      {canManage && (
        <section className="th-section space-y-6">
          <div className="flex items-center justify-between border-b border-ink-faint pb-4">
            <div>
              <p className="th-label">Management controls</p>
              <h2 className="text-2xl font-bold text-ink mt-1">Job Applicants ({applicants.length})</h2>
            </div>
            <div className="flex items-center gap-4">
              {job?.status !== 'closed' && (
                <button
                  onClick={closeJob}
                  className="th-btn-secondary text-xs text-red-500 border-red-100 hover:bg-red-50"
                >
                  Close Hiring
                </button>
              )}
              <div className="flex items-center gap-2">
                 <span className={`h-2 w-2 rounded-full ${job?.status === 'closed' ? 'bg-red-500' : 'bg-teal-500 animate-pulse'}`} />
                 <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
                   {job?.status === 'closed' ? 'Hiring Closed' : 'Active Pipeline'}
                 </span>
              </div>
            </div>
          </div>

          {loadingApplicants ? (
            <div className="flex flex-col items-center justify-center p-12 text-ink-soft bg-ink-faint/5 rounded-2xl border border-dashed border-ink-faint">
              <div className="h-8 w-8 rounded-full border-2 border-teal-500/20 border-t-teal-500 animate-spin mb-3" />
              <p className="text-sm font-medium">Fetching candidate data…</p>
            </div>
          ) : applicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-ink-faint/5 rounded-2xl border border-dashed border-ink-faint">
              <HiOutlineBriefcase className="h-8 w-8 text-ink-faint mb-3" />
              <p className="text-sm font-medium text-ink-soft text-center max-w-xs">No students have applied to this role yet. Public or campus visibility can be reviewed below.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {applicants.map((app) => {
                const timeline = Array.isArray(job.timeline) && job.timeline.length > 0 ? job.timeline : ['applied'];
                const currentIdx = timeline.indexOf(app.current_phase || app.status);
                const nextPhase = currentIdx !== -1 && currentIdx < timeline.length - 1 ? timeline[currentIdx + 1] : null;

                return (
                  <article 
                    key={app.id} 
                    className={`th-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${app.status === 'rejected' ? 'opacity-50 grayscale' : 'hover:border-teal-300 hover:shadow-md'}`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-lg flex-shrink-0">
                        {app.student?.user?.full_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                           <p className="font-bold text-ink truncate">{app.student?.user?.full_name}</p>
                           <StatusBadge status={app.current_phase || app.status} />
                        </div>
                        <p className="text-xs text-ink-soft truncate">{app.student?.college?.name} · {app.student?.department}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* View Cover Letter Button */}
                      {app.cover_letter && (
                        <div className="relative">
                          <button
                            type="button"
                            className={`th-btn-secondary p-2 ${viewingCoverLetter === app.id ? 'bg-ink-faint border-ink-soft' : ''}`}
                            title="View Statement of Interest"
                            onClick={() => setViewingCoverLetter(viewingCoverLetter === app.id ? null : app.id)}
                          >
                            <HiOutlineSparkles className="h-4 w-4" />
                          </button>
                          {viewingCoverLetter === app.id && (
                            <div className="absolute right-0 top-12 z-50 w-72 p-4 bg-white rounded-xl shadow-2xl border border-ink-faint animate-slide-up">
                               <p className="th-label text-[9px] mb-2 uppercase">Statement of Interest</p>
                               <p className="text-xs leading-relaxed text-ink italic font-serif">"{app.cover_letter}"</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Download Resume Button */}
                      {(app.resume_url || app.student?.resume_url) && (
                        <a
                          href={app.resume_url || app.student?.resume_url}
                          target="_blank"
                          rel="noreferrer"
                          className="th-btn-secondary p-2"
                          title="Download Resume"
                          download
                        >
                          <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
                        </a>
                      )}

                      <div className="h-6 w-[1px] bg-ink-faint mx-1 hidden sm:block" />

                      {/* Progression / Reject Buttons */}
                      {(app.status !== 'selected' && app.status !== 'rejected' && app.current_phase !== 'selected' && app.current_phase !== 'rejected') ? (
                        <>
                          <button
                            type="button"
                            className="text-[10px] font-bold text-red-400 hover:text-red-600 px-2 py-1"
                            onClick={() => {
                              if (window.confirm('Reject this candidate? This action cannot be undone.')) {
                                updateApplicationStatus(app.id, 'rejected');
                              }
                            }}
                          >
                            Reject
                          </button>
                          {nextPhase ? (
                            <button
                              type="button"
                              className="th-btn-primary py-2 px-4 text-xs"
                              onClick={() => updateApplicationStatus(app.id, nextPhase)}
                            >
                              Advance to {nextPhase}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="th-btn-primary py-2 px-4 text-xs bg-teal-600 border-teal-600 shadow-lg shadow-teal-500/20 animate-pulse"
                              onClick={() => {
                                if (window.confirm('Confirm candidate selection? Student will be notified immediately.')) {
                                  updateApplicationStatus(app.id, 'selected');
                                }
                              }}
                            >
                              Select Candidate
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 px-4">
                          <div className={`h-2 w-2 rounded-full ${(app.status === 'selected' || app.current_phase === 'selected') ? 'bg-teal-500' : 'bg-red-500'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${(app.status === 'selected' || app.current_phase === 'selected') ? 'text-teal-600' : 'text-red-400'}`}>
                            {(app.status === 'selected' || app.current_phase === 'selected') ? 'Selected 🎉' : 'Rejected ❌'}
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

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

          {/* Community trust + voting */}
          <div className="space-y-3">
            <TrustMeter
              score={voteStatus?.trust_score ?? null}
              voteCount={(voteStatus?.upvotes ?? 0) + (voteStatus?.downvotes ?? 0) + (voteStatus?.reports ?? 0)}
              upvotes={voteStatus?.upvotes ?? 0}
              downvotes={voteStatus?.downvotes ?? 0}
              reports={voteStatus?.reports ?? 0}
            />

            {canVote && (
              <div className="flex flex-wrap gap-2">
                {[
                  { type: 'upvote', icon: HiOutlineHandThumbUp, label: 'Legit', activeColor: '#34d399', activeBg: 'rgba(16,185,129,0.15)' },
                  { type: 'downvote', icon: HiOutlineHandThumbDown, label: 'Suspicious', activeColor: '#fbbf24', activeBg: 'rgba(245,158,11,0.15)' },
                  { type: 'report_scam', icon: HiOutlineFlag, label: 'Report', activeColor: '#f87171', activeBg: 'rgba(239,68,68,0.15)' },
                ].map(({ type, icon: Icon, label, activeColor, activeBg }) => {
                  const isActive = voteStatus?.user_vote === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={voting}
                      onClick={() => castVote(type)}
                      className="th-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      style={isActive ? { background: activeBg, borderColor: activeColor, color: activeColor } : {}}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  );
                })}
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
