import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Download, ArrowDownLeft, Copy, Check, RefreshCw, 
  AlertCircle, Hourglass, Loader2 
} from 'lucide-react';
import { Transaction, PaymentRow } from '../types';
import { getPayments } from '../services/wallet.service';

interface TransactionsViewProps {
  transactions?: Transaction[];
  onExportCSV?: () => void;
}

export default function TransactionsView({
  onExportCSV
}: TransactionsViewProps) {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [isLoadingFirst, setIsLoadingFirst] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'timeout' | 'cancelled' | 'failed'>('all');
  const [hideTimeoutAndCancelled, setHideTimeoutAndCancelled] = useState<boolean>(false);

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef<boolean>(false);

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

  // Merge and deduplicate by ID, newest first
  const mergePaymentRows = (existing: PaymentRow[], incoming: PaymentRow[]): PaymentRow[] => {
    const map = new Map<string, PaymentRow>();
    for (const item of existing) {
      if (item && item.id) map.set(item.id, item);
    }
    for (const item of incoming) {
      if (item && item.id) map.set(item.id, item);
    }
    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
    return merged;
  };

  // Initial / Manual fetch
  const fetchInitial = useCallback(async (isManualRefresh: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManualRefresh) {
      setIsRefreshing(true);
    } else if (rows.length === 0) {
      setIsLoadingFirst(true);
    }

    try {
      const res = await getPayments({ limit: 100 });
      const incoming = Array.isArray(res.payments) ? res.payments : [];
      setRows(prev => (isManualRefresh ? mergePaymentRows(prev, incoming) : incoming));
      setHasMore(Boolean(res.has_more));
      setNextBefore(res.next_before || null);
      setFetchError(null);
      if (isManualRefresh) {
        showToast('Payment history refreshed');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to load payments';
      setFetchError(msg);
      if (isManualRefresh) {
        showToast(msg);
      }
    } finally {
      setIsLoadingFirst(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [rows.length]);

  useEffect(() => {
    fetchInitial(false);
  }, []);

  // Silent background refresh
  const silentRefresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (document.visibilityState !== 'visible') return;

    isFetchingRef.current = true;
    try {
      const res = await getPayments({ limit: 100 });
      if (res && Array.isArray(res.payments)) {
        setRows(prev => mergePaymentRows(prev, res.payments));
      }
    } catch {
      // Silently skip background refresh errors
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Dynamic auto-refresh: 10s if any pending row, otherwise 60s
  useEffect(() => {
    const hasPending = rows.some(r => (r.status || '').toLowerCase() === 'pending');
    const intervalMs = hasPending ? 10000 : 60000;

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        silentRefresh();
      }
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        silentRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [rows, silentRefresh]);

  // Load more payments pagination
  const handleLoadMore = async () => {
    if (!hasMore || !nextBefore || isLoadingMore || isLoadingFirst || isFetchingRef.current) return;
    setIsLoadingMore(true);
    isFetchingRef.current = true;
    try {
      const res = await getPayments({ before: nextBefore, limit: 100 });
      const incoming = Array.isArray(res.payments) ? res.payments : [];
      setRows(prev => mergePaymentRows(prev, incoming));
      setHasMore(Boolean(res.has_more));
      setNextBefore(res.next_before || null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load more payments');
    } finally {
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'all' | 'success' | 'pending' | 'timeout' | 'cancelled' | 'failed';
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
    if (!text || text === '—') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(text);
    showToast(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setHideTimeoutAndCancelled(false);
    showToast('Filters cleared');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (rows.length === 0) {
      if (onExportCSV) {
        onExportCSV();
      } else {
        showToast('No payments to export');
      }
      return;
    }

    const headers = '#,Type,Order ID,Link Title,Amount,UTR,Status,Date & Time\n';
    const csvLines = rows.map((r, idx) => {
      const orderId = r.order_id ? `"${r.order_id.replace(/"/g, '""')}"` : '""';
      const linkTitle = r.link_title ? `"${r.link_title.replace(/"/g, '""')}"` : '""';
      const amt = Number(r.amount || 0).toFixed(2);
      const utr = r.utr ? `"${r.utr.replace(/"/g, '""')}"` : '""';
      const status = `"${(r.status || '').toUpperCase()}"`;
      const dt = `"${formatPaymentDate(r.created_at)}"`;
      return `${idx + 1},"Received",${orderId},${linkTitle},${amt},${utr},${status},${dt}`;
    }).join('\n');

    const blob = new Blob([headers + csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hamropay-payments.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported hamropay-payments.csv');
  };

  // Helper date formatter: "18 Oct 2026, 03:35 pm"
  const formatPaymentDate = (isoStr?: string | null): string => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${day} ${month} ${year}, ${timeStr}`;
    } catch {
      return isoStr || '—';
    }
  };

  // Status Badge Component
  const renderStatusBadge = (statusStr?: string | null) => {
    const s = (statusStr || '').toLowerCase();
    if (s === 'success' || s === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border leading-none bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border-[rgba(43,242,154,0.35)]">
          Success
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border leading-none bg-[rgba(255,184,52,0.12)] text-[#ffb834] border-[rgba(255,184,52,0.35)]">
          Pending
        </span>
      );
    }
    if (s === 'timeout') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border leading-none bg-white/[0.08] text-[#a39498] border-white/20">
          <Hourglass className="w-2.5 h-2.5 stroke-[2.2]" />
          Timeout
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border leading-none bg-white/[0.06] text-[#83686e] border-white/15">
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border leading-none bg-[rgba(255,30,75,0.12)] text-[#ff4d6d] border-[rgba(255,30,75,0.35)]">
        Failed
      </span>
    );
  };

  // Stats calculation based on loaded rows
  const totalOrders = rows.length;
  const successfulOrders = rows.filter(r => (r.status || '').toLowerCase() === 'success').length;
  const totalAmount = rows
    .filter(r => (r.status || '').toLowerCase() === 'success')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const failedOrders = rows.filter(r => (r.status || '').toLowerCase() === 'failed').length;

  // Filtered rows
  const filteredRows = rows.filter(tx => {
    const s = (tx.status || '').toLowerCase();

    // Checkbox: Hide timeout & cancelled
    if (hideTimeoutAndCancelled && (s === 'timeout' || s === 'cancelled')) {
      return false;
    }

    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'success' && s !== 'success' && s !== 'completed') return false;
      if (statusFilter === 'pending' && s !== 'pending') return false;
      if (statusFilter === 'timeout' && s !== 'timeout') return false;
      if (statusFilter === 'cancelled' && s !== 'cancelled') return false;
      if (statusFilter === 'failed' && s !== 'failed') return false;
    }

    // Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const orderIdMatch = (tx.order_id || '').toLowerCase().includes(q);
      const utrMatch = (tx.utr || '').toLowerCase().includes(q);
      const amountMatch = String(tx.amount || '').includes(q);
      const titleMatch = (tx.link_title || '').toLowerCase().includes(q);
      if (!orderIdMatch && !utrMatch && !amountMatch && !titleMatch) {
        return false;
      }
    }

    return true;
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
            <p>All your checkout sessions, payments, and settlements.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchInitial(true)}
            disabled={isRefreshing || isLoadingFirst}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[rgba(255,45,85,0.1)] border border-[rgba(255,45,85,0.25)] text-[#fff2f4] text-xs font-extrabold hover:bg-[rgba(255,45,85,0.2)] active:scale-95 disabled:opacity-60 transition-all cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.1)]"
            title="Refresh payments"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#ff4d6d] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="hp-tx-export-btn"
            title="Export payments as CSV"
          >
            <Download className="w-4 h-4 text-[#ffb834]" />
            <span>Export CSV</span>
          </button>
        </div>
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
      <div className="hp-tx-filter-bar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="hp-tx-filter-select">
            <select id="statusFilter" value={statusFilter} onChange={handleStatusChange}>
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="timeout">Timeout</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="hp-tx-filter-search flex-1 min-w-[200px]">
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
              placeholder="Search order ID, UTR or amount..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#b89fa5] cursor-pointer select-none hover:text-[#fff2f4] transition-colors py-2 px-3 rounded-xl bg-black/40 border border-[rgba(255,45,85,0.12)] shrink-0">
          <input
            type="checkbox"
            checked={hideTimeoutAndCancelled}
            onChange={e => setHideTimeoutAndCancelled(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-[#ff4d6d] cursor-pointer"
          />
          <span>Hide timeout &amp; cancelled</span>
        </label>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchInitial(true)}
            disabled={isRefreshing || isLoadingFirst}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-extrabold text-xs whitespace-nowrap border border-rose-500/40 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Panel */}
      <div className="hp-tx-panel">
        {/* SKELETON LOADER (First load) */}
        {isLoadingFirst && rows.length === 0 ? (
          <div className="divide-y divide-[rgba(255,45,85,0.08)] py-2">
            {[1, 2, 3, 4, 5].map(idx => (
              <div key={idx} className="p-4 sm:px-6 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white/5 shrink-0" />
                  <div className="space-y-1.5 flex-1 max-w-xs">
                    <div className="h-3.5 bg-white/5 rounded w-3/4" />
                    <div className="h-2.5 bg-white/[0.03] rounded w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-white/5 rounded w-16" />
                <div className="h-5 bg-white/5 rounded-full w-20 hidden sm:block" />
              </div>
            ))}
          </div>
        ) : filteredRows.length > 0 ? (
          <>
            {/* DESKTOP TABLE (>640px) */}
            <div className="hidden sm:block hp-tx-table-wrapper">
              <div className="hp-tx-table-head">
                <div className="hp-tx-th">#</div>
                <div className="hp-tx-th">Type</div>
                <div className="hp-tx-th">Order ID</div>
                <div className="hp-tx-th">Amount</div>
                <div className="hp-tx-th">UTR</div>
                <div className="hp-tx-th">Status</div>
                <div className="hp-tx-th">Date &amp; Time</div>
              </div>

              <div className="divide-y divide-[rgba(255,45,85,0.08)]">
                {filteredRows.map((tx, idx) => {
                  const orderId = tx.order_id;
                  const utr = tx.utr;

                  return (
                    <div key={tx.id || idx} className="hp-tx-row text-xs">
                      {/* # */}
                      <div className="font-mono text-[#83686e] font-bold text-[11px]">
                        {idx + 1}
                      </div>

                      {/* Type */}
                      <div>
                        <div className="inline-flex items-center gap-1.5 font-bold text-[#fff2f4]">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border border-[rgba(43,242,154,0.22)]">
                            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.4]" />
                          </div>
                          <span className="text-[11.5px]">Received</span>
                        </div>
                      </div>

                      {/* Order ID */}
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono font-bold text-[#fff2f4] text-[11.5px] truncate">
                            {orderId || '—'}
                          </span>
                          {orderId && (
                            <button
                              type="button"
                              onClick={() => handleCopy(orderId, 'Order ID')}
                              className="text-[#83686e] hover:text-white transition-colors shrink-0 p-1 cursor-pointer"
                              title="Copy Order ID"
                            >
                              {copiedId === orderId ? (
                                <Check className="w-3 h-3 text-[#2bf29a]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {tx.link_title && (
                          <span className="text-[10px] text-[#83686e] truncate mt-0.5" title={tx.link_title}>
                            {tx.link_title}
                          </span>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="font-extrabold text-sm font-mono text-[#2bf29a]">
                        +₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>

                      {/* UTR */}
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="font-mono text-[#b89fa5] text-[11px] truncate">
                          {utr || '—'}
                        </span>
                        {utr && (
                          <button
                            type="button"
                            onClick={() => handleCopy(utr, 'UTR')}
                            className="text-[#83686e] hover:text-white transition-colors shrink-0 p-1 cursor-pointer"
                            title="Copy UTR"
                          >
                            {copiedId === utr ? (
                              <Check className="w-3 h-3 text-[#2bf29a]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Status */}
                      <div>{renderStatusBadge(tx.status)}</div>

                      {/* Date & Time */}
                      <div className="text-[11px] text-[#83686e] font-semibold whitespace-nowrap">
                        {formatPaymentDate(tx.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MOBILE STACKED CARDS (<640px) */}
            <div className="sm:hidden divide-y divide-[rgba(255,45,85,0.08)] w-full min-w-0 max-w-full overflow-hidden">
              {filteredRows.map((tx, idx) => {
                const orderId = tx.order_id;
                const utr = tx.utr;

                return (
                  <div key={tx.id || idx} className="p-4 space-y-2.5 bg-black/25 min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-[#fff2f4] truncate">
                          {orderId || '—'}
                        </span>
                        {orderId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(orderId, 'Order ID')}
                            className="text-[#83686e] hover:text-white p-0.5 cursor-pointer shrink-0"
                            title="Copy Order ID"
                          >
                            {copiedId === orderId ? (
                              <Check className="w-3 h-3 text-[#2bf29a]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="shrink-0">{renderStatusBadge(tx.status)}</div>
                    </div>

                    {tx.link_title && (
                      <div className="text-[10.5px] text-[#83686e] truncate" title={tx.link_title}>
                        {tx.link_title}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
                      <div className="font-extrabold text-sm font-mono text-[#2bf29a]">
                        +₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#b89fa5]">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border border-[rgba(43,242,154,0.22)]">
                          <ArrowDownLeft className="w-3 h-3 stroke-[2.4]" />
                        </div>
                        <span>Received</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#83686e] pt-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[10px] text-[#83686e] shrink-0">UTR:</span>
                        <span className="font-mono text-[10.5px] text-[#b89fa5] truncate">
                          {utr || '—'}
                        </span>
                        {utr && (
                          <button
                            type="button"
                            onClick={() => handleCopy(utr, 'UTR')}
                            className="text-[#83686e] hover:text-white p-0.5 cursor-pointer shrink-0"
                            title="Copy UTR"
                          >
                            {copiedId === utr ? (
                              <Check className="w-3 h-3 text-[#2bf29a]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      <span className="text-[10.5px] font-semibold shrink-0">
                        {formatPaymentDate(tx.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LOAD MORE BUTTON */}
            {hasMore && (
              <div className="p-4 text-center border-t border-[rgba(255,45,85,0.08)] bg-black/20">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.25)] text-xs font-extrabold text-[#fff2f4] hover:bg-[rgba(255,45,85,0.15)] hover:border-[rgba(255,45,85,0.4)] disabled:opacity-50 transition-all cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.1)] active:scale-95"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff4d6d]" />
                      <span>Loading more payments...</span>
                    </>
                  ) : (
                    <span>Load more</span>
                  )}
                </button>
              </div>
            )}
          </>
        ) : rows.length === 0 ? (
          /* EMPTY STATE (Initial) */
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
            <div className="hp-tx-empty-title">No payments yet</div>
            <div className="hp-tx-empty-sub">
              Every checkout from your payment links shows up here, including pending and timed-out ones.
            </div>
          </div>
        ) : (
          /* EMPTY STATE (Filtered) */
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
            <div className="hp-tx-empty-title">No payments match your filters</div>
            <div className="hp-tx-empty-sub">
              Try adjusting your search query, status filter, or unchecking "Hide timeout &amp; cancelled".
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-[rgba(255,45,85,0.15)] border border-[rgba(255,45,85,0.3)] text-xs font-extrabold text-[#fff2f4] hover:bg-[rgba(255,45,85,0.25)] transition-all cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
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
