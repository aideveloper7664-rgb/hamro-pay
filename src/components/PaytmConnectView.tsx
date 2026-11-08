import React from 'react';
import { CreditCard, ArrowRight, Clock, ShieldCheck } from 'lucide-react';

interface PaytmConnectViewProps {
  onViewChange?: (view: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PaytmConnectView({
  onViewChange,
  showToast
}: PaytmConnectViewProps) {
  const handleConnectFamPay = () => {
    if (onViewChange) {
      onViewChange('fampay');
    } else if (showToast) {
      showToast('Navigating to FamPay Connect...', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8 px-4 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      <header className="text-center space-y-2">
        <div className="w-16 h-16 rounded-3xl bg-sky-500/10 text-sky-500 border border-sky-500/20 mx-auto flex items-center justify-center shadow-md">
          <CreditCard className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold mt-2">
          <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Paytm is coming soon</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-2">
          Paytm Integration in Progress
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          We are working on Paytm support. For now, please connect FamPay to receive real-time UPI payments directly into your account.
        </p>
      </header>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-slate-800">Why FamPay?</p>
            <p className="text-slate-500 leading-relaxed">
              FamPay enables 100% automated instant UPI verification via email notifications. Payments arrive straight in your FamPay account with zero middleman holding your funds.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleConnectFamPay}
            className="flex-1 py-3 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Connect FamPay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
