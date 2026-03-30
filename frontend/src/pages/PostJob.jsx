import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { HiBriefcase, HiShieldCheck, HiExclamation, HiPlus, HiX } from 'react-icons/hi';

export default function PostJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scamResult, setScamResult] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [reqInput, setReqInput] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    salary_min: '',
    salary_max: '',
    location: '',
    job_type: 'full-time',
    required_skills: [],
    requirements: [],
    min_cgpa: '',
    experience_level: 'entry',
    application_deadline: ''
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addSkill = () => {
    if (skillInput.trim() && !form.required_skills.includes(skillInput.trim())) {
      update('required_skills', [...form.required_skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    update('required_skills', form.required_skills.filter(s => s !== skill));
  };

  const addRequirement = () => {
    if (reqInput.trim()) {
      update('requirements', [...form.requirements, reqInput.trim()]);
      setReqInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      return toast.error('Title and description are required');
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        min_cgpa: form.min_cgpa ? Number(form.min_cgpa) : 0,
      };

      const { data } = await api.post('/jobs', payload);
      setScamResult(data.scam_analysis);

      if (data.scam_analysis?.flagged) {
        toast('Job posted but flagged for review', { icon: '⚠️' });
      } else {
        toast.success('Job posted successfully!');
      }

      setTimeout(() => navigate(`/jobs/${data.job.id}`), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <HiBriefcase className="w-8 h-8 text-indigo-400" />
          Post a New Job
        </h1>
        <p className="text-slate-400 mt-2">Your job listing will be analyzed by our AI scam detection system</p>
      </div>

      {/* Scam Result Banner */}
      {scamResult && (
        <div className={`mb-6 p-5 rounded-2xl border animate-slide-up ${
          scamResult.flagged
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-emerald-500/10 border-emerald-500/20'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {scamResult.flagged ? (
              <HiExclamation className="w-6 h-6 text-red-400" />
            ) : (
              <HiShieldCheck className="w-6 h-6 text-emerald-400" />
            )}
            <h3 className={`font-semibold ${scamResult.flagged ? 'text-red-400' : 'text-emerald-400'}`}>
              {scamResult.flagged ? 'Job Flagged for Review' : 'Job Verified & Active'}
            </h3>
          </div>
          <p className="text-sm text-slate-300">
            Scam Score: {scamResult.scam_score?.toFixed(1)} | Risk: {scamResult.risk_level}
          </p>
          {scamResult.explanation && (
            <p className="text-sm text-slate-400 mt-2">{scamResult.explanation}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6 animate-fade-in">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Job Title *</label>
          <input
            id="job-title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            placeholder="e.g., Software Engineer"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Job Description *</label>
          <textarea
            id="job-description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none h-40 transition-all"
            placeholder="Describe the role, responsibilities, and benefits..."
            required
          />
        </div>

        {/* Salary & Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Min Salary (₹)</label>
            <input
              type="number"
              value={form.salary_min}
              onChange={(e) => update('salary_min', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 outline-none transition"
              placeholder="e.g., 500000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Max Salary (₹)</label>
            <input
              type="number"
              value={form.salary_max}
              onChange={(e) => update('salary_max', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 outline-none transition"
              placeholder="e.g., 1000000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
            <input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 outline-none transition"
              placeholder="e.g., Bangalore"
            />
          </div>
        </div>

        {/* Job Type & Experience */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Job Type</label>
            <select
              value={form.job_type}
              onChange={(e) => update('job_type', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none transition"
            >
              <option value="full-time">Full-Time</option>
              <option value="part-time">Part-Time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
              <option value="remote">Remote</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Experience Level</label>
            <select
              value={form.experience_level}
              onChange={(e) => update('experience_level', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none transition"
            >
              <option value="entry">Entry Level</option>
              <option value="mid">Mid Level</option>
              <option value="senior">Senior Level</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Min CGPA</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={form.min_cgpa}
              onChange={(e) => update('min_cgpa', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 outline-none transition"
              placeholder="0.0"
            />
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Required Skills</label>
          <div className="flex gap-2 mb-3">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 outline-none transition"
              placeholder="Add a skill (e.g., React)"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-3 py-2.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/30 transition"
            >
              <HiPlus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.required_skills.map(skill => (
              <span key={skill} className="flex items-center gap-1.5 px-3 py-1 text-sm bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)}>
                  <HiX className="w-3.5 h-3.5 text-indigo-400 hover:text-red-400 transition" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Requirements</label>
          <div className="flex gap-2 mb-3">
            <input
              value={reqInput}
              onChange={(e) => setReqInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 outline-none transition"
              placeholder="e.g., 3+ years experience"
            />
            <button type="button" onClick={addRequirement}
              className="px-3 py-2.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/30 transition">
              <HiPlus className="w-5 h-5" />
            </button>
          </div>
          <ul className="space-y-1">
            {form.requirements.map((req, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-indigo-400">•</span> {req}
                <button type="button" onClick={() => update('requirements', form.requirements.filter((_, j) => j !== i))}>
                  <HiX className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Application Deadline</label>
          <input
            type="date"
            value={form.application_deadline}
            onChange={(e) => update('application_deadline', e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none transition"
          />
        </div>

        {/* Submit */}
        <button
          id="post-job-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing & Posting...
            </span>
          ) : (
            'Post Job'
          )}
        </button>
      </form>
    </div>
  );
}
