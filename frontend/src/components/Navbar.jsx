import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineShieldCheck,
  HiBars3,
  HiXMark,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { getRoleHome, roleLabels } from '../lib/utils';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout({ silent: true });
    navigate('/login');
  };

  return (
    <header className="th-container pt-4 md:pt-5">
      <nav
        className="flex items-center justify-between gap-4 rounded-2xl px-5 py-3"
        style={{
          background: 'rgba(20,30,51,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(148,163,184,0.1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)' }}
          >
            <HiOutlineShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-ink leading-none">TrustHire</p>
            <p className="text-xs text-ink-soft leading-none mt-0.5">Verified campus hiring</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link className="th-btn-ghost text-sm" to="/jobs">
            Explore Jobs
          </Link>
          {user ? (
            <>
              <Link className="th-btn-secondary text-sm" to={getRoleHome(user.role)}>
                {roleLabels[user.role] || 'Workspace'}
              </Link>
              <button type="button" className="th-btn-primary text-sm" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link className="th-btn-ghost text-sm" to="/login">
                Sign In
              </Link>
              <Link className="th-btn-primary text-sm" to="/register">
                Get Started
                <HiOutlineArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden th-btn-ghost p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <HiXMark className="h-5 w-5" /> : <HiBars3 className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="mt-2 rounded-2xl p-4 space-y-2 animate-fade-in"
          style={{
            background: 'rgba(20,30,51,0.95)',
            border: '1px solid rgba(148,163,184,0.1)',
          }}
        >
          <Link className="th-btn-ghost w-full justify-start" to="/jobs" onClick={() => setMobileOpen(false)}>
            Explore Jobs
          </Link>
          {user ? (
            <>
              <Link
                className="th-btn-secondary w-full justify-start"
                to={getRoleHome(user.role)}
                onClick={() => setMobileOpen(false)}
              >
                {roleLabels[user.role] || 'Workspace'}
              </Link>
              <button type="button" className="th-btn-primary w-full justify-center" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link className="th-btn-ghost w-full justify-start" to="/login" onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
              <Link className="th-btn-primary w-full justify-center" to="/register" onClick={() => setMobileOpen(false)}>
                Get Started
                <HiOutlineArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
