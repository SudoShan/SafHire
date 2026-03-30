import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  HiShieldCheck, HiUserGroup, HiExclamation, HiCheck, HiX,
  HiChartBar, HiBriefcase, HiEye
} from 'react-icons/hi';

export default function AdminPanel() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [flaggedJobs, setFlaggedJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'dashboard') {
        const { data } = await api.get('/admin/dashboard');
        setStats(data.stats);
      } else if (tab === 'flagged') {
        const { data } = await api.get('/admin/flagged-jobs');
        setFlaggedJobs(data.jobs || []);
      } else if (tab === 'users') {
        const { data } = await api.get('/admin/users');
        setUsers(data.users || []);
      } else if (tab === 'employers') {
        const { data } = await api.get('/admin/employers');
        setEmployers(data.employers || []);
      }
    } catch (err) {
      console.error('Admin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (jobId, action) => {
    try {
      await api.put(`/admin/jobs/${jobId}/review`, { action });
      toast.success(`Job ${action}d successfully`);
      loadData();
    } catch {
      toast.error('Failed to review job');
    }
  };

  const handleApproveEmployer = async (empId) => {
    try {
      await api.put(`/admin/employers/${empId}/approve`);
      toast.success('Employer approved');
      loadData();
    } catch {
      toast.error('Failed to approve employer');
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HiChartBar },
    { id: 'flagged', label: 'Flagged Jobs', icon: HiExclamation },
    { id: 'users', label: 'Users', icon: HiUserGroup },
    { id: 'employers', label: 'Employers', icon: HiBriefcase },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <HiShieldCheck className="w-8 h-8 text-indigo-400" />
        Admin Panel
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : 'glass text-slate-300 hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <div className="shimmer h-8 w-20 rounded-lg mb-2" />
              <div className="shimmer h-4 w-32 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {tab === 'dashboard' && stats && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total Users', value: stats.totalUsers || 0, color: 'text-indigo-400' },
                  { label: 'Total Jobs', value: stats.totalJobs || 0, color: 'text-cyan-400' },
                  { label: 'Flagged', value: stats.flaggedJobs || 0, color: 'text-red-400' },
                  { label: 'Appeals', value: stats.pendingAppeals || 0, color: 'text-amber-400' },
                  { label: 'Applications', value: stats.totalApplications || 0, color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="glass rounded-2xl p-5 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-sm text-slate-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {stats.roleDistribution && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">User Distribution</h3>
                  <div className="flex flex-wrap gap-6">
                    {Object.entries(stats.roleDistribution).map(([role, count]) => (
                      <div key={role} className="text-center">
                        <p className="text-xl font-bold text-slate-200">{count}</p>
                        <p className="text-sm text-slate-400 capitalize">{role}s</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Flagged Jobs Tab */}
          {tab === 'flagged' && (
            <div className="space-y-4 animate-fade-in">
              {flaggedJobs.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <HiShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-300 text-lg">No flagged jobs! All clear.</p>
                </div>
              ) : (
                flaggedJobs.map(job => (
                  <div key={job.id} className="glass rounded-2xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                        <p className="text-sm text-indigo-400">{job.employer?.company_name}</p>
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2">{job.description}</p>
                        <div className="flex gap-4 mt-3 text-sm">
                          <span className="text-red-400">Scam Score: {job.scam_score?.toFixed(1)}</span>
                          <span className="text-amber-400 capitalize">Risk: {job.risk_level}</span>
                          <span className={`capitalize ${job.status === 'appealed' ? 'text-purple-400' : 'text-slate-400'}`}>
                            Status: {job.status}
                          </span>
                        </div>
                        {job.appeal_message && (
                          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                            <p className="text-xs text-slate-400 mb-1 font-medium">Appeal Message:</p>
                            <p className="text-sm text-slate-300">{job.appeal_message}</p>
                          </div>
                        )}
                        {job.ai_explanation && (
                          <p className="text-xs text-slate-500 mt-2">{job.ai_explanation}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleReview(job.id, 'approve')}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition flex items-center gap-1.5"
                        >
                          <HiCheck className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleReview(job.id, 'reject')}
                          className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition flex items-center gap-1.5"
                        >
                          <HiX className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <div className="glass rounded-2xl overflow-hidden animate-fade-in">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Name</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Role</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-6 py-3 text-sm text-white">{u.full_name}</td>
                      <td className="px-6 py-3 text-sm text-slate-300">{u.email}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          u.role === 'admin' ? 'bg-red-500/10 text-red-400' :
                          u.role === 'employer' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Employers Tab */}
          {tab === 'employers' && (
            <div className="space-y-4 animate-fade-in">
              {employers.map(emp => (
                <div key={emp.id} className="glass rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{emp.company_name}</h3>
                    <p className="text-sm text-slate-400">{emp.company_email} | {emp.company_domain}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className={emp.domain_verified ? 'text-emerald-400' : 'text-slate-500'}>
                        Domain: {emp.domain_verified ? '✓ Verified' : '✕ Unverified'}
                      </span>
                      <span className={emp.email_verified ? 'text-emerald-400' : 'text-slate-500'}>
                        Email: {emp.email_verified ? '✓ Verified' : '✕ Unverified'}
                      </span>
                      <span className="text-cyan-400">
                        Trust: {emp.credibility_score?.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {!emp.is_approved && (
                    <button
                      onClick={() => handleApproveEmployer(emp.id)}
                      className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition"
                    >
                      Approve
                    </button>
                  )}
                  {emp.is_approved && (
                    <span className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-full">
                      ✓ Approved
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
