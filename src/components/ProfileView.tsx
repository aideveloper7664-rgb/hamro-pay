import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Smartphone, 
  ShieldCheck, 
  Edit, 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Check, 
  Bell, 
  Lock, 
  ExternalLink,
  Code,
  CreditCard,
  Save,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { MerchantProfile } from '../types';

interface ProfileViewProps {
  profile: MerchantProfile;
  onProfileSave: (updated: MerchantProfile) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
}

export default function ProfileView({
  profile,
  onProfileSave,
  showToast,
  onViewChange
}: ProfileViewProps) {
  const getStoredMerchant = () => {
    try {
      return JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
    } catch {
      return {};
    }
  };

  const stored = getStoredMerchant();
  const [name, setName] = useState(stored.name || profile.name || 'Merchant');
  const [email, setEmail] = useState(stored.email || profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [emailReceipts, setEmailReceipts] = useState(profile.emailReceipts ?? true);
  const [withdrawalAlerts, setWithdrawalAlerts] = useState(profile.withdrawalAlerts ?? true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const apiKey = stored.api_key || 'hp_live_8f3c9a2b7e4d1f8a3c9b2e7d4f1a8c3b9e2d7f4a';

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (n.slice(0, 2) || 'HP').toUpperCase();
  };

  const handleCopyApiKey = () => {
    if (!apiKey) {
      showToast('No API key found in merchant credentials.', 'error');
      return;
    }
    navigator.clipboard?.writeText(apiKey).then(() => {
      setCopiedKey(true);
      showToast('API key copied to clipboard!', 'success');
      setTimeout(() => setCopiedKey(false), 2000);
    }).catch(() => {
      showToast('Failed to copy API key.', 'error');
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Please enter a valid name and email address.', 'error');
      return;
    }

    const updated: MerchantProfile = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      emailReceipts,
      withdrawalAlerts
    };

    try {
      const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      merchant.name = name.trim();
      merchant.email = email.trim();
      localStorage.setItem('hamropay_merchant', JSON.stringify(merchant));
    } catch {
      // Ignore
    }

    onProfileSave(updated);
    showToast('Merchant profile details updated successfully.', 'success');
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
    showToast(`Settlement alerts ${newVal ? 'enabled' : 'disabled'}.`, 'info');
  };

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both] max-w-6xl mx-auto pb-12 px-4 sm:px-6 pt-2">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(255,45,85,0.15)]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff1e4b] to-[#b80028] text-white flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,30,75,0.35)]">
            <User className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Merchant Profile
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[10px] font-black border border-rose-500/30 uppercase tracking-wider">
                Account Settings
              </span>
            </div>
            <p className="text-xs text-[#b89fa5] font-medium mt-0.5">
              Manage your merchant identity, API authentication credentials, and notification channels.
            </p>
          </div>
        </div>

        {onViewChange && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onViewChange('developer')}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Code className="w-4 h-4 text-emerald-400" />
              <span>Developer Portal</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange('fampay')}
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CreditCard className="w-4 h-4 text-rose-400" />
              <span>FamPay Connect</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-6 items-start">
        {/* Left Column: Form & API Credentials */}
        <div className="space-y-6">
          {/* Account Credentials Card */}
          <div className="rounded-2xl bg-gradient-to-b from-[rgba(24,6,10,0.9)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,45,85,0.12)] mb-6">
              <h2 className="text-sm font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-6 h-6 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </span>
                Merchant Identity
              </h2>
              <span className="text-[11px] text-[#b89fa5] font-semibold">Public Merchant Info</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <label htmlFor="profileName" className="block text-[11px] font-extrabold text-[#d4c2c7] tracking-wider uppercase">
                  Merchant Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#83686e]">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="profileName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white placeholder:text-slate-500 focus:border-[#ff1e4b] focus:ring-2 focus:ring-[#ff1e4b]/20 focus:outline-none transition-all font-semibold"
                    placeholder="e.g. Sunny Merchant"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <label htmlFor="profileEmail" className="block text-[11px] font-extrabold text-[#d4c2c7] tracking-wider uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#83686e]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="profileEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white placeholder:text-slate-500 focus:border-[#ff1e4b] focus:ring-2 focus:ring-[#ff1e4b]/20 focus:outline-none transition-all font-semibold"
                    placeholder="merchant@example.com"
                    required
                  />
                </div>
              </div>

              {/* Mobile Phone Number */}
              <div className="space-y-2">
                <label htmlFor="profilePhone" className="block text-[11px] font-extrabold text-[#d4c2c7] tracking-wider uppercase">
                  Phone / Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#83686e]">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <input
                    id="profilePhone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white placeholder:text-slate-500 focus:border-[#ff1e4b] focus:ring-2 focus:ring-[#ff1e4b]/20 focus:outline-none transition-all font-semibold"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#ff1e4b] to-[#b80028] hover:from-[#ff335c] hover:to-[#d1002e] text-white text-xs font-black tracking-wide rounded-xl shadow-[0_4px_16px_rgba(255,30,75,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* API Keys Card */}
          <div className="rounded-2xl bg-gradient-to-b from-[rgba(24,6,10,0.9)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,45,85,0.12)]">
              <h2 className="text-sm font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Key className="w-3.5 h-3.5" />
                </span>
                Merchant API Key
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Secret Auth Key
              </span>
            </div>

            <p className="text-xs text-[#b89fa5] leading-relaxed">
              Use this key in your server backend headers (<code className="text-rose-400 font-mono font-bold">x-api-key</code> or <code className="text-rose-400 font-mono font-bold">X-HamroAPI-Key</code>) for API integrations and order creation.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#83686e]">
                  <Key className="w-4 h-4 text-amber-400" />
                </span>
                <input
                  type="text"
                  readOnly
                  value={showApiKey ? apiKey : `${apiKey ? apiKey.slice(0, 8) : 'hp_live_'}••••••••••••••••••••••••`}
                  className="w-full text-xs font-mono pl-10 pr-10 py-3 rounded-xl bg-black/70 border border-white/15 text-white font-bold focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition cursor-pointer"
                  title={showApiKey ? 'Hide key' : 'Show key'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyApiKey}
                className="px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-[#83686e]">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                Keep key private. Never expose in public client scripts.
              </span>
              {onViewChange && (
                <button
                  type="button"
                  onClick={() => onViewChange('developer')}
                  className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>API Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Avatar, Notifications & Status Cards */}
        <div className="space-y-6">
          {/* Avatar Profile Card */}
          <div className="rounded-2xl bg-gradient-to-b from-[rgba(24,6,10,0.9)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden">
            {/* Glowing Backdrop */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#ff1e4b] to-[#a80024] text-white font-black text-2xl flex items-center justify-center border-2 border-[#ff4d6d]/40 mx-auto mb-4 shadow-[0_0_30px_rgba(255,30,75,0.35)] shrink-0">
                {getInitials(name)}
              </div>

              <h3 className="text-lg font-black text-white tracking-tight">
                {name}
              </h3>
              <p className="text-xs text-[#b89fa5] font-medium mt-0.5 truncate max-w-xs mx-auto">
                {email}
              </p>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Active Merchant</span>
              </div>

              <div className="pt-4 mt-4 border-t border-[rgba(255,45,85,0.12)] flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => showToast('Avatar updates are saved with profile details.', 'info')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-rose-400" />
                  <span>Update Initials Avatar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notification Preferences Card */}
          <div className="rounded-2xl bg-gradient-to-b from-[rgba(24,6,10,0.9)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4">
            <div className="pb-3 border-b border-[rgba(255,45,85,0.12)]">
              <h4 className="text-xs font-black text-[#d4c2c7] uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-rose-400" />
                <span>Notification Preferences</span>
              </h4>
            </div>

            {/* Email Receipts Toggle */}
            <div className="flex items-start justify-between gap-4 py-1">
              <div className="min-w-0 flex-1 space-y-0.5">
                <b className="text-xs font-extrabold text-white block">Email Invoice Receipts</b>
                <span className="text-[11px] text-[#b89fa5] font-medium block leading-relaxed">
                  Automatically send checkout receipts to your email for each payment received.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleReceipts}
                className={`
                  w-11 h-6 rounded-full p-0.5 transition-colors outline-none relative shrink-0 cursor-pointer mt-0.5
                  ${emailReceipts ? 'bg-rose-600' : 'bg-white/15'}
                `}
                aria-label="Toggle email receipts"
              >
                <div className={`
                  w-5 h-5 rounded-full bg-white shadow-md transition-transform transform
                  ${emailReceipts ? 'translate-x-5' : 'translate-x-0'}
                `} />
              </button>
            </div>

            {/* Settlement Alerts Toggle */}
            <div className="flex items-start justify-between gap-4 py-1 border-t border-white/5 pt-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <b className="text-xs font-extrabold text-white block">Settlement &amp; Fee Alerts</b>
                <span className="text-[11px] text-[#b89fa5] font-medium block leading-relaxed">
                  Receive instant system notifications for platform fee deductions and credit updates.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAlerts}
                className={`
                  w-11 h-6 rounded-full p-0.5 transition-colors outline-none relative shrink-0 cursor-pointer mt-0.5
                  ${withdrawalAlerts ? 'bg-rose-600' : 'bg-white/15'}
                `}
                aria-label="Toggle settlement alerts"
              >
                <div className={`
                  w-5 h-5 rounded-full bg-white shadow-md transition-transform transform
                  ${withdrawalAlerts ? 'translate-x-5' : 'translate-x-0'}
                `} />
              </button>
            </div>
          </div>

          {/* Security & System Info Card */}
          <div className="rounded-2xl bg-gradient-to-b from-[rgba(24,6,10,0.9)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Security &amp; Account Protection</span>
            </div>

            <div className="text-[11.5px] text-[#b89fa5] space-y-2 leading-relaxed">
              <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px]">
                <span className="text-slate-400">Account Security</span>
                <span className="text-emerald-400 font-bold">● Active</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px]">
                <span className="text-slate-400">Direct Settlements</span>
                <span className="text-white font-bold">FamPay Cashier</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
