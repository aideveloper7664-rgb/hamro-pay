import React, { useState, useEffect } from 'react';
import { Gift, Copy, Link as LinkIcon, Users, Trophy, Loader2 } from 'lucide-react';
import { ApiService } from '../lib/api';

interface ReferralViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ReferralView({ showToast }: ReferralViewProps) {
  const [referralCode, setReferralCode] = useState('HAMRO980');
  const [referralsCount, setReferralsCount] = useState(3);
  const [referralEarnings, setReferralEarnings] = useState(480);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReferralStats = async () => {
      setLoading(true);
      try {
        const res = await ApiService.getReferral();
        setReferralCode(res.referralCode);
        setReferralsCount(res.referralsCount);
        setReferralEarnings(res.referralEarnings);
      } catch (err) {
        console.error('Failed to load referral stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferralStats();
  }, []);

  const referralLink = `https://hamropay.demo/r/${referralCode.toLowerCase()}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(referralLink).then(() => {
      showToast('Referral link copied to clipboard.', 'success');
    }).catch(() => {
      showToast('Could not copy link.', 'error');
    });
  };

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 stroke-[2.5]" />
          </span>
          Refer &amp; Earn
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Invite fellow merchants to Hamro Pay and earn when their collection volume grows.
        </p>
      </header>

      {/* Referral Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Referral link builder */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center">
                <LinkIcon className="w-3.5 h-3.5" />
              </span>
              Your Branded Referral Link
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Share this unique invitation with a merchant. Rewards apply to your Hamro Cash reserves automatically after their first successful payment checkout.
            </p>

            <div className="relative">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="w-full text-xs font-semibold pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 select-all outline-none"
              />
              <button
                onClick={handleCopy}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors outline-none"
                aria-label="Copy referral link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Referrals</span>
              </div>
              <div className="text-lg font-black text-slate-800 mt-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline text-slate-400" /> : `${referralsCount} active`}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400">
                <Trophy className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Earned</span>
              </div>
              <div className="text-lg font-black text-emerald-600 mt-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline text-slate-400" /> : `Rs. ${referralEarnings.toLocaleString('en-NP')}`}
              </div>
            </div>
          </div>
        </div>

        {/* Right empty layout/social info */}
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xs flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-4">
            <Gift className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Boost Your Networks</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mb-5">
            Get Rs. 160 credited directly to your digital available reserves for every merchant that verifies their account and completes Rs. 5,000 in successful collections.
          </p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all outline-none"
          >
            <Copy className="w-4 h-4" />
            Copy Invite URL
          </button>
        </div>
      </div>
    </div>
  );
}
