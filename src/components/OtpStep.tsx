import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, ShieldCheck, RefreshCw, Clock } from 'lucide-react';
import type { OtpPurpose } from '../services/auth.service';

const OTP_LENGTH = 6;

export interface OtpResendResult {
  expires_in?: number;
  resend_after?: number;
  restarted?: boolean;
}

export interface OtpStepProps {
  email: string;
  purpose: OtpPurpose;
  onVerify: (code: string) => Promise<void> | void;
  onResend: () => Promise<OtpResendResult | void>;
  onBack: () => void;
  submitLabel?: string;
  initialExpiresIn?: number;
  initialResendAfter?: number;
  initialInfoMessage?: string | null;
  canAutoSubmit?: boolean;
  disabled?: boolean;
  onBeforeSubmitValidate?: () => string | null;
  children?: React.ReactNode;
}

function extractRetryAfter(err: any): number | null {
  const raw = err?.data?.retry_after ?? err?.data?.data?.retry_after;
  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) {
    return Math.ceil(num);
  }
  return null;
}

function defaultSubmitLabel(purpose: OtpPurpose): string {
  if (purpose === 'signup') return 'Verify & create account';
  if (purpose === 'reset') return 'Update password';
  return 'Verify & login';
}

export default function OtpStep({
  email,
  purpose,
  onVerify,
  onResend,
  onBack,
  submitLabel,
  initialExpiresIn = 600,
  initialResendAfter = 60,
  initialInfoMessage = null,
  canAutoSubmit = true,
  disabled = false,
  onBeforeSubmitValidate,
  children,
}: OtpStepProps) {
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(initialInfoMessage);
  const [isLocked, setIsLocked] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [shakeOtp, setShakeOtp] = useState(false);

  const [resendSeconds, setResendSeconds] = useState<number>(
    Math.max(0, Number.isFinite(initialResendAfter) ? initialResendAfter : 60)
  );
  const [expiresInSeconds, setExpiresInSeconds] = useState<number>(
    initialExpiresIn > 0 ? initialExpiresIn : 600
  );

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submittingRef = useRef(false);
  const shakeTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (shakeTimerRef.current) {
        window.clearTimeout(shakeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setInfoMsg(initialInfoMessage);
  }, [initialInfoMessage]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, []);

  const triggerShake = useCallback(() => {
    if (shakeTimerRef.current) {
      window.clearTimeout(shakeTimerRef.current);
    }
    setShakeOtp(false);
    window.requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      setShakeOtp(true);
      shakeTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setShakeOtp(false);
      }, 450);
    });
  }, []);

  const isBusy = disabled || isVerifying || isResending;

  const submitCode = useCallback(
    async (codeToVerify: string) => {
      if (submittingRef.current || isBusy || isLocked) return;
      if (codeToVerify.length !== OTP_LENGTH) {
        setErrorMsg('Please enter the 6-digit verification code.');
        return;
      }

      if (onBeforeSubmitValidate) {
        const validationError = onBeforeSubmitValidate();
        if (validationError) {
          setErrorMsg(validationError);
          return;
        }
      }

      submittingRef.current = true;
      setIsVerifying(true);
      setErrorMsg(null);
      setInfoMsg(null);

      try {
        await onVerify(codeToVerify);
        if (mountedRef.current) {
          setOtpDigits(Array(OTP_LENGTH).fill(''));
        }
      } catch (err: any) {
        if (!mountedRef.current) return;
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        triggerShake();

        const code = String(err?.code || '').toUpperCase();
        const retryAfter = extractRetryAfter(err);

        if (code === 'OTP_LOCKED') {
          setIsLocked(true);
          if (retryAfter !== null) setResendSeconds(retryAfter);
          setErrorMsg(err?.message || 'Too many wrong attempts. Please resend a new code.');
        } else if (code === 'OTP_EXPIRED') {
          setIsExpired(true);
          setErrorMsg(err?.message || 'Verification code has expired. Please resend a new code.');
        } else {
          if (retryAfter !== null) setResendSeconds(retryAfter);
          setErrorMsg(err?.message || 'Invalid verification code. Please try again.');
          window.setTimeout(() => {
            otpInputRefs.current[0]?.focus();
          }, 50);
        }
      } finally {
        submittingRef.current = false;
        if (mountedRef.current) {
          setIsVerifying(false);
        }
      }
    },
    [isBusy, isLocked, onBeforeSubmitValidate, onVerify, triggerShake]
  );

  const handleOtpChange = (index: number, rawValue: string) => {
    if (isBusy || isLocked) return;
    const digitsOnly = rawValue.replace(/\D/g, '');
    setErrorMsg(null);
    setInfoMsg(null);

    if (!digitsOnly) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    if (digitsOnly.length > 1) {
      const startIndex = digitsOnly.length >= OTP_LENGTH ? 0 : index;
      const sliced = digitsOnly.slice(0, OTP_LENGTH - startIndex);
      const next = startIndex === 0 ? Array(OTP_LENGTH).fill('') : [...otpDigits];
      for (let i = 0; i < sliced.length; i++) {
        next[startIndex + i] = sliced[i];
      }
      setOtpDigits(next);

      const focusTarget = Math.min(startIndex + sliced.length - 1, OTP_LENGTH - 1);
      otpInputRefs.current[Math.max(0, focusTarget)]?.focus();

      const fullCode = next.join('');
      if (canAutoSubmit && fullCode.length === OTP_LENGTH && next.every((d) => d.length === 1)) {
        submitCode(fullCode);
      }
      return;
    }

    const next = [...otpDigits];
    next[index] = digitsOnly;
    setOtpDigits(next);

    if (index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = next.join('');
    if (canAutoSubmit && fullCode.length === OTP_LENGTH && next.every((d) => d.length === 1)) {
      submitCode(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isBusy || isLocked) return;

    if (e.key === 'Backspace') {
      if (otpDigits[index]) {
        const next = [...otpDigits];
        next[index] = '';
        setOtpDigits(next);
      } else if (index > 0) {
        e.preventDefault();
        const next = [...otpDigits];
        next[index - 1] = '';
        setOtpDigits(next);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      const fullCode = otpDigits.join('');
      if (fullCode.length === OTP_LENGTH) {
        e.preventDefault();
        submitCode(fullCode);
      }
    }
  };

  const handleOtpPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isBusy || isLocked) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;

    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const startIndex = pasted.length >= OTP_LENGTH ? 0 : index;
    const sliced = pasted.slice(0, OTP_LENGTH - startIndex);
    const next = startIndex === 0 ? Array(OTP_LENGTH).fill('') : [...otpDigits];
    for (let i = 0; i < sliced.length; i++) {
      next[startIndex + i] = sliced[i];
    }
    setOtpDigits(next);

    const focusTarget = Math.min(startIndex + sliced.length - 1, OTP_LENGTH - 1);
    otpInputRefs.current[Math.max(0, focusTarget)]?.focus();

    const fullCode = next.join('');
    if (canAutoSubmit && fullCode.length === OTP_LENGTH && next.every((d) => d.length === 1)) {
      submitCode(fullCode);
    }
  };

  const handleResendClick = async () => {
    if (submittingRef.current || isBusy || resendSeconds > 0) return;

    submittingRef.current = true;
    setIsResending(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const res = await onResend();
      if (!mountedRef.current || (res && res.restarted)) return;
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setIsLocked(false);
      setIsExpired(false);
      setExpiresInSeconds(
        res && typeof res.expires_in === 'number' && res.expires_in > 0 ? res.expires_in : 600
      );
      setResendSeconds(
        res && typeof res.resend_after === 'number' && res.resend_after >= 0 ? res.resend_after : 60
      );
      setInfoMsg('A new 6-digit code has been sent.');
      window.setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 40);
    } catch (err: any) {
      if (!mountedRef.current) return;
      const code = String(err?.code || '').toUpperCase();
      const retryAfter = extractRetryAfter(err);
      if (code === 'RESEND_WAIT' && retryAfter !== null) {
        setResendSeconds(retryAfter);
      } else if (retryAfter !== null) {
        setResendSeconds(retryAfter);
      }
      setErrorMsg(err?.message || 'Could not resend verification code. Please try again.');
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) {
        setIsResending(false);
      }
    }
  };

  const otpValue = otpDigits.join('');
  const expiryMinutes = Math.max(1, Math.round(expiresInSeconds / 60));

  return (
    <div className="space-y-4">
      {/* Subtitle */}
      <p className="text-xs text-slate-400 leading-relaxed">
        We sent a 6-digit code to <span className="font-semibold text-white break-all">{email}</span>
      </p>

      {/* Error Banner */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold leading-relaxed">{errorMsg}</p>
            {(isExpired || isLocked) && resendSeconds === 0 && (
              <button
                type="button"
                onClick={handleResendClick}
                disabled={isBusy}
                className="font-bold text-rose-300 underline underline-offset-2 hover:text-white cursor-pointer"
              >
                Resend code
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info Banner */}
      {infoMsg && !errorMsg && (
        <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-700/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}

      {/* 6-Digit Code Boxes */}
      <div className="space-y-2">
        <div
          className={`grid grid-cols-6 gap-2 sm:gap-2.5 ${shakeOtp ? 'hp-shake' : ''}`}
          aria-label="6-digit verification code"
        >
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                otpInputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              maxLength={idx === 0 ? OTP_LENGTH : 1}
              disabled={isBusy || isLocked}
              value={digit}
              aria-label={`Verification digit ${idx + 1}`}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              onPaste={(e) => handleOtpPaste(idx, e)}
              onFocus={(e) => e.target.select()}
              className={`h-12 sm:h-13 w-full text-center font-mono text-lg sm:text-xl font-black rounded-xl bg-[#140408] border transition outline-none disabled:opacity-50 ${
                errorMsg
                  ? 'border-rose-500 text-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/25'
                  : digit
                    ? 'border-rose-500/70 text-white focus:border-rose-400 focus:ring-2 focus:ring-rose-500/25'
                    : 'border-rose-900/50 text-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25'
              }`}
            />
          ))}
        </div>

        {/* Expiry & Change email */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-rose-400" />
            Code expires in {expiryMinutes} min
          </span>
          <button
            type="button"
            onClick={() => {
              if (isBusy) return;
              setOtpDigits(Array(OTP_LENGTH).fill(''));
              onBack();
            }}
            disabled={isBusy}
            className="font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            Change email
          </button>
        </div>
      </div>

      {/* Optional Extra Fields (e.g. New Password in Reset flow) */}
      {children}

      {/* Submit Button */}
      <button
        type="button"
        onClick={() => submitCode(otpValue)}
        disabled={isBusy || isLocked || otpValue.length !== OTP_LENGTH}
        className="w-full py-3.5 px-5 bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl text-sm font-bold transition shadow-lg shadow-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying...</span>
          </>
        ) : (
          <span>{submitLabel || defaultSubmitLabel(purpose)}</span>
        )}
      </button>

      {/* Resend Code */}
      <div className="flex items-center justify-center pt-1">
        <button
          type="button"
          onClick={handleResendClick}
          disabled={isBusy || resendSeconds > 0}
          className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer py-1 disabled:cursor-not-allowed ${
            (isExpired || isLocked) && resendSeconds === 0
              ? 'text-rose-300 hover:text-white'
              : 'text-slate-300 hover:text-white disabled:text-slate-500'
          }`}
        >
          {isResending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
              <span>Resending code...</span>
            </>
          ) : resendSeconds > 0 ? (
            <span>Resend code in {resendSeconds}s</span>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
              <span>Resend code</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
