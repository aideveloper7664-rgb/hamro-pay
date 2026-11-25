import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Lock, ShieldCheck, X } from 'lucide-react';

/**
 * UI-only animation building blocks for the customer pay pages.
 * Everything here uses the merchant theme variables (--hp-*) with fallbacks,
 * so it follows each merchant's branding. No API / business logic lives here.
 */

export const PayAnimStyles: React.FC = () => (
  <style>{`
    @keyframes hpa-sheet-in { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes hpa-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes hpa-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes hpa-pop { 0% { transform: scale(.82); opacity: 0; } 60% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); } }
    @keyframes hpa-icon-pop { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
    @keyframes hpa-spin { to { transform: rotate(360deg); } }
    @keyframes hpa-spin-rev { to { transform: rotate(-360deg); } }
    @keyframes hpa-pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
    @keyframes hpa-scan { 0% { top: 6%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 94%; opacity: 0; } }
    @keyframes hpa-ripple { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.2); opacity: 0; } }
    @keyframes hpa-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
    @keyframes hpa-dot { 0%,80%,100% { transform: translateY(0); opacity: .4; } 40% { transform: translateY(-4px); opacity: 1; } }
    @keyframes hpa-drain { from { width: 100%; } to { width: 0%; } }
    @keyframes hpa-fill { from { width: 0%; } to { width: 100%; } }
    @keyframes hpa-draw { to { stroke-dashoffset: 0; } }
    @keyframes hpa-confetti { 0% { transform: translate(0,0) rotate(0); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; } }
    @keyframes hpa-sheetup { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes hpa-tick { 0% { transform: scale(1); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
    @keyframes hpa-hurry { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }

    .hpa-bsheet { animation: hpa-sheetup .5s cubic-bezier(.22,1,.36,1) both; }
    .hpa-sheet { animation: hpa-sheet-in .45s cubic-bezier(.22,1,.36,1) both; }
    .hpa-stagger > * { animation: hpa-fade-up .45s cubic-bezier(.22,1,.36,1) both; }
    .hpa-stagger > *:nth-child(1) { animation-delay: .04s; }
    .hpa-stagger > *:nth-child(2) { animation-delay: .10s; }
    .hpa-stagger > *:nth-child(3) { animation-delay: .16s; }
    .hpa-stagger > *:nth-child(4) { animation-delay: .22s; }
    .hpa-stagger > *:nth-child(5) { animation-delay: .28s; }
    .hpa-stagger > *:nth-child(6) { animation-delay: .34s; }
    .hpa-stagger > *:nth-child(7) { animation-delay: .40s; }
    .hpa-fade-in { animation: hpa-fade-in .3s ease both; }
    .hpa-pop { animation: hpa-pop .38s cubic-bezier(.22,1,.36,1) both; }
    .hpa-shake { animation: hpa-shake .5s ease; }
    .hpa-press { transition: transform .15s ease; }
    .hpa-press:active { transform: scale(.96); }
    .hpa-hurry { animation: hpa-hurry 1s ease-in-out infinite; }
    .hpa-backdrop { background: rgba(0,0,0,.72); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: hpa-fade-in .25s ease both; }

    .hpa-qr-frame { position: relative; display: inline-block; }
    .hpa-qr-frame .hpa-corner { position: absolute; width: 22px; height: 22px; border: 3px solid var(--hp-accent, #ff1e4b); pointer-events: none; }
    .hpa-corner.tl { top: -6px; left: -6px; border-right: 0; border-bottom: 0; border-top-left-radius: 8px; }
    .hpa-corner.tr { top: -6px; right: -6px; border-left: 0; border-bottom: 0; border-top-right-radius: 8px; }
    .hpa-corner.bl { bottom: -6px; left: -6px; border-right: 0; border-top: 0; border-bottom-left-radius: 8px; }
    .hpa-corner.br { bottom: -6px; right: -6px; border-left: 0; border-top: 0; border-bottom-right-radius: 8px; }
    .hpa-scanline { position: absolute; left: 12px; right: 12px; height: 2px; border-radius: 2px; pointer-events: none;
      background: linear-gradient(90deg, transparent, var(--hp-accent, #ff1e4b), transparent);
      box-shadow: 0 0 10px var(--hp-accent, #ff1e4b); animation: hpa-scan 2.5s ease-in-out infinite; }

    .hpa-ring { border-radius: 9999px; border: 3px solid transparent; position: absolute; inset: 0; }
    .hpa-ring.outer { border-top-color: var(--hp-accent, #ff1e4b); border-right-color: color-mix(in srgb, var(--hp-accent, #ff1e4b) 40%, transparent); animation: hpa-spin 3s linear infinite; }
    .hpa-ring.inner { inset: 14px; border-bottom-color: var(--hp-accent, #ff1e4b); border-left-color: color-mix(in srgb, var(--hp-accent, #ff1e4b) 40%, transparent); animation: hpa-spin-rev 1.6s linear infinite; }
    .hpa-ring.core { inset: 28px; border: 4px solid var(--hp-accent, #ff1e4b); border-right-color: transparent; border-bottom-color: transparent; animation: hpa-spin 1s linear infinite; }

    .hpa-dots span { display: inline-block; width: 5px; height: 5px; margin: 0 2px; border-radius: 9999px; background: currentColor; animation: hpa-dot 1.2s ease-in-out infinite; }
    .hpa-dots span:nth-child(2) { animation-delay: .15s; }
    .hpa-dots span:nth-child(3) { animation-delay: .3s; }

    .hpa-check-path { stroke-dasharray: 40; stroke-dashoffset: 40; animation: hpa-draw .6s .25s ease forwards; }
    .hpa-confetti i { position: absolute; left: 50%; top: 40px; width: 7px; height: 11px; border-radius: 2px; animation: hpa-confetti 1.3s ease-out forwards; }

    @media (prefers-reduced-motion: reduce) {
      .hpa-sheet, .hpa-stagger > *, .hpa-pop, .hpa-hurry, .hpa-scanline, .hpa-ring, .hpa-dots span, .hpa-confetti i { animation: none !important; }
      .hpa-check-path { stroke-dashoffset: 0; animation: none !important; }
    }
  `}</style>
);

