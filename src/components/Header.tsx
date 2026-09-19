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
    <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between md:justify-end gap-4 z-20 shadow-xs md:shadow-none">
      {/* Mobile Menu Trigger & Logo */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-100 transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center shadow-md">
            <Wallet className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <span className="text-sm font-black text-slate-800 tracking-tight">Hamro Pay</span>
        </div>
      </div>

      {/* Right-aligned Stats and Quick controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile quick-balance pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-extrabold text-slate-700 md:hidden">
          <Wallet className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>Rs. {balance.toLocaleString('en-NP', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Notifications Icon (Clickable to change view) */}
        <button
          onClick={() => onViewChange('notifications')}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-100 transition-all active:scale-95 cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
          )}
        </button>
      </div>
    </header>
  );
}
