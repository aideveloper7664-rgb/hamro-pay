import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, HelpCircle } from 'lucide-react';
import { Transaction } from '../types';

interface WalletViewProps {
  balance: number;
  transactions: Transaction[];
  onAddFunds: () => void;
  onViewChange: (view: string) => void;
}

export default function WalletView({
  balance,
  transactions,
  onAddFunds,
  onViewChange
}: WalletViewProps) {
  // Stats Calculations
  const lifetimeWithdrawn = transactions
    .filter(t => t.type === 'withdrawal' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0) + 29000; // base historical seed

  const lifetimeCredited = balance + lifetimeWithdrawn;

  // Filter last 4 wallet activities for the table
  const walletActivities = transactions.slice(0, 4);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </span>
            My Wallet
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage your Hamro Cash reserves and merchant credits.
          </p>
        </div>
        <button 
          onClick={onAddFunds}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/10 active:scale-95 transition-all focus:outline-none"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Add Wallet Funds
        </button>
      </header>

      {/* Rebranded Wallet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Available Balance */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-700 via-rose-600 to-rose-800 text-white p-6 shadow-lg shadow-rose-600/15 flex flex-col justify-between min-h-[180px]">
          {/* Decorative design vector lines */}
          <div className="absolute top-0 right-0 w-36 h-36 -mr-8 -mt-8 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <span className="text-[10px] font-bold text-rose-200 uppercase tracking-widest block">Hamro Cash</span>
            <div className="text-3xl font-black mt-2 tracking-tight">
              Rs. {balance.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="relative z-10 flex gap-2 pt-6">
            <button 
              onClick={onAddFunds}
              className="flex-1 py-2 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all"
            >
              Add Funds
            </button>
            <button 
              onClick={() => onViewChange('withdraw')}
              className="flex-1 py-2 bg-white/15 text-white hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold transition-all"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Card 2: Rewards / Bonus */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 p-6 flex flex-col justify-between min-h-[180px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Hamro Bonus</span>
              <span className="bg-amber-100 border border-amber-300 text-amber-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Rewards Available
              </span>
            </div>
            <div className="text-2xl font-black mt-2 tracking-tight text-amber-900">Rs. 650.00</div>
            <p className="text-xs text-amber-800/80 leading-relaxed mt-2 font-medium">
              Bonus balance applies automatically to premium merchant service discounts and local reward programs.
            </p>
          </div>
        </div>

        {/* Card 3: Merchant Credits */}
        <div className="rounded-2xl bg-slate-900 text-slate-100 p-6 flex flex-col justify-between min-h-[180px] border border-slate-800 shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Merchant Credit</span>
              <span className="bg-rose-650 bg-rose-600/10 border border-rose-500/20 text-rose-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Healthy Credit
              </span>
            </div>
            <div className="text-2xl font-black mt-2 tracking-tight text-slate-100">Rs. 1,280.00</div>
            <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
              Used automatically to offset payment link transactions and standard cash-out collection fees.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Credited</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">Rs. {lifetimeCredited.toLocaleString('en-NP')}</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Lifetime wallet additions</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Withdrawn</div>
          <div className="text-lg font-black text-rose-600 tracking-tight mt-1">Rs. {lifetimeWithdrawn.toLocaleString('en-NP')}</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Completed cash-outs</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily Limit</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">Rs. 50,000</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Maximum daily UPI withdrawal</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fee Offset</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">Rs. 1,280</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Covered by merchant credits</p>
        </div>
      </div>

      {/* Activity table panel */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
            Wallet Activity logs
          </h2>
          <button 
            onClick={() => onViewChange('transactions')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
          >
            All Transactions
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5">Activity</th>
                <th className="py-2.5">Reference</th>
                <th className="py-2.5">Amount</th>
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {walletActivities.map(tx => {
                const isW = tx.type === 'withdrawal';
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 flex items-center gap-2 font-bold text-slate-800">
                      <div className={`
                        w-6 h-6 rounded-lg flex items-center justify-center
                        ${isW ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}
                      `}>
                        {isW ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                      </div>
                      {isW ? 'Withdrawal' : 'Payment received'}
                    </td>
                    <td className="py-3 font-mono text-slate-400">{tx.ref}</td>
                    <td className={`py-3 font-bold ${isW ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isW ? '−' : '+'}Rs. {tx.amount.toLocaleString('en-NP')}
                    </td>
                    <td className="py-3 text-slate-500">{tx.date}</td>
                    <td className="py-3">
                      <span className={`
                        px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wide leading-none border
                        ${tx.status === 'Success' || tx.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : tx.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }
                      `}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
