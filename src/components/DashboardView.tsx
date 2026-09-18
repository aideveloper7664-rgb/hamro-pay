import { useState, useEffect } from 'react';
import { 
  Wallet, Check, ArrowDown, ArrowUp, Link as LinkIcon, Receipt, 
  Clock, Key, Copy, Eye, EyeOff, RefreshCw, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { PaymentLink, Transaction } from '../types';
import { getWalletBalance, getTransactions } from '../services/wallet.service';
import { useAuth } from '../context/AuthContext';
import TextLoop from './TextLoop';

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
}

export default function DashboardView({
  profileName,
  balance: propBalance,
  paymentLinks,
  transactions: propTransactions,
  onViewChange,
  onCreatePaymentLink,
  pendingWithdrawals = 0,
}: DashboardViewProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(propBalance);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>(propTransactions);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);

  // Retrieve merchant from Auth context or localStorage fallback
  const merchant = (() => {
    try {
      return JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
    } catch {
      return {};
    }
  })();

  const activeName = user?.name || merchant.name || profileName;
  const apiKey = user?.api_key || merchant.api_key || 'hp_live_not_generated';

  // Fetch live wallet balance and transactions from custom backend
  const fetchWalletData = async () => {
    setLoading(true);
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
          name: item.customer_name || item.name || item.upi_id || 'FamPay Customer',
          amount: Number(item.amount || item.net_amount || 0),
          type: item.type === 'withdraw' || item.type === 'withdrawal' ? 'withdrawal' : 'received',
          status: item.status === 'success' || item.status === 'PAID' ? 'Success' : item.status === 'failed' ? 'Failed' : 'Pending',
          date: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'
        }));
        setTransactions(mapped);
      }
    } catch (err) {
      console.warn('Could not refresh wallet from backend, using active state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Calculations
  const activeLinks = paymentLinks.filter(l => l.active).length;
  const recentTransactions = transactions.slice(0, 5);
  const recentLinks = paymentLinks.slice(0, 3);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Namaste, {activeName.split(' ')[0]}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100">
              Free Plan, 2% commission
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Your merchant workspace is connected to HamroPay Backend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchWalletData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={onCreatePaymentLink}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/10 transition-all active:scale-95"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Create Payment Link
          </button>
        </div>
      </header>

      {/* Live Operational Ticker */}
      <div className="relative w-full bg-slate-100/70 rounded-2xl border border-slate-200/60 p-1.5 overflow-hidden select-none flex items-center">
        <div className="absolute left-3 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[9px] font-extrabold uppercase tracking-widest shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white block animate-pulse shrink-0" />
          Live Gateway
        </div>
        <div className="w-full pl-28">
          <TextLoop
            text="HamroPay Backend Online ✦ GET /wallet/balance ✦ GET /wallet/transactions ✦ Real-time FamPay UPI Routing ✦ Automated Gmail UTR Verification Active"
            shape="line"
            speed={35}
            direction="forward"
            separator="✦"
            fontSize={11}
            fontWeight={700}
            letterSpacing={1}
            uppercase
            color="#475569"
            ribbon={false}
            height={22}
          />
        </div>
      </div>

      {/* Merchant API Key Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <Key className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Merchant Secret API Key</span>
              <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                x-api-key
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pass this key in the <code className="text-rose-300 font-mono">x-api-key</code> header to authenticate all API requests.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none flex items-center bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 font-mono text-xs">
              <span className="text-slate-200 select-all mr-2">
                {showKey ? apiKey : `${apiKey.slice(0, 8)}••••••••••••••••`}
              </span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-slate-400 hover:text-slate-200 ml-1 p-0.5 transition"
                title={showKey ? 'Mask API Key' : 'Reveal API Key'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleCopyApiKey}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shrink-0 transition active:scale-95 shadow-sm"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wallet Balance</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">
            Rs. {balance.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">From GET /wallet/balance</p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ArrowDown className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Earned</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">
            Rs. {(totalEarned || balance).toLocaleString('en-NP')}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Cumulative settlements</p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Links</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">
            {activeLinks} <span className="text-xs text-slate-400 font-bold">/ {paymentLinks.length}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Order generation channels</p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <ArrowUp className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Withdrawals</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">
            Rs. {pendingWithdrawals.toLocaleString('en-NP')}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Sent to verified UPI</p>
        </div>
      </div>

      {/* Main Content Split: Recent Transactions & Payment Links */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        {/* Recent Transactions List from GET /wallet/transactions */}
        <article className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Recent Transactions</h2>
                <p className="text-[10px] text-slate-400">Live ledger from GET /wallet/transactions</p>
              </div>
            </div>
            <button 
              onClick={() => onViewChange('transactions')}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No transactions recorded yet in your wallet ledger.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      tx.type === 'received' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-rose-50 text-rose-600'
                    }`}>
                      {tx.type === 'received' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{tx.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Ref: {tx.ref} · {tx.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-black ${
                      tx.type === 'received' ? 'text-emerald-600' : 'text-slate-800'
                    }`}>
                      {tx.type === 'received' ? '+' : '-'}Rs. {tx.amount.toLocaleString('en-NP')}
                    </div>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* Quick Payment Links Card */}
        <article className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-500 text-white rounded-lg flex items-center justify-center">
                  <LinkIcon className="w-3.5 h-3.5" />
                </span>
                Payment Links
              </h2>
              <button 
                onClick={() => onViewChange('links')}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentLinks.map(link => (
                <div key={link.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{link.title}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                        {link.active ? 'Active' : 'Inactive'} · {link.orders} payments
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-800">
                    Rs. {link.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={onCreatePaymentLink}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-rose-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Generate New Payment Link</span>
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
