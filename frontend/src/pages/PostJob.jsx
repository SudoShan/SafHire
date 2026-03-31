import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSparkles, HiOutlineInformationCircle } from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import PageHeader from '../components/PageHeader';
import api, { getApiError } from '../lib/api';

function splitCsv(value) {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

const FIELD = (label, key, props, form, setForm) => (
  <label key={key} className="block space-y-1.5">
    <span className="th-label">{label}</span>
    <input
      className="th-input"
      value={form[key]}
      onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))}
      {...props}
    />
  </label>
);

export default function PostJob() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    role: '',
    description: '',
    location: '',
    job_type: 'full_time',
    distribution_mode: 'off_campus_public',
    salary_min: '',
    salary_max: '',
    application_deadline: '',
    required_skills: '',
    attachment_urls: '',
    min_cgpa: '',
    max_backlogs: '',
    departments: '',
    graduation_years: '',
  });

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm((c) => ({ ...c, [key]: e.target.value })),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        role: form.role,
        description: form.description,
        location: form.location,
        job_type: form.job_type,
        distribution_mode: form.distribution_mode,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        application_deadline: form.application_deadline || null,
        required_skills: splitCsv(form.required_skills),
        attachment_urls: splitCsv(form.attachment_urls),
        eligibility_rules: {
          min_cgpa: form.min_cgpa ? Number(form.min_cgpa) : null,
          max_backlogs: form.max_backlogs ? Number(form.max_backlogs) : null,
          departments: splitCsv(form.departments),
          graduation_years: splitCsv(form.graduation_years).map(Number),
        },
      };
      const { data } = await api.post('/jobs', payload);
      toast.success(`Job created — status: ${data.job.status}`);
      navigate(`/jobs/${data.job.id}`);
    } catch (error) {
      toast.error(getApiError(error, 'Unable to create job'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Employer authoring"
          title="Create a trusted job posting"
          description="Every role is screened by AI before publication. Public jobs go to the platform-wide feed; campus drives move through CDC assignment."
        />
      </section>

      <form className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={handleSubmit}>
        {/* Left: core details */}
        <div className="th-section space-y-5">
          <div>
            <p className="th-label">Core role details</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Role information</h2>
          </div>

          <label className="block space-y-1.5">
            <span className="th-label">Job title</span>
            <input className="th-input" placeholder="e.g. Frontend Engineer" required {...f('title')} />
          </label>

          <label className="block space-y-1.5">
            <span className="th-label">Role / function</span>
            <input className="th-input" placeholder="e.g. Software Development" required {...f('role')} />
          </label>

          <label className="block space-y-1.5">
            <span className="th-label">Job description</span>
            <textarea
              className="th-input"
              style={{ minHeight: '10rem' }}
              placeholder="Describe responsibilities, requirements, and what makes this role unique…"
              required
              {...f('description')}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="th-label">Location</span>
              <input className="th-input" placeholder="Bengaluru / Remote" {...f('location')} />
            </label>
            <label className="block space-y-1.5">
              <span className="th-label">Job type</span>
              <select className="th-input" {...f('job_type')}>
                <option value="full_time">Full time</option>
                <option value="internship">Internship</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="th-label">Salary minimum (₹)</span>
              <input className="th-input" type="number" min="0" placeholder="300000" {...f('salary_min')} />
            </label>
            <label className="block space-y-1.5">
              <span className="th-label">Salary maximum (₹)</span>
              <input className="th-input" type="number" min="0" placeholder="800000" {...f('salary_max')} />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="th-label">Application deadline</span>
            <input className="th-input" type="date" {...f('application_deadline')} />
          </label>
        </div>

        {/* Right: distribution + eligibility */}
        <div className="space-y-4">
          <div className="th-section space-y-5">
            <div>
              <p className="th-label">Distribution & filters</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Visibility model</h2>
            </div>

            <label className="block space-y-1.5">
              <span className="th-label">Distribution mode</span>
              <select className="th-input" {...f('distribution_mode')}>
                <option value="off_campus_public">Off-campus public</option>
                <option value="campus_cdc">Campus CDC</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="th-label">Required skills</span>
              <input className="th-input" placeholder="React, Node.js, Supabase" {...f('required_skills')} />
              <p className="text-xs text-ink-soft mt-1">Comma-separated</p>
            </label>

            <label className="block space-y-1.5">
              <span className="th-label">Attachment URLs</span>
              <input className="th-input" placeholder="https://…" {...f('attachment_urls')} />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="th-label">Min CGPA</span>
                <input className="th-input" type="number" min="0" max="10" step="0.1" placeholder="6.5" {...f('min_cgpa')} />
              </label>
              <label className="block space-y-1.5">
                <span className="th-label">Max backlogs</span>
                <input className="th-input" type="number" min="0" placeholder="0" {...f('max_backlogs')} />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="th-label">Eligible departments</span>
              <input className="th-input" placeholder="CSE, IT, AI & DS" {...f('departments')} />
            </label>

            <label className="block space-y-1.5">
              <span className="th-label">Graduation years</span>
              <input className="th-input" placeholder="2025, 2026" {...f('graduation_years')} />
            </label>
          </div>

          {/* Info card */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.15)',
            }}
          >
            <div className="flex items-center gap-2">
              <HiOutlineSparkles className="h-4 w-4 flex-shrink-0" style={{ color: '#818cf8' }} />
              <p className="text-sm font-semibold text-ink">What happens next</p>
            </div>
            <ol className="space-y-2 text-xs leading-6 text-ink-soft list-none">
              <li className="flex gap-2">
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                >1</span>
                TrustHire screens the role with AI scam detection.
              </li>
              <li className="flex gap-2">
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                >2</span>
                Public jobs publish directly if risk is low and employer is verified.
              </li>
              <li className="flex gap-2">
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                >3</span>
                Campus jobs need approved college access and CDC assignment.
              </li>
            </ol>

            <button
              className="th-btn-primary w-full justify-center py-3 mt-2"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <>
                  <span
                    className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    style={{ animation: 'spin 0.7s linear infinite' }}
                  />
                  Publishing…
                </>
              ) : (
                <>
                  <HiOutlineSparkles className="h-4 w-4" />
                  Create job posting
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
