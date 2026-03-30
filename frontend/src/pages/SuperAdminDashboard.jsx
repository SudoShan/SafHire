import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { HiOfficeBuilding, HiCheckCircle, HiXCircle, HiAcademicCap, HiShieldCheck } from 'react-icons/hi';

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('colleges');
  const [colleges, setColleges] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCollege, setNewCollege] = useState({ name: '', domain: '', location: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [colRes, empRes] = await Promise.all([
        api.get('/super-admin/colleges'),
        api.get('/super-admin/employers')
      ]);
      setColleges(colRes.data.colleges || []);
      setEmployers(empRes.data.employers || []);
    } catch (err) {
      toast.error('Failed to load Super Admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollege = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/super-admin/colleges', newCollege);
      setColleges([data.college, ...colleges]);
      setNewCollege({ name: '', domain: '', location: '' });
      toast.success(data.message);
    } catch (err) {
      toast.error('Failed to create college');
    }
  };

  const handleVerifyEmployer = async (id, status) => {
    try {
      await api.put(`/super-admin/employers/${id}/verify`, { global_status: status });
      setEmployers(employers.map(e => e.id === id ? { ...e, global_status: status } : e));
      toast.success(`Employer globally ${status}`);
    } catch (err) {
      toast.error('Failed to update employer status');
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Global Platform Data...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <HiShieldCheck className="w-8 h-8 text-red-500" />
          Super Admin Global Control
        </h1>
        <p className="text-slate-400 mt-2">Manage all registered colleges, verify enterprise employers, and oversee global platform security.</p>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('colleges')}
          className={`px-6 py-2.5 rounded-xl font-medium transition ${activeTab === 'colleges' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Manage Colleges
        </button>
        <button 
          onClick={() => setActiveTab('employers')}
          className={`px-6 py-2.5 rounded-xl font-medium transition ${activeTab === 'employers' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Global Employer Verification
        </button>
      </div>

      {activeTab === 'colleges' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateCollege} className="glass p-6 rounded-2xl border border-slate-700 flex flex-wrap md:flex-nowrap items-end gap-4 animate-fade-in">
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">College Name</label>
              <input required value={newCollege.name} onChange={e => setNewCollege({...newCollege, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white" placeholder="Stanford University" />
            </div>
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Domain</label>
              <input required value={newCollege.domain} onChange={e => setNewCollege({...newCollege, domain: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white" placeholder="stanford.edu" />
            </div>
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Location</label>
              <input value={newCollege.location} onChange={e => setNewCollege({...newCollege, location: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white" placeholder="California, USA" />
            </div>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-2.5 rounded-lg transition h-[42px]">
              Add College
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colleges.map(c => (
              <div key={c.id} className="glass p-5 rounded-2xl border border-slate-700 animate-slide-up">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center">
                    <HiAcademicCap className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-white truncate">{c.name}</h3>
                </div>
                <p className="text-sm text-slate-400 mb-1">Domain: <span className="text-slate-300">{c.domain}</span></p>
                <p className="text-sm text-slate-400">Status: <span className="text-emerald-400 font-medium">{c.status}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'employers' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl overflow-hidden animate-fade-in">
            <table className="w-full text-left">
              <thead className="bg-slate-800/80 text-slate-400 text-sm">
                <tr>
                  <th className="p-4 font-medium">Company</th>
                  <th className="p-4 font-medium">Domain & Verification</th>
                  <th className="p-4 font-medium">Global Status</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {employers.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <HiOfficeBuilding className="w-6 h-6 text-slate-500" />
                        <div>
                          <p className="font-semibold text-white">{emp.company_name}</p>
                          <p className="text-xs text-slate-400 capitalize">{emp.company_type || 'Unknown'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-300">{emp.company_domain}</p>
                      <div className="flex gap-1 mt-1">
                        {emp.verifications?.map(v => (
                          <span key={v.id} className={`text-[10px] px-2 py-0.5 rounded-full ${v.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {v.verification_type.replace('_', ' ')}: {v.status}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        emp.global_status === 'verified' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        emp.global_status === 'blocked' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {emp.global_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {emp.global_status !== 'verified' && (
                        <button onClick={() => handleVerifyEmployer(emp.id, 'verified')} className="text-emerald-400 hover:text-emerald-300 font-medium text-sm mr-4 transition">
                          Approve
                        </button>
                      )}
                      {emp.global_status !== 'blocked' && (
                        <button onClick={() => handleVerifyEmployer(emp.id, 'blocked')} className="text-red-400 hover:text-red-300 font-medium text-sm transition">
                          Block
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
