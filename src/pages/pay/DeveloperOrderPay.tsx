import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CheckCircle2, AlertCircle, Clock, Copy, Check, 
  Download, Smartphone, X, RefreshCw, ShieldCheck
} from 'lucide-react';
import { BrandingObject, DEFAULT_BRANDING } from '../../services/customize.service';

const API_URL = 'https://hamropay-backends.onrender.com';

interface DeveloperOrderPayProps {
  orderId: string;
  onBackToDashboard?: () => void;
  initialBranding?: BrandingObject;
}

interface DeveloperOrderData {
  order_id: string;
  title?: string;
  amount: number;
  pay_amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed' | 'disabled' | string;
  merchant_name?: string;
  is_test?: boolean;
  embedded?: boolean;
  expires_at?: string;
  server_time?: string;
  redirect_url?: string | null;
  upi_id?: string;
  qr_code?: string;
  message?: string;
  utr?: string | null;
  branding?: BrandingObject;
}

// Memoized Countdown Timer
const OrderCountdownTimer: React.FC<{
  expiresAt?: string;
  serverTimeOffset: number;
  isExpired: boolean;
  onExpire: () => void;
}> = React.memo(({ expiresAt, serverTimeOffset, isExpired, onExpire }) => {
  const calcRemaining = () => {
    if (!expiresAt) return 600;
    const expMs = Date.parse(expiresAt);
    if (isNaN(expMs)) return 600;
    return Math.max(0, Math.floor((expMs - (Date.now() + serverTimeOffset)) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calcRemaining);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (isExpired) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      let rem = 0;
      if (expiresAt) {
        const expMs = Date.parse(expiresAt);
        rem = expMs ? Math.max(0, Math.floor((expMs - (Date.now() + serverTimeOffset)) / 1000)) : 0;
      } else {
        rem = Math.max(0, secondsLeft - 1);
      }
      setSecondsLeft(rem);
      if (rem <= 0) {
        onExpireRef.current();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, serverTimeOffset, isExpired]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const timeFormatted = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  const isWarning = secondsLeft <= 60 && secondsLeft > 0;

  return (
    <div className={`hp-panel w-full flex items-center justify-between p-2.5 px-3.5 mb-2.5 ${isWarning ? 'hp-badge-warn' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center hp-chip">
          <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider hp-muted">
            Payment Session Expires In
          </div>
          <div className="text-sm font-black font-mono tracking-tight leading-none">
            {timeFormatted}
          </div>
        </div>
      </div>
      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
        isExpired ? 'hp-badge-bad' : isWarning ? 'hp-badge-warn' : 'hp-badge-ok'
      }`}>
        {isExpired ? 'Expired' : isWarning ? 'Hurry' : 'Active'}
      </span>
    </div>
  );
});

export const DeveloperOrderPay: React.FC<DeveloperOrderPayProps> = ({
  orderId,
  onBackToDashboard,
  initialBranding
}) => {
  const [data, setData] = useState<DeveloperOrderData | null>(null);
  const [branding, setBranding] = useState<BrandingObject>(initialBranding || DEFAULT_BRANDING);
  const [logoError, setLogoError] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKind, setErrorKind] = useState<'404' | '409' | 'network' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status tracking
  const [status, setStatus] = useState<string>('pending');
  const [utr, setUtr] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  // Modals & UI actions
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [testActionLoading, setTestActionLoading] = useState<'success' | 'failed' | 'cancelled' | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Redirect & Popup state
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [showCloseNotice, setShowCloseNotice] = useState<boolean>(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string>('');
  const [toastShow, setToastShow] = useState<boolean>(false);
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');
  const toastTimerRef = useRef<any>(null);

  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMsg(msg);
    setToastType(type);
    setToastShow(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastShow(false);
    }, 2800);
  };

  // Sync background and theme-color meta tag with active branding
  useEffect(() => {
    const originalBg = document.body.style.background;
    const bgBase = branding.vars?.['--hp-bg-base'];
    if (bgBase) {
      document.body.style.background = bgBase;
    }

    let metaTag = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    let createdMeta = false;
    let originalThemeColor = '';

    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'theme-color';
      document.head.appendChild(metaTag);
      createdMeta = true;
    } else {
      originalThemeColor = metaTag.content;
    }

    if (bgBase && metaTag) {
      metaTag.content = bgBase;
    }

    return () => {
      document.body.style.background = originalBg;
      if (createdMeta && metaTag?.parentNode) {
        metaTag.parentNode.removeChild(metaTag);
      } else if (metaTag) {
        metaTag.content = originalThemeColor;
      }
    };
  }, [branding]);

  // Embedded detection
  const isEmbeddedQuery = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('embedded') === '1' || 
     new URLSearchParams(window.location.search).get('embedded') === 'true');
  const isEmbedded = isEmbeddedQuery || Boolean(data?.embedded);

  const isTerminal = ['paid', 'expired', 'cancelled', 'failed', 'disabled'].includes(status);
  const isTerminalRef = useRef(isTerminal);
  isTerminalRef.current = isTerminal;

  // Initial order fetch
  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setIsLoading(false);
      setErrorKind('404');
      setErrorMessage('This payment link is invalid');
      return;
    }

    setIsLoading(true);
    setErrorKind(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/developer/public-order/${encodeURIComponent(orderId)}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (res.status === 404) {
        setErrorKind('404');
        setErrorMessage('This payment link is invalid');
        setIsLoading(false);
        return;
      }

      if (res.status === 409) {
        setErrorKind('409');
        setErrorMessage('This merchant cannot accept payments right now');
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load order (HTTP ${res.status})`);
      }

      const json = await res.json();
      const orderData: DeveloperOrderData = json?.data || json;

      if (!orderData || !orderData.order_id) {
        setErrorKind('404');
        setErrorMessage('This payment link is invalid');
        setIsLoading(false);
        return;
      }

      // Check branding
      const loadedBranding: BrandingObject | undefined = json?.data?.branding || json?.branding || orderData?.branding;
      if (loadedBranding && loadedBranding.vars) {
        setBranding(loadedBranding);
      }

      setData(orderData);
      const initialStatus = (orderData.status || 'pending').toLowerCase();
      setStatus(initialStatus);
      if (orderData.utr) setUtr(orderData.utr);
      if (orderData.message) setStatusMessage(orderData.message);

      if (orderData.server_time) {
        const offset = Date.parse(orderData.server_time) - Date.now();
        setServerTimeOffset(isNaN(offset) ? 0 : offset);
      }
    } catch (err: any) {
      setErrorKind('network');
      setErrorMessage(err.message || 'Network error loading order');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Polling for status updates
  useEffect(() => {
    if (!orderId || isTerminalRef.current) return;

    let active = true;
    let pollTimer: any = null;

    const pollStatus = async () => {
      if (!active || isTerminalRef.current) return;

      try {
        const res = await fetch(`${API_URL}/api/developer/public-order-status/${encodeURIComponent(orderId)}`, {
          headers: { 'Accept': 'application/json' }
        });

        if (!active || isTerminalRef.current) return;

        if (res.ok) {
          const json = await res.json();
          const statusData = json?.data || json;

          if (statusData && statusData.status) {
            const nextStatus = statusData.status.toLowerCase();
            setStatus(nextStatus);
            if (statusData.utr) setUtr(statusData.utr);
            if (statusData.message) setStatusMessage(statusData.message);

            if (['paid', 'expired', 'cancelled', 'failed', 'disabled'].includes(nextStatus)) {
              isTerminalRef.current = true;
              return;
            }
          }
        }
      } catch {
        // Silently retry next interval
      }

      if (active && !isTerminalRef.current) {
        pollTimer = setTimeout(pollStatus, 2000);
      }
    };

    pollTimer = setTimeout(pollStatus, 2000);

    return () => {
      active = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [orderId]);

  // Handle auto-redirect / close when paid
  useEffect(() => {
    if (status !== 'paid') return;

    const redirectUrl = data?.redirect_url;
    if (redirectUrl) {
      setRedirectCountdown(3);
      const interval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            try {
              if (window.opener && isEmbedded) {
                window.close();
              } else {
                window.location.href = redirectUrl;
              }
            } catch {
              window.location.href = redirectUrl;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (isEmbedded) {
      setShowCloseNotice(true);
    }
  }, [status, data?.redirect_url, isEmbedded]);

  // Test action simulator
  const handleTestAction = async (action: 'success' | 'failed' | 'cancelled') => {
    if (testActionLoading !== null) return;
    setTestActionLoading(action);

    try {
      const res = await fetch(`${API_URL}/api/developer/test-action/${encodeURIComponent(orderId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!res.ok) {
        let msg = 'Simulator action rejected';
        try {
          const errJson = await res.json();
          if (errJson?.message) msg = errJson.message;
        } catch {}
        showToast(msg, 'error');
        setTestActionLoading(null);
        return;
      }

      const json = await res.json();
      const updatedData = json?.data || json;
      const newStatus = (updatedData?.status || (action === 'success' ? 'paid' : action)).toLowerCase();

      setStatus(newStatus);
      isTerminalRef.current = true;
      showToast(`Simulated: ${action.toUpperCase()}`, 'success');
    } catch {
      showToast('Network error in test simulator', 'error');
    } finally {
      setTestActionLoading(null);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`${API_URL}/api/developer/public-cancel/${encodeURIComponent(orderId)}`, {
        method: 'POST'
      });
      if (res.ok) {
        setStatus('cancelled');
        isTerminalRef.current = true;
        setShowCancelModal(false);
        showToast('Order cancelled', 'info');
      } else {
        showToast('Could not cancel order', 'error');
      }
    } catch {
      showToast('Network error cancelling order', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  // Copy UPI ID
  const handleCopyUpi = (upiId?: string) => {
    if (!upiId) return;
    navigator.clipboard?.writeText(upiId).then(() => {
      setIsCopied(true);
      showToast('UPI ID copied!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => {
      showToast('Could not copy UPI ID', 'error');
    });
  };

  // Download QR code
  const handleDownloadQr = () => {
    if (!data?.qr_code) return;
    setIsDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = data.qr_code;
      link.download = `hamropay-${orderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('QR code downloaded', 'success');
    } catch {
      showToast('Could not download QR', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleManualRedirect = () => {
    if (data?.redirect_url) {
      window.location.href = data.redirect_url;
    }
  };

  const handleCloseWindow = () => {
    try {
      window.close();
    } catch {}
  };

  // Brand and display information
  const brandName = branding.brand_name || data?.merchant_name || 'Merchant';
  const firstLetter = brandName.charAt(0).toUpperCase() || 'M';
  const payAmountNum = Number(data?.pay_amount ?? data?.amount ?? 0);
  const baseAmountNum = Number(data?.amount ?? 0);
  const isAmountDifferent = payAmountNum > 0 && baseAmountNum > 0 && Math.abs(payAmountNum - baseAmountNum) > 0.001;
  const isTestMode = Boolean(data?.is_test);

  const upiIntentUrl = data?.upi_id
    ? `upi://pay?pa=${encodeURIComponent(data.upi_id)}&pn=${encodeURIComponent(brandName)}&am=${payAmountNum.toFixed(2)}&cu=INR&tn=${encodeURIComponent(data?.title || orderId)}`
    : '';

  // Render Skeleton while loading
  if (isLoading) {
    return (
      <div
        className="hp-page min-h-screen w-full flex flex-col items-center justify-center p-3.5 sm:p-6"
        data-mode={branding.mode || 'dark'}
        style={branding.vars as React.CSSProperties}
      >
        <div className="hp-card w-full max-w-[380px] p-6 text-center space-y-3 animate-pulse">
          <div className="w-12 h-12 rounded-full mx-auto bg-white/10" />
          <div className="w-32 h-4 rounded-md mx-auto bg-white/10" />
          <div className="w-48 h-3 rounded-md mx-auto bg-white/10" />
          <div className="w-full h-14 rounded-xl bg-white/10 mt-4" />
          <div className="w-40 h-40 rounded-xl mx-auto bg-white/10 my-4" />
          <div className="w-full h-11 rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  // Render Errors (404, 409, network)
  if (errorKind !== null) {
    return (
      <div
        className="hp-page min-h-screen w-full flex flex-col items-center justify-center p-3.5 sm:p-6"
        data-mode={branding.mode || 'dark'}
        style={branding.vars as React.CSSProperties}
      >
        <div className="hp-card w-full max-w-[380px] p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center hp-badge-bad">
            <AlertCircle className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">
              {errorKind === '404' && 'Payment Order Not Found'}
              {errorKind === '409' && 'Merchant Cannot Accept Payments'}
              {errorKind === 'network' && 'Connection Error'}
            </h2>
            <p className="text-xs hp-muted mt-1 leading-relaxed">
              {errorMessage || 'Unable to load payment order. Please verify the URL or contact the merchant.'}
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            {errorKind === 'network' && (
              <button
                type="button"
                className="hp-btn px-4 py-2 text-xs font-bold"
                onClick={fetchOrder}
              >
                Retry
              </button>
            )}
            {onBackToDashboard && (
              <button
                type="button"
                className="hp-btn-ghost px-4 py-2 text-xs font-bold"
                onClick={onBackToDashboard}
              >
                Return Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Terminal States: PAID
  if (status === 'paid') {
    return (
      <div
        className="hp-page min-h-screen w-full flex flex-col items-center justify-center p-3.5 sm:p-6"
        data-mode={branding.mode || 'dark'}
        style={branding.vars as React.CSSProperties}
      >
        <div className="hp-card w-full max-w-[380px] p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center hp-badge-ok">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Payment Successful!</h2>
            <div className="text-xs hp-muted mt-1">Your payment has been verified successfully.</div>
          </div>

          {isTestMode && (
            <div className="p-2 rounded-xl text-xs font-bold hp-badge-warn">
              Test Simulator Payment (No real money moved)
            </div>
          )}

          <div className="hp-panel w-full p-3.5 space-y-2 text-left rounded-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="hp-muted font-medium">Order ID</span>
              <span className="font-mono font-bold">{orderId}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="hp-muted font-medium">Amount</span>
              <span className="font-black font-mono" style={{ color: 'var(--hp-ok)' }}>₹{payAmountNum.toFixed(2)}</span>
            </div>
            {utr && (
              <div className="flex items-center justify-between text-xs">
                <span className="hp-muted font-medium">UTR Reference</span>
                <span className="font-mono font-bold">{utr}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="hp-muted font-medium">Merchant</span>
              <span className="font-bold truncate max-w-[180px]">{brandName}</span>
            </div>
          </div>

          {redirectCountdown !== null && redirectCountdown > 0 && (
            <p className="text-xs hp-muted font-medium">
              Redirecting back to store in {redirectCountdown}s...
            </p>
          )}

          <div className="space-y-2 pt-2">
            {data?.redirect_url ? (
              <button
                type="button"
                onClick={handleManualRedirect}
                className="hp-btn w-full py-2.5 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Return to Merchant</span>
              </button>
            ) : showCloseNotice ? (
              <button
                type="button"
                onClick={handleCloseWindow}
                className="hp-btn w-full py-2.5 text-xs font-black cursor-pointer"
              >
                Close Window
              </button>
            ) : (
              <button
                type="button"
                onClick={onBackToDashboard || (() => { window.location.href = '/'; })}
                className="hp-btn w-full py-2.5 text-xs font-black cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Terminal States: EXPIRED / CANCELLED / FAILED / DISABLED
  if (['expired', 'cancelled', 'failed', 'disabled'].includes(status)) {
    const isExpiredState = status === 'expired';
    const isCancelledState = status === 'cancelled';
    const isFailedState = status === 'failed';

    return (
      <div
        className="hp-page min-h-screen w-full flex flex-col items-center justify-center p-3.5 sm:p-6"
        data-mode={branding.mode || 'dark'}
        style={branding.vars as React.CSSProperties}
      >
        <div className="hp-card w-full max-w-[380px] p-6 text-center space-y-4">
          <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
            isExpiredState || isCancelledState ? 'hp-badge-warn' : 'hp-badge-bad'
          }`}>
            <AlertCircle className="w-7 h-7 stroke-[2.5]" />
          </div>

          <div>
            <h2 className="text-lg font-black tracking-tight">
              {isExpiredState && 'Payment Session Expired'}
              {isCancelledState && 'Payment Cancelled'}
              {isFailedState && 'Payment Failed'}
              {status === 'disabled' && 'Checkout Disabled'}
            </h2>
            <p className="text-xs hp-muted mt-1 leading-relaxed">
              {statusMessage || (
                isExpiredState ? 'The time limit for this payment has expired. Please initiate a new order from the store.' :
                isCancelledState ? 'This order was cancelled. If funds were debited, keep your UTR and contact the merchant.' :
                isFailedState ? 'We could not confirm your payment. Please contact the merchant with your reference details.' :
                'This payment link has been disabled by the merchant.'
              )}
            </p>
          </div>

          {utr && (
            <div className="hp-panel p-2.5 rounded-xl text-xs font-mono font-bold">
              UTR: {utr}
            </div>
          )}

          <div className="flex gap-2 justify-center pt-2">
            {onBackToDashboard && (
              <button
                type="button"
                className="hp-btn-ghost px-4 py-2 text-xs font-bold"
                onClick={onBackToDashboard}
              >
                Return Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE PENDING PAYMENT SCREEN
  return (
    <div
      className="hp-page min-h-screen w-full flex flex-col items-center justify-center p-3.5 sm:p-6"
      data-mode={branding.mode || 'dark'}
      style={branding.vars as React.CSSProperties}
    >
      <div className="w-full max-w-[380px] flex flex-col items-center">
        
        {/* TIMER */}
        <OrderCountdownTimer
          expiresAt={data?.expires_at}
          serverTimeOffset={serverTimeOffset}
          isExpired={false}
          onExpire={() => setStatus('expired')}
        />

        {/* TEST MODE BANNER */}
        {isTestMode && (
          <div className="w-full mb-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 hp-badge-warn">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span>⚠️</span>
              <span>Test Mode (No Real Money)</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase">Simulator</span>
          </div>
        )}

        {/* MAIN CHECKOUT CARD */}
        <div className="hp-card w-full p-5 flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Header Brand */}
          <div className="flex flex-col items-center mb-3">
            {branding.logo_url && !logoError ? (
              <img
                src={branding.logo_url}
                alt={brandName}
                className="max-h-10 object-contain mb-2"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black shadow-md mb-2 hp-btn">
                {firstLetter}
              </div>
            )}
            <h2 className="text-base font-extrabold tracking-tight truncate max-w-[280px]">
              {brandName}
            </h2>
            <div className="text-xs hp-muted font-medium mt-0.5">
              {data?.title || 'API Order Checkout'}
            </div>
            <div className="font-mono text-[10px] hp-muted mt-0.5">
              Order: {orderId}
            </div>
          </div>

          {/* Amount Box */}
          <div className="hp-panel w-full py-3 px-4 mb-3.5 rounded-xl">
            <span className="text-[10px] uppercase font-extrabold tracking-wider block mb-0.5 hp-muted">
              Amount to Pay
            </span>
            <div className="text-2xl font-black font-mono tracking-tight">
              ₹{payAmountNum.toFixed(2)}
            </div>
            {isAmountDifferent && !isTestMode && (
              <div className="text-[11px] font-bold mt-1.5 p-1 rounded-lg hp-badge-warn">
                Please pay exactly ₹{payAmountNum.toFixed(2)}. This exact amount identifies your payment.
              </div>
            )}
          </div>

          {/* TEST MODE SIMULATOR BUTTONS */}
          {isTestMode ? (
            <div className="w-full mb-3 space-y-2">
              <div className="text-[11px] font-semibold hp-muted">
                Simulate instant customer result:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleTestAction('success')}
                  disabled={testActionLoading !== null}
                  style={{ background: 'var(--hp-ok)', color: '#04130d' }}
                  className="py-2.5 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 transition cursor-pointer shadow-sm"
                >
                  {testActionLoading === 'success' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Success</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestAction('failed')}
                  disabled={testActionLoading !== null}
                  style={{ background: 'var(--hp-bad)', color: '#1a0508' }}
                  className="py-2.5 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 transition cursor-pointer shadow-sm"
                >
                  {testActionLoading === 'failed' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>Failed</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestAction('cancelled')}
                  disabled={testActionLoading !== null}
                  className="hp-btn-ghost py-2.5 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 transition cursor-pointer"
                >
                  {testActionLoading === 'cancelled' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            /* LIVE MODE: QR CODE & UPI INTENTS */
            <div className="w-full flex flex-col items-center mb-3 space-y-3">
              
              {/* QR Code (pure white background box for reliable scanning) */}
              {data?.qr_code && (
                <div className="flex flex-col items-center">
                  <div className="hp-qr-box">
                    <img
                      src={data.qr_code}
                      alt="Payment QR"
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    disabled={isDownloading}
                    className="mt-2 text-[11px] font-bold hp-muted hover:hp-accent inline-flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>{isDownloading ? 'Saving...' : 'Download QR'}</span>
                  </button>
                </div>
              )}

              {/* UPI ID Row */}
              {data?.upi_id && (
                <div className="hp-panel w-full p-2.5 px-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 text-left">
                    <span className="text-[9px] uppercase font-bold hp-muted tracking-wider block">
                      Merchant UPI ID
                    </span>
                    <span className="font-mono text-xs font-bold truncate block">
                      {data.upi_id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyUpi(data.upi_id)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg hp-btn-ghost flex items-center gap-1 cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 hp-accent" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              {/* Pay via UPI App Intent Button */}
              {data?.upi_id && (
                <a
                  href={upiIntentUrl}
                  className="hp-btn w-full py-3 px-4 text-xs font-black tracking-wide flex items-center justify-center gap-2 cursor-pointer no-underline"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pay via UPI App</span>
                </a>
              )}

              {/* Live auto-detection status pulse */}
              <div className="flex items-center justify-center gap-2 py-1 text-xs font-bold hp-muted">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--hp-ok)' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--hp-ok)' }} />
                </span>
                <span>Waiting for your payment...</span>
              </div>
            </div>
          )}

          {/* Cancel payment button */}
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="mt-3 text-[11px] font-bold hp-muted hover:hp-accent transition cursor-pointer"
          >
            Cancel payment
          </button>

        </div>

        {/* FOOTER */}
        <div className="w-full mt-4 text-center space-y-1.5">
          {branding.footer && branding.footer.trim() && (
            <div className="text-xs hp-muted font-medium break-words px-2">
              {branding.footer.trim()}
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5 text-[11px] hp-muted font-bold tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 opacity-70" />
            <span>Powered by {branding.powered_by || 'Hamro Pay'}</span>
          </div>
        </div>

      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.8)] backdrop-blur-xs"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="hp-card w-full max-w-sm p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-base font-black">Cancel this payment?</div>
            <p className="text-xs hp-muted leading-relaxed">
              Are you sure you want to cancel this order? If you have already transferred money via UPI, please contact the merchant.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="hp-btn-ghost px-4 py-2 text-xs font-bold cursor-pointer"
              >
                Keep paying
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="hp-btn px-4 py-2 text-xs font-black cursor-pointer"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastShow && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 ${
            toastType === 'error' ? 'hp-badge-bad' : toastType === 'success' ? 'hp-badge-ok' : 'hp-panel'
          }`}
        >
          {toastType === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  );
};
