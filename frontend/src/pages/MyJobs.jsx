import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  HiBriefcase, HiUsers, HiExclamation, HiCheckCircle, 
  HiChevronDown, HiChevronUp, HiDocumentText, HiMail
} from 'react-icons/hi';

export default function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [applications, setApplications] = useState({});
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data } = await api.get('/employers/my-jobs');
      setJobs(data.jobs || []);
    } catch (err) {
      if (err.response?.status === 400) {
        toast.error('Complete your Employer Profile first to unlock jobs!', { duration: 5000 });
      } else {
        toast.error('Failed to load your jobs');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (jobId) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }
    
    setExpandedJobId(jobId);
    
    // Fetch applications if not already cached
    if (!applications[jobId]) {
      setLoadingApps(true);
      try {
        const { data } = await api.get(`/jobs/${jobId}/applications`);
        setApplications(prev => ({ ...prev, [jobId]: data.applications || [] }));
      } catch (err) {
        toast.error('Failed to load applicants');
      } finally {
        setLoadingApps(false);
      }
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading your jobs...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <HiBriefcase className="w-8 h-8 text-indigo-400" />
            My Job Posts
          </h1>
          <p className="text-slate-400 mt-2">Manage your listings and review incoming applications.</p>
        </div>
        <Link to="/post-job" className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 font-medium transition">
          Post New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl animate-slide-up">
          <HiBriefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No jobs posted yet</h3>
          <p className="text-slate-400 mb-6">Create your first job listing to start hiring.</p>
          <Link to="/post-job" className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition">
            Post a Job
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, index) => (
            <div key={job.id} className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <div 
                className={`p-6 cursor-pointer hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${expandedJobId === job.id ? 'bg-slate-800/50' : ''}`}
                onClick={() => toggleExpand(job.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white hover:text-indigo-400 transition">
                      {job.title}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      job.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      job.status === 'under_review' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {job.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5"><HiBriefcase className="w-4 h-4"/> {job.job_type}</span>
                    <span className="flex items-center gap-1.5"><HiUsers className="w-4 h-4"/> Applicants</span>
                    <span className="text-slate-500">• Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                  <div className="text-right">
                    {job.risk_level !== 'low' && (
                      <p className="text-xs text-amber-400 flex items-center justify-end gap-1 mb-1">
                        <HiExclamation className="w-4 h-4"/> AI Flagged: {job.risk_level}
                      </p>
                    )}
                    <Link to={`/jobs/${job.id}`} onClick={(e) => e.stopPropagation()} className="text-sm text-indigo-400 hover:text-indigo-300 transition">
                      View Public Page →
                    </Link>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-white transition bg-slate-800/50 rounded-lg">
                    {expandedJobId === job.id ? <HiChevronUp className="w-6 h-6"/> : <HiChevronDown className="w-6 h-6"/>}
                  </button>
                </div>
              </div>

              {/* Expanded Applicants Section */}
              {expandedJobId === job.id && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/30">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <HiUsers className="w-5 h-5 text-indigo-400"/>
                    Applicants ({applications[job.id]?.length || 0})
                  </h4>
                  
                  {loadingApps ? (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-700 rounded-xl">
                      Loading applicants...
                    </div>
                  ) : applications[job.id]?.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                      No applications received yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {applications[job.id].map(app => (
                        <div key={app.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-white">{app.student.user.full_name}</p>
                              <a href={`mailto:${app.student.user.email}`} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1">
                                <HiMail className="w-4 h-4" /> {app.student.user.email}
                              </a>
                            </div>
                            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-medium border border-indigo-500/20">
                              CGPA: {app.student.cgpa || 'N/A'}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-400 line-clamp-2 mb-4 bg-slate-900/50 p-3 rounded-lg italic">
                            "{app.cover_letter}"
                          </p>
                          
                          <div className="flex items-center gap-3">
                            {app.student.resume_url ? (
                              <a 
                                href={app.student.resume_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg text-center transition flex justify-center items-center gap-2"
                              >
                                <HiDocumentText className="w-4 h-4"/> View Resume
                              </a>
                            ) : (
                              <button disabled className="flex-1 py-2 bg-slate-800 text-slate-500 text-sm font-medium rounded-lg text-center cursor-not-allowed border border-slate-700 flex justify-center items-center gap-2">
                                <HiDocumentText className="w-4 h-4"/> No Resume
                              </button>
                            )}
                            <select 
                              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg py-2 px-3 outline-none focus:border-indigo-500"
                              defaultValue={app.status}
                            >
                              <option value="applied">Applied</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="interviewed">Interviewed</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
