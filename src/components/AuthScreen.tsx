import React, { useState, useEffect } from 'react';
import { Wallet, ArrowLeft, Loader2, Zap, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../config/supabase';
import CurvedLoop from './CurvedLoop';

interface AuthScreenProps {
  onLoginSuccess?: (token: string, user: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onBackToLanding?: () => void;
  initialIsSignUp?: boolean;
}

export default function AuthScreen({
  showToast,
  onBackToLanding
}: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const err = searchParams.get('error');
      if (err) {
        if (err === 'auth_failed') {
          setErrorMsg('Authentication failed. Please try again.');
          if (showToast) showToast('Authentication failed', 'error');
        } else if (err === 'no_session') {
          setErrorMsg('Session expired or not found. Please log in again.');
          if (showToast) showToast('Session expired', 'error');
        } else {
          setErrorMsg('An error occurred during sign in.');
        }
      }
    }
  }, [showToast]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const redirectTo = 'https://hamro-pay-kilj.vercel.app/auth/callback';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      });

      if (error) {
        console.error('Google Sign In Error:', error);
        setErrorMsg(error.message || 'Could not initiate Google login');
        setIsLoading(false);
        if (showToast) showToast(error.message || 'Could not initiate Google login', 'error');
      }
    } catch (err: any) {
      console.error('Google Auth exception:', err);
      setErrorMsg(err.message || 'An unexpected error occurred');
      setIsLoading(false);
      if (showToast) showToast('Google auth failed', 'error');
    }
  };

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
            <span>Instant FamPay &amp; Paytm Settlements</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.1]">
            Accept UPI Payments <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-200">Instantly</span>.
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
            marqueeText="HAMROPAY ✦ INSTANT UPI ✦ FAMPAY ✦ AUTOMATIC UTR MATCH ✦ REST API ✦ T+0 SETTLEMENT"
            speed={1.5}
            curveAmount={40}
            className="fill-rose-300/80 font-mono text-xs font-bold tracking-widest uppercase"
          />
        </div>
      </aside>

      {/* Main Google Authentication Panel */}
      <main className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-6 py-10 sm:px-12 xl:px-16 bg-[#0a0204]">
        <div className="max-w-sm w-full mx-auto space-y-8">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
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

            <div className="space-y-1 pt-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Merchant Sign In
              </h2>
              <p className="text-xs text-slate-400">
                Sign in securely to your merchant portal with Google
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/50 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Google Login Only Section */}
          <div className="space-y-4 pt-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-4 px-5 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-900 rounded-2xl text-sm font-bold transition shadow-xl shadow-rose-950/40 disabled:opacity-60 flex items-center justify-center gap-3 cursor-pointer border border-slate-200 group"
            >
              {isLoading ? (
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
              <span>OAuth 2.0 Encryption &amp; Supabase Auth</span>
            </div>
          </div>

          {/* Footer Status */}
          <div className="pt-6 border-t border-rose-950/60 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Connected to <span className="font-mono text-rose-300 font-semibold">hamropay-backends.onrender.com</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
