import React, { useState } from 'react';
import { ArrowUp, Wallet, Shield, Check, Info } from 'lucide-react';

interface WithdrawViewProps {
  balance: number;
  onWithdrawSubmit: (amount: number, upi: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function WithdrawView({
  balance,
  onWithdrawSubmit,
  showToast
}: WithdrawViewProps) {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    const trimmedUpi = upiId.trim();

    if (!amount || amount < 100) {
      showToast('Minimum payout request is Rs. 100.', 'error');
      return;
    }

    if (amount > balance) {
      showToast('Withdrawal amount exceeds your available Hamro Cash.', 'error');
      return;
    }

    if (!trimmedUpi) {
      showToast('Please enter a valid UPI address.', 'error');
      return;
    }

    onWithdrawSubmit(amount, trimmedUpi);
    setWithdrawAmount('');
    setUpiId('');
  };

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </span>
          UPI Withdrawal
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Submit instant real-time settlement transfers to your verified local address.
        </p>
      </header>

      {/* Main Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-6 items-start">
        {/* Left column: Form block */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center">
                <ArrowUp className="w-3.5 h-3.5" />
              </span>
              Settlement Request
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount */}
            <div className="space-y-2">
              <label htmlFor="withdrawAmount" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Amount to Cash Out
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-extrabold text-sm">
                  Rs.
                </span>
                <input
                  id="withdrawAmount"
                  type="number"
                  min="100"
                  step="1"
                  placeholder="Minimum Rs. 100"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-semibold"
                  required
                />
              </div>
            </div>

            {/* UPI ID */}
            <div className="space-y-2">
              <label htmlFor="withdrawUpi" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                UPI Address (Virtual Payment Address)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-extrabold text-sm">
                  @
                </span>
                <input
                  id="withdrawUpi"
                  type="text"
                  placeholder="name@bank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full text-sm pl-9 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-semibold"
                  required
                />
              </div>
            </div>

            {/* Warn Notice Box */}
            <div className="flex gap-3 bg-amber-50/50 border border-amber-200 text-amber-900/80 rounded-2xl p-4 text-xs leading-relaxed font-semibold">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Payout settlements undergo standard automated compliance clearance. Payout reserves update instantly on your demo wallet ledger.
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-600/15 active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-rose-500/20"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              Submit Settlement Payout
            </button>
          </form>
        </div>

        {/* Right column: Wallet Payout details */}
        <aside className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </span>
              Settlement Ledger Summary
            </h2>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
            <div className="flex justify-between items-center py-3">
              <span>Available Hamro Cash</span>
              <b className="text-slate-800 text-sm font-black">
                Rs. {balance.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
              </b>
            </div>
            <div className="flex justify-between items-center py-3">
              <span>Daily UPI payout limit</span>
              <b className="text-slate-800">Rs. 50,000</b>
            </div>
            <div className="flex justify-between items-center py-3">
              <span>Standard clearance speed</span>
              <b className="text-slate-800">Under 24 hours</b>
            </div>
          </div>

          {/* Secure Notice Box */}
          <div className="flex gap-3 bg-emerald-50/50 border border-emerald-100 text-emerald-900/80 rounded-2xl p-4 text-xs leading-relaxed font-semibold">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              ISO-grade secure transaction tunnels protect your merchant payouts. Settlement is only sent to the specific UPI address verified in this form.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
