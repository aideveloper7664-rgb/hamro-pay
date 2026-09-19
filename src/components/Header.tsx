import { Menu, Bell, Wallet } from 'lucide-react';
import { PlanType } from '../types';

interface HeaderProps {
  onOpenSidebar: () => void;
  onViewChange: (view: string) => void;
  unreadNotifications: number;
  balance: number;
  apiBaseUrl: string;
  apiEnabled: boolean;
  isSimulated: boolean;
  onOpenApiSettings: () => void;
}

export default function Header({
  onOpenSidebar,
  onViewChange,
  unreadNotifications,
  balance,
  apiBaseUrl,
  apiEnabled,
  isSimulated,
  onOpenApiSettings
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

  return (
    <header className="sticky top-0 bg-[#0b0204]/90 backdrop-blur-xl border-b border-[rgba(255,45,85,0.18)] px-6 py-3.5 flex items-center justify-between md:justify-end gap-4 z-20 shadow-lg">
      {/* Mobile Menu Trigger & Logo */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-[#b89fa5] hover:text-[#ff94a7] hover:bg-[rgba(255,30,75,0.08)] border border-[rgba(255,45,85,0.2)] transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] flex items-center justify-center shadow-[0_0_12px_rgba(255,30,75,0.4)]">
            <Wallet className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <span className="text-sm font-black text-[#fff2f4] tracking-tight">HamroPay</span>
        </div>
      </div>

      {/* Right-aligned Stats and Quick controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile quick-balance pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-[rgba(255,45,85,0.2)] rounded-xl text-[11px] font-extrabold text-[#fff2f4] md:hidden">
          <Wallet className="w-3.5 h-3.5 text-[#ff4d6d] shrink-0" />
          <span>Rs. {balance.toLocaleString('en-NP', { minimumFractionDigits: 2 })}</span>
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
