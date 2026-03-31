import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';

export default function EmployerProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [accessCollegeId, setAccessCollegeId] = useState('');
  const [accessReason, setAccessReason] = useState('');
  const [form, setForm] = useState({
    company_name: '',
    company_type: 'startup',
    official_email: '',
    company_domain: '',
    website: '',
    linkedin_url: '',
    company_logo_url: '',
    company_size: '',
    registration_document_url: '',
  });

  const loadProfile = async () => {
    try {
      const [profileResponse, collegesResponse] = await Promise.all([
        api.get('/employers/profile').catch(() => ({ data: { profile: null } })),
        api.get('/employers/colleges').catch(() => ({ data: { colleges: [] } })),
      ]);

      const employerProfile = profileResponse.data.profile || null;
      setProfile(employerProfile);
      setColleges(collegesResponse.data.colleges || []);

      if (employerProfile) {
        setForm({
          company_name: employerProfile.company_name || '',
          company_type: employerProfile.company_type || 'startup',
          official_email: employerProfile.official_email || '',
          company_domain: employerProfile.company_domain || '',
          website: employerProfile.website || '',
          linkedin_url: employerProfile.linkedin_url || '',
          company_logo_url: employerProfile.company_logo_url || '',
          company_size: employerProfile.company_size || '',
          registration_document_url: employerProfile.registration_document_url || '',
        });
      }
    } catch (error) {
      toast.error(getApiError(error, 'Unable to load employer profile'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const approvedColleges = useMemo(
    () => colleges.filter((college) => college.access?.status === 'approved'),
    [colleges],
  );

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const { data } = await api.post('/employers/profile', form);
      setProfile((current) => ({ ...(current || {}), ...data.profile }));
      toast.success('Employer profile saved.');
    } catch (error) {
      toast.error(getApiError(error, 'Unable to save employer profile'));
    } finally {
      setSaving(false);
    }
  };

  const verifyDomain = async () => {
    try {
      await api.post('/employers/verify-domain');
      toast.success('Domain verification requested.');
      loadProfile();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to verify domain'));
    }
  };

  const requestCollegeAccess = async (event) => {
    event.preventDefault();
    if (!accessCollegeId) {
      toast.error('Choose a college first.');
      return;
    }

    try {
      await api.post('/employers/request-access', {
        college_id: accessCollegeId,
        reason: accessReason,
      });
      toast.success('College access request submitted.');
      setAccessReason('');
      setAccessCollegeId('');
      loadProfile();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to request college access'));
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen label="Loading employer profile…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Employer verification"
          title="Build a credible recruiter identity"
          description="TrustHire separates global employer verification from college-specific access so recruiters can hire publicly or through CDC-managed campus workflows."
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <form className="th-section space-y-5" onSubmit={saveProfile}>
          <div>
            <p className="th-label">Company profile</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Employer identity</h2>
          </div>

          <label className="block space-y-2">
            <span className="th-label">Company name</span>
            <input className="th-input" value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} required />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="th-label">Company type</span>
              <select className="th-input" value={form.company_type} onChange={(event) => setForm((current) => ({ ...current, company_type: event.target.value }))}>
                <option value="mnc">MNC</option>
                <option value="startup">Startup</option>
                <option value="agency">Agency</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="th-label">Company size</span>
              <input className="th-input" value={form.company_size} onChange={(event) => setForm((current) => ({ ...current, company_size: event.target.value }))} placeholder="500-1000 employees" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="th-label">Official email</span>
              <input className="th-input" type="email" value={form.official_email} onChange={(event) => setForm((current) => ({ ...current, official_email: event.target.value }))} required />
            </label>
            <label className="block space-y-2">
              <span className="th-label">Company domain</span>
              <input className="th-input" value={form.company_domain} onChange={(event) => setForm((current) => ({ ...current, company_domain: event.target.value }))} placeholder="acme.com" required />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="th-label">Website</span>
              <input className="th-input" value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://acme.com" />
            </label>
            <label className="block space-y-2">
              <span className="th-label">LinkedIn</span>
              <input className="th-input" value={form.linkedin_url} onChange={(event) => setForm((current) => ({ ...current, linkedin_url: event.target.value }))} placeholder="https://linkedin.com/company/..." />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="th-label">Logo URL</span>
              <input className="th-input" value={form.company_logo_url} onChange={(event) => setForm((current) => ({ ...current, company_logo_url: event.target.value }))} placeholder="https://..." />
            </label>
            <label className="block space-y-2">
              <span className="th-label">Registration document URL</span>
              <input className="th-input" value={form.registration_document_url} onChange={(event) => setForm((current) => ({ ...current, registration_document_url: event.target.value }))} placeholder="https://..." />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="th-btn-primary" disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Save employer profile'}
            </button>
            <button className="th-btn-secondary" type="button" onClick={verifyDomain}>
              Run domain verification
            </button>
          </div>
        </form>

        <section className="space-y-4">
          <div className="th-section">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="th-label">Trust status</p>
                <h2 className="mt-1 text-xl font-bold text-ink">Verification overview</h2>
              </div>
              {profile?.verification_status ? <StatusBadge status={profile.verification_status} /> : null}
            </div>

            {profile ? (
              <div className="mt-4 space-y-3">
                <div className="th-panel p-4">
                  <p className="th-label">Credibility score</p>
                  <p className="mt-2 text-4xl font-extrabold text-ink">{Math.round(profile.credibility_score || 0)}</p>
                </div>
                <div className="th-panel p-4">
                  <p className="th-label">Recent verification events</p>
                  <div className="mt-3 space-y-3">
                    {(profile.verifications || []).slice(0, 4).map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{item.verification_type}</p>
                          <p className="mt-1 text-sm text-ink-soft">{item.notes || 'No notes'}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    ))}
                    {(!profile.verifications || profile.verifications.length === 0) ? (
                      <p className="text-sm text-ink-soft">No verification records yet.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Profile not created yet"
                description="Save your employer profile first so TrustHire can start verification and college access workflows."
              />
            )}
          </div>

          <div className="th-section">
            <p className="th-label">Campus access requests</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Request a college pipeline</h2>
            <form className="mt-4 space-y-4" onSubmit={requestCollegeAccess}>
              <select className="th-input" value={accessCollegeId} onChange={(event) => setAccessCollegeId(event.target.value)}>
                <option value="">Select a college</option>
                {colleges.map((college) => (
                  <option key={college.id} value={college.id}>
                    {college.name} · {college.location}
                  </option>
                ))}
              </select>
              <textarea className="th-input min-h-24" value={accessReason} onChange={(event) => setAccessReason(event.target.value)} placeholder="Explain your hiring plan, target batch, or role type." />
              <button className="th-btn-primary" type="submit">
                Request access
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {approvedColleges.length > 0 ? (
                approvedColleges.map((college) => (
                  <div key={college.id} className="th-panel p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{college.name}</p>
                        <p className="mt-1 text-sm text-ink-soft">{college.location}</p>
                      </div>
                      <StatusBadge status={college.access?.status} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-soft">No approved college access yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
