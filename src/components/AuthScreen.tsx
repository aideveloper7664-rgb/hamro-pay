import React, { useState } from 'react';
import { Wallet, Mail, Lock, ArrowRight, User, Loader2, Globe, Eye, EyeOff, ShieldCheck, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CurvedLoop from './CurvedLoop';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onBackToLanding?: () => void;
  initialIsSignUp?: boolean;
}

export default function AuthScreen({ onLoginSuccess, showToast, onBackToLanding, initialIsSignUp = false }: AuthScreenProps) {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const merchant = await register(name.trim(), email.trim(), password, webhookUrl.trim() || undefined);
        const token = localStorage.getItem('hamropay_token') || '';
        showToast('Merchant workspace created!', 'success');
        onLoginSuccess(token, merchant);
      } else {
        const res = await login(email.trim(), password);
        showToast(`Welcome back, ${res.merchant?.name || 'Merchant'}!`, 'success');
        onLoginSuccess(res.token, res.merchant);
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed. Please verify credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white text-slate-900 font-sans antialiased selection:bg-rose-600 selection:text-white">
      
      {/* Brand & Animation Rail (Desktop) */}
      <aside className="lg:col-span-6 xl:col-span-7 relative hidden lg:flex flex-col justify-between p-10 xl:p-14 overflow-hidden bg-gradient-to-br from-rose-600 via-rose-700 to-slate-950 text-white select-none">
        {/* Animated Background Ambience */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-rose-500/20 blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        
        {/* Decorative Ring Layers */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full border border-white/5 pointer-events-none" />

        {/* Top Logo Bar */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white text-rose-600 flex items-center justify-center shadow-lg shadow-rose-950/20">
            <Wallet className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">Hamro<span className="text-rose-200">Pay</span></span>
            <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-widest text-rose-100">
              UPI
            </span>
          </div>
        </div>

        {/* Center Minimal Native Card & Heading */}
        <div className="relative z-10 my-auto max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-rose-100">
            <Zap className="w-3.5 h-3.5 text-rose-300 fill-current" />
            <span>Instant UPI & FamPay Settlements</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.15] text-white">
            Accept UPI Payments <span className="text-rose-200">Instantly</span>.
          </h1>

          {/* Floating Native Live Status Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-200 font-semibold">FamPay UPI VPA</span>
              <span className="flex items-center gap-1.5 text-emerald-300 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active
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

        {/* Bottom Curved Animated Marquee */}
        <div className="relative z-10 -mx-10 xl:-mx-14 -mb-6 opacity-90 overflow-hidden pointer-events-auto">
          <CurvedLoop
            marqueeText="HAMROPAY ✦ INSTANT UPI ✦ FAMPAY ✦ AUTOMATIC UTR MATCH ✦ REST API ✦ T+0 SETTLEMENT"
            speed={1.5}
            curveAmount={40}
            className="fill-white font-mono text-xs font-bold tracking-widest uppercase opacity-80"
          />
        </div>
      </aside>

      {/* Main Authentication Form */}
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
            <span className="text-xl font-black tracking-tight text-slate-900">Hamro<span className="text-rose-600">Pay</span></span>
          </div>

          {/* Native Pill Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                !isSignUp 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isSignUp 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isSignUp ? 'Register Brand' : 'Sign In'}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Merchant Name */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Brand Name
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
                    required={isSignUp}
                    className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email
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

            {/* Password */}
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

            {/* Webhook URL (Sign Up Only) */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Webhook URL (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://myshop.com/webhook"
                    className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            {!isSignUp && (
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500/20 border-slate-300 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => showToast('Password reset link sent if registered.', 'info')}
                  className="text-rose-600 hover:text-rose-700 font-bold"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Merchant Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle View */}
          <div className="text-center text-xs font-semibold text-slate-500">
            {isSignUp ? 'Already registered?' : "Need an account?"}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-rose-600 hover:text-rose-700 ml-1.5 font-bold underline"
            >
              {isSignUp ? 'Sign In' : 'Register Brand'}
            </button>
          </div>

          {/* Minimal Backend Status Bar */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected to <span className="font-mono text-slate-600 font-semibold">hamropay-backends.onrender.com</span></span>
          </div>

        </div>
      </main>

    </div>
  );
}
