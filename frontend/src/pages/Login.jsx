import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineShieldCheck, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../lib/api';
import { getRoleHome } from '../lib/utils';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      toast.success('Welcome back to TrustHire.');
      const redirectTo = location.state?.from?.pathname || getRoleHome(user.role);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(getApiError(error, 'Unable to sign in'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Navbar />

      <div className="th-container mt-8 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">

            {/* Left panel */}
            <div className="space-y-6 animate-fade-in">
              <div>
                <span className="th-kicker">Secure sign-in</span>
                <h1 className="mt-4 text-3xl font-bold text-ink md:text-4xl">
                  Pick up where your placement journey left off.
                </h1>
                <p className="mt-3 text-sm leading-7 text-ink-soft">
                  Sign in to access your role-aware workspace, trusted job feed,
                  and placement tools.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { role: 'Students & Alumni', desc: 'Complete profile, upload resume, get a smarter job feed.' },
                  { role: 'Employers', desc: 'Manage verification, post public or campus jobs, track applicants.' },
                  { role: 'CDC & Platform Admins', desc: 'Review access, assignments, and trust signals.' },
                ].map((item) => (
                  <div
                    key={item.role}
                    className="rounded-xl p-4"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <p className="text-sm font-semibold text-ink">{item.role}</p>
                    <p className="mt-1 text-xs text-ink-soft">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div
              className="rounded-2xl p-6 md:p-8 animate-slide-up"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Logo */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                >
                  <HiOutlineShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">TrustHire</p>
                  <p className="text-xs text-ink-soft">Sign in to your account</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block">
                    <span className="th-label block mb-1.5">Email address</span>
                    <input
                      className="th-input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                      placeholder="you@college.edu"
                      required
                      autoComplete="email"
                    />
                  </label>
                </div>

                <div>
                  <label className="block">
                    <span className="th-label block mb-1.5">Password</span>
                    <div className="relative">
                      <input
                        className="th-input pr-10"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPassword
                          ? <HiOutlineEyeSlash className="h-4 w-4" />
                          : <HiOutlineEye className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </label>
                </div>

                <button
                  className="th-btn-primary w-full justify-center py-3 text-sm"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? (
                    <>
                      <span
                        className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        style={{ animation: 'spin 0.7s linear infinite' }}
                      />
                      Signing in…
                    </>
                  ) : 'Sign in to TrustHire'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-ink-soft">
                New to TrustHire?{' '}
                <Link
                  className="font-semibold"
                  style={{ color: '#818cf8' }}
                  to="/register"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
