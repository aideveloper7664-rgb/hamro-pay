import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Coins,
  RefreshCw,
  Sparkles,
  Award,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  X,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { getCreditBalance, purchaseCredits, getCreditHistory, CreditTransaction } from '../services/credits.service';
import { getBonusBalance, convertBonusToCredit } from '../services/promo.service';

interface WalletViewProps {
  onViewChange: (view: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshWallet?: () => void;
}

export default function WalletView({
  onViewChange,
  showToast,
  onRefreshWallet
}: WalletViewProps) {
  // 1. Hamro Credit Balance
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);

  // 2. Hamro Bonus Balance
  const [bonusBalance, setBonusBalance] = useState<number>(0);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Modals state
  const [isBuyCreditsOpen, setIsBuyCreditsOpen] = useState<boolean>(false);
  const [isConvertBonusOpen, setIsConvertBonusOpen] = useState<boolean>(false);

  // Modal Inputs
  const [buyAmount, setBuyAmount] = useState<string>('500');
  const [buyUtr, setBuyUtr] = useState<string>('');
  const [convertBonusAmt, setConvertBonusAmt] = useState<string>('100');

  const [isSubmittingBuy, setIsSubmittingBuy] = useState<boolean>(false);
  const [isSubmittingConvert, setIsSubmittingConvert] = useState<boolean>(false);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, type);
  };

  // Load Credits and Bonus
  const fetchAllCredits = async () => {
    setIsLoadingData(true);
    try {
      const [creditRes, bonusRes, histRes] = await Promise.allSettled([
        getCreditBalance(),
        getBonusBalance(),
        getCreditHistory()
      ]);

      // 1. Credit Balance
      if (creditRes.status === 'fulfilled' && creditRes.value) {
        const val = creditRes.value;
        if (typeof val.balance === 'number') setCreditBalance(val.balance);
        else if (typeof val === 'number') setCreditBalance(val);
      }

      // 2. Bonus Balance
      if (bonusRes.status === 'fulfilled' && bonusRes.value) {
        const val = bonusRes.value;
        if (typeof val.balance === 'number') setBonusBalance(val.balance);
        else if (typeof val.bonus === 'number') setBonusBalance(val.bonus);
        else if (typeof val === 'number') setBonusBalance(val);
      }

      // 3. Credit History
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
    fetchAllCredits();
  }, []);

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
      fetchAllCredits();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      notify(err?.message || 'Failed to submit credit purchase.', 'error');
    } finally {
      setIsSubmittingBuy(false);
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
      fetchAllCredits();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      notify(err?.message || 'Failed to convert Bonus to Credits.', 'error');
    } finally {
      setIsSubmittingConvert(false);
    }
  };

  return (
    <div className="hp-w-root">
      <div className="hp-w-container">
        {/* Page Header */}
        <div className="hp-w-page-header">
          <div className="hp-w-page-head-left">
            <div className="hp-w-page-icon">
              <Zap />
            </div>
            <div className="hp-w-page-info">
              <h1>Hamro Credits &amp; Balances</h1>
              <p>Manage your Hamro Credits for platform commissions, plan upgrades, and reward bonuses</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={fetchAllCredits}
              disabled={isLoadingData}
              className="hp-w-panel-action"
              style={{ cursor: 'pointer' }}
            >
              <RefreshCw className={isLoadingData ? 'animate-spin' : ''} style={{ width: 14, height: 14 }} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsBuyCreditsOpen(true)}
              className="btn-primary"
              style={{ cursor: 'pointer', padding: '9px 16px', fontSize: '12.5px' }}
            >
              <Sparkles style={{ width: 14, height: 14 }} />
              <span>Buy Credits</span>
            </button>
          </div>
        </div>

        {/* Direct UPI Notice */}
        <div style={{
          padding: '14px 18px',
          borderRadius: '16px',
          background: 'rgba(43, 242, 154, 0.08)',
          border: '1px solid rgba(43, 242, 154, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <ShieldCheck style={{ width: 20, height: 20, color: '#2bf29a', flexShrink: 0 }} />
          <div style={{ fontSize: '12.5px', color: '#e5f9f0', lineHeight: 1.4 }}>
            <strong style={{ color: '#fff' }}>Direct UPI Settlements:</strong> Customer payments reach your connected UPI account instantly. Hamro Pay never holds your cash balance. Platform fees and plan upgrades are deducted directly from your <strong>Hamro Credits</strong>.
          </div>
        </div>

        {/* CREDITS & BONUS GRID */}
        <div className="hp-w-wallet-grid">
          {/* Left: Hamro Credit Card */}
          <div className="hp-w-left-stack">
            <div className="hp-w-credit-card" style={{ padding: '24px' }}>
              <div className="hp-w-credit-head">
                <div className="hp-w-credit-label">
                  <span className="bolt">⚡</span>
                  <span>HAMRO CREDITS</span>
                </div>
                <button
                  onClick={() => setIsBuyCreditsOpen(true)}
                  className="hp-w-credit-plus"
                  title="Buy Credits"
                >
                  <Plus />
                </button>
              </div>
              <div className="hp-w-credit-amount" style={{ fontSize: '32px', margin: '14px 0 8px' }}>
                ₹ {creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="hp-w-credit-desc" style={{ marginBottom: '18px' }}>
                Used automatically to deduct small commissions on payments and for purchasing plan upgrades.
              </div>
              <button
                onClick={() => setIsBuyCreditsOpen(true)}
                className="btn-primary"
                style={{ width: '100%', padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Sparkles style={{ width: 14, height: 14 }} />
                <span>Buy Credits Now</span>
              </button>
            </div>
          </div>

          {/* Right: Hamro Bonus & Referral Rewards */}
          <div className="hp-w-left-stack">
            {/* Hamro Bonus */}
            <div className="hp-w-bonus-card">
              <div className="hp-w-bonus-head">
                <div className="hp-w-bonus-label">
                  <Coins />
                  <span>HAMRO BONUS</span>
                </div>
                <div className="hp-w-bonus-badge">REWARDS</div>
              </div>
              <div className="hp-w-bonus-amount">
                ₹ {bonusBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="hp-w-bonus-desc" style={{ marginBottom: '12px' }}>
                Earned via promo codes, referral milestones, and vouchers. Easily convert to Hamro Credits.
              </div>
              <button
                onClick={() => setIsConvertBonusOpen(true)}
                disabled={bonusBalance <= 0}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 184, 52, 0.16)',
                  border: '1px solid rgba(255, 184, 52, 0.45)',
                  color: '#ffb834',
                  fontSize: '12px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: bonusBalance <= 0 ? 'not-allowed' : 'pointer',
                  opacity: bonusBalance <= 0 ? 0.5 : 1
                }}
              >
                <Coins style={{ width: 14, height: 14 }} />
                <span>Convert Bonus to Credit</span>
              </button>
            </div>

            {/* Referral Stats */}
            <div className="hp-w-stats-grid">
              <div className="hp-w-stat-card" data-accent="green">
                <div className="hp-w-stat-icon">
                  <Award />
                </div>
                <div className="hp-w-stat-label">PLATFORM FEE</div>
                <div className="hp-w-stat-value">
                  Zero Hold
                </div>
              </div>

              <div
                className="hp-w-stat-card"
                data-accent="gold"
                style={{ cursor: 'pointer' }}
                onClick={() => onViewChange('referral')}
              >
                <div className="hp-w-stat-icon">
                  <TrendingUp />
                </div>
                <div className="hp-w-stat-label">REFERRAL REWARDS</div>
                <div className="hp-w-stat-value">
                  Earn Credits
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Purchase & History Panel */}
        <div className="hp-w-panel">
          <div className="hp-w-panel-head">
            <div className="hp-w-panel-title">Credit Transaction History</div>
            <button
              onClick={() => onViewChange('transactions')}
              className="hp-w-panel-action"
            >
              <span>View Payment History</span>
              <ArrowUpRight style={{ width: 12, height: 12 }} />
            </button>
          </div>

          {creditHistory.length === 0 ? (
            <div className="hp-w-empty-state">
              <div className="hp-w-empty-icon">
                <Sparkles />
              </div>
              <div className="hp-w-empty-title">No Credit Transactions Yet</div>
              <div style={{ fontSize: '12px', color: 'var(--hp-w-muted)', maxWidth: 360 }}>
                Purchased credits and converted bonuses will appear here in your real-time log.
              </div>
            </div>
          ) : (
            <div className="hp-tx-table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 45, 85, 0.12)', color: 'var(--hp-w-muted-dim)', fontSize: '10.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <th style={{ padding: '10px 14px' }}>Date</th>
                    <th style={{ padding: '10px 14px' }}>Type</th>
                    <th style={{ padding: '10px 14px' }}>Amount</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>UTR / Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {creditHistory.map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(255, 45, 85, 0.08)' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--hp-w-muted)' }}>
                        {item.created_at || item.date || 'Today'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#fff' }}>
                        {item.type || 'Credit Purchase'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 900, color: '#2bf29a' }}>
                        +₹{item.amount}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '999px',
                          fontSize: '10px',
                          fontWeight: 900,
                          background: item.status === 'Completed' || item.status === 'Approved' ? 'rgba(43, 242, 154, 0.14)' : 'rgba(255, 184, 52, 0.14)',
                          color: item.status === 'Completed' || item.status === 'Approved' ? '#2bf29a' : '#ffb834',
                          border: `1px solid ${item.status === 'Completed' || item.status === 'Approved' ? 'rgba(43, 242, 154, 0.35)' : 'rgba(255, 184, 52, 0.35)'}`
                        }}>
                          {item.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#b89fa5' }}>
                        {item.utr || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* BUY CREDITS MODAL */}
      {isBuyCreditsOpen && (
        <div className="hp-w-modal-scrim" onClick={() => setIsBuyCreditsOpen(false)}>
          <div className="hp-w-credit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hp-w-modal-head">
              <div className="hp-w-modal-head-icon">
                <Sparkles />
              </div>
              <div className="hp-w-modal-head-text">
                <div className="hp-w-modal-title">Buy Hamro Credits</div>
              </div>
              <button onClick={() => setIsBuyCreditsOpen(false)} className="hp-w-modal-close">
                <X />
              </button>
            </div>

            <div className="hp-w-credit-body">
              <div style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'rgba(255, 30, 75, 0.08)',
                border: '1px solid rgba(255, 45, 85, 0.25)',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#ff94a7', marginBottom: '4px' }}>
                  UPI Payment ID
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 900, color: '#fff' }}>
                  9769516928@fam
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--hp-w-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  Pay the desired amount to the UPI ID above, then enter the 12-digit UTR reference number below for instant credit.
                </p>
              </div>

              <form onSubmit={handleBuyCreditsSubmit}>
                <div className="hp-w-field">
                  <div className="hp-w-field-label">
                    <span>Credit Amount (₹)</span>
                    <span className="req">*</span>
                  </div>
                  <div className="hp-w-input-wrap-f">
                    <input
                      type="number"
                      min="50"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      className="hp-w-input-field"
                      placeholder="500"
                      required
                    />
                  </div>
                </div>

                <div className="hp-w-field">
                  <div className="hp-w-field-label">
                    <span>12-Digit UTR / Reference Number</span>
                    <span className="req">*</span>
                  </div>
                  <div className="hp-w-input-wrap-f">
                    <input
                      type="text"
                      maxLength={12}
                      value={buyUtr}
                      onChange={(e) => setBuyUtr(e.target.value.replace(/[^0-9]/g, ''))}
                      className="hp-w-input-field mono"
                      placeholder="e.g. 423456789012"
                      required
                    />
                  </div>
                </div>

                <div className="hp-w-modal-foot" style={{ borderTop: 'none', padding: '12px 0 0' }}>
                  <button
                    type="button"
                    onClick={() => setIsBuyCreditsOpen(false)}
                    className="hp-w-modal-btn hp-w-btn-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBuy}
                    className="hp-w-modal-btn hp-w-btn-proceed"
                  >
                    {isSubmittingBuy ? <Loader2 className="animate-spin" /> : <span>Submit UTR</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CONVERT BONUS MODAL */}
      {isConvertBonusOpen && (
        <div className="hp-w-modal-scrim" onClick={() => setIsConvertBonusOpen(false)}>
          <div className="hp-w-credit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hp-w-modal-head">
              <div className="hp-w-modal-head-icon">
                <Coins />
              </div>
              <div className="hp-w-modal-head-text">
                <div className="hp-w-modal-title">Convert Bonus to Credits</div>
              </div>
              <button onClick={() => setIsConvertBonusOpen(false)} className="hp-w-modal-close">
                <X />
              </button>
            </div>

            <div className="hp-w-credit-body">
              <p style={{ fontSize: '12.5px', color: 'var(--hp-w-muted)', marginBottom: '14px' }}>
                Available Bonus: <strong style={{ color: '#fff' }}>₹{bonusBalance.toLocaleString('en-IN')}</strong>
              </p>

              <form onSubmit={handleConvertBonusSubmit}>
                <div className="hp-w-field">
                  <div className="hp-w-field-label">
                    <span>Amount to Convert (₹)</span>
                    <span className="req">*</span>
                  </div>
                  <div className="hp-w-input-wrap-f">
                    <input
                      type="number"
                      min="1"
                      max={bonusBalance}
                      value={convertBonusAmt}
                      onChange={(e) => setConvertBonusAmt(e.target.value)}
                      className="hp-w-input-field"
                      required
                    />
                  </div>
                </div>

                <div className="hp-w-modal-foot" style={{ borderTop: 'none', padding: '12px 0 0' }}>
                  <button
                    type="button"
                    onClick={() => setIsConvertBonusOpen(false)}
                    className="hp-w-modal-btn hp-w-btn-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingConvert}
                    className="hp-w-modal-btn hp-w-btn-proceed"
                  >
                    {isSubmittingConvert ? <Loader2 className="animate-spin" /> : <span>Confirm Conversion</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
