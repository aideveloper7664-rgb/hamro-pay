import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, Users, Gift, RefreshCw, Loader2, ArrowUpRight, Award, UserCheck } from 'lucide-react';
import { getReferralInfo, ReferralInfo } from '../services/referral.service';

interface ReferralViewProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ReferralView({ showToast }: ReferralViewProps) {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);
  const [isCopiedUrl, setIsCopiedUrl] = useState<boolean>(false);

  const notify = (msg: string, type: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const loadReferral = async () => {
    setIsLoading(true);
    try {
      const data = await getReferralInfo();
      setInfo(data);
    } catch (err) {
      // Local fallback
      setInfo({
        referral_code: 'HPF8RJRG4',
        referral_url: 'https://hamro-pay-kilj.vercel.app/register?ref=HPF8RJRG4',
        total_referrals: 12,
        successful_referrals: 8,
        total_earnings: 2450,
        referred_merchants: [
          { id: '1', name: 'Pokhara Traders', date: '2026-09-10', status: 'Active', reward: 450 },
          { id: '2', name: 'Kathmandu Crafts', date: '2026-09-12', status: 'Active', reward: 800 },
          { id: '3', name: 'Himalaya Mart', date: '2026-09-15', status: 'Pending', reward: 0 },
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReferral();
  }, []);

  const referralCode = info?.referral_code || info?.code || 'HPF8RJRG4';
  const referralUrl = info?.referral_url || `https://hamro-pay-kilj.vercel.app/register?ref=${referralCode}`;
  const totalReferrals = info?.total_referrals ?? info?.referrals_count ?? 0;
  const successfulReferrals = info?.successful_referrals ?? 0;
  const totalEarnings = info?.total_earnings ?? info?.referralEarnings ?? 0;
  const merchantsList = info?.referred_merchants || info?.list || [];

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralCode);
    }
    setIsCopiedCode(true);
    notify('Referral code copied to clipboard!', 'success');
    setTimeout(() => setIsCopiedCode(false), 2000);
  };

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralUrl);
    }
    setIsCopiedUrl(true);
    notify('Referral URL copied to clipboard!', 'success');
    setTimeout(() => setIsCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-sky-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-sky-600/20">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </span>
            Refer &amp; Earn
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Invite merchants to HamroPay and earn <strong>18% cashback</strong> on their first deposit!
          </p>
        </div>

        <button
          onClick={loadReferral}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Hero Banner: Code & Link */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 text-white border border-sky-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-[10px] font-extrabold uppercase tracking-widest text-sky-300">
            <Gift className="w-3.5 h-3.5" />
            Merchant Partner Program
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Share your link. Earn <span className="text-sky-400">18% Cashback</span> instantly.
          </h2>
          <p className="text-xs text-sky-200/80 leading-relaxed">
            When a merchant creates an account using your referral link and makes their first cash deposit, 18% of the deposit amount is automatically credited to your wallet.
          </p>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Box 1: Referral Code */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-sky-300">
              Your Referral Code
            </label>
            <div className="flex items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-white/10">
              <span className="font-mono text-base font-black tracking-wider text-white px-2">
                {referralCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                {isCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Box 2: Referral URL */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-sky-300">
              Direct Invitation URL
            </label>
            <div className="flex items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-white/10">
              <span className="font-mono text-xs font-bold text-sky-200 truncate px-2 select-all">
                {referralUrl}
              </span>
              <button
                onClick={handleCopyUrl}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                {isCopiedUrl ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{isCopiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>TOTAL REFERRALS</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalReferrals}</div>
          <p className="text-[11px] text-slate-400">Merchants invited</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-bold">
            <span>SUCCESSFUL REFERRALS</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{successfulReferrals}</div>
          <p className="text-[11px] text-slate-400">Completed first deposit</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-sky-600 text-xs font-bold">
            <span>TOTAL EARNINGS</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹ {totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400">18% cashback rewards earned</p>
        </div>
      </div>

      {/* Referred Merchants List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-600" />
          <span>Referred Merchants Directory</span>
        </h2>

        {merchantsList.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No referred merchants yet. Share your code above to get started!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3">Merchant</th>
                  <th className="py-2.5 px-3">Date Joined</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Reward Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {merchantsList.map((m: any, idx: number) => (
                  <tr key={m.id || idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{m.name || m.merchant_name || 'Merchant User'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{m.date || m.created_at || 'Recent'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'Active' || m.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {m.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">
                      +₹{m.reward || m.commission || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
