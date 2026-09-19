import React, { useState, useEffect } from 'react';
import { PanelLeft } from 'lucide-react';
import { PaymentLink, Transaction } from '../types';
import { getWalletBalance, getTransactions } from '../services/wallet.service';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  profileName: string;
  balance: number;
  paymentLinks: PaymentLink[];
  transactions: Transaction[];
  onViewChange: (view: string) => void;
  onCreatePaymentLink: () => void;
  pendingWithdrawals?: number;
  feePercent?: number;
  linkLimit?: number;
  currentPlan?: string;
  onOpenSidebar?: () => void;
  unreadNotifications?: number;
}

export default function DashboardView({
  profileName,
  balance: propBalance,
  paymentLinks,
  transactions: propTransactions,
  onViewChange,
  onCreatePaymentLink,
  pendingWithdrawals = 0,
  feePercent = 5,
  linkLimit = 100,
  currentPlan = 'Blaze Free',
  onOpenSidebar,
  unreadNotifications = 0,
}: DashboardViewProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(propBalance);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>(propTransactions);

  // Live time-based greeting calculation
  const getTimeGreeting = (): string => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const [greeting, setGreeting] = useState<string>(getTimeGreeting);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Retrieve merchant from Auth context or localStorage fallback
  const merchant = (() => {
    try {
      return JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
    } catch {
      return {};
    }
  })();

  // User name: dynamically replace "Ai" with logged-in user's name
  const rawName = user?.name || merchant.name || profileName || '';
  const displayName = rawName.trim() ? rawName.trim() : 'User';

  // Fetch live wallet balance and transactions from custom backend if available
  const fetchWalletData = async () => {
    try {
      const balanceData = await getWalletBalance();
      if (balanceData) {
        if (typeof balanceData.balance === 'number') {
          setBalance(balanceData.balance);
        }
        if (typeof balanceData.total_earned === 'number') {
          setTotalEarned(balanceData.total_earned);
        }
      }

      const txData = await getTransactions();
      if (Array.isArray(txData)) {
        const mapped: Transaction[] = txData.map((item: any, idx: number) => ({
          id: item.id || item.transaction_id || `tx-${idx}`,
          ref: item.ref || item.order_id || item.utr || `TXN${1000 + idx}`,
          name: item.customer_name || item.name || item.upi_id || 'Hamro Customer',
          amount: Number(item.amount || item.net_amount || 0),
          type: item.type === 'withdraw' || item.type === 'withdrawal' ? 'withdrawal' : 'received',
          status: item.status === 'success' || item.status === 'PAID' ? 'Success' : item.status === 'failed' ? 'Failed' : 'Pending',
          date: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'
        }));
        setTransactions(mapped);
      }
    } catch (err) {
      console.warn('Could not refresh wallet from backend, using active state:', err);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  // Sync prop changes
  useEffect(() => {
    setBalance(propBalance);
  }, [propBalance]);

  useEffect(() => {
    setTransactions(propTransactions);
  }, [propTransactions]);

  // Calculations for stats cards
  const activeLinksCount = paymentLinks.filter(l => l.active).length;
  const successfulTx = transactions.filter(t => t.status === 'Success' && t.type === 'received');
  const successRate = transactions.length > 0 
    ? `${Math.round((successfulTx.length / transactions.length) * 100)}%` 
    : '—';
  
  const totalReceivedAmount = successfulTx.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const avgOrderValue = successfulTx.length > 0 
    ? totalReceivedAmount / successfulTx.length 
    : 0;
  
  const thisMonthVolume = totalReceivedAmount;

  // Plan formatting
  const planTag = currentPlan.toLowerCase().includes('enterprise') 
    ? 'Enterprise' 
    : currentPlan.toLowerCase().includes('pro') 
      ? 'Pro' 
      : 'Free';

  const planBaseName = currentPlan.replace(/(Free|Pro|Enterprise)/i, '').trim() || 'Blaze';

  // Card hover 3D tilt
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-3px) perspective(600px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = '';
  };

  return (
    <div className="hamropay-dashboard-wrap">
      <style>{`
        :root {
          --bg: #0b0204;
          --bg-2: rgba(20,5,8,0.65);
          --bg-card: rgba(22,6,9,0.75);
          --bg-card-solid: rgba(18,4,7,0.92);
          --card-border: rgba(255,45,85,0.18);
          --card-border-hover: rgba(255,60,95,0.45);
          --text: #fff2f4;
          --muted: #b89fa5;
          --muted-dim: #83686e;
          --red-primary: #ff1e4b;
          --red-light: #ff4d6d;
          --red-dark: #380a13;
          --gold: #ffb834;
          --green: #2bf29a;
          --blue: #5b8dff;
          --purple: #a78bfa;
          --radius: 18px;
        }

        .hamropay-dashboard-wrap {
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          background:
            radial-gradient(circle at 85% 15%, rgba(255,30,75,0.10), transparent 30%),
            radial-gradient(circle at 15% 30%, rgba(180,10,40,0.10), transparent 28%),
            linear-gradient(180deg, #070102 0%, #0d0305 45%, #120306 100%);
          background-attachment: fixed;
          color: var(--text);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
          width: 100%;
        }

        /* ============ TOP NAV ============ */
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 22px;
          background: rgba(11,2,4,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--card-border);
        }
        .topbar-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 140px;
        }
        .icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: var(--muted);
          transition: all 0.2s ease;
          position: relative;
          cursor: pointer;
          background: none;
          border: none;
        }
        .icon-btn:hover {
          color: #ff94a7;
          background: rgba(255,30,75,0.08);
        }
        .icon-btn svg {
          width: 20px;
          height: 20px;
        }
        .icon-btn .badge-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--red-primary);
          box-shadow: 0 0 8px var(--red-primary);
          border: 1.5px solid #0b0204;
        }

        .topbar-center {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.2px;
          color: var(--text);
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 140px;
          justify-content: flex-end;
        }

        .topbar-admin-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 5px;
          border-radius: 999px;
          background: rgba(255, 30, 75, 0.08);
          border: 1px solid rgba(255, 45, 85, 0.22);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .topbar-admin-chip:hover {
          background: rgba(255, 30, 75, 0.16);
          border-color: rgba(255, 60, 95, 0.45);
        }
        .topbar-admin-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff1e4b, #b8002c);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          display: grid;
          place-items: center;
          box-shadow: 0 0 10px rgba(255, 30, 75, 0.4);
          flex-shrink: 0;
        }
        .topbar-admin-info {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
          text-align: left;
        }
        .topbar-admin-name {
          font-size: 12px;
          font-weight: 800;
          color: #fff2f4;
          white-space: nowrap;
        }
        .topbar-admin-badge {
          font-size: 9px;
          font-weight: 800;
          color: #ff4d6d;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        /* ============ MAIN LAYOUT ============ */
        .dash-container {
          width: min(1400px, 100% - 40px);
          margin: 0 auto;
          padding: 26px 0 60px;
        }

        /* ============ GREETING ROW ============ */
        .greet-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 22px;
          width: 100%;
        }
        .greet-text {
          flex: 1 1 300px;
          min-width: 0;
        }
        .greet-text h1 {
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1.3;
          margin-bottom: 5px;
          color: #fff2f4;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .greet-text h1 .user-highlight {
          color: #ff3b65;
          background: linear-gradient(135deg, #ff4d6d, #ff1e4b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .greet-text h1 .wave {
          display: inline-block;
          animation: wave 2.5s ease-in-out infinite;
          transform-origin: 70% 70%;
          font-size: 24px;
          vertical-align: -1px;
          margin-left: 6px;
        }
        @keyframes wave {
          0%,100% { transform: rotate(0deg); }
          20%     { transform: rotate(14deg); }
          40%     { transform: rotate(-8deg); }
          60%     { transform: rotate(14deg); }
          80%     { transform: rotate(-4deg); }
        }
        .greet-text p {
          font-size: 13.5px;
          color: var(--muted);
        }

        .greet-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .dash-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 16px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.22s ease;
          white-space: nowrap;
          cursor: pointer;
          font-family: inherit;
        }
        .dash-btn svg {
          width: 15px;
          height: 15px;
        }

        .btn-ghost {
          background: rgba(28,8,12,0.7);
          border: 1px solid var(--card-border);
          color: #ffd6dc;
        }
        .btn-ghost:hover {
          background: rgba(48,12,19,0.9);
          border-color: rgba(255,60,95,0.5);
          transform: translateY(-1px);
        }
        .btn-primary {
          background: linear-gradient(135deg, #ff1e4b 0%, #d8002f 100%);
          color: #fff;
          border: none;
          box-shadow: 0 8px 24px rgba(255,30,75,0.35);
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(255,30,75,0.5);
        }

        /* ============ PLAN BANNER ============ */
        .plan-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          padding: 18px 22px;
          border-radius: var(--radius);
          background:
            radial-gradient(circle at 10% 0%, rgba(255,30,75,0.14), transparent 45%),
            linear-gradient(135deg, rgba(35,9,14,0.9), rgba(18,4,8,0.95));
          border: 1px solid var(--card-border);
          margin-bottom: 22px;
          position: relative;
          overflow: hidden;
        }
        .plan-banner::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,30,75,0.7), transparent);
          animation: shine 5s linear infinite;
          background-size: 200% 100%;
        }
        @keyframes shine {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .plan-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 280px;
        }
        .plan-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ff1e4b, #b8002c);
          display: grid;
          place-items: center;
          flex-shrink: 0;
          box-shadow: 0 0 22px rgba(255,30,75,0.5);
        }
        .plan-icon svg {
          width: 22px;
          height: 22px;
          color: #fff;
        }
        .plan-info strong {
          font-size: 15px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          color: #fff;
        }
        .plan-info strong .zap {
          font-size: 16px;
        }
        .plan-tag {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(91,141,255,0.14);
          color: #9ab4ff;
          border: 1px solid rgba(91,141,255,0.35);
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .plan-info p {
          font-size: 12px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .plan-info .dot-sep {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--muted-dim);
        }

        /* ============ STATS GRID ============ */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .stat-card {
          position: relative;
          padding: 18px 20px 16px;
          border-radius: var(--radius);
          background: linear-gradient(165deg, rgba(28,7,12,0.82), rgba(14,3,7,0.95));
          border: 1px solid var(--card-border);
          transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
          overflow: hidden;
          min-height: 132px;
          display: flex;
          flex-direction: column;
          transform-style: preserve-3d;
        }
        .stat-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 3px;
          background: var(--accent, #ff1e4b);
          opacity: 0.8;
        }
        .stat-card:hover {
          border-color: var(--card-border-hover);
          box-shadow: 0 14px 34px rgba(255,30,75,0.14);
        }

        .stat-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }
        .stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(255,30,75,0.12);
          border: 1px solid rgba(255,30,75,0.22);
          color: var(--red-light);
        }
        .stat-icon svg {
          width: 18px;
          height: 18px;
        }
        .stat-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 800;
          padding: 4px 9px;
          border-radius: 999px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .badge-gold {
          background: rgba(255,184,52,0.14);
          color: #ffb834;
          border: 1px solid rgba(255,184,52,0.35);
        }

        .stat-label {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--muted-dim);
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.6px;
          line-height: 1.1;
          color: #fff;
          margin-bottom: auto;
        }
        .stat-foot {
          font-size: 11px;
          color: var(--muted);
          margin-top: 12px;
          font-weight: 600;
        }

        /* Accent color variants */
        .stat-card[data-accent="gold"] { --accent: #ffb834; }
        .stat-card[data-accent="gold"] .stat-icon {
          background: rgba(255,184,52,0.12);
          border-color: rgba(255,184,52,0.28);
          color: #ffb834;
        }
        .stat-card[data-accent="green"] { --accent: #2bf29a; }
        .stat-card[data-accent="green"] .stat-icon {
          background: rgba(43,242,154,0.12);
          border-color: rgba(43,242,154,0.28);
          color: #2bf29a;
        }
        .stat-card[data-accent="blue"] { --accent: #5b8dff; }
        .stat-card[data-accent="blue"] .stat-icon {
          background: rgba(91,141,255,0.12);
          border-color: rgba(91,141,255,0.28);
          color: #5b8dff;
        }
        .stat-card[data-accent="purple"] { --accent: #a78bfa; }
        .stat-card[data-accent="purple"] .stat-icon {
          background: rgba(167,139,250,0.12);
          border-color: rgba(167,139,250,0.28);
          color: #a78bfa;
        }

        /* ============ PANELS (charts / lists) ============ */
        .panels-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .dash-panel {
          padding: 20px 22px;
          border-radius: var(--radius);
          background: linear-gradient(165deg, rgba(24,6,10,0.82), rgba(12,2,6,0.95));
          border: 1px solid var(--card-border);
          transition: border-color 0.25s ease;
        }
        .dash-panel:hover {
          border-color: var(--card-border-hover);
        }

        .panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,45,85,0.12);
          margin-bottom: 16px;
        }
        .panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14.5px;
          font-weight: 800;
          letter-spacing: -0.2px;
          color: #fff2f4;
        }
        .panel-title .t-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: rgba(43,242,154,0.12);
          color: #2bf29a;
          border: 1px solid rgba(43,242,154,0.28);
        }
        .panel-title .t-icon.purple {
          background: rgba(167,139,250,0.12);
          color: #a78bfa;
          border-color: rgba(167,139,250,0.28);
        }
        .panel-title .t-icon.gold {
          background: rgba(255,184,52,0.12);
          color: #ffb834;
          border-color: rgba(255,184,52,0.28);
        }
        .panel-title .t-icon svg {
          width: 15px;
          height: 15px;
        }

        .panel-action {
          font-size: 11.5px;
          font-weight: 800;
          padding: 7px 13px;
          border-radius: 9px;
          color: #ffd6dc;
          background: rgba(28,8,12,0.7);
          border: 1px solid var(--card-border);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          font-family: inherit;
        }
        .panel-action:hover {
          background: rgba(48,12,19,0.9);
          border-color: rgba(255,60,95,0.5);
          color: #fff;
        }
        .panel-action svg {
          width: 12px;
          height: 12px;
        }

        /* Empty state inside panels */
        .empty-state {
          padding: 40px 20px 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 16px;
          min-height: 230px;
        }
        .empty-icon {
          width: 80px;
          height: 80px;
          display: grid;
          place-items: center;
          color: rgba(255,45,85,0.35);
        }
        .empty-icon svg {
          width: 100%;
          height: 100%;
          stroke-width: 1.4;
        }
        .empty-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.2px;
        }
        .empty-sub {
          font-size: 12px;
          color: var(--muted);
          margin-top: -8px;
          max-width: 260px;
          line-height: 1.55;
        }
        .empty-btn {
          margin-top: 6px;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #ff1e4b, #d8002f);
          border: none;
          box-shadow: 0 8px 22px rgba(255,30,75,0.35);
          transition: all 0.22s ease;
          cursor: pointer;
          font-family: inherit;
        }
        .empty-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(255,30,75,0.55);
        }

        /* Item list rows inside panels */
        .panel-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 0;
          border-bottom: 1px solid rgba(255,45,85,0.1);
        }
        .panel-item-row:last-child {
          border-bottom: none;
        }
        .item-icon-box {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        /* ============ RESPONSIVE ============ */
        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .panels-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .dash-container {
            width: calc(100% - 28px);
            padding-top: 18px;
          }
          .topbar {
            padding: 0 14px;
          }
          .topbar-left, .topbar-right {
            min-width: auto;
          }
          .topbar-center {
            display: none;
          }
          .greet-text h1 {
            font-size: 21px;
          }
          .greet-text h1 .wave {
            font-size: 20px;
          }
          .greet-row {
            flex-direction: column;
            align-items: stretch;
          }
          .greet-actions {
            width: 100%;
          }
          .greet-actions .dash-btn {
            flex: 1;
          }
          .plan-banner {
            padding: 16px;
          }
          .plan-left {
            min-width: auto;
          }

          /* MOBILE: 2 cards per row */
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .stat-card {
            padding: 14px 14px 12px;
            min-height: 118px;
          }
          .stat-icon {
            width: 34px;
            height: 34px;
            border-radius: 9px;
          }
          .stat-icon svg {
            width: 16px;
            height: 16px;
          }
          .stat-label {
            font-size: 9.5px;
            letter-spacing: 1px;
            margin-bottom: 6px;
          }
          .stat-value {
            font-size: 20px;
          }
          .stat-foot {
            font-size: 10.5px;
            margin-top: 10px;
          }
          .stat-top {
            margin-bottom: 10px;
            gap: 6px;
          }
          .stat-badge {
            font-size: 9px;
            padding: 3px 7px;
          }
        }
        @media (max-width: 480px) {
          .topbar-right .icon-btn:first-child {
            display: none;
          }
          .plan-info strong {
            font-size: 14px;
          }
          .dash-panel {
            padding: 16px;
          }
          .panel-head {
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .panel-title {
            font-size: 13.5px;
          }

          /* Tighter 2-col grid on very small screens */
          .stats-grid {
            gap: 10px;
          }
          .stat-card {
            padding: 12px 12px 11px;
            min-height: 112px;
          }
          .stat-value {
            font-size: 18px;
          }
          .stat-label {
            font-size: 9px;
          }
          .stat-foot {
            font-size: 10px;
          }
        }
      `}</style>

      {/* ============ TOP NAV ============ */}
      <header className="topbar">
        <div className="topbar-left">
          <button 
            className="w-9 h-9 rounded-[11px] bg-[#1a050a] border border-[#831f33] flex items-center justify-center text-[#ff8ca3] hover:text-white hover:border-[#ff2d55] hover:bg-[#280810] transition-all cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.15)] active:scale-95" 
            aria-label="Open navigation menu"
            onClick={onOpenSidebar}
          >
            <PanelLeft className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>
        </div>

        <div className="topbar-center">Dashboard</div>

        <div className="topbar-right">
          {/* Admin User Chip in Topbar */}
          <div 
            className="topbar-admin-chip"
            onClick={() => onViewChange('profile')}
            title={`Logged in as Admin: ${displayName}`}
          >
            <div className="topbar-admin-avatar">
              {(displayName[0] || 'A').toUpperCase()}
            </div>
            <div className="topbar-admin-info">
              <span className="topbar-admin-name">{displayName}</span>
              <span className="topbar-admin-badge">Admin</span>
            </div>
          </div>

          <button 
            className="icon-btn" 
            aria-label="Notifications"
            onClick={() => onViewChange('notifications')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            {unreadNotifications > 0 && <span className="badge-dot" />}
          </button>
          <button 
            className="icon-btn" 
            aria-label="Account"
            onClick={() => onViewChange('profile')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ============ MAIN CONTENT ============ */}
      <main className="dash-container">

        {/* Greeting with dynamic time-based greeting and logged-in user name */}
        <div className="greet-row">
          <div className="greet-text">
            <h1>
              <span>{greeting}, </span>
              <span className="user-highlight">{displayName}</span>
              <span className="wave">👋</span>
            </h1>
            <p>Here's your account overview.</p>
          </div>
          <div className="greet-actions">
            <button 
              className="dash-btn btn-ghost"
              onClick={() => onViewChange('pricing')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M5 12l7-7 7 7"/>
              </svg>
              Upgrade
            </button>
            <button 
              className="dash-btn btn-primary"
              onClick={onCreatePaymentLink}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Create Payment Link
            </button>
          </div>
        </div>

        {/* Plan banner */}
        <div className="plan-banner">
          <div className="plan-left">
            <div className="plan-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div className="plan-info">
              <strong>
                <span className="zap">⚡</span>
                {planBaseName}
                <span className="plan-tag">{planTag}</span>
              </strong>
              <p>
                {paymentLinks.length}/{linkLimit} links used this month
                <span className="dot-sep"></span>
                {feePercent}% commission
              </p>
            </div>
          </div>
          <button 
            className="dash-btn btn-primary"
            onClick={() => onViewChange('pricing')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M5 12l7-7 7 7"/>
            </svg>
            Upgrade Plan
          </button>
        </div>

        {/* Row 1: 4 cards */}
        <div className="stats-grid">
          <div 
            className="stat-card" 
            data-accent="gold"
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div className="stat-top">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="7" width="18" height="14" rx="2"/>
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <span className="stat-badge badge-gold">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '11px', height: '11px' }}>
                  <rect x="3" y="8" width="18" height="13" rx="2"/>
                  <path d="M12 8v13M3 12h18"/>
                </svg>
                ₹5.00
              </span>
            </div>
            <div className="stat-label">Zap Cash</div>
            <div className="stat-value">
              ₹{balance > 0 ? balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </div>
            <div className="stat-foot">Limit: ₹500.00</div>
          </div>

          <div 
            className="stat-card" 
            data-accent="green"
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div className="stat-top">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="m8.5 12.5 2.5 2.5 4.5-5"/>
                </svg>
              </div>
            </div>
            <div className="stat-label">Links Used</div>
            <div className="stat-value">{activeLinksCount}</div>
            <div className="stat-foot">of {linkLimit}/month</div>
          </div>

          <div 
            className="stat-card" 
            data-accent="blue"
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div className="stat-top">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h12M6 21h12M8 3c0 5 8 5 8 0M8 21c0-5 8-5 8 0M9 12h6"/>
                </svg>
              </div>
            </div>
            <div className="stat-label">Total Received</div>
            <div className="stat-value">
              ₹{(totalEarned || totalReceivedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div 
            className="stat-card" 
            data-accent="purple"
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div className="stat-top">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12"/>
                  <path d="M8 11l4 4 4-4"/>
                  <rect x="4" y="18" width="16" height="3" rx="1"/>
                </svg>
              </div>
            </div>
            <div className="stat-label">Pending Withdrawal</div>
            <div className="stat-value">
              {pendingWithdrawals > 0 ? `₹${pendingWithdrawals.toLocaleString('en-IN')}` : '0'}
            </div>
          </div>
        </div>

        {/* Row 2: 4 cards */}
        <div className="stats-grid">
          <div 
            className="stat-card" 
            data-accent="green"
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div className="stat-top">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>
                </svg>
              </div>
            </div>
            <div className="stat-label">Success Rate</div>
            <div className="stat-value">{successRate}</div>
          </div>

          <div 
            className="stat-card" 
            data-accent="blue"
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div className="stat-top">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2"/>
                  <path d="M9 8h6M9 12h6M9 16h4"/>
                </svg>
              </div>
            </div>
            <div className="stat-label">Avg. Order Value</div>
            <div className="stat-value">
              ₹{avgOrderValue.toFixed(2)}
            </div>
          </div>

          <div 
            className="stat-card" 
            data-accent="gold"
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div className="stat-top">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                  <path d="m9 15 2 2 4-4"/>
                </svg>
              </div>
            </div>
            <div className="stat-label">This Month</div>
            <div className="stat-value">
              ₹{thisMonthVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div 
            className="stat-card" 
            data-accent="purple"
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div className="stat-top">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="3.5"/>
                  <circle cx="17" cy="11" r="2.8"/>
                  <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5"/>
                  <path d="M14.5 20c0-2 .8-3.4 2.5-3.9 1.8-.5 3.5.4 4 2.4"/>
                </svg>
              </div>
            </div>
            <div className="stat-label">Referral Earnings</div>
            <div className="stat-value">₹0.00</div>
          </div>
        </div>

        {/* Charts row */}
        <div className="panels-grid">
          <div className="dash-panel">
            <div className="panel-head">
              <div className="panel-title">
                <span className="t-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9"/>
                  </svg>
                </span>
                Payment Outcomes
              </div>
            </div>
            {transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 3v9l7 4"/>
                  </svg>
                </div>
                <div className="empty-title">No payments yet</div>
                <div className="empty-sub">Once you start receiving payments, you'll see a breakdown here.</div>
              </div>
            ) : (
              <div className="py-3">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-[rgba(43,242,154,0.08)] border border-[rgba(43,242,154,0.2)] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#2bf29a]">Successful</div>
                    <div className="text-lg font-black text-[#fff] mt-1">{successfulTx.length}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[rgba(255,184,52,0.08)] border border-[rgba(255,184,52,0.2)] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#ffb834]">Pending</div>
                    <div className="text-lg font-black text-[#fff] mt-1">
                      {transactions.filter(t => t.status === 'Pending').length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[rgba(255,30,75,0.08)] border border-[rgba(255,30,75,0.2)] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#ff4d6d]">Failed</div>
                    <div className="text-lg font-black text-[#fff] mt-1">
                      {transactions.filter(t => t.status === 'Failed').length}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[var(--muted)] text-center">
                  Total {transactions.length} operations processed through gateway.
                </div>
              </div>
            )}
          </div>

          <div className="dash-panel">
            <div className="panel-head">
              <div className="panel-title">
                <span className="t-icon purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17l5-6 4 4 8-10"/>
                    <path d="M15 5h5v5"/>
                  </svg>
                </span>
                Last 7 Days
              </div>
            </div>
            {transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17l5-6 4 4 8-10"/>
                    <path d="M3 21h18"/>
                  </svg>
                </div>
                <div className="empty-title">No earnings yet</div>
                <div className="empty-sub">Your daily earnings trend will appear here as payments come in.</div>
              </div>
            ) : (
              <div className="py-2">
                <div className="flex items-end justify-between gap-2 h-36 px-2 pt-4 pb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                    const heightPercent = idx === 6 ? 85 : idx === 5 ? 60 : idx === 4 ? 40 : 25;
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div 
                          className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-[rgba(167,139,250,0.2)] to-[rgba(167,139,250,0.85)] border-t border-[rgba(167,139,250,0.9)] transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[10px] font-bold text-[var(--muted)]">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent activity row */}
        <div className="panels-grid">
          <div className="dash-panel">
            <div className="panel-head">
              <div className="panel-title">
                <span className="t-icon purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                </span>
                Recent Payment Links
              </div>
              <button 
                className="panel-action"
                onClick={() => onViewChange('links')}
              >
                View All
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            {paymentLinks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                </div>
                <div className="empty-title">No payment links yet</div>
                <button 
                  className="empty-btn"
                  onClick={onCreatePaymentLink}
                >
                  Create First Link
                </button>
              </div>
            ) : (
              <div>
                {paymentLinks.slice(0, 4).map(link => (
                  <div key={link.id} className="panel-item-row">
                    <div className="flex items-center gap-3">
                      <div className="item-icon-box bg-[rgba(167,139,250,0.12)] text-[#a78bfa] border border-[rgba(167,139,250,0.28)]">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#fff2f4]">{link.title}</div>
                        <div className="text-[10px] text-[var(--muted)] mt-0.5">
                          {link.active ? '● Active' : '○ Inactive'} · {link.orders || 0} orders
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-black text-[#fff]">
                      ₹{Number(link.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-panel">
            <div className="panel-head">
              <div className="panel-title">
                <span className="t-icon gold">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 7v5l3 2"/>
                  </svg>
                </span>
                Recent Payments
              </div>
              <button 
                className="panel-action"
                onClick={() => onViewChange('transactions')}
              >
                All
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="3" width="16" height="18" rx="2"/>
                    <path d="M4 8h16M4 15h16M8 3v18M16 3v18"/>
                  </svg>
                </div>
                <div className="empty-title">No payments yet</div>
                <div className="empty-sub">Your recent incoming payments will appear here.</div>
              </div>
            ) : (
              <div>
                {transactions.slice(0, 4).map(tx => (
                  <div key={tx.id} className="panel-item-row">
                    <div className="flex items-center gap-3">
                      <div className={`item-icon-box ${
                        tx.type === 'received'
                          ? 'bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border border-[rgba(43,242,154,0.28)]'
                          : 'bg-[rgba(255,30,75,0.12)] text-[#ff4d6d] border border-[rgba(255,30,75,0.28)]'
                      }`}>
                        {tx.type === 'received' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                            <path d="M12 5v14M19 12l-7 7-7-7"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#fff2f4]">{tx.name}</div>
                        <div className="text-[10px] text-[var(--muted)] font-mono mt-0.5">
                          Ref: {tx.ref} · {tx.date}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-black ${
                        tx.type === 'received' ? 'text-[#2bf29a]' : 'text-[#fff2f4]'
                      }`}>
                        {tx.type === 'received' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.08)] text-[var(--muted)]">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
