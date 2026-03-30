import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { HiUserGroup, HiBriefcase, HiOfficeBuilding, HiAcademicCap } from 'react-icons/hi';

export default function CDCDashboard() {
  const [activeTab, setActiveTab] = useState('employer_bids');
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simple form state for batch creation
  const [newBatch, setNewBatch] = useState({ name: '', graduation_year: 2024, department: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, stuRes] = await Promise.all([
        api.get('/cdc/employer-requests'),
        api.get('/cdc/students')
        // batches can be added or merged later. The backend has the POST endpoint, you can test it directly!
      ]);
      setRequests(reqRes.data.requests || []);
      setStudents(stuRes.data.students || []);
    } catch (err) {
      toast.error('Failed to load CDC Data (You must be assigned to a college CDC Admin profile first)');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cdc/batches', newBatch);
      toast.success('Batch created securely in your isolated college silo!');
      setNewBatch({ name: '', graduation_year: 2024, department: '' });
    } catch (err) {
      toast.error('Failed to create batch');
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading your Private CDC Silo...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <HiAcademicCap className="w-8 h-8 text-indigo-400" />
          College CDC Headquarters
        </h1>
        <p className="text-slate-400 mt-2">Manage your college's students, batches, and incoming employer placement bids securely.</p>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('employer_bids')}
          className={`px-6 py-2.5 rounded-xl font-medium transition ${activeTab === 'employer_bids' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Employer Access Requests
        </button>
        <button 
          onClick={() => setActiveTab('students')}
          className={`px-6 py-2.5 rounded-xl font-medium transition ${activeTab === 'students' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Student Registry
        </button>
        <button 
          onClick={() => setActiveTab('batches')}
          className={`px-6 py-2.5 rounded-xl font-medium transition ${activeTab === 'batches' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Manage Batches
        </button>
      </div>

      {activeTab === 'employer_bids' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.length === 0 ? (
             <div className="col-span-full text-center py-16 glass rounded-2xl animate-fade-in text-slate-400">
               No pending employer access requests for your college right now.
             </div>
          ) : (
             requests.map(req => (
               <div key={req.id} className="glass p-6 rounded-2xl border border-indigo-500/20 animate-slide-up">
                 <HiOfficeBuilding className="w-8 h-8 text-slate-500 mb-3" />
                 <h3 className="font-bold text-lg text-white mb-1">{req.employer?.company_name}</h3>
                 <p className="text-sm text-slate-400 mb-4">{req.employer?.company_domain}</p>
                 <div className="flex gap-2">
                   <button className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium py-2 rounded-lg transition border border-emerald-500/20">
                     Approve B2B Link
                   </button>
                   <button className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium py-2 rounded-lg transition border border-red-500/20">
                     Reject Link
                   </button>
                 </div>
               </div>
             ))
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="glass rounded-2xl overflow-hidden animate-fade-in border border-slate-700">
          <table className="w-full text-left">
            <thead className="bg-slate-800/80 text-slate-400 text-sm">
              <tr>
                <th className="p-4 font-medium">Student Name</th>
                <th className="p-4 font-medium">Enrollment No.</th>
                <th className="p-4 font-medium">Department</th>
                <th className="p-4 font-medium">Batch</th>
                <th className="p-4 font-medium text-right">CGPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-4 text-white font-medium">{s.user?.full_name}</td>
                  <td className="p-4 text-slate-300 font-mono text-sm">{s.enrollment_number}</td>
                  <td className="p-4 text-slate-400">{s.department}</td>
                  <td className="p-4 text-slate-400">{s.batch_year}</td>
                  <td className="p-4 text-emerald-400 font-bold text-right">{s.cgpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'batches' && (
        <form onSubmit={handleCreateBatch} className="glass p-8 rounded-2xl border border-slate-700 max-w-lg mx-auto animate-slide-up">
           <h3 className="text-xl font-bold text-white mb-4">Create Targeted Batch</h3>
           <p className="text-sm text-slate-400 mb-6">Create precise batches so you can restrict which Jobs are visible to whom!</p>
           
           <div className="space-y-4">
             <div>
               <label className="text-sm text-slate-400 mb-1 block">Batch Custom Alias</label>
               <input required value={newBatch.name} onChange={e => setNewBatch({...newBatch, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white" placeholder="e.g. 2025 Accelerated CS Program" />
             </div>
             <div>
               <label className="text-sm text-slate-400 mb-1 block">Graduation Year</label>
               <input required type="number" value={newBatch.graduation_year} onChange={e => setNewBatch({...newBatch, graduation_year: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
             </div>
             <div>
               <label className="text-sm text-slate-400 mb-1 block">Department Scope</label>
               <input required value={newBatch.department} onChange={e => setNewBatch({...newBatch, department: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white" placeholder="Computer Science" />
             </div>
             <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-lg transition mt-4">
               Securely Establish Batch
             </button>
           </div>
        </form>
      )}
    </div>
  );
}
