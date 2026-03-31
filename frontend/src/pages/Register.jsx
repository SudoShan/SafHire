import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineShieldCheck, HiOutlineEye, HiOutlineEyeSlash, HiOutlineCheckCircle } from 'react-icons/hi2';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../lib/api';

const roles = [
  {
    value: 'student',
    label: 'Student',
    description: 'Join your college, complete your profile, and access trusted placement jobs.',
    color: '#10b981',
  },
  {
    value: 'alumni',
    label: 'Alumni',
    description: 'Use the student flow with alumni status for broader off-campus participation.',
    color: '#8b5cf6',
  },
  {
    value: 'employer',
    label: 'Employer',
    description: 'Create a recruiter account, verify your company, and start posting jobs.',
    color: '#f97316',
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
  });

  const selectedRole = roles.find((r) => r.value === form.role);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      toast.success('Account created. You can sign in now.');
      navigate('/login');
    } catch (error) {
      toast.error(getApiError(error, 'Unable to create account'));
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
                <span className="th-kicker">Public onboarding</span>
                <h1 className="mt-4 text-3xl font-bold text-ink md:text-4xl">
                  Join TrustHire's verified placement network.
                </h1>
                <p className="mt-3 text-sm leading-7 text-ink-soft">
                  Public signup is limited to students, alumni, and employers.
                  CDC admins and super admins are provisioned through protected workflows only.
                </p>
              </div>

              <div className="space-y-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    className="w-full text-left rounded-xl p-4 transition-all"
                    style={{
                      background: form.role === role.value ? `${role.color}12` : 'var(--bg-card)',
                      border: `1px solid ${form.role === role.value ? role.color + '44' : 'var(--border-subtle)'}`,
                    }}
                    onClick={() => setForm((c) => ({ ...c, role: role.value }))}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{role.label}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">{role.description}</p>
                      </div>
                      {form.role === role.value && (
                        <HiOutlineCheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: role.color }} />
                      )}
                    </div>
                  </button>
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
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                >
                  <HiOutlineShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">TrustHire</p>
                  <p className="text-xs text-ink-soft">Create your account</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block">
                    <span className="th-label block mb-1.5">Full name</span>
                    <input
                      className="th-input"
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm((c) => ({ ...c, full_name: e.target.value }))}
                      placeholder="Your full name"
                      required
                      autoComplete="name"
                    />
                  </label>
                </div>

                <div>
                  <label className="block">
                    <span className="th-label block mb-1.5">Email address</span>
                    <input
                      className="th-input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                      placeholder="you@example.com"
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
                        placeholder="Create a secure password"
                        required
                        autoComplete="new-password"
                        minLength={8}
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

                <div>
                  <span className="th-label block mb-1.5">Account type</span>
                  <div className="grid grid-cols-3 gap-2">
                    {roles.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        className="rounded-lg py-2 px-3 text-xs font-semibold transition-all"
                        style={{
                          background: form.role === role.value ? `${role.color}22` : 'var(--bg-elevated)',
                          color: form.role === role.value ? role.color : 'var(--text-secondary)',
                          border: `1px solid ${form.role === role.value ? role.color + '44' : 'var(--border-subtle)'}`,
                        }}
                        onClick={() => setForm((c) => ({ ...c, role: role.value }))}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="th-btn-primary w-full justify-center py-3 text-sm mt-2"
                  disabled={submitting}
                  type="submit"
                  style={{
                    background: selectedRole
                      ? `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}cc)`
                      : undefined,
                  }}
                >
                  {submitting ? (
                    <>
                      <span
                        className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        style={{ animation: 'spin 0.7s linear infinite' }}
                      />
                      Creating account…
                    </>
                  ) : `Create ${selectedRole?.label || ''} Account`}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-ink-soft">
                Already have access?{' '}
                <Link
                  className="font-semibold"
                  style={{ color: '#818cf8' }}
                  to="/login"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
