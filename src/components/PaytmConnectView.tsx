import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, ShieldCheck,
  X, Check, RefreshCw, Eye, EyeOff, Lock, Info, AlertTriangle
} from 'lucide-react';
import { PaytmIcon } from './BrandIcons';
import { CurrentPlanState, PlanDefinition } from '../types';
import {
  ShowToastFn,
  getRequiredPlanName,
  notifyApiOrPlanError
} from '../services/plans.service';
import {
  CashierAccount,
  getCashierList,
  addPaytmMidAccount,
  toggleCashier,
  deleteCashier,
  getCashierProviderMeta
} from '../services/cashier.service';
import CashierHistoryPanel from './CashierHistoryPanel';

interface PaytmConnectViewProps {
  onViewChange?: (view: string) => void;
  showToast?: ShowToastFn;
  onCashierChanged?: () => void;
  planState?: CurrentPlanState | null;
  plansCatalog?: PlanDefinition[];
}

const isValidUpiId = (val: string): boolean => {
  const parts = val.trim().split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0 && !/\s/.test(val);
};

export default function PaytmConnectView({
  onViewChange,
  showToast,
  onCashierChanged,
  planState,
  plansCatalog,
}: PaytmConnectViewProps) {
  const notify: ShowToastFn = (msg, type = 'info', action) => {
    showToast?.(msg, type, action);
  };

  const [accounts, setAccounts] = useState<CashierAccount[]>([]);
  const [otherActiveAccount, setOtherActiveAccount] = useState<CashierAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Add MID modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [paytmMid, setPaytmMid] = useState('');
  const [paytmMerchantKey, setPaytmMerchantKey] = useState('');
  const [showMerchantKey, setShowMerchantKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation modal
  const [deleteModalAcc, setDeleteModalAcc] = useState<CashierAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const rawList = await getCashierList();
      const activeOther = rawList.find(acc => {
        const isAct = Boolean(acc.is_active ?? acc.isActive);
        const typ = (acc.type || '').toLowerCase();
        return isAct && typ !== 'paytm' && typ !== 'paytm_mid';
      }) || null;
      setOtherActiveAccount(activeOther);

      const paytmAccounts = rawList.filter(acc => {
        const typ = (acc.type || '').toLowerCase();
        return typ === 'paytm' || typ === 'paytm_mid';
      });
      setAccounts(paytmAccounts);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load Paytm accounts';
      notify(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const midAccounts = accounts.filter(a => (a.type || '').toLowerCase() === 'paytm_mid');
  const legacyAccounts = accounts.filter(a => (a.type || '').toLowerCase() === 'paytm');
  const activeMidAccount = midAccounts.find(acc => Boolean(acc.is_active ?? acc.isActive)) || null;
  const maxAccounts: number | null = planState?.plan?.accounts
    ? planState.plan.accounts.paytm_mid
    : 1;
  const isAtLimit = maxAccounts !== null && midAccounts.length >= maxAccounts;
  const nextPlanName = getRequiredPlanName(
    plansCatalog || [],
    (p) => p.accounts?.paytm_mid === null || Number(p.accounts?.paytm_mid || 0) > (maxAccounts ?? 0),
    'BASIC'
  );

  const clearSecrets = () => {
    setPaytmMerchantKey('');
    setShowMerchantKey(false);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    clearSecrets();
  };

  const openAddModal = () => {
    if (isAtLimit) {
      notify(
        `Your ${planState?.plan?.name || 'FREE'} plan allows ${maxAccounts} Paytm MID account${maxAccounts === 1 ? '' : 's'}.`,
        'error',
        onViewChange ? { label: 'Upgrade', onClick: () => onViewChange('pricing') } : undefined
      );
      return;
    }
    setUpiId('');
    setPhone('');
    setPaytmMid('');
    clearSecrets();
    setIsAddModalOpen(true);
  };

  const handleMidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAtLimit) {
      notify(
        `Your ${planState?.plan?.name || 'FREE'} plan allows ${maxAccounts} Paytm MID account${maxAccounts === 1 ? '' : 's'}.`,
        'error',
        onViewChange ? { label: 'Upgrade', onClick: () => onViewChange('pricing') } : undefined
      );
      return;
    }

    const upiClean = upiId.trim();
    const phoneClean = phone.trim().replace(/\D/g, '');
    const midClean = paytmMid.trim();
    const keyClean = paytmMerchantKey;

    if (!isValidUpiId(upiClean)) {
      notify('Please enter a valid UPI ID (e.g. merchant@paytm)', 'error');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      notify('Enter a valid 10-digit Indian mobile number starting with 6–9', 'error');
      return;
    }
    if (!/^[A-Za-z0-9]{6,30}$/.test(midClean)) {
      notify('Merchant ID (MID) must be 6 to 30 letters or digits', 'error');
      return;
    }
    if (keyClean.length !== 16) {
      notify('Paytm Merchant Key must be strictly 16 characters', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addPaytmMidAccount({
        upi_id: upiClean,
        phone: phoneClean,
        paytm_mid: midClean,
        paytm_merchant_key: keyClean,
      });

      clearSecrets();
      notify('Paytm Business MID account connected successfully!', 'success');
      closeAddModal();
      await loadAccounts();
      setHistoryRefreshKey(k => k + 1);
      onCashierChanged?.();
    } catch (err: unknown) {
      notifyApiOrPlanError(
        err,
        'Failed to verify Paytm MID credentials',
        showToast,
        onViewChange ? () => onViewChange('pricing') : undefined
      );
    } finally {
      clearSecrets();
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (account: CashierAccount) => {
    const accId = account.id || account._id;
    if (!accId) return;

    setIsTogglingId(accId);
    try {
      await toggleCashier(accId);
      notify('Active payment account updated', 'success');
      await loadAccounts();
      setHistoryRefreshKey(k => k + 1);
      onCashierChanged?.();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to update account status';
      notify(msg, 'error');
    } finally {
      setIsTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalAcc) return;
    const accId = deleteModalAcc.id || deleteModalAcc._id;
    if (!accId) return;

    setIsDeleting(true);
    try {
      await deleteCashier(accId);
      notify('Paytm account removed successfully', 'success');
      setDeleteModalAcc(null);
      await loadAccounts();
      setHistoryRefreshKey(k => k + 1);
      onCashierChanged?.();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to delete account';
      notify(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const otherLabel = otherActiveAccount
    ? getCashierProviderMeta(otherActiveAccount.type).label
    : 'another provider';

  return (
    <div className="min-h-screen bg-[#070102] text-[#fff2f4] font-sans antialiased selection:bg-rose-500 selection:text-white">
      <main className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-[46px] h-[46px] rounded-[13px] bg-white border border-sky-400/50 flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(0,186,242,0.35)]">
              <PaytmIcon className="w-[24px] h-[24px]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#fff2f4]">
                  Paytm Connect
                </h1>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 tracking-wider">
                  Business MID API
                </span>
              </div>
              <p className="text-xs text-[#b89fa5] leading-relaxed mt-0.5">
                Connect your Paytm Business MID and Merchant Key for instant UPI payment routing and status verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,45,85,0.08)] border border-[rgba(255,45,85,0.25)] text-xs font-bold text-[#ff8ca3]">
              <span>
                {maxAccounts === null
                  ? 'Unlimited Accounts'
                  : `${midAccounts.length} of ${maxAccounts} account${maxAccounts === 1 ? '' : 's'}`}
              </span>
              {maxAccounts === null && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="text-white font-mono">{midAccounts.length}</span>
                </>
              )}
            </div>

            {isAtLimit && onViewChange ? (
              <button
                onClick={() => onViewChange('pricing')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[11px] text-[13.5px] font-extrabold text-amber-200 bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 transition-all duration-200 whitespace-nowrap tracking-tight cursor-pointer"
              >
                <Lock className="w-[14px] h-[14px]" />
                Upgrade to {nextPlanName}
              </button>
            ) : (
              <button
                onClick={openAddModal}
                disabled={isAtLimit}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[11px] text-[13.5px] font-extrabold text-white transition-all duration-200 whitespace-nowrap tracking-tight ${
                  isAtLimit
                    ? 'opacity-50 cursor-not-allowed bg-slate-800'
                    : 'bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] shadow-[0_8px_24px_rgba(255,30,75,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(255,30,75,0.55)] active:translate-y-0 cursor-pointer'
                }`}
              >
                <Plus className="w-[15px] h-[15px] stroke-[2.8]" />
                Add Paytm Account
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE OTHER PROVIDER BANNER */}
        {otherActiveAccount && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5 text-xs text-amber-200">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">{otherLabel}</strong> is currently active — switching will route customers to this account.
            </span>
          </div>
        )}

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5 items-start">
          {/* LEFT PANEL: CONNECTED ACCOUNTS */}
          <div className="p-4 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)] transition-colors hover:border-[rgba(255,60,95,0.45)] space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[rgba(255,45,85,0.12)] mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-extrabold tracking-tight text-[#fff2f4]">
                    Connected Paytm (MID) Accounts
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#ff1e4b]/15 text-[#ff8ca3] border border-[#ff1e4b]/30">
                    {midAccounts.length}
                  </span>
                </div>
                <span className="text-[11.5px] font-extrabold px-3 py-1 rounded-full bg-[rgba(255,30,75,0.08)] border border-[rgba(255,45,85,0.28)] text-[#b89fa5] tracking-wide">
                  {maxAccounts === null ? 'Unlimited accounts' : `${midAccounts.length} of ${maxAccounts} account${maxAccounts === 1 ? '' : 's'}`}
                </span>
              </div>

              {isLoading ? (
                <div className="py-16 text-center text-[#b89fa5] flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#ff1e4b]" />
                  <span className="text-xs font-semibold">Loading connected accounts...</span>
                </div>
              ) : midAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-14 px-4 gap-3.5">
                  <div className="w-[60px] h-[60px] rounded-2xl bg-white border border-sky-400/40 flex items-center justify-center mb-1 shadow-[0_0_18px_rgba(0,186,242,0.2)]">
                    <PaytmIcon className="w-8 h-8" />
                  </div>
                  <p className="text-[13.5px] font-bold text-[#b89fa5] leading-relaxed max-w-[360px]">
                    No Paytm MID accounts connected yet — add your Paytm Business MID and Merchant Key to accept UPI payments.
                  </p>
                  <button
                    onClick={openAddModal}
                    className="mt-1 text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 underline underline-offset-4 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Connect Paytm MID
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {midAccounts.map(acc => {
                    const accId = acc.id || acc._id || '';
                    const isActive = Boolean(acc.is_active ?? acc.isActive);
                    const upi = acc.upi_id || acc.upiId || 'Paytm UPI';
                    const isToggling = isTogglingId === accId;

                    return (
                      <div
                        key={accId}
                        className={`p-4 rounded-xl border transition-all duration-200 flex flex-col gap-3 ${
                          isActive
                            ? 'bg-[rgba(255,30,75,0.08)] border-[rgba(255,45,85,0.45)] shadow-[0_4px_20px_rgba(255,30,75,0.15)]'
                            : 'bg-black/40 border-[rgba(255,45,85,0.12)] hover:border-[rgba(255,45,85,0.25)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              isActive
                                ? 'bg-white border-[#2bf29a]/60 shadow-[0_0_12px_rgba(43,242,154,0.25)]'
                                : 'bg-white border-sky-400/35'
                            }`}>
                              <PaytmIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-extrabold text-[#fff2f4] font-mono truncate">
                                  {upi}
                                </span>
                                <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border bg-sky-500/15 text-sky-300 border-sky-500/30">
                                  MID API
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-[#b89fa5] block">
                                Phone: {acc.phone}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggle(acc)}
                              disabled={isToggling}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold transition-all active:scale-95 cursor-pointer ${
                                isActive
                                  ? 'bg-[#2bf29a]/15 text-[#2bf29a] border border-[#2bf29a]/40 shadow-[0_0_12px_rgba(43,242,154,0.25)]'
                                  : 'bg-slate-800/80 text-[#b89fa5] border border-slate-700/60 hover:text-white'
                              }`}
                              title={isActive ? 'Currently Active' : 'Set as Active'}
                            >
                              {isToggling ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : isActive ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-[#2bf29a] animate-pulse" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                                  <span>Set active</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setDeleteModalAcc(acc)}
                              className="p-1.5 rounded-lg text-[#83686e] hover:text-[#ff1e4b] hover:bg-rose-500/10 transition-all ml-1 cursor-pointer"
                              title="Remove Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] bg-black/35 p-2.5 rounded-lg border border-white/5">
                          <div>
                            <span className="text-[#83686e] text-[9.5px] uppercase font-bold tracking-wider block">
                              Merchant ID (MID)
                            </span>
                            <span className="font-mono text-[#fff2f4] truncate block">
                              {acc.paytm_mid ? `MID: ${acc.paytm_mid}` : 'Paytm Business MID API'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#83686e] text-[9.5px] uppercase font-bold tracking-wider block">Checkout Status</span>
                            <span className={`font-semibold ${isActive ? 'text-[#2bf29a]' : 'text-[#83686e]'}`}>
                              {isActive ? 'Routing Active' : 'Standby'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LEGACY UNSUPPORTED ACCOUNTS BOX */}
            {legacyAccounts.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-extrabold text-amber-200">
                      Old Paytm accounts (legacy, no longer supported)
                    </h4>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      Reconnect Paytm using MID to continue accepting Paytm UPI payments.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {legacyAccounts.map(acc => {
                    const accId = acc.id || acc._id || '';
                    return (
                      <div
                        key={accId}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/40 border border-white/10"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold text-slate-300 truncate">
                            {acc.upi_id || acc.upiId || 'Paytm UPI'}
                          </div>
                          <div className="text-[10.5px] font-mono text-slate-500">
                            {acc.phone} · Unsupported
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteModalAcc(acc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[11px] font-bold text-rose-300 transition cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE INSTRUCTIONS */}
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)]">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-sky-500/20 mb-4">
                <div className="w-[30px] h-[30px] rounded-[9px] bg-sky-500/15 border border-sky-500/35 text-sky-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-[16px] h-[16px] stroke-[2.2]" />
                </div>
                <div className="text-[14.5px] font-black text-sky-400 tracking-tight">
                  Paytm MID Guide
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-[#b89fa5]">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                  <span>
                    Enter your <strong className="text-white">Paytm UPI ID</strong> and registered 10-digit Indian mobile number.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                  <span>
                    Find MID and Merchant Key in <strong className="text-white">Paytm Business dashboard → Developer Settings → API Keys</strong>. The key is stored encrypted and only used to check payment status.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                  <span>
                    Click <strong className="text-[#2bf29a]">Set active</strong> to route customer checkouts directly to your Paytm MID account.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HISTORY SECTION (shows NOT_SUPPORTED info card cleanly for paytm_mid) */}
        <CashierHistoryPanel
          activeAccount={activeMidAccount}
          providerLabel="Paytm (MID)"
          csvFilename="hamropay-paytm-history.csv"
          hasOtherActiveAccount={Boolean(otherActiveAccount)}
          otherActiveProviderLabel={otherLabel}
          showToast={notify}
          onReconnect={openAddModal}
          refreshTrigger={historyRefreshKey}
        />
      </main>

      {/* ADD PAYTM MID MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120306] border border-[rgba(255,45,85,0.3)] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,45,85,0.15)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-sky-400/45 flex items-center justify-center">
                  <PaytmIcon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fff2f4]">Add Paytm (MID) Account</h3>
                  <span className="text-[10px] text-sky-300 font-bold">Official Business API</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="text-[#b89fa5] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMidSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  Paytm UPI ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. merchant@paytm"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                />
              </div>

              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  Registered Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit number starting with 6–9"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                />
              </div>

              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  Merchant ID (MID) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  placeholder="6–30 alphanumeric characters"
                  value={paytmMid}
                  onChange={e => setPaytmMid(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                  className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                />
              </div>

              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  Merchant Key *
                </label>
                <div className="relative">
                  <input
                    type={showMerchantKey ? 'text' : 'password'}
                    required
                    maxLength={16}
                    autoComplete="off"
                    placeholder="16-character Merchant Key"
                    value={paytmMerchantKey}
                    onChange={e => setPaytmMerchantKey(e.target.value)}
                    className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 pr-10 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMerchantKey(!showMerchantKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#83686e] hover:text-white cursor-pointer"
                  >
                    {showMerchantKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#83686e] mt-1.5 flex items-start gap-1 leading-relaxed">
                  <Lock className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    Find MID and Merchant Key in Paytm Business dashboard → Developer Settings → API Keys. The key is stored encrypted and only used to check payment status.
                  </span>
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#b89fa5] font-bold hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white font-extrabold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verify &amp; Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalAcc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120306] border border-rose-500/30 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#fff2f4]">Delete Account?</h3>
                <p className="text-[11px] text-[#b89fa5]">This will disconnect the Paytm cashier.</p>
              </div>
            </div>

            <p className="text-xs text-[#b89fa5] leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{deleteModalAcc.upi_id || deleteModalAcc.upiId}</strong> ({deleteModalAcc.phone})?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteModalAcc(null)}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-bold text-[#b89fa5] hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold text-white shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
