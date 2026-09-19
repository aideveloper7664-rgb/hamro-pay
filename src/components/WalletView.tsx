import React, { useState, useEffect } from 'react';
import {
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck,
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
        }
      }

      if (histRes.status === 'fulfilled' && Array.isArray(histRes.value)) {
        setCreditHistory(histRes.value);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingCredits(false);
    }
  };

  useEffect(() => {
    loadCreditsData();
  }, []);

  const handleCopyUpi = () => {
    const upi = '9769516928@fam';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upi);
    }
    setIsCopiedUpi(true);
    notify('UPI ID copied to clipboard: ' + upi, 'success');
    setTimeout(() => setIsCopiedUpi(false), 2000);
  };

  const handleBuyCreditsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(buyAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      notify('Please enter a valid credit amount.', 'error');
      return;
    }

    if (!buyUtr || buyUtr.trim().length < 6) {
      notify('Please enter a valid UTR / Transaction Reference Number.', 'error');
      return;
    }

    setIsSubmittingBuy(true);
    try {
      const res = await purchaseCredits(amountNum, buyUtr.trim());
      notify(res?.message || `Credit purchase request of ₹${amountNum} submitted for verification!`, 'success');
      setIsBuyModalOpen(false);
      setBuyUtr('');
      loadCreditsData();
    } catch (err: any) {
      notify(err.message || 'Failed to submit credit purchase.', 'error');
    } finally {
      setIsSubmittingBuy(false);
    }
  };

  // Stats Calculations
  const lifetimeWithdrawn = transactions
    .filter(t => t.type === 'withdrawal' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0) + 29000;

  const lifetimeCredited = balance + lifetimeWithdrawn;
  const walletActivities = transactions.slice(0, 5);

  return (
    <div className="hp-w-root">
      <div className="hp-w-container">
        {/* Page Header */}
        <div className="hp-w-page-header">
          <div className="hp-w-page-head-left">
            <div className="hp-w-page-icon">
              <Wallet className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="hp-w-page-info">
              <h1>Wallet &amp; Credits</h1>
              <p>Manage your real-time Hamro Cash balance, active merchant credits, and cash-outs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddFunds}
              className="hp-w-panel-action"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Cash Funds
            </button>
            <button
              onClick={() => setIsBuyModalOpen(true)}
              className="hp-w-continue-btn !w-auto !py-2 !px-4 !text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Buy Credits
            </button>
          </div>
        </div>

        {/* Top Wallet Grid */}
        <div className="hp-w-wallet-grid">
          {/* Left stack: Balance cards */}
          <div className="hp-w-left-stack">
            {/* Card 1: Available Hamro Cash */}
            <div className="hp-w-cash-card">
              <div className="hp-w-cash-label">Available Hamro Cash</div>
              <div className="hp-w-cash-amount">
                ₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <button
                type="button"
                onClick={() => onViewChange('withdraw')}
                className="hp-w-withdraw-btn"
              >
                <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                Withdraw to Bank / UPI
              </button>
            </div>

            {/* Card 2: Hamro Credit Card */}
            <div className="hp-w-credit-card">
              <div className="hp-w-credit-head">
                <div className="hp-w-credit-label">
                  <span className="bolt">⚡</span>
                  Hamro Credits
                </div>
                <button
                  type="button"
                  onClick={() => setIsBuyModalOpen(true)}
                  className="hp-w-credit-plus"
                  title="Buy Hamro Credits"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="hp-w-credit-amount">
                {isLoadingCredits ? (
                  <span className="text-sm font-semibold opacity-60 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
                  </span>
                ) : (
                  `₹ ${creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                )}
              </div>
              <div className="hp-w-credit-desc">
                Maintains cashier uptime, dynamic payment link dispatching, and automated webhook triggers.
              </div>
            </div>

            {/* Card 3: Hamro Bonus Card */}
            <div className="hp-w-bonus-card">
              <div className="hp-w-bonus-head">
                <div className="hp-w-bonus-label">
                  <Sparkles className="w-3.5 h-3.5" />
                  Hamro Bonus
                </div>
                <span className="hp-w-bonus-badge">Rewards Active</span>
              </div>
              <div className="hp-w-bonus-amount">₹ 650.00</div>
              <div className="hp-w-bonus-desc">
                Bonus balance applies automatically to merchant service discounts and priority payout channels.
              </div>
            </div>
          </div>

          {/* Right stack: 4 Stat Cards + Security Summary */}
          <div className="space-y-4">
            <div className="hp-w-stats-grid">
              {/* Stat 1 */}
              <div className="hp-w-stat-card" data-accent="green">
                <div className="hp-w-stat-icon">
                  <ArrowDownLeft className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div className="hp-w-stat-label">Total Credited</div>
                <div className="hp-w-stat-value">
                  ₹ {lifetimeCredited.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>

              {/* Stat 2 */}
              <div className="hp-w-stat-card" data-accent="red">
                <div className="hp-w-stat-icon">
                  <ArrowUpRight className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div className="hp-w-stat-label">Total Withdrawn</div>
                <div className="hp-w-stat-value">
                  ₹ {lifetimeWithdrawn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>

              {/* Stat 3 */}
              <div className="hp-w-stat-card" data-accent="gold">
                <div className="hp-w-stat-icon">
                  <Clock className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div className="hp-w-stat-label">Daily Limit</div>
                <div className="hp-w-stat-value">₹ 1,00,000</div>
              </div>

              {/* Stat 4 */}
              <div className="hp-w-stat-card" data-accent="blue">
                <div className="hp-w-stat-icon">
                  <Coins className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div className="hp-w-stat-label">Credit Reserve</div>
                <div className="hp-w-stat-value">
                  ₹ {creditBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            {/* Quick Summary / Clearance Guarantee */}
            <div className="hp-w-panel">
              <div className="hp-w-panel-head">
                <div className="hp-w-panel-title flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2bf29a]" />
                  Verified Merchant Guarantee
                </div>
                <button
                  type="button"
                  onClick={() => onViewChange('withdraw')}
                  className="hp-w-panel-action"
                >
                  Withdraw Now
                </button>
              </div>
              <p className="text-xs text-[#b89fa5] leading-relaxed">
                All HamroPay merchant funds are safeguarded in RBI-approved escrow accounts. Instant UPI withdrawals clear in 5–10 minutes with end-to-end checksum verification.
              </p>
            </div>
          </div>
        </div>

        {/* Credit Purchase History Table */}
        <div className="hp-w-panel mb-6">
          <div className="hp-w-panel-head">
            <div className="hp-w-panel-title flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#ffb834]" />
              Hamro Credit History
            </div>
            <button
              type="button"
              onClick={loadCreditsData}
              className="hp-w-panel-action"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingCredits ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {creditHistory.length === 0 ? (
            <div className="hp-w-empty-state">
              <div className="hp-w-empty-icon">
                <Coins className="w-12 h-12 text-[rgba(255,45,85,0.3)]" />
              </div>
              <div className="hp-w-empty-title">No credit top-ups yet</div>
              <p className="text-xs text-[#83686e] max-w-sm font-medium">
                Click "Buy Credits" to add automated cashier uptime and checkout link routing balance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[rgba(255,45,85,0.14)] text-[10.5px] font-extrabold text-[#83686e] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">UTR / Reference</th>
                    <th className="py-2.5 px-3">Credits Added</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,45,85,0.08)] font-medium text-[#b89fa5]">
                  {creditHistory.map((item, idx) => {
                    const status = (item.status || 'completed').toLowerCase();
                    const isSuccess = status === 'completed' || status === 'approved' || status === 'success';
                    const isPending = status === 'pending';
                    const dateStr = item.date || item.created_at || item.createdAt || 'Recent';

                    return (
                      <tr key={item.id || item._id || idx} className="hover:bg-[rgba(255,45,85,0.04)] transition-colors">
                        <td className="py-3 px-3 font-bold text-[#fff2f4] flex items-center gap-2">
                          <div className="w-6.5 h-6.5 rounded-lg bg-[rgba(255,184,52,0.12)] text-[#ffb834] flex items-center justify-center">
                            <Coins className="w-3.5 h-3.5" />
                          </div>
                          {item.type || 'Credit Top-up'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#83686e] text-[11px] font-bold">{item.utr || '—'}</td>
                        <td className="py-3 px-3 font-bold text-[#2bf29a] font-mono">
                          +₹ {Number(item.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-[#83686e] text-[11px]">{dateStr}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                            isSuccess
                              ? 'bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border-[rgba(43,242,154,0.35)]'
                              : isPending
                                ? 'bg-[rgba(255,184,52,0.12)] text-[#ffb834] border-[rgba(255,184,52,0.35)]'
                                : 'bg-[rgba(255,30,75,0.12)] text-[#ff4d6d] border-[rgba(255,30,75,0.35)]'
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

        {/* Recent Wallet Activities Table */}
        <div className="hp-w-panel">
          <div className="hp-w-panel-head">
            <div className="hp-w-panel-title flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-[#ff4d6d]" />
              Recent Wallet Activities
            </div>
            <button
              type="button"
              onClick={() => onViewChange('transactions')}
              className="hp-w-panel-action"
            >
              All Transactions
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-[rgba(255,45,85,0.14)] text-[10.5px] font-extrabold text-[#83686e] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Activity</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,45,85,0.08)] font-medium text-[#b89fa5]">
                {walletActivities.map(tx => {
                  const isW = tx.type === 'withdrawal';
                  return (
                    <tr key={tx.id} className="hover:bg-[rgba(255,45,85,0.04)] transition-colors">
                      <td className="py-3 px-3 font-bold text-[#fff2f4] flex items-center gap-2">
                        <div className={`
                          w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0
                          ${isW
                            ? 'bg-[rgba(255,30,75,0.12)] text-[#ff4d6d] border border-[rgba(255,30,75,0.22)]'
                            : 'bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border border-[rgba(43,242,154,0.22)]'}
                        `}>
                          {isW ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </div>
                        {isW ? 'Withdrawal' : 'Payment received'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#83686e] text-[11px]">{tx.ref}</td>
                      <td className={`py-3 px-3 font-bold ${isW ? 'text-[#ff4d6d]' : 'text-[#2bf29a]'}`}>
                        {isW ? '−' : '+'}₹ {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-[#83686e] text-[11px]">{tx.date}</td>
                      <td className="py-3 px-3">
                        <span className={`
                          px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border
                          ${tx.status === 'Success' || tx.status === 'Completed'
                            ? 'bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border-[rgba(43,242,154,0.35)]'
                            : tx.status === 'Pending'
                              ? 'bg-[rgba(255,184,52,0.12)] text-[#ffb834] border-[rgba(255,184,52,0.35)]'
                              : 'bg-[rgba(255,30,75,0.12)] text-[#ff4d6d] border-[rgba(255,30,75,0.35)]'
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
      </div>

      {/* Buy Credits Modal */}
      {isBuyModalOpen && (
        <div className="hp-w-modal-scrim" onClick={() => setIsBuyModalOpen(false)}>
          <div className="hp-w-credit-modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="hp-w-modal-head">
              <div className="hp-w-modal-head-icon">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="hp-w-modal-head-text">
                <div className="hp-w-modal-title">Buy Hamro Credits</div>
                <p className="text-[11.5px] text-[#ff94a7] mt-0.5 font-medium">
                  Instant credit reload via UPI transfer &amp; UTR verification
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBuyModalOpen(false)}
                className="hp-w-modal-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleBuyCreditsSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="hp-w-credit-body space-y-4">
                {/* Method Option */}
                <div className="hp-w-option">
                  <div className="hp-w-option-icon">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div className="hp-w-option-body">
                    <div className="hp-w-option-title">UPI Instant Gateway</div>
                    <div className="hp-w-option-sub">
                      Transfer money using GPay, PhonePe, Paytm, or FamPay and input the 12-digit UTR below.
                    </div>
                  </div>
                  <div className="hp-w-option-radio" />
                </div>

                {/* Amount to Add */}
                <div>
                  <label className="hp-w-field-label">
                    Credit Amount to Add (₹) <span className="req">*</span>
                  </label>
                  <div className="hp-w-input-wrap">
                    <span className="hp-w-input-icon text font-black text-[#ff4d6d]">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      required
                      value={buyAmount}
                      onChange={e => setBuyAmount(e.target.value)}
                      className="hp-w-modal-input"
                      placeholder="e.g. 500"
                    />
                  </div>

                  {/* Preset Chips */}
                  <div className="flex gap-2 mt-2">
                    {['200', '500', '1000', '2500'].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setBuyAmount(amt)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          buyAmount === amt
                            ? 'bg-[rgba(255,45,85,0.18)] border-[#ff3c5f] text-white'
                            : 'bg-[rgba(12,2,6,0.6)] border-[rgba(255,45,85,0.18)] text-[#b89fa5] hover:text-white'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instructions Box */}
                <div className="p-3.5 rounded-xl bg-[rgba(255,30,75,0.08)] border border-[rgba(255,45,85,0.25)] space-y-2.5">
                  <p className="text-xs font-bold text-[#ffb8c7] leading-snug">
                    Pay ₹{buyAmount || '0'} to <span className="font-mono text-white font-black">9769516928@fam</span> and enter UTR below:
                  </p>

                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[rgba(8,1,4,0.7)] border border-[rgba(255,45,85,0.25)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#380a13] text-[#ff8ca3]">UPI ID</span>
                      <span className="text-xs font-mono font-bold text-white">9769516928@fam</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isCopiedUpi
                          ? 'bg-[#2bf29a] text-black font-extrabold'
                          : 'bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] text-white'
                      }`}
                    >
                      {isCopiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* UTR Input Field */}
                <div>
                  <label className="hp-w-field-label">
                    UTR / Bank Reference Number <span className="req">*</span>
                  </label>
                  <div className="hp-w-input-wrap">
                    <input
                      type="text"
                      required
                      placeholder="Enter 12-digit transaction UTR number"
                      value={buyUtr}
                      onChange={e => setBuyUtr(e.target.value)}
                      className="hp-w-modal-input font-mono uppercase"
                    />
                  </div>
                  <p className="text-[11px] text-[#83686e] mt-1.5 font-medium">
                    You can copy the 12-digit UTR / transaction ID from your UPI app receipt.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="hp-w-modal-foot">
                <button
                  type="button"
                  onClick={() => setIsBuyModalOpen(false)}
                  disabled={isSubmittingBuy}
                  className="hp-w-modal-btn hp-w-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBuy}
                  className="hp-w-modal-btn hp-w-btn-proceed"
                >
                  {isSubmittingBuy ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Verify &amp; Add Credits
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
