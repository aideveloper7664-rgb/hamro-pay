import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DeveloperOrderPay } from './DeveloperOrderPay';
import { BrandingObject, DEFAULT_BRANDING } from '../../services/customize.service';
import { 
  Clock, Copy, Check, Smartphone, Download, AlertCircle, 
  CheckCircle2, X, RefreshCw, ShieldCheck, Lock, ExternalLink
} from 'lucide-react';

const API_URL = 'https://hamropay-backends.onrender.com';
const TOTAL_SECONDS = 8 * 60;

export const isPaymentLinkId = (idStr: string): boolean => {
  if (!idStr) return false;
  return idStr.startsWith('lnk_') || idStr.startsWith('link_') || idStr.startsWith('pl_');
};

export const isOrderId = (idStr: string): boolean => {
  if (!idStr) return false;
  return idStr.startsWith('ORD_') || idStr.startsWith('ord_');
};

export const isApiOrderId = (idStr: string): boolean => {
  if (!idStr) return false;
  return /^HP[0-9A-Z]+$/.test(idStr);
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

const getInitialPayId = (): string => {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    let extractedId = '';
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
    return extractedId.trim();
  }
  return '';
};

const PayPage: React.FC<PayPageProps> = ({ onBackToDashboard }) => {
  const [id, setId] = useState<string>(getInitialPayId);
  const [branding, setBranding] = useState<BrandingObject>(DEFAULT_BRANDING);
  const [logoError, setLogoError] = useState<boolean>(false);

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

  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const handleGoHome = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
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

  // Extract ID on mount
  useEffect(() => {
    const extractedId = getInitialPayId();
    setId(extractedId);
  }, []);

  // Fetch Public Payment Link and Initiate Checkout Session
  const loadPaymentData = useCallback(async () => {
    if (!id || isApiOrderId(id)) {
      if (!id) {
        setIsLoading(false);
        setErrorKind('404');
        setErrorMessage('This payment link is invalid or has been removed');
      }
      return;
    }

    if (isOrderId(id)) {
      setIsLoading(false);
      setErrorKind('order_unsupported');
      setErrorMessage('Please use a payment link');
      return;
    }

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

      // Extract and apply branding
      const loadedBranding: BrandingObject | undefined = resData?.data?.branding || resData?.branding || paymentData?.branding;
      if (loadedBranding && loadedBranding.vars) {
        setBranding(loadedBranding);
      }

      if (!paymentData || paymentData.amount === undefined || paymentData.amount === null) {
        setErrorKind('404');
        setErrorMessage('This payment link is invalid or has been removed');
        setIsLoading(false);
        return;
      }

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

      // Initiate checkout session for live links
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
    if (id && !isApiOrderId(id)) {
      loadPaymentData();
    }
  }, [id, loadPaymentData]);

  // Polling loop for Live session status
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
              return;
            }

            if (currentStatus === 'cancelled') {
              try { sessionStorage.removeItem(`hamropay_session_${idRef.current}`); } catch {}
              setIsCancelled(true);
              return;
            }

            if (currentStatus === 'expired') {
              try { sessionStorage.removeItem(`hamropay_session_${idRef.current}`); } catch {}
              setIsExpired(true);
              return;
            }

            if (currentStatus === 'disabled') {
              setErrorKind('inactive');
              setErrorMessage('This payment link has been disabled by the merchant.');
              return;
            }

            if (currentStatus === 'failed') {
              setFailedState({ utr: stData.utr, message: stData.message });
              return;
            }
          }
        } else {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 2) {
            setIsReconnecting(true);
          }
        }
      } catch {
        if (active && !controller.signal.aborted) {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 2) {
            setIsReconnecting(true);
          }
        }
      } finally {
        clearTimeout(timeoutId);
        controller.signal.removeEventListener('abort', onGlobalAbort);
        inFlightRef.current = false;
        if (active && !controller.signal.aborted && !isTerminalRef.current) {
          pollTimerRef.current = setTimeout(pollStatus, 3000);
        }
      }
    };

    pollTimerRef.current = setTimeout(pollStatus, 2000);

    return () => {
      active = false;
      controller.abort();
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [sessionId, isTerminal]);

  // Cancel Payment Flow
  const handleCancelPayment = async () => {
    setShowCancelModal(false);
    if (sessionId) {
      try {
        await fetch(`${API_URL}/api/payment-link/session/${encodeURIComponent(sessionId)}/cancel`, {
          method: 'POST'
        });
      } catch {}
    }
    try { sessionStorage.removeItem(`hamropay_session_${id}`); } catch {}
    setIsCancelled(true);
  };

  const startNewCheckout = () => {
    try { sessionStorage.removeItem(`hamropay_session_${id}`); } catch {}
    sessionCreatingRef.current = false;
    setIsExpired(false);
    setIsCancelled(false);
    setFailedState(null);
    setOrderResult(null);
    setUtr('');
    setVerifyError(null);
    loadPaymentData();
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      showToast(`${label} copied to clipboard!`, 'success');
    }).catch(() => {
      showToast(`Could not copy ${label}`, 'error');
    });
  };

  const handleDownloadQr = async () => {
    const src = sessionQrCode || (data ? `${API_URL}/api/payment-link/${encodeURIComponent(id)}/qr` : '');
    if (!src) return;

    setIsDownloading(true);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `hamropay-qr-${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast('QR code downloaded', 'success');
    } catch {
      showToast('Could not download QR', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUtrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^A-Za-z0-9]/g, '');
    setUtr(val);
    if (verifyError) setVerifyError(null);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
  };

  const handleVerify = async () => {
    if (isVerifying || isExpired) return;

    const trimmedUtr = utr.trim();
    if (!trimmedUtr) {
      triggerShake();
      setVerifyError('Please enter your UTR number');
      showToast('Please enter UTR', 'error');
      return;
    }

    if (trimmedUtr.length < 6 || trimmedUtr.length > 30) {
      triggerShake();
      setVerifyError('UTR must be between 6 and 30 characters');
      showToast('Invalid UTR length', 'error');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const verifyUrl = `${API_URL}/api/payment-link/${encodeURIComponent(id)}/verify`;
      const verifyBody = sessionId
        ? { utr: trimmedUtr, session_id: sessionId }
        : { utr: trimmedUtr };

      const res = await fetch(verifyUrl, {
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
        if (resData?.test_mode || resData?.data?.test || data?.is_test) {
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

  // Route to developer API order view if HP...
  if (isApiOrderId(id)) {
    return <DeveloperOrderPay orderId={id} onBackToDashboard={onBackToDashboard} />;
  }

  const isTestMode = Boolean(data?.is_test);
  const title = data?.title || 'Payment Checkout';
  const merchantName = branding.brand_name || data?.merchant_name || 'Merchant';
  const displayAmount = payAmount > 0 ? payAmount.toFixed(2) : (data?.amount ? data.amount.toFixed(2) : '0.00');
  const hasUniqueAmount = baseAmount > 0 && payAmount > 0 && payAmount !== baseAmount;

  const upiPayUrl = activeUpi
    ? `upi://pay?pa=${encodeURIComponent(activeUpi)}&pn=${encodeURIComponent(merchantName)}&am=${displayAmount}&cu=INR&tn=${encodeURIComponent(title)}`
    : '';

  const qrImageSrc = sessionQrCode || `${API_URL}/api/payment-link/${encodeURIComponent(id)}/qr`;
  const firstLetter = merchantName.charAt(0).toUpperCase() || 'M';

  return (
    <div
      className="hp-page min-h-screen w-full flex flex-col items-center justify-center p-3.5 sm:p-6"
      data-mode={branding.mode || 'dark'}
      style={branding.vars as React.CSSProperties}
    >
      <div className="w-full max-w-[380px] flex flex-col items-center">

        {/* 1. CANCELLED SCREEN */}
        {isCancelled ? (
          <div className="hp-card w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center hp-badge-warn">
              <X className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Payment Cancelled</h2>
              <p className="text-xs hp-muted mt-1 leading-relaxed">
                Payment cancelled. If money was debited from your account, please contact the merchant with your bank UTR.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                className="hp-btn px-4 py-2 text-xs font-bold"
                onClick={startNewCheckout}
              >
                Pay again
              </button>
              <button
                type="button"
                className="hp-btn-ghost px-4 py-2 text-xs font-bold"
                onClick={handleGoHome}
              >
                Return Home
              </button>
            </div>
          </div>
        ) : failedState !== null ? (
          /* 2. PAYMENT FAILED / INCOMPLETE SCREEN */
          <div className="hp-card w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center hp-badge-bad">
              <AlertCircle className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Payment Incomplete</h2>
              <p className="text-xs hp-muted mt-1 leading-relaxed">
                We received your payment but could not complete it automatically. Please contact the merchant with UTR: <strong className="font-mono">{failedState.utr || utr || '—'}</strong>.
              </p>
            </div>
            {failedState.message && (
              <div className="p-2.5 rounded-xl text-xs font-semibold hp-badge-bad">
                {failedState.message}
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                className="hp-btn px-4 py-2 text-xs font-bold"
                onClick={startNewCheckout}
              >
                Try again
              </button>
              <button
                type="button"
                className="hp-btn-ghost px-4 py-2 text-xs font-bold"
                onClick={handleGoHome}
              >
                Return Home
              </button>
            </div>
          </div>
        ) : isSuccess ? (
          /* 3. SUCCESS SCREEN */
          <div className="hp-card w-full p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center hp-badge-ok">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Payment Verified!</h2>
              <div className="text-xs hp-muted mt-1">Your payment has been successfully confirmed.</div>
            </div>

            {isTestMode && (
              <div className="p-2 rounded-xl text-xs font-bold hp-badge-warn">
                Test payment successful (no real money moved)
              </div>
            )}

            <div className="hp-panel w-full p-3.5 space-y-2 text-left rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="hp-muted font-medium">Amount Paid</span>
                <span className="font-black font-mono" style={{ color: 'var(--hp-ok)' }}>₹{displayAmount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="hp-muted font-medium">UTR Reference</span>
                <span className="font-mono font-bold">{utr || orderResult?.utr || '—'}</span>
              </div>
              {orderResult?.order_id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="hp-muted font-medium">Order ID</span>
                  <span className="font-mono font-bold">{orderResult.order_id}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="hp-muted font-medium">Merchant</span>
                <span className="font-bold truncate max-w-[180px]">{merchantName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="hp-muted font-medium">Title</span>
                <span className="font-semibold truncate max-w-[180px]">{title}</span>
              </div>
            </div>

            <button
              type="button"
              className="hp-btn w-full py-2.5 text-xs font-black"
              onClick={handleGoHome}
            >
              Done
            </button>
          </div>
        ) : isLoading ? (
          /* 4. LOADING SKELETON */
          <div className="hp-card w-full p-6 text-center space-y-3 animate-pulse">
            <div className="w-12 h-12 rounded-full mx-auto bg-white/10" />
            <div className="w-32 h-4 rounded-md mx-auto bg-white/10" />
            <div className="w-48 h-3 rounded-md mx-auto bg-white/10" />
            <div className="w-full h-14 rounded-xl bg-white/10 mt-4" />
            <div className="w-40 h-40 rounded-xl mx-auto bg-white/10 my-4" />
            <div className="w-full h-11 rounded-xl bg-white/10" />
          </div>
        ) : errorKind !== null ? (
          /* 5. ERROR SCREEN */
          <div className="hp-card w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center hp-badge-bad">
              <AlertCircle className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {errorKind === '404' && 'Payment Link Not Found'}
                {errorKind === '409' && 'Merchant Unavailable'}
                {errorKind === '429' && 'Too Many Checkouts'}
                {errorKind === 'network' && 'Connection Error'}
                {errorKind === 'no_upi' && 'Payment Unavailable'}
                {errorKind === 'order_unsupported' && 'Payment Link Required'}
                {errorKind === 'inactive' && 'Payment Link Disabled'}
                {errorKind === 'generic' && 'Unable to Load Payment'}
              </h2>
              <p className="text-xs hp-muted mt-1 leading-relaxed">
                {errorKind === '429'
                  ? (errorMessage || 'Too many people are paying right now. Please try again in a minute.')
                  : errorMessage}
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              {(errorKind === 'network' || errorKind === '429') && (
                <button
                  type="button"
                  className="hp-btn px-4 py-2 text-xs font-bold"
                  onClick={loadPaymentData}
                >
                  Retry Payment
                </button>
              )}
              <button
                type="button"
                className="hp-btn-ghost px-4 py-2 text-xs font-bold"
                onClick={handleGoHome}
              >
                Return Home
              </button>
            </div>
          </div>
        ) : (
          /* 6. ACTIVE CHECKOUT CARD */
          <div className="w-full space-y-2.5">
            {/* TIMER */}
            <PaymentCountdownTimer
              expiresAt={expiresAt}
              serverTimeOffset={serverTimeOffset}
              isExpired={isExpired}
              onExpire={() => setIsExpired(true)}
            />

            {/* TEST MODE BANNER */}
            {isTestMode && (
              <div className="w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 hp-badge-warn">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span>⚠️</span>
                  <span>Test Mode (No Real Money)</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase">Simulator</span>
              </div>
            )}

            {/* MAIN CARD */}
            <div className="hp-card w-full p-5 flex flex-col items-center text-center relative overflow-hidden">
              
              {/* Header Brand */}
              <div className="flex flex-col items-center mb-3">
                {branding.logo_url && !logoError ? (
                  <img
                    src={branding.logo_url}
                    alt={merchantName}
                    className="max-h-10 object-contain mb-2"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black shadow-md mb-2 hp-btn">
                    {firstLetter}
                  </div>
                )}
                <h2 className="text-base font-extrabold tracking-tight truncate max-w-[280px]">
                  {merchantName}
                </h2>
                <div className="text-xs hp-muted font-medium mt-0.5">
                  {title}
                </div>
                {data?.note && (
                  <div className="text-[11px] hp-muted mt-1 italic max-w-[280px]">
                    {data.note}
                  </div>
                )}
              </div>

              {/* Amount Card */}
              <div className="hp-panel w-full py-3 px-4 mb-3.5 rounded-xl">
                <span className="text-[10px] uppercase font-extrabold tracking-wider block mb-0.5 hp-muted">
                  Amount to Pay
                </span>
                <div className="text-2xl font-black font-mono tracking-tight">
                  ₹{displayAmount}
                </div>
                {hasUniqueAmount && (
                  <div className="text-[11px] font-bold mt-1.5 p-1 rounded-lg hp-badge-warn">
                    Please pay exactly ₹{displayAmount}. This exact amount identifies your payment.
                  </div>
                )}
              </div>

              {/* QR & UPI Section (Live mode) */}
              {!isTestMode && (
                <div className="w-full flex flex-col items-center mb-3 space-y-3">
                  
                  {/* QR Box (always pure white inside for scan reliability) */}
                  <div className="flex flex-col items-center">
                    <div className="hp-qr-box">
                      <img
                        src={qrImageSrc}
                        alt="UPI Payment QR Code"
                        className="w-40 h-40 object-contain"
                        crossOrigin="anonymous"
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

                  {/* UPI ID Row */}
                  {activeUpi && (
                    <div className="hp-panel w-full p-2.5 px-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 text-left">
                        <span className="text-[9px] uppercase font-bold hp-muted tracking-wider block">
                          Merchant UPI ID
                        </span>
                        <span className="font-mono text-xs font-bold truncate block">
                          {activeUpi}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeUpi, 'UPI ID')}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg hp-btn-ghost flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3 hp-accent" />
                        <span>Copy</span>
                      </button>
                    </div>
                  )}

                  {/* Primary UPI Intent Button */}
                  {upiPayUrl && (
                    <a
                      href={upiPayUrl}
                      className="hp-btn w-full py-3 px-4 text-xs font-black tracking-wide flex items-center justify-center gap-2 cursor-pointer no-underline"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Pay via UPI App</span>
                    </a>
                  )}

                  {/* Status Indicator Pulse */}
                  <div className="flex items-center justify-center gap-2 py-1 text-xs font-bold hp-muted">
                    {autoDetect === false ? (
                      <>
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--hp-warn)' }} />
                        <span>Auto-detection unavailable. Enter UTR below.</span>
                      </>
                    ) : (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--hp-ok)' }} />
                          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--hp-ok)' }} />
                        </span>
                        <span>Waiting for your payment...</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* UTR Verification Section */}
              <div className="w-full pt-2 border-t border-[rgba(255,255,255,0.08)] space-y-2 text-left">
                <div className="text-[11px] font-extrabold hp-muted">
                  {isTestMode ? 'Test UTR Simulator' : 'Paid already? Enter UTR number:'}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={utr}
                    onChange={handleUtrChange}
                    placeholder={isTestMode ? '000000000000' : 'e.g. 623851978381'}
                    maxLength={30}
                    disabled={isExpired || isVerifying}
                    className={`hp-input w-full px-3 py-2 text-xs font-mono ${isShaking ? 'animate-bounce' : ''}`}
                  />
                  {isTestMode && (
                    <button
                      type="button"
                      onClick={() => setUtr('000000000000')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-extrabold hp-btn-ghost cursor-pointer"
                    >
                      Fill test UTR
                    </button>
                  )}
                </div>

                {verifyError && (
                  <div className="p-2 rounded-lg text-xs font-semibold hp-badge-bad flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isExpired || isVerifying || !isUtrValid}
                  className="hp-btn w-full py-2 px-3 text-xs font-extrabold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify Payment</span>
                    </>
                  )}
                </button>
              </div>

              {/* Cancel Action */}
              {!isExpired && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="mt-3 text-[11px] font-bold hp-muted hover:hp-accent transition cursor-pointer"
                >
                  Cancel payment
                </button>
              )}

            </div>
          </div>
        )}

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

      {/* CANCEL PAYMENT CONFIRMATION MODAL */}
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
              If you have already sent money, keep your bank UTR and contact the merchant.
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
                onClick={handleCancelPayment}
                className="hp-btn px-4 py-2 text-xs font-black cursor-pointer"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST OVERLAY */}
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

export { PayPage };
export default PayPage;
