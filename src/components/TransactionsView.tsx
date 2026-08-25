import { useState } from 'react';
import { Search, ArrowDownLeft, ArrowUpRight, Download, HelpCircle } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionsViewProps {
  transactions: Transaction[];
  onExportCSV: () => void;
}

export default function TransactionsView({
  transactions,
  onExportCSV
}: TransactionsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'received' | 'withdrawal' | 'pending'>('all');

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.ref.toLowerCase().includes(searchTerm.toLowerCase()) || 
      tx.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = 
      typeFilter === 'all' || 
      (typeFilter === 'received' && tx.type === 'received') || 
      (typeFilter === 'withdrawal' && tx.type === 'withdrawal') || 
      (typeFilter === 'pending' && tx.status === 'Pending');

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            </span>
            Transactions Ledger
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Audit logs of incoming collections and outgoing UPI payouts.
          </p>
        </div>
        <button 
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-800 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all focus:outline-none"
        >
          <Download className="w-4 h-4" />
          Export Ledger (CSV)
        </button>
      </header>

      {/* Main Ledger Panel */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search reference ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-rose-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Type Select */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full sm:w-auto text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:border-rose-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">All Activities</option>
            <option value="received">Collections</option>
            <option value="withdrawal">Payouts</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Reference ID</th>
                <th className="py-3 px-3">Destination / Customer</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(tx => {
                  const isW = tx.type === 'withdrawal';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <div className={`
                            w-6.5 h-6.5 rounded-lg flex items-center justify-center
                            ${isW ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}
                          `}>
                            {isW ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                          </div>
                          {isW ? 'Payout' : 'Collection'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-400">{tx.ref}</td>
                      <td className="py-3.5 px-3 text-slate-800 font-bold">{tx.name}</td>
                      <td className={`py-3.5 px-3 font-black text-sm ${isW ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {isW ? '−' : '+'}Rs. {tx.amount.toLocaleString('en-NP')}
                      </td>
                      <td className="py-3.5 px-3">
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
                      <td className="py-3.5 px-3 text-slate-400 font-bold">{tx.date}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <b className="text-sm font-bold text-slate-800 block mb-1">No transaction records match</b>
                    <p className="text-[11px] text-slate-400 font-medium">Try modifying your filter categories or typing a different query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
