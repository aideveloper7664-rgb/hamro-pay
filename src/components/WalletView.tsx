import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  Coins,
  Copy,
  RefreshCw,
  Sparkles,
  Award,
  Loader2,
  DollarSign
} from 'lucide-react';
import { Transaction } from '../types';
import { getCreditBalance, purchaseCredits, getCreditHistory, CreditTransaction } from '../services/credits.service';
import { getBonusBalance, convertBonusToCredit, convertCashToCredit } from '../services/promo.service';
import { getWalletBalance } from '../services/wallet.service';
import WithdrawModal from './WithdrawModal';

interface WalletViewProps {
  balance: number;
  transactions: Transaction[];
  onAddFunds: () => void;
  onViewChange: (view: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshWallet?: () => void;
}

export default function WalletView({
  balance,
  transactions,
  onAddFunds,
  onViewChange,
  showToast,
  onRefreshWallet
}: WalletViewProps) {
  // 1. Hamro Cash Balance
  const [cashBalance, setCashBalance] = useState<number>(balance);
  const [commissionPaid, setCommissionPaid] = useState<number>(0);

  // 2. Hamro Credit Balance
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);

  // 3. Hamro Bonus Balance
  const [bonusBalance, setBonusBalance] = useState<number>(0);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Modals state
  const [isWithdrawOpen, setIsWithdrawOpen] = useState<boolean>(false);
  const [isBuyCreditsOpen, setIsBuyCreditsOpen] = useState<boolean>(false);
  const [isConvertCashOpen, setIsConvertCashOpen] = useState<boolean>(false);
  const [isConvertBonusOpen, setIsConvertBonusOpen] = useState<boolean>(false);

  // Modal Inputs
  const [buyAmount, setBuyAmount] = useState<string>('500');
  const [buyUtr, setBuyUtr] = useState<string>('');
  const [convertCashAmt, setConvertCashAmt] = useState<string>('100');
  const [convertBonusAmt, setConvertBonusAmt] = useState<string>('100');

