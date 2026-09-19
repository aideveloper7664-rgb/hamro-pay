import { useState, useEffect } from 'react';
import { CreditCard, Code, ShoppingBag, ShieldCheck, Cpu, CheckCircle2, AlertTriangle, Link as LinkIcon, Lock, Database, ArrowRight, Activity, Terminal } from 'lucide-react';
import { getStatus } from '../services/fampay.service';
import FamPayConnectView from './FamPayConnectView';
import PaytmConnectView from './PaytmConnectView';

interface ConnectViewProps {
  viewId: 'fampay' | 'paytm' | 'developer' | 'store' | string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isApiSimulated: boolean;
  apiBaseUrl: string;
  apiToken: string;
  apiStatus: Record<string, { status: 'REAL' | 'SIMULATED'; route: string; error?: string }>;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
  unreadNotifications?: number;
}

export default function ConnectView({ 
  viewId, 
  showToast, 
  isApiSimulated, 
  apiBaseUrl, 
  apiToken,
  apiStatus,
  onOpenSidebar,
  onViewChange,
  unreadNotifications
}: ConnectViewProps) {
  const isFamPay = viewId === 'fampay';

  if (isFamPay) {
    return (
      <FamPayConnectView
        showToast={showToast}
        onOpenSidebar={onOpenSidebar}
        onViewChange={onViewChange}
        unreadNotifications={unreadNotifications}
      />
    );
  }

  if (viewId === 'paytm') {
    return (
      <PaytmConnectView
        showToast={showToast}
        onOpenSidebar={onOpenSidebar}
        onViewChange={onViewChange}
        unreadNotifications={unreadNotifications}
      />
    );
  }

  const isDeveloper = viewId === 'developer';
  const isStore = viewId === 'store';
  const [fampayConnected, setFampayConnected] = useState(false);

  useEffect(() => {
    if (isFamPay) {
      getStatus().then(res => {
        setFampayConnected(Boolean(res?.connected));
      }).catch(() => {
        setFampayConnected(false);
      });
    }
  }, [isFamPay]);

  const viewData = {
    fampay: {
      title: 'FamPay Connect',
      desc: 'Connect your FamPay UPI account for automated transaction tracking and settlements.',
      icon: CreditCard,
      color: 'bg-yellow-500',
      heading: fampayConnected ? 'FamPay Account Connected' : 'No FamPay Account Connected',
      paragraph: fampayConnected 
        ? 'Your FamPay UPI account is actively linked for instant transaction processing.'
        : 'Connect your merchant FamPay account to enable automated UPI collections and UTR reconciliation.',
      buttonText: 'Add FamPay Account'
    },
    developer: {
      title: 'Developer Portal & API Status',
      desc: 'Manage your programmatic API payment integration and check live route synchronization.',
      icon: Code,
      color: 'bg-teal-600',
      heading: 'API workspace sandbox preview',
      paragraph: 'The standalone demonstration workspace contains no live network API keys or real endpoint bindings. Your original developer navigation links and UI elements are fully represented.',
      buttonText: 'Create Sandbox API Key'
    },
    store: {
      title: 'Store Portal',
      desc: 'Manage your merchant storefront and product catalogue in one place.',
      icon: ShoppingBag,
      color: 'bg-pink-500',
      heading: 'Your custom store is ready for cataloging',
      paragraph: 'Branded cataloging tools are simulated locally. Advanced product syncing, active carts, and order checkout flows require an online regional storage database.',
      buttonText: 'Configure Local Storefront'
    }
  };

  const currentData = viewData[viewId as keyof typeof viewData] || viewData.fampay;
  const IconComponent = currentData.icon;

  const handleActionClick = () => {
    if (isFamPay) {
      showToast('Coming Soon', 'info');
    } else if (isDeveloper) {
      showToast('Developer API token generated and synchronized.', 'success');
    } else {
      showToast('Store customizations are simulated locally. Connected database is offline.', 'info');
    }
  };

  // Convert status map to display array
  const statusItems = [
    { key: 'auth', name: 'Login & Session Gateway', ...apiStatus.auth },
    { key: 'paymentLinks', name: 'Payment Links Controller', ...apiStatus.paymentLinks },
    { key: 'balance', name: 'Wallet Balance Engine', ...apiStatus.balance },
    { key: 'transactions', name: 'Transactions Ledger', ...apiStatus.transactions },
    { key: 'withdrawals', name: 'Settlement Payouts', ...apiStatus.withdrawals },
    { key: 'notifications', name: 'Alerts & Notifications', ...apiStatus.notifications },
    { key: 'profile', name: 'Merchant Profile', ...apiStatus.profile },
    { key: 'plans', name: 'Plans & Subscription Upgrades', ...apiStatus.plans },
    { key: 'referral', name: 'Refer & Earn System', ...apiStatus.referral },
    { key: 'support', name: 'Support Request Tickets', ...apiStatus.support }
  ];

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className={`w-9 h-9 ${currentData.color} text-white rounded-xl flex items-center justify-center shrink-0`}>
            <IconComponent className="w-5 h-5 stroke-[2.5]" />
          </span>
          {currentData.title}
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {currentData.desc}
        </p>
      </header>

      {/* Main Center Stage */}
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center flex flex-col justify-center items-center shadow-xs">
        <div className={`w-12 h-12 rounded-2xl ${currentData.color} text-white flex items-center justify-center mb-4 shadow-md`}>
          <IconComponent className="w-6 h-6 stroke-[2]" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-1.5">
          {currentData.heading}
        </h2>
        <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-sm mb-4">
          {currentData.paragraph}
        </p>
        <button
          onClick={handleActionClick}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all outline-none"
        >
          <Cpu className="w-4 h-4 shrink-0" />
          {currentData.buttonText}
        </button>
      </div>

      {/* REAL-TIME API CONNECTION BOARD (Requested by user) */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight flex items-center gap-2 text-white">
                API Live Connection &amp; Debug Console
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">
                Live monitoring of route payloads and authentication bindings on <span className="text-rose-400 font-semibold">{apiBaseUrl}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
              !isApiSimulated 
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            }`}>
              {!isApiSimulated ? '● Real API Connected' : '▲ Local Sandbox Emulated'}
            </span>
          </div>
        </header>

        {/* Global Connection Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block">API Gateway Link</span>
            <span className="text-slate-200 font-bold block overflow-hidden text-ellipsis whitespace-nowrap">{apiBaseUrl}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Bearer Auth Token</span>
            <span className="text-slate-200 font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              {apiToken ? `${apiToken.substring(0, 15)}...` : 'No token configured'}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Session Store Driver</span>
            <span className="text-slate-200 font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              {!isApiSimulated ? 'Full-Stack Express JSON Database' : 'LocalStorage Cache'}
            </span>
          </div>
        </div>

        {/* Feature-by-Feature Route Matrix */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Module Status Grid</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {statusItems.map((item) => {
              const isReal = item.status === 'REAL';
              return (
                <div 
                  key={item.key} 
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-1.5 transition-all ${
                    isReal 
                      ? 'bg-slate-950/20 border-slate-800/60 hover:bg-slate-950/30' 
                      : 'bg-yellow-500/[0.02] border-yellow-500/10 hover:border-yellow-500/20'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{item.name}</span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${
                      isReal 
                        ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20' 
                        : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 animate-pulse'
                    }`}>
                      {isReal ? 'API Integration' : 'Simulated'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-950/40 px-2 py-1 rounded-md border border-slate-800/30 w-fit">
                    <Terminal className="w-3 h-3 text-rose-500" />
                    <span>{item.route}</span>
                  </div>

                  {item.error && (
                    <div className="flex items-start gap-1.5 mt-1 text-[9px] text-rose-400 leading-normal font-medium bg-rose-500/[0.05] border border-rose-500/10 p-2 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                      <span>{item.error}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
