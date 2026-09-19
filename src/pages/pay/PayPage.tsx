import React, { useState, useEffect, useRef } from 'react';

const API_URL = 'https://hamropay-backends.onrender.com';
const UPI_ID = '9769516928@fam';
const DEFAULT_MERCHANT = 'MOHD MUKHTAR';
const TOTAL_SECONDS = 8 * 60;

const PayPage: React.FC = () => {
  const [id, setId] = useState<string>('');
  const [data, setData] = useState<{ title?: string; amount?: number; merchant_name?: string; [key: string]: any } | null>(null);
  const [isLink, setIsLink] = useState<boolean>(false);

  // Timer
  const [remaining, setRemaining] = useState<number>(TOTAL_SECONDS);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // UTR & Verification State
  const [utr, setUtr] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string>('');
  const [toastShow, setToastShow] = useState<boolean>(false);
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');
  const toastTimerRef = useRef<any>(null);

  // QR Image Timestamp
  const [qrTimestamp, setQrTimestamp] = useState<number>(Date.now());
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMsg(msg);
    setToastType(type);
    setToastShow(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastShow(false);
    }, 2800);
  };

  // Get ID on mount
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
    setId(extractedId);
  }, []);

  // Fetch Payment Link or Order data
  useEffect(() => {
    if (!id) return;

    const linkMode = id.startsWith('lnk_');
    setIsLink(linkMode);

    const fetchUrl = linkMode
      ? `${API_URL}/api/payment-link/${id}`
      : `${API_URL}/order/status/${id}`;

    fetch(fetchUrl)
      .then((res) => res.json())
      .then((resData) => {
        if (resData?.success && resData?.data) {
          setData(resData.data);
        } else if (resData?.data) {
          setData(resData.data);
        } else if (resData?.amount) {
          setData(resData);
        }
      })
      .catch((err) => {
        console.error('Error fetching payment data:', err);
      });
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (isExpired || isSuccess) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired, isSuccess]);

  const amount = data?.amount || 99;
  const title = data?.title || 'demo';
  const merchantName = data?.merchant_name || DEFAULT_MERCHANT;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const isWarning = remaining <= 60 && remaining > 0;

  const handleReset = () => {
    setRemaining(TOTAL_SECONDS);
    setIsExpired(false);
    setUtr('');
    setQrTimestamp(Date.now());
    showToast('New payment session started', 'info');
  };

  const qrDataUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0&data=${encodeURIComponent(qrDataUrl)}&t=${qrTimestamp}`;

  const handleDownloadQr = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(qrImageSrc, { mode: 'cors' });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hamropay-qr-${amount}.png`;
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
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 20) {
      setUtr(val);
    }
  };

  const handleVerify = async () => {
    if (!utr || utr.trim().length < 8) {
      triggerShake();
      showToast('Enter valid UTR number (min 8 digits)', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      let endpoint = '';
      let bodyData: any = {};

      if (isLink || id.startsWith('lnk_')) {
        endpoint = `${API_URL}/api/payment-link/${id}/verify`;
        bodyData = { utr: utr.trim(), amount };
      } else {
        endpoint = `${API_URL}/order/verify`;
        bodyData = { order_id: id, utr: utr.trim() };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      const resData = await res.json();

      if (res.ok && resData?.success !== false) {
        setIsSuccess(true);
        showToast('Payment verified successfully!', 'success');
      } else {
        triggerShake();
        showToast(resData?.message || 'Verification failed. Check UTR.', 'error');
      }
    } catch (err) {
      console.error('Verify error:', err);
      triggerShake();
      showToast('Verification error. Please check your UTR.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, 'info');
    }
  };

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
          background:
            radial-gradient(circle at 85% 15%, rgba(255,30,75,0.14), transparent 32%),
            radial-gradient(circle at 15% 30%, rgba(180,10,40,0.12), transparent 28%),
            linear-gradient(180deg, #070102 0%, #0d0305 45%, #120306 100%);
          background-attachment: fixed;
          color: var(--text);
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
          width: 100%;
          padding: 14px;
          display: grid;
          place-items: center;
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
          margin: auto 0;
          padding: 4px 0;
        }

        /* CARD */
        .pay-card {
          width: 100%;
          padding: 14px 16px 12px;
          border-radius: 16px;
          background: linear-gradient(165deg, rgba(28,7,12,0.92), rgba(14,3,7,0.98));
          border: 1px solid var(--card-border);
          box-shadow:
            0 20px 60px rgba(0,0,0,0.6),
            0 0 50px rgba(255,30,75,0.10),
            inset 0 1px 0 rgba(255,255,255,0.05);
          position: relative;
          overflow: hidden;
        }

        .pay-card::before {
          content: "";
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,30,75,0.7), transparent);
          background-size: 200% 100%;
          animation: shine 5s linear infinite;
        }

        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* HEADER */
        .card-head {
          text-align: center;
          margin-bottom: 10px;
        }
        .card-title {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.3px;
          color: #fff;
          margin-bottom: 2px;
        }
        .card-sub {
          font-size: 10.5px;
          color: var(--muted);
          font-weight: 600;
          letter-spacing: 0.2px;
        }

        /* TIMER */
        .timer-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,184,52,0.10), rgba(255,184,52,0.02));
          border: 1px solid rgba(255,184,52,0.35);
          margin-bottom: 9px;
          transition: all 0.3s ease;
        }
        .timer-card.warning {
          background: linear-gradient(135deg, rgba(255,30,75,0.14), rgba(255,30,75,0.04));
          border-color: rgba(255,30,75,0.5);
          animation: timerPulse 1.5s ease-in-out infinite;
        }
        @keyframes timerPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,30,75,0); }
          50% { box-shadow: 0 0 0 6px rgba(255,30,75,0.10); }
        }
        .timer-icon {
          width: 30px; height: 30px; border-radius: 9px;
          display: grid; place-items: center;
          background: rgba(255,184,52,0.16);
          border: 1px solid rgba(255,184,52,0.35);
          color: #ffb834;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .timer-card.warning .timer-icon {
          background: rgba(255,30,75,0.16);
          border-color: rgba(255,30,75,0.35);
          color: #ff4d6d;
        }
        .timer-icon svg { width: 15px; height: 15px; }
        .timer-body { flex: 1; min-width: 0; }
        .timer-label {
          font-size: 9px;
          letter-spacing: 1.2px;
          font-weight: 800;
          text-transform: uppercase;
          color: rgba(255,184,52,0.85);
          margin-bottom: 2px;
          transition: color 0.3s ease;
        }
        .timer-card.warning .timer-label { color: rgba(255,77,109,0.9); }
        .timer-value {
          font-size: 17px;
          font-weight: 900;
          letter-spacing: -0.3px;
          color: #fff;
          font-family: 'SF Mono', 'Courier New', ui-monospace, monospace;
          line-height: 1;
          text-shadow: 0 0 16px rgba(255,184,52,0.4);
          transition: text-shadow 0.3s ease;
        }
        .timer-card.warning .timer-value { text-shadow: 0 0 16px rgba(255,30,75,0.6); }
        .timer-badge {
          font-size: 9px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(255,184,52,0.14);
          border: 1px solid rgba(255,184,52,0.4);
          color: #ffb834;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .timer-card.warning .timer-badge {
          background: rgba(255,30,75,0.14);
          border-color: rgba(255,30,75,0.4);
          color: #ff4d6d;
        }

        /* AMOUNT */
        .amount-card {
          padding: 10px 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,30,75,0.08), rgba(255,30,75,0.02));
          border: 1px solid rgba(255,45,85,0.22);
          text-align: center;
          margin-bottom: 9px;
          position: relative;
          overflow: hidden;
        }
        .amount-card::before {
          content: "";
          position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(115deg,
              rgba(255,255,255,0.014) 0px,
              rgba(255,255,255,0.014) 1px,
              transparent 1px,
              transparent 10px);
          pointer-events: none;
        }
        .amount-value {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -1px;
          line-height: 1.1;
          background: linear-gradient(135deg, #fff 0%, #ffd9e0 40%, #ff4d6d 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          margin-bottom: 2px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 3px 10px rgba(255,30,75,0.3));
        }
        .amount-sub {
          font-size: 10px;
          color: var(--muted);
          font-weight: 600;
          letter-spacing: 0.2px;
          position: relative;
          z-index: 1;
        }

        /* UPI INFO */
        .upi-info-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(91,141,255,0.06);
          border: 1px solid rgba(91,141,255,0.22);
          margin-bottom: 9px;
        }
        .upi-info-details {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .upi-id-text {
          font-size: 12px;
          font-weight: 800;
          color: #9ab4ff;
          font-family: 'SF Mono', 'Courier New', monospace;
        }
        .upi-merchant-text {
          font-size: 10px;
          color: var(--muted);
          font-weight: 600;
        }
        .copy-upi-btn {
          font-size: 10px;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(91,141,255,0.15);
          color: #9ab4ff;
          border: 1px solid rgba(91,141,255,0.3);
          transition: all 0.2s ease;
        }
        .copy-upi-btn:hover {
          background: rgba(91,141,255,0.3);
          color: #fff;
        }

        /* QR SECTION */
        .qr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(12,2,6,0.6);
          border: 1px solid rgba(255,45,85,0.16);
          margin-bottom: 9px;
        }
        .qr-wrap {
          position: relative;
          padding: 8px;
          border-radius: 11px;
          background: #fff;
          box-shadow: 0 6px 20px rgba(0,0,0,0.5), 0 0 24px rgba(255,30,75,0.15);
        }
        .qr-wrap img { display: block; width: 120px; height: 120px; border-radius: 4px; }
        .qr-wrap::before,
        .qr-wrap::after {
          content: "";
          position: absolute;
          width: 16px; height: 16px;
          border: 2.5px solid var(--red-primary);
          pointer-events: none;
        }
        .qr-wrap::before { top: -4px; left: -4px; border-right: none; border-bottom: none; border-top-left-radius: 5px; }
        .qr-wrap::after { bottom: -4px; right: -4px; border-left: none; border-top: none; border-bottom-right-radius: 5px; }
        .qr-hint {
          font-size: 10px;
          color: var(--muted);
          font-weight: 600;
          text-align: center;
          letter-spacing: 0.2px;
          line-height: 1.35;
        }
        .qr-hint strong { color: #ff94a7; font-weight: 800; }

        .download-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 7px 13px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #ff1e4b 0%, #d8002f 100%);
          box-shadow: 0 6px 18px rgba(255,30,75,0.35), inset 0 1px 0 rgba(255,255,255,0.18);
          transition: all 0.22s ease;
          position: relative;
          overflow: hidden;
        }
        .download-btn::before {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%);
          transform: translateX(-100%);
          transition: transform 0.7s ease;
        }
        .download-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(255,30,75,0.55);
        }
        .download-btn:hover::before { transform: translateX(100%); }
        .download-btn svg { width: 12px; height: 12px; }

        /* UTR SECTION */
        .utr-section {
          border-radius: 12px;
          background: rgba(12,2,6,0.6);
          border: 1px solid rgba(255,45,85,0.16);
          margin-bottom: 9px;
          padding: 12px;
          transition: border-color 0.25s ease;
        }
        .utr-section:hover { border-color: rgba(255,60,95,0.35); }

        .utr-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 11px;
        }
        .utr-header-icon {
          width: 32px; height: 32px; border-radius: 9px;
          display: grid; place-items: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, rgba(91,141,255,0.18), rgba(91,141,255,0.06));
          border: 1px solid rgba(91,141,255,0.35);
          color: #9ab4ff;
        }
        .utr-header-icon svg { width: 15px; height: 15px; }
        .utr-header-text { flex: 1; min-width: 0; }
        .utr-header-title {
          font-size: 12.5px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.2px;
          line-height: 1.2;
        }
        .utr-header-sub {
          font-size: 10px;
          color: var(--muted);
          font-weight: 600;
          margin-top: 2px;
          letter-spacing: 0.1px;
        }

        .utr-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 9px;
        }
        .utr-input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted-dim);
          pointer-events: none;
          transition: color 0.22s ease;
          display: grid;
          place-items: center;
        }
        .utr-input-icon svg { width: 15px; height: 15px; display: block; }
        .utr-input-wrap:focus-within .utr-input-icon { color: #ff5274; }

        .utr-input {
          width: 100%;
          padding: 11px 12px 11px 38px;
          border-radius: 10px;
          background: rgba(12,2,6,0.85);
          border: 1px solid rgba(255,45,85,0.22);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.6px;
          outline: none;
          transition: all 0.22s ease;
          font-family: 'SF Mono', 'Courier New', ui-monospace, monospace;
        }
        .utr-input::placeholder {
          color: rgba(184,159,165,0.45);
          font-weight: 500;
          font-family: Inter, system-ui, sans-serif;
          letter-spacing: 0;
        }
        .utr-input:hover { border-color: rgba(255,60,95,0.4); }
        .utr-input:focus {
          border-color: rgba(255,60,95,0.7);
          background: rgba(20,4,9,0.9);
          box-shadow:
            0 0 0 3px rgba(255,30,75,0.12),
            0 0 18px rgba(255,30,75,0.15);
        }

        @keyframes inputShakeKeyframes {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .utr-input.shake {
          animation: inputShakeKeyframes 0.4s ease;
          border-color: #ff1e4b !important;
          box-shadow: 0 0 0 3px rgba(255,30,75,0.25) !important;
        }

        .utr-verify-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 12px 16px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: -0.1px;
          color: #fff;
          background: linear-gradient(135deg, #ff1e4b 0%, #d8002f 100%);
          box-shadow:
            0 10px 26px rgba(255,30,75,0.4),
            inset 0 1px 0 rgba(255,255,255,0.2);
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .utr-verify-btn::before {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.25) 50%, transparent 65%);
          transform: translateX(-100%);
          transition: transform 0.7s ease;
        }
        .utr-verify-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 34px rgba(255,30,75,0.6);
        }
        .utr-verify-btn:hover::before { transform: translateX(100%); }
        .utr-verify-btn:active { transform: translateY(0); }
        .utr-verify-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .utr-verify-btn svg { width: 15px; height: 15px; }

        .utr-help {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: var(--muted);
          font-weight: 600;
          letter-spacing: 0.1px;
          line-height: 1.4;
          margin-top: 9px;
        }
        .utr-help svg { width: 12px; height: 12px; color: #5b8dff; flex-shrink: 0; }

        /* EXPIRED OVERLAY */
        .expired-overlay {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px;
          text-align: center;
          background: rgba(11,2,4,0.94);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 16px;
        }
        .expired-overlay.show { display: flex; animation: fadeIn 0.4s ease both; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .expired-icon {
          width: 60px; height: 60px; border-radius: 50%;
          display: grid; place-items: center;
          background: rgba(255,30,75,0.14);
          border: 1.5px solid rgba(255,30,75,0.4);
          color: #ff4d6d;
          box-shadow: 0 0 32px rgba(255,30,75,0.35);
        }
        .expired-icon svg { width: 28px; height: 28px; }
        .expired-title { font-size: 15px; font-weight: 900; color: #fff; letter-spacing: -0.3px; }
        .expired-sub { font-size: 11.5px; color: var(--muted); line-height: 1.5; max-width: 260px; }
        .refresh-btn {
          margin-top: 6px;
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          padding: 10px 18px;
          border-radius: 11px;
          font-size: 12.5px; font-weight: 900;
          color: #fff;
          background: linear-gradient(135deg, #ff1e4b 0%, #d8002f 100%);
          box-shadow: 0 10px 26px rgba(255,30,75,0.4);
          transition: all 0.22s ease;
        }
        .refresh-btn:hover { transform: translateY(-1px); box-shadow: 0 14px 34px rgba(255,30,75,0.6); }
        .refresh-btn svg { width: 14px; height: 14px; }

        /* SUCCESS SCREEN */
        .success-card {
          width: 100%;
          padding: 24px 20px;
          border-radius: 16px;
          background: linear-gradient(165deg, rgba(10,32,18,0.95), rgba(4,18,10,0.98));
          border: 1px solid rgba(43,242,154,0.35);
          box-shadow:
            0 20px 60px rgba(0,0,0,0.6),
            0 0 50px rgba(43,242,154,0.18);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: fadeIn 0.4s ease both;
        }
        .success-icon {
          width: 64px; height: 64px; border-radius: 50%;
          display: grid; place-items: center;
          background: rgba(43,242,154,0.16);
          border: 2px solid rgba(43,242,154,0.5);
          color: #2bf29a;
          margin-bottom: 14px;
          box-shadow: 0 0 32px rgba(43,242,154,0.35);
        }
        .success-icon svg { width: 32px; height: 32px; }
        .success-title {
          font-size: 18px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.3px;
          margin-bottom: 4px;
        }
        .success-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          margin-bottom: 18px;
        }
        .success-details {
          width: 100%;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(43,242,154,0.22);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }
        .success-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: var(--muted);
        }
        .success-row strong {
          color: #fff;
          font-weight: 800;
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
        .toast-icon svg { width: 12px; height: 12px; }

        @media (max-width: 420px) {
          .pay-card { padding: 12px 14px 10px; }
          .amount-value { font-size: 24px; }
          .qr-wrap img { width: 110px; height: 110px; }
          .timer-value { font-size: 15px; }
          .trust-row { gap: 14px; }
        }
      `}</style>

      <div className="page-stack">

        {isSuccess ? (
          /* GREEN SUCCESS SCREEN */
          <div className="success-card">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="success-title">Payment Verified!</div>
            <div className="success-sub">Your transaction has been confirmed successfully</div>

            <div className="success-details">
              <div className="success-row">
                <span>Amount Paid</span>
                <strong style={{ color: '#2bf29a', fontSize: '14px' }}>₹{amount}</strong>
              </div>
              <div className="success-row">
                <span>UTR Reference</span>
                <strong>{utr}</strong>
              </div>
              <div className="success-row">
                <span>Merchant</span>
                <strong>{merchantName}</strong>
              </div>
              <div className="success-row">
                <span>Description</span>
                <strong>{title}</strong>
              </div>
            </div>

            <button
              className="refresh-btn"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  window.history.back();
                } else if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #2bf29a 0%, #10b673 100%)',
                boxShadow: '0 10px 26px rgba(43,242,154,0.35)',
                color: '#07180e'
              }}
            >
              Back to Home
            </button>
          </div>
        ) : (
          /* MAIN PAYMENT CARD */
          <div className="pay-card">

            {/* Header */}
            <div className="card-head">
              <div className="card-title">Complete Payment</div>
              <div className="card-sub">{title}</div>
            </div>

            {/* Timer */}
            <div className={`timer-card ${isWarning ? 'warning' : ''}`}>
              <div className="timer-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div className="timer-body">
                <div className="timer-label">Payment Expires In</div>
                <div className="timer-value">{formatTime(remaining)}</div>
              </div>
              <span className="timer-badge">
                {isExpired ? 'Expired' : isWarning ? 'Hurry' : 'Active'}
              </span>
            </div>

            {/* Amount */}
            <div className="amount-card">
              <div className="amount-value">₹{amount}</div>
              <div className="amount-sub">Pay this amount via UPI</div>
            </div>

            {/* UPI & Merchant Info */}
            <div className="upi-info-box">
              <div className="upi-info-details">
                <div className="upi-id-text">{UPI_ID}</div>
                <div className="upi-merchant-text">{merchantName}</div>
              </div>
              <button
                className="copy-upi-btn"
                onClick={() => copyToClipboard(UPI_ID, 'UPI ID')}
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
                  alt="Scan this QR code to pay"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="qr-hint">
                Scan with any UPI app<br />
                or <strong>long-press to save</strong>
              </div>
              <button
                className="download-btn"
                onClick={handleDownloadQr}
                disabled={isDownloading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                {isDownloading ? 'Downloading...' : 'Download QR'}
              </button>
            </div>

            {/* Enter UTR Reference Code */}
            <div className="utr-section">
              <div className="utr-header">
                <div className="utr-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="3" width="14" height="18" rx="2" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                  </svg>
                </div>
                <div className="utr-header-text">
                  <div className="utr-header-title">Enter UTR Reference Code</div>
                  <div className="utr-header-sub">To confirm your payment</div>
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
                  placeholder="e.g. 623851978381"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={20}
                  disabled={isExpired || isVerifying}
                />
              </div>

              <button
                className="utr-verify-btn"
                onClick={handleVerify}
                disabled={isExpired || isVerifying}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>{isVerifying ? 'Verifying...' : 'Verify Payment'}</span>
              </button>

              <div className="utr-help">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                Find UTR in your bank app transaction history
              </div>
            </div>

            {/* Expired Overlay */}
            <div className={`expired-overlay ${isExpired ? 'show' : ''}`}>
              <div className="expired-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div className="expired-title">Payment Time Expired</div>
              <div className="expired-sub">This payment session has timed out after 8 minutes. Please refresh to generate a new QR code.</div>
              <button className="refresh-btn" onClick={handleReset}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
                </svg>
                Refresh Payment
              </button>
            </div>

          </div>
        )}

        {/* Trust + Powered */}
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
            <span>SSL</span>
          </div>
          <div className="trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Verified</span>
          </div>
          <div className="trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="2" width="12" height="20" rx="2" />
              <path d="M12 18h.01" />
            </svg>
            <span>UPI</span>
          </div>
        </div>

        <div className="powered-by">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          Powered by <b>HamroPay</b>
        </div>

      </div>

      {/* Toast */}
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