  const [isSubmittingBuy, setIsSubmittingBuy] = useState<boolean>(false);
  const [isSubmittingConvert, setIsSubmittingConvert] = useState<boolean>(false);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, type);
  };

  // Load all 4 wallets data
  const fetchAllWallets = async () => {
    setIsLoadingData(true);
    try {
      const [cashRes, creditRes, bonusRes, histRes] = await Promise.allSettled([
        getWalletBalance(),
        getCreditBalance(),
        getBonusBalance(),
        getCreditHistory()
      ]);

      // 1. Cash Balance & Commission
      if (cashRes.status === 'fulfilled' && cashRes.value) {
        const val = cashRes.value;
        if (typeof val.balance === 'number') setCashBalance(val.balance);
        else if (typeof val === 'number') setCashBalance(val);

        if (typeof val.commission_paid === 'number') setCommissionPaid(val.commission_paid);
        else if (typeof val.commission === 'number') setCommissionPaid(val.commission);
      }

      // 2. Credit Balance
      if (creditRes.status === 'fulfilled' && creditRes.value) {
        const val = creditRes.value;
        if (typeof val.balance === 'number') setCreditBalance(val.balance);
        else if (typeof val === 'number') setCreditBalance(val);
      }

      // 3. Bonus Balance
      if (bonusRes.status === 'fulfilled' && bonusRes.value) {
        const val = bonusRes.value;
        if (typeof val.balance === 'number') setBonusBalance(val.balance);
        else if (typeof val.bonus === 'number') setBonusBalance(val.bonus);
        else if (typeof val === 'number') setBonusBalance(val);
      }

      // Credit History
      if (histRes.status === 'fulfilled' && Array.isArray(histRes.value)) {
        setCreditHistory(histRes.value);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAllWallets();
  }, [balance]);

  // Handle Buy Credits Submit
  const handleBuyCreditsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(buyAmount);
    if (isNaN(amt) || amt <= 0) {
      notify('Please enter a valid credit purchase amount.', 'error');
      return;
    }
    if (!buyUtr || buyUtr.trim().length < 6) {
      notify('Please enter a valid 12-digit UTR number.', 'error');
      return;
    }

    setIsSubmittingBuy(true);
    try {
      const res = await purchaseCredits(amt, buyUtr.trim());
      notify(res?.message || `Credit purchase request of ₹${amt} submitted for verification!`, 'success');
      setIsBuyCreditsOpen(false);
      setBuyUtr('');
      fetchAllWallets();
    } catch (err: any) {
      notify(err?.message || 'Failed to submit credit purchase.', 'error');
    } finally {
      setIsSubmittingBuy(false);
    }
  };

  // Handle Convert Cash to Credit
  const handleConvertCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(convertCashAmt);
    if (isNaN(amt) || amt <= 0) {
      notify('Please enter a valid amount.', 'error');
      return;
    }
    if (amt > cashBalance) {
      notify('Amount exceeds your available Hamro Cash balance.', 'error');
      return;
    }

    setIsSubmittingConvert(true);
    try {
      const res = await convertCashToCredit(amt);
      notify(res?.message || `Successfully converted ₹${amt} Cash to Hamro Credits!`, 'success');
      setIsConvertCashOpen(false);
      fetchAllWallets();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      notify(err?.message || 'Failed to convert Cash to Credits.', 'error');
    } finally {
      setIsSubmittingConvert(false);
    }
  };

  // Handle Convert Bonus to Credit
  const handleConvertBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(convertBonusAmt);
    if (isNaN(amt) || amt <= 0) {
      notify('Please enter a valid amount.', 'error');
      return;
    }
    if (amt > bonusBalance) {
      notify('Amount exceeds your available Hamro Bonus balance.', 'error');
      return;
    }

    setIsSubmittingConvert(true);
    try {
      const res = await convertBonusToCredit(amt);
      notify(res?.message || `Successfully converted ₹${amt} Bonus to Hamro Credits!`, 'success');
      setIsConvertBonusOpen(false);
      fetchAllWallets();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      notify(err?.message || 'Failed to convert Bonus to Credits.', 'error');
    } finally {
      setIsSubmittingConvert(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </span>
            Wallet &amp; Balances
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage your real-time Hamro Cash, Hamro Credits, Hamro Bonus, and commission payouts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllWallets}
            disabled={isLoadingData}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsBuyCreditsOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>Buy Credits</span>
          </button>
        </div>
      </header>

      {/* 4 WALLETS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Wallet 1: HAMRO CASH */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-rose-950 text-white border border-rose-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-rose-400" />
              <span>Hamro Cash</span>
            </span>
            <span className="text-[9px] font-extrabold bg-rose-500/20 text-rose-200 border border-rose-500/30 px-2 py-0.5 rounded-full">
              Primary
            </span>
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-white">
              ₹ {cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">Real-time withdrawal balance</p>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Withdraw</span>
            </button>
            <button
              onClick={() => setIsConvertCashOpen(true)}
              className="w-full py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Coins className="w-3 h-3 text-amber-400" />
              <span>Convert to Credit</span>
            </button>
          </div>
        </div>

        {/* Wallet 2: HAMRO CREDIT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Hamro Credit</span>
            </span>
            <span className="text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              API Credits
            </span>
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900">
              ₹ {creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">Used for developer API calls</p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsBuyCreditsOpen(true)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buy Credits</span>
            </button>
          </div>
        </div>

        {/* Wallet 3: HAMRO BONUS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-purple-600" />
              <span>Hamro Bonus</span>
            </span>
            <span className="text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
              Promos
            </span>
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900">
              ₹ {bonusBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">Voucher rewards &amp; cashbacks</p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsConvertBonusOpen(true)}
              disabled={bonusBalance <= 0}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Convert to Credit</span>
            </button>
          </div>
        </div>

        {/* Wallet 4: COMMISSION PAID */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Commission Paid</span>
            </span>
            <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              Earnings
            </span>
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900">
              ₹ {commissionPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">Total referral commissions earned</p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onViewChange('referral')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Refer &amp; Earn More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Credit Purchase History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-600" />
          <span>Recent Wallet Activity &amp; Credit Transactions</span>
        </h2>

        {creditHistory.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No credit transactions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">UTR Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {creditHistory.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono">{item.created_at || item.date || 'Today'}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.type || 'Credit Purchase'}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">+₹{item.amount}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Completed' || item.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{item.utr || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WITHDRAW MODAL */}
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        availableBalance={cashBalance}
        showToast={showToast}
        onSuccess={fetchAllWallets}
      />

      {/* BUY CREDITS MODAL */}
      {isBuyCreditsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsBuyCreditsOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 text-slate-900 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Buy Hamro Credits</span>
              </h3>
              <button onClick={() => setIsBuyCreditsOpen(false)} className="text-slate-400 font-bold text-xs">✕</button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-rose-900">Payment UPI ID:</div>
              <div className="font-mono text-xs font-black text-rose-700 select-all">9769516928@fam</div>
              <p className="text-[10.5px] text-rose-800">Pay using UPI, then enter the 12-digit UTR below for instant clearance.</p>
            </div>

            <form onSubmit={handleBuyCreditsSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Credit Amount (₹)</label>
                <input
                  type="number"
                  min="50"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">12-Digit UTR / Ref Number</label>
                <input
                  type="text"
                  maxLength={12}
                  value={buyUtr}
                  onChange={(e) => setBuyUtr(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 423456789012"
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingBuy}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                {isSubmittingBuy ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit UTR Verification</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT CASH MODAL */}
      {isConvertCashOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsConvertCashOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 text-slate-900 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Convert Hamro Cash to Credit</h3>
              <button onClick={() => setIsConvertCashOpen(false)} className="text-slate-400 font-bold text-xs">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Available Cash: <strong>₹{cashBalance.toLocaleString('en-IN')}</strong>
            </p>

            <form onSubmit={handleConvertCashSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Amount to Convert (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={cashBalance}
                  value={convertCashAmt}
                  onChange={(e) => setConvertCashAmt(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingConvert}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmittingConvert ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm Conversion</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT BONUS MODAL */}
      {isConvertBonusOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsConvertBonusOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 text-slate-900 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Convert Hamro Bonus to Credit</h3>
              <button onClick={() => setIsConvertBonusOpen(false)} className="text-slate-400 font-bold text-xs">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Available Bonus: <strong>₹{bonusBalance.toLocaleString('en-IN')}</strong>
            </p>

            <form onSubmit={handleConvertBonusSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Amount to Convert (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={bonusBalance}
                  value={convertBonusAmt}
                  onChange={(e) => setConvertBonusAmt(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingConvert}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmittingConvert ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm Conversion</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
