import React, { useState } from 'react';
import { Wallet, Mail, Lock, ShieldCheck, ArrowRight, Zap, CheckCircle, User, Loader2 } from 'lucide-react';
import { ApiService } from '../lib/api';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AuthScreen({ onLoginSuccess, showToast }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('merchant@hamropay.demo');
  const [password, setPassword] = useState('hamropay-demo');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const response = await ApiService.signup(name.trim(), email.trim(), password);
        if (response.success && response.token && response.user) {
          showToast(`Merchant workspace registered successfully!`, 'success');
          onLoginSuccess(response.token, response.user);
        } else {
          showToast(response.error || 'Failed to complete registration.', 'error');
        }
      } else {
        const response = await ApiService.login(email.trim(), password);
        if (response.success && response.token && response.user) {
          showToast(`Welcome back, ${response.user.name || 'Merchant'}!`, 'success');
          onLoginSuccess(response.token, response.user);
        } else {
          showToast(response.error || 'Authentication failed. Verify credentials.', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'An unexpected connection error occurred.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    showToast('A recovery link has been sent to your registered email.', 'success');
  };

  return (
    <section className="min-h-screen grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] bg-white text-slate-800 animate-[fadeInScale_0.35s_cubic-bezier(0.16,1,0.3,1)_both]" aria-label="Hamro Pay authentication">
      {/* Brand Side Rail (Hidden on Mobile) */}
      <aside className="relative hidden md:flex flex-col justify-between p-12 lg:p-16 overflow-hidden bg-gradient-to-br from-rose-700 via-rose-600 to-slate-900 text-white select-none">
        {/* Background Decorative Rings */}
        <div className="absolute top-0 right-0 w-96 h-96 -mr-20 -mt-20 rounded-full border border-white/10" />
        <div className="absolute top-0 right-0 w-[480px] h-[480px] -mr-32 -mt-32 rounded-full border border-white/5 shadow-[0_0_80px_rgba(255,255,255,0.02)]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-rose-600 flex items-center justify-center shadow-lg shadow-rose-950/20">
            <Wallet className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">Hamro Pay</span>
        </div>

        {/* Hero Headings */}
        <div className="relative z-10 my-auto max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold uppercase tracking-wider text-rose-100 mb-6">
            <Zap className="w-3.5 h-3.5 fill-rose-300 text-rose-300" /> Nepal's Premium Digital Wallet
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4">
            Unified digital collections for your business.
          </h1>
          <p className="text-base text-rose-100/80 font-normal leading-relaxed">
            Create branded checkout links, follow payouts, and manage your merchant reserves from a clean, secure, high-trust local wallet platform.
          </p>

          {/* Quick Feature Grid */}
          <div className="grid grid-cols-3 gap-4 mt-12">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Wallet className="w-5 h-5 text-rose-300 mb-2" />
              <div className="font-bold text-sm text-white mb-0.5">Quick Payouts</div>
              <div className="text-xs text-rose-200/70">Instant local transfers.</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Zap className="w-5 h-5 text-rose-300 mb-2" />
              <div className="font-bold text-sm text-white mb-0.5">Custom Links</div>
              <div className="text-xs text-rose-200/70"> Branded checkouts.</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <ShieldCheck className="w-5 h-5 text-rose-300 mb-2" />
              <div className="font-bold text-sm text-white mb-0.5">Bank Trust</div>
              <div className="text-xs text-rose-200/70">ISO-grade security.</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-rose-200/60 font-medium">
          Hamro Pay Merchant Workspace · Proudly Nepali
        </div>
      </aside>

      {/* Auth Main Form Area */}
      <main className="flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-[420px] bg-white rounded-3xl border border-slate-100 shadow-xl p-8 animate-[fadeInUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
          {/* Brand Logo for Mobile */}
          <div className="flex md:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <Wallet className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">Hamro Pay</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5">
              {isSignUp ? 'Create Merchant Account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-slate-500 font-normal">
              {isSignUp ? 'Register your brand to start collecting payments.' : 'Sign in to your merchant dashboard.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field (Only on Sign Up) */}
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="signUpName" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                  Merchant / Company Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="w-4.5 h-4.5" />
                  </span>
                  <input
                    id="signUpName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-medium"
                    placeholder="e.g. Aarav Creations"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="authEmail" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input
                  id="authEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-medium"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="authPassword" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  id="authPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Options */}
            {!isSignUp && (
              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500/20 border-slate-300 w-4 h-4 cursor-pointer"
                  />
                  Remember this device
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-rose-600 hover:text-rose-700 focus:outline-none transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-600/15 active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:bg-rose-400 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Please wait...
                </>
              ) : (
                <>
                  {isSignUp ? 'Create Merchant Account' : 'Sign in to Hamro Pay'}
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Toggle View Link */}
          <div className="text-center mt-5 text-xs font-semibold text-slate-500">
            {isSignUp ? 'Already have an account?' : 'New to Hamro Pay?'}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                if (isSignUp) {
                  setEmail('merchant@hamropay.demo');
                  setPassword('hamropay-demo');
                } else {
                  setName('');
                  setEmail('');
                  setPassword('');
                }
              }}
              className="text-rose-600 hover:text-rose-700 ml-1.5 focus:outline-none underline"
            >
              {isSignUp ? 'Sign in instead' : 'Register brand'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-100" />
            <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-slate-100" />
          </div>

          {/* Demo Note */}
          <div className="flex gap-3 bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-xs text-rose-900/80 leading-relaxed font-medium">
            <CheckCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <b className="text-rose-950 font-bold block mb-0.5">Staging Sandbox Connected</b>
              You can log in instantly with the credentials filled above, or register a new custom merchant brand. Records are fully synchronized end-to-end.
            </div>
          </div>

          {/* Terms Footer */}
          <div className="text-[10px] text-center text-slate-400 font-semibold leading-relaxed mt-6">
            By signing in, you acknowledge and agree to the Hamro Pay digital merchant services agreements.
          </div>
        </div>
      </main>
    </section>
  );
}
