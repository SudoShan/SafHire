import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  HiBars3,
  HiOutlineBell,
  HiOutlineBriefcase,
  HiOutlineBuildingLibrary,
  HiOutlineBuildingOffice2,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentCheck,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineShieldCheck,
  HiOutlineUserCircle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineAcademicCap,
  HiXMark,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { getRoleHome, roleLabels } from '../lib/utils';

function getNavigation(role) {
  const common = [
    { to: '/jobs', label: 'Jobs', icon: HiOutlineBriefcase },
    { to: '/notifications', label: 'Notifications', icon: HiOutlineBell },
  ];

  if (role === 'student' || role === 'alumni') {
    return [
      { to: '/student', label: 'Dashboard', icon: HiOutlineHome },
      { to: '/student/campus-drives', label: 'Campus Drives', icon: HiOutlineBuildingOffice2 },
      { to: '/student/profile', label: 'My Profile', icon: HiOutlineUserCircle },
      { to: '/student/invitations', label: 'Invitations', icon: HiOutlineAcademicCap },
      { to: '/student/applications', label: 'Applications', icon: HiOutlineDocumentText },
      { to: '/analytics', label: 'Analytics', icon: HiOutlineChartBar },
      ...common,
    ];
  }

  if (role === 'employer') {
    return [
      { to: '/employer', label: 'Dashboard', icon: HiOutlineHome },
      { to: '/employer/profile', label: 'Company Profile', icon: HiOutlineBuildingLibrary },
      { to: '/employer/post-job', label: 'Post Job', icon: HiOutlineClipboardDocumentCheck },
      { to: '/employer/jobs', label: 'My Jobs', icon: HiOutlineDocumentText },
      { to: '/appeals', label: 'Appeals', icon: HiOutlineShieldCheck },
      ...common,
    ];
  }

  if (role === 'cdc_admin') {
    return [
      { to: '/cdc', label: 'Dashboard', icon: HiOutlineHome },
      { to: '/cdc/workspace', label: 'Workspace', icon: HiOutlineBuildingLibrary },
      { to: '/analytics', label: 'Analytics', icon: HiOutlineChartBar },
      ...common,
    ];
  }

  if (role === 'super_admin') {
    return [
      { to: '/super-admin', label: 'Dashboard', icon: HiOutlineHome },
      { to: '/super-admin/colleges', label: 'College Setup', icon: HiOutlineBuildingLibrary },
      { to: '/analytics', label: 'Analytics', icon: HiOutlineChartBar },
      ...common,
    ];
  }

  return common;
}

const roleColors = {
  super_admin: { from: '#6366f1', to: '#4f46e5' },
  cdc_admin:   { from: '#0891b2', to: '#0e7490' },
  employer:    { from: '#f97316', to: '#ea580c' },
  student:     { from: '#10b981', to: '#059669' },
  alumni:      { from: '#8b5cf6', to: '#7c3aed' },
};

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = useMemo(() => getNavigation(user?.role), [user?.role]);
  const roleColor = roleColors[user?.role] || { from: '#6366f1', to: '#4f46e5' };

  const handleLogout = async () => {
    await logout({ silent: true });
    navigate('/login');
  };

  const Sidebar = () => (
    <aside
      className="flex h-full flex-col"
      style={{
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center justify-between p-5 pb-4">
        <Link to={getRoleHome(user?.role)} className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)' }}
          >
            <HiOutlineShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink leading-none">TrustHire</p>
            <p className="text-xs text-ink-soft leading-none mt-0.5">Placement Portal</p>
          </div>
        </Link>
        <button
          type="button"
          className="lg:hidden th-btn-ghost p-1.5"
          onClick={() => setMobileOpen(false)}
        >
          <HiXMark className="h-5 w-5" />
        </button>
      </div>

      {/* User card */}
      <div className="mx-4 mb-4">
        <div
          className="rounded-xl p-4"
          style={{
            background: `linear-gradient(135deg, ${roleColor.from}22 0%, ${roleColor.to}11 100%)`,
            border: `1px solid ${roleColor.from}33`,
          }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white mb-3"
            style={{ background: `linear-gradient(135deg, ${roleColor.from}, ${roleColor.to})` }}
          >
            {user?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <p className="text-sm font-semibold text-ink leading-tight truncate">{user?.full_name}</p>
          <p className="text-xs text-ink-soft mt-0.5">{roleLabels[user?.role] || 'User'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/student' || item.to === '/employer' || item.to === '/cdc' || item.to === '/super-admin'}
            className={({ isActive }) =>
              `th-nav-link ${isActive ? 'th-nav-link-active' : ''}`
            }
            onClick={() => setMobileOpen(false)}
          >
            <item.icon className="h-4.5 w-4.5 flex-shrink-0" style={{ width: '1.125rem', height: '1.125rem' }} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          type="button"
          className="th-btn-ghost w-full justify-start text-sm"
          style={{ color: 'var(--text-muted)' }}
          onClick={handleLogout}
        >
          <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="th-shell flex">
      {/* Desktop sidebar */}
      <div
        className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 lg:fixed lg:inset-y-0"
        style={{ zIndex: 40 }}
      >
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 w-72 lg:hidden flex flex-col"
            style={{ zIndex: 51 }}
          >
            <Sidebar />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-64 min-w-0">
        {/* Top bar */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6"
          style={{
            background: 'rgba(8,12,20,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            className="lg:hidden th-btn-ghost p-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <HiBars3 className="h-5 w-5" />
          </button>

          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-ink">TrustHire Workspace</p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Link
              to="/notifications"
              className="th-btn-ghost p-2 relative"
              aria-label="Notifications"
            >
              <HiOutlineBell className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 space-y-4 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
