import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wallet,
  ArrowLeft,
  Loader2,
  Zap,
  AlertCircle,
  ShieldCheck,
  Mail,
  RefreshCw,
  Clock,
  User,
} from 'lucide-react';
import { supabase } from '../config/supabase';
import CurvedLoop from './CurvedLoop';
import { sendEmailOtp, verifyEmailOtp } from '../services/auth.service';
import { removeStaleCacheKeys } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AuthScreenProps {
  onLoginSuccess?: (token: string, user: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onBackToLanding?: () => void;
  initialIsSignUp?: boolean;
}

type AuthStep = 'options' | 'email' | 'otp';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;

function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return trimmed;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  return `${local[0]}***@${domain}`;
}

function extractRetryAfter(err: any): number | null {
  const raw = err?.data?.retry_after ?? err?.data?.data?.retry_after;
  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) {
    return Math.ceil(num);
  }
  return null;
}

export default function AuthScreen({
  onLoginSuccess,
  showToast,
  onBackToLanding,
}: AuthScreenProps) {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [authStep, setAuthStep] = useState<AuthStep>('options');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [optionalName, setOptionalName] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [mailUnavailable, setMailUnavailable] = useState(false);
  const [otpLocked, setOtpLocked] = useState(false);
  const [shakeOtp, setShakeOtp] = useState(false);

  const [resendSeconds, setResendSeconds] = useState(0);
  const [expiresInSeconds, setExpiresInSeconds] = useState(600);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submittingRef = useRef(false);
  const shakeTimerRef = useRef<number | null>(null);
  const optionalNameRef = useRef(optionalName);
  optionalNameRef.current = optionalName;

  const isBusy = isGoogleLoading || isSendingCode || isVerifyingCode;

  const notify = useCallback(
    (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
      if (showToast) {
        showToast(msg, type);
      } else if (type === 'error') {
        toast.error(msg);
      } else {
        toast.success(msg);
      }
    },
    [showToast]
  );

  const triggerShake = useCallback(() => {
    if (shakeTimerRef.current) {
      window.clearTimeout(shakeTimerRef.current);
    }
    setShakeOtp(false);
    window.requestAnimationFrame(() => {
      setShakeOtp(true);
      shakeTimerRef.current = window.setTimeout(() => {
        setShakeOtp(false);
      }, 450);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) {
        window.clearTimeout(shakeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const err = searchParams.get('error');
      if (err) {
        if (err === 'auth_failed') {
          setErrorMsg('Authentication failed. Please try again.');
          notify('Authentication failed', 'error');
        } else if (err === 'no_session') {
          setErrorMsg('Session expired or not found. Please log in again.');
          notify('Session expired', 'error');
        } else {
          setErrorMsg('An error occurred during sign in.');
        }
      }
    }
  }, [notify]);

  // Resend countdown timer
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  // Focus first OTP box on entering step 2
  useEffect(() => {
    if (authStep === 'otp') {
      const t = window.setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 60);
      return () => window.clearTimeout(t);
    }
  }, [authStep]);

  const handleGoogleLogin = async () => {
    if (isBusy) return;
    try {
      setIsGoogleLoading(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://hamro-pay-kilj.vercel.app/auth/callback',
        },
      });

      if (error) {
        console.error('Google Sign In Error:', error);
        setErrorMsg(error.message || 'Could not initiate Google login');
        setIsGoogleLoading(false);
        notify(error.message || 'Could not initiate Google login', 'error');
      }
    } catch (err: any) {
      console.error('Google Auth exception:', err);
      setErrorMsg(err?.message || 'An unexpected error occurred');
      setIsGoogleLoading(false);
      notify('Google auth failed', 'error');
    }
  };

  const handleSendOtpError = (err: any) => {
    const status = err?.status;
    const code = String(err?.code || '').toUpperCase();
    const retryAfter = extractRetryAfter(err);

    if (status === 503 || code === 'MAIL_NOT_CONFIGURED') {
      setMailUnavailable(true);
      setErrorMsg('Email login is not available right now. Please continue with Google.');
      return;
    }

    if (status === 429 && code === 'RESEND_WAIT') {
      if (retryAfter !== null) {
        setResendSeconds(retryAfter);
      }
      setErrorMsg(err?.message || 'Please wait before requesting another code.');
      return;
    }

    if (status === 429 || code === 'RATE_LIMIT') {
      if (retryAfter !== null) {
        setResendSeconds(retryAfter);
      }
      setErrorMsg(err?.message || 'Too many requests. Please wait a moment and try again.');
      return;
    }

    if (status === 502 || code === 'MAIL_FAILED' || code === 'MAIL_REJECTED' || code === 'MAIL_NETWORK') {
      setErrorMsg(err?.message || 'Could not deliver the verification email. Please try again.');
      return;
    }

    setErrorMsg(err?.message || 'Unable to send verification code. Please check your email.');
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submittingRef.current || isBusy) return;

    const normalized = email.trim().toLowerCase();
    setEmail(normalized);
    setErrorMsg(null);
    setInfoMsg(null);
    setMailUnavailable(false);

    if (!EMAIL_REGEX.test(normalized)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    submittingRef.current = true;
    setIsSendingCode(true);
    try {
      const res = await sendEmailOtp(normalized);
      setSubmittedEmail(normalized);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setOtpLocked(false);
      setExpiresInSeconds(Number(res?.expires_in) > 0 ? Number(res.expires_in) : 600);
      setResendSeconds(Number(res?.resend_after) >= 0 ? Number(res.resend_after) : 60);
      setAuthStep('otp');
    } catch (err: any) {
      handleSendOtpError(err);
    } finally {
      submittingRef.current = false;
      setIsSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (submittingRef.current || isBusy || resendSeconds > 0 || !submittedEmail) return;

    setErrorMsg(null);
    setInfoMsg(null);
    submittingRef.current = true;
    setIsSendingCode(true);

    try {
      const res = await sendEmailOtp(submittedEmail);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setOtpLocked(false);
      setMailUnavailable(false);
      setExpiresInSeconds(Number(res?.expires_in) > 0 ? Number(res.expires_in) : 600);
      setResendSeconds(Number(res?.resend_after) >= 0 ? Number(res.resend_after) : 60);
      setInfoMsg('A new verification code has been sent.');
      window.setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 40);
    } catch (err: any) {
      handleSendOtpError(err);
    } finally {
      submittingRef.current = false;
      setIsSendingCode(false);
    }
  };

  const submitVerify = useCallback(
    async (codeToVerify: string) => {
      if (submittingRef.current || isBusy || otpLocked) return;
      if (codeToVerify.length !== OTP_LENGTH || !submittedEmail) return;

      submittingRef.current = true;
      setIsVerifyingCode(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const trimmedName = optionalNameRef.current.trim();
      const payload: { email: string; code: string; name?: string } = {
        email: submittedEmail,
        code: codeToVerify,
        ...(trimmedName ? { name: trimmedName } : {}),
      };

      try {
        const res = await verifyEmailOtp(payload);

        // Clear code from state immediately after use
        setOtpDigits(Array(OTP_LENGTH).fill(''));

        if (!res?.token || !res?.merchant) {
          throw new Error('Invalid login response from server.');
        }

        removeStaleCacheKeys();
        localStorage.setItem('hamropay_token', res.token);
        localStorage.setItem('hamropay_merchant', JSON.stringify(res.merchant));
        localStorage.setItem('hamro_is_logged_in', 'true');
        refreshUser();

        if (res.is_new_user) {
          notify('Account created — 20 free credits added', 'success');
        }

        if (onLoginSuccess) {
          onLoginSuccess(res.token, res.merchant);
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        // Clear code from state after failed attempt
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        triggerShake();

        const status = err?.status;
        const code = String(err?.code || '').toUpperCase();
        const retryAfter = extractRetryAfter(err);

        if (code === 'OTP_LOCKED') {
          setOtpLocked(true);
          if (retryAfter !== null) {
            setResendSeconds(retryAfter);
          }
          setErrorMsg(err?.message || 'Too many wrong attempts. Please request a new code.');
        } else if (code === 'OTP_EXPIRED') {
          setErrorMsg(err?.message || 'Code has expired. Please request a new code.');
        } else if (status === 429 || code === 'RATE_LIMIT') {
          if (retryAfter !== null) {
            setResendSeconds(retryAfter);
          }
          setErrorMsg(err?.message || 'Too many attempts. Please wait and try again.');
        } else {
          setErrorMsg(err?.message || 'Invalid verification code. Please try again.');
          window.setTimeout(() => {
            otpInputRefs.current[0]?.focus();
          }, 50);
        }
      } finally {
        submittingRef.current = false;
        setIsVerifyingCode(false);
      }
    },
    [isBusy, navigate, notify, onLoginSuccess, otpLocked, refreshUser, submittedEmail, triggerShake]
  );

  const handleOtpChange = (index: number, rawValue: string) => {
    if (isBusy) return;
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

    // Handle multi-digit input (OS one-time-code autofill or mobile paste)
    if (digitsOnly.length > 1) {
      const startIndex = digitsOnly.length >= OTP_LENGTH ? 0 : index;
      const sliced = digitsOnly.slice(0, OTP_LENGTH - startIndex);
      const next = [...otpDigits];
      for (let i = 0; i < sliced.length; i++) {
        next[startIndex + i] = sliced[i];
      }
      setOtpDigits(next);

      const focusTarget = Math.min(startIndex + sliced.length, OTP_LENGTH - 1);
      otpInputRefs.current[focusTarget]?.focus();

      const fullCode = next.join('');
      if (fullCode.length === OTP_LENGTH && next.every((d) => d.length === 1)) {
        submitVerify(fullCode);
      }
      return;
    }

    // Single digit typed
    const next = [...otpDigits];
    next[index] = digitsOnly;
    setOtpDigits(next);

    if (index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = next.join('');
    if (fullCode.length === OTP_LENGTH && next.every((d) => d.length === 1)) {
      submitVerify(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isBusy) return;

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
      if (fullCode.length === OTP_LENGTH && !otpLocked) {
        e.preventDefault();
        submitVerify(fullCode);
      }
    }
  };

  const handleOtpPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isBusy) return;
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
    if (fullCode.length === OTP_LENGTH && next.every((d) => d.length === 1)) {
      submitVerify(fullCode);
    }
  };

  const handleChangeEmail = () => {
    if (isBusy) return;
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setOtpLocked(false);
    setErrorMsg(null);
    setInfoMsg(null);
    setMailUnavailable(false);
    setAuthStep('email');
  };

  const handleBackToOptions = () => {
    if (isBusy) return;
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setOtpLocked(false);
    setErrorMsg(null);
    setInfoMsg(null);
    setMailUnavailable(false);
    setAuthStep('options');
  };

  const expiryMinutes = Math.max(1, Math.round(expiresInSeconds / 60));
  const otpValue = otpDigits.join('');

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#070102] text-white font-sans antialiased selection:bg-rose-600 selection:text-white">
      {/* Left Brand Panel (Desktop) */}
      <aside className="lg:col-span-6 xl:col-span-7 relative hidden lg:flex flex-col justify-between p-10 xl:p-14 overflow-hidden bg-gradient-to-br from-rose-950 via-[#120306] to-[#070102] text-white select-none border-r border-rose-900/30">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-rose-600/20 blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-rose-800/15 blur-3xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full border border-rose-500/10 pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/50">
            <Wallet className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white">
              Hamro<span className="text-rose-500">Pay</span>
            </span>
            <span className="text-[10px] font-bold bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30 uppercase tracking-widest text-rose-300">
              UPI
            </span>
          </div>
        </div>

        {/* Center Intro Card */}
        <div className="relative z-10 my-auto max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/60 backdrop-blur-md border border-rose-500/20 text-xs font-bold text-rose-200">
            <Zap className="w-3.5 h-3.5 text-rose-400 fill-current" />
            <span>Instant UPI Settlements</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.1]">
            Accept UPI Payments{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-200">
              Instantly
            </span>
            .
          </h1>

          <div className="bg-[#120306]/80 backdrop-blur-md border border-rose-500/20 rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-200/80 font-semibold">Active Cashier Account</span>
              <span className="flex items-center gap-1.5 text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live
              </span>
            </div>
            <div className="font-mono text-sm font-bold tracking-wide text-white">
              9769516928@fam
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-rose-900/30">
              <span>Automatic 12-Digit UTR Match</span>
              <span className="text-emerald-400 font-semibold">T+0 Direct Settlement</span>
            </div>
          </div>
        </div>

        {/* Bottom Curved Loop Marquee */}
        <div className="relative z-10 w-full pt-4 border-t border-rose-900/30">
          <CurvedLoop
            marqueeText="HAMROPAY ✦ INSTANT UPI ✦ FAMPAY · AMAZON PAY · PAYTM ✦ AUTOMATIC MATCH ✦ REST API ✦ T+0 SETTLEMENT"
            speed={1.5}
            curveAmount={40}
            className="fill-rose-300/80 font-mono text-xs font-bold tracking-widest uppercase"
          />
        </div>
      </aside>

      {/* Main Authentication Panel */}
      <main className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-6 py-10 sm:px-12 xl:px-16 bg-[#0a0204]">
        <div className="max-w-sm w-full mx-auto space-y-7">
          {authStep === 'options' && onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer py-1 disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          )}

          {authStep === 'email' && (
            <button
              type="button"
              onClick={handleBackToOptions}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer py-1 disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign-in options</span>
            </button>
          )}

          {/* Logo & Header */}
          <div className="space-y-4 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/60">
                <Wallet className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Hamro<span className="text-rose-500">Pay</span>
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {authStep === 'otp'
                  ? 'Check your email'
                  : authStep === 'email'
                    ? 'Continue with Email'
                    : 'Merchant Sign In'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {authStep === 'otp' ? (
                  <>
                    Enter the 6-digit code sent to{' '}
                    <span className="font-semibold text-white">{maskEmail(submittedEmail)}</span>
                  </>
                ) : authStep === 'email' ? (
                  'Enter your email address to receive a one-time verification code'
                ) : (
                  'Sign in or get started securely with your merchant portal'
                )}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/60 text-rose-200 text-xs space-y-2.5 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed flex-1">{errorMsg}</p>
              </div>
              {mailUnavailable && (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isBusy}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />
                  ) : (
                    <span>Continue with Google</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Info Banner */}
          {infoMsg && !errorMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-700/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Step 0: Auth Options (Google + Email) */}
          {authStep === 'options' && (
            <div className="space-y-4 pt-1">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isBusy}
                className="w-full py-4 px-5 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-900 rounded-2xl text-sm font-bold transition shadow-xl shadow-rose-950/40 disabled:opacity-60 flex items-center justify-center gap-3 cursor-pointer border border-slate-200 group"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-rose-600 animate-spin" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="text-slate-900 group-hover:text-black">
                      Continue with Google
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                <span className="h-px flex-1 bg-rose-900/40" />
                <span>or</span>
                <span className="h-px flex-1 bg-rose-900/40" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setInfoMsg(null);
                  setMailUnavailable(false);
                  setAuthStep('email');
                }}
                disabled={isBusy}
                className="w-full py-3.5 px-5 bg-[#140408] hover:bg-[#1c060c] active:scale-[0.98] text-white rounded-2xl text-sm font-bold transition border border-rose-500/30 hover:border-rose-500/50 disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Mail className="w-4 h-4 text-rose-400" />
                <span>Continue with Email</span>
              </button>

              <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Passwordless Verification &amp; OAuth 2.0 Security</span>
              </div>
            </div>
          )}

          {/* Step 1: Email Input */}
          {authStep === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-4 pt-1" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-email-input"
                  className="block text-xs font-bold text-slate-300"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email-input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    disabled={isBusy}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                      if (mailUnavailable) setMailUnavailable(false);
                    }}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy || !email.trim()}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl text-sm font-bold transition shadow-lg shadow-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSendingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending code...</span>
                  </>
                ) : (
                  <span>Send code</span>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isBusy}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Or continue with Google
                </button>
              </div>
            </form>
          )}

          {/* Step 2: 6-Digit OTP Verification */}
          {authStep === 'otp' && (
            <div className="space-y-5 pt-1">
              {/* Optional Name Field */}
              <div className="space-y-1">
                <label
                  htmlFor="auth-optional-name"
                  className="flex items-center justify-between text-[11px] font-bold text-slate-300"
                >
                  <span>Your name</span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Optional
                  </span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-optional-name"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    disabled={isBusy}
                    value={optionalName}
                    onChange={(e) => setOptionalName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#140408] border border-rose-900/40 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs text-white placeholder:text-slate-500 outline-none transition disabled:opacity-60"
                  />
                </div>
              </div>

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
                      disabled={isBusy || otpLocked}
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

                {/* Expiry hint & Change email */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-400" />
                    Code expires in {expiryMinutes} min
                  </span>
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    disabled={isBusy}
                    className="font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Change email
                  </button>
                </div>
              </div>

              {/* Verify Status / Manual Submit */}
              <button
                type="button"
                onClick={() => submitVerify(otpValue)}
                disabled={isBusy || otpLocked || otpValue.length !== OTP_LENGTH}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl text-sm font-bold transition shadow-lg shadow-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifyingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying code...</span>
                  </>
                ) : (
                  <span>Verify &amp; Continue</span>
                )}
              </button>

              {/* Resend Code */}
              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isBusy || resendSeconds > 0 || mailUnavailable}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer py-1"
                >
                  {isSendingCode ? (
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
          )}

          {/* Footer Status */}
          <div className="pt-6 border-t border-rose-950/60 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Connected to{' '}
              <span className="font-mono text-rose-300 font-semibold">
                hamropay-backends-54xp.onrender.com
              </span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
