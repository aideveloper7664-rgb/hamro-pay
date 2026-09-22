import React, { useState } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Rocket,
  Bell,
  Clock,
  Store,
  QrCode,
  Zap,
  Globe,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers
} from 'lucide-react';

interface StorePortalViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
}

export default function StorePortalView({ showToast }: StorePortalViewProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribersCount, setSubscribersCount] = useState(1420);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address for early access.', 'error');
      return;
    }
    setSubscribed(true);
    setSubscribersCount(prev => prev + 1);
    showToast('🎉 You are registered for VIP Store Portal Early Access!', 'success');
  };

  return (
    <div className="store-portal-container">
      {/* Hero Card */}
      <div className="store-hero">
        <div className="store-hero-bg-grid" />
        <div className="store-orb o1" />
        <div className="store-orb o2" />

        <div className="store-badge-top">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>NEXT-GEN MERCHANT E-COMMERCE</span>
        </div>

        <div className="store-icon-wrap">
          <Store className="w-9 h-9 text-white" />
          <div className="store-icon-ring" />
        </div>

        <h1 className="store-hero-title">
          HamroPay Store Portal <br />
          <span className="store-gradient-text">Merchant Storefront</span>
        </h1>

        <p className="store-hero-sub">
          We're engineering an all-in-one digital storefront platform for Nepali merchants. Launch your online shop, catalog products, and accept instant QR &amp; card payments in minutes.
        </p>

        {/* Progress Bar */}
        <div className="store-progress-card">
          <div className="store-progress-header">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span className="text-xs font-bold text-slate-200">System Deployment Status</span>
            </div>
            <span className="text-xs font-black text-rose-400">88% Complete</span>
          </div>
          <div className="store-progress-bar-bg">
            <div className="store-progress-bar-fill" style={{ width: '88%' }} />
          </div>
          <div className="store-progress-footer">
            <span>Core Payment Engine: <strong className="text-emerald-400">LIVE</strong></span>
            <span>Expected Release: <strong className="text-amber-300">Q4 2026</strong></span>
          </div>
        </div>

        {/* VIP Early Access Form */}
        <div className="store-early-access-wrap">
          {subscribed ? (
            <div className="store-subscribed-box">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">VIP Priority Access Confirmed!</div>
                <div className="text-xs text-slate-400">We'll send your invite token to <strong className="text-rose-300">{email}</strong> as soon as beta opens.</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="store-access-form">
              <input
                type="email"
                placeholder="Enter email for VIP early access..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="store-access-input"
                required
              />
              <button type="submit" className="store-access-btn">
                <Bell className="w-4 h-4" />
                <span>Notify Me</span>
              </button>
            </form>
          )}

          <div className="text-[11px] text-slate-400 font-semibold text-center mt-3">
            🔥 Joined by <strong className="text-white">{subscribersCount.toLocaleString()}</strong> merchants waiting for instant storefront launch.
          </div>
        </div>
      </div>

      {/* Feature Preview Cards */}
      <div className="section-head" style={{ marginTop: '32px' }}>
        <span className="section-head-title">Upcoming Storefront Features</span>
        <span className="section-head-line" />
      </div>

      <div className="store-features-grid">
        {/* Feature 1 */}
        <div className="store-feat-card">
          <div className="store-feat-icon bg-gradient-to-br from-rose-500 to-rose-700">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div className="store-feat-title">Instant Digital Catalog</div>
          <div className="store-feat-desc">
            Upload items, set prices in NPR/USD, and generate instant WhatsApp &amp; Viber catalog checkout links for buyers.
          </div>
          <div className="store-feat-badge">Smart Catalog</div>
        </div>

        {/* Feature 2 */}
        <div className="store-feat-card">
          <div className="store-feat-icon bg-gradient-to-br from-amber-500 to-rose-600">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="store-feat-title">Automated Inventory</div>
          <div className="store-feat-desc">
            Real-time stock deduction, low-stock mobile alerts, and UTR payment verification built right into your dashboard.
          </div>
          <div className="store-feat-badge">Stock Engine</div>
        </div>

        {/* Feature 3 */}
        <div className="store-feat-card">
          <div className="store-feat-icon bg-gradient-to-br from-indigo-500 to-purple-700">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="store-feat-title">Custom Domain &amp; Branding</div>
          <div className="store-feat-desc">
            Host your store on <code className="text-rose-300 font-bold">yourstore.hamropay.app</code> or link your custom domain with zero code.
          </div>
          <div className="store-feat-badge">Custom Domain</div>
        </div>

        {/* Feature 4 */}
        <div className="store-feat-card">
          <div className="store-feat-icon bg-gradient-to-br from-emerald-500 to-teal-700">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="store-feat-title">Zero Transaction Fees</div>
          <div className="store-feat-desc">
            Direct QR &amp; UTR settlement into your HamroPay wallet with 0% extra gateway charges for early store adopters.
          </div>
          <div className="store-feat-badge text-emerald-300">0% Gateway Fee</div>
        </div>
      </div>

      {/* Store Mockup Teaser */}
      <div className="store-mockup-banner">
        <div className="store-mockup-left">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">Merchant Preview</span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight">
            Designed for Nepali Businesses &amp; Retailers
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-lg mt-1">
            Whether you sell clothing, electronics, handicrafts, or services — HamroPay Store Portal gives you a professional e-commerce site with integrated eSewa, Khalti, Fonepay, and FamPay options.
          </p>
        </div>

        <div className="store-mockup-preview-pill">
          <Layers className="w-4 h-4 text-rose-400" />
          <span>Beta Testing Active</span>
        </div>
      </div>
    </div>
  );
}
