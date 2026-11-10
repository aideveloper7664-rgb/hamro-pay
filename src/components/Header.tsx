import { PanelLeft, Bell, Zap } from 'lucide-react';
import { PlanType } from '../types';

interface HeaderProps {
  onOpenSidebar: () => void;
  onViewChange: (view: string) => void;
  unreadNotifications: number;
  credits?: number;
  balance?: number;
  apiBaseUrl: string;
  apiEnabled: boolean;
  isSimulated: boolean;
  onOpenApiSettings: () => void;
  currentView?: string;
}

export default function Header({
  onOpenSidebar,
  onViewChange,
  unreadNotifications,
  credits = 0,
  balance = 0,
  apiBaseUrl,
  apiEnabled,
  isSimulated,
  onOpenApiSettings,
  currentView
}: HeaderProps) {
  // Extract simple hostname for visual display
  let displayHost = 'Local Sandbox';
  try {
    if (apiEnabled && apiBaseUrl) {
      displayHost = apiBaseUrl.replace(/^https?:\/\//, '').split('/')[0];
    }
  } catch (e) {
    displayHost = 'API Offline';
  }

  const displayCredits = credits !== undefined ? credits : balance;

  const getViewTitle = () => {
    switch (currentView) {
      case 'customize': return 'Customize Page';
      case 'wallet': return 'Hamro Credits';
      case 'transactions': return 'Payment History';
      case 'notifications': return 'Notifications';
      case 'profile': return 'Account Profile';
      case 'pricing': return 'Upgrade Plan';
      case 'fampay': return 'FamPay Connect';
      case 'support': return 'Support Desk';
      case 'referral': return 'Refer & Earn';
      case 'promo': return 'Promo Code';
      default: return null;
    }
  };

  const pageTitle = getViewTitle();

  return (
    <header className="sticky top-0 bg-[#0b0204]/90 backdrop-blur-xl border-b border-[rgba(255,45,85,0.18)] px-6 py-3.5 flex items-center justify-between gap-4 z-20 shadow-lg">
      {/* Menu Trigger & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="w-9 h-9 rounded-[11px] bg-[#1a050a] border border-[#831f33] flex items-center justify-center text-[#ff8ca3] hover:text-white hover:border-[#ff2d55] hover:bg-[#280810] transition-all cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.15)] active:scale-95"
          aria-label="Open navigation menu"
        >
          <PanelLeft className="w-4.5 h-4.5 stroke-[2.2]" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] flex items-center justify-center shadow-[0_0_12px_rgba(255,30,75,0.4)]">
            <Zap className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <span className="text-sm font-black text-[#fff2f4] tracking-tight">HamroPay</span>
          {pageTitle && (
            <>
              <span className="text-xs text-[#83686e] font-semibold">/</span>
              <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[150px] sm:max-w-none">
                {pageTitle}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right-aligned Stats and Quick controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile quick-credits pill */}
        <div 
          onClick={() => onViewChange('wallet')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 border border-[rgba(255,45,85,0.2)] hover:border-[rgba(255,45,85,0.4)] rounded-xl text-[11px] font-extrabold text-[#fff2f4] cursor-pointer transition"
          title="Hamro Credits"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />
          <span>₹ {displayCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {/* Notifications Icon (Clickable to change view) */}
        <button
          onClick={() => onViewChange('notifications')}
          className="relative p-2 rounded-xl text-[#b89fa5] hover:text-[#ff94a7] hover:bg-[rgba(255,30,75,0.08)] border border-[rgba(255,45,85,0.2)] transition-all active:scale-95 cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff1e4b] shadow-[0_0_8px_#ff1e4b] ring-2 ring-[#0b0204]" />
          )}
        </button>
      </div>
    </header>
  );
}
