import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = 'https://hamropay-backends.onrender.com';
const TOTAL_SECONDS = 8 * 60;

// Helper to identify payment link IDs vs order IDs
// FIXME: confirm link_id prefix with backend (e.g. lnk_, link_, or other format)
export const isPaymentLinkId = (idStr: string): boolean => {
  if (!idStr) return false;
  return idStr.startsWith('lnk_') || idStr.startsWith('link_') || idStr.startsWith('pl_');
};

export const isOrderId = (idStr: string): boolean => {
  if (!idStr) return false;
  return idStr.startsWith('ORD_') || idStr.startsWith('ord_');
};

interface PayPageProps {
  onBackToDashboard?: () => void;
}

type ErrorKind = '404' | '409' | '429' | 'network' | 'no_upi' | 'order_unsupported' | 'inactive' | 'generic';

interface PaymentCountdownTimerProps {
  expiresAt?: string;
  serverTimeOffset: number;
  isExpired: boolean;
  onExpire: () => void;
}

const PaymentCountdownTimer: React.FC<PaymentCountdownTimerProps> = React.memo(({
  expiresAt,
  serverTimeOffset,
  isExpired,
  onExpire
}) => {
  const computeInitial = () => {
    if (!expiresAt) return TOTAL_SECONDS;
    const expMs = Date.parse(expiresAt);
    if (isNaN(expMs)) return TOTAL_SECONDS;
    return Math.max(0, Math.floor((expMs - (Date.now() + serverTimeOffset)) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(computeInitial);

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (isExpired) {
      setSecondsLeft(0);
      return;
    }

    const calc = () => {
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

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, serverTimeOffset, isExpired]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const timeFormatted = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  const isWarning = secondsLeft <= 60 && secondsLeft > 0;

  return (
    <div className={`timer-card ${isWarning ? 'warning' : ''}`}>
      <div className="timer-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
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

const PayPage: React.FC<PayPageProps> = ({ onBackToDashboard }) => {
  const [id, setId] = useState<string>('');
  const [data, setData] = useState<{
    link_id?: string;
    title?: string;
    amount?: number;
    note?: string;
    merchant_name?: string;
    upi_id?: string;
    cashier_type?: string;
    status?: string;
    active?: boolean;
    is_test?: boolean;
    [key: string]: any;
  } | null>(null);

  const [activeUpi, setActiveUpi] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Session & Polling State
  const [sessionId, setSessionId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [sessionQrCode, setSessionQrCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  const [autoDetect, setAutoDetect] = useState<boolean | undefined>(undefined);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [failedState, setFailedState] = useState<{ utr?: string | null; message?: string | null } | null>(null);

  // Terminal status calculation
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  const isTerminal = isSuccess || isExpired || isCancelled || errorKind !== null || Boolean(failedState);

  // Refs for polling latest values (so polling effect doesn't depend on them)
  const isTerminalRef = useRef(isTerminal);
  isTerminalRef.current = isTerminal;

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const idRef = useRef(id);
  idRef.current = id;

  const payAmountRef = useRef(payAmount);
  payAmountRef.current = payAmount;

  const sessionCreatingRef = useRef<boolean>(false);
  const pollTimerRef = useRef<any>(null);
  const inFlightRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);

  // UTR & Verification State
  const [utr, setUtr] = useState<string>('');
  const utrRef = useRef(utr);
  utrRef.current = utr;

  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

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

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // QR Image Timestamp & Download State
  const [qrTimestamp, setQrTimestamp] = useState<number>(Date.now());
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const handleGoHome = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  // Extract ID on mount
  useEffect(() => {
    let extractedId = '';
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.includes('/pay/')) {
        extractedId = pathname.split('/pay/')[1]?.split('?')[0]?.split('/')[0] || '';
      } else {
        const parts = pathname.split('/').filter(Boolean);
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart !== 'pay') {
          extractedId = lastPart;
        }
      }
      if (!extractedId) {
        const searchParams = new URLSearchParams(window.location.search);
        extractedId = searchParams.get('id') || searchParams.get('link_id') || searchParams.get('order_id') || '';
      }
    }
    setId(extractedId.trim());
  }, []);

  // Fetch Public Payment Link and Initiate Checkout Session
  const loadPaymentData = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      setErrorKind('404');
      setErrorMessage('This payment link is invalid or has been removed');
      return;
    }

    if (isOrderId(id)) {
      setIsLoading(false);
      setErrorKind('order_unsupported');
      setErrorMessage('Please use a payment link');
      return;
    }

    // Ref guard to prevent React StrictMode from double-initiating session
    if (sessionCreatingRef.current) {
      return;
    }
    sessionCreatingRef.current = true;

    setIsLoading(true);
    setErrorKind(null);
    setErrorMessage(null);
    setVerifyError(null);
    setFailedState(null);

    try {
      const res = await fetch(`${API_URL}/api/payment-link/${encodeURIComponent(id)}`);

      if (res.status === 403) {
        setErrorKind('inactive');
        setErrorMessage('This payment link is currently disabled by the merchant. Please contact the merchant.');
        setIsLoading(false);
        return;
      }

      if (res.status === 404) {
        setErrorKind('404');
        setErrorMessage('This payment link is invalid or has been removed');
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
        let msg = `Payment error (${res.status})`;
        try {
          const errData = await res.json();
          if (errData?.code === 'LINK_DISABLED') {
            setErrorKind('inactive');
            setErrorMessage('This payment link is currently disabled by the merchant. Please contact the merchant.');
            setIsLoading(false);
            return;
          }
          if (errData?.message) msg = errData.message;
        } catch {}
        setErrorKind('generic');
        setErrorMessage(msg);
        setIsLoading(false);
        return;
      }

      const resData = await res.json();
      if (resData?.code === 'LINK_DISABLED') {
        setErrorKind('inactive');
        setErrorMessage('This payment link is currently disabled by the merchant. Please contact the merchant.');
        setIsLoading(false);
        return;
      }

      const paymentData = resData?.data || resData;

      if (!paymentData || paymentData.amount === undefined || paymentData.amount === null) {
        setErrorKind('404');
        setErrorMessage('This payment link is invalid or has been removed');
        setIsLoading(false);
        return;
      }

      // Check if link is deactivated / disabled
      if (paymentData.status === 'inactive' || paymentData.active === false || paymentData.status === 'deactivated') {
        setErrorKind('inactive');
        setErrorMessage('This payment link is currently disabled by the merchant. Please contact the merchant.');
        setData(paymentData);
        setIsLoading(false);
        return;
      }

      const upi = paymentData.upi_id || paymentData.upiId || paymentData.cashier_upi || '';
      if (!upi && !paymentData.is_test) {
        setErrorKind('no_upi');
        setErrorMessage('Payment unavailable');
        setData(paymentData);
        setIsLoading(false);
        return;
      }

      setData(paymentData);
      setActiveUpi(upi);
      setPayAmount(Number(paymentData.amount || 0));
      setBaseAmount(Number(paymentData.amount || 0));

      // If LIVE link: initiate or resume checkout session!
      if (!paymentData.is_test) {
        let existingSid = '';
        try {
          existingSid = sessionStorage.getItem(`hamropay_session_${id}`) || '';
        } catch {}

        try {
          const sRes = await fetch(`${API_URL}/api/payment-link/${encodeURIComponent(id)}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(existingSid ? { session_id: existingSid } : {})
          });

          if (sRes.status === 403) {
            setErrorKind('inactive');
            setErrorMessage('This payment link is currently disabled by the merchant. Please contact the merchant.');
            setIsLoading(false);
            return;
          }
          if (sRes.status === 404) {
            setErrorKind('404');
            setErrorMessage('This payment link is invalid or has been removed');
            setIsLoading(false);
            return;
          }
          if (sRes.status === 409) {
            setErrorKind('409');
            setErrorMessage('This merchant cannot accept payments right now');
            setIsLoading(false);
            return;
          }
          if (sRes.status === 429) {
            let msg = 'Too many people are paying right now. Please try again in a minute.';
            try {
              const errData = await sRes.json();
              if (errData?.message) msg = errData.message;
            } catch {}
            setErrorKind('429');
            setErrorMessage(msg);
            setIsLoading(false);
            return;
          }

          if (!sRes.ok) {
            let msg = 'Unable to start checkout session';
            try {
              const errData = await sRes.json();
              if (errData?.code === 'LINK_DISABLED') {
                setErrorKind('inactive');
                setErrorMessage('This payment link is currently disabled by the merchant. Please contact the merchant.');
                setIsLoading(false);
                return;
              }
              if (errData?.message) msg = errData.message;
            } catch {}
            setErrorKind('generic');
            setErrorMessage(msg);
            setIsLoading(false);
            return;
          }

          const sJson = await sRes.json();
          if (sJson.test_mode) {
            paymentData.is_test = true;
            setData({ ...paymentData, is_test: true });
          } else if (sJson.data && sJson.data.session_id) {
            const sData = sJson.data;
            try {
              sessionStorage.setItem(`hamropay_session_${id}`, sData.session_id);
            } catch {}

            setSessionId(sData.session_id);
            setPayAmount(Number(sData.pay_amount || sData.base_amount || paymentData.amount || 0));
            setBaseAmount(Number(sData.base_amount || paymentData.amount || 0));
            if (sData.upi_id) setActiveUpi(sData.upi_id);
            if (sData.qr_code) setSessionQrCode(sData.qr_code);

            const serverTimeMs = sData.server_time ? Date.parse(sData.server_time) : Date.now();
            const offset = isNaN(serverTimeMs) ? 0 : serverTimeMs - Date.now();
            setServerTimeOffset(offset);
            setExpiresAt(sData.expires_at || '');

            const expMs = sData.expires_at ? Date.parse(sData.expires_at) : 0;
            const remSec = expMs ? Math.max(0, Math.floor((expMs - (Date.now() + offset)) / 1000)) : TOTAL_SECONDS;

            if (remSec <= 0 || sData.status === 'expired') {
              setIsExpired(true);
            } else if (sData.status === 'paid') {
              try { sessionStorage.removeItem(`hamropay_session_${id}`); } catch {}
              setOrderResult({
                order_id: sData.order_id,
                utr: sData.utr,
                amount: sData.pay_amount || sData.base_amount
              });
              if (sData.utr) setUtr(sData.utr);
              setIsSuccess(true);
            } else if (sData.status === 'cancelled') {
              try { sessionStorage.removeItem(`hamropay_session_${id}`); } catch {}
              setIsCancelled(true);
            } else if (sData.status === 'disabled') {
              setErrorKind('inactive');
            } else if (sData.status === 'failed') {
              setFailedState({ utr: sData.utr, message: sData.message });
            }
          }
        } catch {
          setErrorKind('network');
          setErrorMessage('Could not connect to payment session. Please retry.');
          setIsLoading(false);
          return;
        }
      }

      setErrorKind(null);
      setErrorMessage(null);
      setIsLoading(false);
    } catch {
      setErrorKind('network');
      setErrorMessage('Could not load payment, please retry');
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadPaymentData();
    }
  }, [id, loadPaymentData]);

  // Polling for Live session status: ONLY depends on [sessionId, isTerminal]
  useEffect(() => {
    if (!sessionId || isTerminal) {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      inFlightRef.current = false;
      return;
    }

    let active = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const pollStatus = async () => {
      if (!active || controller.signal.aborted || isTerminalRef.current) {
        return;
      }

      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;

      const currentSid = sessionIdRef.current;
      if (!currentSid) {
        inFlightRef.current = false;
        return;
      }

      // Per-request 30 second timeout controller
      const reqCtrl = new AbortController();
      const timeoutId = setTimeout(() => {
        reqCtrl.abort();
      }, 30000);

      const onGlobalAbort = () => {
        reqCtrl.abort();
      };
      controller.signal.addEventListener('abort', onGlobalAbort);

      try {
        const res = await fetch(`${API_URL}/api/payment-link/session/${encodeURIComponent(currentSid)}/status`, {
          signal: reqCtrl.signal
        });

        if (!active || controller.signal.aborted || isTerminalRef.current) {
          return;
        }

        if (res.ok) {
          consecutiveFailuresRef.current = 0;
          setIsReconnecting(false);

          const statusJson = await res.json();
          const stData = statusJson?.data;

          if (stData) {
            if (stData.auto_detect !== undefined) {
              setAutoDetect(stData.auto_detect);
            }

            const currentStatus = stData.status;

            if (currentStatus === 'paid') {
              try { sessionStorage.removeItem(`hamropay_session_${idRef.current}`); } catch {}
              setOrderResult({
                order_id: stData.order_id,
                utr: stData.utr,
                amount: stData.pay_amount || payAmountRef.current
              });
              if (stData.utr) setUtr(stData.utr);
              setIsSuccess(true);
              showToastRef.current('Payment verified successfully!', 'success');
              return; // terminal, terminates loop
            }

            if (currentStatus === 'expired') {
              setIsExpired(true);
              return; // terminal
            }

            if (currentStatus === 'cancelled') {
              try { sessionStorage.removeItem(`hamropay_session_${idRef.current}`); } catch {}
              setIsCancelled(true);
              return; // terminal
            }

            if (currentStatus === 'disabled') {
              setErrorKind('inactive');
              return; // terminal
            }

            if (currentStatus === 'failed') {
              setFailedState({ utr: stData.utr, message: stData.message });
              return; // terminal
            }

            if (stData.expires_at) {
              setExpiresAt(stData.expires_at);
            }
            if (stData.server_time) {
              const serverMs = Date.parse(stData.server_time);
              if (!isNaN(serverMs)) {
                setServerTimeOffset(serverMs - Date.now());
              }
            }
          }
        } else if (res.status === 404) {
          setIsExpired(true);
          return;
        } else {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 3) {
            setIsReconnecting(true);
          }
        }
      } catch (err: any) {
        if (!active || controller.signal.aborted || isTerminalRef.current) {
          return;
        }
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= 3) {
          setIsReconnecting(true);
        }
      } finally {
        clearTimeout(timeoutId);
        controller.signal.removeEventListener('abort', onGlobalAbort);
        inFlightRef.current = false;
      }

      if (!active || controller.signal.aborted || isTerminalRef.current) {
        return;
      }

      // Schedule next poll AFTER previous request finishes
      const nextDelay = document.visibilityState === 'hidden' ? 8000 : 3000;
      pollTimerRef.current = setTimeout(pollStatus, nextDelay);
    };

    pollTimerRef.current = setTimeout(pollStatus, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active && !isTerminalRef.current) {
        if (!inFlightRef.current && pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
          pollStatus();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      controller.abort();
      abortControllerRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, isTerminal]);

  const isTestMode = Boolean(data?.is_test);
  const title = data?.title || 'Payment Request';
  const merchantName = data?.merchant_name || 'Merchant';

  const displayAmount = isTestMode
    ? Number(data?.amount || 0).toFixed(2)
    : payAmount ? payAmount.toFixed(2) : Number(data?.amount || 0).toFixed(2);

  const hasUniqueAmount = !isTestMode && payAmount > 0 && baseAmount > 0 && Math.abs(payAmount - baseAmount) > 0.0001;

  // Start a fresh checkout session
  const startNewCheckout = async () => {
    try {
      sessionStorage.removeItem(`hamropay_session_${id}`);
    } catch {}

    sessionCreatingRef.current = false;
    setSessionId('');
    setIsExpired(false);
    setIsCancelled(false);
    setShowCancelModal(false);
    setFailedState(null);
    setUtr('');
    setVerifyError(null);
    setIsReconnecting(false);
    setAutoDetect(undefined);
    setQrTimestamp(Date.now());

    await loadPaymentData();
    showToast('New payment session started', 'info');
  };

  // Cancel payment action
  const handleCancelPayment = async () => {
    setShowCancelModal(false);

    if (sessionId) {
      try {
        await fetch(`${API_URL}/api/payment-link/session/${encodeURIComponent(sessionId)}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch {}
    }

    try {
      sessionStorage.removeItem(`hamropay_session_${id}`);
    } catch {}

    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsCancelled(true);
  };

  // UPI intent link with exact pay_amount and encoded title
  const upiPayUrl = activeUpi
    ? `upi://pay?pa=${encodeURIComponent(activeUpi)}&pn=${encodeURIComponent(merchantName)}&am=${displayAmount}&cu=INR&tn=${encodeURIComponent(title)}`
    : '';

  const qrImageSrc = sessionQrCode || (upiPayUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0&data=${encodeURIComponent(upiPayUrl)}&t=${qrTimestamp}`
    : '');

  const handleDownloadQr = async () => {
    if (!qrImageSrc) return;
    setIsDownloading(true);
    try {
      const response = await fetch(qrImageSrc, { mode: 'cors' });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hamropay-qr-${displayAmount}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('QR code downloaded', 'success');
    } catch {
      window.open(qrImageSrc, '_blank');
      showToast('Long-press QR to save', 'info');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUtrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^A-Za-z0-9]/g, '');
    if (val.length <= 30) {
      setUtr(val);
      if (verifyError) setVerifyError(null);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, 'info');
    } else {
      showToast(`${text}`, 'info');
    }
  };

  // Manual UTR Verification
  const handleVerify = async () => {
    if (isVerifying || isExpired) return;

    const cleanUtr = utr.trim();
    if (!cleanUtr || !/^[A-Za-z0-9]{6,30}$/.test(cleanUtr)) {
      triggerShake();
      setVerifyError('Please enter a valid 6 to 30 character UTR / Reference code.');
      showToast('UTR must be 6 to 30 letters or digits', 'error');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const verifyBody: any = { utr: cleanUtr };
      if (sessionId) {
        verifyBody.session_id = sessionId;
      }

      const res = await fetch(`${API_URL}/api/payment-link/${encodeURIComponent(id)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyBody),
      });

      let resData: any = {};
      try {
        resData = await res.json();
      } catch {
        resData = {};
      }

      if (res.status === 403 || resData?.code === 'LINK_DISABLED') {
        setErrorKind('inactive');
        setErrorMessage('This payment link is currently disabled by the merchant. Please contact the merchant.');
        setIsVerifying(false);
        return;
      }

      if (res.status === 502) {
        triggerShake();
        const msg = resData?.message || 'Could not check right now, please try again in a moment';
        setVerifyError(msg);
        showToast(msg, 'error');
        setIsVerifying(false);
        return;
      }

      if (res.ok && resData?.success !== false) {
        try {
          sessionStorage.removeItem(`hamropay_session_${id}`);
        } catch {}
        setOrderResult(resData?.data || resData);
        setIsSuccess(true);
        if (resData?.test_mode || resData?.data?.test || isTestMode) {
          showToast('Test payment verified!', 'success');
        } else {
          showToast('Payment verified successfully!', 'success');
        }
      } else {
        triggerShake();
        const msg = resData?.message || resData?.error || 'Verification failed. Please check your UTR.';
        setVerifyError(msg);
        showToast(msg, 'error');
      }
    } catch {
      triggerShake();
      const msg = 'Network error during verification. Please try again.';
      setVerifyError(msg);
      showToast(msg, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const isUtrValid = utr.trim().length >= 6 && /^[A-Za-z0-9]{6,30}$/.test(utr.trim());

  return (
    <div className="pay-page-wrapper">
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

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .pay-page-wrapper {
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
          overflow-x: hidden;
          overflow-y: auto;
        }

        button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
        input { font-family: inherit; }

        .page-stack {
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 auto;
          padding: 0;
        }

        /* CARD */
        .pay-card {
          width: 100%;
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
        }

        .pay-card::before {
          content: "";
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,45,85,0.6), transparent);
        }

        .card-head {
          text-align: center;
          margin-bottom: 12px;
        }

        .card-brand {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255,30,75,0.08);
          border: 1px solid rgba(255,30,75,0.22);
          margin-bottom: 8px;
          font-size: 10.5px;
          font-weight: 800;
          color: #ff8ca3;
          letter-spacing: 0.2px;
        }

        .card-title {
          font-size: 15.5px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.3px;
        }

        .card-sub {
          font-size: 11.5px;
          color: var(--muted);
          margin-top: 2px;
          word-break: break-word;
        }

        /* TIMER */
        .timer-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 10px;
          transition: all 0.3s ease;
        }

        .timer-card.warning {
          border-color: rgba(255,184,52,0.35);
          background: rgba(255,184,52,0.07);
        }

        .timer-icon {
          width: 26px; height: 26px; border-radius: 8px;
          display: grid; place-items: center;
          background: rgba(255,45,85,0.12);
          color: var(--red-light);
          flex-shrink: 0;
        }
        .timer-card.warning .timer-icon {
          background: rgba(255,184,52,0.15);
          color: var(--gold);
        }
        .timer-icon svg { width: 14px; height: 14px; }

        .timer-body { flex: 1; min-width: 0; }
        .timer-label { font-size: 10px; font-weight: 700; color: var(--muted-dim); text-transform: uppercase; letter-spacing: 0.5px; }
        .timer-value {
          font-size: 16px;
          font-weight: 900;
          color: #fff;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.2px;
        }
        .timer-card.warning .timer-value { color: var(--gold); }

        .timer-badge {
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          background: rgba(43,242,154,0.12);
          color: var(--green);
          border: 1px solid rgba(43,242,154,0.25);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .timer-card.warning .timer-badge {
          background: rgba(255,184,52,0.12);
          color: var(--gold);
          border-color: rgba(255,184,52,0.3);
        }

        /* AMOUNT */
        .amount-card {
          padding: 10px 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,30,75,0.14), rgba(180,10,40,0.08));
          border: 1px solid rgba(255,45,85,0.28);
          text-align: center;
          margin-bottom: 10px;
        }
        .amount-value {
          font-size: 27px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.8px;
          line-height: 1.1;
        }
        .amount-sub {
          font-size: 10.5px;
          font-weight: 700;
          color: #ff8ca3;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* UPI INFO */
        .upi-info-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 11px;
          border-radius: 11px;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 10px;
          gap: 8px;
        }
        .upi-info-details { min-width: 0; flex: 1; }
        .upi-id-text {
          font-size: 12.5px;
          font-weight: 800;
          color: #fff;
          font-family: monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .upi-merchant-text {
          font-size: 10px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .copy-upi-btn {
          padding: 5px 9px;
          border-radius: 7px;
          background: rgba(255,45,85,0.14);
          border: 1px solid rgba(255,45,85,0.3);
          color: #ff8ca3;
          font-size: 10.5px;
          font-weight: 800;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .copy-upi-btn:hover {
          background: rgba(255,45,85,0.22);
          color: #fff;
        }

        /* QR SECTION */
        .qr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 0 12px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 12px;
        }
        .qr-wrap {
          padding: 10px;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 30px rgba(255,30,75,0.18);
          margin-bottom: 8px;
        }
        .qr-wrap img {
          width: 125px;
          height: 125px;
          display: block;
          image-rendering: pixelated;
        }
        .qr-hint {
          font-size: 10.5px;
          color: var(--muted);
          text-align: center;
          line-height: 1.35;
          margin-bottom: 8px;
        }
        .qr-hint strong { color: #fff; }

        .app-intents-row {
          width: 100%;
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }
        .intent-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 6px;
          border-radius: 9px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          font-size: 10.5px;
          font-weight: 800;
          color: #fff;
          text-decoration: none;
          transition: all 0.2s;
          text-align: center;
        }
        .intent-btn:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.25);
        }

        .pay-intent-primary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: 11px;
          background: linear-gradient(135deg, #ff1e4b 0%, #b80028 100%);
          border: 1px solid rgba(255,45,85,0.4);
          box-shadow: 0 6px 20px rgba(255,30,75,0.3);
          font-size: 12px;
          font-weight: 900;
          color: #fff;
          text-decoration: none;
          margin-bottom: 8px;
          transition: all 0.2s;
        }
        .pay-intent-primary:hover {
          box-shadow: 0 8px 24px rgba(255,30,75,0.5);
          transform: translateY(-1px);
        }

        .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--muted);
          padding: 4px 9px;
          border-radius: 7px;
          border: 1px dashed rgba(255,255,255,0.14);
          transition: all 0.2s;
        }
        .download-btn:hover {
          color: #fff;
          border-color: rgba(255,255,255,0.3);
        }
        .download-btn svg { width: 12px; height: 12px; }

        /* UTR SECTION */
        .utr-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .utr-header {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .utr-header-icon {
          width: 22px; height: 22px; border-radius: 7px;
          display: grid; place-items: center;
          background: rgba(43,242,154,0.12);
          color: var(--green);
        }
        .utr-header-icon svg { width: 12px; height: 12px; }
        .utr-header-title { font-size: 11.5px; font-weight: 800; color: #fff; }
        .utr-header-sub { font-size: 9.5px; color: var(--muted-dim); }

        .utr-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .utr-input-icon {
          position: absolute; left: 12px;
          color: var(--muted-dim);
          pointer-events: none;
          display: grid; place-items: center;
        }
        .utr-input-icon svg { width: 14px; height: 14px; }
        .utr-input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          border-radius: 11px;
          background: rgba(0,0,0,0.45);
          border: 1.5px solid rgba(255,255,255,0.12);
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.8px;
          color: #fff;
          font-family: monospace;
          outline: none;
          transition: all 0.2s;
        }
        .utr-input:focus {
          border-color: var(--red-primary);
          box-shadow: 0 0 16px rgba(255,30,75,0.3);
          background: rgba(10,2,5,0.7);
        }
        .utr-input.shake {
          animation: shakeAnim 0.4s ease-in-out;
          border-color: #ff4d6d;
        }
        @keyframes shakeAnim {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }

        .utr-verify-btn {
          width: 100%;
          padding: 11px 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, #2bf29a 0%, #10b673 100%);
          box-shadow: 0 8px 24px rgba(43,242,154,0.35);
          color: #051a0f;
          font-size: 12.5px;
          font-weight: 900;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .utr-verify-btn:hover:not(:disabled) {
          box-shadow: 0 10px 28px rgba(43,242,154,0.5);
          transform: translateY(-1px);
        }
        .utr-verify-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }

        .utr-alert {
          padding: 8px 10px;
          border-radius: 9px;
          background: rgba(255,30,75,0.12);
          border: 1px solid rgba(255,30,75,0.3);
          font-size: 10.5px;
          font-weight: 700;
          color: #ff8ca3;
          line-height: 1.4;
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .utr-alert svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; color: #ff4d6d; }

        .utr-help {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          color: var(--muted-dim);
          justify-content: center;
          margin-top: 2px;
        }
        .utr-help svg { width: 11px; height: 11px; }

        /* SUCCESS STATE */
        .success-card {
          width: 100%;
          padding: 24px 18px 20px;
          border-radius: 18px;
          background: linear-gradient(165deg, rgba(10,26,16,0.95), rgba(4,14,8,0.98));
          border: 1px solid rgba(43,242,154,0.35);
          box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 50px rgba(43,242,154,0.18);
          text-align: center;
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
        .success-title {
          font-size: 18px; font-weight: 900; color: #fff; letter-spacing: -0.3px; margin-bottom: 4px;
        }
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

        /* ERROR CARD */
        .error-card {
          width: 100%;
          padding: 30px 18px 24px;
          border-radius: 18px;
          background: linear-gradient(165deg, rgba(28,7,12,0.95), rgba(14,3,7,0.98));
          border: 1px solid rgba(255,45,85,0.3);
          box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 50px rgba(255,30,75,0.15);
          text-align: center;
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

        .action-btn-row {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        .btn-clean {
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          transition: all 0.2s;
        }
        .btn-retry {
          background: linear-gradient(135deg, #ff1e4b 0%, #b80028 100%);
          border: 1px solid rgba(255,45,85,0.4);
          color: #fff;
          box-shadow: 0 6px 18px rgba(255,30,75,0.3);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.16);
          color: #fff;
        }

        /* EXPIRED OVERLAY */
        .expired-overlay {
          position: absolute;
          inset: 0;
          background: rgba(7,1,2,0.92);
          backdrop-filter: blur(6px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          text-align: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 20;
        }
        .expired-overlay.show {
          opacity: 1;
          pointer-events: auto;
        }
        .expired-icon {
          width: 48px; height: 48px; border-radius: 50%;
          background: rgba(255,184,52,0.15);
          border: 1.5px solid rgba(255,184,52,0.35);
          color: var(--gold);
          display: grid; place-items: center;
          margin-bottom: 12px;
        }
        .expired-icon svg { width: 22px; height: 22px; }
        .expired-title { font-size: 16px; font-weight: 900; color: #fff; margin-bottom: 6px; }
        .expired-sub { font-size: 11px; color: var(--muted); line-height: 1.45; margin-bottom: 16px; max-width: 260px; }
        .refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ff1e4b, #b80028);
          border: 1px solid rgba(255,45,85,0.4);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 6px 20px rgba(255,30,75,0.35);
        }
        .refresh-btn svg { width: 14px; height: 14px; }

        /* SKELETON */
        .skeleton-box {
          background: linear-gradient(90deg, rgba(255,45,85,0.06) 25%, rgba(255,45,85,0.16) 50%, rgba(255,45,85,0.06) 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.6s ease-in-out infinite;
          border-radius: 8px;
        }
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* TRUST + POWERED */
        .trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .trust-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .trust-item svg { width: 17px; height: 17px; color: rgba(184,159,165,0.55); }
        .trust-item span {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: rgba(184,159,165,0.55);
          text-transform: uppercase;
        }

        .powered-by {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--muted-dim);
          letter-spacing: 0.3px;
        }
        .powered-by svg { width: 12px; height: 12px; color: rgba(184,159,165,0.5); }
        .powered-by b { color: var(--muted); font-weight: 900; }

        /* TOAST */
        .toast {
          position: fixed;
          bottom: 20px; left: 50%;
          transform: translateX(-50%) translateY(120%);
          z-index: 100;
          display: flex; align-items: center; gap: 9px;
          padding: 10px 15px;
          border-radius: 11px;
          background: linear-gradient(165deg, rgba(28,8,14,0.97), rgba(14,3,7,0.98));
          border: 1px solid var(--card-border);
          box-shadow: 0 14px 34px rgba(0,0,0,0.6), 0 0 26px rgba(255,30,75,0.15);
          font-size: 12px; font-weight: 700; color: #fff;
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }
        .toast.toast-error {
          border-color: rgba(255,30,75,0.4);
          box-shadow: 0 14px 34px rgba(0,0,0,0.6), 0 0 26px rgba(255,30,75,0.3);
        }
        .toast.toast-success {
          border-color: rgba(43,242,154,0.4);
          box-shadow: 0 14px 34px rgba(0,0,0,0.6), 0 0 26px rgba(43,242,154,0.2);
        }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
        .toast-icon {
          width: 22px; height: 22px; border-radius: 7px;
          display: grid; place-items: center;
          background: rgba(43,242,154,0.14);
          color: #2bf29a;
          border: 1px solid rgba(43,242,154,0.28);
          flex-shrink: 0;
        }
        .toast-error .toast-icon {
          background: rgba(255,30,75,0.14);
          color: #ff4d6d;
          border-color: rgba(255,30,75,0.3);
        }

        @media (max-width: 420px) {
          .pay-card { padding: 14px 14px 12px; }
          .amount-value { font-size: 24px; }
          .qr-wrap img { width: 110px; height: 110px; }
          .timer-value { font-size: 15px; }
          .trust-row { gap: 14px; }
        }
      `}</style>

      <div className="page-stack">

        {/* 0. CANCELLED SCREEN */}
        {isCancelled ? (
          <div className="error-card" style={{ borderColor: 'rgba(255,184,52,0.35)' }}>
            <div className="error-icon" style={{ background: 'rgba(255,184,52,0.12)', color: '#ffb834', borderColor: 'rgba(255,184,52,0.35)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="error-title">Payment Cancelled</div>
            <p className="error-sub" style={{ maxWidth: '340px' }}>
              Payment cancelled. Agar aapka paisa kat gaya hai to apne bank statement se UTR lekar merchant ko bhejein.
            </p>

            <div className="action-btn-row">
              <button
                type="button"
                className="btn-clean btn-retry"
                onClick={startNewCheckout}
              >
                Pay again
              </button>
              <button
                type="button"
                className="btn-clean btn-secondary"
                onClick={handleGoHome}
              >
                Return Home
              </button>
            </div>
          </div>
        ) : failedState !== null ? (
          /* 0.5. PAYMENT FAILED / INCOMPLETE SCREEN */
          <div className="error-card" style={{ borderColor: 'rgba(255,45,85,0.45)' }}>
            <div className="error-icon" style={{ background: 'rgba(255,30,75,0.14)', color: '#ff4d6d' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="error-title">Payment Incomplete</div>
            <p className="error-sub" style={{ maxWidth: '360px', color: '#ffc2cc' }}>
              We received your payment but could not complete it. Please contact the merchant with UTR: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{failedState.utr || utr || '—'}</strong>.
            </p>
            {failedState.message && (
              <div style={{
                fontSize: '11.5px',
                color: '#ff8ca3',
                background: 'rgba(255,45,85,0.08)',
                border: '1px solid rgba(255,45,85,0.25)',
                borderRadius: '10px',
                padding: '8px 12px',
                margin: '0 auto 16px',
                maxWidth: '340px',
                textAlign: 'center'
              }}>
                {failedState.message}
              </div>
            )}

            <div className="action-btn-row">
              <button
                type="button"
                className="btn-clean btn-retry"
                onClick={startNewCheckout}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn-clean btn-secondary"
                onClick={handleGoHome}
              >
                Return Home
              </button>
            </div>
          </div>
        ) : isSuccess ? (
          /* 1. SUCCESS SCREEN */
          <div className="success-card">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="success-title">Payment Verified!</div>
            <div className="success-sub">Your transaction has been confirmed successfully</div>

            {/* Test Payment Label */}
            {(isTestMode || orderResult?.test || orderResult?.test_mode) && (
              <div style={{
                margin: '10px auto 14px',
                padding: '6px 14px',
                borderRadius: '10px',
                background: 'rgba(255,184,52,0.15)',
                border: '1px solid rgba(255,184,52,0.35)',
                color: '#ffb834',
                fontSize: '11.5px',
                fontWeight: 800,
                textAlign: 'center'
              }}>
                Test payment successful (no real money moved)
              </div>
            )}

            <div className="success-details">
              <div className="success-row">
                <span>Amount Paid</span>
                <strong style={{ color: '#2bf29a', fontSize: '13.5px' }}>₹{displayAmount}</strong>
              </div>
              <div className="success-row">
                <span>UTR Reference</span>
                <strong>{utr || orderResult?.utr || '—'}</strong>
              </div>
              {orderResult?.order_id && (
                <div className="success-row">
                  <span>Order ID</span>
                  <strong>{orderResult.order_id}</strong>
                </div>
              )}
              <div className="success-row">
                <span>Merchant</span>
                <strong>{merchantName}</strong>
              </div>
              <div className="success-row">
                <span>Title</span>
                <strong>{title}</strong>
              </div>
            </div>

            <button
              className="refresh-btn"
              onClick={handleGoHome}
              style={{
                background: 'linear-gradient(135deg, #2bf29a 0%, #10b673 100%)',
                boxShadow: '0 10px 26px rgba(43,242,154,0.35)',
                color: '#07180e',
                margin: '0 auto'
              }}
            >
              Done
            </button>
          </div>
        ) : isLoading ? (
          /* 2. LOADING SKELETON */
          <div className="pay-card" style={{ padding: '28px 18px', textAlign: 'center' }}>
            <div className="skeleton-box" style={{ width: '130px', height: '18px', margin: '0 auto 10px' }} />
            <div className="skeleton-box" style={{ width: '80px', height: '12px', margin: '0 auto 20px' }} />
            
            <div className="skeleton-box" style={{ width: '100%', height: '48px', borderRadius: '12px', marginBottom: '10px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '65px', borderRadius: '12px', marginBottom: '10px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '40px', borderRadius: '10px', marginBottom: '12px' }} />
            <div className="skeleton-box" style={{ width: '130px', height: '130px', margin: '0 auto 12px', borderRadius: '12px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '90px', borderRadius: '12px' }} />
          </div>
        ) : errorKind !== null ? (
          /* 3. ERROR SCREEN (404, 409, 429, NETWORK, NO_UPI, ORDER_UNSUPPORTED, INACTIVE) */
          <div className="error-card">
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="error-title">
              {errorKind === '404' && 'Payment Link Not Found'}
              {errorKind === '409' && 'Merchant Unavailable'}
              {errorKind === '429' && 'Too Many Checkouts'}
              {errorKind === 'network' && 'Connection Error'}
              {errorKind === 'no_upi' && 'Payment Unavailable'}
              {errorKind === 'order_unsupported' && 'Payment Link Required'}
              {errorKind === 'inactive' && 'Payment Link Disabled'}
              {errorKind === 'generic' && 'Unable to Load Payment'}
            </div>
            <p className="error-sub">
              {errorKind === '429'
                ? (errorMessage || 'Too many people are paying right now. Please try again in a minute.')
                : errorMessage}
            </p>

            <div className="action-btn-row">
              {(errorKind === 'network' || errorKind === '429') && (
                <button
                  type="button"
                  className="btn-clean btn-retry"
                  onClick={loadPaymentData}
                >
                  Retry Payment
                </button>
              )}
              <button
                type="button"
                className="btn-clean btn-secondary"
                onClick={handleGoHome}
              >
                Return Home
              </button>
            </div>
          </div>
        ) : (
          /* 4. ACTIVE PAYMENT CARD */
          <div className="pay-card">

            {/* Header */}
            <div className="card-head">
              <div className="card-brand">
                <span>Direct Cashier Checkout</span>
              </div>
              <div className="card-title">{title}</div>
              {data?.note && <div className="card-sub">{data.note}</div>}
            </div>

            {/* Test Mode Banner */}
            {isTestMode && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(255,184,52,0.12)',
                border: '1px solid rgba(255,184,52,0.35)',
                color: '#ffb834',
                fontSize: '12px',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: '1.45',
                marginBottom: '14px'
              }}>
                TEST MODE: no real money. Enter UTR 000000000000 to simulate a successful payment.
              </div>
            )}

            {/* Countdown Timer */}
            <PaymentCountdownTimer
              expiresAt={expiresAt}
              serverTimeOffset={serverTimeOffset}
              isExpired={isExpired}
              onExpire={() => setIsExpired(true)}
            />

            {/* Amount */}
            <div className="amount-card">
              <div className="amount-value">₹{displayAmount}</div>
              <div className="amount-sub">Amount to Pay</div>
              {hasUniqueAmount && (
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#ffb834',
                  background: 'rgba(255,184,52,0.1)',
                  border: '1px solid rgba(255,184,52,0.3)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  marginTop: '6px',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  Please pay exactly ₹{displayAmount}. This exact amount identifies your payment.
                </div>
              )}
            </div>

            {/* UPI & QR Section (Hidden in Test Mode so user does not accidentally send real money) */}
            {!isTestMode && (
              <>
                {/* UPI ID & Merchant details */}
                <div className="upi-info-box">
                  <div className="upi-info-details">
                    <div className="upi-id-text">{activeUpi}</div>
                    <div className="upi-merchant-text">{merchantName}</div>
                  </div>
                  <button
                    type="button"
                    className="copy-upi-btn"
                    onClick={() => copyToClipboard(activeUpi, 'UPI ID')}
                    title="Copy UPI ID"
                  >
                    Copy ID
                  </button>
                </div>

                {/* QR Section */}
                <div className="qr-section">
                  <div className="qr-wrap">
                    <img
                      src={qrImageSrc}
                      alt="Scan QR code to pay"
                      crossOrigin="anonymous"
                    />
                  </div>

                  {/* Direct UPI Intent Button */}
                  {upiPayUrl && (
                    <a
                      href={upiPayUrl}
                      className="pay-intent-primary"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" />
                        <path d="M12 18h.01" />
                      </svg>
                      <span>Pay via UPI App</span>
                    </a>
                  )}

                  {/* Specific app intents for mobile devices */}
                  {activeUpi && (
                    <div className="app-intents-row">
                      <a
                        href={`fam://pay?pa=${encodeURIComponent(activeUpi)}&pn=${encodeURIComponent(merchantName)}&am=${displayAmount}&cu=INR&tn=${encodeURIComponent(title)}`}
                        className="intent-btn"
                        title="Pay with FamPay"
                      >
                        FamPay
                      </a>
                      <a
                        href={`gpay://upi/pay?pa=${encodeURIComponent(activeUpi)}&pn=${encodeURIComponent(merchantName)}&am=${displayAmount}&cu=INR&tn=${encodeURIComponent(title)}`}
                        className="intent-btn"
                        title="Pay with GPay"
                      >
                        GPay
                      </a>
                      <a
                        href={`phonepe://pay?pa=${encodeURIComponent(activeUpi)}&pn=${encodeURIComponent(merchantName)}&am=${displayAmount}&cu=INR&tn=${encodeURIComponent(title)}`}
                        className="intent-btn"
                        title="Pay with PhonePe"
                      >
                        PhonePe
                      </a>
                    </div>
                  )}

                  <div className="qr-hint">
                    Scan with any UPI app or click button above
                  </div>

                  <button
                    type="button"
                    className="download-btn"
                    onClick={handleDownloadQr}
                    disabled={isDownloading}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12M7 10l5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                    {isDownloading ? 'Saving...' : 'Download QR'}
                  </button>
                </div>

                {/* Auto payment detection status line */}
                <div style={{
                  margin: '14px 0',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(255,30,75,0.06)',
                  border: '1px solid rgba(255,45,85,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: 700 }}>
                    {autoDetect === false ? (
                      <>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffb834', flexShrink: 0 }} />
                        <span style={{ color: '#ffb834' }}>
                          Auto-detection unavailable. Enter your UTR below after paying.
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2bf29a', flexShrink: 0, boxShadow: '0 0 10px #2bf29a' }} />
                        <span style={{ color: '#fff2f4' }}>
                          Waiting for your payment...
                        </span>
                      </>
                    )}
                  </div>

                  {isReconnecting && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255,184,52,0.15)',
                      color: '#ffb834',
                      border: '1px solid rgba(255,184,52,0.3)',
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                      flexShrink: 0
                    }}>
                      Reconnecting...
                    </span>
                  )}
                </div>
              </>
            )}

            {/* UTR Verification Section */}
            <div className="utr-section">
              <div className="utr-header">
                <div className="utr-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="3" width="14" height="18" rx="2" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                  </svg>
                </div>
                <div>
                  <div className="utr-header-title">
                    {isTestMode ? 'Enter Test UTR' : 'Paid but not confirmed automatically? Enter your UTR.'}
                  </div>
                  <div className="utr-header-sub">
                    {isTestMode ? 'Use 000000000000 to simulate test verification' : 'Submit your 6-30 character UPI reference code to verify manually'}
                  </div>
                </div>
              </div>

              <div className="utr-input-wrap">
                <span className="utr-input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M6 10h4M6 14h8" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={utr}
                  onChange={handleUtrChange}
                  className={`utr-input ${isShaking ? 'shake' : ''}`}
                  placeholder={isTestMode ? '000000000000' : 'e.g. 623851978381'}
                  autoComplete="off"
                  maxLength={30}
                  disabled={isExpired || isVerifying}
                />
              </div>

              {isTestMode && (
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setUtr('000000000000');
                      if (verifyError) setVerifyError(null);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,184,52,0.18)',
                      border: '1px solid rgba(255,184,52,0.4)',
                      color: '#ffb834',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Fill test UTR
                  </button>
                </div>
              )}

              {verifyError && (
                <div className="utr-alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{verifyError}</span>
                </div>
              )}

              <button
                type="button"
                className="utr-verify-btn"
                onClick={handleVerify}
                disabled={isExpired || isVerifying || !isUtrValid}
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>Verifying UTR...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Verify Payment</span>
                  </>
                )}
              </button>

              <div className="utr-help">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                Find 6-30 digit Ref / UTR number in your UPI transaction receipt
              </div>
            </div>

            {/* Cancel payment secondary action */}
            {!isExpired && !isSuccess && !isCancelled && (
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#83686e',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    textDecoration: 'underline',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d6d')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#83686e')}
                >
                  Cancel payment
                </button>
              </div>
            )}

            {/* Expired Overlay */}
            <div className={`expired-overlay ${isExpired ? 'show' : ''}`}>
              <div className="expired-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div className="expired-title">This checkout expired</div>
              <div className="expired-sub">This payment checkout has expired. Start a new checkout to get a fresh QR code and timer.</div>
              <button type="button" className="refresh-btn" onClick={startNewCheckout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
                </svg>
                Start new checkout
              </button>
            </div>

          </div>
        )}

        {/* Security badges */}
        <div className="trust-row">
          <div className="trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>PCI DSS</span>
          </div>
          <div className="trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span>SSL 256-BIT</span>
          </div>
          <div className="trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>VERIFIED</span>
          </div>
          <div className="trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="2" width="12" height="20" rx="2" />
              <path d="M12 18h.01" />
            </svg>
            <span>UPI AUTO</span>
          </div>
        </div>

        <div className="powered-by">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          Powered by <b>HamroPay</b>
        </div>

      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(4, 1, 2, 0.85)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(28, 6, 12, 0.98), rgba(14, 2, 6, 0.99))',
              border: '1px solid rgba(255, 45, 85, 0.3)',
              padding: '24px',
              boxShadow: '0 40px 90px rgba(0,0,0,0.85)',
              color: '#fff2f4'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '15px', fontWeight: 900, marginBottom: '8px', color: '#fff' }}>
              Cancel this payment?
            </div>
            <p style={{ fontSize: '12px', color: '#d4c2c7', lineHeight: '1.6', marginBottom: '20px' }}>
              Cancel this payment? Agar aap paisa bhej chuke hain to apna UTR sambhal ke rakhein aur merchant se sampark karein.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Keep paying
              </button>
              <button
                type="button"
                onClick={handleCancelPayment}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ff1e4b, #d8002f)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(255,30,75,0.35)'
                }}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`toast ${toastShow ? 'show' : ''} ${toastType === 'error' ? 'toast-error' : toastType === 'success' ? 'toast-success' : ''}`}>
        <div className="toast-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            {toastType === 'error' ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M20 6 9 17l-5-5" />
            )}
          </svg>
        </div>
        <span>{toastMsg}</span>
      </div>

    </div>
  );
};

export { PayPage };
export default PayPage;
