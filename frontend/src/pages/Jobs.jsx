import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { HiSearch, HiFilter, HiLocationMarker, HiCurrencyDollar, HiShieldCheck, HiExclamation, HiBriefcase } from 'react-icons/hi';

const JOB_TYPES = ['all', 'full-time', 'part-time', 'internship', 'contract', 'remote'];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (jobType !== 'all') params.job_type = jobType;

      const { data } = await api.get('/jobs', { params });
      setJobs(data.jobs || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, jobType]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const getRiskBadge = (level) => {
    const badges = {
      low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      high: 'bg-red-500/10 text-red-400 border-red-500/20',
      critical: 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return badges[level] || badges.low;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-white">Job Listings</h1>
        <p className="text-slate-400 mt-2">Browse AI-verified job opportunities</p>
      </div>

      {/* Search & Filters */}
      <div className="glass rounded-2xl p-5 mb-8 animate-fade-in">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="job-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs by title, description, skills..."
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/25"
          >
            Search
          </button>
        </form>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {JOB_TYPES.map(type => (
            <button
              key={type}
              onClick={() => { setJobType(type); setPage(1); }}
              className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                jobType === type
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800/50 text-slate-400 border-slate-600/50 hover:border-slate-500'
              }`}
            >
              {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Job Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-6 space-y-4">
              <div className="shimmer h-6 w-3/4 rounded-lg" />
              <div className="shimmer h-4 w-1/2 rounded-lg" />
              <div className="shimmer h-16 rounded-lg" />
              <div className="flex gap-2">
                <div className="shimmer h-6 w-20 rounded-full" />
                <div className="shimmer h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <HiBriefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl text-slate-300 font-medium">No jobs found</h3>
          <p className="text-slate-400 mt-2">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job, i) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="group glass rounded-2xl p-6 hover:bg-slate-700/30 hover:border-indigo-500/30 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {job.title}
                  </h3>
                  <p className="text-sm text-indigo-400 font-medium mt-0.5">
                    {job.employer?.company_name || 'Unknown Company'}
                  </p>
                </div>
                {/* Risk badge */}
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getRiskBadge(job.risk_level)}`}>
                  {job.risk_level === 'low' ? (
                    <span className="flex items-center gap-1"><HiShieldCheck className="w-3 h-3" /> Safe</span>
                  ) : (
                    <span className="flex items-center gap-1"><HiExclamation className="w-3 h-3" /> {job.risk_level}</span>
                  )}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                {job.description}
              </p>

              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <HiLocationMarker className="w-3.5 h-3.5" /> {job.location}
                  </span>
                )}
                {(job.salary_min || job.salary_max) && (
                  <span className="flex items-center gap-1">
                    <HiCurrencyDollar className="w-3.5 h-3.5" />
                    {job.salary_min ? `₹${(job.salary_min/1000).toFixed(0)}K` : ''} 
                    {job.salary_min && job.salary_max ? ' - ' : ''}
                    {job.salary_max ? `₹${(job.salary_max/1000).toFixed(0)}K` : ''}
                  </span>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {job.job_type && (
                  <span className="px-2.5 py-0.5 text-xs bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20">
                    {job.job_type}
                  </span>
                )}
                {job.required_skills?.slice(0, 3).map(skill => (
                  <span key={skill} className="px-2.5 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded-full">
                    {skill}
                  </span>
                ))}
                {job.required_skills?.length > 3 && (
                  <span className="px-2.5 py-0.5 text-xs bg-slate-700/50 text-slate-400 rounded-full">
                    +{job.required_skills.length - 3}
                  </span>
                )}
              </div>

              {/* Footer - Credibility */}
              <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-400">
                    Trust: {(job.credibility_score || 50).toFixed(0)}%
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 glass rounded-lg text-slate-300 hover:text-white disabled:opacity-40 transition"
          >
            Previous
          </button>
          {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded-lg transition ${
                  page === p
                    ? 'bg-indigo-500 text-white'
                    : 'glass text-slate-300 hover:text-white'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 glass rounded-lg text-slate-300 hover:text-white disabled:opacity-40 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
