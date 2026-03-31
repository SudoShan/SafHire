import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineChartBar, HiOutlineArrowTrendingUp } from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import api, { getApiError } from '../lib/api';
import { sentenceCase } from '../lib/utils';

function endpointForRole(role) {
  if (role === 'super_admin') return '/analytics/platform';
  if (role === 'cdc_admin') return '/analytics/cdc';
  return '/analytics/student';
}

function getCards(role, analytics) {
  if (role === 'super_admin') {
    return [
      { label: 'Colleges', value: analytics?.college_count || 0, tone: 'teal' },
      { label: 'Employers', value: analytics?.employer_count || 0, tone: 'rust' },
      { label: 'Total Jobs', value: analytics?.job_count || 0, tone: 'slate' },
      { label: 'Approved Appeals', value: analytics?.approved_appeals_count || 0, tone: 'rose' },
    ];
  }
  if (role === 'cdc_admin') {
    return [
      { label: 'Students', value: analytics?.student_count || 0, tone: 'teal' },
      { label: 'Approved Employers', value: analytics?.approved_employer_count || 0, tone: 'rust' },
      { label: 'Pending Requests', value: analytics?.pending_employer_requests || 0, tone: 'slate' },
      { label: 'Job Assignments', value: analytics?.job_assignments || 0, tone: 'rose' },
    ];
  }
  return [
    { label: 'Profile Completion', value: `${analytics?.profile_completion || 0}%`, tone: 'teal' },
    { label: 'Applications', value: analytics?.application_count || 0, tone: 'rust' },
    { label: 'Shortlisted', value: analytics?.shortlisted_count || 0, tone: 'slate' },
    { label: 'Saved Jobs', value: analytics?.saved_jobs_count || 0, tone: 'rose' },
  ];
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(endpointForRole(user.role));
        setAnalytics(data);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load analytics'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.role]);

  if (loading) return <AppShell><LoadingScreen label="Loading analytics…" /></AppShell>;

  const cards = getCards(user.role, analytics);
  const appsPerJob = analytics?.applications_per_job || {};

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Analytics"
          title={`${sentenceCase(user.role)} analytics`}
          description="Role-specific insights on outcomes, trust trends, and workflow performance."
        />
      </section>

      <div className="th-grid-autofit stagger">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} tone={card.tone} helper="" />
        ))}
      </div>

      {/* CDC: applications per job */}
      {user.role === 'cdc_admin' && (
        <div className="th-section space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)' }}
            >
              <HiOutlineChartBar className="h-5 w-5" style={{ color: '#818cf8' }} />
            </div>
            <div>
              <p className="th-label">Applications per job</p>
              <h2 className="text-lg font-bold text-ink">Campus job performance</h2>
            </div>
          </div>

          {Object.keys(appsPerJob).length === 0 ? (
            <EmptyState
              title="No application data yet"
              description="As students apply to campus jobs, per-role application counts will appear here."
            />
          ) : (
            <div className="space-y-3">
              {Object.entries(appsPerJob).map(([title, count]) => {
                const max = Math.max(...Object.values(appsPerJob));
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={title} className="th-panel p-4">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <p className="text-sm font-semibold text-ink truncate">{title}</p>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: '#818cf8' }}>
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                          transition: 'width 0.7s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Student: profile breakdown */}
      {user.role === 'student' && analytics && (
        <div className="th-section space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.1)' }}
            >
              <HiOutlineArrowTrendingUp className="h-5 w-5" style={{ color: '#34d399' }} />
            </div>
            <div>
              <p className="th-label">Profile strength</p>
              <h2 className="text-lg font-bold text-ink">Your placement readiness</h2>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Profile completion', value: analytics.profile_completion || 0, max: 100, color: '#10b981' },
              { label: 'Application success rate', value: analytics.shortlisted_count || 0, max: Math.max(analytics.application_count || 1, 1), color: '#6366f1', isRatio: true },
            ].map((item) => (
              <div key={item.label} className="th-panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="th-label">{item.label}</p>
                  <span className="text-sm font-bold" style={{ color: item.color }}>
                    {item.isRatio
                      ? `${item.value}/${item.max}`
                      : `${item.value}%`}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.isRatio ? (item.value / item.max) * 100 : item.value}%`,
                      background: `linear-gradient(90deg, ${item.color}, ${item.color}99)`,
                      transition: 'width 0.7s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Super admin: raw data */}
      {user.role === 'super_admin' && analytics && (
        <div className="th-section space-y-3">
          <p className="th-label">Platform data snapshot</p>
          <pre
            className="overflow-x-auto rounded-xl p-4 text-xs leading-6"
            style={{
              background: 'var(--bg-base)',
              color: '#94a3b8',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {JSON.stringify(analytics, null, 2)}
          </pre>
        </div>
      )}
    </AppShell>
  );
}
