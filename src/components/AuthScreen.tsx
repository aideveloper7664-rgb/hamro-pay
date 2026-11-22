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
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../config/supabase';
import CurvedLoop from './CurvedLoop';
import OtpStep, { OtpResendResult } from './OtpStep';
import {
  startRegister,
  verifyRegister,
  startLogin,
  verifyLogin,
  startForgotPassword,
  verifyForgotPassword,
  resendAuthOtp,
  AuthVerifyData,
} from '../services/auth.service';
import { removeStaleCacheKeys } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AuthScreenProps {
  onLoginSuccess?: (token: string, user: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onBackToLanding?: () => void;
  initialIsSignUp?: boolean;
}

type AuthScreenView = 'landing' | 'login' | 'signup' | 'forgot';
type SubStep = 'form' | 'otp';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen({
  onLoginSuccess,
  showToast,
  onBackToLanding,
}: AuthScreenProps) {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [view, setView] = useState<AuthScreenView>('landing');
  const [subStep, setSubStep] = useState<SubStep>('form');

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // OTP metadata returned by start / resend endpoints
  const [otpExpiresIn, setOtpExpiresIn] = useState(600);
  const [otpResendAfter, setOtpResendAfter] = useState(60);

  // Sign up state (kept in memory only; never saved to localStorage)
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [showSignupConfirmPwd, setShowSignupConfirmPwd] = useState(false);

  // Login state (kept in memory only; never saved to localStorage)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Forgot password state (kept in memory only; never saved to localStorage)
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotInfoMsg, setForgotInfoMsg] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [showResetConfirmPwd, setShowResetConfirmPwd] = useState(false);

  const formLockRef = useRef(false);
  const resetPwdRef = useRef(resetPassword);
  const resetConfirmPwdRef = useRef(resetConfirmPassword);
  resetPwdRef.current = resetPassword;
  resetConfirmPwdRef.current = resetConfirmPassword;

  const isBusy = isGoogleLoading || isSubmittingForm;

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

  const clearFeedback = () => {
    setErrorMsg(null);
    setErrorCode(null);
    setSuccessBanner(null);
  };

  const clearSensitivePasswords = () => {
    setSignupPassword('');
    setSignupConfirmPassword('');
    setLoginPassword('');
    setResetPassword('');
    setResetConfirmPassword('');
    setShowSignupPwd(false);
    setShowSignupConfirmPwd(false);
    setShowLoginPwd(false);
    setShowResetPwd(false);
    setShowResetConfirmPwd(false);
  };

  const switchView = (nextView: AuthScreenView, options?: { prefillEmail?: string; keepBanner?: boolean }) => {
    if (isBusy) return;
    setErrorMsg(null);
    setErrorCode(null);
    if (!options?.keepBanner) {
      setSuccessBanner(null);
    }
    setSubStep('form');
    clearSensitivePasswords();

    if (options?.prefillEmail) {
      const normalized = options.prefillEmail.trim().toLowerCase();
      if (nextView === 'login') setLoginEmail(normalized);
      if (nextView === 'forgot') setForgotEmail(normalized);
      if (nextView === 'signup') setSignupEmail(normalized);
    }
    setView(nextView);
  };

  const completeAuthSession = useCallback(
    (data: AuthVerifyData) => {
      if (!data?.token || !data?.merchant) {
        throw new Error('Invalid login response from server.');
      }

      clearSensitivePasswords();
      removeStaleCacheKeys();
      localStorage.setItem('hamropay_token', data.token);
      localStorage.setItem('hamropay_merchant', JSON.stringify(data.merchant));
      localStorage.setItem('hamro_is_logged_in', 'true');
      refreshUser();

      if (data.is_new_user) {
        notify('Account created — welcome to HamroPay!', 'success');
      }

      if (onLoginSuccess) {
        onLoginSuccess(data.token, data.merchant);
      } else {
        navigate('/dashboard', { replace: true });
      }
    },
    [navigate, notify, onLoginSuccess, refreshUser]
  );

  // --- Existing Supabase Google Auth Flow (unchanged) ---
  const handleGoogleLogin = async () => {
    if (isBusy) return;
    try {
      setIsGoogleLoading(true);
      clearFeedback();

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

  // --- 1. Sign up: Step A ---
  const handleSignupStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLockRef.current || isBusy) return;

    clearFeedback();
    const trimmedName = signupName.trim();
    const normalizedEmail = signupEmail.trim().toLowerCase();
    setSignupEmail(normalizedEmail);

    if (trimmedName.length < 2) {
      setErrorMsg('Full name must be at least 2 characters.');
      return;
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    formLockRef.current = true;
    setIsSubmittingForm(true);
    try {
      const res = await startRegister({
        name: trimmedName,
        email: normalizedEmail,
        password: signupPassword,
        confirm_password: signupConfirmPassword,
      });
      setOtpExpiresIn(res.data?.expires_in && res.data.expires_in > 0 ? res.data.expires_in : 600);
      setOtpResendAfter(
        typeof res.data?.resend_after === 'number' && res.data.resend_after >= 0
          ? res.data.resend_after
          : 60
      );
      setSubStep('otp');
    } catch (err: any) {
      setErrorCode(err?.code ? String(err.code).toUpperCase() : null);
      setErrorMsg(err?.message || 'Could not create account. Please try again.');
    } finally {
      formLockRef.current = false;
      setIsSubmittingForm(false);
    }
  };

  // --- 2. Login: Step A ---
  const handleLoginStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLockRef.current || isBusy) return;

    clearFeedback();
    const normalizedEmail = loginEmail.trim().toLowerCase();
    setLoginEmail(normalizedEmail);

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    formLockRef.current = true;
    setIsSubmittingForm(true);
    try {
      const res = await startLogin({
        email: normalizedEmail,
        password: loginPassword,
      });
      setOtpExpiresIn(res.data?.expires_in && res.data.expires_in > 0 ? res.data.expires_in : 600);
      setOtpResendAfter(
        typeof res.data?.resend_after === 'number' && res.data.resend_after >= 0
          ? res.data.resend_after
          : 60
      );
      setSubStep('otp');
    } catch (err: any) {
      setErrorCode(err?.code ? String(err.code).toUpperCase() : null);
      setErrorMsg(err?.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      formLockRef.current = false;
      setIsSubmittingForm(false);
    }
  };

  // --- 3. Forgot password: Step A ---
  const handleForgotStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLockRef.current || isBusy) return;

    clearFeedback();
    const normalizedEmail = forgotEmail.trim().toLowerCase();
    setForgotEmail(normalizedEmail);

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    formLockRef.current = true;
    setIsSubmittingForm(true);
    try {
      const res = await startForgotPassword({ email: normalizedEmail });
      setForgotInfoMsg(res.message || 'If an account exists, we sent a code.');
      setOtpExpiresIn(res.data?.expires_in && res.data.expires_in > 0 ? res.data.expires_in : 600);
      setOtpResendAfter(
        typeof res.data?.resend_after === 'number' && res.data.resend_after >= 0
          ? res.data.resend_after
          : 60
      );
      setResetPassword('');
      setResetConfirmPassword('');
      setSubStep('otp');
    } catch (err: any) {
      setErrorCode(err?.code ? String(err.code).toUpperCase() : null);
      setErrorMsg(err?.message || 'Unable to send reset code. Please try again.');
    } finally {
      formLockRef.current = false;
      setIsSubmittingForm(false);
    }
  };

  // --- Shared Resend Helper ---
  const handleOtpResend = async (
    email: string,
    purpose: 'signup' | 'login' | 'reset'
  ): Promise<OtpResendResult> => {
    try {
      const res = await resendAuthOtp({ email, purpose });
      return {
        expires_in: res.data?.expires_in,
        resend_after: res.data?.resend_after,
      };
    } catch (err: any) {
      const code = String(err?.code || '').toUpperCase();
      if (code === 'START_AGAIN') {
        setErrorMsg(err?.message || 'Session expired. Please submit the form again.');
        setErrorCode('START_AGAIN');
        setSubStep('form');
        return { restarted: true };
      }
      throw err;
    }
  };

  // --- Forgot Password Validation ---
  const validateResetPasswords = useCallback((): string | null => {
    const pwd = resetPwdRef.current;
    const confirmPwd = resetConfirmPwdRef.current;
    if (pwd.length < 8) {
      return 'New password must be at least 8 characters long.';
    }
    if (pwd !== confirmPwd) {
      return 'New passwords do not match.';
    }
    return null;
  }, []);

  const isResetPasswordsReady =
    resetPassword.length >= 8 && resetPassword === resetConfirmPassword;

  // --- Titles & Back Navigation ---
  const getHeaderCopy = () => {
    if (view === 'signup') {
      return {
        title: subStep === 'otp' ? 'Verify your email' : 'Create merchant account',
        subtitle:
          subStep === 'otp'
            ? 'Enter the verification code to finish creating your account'
            : 'Start accepting instant UPI payments in minutes',
      };
    }
    if (view === 'login') {
      return {
        title: subStep === 'otp' ? 'Verify your login' : 'Merchant Sign In',
        subtitle:
          subStep === 'otp'
            ? 'Enter the verification code sent to your inbox'
            : 'Enter your email and password to continue',
      };
    }
    if (view === 'forgot') {
      return {
        title: subStep === 'otp' ? 'Set new password' : 'Reset password',
        subtitle:
          subStep === 'otp'
            ? 'Enter the 6-digit code and choose a new password'
            : 'Reset your password or set one for your Google account',
      };
    }
    return {
      title: 'Welcome to HamroPay',
      subtitle: 'Sign in to your merchant portal or create a new account',
    };
  };

  const handleBackNavigation = () => {
    if (isBusy) return;
    if (view === 'landing') {
      onBackToLanding?.();
      return;
    }
    if (subStep === 'otp') {
      clearFeedback();
      setSubStep('form');
      return;
    }
    if (view === 'forgot') {
      switchView('login', { prefillEmail: forgotEmail });
      return;
    }
    switchView('landing');
  };

  const { title, subtitle } = getHeaderCopy();

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
        <div className="max-w-sm w-full mx-auto space-y-6">
          {(view !== 'landing' || onBackToLanding) && (
            <button
              type="button"
              onClick={handleBackNavigation}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer py-1 disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {view === 'landing'
                  ? 'Back to Home'
                  : subStep === 'otp'
                    ? 'Back'
                    : view === 'forgot'
                      ? 'Back to Login'
                      : 'Back'}
              </span>
            </button>
          )}

          {/* Logo & Header */}
          <div className="space-y-3 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/60">
                <Wallet className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Hamro<span className="text-rose-500">Pay</span>
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
              {subStep === 'form' && (
                <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Success Banner (e.g. after Password Updated) */}
          {successBanner && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-200 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* Form Error Banner (only on form/landing; OtpStep handles OTP errors inline) */}
          {errorMsg && subStep === 'form' && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/60 text-rose-200 text-xs space-y-2 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed flex-1">{errorMsg}</p>
              </div>
              {errorCode === 'EMAIL_EXISTS' && (
                <button
                  type="button"
                  onClick={() => switchView('login', { prefillEmail: signupEmail })}
                  className="font-bold text-rose-300 underline underline-offset-2 hover:text-white cursor-pointer"
                >
                  Log in instead
                </button>
              )}
              {errorCode === 'INVALID_CREDENTIALS' && (
                <div className="flex flex-wrap items-center gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => switchView('forgot', { prefillEmail: loginEmail })}
                    className="font-bold text-rose-300 underline underline-offset-2 hover:text-white cursor-pointer"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isBusy}
                    className="font-bold text-white/90 underline underline-offset-2 hover:text-white cursor-pointer"
                  >
                    Continue with Google
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 0. AUTH LANDING */}
          {view === 'landing' && (
            <div className="space-y-3.5 pt-1">
              <button
                type="button"
                onClick={() => switchView('login')}
                disabled={isBusy}
                className="w-full py-4 px-5 bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl text-sm font-bold transition shadow-lg shadow-rose-950/50 disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>

              <button
                type="button"
                onClick={() => switchView('signup')}
                disabled={isBusy}
                className="w-full py-4 px-5 bg-[#140408] hover:bg-[#1c060c] active:scale-[0.98] text-white rounded-2xl text-sm font-bold transition border border-rose-500/35 hover:border-rose-500/60 disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-rose-400" />
                <span>Sign up</span>
              </button>

              <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                <span className="h-px flex-1 bg-rose-900/40" />
                <span>or</span>
                <span className="h-px flex-1 bg-rose-900/40" />
              </div>

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

              <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted Auth &amp; Email OTP Verification</span>
              </div>
            </div>
          )}

          {/* 1. SIGN UP — STEP A */}
          {view === 'signup' && subStep === 'form' && (
            <form onSubmit={handleSignupStart} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="signup-name" className="block text-xs font-bold text-slate-300">
                  Full name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    autoFocus
                    disabled={isBusy}
                    value={signupName}
                    onChange={(e) => {
                      setSignupName(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="Aarav Sharma"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-email" className="block text-xs font-bold text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    disabled={isBusy}
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-password" className="block text-xs font-bold text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-password"
                    type={showSignupPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isBusy}
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPwd((p) => !p)}
                    aria-label={showSignupPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showSignupPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-confirm-password"
                  className="block text-xs font-bold text-slate-300"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-confirm-password"
                    type={showSignupConfirmPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isBusy}
                    value={signupConfirmPassword}
                    onChange={(e) => {
                      setSignupConfirmPassword(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirmPwd((p) => !p)}
                    aria-label={showSignupConfirmPwd ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showSignupConfirmPwd ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl text-sm font-bold transition shadow-lg shadow-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingForm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending verification code...</span>
                  </>
                ) : (
                  <span>Create account</span>
                )}
              </button>

              <p className="text-center text-xs text-slate-400 pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login', { prefillEmail: signupEmail })}
                  className="font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Log in
                </button>
              </p>
            </form>
          )}

          {/* 1. SIGN UP — STEP B (OTP) */}
          {view === 'signup' && subStep === 'otp' && (
            <OtpStep
              email={signupEmail.trim().toLowerCase()}
              purpose="signup"
              submitLabel="Verify & create account"
              initialExpiresIn={otpExpiresIn}
              initialResendAfter={otpResendAfter}
              onVerify={async (code) => {
                const emailNormalized = signupEmail.trim().toLowerCase();
                const res = await verifyRegister({ email: emailNormalized, code });
                completeAuthSession(res.data);
              }}
              onResend={() => handleOtpResend(signupEmail.trim().toLowerCase(), 'signup')}
              onBack={() => {
                clearFeedback();
                setSubStep('form');
              }}
            />
          )}

          {/* 2. LOGIN — STEP A */}
          {view === 'login' && subStep === 'form' && (
            <form onSubmit={handleLoginStart} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-bold text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    disabled={isBusy}
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-xs font-bold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot', { prefillEmail: loginEmail })}
                    disabled={isBusy}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showLoginPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isBusy}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPwd((p) => !p)}
                    aria-label={showLoginPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl text-sm font-bold transition shadow-lg shadow-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingForm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking credentials...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>

              <p className="text-center text-xs text-slate-400 pt-1">
                New to HamroPay?{' '}
                <button
                  type="button"
                  onClick={() => switchView('signup', { prefillEmail: loginEmail })}
                  className="font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            </form>
          )}

          {/* 2. LOGIN — STEP B (OTP) */}
          {view === 'login' && subStep === 'otp' && (
            <OtpStep
              email={loginEmail.trim().toLowerCase()}
              purpose="login"
              submitLabel="Verify & login"
              initialExpiresIn={otpExpiresIn}
              initialResendAfter={otpResendAfter}
              onVerify={async (code) => {
                const emailNormalized = loginEmail.trim().toLowerCase();
                const res = await verifyLogin({ email: emailNormalized, code });
                completeAuthSession(res.data);
              }}
              onResend={() => handleOtpResend(loginEmail.trim().toLowerCase(), 'login')}
              onBack={() => {
                clearFeedback();
                setSubStep('form');
              }}
            />
          )}

          {/* 3. FORGOT PASSWORD — STEP A */}
          {view === 'forgot' && subStep === 'form' && (
            <form onSubmit={handleForgotStart} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="block text-xs font-bold text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    disabled={isBusy}
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (errorMsg) clearFeedback();
                    }}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl text-sm font-bold transition shadow-lg shadow-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingForm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending reset code...</span>
                  </>
                ) : (
                  <span>Send reset code</span>
                )}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD — STEP B (OTP + New Password) */}
          {view === 'forgot' && subStep === 'otp' && (
            <OtpStep
              email={forgotEmail.trim().toLowerCase()}
              purpose="reset"
              submitLabel="Update password"
              initialExpiresIn={otpExpiresIn}
              initialResendAfter={otpResendAfter}
              initialInfoMessage={forgotInfoMsg}
              canAutoSubmit={isResetPasswordsReady}
              onBeforeSubmitValidate={validateResetPasswords}
              onVerify={async (code) => {
                const emailNormalized = forgotEmail.trim().toLowerCase();
                const res = await verifyForgotPassword({
                  email: emailNormalized,
                  code,
                  new_password: resetPwdRef.current,
                  confirm_password: resetConfirmPwdRef.current,
                });
                clearSensitivePasswords();
                const msg = res.message || 'Password updated';
                notify(msg, 'success');
                setSuccessBanner(`${msg}. Sign in with your new password.`);
                switchView('login', { prefillEmail: emailNormalized, keepBanner: true });
              }}
              onResend={() => handleOtpResend(forgotEmail.trim().toLowerCase(), 'reset')}
              onBack={() => {
                clearFeedback();
                setSubStep('form');
              }}
            >
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label htmlFor="reset-password" className="block text-xs font-bold text-slate-300">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-password"
                      type={showResetPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-11 py-3 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPwd((p) => !p)}
                      aria-label={showResetPwd ? 'Hide new password' : 'Show new password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-bold text-slate-300"
                  >
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-confirm-password"
                      type={showResetConfirmPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-11 py-3 rounded-2xl bg-[#140408] border border-rose-900/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-white placeholder:text-slate-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPwd((p) => !p)}
                      aria-label={
                        showResetConfirmPwd ? 'Hide confirm new password' : 'Show confirm new password'
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showResetConfirmPwd ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </OtpStep>
          )}

          {/* Footer Status */}
          <div className="pt-5 border-t border-rose-950/60 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
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
