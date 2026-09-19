import React, { useState, useEffect, useRef } from 'react';
import { Download, ArrowDownLeft, ArrowUpRight, Copy, Check } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'all' | 'success' | 'pending' | 'failed';
    setStatusFilter(val);
    const text = e.target.options[e.target.selectedIndex].text;
    showToast(`Filter: ${text}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchTerm(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = v.trim();
    if (trimmed) {
      searchTimerRef.current = setTimeout(() => {
        showToast(`Searching for "${trimmed}"…`);
      }, 600);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(text);
    showToast(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Stats calculation
  const totalOrders = transactions.length;
  const successfulOrders = transactions.filter(
    tx => tx.status === 'Success' || tx.status === 'Completed'
  ).length;
  const totalAmount = transactions
    .filter(tx => (tx.status === 'Success' || tx.status === 'Completed') && tx.type === 'received')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const failedOrders = transactions.filter(tx => tx.status === 'Failed').length;

  // Filter list
  const filteredTransactions = transactions.filter(tx => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      tx.ref.toLowerCase().includes(searchLower) ||
      tx.id.toLowerCase().includes(searchLower) ||
      tx.name.toLowerCase().includes(searchLower);

    const statusLower = (tx.status || '').toLowerCase();
    const isSuccess = statusLower === 'success' || statusLower === 'completed';
    const isPending = statusLower === 'pending';
    const isFailed = statusLower === 'failed';

    let matchesStatus = true;
    if (statusFilter === 'success') matchesStatus = isSuccess;
    else if (statusFilter === 'pending') matchesStatus = isPending;
    else if (statusFilter === 'failed') matchesStatus = isFailed;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="hp-tx-container">
      {/* Page Header */}
      <div className="hp-tx-page-header">
        <div className="hp-tx-page-head-left">
          <div className="hp-tx-page-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="hp-tx-page-info">
            <h1>Payment History</h1>
            <p>All your received payments and transactions.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onExportCSV();
            showToast('Exporting ledger CSV...');
          }}
          className="hp-tx-export-btn"
        >
          <Download className="w-4 h-4 text-[#ffb834]" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="hp-tx-stats-grid">
        {/* Total Orders */}
        <div className="hp-tx-stat-card" data-accent="blue">
          <div className="hp-tx-stat-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M9 8h6M9 12h6M9 16h4" />
            </svg>
          </div>
          <div className="hp-tx-stat-label">Total Orders</div>
          <div className="hp-tx-stat-value">{totalOrders}</div>
        </div>

        {/* Successful */}
        <div className="hp-tx-stat-card" data-accent="green">
          <div className="hp-tx-stat-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12.5 2.5 2.5 4.5-5" />
            </svg>
          </div>
          <div className="hp-tx-stat-label">Successful</div>
          <div className="hp-tx-stat-value">{successfulOrders}</div>
        </div>

        {/* Total Amount */}
        <div className="hp-tx-stat-card" data-accent="gold">
          <div className="hp-tx-stat-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3h12M6 21h12M8 3c0 5 8 5 8 0M8 21c0-5 8-5 8 0M9 12h6" />
            </svg>
          </div>
          <div className="hp-tx-stat-label">Total Amount</div>
          <div className="hp-tx-stat-value">
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Failed */}
        <div className="hp-tx-stat-card" data-accent="red">
          <div className="hp-tx-stat-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </div>
          <div className="hp-tx-stat-label">Failed</div>
          <div className="hp-tx-stat-value">{failedOrders}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="hp-tx-filter-bar">
        <div className="hp-tx-filter-select">
          <select id="statusFilter" value={statusFilter} onChange={handleStatusChange}>
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="hp-tx-filter-search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            id="searchInput"
            placeholder="Search order ID..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Table Panel */}
      <div className="hp-tx-panel">
        <div className="hp-tx-table-wrapper">
          {/* Table Header */}
          <div className="hp-tx-table-head">
            <div className="hp-tx-th">#</div>
            <div className="hp-tx-th">Type</div>
            <div className="hp-tx-th">Order ID</div>
            <div className="hp-tx-th">Amount</div>
            <div className="hp-tx-th">UTR</div>
            <div className="hp-tx-th">Status</div>
            <div className="hp-tx-th">Date &amp; Time</div>
          </div>

          {/* Table Rows or Empty State */}
          {filteredTransactions.length > 0 ? (
            <div className="divide-y divide-[rgba(255,45,85,0.08)]">
              {filteredTransactions.map((tx, idx) => {
                const isReceived = tx.type === 'received';
                const statusLower = (tx.status || '').toLowerCase();
                const isSuccess = statusLower === 'success' || statusLower === 'completed';
                const isPending = statusLower === 'pending';

                // Order ID format
                const orderId = tx.ref || tx.id;
                // UTR format (or simulated UTR from ref)
                const utr = tx.ref.startsWith('HP-')
                  ? `UTR${tx.ref.replace(/[^0-9]/g, '').padEnd(12, '8').slice(0, 12)}`
                  : tx.ref;

                return (
                  <div key={tx.id || idx} className="hp-tx-row text-xs">
                    {/* # */}
                    <div className="font-mono text-[#83686e] font-bold text-[11px]">
                      {idx + 1}
                    </div>

                    {/* Type */}
                    <div>
                      <div className="inline-flex items-center gap-1.5 font-bold text-[#fff2f4]">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isReceived
                              ? 'bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border border-[rgba(43,242,154,0.22)]'
                              : 'bg-[rgba(255,30,75,0.12)] text-[#ff4d6d] border border-[rgba(255,30,75,0.22)]'
                          }`}
                        >
                          {isReceived ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.4]" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.4]" />
                          )}
                        </div>
                        <span className="text-[11.5px]">{isReceived ? 'Received' : 'Payout'}</span>
                      </div>
                    </div>

                    {/* Order ID */}
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="font-mono font-bold text-[#fff2f4] text-[11.5px] truncate">
                        {orderId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(orderId, 'Order ID')}
                        className="text-[#83686e] hover:text-white transition-colors shrink-0 p-1"
                        title="Copy Order ID"
                      >
                        {copiedId === orderId ? (
                          <Check className="w-3 h-3 text-[#2bf29a]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Amount */}
                    <div
                      className={`font-extrabold text-sm font-mono ${
                        isReceived ? 'text-[#2bf29a]' : 'text-[#ff4d6d]'
                      }`}
                    >
                      {isReceived ? '+' : '−'}₹
                      {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    {/* UTR */}
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="font-mono text-[#b89fa5] text-[11px] truncate">
                        {utr}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(utr, 'UTR')}
                        className="text-[#83686e] hover:text-white transition-colors shrink-0 p-1"
                        title="Copy UTR"
                      >
                        {copiedId === utr ? (
                          <Check className="w-3 h-3 text-[#2bf29a]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Status */}
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border leading-none ${
                          isSuccess
                            ? 'bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border-[rgba(43,242,154,0.35)]'
                            : isPending
                            ? 'bg-[rgba(255,184,52,0.12)] text-[#ffb834] border-[rgba(255,184,52,0.35)]'
                            : 'bg-[rgba(255,30,75,0.12)] text-[#ff4d6d] border-[rgba(255,30,75,0.35)]'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>

                    {/* Date & Time */}
                    <div className="text-[11px] text-[#83686e] font-semibold">
                      {tx.date}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hp-tx-empty-state">
              <div className="hp-tx-empty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div className="hp-tx-empty-title">No transactions yet</div>
              <div className="hp-tx-empty-sub">
                Once you start receiving payments, all your transactions will appear here.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Matching HTML Spec */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '11px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(165deg, rgba(28,8,14,0.97), rgba(14,3,7,0.98))',
            border: '1px solid rgba(255,45,85,0.28)',
            boxShadow: '0 14px 34px rgba(0,0,0,0.6), 0 0 26px rgba(255,30,75,0.15)',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#fff',
            maxWidth: 'calc(100% - 24px)',
            transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)'
          }}
        >
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '7px',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(43,242,154,0.14)',
              color: '#2bf29a',
              border: '1px solid rgba(43,242,154,0.28)',
              flexShrink: 0
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
