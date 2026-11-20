import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CurrentPlanState, PlanType } from '../types';
import { hasDeveloperPortalAccess, hasApiDocsAccess } from '../services/plans.service';
import { X, User, LogOut, Wallet, Lock } from 'lucide-react';
import { FamPayIcon, PaytmIcon, AmazonPayIcon } from './BrandIcons';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  credits?: number;
  balance?: number;
  profileName: string;
  profileEmail: string;
  unreadNotifications?: number;
  currentPlan?: PlanType;
  planState?: CurrentPlanState | null;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  credits = 0,
  balance = 0,
  profileName,
  profileEmail,
  planState,
  onSignOut,
  isOpen,
  onClose,
}: SidebarProps) {
  const { user } = useAuth();
  const displayCredits = credits !== undefined ? credits : balance;
  const apiOrdersLocked = planState ? !hasDeveloperPortalAccess(planState.plan) : false;
  const apiDocsLocked = planState ? !hasApiDocsAccess(planState.plan) : false;

  // Collapsible groups state - default collapsed so subsections do not open automatically
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    cashier: currentView === 'fampay' || currentView === 'paytm' || currentView === 'amazon',
    dev: currentView === 'developer' || currentView === 'api-docs' || currentView === 'api-integration',
  });

  useEffect(() => {
    if (currentView === 'fampay' || currentView === 'paytm' || currentView === 'amazon') {
      setExpandedGroups(prev => (prev.cashier ? prev : { ...prev, cashier: true }));
    }
  }, [currentView]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const handleNavClick = (viewId: string) => {
    if ((viewId === 'api-docs' || viewId === 'api-integration') && !apiDocsLocked) {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/api/docs');
      }
    } else {
      if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/api/doc') || window.location.pathname.startsWith('/docs'))) {
        window.history.pushState({}, '', '/');
      }
    }
    onViewChange(viewId);
    onClose();
  };

  // Determine dynamic user info according to logged-in user
  const displayName = user?.name?.trim() || profileName?.trim() || 'sunny';
  const displayEmail = user?.email?.trim() || profileEmail?.trim() || 'aideveloper7664@gmail.com';
  const avatarLetter = (displayName[0] || 'S').toUpperCase();

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`
          sidebar ${isOpen ? 'open' : ''} hp-sidebar fixed top-0 left-0 z-50
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-300 ease-in-out
          flex-shrink-0 select-none shadow-[10px_0_40px_rgba(0,0,0,0.85)]
        `}
      >
        <div className="hp-sidebar-inner flex flex-col h-full">
          {/* Close button header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[rgba(255,45,85,0.18)] shrink-0">
            <div className="text-xs font-bold uppercase tracking-wider text-[rgba(255,242,244,0.7)]">
              Navigation
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
            title="Open Hamro Credits"
          >
            <span className="hp-wallet-icon">
              <span style={{ fontSize: '12px' }}>⚡</span>
            </span>
            <span className="hp-balance-amount">
              ₹ {displayCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Nav List */}
          <div className="flex flex-col gap-1 overflow-y-auto pr-1">

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
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
                    background: 'linear-gradient(135deg, #ff7a00, #e04f00)',
                    boxShadow: '0 4px 14px rgba(255,122,0,0.35)',
                  }}
                >
                  <Wallet className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0 truncate">Cashier Connect</span>
                <svg
                  className={`w-3.5 h-3.5 hp-chevron transition-transform duration-200 ${expandedGroups.cashier ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
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
                        style={{
                          background: 'linear-gradient(135deg, #17171c, #0c0c10)',
                          border: '1px solid rgba(255,138,0,0.45)',
                        }}
                      >
                        <FamPayIcon className="w-3.5 h-3.5" />
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
                        style={{
                          background: '#ffffff',
                          border: '1px solid rgba(0,186,242,0.5)',
                        }}
                      >
                        <PaytmIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 min-w-0 truncate">Paytm</span>
                    </div>

                    {/* Amazon Pay */}
                    <div
                      className={`hp-sub-item ${currentView === 'amazon' ? 'active' : ''}`}
                      onClick={() => handleNavClick('amazon')}
                    >
                      <span
                        className="hp-sub-icon"
                        style={{
                          background: '#232f3e',
                          border: '1px solid rgba(255,153,0,0.45)',
                        }}
                      >
                        <AmazonPayIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 min-w-0 truncate">Amazon Pay</span>
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
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
                  </svg>
                </span>
                <span className="flex-1 min-w-0 truncate">Developer Portal</span>
                {apiOrdersLocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <span className="hp-new-badge">New</span>
                )}
                <svg
                  className={`w-3.5 h-3.5 hp-chevron transition-transform duration-200 ${expandedGroups.dev ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
              <div className="hp-sub-wrap">
                <div className="hp-sub-inner">
                  <div className="hp-sub-list">
                    {/* Hamro API */}
                    <div
                      className={`hp-sub-item ${currentView === 'developer' ? 'active' : ''}`}
                      onClick={() => handleNavClick('developer')}
                    >
                      <span
                        className="hp-sub-icon"
                        style={{ background: 'linear-gradient(135deg, #5b8dff, #3b6ce6)' }}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                      </span>
                      <span className="flex-1 min-w-0 truncate">Hamro API</span>
                      {apiOrdersLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>

                    {/* API Integration */}
                    <div
                      className={`hp-sub-item ${currentView === 'api-docs' || currentView === 'api-integration' ? 'active' : ''}`}
                      onClick={() => handleNavClick('api-docs')}
                    >
                      <span
                        className="hp-sub-icon"
                        style={{ background: 'linear-gradient(135deg, #a78bfa, #7c5cf0)' }}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z" />
                          <path d="M8 10h8M8 14h5" />
                        </svg>
                      </span>
                      <span className="flex-1 min-w-0 truncate">API Integration</span>
                      {apiDocsLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== BOTTOM SECTION ========== */}

            {/* Hamro Credits */}
            <div
              className={`hp-nav-item ${currentView === 'wallet' ? 'active' : ''}`}
              onClick={() => handleNavClick('wallet')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #2bf29a, #10b673)',
                  boxShadow: '0 4px 14px rgba(43,242,154,0.35)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Hamro Credits</span>
            </div>

            {/* Transactions */}
            <div
              className={`hp-nav-item ${currentView === 'transactions' ? 'active' : ''}`}
              onClick={() => handleNavClick('transactions')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #ffb834, #e89a15)',
                  boxShadow: '0 4px 14px rgba(255,184,52,0.35)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Transactions</span>
            </div>

            {/* Notifications */}
            <div
              className={`hp-nav-item ${currentView === 'notifications' ? 'active' : ''}`}
              onClick={() => handleNavClick('notifications')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #ff4d8e, #d81f5f)',
                  boxShadow: '0 4px 14px rgba(255,77,142,0.35)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Notifications</span>
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-[rgba(255,45,85,0.18)]" />

            {/* Upgrade Plan (highlighted) */}
            <div
              className={`hp-nav-item ${currentView === 'pricing' ? 'active' : ''}`}
              onClick={() => handleNavClick('pricing')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #ffb834, #e89a15)',
                  boxShadow: '0 4px 14px rgba(255,184,52,0.35)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v18M5 12l7-7 7 7" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Upgrade Plan</span>
              <span className="hp-new-badge">New</span>
            </div>

            {/* Refer & Earn */}
            <div
              className={`hp-nav-item ${currentView === 'referral' ? 'active' : ''}`}
              onClick={() => handleNavClick('referral')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                  boxShadow: '0 4px 14px rgba(56,189,248,0.35)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="9" r="3.5" />
                  <circle cx="17" cy="11" r="2.8" />
                  <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
                  <path d="M14.5 20c0-2 .8-3.4 2.5-3.9 1.8-.5 3.5.4 4 2.4" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Refer &amp; Earn</span>
            </div>

            {/* Apply Promo */}
            <div
              className={`hp-nav-item ${currentView === 'promo' ? 'active' : ''}`}
              onClick={() => handleNavClick('promo')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #7c5cf0)',
                  boxShadow: '0 4px 14px rgba(167,139,250,0.35)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
                  <path d="M2 7h20v5H2z" />
                  <path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Apply Promo</span>
            </div>

            {/* Support */}
            <div
              className={`hp-nav-item ${currentView === 'support' ? 'active' : ''}`}
              onClick={() => handleNavClick('support')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                  boxShadow: '0 4px 14px rgba(56,189,248,0.35)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Support</span>
            </div>

            {/* Agentic Support */}
            <div
              className="hp-nav-item"
              onClick={() => handleNavClick('support')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #818cf8, #4f46e5)',
                  boxShadow: '0 4px 14px rgba(129,140,248,0.35)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Agentic Support</span>
              <span className="hp-new-badge">New</span>
            </div>

            {/* Customize Page */}
            <div
              className={`hp-nav-item ${currentView === 'customize' ? 'active' : ''}`}
              onClick={() => handleNavClick('customize')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #7c5cf0)',
                  boxShadow: '0 4px 14px rgba(167,139,250,0.35)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 truncate">Customize Page</span>
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-[rgba(255,45,85,0.18)]" />

            {/* Profile (highlighted) */}
            <div
              className={`hp-nav-item ${currentView === 'profile' ? 'active' : ''}`}
              style={{
                background: 'linear-gradient(135deg, rgba(255,30,75,0.14), rgba(255,30,75,0.04))',
                borderColor: 'rgba(255,60,95,0.4)',
                boxShadow: '0 4px 18px rgba(255,30,75,0.14)'
              }}
              onClick={() => handleNavClick('profile')}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg, #64748b, #334155)',
                  boxShadow: '0 4px 14px rgba(100,116,139,0.35)',
                }}
              >
                <User className="w-4 h-4 text-white" />
              </span>
              <span className="flex-1 min-w-0 truncate">Profile</span>
            </div>

            {/* Sign Out */}
            <div
              className="hp-nav-item"
              onClick={() => {
                onClose();
                onSignOut();
              }}
            >
              <span
                className="hp-nav-icon"
                style={{
                  background: 'linear-gradient(135deg,rgba(255,30,75,0.22),rgba(255,30,75,0.08))',
                  border: '1px solid rgba(255,30,75,0.3)'
                }}
              >
                <LogOut className="w-4 h-4 text-rose-400" />
              </span>
              <span className="flex-1 min-w-0 truncate text-rose-300">Sign Out</span>
            </div>

          </div>
        </div>
      </aside>
    </>
  );
}

