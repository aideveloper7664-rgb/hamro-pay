import React, { useState } from 'react';
import { X, Building2, Smartphone, ArrowDownLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { requestWithdrawal } from '../services/wallet.service';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSuccess?: () => void;
}

export default function WithdrawModal({
  isOpen,
  onClose,
  availableBalance,
  showToast,
  onSuccess,
}: WithdrawModalProps) {
  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [amount, setAmount] = useState<string>('500');

  // Method 1: UPI
  const [upiId, setUpiId] = useState<string>('');

  // Method 2: Bank
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);

    if (isNaN(amt) || amt <= 0) {
      notify('Please enter a valid withdrawal amount.', 'error');
      return;
    }

    if (amt > availableBalance) {
      notify('Withdrawal amount exceeds your available Hamro Cash balance.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (method === 'upi') {
        if (!upiId || !upiId.includes('@')) {
          notify('Please enter a valid UPI ID (e.g. name@upi).', 'error');
          setIsSubmitting(false);
          return;
        }
        await requestWithdrawal({
          amount: amt,
          upi_id: upiId.trim(),
          method: 'upi'
        });
      } else {
        if (!accountHolder || !bankName || !accountNumber || !ifscCode) {
          notify('Please fill in all bank details.', 'error');
          setIsSubmitting(false);
          return;
        }
        await requestWithdrawal({
          amount: amt,
          method: 'bank',
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          ifsc_code: ifscCode.trim(),
          account_holder: accountHolder.trim()
        });
      }

      notify(`Withdrawal request of ₹${amt} submitted successfully!`, 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      notify(err?.message || 'Withdrawal request failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Withdraw Funds</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Available Cash: <strong className="text-rose-600 font-bold">₹{availableBalance.toLocaleString('en-IN')}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Method Switcher Tabs */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setMethod('upi')}
            className={`py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              method === 'upi'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>UPI Instant</span>
          </button>
          <button
            type="button"
            onClick={() => setMethod('bank')}
            className={`py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              method === 'bank'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Bank Transfer</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Amount to Withdraw (₹)
            </label>
            <input
              type="number"
              min="10"
              max={availableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              required
              className="w-full text-xs font-bold px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Method 1: UPI Input */}
          {method === 'upi' && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                UPI ID (e.g. phone/name@upi)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="merchant@upi"
                required
                className="w-full text-xs font-mono font-bold px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          )}

          {/* Method 2: Bank Inputs */}
          {method === 'bank' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Full Name as in Bank"
                  required
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank / SBI"
                  required
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    required
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                    required
                    className="w-full text-xs font-mono font-bold uppercase px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-rose-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Request...</span>
              </>
            ) : (
              <>
                <span>Submit Withdrawal Request</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
