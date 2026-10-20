import { useState, useRef } from 'react';
import { PanelLeft, ExternalLink, RefreshCw, Loader2, ArrowLeft, BookOpen, ShieldCheck } from 'lucide-react';

interface ApiIntegrationViewProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
}

const DOCS_URL = 'https://hamropay-backends.onrender.com/docs';

export default function ApiIntegrationView({
  showToast,
  onOpenSidebar,
  onViewChange
}: ApiIntegrationViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
    showToast?.('Reloading API documentation...', 'info');
  };

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(DOCS_URL).then(() => {
      showToast?.('Docs URL copied to clipboard!', 'success');
    }).catch(() => {
      showToast?.(DOCS_URL, 'info');
    });
  };

  return (
    <div className="min-h-screen text-[#fff2f4] flex flex-col bg-[#070102]">
      {/* Top Header Bar */}
      <header className="topbar">
        <div className="topbar-left flex items-center gap-2">
          <button 
            className="w-9 h-9 rounded-[11px] bg-[#1a050a] border border-[#831f33] flex items-center justify-center text-[#ff8ca3] hover:text-white hover:border-[#ff2d55] hover:bg-[#280810] transition-all cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.15)] active:scale-95" 
            aria-label="Open navigation menu" 
            onClick={onOpenSidebar} 
            title="Toggle Menu"
          >
            <PanelLeft className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>

          <button
            onClick={() => onViewChange?.('developer')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#b89fa5] hover:text-white transition-all cursor-pointer"
            title="Back to Hamro API Key Management"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Hamro API</span>
          </button>
        </div>

        <div className="topbar-center font-extrabold text-sm tracking-tight text-[#fff2f4] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#ff2d55]" />
          <span>API Integration Docs</span>
        </div>

        <div className="topbar-right flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-[11px] bg-[#1a050a] border border-[#831f33] flex items-center justify-center text-[#ff8ca3] hover:text-white hover:border-[#ff2d55] hover:bg-[#280810] transition-all cursor-pointer active:scale-95"
            title="Reload Documentation"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2.2] ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#b80028] text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-[0_4px_14px_rgba(255,30,75,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            title="Open Docs in New Tab"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-3 sm:p-5 flex flex-col gap-3 max-w-[1600px] w-full mx-auto">
        {/* Quick Information Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[rgba(28,7,12,0.95)] via-[rgba(20,5,10,0.95)] to-[rgba(14,3,7,0.98)] border border-[rgba(255,45,85,0.2)] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(255,45,85,0.12)] border border-[rgba(255,45,85,0.25)] text-[#ff4d6d] flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-[#fff2f4] tracking-tight">
                  Hamro Pay Developer API Docs
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                  Live v1
                </span>
              </div>
              <p className="text-xs text-[#b89fa5] mt-0.5">
                Official guide for order creation, payments auto-detection, webhooks &amp; SDK integration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyUrl}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#fff2f4] transition-all cursor-pointer text-center"
            >
              Copy Docs URL
            </button>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-[#fff2f4] inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Full Screen</span>
              <ExternalLink className="w-3 h-3 text-[#ff8ca3]" />
            </a>
          </div>
        </div>

        {/* Embedded Iframe Container */}
        <div className="flex-1 min-h-[650px] relative rounded-2xl overflow-hidden border border-[rgba(255,45,85,0.22)] bg-[#09040a] shadow-2xl flex flex-col">
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-[#09040a]/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#ff1e4b]/20 border border-[#ff1e4b]/40 flex items-center justify-center text-[#ff4d6d]">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <p className="text-xs font-bold text-[#b89fa5] animate-pulse">
                Loading Hamro Pay Developer Documentation...
              </p>
            </div>
          )}

          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={DOCS_URL}
            title="Hamro Pay Developer Documentation"
            className="w-full flex-1 border-0 min-h-[650px]"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Footer Note */}
        <div className="text-center py-1 text-[11px] text-[#83686e] flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2bf29a]" />
          <span>Official Developer Docs hosted at {DOCS_URL}</span>
        </div>
      </div>
    </div>
  );
}
