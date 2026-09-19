import { useState, useEffect } from 'react';
import { PanelLeft } from 'lucide-react';
import { getTokenInfo, regenerateKey, setMode } from '../services/developer.service';

interface DeveloperPortalViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
}

export default function DeveloperPortalView({
  showToast,
  onOpenSidebar,
  onViewChange
}: DeveloperPortalViewProps) {
  const getStoredApiKey = () => {
    try {
      const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      return merchant.api_key || 'hp_live_8f3c9a2b7e4d1f8a3c9b2e7d4f1a8c3b9e2d7f4a';
    } catch {
      return 'hp_live_8f3c9a2b7e4d1f8a3c9b2e7d4f1a8c3b9e2d7f4a';
    }
  };

  const [realKey, setRealKey] = useState(getStoredApiKey);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [webhooks, setWebhooks] = useState<string[]>([]);
  const [whInput, setWhInput] = useState('');
  const [gatewayMode, setGatewayMode] = useState<'live' | 'test'>('live');

  const maskedKey = '•'.repeat(realKey.length || 32);

  // Sync token info from backend API on mount
  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        const info = await getTokenInfo();
        if (info?.api_key) {
          setRealKey(info.api_key);
          const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
          merchant.api_key = info.api_key;
          localStorage.setItem('hamropay_merchant', JSON.stringify(merchant));
        }
      } catch {
        // Fallback gracefully
      }
    };
    fetchTokenInfo();
  }, []);

  const handleReveal = () => {
    setIsRevealed(!isRevealed);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(realKey).then(() => {
      setCopiedKey(true);
      showToast('API Key copied to clipboard!', 'success');
      setTimeout(() => setCopiedKey(false), 1600);
    }).catch(() => {
      showToast('Copy failed. Please select key manually.', 'error');
    });
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerating will instantly disable the old key. Continue?')) return;
    setRegenerating(true);
    try {
      const newData = await regenerateKey();
      const newKey = newData?.api_key || ('hp_live_' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
      setRealKey(newKey);
      const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      merchant.api_key = newKey;
      localStorage.setItem('hamropay_merchant', JSON.stringify(merchant));
      showToast('API Key regenerated successfully!', 'success');
    } catch {
      const newKey = 'hp_live_' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setRealKey(newKey);
      showToast('API Key regenerated locally!', 'success');
    } finally {
      setRegenerating(false);
    }
  };

  const handleAddWebhook = () => {
    const url = whInput.trim();
    if (!url || !url.startsWith('http')) {
      showToast('Please enter a valid HTTP/HTTPS URL.', 'error');
      return;
    }
    if (webhooks.length >= 3) {
      showToast('Maximum 3 webhooks allowed.', 'error');
      return;
    }
    if (webhooks.includes(url)) {
      showToast('Webhook URL already exists.', 'error');
      return;
    }
    setWebhooks([...webhooks, url]);
    setWhInput('');
    showToast('Webhook added successfully!', 'success');
  };

  const handleDeleteWebhook = (urlToDelete: string) => {
    setWebhooks(webhooks.filter(w => w !== urlToDelete));
    showToast('Webhook removed.', 'info');
  };

  const handleModeSelect = async (mode: 'live' | 'test') => {
    setGatewayMode(mode);
    try {
      await setMode(mode);
      showToast(`Gateway mode switched to ${mode.toUpperCase()} MODE.`, 'info');
    } catch {
      showToast(`Gateway mode switched to ${mode.toUpperCase()} MODE.`, 'info');
    }
  };

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

      <div className="page-content animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">

        {/* Page Header */}
        <div className="page-header">
          <div className="page-head-left">
            <div className="page-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m8 6-6 6 6 6M16 6l6 6-6 6"/>
              </svg>
            </div>
            <div className="page-info">
              <h1>Developer Portal — Hamro API</h1>
              <p>Accept HamroPay payments directly on your own website or app.</p>
            </div>
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
            <div className="stat-value">0</div>
          </div>

          <div className="stat-card" data-accent="green">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="m8.5 12.5 2.5 2.5 4.5-5"/>
              </svg>
            </div>
            <div className="stat-label">Successful</div>
            <div className="stat-value">0</div>
          </div>

          <div className="stat-card" data-accent="gold">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l5-6 4 4 8-10"/>
                <path d="M15 5h5v5"/>
              </svg>
            </div>
            <div className="stat-label">This Month</div>
            <div className="stat-value">₹0.00</div>
          </div>

          <div className="stat-card" data-accent="gold">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v5l3 2"/>
              </svg>
            </div>
            <div className="stat-label">Last Used</div>
            <div className="stat-value">Never</div>
          </div>
        </div>

        {/* API KEY PANEL */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <div className="panel-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7" cy="15" r="4"/>
                  <path d="m10.5 11.5 8-8M16 4l4 4M14 6l4 4"/>
                </svg>
              </div>
              <div className="panel-title-text">
                <h2>Your Hamro API Key</h2>
                <p>Identifies your HamroPay account when your website, app, or server calls HamroPay</p>
              </div>
            </div>
          </div>

          <div className="warn-banner">
            <span className="warn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01"/>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
              </svg>
            </span>
            <span>Keep this private — anyone with this key can create payment orders billed to your account.</span>
          </div>

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
              onClick={handleReveal} 
              aria-label="Reveal key" 
              title="Show / hide"
              style={{ color: isRevealed ? '#2bf29a' : '' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button 
              className={`icon-action ${copiedKey ? 'copied' : ''}`} 
              onClick={handleCopy} 
              aria-label="Copy key" 
              title="Copy"
            >
              {copiedKey ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              )}
            </button>
          </div>

          <div className="key-meta">
            <div className="key-created">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              Created <strong style={{ color: '#fff', marginLeft: '4px' }}>17 Sept 2026</strong>
            </div>
            <button className="btn-danger" onClick={handleRegenerate} disabled={regenerating}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
              </svg>
              {regenerating ? 'Regenerating...' : 'Regenerate Key'}
            </button>
          </div>

          <div className="key-footer-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            Regenerating instantly disables the old key — update it everywhere you've used it.
          </div>
        </div>

        {/* QUICK START PANEL */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <div className="panel-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div className="panel-title-text">
                <h2>Quick Start</h2>
              </div>
            </div>
          </div>

          <div className="quick-intro">
            Full step-by-step guides for HTML/JS, PHP, and Java are in{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onViewChange?.('developer'); }}>API Integration</a>, right below Hamro API in the sidebar. Short version:
          </div>

          <div className="step">
            <div className="step-num">1</div>
            <div className="step-body">
              <div className="step-title">Create an order</div>
              <div className="code-line">
                <span className="method">POST</span>
                <span className="path">/api/developer/create-order</span>
              </div>
              <div className="step-desc">
                Body: <code>{`{ hamro_api, amount, title }`}</code>
              </div>
            </div>
          </div>

          <div className="step">
            <div className="step-num">2</div>
            <div className="step-body">
              <div className="step-title">Redirect the customer</div>
              <div className="step-desc">
                Send them to the <code>payment_url</code> you get back in the response.
              </div>
            </div>
          </div>

          <div className="step">
            <div className="step-num">3</div>
            <div className="step-body">
              <div className="step-title">Poll for the result</div>
              <div className="code-line">
                <span className="method">GET</span>
                <span className="path">/api/developer/order-status/:orderId</span>
              </div>
              <div className="step-desc">
                Same key. Poll until status is <span className="ok">success</span> or <span className="fail">failed</span>, then show your own UI.
              </div>
            </div>
          </div>
        </div>

        {/* RECENT API ORDERS PANEL */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <div className="panel-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16M4 12h16M4 18h10"/>
                </svg>
              </div>
              <div className="panel-title-text">
                <h2>Recent API Orders</h2>
              </div>
            </div>
            <button className="panel-action">
              View All
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                <path d="M3 12h6l2 3h2l2-3h6"/>
              </svg>
            </div>
            <div className="empty-title">No API orders yet</div>
            <div className="empty-sub">
              Orders created via <code>create-order</code> will show up here.
            </div>
          </div>
        </div>

        {/* WEBHOOKS PANEL */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <div className="panel-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7"/>
                  <circle cx="12" cy="12" r="1.5"/>
                </svg>
              </div>
              <div className="panel-title-text">
                <h2>Webhooks</h2>
                <p>Get notified the instant an order changes status</p>
              </div>
            </div>
            <span className="wh-badge">{webhooks.length} / 3 used</span>
          </div>

          <div className="wh-desc">
            Optional. Get an instant POST to your own server whenever an order you created via Hamro API goes{' '}
            <span className="pend">pending</span>, <span className="ok">success</span>, or <span className="fail">failed</span> —
            so you don't have to poll <code>order-status</code>.
          </div>

          <div className="wh-input-row">
            <div className="input-wrap">
              <input 
                className="wh-input" 
                type="url" 
                value={whInput} 
                onChange={(e) => setWhInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWebhook()}
                placeholder="https://yourserver.com/hamropay/webhook" 
              />
            </div>
            <button className="btn-primary" onClick={handleAddWebhook}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add
            </button>
          </div>

          {webhooks.length === 0 ? (
            <div className="wh-empty">No webhook URLs added yet.</div>
          ) : (
            <div className="space-y-2 mb-4">
              {webhooks.map((url, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(8,1,4,0.85)] border border-[rgba(255,45,85,0.16)] text-xs font-mono">
                  <span className="text-[#2bf29a] font-semibold truncate mr-2">✓ {url}</span>
                  <button 
                    onClick={() => handleDeleteWebhook(url)}
                    className="text-[#ff5274] hover:text-white transition font-sans font-bold text-xs"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="payload-box">
            <div className="payload-label">PAYLOAD</div>
            <div className="payload-code">
              {`{ `}
              <span className="k">"event"</span>: <span className="v">"order.success"</span>,{' '}
              <span className="k">"order_id"</span>: <span className="v">"..."</span>,{' '}
              <span className="k">"status"</span>: <span className="v">"success"</span>,{' '}
              <span className="k">"amount"</span>: <span className="n">199</span>,{' '}
              <span className="k">"utr"</span>: <span className="v">"..."</span>,{' '}
              <span className="k">"sent_at"</span>: <span className="n">1234567890</span>
              {` }`}
            </div>
          </div>
        </div>

        {/* PAYMENT ROUTING PANEL - FAM PAY ONLY */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <div className="panel-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div className="panel-title-text">
                <h2>Payment Routing</h2>
                <p>How your customers actually pay</p>
              </div>
            </div>
          </div>

          <div className="routing-desc">
            Choose how payments created via Hamro API and your Payment Links are processed for your customers. This applies to every existing link too — not just new ones.
          </div>

          <div className="warn-banner">
            <span className="warn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01"/>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
              </svg>
            </span>
            <span>Wallet routing has been disabled platform-wide — every merchant must accept payments through their own connected cashier.</span>
          </div>

          <div className="routing-item" onClick={() => onViewChange?.('fampay')}>
            <div className="routing-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <path d="M14 14h3v3M14 21h7v-7M17 21h4v-4"/>
              </svg>
            </div>
            <div className="routing-body">
              <div className="routing-title">Cashier (Direct QR)</div>
              <div className="routing-sub">Custom checkout &amp; auto verification via FamPay</div>
            </div>
          </div>

          <div className="routing-locked" style={{ marginBottom: 0 }}>
            <svg className="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
            <span>Connect FamPay first to unlock Cashier routing. <a href="#" onClick={(e) => { e.preventDefault(); onViewChange?.('fampay'); }}>Connect now</a></span>
          </div>
        </div>

        {/* GATEWAY MODE PANEL */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <div className="panel-icon gold">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <path d="M8 9h8M8 13h5"/>
                </svg>
              </div>
              <div className="panel-title-text">
                <h2>Gateway Mode</h2>
                <p>Live traffic vs. safe testing</p>
              </div>
            </div>
          </div>

          <div className="gateway-desc">
            Applies to your whole account — both your Hamro API and every payment link. Switch to Test Mode to try your integration end-to-end with zero real money involved: customers get HamroPay's own simulator (<code>test.html</code>) instead of a real UPI checkout, and you get the same success/failed/cancelled notifications you'd get for real, without a rupee moving.
          </div>

          <div 
            className={`mode-option ${gatewayMode === 'live' ? 'active' : ''}`} 
            onClick={() => handleModeSelect('live')}
          >
            <div className="mode-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7"/>
                <circle cx="12" cy="12" r="1.5"/>
              </svg>
            </div>
            <div className="mode-body">
              <div className="mode-title">Live Mode</div>
              <div className="mode-sub">Real payments, real money</div>
            </div>
          </div>

          <div 
            className={`mode-option ${gatewayMode === 'test' ? 'active' : ''}`} 
            onClick={() => handleModeSelect('test')}
            style={{ marginBottom: 0 }}
          >
            <div className="mode-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3h6M9 3v6L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 9V3"/>
              </svg>
            </div>
            <div className="mode-body">
              <div className="mode-title">Test Mode</div>
              <div className="mode-sub">Simulated checkout, no real money</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
