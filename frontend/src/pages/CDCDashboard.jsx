import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { HiOutlineArrowRight, HiOutlineUserGroup } from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';

export default function CDCDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, reqRes, stuRes] = await Promise.all([
          api.get('/cdc/dashboard'),
          api.get('/cdc/employer-requests').catch(() => ({ data: { requests: [] } })),
          api.get('/cdc/students').catch(() => ({ data: { students: [] } })),
        ]);
        setDashboard(dashRes.data);
        setRequests(reqRes.data.requests || []);
        setStudents(stuRes.data.students || []);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load CDC dashboard'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <AppShell><LoadingScreen label="Loading CDC dashboard…" /></AppShell>;

  const pendingRequests = requests.filter((r) => r.status === 'requested').length;

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="College control desk"
          title={dashboard?.college?.name || 'CDC Workspace'}
          description="Monitor student activity, review employer access requests, and route campus drives to the right batch or group."
          actions={
            <>
              <Link className="th-btn-secondary" to="/analytics">Analytics</Link>
              <Link className="th-btn-primary" to="/cdc/workspace">
                Open Workspace
                <HiOutlineArrowRight className="h-4 w-4" />
              </Link>
            </>
          }
        />
      </section>

      <div className="th-grid-autofit stagger">
        <StatCard label="Students" value={dashboard?.stats?.students || 0} helper="Profiles linked to this college" tone="teal" />
        <StatCard label="Employer Requests" value={dashboard?.stats?.employer_requests || 0} helper="Awaiting CDC decision" tone="rust" />
        <StatCard label="Job Assignments" value={dashboard?.stats?.job_assignments || 0} helper="Campus drives routed" tone="slate" />
        <StatCard label="Pending Review" value={pendingRequests} helper="Unreviewed access requests" tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Employer requests */}
        <div className="th-section space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="th-label">Employer access queue</p>
              <h2 className="text-lg font-bold text-ink">Who wants to hire from your campus</h2>
            </div>
            <Link className="th-btn-secondary text-xs" to="/cdc/workspace">
              Review all
            </Link>
          </div>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <EmptyState
                title="No employer requests"
                description="When employers request to hire through this college, they'll appear here."
              />
            ) : (
              requests.slice(0, 4).map((req) => (
                <div key={req.id} className="th-panel flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {req.employer?.company_name || 'Employer'}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft line-clamp-1">
                      {req.reason || 'No reason submitted.'}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Students */}
        <div className="th-section space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)' }}
            >
              <HiOutlineUserGroup className="h-5 w-5" style={{ color: '#818cf8' }} />
            </div>
            <div>
              <p className="th-label">Student visibility</p>
              <h2 className="text-lg font-bold text-ink">Recent student records</h2>
            </div>
          </div>

          <div className="space-y-3">
            {students.length === 0 ? (
              <EmptyState
                title="No students found"
                description="Students appear here once they complete their batch-linked profiles."
              />
            ) : (
              students.slice(0, 5).map((student) => (
                <div key={student.id} className="th-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        {student.user?.full_name}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {student.department} · {student.batch?.name} · CGPA {student.cgpa ?? 0}
                      </p>
                    </div>
                    <StatusBadge status={student.is_alumni ? 'alumni' : 'student'} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
