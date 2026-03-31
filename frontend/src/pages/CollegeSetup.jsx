import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';

const initialCollege = {
  code: '',
  name: '',
  slug: '',
  domain: '',
  location: '',
};

const initialCdc = {
  college_id: '',
  full_name: '',
  email: '',
  password: '',
  designation: '',
};

export default function CollegeSetup() {
  const [loading, setLoading] = useState(true);
  const [colleges, setColleges] = useState([]);
  const [collegeForm, setCollegeForm] = useState(initialCollege);
  const [cdcForm, setCdcForm] = useState(initialCdc);

  const loadColleges = async () => {
    try {
      const { data } = await api.get('/super-admin/colleges');
      setColleges(data.colleges || []);
    } catch (error) {
      toast.error(getApiError(error, 'Unable to load colleges'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColleges();
  }, []);

  const createCollege = async (event) => {
    event.preventDefault();
    try {
      await api.post('/super-admin/colleges', collegeForm);
      toast.success('College created.');
      setCollegeForm(initialCollege);
      loadColleges();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to create college'));
    }
  };

  const updateCollegeStatus = async (collegeId, status) => {
    try {
      await api.patch(`/super-admin/colleges/${collegeId}/status`, { status });
      toast.success(`College marked ${status}.`);
      loadColleges();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to update college status'));
    }
  };

  const provisionCdc = async (event) => {
    event.preventDefault();
    try {
      await api.post('/super-admin/cdc-admins', cdcForm);
      toast.success('CDC admin provisioned.');
      setCdcForm(initialCdc);
      loadColleges();
    } catch (error) {
      toast.error(getApiError(error, 'Unable to provision CDC admin'));
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen label="Loading college setup…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="College setup"
          title="Approve colleges and provision CDC leads"
          description="Each college becomes its own controlled data silo with dedicated CDC ownership."
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          <form className="th-section space-y-4" onSubmit={createCollege}>
            <div>
              <p className="th-label">New college</p>
              <h2 className="mt-2 text-3xl text-ink">Create college record</h2>
            </div>
            <input className="th-input" placeholder="Code" value={collegeForm.code} onChange={(event) => setCollegeForm((current) => ({ ...current, code: event.target.value }))} required />
            <input className="th-input" placeholder="College name" value={collegeForm.name} onChange={(event) => setCollegeForm((current) => ({ ...current, name: event.target.value }))} required />
            <input className="th-input" placeholder="Slug" value={collegeForm.slug} onChange={(event) => setCollegeForm((current) => ({ ...current, slug: event.target.value }))} required />
            <input className="th-input" placeholder="Domain" value={collegeForm.domain} onChange={(event) => setCollegeForm((current) => ({ ...current, domain: event.target.value }))} />
            <input className="th-input" placeholder="Location" value={collegeForm.location} onChange={(event) => setCollegeForm((current) => ({ ...current, location: event.target.value }))} />
            <button className="th-btn-primary" type="submit">
              Create college
            </button>
          </form>

          <form className="th-section space-y-4" onSubmit={provisionCdc}>
            <div>
              <p className="th-label">CDC provisioning</p>
              <h2 className="mt-2 text-3xl text-ink">Assign a college admin</h2>
            </div>
            <select className="th-input" value={cdcForm.college_id} onChange={(event) => setCdcForm((current) => ({ ...current, college_id: event.target.value }))} required>
              <option value="">Select a college</option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </select>
            <input className="th-input" placeholder="Full name" value={cdcForm.full_name} onChange={(event) => setCdcForm((current) => ({ ...current, full_name: event.target.value }))} required />
            <input className="th-input" placeholder="Email" type="email" value={cdcForm.email} onChange={(event) => setCdcForm((current) => ({ ...current, email: event.target.value }))} required />
            <input className="th-input" placeholder="Temporary password" type="password" value={cdcForm.password} onChange={(event) => setCdcForm((current) => ({ ...current, password: event.target.value }))} required />
            <input className="th-input" placeholder="Designation" value={cdcForm.designation} onChange={(event) => setCdcForm((current) => ({ ...current, designation: event.target.value }))} />
            <button className="th-btn-primary" type="submit">
              Provision CDC admin
            </button>
          </form>
        </section>

        <section className="th-section">
          <p className="th-label">Network colleges</p>
          <h2 className="mt-2 text-3xl text-ink">Existing college silos</h2>
          <div className="mt-5 space-y-3">
            {colleges.length === 0 ? (
              <EmptyState
                title="No colleges added yet"
                description="Create your first college record to start the multi-college placement network."
              />
            ) : (
              colleges.map((college) => (
                <article key={college.id} className="th-panel p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-ink">{college.name}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {college.code} · {college.location || 'Location pending'}
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        CDC admins assigned: {college.cdc_admins?.length || 0}
                      </p>
                    </div>
                    <StatusBadge status={college.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button className="th-btn-secondary" type="button" onClick={() => updateCollegeStatus(college.id, 'approved')}>
                      Approve
                    </button>
                    <button className="th-btn-secondary" type="button" onClick={() => updateCollegeStatus(college.id, 'inactive')}>
                      Mark inactive
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
