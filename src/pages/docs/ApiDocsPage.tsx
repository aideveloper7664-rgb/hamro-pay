import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BASE_URL,
  LANGS,
  SAMPLES,
  ERRORS,
  ERROR_CATEGORIES,
  LangKey,
  generatePromptFor,
  generateFullDoc,
  stripHtml
} from './ApiDocsData';
import { DOCS_STYLES } from './ApiDocsStyles';

interface ApiDocsPageProps {
  onBackToDashboard?: () => void;
}

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({ onBackToDashboard }) => {
  const [activeLang, setActiveLang] = useState<LangKey>('html');
  const [errorCat, setErrorCat] = useState<string>('all');
  const [openErrors, setOpenErrors] = useState<Record<number, boolean>>({});
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [copiedButtons, setCopiedButtons] = useState<Record<string, boolean>>({});

  // Show a temporary toast
  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  // Copy helper with feedback
  const copyWithFeedback = useCallback(async (key: string, text: string, feedbackLabel = 'Copied') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedButtons(prev => ({ ...prev, [key]: true }));
      triggerToast(feedbackLabel);
      setTimeout(() => {
        setCopiedButtons(prev => ({ ...prev, [key]: false }));
      }, 1800);
    } catch {
      triggerToast('Failed to copy. Please select manually.');
    }
  }, [triggerToast]);

  // Download text file helper
  const downloadPrompt = useCallback((filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast('Prompt downloaded: ' + filename);
  }, [triggerToast]);

  // Scroll to section
  const scrollTo = useCallback((id: string) => {
    setIsMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveSection(id);
    }
  }, []);

  // ScrollSpy listener
  useEffect(() => {
    const sectionIds = ['overview', 'key', 'reference', 'webhooks', 'integration', 'errors', 'testmode', 'practices'];
    const handleScroll = () => {
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140) {
            current = id;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard escape listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCopyModalOpen(false);
        setIsDrawerOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered errors
  const filteredErrors = useMemo(() => {
    return ERRORS.filter(e => errorCat === 'all' || e.cat === errorCat);
  }, [errorCat]);

  // Toggle error item
  const toggleError = useCallback((idx: number) => {
    setOpenErrors(prev => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const currentSample = SAMPLES[activeLang];

  return (
    <div className="hamro-docs-root bg-[#09040a] text-[#f6eef5] min-h-screen relative font-sans selection:bg-[#ff2d55]/30">
      <style dangerouslySetInnerHTML={{ __html: DOCS_STYLES }} />

      {/* Top Floating Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-[#1d0f1c] border border-[#ff2d55]/40 text-[#ff8fa5] text-xs font-bold shadow-[0_8px_24px_rgba(255,45,85,0.3)] backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#34d399] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Topbar */}
      <header className="topbar">
        <button
          className="btn menu-btn !flex lg:!hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>

        <div className="logo" onClick={() => scrollTo('overview')} role="button" tabIndex={0}>
          H
        </div>

        <div className="brand" onClick={() => scrollTo('overview')} role="button" tabIndex={0}>
          <b>Hamro Pay API</b>
          <span>Developer Documentation</span>
        </div>

        <div className="sp" />

        <div className="chip hidden sm:flex">
          <i />
          <span>All systems operational</span>
        </div>

        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="btn !bg-[#1f0b1a] !border-[#ff2d55]/30 hover:!border-[#ff2d55] text-xs font-bold text-[#ff9db0]"
            title="Return to Merchant Dashboard"
          >
            ← Hamro API
          </button>
        )}

        <button
          className="btn text-xs font-bold"
          onClick={() => setIsDrawerOpen(true)}
          title="Open AI Integration Prompts"
        >
          AI prompts
        </button>

        <button
          className="btn primary text-xs font-extrabold"
          onClick={() => setIsCopyModalOpen(true)}
          title="Copy Documentation Options"
        >
          Copy all docs
        </button>
      </header>

      {/* Main Shell */}
      <div className="shell">
        {/* Sidebar */}
        <aside className={`side ${isMobileMenuOpen ? 'open' : ''}`} id="side">
          <div className="lbl">Documentation</div>
          <a
            onClick={() => scrollTo('overview')}
            className={activeSection === 'overview' ? 'on' : ''}
          >
            Overview
          </a>
          <a
            onClick={() => scrollTo('key')}
            className={activeSection === 'key' ? 'on' : ''}
          >
            Getting your key
          </a>
          <a
            onClick={() => scrollTo('reference')}
            className={activeSection === 'reference' ? 'on' : ''}
          >
            API reference
          </a>
          <a
            onClick={() => scrollTo('webhooks')}
            className={activeSection === 'webhooks' ? 'on' : ''}
          >
            Webhooks
          </a>
          <a
            onClick={() => scrollTo('integration')}
            className={activeSection === 'integration' ? 'on' : ''}
          >
            Integration guide
          </a>
          <a
            onClick={() => scrollTo('errors')}
            className={activeSection === 'errors' ? 'on' : ''}
          >
            Error reference
          </a>
          <a
            onClick={() => scrollTo('testmode')}
            className={activeSection === 'testmode' ? 'on' : ''}
          >
            Test &amp; Live mode
          </a>
          <a
            onClick={() => scrollTo('practices')}
            className={activeSection === 'practices' ? 'on' : ''}
          >
            Best practices
          </a>

          <div className="lbl" style={{ marginTop: '24px' }}>Tools</div>
          <a onClick={() => setIsDrawerOpen(true)}>AI prompts</a>
          <a onClick={() => setIsCopyModalOpen(true)}>Copy all docs</a>

          {onBackToDashboard && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
              <a onClick={onBackToDashboard} style={{ color: '#ff8fa5', fontWeight: 700 }}>
                ← Back to Dashboard
              </a>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="main">
          {/* Hero */}
          <div className="hero" id="overview">
            <div className="eyebrow">API Integration</div>
            <h1>Hamro Pay <em>API Integration</em></h1>
            <p>
              Accept UPI payments on your website or app with three calls: create an order,
              send your customer to pay, then confirm the result from your server. Payments are
              detected automatically from your connected FamPay account.
            </p>

            <div className="row" style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
              <button className="btn primary" onClick={() => scrollTo('reference')}>
                View API reference
              </button>
              <button className="btn" onClick={() => setIsDrawerOpen(true)}>
                AI integration prompts
              </button>
            </div>

            <div className="flow">
              <div>
                <b>1 · Create order</b>
                <span>Your server calls <code>create-order</code> and gets a <code>payment_url</code>.</span>
              </div>
              <div>
                <b>2 · Customer pays</b>
                <span>Customer pays the exact amount shown, from any UPI app.</span>
              </div>
              <div>
                <b>3 · Auto-detected</b>
                <span>Hamro Pay spots the payment in your FamPay emails within seconds.</span>
              </div>
              <div>
                <b>4 · You verify</b>
                <span>Your server calls <code>order-status</code> and checks <code>success</code>.</span>
              </div>
            </div>
          </div>

          {/* Section 01: Overview & Key */}
          <section className="sec" id="key">
            <div className="sh">
              <div className="num">01</div>
              <h2>Overview &amp; getting your key</h2>
            </div>
            <div className="body">
              <p>
                Every Hamro Pay merchant account has exactly <strong>one API key</strong> (it starts with <code>hmpay_</code>).
                It authenticates every request you make.
              </p>

              <h3>Where to find it</h3>
              <ol>
                <li>Log in to your Hamro Pay dashboard.</li>
                <li>Open the <strong>Developer</strong> section.</li>
                <li>Copy your key from there. You can regenerate it any time.</li>
              </ol>

              <h3>Before you take live payments</h3>
              <ul>
                <li>Connect a <strong>FamPay account</strong> (UPI ID + Gmail App Password). Payments are detected from that Gmail.</li>
                <li>Keep some <strong>Hamro Credits</strong>. Commission is deducted from credits on every successful payment.</li>
                <li>Stay in <strong>Live mode</strong> (see <a onClick={() => scrollTo('testmode')} style={{ cursor: 'pointer' }}>Test &amp; Live mode</a>).</li>
              </ul>

              <h3>Treat the key like a password</h3>
              <ul>
                <li>Call <code>create-order</code> from your <strong>server</strong> whenever you can. The browser widget is a quick-start convenience: it puts your key in page code.</li>
                <li>Never commit it to a public repository.</li>
                <li>If it leaks, regenerate it. The old key stops working instantly, with no grace period.</li>
              </ul>
            </div>
          </section>

          {/* Section 02: API Reference */}
          <section className="sec" id="reference">
            <div className="sh">
              <div className="num">02</div>
              <h2>API reference</h2>
            </div>
            <div className="body">
              <h3>Base URL</h3>
              <div className="cb">
                <div className="cbh">
                  <span>Base URL</span>
                  <button
                    className="cp"
                    onClick={() => copyWithFeedback('base_url', BASE_URL, 'Base URL copied')}
                  >
                    {copiedButtons['base_url'] ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre>{BASE_URL}</pre>
              </div>

              <h3>Authentication</h3>
              <p>
                Send your key in the JSON body as <code>hamro_api</code>, <strong>or</strong> as a header <code>X-HamroAPI-Key</code> (the older <code>x-api-key</code> header also works).
              </p>
              <div className="tw">
                <table>
                  <thead>
                    <tr><th>Situation</th><th>Response</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Key missing</td><td><code>401</code> Missing HamroAPI key</td></tr>
                    <tr><td>Key invalid</td><td><code>401</code> Invalid HamroAPI key</td></tr>
                    <tr><td>Account suspended</td><td><code>403</code> This account has been suspended.</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>Rate limit</h3>
              <p><strong>60 requests per 15 minutes</strong> per API key (per IP address if no key is sent).</p>

              <h3 style={{ marginTop: '28px' }}>Create order</h3>
              <div className="ep">
                <span className="m post">POST</span>
                <span className="p">/api/developer/create-order</span>
              </div>
              <p>
                Creates a payment order and returns a <code>payment_url</code> for your customer.
                Send <code>Content-Type: application/json</code>.
              </p>

              <div className="tw">
                <table>
                  <thead>
                    <tr><th>Field</th><th>Required</th><th>Type</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><code>hamro_api</code></td><td><span className="req">Yes*</span></td><td>string</td><td>*Not needed if you use the <code>X-HamroAPI-Key</code> header.</td></tr>
                    <tr><td><code>amount</code></td><td><span className="req">Yes</span></td><td>number</td><td>₹1 to ₹5,000, at most 2 decimals. A plain number: <code>499</code>, never <code>"₹499"</code> or <code>"1,999"</code>.</td></tr>
                    <tr><td><code>title</code></td><td><span className="opt">No</span></td><td>string</td><td>Up to 100 characters. Shown on the payment page. Default <code>"Hamro Pay Payment"</code>.</td></tr>
                    <tr><td><code>customer_mobile</code></td><td><span className="opt">No</span></td><td>string</td><td>10 digits, optional <code>+91</code> prefix. No spaces or dashes.</td></tr>
                    <tr><td><code>redirect_url</code></td><td><span className="opt">No</span></td><td>string</td><td>Where customer goes after payment. Only <code>http:</code> or <code>https:</code>.</td></tr>
                    <tr><td><code>useEmbedded</code></td><td><span className="opt">No</span></td><td>boolean</td><td><code>true</code> to open payment inside an in-app popup/widget instead of full page.</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="cb">
                <div className="cbh">
                  <span>Example response (200 OK)</span>
                  <button
                    className="cp"
                    onClick={() => copyWithFeedback('create_resp', JSON.stringify({
                      success: true,
                      data: {
                        order_id: 'HP1792316718001ETM0',
                        payment_url: `${BASE_URL}/pay/HP1792316718001ETM0`,
                        amount: 499,
                        pay_amount: 499.03,
                        status: 'pending',
                        expires_at: '2026-10-20T14:30:00.000Z'
                      }
                    }, null, 2), 'Response JSON copied')}
                  >
                    {copiedButtons['create_resp'] ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre>{`{
  "success": true,
  "data": {
    "order_id": "HP1792316718001ETM0",
    "payment_url": "${BASE_URL}/pay/HP1792316718001ETM0",
    "amount": 499,
    "pay_amount": 499.03,
    "status": "pending",
    "expires_at": "2026-10-20T14:30:00.000Z"
  }
}`}</pre>
              </div>

              <h3 style={{ marginTop: '28px' }}>Get order status</h3>
              <div className="ep">
                <span className="m get">GET</span>
                <span className="p">/api/developer/order-status/:orderId</span>
              </div>
              <p>
                Checks payment status. Always call this from your server before fulfilling orders or delivering digital goods.
              </p>

              <div className="cb">
                <div className="cbh">
                  <span>Example response (200 OK)</span>
                  <button
                    className="cp"
                    onClick={() => copyWithFeedback('status_resp', JSON.stringify({
                      success: true,
                      data: {
                        status: 'success',
                        order_id: 'HP1792316718001ETM0',
                        amount: 499,
                        pay_amount: 499.03,
                        utr: '429381729482',
                        is_test: false,
                        mode: 'live'
                      }
                    }, null, 2), 'Status JSON copied')}
                  >
                    {copiedButtons['status_resp'] ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre>{`{
  "success": true,
  "data": {
    "status": "success",
    "order_id": "HP1792316718001ETM0",
    "amount": 499,
    "pay_amount": 499.03,
    "utr": "429381729482",
    "is_test": false,
    "mode": "live"
  }
}`}</pre>
              </div>
            </div>
          </section>

          {/* Section 03: Webhooks */}
          <section className="sec" id="webhooks">
            <div className="sh">
              <div className="num">03</div>
              <h2>Webhooks (optional)</h2>
            </div>
            <div className="body">
              <p>
                Hamro Pay can send a real-time HTTP POST notification to your server when a customer completes payment.
                Set your Webhook URL in your merchant dashboard.
              </p>
              <div className="cb">
                <div className="cbh">
                  <span>Webhook Event Payload</span>
                  <button
                    className="cp"
                    onClick={() => copyWithFeedback('wh_payload', JSON.stringify({
                      event: 'payment.success',
                      order_id: 'HP1792316718001ETM0',
                      amount: 499,
                      utr: '429381729482',
                      timestamp: 1739281729,
                      test: false
                    }, null, 2), 'Webhook payload copied')}
                  >
                    {copiedButtons['wh_payload'] ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre>{`{
  "event": "payment.success",
  "order_id": "HP1792316718001ETM0",
  "amount": 499,
  "utr": "429381729482",
  "timestamp": 1739281729,
  "test": false
}`}</pre>
              </div>
              <ul>
                <li><code>link_id</code> is <code>null</code> for API orders, and set for payment-link payments.</li>
                <li>In Test mode the event is <code>payment.test</code> with <code>"test": true</code> and no money moves.</li>
                <li>Treat a webhook as an instant trigger: confirm with <code>order-status</code> from your server before fulfilling.</li>
              </ul>
            </div>
          </section>

          {/* Section 04: Integration Guide */}
          <section className="sec" id="integration">
            <div className="sh">
              <div className="num">04</div>
              <h2>Integration guide</h2>
            </div>
            <div className="body">
              <p>Pick your stack. Every example is complete: swap in your API key and you are live.</p>

              {/* Stack Tabs */}
              <div className="tabs" id="tabs">
                {LANGS.map(l => (
                  <button
                    key={l}
                    className={`tab ${activeLang === l ? 'on' : ''}`}
                    onClick={() => setActiveLang(l)}
                  >
                    {SAMPLES[l].label}
                  </button>
                ))}
              </div>

              {/* Active Tab Pane */}
              <div className="pane on" id={`pane-${activeLang}`}>
                <p>{currentSample.intro}</p>

                {currentSample.blocks.map((bl, bIdx) => {
                  const blockKey = `${activeLang}_${bIdx}`;
                  return (
                    <div className="cb" key={bIdx}>
                      <div className="cbh">
                        <span>{bl.label}</span>
                        <button
                          className="cp"
                          onClick={() => copyWithFeedback(blockKey, bl.code, `${bl.label} copied`)}
                        >
                          {copiedButtons[blockKey] ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre>{bl.code}</pre>
                    </div>
                  );
                })}

                {currentSample.notes && currentSample.notes.map((n, nIdx) => (
                  <div key={nIdx} className={`callout ${n[0]}`}>
                    <b>{n[0] === 'info' ? 'ℹ' : '⚠'}</b>
                    <div dangerouslySetInnerHTML={{ __html: n[1] }} />
                  </div>
                ))}

                <button
                  className="btn copyall"
                  onClick={() => copyWithFeedback(
                    `full_guide_${activeLang}`,
                    generateFullDoc(activeLang),
                    `Copied full ${currentSample.label} integration guide`
                  )}
                >
                  {copiedButtons[`full_guide_${activeLang}`] ? 'Copied' : `Copy full ${currentSample.label} integration guide`}
                </button>
              </div>
            </div>
          </section>

          {/* Section 05: Error Reference */}
          <section className="sec" id="errors">
            <div className="sh">
              <div className="num">05</div>
              <h2>Error reference</h2>
            </div>
            <div className="body">
              <p>
                Tap an error to see why it happens and how to fix it. These come from the API's real checks,
                not generic guesses.
              </p>

              {/* Category Filter */}
              <div className="ef" id="ef">
                {ERROR_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    className={`ec ${errorCat === c.id ? 'on' : ''}`}
                    onClick={() => setErrorCat(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Error Cards List */}
              <div id="errList">
                {filteredErrors.map((e, idx) => {
                  const isOpened = !!openErrors[idx];
                  const codeClass = e.code === 'JS' ? 'cjs' : `c${e.code}`;
                  return (
                    <div key={idx} className={`err ${isOpened ? 'open' : ''}`} data-cat={e.cat}>
                      <div className="eh" onClick={() => toggleError(idx)}>
                        <span className={`ecode ${codeClass}`}>{e.code}</span>
                        <div className="en">
                          <b>{e.name}</b>
                          <span>{e.msg}</span>
                        </div>
                        <span className="chev">{isOpened ? '▴' : '▾'}</span>
                      </div>

                      {isOpened && (
                        <div className="eb">
                          {e.payload && (
                            <div className="pl relative">
                              <pre>{e.payload}</pre>
                            </div>
                          )}
                          <div className="lab w">Why it happens</div>
                          <p dangerouslySetInnerHTML={{ __html: e.why }} />
                          <div className="lab f">How to fix</div>
                          <p dangerouslySetInnerHTML={{ __html: e.fix }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section 06: Test Mode & Live Mode */}
          <section className="sec" id="testmode">
            <div className="sh">
              <div className="num">06</div>
              <h2>Test mode &amp; Live mode</h2>
            </div>
            <div className="body">
              <p>
                Your account has one <strong>mode</strong>, switchable any time in the dashboard (Developer section).
                It applies to every <code>create-order</code> call. New accounts start in <strong>Live</strong>.
              </p>
              <ul>
                <li><strong>Live</strong>: real UPI checkout, real money, wallet credited.</li>
                <li>
                  <strong>Test</strong>: <code>create-order</code> returns a <code>payment_url</code> that opens a simulator
                  with three buttons: <strong>Success</strong>, <strong>Failed</strong>, <strong>Cancelled</strong>.
                  No money moves, your wallet and credits are untouched, and test orders do not appear in Payment History.
                </li>
              </ul>
              <p>
                In Test mode you don't need a FamPay account, credits or wallet room, and <code>pay_amount</code> always
                equals <code>amount</code>. Nothing else changes shape: <code>order-status</code> returns the same
                <code>pending</code> / <code>success</code> / <code>failed</code> values (plus <code>"mode": "test"</code>),
                so the code you write for testing is the code you ship.
              </p>
              <div className="callout warn">
                <b>⚠</b>
                <div>
                  Leaving Test mode on is the most common reason a "live" site stops taking real payments.
                  If customers can't pay, check the mode in your dashboard first.
                </div>
              </div>
            </div>
          </section>

          {/* Section 07: Best Practices & Security */}
          <section className="sec" id="practices">
            <div className="sh">
              <div className="num">07</div>
              <h2>Best practices &amp; security</h2>
            </div>
            <div className="body">
              <ul>
                <li><strong>Never trust a redirect or browser callback alone.</strong> Confirm with <code>order-status</code> from your server.</li>
                <li><strong>Create orders server-side</strong> and keep the API key out of public code.</li>
                <li><strong>Use the amount from your own database</strong>, never from the browser, when you call create-order.</li>
                <li><strong>Make fulfilment idempotent.</strong> A webhook, a redirect and your own polling can all report the same payment. Fulfil each <code>order_id</code> only once.</li>
                <li><strong>Poll no faster than every 2.5 seconds</strong> and stay within 60 requests / 15 minutes per key.</li>
                <li><strong>Show the exact <code>pay_amount</code>.</strong> Paying a different amount will not be recognised automatically.</li>
                <li><strong>Regenerate the key immediately</strong> if you suspect a leak.</li>
              </ul>
            </div>
          </section>

          {/* Bottom Callout Export */}
          <div className="aic" id="export">
            <div className="aii">
              <h2>Copy the full documentation</h2>
              <p>Reference, integration code and the complete error list in one paste. Pick everything, or just one language.</p>
              <button className="btn" onClick={() => setIsCopyModalOpen(true)}>
                Copy all docs
              </button>
            </div>
          </div>

          <div className="foot">Hamro Pay · Developer Documentation</div>
        </main>
      </div>

      {/* Copy Documentation Modal */}
      {isCopyModalOpen && (
        <div className="ov open" id="copyModal" onClick={(e) => { if (e.target === e.currentTarget) setIsCopyModalOpen(false); }}>
          <div className="box">
            <div className="bh">
              <div>
                <h3>Copy documentation</h3>
                <p>Every option includes the full error reference.</p>
              </div>
              <button className="x" onClick={() => setIsCopyModalOpen(false)}>✕</button>
            </div>
            <div className="opts" id="copyOpts">
              <div
                className="opt"
                onClick={() => copyWithFeedback('copy_all_docs', generateFullDoc(), 'Full documentation copied!')}
              >
                <div className="ob">ALL</div>
                <div className="oi">
                  <b>Copy all docs</b>
                  <span>Every language + reference + errors</span>
                </div>
              </div>

              {LANGS.map(l => (
                <div
                  key={l}
                  className="opt"
                  onClick={() => copyWithFeedback(`copy_${l}_docs`, generateFullDoc(l), `${SAMPLES[l].label} documentation copied!`)}
                >
                  <div className="ob">{SAMPLES[l].short}</div>
                  <div className="oi">
                    <b>Copy {SAMPLES[l].label} docs</b>
                    <span>{SAMPLES[l].name} + reference + errors</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Prompts Drawer */}
      {isDrawerOpen && (
        <div className="drawer open" id="drawer" onClick={(e) => { if (e.target === e.currentTarget) setIsDrawerOpen(false); }}>
          <div className="dp">
            <div className="dh">
              <div>
                <b>Built-in AI prompts</b>
                <span>Give one to any AI assistant and it integrates Hamro Pay for you</span>
              </div>
              <button className="x" onClick={() => setIsDrawerOpen(false)}>✕</button>
            </div>
            <div className="db">
              <p>
                Upload your project to <strong>Claude, ChatGPT, Cursor or any AI assistant</strong> with one of these prompts.
                It will read your code and add Hamro Pay with the right endpoints, validation and server-side verification.
                Replace <code>YOUR_HAMRO_API_KEY</code> with your real key first.
              </p>
              <div id="promptList">
                {LANGS.map(l => {
                  const s = SAMPLES[l];
                  const promptText = generatePromptFor(l);
                  return (
                    <div className="pc" key={l}>
                      <b>{s.label}</b>
                      <span>{s.name} + full API reference + error handling</span>
                      <div className="pv">{promptText.slice(0, 320)}…</div>
                      <div className="pa">
                        <button
                          className="btn primary"
                          onClick={() => copyWithFeedback(`prompt_${l}`, promptText, `${s.label} prompt copied!`)}
                        >
                          {copiedButtons[`prompt_${l}`] ? 'Copied' : 'Copy prompt'}
                        </button>
                        <button
                          className="btn"
                          onClick={() => downloadPrompt(`hamropay-${l}-integration-prompt.txt`, promptText)}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiDocsPage;
