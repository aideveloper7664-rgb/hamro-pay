import { Lock, PanelLeft, Zap } from 'lucide-react';

interface UpgradeRequiredViewProps {
  title?: string;
  message?: string;
  requiredPlanName?: string;
  currentPlanName?: string;
  pageTitle?: string;
  onUpgrade: () => void;
  onBackToDashboard?: () => void;
  onOpenSidebar?: () => void;
}

export default function UpgradeRequiredView({
  title = 'Upgrade required',
  message = 'Developer Portal & API docs are available from the BASIC plan',
  requiredPlanName = 'BASIC',
  currentPlanName,
  pageTitle = 'Upgrade Required',
  onUpgrade,
  onBackToDashboard,
  onOpenSidebar,
}: UpgradeRequiredViewProps) {
  return (
    <div className="min-h-screen text-[#fff2f4] flex flex-col">
      {onOpenSidebar && (
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="w-9 h-9 rounded-[11px] bg-[#1a050a] border border-[#831f33] flex items-center justify-center text-[#ff8ca3] hover:text-white hover:border-[#ff2d55] hover:bg-[#280810] transition-all cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.15)] active:scale-95"
              aria-label="Open navigation menu"
              onClick={onOpenSidebar}
              title="Toggle Menu"
            >
              <PanelLeft className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>
          </div>
          <div className="topbar-center">{pageTitle}</div>
          <div className="topbar-right" />
        </header>
      )}

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-[#120306] border border-[rgba(255,45,85,0.28)] p-7 text-center space-y-5 shadow-2xl animate-[fadeInUp_0.25s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(255,30,75,0.12)] border border-[rgba(255,45,85,0.32)] text-[#ff4d6d] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-white tracking-tight">{title}</h1>
            <p className="text-xs text-[#d4c2c7] leading-relaxed">
              {message}
            </p>
            {currentPlanName && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-[#b89fa5]">
                <span>Current plan:</span>
                <span className="text-white">{currentPlanName}</span>
                <span>→</span>
                <span className="text-amber-300">{requiredPlanName}+</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={onUpgrade}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Upgrade plan</span>
            </button>
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#d4c2c7] transition cursor-pointer"
              >
                Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
