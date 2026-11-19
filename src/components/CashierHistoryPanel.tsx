import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, RefreshCw, AlertCircle, Search, Download, Copy,
  ChevronDown, Loader2, Info
} from 'lucide-react';
import {
  CashierAccount,
  CashierTransaction,
  getCashierHistory
} from '../services/cashier.service';

interface CashierHistoryPanelProps {
  activeAccount?: CashierAccount | null;
  providerLabel: string;
  csvFilename: string;
  hasOtherActiveAccount?: boolean;
  otherActiveProviderLabel?: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onReconnect: () => void;
  refreshTrigger?: number;
}

const formatTxDate = (isoStr: string): string => {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr || '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return isoStr || '—';
  }
};

const formatDisplayDate = (isoStr?: string): string => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const formatSyncTime = (isoStr?: string): string => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
};

const isOlderThan730Days = (isoDateStr?: string): boolean => {
  if (!isoDateStr) return true;
  try {
    const timestamp = new Date(isoDateStr).getTime();
    if (isNaN(timestamp)) return true;
    const diffDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    return diffDays >= 730;
  } catch {
    return true;
  }
};

const mergeTransactions = (
  existing: CashierTransaction[],
  incoming: CashierTransaction[]
): CashierTransaction[] => {
  const map = new Map<string, CashierTransaction>();
  for (const item of existing) {
    const key = item.reference || item.message_id || item.alt_reference || `${item.date}_${item.amount}`;
    map.set(key, item);
  }
  for (const item of incoming) {
    const key = item.reference || item.message_id || item.alt_reference || `${item.date}_${item.amount}`;
    map.set(key, item);
  }
  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });
  return merged;
};

