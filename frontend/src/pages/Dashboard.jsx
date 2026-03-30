import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { HiBriefcase, HiDocumentText, HiShieldCheck, HiTrendingUp, HiUserGroup, HiChatAlt2, HiLightningBolt, HiChartBar } from 'react-icons/hi';

export default function Dashboard() {
  const { user } = useAuth();

  const studentCards = [
    { title: 'Browse Jobs', desc: 'Find opportunities matching your skills', icon: HiBriefcase, to: '/jobs', color: 'from-indigo-500 to-indigo-600' },
    { title: 'My Applications', desc: 'Track your job applications', icon: HiDocumentText, to: '/my-applications', color: 'from-cyan-500 to-cyan-600' },
    { title: 'AI Interview Prep', desc: 'AI-powered interview preparation', icon: HiLightningBolt, to: '/jobs', color: 'from-purple-500 to-purple-600' },
    { title: 'My Profile', desc: 'Update skills, resume & CGPA', icon: HiUserGroup, to: '/profile', color: 'from-emerald-500 to-emerald-600' },
  ];

  const employerCards = [
    { title: 'Post a Job', desc: 'Create a new job listing', icon: HiBriefcase, to: '/post-job', color: 'from-indigo-500 to-indigo-600' },
    { title: 'My Job Posts', desc: 'Manage your posted jobs', icon: HiDocumentText, to: '/my-jobs', color: 'from-cyan-500 to-cyan-600' },
    { title: 'Company Profile', desc: 'Update company information', icon: HiShieldCheck, to: '/employer-profile', color: 'from-purple-500 to-purple-600' },
    { title: 'Credibility Score', desc: 'View your trust rating', icon: HiTrendingUp, to: '/employer-profile', color: 'from-emerald-500 to-emerald-600' },
  ];

  const adminCards = [
    { title: 'Flagged Jobs', desc: 'Review flagged job listings', icon: HiShieldCheck, to: '/admin', color: 'from-red-500 to-red-600' },
    { title: 'User Management', desc: 'Manage users & employers', icon: HiUserGroup, to: '/admin', color: 'from-indigo-500 to-indigo-600' },
    { title: 'Analytics', desc: 'Platform statistics', icon: HiChartBar, to: '/admin', color: 'from-cyan-500 to-cyan-600' },
    { title: 'All Jobs', desc: 'Browse all job listings', icon: HiBriefcase, to: '/jobs', color: 'from-emerald-500 to-emerald-600' },
  ];

  const cards = user?.role === 'employer' ? employerCards
    : user?.role === 'admin' ? adminCards
    : studentCards;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="gradient-text">{user?.full_name}</span>
        </h1>
        <p className="text-slate-400 mt-2">
          {user?.role === 'student' && 'Find your next career opportunity with AI-powered safety verification.'}
          {user?.role === 'employer' && 'Manage your job listings and build your credibility.'}
          {user?.role === 'admin' && 'Monitor platform activity and review flagged content.'}
          {user?.role === 'alumni' && 'Help students by sharing your experience and insights.'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((card, i) => (
          <Link
            key={card.title}
            to={card.to}
            className="group glass rounded-2xl p-6 hover:bg-slate-700/50 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
              {card.title}
            </h3>
            <p className="text-sm text-slate-400 mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>

      {/* Stats Section */}
      <div className="glass rounded-2xl p-8">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <HiChartBar className="w-5 h-5 text-indigo-400" />
          Platform Highlights
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'AI Verified Jobs', value: '1,200+', color: 'text-indigo-400' },
            { label: 'Trusted Employers', value: '340+', color: 'text-cyan-400' },
            { label: 'Scams Blocked', value: '89', color: 'text-red-400' },
            { label: 'Students Placed', value: '2,100+', color: 'text-emerald-400' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
