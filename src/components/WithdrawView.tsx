import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowDownLeft,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { requestWithdrawal } from '../services/wallet.service';

interface WithdrawViewProps {
  balance: number;
  onWithdrawSubmit: (amount: number, upi: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onViewChange?: (view: string) => void;
}

type MethodType = 'instant' | 'hours';

export default function WithdrawView({
  balance,
  onWithdrawSubmit,
  showToast,
  onViewChange
}: WithdrawViewProps) {
  // Method selection & stages
  const [selectedMethod, setSelectedMethod] = useState<MethodType>('instant');
  const [stage, setStage] = useState<1 | 2>(1);

  // Form fields
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(false);

  // Fee calculation (matches HamroPay standard reference)
  const parsedAmount = Number(withdrawAmount) || 0;
  const feeRate = selectedMethod === 'instant' ? 0.015 : 0; // 1.5% fee for Instant Payout, 0% for 24hr settlement
  const feeAmount = Math.round(parsedAmount * feeRate);
  const netAmount = Math.max(0, parsedAmount - feeAmount);

  const handleContinueToStage2 = () => {
    setStage(2);
  };

  const handleBackToStage1 = () => {
    setStage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    const trimmedUpi = upiId.trim();

    if (!amount || amount < 100) {
      showToast('Minimum payout request is ₹ 100.', 'error');
      return;
    }

    if (amount > balance) {
      showToast('Withdrawal amount exceeds your available Hamro Cash.', 'error');
      return;
    }

    if (selectedMethod === 'instant') {
      if (!trimmedUpi) {
        showToast('Please enter a valid UPI address (e.g. name@okhdfcbank).', 'error');
        return;
      }
    } else {
      if (!accountNumber.trim()) {
        showToast('Please enter your Bank Account Number.', 'error');
        return;
      }
      if (!ifscCode.trim()) {
        showToast('Please enter your Bank IFSC Code.', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const payoutDestination = selectedMethod === 'instant'
        ? trimmedUpi
        : `${accountNumber.trim()} (IFSC: ${ifscCode.trim().toUpperCase()}${bankName ? ', ' + bankName.trim() : ''})`;

      await requestWithdrawal(amount, payoutDestination);
      showToast('Withdrawal settlement submitted successfully!', 'success');
      onWithdrawSubmit(amount, payoutDestination);
      setWithdrawAmount('');
      setUpiId('');
      setAccountHolder('');
      setAccountNumber('');
      setIfscCode('');
      setBankName('');
      setStage(1);
      if (onViewChange) {
        onViewChange('wallet');
      }
    } catch (err: any) {
      showToast(err.message || 'Withdrawal failed. Please verify your details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hp-w-root">
      <div className="hp-w-container">
        {/* Page Header */}
        <div className="hp-w-page-header">
          <div className="hp-w-page-head-left">
            <div className="hp-w-page-icon">
              <ArrowDownLeft className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="hp-w-page-info">
              <h1>Withdraw Balance</h1>
              <p>Transfer your Hamro Cash earnings directly to your bank account or UPI address</p>
            </div>
          </div>
          {onViewChange && (
            <button
              onClick={() => onViewChange('wallet')}
              className="hp-w-panel-action"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Wallet
            </button>
          )}
        </div>

        {/* Withdrawal Grid */}
        <div className="hp-w-withdraw-grid">
          {/* Main Form Panel */}
          <div className="hp-w-withdraw-panel">
            <div className="hp-w-wd-head">
              <div className="hp-w-wd-head-title">Select Withdrawal Method</div>
              <div className="hp-w-balance-badge">
                Hamro Cash: <b>₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
              </div>
            </div>

            {stage === 1 ? (
              /* STAGE 1: Method selection */
              <div>
                <div className="hp-w-method-label">Choose payout channel</div>
                <div className="hp-w-method-row">
                  {/* Option 1: Instant UPI */}
                  <div
                    className={`hp-w-method-chip ${selectedMethod === 'instant' ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod('instant')}
                  >
                    <div className="hp-w-method-radio" />
                    <div className="hp-w-method-icon">
                      <Sparkles className="w-4 h-4 text-[#9ab4ff]" />
                    </div>
                    <div className="hp-w-method-name">Instant Payout</div>
                    <div>
                      <span className="hp-w-method-badge instant">
                        <CheckCircle2 className="w-3 h-3" />
                        5-10 min
                      </span>
                    </div>
                  </div>

                  {/* Option 2: 24 Hours Bank Transfer */}
                  <div
                    className={`hp-w-method-chip ${selectedMethod === 'hours' ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod('hours')}
                  >
                    <div className="hp-w-method-radio" />
                    <div className="hp-w-method-icon gold">
                      <Clock className="w-4 h-4 text-[#ffb834]" />
                    </div>
                    <div className="hp-w-method-name">24 Hours Payout</div>
                    <div>
                      <span className="hp-w-method-badge hours">
                        <Clock className="w-3 h-3" />
                        No Fee
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinueToStage2}
                  className="hp-w-continue-btn"
                >
                  Continue to Transfer Details
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* STAGE 2: Payout Form Details */
              <form onSubmit={handleSubmit}>
                {/* Method Summary Header with Change Button */}
                <div className="hp-w-selected-method-card">
                  <div className={`hp-w-selected-method-icon ${selectedMethod === 'hours' ? 'gold' : ''}`}>
                    {selectedMethod === 'instant' ? (
                      <Sparkles className="w-4 h-4 text-[#9ab4ff]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#ffb834]" />
                    )}
                  </div>
                  <div className="hp-w-selected-method-body">
                    <div className="hp-w-selected-method-title">
                      {selectedMethod === 'instant' ? 'Instant Payout (UPI)' : '24 Hours Settlement (IMPS/NEFT)'}
                    </div>
                    <div>
                      {selectedMethod === 'instant' ? (
                        <span className="hp-w-selected-method-badge instant">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Clearance 5-10 min (1.5% fee)
                        </span>
                      ) : (
                        <span className="hp-w-selected-method-badge hours">
                          <Clock className="w-2.5 h-2.5" />
                          Zero Fee • Under 24h
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToStage1}
                    className="hp-w-change-btn"
                  >
                    Change
                  </button>
                </div>

                {/* Amount Field */}
                <div className="hp-w-field">
                  <label htmlFor="withdrawAmount" className="hp-w-field-label">
                    Amount to Cash Out <span className="req">*</span>
                  </label>
                  <div className="hp-w-input-wrap-f">
                    <span className="hp-w-input-icon-f text">₹</span>
                    <input
                      id="withdrawAmount"
                      type="number"
                      min="100"
                      max={balance}
                      step="1"
                      placeholder="Minimum ₹ 100"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="hp-w-input-field"
                      required
                    />
                  </div>
                  {balance > 0 && (
                    <div className="flex gap-2 mt-2">
                      {[500, 1000, 2000, 5000].filter(a => a <= balance).map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setWithdrawAmount(preset.toString())}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[rgba(255,45,85,0.08)] hover:bg-[rgba(255,45,85,0.18)] border border-[rgba(255,45,85,0.2)] text-[#ff8ca3] transition-all"
                        >
                          ₹ {preset}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(Math.floor(balance).toString())}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[rgba(43,242,154,0.1)] hover:bg-[rgba(43,242,154,0.2)] border border-[rgba(43,242,154,0.3)] text-[#2bf29a] transition-all"
                      >
                        Max All
                      </button>
                    </div>
                  )}
                </div>

                {/* Conditional Fields based on channel */}
                {selectedMethod === 'instant' ? (
                  <div className="hp-w-field">
                    <label htmlFor="withdrawUpi" className="hp-w-field-label">
                      UPI Address (VPA) <span className="req">*</span>
                    </label>
                    <div className="hp-w-input-wrap-f">
                      <span className="hp-w-input-icon-f text">@</span>
                      <input
                        id="withdrawUpi"
                        type="text"
                        placeholder="merchant@okhdfcbank or 98XXXXXXXX@paytm"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="hp-w-input-field mono"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="hp-w-field">
                      <label htmlFor="accountHolder" className="hp-w-field-label">
                        Beneficiary / Account Holder Name <span className="req">*</span>
                      </label>
                      <div className="hp-w-input-wrap-f">
                        <input
                          id="accountHolder"
                          type="text"
                          placeholder="As registered with your bank"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          className="hp-w-input-field"
                          required
                        />
                      </div>
                    </div>

                    <div className="hp-w-field">
                      <label htmlFor="accountNumber" className="hp-w-field-label">
                        Bank Account Number <span className="req">*</span>
                      </label>
                      <div className="hp-w-input-wrap-f">
                        <input
                          id="accountNumber"
                          type="text"
                          placeholder="e.g. 110023456789"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="hp-w-input-field mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="hp-w-field">
                        <label htmlFor="ifscCode" className="hp-w-field-label">
                          IFSC Code <span className="req">*</span>
                        </label>
                        <div className="hp-w-input-wrap-f">
                          <input
                            id="ifscCode"
                            type="text"
                            placeholder="e.g. HDFC0001234"
                            value={ifscCode}
                            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                            className="hp-w-input-field mono uppercase"
                            required
                          />
                        </div>
                      </div>

                      <div className="hp-w-field">
                        <label htmlFor="bankName" className="hp-w-field-label">
                          Bank Name (Optional)
                        </label>
                        <div className="hp-w-input-wrap-f">
                          <input
                            id="bankName"
                            type="text"
                            placeholder="e.g. HDFC Bank"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="hp-w-input-field"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Calculation breakdown summary */}
                {parsedAmount > 0 && (
                  <div className="hp-w-summary-box">
                    <div className="hp-w-summary-row">
                      <span>Requested Payout</span>
                      <span className="value">₹ {parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="hp-w-summary-row">
                      <span>Network Settlement Fee ({selectedMethod === 'instant' ? '1.5%' : '0%'})</span>
                      <span className={`value ${feeAmount > 0 ? 'red' : 'green'}`}>
                        {feeAmount > 0 ? `- ₹ ${feeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Free (₹ 0.00)'}
                      </span>
                    </div>
                    <div className="hp-w-summary-row total">
                      <span>Net Credit Amount</span>
                      <span className="value">₹ {netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading || parsedAmount <= 0 || parsedAmount > balance}
                  className="hp-w-withdraw-now-btn"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing Secure Transfer...
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                      Confirm & Submit Payout
                    </>
                  )}
                </button>

                {/* Warning notice box */}
                <div className="hp-w-warn-box">
                  <div className="hp-w-warn-icon">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong>Verification Notice:</strong> Ensure the recipient details match your registered business KYC name. Payouts undergo automated compliance scanning and update your Hamro Cash reserves instantly.
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Right Side: Ledger & Policy Summary */}
          <div className="hp-w-left-stack">
            {/* Hamro Cash Balance Overview Card */}
            <div className="hp-w-cash-card">
              <div className="hp-w-cash-label">Available Hamro Cash</div>
              <div className="hp-w-cash-amount">
                ₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-white/80 font-medium">
                Unrestricted funds ready for immediate disbursement to verified local accounts.
              </div>
            </div>

            {/* Payout Security & Limits Panel */}
            <div className="hp-w-panel">
              <div className="hp-w-panel-head">
                <div className="hp-w-panel-title flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2bf29a]" />
                  Settlement Guarantee & Limits
                </div>
              </div>

              <div className="divide-y divide-[rgba(255,45,85,0.12)] text-xs font-semibold">
                <div className="flex justify-between items-center py-3">
                  <span className="text-[var(--hp-w-muted)]">Daily Payout Limit</span>
                  <span className="text-[#fff2f4] font-bold">₹ 1,00,000.00</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[var(--hp-w-muted)]">Minimum Cash Out</span>
                  <span className="text-[#fff2f4] font-bold">₹ 100.00</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[var(--hp-w-muted)]">Instant UPI Speed</span>
                  <span className="text-[#2bf29a] font-bold">5 - 10 Minutes</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[var(--hp-w-muted)]">Bank IMPS / NEFT Speed</span>
                  <span className="text-[#ffb834] font-bold">Within 24 Hours</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[var(--hp-w-muted)]">Encryption & Compliance</span>
                  <span className="text-[#5b8dff] font-bold">256-Bit SSL Banking Tunnel</span>
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-[rgba(43,242,154,0.06)] border border-[rgba(43,242,154,0.25)] flex items-start gap-2.5 text-xs text-[#2bf29a] font-medium leading-relaxed">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>All settlements are processed via RBI-compliant banking gateways. Settlements are direct and irrevocable once confirmed.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
