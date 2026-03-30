import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { HiOfficeBuilding, HiGlobeAlt, HiShieldCheck, HiOutlineBadgeCheck, HiMail } from 'react-icons/hi';

export default function EmployerProfile() {
  const [loading, setLoading] = useState(false);
  const [dnsVerifying, setDnsVerifying] = useState(false);
  const [profile, setProfile] = useState({
    company_name: '',
    company_email: '',
    company_domain: '',
    company_website: '',
    company_description: '',
    industry: 'Technology',
    company_size: '1-10',
    domain_verified: false,
    credibility_score: 50.00
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);

  useEffect(() => {
    api.get('/employers/profile').then(res => {
      if (res.data.profile) setProfile(res.data.profile);
    }).catch(() => {});
  }, []);

  const update = (f, v) => setProfile(p => ({ ...p, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/employers/profile', profile);
      setProfile(data.profile);
      toast.success('Company profile saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!profile.company_email) return toast.error('Save your company email first');
    setOtpSending(true);
    try {
      const { data } = await api.post('/employers/send-otp', { email: profile.company_email });
      setOtpSent(true);
      toast.success('OTP Sent!');
      
      // Since you haven't put actual email SMTP credentials, our backend securely returns it in dev mode!
      if (data.otp_dev) {
        toast('Since SMTP is off, your OTP is: ' + data.otp_dev, { duration: 8000, icon: '🔧' });
      }
    } catch (err) {
      toast.error('Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpInput.length !== 6) return toast.error('Enter 6 digit OTP');
    setOtpVerifying(true);
    try {
      await api.post('/employers/verify-otp', { email: profile.company_email, otp: otpInput });
      toast.success('Email successfully verified! (+Credibility gain)');
      setProfile(p => ({ ...p, email_verified: true }));
      setOtpSent(false); // reset
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or Expired OTP');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleDNSVerify = async () => {
    if (!profile.company_domain) return toast.error('Save your company domain first');
    setDnsVerifying(true);
    try {
      const { data } = await api.post('/employers/verify-domain', { domain: profile.company_domain });
      if (data.verified) {
        toast.success('Domain verified successfully! (+Credibility gain)');
        setProfile(p => ({ ...p, domain_verified: true }));
      } else {
        toast.error('DNS Verification Failed: No MX/A records found for this domain', { duration: 5000 });
      }
    } catch (err) {
      toast.error('DNS Verification service unavailable');
    } finally {
      setDnsVerifying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <HiOfficeBuilding className="w-8 h-8 text-indigo-400" />
            Company Profile
          </h1>
          <p className="text-slate-400 mt-2">Complete your profile to post jobs and build trust with students.</p>
        </div>
        
        {/* Credibility Badge */}
        <div className="glass px-6 py-4 rounded-2xl border border-indigo-500/20 text-center animate-slide-up">
          <p className="text-sm text-slate-400 mb-1">Credibility Score</p>
          <div className="flex items-center gap-2 justify-center text-2xl font-bold text-emerald-400">
            <HiShieldCheck className="w-6 h-6" /> {profile.credibility_score}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-4">Core Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company Name *</label>
                <input
                  required value={profile.company_name || ''} onChange={e => update('company_name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none transition"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company Email *</label>
                <input
                  type="email" required value={profile.company_email || ''} onChange={e => update('company_email', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none transition"
                  placeholder="hr@acmecorp.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Domain Name *</label>
                <div className="relative">
                  <HiGlobeAlt className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required value={profile.company_domain || ''} onChange={e => update('company_domain', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none transition"
                    placeholder="acmecorp.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">External Website</label>
                <input
                  type="url" value={profile.company_website || ''} onChange={e => update('company_website', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none transition"
                  placeholder="https://acmecorp.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Industry</label>
                <input
                  value={profile.industry || ''} onChange={e => update('industry', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none transition"
                  placeholder="e.g. FinTech, SaaS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company Size</label>
                <select
                  value={profile.company_size || '1-10'} onChange={e => update('company_size', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none transition"
                >
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-200">51-200 Employees</option>
                  <option value="201-500">201-500 Employees</option>
                  <option value="500+">500+ Employees</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Company Description</label>
              <textarea
                value={profile.company_description || ''} onChange={e => update('company_description', e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-indigo-500 outline-none h-32 resize-none transition"
                placeholder="What exactly does your company do? What do you value?"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Verification Section */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="glass rounded-2xl p-6 border-t-4 border-indigo-500">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <HiOutlineBadgeCheck className="w-6 h-6 text-indigo-400" />
              Domain Validation
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Verify your company's web domain (DNS records) to boost your credibility score and bypass standard scam flags.
            </p>
            
            {profile.domain_verified ? (
              <div className="w-full py-2 bg-emerald-500/20 text-emerald-400 font-medium rounded-lg text-center flex justify-center items-center gap-2">
                <HiShieldCheck className="w-5 h-5" /> Verified
              </div>
            ) : (
              <button 
                onClick={handleDNSVerify} disabled={dnsVerifying}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
              >
                {dnsVerifying ? 'Checking DNS...' : 'Verify DNS Records'}
              </button>
            )}
          </div>
          
          <div className="glass rounded-2xl p-6 border-t-4 border-cyan-500 animate-slide-up" style={{ animationDelay: '200ms' }}>
             <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <HiMail className="w-6 h-6 text-cyan-400" />
              Official Email
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Verify your official company email address ({profile.company_email || 'save profile first'}).
            </p>

            {profile.email_verified ? (
              <div className="w-full py-2 bg-emerald-500/20 text-emerald-400 font-medium rounded-lg text-center flex justify-center items-center gap-2">
                <HiShieldCheck className="w-5 h-5" /> Verified
              </div>
            ) : !otpSent ? (
              <button 
                onClick={handleSendOTP} disabled={otpSending}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
              >
                {otpSending ? 'Sending OTP...' : 'Send Verification Code'}
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-white focus:border-cyan-500 outline-none text-center tracking-widest text-lg"
                  maxLength={6}
                />
                <button 
                  onClick={handleVerifyOTP} disabled={otpVerifying}
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition"
                >
                  {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
