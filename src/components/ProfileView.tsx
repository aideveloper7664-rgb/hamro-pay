import React, { useState } from 'react';
import { User, Mail, Smartphone, ShieldCheck, Edit, HelpCircle, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { MerchantProfile } from '../types';

interface ProfileViewProps {
  profile: MerchantProfile;
  onProfileSave: (updated: MerchantProfile) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ProfileView({
  profile,
  onProfileSave,
  showToast
}: ProfileViewProps) {
  const getStoredMerchant = () => {
    try {
      return JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
    } catch {
      return {};
    }
  };

  const stored = getStoredMerchant();
  const [name, setName] = useState(stored.name || profile.name);
  const [email, setEmail] = useState(stored.email || profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [emailReceipts, setEmailReceipts] = useState(profile.emailReceipts);
  const [withdrawalAlerts, setWithdrawalAlerts] = useState(profile.withdrawalAlerts);
  const [showApiKey, setShowApiKey] = useState(false);

  const apiKey = stored.api_key || '';

  const getInitials = (n: string) => {
    return n.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'HP';
  };

  const handleCopyApiKey = () => {
    if (!apiKey) {
      showToast('No API key found in merchant credentials.', 'error');
      return;
    }
    navigator.clipboard?.writeText(apiKey).then(() => {
      showToast('API key copied to clipboard.', 'success');
    }).catch(() => {
      showToast('Failed to copy API key.', 'error');
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Enter a valid name and email address.', 'error');
      return;
    }

    onProfileSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      emailReceipts,
      withdrawalAlerts
    });
    showToast('Merchant profile details saved successfully.', 'success');
  };

  const handleToggleReceipts = () => {
    const newVal = !emailReceipts;
    setEmailReceipts(newVal);
    onProfileSave({
      name,
      email,
      phone,
      emailReceipts: newVal,
      withdrawalAlerts
    });
    showToast(`Email receipts ${newVal ? 'enabled' : 'disabled'}.`, 'info');
  };

  const handleToggleAlerts = () => {
    const newVal = !withdrawalAlerts;
    setWithdrawalAlerts(newVal);
    onProfileSave({
      name,
      email,
      phone,
      emailReceipts,
      withdrawalAlerts: newVal
    });
    showToast(`Withdrawal alerts ${newVal ? 'enabled' : 'disabled'}.`, 'info');
  };

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
            <User className="w-5 h-5 stroke-[2.5]" />
          </span>
          Merchant Profile
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Review and update your public merchant credentials and notification thresholds.
        </p>
      </header>

      {/* Profile Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-6 items-start">
        {/* Left Form Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </span>
              Account Information
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="profileName" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Full Merchant Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  id="profileName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-semibold"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="profileEmail" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input
                  id="profileEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-semibold"
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <label htmlFor="profilePhone" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Smartphone className="w-4.5 h-4.5" />
                </span>
                <input
                  id="profilePhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-semibold"
                />
              </div>
            </div>

            {/* Merchant API Key */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Merchant API Key
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Key className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={showApiKey ? (apiKey || 'Not generated') : `${apiKey ? apiKey.slice(0, 8) : ''}••••••••••••••••••••••••`}
                    className="w-full text-xs font-mono pl-11 pr-10 py-3 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 font-bold focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                    title={showApiKey ? 'Hide key' : 'Show key'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCopyApiKey}
                  className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Include in the <code className="text-rose-600 font-mono font-semibold">x-api-key</code> header for all merchant API requests.
              </p>
            </div>

            {/* Save Profile Button */}
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs tracking-wider rounded-xl shadow-md shadow-rose-600/10 active:scale-[0.98] transition-all focus:outline-none"
            >
              Save Profile Changes
            </button>
          </form>
        </div>

        {/* Right Avatar Card and Toggles */}
        <aside className="space-y-6">
          {/* Avatar Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white font-bold text-lg flex items-center justify-center border-4 border-rose-100 mx-auto mb-3 shadow-md shrink-0">
              {getInitials(name)}
            </div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">{name}</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">{email}</p>

            <button
              onClick={() => showToast('Avatar updates are deactivated in this standalone demonstration.', 'info')}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 mt-4 active:scale-95 transition-all outline-none"
            >
              <Edit className="w-3.5 h-3.5" />
              Change Avatar
            </button>
          </div>

          {/* Toggle Switches */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-100 mb-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Notification Channels</h4>
            </div>

            {/* Receipts Toggle */}
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0 flex-1">
                <b className="text-xs font-bold text-slate-800 block">Email Receipts</b>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5 leading-snug">
                  Transmit immediate checkout invoice summaries after each payment collection.
                </span>
              </div>
              <button
                onClick={handleToggleReceipts}
                className={`
                  w-10 h-6 rounded-full p-0.5 transition-all outline-none relative shrink-0 cursor-pointer
                  ${emailReceipts ? 'bg-rose-600' : 'bg-slate-200'}
                `}
                aria-label="Toggle email receipts"
              >
                <div className={`
                  w-5 h-5 rounded-full bg-white shadow-xs transition-all transform
                  ${emailReceipts ? 'translate-x-4' : 'translate-x-0'}
                `} />
              </button>
            </div>

            {/* Alerts Toggle */}
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0 flex-1">
                <b className="text-xs font-bold text-slate-800 block">Withdrawal Alerts</b>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5 leading-snug">
                  Receive system logs and notification bells when payout settlements clear.
                </span>
              </div>
              <button
                onClick={handleToggleAlerts}
                className={`
                  w-10 h-6 rounded-full p-0.5 transition-all outline-none relative shrink-0 cursor-pointer
                  ${withdrawalAlerts ? 'bg-rose-600' : 'bg-slate-200'}
                `}
                aria-label="Toggle withdrawal alerts"
              >
                <div className={`
                  w-5 h-5 rounded-full bg-white shadow-xs transition-all transform
                  ${withdrawalAlerts ? 'translate-x-4' : 'translate-x-0'}
                `} />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
