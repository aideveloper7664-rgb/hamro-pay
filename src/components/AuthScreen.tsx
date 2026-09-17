import React, { useState } from 'react';
import { Wallet, Mail, Lock, ShieldCheck, ArrowRight, CheckCircle, User, Loader2, Globe, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TextLoop from './TextLoop';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AuthScreen({ onLoginSuccess, showToast }: AuthScreenProps) {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
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
        const merchant = await register(name.trim(), email.trim(), password, webhookUrl.trim() || undefined);
        const token = localStorage.getItem('hamropay_token') || '';
        showToast('Merchant workspace registered successfully!', 'success');
        onLoginSuccess(token, merchant);
      } else {
        const res = await login(email.trim(), password);
        showToast(`Welcome back, ${res.merchant?.name || 'Merchant'}!`, 'success');
        onLoginSuccess(res.token, res.merchant);
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed. Check your credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    showToast('Password reset link sent to your email if registered.', 'info');
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
          <span className="text-2xl font-black tracking-tight">Hamro Pay</span>
        </div>

        {/* Center Copy */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            Direct FamPay UPI Gateway
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]">
            Empower your digital merchant settlements.
          </h1>
          <p className="text-rose-100 text-base font-normal leading-relaxed opacity-90">
            Create payment orders, collect UPI settlements, reconcile UTRs with automatic Gmail verification, and withdraw funds straight to your bank account.
          </p>
        </div>

        {/* Running Bottom Loop */}
        <div className="relative z-10 pt-8 border-t border-white/10">
          <TextLoop
            text="Instant JWT Auth ✦ Instant FamPay Settlement ✦ Automated UTR Verification ✦ High-Speed Orders ✦ RESTful API Keys"
            shape="line"
            speed={35}
            direction="forward"
            separator="✦"
            fontSize={12}
            fontWeight={600}
            color="#ffffff"
            ribbon={false}
            height={24}
          />
        </div>
      </aside>

      {/* Main Authentication Form */}
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Header Mobile Brand */}
          <div className="md:hidden flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">Hamro Pay</span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isSignUp ? 'Create Merchant Account' : 'Sign in to Merchant Portal'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isSignUp 
                ? 'Register your merchant business and receive your unique API key instantly.' 
                : 'Enter your account email and password to access your dashboard.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Sign Up Only) */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label htmlFor="signUpName" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                  Merchant / Business Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="signUpName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-medium"
                    placeholder="e.g. Kathmandu Retailers"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="authEmail" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="authEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-medium"
                  placeholder="merchant@example.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="authPassword" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="authPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Webhook URL (Sign Up Only) */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label htmlFor="webhookUrl" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                  Webhook URL (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    id="webhookUrl"
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-medium"
                    placeholder="https://myshop.com/webhook/hamropay"
                  />
                </div>
              </div>
            )}

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
                  <span>Connecting to Backend...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Register & Get API Key' : 'Sign in to Merchant Portal'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Toggle View Link */}
          <div className="text-center mt-4 text-xs font-semibold text-slate-500">
            {isSignUp ? 'Already have a merchant account?' : "Don't have an account yet?"}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setName('');
                setEmail('');
                setPassword('');
                setWebhookUrl('');
              }}
              className="text-rose-600 hover:text-rose-700 ml-1.5 focus:outline-none underline font-bold"
            >
              {isSignUp ? 'Sign in instead' : 'Register brand'}
            </button>
          </div>

          {/* Backend Info Card */}
          <div className="flex gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs text-slate-600 leading-relaxed font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-800 font-bold block mb-0.5">Custom Backend Connected</b>
              Authentication and wallet services run on <span className="font-mono text-rose-600 font-bold">hamropay-backends.onrender.com</span> via secure JWT.
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}
