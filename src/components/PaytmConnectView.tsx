import React, { useState, useEffect } from 'react';
import {
  CreditCard, Plus, Trash2, ShieldCheck, ArrowRight, ArrowLeft,
  X, Check, RefreshCw, Eye, EyeOff, Lock
} from 'lucide-react';
import {
  CashierAccount,
  getCashierList,
  addPaytmMidAccount,
  addPaytmGmailAccount,
  toggleCashier,
  deleteCashier,
  getCashierProviderMeta
} from '../services/cashier.service';
import CashierHistoryPanel from './CashierHistoryPanel';

interface PaytmConnectViewProps {
  onViewChange?: (view: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onCashierChanged?: () => void;
}

type PaytmMode = 'paytm_mid' | 'paytm';

const isValidUpiId = (val: string): boolean => {
  const parts = val.trim().split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0 && !/\s/.test(val);
};

export default function PaytmConnectView({
  showToast,
  onCashierChanged,
}: PaytmConnectViewProps) {
  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    showToast?.(msg, type);
  };

  const [accounts, setAccounts] = useState<CashierAccount[]>([]);
  const [otherActiveAccount, setOtherActiveAccount] = useState<CashierAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Add modal & mode tab
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [connectMode, setConnectMode] = useState<PaytmMode>('paytm_mid');
  const [gmailStep, setGmailStep] = useState<1 | 2>(1);

  // Shared fields
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');

  // Paytm MID fields (Merchant Key kept purely in temporary state, cleared immediately on submit/close)
  const [paytmMid, setPaytmMid] = useState('');
  const [paytmMerchantKey, setPaytmMerchantKey] = useState('');
  const [showMerchantKey, setShowMerchantKey] = useState(false);

  // Paytm Gmail fields
  const [gmailEmail, setGmailEmail] = useState('');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [showAppPassword, setShowAppPassword] = useState(false);

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
  const gmailAccounts = accounts.filter(a => (a.type || '').toLowerCase() === 'paytm');
  const activeAccount = accounts.find(acc => Boolean(acc.is_active ?? acc.isActive)) || null;

  const clearSecrets = () => {
    setPaytmMerchantKey('');
    setGmailAppPassword('');
    setShowMerchantKey(false);
    setShowAppPassword(false);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    clearSecrets();
  };

  const openAddModal = (preferredMode: PaytmMode = 'paytm_mid') => {
    const modeToUse =
      preferredMode === 'paytm_mid' && midAccounts.length >= 3 && gmailAccounts.length < 3
        ? 'paytm'
        : preferredMode === 'paytm' && gmailAccounts.length >= 3 && midAccounts.length < 3
        ? 'paytm_mid'
        : preferredMode;

    if (midAccounts.length >= 3 && gmailAccounts.length >= 3) {
      notify('Maximum 3 accounts reached for both Paytm MID and Paytm Gmail.', 'error');
      return;
    }

    setConnectMode(modeToUse);
    setGmailStep(1);
    setUpiId('');
    setPhone('');
    setPaytmMid('');
    setGmailEmail('');
    clearSecrets();
    setIsAddModalOpen(true);
  };

  const handleReconnect = () => {
    if (activeAccount && (activeAccount.type || '').toLowerCase() === 'paytm') {
      setConnectMode('paytm');
      setUpiId(activeAccount.upi_id || activeAccount.upiId || '');
      setPhone(activeAccount.phone || '');
      setGmailEmail(activeAccount.gmail_email || activeAccount.gmail || activeAccount.email || '');
      clearSecrets();
      setGmailStep(2);
      setIsAddModalOpen(true);
    } else {
      openAddModal('paytm');
    }
  };

