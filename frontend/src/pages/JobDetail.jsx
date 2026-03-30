import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiShieldCheck, HiExclamation, HiLocationMarker, HiCurrencyDollar,
  HiThumbUp, HiThumbDown, HiChatAlt2, HiLightningBolt,
  HiGlobe, HiOfficeBuilding, HiClock, HiAcademicCap, HiStar, HiPaperAirplane
} from 'react-icons/hi';

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [showApply, setShowApply] = useState(false);

  // Discussion
  const [discussions, setDiscussions] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [postingMsg, setPostingMsg] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  // Voting
  const [voteInfo, setVoteInfo] = useState({ user_vote: null, upvotes: 0, downvotes: 0, credibility_score: 50 });

  // AI Prep
  const [prepData, setPrepData] = useState(null);
  const [loadingPrep, setLoadingPrep] = useState(false);

  // AI Fit Score Matcher
  const [matchData, setMatchData] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  useEffect(() => {
    fetchJob();
    fetchDiscussions();
    if (user) fetchVoteInfo();
  }, [id]);

  const fetchJob = async () => {
    try {
      const { data } = await api.get(`/jobs/${id}`);
      setJob(data.job);
    } catch {
      toast.error('Job not found');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscussions = async () => {
    try {
      const { data } = await api.get(`/discussions/${id}`);
      setDiscussions(data.discussions || []);
    } catch (err) {
      console.error('Failed to fetch discussions');
    }
  };

  const fetchVoteInfo = async () => {
    try {
      const { data } = await api.get(`/credibility/vote/${id}`);
      setVoteInfo(data);
    } catch {}
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post(`/jobs/${id}/apply`, { cover_letter: coverLetter });
      toast.success('Application submitted successfully!');
      setShowApply(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleVote = async (type) => {
    if (!user) return toast.error('Please log in to vote');
    try {
      const { data } = await api.post(`/credibility/vote/${id}`, { vote_type: type });
      setVoteInfo(data);
      toast.success(data.user_vote ? `${type}d!` : 'Vote removed');
    } catch (err) {
      toast.error('Failed to vote');
    }
  };

  const postMessage = async () => {
    if (!newMessage.trim()) return;
    setPostingMsg(true);
    try {
      const { data } = await api.post(`/discussions/${id}`, { message: newMessage });
      setDiscussions(prev => [...prev, { ...data.discussion, replies: [] }]);
      setNewMessage('');
      toast.success('Message posted');
    } catch {
      toast.error('Failed to post message');
    } finally {
      setPostingMsg(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const { data } = await api.post(`/discussions/${id}/summarize`);
      setDiscussions(prev => [...prev, { ...data.summary, replies: [] }]);
      toast.success('Summary generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to summarize');
    } finally {
      setSummarizing(false);
    }
  };

  const generatePrep = async () => {
    if (!job) return;
    setLoadingPrep(true);
    try {
      const { data } = await api.post('/ai/preparation', {
        job_title: job.title,
        job_description: job.description,
        required_skills: job.required_skills || [],
        job_id: job.id
      });
      setPrepData(data);
      toast.success('Preparation materials generated!');
    } catch {
      toast.error('Failed to generate preparation');
    } finally {
      setLoadingPrep(false);
    }
  };

  const calculateMatch = async () => {
    if (!job) return;
    setLoadingMatch(true);
    try {
      const { data } = await api.post('/ai/match', {
        job_id: job.id,
        job_description: job.description,
        job_requirements: job.required_skills || []
      });
      setMatchData(data);
      toast.success('AI Fit Score Calculated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to match');
    } finally {
      setLoadingMatch(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="glass rounded-2xl p-8 space-y-4">
          <div className="shimmer h-8 w-2/3 rounded-lg" />
          <div className="shimmer h-4 w-1/3 rounded-lg" />
          <div className="shimmer h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!job) return null;

  const riskColors = {
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    critical: 'text-red-300 bg-red-500/20 border-red-500/30'
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Job Header */}
      <div className="glass rounded-2xl p-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{job.title}</h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${riskColors[job.risk_level]}`}>
                {job.risk_level === 'low' ? '✓ Verified' : `⚠ ${job.risk_level}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-indigo-400 font-medium">
              <HiOfficeBuilding className="w-4 h-4" />
              {job.employer?.company_name}
              {job.employer?.credibility_score && (
                <span className="text-xs text-slate-400 ml-2">
                  (Trust Score: {job.employer.credibility_score.toFixed(0)}%)
                </span>
              )}
            </div>
          </div>

          {/* Voting */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleVote('upvote')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                voteInfo.user_vote === 'upvote'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800/50 border-slate-600/50 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40'
              }`}
            >
              <HiThumbUp className="w-5 h-5" />
              <span className="text-sm font-medium">{voteInfo.upvotes}</span>
            </button>
            <button
              onClick={() => handleVote('downvote')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                voteInfo.user_vote === 'downvote'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-slate-800/50 border-slate-600/50 text-slate-400 hover:text-red-400 hover:border-red-500/40'
              }`}
            >
              <HiThumbDown className="w-5 h-5" />
              <span className="text-sm font-medium">{voteInfo.downvotes}</span>
            </button>
          </div>
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {job.location && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <HiLocationMarker className="w-4 h-4 text-indigo-400" /> {job.location}
            </div>
          )}
          {job.job_type && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <HiClock className="w-4 h-4 text-indigo-400" /> {job.job_type}
            </div>
          )}
          {(job.salary_min || job.salary_max) && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <HiCurrencyDollar className="w-4 h-4 text-indigo-400" />
              {job.salary_min && `₹${(job.salary_min/1000).toFixed(0)}K`}
              {job.salary_min && job.salary_max && ' - '}
              {job.salary_max && `₹${(job.salary_max/1000).toFixed(0)}K`}
            </div>
          )}
          {job.min_cgpa > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <HiAcademicCap className="w-4 h-4 text-indigo-400" /> Min CGPA: {job.min_cgpa}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Job Description</h2>
          <p className="text-slate-300 leading-relaxed whitespace-pre-line">{job.description}</p>
        </div>

        {/* Skills */}
        {job.required_skills?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map(skill => (
                <span key={skill} className="px-3 py-1.5 text-sm bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Requirements */}
        {job.requirements?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">Requirements</h2>
            <ul className="space-y-2">
              {job.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-300">
                  <span className="text-indigo-400 mt-1">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700/50">
          {user?.role === 'student' || user?.role === 'alumni' ? (
            <>
              <button
                onClick={() => setShowApply(!showApply)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
              >
                Apply Now
              </button>
              <button
                onClick={calculateMatch}
                disabled={loadingMatch}
                className="px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-medium rounded-xl border border-cyan-500/30 transition-all flex items-center gap-2"
              >
                <HiLightningBolt className="w-4 h-4" />
                {loadingMatch ? 'Computing...' : 'AI Fit Score'}
              </button>
            </>
          ) : null}
          <button
            onClick={generatePrep}
            disabled={loadingPrep}
            className="px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white font-medium rounded-xl border border-slate-600/50 transition-all flex items-center gap-2"
          >
            <HiLightningBolt className="w-4 h-4 text-amber-400" />
            {loadingPrep ? 'Generating...' : 'AI Interview Prep'}
          </button>
        </div>

        {/* AI Match Result */}
        {matchData && (
          <div className="mt-6 glass rounded-2xl p-6 animate-slide-up bg-cyan-900/10 border-cyan-500/20">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <HiLightningBolt className="w-5 h-5 text-cyan-400" />
              Smart Match Analysis
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 text-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700 w-full md:w-auto">
                <div className="text-4xl font-black text-cyan-400 mb-1">{matchData.fit_score}%</div>
                <div className="text-sm font-medium text-slate-400 uppercase tracking-widest">Match</div>
              </div>
              
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <h4 className="text-emerald-400 text-sm font-semibold mb-2">You Have:</h4>
                  <div className="flex flex-wrap gap-2">
                    {matchData.matched_skills?.length > 0 ? matchData.matched_skills.map(s => (
                      <span key={s} className="px-2 py-1 bg-emerald-500/10 text-emerald-300 text-xs rounded border border-emerald-500/20">{s}</span>
                    )) : <span className="text-slate-500 text-sm">None of the core requirements found.</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-red-400 text-sm font-semibold mb-2">You're Missing:</h4>
                  <div className="flex flex-wrap gap-2">
                    {matchData.missing_skills?.length > 0 ? matchData.missing_skills.map(s => (
                      <span key={s} className="px-2 py-1 bg-red-500/10 text-red-300 text-xs rounded border border-red-500/20">{s}</span>
                    )) : <span className="text-slate-500 text-sm">Nothing! You meet all listed technical requirements.</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Apply Section */}
        {showApply && (
          <div className="mt-6 p-5 bg-slate-800/50 rounded-xl animate-fade-in">
            <h3 className="text-lg font-semibold text-white mb-3">Apply for this position</h3>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Write a brief cover letter (optional)..."
              className="w-full p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 outline-none resize-none h-32 transition"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleApply}
                disabled={applying}
                className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition disabled:opacity-50"
              >
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
              <button
                onClick={() => setShowApply(false)}
                className="px-6 py-2.5 text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Scam Analysis */}
      {job.scam_score > 0 && (
        <div className="glass rounded-2xl p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HiShieldCheck className="w-5 h-5 text-indigo-400" />
            AI Safety Analysis
          </h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <p className="text-3xl font-bold" style={{ color: job.scam_score > 70 ? '#ef4444' : job.scam_score > 40 ? '#f59e0b' : '#10b981' }}>
                {job.scam_score.toFixed(0)}
              </p>
              <p className="text-sm text-slate-400 mt-1">Scam Score</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <p className={`text-lg font-bold capitalize ${riskColors[job.risk_level]?.split(' ')[0]}`}>
                {job.risk_level}
              </p>
              <p className="text-sm text-slate-400 mt-1">Risk Level</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <p className="text-lg font-bold text-cyan-400">{voteInfo.credibility_score?.toFixed(0) || 50}%</p>
              <p className="text-sm text-slate-400 mt-1">Trust Score</p>
            </div>
          </div>
          {job.ai_explanation && (
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 rounded-xl p-4">{job.ai_explanation}</p>
          )}
        </div>
      )}

      {/* AI Interview Prep */}
      {prepData && (
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HiLightningBolt className="w-5 h-5 text-amber-400" />
            AI Interview Preparation
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3">Topics to Study</h3>
              <ul className="space-y-2">
                {prepData.topics?.map((topic, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <HiStar className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3">Sample Questions</h3>
              <ul className="space-y-2">
                {prepData.questions?.slice(0, 8).map((q, i) => (
                  <li key={i} className="text-sm text-slate-300 pl-4 border-l-2 border-slate-600 py-1">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Discussion Thread */}
      <div className="glass rounded-2xl p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HiChatAlt2 className="w-5 h-5 text-indigo-400" />
            Discussion ({discussions.length})
          </h2>
          {discussions.length >= 3 && user && (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="px-4 py-2 text-sm bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl transition flex items-center gap-1.5"
            >
              <HiLightningBolt className="w-3.5 h-3.5" />
              {summarizing ? 'Generating...' : 'AI Summary'}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
          {discussions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No messages yet. Be the first to start a discussion!</p>
          ) : (
            discussions.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.is_ai_summary ? 'bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {msg.is_ai_summary ? '🤖' : msg.user?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">
                      {msg.is_ai_summary ? 'AI Assistant' : msg.user?.full_name || 'Anonymous'}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      msg.user?.role === 'admin' ? 'bg-red-500/10 text-red-400' :
                      msg.user?.role === 'employer' ? 'bg-amber-500/10 text-amber-400' :
                      msg.user?.role === 'alumni' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {msg.is_ai_summary ? 'AI' : msg.user?.role}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-line">{msg.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* New Message */}
        {user && (
          <div className="flex gap-3 border-t border-slate-700/50 pt-4">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && postMessage()}
              placeholder="Share your thoughts..."
              className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 outline-none transition"
            />
            <button
              onClick={postMessage}
              disabled={postingMsg || !newMessage.trim()}
              className="px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition disabled:opacity-50"
            >
              <HiPaperAirplane className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