export default function CashierHistoryPanel({
  activeAccount,
  providerLabel,
  csvFilename,
  hasOtherActiveAccount = false,
  otherActiveProviderLabel = 'another provider',
  showToast,
  onReconnect,
  refreshTrigger = 0,
}: CashierHistoryPanelProps) {
  const [rows, setRows] = useState<CashierTransaction[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [nextBefore, setNextBefore] = useState<string | undefined>(undefined);
  const [canLoadOlder, setCanLoadOlder] = useState<boolean>(false);
  const [loadingFirst, setLoadingFirst] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);
  const [error, setError] = useState<{ code?: string; message: string; status?: number } | null>(null);

  const [lastWindowZeroCount, setLastWindowZeroCount] = useState<boolean>(false);
  const [showWakeupNotice, setShowWakeupNotice] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(25);

  const activeType = (activeAccount?.type || '').toLowerCase();
  const isPaytmMid = activeType === 'paytm_mid';

  const resetHistoryState = useCallback(() => {
    setRows([]);
    setBalance(null);
    setLastSynced('');
    setNextBefore(undefined);
    setCanLoadOlder(false);
    setLastWindowZeroCount(false);
    setError(null);
    setVisibleCount(25);
    setSearchQuery('');
  }, []);

  const activeAccountRef = useRef(activeAccount);
  activeAccountRef.current = activeAccount;
  const syncingRef = useRef(syncing);
  syncingRef.current = syncing;
  const loadingOlderRef = useRef(loadingOlder);
  loadingOlderRef.current = loadingOlder;
  const loadingFirstRef = useRef(loadingFirst);
  loadingFirstRef.current = loadingFirst;

  const loadFirstHistory = useCallback(async () => {
    const currentActive = activeAccountRef.current;
    if (!currentActive) {
      resetHistoryState();
      return;
    }

    if ((currentActive.type || '').toLowerCase() === 'paytm_mid') {
      resetHistoryState();
      setError({
        code: 'NOT_SUPPORTED',
        message: "Transaction history isn't available for Paytm MID accounts",
      });
      return;
    }

    setLoadingFirst(true);
    setError(null);

    try {
      const res = await getCashierHistory({});
      const initialRows = res.transactions || [];
      setRows(initialRows);
      setBalance(res.stats?.balance ?? null);
      setLastSynced(res.stats?.last_synced || new Date().toISOString());

      const nb = res.window?.next_before;
      setNextBefore(nb);
      setCanLoadOlder(Boolean(nb && !isOlderThan730Days(nb)));
      setLastWindowZeroCount(initialRows.length === 0);
    } catch (err: unknown) {
      const typedErr = err as { code?: string; message?: string; status?: number };
      setError({
        code: typedErr?.code,
        message: typedErr?.message || 'Failed to fetch email history',
        status: typedErr?.status,
      });
    } finally {
      setLoadingFirst(false);
    }
  }, [resetHistoryState]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (loadingFirst) {
      timer = setTimeout(() => setShowWakeupNotice(true), 6000);
    } else {
      setShowWakeupNotice(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loadingFirst]);

  useEffect(() => {
    if (activeAccount) {
      loadFirstHistory();
    } else {
      resetHistoryState();
    }
  }, [
    activeAccount?.id,
    activeAccount?._id,
    activeAccount?.type,
    activeAccount?.is_active,
    activeAccount?.isActive,
    refreshTrigger,
    loadFirstHistory,
    resetHistoryState,
  ]);

  const handleSync = async () => {
    if (!activeAccount || isPaytmMid || syncing || loadingOlder || loadingFirst) return;
    setSyncing(true);
    try {
      const res = await getCashierHistory({ refresh: true });
      const incoming = res.transactions || [];
      setRows(prev => mergeTransactions(prev, incoming));

      if (res.stats) {
        if (res.stats.balance !== undefined && res.stats.balance !== null) {
          setBalance(res.stats.balance);
        }
        if (res.stats.last_synced) {
          setLastSynced(res.stats.last_synced);
        }
      }

      if (!nextBefore && res.window?.next_before) {
        setNextBefore(res.window.next_before);
        setCanLoadOlder(!isOlderThan730Days(res.window.next_before));
      }

      setError(null);
      showToast('Gmail email history synchronized', 'success');
    } catch (err: unknown) {
      const typedErr = err as { code?: string; message?: string; status?: number };
      const errMsg = typedErr?.message || 'Failed to sync email history';
      setError({
        code: typedErr?.code,
        message: errMsg,
        status: typedErr?.status,
      });
      if (typedErr?.code !== 'NOT_SUPPORTED') {
        showToast(errMsg, 'error');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleLoadOlder = async () => {
    if (!activeAccount || isPaytmMid || !nextBefore || loadingOlder || syncing || loadingFirst) return;
    setLoadingOlder(true);
    try {
      const res = await getCashierHistory({ before: nextBefore });
      const incoming = res.transactions || [];
      setRows(prev => mergeTransactions(prev, incoming));
      setLastWindowZeroCount(incoming.length === 0);

      const newNextBefore = res.window?.next_before;
      setNextBefore(newNextBefore);
      setCanLoadOlder(Boolean(newNextBefore && !isOlderThan730Days(newNextBefore)));

      if (res.stats?.balance !== undefined && res.stats?.balance !== null) {
        setBalance(res.stats.balance);
      }
      if (res.stats?.last_synced) {
        setLastSynced(res.stats.last_synced);
      }
      setError(null);
    } catch (err: unknown) {
      const typedErr = err as { code?: string; message?: string; status?: number };
      const errMsg = typedErr?.message || 'Failed to load older emails';
      setError({
        code: typedErr?.code,
        message: errMsg,
        status: typedErr?.status,
      });
      showToast(errMsg, 'error');
    } finally {
      setLoadingOlder(false);
    }
  };

  const silentAutoRefresh = useCallback(async () => {
    const currentActive = activeAccountRef.current;
    if (!currentActive || (currentActive.type || '').toLowerCase() === 'paytm_mid') return;
    if (syncingRef.current || loadingOlderRef.current || loadingFirstRef.current) return;
    if (document.visibilityState !== 'visible') return;

    try {
      const res = await getCashierHistory({});
      const incoming = res.transactions || [];
      if (incoming.length > 0) {
        setRows(prev => mergeTransactions(prev, incoming));
      }
      if (res.stats) {
        if (res.stats.balance !== undefined && res.stats.balance !== null) {
          setBalance(res.stats.balance);
        }
        if (res.stats.last_synced) {
          setLastSynced(res.stats.last_synced);
        }
      }
    } catch {
      // Silently skip on background refresh error
    }
  }, []);

  useEffect(() => {
    if (!activeAccount || isPaytmMid) return;

    const interval = setInterval(silentAutoRefresh, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        silentAutoRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeAccount, isPaytmMid, silentAutoRefresh]);

  const copyReference = (ref: string) => {
    if (!ref || ref === '—') return;
    navigator?.clipboard?.writeText(ref).catch(() => {});
    showToast('Copied', 'info');
  };

  const exportCSV = () => {
    if (rows.length === 0) {
      showToast('No transactions to export', 'info');
      return;
    }
    const headers = ['Sender', 'Amount', 'Reference', 'Purpose', 'Date'];
    const csvLines = [headers.join(',')];
    for (const r of rows) {
      const s = `"${(r.sender || 'NA').replace(/"/g, '""')}"`;
      const a = Number(r.amount || 0);
      const ref = `"${(r.reference || r.alt_reference || '').replace(/"/g, '""')}"`;
      const p = `"${(r.purpose || '').replace(/"/g, '""')}"`;
      const d = `"${formatTxDate(r.date)}"`;
      csvLines.push([s, a, ref, p, d].join(','));
    }
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = csvFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${csvFilename}`, 'success');
  };

  if (isPaytmMid || error?.code === 'NOT_SUPPORTED') {
    return (
      <div className="mt-6 p-4 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center gap-3 text-xs text-sky-200">
        <Info className="w-4 h-4 text-sky-400 shrink-0" />
        <span>Transaction history isn't available for Paytm MID accounts. Payment status is verified directly via Paytm Business API.</span>
      </div>
    );
  }

  if (error?.code === 'NO_CASHIER' || error?.code === 'NOT_FAMPAY' || !activeAccount) {
    if (hasOtherActiveAccount) {
      return (
        <div className="mt-6 p-4 rounded-xl bg-black/40 border border-white/5 text-center text-xs text-[#b89fa5]">
          Your active cashier is currently <strong className="text-white">{otherActiveProviderLabel}</strong>. Set a {providerLabel} account active above to view its live Gmail history.
        </div>
      );
    }
    return (
      <div className="mt-6 p-4 rounded-xl bg-black/30 border border-white/5 text-center text-xs text-[#83686e]">
        Email history is available when a Gmail-based {providerLabel} cashier is active above.
      </div>
    );
  }

  const filteredRows = rows.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const s = (r.sender || '').toLowerCase();
    const ref = (r.reference || r.alt_reference || '').toLowerCase();
    const amt = String(r.amount || '');
    return s.includes(q) || ref.includes(q) || amt.includes(q);
  });

  const shownRows = filteredRows.slice(0, visibleCount);

  return (
    <div className="mt-6 p-4 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)]">
      {/* CARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[rgba(255,45,85,0.12)] mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#a80024] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,30,75,0.4)] shrink-0">
            <Mail className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-[#fff2f4]">
                Live Email History
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#2bf29a]/15 text-[#2bf29a] text-[10.5px] font-black border border-[#2bf29a]/30 tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2bf29a] animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-[#b89fa5] mt-0.5">
              Transactions from active {providerLabel} Gmail ({activeAccount.gmail_email || activeAccount.gmail || activeAccount.email || activeAccount.upi_id})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || loadingOlder || loadingFirst}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[rgba(255,45,85,0.1)] border border-[rgba(255,45,85,0.25)] text-[#fff2f4] text-xs font-extrabold hover:bg-[rgba(255,45,85,0.2)] active:scale-95 disabled:opacity-60 transition-all cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.1)]"
            title="Sync transactions from Gmail"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#ff4d6d] ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-5">
          {error.code === 'GMAIL_AUTH' ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>Gmail login failed. Reconnect this account with a fresh App Password and make sure IMAP is enabled in Gmail settings.</span>
              </div>
              <button
                type="button"
                onClick={onReconnect}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-extrabold text-xs whitespace-nowrap border border-amber-500/40 transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                Reconnect
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>{error.message || 'Could not sync email history right now'}</span>
              </div>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || loadingOlder || loadingFirst}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-extrabold text-xs whitespace-nowrap border border-rose-500/40 transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4 STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3.5 rounded-xl bg-black/45 border border-[rgba(255,45,85,0.12)]">
          <span className="text-[10px] uppercase font-bold text-[#83686e] tracking-wider block mb-1">
            {providerLabel} Balance
          </span>
          <span
            className="text-base sm:text-lg font-black text-[#fff2f4] block"
            title={balance === null || balance === undefined ? 'Balance not found in emails' : undefined}
          >
            {balance !== null && balance !== undefined
              ? `₹${Number(balance).toLocaleString('en-IN')}`
              : '—'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-black/45 border border-[rgba(255,45,85,0.12)]">
          <span className="text-[10px] uppercase font-bold text-[#83686e] tracking-wider block mb-1">
            Shown Txns
          </span>
          <span className="text-base sm:text-lg font-black text-[#fff2f4] block font-mono">
            {rows.length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-black/45 border border-[rgba(255,45,85,0.12)]">
          <span className="text-[10px] uppercase font-bold text-[#83686e] tracking-wider block mb-1">
            Total Amount
          </span>
          <span className="text-base sm:text-lg font-black text-[#2bf29a] block">
            ₹{rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-black/45 border border-[rgba(255,45,85,0.12)]">
          <span className="text-[10px] uppercase font-bold text-[#83686e] tracking-wider block mb-1">
            Last Synced
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-[#fff2f4] block font-mono mt-0.5">
            {formatSyncTime(lastSynced)}
          </span>
        </div>
      </div>

      {/* INITIAL LOADING SKELETON */}
      {loadingFirst && rows.length === 0 ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="h-12 rounded-xl bg-white/[0.03] animate-pulse border border-white/5" />
          ))}
          {showWakeupNotice && (
            <p className="text-center text-xs font-semibold text-[#ff8ca3] animate-pulse pt-2">
              Waking up the server, this can take up to 30 seconds...
            </p>
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-[#b89fa5] flex flex-col items-center justify-center gap-3">
          <Mail className="w-8 h-8 text-[rgba(255,45,85,0.35)] stroke-[1.5]" />
          <p className="text-xs font-bold text-[#b89fa5]">
            No {providerLabel} payment emails found in the last 30 days.
          </p>
          {canLoadOlder && (
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={loadingOlder}
              className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,45,85,0.12)] border border-[rgba(255,45,85,0.3)] text-xs font-extrabold text-[#fff2f4] hover:bg-[rgba(255,45,85,0.22)] active:scale-95 transition-all cursor-pointer"
            >
              {loadingOlder ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff4d6d]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#ff4d6d]" />
              )}
              <span>Load older emails</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* TOOLBAR: SEARCH FILTER & EXPORT CSV */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#83686e]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(25);
                }}
                placeholder="Filter sender, reference, amount..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-[rgba(255,45,85,0.15)] text-xs text-[#fff2f4] placeholder-[#83686e] focus:outline-none focus:border-[#ff4d6d]/60 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-black/50 border border-[rgba(255,45,85,0.2)] text-xs font-extrabold text-[#fff2f4] hover:bg-[rgba(255,45,85,0.15)] hover:border-[rgba(255,45,85,0.35)] active:scale-95 transition-all cursor-pointer whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            >
              <Download className="w-3.5 h-3.5 text-[#ff4d6d]" />
              <span>Export CSV</span>
            </button>
          </div>

          {filteredRows.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#83686e]">
              No transactions match your search filter.
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-[rgba(255,45,85,0.12)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black/60 border-b border-[rgba(255,45,85,0.12)] text-[#83686e] text-[10px] uppercase font-extrabold tracking-wider">
                      <th className="py-3 px-4">Sender</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Purpose</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,45,85,0.07)]">
                    {shownRows.map((tx, idx) => {
                      const amt = Number(tx.amount || 0);
                      const isDecimal = amt % 1 !== 0;
                      const amtStr = isDecimal ? amt.toFixed(2) : amt.toString();
                      return (
                        <tr key={tx.reference || tx.message_id || `${tx.date}_${idx}`} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#fff2f4] whitespace-nowrap">
                            {tx.sender || 'NA'}
                          </td>
                          <td className="py-3 px-4 font-black text-[#2bf29a] whitespace-nowrap">
                            ₹{amtStr}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-[#b89fa5] whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => copyReference(tx.reference || tx.alt_reference || '')}
                              className="inline-flex items-center gap-1.5 hover:text-white transition-colors group cursor-pointer"
                              title="Click to copy reference"
                            >
                              <span>{tx.reference || tx.alt_reference || '—'}</span>
                              <Copy className="w-3 h-3 text-[#ff4d6d]/60 group-hover:text-[#ff4d6d]" />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-[#b89fa5] whitespace-nowrap">
                            {tx.purpose || '—'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#83686e] whitespace-nowrap">
                            {formatTxDate(tx.date)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE STACKED CARDS */}
              <div className="sm:hidden space-y-2.5 w-full min-w-0 max-w-full overflow-hidden">
                {shownRows.map((tx, idx) => {
                  const amt = Number(tx.amount || 0);
                  const isDecimal = amt % 1 !== 0;
                  const amtStr = isDecimal ? amt.toFixed(2) : amt.toString();
                  return (
                    <div
                      key={tx.reference || tx.message_id || `${tx.date}_${idx}`}
                      className="p-3.5 rounded-xl bg-black/40 border border-[rgba(255,45,85,0.12)] space-y-2 min-w-0 max-w-full overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-xs font-bold text-[#fff2f4] truncate">
                          {tx.sender || 'NA'}
                        </span>
                        <span className="text-xs font-black text-[#2bf29a] shrink-0">
                          ₹{amtStr}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#b89fa5] min-w-0">
                        <button
                          type="button"
                          onClick={() => copyReference(tx.reference || tx.alt_reference || '')}
                          className="font-mono text-xs inline-flex items-center gap-1.5 hover:text-white min-w-0 truncate"
                        >
                          <span className="truncate">{tx.reference || tx.alt_reference || '—'}</span>
                          <Copy className="w-3 h-3 text-[#ff4d6d] shrink-0" />
                        </button>
                        <span className="text-[10.5px] font-mono text-[#83686e] shrink-0">
                          {formatTxDate(tx.date)}
                        </span>
                      </div>
                      {tx.purpose && (
                        <div className="text-[10.5px] text-[#83686e] truncate">
                          Purpose: <span className="text-[#b89fa5]">{tx.purpose}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* SHOW MORE */}
              {filteredRows.length > visibleCount && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + 25)}
                    className="px-4 py-2 rounded-xl bg-black/50 border border-[rgba(255,45,85,0.2)] text-xs font-bold text-[#ff8ca3] hover:text-white hover:border-[rgba(255,45,85,0.4)] transition-all cursor-pointer"
                  >
                    Show more ({Math.min(visibleCount, filteredRows.length)} of {filteredRows.length})
                  </button>
                </div>
              )}
            </>
          )}

          {/* LOAD OLDER EMAILS */}
          <div className="mt-5 pt-4 border-t border-[rgba(255,45,85,0.12)] flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={!canLoadOlder || loadingOlder || syncing || loadingFirst}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.25)] text-xs font-extrabold text-[#fff2f4] hover:bg-[rgba(255,45,85,0.15)] hover:border-[rgba(255,45,85,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.1)]"
            >
              {loadingOlder ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff4d6d]" />
                  <span>Loading older emails...</span>
                </>
              ) : canLoadOlder ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-[#ff4d6d]" />
                  <span>{lastWindowZeroCount ? 'No emails in this period, load older again' : 'Load older emails'}</span>
                </>
              ) : (
                <span>No older emails available</span>
              )}
            </button>
            <span className="text-[11px] text-[#83686e] font-mono">
              {formatDisplayDate(rows.length > 0 ? rows[rows.length - 1].date : nextBefore)
                ? `Showing emails back to ${formatDisplayDate(rows.length > 0 ? rows[rows.length - 1].date : nextBefore)}`
                : canLoadOlder
                ? 'Load earlier 30-day email windows'
                : 'No older emails available'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
