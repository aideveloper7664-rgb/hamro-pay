import { PanelLeft, RefreshCw, Copy, Check, Eye, EyeOff, AlertTriangle, ExternalLink, Loader2, KeyRound, Globe, Radio, Plus, Trash2, ArrowUpRight } from 'lucide-react';
import { getTokenInfo, regenerateKey, setMode, getApiOrders, getWebhooks, addWebhook, deleteWebhook, createApiOrder } from '../services/developer.service';
import { useState, useEffect, useRef } from 'react';

interface DeveloperPortalViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
  gatewayMode: 'live' | 'test';
  setGatewayMode: (mode: 'live' | 'test') => void;
}

export interface DeveloperOrder {
  order_id: string;
  title?: string;
  amount: number;
  pay_amount?: number;
  status: 'pending' | 'success' | 'failed' | 'paid' | 'expired' | 'cancelled';
  reason?: string | null;
  utr?: string | null;
  mode?: 'live' | 'test';
  created_at?: string;
}

export default function DeveloperPortalView({
  showToast,
  onOpenSidebar,
  onViewChange,
  gatewayMode,
  setGatewayMode
}: DeveloperPortalViewProps) {
  const getStoredApiKey = () => {
    try {
      const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      return merchant.api_key || '';
    } catch {
      return '';
    }
  };

  const [realKey, setRealKey] = useState<string>(getStoredApiKey);
  const [keyCreatedAt, setKeyCreatedAt] = useState<string>('Active');
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Loading & error state for token
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Gateway mode switching
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  // Try it card state
  const [tryAmount, setTryAmount] = useState<string>('10');
  const [isCreatingTryOrder, setIsCreatingTryOrder] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<{ id: string; url: string } | null>(null);

  // Webhooks state (max 1 webhook supported by backend)
  const [webhooksList, setWebhooksList] = useState<{ url: string }[]>([]);
  const [whInput, setWhInput] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [isDeletingWebhook, setIsDeletingWebhook] = useState(false);

  // Developer orders state
  const [orders, setOrders] = useState<DeveloperOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const maskedKey = realKey ? '•'.repeat(Math.min(realKey.length, 36)) : '••••••••••••••••••••••••••••••••';

  // 1. Fetch token on mount
  const fetchTokenInfo = async () => {
    setIsLoadingToken(true);
    setTokenError(null);
    try {
      const info = await getTokenInfo();
      const data = info?.data !== undefined ? info.data : info;
      if (data?.api_key) {
        setRealKey(data.api_key);
        if (data.mode) {
          setGatewayMode(data.mode);
        }
        if (data.created_at) {
          setKeyCreatedAt(new Date(data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
        }
        try {
          const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
          merchant.api_key = data.api_key;
          localStorage.setItem('hamropay_merchant', JSON.stringify(merchant));
        } catch {
          // Ignore localStorage errors
        }
      }
    } catch (err: any) {
      setTokenError(err?.message || 'Could not load developer token settings.');
    } finally {
      setIsLoadingToken(false);
    }
  };

  // 2. Fetch webhooks
  const fetchWebhooks = async () => {
    try {
      const res = await getWebhooks();
      const payload = res?.data !== undefined ? res.data : res;
      if (Array.isArray(payload)) {
        setWebhooksList(payload.map((item: any) => typeof item === 'string' ? { url: item } : item));
      } else if (payload?.url) {
        setWebhooksList([{ url: payload.url }]);
      } else {
        setWebhooksList([]);
      }
    } catch {
      // Graceful fallback
    }
  };

  // 3. Fetch developer orders
  const fetchOrders = async (silent = false) => {
    if (!silent) setIsLoadingOrders(true);
    try {
      const res = await getApiOrders();
      const data = res?.data !== undefined ? res.data : res;
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch {
      // Graceful fallback
    } finally {
      if (!silent) setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchTokenInfo();
    fetchWebhooks();
    fetchOrders();
  }, []);

  // 4. Auto-refresh orders every 10s if pending, else 60s
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const hasPending = ordersRef.current.some(o => o.status === 'pending');
      fetchOrders(true);
    }, orders.some(o => o.status === 'pending') ? 10000 : 60000);

    return () => clearInterval(timer);
  }, [orders]);

  const handleCopy = () => {
    if (!realKey) return;
    navigator.clipboard?.writeText(realKey).then(() => {
      setCopiedKey(true);
      showToast('API Key copied to clipboard!', 'success');
      setTimeout(() => setCopiedKey(false), 1600);
    }).catch(() => {
      showToast('Copy failed. Please copy key manually.', 'error');
    });
  };

  const handleRegenerate = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to regenerate your API key?\n\nThe existing key will stop working immediately. Update all your websites and servers that use it.'
    );
    if (!confirmed) return;

    setRegenerating(true);
    try {
      const res = await regenerateKey();
      const data = res?.data !== undefined ? res.data : res;
      if (data?.api_key) {
        setRealKey(data.api_key);
        try {
          const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
          merchant.api_key = data.api_key;
          localStorage.setItem('hamropay_merchant', JSON.stringify(merchant));
        } catch {
          // Ignore
        }
        showToast('API Key regenerated successfully!', 'success');
      } else {
        throw new Error(res?.message || 'Failed to regenerate key');
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not regenerate key. Your active key remains valid.', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleModeSelect = async (mode: 'live' | 'test') => {
    if (mode === gatewayMode || isSwitchingMode) return;
    const confirmMsg = mode === 'live'
      ? 'Switch to LIVE mode?\n\nCustomers will make real UPI payments directly into your connected FamPay account.'
      : 'Switch to TEST mode?\n\nReal payments will stop for API orders. Customers will see a test simulator instead.';

    if (!window.confirm(confirmMsg)) return;

    setIsSwitchingMode(true);
    try {
      const res = await setMode(mode);
      const data = res?.data !== undefined ? res.data : res;
      setGatewayMode(data?.mode || mode);
      showToast(`Gateway mode switched to ${mode.toUpperCase()}`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to switch gateway mode.', 'error');
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleTryIt = async () => {
    const amt = Number(tryAmount);
    if (isNaN(amt) || amt < 1 || amt > 5000) {
      showToast('Enter an amount between ₹1 and ₹5,000.', 'error');
      return;
    }
    if (!realKey) {
      showToast('API Key is missing. Please reload or regenerate.', 'error');
      return;
    }

    setIsCreatingTryOrder(true);
    try {
      const resp: any = await createApiOrder({ amount: amt, title: 'Try it Checkout' }, realKey);
      const data = resp?.data !== undefined ? resp.data : resp;
      if (data?.payment_url) {
        setLastCreatedOrder({ id: data.order_id, url: data.payment_url });
        window.open(data.payment_url, '_blank', 'noopener,noreferrer');
        showToast(`Order ${data.order_id} created successfully!`, 'success');
        fetchOrders(true);
      } else {
        throw new Error(resp?.message || 'Could not retrieve payment checkout URL.');
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to create try order.', 'error');
    } finally {
      setIsCreatingTryOrder(false);
    }
  };

  const handleAddWebhook = async () => {
    const url = whInput.trim();
    if (!url || !url.startsWith('http')) {
      showToast('Please enter a valid HTTP/HTTPS URL.', 'error');
      return;
    }
    if (webhooksList.length >= 1) {
      showToast('Maximum 1 webhook supported. Delete existing webhook first.', 'error');
      return;
    }

    setIsSavingWebhook(true);
    try {
      await addWebhook(url);
      setWebhooksList([{ url }]);
      setWhInput('');
      showToast('Webhook URL saved successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save webhook.', 'error');
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const handleDeleteWebhook = async () => {
    setIsDeletingWebhook(true);
    try {
      await deleteWebhook();
      setWebhooksList([]);
      showToast('Webhook removed.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete webhook.', 'error');
    } finally {
      setIsDeletingWebhook(false);
    }
  };

  const successfulOrders = orders.filter(o => o.status === 'success' || o.status === 'paid');
  const thisMonthVolume = successfulOrders.reduce((sum, o) => sum + (Number(o.pay_amount || o.amount) || 0), 0);

  return (
    <div className="min-h-screen text-[#fff2f4] flex flex-col">
      {/* Top Nav Header */}
      <header className="topbar">
        <div className="topbar-left">
          <button 
            className="w-9 h-9 rounded-[11px] bg-[#1a050a] border border-[#831f33] flex items-center justify-center text-[#ff8ca3] hover:text-white hover:border-[#ff2d55] hover:bg-[#280810] transition-all cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.15)] active:scale-95" 
            aria-label="Open navigation menu" 
            onClick={onOpenSidebar} 
            title="Toggle Menu"
          >
            <PanelLeft className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>
        </div>
        <div className="topbar-center">Hamro API</div>
        <div className="topbar-right">
          <button 
            className="icon-btn" 
            aria-label="Notifications" 
            onClick={() => onViewChange?.('notifications')} 
            title="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            <span className="badge-dot"></span>
          </button>
        </div>
      </header>

      <div className="page-content animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both] space-y-6">

        {/* Error banner if token fetch failed */}
        {tokenError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{tokenError}</span>
            </div>
            <button
              onClick={fetchTokenInfo}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="page-head-left">
            <div className="page-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m8 6-6 6 6 6M16 6l6 6-6 6"/>
              </svg>
            </div>
            <div className="page-info">
              <h1>Developer Portal — Hamro API</h1>
              <p>Accept direct UPI payments via API on your custom website or app</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://hamropay-backends.onrender.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Open Backend API Docs"
            >
              <span>Swagger Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/api/docs');
                }
                onViewChange?.('api-docs');
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#b80028] text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-[0_4px_14px_rgba(255,30,75,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
              title="Open API Integration Docs"
            >
              <span>API Integration Docs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stat Cards - 2 rows (2 cards per row) */}
        <div className="stats-grid !grid-cols-1 sm:!grid-cols-2">
          <div className="stat-card" data-accent="blue">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
              </svg>
            </div>
            <div className="stat-label">API Orders</div>
            <div className="stat-value">{orders.length}</div>
          </div>

          <div className="stat-card" data-accent="green">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="m8.5 12.5 2.5 2.5 4.5-5"/>
              </svg>
            </div>
            <div className="stat-label">Successful</div>
            <div className="stat-value">{successfulOrders.length}</div>
          </div>

          <div className="stat-card" data-accent="gold">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l5-6 4 4 8-10"/>
                <path d="M15 5h5v5"/>
              </svg>
            </div>
            <div className="stat-label">This Month</div>
            <div className="stat-value">₹{thisMonthVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>

          <div className="stat-card" data-accent="gold">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v5l3 2"/>
              </svg>
            </div>
            <div className="stat-label">Mode Status</div>
            <div className="stat-value uppercase" style={{ color: gatewayMode === 'live' ? '#2bf29a' : '#ffb834', fontSize: '18px' }}>
              {gatewayMode}
            </div>
          </div>
        </div>

        {/* API KEY PANEL */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <div className="panel-icon">
                <KeyRound className="w-5 h-5 text-[#ff4d6d]" />
              </div>
              <div className="panel-title-text">
                <h2>Your Hamro API Key</h2>
                <p>Pass via <code>X-HamroAPI-Key</code> or <code>x-api-key</code> headers</p>
              </div>
            </div>
          </div>

          <div className="warn-banner">
            <span className="warn-icon">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </span>
            <span>Keep this private — anyone with this key can create payment orders billed to your account.</span>
          </div>

          {isLoadingToken ? (
            <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#ff4d6d]" />
              <span>Loading developer credentials...</span>
            </div>
          ) : (
            <>
              <div className="api-key-field">
                <div className="key-input-wrap">
                  <input 
                    className="key-input" 
                    type="text" 
                    value={isRevealed ? realKey : maskedKey} 
                    readOnly 
                    style={{ letterSpacing: isRevealed ? '0.5px' : '2px' }}
                  />
                </div>
                <button 
                  className="icon-action" 
                  onClick={() => setIsRevealed(!isRevealed)} 
                  aria-label="Reveal key" 
                  title="Show / hide"
                  style={{ color: isRevealed ? '#2bf29a' : '' }}
                >
                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button 
                  className={`icon-action ${copiedKey ? 'copied' : ''}`} 
                  onClick={handleCopy} 
                  aria-label="Copy key" 
                  title="Copy"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-[#2bf29a]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="key-meta">
                <div className="key-created text-xs text-slate-400">
                  Created: <strong style={{ color: '#fff', marginLeft: '4px' }}>{keyCreatedAt}</strong>
                </div>
                <button className="btn-danger" onClick={handleRegenerate} disabled={regenerating}>
                  {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{regenerating ? 'Regenerating...' : 'Regenerate Key'}</span>
                </button>
              </div>
            </>
          )}

          <div className="key-footer-note">
            Regenerating instantly disables the old key — update it everywhere you've used it.
          </div>
        </div>

        {/* GATEWAY MODE PANEL (ASLI) */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <div className="panel-icon gold">
                <Radio className="w-5 h-5 text-amber-400" />
              </div>
              <div className="panel-title-text">
                <h2>Gateway Mode</h2>
                <p>Live traffic vs. safe simulator testing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                gatewayMode === 'live'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {gatewayMode.toUpperCase()} MODE ACTIVE
              </span>
            </div>
          </div>

          <div className="gateway-desc text-xs text-slate-300 leading-relaxed mb-4">
            Applies to API orders created with <code>/api/developer/create-order</code>.<br />
            <strong>Live:</strong> real UPI checkout, real money, payment auto-detected from your connected FamPay account.<br />
            <strong>Test:</strong> no real money; customer sees a simulator and can select Success, Failed, or Cancelled directly.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button 
              type="button"
              className={`mode-option text-left w-full transition cursor-pointer ${gatewayMode === 'live' ? 'active ring-2 ring-emerald-500/40 bg-emerald-500/10' : 'opacity-70 hover:opacity-100'}`} 
              onClick={() => handleModeSelect('live')}
              disabled={isSwitchingMode}
            >
              <div className="mode-icon text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <div className="mode-body">
                <div className="mode-title font-bold text-white flex items-center gap-2">
                  <span>Live Mode</span>
                  {gatewayMode === 'live' && <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded">Active</span>}
                </div>
                <div className="mode-sub text-xs text-slate-400">Real UPI collections into your FamPay account</div>
              </div>
            </button>

            <button 
              type="button"
              className={`mode-option text-left w-full transition cursor-pointer ${gatewayMode === 'test' ? 'active ring-2 ring-amber-500/40 bg-amber-500/10' : 'opacity-70 hover:opacity-100'}`} 
              onClick={() => handleModeSelect('test')}
              disabled={isSwitchingMode}
            >
              <div className="mode-icon text-amber-400">
                <Radio className="w-5 h-5" />
              </div>
              <div className="mode-body">
                <div className="mode-title font-bold text-white flex items-center gap-2">
                  <span>Test Mode</span>
                  {gatewayMode === 'test' && <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded">Active</span>}
                </div>
                <div className="mode-sub text-xs text-slate-400">Simulated checkout with 3 test simulator buttons</div>
              </div>
            </button>
          </div>

          {/* TRY IT CARD */}
          <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Try It Out</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Interactive Order Test</span>
              </h3>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="number" 
                min="1"
                max="5000"
                value={tryAmount}
                onChange={(e) => setTryAmount(e.target.value)}
                className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-rose-500" 
                placeholder="Amount (₹)" 
              />
              <button 
                className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer" 
                onClick={handleTryIt}
                disabled={isCreatingTryOrder}
              >
                {isCreatingTryOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                <span>Create Order &amp; Open Checkout</span>
              </button>
            </div>

            <p className="text-[11.5px] text-slate-400 leading-relaxed">
              {gatewayMode === 'live' 
                ? '⚠️ Live mode: this generates a real order. You must pay via UPI to complete it.' 
                : 'ℹ️ Test mode: safe simulation. You can click Success/Failed/Cancelled on the checkout page.'}
            </p>

            {lastCreatedOrder && (
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 truncate">Order: {lastCreatedOrder.id}</span>
                <a 
                  href={lastCreatedOrder.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-rose-400 hover:text-white flex items-center gap-1 shrink-0 font-sans font-bold"
                >
                  <span>Re-open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* WEBHOOKS PANEL (Max 1) */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <div className="panel-icon blue">
                <Globe className="w-5 h-5 text-sky-400" />
              </div>
              <div className="panel-title-text">
                <h2>Webhooks</h2>
                <p>Instant server-to-server notifications for order status changes</p>
              </div>
            </div>
            <span className="wh-badge">{webhooksList.length} / 1 configured</span>
          </div>

          <div className="wh-desc text-xs text-slate-400">
            Hamro Pay dispatches an instant HTTP POST to your webhook endpoint whenever an API order updates to <code>success</code>, <code>failed</code>, or <code>cancelled</code>.
          </div>

          {webhooksList.length === 0 ? (
            <div className="wh-input-row flex gap-2">
              <div className="input-wrap flex-1">
                <input 
                  className="wh-input w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-xs font-mono text-white" 
                  type="url" 
                  value={whInput} 
                  onChange={(e) => setWhInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWebhook()}
                  placeholder="https://yourdomain.com/api/hamropay/webhook" 
                />
              </div>
              <button 
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer" 
                onClick={handleAddWebhook}
                disabled={isSavingWebhook}
              >
                {isSavingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Save Webhook</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {webhooksList.map((wh, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/50 border border-emerald-500/30 text-xs font-mono">
                  <span className="text-emerald-400 font-semibold truncate mr-2">✓ {wh.url}</span>
                  <button 
                    onClick={handleDeleteWebhook}
                    disabled={isDeletingWebhook}
                    className="text-rose-400 hover:text-white transition font-sans font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="payload-box">
            <div className="payload-label">PAYLOAD FORMAT</div>
            <div className="payload-code">
              {`{ "event": "order.success", "order_id": "HP...", "status": "success", "amount": 100, "utr": "...", "sent_at": 1726000000 }`}
            </div>
          </div>
        </div>

        {/* DEVELOPER ORDERS TABLE */}
        <div className="panel">
          <div className="panel-head flex items-center justify-between">
            <div className="panel-title-wrap">
              <div className="panel-title-text">
                <h2>API Orders History</h2>
                <p>Real-time log of orders generated via Developer API</p>
              </div>
            </div>
            <button 
              onClick={() => fetchOrders(false)} 
              disabled={isLoadingOrders}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="empty-state py-8 text-center text-slate-400 space-y-2">
              <div className="text-xs">No Developer API orders created yet.</div>
              <div className="text-[11px] text-slate-500">
                Call <code>POST /api/developer/create-order</code> or use the "Try It Out" card above to test.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((ord, idx) => (
                    <tr key={ord.order_id || idx} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {ord.order_id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {ord.title || 'API Order'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">
                        ₹{(Number(ord.pay_amount || ord.amount) || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ord.mode === 'test' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {ord.mode || 'live'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ord.status === 'success' || ord.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : ord.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                              : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
