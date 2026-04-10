import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBriefcase,
  HiOutlineBuildingOffice2,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';
import { sentenceCase } from '../lib/utils';

function JobTypeChip({ mode }) {
  if (mode === 'campus_cdc') {
    return (
      <span
        className="th-badge"
        style={{
          background: 'rgba(99,102,241,0.12)',
          color: '#818cf8',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        Campus Drive
      </span>
    );
  }
  return null;
}

export default function CampusDrives() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [batch, setBatch] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/students/campus-drives');
        setJobs(data.jobs || []);
        setBatch(data.batch || null);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load campus drives'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <AppShell><LoadingScreen label="Loading campus drives…" /></AppShell>;

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Campus recruitment"
          title="Your Campus Drives"
          description={
            batch
              ? `Job opportunities curated by your college CDC for ${batch.name} (${batch.department}).`
              : 'Job opportunities curated by your college CDC and assigned to your batch.'
          }
          actions={
            <Link className="th-btn-secondary" to="/jobs">
              <HiOutlineBriefcase className="h-4 w-4" />
              Browse All Jobs
            </Link>
          }
        />
      </section>

      {/* Batch info banner */}
      {batch && (
        <div
          className="th-section flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.06) 100%)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(99,102,241,0.15)' }}
          >
            <HiOutlineAcademicCap className="h-6 w-6" style={{ color: '#818cf8' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{batch.name}</p>
            <p className="text-xs text-ink-soft">
              {batch.department} · Class of {batch.graduation_year}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="th-badge"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              {jobs.length} Drives
            </span>
          </div>
        </div>
      )}

      {/* Job grid */}
      {jobs.length === 0 ? (
        <div className="th-section">
          <EmptyState
            icon={<HiOutlineSparkles className="h-8 w-8" style={{ color: '#818cf8' }} />}
            title="No campus drives yet"
            description="Your college CDC hasn't assigned any job drives to your batch yet. Check back soon or browse public jobs."
            action={
              <Link className="th-btn-primary" to="/jobs">
                <HiOutlineBriefcase className="h-4 w-4" />
                Browse All Jobs
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="th-section group"
              style={{ transition: 'border-color 0.2s ease, transform 0.2s ease' }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: Company & Job info */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Company logo placeholder */}
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, #6366f1, #06b6d4)`,
                    }}
                  >
                    {job.employer?.company_name?.[0]?.toUpperCase() || 'J'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-ink leading-snug">{job.title}</h3>
                      <JobTypeChip mode={job.distribution_mode} />
                      <StatusBadge status={job.status} />
                    </div>

                    <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#818cf8' }}>
                      <HiOutlineBuildingOffice2 className="h-4 w-4 flex-shrink-0" />
                      {job.employer?.company_name || 'Company'}
                    </p>

                    {job.description && (
                      <p className="mt-2 text-sm text-ink-soft line-clamp-2">{job.description}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3">
                      {job.job_type && (
                        <span className="flex items-center gap-1 text-xs text-ink-soft">
                          <HiOutlineBriefcase className="h-3.5 w-3.5" />
                          {sentenceCase(job.job_type)}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1 text-xs text-ink-soft">
                          <HiOutlineBuildingOffice2 className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                      )}
                      {job.application_deadline && (
                        <span className="flex items-center gap-1 text-xs text-ink-soft">
                          <HiOutlineCalendar className="h-3.5 w-3.5" />
                          Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-ink-soft">
                        <HiOutlineClock className="h-3.5 w-3.5" />
                        {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Skills */}
                    {job.required_skills?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.required_skills.slice(0, 6).map((skill) => (
                          <span
                            key={skill}
                            className="th-badge"
                            style={{
                              background: 'rgba(6,182,212,0.08)',
                              color: '#22d3ee',
                              border: '1px solid rgba(6,182,212,0.15)',
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                        {job.required_skills.length > 6 && (
                          <span className="th-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                            +{job.required_skills.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: CTA */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {job.salary_min && job.salary_max && (
                    <p className="text-sm font-bold text-ink">
                      ₹{(job.salary_min / 100000).toFixed(1)}L – ₹{(job.salary_max / 100000).toFixed(1)}L
                    </p>
                  )}
                  {job.salary_min && !job.salary_max && (
                    <p className="text-sm font-bold text-ink">₹{(job.salary_min / 100000).toFixed(1)}L+</p>
                  )}
                  <Link
                    to={`/jobs/${job.id}`}
                    className="th-btn-primary text-sm"
                  >
                    View Details
                    <HiOutlineArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Eligibility rules */}
              {job.eligibility_rules && Object.keys(job.eligibility_rules).some(k => job.eligibility_rules[k]) && (
                <div
                  className="mt-4 pt-4 flex flex-wrap gap-4 text-xs text-ink-soft"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <span className="flex items-center gap-1">
                    <HiOutlineUserGroup className="h-3.5 w-3.5" />
                    Eligibility:
                  </span>
                  {job.eligibility_rules?.min_cgpa && (
                    <span>Min CGPA: <strong className="text-ink">{job.eligibility_rules.min_cgpa}</strong></span>
                  )}
                  {job.eligibility_rules?.max_backlogs !== undefined && (
                    <span>Max Backlogs: <strong className="text-ink">{job.eligibility_rules.max_backlogs}</strong></span>
                  )}
                  {job.eligibility_rules?.departments?.length > 0 && (
                    <span>Depts: <strong className="text-ink">{job.eligibility_rules.departments.join(', ')}</strong></span>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
