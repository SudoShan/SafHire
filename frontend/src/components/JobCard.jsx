import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineBriefcase,
  HiOutlineBuildingOffice2,
  HiOutlineMapPin,
  HiOutlineCurrencyRupee,
  HiOutlineCalendar,
} from 'react-icons/hi2';
import { formatCurrency, formatDate, sentenceCase } from '../lib/utils';
import StatusBadge from './StatusBadge';

export default function JobCard({ job, action, compact = false }) {
  const employerName = job.employer?.company_name || 'Employer';

  let salaryLabel = null;
  if (job.salary_min && job.salary_max) {
    salaryLabel = `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`;
  } else if (job.salary_min) {
    salaryLabel = `From ${formatCurrency(job.salary_min)}`;
  } else if (job.salary_max) {
    salaryLabel = `Up to ${formatCurrency(job.salary_max)}`;
  }

  const riskLevel = job.ai_review?.risk_level;
  const riskColor = riskLevel === 'low' ? '#10b981' : riskLevel === 'medium' ? '#f59e0b' : riskLevel === 'high' ? '#ef4444' : null;

  return (
    <article
      className="rounded-2xl p-5 transition-all duration-200 animate-fade-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-brand)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={job.status} />
            {riskLevel && (
              <span
                className="th-badge"
                style={{
                  background: `${riskColor}15`,
                  color: riskColor,
                  border: `1px solid ${riskColor}30`,
                }}
              >
                {riskLevel} risk
              </span>
            )}
            {job.distribution_mode === 'campus_cdc' && (
              <span
                className="th-badge"
                style={{
                  background: 'rgba(99,102,241,0.1)',
                  color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              >
                Campus Drive
              </span>
            )}
          </div>

          {/* Title */}
          <Link
            to={`/jobs/${job.id}`}
            className="block text-lg font-semibold text-ink hover:text-brand-400 transition-colors leading-tight"
          >
            {job.title}
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
            <span className="flex items-center gap-1">
              <HiOutlineBuildingOffice2 className="h-3.5 w-3.5 flex-shrink-0" />
              {employerName}
            </span>
            {job.role || job.job_type ? (
              <span className="flex items-center gap-1">
                <HiOutlineBriefcase className="h-3.5 w-3.5 flex-shrink-0" />
                {sentenceCase(job.role || job.job_type)}
              </span>
            ) : null}
            {job.location ? (
              <span className="flex items-center gap-1">
                <HiOutlineMapPin className="h-3.5 w-3.5 flex-shrink-0" />
                {job.location}
              </span>
            ) : null}
          </div>
        </div>

        {/* Salary + deadline */}
        <div className="flex-shrink-0 text-right space-y-1">
          {salaryLabel ? (
            <p className="flex items-center justify-end gap-1 text-sm font-semibold text-ink">
              <HiOutlineCurrencyRupee className="h-4 w-4 text-ink-soft" />
              {salaryLabel}
            </p>
          ) : (
            <p className="text-xs text-ink-soft">Salary not disclosed</p>
          )}
          {job.application_deadline ? (
            <p className="flex items-center justify-end gap-1 text-xs text-ink-soft">
              <HiOutlineCalendar className="h-3.5 w-3.5" />
              {formatDate(job.application_deadline)}
            </p>
          ) : null}
        </div>
      </div>

      {/* Description */}
      {!compact && job.description ? (
        <p className="mt-3 text-sm leading-6 text-ink-soft line-clamp-2">
          {job.description}
        </p>
      ) : null}

      {/* Skills */}
      {!compact && job.required_skills?.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.required_skills.slice(0, 5).map((skill) => (
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
          {job.required_skills.length > 5 && (
            <span className="th-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
              +{job.required_skills.length - 5} more
            </span>
          )}
        </div>
      ) : null}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {action}
        </div>
        <Link
          className="th-btn-secondary text-xs px-3 py-1.5"
          to={`/jobs/${job.id}`}
        >
          View details
          <HiOutlineArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
