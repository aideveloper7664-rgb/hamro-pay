import { useState } from 'react';
import { Search, ArrowDownLeft, ArrowUpRight, Download, Filter } from 'lucide-react';
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
    <div className="hp-w-root">
      <div className="hp-w-container">
        {/* Page Header */}
        <div className="hp-w-page-header">
          <div className="hp-w-page-head-left">
            <div className="hp-w-page-icon">
              <ArrowDownLeft className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="hp-w-page-info">
              <h1>Transactions Ledger</h1>
              <p>Audit records of incoming collections, payout settlements, and credit additions</p>
            </div>
          </div>
          <button
            onClick={onExportCSV}
            className="hp-w-panel-action"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Ledger (CSV)
          </button>
        </div>

        {/* Main Panel */}
        <div className="hp-w-panel">
          {/* Controls: Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-5">
            {/* Search Input */}
            <div className="hp-w-input-wrap-f flex-1 w-full">
              <span className="hp-w-input-icon-f">
                <Search className="w-4 h-4 text-[#83686e]" />
              </span>
              <input
                type="text"
                placeholder="Search reference ID, transaction, or recipient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="hp-w-input-field text-xs"
              />
            </div>

            {/* Filter Select */}
            <div className="relative w-full sm:w-auto shrink-0">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[rgba(12,2,6,0.85)] border border-[rgba(255,45,85,0.22)] text-xs font-bold text-[#fff2f4] focus:border-[#ff3c5f] focus:outline-none transition-all cursor-pointer"
              >
                <option value="all" className="bg-[#140409] text-white">All Activities</option>
                <option value="received" className="bg-[#140409] text-white">Collections</option>
                <option value="withdrawal" className="bg-[#140409] text-white">Payouts</option>
                <option value="pending" className="bg-[#140409] text-white">Pending</option>
              </select>
            </div>
          </div>

          {/* Table of Transactions */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-[rgba(255,45,85,0.14)] text-[10.5px] font-extrabold text-[#83686e] uppercase tracking-wider">
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Reference ID</th>
                  <th className="py-3 px-3">Destination / Customer</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,45,85,0.08)] font-medium text-[#b89fa5]">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(tx => {
                    const isW = tx.type === 'withdrawal';
                    return (
                      <tr key={tx.id} className="hover:bg-[rgba(255,45,85,0.04)] transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2 font-bold text-[#fff2f4]">
                            <div className={`
                              w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                              ${isW
                                ? 'bg-[rgba(255,30,75,0.12)] text-[#ff4d6d] border border-[rgba(255,30,75,0.22)]'
                                : 'bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border border-[rgba(43,242,154,0.22)]'}
                            `}>
                              {isW ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />}
                            </div>
                            <span>{isW ? 'Payout' : 'Collection'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#83686e] text-[11px]">{tx.ref}</td>
                        <td className="py-3.5 px-3 text-[#fff2f4] font-bold">{tx.name}</td>
                        <td className={`py-3.5 px-3 font-black text-sm ${isW ? 'text-[#ff4d6d]' : 'text-[#2bf29a]'}`}>
                          {isW ? '−' : '+'}₹ {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide leading-none border
                            ${tx.status === 'Success' || tx.status === 'Completed'
                              ? 'bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border-[rgba(43,242,154,0.35)]'
                              : tx.status === 'Pending'
                                ? 'bg-[rgba(255,184,52,0.12)] text-[#ffb834] border-[rgba(255,184,52,0.35)]'
                                : 'bg-[rgba(255,30,75,0.12)] text-[#ff4d6d] border-[rgba(255,30,75,0.35)]'
                            }
                          `}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-[#83686e] font-semibold text-[11px]">{tx.date}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="hp-w-empty-state">
                        <div className="hp-w-empty-icon">
                          <ArrowDownLeft className="w-12 h-12 text-[rgba(255,45,85,0.3)]" />
                        </div>
                        <div className="hp-w-empty-title">No transactions found</div>
                        <p className="text-xs text-[#83686e] max-w-sm font-medium">
                          No transaction records matched your search query or selected category filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
