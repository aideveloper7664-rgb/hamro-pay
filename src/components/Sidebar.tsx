import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlanType } from '../types';
import { LogOut, User, X } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  balance: number;
  profileName: string;
  profileEmail: string;
  unreadNotifications?: number;
  currentPlan?: PlanType;
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
  unreadNotifications: _unreadNotifications = 0,
  onSignOut,
  isOpen,
  onClose,
}: SidebarProps) {
  const { user } = useAuth();

  // Collapsible groups state - default collapsed so subsections do not open automatically
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    cashier: currentView === 'fampay' || currentView === 'paytm',
    dev: currentView === 'developer',
    store: currentView === 'store',
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const handleNavClick = (viewId: string) => {
    onViewChange(viewId);
    onClose();
  };

  // Determine dynamic user info according to logged-in user
  const displayName = user?.name?.trim() || profileName?.trim() || 'Ai developer';
  const displayEmail = user?.email?.trim() || profileEmail?.trim() || 'aideveloper7664@gmail.com';
  const avatarLetter = (displayName[0] || 'A').toUpperCase();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`
          hp-sidebar fixed md:sticky top-0 left-0 z-50
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          transition-transform duration-300 ease-in-out
          flex-shrink-0 select-none
        `}
      >
        <div className="hp-sidebar-inner">
          {/* Mobile close button header */}
          <div className="flex md:hidden items-center justify-between pb-3 mb-2 border-b border-[rgba(255,45,85,0.18)] shrink-0">
            <div className="text-xs font-bold uppercase tracking-wider text-[rgba(255,242,244,0.7)]">
              Navigation
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Card */}
          <div
            className="hp-user-card cursor-pointer group shrink-0"
            onClick={() => handleNavClick('profile')}
            title="View Account Profile"
          >
            <div className="hp-user-avatar group-hover:scale-105 transition-transform">
              {avatarLetter}
            </div>
            <div className="hp-user-info">
              <div className="hp-user-name group-hover:text-[#ff4d6d] transition-colors">
                {displayName}
              </div>
              <div className="hp-user-email">
                {displayEmail}
              </div>
            </div>
          </div>

          {/* Balance Pill */}
          <div
            className="hp-balance-pill shrink-0"
            onClick={() => handleNavClick('wallet')}
            title="Open Wallet"
          >
            <span className="hp-wallet-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
                <path d="M16 12h3v4h-3a2 2 0 0 1 0-4Z" />
              </svg>
            </span>
            <span className="hp-balance-amount">
              ₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Nav List */}
          <div className="flex flex-col gap-1 shrink-0">
            {/* Dashboard */}
            <div
              className={`hp-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
            <span
              className="hp-nav-icon"
              style={{
                background: 'linear-gradient(135deg, #5b8dff, #3b6ce6)',
                boxShadow: '0 4px 14px rgba(91,141,255,0.35)',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <span className="flex-1 min-w-0 truncate">Dashboard</span>
          </div>

          {/* Payment Links */}
          <div
            className={`hp-nav-item ${currentView === 'links' ? 'active' : ''}`}
            onClick={() => handleNavClick('links')}
          >
            <span
              className="hp-nav-icon"
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #7c5cf0)',
                boxShadow: '0 4px 14px rgba(167,139,250,0.35)',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <span className="flex-1 min-w-0 truncate">Payment Links</span>
          </div>

          {/* Cashier Connect Group */}
          <div className={`hp-nav-group flex flex-col ${expandedGroups.cashier ? 'expanded' : ''}`}>
            <div
              className={`hp-nav-item ${expandedGroups.cashier ? 'expanded' : ''}`}
              onClick={() => toggleGroup('cashier')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #ffb834, #e89a15)',
                  boxShadow: '0 4px 14px rgba(255,184,52,0.35)',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <rect x="3" y="6" width="13" height="12" rx="2" />
                  <path d="m22 8-6 4 6 4V8Z" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Cashier Connect</span>
              <span className="hp-new-badge">New</span>
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center ml-1.5 transition-all duration-250 shrink-0 ${
                  expandedGroups.cashier
                    ? 'bg-[#ff1e4b]/20 text-[#ff4d6d] border border-[#ff1e4b]/35 shadow-[0_0_8px_rgba(255,30,75,0.25)]'
                    : 'bg-white/5 text-[rgba(255,242,244,0.6)] border border-white/10 group-hover:text-white group-hover:bg-white/10'
                }`}
                title={expandedGroups.cashier ? "Subsections expanded (click to close)" : "Contains subsections (click to expand)"}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-250 ${expandedGroups.cashier ? 'rotate-180' : 'rotate-0'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
            <div className="hp-sub-wrap">
              <div className="hp-sub-inner">
                <div className="hp-sub-list">
                  {/* FamPay */}
                  <div
                    className={`hp-sub-item ${currentView === 'fampay' ? 'active' : ''}`}
                    onClick={() => handleNavClick('fampay')}
                  >
                    <span
                      className="hp-sub-icon"
                      style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <rect x="5" y="3" width="14" height="18" rx="2" />
                        <path d="M12 18h.01" />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0 truncate">FamPay</span>
                  </div>

                  {/* Paytm */}
                  <div
                    className={`hp-sub-item ${currentView === 'paytm' ? 'active' : ''}`}
                    onClick={() => handleNavClick('paytm')}
                  >
                    <span
                      className="hp-sub-icon"
                      style={{ background: 'linear-gradient(135deg, #5b8dff, #3b6ce6)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M4 6h16v12H4z" />
                        <path d="M8 10h8M8 14h5" />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0 truncate">Paytm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Developer Portal Group */}
          <div className={`hp-nav-group flex flex-col ${expandedGroups.dev ? 'expanded' : ''}`}>
            <div
              className={`hp-nav-item ${expandedGroups.dev ? 'expanded' : ''}`}
              onClick={() => toggleGroup('dev')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #2bf29a, #10b673)',
                  boxShadow: '0 4px 14px rgba(43,242,154,0.35)',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Developer Portal</span>
              <span className="hp-new-badge">New</span>
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center ml-1.5 transition-all duration-250 shrink-0 ${
                  expandedGroups.dev
                    ? 'bg-[#ff1e4b]/20 text-[#ff4d6d] border border-[#ff1e4b]/35 shadow-[0_0_8px_rgba(255,30,75,0.25)]'
                    : 'bg-white/5 text-[rgba(255,242,244,0.6)] border border-white/10 group-hover:text-white group-hover:bg-white/10'
                }`}
                title={expandedGroups.dev ? "Subsections expanded (click to close)" : "Contains subsections (click to expand)"}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-250 ${expandedGroups.dev ? 'rotate-180' : 'rotate-0'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
            <div className="hp-sub-wrap">
              <div className="hp-sub-inner">
                <div className="hp-sub-list">
                  {/* Zap API */}
                  <div
                    className={`hp-sub-item ${currentView === 'developer' ? 'active' : ''}`}
                    onClick={() => handleNavClick('developer')}
                  >
                    <span
                      className="hp-sub-icon"
                      style={{ background: 'linear-gradient(135deg, #5b8dff, #3b6ce6)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0 truncate">Zap API</span>
                  </div>

                  {/* API Integration */}
                  <div
                    className="hp-sub-item"
                    onClick={() => handleNavClick('developer')}
                  >
                    <span
                      className="hp-sub-icon"
                      style={{ background: 'linear-gradient(135deg, #a78bfa, #7c5cf0)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z" />
                        <path d="M8 10h8M8 14h5" />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0 truncate">API Integration</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Store Portal Group */}
          <div className={`hp-nav-group flex flex-col ${expandedGroups.store ? 'expanded' : ''}`}>
            <div
              className={`hp-nav-item ${expandedGroups.store ? 'expanded' : ''}`}
              onClick={() => toggleGroup('store')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #ff4d8e, #d81f5f)',
                  boxShadow: '0 4px 14px rgba(255,77,142,0.35)',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M3 9 4.5 4h15L21 9" />
                  <path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
                  <path d="M9 13h6" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Store Portal</span>
              <span className="hp-new-badge">New</span>
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center ml-1.5 transition-all duration-250 shrink-0 ${
                  expandedGroups.store
                    ? 'bg-[#ff1e4b]/20 text-[#ff4d6d] border border-[#ff1e4b]/35 shadow-[0_0_8px_rgba(255,30,75,0.25)]'
                    : 'bg-white/5 text-[rgba(255,242,244,0.6)] border border-white/10 group-hover:text-white group-hover:bg-white/10'
                }`}
                title={expandedGroups.store ? "Subsections expanded (click to close)" : "Contains subsections (click to expand)"}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-250 ${expandedGroups.store ? 'rotate-180' : 'rotate-0'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
            <div className="hp-sub-wrap">
              <div className="hp-sub-inner">
                <div className="hp-sub-list">
                  {/* My Store */}
                  <div
                    className={`hp-sub-item ${currentView === 'store' ? 'active' : ''}`}
                    onClick={() => handleNavClick('store')}
                  >
                    <span
                      className="hp-sub-icon"
                      style={{ background: 'linear-gradient(135deg, #ff4d8e, #d81f5f)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M3 9 4.5 4h15L21 9" />
                        <path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0 truncate">My Store</span>
                  </div>

                  {/* Customize Store */}
                  <div
                    className="hp-sub-item"
                    onClick={() => handleNavClick('store')}
                  >
                    <span
                      className="hp-sub-icon"
                      style={{ background: 'linear-gradient(135deg, #a78bfa, #7c5cf0)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <circle cx="13.5" cy="6.5" r="1.5" />
                        <circle cx="17.5" cy="10.5" r="1.5" />
                        <circle cx="8.5" cy="7.5" r="1.5" />
                        <circle cx="6.5" cy="12.5" r="1.5" />
                        <path d="M12 2a10 10 0 1 0 0 20c1 0 1.5-.5 1.5-1.5 0-.5-.2-.8-.5-1.2-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H16a6 6 0 0 0 6-6c0-4.4-4.5-8-10-8Z" />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0 truncate">Customize Store</span>
                    <svg
                      className="w-3 h-3 text-[rgba(131,104,110,0.7)] flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  </div>

                  {/* Store Settings */}
                  <div
                    className="hp-sub-item"
                    onClick={() => handleNavClick('store')}
                  >
                    <span
                      className="hp-sub-icon"
                      style={{ background: 'linear-gradient(135deg, #5b8dff, #3b6ce6)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0 truncate">Store Settings</span>
                    <svg
                      className="w-3 h-3 text-[rgba(131,104,110,0.7)] flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Footer actions: Account Settings & Sign Out */}
        <div className="mt-auto pt-3 border-t border-[rgba(255,45,85,0.18)] flex flex-col gap-1 shrink-0">
          <div
            className={`hp-nav-item py-2 ${currentView === 'profile' ? 'active' : ''}`}
            onClick={() => handleNavClick('profile')}
          >
            <span
              className="hp-nav-icon w-7 h-7 rounded-lg text-slate-300"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <User className="w-3.5 h-3.5" />
            </span>
            <span className="flex-1 text-xs">Account Settings</span>
          </div>

          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-[rgba(255,180,195,0.8)] hover:text-white hover:bg-[rgba(255,30,75,0.12)] transition-all cursor-pointer"
          >
            <span
              className="hp-nav-icon w-7 h-7 rounded-lg text-rose-400"
              style={{ background: 'rgba(255,30,75,0.15)' }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </span>
            <span className="flex-1 text-left">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
