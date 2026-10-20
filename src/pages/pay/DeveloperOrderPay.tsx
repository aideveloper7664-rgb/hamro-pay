import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CheckCircle2, AlertCircle, Clock, Hourglass, Copy, Check, 
  Download, Smartphone, X, RefreshCw, Loader2, ShieldCheck, ArrowRight
} from 'lucide-react';

const API_URL = 'https://hamropay-backends.onrender.com';

interface DeveloperOrderPayProps {
  orderId: string;
  onBackToDashboard?: () => void;
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
}

// Dedicated Memoized Countdown Timer that does NOT trigger parent re-renders or polling re-runs
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
    <div className={`timer-card ${isWarning ? 'warning' : ''}`}>
      <div className="timer-icon">
        <Clock className="w-4 h-4 stroke-[2.4]" />
      </div>
      <div className="timer-body">
        <div className="timer-label">Payment Session Expires In</div>
        <div className="timer-value">{timeFormatted}</div>
      </div>
      <span className="timer-badge">
        {isExpired ? 'Expired' : isWarning ? 'Hurry' : 'Active'}
      </span>
    </div>
  );
});

const PayStyles: React.FC = () => (
  <style>{`
    :root {
      --card-border: rgba(255,45,85,0.18);
      --text: #fff2f4;
      --muted: #b89fa5;
      --muted-dim: #83686e;
      --red-primary: #ff1e4b;
      --red-light: #ff4d6d;
      --green: #2bf29a;
      --gold: #ffb834;
      --blue: #5b8dff;
      --purple: #a78bfa;
    }

    * { box-sizing: border-box; }

    .pay-wrapper {
      font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background-color: #070102;
      background-image:
        radial-gradient(circle at 85% 15%, rgba(255,30,75,0.14), transparent 32%),
        radial-gradient(circle at 15% 30%, rgba(180,10,40,0.12), transparent 28%),
        linear-gradient(180deg, #070102 0%, #0d0305 45%, #120306 100%);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      width: 100%;
      padding: 20px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      overflow-x: hidden;
      overflow-y: auto;
    }

    .pay-card {
      width: 100%;
      max-width: 380px;
      padding: 18px 16px 16px;
      border-radius: 18px;
      background: linear-gradient(165deg, rgba(28,7,12,0.95), rgba(14,3,7,0.98));
      border: 1px solid var(--card-border);
      box-shadow:
        0 20px 60px rgba(0,0,0,0.7),
        0 0 50px rgba(255,30,75,0.12),
        inset 0 1px 0 rgba(255,255,255,0.06);
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      margin: 0 auto;
    }

    .pay-card::before {
      content: "";
      position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,45,85,0.6), transparent);
    }

    .timer-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      margin: 0 auto 10px;
      width: 100%;
      max-width: 380px;
      box-sizing: border-box;
      transition: all 0.3s ease;
    }

    .timer-card.warning {
      border-color: rgba(255,184,52,0.35);
      background: rgba(255,184,52,0.07);
    }

    .timer-icon {
      width: 28px; height: 28px; border-radius: 8px;
      background: rgba(255,30,75,0.12);
      border: 1px solid rgba(255,30,75,0.25);
      color: #ff4d6d;
      display: grid; place-items: center;
      flex-shrink: 0;
    }
    .timer-card.warning .timer-icon {
      background: rgba(255,184,52,0.15);
      border-color: rgba(255,184,52,0.35);
      color: #ffb834;
    }

    .timer-body { flex: 1; min-width: 0; }
    .timer-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.3px; }
    .timer-value { font-size: 14px; font-weight: 900; color: #fff; font-family: monospace; letter-spacing: -0.2px; }
    .timer-card.warning .timer-value { color: #ffb834; }
    .timer-badge {
      font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 999px;
      background: rgba(255,255,255,0.06); color: var(--muted); text-transform: uppercase;
    }
    .timer-card.warning .timer-badge { background: rgba(255,184,52,0.18); color: #ffb834; }

    .qr-frame {
      width: 210px; height: 210px;
      padding: 10px;
      border-radius: 16px;
      background: #fff;
      display: grid; place-items: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 35px rgba(255,30,75,0.15);
      margin: 0 auto;
    }

    .trust-row {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 14px;
      width: 100%;
      max-width: 380px;
    }
    .trust-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10.5px;
      font-weight: 700;
      color: var(--muted-dim);
    }
    .trust-item svg { width: 13px; height: 13px; stroke-width: 2.2; }

    .success-card {
      width: 100%;
      max-width: 380px;
      padding: 24px 18px 20px;
      border-radius: 18px;
      background: linear-gradient(165deg, rgba(10,26,16,0.95), rgba(4,14,8,0.98));
      border: 1px solid rgba(43,242,154,0.35);
      box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 50px rgba(43,242,154,0.18);
      text-align: center;
      box-sizing: border-box;
      margin: 0 auto;
    }
    .success-icon {
      width: 58px; height: 58px; border-radius: 50%;
      margin: 0 auto 14px;
      display: grid; place-items: center;
      background: rgba(43,242,154,0.16);
      border: 1.5px solid rgba(43,242,154,0.4);
      color: var(--green);
      box-shadow: 0 0 28px rgba(43,242,154,0.3);
    }
    .success-icon svg { width: 30px; height: 30px; }
    .success-title { font-size: 18px; font-weight: 900; color: #fff; letter-spacing: -0.3px; margin-bottom: 4px; }
    .success-sub { font-size: 11.5px; color: #9feac5; margin-bottom: 16px; }

    .success-details {
      padding: 12px;
      border-radius: 12px;
      background: rgba(0,0,0,0.45);
      border: 1px solid rgba(43,242,154,0.18);
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-align: left;
    }
    .success-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 11.5px;
    }
    .success-row span { color: var(--muted); }
    .success-row strong { color: #fff; font-weight: 800; font-family: monospace; }

    .error-card {
      width: 100%;
      max-width: 380px;
      padding: 30px 18px 24px;
      border-radius: 18px;
      background: linear-gradient(165deg, rgba(28,7,12,0.95), rgba(14,3,7,0.98));
      border: 1px solid rgba(255,45,85,0.3);
      box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 50px rgba(255,30,75,0.15);
      text-align: center;
      box-sizing: border-box;
      margin: 0 auto;
    }
    .error-icon {
      width: 54px; height: 54px; border-radius: 50%;
      margin: 0 auto 14px;
      display: grid; place-items: center;
      background: rgba(255,30,75,0.14);
      border: 1.5px solid rgba(255,30,75,0.4);
      color: #ff4d6d;
      box-shadow: 0 0 24px rgba(255,30,75,0.25);
    }
    .error-icon svg { width: 26px; height: 26px; }
    .error-title { font-size: 16.5px; font-weight: 900; color: #fff; margin-bottom: 6px; letter-spacing: -0.3px; }
    .error-sub { font-size: 11.5px; color: var(--muted); line-height: 1.5; max-width: 300px; margin: 0 auto 18px; }

    .btn-clean {
      padding: 9px 18px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 800;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }
    .btn-retry {
      background: linear-gradient(135deg, #ff1e4b 0%, #b80028 100%);
      border: 1px solid rgba(255,45,85,0.4);
      color: #fff;
      box-shadow: 0 6px 18px rgba(255,30,75,0.3);
    }
    .btn-secondary {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14);
      color: var(--text);
    }

    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(18,3,6,0.95);
      border: 1px solid rgba(255,45,85,0.4);
      color: #fff;
      padding: 10px 18px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      z-index: 100;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    }
    .toast-error {
      border-color: rgba(255,77,109,0.6);
      background: rgba(38,10,18,0.95);
    }
  `}</style>
);

