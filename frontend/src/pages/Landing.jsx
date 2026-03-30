import { Link } from 'react-router-dom';
import { HiShieldCheck, HiLightningBolt, HiUserGroup, HiChatAlt2, HiChartBar, HiArrowRight, HiStar } from 'react-icons/hi';

export default function Landing() {
  const features = [
    {
      icon: HiShieldCheck,
      title: 'AI Scam Detection',
      desc: '3-layer AI engine analyzes every job posting for fraud indicators before it goes live.',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      icon: HiLightningBolt,
      title: 'Smart Matching',
      desc: 'AI-powered resume parsing and job eligibility filtering to find your perfect match.',
      color: 'from-amber-500 to-amber-600'
    },
    {
      icon: HiChartBar,
      title: 'Credibility Scoring',
      desc: 'Community-driven trust system with weighted voting ensures job quality.',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      icon: HiChatAlt2,
      title: 'Discussion Forum',
      desc: 'Each job has a discussion thread with AI-powered summaries.',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      icon: HiUserGroup,
      title: 'Verified Employers',
      desc: 'DNS domain verification and OTP email confirmation for every employer.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: HiStar,
      title: 'Interview Prep',
      desc: 'AI-generated preparation topics and likely interview questions for each job.',
      color: 'from-rose-500 to-rose-600'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 py-24 md:py-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-sm text-indigo-300 mb-6 animate-fade-in">
            <HiShieldCheck className="w-4 h-4" />
            AI-Powered Placement Security
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight animate-slide-up">
            Place Your Trust in
            <br />
            <span className="gradient-text">Verified Hiring</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mt-6 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
            TrustHire uses a 3-layer AI engine to detect scam job postings, verify employers,
            and ensure every opportunity is legitimate and safe.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Link
              to="/register"
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 flex items-center gap-2 justify-center"
            >
              Get Started Free <HiArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/jobs"
              className="px-8 py-3.5 glass text-slate-200 font-medium rounded-xl hover:bg-slate-700/50 transition-all duration-300"
            >
              Browse Jobs
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 animate-slide-up" style={{ animationDelay: '300ms' }}>
            {[
              { value: '1,200+', label: 'Verified Jobs' },
              { value: '340+', label: 'Companies' },
              { value: '99.2%', label: 'Detection Rate' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Why <span className="gradient-text">TrustHire</span>?
            </h2>
            <p className="text-slate-400 mt-3 max-w-lg mx-auto">
              Every feature is designed to protect students and ensure legitimate hiring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="glass rounded-2xl p-7 hover:bg-slate-700/30 transition-all duration-300 group animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">How It Works</h2>
          </div>

          <div className="space-y-8">
            {[
              { step: '01', title: 'Employer posts a job', desc: 'The job description is sent to our AI engine automatically.' },
              { step: '02', title: 'AI analyzes for scams', desc: '3-layer detection: keyword scan, ML classifier, and LLM reasoning.' },
              { step: '03', title: 'Community verifies', desc: 'Users vote on jobs. Weighted scores determine trust rating.' },
              { step: '04', title: 'Students apply safely', desc: 'Only verified, trusted jobs reach students for application.' },
            ].map((item, i) => (
              <div key={item.step} className="flex gap-6 items-start animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg shadow-indigo-500/20">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="text-slate-400 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="max-w-3xl mx-auto text-center glass rounded-3xl p-12 animate-pulse-glow">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to hire — or be hired — with confidence?</h2>
          <p className="text-slate-400 mb-8">
            Join TrustHire today and experience AI-secured placement.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold rounded-xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
          >
            Create Free Account <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <HiShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-semibold gradient-text">TrustHire</span>
          </div>
          <p className="text-sm text-slate-500 mt-4 md:mt-0">
            © {new Date().getFullYear()} TrustHire. Securing placements with AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
