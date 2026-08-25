import { Wallet, Check, ArrowDown, ArrowUp, Link as LinkIcon, Receipt, Clock, Gift, Bell, Play, ArrowRight, ShieldCheck, HelpCircle, Zap } from 'lucide-react';
import { PaymentLink, Transaction, PlanType } from '../types';

interface DashboardViewProps {
  profileName: string;
  balance: number;
  paymentLinks: PaymentLink[];
  transactions: Transaction[];
  currentPlan: PlanType;
  onViewChange: (view: string) => void;
  onCreatePaymentLink: () => void;
  pendingWithdrawals: number;
  feePercent: number;
  linkLimit: number;
}

export default function DashboardView({
  profileName,
  balance,
  paymentLinks,
  transactions,
  currentPlan,
  onViewChange,
  onCreatePaymentLink,
  pendingWithdrawals,
  feePercent,
  linkLimit
}: DashboardViewProps) {
  // Statistics Calculations
  const activeLinks = paymentLinks.filter(l => l.active).length;
  const totalReceived = transactions
    .filter(t => t.type === 'received' && t.status === 'Success')
    .reduce((sum, t) => sum + t.amount, 0) + 28460; // Base historical seed + active collections

  const totalPaymentsCount = transactions.filter(t => t.type === 'received').length + 36; // seed base

  // Recent Payment Links (top 3)
  const recentLinks = paymentLinks.slice(0, 3);
  // Recent incoming transactions (top 3)
  const recentIncoming = transactions.filter(t => t.type === 'received').slice(0, 3);

  // SVG Donut Calculations
  // Total outcomes: Successful (32), Pending (6), Failed (4). Total = 42
  const successPct = (32 / 42) * 100;
  const pendingPct = (6 / 42) * 100;
  const failedPct = (4 / 42) * 100;

  // Circumference of r=40 is 2 * PI * 40 = 251.3
  const circ = 251.3;
  const strokeSuccess = (successPct / 100) * circ;
  const strokePending = (pendingPct / 100) * circ;
  const strokeFailed = (failedPct / 100) * circ;

  const offsetSuccess = 0;
  const offsetPending = -strokeSuccess;
  const offsetFailed = -(strokeSuccess + strokePending);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Namaste, {profileName.split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Your merchant account is secure and optimized.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onViewChange('pricing')}
            className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-white shadow-xs transition-all active:scale-95"
          >
            Upgrade Plan
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

      {/* Subscription Tier Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gradient-to-r from-rose-50 to-slate-50 border border-rose-100 rounded-2xl gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                Plan Level: {currentPlan === 'Blaze Free' ? 'Blaze' : currentPlan}
              </span>
              <span className="bg-rose-100/70 border border-rose-200 text-rose-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                {currentPlan === 'Blaze Free' ? 'Free' : 'Premium'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {paymentLinks.length} of {linkLimit === 1000000 ? 'Unlimited' : linkLimit} payment links generated · {feePercent}% fixed merchant collection fee
            </p>
          </div>
        </div>
        <button 
          onClick={() => onViewChange('pricing')}
          className="px-3.5 py-2 bg-white border border-slate-200 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          View Plans
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Balance</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">
            Rs. {balance.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Instant withdrawal available</p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Links</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">
            {activeLinks} <span className="text-xs text-slate-400 font-bold">/ {paymentLinks.length}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Generating live collections</p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ArrowDown className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Collected</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">
            Rs. {totalReceived.toLocaleString('en-NP')}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Across {totalPaymentsCount} collections</p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <ArrowUp className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Payout</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">
            Rs. {pendingWithdrawals.toLocaleString('en-NP')}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Sent to UPI verified address</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Check className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checkout Success</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">92.4%</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Last 30 business days</p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Order</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">Rs. 678</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Active checkout basket size</p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collected This Month</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">Rs. 14,280</div>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">+18.6% vs previous month</p>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Gift className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referral Bonus</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">Rs. 480</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">From 3 active merchant refers</p>
        </div>
      </div>

      {/* Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outcome Donut Chart */}
        <article className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </span>
              Payment Outcomes
            </h2>
            <span className="text-xs text-slate-400 font-bold">Last 30 days</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
            {/* SVG Donut */}
            <div className="relative w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                {/* Success Arc */}
                <circle 
                  cx="50" cy="50" r="40" fill="transparent" 
                  stroke="#10b981" strokeWidth="12"
                  strokeDasharray={circ}
                  strokeDashoffset={offsetSuccess}
                  style={{ strokeDasharray: `${strokeSuccess} ${circ}` }}
                />
                {/* Pending Arc */}
                <circle 
                  cx="50" cy="50" r="40" fill="transparent" 
                  stroke="#f59e0b" strokeWidth="12"
                  strokeDasharray={circ}
                  strokeDashoffset={offsetPending}
                  style={{ strokeDasharray: `${strokePending} ${circ}` }}
                />
                {/* Failed Arc */}
                <circle 
                  cx="50" cy="50" r="40" fill="transparent" 
                  stroke="#cbd5e1" strokeWidth="12"
                  strokeDasharray={circ}
                  strokeDashoffset={offsetFailed}
                  style={{ strokeDasharray: `${strokeFailed} ${circ}` }}
                />
              </svg>
              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-800 leading-none">42</span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">Total</span>
              </div>
            </div>

            {/* Legends */}
            <div className="space-y-3 min-w-[140px] text-xs font-semibold">
              <div className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Successful</span>
                </div>
                <span className="font-extrabold text-slate-800">32</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Pending</span>
                </div>
                <span className="font-extrabold text-slate-800">6</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                  <span>Failed</span>
                </div>
                <span className="font-extrabold text-slate-800">4</span>
              </div>
            </div>
          </div>
        </article>

        {/* 7 Days Trend Bar Chart */}
        <article className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </span>
              Weekly Sales Volume
            </h2>
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
              +18.6%
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-1 border-b border-slate-100 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_41px,#f8fafc_42px)]">
            {[
              { day: 'Mon', height: '41%' },
              { day: 'Tue', height: '57%' },
              { day: 'Wed', height: '33%' },
              { day: 'Thu', height: '76%' },
              { day: 'Fri', height: '60%' },
              { day: 'Sat', height: '91%' },
              { day: 'Sun', height: '72%' }
            ].map(item => (
              <div key={item.day} className="flex-1 flex flex-col items-center group h-full justify-end">
                <div 
                  className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-rose-600 to-rose-400 group-hover:from-rose-700 group-hover:to-rose-500 transition-all duration-300 relative"
                  style={{ height: item.height }}
                >
                  {/* Tooltip on hover */}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap pointer-events-none transition-opacity duration-200 shadow-md">
                    Vol: {item.height}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold tracking-tight mt-2 pb-1 shrink-0">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Bottom Split Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Links list card */}
        <article className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-500 text-white rounded-lg flex items-center justify-center">
                <LinkIcon className="w-3.5 h-3.5" />
              </span>
              Recent Payment Links
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
                <div className="text-right">
                  <div className="text-xs font-black text-slate-800">
                    Rs. {link.amount.toLocaleString('en-NP')}
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                    {link.date.replace('Updated ', '')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Transactions list card */}
        <article className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center">
                <ArrowDown className="w-3.5 h-3.5" />
              </span>
              Recent Sales
            </h2>
            <button 
              onClick={() => onViewChange('transactions')}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentIncoming.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{tx.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {tx.ref} · {tx.date}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-emerald-600">
                    +Rs. {tx.amount.toLocaleString('en-NP')}
                  </div>
                  <div className="text-[9px] font-bold mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold leading-none uppercase ${
                      tx.status === 'Success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
