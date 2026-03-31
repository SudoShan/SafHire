import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBell, HiOutlineCheckCircle } from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data.items || []);
      } catch (error) {
        toast.error(getApiError(error, 'Unable to load notifications'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((cur) =>
        cur.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
    } catch (error) {
      toast.error(getApiError(error, 'Unable to update notification'));
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read_at);
    await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}/read`).catch(() => {})));
    setNotifications((cur) => cur.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    toast.success('All notifications marked as read.');
  };

  if (loading) return <AppShell><LoadingScreen label="Loading notifications…" /></AppShell>;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Notification center"
          title="Important updates"
          description="Job approvals, batch assignments, interview progress, appeals, and platform announcements."
          actions={
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: '#ef4444' }}
                >
                  {unreadCount}
                </span>
              )}
              {unreadCount > 0 && (
                <button className="th-btn-secondary text-sm" type="button" onClick={markAllRead}>
                  <HiOutlineCheckCircle className="h-4 w-4" />
                  Mark all read
                </button>
              )}
            </div>
          }
        />
      </section>

      <section className="th-section space-y-3">
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Notifications appear here when a workflow changes or your role receives a new update."
          />
        ) : (
          <div className="space-y-3 stagger">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className="rounded-xl p-4 transition-all"
                style={{
                  background: notification.read_at ? 'var(--bg-elevated)' : 'rgba(99,102,241,0.06)',
                  border: `1px solid ${notification.read_at ? 'var(--border-subtle)' : 'rgba(99,102,241,0.2)'}`,
                }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl mt-0.5"
                      style={{
                        background: notification.read_at ? 'var(--bg-card)' : 'rgba(99,102,241,0.15)',
                      }}
                    >
                      <HiOutlineBell
                        className="h-4 w-4"
                        style={{ color: notification.read_at ? 'var(--text-muted)' : '#818cf8' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <StatusBadge status={notification.type || 'update'} />
                        {!notification.read_at && (
                          <span
                            className="th-badge"
                            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-ink">{notification.title}</p>
                      <p className="mt-1 text-xs leading-5 text-ink-soft">{notification.message}</p>
                      <p className="mt-2 text-xs text-ink-soft opacity-60">{formatDate(notification.created_at)}</p>
                    </div>
                  </div>
                  {!notification.read_at && (
                    <button
                      className="th-btn-ghost text-xs flex-shrink-0"
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
