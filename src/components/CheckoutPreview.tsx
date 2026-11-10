import React, { useState } from 'react';
import { BrandingObject } from '../services/customize.service';
import { Clock, Copy, Check, Smartphone, ShieldCheck, CheckCircle2, X } from 'lucide-react';

interface CheckoutPreviewProps {
  branding: BrandingObject;
  merchantName?: string;
  isTestMode?: boolean;
  className?: string;
}

export const CheckoutPreview: React.FC<CheckoutPreviewProps> = ({
  branding,
  merchantName = 'Demo Store',
  isTestMode = false,
  className = ''
}) => {
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset logo failure state if logo_url changes
  React.useEffect(() => {
    setLogoLoadFailed(false);
  }, [branding.logo_url]);

  const brandDisplayName = (branding.brand_name && branding.brand_name.trim()) 
    ? branding.brand_name.trim() 
    : merchantName;

  const firstLetter = brandDisplayName ? brandDisplayName.charAt(0).toUpperCase() : 'M';

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`hp-page w-full p-4 sm:p-6 flex flex-col items-center justify-center transition-colors duration-200 select-none ${className}`}
      data-mode={branding.mode || 'dark'}
      style={branding.vars as React.CSSProperties}
    >
      <div className="w-full max-w-[380px] flex flex-col items-center">
        {/* TIMER CARD */}
        <div className="hp-panel w-full flex items-center justify-between p-2.5 px-3.5 mb-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center hp-chip">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider hp-muted">
                Payment Session Expires In
              </div>
              <div className="text-sm font-black font-mono tracking-tight leading-none">
                07:59
              </div>
            </div>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full hp-badge-ok">
            Active
          </span>
        </div>

        {/* TEST MODE BANNER */}
        {isTestMode && (
          <div className="w-full mb-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 hp-badge-warn">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span>⚠️</span>
              <span>Test Simulator Mode</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wide">
              No Real Money
            </span>
          </div>
        )}

        {/* MAIN CHECKOUT CARD */}
        <div className="hp-card w-full p-5 relative overflow-hidden flex flex-col items-center text-center">
          {/* Header Brand */}
          <div className="flex flex-col items-center mb-3">
            {branding.logo_url && !logoLoadFailed ? (
              <img
                src={branding.logo_url}
                alt={brandDisplayName}
                className="max-h-10 object-contain mb-2"
                onError={() => setLogoLoadFailed(true)}
              />
            ) : (
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black shadow-md mb-2 hp-btn"
              >
                {firstLetter}
              </div>
            )}
            <h2 className="text-base font-extrabold tracking-tight truncate max-w-[280px]">
              {brandDisplayName}
            </h2>
            <div className="text-xs hp-muted font-medium mt-0.5">
              Order #1042
            </div>
          </div>

          {/* Amount Card */}
          <div className="hp-panel w-full py-3 px-4 mb-4 rounded-xl">
            <span className="text-[10px] uppercase font-extrabold tracking-wider block mb-0.5 hp-muted">
              Amount to Pay
            </span>
            <div className="text-2xl font-black font-mono tracking-tight">
              Rs 499.00
            </div>
          </div>

          {/* TEST MODE ACTIONS */}
          {isTestMode ? (
            <div className="w-full mb-3 space-y-2">
              <div className="text-[11px] font-semibold hp-muted">
                Simulate instant customer action:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  style={{ background: 'var(--hp-ok)', color: '#04130d' }}
                  className="py-2 px-1 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 cursor-default"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Success</span>
                </button>
                <button
                  type="button"
                  style={{ background: 'var(--hp-bad)', color: '#1a0508' }}
                  className="py-2 px-1 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 cursor-default"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Failed</span>
                </button>
                <button
                  type="button"
                  className="hp-btn-ghost py-2 px-1 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 cursor-default"
                >
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            /* LIVE MODE: QR & UPI */
            <div className="w-full flex flex-col items-center mb-4">
              {/* White QR Box (never tinted by theme) */}
              <div className="hp-qr-box mb-3 flex flex-col items-center justify-center">
                <svg
                  className="w-40 h-40"
                  viewBox="0 0 160 160"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="160" height="160" fill="white" />
                  {/* Outer corner squares */}
                  <rect x="14" y="14" width="38" height="38" rx="4" fill="black" />
                  <rect x="20" y="20" width="26" height="26" rx="2" fill="white" />
                  <rect x="25" y="25" width="16" height="16" fill="black" />

                  <rect x="108" y="14" width="38" height="38" rx="4" fill="black" />
                  <rect x="114" y="20" width="26" height="26" rx="2" fill="white" />
                  <rect x="119" y="25" width="16" height="16" fill="black" />

                  <rect x="14" y="108" width="38" height="38" rx="4" fill="black" />
                  <rect x="20" y="114" width="26" height="26" rx="2" fill="white" />
                  <rect x="25" y="119" width="16" height="16" fill="black" />

                  {/* QR pattern simulated dots */}
                  <rect x="62" y="20" width="8" height="8" fill="black" />
                  <rect x="76" y="20" width="8" height="8" fill="black" />
                  <rect x="90" y="20" width="8" height="8" fill="black" />

                  <rect x="62" y="34" width="8" height="8" fill="black" />
                  <rect x="76" y="48" width="8" height="8" fill="black" />
                  <rect x="62" y="62" width="14" height="14" fill="black" />

                  <rect x="90" y="62" width="14" height="14" fill="black" />
                  <rect x="114" y="62" width="8" height="8" fill="black" />
                  <rect x="132" y="62" width="14" height="8" fill="black" />

                  <rect x="20" y="62" width="8" height="8" fill="black" />
                  <rect x="34" y="62" width="8" height="8" fill="black" />
                  <rect x="20" y="76" width="22" height="8" fill="black" />

                  <rect x="62" y="90" width="8" height="8" fill="black" />
                  <rect x="76" y="90" width="14" height="8" fill="black" />
                  <rect x="108" y="90" width="8" height="8" fill="black" />
                  <rect x="126" y="90" width="14" height="14" fill="black" />

                  <rect x="62" y="114" width="14" height="14" fill="black" />
                  <rect x="90" y="114" width="8" height="8" fill="black" />
                  <rect x="114" y="114" width="14" height="8" fill="black" />
                  <rect x="76" y="132" width="22" height="14" fill="black" />
                  <rect x="114" y="132" width="8" height="14" fill="black" />
                </svg>
              </div>

              {/* UPI ID Row */}
              <div className="hp-panel w-full p-2.5 px-3 flex items-center justify-between gap-2 mb-3">
                <div className="min-w-0 text-left">
                  <span className="text-[9px] uppercase font-bold hp-muted tracking-wider block">
                    Merchant UPI ID
                  </span>
                  <span className="font-mono text-xs font-bold truncate block">
                    shop@fam
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg hp-btn-ghost flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 hp-accent" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Primary Button */}
              <button
                type="button"
                className="hp-btn w-full py-3 px-4 text-xs font-black tracking-wide flex items-center justify-center gap-2 mb-2 cursor-default"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay via UPI App</span>
              </button>

              {/* Status pulse */}
              <div className="flex items-center justify-center gap-2 py-1 text-xs font-bold hp-muted">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--hp-ok)' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--hp-ok)' }} />
                </span>
                <span>Waiting for your payment...</span>
              </div>
            </div>
          )}

          {/* Secondary Ghost Button */}
          <button
            type="button"
            className="hp-btn-ghost w-full py-2 px-3 text-[11px] font-bold cursor-default"
          >
            Cancel payment
          </button>
        </div>

        {/* FOOTER */}
        <div className="w-full mt-3 text-center space-y-1">
          {branding.footer && branding.footer.trim() && (
            <div className="text-[11px] hp-muted font-medium break-words px-2">
              {branding.footer.trim()}
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5 text-[10px] hp-muted font-bold tracking-wider">
            <ShieldCheck className="w-3 h-3 opacity-70" />
            <span>Powered by {branding.powered_by || 'Hamro Pay'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