/* ---------- Loading screen ---------- */
export const VerifyingLoader: React.FC<{ text?: string }> = ({ text = 'Verifying transaction…' }) => (
  <div className="hp-card w-full py-14 px-6 flex flex-col items-center justify-center text-center hpa-fade-in">
    <div className="relative w-14 h-14 mb-5">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: '3px solid color-mix(in srgb, var(--hp-accent, #ff1e4b) 18%, transparent)',
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: '3px solid transparent',
          borderTopColor: 'var(--hp-accent, #ff1e4b)',
          animation: 'hpa-spin 1s linear infinite',
        }}
      />
    </div>
    <div className="text-sm font-bold" style={{ color: 'var(--hp-accent, #ff1e4b)', animation: 'hpa-pulse 1.6s ease-in-out infinite' }}>
      {text}
    </div>
  </div>
);

/* ---------- Amount that counts up once ---------- */
export const AnimatedAmount: React.FC<{ value: string; duration?: number }> = ({ value, duration = 700 }) => {
  const target = parseFloat(value) || 0;
  const [shown, setShown] = useState<number>(0);
  const doneFor = useRef<number | null>(null);

  useEffect(() => {
    if (doneFor.current === target) {
      setShown(target);
      return;
    }
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || target === 0) {
      setShown(target);
      doneFor.current = target;
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else doneFor.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <>₹{shown.toFixed(2)}</>;
};

/* ---------- QR with corner brackets and scanning line ---------- */
export const QrScanFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="hpa-qr-frame hpa-pop">
    <span className="hpa-corner tl" />
    <span className="hpa-corner tr" />
    <span className="hpa-corner bl" />
    <span className="hpa-corner br" />
    {children}
    <span className="hpa-scanline" />
  </div>
);

/* ---------- Trust row ---------- */
export const TrustRow: React.FC = () => (
  <div className="w-full flex items-center justify-center gap-3 text-[10px] font-bold hp-muted pt-2">
    <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" style={{ color: 'var(--hp-ok)' }} />SSL Secured</span>
    <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" style={{ color: 'var(--hp-warn)' }} />256-bit Encrypted</span>
    <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" style={{ color: 'var(--hp-accent, #ff1e4b)' }} />UPI Verified</span>
  </div>
);

/* ---------- Modals ---------- */
interface ModalShellProps {
  onClose?: () => void;
  children: React.ReactNode;
}
const ModalShell: React.FC<ModalShellProps> = ({ onClose, children }) => (
  <div
    className="hpa-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
  >
    <div
      className="hpa-pop w-full max-w-[320px] rounded-2xl p-6 text-center shadow-2xl"
      style={{ background: '#ffffff', color: '#1f2937' }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

export const InvalidUtrModal: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <ModalShell onClose={onRetry}>
    <div
      className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-white"
      style={{ background: '#ef4444', animation: 'hpa-shake .5s .25s ease' }}
    >
      <X className="w-7 h-7 stroke-[3]" />
    </div>
    <div className="text-lg font-black mb-1">Invalid UTR</div>
    <p className="text-sm mb-5" style={{ color: '#6b7280' }}>{message || 'Please enter a valid UTR number.'}</p>
    <button
      type="button"
      onClick={onRetry}
      className="hpa-press w-full py-2.5 rounded-lg text-sm font-bold text-white cursor-pointer"
      style={{ background: '#3b82f6' }}
      autoFocus
    >
      Retry
    </button>
  </ModalShell>
);

/* ---------- Bottom-sheet shell ---------- */
const BottomSheet: React.FC<{ onClose?: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div
    className="hpa-backdrop fixed inset-0 z-[60] flex items-end justify-center"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
  >
    <div
      className="hpa-bsheet w-full max-w-[440px] rounded-t-[26px] px-5 pt-2 pb-6 text-center"
      style={{
        background: 'var(--hp-surface, #12090f)',
        color: 'var(--hp-text, #fff2f4)',
        borderTop: '1px solid color-mix(in srgb, var(--hp-accent, #ff1e4b) 35%, transparent)',
        maxHeight: '92vh',
        overflowY: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto mb-3 mt-1 h-1 w-10 rounded-full" style={{ background: 'rgba(255,255,255,.18)' }} />
      {children}
    </div>
  </div>
);

export const ConfirmCancelModal: React.FC<{ onNo: () => void; onYes: () => void }> = ({ onNo, onYes }) => (
  <BottomSheet onClose={onNo}>
    <div
      className="hpa-pop mx-auto mb-3 flex h-[60px] w-[60px] items-center justify-center rounded-full"
      style={{ background: 'rgba(251,191,36,.14)', border: '1px solid rgba(251,191,36,.4)', color: '#fbbf24' }}
    >
      <AlertTriangle className="w-7 h-7 stroke-[2.4]" />
    </div>
    <div className="text-lg font-black">Cancel this payment?</div>
    <p className="text-xs hp-muted mt-1 leading-relaxed">
      If you have already sent money, keep your bank UTR and contact the merchant.
    </p>
    <div className="flex gap-2.5 mt-5">
      <button type="button" onClick={onNo} className="hp-btn-ghost hpa-press flex-1 py-3 text-sm font-extrabold cursor-pointer">
        Keep Paying
      </button>
      <button type="button" onClick={onYes} className="hp-btn hpa-press flex-1 py-3 text-sm font-extrabold cursor-pointer">
        Yes, Cancel
      </button>
    </div>
  </BottomSheet>
);

/* ---------- Processing sheet (verify / cancel) ---------- */
export const ProcessingSheet: React.FC<{ mode: 'verify' | 'cancel' }> = ({ mode }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 600);
    const t2 = setTimeout(() => setStep(2), 1400);
    const t3 = setTimeout(() => setStep(3), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  const steps = [
    { label: 'Encrypting', Icon: Lock },
    { label: 'Verifying', Icon: ShieldCheck },
    { label: 'Confirming', Icon: CheckCircle2 },
  ];
  return (
    <BottomSheet>
      <div className="relative mx-auto mb-3 mt-1 h-[88px] w-[88px]">
        <div className="hpa-ring outer" />
        <div className="hpa-ring inner" />
        <div className="hpa-ring core" />
      </div>
      <div className="text-lg font-black">{mode === 'cancel' ? 'Cancelling Payment' : 'Securing Payment'}</div>
      <p className="text-xs hp-muted mt-1">
        {mode === 'cancel' ? 'Processing your cancellation request' : 'Please wait while we verify your transaction'}
      </p>
      <div className="mt-6 grid grid-cols-3 gap-2.5">
        {steps.map(({ label, Icon }, i) => {
          const active = step > i;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <Icon
                className="w-[18px] h-[18px] transition-all duration-500"
                style={{
                  color: active ? 'var(--hp-accent, #ff1e4b)' : 'var(--hp-muted, #6f5c62)',
                  filter: active ? 'drop-shadow(0 0 7px var(--hp-accent, #ff1e4b))' : 'none',
                  opacity: active ? 1 : 0.55,
                  animation: active ? 'hpa-tick .4s' : 'none',
                }}
              />
              <span className="text-[10.5px] font-bold hp-muted" style={{ opacity: active ? 1 : 0.55 }}>{label}</span>
              <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, var(--hp-accent, #ff1e4b) 15%, transparent)' }}>
                <div className="h-full rounded-full" style={{ background: 'var(--hp-accent, #ff1e4b)', width: active ? '100%' : '0%', transition: 'width .8s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 text-[11.5px] font-bold hp-muted">
        Finalizing payment <span className="hpa-dots"><span /><span /><span /></span>
      </div>
    </BottomSheet>
  );
};

/* ---------- Cancelling screen ---------- */
export const CancellingScreen: React.FC<{ bare?: boolean }> = ({ bare }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 700);
    const t2 = setTimeout(() => setStep(2), 1500);
    const t3 = setTimeout(() => setStep(3), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const steps = [
    { label: 'Encrypting', Icon: Lock },
    { label: 'Verifying', Icon: ShieldCheck },
    { label: 'Confirming', Icon: CheckCircle2 },
  ];

  return (
    <div className={`${bare ? '' : 'hp-card p-6'} w-full flex flex-col items-center text-center hpa-fade-in`}>
      <div className="relative w-24 h-24 my-3">
        <div className="hpa-ring outer" />
        <div className="hpa-ring inner" />
        <div className="hpa-ring core" />
      </div>
      <h2 className="text-lg font-black mt-3" style={{ color: 'var(--hp-accent, #ff1e4b)' }}>Cancelling Payment</h2>
      <p className="text-xs hp-muted mt-1">Processing your cancellation request</p>

      <div className="grid grid-cols-3 gap-2 w-full mt-6">
        {steps.map(({ label, Icon }, i) => {
          const active = step > i;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <Icon
                className="w-4 h-4 transition-all duration-500"
                style={{
                  color: active ? 'var(--hp-accent, #ff1e4b)' : 'var(--hp-muted, #64748b)',
                  filter: active ? 'drop-shadow(0 0 6px var(--hp-accent, #ff1e4b))' : 'none',
                  opacity: active ? 1 : 0.5,
                }}
              />
              <span className="text-[10px] font-semibold hp-muted" style={{ opacity: active ? 1 : 0.5 }}>{label}</span>
              <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--hp-accent, #ff1e4b) 15%, transparent)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    background: 'var(--hp-accent, #ff1e4b)',
                    width: active ? '100%' : '0%',
                    transition: 'width .7s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] hp-muted mt-5 font-semibold">
        Finalizing payment <span className="hpa-dots"><span /><span /><span /></span>
      </div>
    </div>
  );
};

/* ---------- Result (failed / success) receipt panel ---------- */
interface ResultRow { label: string; value: string; mono?: boolean; accent?: boolean }

const CONFETTI_COLORS = ['#ff1e4b', '#ff7a18', '#22c55e', '#3b82f6', '#fbbf24', '#a855f7'];

export const ResultPanel: React.FC<{
  kind: 'failed' | 'success';
  title: string;
  subtitle?: string;
  rows: ResultRow[];
  children?: React.ReactNode;
  bare?: boolean;
  merchant?: string;
  amount?: string;
  chipText?: string;
}> = ({ kind, title, subtitle, rows, children, bare, merchant, amount, chipText }) => {
  const ok = kind === 'success';
  const color = ok ? '#12c97d' : '#ff4c68';
  const confetti = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      dx: `${Math.round((Math.random() - 0.5) * 300)}px`,
      dy: `${Math.round(30 + Math.random() * 170)}px`,
      rot: `${Math.round(Math.random() * 540 - 270)}deg`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: `${(Math.random() * 0.15).toFixed(2)}s`,
    }))
  ).current;

  const receiptText = () =>
    [
      'HamroPay Receipt',
      '----------------',
      merchant ? `Merchant: ${merchant}` : '',
      amount ? `Amount: ${amount}` : '',
      `Status: ${ok ? 'Paid' : 'Failed'}`,
      ...rows.map((r) => `${r.label}: ${r.value}`),
      `Date: ${new Date().toLocaleString()}`,
    ].filter(Boolean).join('\n');

  const [note, setNote] = useState('');
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(''), 1600); };
  const share = async () => {
    const text = receiptText();
    try {
      if ((navigator as any).share) { await (navigator as any).share({ text }); return; }
      await navigator.clipboard.writeText(text);
      flash('Receipt copied');
    } catch { /* ignore */ }
  };
  const download = () => {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([receiptText()], { type: 'text/plain' }));
      a.download = 'hamropay-receipt.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      flash('Receipt downloaded');
    } catch { /* ignore */ }
  };

  return (
    <div className={`${bare ? '' : 'hp-card'} w-full text-center relative overflow-hidden hpa-sheet`}>
      <div
        className="relative px-5 pt-6 pb-9 overflow-hidden"
        style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${color} 24%, transparent), transparent)` }}
      >
        {ok && (
          <div className="hpa-confetti pointer-events-none absolute inset-0" aria-hidden>
            {confetti.map((c, i) => (
              <i key={i} style={{ background: c.color, animationDelay: c.delay, ['--dx' as any]: c.dx, ['--dy' as any]: c.dy, ['--rot' as any]: c.rot }} />
            ))}
          </div>
        )}
        <div className="relative w-[68px] h-[68px] mx-auto mb-3">
          <span className="absolute inset-0 rounded-full" style={{ background: color, animation: 'hpa-ripple 1.2s .3s ease-out 2 both' }} />
          <div
            className="relative w-[68px] h-[68px] rounded-full flex items-center justify-center text-white"
            style={{ background: color, animation: 'hpa-icon-pop .55s cubic-bezier(.22,1,.36,1) both' }}
          >
            {ok ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path className="hpa-check-path" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <X className="w-8 h-8 stroke-[3]" />
            )}
          </div>
        </div>
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs hp-muted mt-1 leading-relaxed px-2">{subtitle}</p>}
      </div>

      <div className="hp-panel relative mx-4 -mt-5 text-left" style={{ borderRadius: 18 }}>
        {(merchant || amount) && (
          <div className="relative px-4 pt-4 pb-3.5 text-center" style={{ borderBottom: '2px dashed rgba(255,255,255,.1)' }}>
            <span className="absolute -bottom-[9px] -left-[9px] h-4 w-4 rounded-full" style={{ background: 'var(--hp-surface, #12090f)' }} />
            <span className="absolute -bottom-[9px] -right-[9px] h-4 w-4 rounded-full" style={{ background: 'var(--hp-surface, #12090f)' }} />
            {merchant && <div className="text-xs font-bold hp-muted">{merchant}</div>}
            {amount && <div className="text-3xl font-black mt-0.5 mb-2">{amount}</div>}
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold"
              style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)` }}
            >
              {ok ? '✓ ' : '✕ '}{chipText || (ok ? 'Paid' : 'Failed')}
            </span>
          </div>
        )}
        {rows.length > 0 && (
          <div className="px-4 py-3 space-y-1 hpa-stagger">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 py-1 text-[11.5px]">
                <span className="hp-muted font-semibold shrink-0">{r.label}</span>
                <span
                  className={`font-bold text-right break-all max-w-[200px] ${r.mono ? 'font-mono' : ''}`}
                  style={r.accent ? { color: 'var(--hp-accent, #ff1e4b)' } : undefined}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 px-4 pb-4 pt-1">
          <button type="button" onClick={share} className="hp-btn-ghost hpa-press flex-1 py-2 text-[11.5px] font-bold cursor-pointer">Share</button>
          <button type="button" onClick={download} className="hp-btn-ghost hpa-press flex-1 py-2 text-[11.5px] font-bold cursor-pointer">Download</button>
        </div>
        {note && <div className="pb-3 text-center text-[11px] font-bold" style={{ color: 'var(--hp-ok, #34d399)' }}>{note}</div>}
      </div>

      <div className="px-4 pb-5">{children}</div>
    </div>
  );
};

/* ---------- Auto-redirect countdown with draining bar ---------- */
export const RedirectCountdown: React.FC<{ seconds?: number; onDone: () => void; label?: string }> = ({
  seconds = 4,
  onDone,
  label = 'Redirecting in',
}) => {
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (left <= 0) {
      doneRef.current();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <div className="mt-4">
      <div className="text-xs font-semibold hp-muted">
        {label} <span className="font-mono font-black" style={{ color: 'var(--hp-accent, #ff1e4b)' }}>{Math.max(left, 0)}</span> second{left === 1 ? '' : 's'}…
      </div>
      <div className="w-full h-[3px] rounded-full overflow-hidden mt-2" style={{ background: 'color-mix(in srgb, var(--hp-accent, #ff1e4b) 15%, transparent)' }}>
        <div
          className="h-full rounded-full"
          style={{ background: 'var(--hp-accent, #ff1e4b)', animation: `hpa-drain ${seconds}s linear forwards` }}
        />
      </div>
    </div>
  );
};
