import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSparkles, HiOutlineInformationCircle, HiOutlineBuildingOffice2, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
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
    target_college_ids: [],
    require_resume: false,
  });

  const [timeline, setTimeline] = useState(['Application']);
  const [colleges, setColleges] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(false);

  useEffect(() => {
    async function fetchColleges() {
      setLoadingColleges(true);
      try {
        const response = await api.get('/employers/colleges');
        console.debug('[PostJob] College Access Data:', response.data);

        // Handle both possible structures: { colleges: [] } or just []
        const rawList = Array.isArray(response.data) ? response.data : (response.data.colleges || []);

        // Filter for colleges where the employer has an 'approved' access record
        const approved = rawList.filter(item => item.access?.status === 'approved');

        setColleges(approved);
      } catch (error) {
        console.error('Failed to fetch colleges', error);
      } finally {
        setLoadingColleges(false);
      }
    }
    fetchColleges();
  }, []);

  const toggleCollege = (id) => {
    setForm(prev => {
      const ids = prev.target_college_ids.includes(id)
        ? prev.target_college_ids.filter(i => i !== id)
        : [...prev.target_college_ids, id];
      return { ...prev, target_college_ids: ids };
    });
  };

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
        target_college_ids: form.distribution_mode === 'campus_cdc' ? form.target_college_ids : [],
        requireResume: form.require_resume,
        timeline: timeline,
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

          <label className="flex items-center gap-3 p-3 rounded-lg border border-ink-faint">
            <input
              type="checkbox"
              className="th-checkbox"
              checked={form.require_resume}
              onChange={(e) => setForm({ ...form, require_resume: e.target.checked })}
            />
            <span className="font-semibold text-ink text-sm">Require Resume Upload</span>
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

            {form.distribution_mode === 'campus_cdc' && (
              <div className="space-y-3 p-4 rounded-xl border border-ink-faint bg-ink-faint/5">
                <p className="th-label flex items-center gap-2">
                  <HiOutlineBuildingOffice2 className="h-4 w-4" />
                  Target Colleges
                </p>
                {loadingColleges ? (
                  <p className="text-xs text-ink-soft animate-pulse">Loading approved colleges...</p>
                ) : colleges.length === 0 ? (
                  <div className="space-y-3 p-2 text-center border border-dashed border-red-200 rounded-xl bg-red-50/50">
                    <p className="text-xs text-red-500 font-medium">No approved college access found.</p>
                    <p className="text-[10px] text-ink-soft px-2">
                      You need to request access first so CDCs can assign your job to students.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/employer/profile')}
                      className="th-btn-ghost text-[10px] py-1 px-3 text-red-600 hover:bg-red-50"
                    >
                      Request access in profile
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {colleges.map(college => (
                      <label key={college.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-faint cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="th-checkbox"
                          checked={form.target_college_ids.includes(college.id)}
                          onChange={() => toggleCollege(college.id)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{college.name}</p>
                          <p className="text-[10px] text-ink-soft truncate">{college.location || college.code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {form.target_college_ids.length > 0 && (
                  <p className="text-xs text-indigo-500 font-medium">
                    Selected {form.target_college_ids.length} campus{form.target_college_ids.length > 1 ? 'es' : ''}
                  </p>
                )}
              </div>
            )}

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

            <div className="space-y-2 pt-4 border-t border-ink-faint">
              <p className="th-label">Job Timeline Phases</p>
              <div className="space-y-2">
                {timeline.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink-soft w-4">{idx + 1}.</span>
                    <input
                      className="th-input flex-1 py-1 px-2 text-sm"
                      value={step}
                      onChange={(e) => {
                        const newT = [...timeline];
                        newT[idx] = e.target.value;
                        setTimeline(newT);
                      }}
                      placeholder="e.g. Assessment Phase"
                      required
                    />
                    {timeline.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTimeline(timeline.filter((_, i) => i !== idx))}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="th-btn-secondary text-xs w-full py-1.5"
                onClick={() => setTimeline([...timeline, 'New Phase'])}
              >
                <HiOutlinePlus className="w-3.5 h-3.5" />
                Add Phase
              </button>
            </div>
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