  const handleMidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (midAccounts.length >= 3) {
      notify('Maximum 3 Paytm MID accounts allowed.', 'error');
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
      const msg = (err as { message?: string })?.message || 'Failed to verify Paytm MID credentials';
      notify(msg, 'error');
    } finally {
      clearSecrets();
      setIsSubmitting(false);
    }
  };

  const handleGmailStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (gmailAccounts.length >= 3) {
      notify('Maximum 3 Paytm Gmail accounts allowed.', 'error');
      return;
    }

    const upiClean = upiId.trim();
    const phoneClean = phone.trim().replace(/\D/g, '');

    if (!isValidUpiId(upiClean)) {
      notify('Please enter a valid Paytm UPI ID (e.g. 9876543210@paytm)', 'error');
      return;
    }
    if (!/^\d{10}$/.test(phoneClean)) {
      notify('Please enter a valid 10-digit registered mobile number', 'error');
      return;
    }
    setGmailStep(2);
  };

  const handleGmailStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = gmailEmail.trim();
    const passClean = gmailAppPassword.trim();
    const passNoSpaces = passClean.replace(/\s+/g, '');

    if (!emailClean || !emailClean.includes('@')) {
      notify('Please enter a valid Gmail address', 'error');
      return;
    }
    if (passNoSpaces.length !== 16) {
      notify('Google App Password must be 16 characters', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addPaytmGmailAccount({
        upi_id: upiId.trim(),
        phone: phone.trim().replace(/\D/g, ''),
        gmail_email: emailClean,
        gmail_app_password: passClean,
      });

      clearSecrets();
      notify('Paytm Gmail account verified & connected successfully!', 'success');
      closeAddModal();
      setGmailStep(1);
      await loadAccounts();
      setHistoryRefreshKey(k => k + 1);
      onCashierChanged?.();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to verify & save Paytm Gmail account';
      notify(msg, 'error');
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

  const bothFull = midAccounts.length >= 3 && gmailAccounts.length >= 3;

  return (
    <div className="min-h-screen bg-[#070102] text-[#fff2f4] font-sans antialiased selection:bg-rose-500 selection:text-white">
      <main className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-[46px] h-[46px] rounded-[13px] bg-gradient-to-br from-[#00baf2] to-[#007eb8] flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(0,186,242,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]">
              <CreditCard className="w-[22px] h-[22px] text-white stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#fff2f4]">
                  Paytm Connect
                </h1>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 tracking-wider">
                  MID API &amp; Gmail
                </span>
              </div>
              <p className="text-xs text-[#b89fa5] leading-relaxed mt-0.5">
                Connect Paytm Business via official MID + Merchant Key (recommended) or Paytm via Gmail alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,45,85,0.08)] border border-[rgba(255,45,85,0.25)] text-xs font-bold text-[#ff8ca3]">
              <span>MID {midAccounts.length}/3</span>
              <span className="text-white/40">•</span>
              <span>Gmail {gmailAccounts.length}/3</span>
            </div>

            <button
              onClick={() => openAddModal('paytm_mid')}
              disabled={bothFull}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[11px] text-[13.5px] font-extrabold text-white transition-all duration-200 whitespace-nowrap tracking-tight ${
                bothFull
                  ? 'opacity-50 cursor-not-allowed bg-slate-800'
                  : 'bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] shadow-[0_8px_24px_rgba(255,30,75,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(255,30,75,0.55)] active:translate-y-0 cursor-pointer'
              }`}
            >
              <Plus className="w-[15px] h-[15px] stroke-[2.8]" />
              Add Paytm Account
            </button>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5 items-start">
          {/* LEFT PANEL: CONNECTED ACCOUNTS */}
          <div className="p-4 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)] transition-colors hover:border-[rgba(255,60,95,0.45)]">
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[rgba(255,45,85,0.12)] mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-extrabold tracking-tight text-[#fff2f4]">
                  Connected Paytm Accounts
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#ff1e4b]/15 text-[#ff8ca3] border border-[#ff1e4b]/30">
                  {accounts.length}
                </span>
              </div>
              <span className="text-[11.5px] font-extrabold px-3 py-1 rounded-full bg-[rgba(255,30,75,0.08)] border border-[rgba(255,45,85,0.28)] text-[#b89fa5] tracking-wide">
                Max 3 per type
              </span>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-[#b89fa5] flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#ff1e4b]" />
                <span className="text-xs font-semibold">Loading connected accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14 px-4 gap-3.5">
                <div className="w-[60px] h-[60px] rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400/60 mb-1">
                  <CreditCard className="w-8 h-8 stroke-[1.5]" />
                </div>
                <p className="text-[13.5px] font-bold text-[#b89fa5] leading-relaxed max-w-[360px]">
                  No Paytm accounts connected yet — connect Paytm Business MID (recommended) or Paytm via Gmail to accept UPI payments.
                </p>
                <div className="flex items-center gap-3 flex-wrap justify-center mt-1">
                  <button
                    onClick={() => openAddModal('paytm_mid')}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 underline underline-offset-4 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Connect Paytm MID
                  </button>
                  <span className="text-white/20">•</span>
                  <button
                    onClick={() => openAddModal('paytm')}
                    className="text-xs font-bold text-[#ff4d6d] hover:text-[#ff1e4b] flex items-center gap-1.5 underline underline-offset-4 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Connect via Gmail
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {accounts.map(acc => {
                  const accId = acc.id || acc._id || '';
                  const isActive = Boolean(acc.is_active ?? acc.isActive);
                  const isMid = (acc.type || '').toLowerCase() === 'paytm_mid';
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
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            isActive
                              ? 'bg-[#2bf29a]/15 text-[#2bf29a] border border-[#2bf29a]/30'
                              : 'bg-slate-800 text-[#b89fa5]'
                          }`}>
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-[#fff2f4] font-mono truncate">
                                {upi}
                              </span>
                              <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                isMid
                                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}>
                                {isMid ? 'MID API' : 'Gmail'}
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
                            {isMid ? 'Verification Mode' : 'Connected Email'}
                          </span>
                          <span className="font-mono text-[#fff2f4] truncate block">
                            {isMid
                              ? (acc.paytm_mid ? `MID: ${acc.paytm_mid}` : 'Paytm Business MID API')
                              : (acc.gmail_email || acc.gmail || acc.email || 'Not configured')}
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

          {/* RIGHT SIDE GUIDE */}
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)]">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-sky-500/20 mb-4">
                <div className="w-[30px] h-[30px] rounded-[9px] bg-sky-500/15 border border-sky-500/35 text-sky-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-[16px] h-[16px] stroke-[2.2]" />
                </div>
                <div className="text-[14.5px] font-black text-sky-400 tracking-tight">
                  Paytm Cashier Options
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-[#b89fa5]">
                <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-1">
                  <div className="font-extrabold text-sky-300 flex items-center gap-1.5">
                    <span>Paytm MID (Recommended)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Uses your Paytm Business Merchant ID &amp; 16-char Merchant Key from{' '}
                    <strong className="text-white">Paytm Business Dashboard → Developer Settings → API Keys</strong>. Each checkout embeds a unique reference for fast, reliable verification.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="font-extrabold text-white">Paytm via Gmail</div>
                  <p className="text-[11px] leading-relaxed">
                    Reads Paytm payment notification emails from your connected Gmail using a 16-character Google App Password.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HISTORY SECTION (handles paytm_mid NOT_SUPPORTED vs paytm Gmail gracefully) */}
        <CashierHistoryPanel
          activeAccount={activeAccount}
          providerLabel="Paytm"
          csvFilename="hamropay-paytm-emails.csv"
          hasOtherActiveAccount={Boolean(otherActiveAccount)}
          otherActiveProviderLabel={otherLabel}
          showToast={notify}
          onReconnect={handleReconnect}
          refreshTrigger={historyRefreshKey}
        />
      </main>

      {/* ADD PAYTM MODAL WITH SEGMENTED MODE TABS */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120306] border border-[rgba(255,45,85,0.3)] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,45,85,0.15)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fff2f4]">Add Paytm Account</h3>
                  <span className="text-[10px] text-[#ff8ca3] font-bold">
                    {connectMode === 'paytm_mid' ? 'Official Business API' : `Gmail Setup · Step ${gmailStep} of 2`}
                  </span>
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

            {/* SEGMENTED TABS */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)]">
              <button
                type="button"
                disabled={isSubmitting || midAccounts.length >= 3}
                onClick={() => {
                  setConnectMode('paytm_mid');
                  clearSecrets();
                }}
                className={`py-2 px-2.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer disabled:opacity-50 ${
                  connectMode === 'paytm_mid'
                    ? 'bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white shadow'
                    : 'text-[#b89fa5] hover:text-white'
                }`}
              >
                Paytm MID (Recommended)
              </button>
              <button
                type="button"
                disabled={isSubmitting || gmailAccounts.length >= 3}
                onClick={() => {
                  setConnectMode('paytm');
                  setGmailStep(1);
                  clearSecrets();
                }}
                className={`py-2 px-2.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer disabled:opacity-50 ${
                  connectMode === 'paytm'
                    ? 'bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white shadow'
                    : 'text-[#b89fa5] hover:text-white'
                }`}
              >
                Paytm via Gmail
              </button>
            </div>

            {connectMode === 'paytm_mid' ? (
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
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                  />
                  <p className="text-[10px] text-[#83686e] mt-1">
                    10-digit Indian mobile number starting with 6–9.
                  </p>
                </div>

                <div>
                  <label className="block text-[#b89fa5] font-bold mb-1">
                    Merchant ID (MID) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="e.g. MERCH1234567890"
                    value={paytmMid}
                    onChange={e => setPaytmMid(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                    className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                  />
                  <p className="text-[10px] text-[#83686e] mt-1">
                    6–30 alphanumeric characters from Paytm Business Dashboard.
                  </p>
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
                  <p className="text-[10px] text-[#83686e] mt-1 leading-relaxed">
                    Find this in Paytm Business Dashboard → Developer Settings → API Keys.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[10.5px] text-sky-200 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span>Your key is stored encrypted and only used to check payment status.</span>
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
            ) : gmailStep === 1 ? (
              <form onSubmit={handleGmailStep1Next} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#b89fa5] font-bold mb-1">
                    Paytm UPI ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210@paytm"
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
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#b89fa5] font-bold hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white font-extrabold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleGmailStep2Submit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#b89fa5] font-bold mb-1">
                    Gmail Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. merchant@gmail.com"
                    value={gmailEmail}
                    onChange={e => setGmailEmail(e.target.value)}
                    className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] focus:outline-none focus:border-[#ff1e4b]"
                  />
                  <p className="text-[10px] text-[#83686e] mt-1">
                    Paytm payment alert emails are read from this Gmail.
                  </p>
                </div>

                <div>
                  <label className="block text-[#b89fa5] font-bold mb-1">
                    Google App Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showAppPassword ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      placeholder="16-character Google App Password"
                      value={gmailAppPassword}
                      onChange={e => setGmailAppPassword(e.target.value)}
                      className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 pr-10 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAppPassword(!showAppPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#83686e] hover:text-white cursor-pointer"
                    >
                      {showAppPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#83686e] mt-1">
                    Generate an App Password from Google Account → Security → 2-Step Verification → App Passwords.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setGmailStep(1)}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#b89fa5] font-bold hover:bg-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
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
            )}
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
