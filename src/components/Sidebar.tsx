import { useState } from 'react';
import { 
  Grid, Link as LinkIcon, Wallet, Clock, ArrowUp, Bell, 
  CreditCard, Code, ShoppingBag, Zap, Gift, Headphones, 
  User, LogOut, ChevronDown, Sparkles 
} from 'lucide-react';
import { PlanType } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  balance: number;
  profileName: string;
  profileEmail: string;
  unreadNotifications: number;
  currentPlan: PlanType;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  balance,
  profileName,
  profileEmail,
  unreadNotifications,
  currentPlan,
  onSignOut,
  isOpen,
  onClose
}: SidebarProps) {
  // Accordion submenus
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    cashier: false,
    developer: false,
    store: false
  });

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const getInitials = (name: string) => {
    return name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'HP';
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Grid, color: 'bg-rose-500' },
    { id: 'links', label: 'Payment Links', icon: LinkIcon, color: 'bg-indigo-500' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, color: 'bg-emerald-500' },
    { id: 'transactions', label: 'Transactions', icon: Clock, color: 'bg-amber-500' },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUp, color: 'bg-rose-600' },
  ];

  const handleNavClick = (viewId: string) => {
    onViewChange(viewId);
    onClose(); // Close sidebar on mobile
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-100 flex flex-col z-40
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        transition-transform duration-300 ease-in-out border-r border-slate-800 shadow-xl
        h-full overflow-y-auto scrollbar-thin
      `}>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-950/20">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white to-rose-200 bg-clip-text text-transparent">
              Hamro Pay
            </span>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>
        </div>

        {/* Merchant Summary */}
        <div className="m-4 p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center border border-white/10 shrink-0">
            {getInitials(profileName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-200 truncate">{profileName}</div>
            <div className="text-[10px] text-slate-400 truncate">{profileEmail}</div>
          </div>
        </div>

        {/* Available Balance Pill */}
        <div className="mx-4 mb-2 p-3 bg-white text-rose-600 rounded-xl shadow-lg border border-rose-100/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hamro Cash</span>
          </div>
          <span className="text-sm font-black tracking-tight text-rose-600">
            Rs. {balance.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Nav list */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Workspace
          </div>

          {/* Standard Menu Items */}
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all
                  ${isActive 
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/10' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-lg ${isActive ? 'bg-white/10' : item.color} text-white flex items-center justify-center shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}

          {/* Notifications */}
          <button
            onClick={() => handleNavClick('notifications')}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all
              ${currentView === 'notifications' 
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/10' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }
            `}
          >
            <div className={`w-6 h-6 rounded-lg ${currentView === 'notifications' ? 'bg-white/10' : 'bg-pink-500'} text-white flex items-center justify-center shrink-0`}>
              <Bell className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1 text-left">Notifications</span>
            {unreadNotifications > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                {unreadNotifications}
              </span>
            )}
          </button>

          <div className="h-px bg-slate-800 my-4 mx-2" />

          {/* Cashier Connect Accordion */}
          <div className="space-y-1">
            <button
              onClick={() => toggleSubmenu('cashier')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-yellow-500 text-white flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span>Cashier Connect</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-1 py-0.5 rounded-md font-extrabold">NEW</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSubmenus.cashier ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {openSubmenus.cashier && (
              <div className="pl-4 space-y-1">
                <button
                  onClick={() => handleNavClick('fampay')}
                  className={`
                    w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-semibold
                    ${currentView === 'fampay' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'}
                  `}
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span>FamPay Connect</span>
                </button>
              </div>
            )}
          </div>

          {/* Developer Portal Accordion */}
          <div className="space-y-1">
            <button
              onClick={() => toggleSubmenu('developer')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center shrink-0">
                  <Code className="w-3.5 h-3.5" />
                </div>
                <span>Developer Portal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-teal-500/10 border border-teal-500/20 text-teal-400 px-1 py-0.5 rounded-md font-extrabold">NEW</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSubmenus.developer ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {openSubmenus.developer && (
              <div className="pl-4 space-y-1">
                <button
                  onClick={() => handleNavClick('developer')}
                  className={`
                    w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-semibold
                    ${currentView === 'developer' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'}
                  `}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Hamro API Keys</span>
                </button>
              </div>
            )}
          </div>

          {/* Store Portal Accordion */}
          <div className="space-y-1">
            <button
              onClick={() => toggleSubmenu('store')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-purple-500 text-white flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <span>Store Portal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-1 py-0.5 rounded-md font-extrabold">NEW</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSubmenus.store ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {openSubmenus.store && (
              <div className="pl-4 space-y-1">
                <button
                  onClick={() => handleNavClick('store')}
                  className={`
                    w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-semibold
                    ${currentView === 'store' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'}
                  `}
                >
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                  <span>Customize Store</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-800 my-4 mx-2" />

          {/* Upgrade Plan Item */}
          <button
            onClick={() => handleNavClick('pricing')}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition-all border
              ${currentView === 'pricing'
                ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                : 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-200'
              }
            `}
          >
            <div className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="flex-1 text-left">Upgrade Plan</span>
            <span className="bg-rose-600/30 text-rose-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-rose-500/20">
              NEW
            </span>
          </button>

          {/* Refer & Earn */}
          <button
            onClick={() => handleNavClick('referral')}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all
              ${currentView === 'referral' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }
            `}
          >
            <div className={`w-6 h-6 rounded-lg ${currentView === 'referral' ? 'bg-white/10' : 'bg-cyan-500'} text-white flex items-center justify-center shrink-0`}>
              <Gift className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1 text-left">Refer &amp; Earn</span>
          </button>

          {/* Support */}
          <button
            onClick={() => handleNavClick('support')}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all
              ${currentView === 'support' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }
            `}
          >
            <div className={`w-6 h-6 rounded-lg ${currentView === 'support' ? 'bg-white/10' : 'bg-sky-500'} text-white flex items-center justify-center shrink-0`}>
              <Headphones className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1 text-left">Support Desk</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => handleNavClick('profile')}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all
              ${currentView === 'profile' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }
            `}
          >
            <div className={`w-6 h-6 rounded-lg ${currentView === 'profile' ? 'bg-white/10' : 'bg-slate-500'} text-white flex items-center justify-center shrink-0`}>
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1 text-left">Account Settings</span>
          </button>
        </nav>

        {/* Sign Out Button in Footer */}
        <div className="mt-auto p-4 border-t border-slate-800">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-950/20 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign out of Workspace</span>
          </button>
        </div>
      </aside>
    </>
  );
}
