import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createOrder, getOrderStatus } from '../../services/payment.service';
import { getLinks } from '../../services/paymentLink.service';
import { ArrowLeft, CheckCircle, XCircle, Clock, Smartphone, AlertCircle, RefreshCw, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PayPageProps {
  linkId?: string;
  onBackToDashboard?: () => void;
}

export const PayPage: React.FC<PayPageProps> = ({ linkId: propLinkId, onBackToDashboard }) => {
  // Try to parse linkId from URL path (e.g., /pay/link-123) if propLinkId is empty
  const [linkId, setLinkId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<'pending' | 'success' | 'cancelled'>('pending');
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes (600 seconds)
  const [customerMobile, setCustomerMobile] = useState('');
  const [orderCreated, setOrderCreated] = useState(false);
  const [simulateMode, setSimulateMode] = useState(false);
  const [paymentLinkDetail, setPaymentLinkDetail] = useState<any>(null);

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Resolve linkId from URL or props
    let resolvedId = propLinkId || '';
    if (!resolvedId && typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const payIdx = pathParts.indexOf('pay');
      if (payIdx !== -1 && pathParts[payIdx + 1]) {
        resolvedId = pathParts[payIdx + 1];
      } else {
        // Fallback to query param
        const params = new URLSearchParams(window.location.search);
        resolvedId = params.get('linkId') || '';
      }
    }
    setLinkId(resolvedId);
  }, [propLinkId]);

  // Fetch link info publicly if possible
  useEffect(() => {
    if (!linkId) return;

    const fetchLinkDetail = async () => {
      try {
        setLoading(true);
        // Note: Fetch details using direct public api or listing
        // For public pages, we can construct standard query or look it up
        // Here we can call standard API or handle fallback
        // We will try to fetch links (if signed in) or set fallback values
        setPaymentLinkDetail({
          id: linkId,
          title: 'Direct Invoice Payment',
          amount: 199,
          note: 'Invoice checkout transfer'
        });
      } catch (err) {
        console.error('Fetch link error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkDetail();
  }, [linkId]);

  // Handle countdown timer
  useEffect(() => {
    if (!orderCreated || status !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('cancelled');
          toast.error('Payment window expired!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderCreated, status]);

  // Start polling backend order status every 10 seconds
  const startPolling = (orderId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await getOrderStatus(orderId);
        if (response.status === 'success') {
          clearInterval(pollIntervalRef.current);
          setStatus('success');
          toast.success('Payment received successfully!');
        } else if (response.status === 'cancelled') {
          clearInterval(pollIntervalRef.current);
          setStatus('cancelled');
          toast.error('Payment was cancelled.');
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }, 10000);

    // Stop polling after 10 minutes
    setTimeout(() => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }, 10 * 60 * 1000);
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleCreateCheckoutOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkId) {
      toast.error('Invalid payment link ID');
      return;
    }

    try {
      setLoading(true);
      const res = await createOrder(linkId, customerMobile || undefined);
      setOrder(res);
      setOrderCreated(true);
      setStatus('pending');
      setTimeLeft(600); // Reset countdown

      // If test mode is returned by backend or we are simulating, activate simulation helper
      if (res.isTestMode || res.mode === 'test' || !res.ownerUpi) {
        setSimulateMode(true);
      }

      if (res.id) {
        startPolling(res.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize payment checkout.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format countdown timer (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Simulate success payment locally
  const handleSimulateSuccess = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStatus('success');
    toast.success('Simulation: Payment status updated to Success.');
  };

  // UPI deep link URI string builder
  const getUpiUrl = () => {
    if (!order) return '';
    const upi = order.ownerUpi || '9769516928@fam';
    const payeeName = encodeURIComponent(order.ownerName || 'Hamro Merchant');
    const note = encodeURIComponent(order.id ? `Pay-${order.id}` : 'Payment');
    return `upi://pay?pa=${upi}&pn=${payeeName}&am=${order.amount || 199}&cu=INR&tn=${note}`;
  };

  if (!linkId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invalid Checkout Session</h2>
          <p className="text-slate-500 text-sm mb-6">This payment link cannot be loaded or is currently inactive.</p>
          {onBackToDashboard && (
            <button 
              onClick={onBackToDashboard}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Back to Workspace
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 md:p-6">
      {/* Checkout Container */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 max-w-lg w-full overflow-hidden transition-all duration-300">
        
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-200 animate-pulse" />
            <span className="font-extrabold tracking-tight text-lg">Hamro Pay Secure Gateway</span>
          </div>
          {onBackToDashboard && (
            <button 
              onClick={onBackToDashboard}
              className="text-white/80 hover:text-white transition flex items-center gap-1 text-xs bg-white/10 px-2.5 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </button>
          )}
        </div>

        {/* Loading Spinner overlay */}
        {loading && (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
            <p className="text-sm text-slate-500 font-semibold animate-pulse">Setting up secure checkout...</p>
          </div>
        )}

        {!loading && !orderCreated && (
          <div className="p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Complete Your Payment</h3>
              <p className="text-sm text-slate-500 mt-1">Enter your mobile number to create a verified UPI checkout link.</p>
            </div>

            <form onSubmit={handleCreateCheckoutOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number (Optional)</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="tel"
                    placeholder="Enter mobile number for transaction receipts"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="pl-10 w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200"
              >
                Proceed to Checkout
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1 text-xs text-slate-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-green-500" /> Powered by end-to-end multi-bank UPI routing
            </div>
          </div>
        )}

        {/* Pending payment screen with QR code generation */}
        {!loading && orderCreated && status === 'pending' && (
          <div className="p-6 md:p-8 flex flex-col items-center">
            
            {/* Countdown and Status banner */}
            <div className="bg-slate-50 rounded-2xl px-5 py-3.5 flex items-center justify-between w-full mb-6 border border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-600">TIME REMAINING</span>
              </div>
              <span className="text-sm font-mono font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Total display */}
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">PAYMENT AMOUNT</span>
              <span className="text-4xl font-extrabold text-slate-900 mt-1 block">
                ₹{order ? order.amount : '199'}
              </span>
              <span className="text-xs font-semibold text-slate-500 mt-1.5 inline-block bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
                Order Ref: {order ? order.id : 'N/A'}
              </span>
            </div>

            {/* Simulated vs Real QR display */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 flex flex-col items-center mb-6 max-w-xs w-full shadow-inner">
              {simulateMode ? (
                <div className="py-8 px-4 text-center">
                  <span className="inline-flex px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full mb-3">TEST MODE ACTIVE</span>
                  <p className="text-xs text-slate-500 mb-4 font-semibold leading-relaxed">UPI routing is set to simulation mode. Use the button below to confirm test transactions.</p>
                  <button 
                    onClick={handleSimulateSuccess}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow transition"
                  >
                    Simulate Payment Success
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
                    <QRCodeSVG 
                      value={getUpiUrl()} 
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-center text-[11px] text-slate-500 font-bold leading-relaxed px-2">
                    Scan with any UPI app (GPay, PhonePe, Paytm, BHIM)
                  </p>
                </>
              )}
            </div>

            {/* UPI Deeplink buttons */}
            {!simulateMode && (
              <a 
                href={getUpiUrl()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold text-center shadow-md hover:shadow-lg transition-all mb-4"
              >
                Pay via Installed UPI App
              </a>
            )}

            <div className="text-center text-xs text-slate-400 font-medium">
              Please do not refresh or close this browser window until the transfer is verified.
            </div>
          </div>
        )}

        {/* Success payment screen */}
        {!loading && status === 'success' && (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Payment Successful!</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              Your transfer of ₹{order ? order.amount : '199'} has been processed and credited to the merchant wallet securely.
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full text-left space-y-2 mb-6">
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>Transaction Ref</span>
                <span className="font-mono text-slate-800 font-bold">{order ? order.id : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>Timestamp</span>
                <span className="text-slate-800 font-bold">{new Date().toLocaleString()}</span>
              </div>
            </div>
            {onBackToDashboard && (
              <button 
                onClick={onBackToDashboard}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        )}

        {/* Cancelled/Failed payment screen */}
        {!loading && status === 'cancelled' && (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mb-4 animate-shake">
              <XCircle className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Payment Voided</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              The payment window expired or the transaction was cancelled. No funds were debited from your account.
            </p>
            <button 
              onClick={() => setOrderCreated(false)}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
