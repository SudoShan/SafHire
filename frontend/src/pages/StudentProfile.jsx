import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { HiUser, HiAcademicCap, HiDocumentText, HiOfficeBuilding, HiBookOpen, HiCurrencyRupee } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

export default function StudentProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [colleges, setColleges] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState({
    college_id: '',
    enrollment_number: '',
    department: '',
    batch_year: new Date().getFullYear(),
    cgpa: '',
    skills: [],
    preferred_role: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [colRes, profRes] = await Promise.all([
        api.get('/students/colleges'),
        api.get('/students/profile').catch(() => ({ data: { profile: null } }))
      ]);
      setColleges(colRes.data.colleges || []);
      if (profRes.data?.profile) {
        setProfile({ ...profRes.data.profile });
      }
    } catch (err) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => {
    setProfile(p => ({ ...p, [field]: value }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      update('skills', [...(profile.skills || []), skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    update('skills', profile.skills.filter(s => s !== skill));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const { data } = await api.post('/students/profile', profile);
      setProfile({ ...data.profile });
      toast.success('Student Profile securely registered to College Silo!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to construct profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(pdf|doc|docx)$/)) {
      return toast.error('Only PDF and Word documents are allowed');
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('File size should not exceed 5MB');
    }

    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    const loadingToast = toast.loading('Uploading and running AI Resume Parser...');

    try {
      const { data } = await api.post('/students/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      update('resume_url', data.resume_url);
      if (data.parsed_skills?.length > 0) {
        toast.success(`AI extracted ${data.parsed_skills.length} skills automatically!`);
        update('skills', [...new Set([...(profile.skills || []), ...data.parsed_skills])]);
      } else {
        toast.success('Resume deployed successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Resume parse failed');
    } finally {
      setUploading(false);
      toast.dismiss(loadingToast);
    }
  };

  if (loading && !colleges.length) return <div className="text-center py-20 text-slate-400">Verifying College Silos...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <HiUser className="w-8 h-8 text-emerald-400" />
          Student Hub Profile
        </h1>
        <p className="text-slate-400 mt-2">Link your account precisely to your college network to access private B2B placement jobs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-bold text-white border-b border-slate-700/50 pb-3">Academic Linkage (V2 Architecture)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">College Silo Linkage</label>
                <select
                  value={profile.college_id || ''} onChange={(e) => update('college_id', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Independent Professional / Not in College</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">Select a college to unlock exclusive B2B campus placement jobs.</p>
              </div>

              {profile.college_id && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Enrollment / Roll No *</label>
                    <input required value={profile.enrollment_number || ''} onChange={e => update('enrollment_number', e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white outline-none focus:border-emerald-500" placeholder="e.g. 21CS045" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Department *</label>
                    <input required value={profile.department || ''} onChange={e => update('department', e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white outline-none focus:border-emerald-500" placeholder="Computer Science" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Batch (Graduation Year) *</label>
                    <input required type="number" value={profile.batch_year || ''} onChange={e => update('batch_year', Number(e.target.value))} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white outline-none focus:border-emerald-500" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Current CGPA (0-10)</label>
                <input type="number" step="0.01" min="0" max="10" value={profile.cgpa || ''} onChange={e => update('cgpa', e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white outline-none focus:border-emerald-500" placeholder="8.50" />
              </div>
               
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Preferred Tech Role</label>
                <input value={profile.preferred_role || ''} onChange={e => update('preferred_role', e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white outline-none focus:border-emerald-500" placeholder="e.g. Frontend Developer, Data Analyst" />
              </div>
            </div>

            {/* Smart Matching Skills Section */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 mt-4 border-t border-slate-700/50 pt-6">
                Technical Skills Tracker (Used for AI Mathematical Fit Scoring)
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white outline-none focus:border-emerald-500"
                  placeholder="Type a skill and hit Enter..."
                />
                <button type="button" onClick={addSkill} className="px-4 bg-emerald-500/20 text-emerald-400 font-medium rounded-xl hover:bg-emerald-500/30">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-full flex items-center gap-2">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="text-slate-500 hover:text-red-400">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-medium text-white rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50">
              {loading ? 'Securing Linkage...' : 'Lock Profile & Enable Job Feed'}
            </button>
          </form>
        </div>

        {/* AI Resume Upload Panel */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border-t-4 border-indigo-500 text-center">
            <HiDocumentText className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
            <h3 className="font-bold text-white mb-2">Automated Resume AI</h3>
            <p className="text-sm text-slate-400 mb-5">Upload your document to allow our AI to mathematically analyze and extract your core skills.</p>
            
            {profile.id ? (
              <label className="block w-full py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white font-medium cursor-pointer transition text-sm">
                {uploading ? 'Processing File...' : 'Upload PDF / DOCX'}
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={uploading} />
              </label>
            ) : (
              <div className="w-full py-2.5 bg-slate-800/50 border border-slate-700 text-slate-500 rounded-lg text-sm italic">
                Save your Academic Linkage Profile (on the left) first!
              </div>
            )}

            {profile.resume_url && (
               <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="block mt-4 text-sm font-medium text-indigo-400 hover:text-indigo-300">
                 View Successfully Uploaded Resume
               </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
