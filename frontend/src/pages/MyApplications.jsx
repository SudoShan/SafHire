import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { HiDocumentText, HiBriefcase, HiOfficeBuilding, HiCheckCircle, HiXCircle, HiClock } from 'react-icons/hi';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data } = await api.get('/students/applications');
      setApplications(data.applications || []);
    } catch (err) {
      if (err.response?.status === 400) {
        toast.error('You must link your Academic Profile first!', { duration: 5000 });
      } else {
        toast.error('Failed to load your applications');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    applied: { icon: HiClock, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
    shortlisted: { icon: HiCheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
    interviewed: { icon: HiBriefcase, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
    offered: { icon: HiCheckCircle, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20' },
    rejected: { icon: HiXCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading your applications...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <HiDocumentText className="w-8 h-8 text-cyan-400" />
            My Applications
          </h1>
          <p className="text-slate-400 mt-2">Track the status of jobs you've applied to.</p>
        </div>
        <div className="glass px-6 py-4 rounded-2xl border border-cyan-500/20 text-center">
           <p className="text-sm text-slate-400 mb-1">Total Applied</p>
           <p className="text-2xl font-bold text-cyan-400">{applications.length}</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl animate-slide-up">
          <HiBriefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No applications yet</h3>
          <p className="text-slate-400 mb-6">Start browsing jobs and apply to kickstart your career.</p>
          <Link to="/jobs" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white rounded-xl font-medium transition shadow-lg shadow-cyan-500/20">
            Find Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app, index) => {
            const StatusIcon = statusConfig[app.status]?.icon || HiClock;
            const statusStyle = statusConfig[app.status] || statusConfig.applied;
            
            return (
              <div key={app.id} className="glass rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all animate-slide-up flex flex-col md:flex-row gap-6 items-start md:items-center justify-between" style={{ animationDelay: `${index * 50}ms` }}>
                
                <div className="flex items-start gap-4">
                  {app.job.employer.company_logo_url ? (
                    <img src={app.job.employer.company_logo_url} alt="Company" className="w-14 h-14 rounded-xl object-cover bg-white" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                      <HiOfficeBuilding className="w-6 h-6 text-slate-500" />
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      <Link to={`/jobs/${app.job.id}`} className="hover:text-cyan-400 transition">
                        {app.job.title}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span className="font-medium text-slate-300">{app.job.employer.company_name}</span>
                      <span>•</span>
                      <span>{app.job.location || 'Remote'}</span>
                      <span>•</span>
                      <span>Applied {new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border ${statusStyle.bg} ${statusStyle.color}`}>
                    <StatusIcon className="w-5 h-5" />
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </div>
                  <Link to={`/jobs/${app.job.id}`} className="text-sm font-medium text-slate-400 hover:text-white px-4 py-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition border border-slate-700 w-full md:w-auto text-center">
                    View Job Listing
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
