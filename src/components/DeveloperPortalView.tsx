import { useState, useEffect } from 'react';
import { 
  Code, Key, Copy, Check, RefreshCw, Eye, EyeOff, 
  Terminal, ArrowRight, ShieldCheck, Globe, CheckCircle2 
} from 'lucide-react';
import { getTokenInfo, regenerateKey, setMode } from '../services/developer.service';

interface DeveloperPortalViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function DeveloperPortalView({ showToast }: DeveloperPortalViewProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'status' | 'verify'>('create');
  const [currentMode, setCurrentMode] = useState<'live' | 'test'>('live');

  // Load API key from merchant object in localStorage
  const getStoredApiKey = () => {
    try {
      const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      return merchant.api_key || '';
    } catch {
      return '';
    }
  };

  const [apiKey, setApiKey] = useState(getStoredApiKey);

  // Sync token info from backend API on mount
  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        const info = await getTokenInfo();
        if (info?.api_key) {
          setApiKey(info.api_key);
          const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
          merchant.api_key = info.api_key;
          localStorage.setItem('hamropay_merchant', JSON.stringify(merchant));
        }
      } catch {
        // Fallback gracefully to locally stored merchant key
      }
    };
    fetchTokenInfo();
  }, []);

  const API_URL = (import.meta as any).env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

  const handleCopyKey = () => {
    if (!apiKey) {
      showToast('No API key found in merchant profile.', 'error');
      return;
    }
    navigator.clipboard?.writeText(apiKey).then(() => {
      setCopiedKey(true);
      showToast('Hamro API Key copied to clipboard.', 'success');
      setTimeout(() => setCopiedKey(false), 2000);
    }).catch(() => {
      showToast('Failed to copy API key.', 'error');
    });
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('Are you sure you want to regenerate your Hamro API Key? Existing integrations will stop working until updated.')) {
      return;
    }
    setRegenerating(true);
    try {
      const newData = await regenerateKey();
      const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      merchant.api_key = newData.api_key;
      localStorage.setItem('hamropay_merchant', JSON.stringify(merchant));
      setApiKey(newData.api_key);
      showToast('Hamro API Key regenerated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate API Key.', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggleMode = async (mode: 'live' | 'test') => {
    setCurrentMode(mode);
    try {
      await setMode(mode);
      showToast(`Developer mode switched to ${mode.toUpperCase()}.`, 'info');
    } catch {
      showToast(`Mode updated locally to ${mode.toUpperCase()}.`, 'info');
    }
  };

  const copySnippet = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      showToast('Code snippet copied.', 'success');
    });
  };

  const orderCreateCurl = `curl -X POST "${API_URL}/order/create" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{
    "amount": 100,
    "customer_name": "John",
    "customer_email": "john@email.com"
  }'`;

  const orderStatusCurl = `curl -X GET "${API_URL}/order/status/ORD_xxx" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}"`;

  const orderVerifyCurl = `curl -X POST "${API_URL}/order/verify" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{
    "order_id": "ORD_xxx",
    "utr": "623851978381"
  }'`;

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-teal-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <Code className="w-5 h-5 stroke-[2.5]" />
            </span>
            Hamro API & Developer Portal
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Integrate programmatic FamPay UPI collections, webhook notifications, and automated order verification.
          </p>
        </div>

        {/* Live / Sandbox Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => handleToggleMode('live')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentMode === 'live' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Mode
          </button>
          <button
            onClick={() => handleToggleMode('test')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentMode === 'test' 
                ? 'bg-teal-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Test Sandbox
          </button>
        </div>
      </header>

      {/* API Key Primary Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Key className="w-4 h-4" />
              </div>
              <span className="text-xs font-black tracking-wider uppercase text-slate-300">
                Hamro API Key
              </span>
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                x-api-key
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Authenticate requests by including this key in the <code className="text-teal-300 font-mono">x-api-key</code> HTTP header.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>{regenerating ? 'Regenerating...' : 'Regenerate Key'}</span>
            </button>
          </div>
        </div>

        {/* Key Display Bar */}
        <div className="pt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 flex items-center justify-between bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs">
            <span className="text-teal-300 font-bold tracking-wider select-all truncate mr-3">
              {apiKey ? (showKey ? apiKey : `${apiKey.slice(0, 8)}••••••••••••••••••••••••••••••`) : 'No API key available'}
            </span>
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-slate-400 hover:text-white p-1 transition"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleCopyKey}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-md shadow-teal-600/20"
          >
            {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey ? 'Key Copied' : 'Copy Hamro API Key'}</span>
          </button>
        </div>
      </div>

      {/* Backend API Endpoints & Interactive Documentation */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Terminal className="w-4 h-4 text-teal-600" />
              API Endpoints & Integration Guide
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Production Gateway: <code className="text-teal-700 font-mono font-bold">{API_URL}</code>
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'create' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              1. Create Order
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'status' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              2. Check Status
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'verify' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              3. Verify Payment
            </button>
          </div>
        </div>

        {/* Tab 1: Create Order */}
        {activeTab === 'create' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  POST
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {API_URL}/order/create
                </span>
              </div>
              <button
                onClick={() => copySnippet(orderCreateCurl)}
                className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy cURL</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner">
              <pre>{orderCreateCurl}</pre>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-700 mb-1.5">Required Headers:</div>
                <div className="font-mono text-[11px] text-slate-600 space-y-1">
                  <div><strong className="text-teal-700">x-api-key:</strong> Your merchant secret API key</div>
                  <div><strong className="text-teal-700">Content-Type:</strong> application/json</div>
                </div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-700 mb-1.5">Expected Response:</div>
                <div className="font-mono text-[11px] text-slate-600">
                  {`{ "order_id": "ORD_xxx", "amount": 100, "upi_id": "9769516928@fam", "payment_url": "https://hamro-pay-kilj.vercel.app/pay/ORD_xxx" }`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Check Status */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider">
                  GET
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {API_URL}/order/status/:order_id
                </span>
              </div>
              <button
                onClick={() => copySnippet(orderStatusCurl)}
                className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy cURL</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner">
              <pre>{orderStatusCurl}</pre>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
              <div className="font-bold text-slate-700 mb-1.5">Headers:</div>
              <div className="font-mono text-[11px] text-slate-600 mb-2">
                {`{ "x-api-key": "${apiKey || 'YOUR_API_KEY'}" }`}
              </div>
              <p className="text-slate-500 mb-2">
                Query this endpoint to verify whether the customer completed UPI payment via FamPay and the UTR was verified.
              </p>
              <div className="font-mono text-[11px] text-slate-600">
                {`{ "success": true, "data": { "order_id": "ORD_xxx", "status": "success", "amount": 100, "utr": "623851978381" } }`}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Verify Payment */}
        {activeTab === 'verify' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">
                  POST
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {API_URL}/order/verify
                </span>
              </div>
              <button
                onClick={() => copySnippet(orderVerifyCurl)}
                className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy cURL</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner">
              <pre>{orderVerifyCurl}</pre>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-700 mb-1.5">Required Headers:</div>
                <div className="font-mono text-[11px] text-slate-600 space-y-1">
                  <div><strong className="text-teal-700">x-api-key:</strong> Your merchant secret API key</div>
                  <div><strong className="text-teal-700">Content-Type:</strong> application/json</div>
                </div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-700 mb-1.5">Direct UTR Verification:</div>
                <p className="text-slate-500 leading-relaxed">
                  Submits the 12-digit UPI Transaction Reference (UTR) for immediate automated verification.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Integration Benefits / Safety card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs font-black text-slate-800">Direct FamPay Routing</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Zero intermediary gateways. Customers pay directly to merchant VPA via standard UPI.
          </p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Globe className="w-4 h-4" />
          </div>
          <div className="text-xs font-black text-slate-800">RESTful JSON Protocol</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Easy to implement in Node.js, Python, PHP, or frontend React apps using standard fetch requests.
          </p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-black text-slate-800">Instant Settlement</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Verified payments reflect immediately in your Hamro Cash wallet balance.
          </p>
        </div>
      </div>
    </div>
  );
}
