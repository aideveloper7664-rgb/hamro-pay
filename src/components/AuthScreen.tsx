import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Mail,
  Lock,
  ArrowRight,
  User,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Gift,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CurvedLoop from './CurvedLoop';
import {
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword as resetPasswordApi,
  register as registerApi,
  login as loginApi
} from '../services/auth.service';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onBackToLanding?: () => void;
  initialIsSignUp?: boolean;
}

type AuthViewMode = 'login' | 'register' | 'forgot_password' | 'reset_password';

export default function AuthScreen({
  onLoginSuccess,
  showToast,
  onBackToLanding,
  initialIsSignUp = false
}: AuthScreenProps) {
  const { login } = useAuth();

  // Primary view mode
  const [viewMode, setViewMode] = useState<AuthViewMode>(
    initialIsSignUp ? 'register' : 'login'
  );

  // Login subtype: 'otp' | 'password'
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('password');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [resetToken, setResetToken] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Read URL parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const path = window.location.pathname;

      // Check referral code: /register?ref=CODE or ?ref=CODE
      const refParam = searchParams.get('ref') || searchParams.get('referral_code');
      if (refParam) {
        setReferralCode(refParam.toUpperCase());
        setViewMode('register');
      } else if (path.includes('/register')) {
        setViewMode('register');
      }

      // Check reset password token: /reset-password?token=xxx or ?token=xxx
      const tokenParam = searchParams.get('token');
      if (tokenParam || path.includes('/reset-password')) {
        setResetToken(tokenParam || '');
        setViewMode('reset_password');
      }
    }
  }, []);

  // Handler: Send OTP
  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setIsSendingOtp(true);
    try {
      await sendOTP(email.trim());
      setOtpSent(true);
      showToast('OTP sent to your email successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to send OTP. Please try again.', 'error');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handler: Login Form Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (loginMethod === 'otp') {
        if (!otp) {
          showToast('Please enter the OTP received in your email.', 'error');
          setIsSubmitting(false);
          return;
        }
        // Verify OTP Login
        const res = await verifyOTP(email.trim(), otp.trim());
        const token = res?.token || res?.data?.token || localStorage.getItem('hamropay_token') || '';
        const user = res?.merchant || res?.user || res?.data?.user || res;
        if (token) {
          localStorage.setItem('hamropay_token', token);
          if (user) localStorage.setItem('hamropay_merchant', JSON.stringify(user));
        }
        showToast('OTP verified! Welcome back.', 'success');
        onLoginSuccess(token, user);
      } else {
        // Password Login
        if (!password) {
          showToast('Please enter your password.', 'error');
          setIsSubmitting(false);
          return;
        }
        const res = await loginApi({ email: email.trim(), password });
        const token = res?.token || res?.data?.token || localStorage.getItem('hamropay_token') || '';
        const user = res?.merchant || res?.user || res?.data?.user || res;
        if (token) {
          localStorage.setItem('hamropay_token', token);
          if (user) localStorage.setItem('hamropay_merchant', JSON.stringify(user));
        }
        showToast(`Welcome back, ${user?.name || 'Merchant'}!`, 'success');
        onLoginSuccess(token, user);
      }
    } catch (err: any) {
      showToast(err?.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Register Form Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    if (!otp) {
      showToast('Please verify your email using OTP first.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify OTP first
      await verifyOTP(email.trim(), otp.trim());

      // 2. Register merchant account
      const res = await registerApi({
        name: name.trim(),
        email: email.trim(),
        password,
        referral_code: referralCode.trim() || undefined
      });

      const token = res?.token || res?.data?.token || localStorage.getItem('hamropay_token') || '';
      const user = res?.merchant || res?.user || res?.data?.user || res;

      if (token) {
        localStorage.setItem('hamropay_token', token);
        if (user) localStorage.setItem('hamropay_merchant', JSON.stringify(user));
      }

      showToast('Merchant workspace created successfully!', 'success');
      onLoginSuccess(token, user);
    } catch (err: any) {
      showToast(err?.message || 'Registration failed. Please check your OTP or credentials.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Forgot Password Submit
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setForgotSuccess(true);
      showToast('Reset link sent to email', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to send reset link.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) {
      showToast('Missing reset token. Please use the link sent to your email.', 'error');
      return;
    }
    if (!password || password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordApi(resetToken.trim(), password);
      setResetSuccess(true);
      showToast('Password reset successfully! You can now log in.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to reset password.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white text-slate-900 font-sans antialiased selection:bg-rose-600 selection:text-white">
      {/* Left Brand Panel (Desktop) */}
      <aside className="lg:col-span-6 xl:col-span-7 relative hidden lg:flex flex-col justify-between p-10 xl:p-14 overflow-hidden bg-gradient-to-br from-rose-600 via-rose-700 to-slate-950 text-white select-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-rose-500/20 blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full border border-white/10 pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white text-rose-600 flex items-center justify-center shadow-lg shadow-rose-950/20">
            <Wallet className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">
              Hamro<span className="text-rose-200">Pay</span>
            </span>
            <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-widest text-rose-100">
              UPI
            </span>
          </div>
        </div>

        {/* Center Intro Card */}
        <div className="relative z-10 my-auto max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-rose-100">
            <Zap className="w-3.5 h-3.5 text-rose-300 fill-current" />
            <span>Instant FamPay &amp; Paytm Settlements</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.15] text-white">
            Accept UPI Payments <span className="text-rose-200">Instantly</span>.
          </h1>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-200 font-semibold">Active Cashier Account</span>
              <span className="flex items-center gap-1.5 text-emerald-300 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live
              </span>
            </div>
            <div className="font-mono text-sm font-bold tracking-wide text-white">
              9769516928@fam
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/70 pt-2 border-t border-white/10">
              <span>Automatic 12-Digit UTR Match</span>
              <span className="text-emerald-300 font-semibold">T+0 Direct Settlement</span>
            </div>
          </div>
        </div>

        {/* Marquee Footer */}
        <div className="relative z-10 -mx-10 xl:-mx-14 -mb-6 opacity-90 overflow-hidden pointer-events-auto">
          <CurvedLoop
            marqueeText="HAMROPAY ✦ INSTANT UPI ✦ FAMPAY ✦ AUTOMATIC UTR MATCH ✦ REST API ✦ T+0 SETTLEMENT"
            speed={1.5}
            curveAmount={40}
            className="fill-white font-mono text-xs font-bold tracking-widest uppercase opacity-80"
          />
        </div>
      </aside>

      {/* Main Authentication Form Panel */}
      <main className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-6 py-10 sm:px-12 xl:px-16 bg-white">
        <div className="max-w-sm w-full mx-auto space-y-6">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          )}

          {/* Mobile Header Brand */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">
              Hamro<span className="text-rose-600">Pay</span>
            </span>
          </div>

          {/* Tab Switcher (Login / Register) */}
          {(viewMode === 'login' || viewMode === 'register') && (
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  viewMode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setViewMode('register')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  viewMode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* ================= VIEW: LOGIN ================= */}
          {viewMode === 'login' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Sign In
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Access your merchant dashboard</p>
                </div>
                {/* Method Switcher Pill */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('password')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      loginMethod === 'password'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('otp')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      loginMethod === 'otp'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    OTP Login
                  </button>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="merchant@example.com"
                      required
                      className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Password Input (Password Mode) */}
                {loginMethod === 'password' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full text-xs font-medium pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* OTP Input & Send Button (OTP Mode) */}
                {loginMethod === 'otp' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isSendingOtp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>{otpSent ? 'Resend OTP' : 'Send OTP'}</span>
                      </button>
                      <span className="text-[11px] text-slate-500 self-center">
                        {otpSent ? 'Check inbox for code' : 'Click to send verification code'}
                      </span>
                    </div>

                    {otpSent && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Enter 6-Digit OTP
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                            <KeyRound className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="123456"
                            className="w-full text-xs font-bold tracking-widest pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Forgot Password Link */}
                {loginMethod === 'password' && (
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('forgot_password')}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>{loginMethod === 'otp' ? 'Verify & Login' : 'Sign In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ================= VIEW: REGISTER ================= */}
          {viewMode === 'register' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Register Merchant
                </h2>
                <p className="text-xs text-slate-500 mt-1">Create your HamroPay brand workspace</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Brand / Merchant Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Name / Brand Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kathmandu Hub"
                      required
                      className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Email Input + Send OTP Button */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="merchant@example.com"
                        required
                        className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="px-3.5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isSendingOtp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      )}
                      <span>{otpSent ? 'Resend' : 'Send OTP'}</span>
                    </button>
                  </div>
                </div>

                {/* OTP Input Field */}
                {otpSent && (
                  <div className="space-y-1.5 bg-rose-50/60 p-3 rounded-xl border border-rose-200 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider">
                      OTP Code (Sent to Email)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-rose-400">
                        <KeyRound className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter 6-digit OTP"
                        required
                        className="w-full text-xs font-bold tracking-widest pl-10 pr-4 py-2.5 rounded-lg border border-rose-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                )}

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full text-xs font-medium pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Referral Code Input (Optional) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Referral Code</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Gift className="w-4 h-4 text-emerald-500" />
                    </span>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="e.g. HPF8RJRG4"
                      className="w-full text-xs font-bold tracking-wider pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition uppercase"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify &amp; Register</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ================= VIEW: FORGOT PASSWORD ================= */}
          {viewMode === 'forgot_password' && (
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => setViewMode('login')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Forgot Password
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your email to receive a password reset link
                </p>
              </div>

              {forgotSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Reset link sent to email</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Please check your inbox at <strong>{email}</strong> for instructions to reset your password.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode('login')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="merchant@example.com"
                        required
                        className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ================= VIEW: RESET PASSWORD ================= */}
          {viewMode === 'reset_password' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Reset Password
                </h2>
                <p className="text-xs text-slate-500 mt-1">Set a new password for your account</p>
              </div>

              {resetSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Password Updated!</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Your password has been reset successfully. You can now log in with your new credentials.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode('login')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Go to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  {/* Reset Token */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Reset Token
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Enter token from email"
                        required
                        className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full text-xs font-medium pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resetting Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer Backend Status */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Connected to <span className="font-mono text-slate-600 font-semibold">hamropay-backends.onrender.com</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
