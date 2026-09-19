import React, { useState, useEffect } from 'react';
import { 
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, HelpCircle, 
  Coins, Copy, Check, RefreshCw, X, Sparkles, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { Transaction } from '../types';
import { 
  getCreditBalance, 
  purchaseCredits, 
  getCreditHistory, 
  CreditTransaction 
} from '../services/credits.service';

interface WalletViewProps {
  balance: number;
  transactions: Transaction[];
  onAddFunds: () => void;
  onViewChange: (view: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function WalletView({
  balance,
  transactions,
  onAddFunds,
  onViewChange,
  showToast
}: WalletViewProps) {
  // Hamro Credit State
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = useState<boolean>(true);

  // Buy Credits Modal State
  const [isBuyModalOpen, setIsBuyModalOpen] = useState<boolean>(false);
  const [buyAmount, setBuyAmount] = useState<string>('500');
  const [buyUtr, setBuyUtr] = useState<string>('');
  const [isCopiedUpi, setIsCopiedUpi] = useState<boolean>(false);
  const [isSubmittingBuy, setIsSubmittingBuy] = useState<boolean>(false);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) {
      showToast(msg, type);
    }
  };

  // Load Credit Balance and History
  const loadCreditsData = async () => {
    setIsLoadingCredits(true);
    try {
      const [balRes, histRes] = await Promise.allSettled([
        getCreditBalance(),
        getCreditHistory()
      ]);

      if (balRes.status === 'fulfilled') {
        const val = balRes.value;
        if (typeof val === 'number') {
          setCreditBalance(val);
        } else if (val && typeof val.balance === 'number') {
          setCreditBalance(val.balance);
        } else if (val && typeof val.credits === 'number') {
          setCreditBalance(val.credits);
        } else if (val?.data && typeof val.data.balance === 'number') {
          setCreditBalance(val.data.balance);
        }
      }

      if (histRes.status === 'fulfilled') {
        const val = histRes.value;
        let list: CreditTransaction[] = [];
        if (Array.isArray(val)) {
          list = val;
        } else if (Array.isArray(val?.history)) {
          list = val.history;
        } else if (Array.isArray(val?.transactions)) {
          list = val.transactions;
        } else if (Array.isArray(val?.data)) {
          list = val.data;
        }
        setCreditHistory(list);
      }
    } catch (err: any) {
      console.error('Error loading credits data:', err);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  useEffect(() => {
    loadCreditsData();
  }, []);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('9769516928@fam');
    setIsCopiedUpi(true);
    notify('UPI ID copied to clipboard!', 'success');
    setTimeout(() => setIsCopiedUpi(false), 2500);
  };

  const handleBuyCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(buyAmount);
    const utrTrimmed = buyUtr.trim();

    if (!amountNum || amountNum <= 0) {
      notify('Please enter a valid amount', 'error');
      return;
    }

    if (!utrTrimmed || utrTrimmed.length < 6) {
      notify('Please enter a valid UTR / Reference Number', 'error');
      return;
    }

    setIsSubmittingBuy(true);
    try {
      await purchaseCredits(amountNum, utrTrimmed);
      notify('Credit purchase request submitted for verification!', 'success');
      setIsBuyModalOpen(false);
      setBuyUtr('');
      await loadCreditsData();
    } catch (err: any) {
      console.error('Buy credits error:', err);
      notify(err.message || 'Failed to submit credit purchase', 'error');
    } finally {
      setIsSubmittingBuy(false);
    }
  };

  // Stats Calculations
  const lifetimeWithdrawn = transactions
    .filter(t => t.type === 'withdrawal' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0) + 29000; // base historical seed

  const lifetimeCredited = balance + lifetimeWithdrawn;

  // Filter last 4 wallet activities for the table
  const walletActivities = transactions.slice(0, 4);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </span>
            My Wallet
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage your Hamro Cash reserves and merchant credits.
          </p>
        </div>
        <button 
          onClick={onAddFunds}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/10 active:scale-95 transition-all focus:outline-none"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Add Wallet Funds
        </button>
      </header>

      {/* NEW SECTION: HAMRO CREDIT SHOWCASE CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-6 sm:p-7 border border-rose-500/20 shadow-xl">
        {/* Subtle glow background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-amber-500/5 blur-2xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                HAMRO CREDIT
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Active System
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                {isLoadingCredits ? (
                  <span className="text-slate-500 text-3xl animate-pulse">Loading...</span>
                ) : (
                  `₹ ${creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                )}
              </div>
              <span className="text-xs text-slate-400 font-medium">Credits</span>
            </div>

            <p className="text-xs text-slate-400 max-w-lg leading-relaxed font-medium">
              Hamro Credits maintain your cashier uptime and automated checkout link routing. Purchase credits anytime via UPI with instant UTR confirmation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={loadCreditsData}
              disabled={isLoadingCredits}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-all flex items-center justify-center"
              title="Refresh Credit Balance"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingCredits ? 'animate-spin text-rose-400' : ''}`} />
            </button>

            <button
              onClick={() => setIsBuyModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-sm font-black shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Buy Credits
            </button>
          </div>
        </div>
      </div>

      {/* Rebranded Wallet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Available Balance */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-700 via-rose-600 to-rose-800 text-white p-6 shadow-lg shadow-rose-600/15 flex flex-col justify-between min-h-[180px]">
          {/* Decorative design vector lines */}
          <div className="absolute top-0 right-0 w-36 h-36 -mr-8 -mt-8 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <span className="text-[10px] font-bold text-rose-200 uppercase tracking-widest block">Hamro Cash</span>
            <div className="text-3xl font-black mt-2 tracking-tight">
              Rs. {balance.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="relative z-10 flex gap-2 pt-6">
            <button 
              onClick={onAddFunds}
              className="flex-1 py-2 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all"
            >
              Add Funds
            </button>
            <button 
              onClick={() => onViewChange('withdraw')}
              className="flex-1 py-2 bg-white/15 text-white hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold transition-all"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Card 2: Rewards / Bonus */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 p-6 flex flex-col justify-between min-h-[180px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Hamro Bonus</span>
              <span className="bg-amber-100 border border-amber-300 text-amber-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Rewards Available
              </span>
            </div>
            <div className="text-2xl font-black mt-2 tracking-tight text-amber-900">Rs. 650.00</div>
            <p className="text-xs text-amber-800/80 leading-relaxed mt-2 font-medium">
              Bonus balance applies automatically to premium merchant service discounts and local reward programs.
            </p>
          </div>
        </div>

        {/* Card 3: Merchant Credits */}
        <div className="rounded-2xl bg-slate-900 text-slate-100 p-6 flex flex-col justify-between min-h-[180px] border border-slate-800 shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Merchant Credit</span>
              <span className="bg-rose-600/10 border border-rose-500/20 text-rose-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Healthy Credit
              </span>
            </div>
            <div className="text-2xl font-black mt-2 tracking-tight text-slate-100">
              ₹ {creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
              Used automatically to offset payment link transactions and standard cash-out collection fees.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Credited</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">Rs. {lifetimeCredited.toLocaleString('en-NP')}</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Lifetime wallet additions</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Withdrawn</div>
          <div className="text-lg font-black text-rose-600 tracking-tight mt-1">Rs. {lifetimeWithdrawn.toLocaleString('en-NP')}</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Completed cash-outs</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily Limit</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">Rs. 50,000</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Maximum daily UPI withdrawal</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credit Reserve</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">₹ {creditBalance.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Available Hamro Credits</p>
        </div>
      </div>

      {/* NEW: CREDIT TRANSACTION HISTORY SECTION */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
              <Coins className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-sm font-bold text-slate-800">
              Hamro Credit History
            </h2>
          </div>
          <button
            onClick={loadCreditsData}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCredits ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {creditHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No credit purchases recorded yet. Click "Buy Credits" to add funds.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">UTR / Reference</th>
                  <th className="py-2.5">Credits Added</th>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {creditHistory.map((item, idx) => {
                  const status = (item.status || 'completed').toLowerCase();
                  const isSuccess = status === 'completed' || status === 'approved' || status === 'success';
                  const isPending = status === 'pending';
                  const dateStr = item.date || item.created_at || item.createdAt || 'Recent';

                  return (
                    <tr key={item.id || item._id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 flex items-center gap-2 font-bold text-slate-800">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Coins className="w-3.5 h-3.5" />
                        </div>
                        {item.type || 'Credit Top-up'}
                      </td>
                      <td className="py-3 font-mono text-slate-500 font-bold">{item.utr || '—'}</td>
                      <td className="py-3 font-bold text-emerald-600 font-mono">
                        +₹ {Number(item.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-slate-500">{dateStr}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wide border ${
                          isSuccess
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isPending
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {item.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity table panel */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
            Wallet Activity logs
          </h2>
          <button 
            onClick={() => onViewChange('transactions')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
          >
            All Transactions
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5">Activity</th>
                <th className="py-2.5">Reference</th>
                <th className="py-2.5">Amount</th>
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {walletActivities.map(tx => {
                const isW = tx.type === 'withdrawal';
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 flex items-center gap-2 font-bold text-slate-800">
                      <div className={`
                        w-6 h-6 rounded-lg flex items-center justify-center
                        ${isW ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}
                      `}>
                        {isW ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                      </div>
                      {isW ? 'Withdrawal' : 'Payment received'}
                    </td>
                    <td className="py-3 font-mono text-slate-400">{tx.ref}</td>
                    <td className={`py-3 font-bold ${isW ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isW ? '−' : '+'}Rs. {tx.amount.toLocaleString('en-NP')}
                    </td>
                    <td className="py-3 text-slate-500">{tx.date}</td>
                    <td className="py-3">
                      <span className={`
                        px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wide leading-none border
                        ${tx.status === 'Success' || tx.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : tx.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }
                      `}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* "BUY CREDITS" MODAL */}
      {isBuyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Buy Hamro Credits</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Instant UTR Verification</p>
                </div>
              </div>
              <button
                onClick={() => setIsBuyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleBuyCredits} className="space-y-4">
              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={buyAmount}
                    onChange={e => setBuyAmount(e.target.value)}
                    placeholder="Enter amount in INR"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold text-sm focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>

                {/* Preset Chips */}
                <div className="flex gap-2 mt-2">
                  {['200', '500', '1000', '2500'].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBuyAmount(amt)}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all ${
                        buyAmount === amt
                          ? 'bg-rose-50 border-rose-400 text-rose-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions Notice with exact requested text */}
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-rose-900 leading-snug">
                  Pay ₹{buyAmount || '0'} to <span className="font-mono text-rose-700 font-black">9769516928@fam</span> and enter UTR below
                </p>

                {/* UPI Box with Copy button */}
                <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-rose-200">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">UPI ID</span>
                    <span className="text-xs font-mono font-bold text-slate-800">9769516928@fam</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      isCopiedUpi
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isCopiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedUpi ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* UTR Input Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  UTR / Reference Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter 12-digit transaction UTR number"
                  value={buyUtr}
                  onChange={e => setBuyUtr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs focus:outline-none focus:border-rose-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  You can find the 12-digit UTR in your UPI app transaction details.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBuyModalOpen(false)}
                  disabled={isSubmittingBuy}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBuy}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-extrabold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingBuy ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify &amp; Add</span>
                    </>
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
