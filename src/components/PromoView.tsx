import React, { useState, useEffect } from 'react';
import { Gift, ArrowRight, Sparkles, RefreshCw, Loader2, Coins, CheckCircle2, AlertCircle } from 'lucide-react';
import { applyPromo, getBonusBalance, convertBonusToCredit } from '../services/promo.service';

interface PromoViewProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshWallet?: () => void;
}

export default function PromoView({ showToast, onRefreshWallet }: PromoViewProps) {
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Bonus balance state
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [isLoadingBonus, setIsLoadingBonus] = useState(true);

  // Convert Bonus to Credit state
  const [convertAmount, setConvertAmount] = useState('100');
  const [isConverting, setIsConverting] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, type);
  };

  // Fetch bonus balance
  const loadBonus = async () => {
    setIsLoadingBonus(true);
    try {
      const res = await getBonusBalance();
      if (typeof res === 'number') {
        setBonusBalance(res);
      } else if (res && typeof res.balance === 'number') {
        setBonusBalance(res.balance);
      } else if (res && typeof res.bonus === 'number') {
        setBonusBalance(res.bonus);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingBonus(false);
    }
  };

  useEffect(() => {
    loadBonus();
  }, []);

  // Submit Promo Code
  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || promoCode.trim().length < 3) {
      notify('Please enter a valid promo code.', 'error');
      return;
    }

    setIsApplying(true);
    try {
      const res = await applyPromo(promoCode.trim().toUpperCase());
      const bonusAdded = res?.amount || res?.bonus || res?.reward || 100;
      notify(res?.message || `₹${bonusAdded} added to Hamro Bonus!`, 'success');
      setPromoCode('');
      loadBonus();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      notify(err?.message || 'Invalid/expired promo code', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Convert Bonus to Credit
  const handleConvertBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(convertAmount);
    if (isNaN(amt) || amt <= 0) {
      notify('Please enter a valid conversion amount.', 'error');
      return;
    }
    if (amt > bonusBalance) {
      notify('Entered amount exceeds your current Hamro Bonus balance.', 'error');
      return;
    }

    setIsConverting(true);
    try {
      const res = await convertBonusToCredit(amt);
      notify(res?.message || `Successfully converted ₹${amt} Bonus to Hamro Credits!`, 'success');
      setIsConvertModalOpen(false);
      loadBonus();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      notify(err?.message || 'Failed to convert bonus to credits.', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Page Title */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-purple-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
              <Gift className="w-5 h-5 stroke-[2.5]" />
            </span>
            Apply Promo Code
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Redeem promotional vouchers and manage your active Hamro Bonus wallet.
          </p>
        </div>

        <button
          onClick={loadBonus}
          disabled={isLoadingBonus}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBonus ? 'animate-spin' : ''}`} />
          <span>Refresh Balance</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Card 1: Apply Promo Code Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Redeem Voucher Code</h2>
              <p className="text-[11px] text-slate-400">Instant credit to your Hamro Bonus balance</p>
            </div>
          </div>

          <form onSubmit={handleApplyPromo} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Promo Code
              </label>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="e.g. HAMRO100"
                className="w-full text-xs font-mono font-bold tracking-widest px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 uppercase placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isApplying}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Apply Promo Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Hamro Bonus Wallet Box */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950 text-white border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <Coins className="w-4 h-4 text-purple-400" />
              <span>Hamro Bonus Balance</span>
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Live Wallet
            </span>
          </div>

          <div className="py-2">
            <div className="text-3xl font-black tracking-tight text-white">
              {isLoadingBonus ? (
                <span className="text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </span>
              ) : (
                `₹ ${bonusBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-[11px] text-purple-200/80 mt-1">
              Bonus funds accumulated from promo codes and referral rewards.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsConvertModalOpen(true)}
            disabled={bonusBalance <= 0}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-rose-600 hover:from-purple-600 hover:to-rose-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition shadow-lg shadow-purple-900/40 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Coins className="w-4 h-4" />
            <span>Convert to Credit</span>
          </button>
        </div>
      </div>

      {/* Convert Bonus Modal */}
      {isConvertModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsConvertModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 text-slate-900 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-purple-600" />
                <span>Convert Bonus to Hamro Credit</span>
              </h3>
              <button
                onClick={() => setIsConvertModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Available Bonus: <strong>₹{bonusBalance.toLocaleString('en-IN')}</strong>. Converted credits can be used for API transactions and fees.
            </p>

            <form onSubmit={handleConvertBonusSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Amount to Convert (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  max={bonusBalance}
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="w-full text-xs font-bold px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-purple-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConverting}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5"
                >
                  {isConverting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Confirm Convert</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
