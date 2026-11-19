import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Plus, Trash2, ShieldCheck, ArrowRight, ArrowLeft,
  X, Check, RefreshCw, Eye, EyeOff, Info
} from 'lucide-react';
import {
  CashierAccount,
  getCashierList,
  addAmazonAccount,
  toggleCashier,
  deleteCashier,
  getCashierProviderMeta
} from '../services/cashier.service';
import CashierHistoryPanel from './CashierHistoryPanel';

interface AmazonConnectViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onViewChange?: (view: string) => void;
  onCashierChanged?: () => void;
}

const isValidUpiId = (val: string): boolean => {
  const parts = val.trim().split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0 && !/\s/.test(val);
};

export default function AmazonConnectView({
  showToast,
  onCashierChanged,
}: AmazonConnectViewProps) {
  const [accounts, setAccounts] = useState<CashierAccount[]>([]);
  const [otherActiveAccount, setOtherActiveAccount] = useState<CashierAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteModalAcc, setDeleteModalAcc] = useState<CashierAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 2-Step Add Form state
  const [step, setStep] = useState<1 | 2>(1);
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [gmailEmail, setGmailEmail] = useState('');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const rawList = await getCashierList();
      const activeOther = rawList.find(acc => {
        const isAct = Boolean(acc.is_active ?? acc.isActive);
        const typ = (acc.type || '').toLowerCase();
        return isAct && typ !== 'amazon';
      }) || null;
      setOtherActiveAccount(activeOther);

      const amazonAccounts = rawList.filter(acc => (acc.type || '').toLowerCase() === 'amazon');
      setAccounts(amazonAccounts);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load Amazon Pay accounts';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const activeAccount = accounts.find(acc => Boolean(acc.is_active ?? acc.isActive)) || null;

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setGmailAppPassword('');
    setShowPassword(false);
  };

  const openAddModal = () => {
    if (accounts.length >= 3) {
      showToast('Maximum 3 Amazon Pay accounts allowed.', 'error');
      return;
    }
    setStep(1);
    setUpiId('');
    setPhone('');
    setGmailEmail('');
    setGmailAppPassword('');
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const handleReconnect = () => {
    if (activeAccount) {
      setUpiId(activeAccount.upi_id || activeAccount.upiId || '');
      setPhone(activeAccount.phone || '');
      setGmailEmail(activeAccount.gmail_email || activeAccount.gmail || activeAccount.email || '');
      setGmailAppPassword('');
      setShowPassword(false);
      setStep(2);
      setIsAddModalOpen(true);
    } else {
      openAddModal();
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUpi = upiId.trim();
    if (finalUpi && !finalUpi.includes('@')) {
      finalUpi = `${finalUpi}@apl`;
      setUpiId(finalUpi);
    }
    const phoneClean = phone.trim().replace(/\D/g, '');

    if (!isValidUpiId(finalUpi)) {
      showToast('Please enter a valid Amazon Pay UPI ID (e.g. 9876543210@apl)', 'error');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      showToast('Enter a valid 10-digit Indian mobile number starting with 6–9', 'error');
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = gmailEmail.trim();
    const passClean = gmailAppPassword.trim();
    const passNoSpaces = passClean.replace(/\s+/g, '');

    if (!emailClean || !emailClean.includes('@')) {
      showToast('Please enter a valid Gmail address', 'error');
      return;
    }
    if (passNoSpaces.length !== 16) {
      showToast('Google App Password must be 16 characters', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalUpi = upiId.trim();
      if (!finalUpi.includes('@')) {
        finalUpi = `${finalUpi}@apl`;
      }

      await addAmazonAccount({
        upi_id: finalUpi,
        phone: phone.trim().replace(/\D/g, ''),
        gmail_email: emailClean,
        gmail_app_password: passClean,
      });

      setGmailAppPassword('');
      showToast('Amazon Pay account verified & connected successfully!', 'success');
      closeAddModal();
      setStep(1);
      await loadAccounts();
      setHistoryRefreshKey(k => k + 1);
      onCashierChanged?.();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to verify & save Amazon Pay account';
      showToast(msg, 'error');
    } finally {
      setGmailAppPassword('');
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (account: CashierAccount) => {
    const accId = account.id || account._id;
    if (!accId) return;

    setIsTogglingId(accId);
    try {
      await toggleCashier(accId);
      showToast('Active payment account updated', 'success');
      await loadAccounts();
      setHistoryRefreshKey(k => k + 1);
      onCashierChanged?.();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to update account status';
      showToast(msg, 'error');
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
      showToast('Amazon Pay account removed successfully', 'success');
      setDeleteModalAcc(null);
      await loadAccounts();
      setHistoryRefreshKey(k => k + 1);
      onCashierChanged?.();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to delete account';
      showToast(msg, 'error');
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
            <div className="w-[46px] h-[46px] rounded-[13px] bg-gradient-to-br from-[#ff9900] to-[#d97706] flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(255,153,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]">
              <ShoppingBag className="w-[22px] h-[22px] text-white stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#fff2f4]">
                  Amazon Pay Connect
                </h1>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 tracking-wider">
                  Wallet · Gmail
                </span>
              </div>
              <p className="text-xs text-[#b89fa5] leading-relaxed mt-0.5">
                Connect your Amazon Pay wallet UPI ID for automated Gmail top-up detection and direct settlements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,45,85,0.08)] border border-[rgba(255,45,85,0.25)] text-xs font-bold text-[#ff8ca3]">
              <span>Max 3 Accounts</span>
              <span className="text-white/40">•</span>
              <span className="text-white font-mono">{accounts.length}/3</span>
            </div>

            <button
              onClick={openAddModal}
              disabled={accounts.length >= 3}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[11px] text-[13.5px] font-extrabold text-white transition-all duration-200 whitespace-nowrap tracking-tight ${
                accounts.length >= 3
                  ? 'opacity-50 cursor-not-allowed bg-slate-800'
                  : 'bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] shadow-[0_8px_24px_rgba(255,30,75,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(255,30,75,0.55)] active:translate-y-0 cursor-pointer'
              }`}
            >
              <Plus className="w-[15px] h-[15px] stroke-[2.8]" />
              Add Amazon Pay Account
            </button>
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
          {/* LEFT PANEL: ACCOUNTS */}
          <div className="p-4 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)] transition-colors hover:border-[rgba(255,60,95,0.45)]">
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[rgba(255,45,85,0.12)] mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-extrabold tracking-tight text-[#fff2f4]">
                  Connected Amazon Pay Accounts
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#ff1e4b]/15 text-[#ff8ca3] border border-[#ff1e4b]/30">
                  {accounts.length}
                </span>
              </div>
              <span className="text-[11.5px] font-extrabold px-3 py-1 rounded-full bg-[rgba(255,30,75,0.08)] border border-[rgba(255,45,85,0.28)] text-[#b89fa5] tracking-wide">
                Max 3 accounts
              </span>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-[#b89fa5] flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#ff1e4b]" />
                <span className="text-xs font-semibold">Loading connected accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14 px-4 gap-3.5">
                <div className="w-[60px] h-[60px] rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400/60 mb-1">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <p className="text-[13.5px] font-bold text-[#b89fa5] leading-relaxed max-w-[340px]">
                  No Amazon Pay accounts connected yet — add one to start receiving UPI payments into your wallet.
                </p>
                <button
                  onClick={openAddModal}
                  className="mt-2 text-xs font-bold text-[#ff4d6d] hover:text-[#ff1e4b] flex items-center gap-1.5 underline decoration-[rgba(255,45,85,0.4)] underline-offset-4 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Connect Amazon Pay account now
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {accounts.map(acc => {
                  const accId = acc.id || acc._id || '';
                  const isActive = Boolean(acc.is_active ?? acc.isActive);
                  const upi = acc.upi_id || acc.upiId || 'Amazon Pay UPI';
                  const email = acc.gmail_email || acc.gmail || acc.email || 'Not configured';
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
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-extrabold text-[#fff2f4] font-mono block truncate">
                              {upi}
                            </span>
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
                          <span className="text-[#83686e] text-[9.5px] uppercase font-bold tracking-wider block">Connected Email</span>
                          <span className="font-mono text-[#fff2f4] truncate block">{email}</span>
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

          {/* RIGHT SIDE INSTRUCTIONS */}
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)]">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-amber-500/20 mb-4">
                <div className="w-[30px] h-[30px] rounded-[9px] bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-[16px] h-[16px] stroke-[2.2]" />
                </div>
                <div className="text-[14.5px] font-black text-amber-400 tracking-tight">
                  Amazon Pay Cashier Guide
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-[#b89fa5]">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                  <span>Enter your <strong className="text-white">Amazon Pay UPI ID</strong> (e.g. ending with @apl) and registered mobile number.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                  <span>Provide your <strong className="text-white">Gmail</strong> &amp; <strong className="text-white">App Password</strong> — Amazon Pay wallet top-up emails are read from this Gmail.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                  <span>Click <strong className="text-[#2bf29a]">Set active</strong> to route customer checkouts directly to this Amazon Pay account.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE EMAIL HISTORY SECTION */}
        <CashierHistoryPanel
          activeAccount={activeAccount}
          providerLabel="Amazon Pay"
          csvFilename="hamropay-amazon-emails.csv"
          hasOtherActiveAccount={Boolean(otherActiveAccount)}
          otherActiveProviderLabel={otherLabel}
          showToast={showToast}
          onReconnect={handleReconnect}
          refreshTrigger={historyRefreshKey}
        />
      </main>

      {/* 2-STEP ADD AMAZON PAY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120306] border border-[rgba(255,45,85,0.3)] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,45,85,0.15)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fff2f4]">Add Amazon Pay Account</h3>
                  <span className="text-[10px] text-[#ff8ca3] font-bold">Step {step} of 2</span>
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

            <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-bold">
              <div className={`py-1.5 rounded-lg border transition-all ${
                step === 1
                  ? 'bg-[#ff1e4b]/20 border-[#ff1e4b] text-white'
                  : 'bg-white/5 border-white/10 text-[#2bf29a]'
              }`}>
                1. Account Details
              </div>
              <div className={`py-1.5 rounded-lg border transition-all ${
                step === 2
                  ? 'bg-[#ff1e4b]/20 border-[#ff1e4b] text-white'
                  : 'bg-white/5 border-white/10 text-[#83686e]'
              }`}>
                2. Gmail Verification
              </div>
            </div>

            {step === 1 && (
              <form onSubmit={handleStep1Next} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#b89fa5] font-bold mb-1">
                    Amazon Pay UPI ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210@apl"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                  />
                  <p className="text-[10px] text-[#83686e] mt-1">
                    Your Amazon Pay wallet UPI address (e.g. name@apl).
                  </p>
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
                    10-digit mobile number linked with your Amazon Pay account.
                  </p>
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
            )}

            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-4 text-xs">
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
                    Amazon Pay wallet top-up emails are read from this Gmail.
                  </p>
                </div>

                <div>
                  <label className="block text-[#b89fa5] font-bold mb-1">
                    Google App Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      placeholder="16-character Google App Password"
                      value={gmailAppPassword}
                      onChange={e => setGmailAppPassword(e.target.value)}
                      className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 pr-10 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#83686e] hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#83686e] mt-1">
                    Generate an App Password from Google Account → Security → 2-Step Verification → App Passwords.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
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
                <p className="text-[11px] text-[#b89fa5]">This will disconnect the Amazon Pay cashier.</p>
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