export const DeveloperOrderPay: React.FC<DeveloperOrderPayProps> = ({
  orderId,
  onBackToDashboard
}) => {
  const [data, setData] = useState<DeveloperOrderData | null>(null);
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

  // Embedded detection (either query param or backend data)
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

      setData(orderData);
      const initialStatus = (orderData.status || 'pending').toLowerCase();
      setStatus(initialStatus);
      if (orderData.utr) setUtr(orderData.utr);
      if (orderData.message) setStatusMessage(orderData.message);

      // Compute server time offset
      if (orderData.server_time) {
        const offset = Date.parse(orderData.server_time) - Date.now();
        setServerTimeOffset(isNaN(offset) ? 0 : offset);
      }
    } catch (err: any) {
      setErrorKind('network');
      setErrorMessage(err?.message || 'Server unreachable, please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Robust Polling using setTimeout chain (dependency is strictly [orderId])
  useEffect(() => {
    if (!orderId) return;

    let timerId: any = null;
    let isMounted = true;
    let activeAbortCtrl: AbortController | null = null;

    const poll = async () => {
      if (!isMounted || isTerminalRef.current) return;

      try {
        activeAbortCtrl = new AbortController();
        const timeoutId = setTimeout(() => {
          try { activeAbortCtrl?.abort(); } catch {}
        }, 30000);

        const res = await fetch(`${API_URL}/api/developer/public-order-status/${encodeURIComponent(orderId)}`, {
          signal: activeAbortCtrl.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const statusData = json?.data || json;
          const currentStatus = (statusData?.status || '').toLowerCase();

          if (statusData?.utr) {
            setUtr(statusData.utr);
          }
          if (statusData?.message) {
            setStatusMessage(statusData.message);
          }

          if (['paid', 'expired', 'cancelled', 'failed', 'disabled'].includes(currentStatus)) {
            setStatus(currentStatus);
            isTerminalRef.current = true;
            return; // Terminal reached, stop polling chain
          }
        }
      } catch {
        // Silently retry on next scheduled tick
      }

      if (!isMounted || isTerminalRef.current) return;

      const delay = document.visibilityState === 'hidden' ? 8000 : 3000;
      timerId = setTimeout(poll, delay);
    };

    // Immediate check on visibility change to visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isTerminalRef.current) {
        if (timerId) clearTimeout(timerId);
        poll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial delayed poll
    const initialDelay = document.visibilityState === 'hidden' ? 8000 : 3000;
    timerId = setTimeout(poll, initialDelay);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try { activeAbortCtrl?.abort(); } catch {}
    };
  }, [orderId]);

  // Handle Result, PostMessage and Safe Redirection
  useEffect(() => {
    if (!isTerminal || !data) return;

    const resultType: 'success' | 'failed' = status === 'paid' ? 'success' : 'failed';

    // 1. Embedded / Popup Mode
    if (isEmbedded) {
      if (typeof window !== 'undefined' && window.opener) {
        try {
          window.opener.postMessage({ type: 'hamropay', order_id: orderId, result: resultType }, '*');
        } catch {}
      }

      const closeTimer = setTimeout(() => {
        try {
          window.close();
        } catch {}
        setShowCloseNotice(true);
      }, 2000);

      return () => clearTimeout(closeTimer);
    }

    // 2. Non-embedded with valid Redirect URL (Strictly http: or https:)
    const redirectUrl = data.redirect_url;
    if (redirectUrl) {
      let isProtocolSafe = false;
      try {
        const parsed = new URL(redirectUrl);
        isProtocolSafe = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        isProtocolSafe = false;
      }

      if (isProtocolSafe) {
        setRedirectCountdown(3);

        const interval = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              const separator = redirectUrl.includes('?') ? '&' : '?';
              const target = `${redirectUrl}${separator}hp_order=${encodeURIComponent(orderId)}&hp_result=${encodeURIComponent(resultType)}`;
              window.location.href = target;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      }
    }
  }, [isTerminal, status, isEmbedded, data, orderId]);

  // Manual Cancel Order Action
  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      await fetch(`${API_URL}/api/developer/public-cancel/${encodeURIComponent(orderId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      setStatus('cancelled');
      isTerminalRef.current = true;
      setShowCancelModal(false);
      showToast('Payment cancelled', 'info');
    } catch {
      setStatus('cancelled');
      isTerminalRef.current = true;
      setShowCancelModal(false);
    } finally {
      setIsCancelling(false);
    }
  };

  // Test Action (Success / Failed / Cancelled)
  const handleTestAction = async (action: 'success' | 'failed' | 'cancelled') => {
    setTestActionLoading(action);
    try {
      const res = await fetch(`${API_URL}/api/developer/test-action/${encodeURIComponent(orderId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Test action failed');
      }

      const newStatus = (json?.data?.status || action === 'success' ? 'paid' : action).toLowerCase();
      setStatus(newStatus === 'success' ? 'paid' : newStatus);
      isTerminalRef.current = true;
      showToast(`Simulated ${action.toUpperCase()} action`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to trigger test action', 'error');
    } finally {
      setTestActionLoading(null);
    }
  };

  const handleCopyUpi = (upiStr?: string) => {
    if (!upiStr) return;
    navigator.clipboard?.writeText(upiStr).then(() => {
      setIsCopied(true);
      showToast('UPI ID copied to clipboard', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const handleDownloadQr = () => {
    if (!data?.qr_code) return;
    setIsDownloading(true);
    const link = document.createElement('a');
    link.href = data.qr_code;
    link.download = `hamropay-qr-${orderId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      setIsDownloading(false);
      showToast('QR code downloaded', 'success');
    }, 400);
  };

  const executeImmediateRedirect = () => {
    if (!data?.redirect_url) return;
    const resultType = status === 'paid' ? 'success' : 'failed';
    const separator = data.redirect_url.includes('?') ? '&' : '?';
    window.location.href = `${data.redirect_url}${separator}hp_order=${encodeURIComponent(orderId)}&hp_result=${encodeURIComponent(resultType)}`;
  };

  // 1. Initial Loading Screen
  if (isLoading) {
    return (
      <div className="pay-wrapper">
        <PayStyles />
        <div className="pay-card animate-pulse space-y-4">
          <div className="h-6 bg-white/5 rounded-lg w-1/2 mx-auto" />
          <div className="h-10 bg-white/5 rounded-xl w-3/4 mx-auto" />
          <div className="h-48 bg-white/5 rounded-2xl w-full" />
          <div className="h-10 bg-white/5 rounded-xl w-full" />
        </div>
      </div>
    );
  }

  // 2. Error States: 404, 409, or Network
  if (errorKind === '404') {
    return (
      <div className="pay-wrapper">
        <PayStyles />
        <div className="error-card">
          <div className="error-icon">
            <AlertCircle />
          </div>
          <div className="error-title">This payment link is invalid</div>
          <div className="error-sub">The requested developer order was not found or has been deleted.</div>
          <button type="button" onClick={onBackToDashboard} className="btn-clean btn-secondary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (errorKind === '409') {
    return (
      <div className="pay-wrapper">
        <PayStyles />
        <div className="error-card">
          <div className="error-icon">
            <AlertCircle />
          </div>
          <div className="error-title">This merchant cannot accept payments right now</div>
          <div className="error-sub">The merchant has no active cashier account connected. Please notify the merchant.</div>
          <button type="button" onClick={onBackToDashboard} className="btn-clean btn-secondary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (errorKind === 'network' && !data) {
    return (
      <div className="pay-wrapper">
        <PayStyles />
        <div className="error-card">
          <div className="error-icon">
            <RefreshCw />
          </div>
          <div className="error-title">Connection Error</div>
          <div className="error-sub">{errorMessage || 'Could not connect to payment server.'}</div>
          <button type="button" onClick={fetchOrder} className="btn-clean btn-retry">
            Retry Now
          </button>
        </div>
      </div>
    );
  }

  const payAmountNum = Number(data?.pay_amount ?? data?.amount ?? 0);
  const baseAmountNum = Number(data?.amount ?? 0);
  const isAmountDifferent = payAmountNum !== baseAmountNum && baseAmountNum > 0;
  const isTestMode = Boolean(data?.is_test);

  const upiIntentUrl = data?.upi_id
    ? `upi://pay?pa=${encodeURIComponent(data.upi_id)}&pn=${encodeURIComponent(data.merchant_name || 'Hamro Merchant')}&am=${payAmountNum.toFixed(2)}&cu=INR&tn=${encodeURIComponent(data.title || 'Payment Order')}`
    : '#';

  // 3. Result Screens
  if (status === 'paid') {
    return (
      <div className="pay-wrapper">
        <PayStyles />
        <div className="success-card animate-fadeIn">
          <div className="success-icon">
            <CheckCircle2 />
          </div>
          <div className="success-title">Payment Successful!</div>
          <div className="success-sub">Thank you, your payment has been received and verified.</div>

          <div className="success-details">
            <div className="success-row">
              <span>Order ID</span>
              <strong>{orderId}</strong>
            </div>
            <div className="success-row">
              <span>Merchant</span>
              <strong style={{ fontFamily: 'sans-serif' }}>{data?.merchant_name || 'Merchant'}</strong>
            </div>
            {data?.title && (
              <div className="success-row">
                <span>Purpose</span>
                <strong style={{ fontFamily: 'sans-serif' }}>{data.title}</strong>
              </div>
            )}
            <div className="success-row">
              <span>Amount Paid</span>
              <strong style={{ color: '#2bf29a' }}>₹{payAmountNum.toFixed(2)}</strong>
            </div>
            <div className="success-row">
              <span>Reference / UTR</span>
              <strong>{isTestMode ? 'Test payment' : (utr || 'Auto-verified')}</strong>
            </div>
          </div>

          {/* Safe Redirection Notice */}
          {redirectCountdown !== null && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs text-center space-y-2">
              <p>Returning to the merchant in {redirectCountdown}s...</p>
              <button
                type="button"
                onClick={executeImmediateRedirect}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-emerald-400 active:scale-95 transition-all"
              >
                <span>Go now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isEmbedded && showCloseNotice && (
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs text-center">
              You can close this window now.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="pay-wrapper">
        <PayStyles />
        <div className="error-card" style={{ borderColor: 'rgba(255,184,52,0.35)' }}>
          <div className="error-icon" style={{ background: 'rgba(255,184,52,0.12)', color: '#ffb834', borderColor: 'rgba(255,184,52,0.4)' }}>
            <Hourglass className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="error-title">This order has expired</div>
          <div className="error-sub">The payment session has timed out. Please initiate a new order from the merchant website.</div>
          
          {redirectCountdown !== null && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs text-center space-y-2">
              <p>Returning to merchant in {redirectCountdown}s...</p>
              <button
                type="button"
                onClick={executeImmediateRedirect}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-amber-400"
              >
                <span>Go now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isEmbedded && showCloseNotice && (
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs text-center">
              You can close this window now.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="pay-wrapper">
        <PayStyles />
        <div className="error-card" style={{ borderColor: 'rgba(255,184,52,0.35)' }}>
          <div className="error-icon" style={{ background: 'rgba(255,184,52,0.12)', color: '#ffb834', borderColor: 'rgba(255,184,52,0.4)' }}>
            <X className="w-6 h-6 stroke-[2.4]" />
          </div>
          <div className="error-title">Payment cancelled</div>
          <div className="error-sub">This order checkout was cancelled.</div>

          {redirectCountdown !== null && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs text-center space-y-2">
              <p>Returning to merchant in {redirectCountdown}s...</p>
              <button
                type="button"
                onClick={executeImmediateRedirect}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-amber-400"
              >
                <span>Go now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isEmbedded && showCloseNotice && (
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs text-center">
              You can close this window now.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'failed' || status === 'disabled') {
    return (
      <div className="pay-wrapper">
        <PayStyles />
        <div className="error-card">
          <div className="error-icon">
            <X className="w-6 h-6 stroke-[2.4]" />
          </div>
          <div className="error-title">
            {status === 'disabled' ? 'This order is unavailable' : 'Payment could not be completed'}
          </div>
          <div className="error-sub">
            {statusMessage || data?.message || 'The transaction failed or was rejected by the gateway.'}
          </div>

          {redirectCountdown !== null && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs text-center space-y-2">
              <p>Returning to merchant in {redirectCountdown}s...</p>
              <button
                type="button"
                onClick={executeImmediateRedirect}
                className="px-4 py-1.5 rounded-lg bg-rose-500 text-white font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-rose-400"
              >
                <span>Go now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isEmbedded && showCloseNotice && (
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs text-center">
              You can close this window now.
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Active Order Checkout UI
  return (
    <div className="pay-wrapper">
      <PayStyles />
      {/* TEST MODE BANNER */}
      {isTestMode && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-200 text-xs font-black tracking-wide text-center uppercase shadow-[0_0_24px_rgba(245,158,11,0.2)]">
          TEST MODE: no real money is charged.
        </div>
      )}

      {/* COUNTDOWN TIMER (Live orders only) */}
      {!isTestMode && (
        <OrderCountdownTimer
          expiresAt={data?.expires_at}
          serverTimeOffset={serverTimeOffset}
          isExpired={status === 'expired'}
          onExpire={() => setStatus('expired')}
        />
      )}

      {/* MAIN CHECKOUT CARD */}
      <div className="pay-card">
        {/* Merchant & Title */}
        <div className="text-center pb-3 border-b border-[rgba(255,45,85,0.12)]">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[rgba(255,45,85,0.1)] border border-[rgba(255,45,85,0.2)] text-[10px] font-black uppercase tracking-wider text-[#ff8ca3] mb-1.5">
            {data?.merchant_name || 'Hamro Merchant'}
          </div>
          <h1 className="text-base font-extrabold text-[#fff2f4] tracking-tight">
            {data?.title || 'Payment Order'}
          </h1>
          <p className="font-mono text-[11px] text-[#83686e] mt-0.5">
            Order: {orderId}
          </p>
        </div>

        {/* Amount Display */}
        <div className="text-center py-4">
          <span className="text-[10px] font-black uppercase text-[#83686e] tracking-wider block mb-1">
            Amount to Pay
          </span>
          <div className="text-3xl font-black font-mono tracking-tight text-[#fff2f4]">
            ₹{payAmountNum.toFixed(2)}
          </div>
          {isAmountDifferent && !isTestMode && (
            <p className="text-[11px] font-bold text-[#ffb834] mt-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-xs mx-auto">
              Please pay exactly ₹{payAmountNum.toFixed(2)}. This exact amount identifies your payment.
            </p>
          )}
        </div>

        {/* TEST MODE ACTIONS */}
        {isTestMode ? (
          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-3 text-center my-2">
            <p className="text-xs text-[#b89fa5] font-semibold">
              Select a simulated result to test your callback &amp; webhook flow:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTestAction('success')}
                disabled={testActionLoading !== null}
                className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
              >
                {testActionLoading === 'success' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Success</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestAction('failed')}
                disabled={testActionLoading !== null}
                className="py-2.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-[0_4px_14px_rgba(244,63,94,0.3)]"
              >
                {testActionLoading === 'failed' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span>Failed</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestAction('cancelled')}
                disabled={testActionLoading !== null}
                className="py-2.5 px-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-extrabold text-xs active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-[0_4px_14px_rgba(100,116,139,0.2)]"
              >
                {testActionLoading === 'cancelled' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span>Cancelled</span>
              </button>
            </div>
          </div>
        ) : (
          /* LIVE MODE: QR & UPI SECTION */
          <div className="space-y-4">
            {/* QR FRAME */}
            {data?.qr_code && (
              <div className="flex flex-col items-center">
                <div className="qr-frame">
                  <img
                    src={data.qr_code}
                    alt="Payment QR"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={isDownloading}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#ff8ca3] hover:text-white transition-colors cursor-pointer"
                >
                  <Download className="w-3 h-3 text-[#ff4d6d]" />
                  <span>{isDownloading ? 'Downloading...' : 'Download QR'}</span>
                </button>
              </div>
            )}

            {/* UPI ID & COPY */}
            {data?.upi_id && (
              <div className="p-3 rounded-xl bg-black/40 border border-[rgba(255,45,85,0.14)] flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[9.5px] uppercase font-bold text-[#83686e] block tracking-wider">
                    Merchant UPI ID
                  </span>
                  <span className="font-mono text-xs font-bold text-[#fff2f4] truncate block">
                    {data.upi_id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyUpi(data.upi_id)}
                  className="px-3 py-1.5 rounded-lg bg-[rgba(255,45,85,0.12)] hover:bg-[rgba(255,45,85,0.22)] border border-[rgba(255,45,85,0.3)] text-xs font-extrabold text-[#fff2f4] inline-flex items-center gap-1 transition-all active:scale-95 shrink-0 cursor-pointer"
                  title="Copy UPI ID"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-[#2bf29a]" /> : <Copy className="w-3.5 h-3.5 text-[#ff4d6d]" />}
                  <span>{isCopied ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>
            )}

            {/* PAY VIA UPI INTENT */}
            {data?.upi_id && (
              <a
                href={upiIntentUrl}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#b80028] text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(255,30,75,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-center"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay via UPI App</span>
              </a>
            )}

            {/* LIVE AUTO-DETECTION PULSE */}
            <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#b89fa5]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2bf29a] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2bf29a]" />
              </span>
              <span>Waiting for your payment...</span>
            </div>
          </div>
        )}

        {/* CANCEL PAYMENT BUTTON */}
        <div className="mt-4 pt-3 border-t border-[rgba(255,45,85,0.12)] text-center">
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="text-[11px] font-bold text-[#83686e] hover:text-[#ff4d6d] transition-colors cursor-pointer"
          >
            Cancel payment
          </button>
        </div>
      </div>

      {/* TRUST BADGE */}
      <div className="trust-row">
        <div className="trust-item">
          <ShieldCheck />
          <span>Secure Gateway</span>
        </div>
        <div className="trust-item">
          <Smartphone />
          <span>UPI Instant</span>
        </div>
      </div>

      {/* CONFIRM CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120306] border border-[rgba(255,45,85,0.3)] w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#fff2f4]">Cancel this payment?</h3>
                <p className="text-xs text-[#b89fa5]">This checkout session will be closed.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#fff2f4] transition-all cursor-pointer"
              >
                Keep waiting
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-extrabold text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Yes, cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST */}
      {toastShow && (
        <div className={`toast ${toastType === 'error' ? 'toast-error' : ''}`} style={{ opacity: 1, transform: 'translateX(-50%) translateY(0)' }}>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default DeveloperOrderPay;
