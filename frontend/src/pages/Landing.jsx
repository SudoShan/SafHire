import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineBuildingLibrary,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChartBarSquare,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineCheckBadge,
} from 'react-icons/hi2';
import Navbar from '../components/Navbar';

const features = [
  {
    icon: HiOutlineShieldCheck,
    title: 'AI Scam Detection',
    description: 'Every job posting is screened by a hybrid ML + rule-based engine before it reaches students.',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  {
    icon: HiOutlineBuildingLibrary,
    title: 'CDC-Controlled Visibility',
    description: 'College placement teams approve employers, assign jobs to batches, and keep campus data isolated.',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.1)',
  },
  {
    icon: HiOutlineSparkles,
    title: 'Smart Job Matching',
    description: 'Students get a personalized feed with AI fit scores, prep roadmaps, and skill gap analysis.',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.1)',
  },
  {
    icon: HiOutlineChatBubbleLeftRight,
    title: 'Community Discussions',
    description: 'Per-job discussion threads with AI summaries, interview tips, and experience sharing.',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
  },
  {
    icon: HiOutlineChartBarSquare,
    title: 'Role-Aware Analytics',
    description: 'Students track progress, CDC teams monitor batch performance, admins watch fraud trends.',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
  },
  {
    icon: HiOutlineCheckBadge,
    title: 'Employer Verification',
    description: 'MNCs verify via domain DNS. Startups submit LinkedIn, website, and registration documents.',
    color: '#fb7185',
    bg: 'rgba(251,113,133,0.1)',
  },
];

const stats = [
  { value: '5', label: 'User Roles', sub: 'Student to Super Admin' },
  { value: '2', label: 'Hiring Flows', sub: 'Public + Campus CDC' },
  { value: '100%', label: 'RLS Isolated', sub: 'Per-college data silos' },
  { value: 'AI', label: 'Scam Detection', sub: 'Hybrid ML engine' },
];

const roles = [
  { role: 'Student', desc: 'Smart feed, resume parsing, eligibility checks, prep tools', color: '#10b981' },
  { role: 'Employer', desc: 'Verify company, post jobs, manage campus access requests', color: '#f97316' },
  { role: 'CDC Admin', desc: 'Approve employers, create batches, assign campus drives', color: '#6366f1' },
  { role: 'Super Admin', desc: 'Govern colleges, block bad actors, monitor fraud patterns', color: '#06b6d4' },
];

export default function Landing() {
  return (
    <div
      className="min-h-screen pb-16"
      style={{ background: 'var(--bg-base)' }}
    >
      <Navbar />

      {/* Hero */}
      <section className="th-container pt-12 md:pt-20">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <span className="th-kicker mb-6 inline-flex">
            <HiOutlineShieldCheck className="h-3.5 w-3.5" />
            Multi-college placement portal
          </span>

          <h1
            className="text-4xl font-extrabold tracking-tight leading-tight md:text-6xl lg:text-7xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Campus hiring that{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              actually works.
            </span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-ink-soft max-w-2xl mx-auto">
            TrustHire combines verified employer workflows, CDC-controlled job visibility,
            and AI scam detection into one production-grade placement platform.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link className="th-btn-primary px-6 py-3 text-base" to="/register">
              Get Started Free
              <HiOutlineArrowRight className="h-4 w-4" />
            </Link>
            <Link className="th-btn-secondary px-6 py-3 text-base" to="/jobs">
              <HiOutlineBriefcase className="h-4 w-4" />
              Browse Jobs
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 animate-slide-up">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-5 text-center"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              <p
                className="text-3xl font-extrabold"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{stat.label}</p>
              <p className="text-xs text-ink-soft mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="th-container mt-20">
        <div className="text-center mb-12">
          <span className="th-kicker">Platform capabilities</span>
          <h2 className="mt-4 text-3xl font-bold text-ink md:text-4xl">
            Everything a placement ecosystem needs
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <article
              key={feature.title}
              className="rounded-2xl p-6 animate-fade-in"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                animationDelay: `${i * 60}ms`,
                transition: 'border-color 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = feature.color + '44';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl mb-4"
                style={{ background: feature.bg }}
              >
                <feature.icon className="h-5 w-5" style={{ color: feature.color }} />
              </div>
              <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Roles section */}
      <section className="th-container mt-20">
        <div
          className="rounded-3xl p-8 md:p-12"
          style={{
            background: 'linear-gradient(145deg, var(--bg-card) 0%, rgba(99,102,241,0.05) 100%)',
            border: '1px solid var(--border-brand)',
          }}
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="th-kicker">Role-aware platform</span>
              <h2 className="mt-4 text-3xl font-bold text-ink md:text-4xl">
                One platform, five distinct experiences
              </h2>
              <p className="mt-4 text-sm leading-7 text-ink-soft">
                Every role gets a tailored workspace with the right tools, the right data,
                and the right access controls — all enforced at the database level with Supabase RLS.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="th-btn-primary" to="/register">
                  Create Account
                  <HiOutlineArrowRight className="h-4 w-4" />
                </Link>
                <Link className="th-btn-secondary" to="/login">
                  Sign In
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map((r) => (
                <div
                  key={r.role}
                  className="rounded-xl p-4"
                  style={{
                    background: `${r.color}0d`,
                    border: `1px solid ${r.color}22`,
                  }}
                >
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold mb-3"
                    style={{ background: `${r.color}22`, color: r.color }}
                  >
                    <HiOutlineUserGroup className="h-3 w-3" />
                    {r.role}
                  </div>
                  <p className="text-sm text-ink-soft leading-5">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="th-container mt-16">
        <div
          className="rounded-3xl p-10 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.15) 100%)',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          <h2 className="text-3xl font-bold text-ink md:text-4xl">
            Ready to demo TrustHire?
          </h2>
          <p className="mt-3 text-sm leading-7 text-ink-soft max-w-xl mx-auto">
            Create accounts, verify employers, post jobs, route campus drives, and inspect
            analytics — all from one role-aware interface built for final-year project demos.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link className="th-btn-primary px-8 py-3 text-base" to="/register">
              Start Building
              <HiOutlineArrowRight className="h-4 w-4" />
            </Link>
            <Link className="th-btn-secondary px-8 py-3 text-base" to="/jobs">
              View Live Jobs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
