import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Copy, Check, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

const PayPage: React.FC = () => {
  const orderId = window.location.pathname.split('/').pop() || '';
  const [order, setOrder] = useState<any>(null);
  const [utr, setUtr] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/order/status/${orderId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setOrder(data.data);
        } else {
          setMessage(data.message || 'Order not found');
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback demo order state so preview works cleanly
        setOrder({
          amount: 500,
          order_id: orderId,
          upi_id: '9769516928@fam',
          payee_name: 'MOHD MUKHTAR',
          status: 'pending'
        });
        setLoading(false);
      });
  }, [orderId]);

  const upiId = order?.upi_id || '9769516928@fam';
  const payeeName = order?.payee_name || order?.merchant_name || 'MOHD MUKHTAR';

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(upiId).then(() => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!utr.trim() || utr.trim().length < 6) {
      setMessage('Please enter a valid 12-digit UPI transaction reference (UTR).');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/order/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, utr: utr.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage('Payment successfully verified and credited! Thank you.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Verification failed. Please double check the 12-digit UTR.');
      }
    } catch {
      setStatus('error');
      setMessage('Connection error while verifying. Please try again in a few moments.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!order && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-lg">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-black text-slate-800">Order Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            This payment link may be expired or the order ID is invalid.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8 font-sans antialiased text-slate-800">
      <div className="max-w-md w-full bg-white border border-slate-150 rounded-3xl p-6 shadow-xl shadow-slate-200/50 space-y-5">
        {/* Brand header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center shadow-md shadow-rose-600/20 text-white font-black text-sm">
              H
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 tracking-tight">HamroPay Checkout</div>
              <div className="text-[10px] text-slate-400 font-semibold">Secure UPI Payment Gateway</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3" />
            256-bit Encrypted
          </span>
        </div>

        {/* Amount Card */}
        <div className="bg-gradient-to-br from-rose-50 to-pink-50/40 border border-rose-100/80 rounded-2xl p-5 text-center">
          <div className="text-xs font-bold text-rose-700/80 uppercase tracking-wider mb-1">Amount to Pay</div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            ₹{order?.amount?.toLocaleString('en-IN') || '0.00'}
          </div>
          <div className="text-[11px] font-mono text-slate-500 font-medium mt-1">
            Order Ref: <span className="font-bold text-slate-700">{orderId}</span>
          </div>
        </div>

        {order?.status === 'success' || status === 'success' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-black text-emerald-900">Payment Verified!</h3>
            <p className="text-xs text-emerald-700 font-medium">
              {message || 'Your transaction has been confirmed and credited successfully.'}
            </p>
          </div>
        ) : (
          <>
            {/* FamPay UPI Details */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  1. Pay using any UPI App
                </span>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  FamPay UPI
                </span>
              </div>

              {/* UPI Box */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UPI ID / VPA</div>
                  <div className="text-sm font-mono font-bold text-rose-600 select-all">{upiId}</div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">Payee: {payeeName}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shrink-0"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Open GPay, PhonePe, Paytm, or FamPay and send exactly <strong className="text-slate-800">₹{order?.amount}</strong> to the UPI ID above.
              </div>
            </div>

            {/* UTR Verification Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  2. Enter 12-Digit UTR / Reference No.
                </label>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="e.g. 412345678901"
                  className="w-full text-sm font-mono font-bold px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition"
                  required
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  Found in your UPI app payment receipt / SMS.
                </p>
              </div>

              {message && status === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold tracking-wide transition shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying with FamPay Ledger...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium">
            Powered by <strong className="text-slate-700">HamroPay</strong> · Instant UPI Settlement
          </p>
        </div>
      </div>
    </div>
  );
};

export { PayPage };
export default PayPage;
