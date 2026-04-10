import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import api, { getApiError } from '../lib/api';

function csvToArray(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function StudentProfile() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [profile, setProfile] = useState(null);
  const [resumeInsights, setResumeInsights] = useState(null);
  const [form, setForm] = useState({
    batch_id: '',
    enrollment_number: '',
    cgpa: '',
    active_backlogs: '',
    history_backlogs: '',
    skills: '',
    preferred_role: '',
    linkedin_url: '',
    github_url: '',
  });

  useEffect(() => {
    async function loadProfileSetup() {
      try {
        const [collegeResponse, profileResponse] = await Promise.all([
          api.get('/students/colleges'),
          api.get('/students/profile').catch(() => ({ data: { profile: null } })),
        ]);

        const currentProfile = profileResponse.data.profile || null;
        setColleges(collegeResponse.data.colleges || []);
        setProfile(currentProfile);

        if (currentProfile) {
          setForm({
            batch_id: currentProfile.batch_id || '',
            enrollment_number: currentProfile.enrollment_number || '',
            cgpa: currentProfile.cgpa ?? '',
            active_backlogs: currentProfile.active_backlogs ?? '',
            history_backlogs: currentProfile.history_backlogs ?? '',
            skills: (currentProfile.skills || []).join(', '),
            preferred_role: currentProfile.preferred_role || '',
            linkedin_url: currentProfile.linkedin_url || '',
            github_url: currentProfile.github_url || '',
          });
        } else if (location.state?.prefill) {
          // Prefill from invitation
          setForm((current) => ({
            ...current,
            batch_id: location.state.prefill.batch_id || '',
          }));
        }
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load student profile'));
      } finally {
        setLoading(false);
      }
    }

    loadProfileSetup();
  }, []);

  const batches = useMemo(
    () => colleges.flatMap((college) => (college.batches || []).map((batch) => ({ ...batch, college_name: college.name }))),
    [colleges],
  );

  const selectedBatch = batches.find((batch) => batch.id === form.batch_id);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!selectedBatch) {
      toast.error('Please select a batch.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        batch_id: selectedBatch.id,
        department: selectedBatch.department,
        graduation_year: selectedBatch.graduation_year,
        enrollment_number: form.enrollment_number,
        cgpa: Number(form.cgpa || 0),
        active_backlogs: Number(form.active_backlogs || 0),
        history_backlogs: Number(form.history_backlogs || 0),
        skills: csvToArray(form.skills),
        preferred_role: form.preferred_role,
        linkedin_url: form.linkedin_url,
        github_url: form.github_url,
      };

      const { data } = await api.post('/students/profile', payload);
      setProfile(data.profile);
      toast.success('Student profile saved.');
    } catch (error) {
      toast.error(getApiError(error, 'Unable to save profile'));
    } finally {
      setSaving(false);
    }
  };

  const uploadResume = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const { data } = await api.post('/students/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfile(data.profile);
      setResumeInsights(data.extracted_data);
      setForm((current) => ({
        ...current,
        skills: [...new Set([...(csvToArray(current.skills)), ...((data.profile.skills || []))])].join(', '),
        linkedin_url: data.profile.linkedin_url || current.linkedin_url,
        preferred_role: data.profile.preferred_role || current.preferred_role,
        department: data.profile.department || current.department,
      }));
      toast.success('Resume uploaded and parsed.');
      await refreshUser();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to upload resume'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen label="Loading your profile setup…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Student profile"
          title="Build a stronger job-matching profile"
          description="Batch-linked data controls campus eligibility, while skills and resume parsing improve public and campus recommendations."
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <form className="th-section space-y-5" onSubmit={saveProfile}>
          <div>
            <p className="th-label">Academic profile</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Student information</h2>
          </div>

          <label className="block space-y-2">
            <span className="th-label">Batch</span>
            <select className="th-input" value={form.batch_id} onChange={(event) => setForm((current) => ({ ...current, batch_id: event.target.value }))}>
              <option value="">Select a batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.college_name} · {batch.name} · {batch.department}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="th-label">Enrollment number</span>
              <input className="th-input" value={form.enrollment_number} onChange={(event) => setForm((current) => ({ ...current, enrollment_number: event.target.value }))} required />
            </label>
            <label className="block space-y-2">
              <span className="th-label">Preferred role</span>
              <input className="th-input" value={form.preferred_role} onChange={(event) => setForm((current) => ({ ...current, preferred_role: event.target.value }))} placeholder="Frontend Developer" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-2">
              <span className="th-label">CGPA</span>
              <input className="th-input" max="10" min="0" step="0.1" type="number" value={form.cgpa} onChange={(event) => setForm((current) => ({ ...current, cgpa: event.target.value }))} />
            </label>
            <label className="block space-y-2">
              <span className="th-label">Active backlogs</span>
              <input className="th-input" min="0" type="number" value={form.active_backlogs} onChange={(event) => setForm((current) => ({ ...current, active_backlogs: event.target.value }))} />
            </label>
            <label className="block space-y-2">
              <span className="th-label">History backlogs</span>
              <input className="th-input" min="0" type="number" value={form.history_backlogs} onChange={(event) => setForm((current) => ({ ...current, history_backlogs: event.target.value }))} />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="th-label">Skills</span>
            <input className="th-input" value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} placeholder="React, Node.js, Tailwind CSS" />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="th-label">LinkedIn URL</span>
              <input className="th-input" value={form.linkedin_url} onChange={(event) => setForm((current) => ({ ...current, linkedin_url: event.target.value }))} placeholder="https://linkedin.com/in/..." />
            </label>
            <label className="block space-y-2">
              <span className="th-label">GitHub URL</span>
              <input className="th-input" value={form.github_url} onChange={(event) => setForm((current) => ({ ...current, github_url: event.target.value }))} placeholder="https://github.com/..." />
            </label>
          </div>

          <button className="th-btn-primary" disabled={saving} type="submit">
            {saving ? 'Saving…' : 'Save student profile'}
          </button>
        </form>

        <section className="space-y-4">
          <div className="th-section">
            <p className="th-label">Resume intelligence</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Upload and extract skills</h2>
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              Resume upload stores your file in Supabase Storage and enriches your profile with parsed skills.
            </p>

            <label className="th-btn-secondary mt-6 cursor-pointer">
              {uploading ? 'Uploading…' : 'Upload resume'}
              <input className="hidden" type="file" accept=".pdf,.doc,.docx" onChange={uploadResume} />
            </label>

            {profile?.resume_url ? (
              <a className="th-btn-ghost mt-4 inline-flex" href={profile.resume_url} rel="noreferrer" target="_blank">
                Open current resume
              </a>
            ) : null}
          </div>

          <div className="th-section">
            <p className="th-label">AI extraction summary</p>
            <div className="mt-4 space-y-3 text-sm text-ink-soft">
              <p>Name: {resumeInsights?.name || user?.full_name || 'Not extracted yet'}</p>
              <p>Email: {resumeInsights?.email || user?.email || 'Not extracted yet'}</p>
              <p>Department: {resumeInsights?.department || profile?.department || 'Not extracted yet'}</p>
              <p>Batch year: {resumeInsights?.batch_year || profile?.graduation_year || 'Not extracted yet'}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(resumeInsights?.skills || profile?.parsed_resume_skills || []).map((skill) => (
                <span key={skill} className="th-badge bg-accent-soft text-orange-900">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
