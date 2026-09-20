import React, { useState, useEffect } from 'react';
import {
  Gift,
  ArrowRight,
  RefreshCw,
  Loader2,
  Coins,
  X,
  Sparkles
} from 'lucide-react';
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

  // Convert Bonus state
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
    const code = promoCode.trim().toUpperCase();
    if (!code || code.length < 3) {
      notify('Enter a valid promo code', 'error');
      return;
    }

    setIsApplying(true);
    try {
      const res = await applyPromo(code);
      const bonusAdded = res?.amount || res?.bonus || res?.reward || 100;
      notify(res?.message || `Promo code "${code}" applied! +₹${bonusAdded} Bonus`, 'success');
      setPromoCode('');
      loadBonus();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      notify(err?.message || 'Invalid or expired promo code', 'error');
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
    <div className="promo-container">
      {/* Page Header */}
      <div className="promo-page-header">
        <div className="promo-page-head-left">
          <div className="promo-page-icon">
            <Gift />
          </div>
          <div className="promo-page-info">
            <h1>Apply Promo Code</h1>
            <p>Redeem promotional vouchers and manage your active Hamro Bonus wallet.</p>
          </div>
        </div>

        <button
          onClick={loadBonus}
          disabled={isLoadingBonus}
          className="promo-refresh-btn"
        >
          <RefreshCw className={isLoadingBonus ? 'animate-spin' : ''} />
          <span>{isLoadingBonus ? 'Refreshing…' : 'Refresh Balance'}</span>
        </button>
      </div>

      {/* Grid: 2 Columns */}
      <div className="promo-grid">
        {/* Redeem Voucher Code */}
        <div className="redeem-card">
          <div className="redeem-head">
            <div className="redeem-icon">
              <Gift />
            </div>
            <div className="redeem-head-text">
              <div className="redeem-title">Redeem Voucher Code</div>
              <div className="redeem-sub">Instant credit to your Hamro Bonus balance</div>
            </div>
          </div>

          <form onSubmit={handleApplyPromo}>
            <div className="promo-field-label">Promo Code</div>

            <div className="code-input-wrap">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="code-input"
                placeholder="E.G. HAMRO100"
                autoComplete="off"
                spellCheck="false"
                maxLength={16}
              />
            </div>

            <button
              type="submit"
              disabled={isApplying}
              className="apply-btn"
            >
              {isApplying ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>Applying…</span>
                </>
              ) : (
                <>
                  <span>Apply Promo Code</span>
                  <ArrowRight />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Hamro Bonus Balance */}
        <div className="bonus-card">
          <div className="bonus-head">
            <div className="bonus-label">
              <Coins />
              <span>Hamro Bonus Balance</span>
            </div>
            <span className="bonus-tag">Live Wallet</span>
          </div>

          <div className="bonus-amount">
            {isLoadingBonus ? (
              <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> Loading...
              </span>
            ) : (
              `₹ ${bonusBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </div>

          <div className="bonus-desc">
            Bonus funds accumulated from promo codes and referral rewards.
          </div>

          <button
            type="button"
            onClick={() => {
              if (bonusBalance > 0) setIsConvertModalOpen(true);
            }}
            disabled={bonusBalance <= 0}
            className={`convert-btn ${bonusBalance > 0 ? 'enabled' : ''}`}
          >
            <Coins />
            <span>Convert to Credit</span>
          </button>
        </div>
      </div>

      {/* Convert Bonus Modal */}
      {isConvertModalOpen && (
        <div className="hp-w-modal-scrim" onClick={() => setIsConvertModalOpen(false)}>
          <div className="hp-w-credit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hp-w-modal-head">
              <div className="hp-w-modal-head-icon">
                <Coins />
              </div>
              <div className="hp-w-modal-head-text">
                <div className="hp-w-modal-title">Convert Bonus to Credits</div>
              </div>
              <button onClick={() => setIsConvertModalOpen(false)} className="hp-w-modal-close">
                <X />
              </button>
            </div>

            <div className="hp-w-credit-body">
              <p style={{ fontSize: '12.5px', color: 'var(--hp-w-muted, #b89fa5)', marginBottom: '14px' }}>
                Available Bonus: <strong style={{ color: '#fff' }}>₹{bonusBalance.toLocaleString('en-IN')}</strong>. Converted credits can be used for API transactions and fees.
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
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      className="hp-w-input-field"
                      required
                    />
                  </div>
                </div>

                <div className="hp-w-modal-foot" style={{ borderTop: 'none', padding: '12px 0 0' }}>
                  <button
                    type="button"
                    onClick={() => setIsConvertModalOpen(false)}
                    className="hp-w-modal-btn hp-w-btn-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConverting}
                    className="hp-w-modal-btn hp-w-btn-proceed"
                  >
                    {isConverting ? <Loader2 className="animate-spin" /> : <span>Confirm Conversion</span>}
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
