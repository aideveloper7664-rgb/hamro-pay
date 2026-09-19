import React, { useState, useEffect } from 'react';
import { 
  Menu, Bell, Smartphone, Plus, CheckCircle2, AlertCircle, Trash2, 
  ShieldCheck, ArrowRight, X, Mail, Check, Play, RefreshCw, Lock, Radio
} from 'lucide-react';
import { 
  FamPayAccount, 
  fetchFamPayAccounts, 
  addFamPayAccount, 
  activateFamPayAccount, 
  verifyFamPayGmail, 
  deleteFamPayAccount 
} from '../services/fampay.service';

interface FamPayConnectViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
  unreadNotifications?: number;
}

export default function FamPayConnectView({
  showToast,
  onOpenSidebar,
  onViewChange,
  unreadNotifications = 0
}: FamPayConnectViewProps) {
  const [accounts, setAccounts] = useState<FamPayAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [verifyModalAcc, setVerifyModalAcc] = useState<FamPayAccount | null>(null);
  const [deleteModalAcc, setDeleteModalAcc] = useState<FamPayAccount | null>(null);

  // Add Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formUpi, setFormUpi] = useState('');
  const [formGmail, setFormGmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification Form state
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Load accounts on mount
  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchFamPayAccounts();
      setAccounts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Submit Add Account Form
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accounts.length >= 3) {
      showToast('Maximum 3 FamPay accounts limit reached.', 'error');
      return;
    }

    const phoneClean = formPhone.trim();
    let upiClean = formUpi.trim();
    const gmailClean = formGmail.trim();

    if (!phoneClean || phoneClean.length < 10) {
      showToast('Please enter a valid 10-digit phone number.', 'error');
      return;
    }

    if (!upiClean) {
      showToast('Please enter a valid UPI ID (e.g. 9769516928@fam).', 'error');
      return;
    }

    if (!upiClean.includes('@')) {
      upiClean = `${upiClean}@fam`;
    }

    if (!gmailClean || !gmailClean.includes('@')) {
      showToast('Please enter a valid Gmail address.', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await addFamPayAccount({
      phone: phoneClean,
      upiId: upiClean,
      gmail: gmailClean,
      name: formName.trim() || 'Merchant Account'
    });

    setIsSubmitting(false);

    if (result.success && result.account) {
      showToast(result.message || 'FamPay account added successfully!', 'success');
      setFormName('');
      setFormPhone('');
      setFormUpi('');
      setFormGmail('');
      setIsAddModalOpen(false);
      await loadAccounts();
      // Prompt verification for newly added account
      setVerifyModalAcc(result.account);
    } else {
      showToast(result.message || 'Failed to add FamPay account.', 'error');
    }
  };

  // Handle Set Active
  const handleSetActive = async (id: string) => {
    const res = await activateFamPayAccount(id);
    if (res.success) {
      showToast(res.message || 'Active FamPay account updated.', 'success');
      await loadAccounts();
    } else {
      showToast(res.message || 'Failed to activate account.', 'error');
    }
  };

  // Handle Gmail Verification
  const handleVerifyGmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalAcc) return;

    setIsVerifying(true);
    const res = await verifyFamPayGmail(verifyModalAcc.id, verificationCode);
    setIsVerifying(false);

    if (res.success) {
      showToast(res.message || 'Gmail verified successfully!', 'success');
      setVerifyModalAcc(null);
      setVerificationCode('');
      await loadAccounts();
    } else {
      showToast(res.message || 'Invalid verification code.', 'error');
    }
  };

  // Quick Auto Verify for Demo
  const handleQuickVerify = async () => {
    if (!verifyModalAcc) return;
    setIsVerifying(true);
    const res = await verifyFamPayGmail(verifyModalAcc.id, '123456');
    setIsVerifying(false);
    if (res.success) {
      showToast('Gmail verified and account activated!', 'success');
      setVerifyModalAcc(null);
      setVerificationCode('');
      await loadAccounts();
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteModalAcc) return;
    const res = await deleteFamPayAccount(deleteModalAcc.id);
    if (res.success) {
      showToast(res.message || 'FamPay account removed.', 'success');
      setDeleteModalAcc(null);
      await loadAccounts();
    } else {
      showToast(res.message || 'Failed to remove account.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#070102] text-[#fff2f4] font-sans antialiased selection:bg-rose-500 selection:text-white">

      {/* TOPBAR */}
      <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-5 bg-[#0b0204]/85 backdrop-blur-xl border-b border-[rgba(255,45,85,0.18)]">
        <div className="flex items-center gap-2 min-w-[120px] sm:min-w-[180px]">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#b89fa5] hover:text-[#ff94a7] hover:bg-[rgba(255,30,75,0.08)] transition-all"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}
        </div>

        <div className="text-sm font-bold tracking-tight text-[#fff2f4]">
          FamPay Connect
        </div>

        <div className="flex items-center justify-end gap-2 min-w-[120px] sm:min-w-[180px]">
          <button 
            onClick={() => onViewChange?.('notifications')}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[#b89fa5] hover:text-[#ff94a7] hover:bg-[rgba(255,30,75,0.08)] transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 stroke-[2]" />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff1e4b] shadow-[0_0_8px_#ff1e4b] border-[1.5px] border-[#0b0204]" />
            )}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6 pb-20">

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-[46px] h-[46px] rounded-[13px] bg-gradient-to-br from-[#ff7a00] to-[#e06300] flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(255,122,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]">
              <Smartphone className="w-[22px] h-[22px] text-white stroke-[2.4]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#fff2f4]">
                FamPay Connect
              </h1>
              <p className="text-xs text-[#b89fa5] leading-relaxed mt-0.5">
                Connect up to 3 FamPay accounts — one active at a time for checkout.
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              if (accounts.length >= 3) {
                showToast('Maximum 3 FamPay accounts reached.', 'error');
              } else {
                setIsAddModalOpen(true);
              }
            }}
            disabled={accounts.length >= 3}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[11px] text-[13.5px] font-extrabold text-white transition-all duration-200 whitespace-nowrap tracking-tight ${
              accounts.length >= 3
                ? 'opacity-50 cursor-not-allowed bg-slate-800'
                : 'bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] shadow-[0_8px_24px_rgba(255,30,75,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(255,30,75,0.55)] active:translate-y-0'
            }`}
          >
            <Plus className="w-[15px] h-[15px] stroke-[2.8]" />
            Add FamPay Account
          </button>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5 items-start">

          {/* LEFT PANEL */}
          <div className="p-4 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)] transition-colors hover:border-[rgba(255,60,95,0.45)]">
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[rgba(255,45,85,0.12)] mb-4">
              <span className="text-[14.5px] font-extrabold tracking-tight text-[#fff2f4]">
                My FamPay Accounts
              </span>
              <span className="text-[12.5px] font-extrabold px-3 py-1 rounded-full bg-[rgba(255,30,75,0.08)] border border-[rgba(255,45,85,0.28)] text-[#b89fa5] tracking-wide">
                {accounts.length} / 3
              </span>
            </div>

            {/* Content loading state */}
            {isLoading ? (
              <div className="py-16 text-center text-[#b89fa5] flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#ff1e4b]" />
                <span className="text-xs font-semibold">Loading FamPay accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              /* EMPTY STATE */
              <div className="flex flex-col items-center justify-center text-center py-14 px-4 gap-3.5">
                <div className="w-[60px] h-[60px] rounded-2xl bg-[rgba(255,30,75,0.05)] border border-[rgba(255,45,85,0.15)] flex items-center justify-center text-[rgba(255,45,85,0.4)] mb-1">
                  <Smartphone className="w-8 h-8 stroke-[1.5]" />
                </div>
                <p className="text-[13.5px] font-bold text-[#b89fa5] leading-relaxed max-w-[340px]">
                  No FamPay accounts yet — add one to start accepting payments.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 text-xs font-bold text-[#ff4d6d] hover:text-[#ff1e4b] flex items-center gap-1.5 underline decoration-[rgba(255,45,85,0.4)] underline-offset-4"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Connect your first account now
                </button>
              </div>
            ) : (
              /* ACCOUNTS LIST */
              <div className="space-y-3.5">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col gap-3 ${
                      acc.isActive
                        ? 'bg-[rgba(255,30,75,0.08)] border-[rgba(255,45,85,0.45)] shadow-[0_4px_20px_rgba(255,30,75,0.15)]'
                        : 'bg-black/40 border-[rgba(255,45,85,0.12)] hover:border-[rgba(255,45,85,0.25)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                          acc.isActive
                            ? 'bg-[#2bf29a]/15 text-[#2bf29a] border border-[#2bf29a]/30'
                            : 'bg-slate-800 text-[#b89fa5]'
                        }`}>
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-[#fff2f4] block">
                            {acc.name || 'FamPay Account'}
                          </span>
                          <span className="text-[11px] font-mono text-[#b89fa5] block">
                            {acc.phone}
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div>
                        {acc.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-[#2bf29a]/10 text-[#2bf29a] border border-[#2bf29a]/30 shadow-[0_0_12px_rgba(43,242,154,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2bf29a] animate-pulse" />
                            Active for Checkout
                          </span>
                        ) : acc.isGmailVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-[#b89fa5] border border-slate-700">
                            Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-[#ffb834]/10 text-[#ffb834] border border-[#ffb834]/30">
                            <AlertCircle className="w-3 h-3" />
                            Unverified Gmail
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <div>
                        <span className="text-[#83686e] text-[10px] uppercase font-bold tracking-wider block">UPI ID</span>
                        <span className="font-mono font-bold text-[#fff2f4]">{acc.upiId}</span>
                      </div>
                      <div>
                        <span className="text-[#83686e] text-[10px] uppercase font-bold tracking-wider block">Gmail Handle</span>
                        <span className="font-mono text-[#b89fa5] truncate block">{acc.gmail}</span>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div className="flex items-center gap-2">
                        {!acc.isGmailVerified ? (
                          <button
                            onClick={() => setVerifyModalAcc(acc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#ffb834]/15 hover:bg-[#ffb834]/25 text-[#ffb834] border border-[#ffb834]/30 transition-all active:scale-95"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Verify Gmail
                          </button>
                        ) : !acc.isActive ? (
                          <button
                            onClick={() => handleSetActive(acc.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#ff1e4b]/15 hover:bg-[#ff1e4b]/25 text-[#ff4d6d] border border-[rgba(255,45,85,0.3)] transition-all active:scale-95"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            Set Active
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-[#2bf29a] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Currently handling checkout
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setDeleteModalAcc(acc)}
                        className="p-1.5 rounded-lg text-[#83686e] hover:text-[#ff1e4b] hover:bg-rose-500/10 transition-all"
                        title="Remove Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE STACK */}
          <div className="space-y-4">

            {/* HOW IT WORKS CARD */}
            <div className="p-5 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)] transition-colors hover:border-[rgba(255,60,95,0.45)]">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-[rgba(91,141,255,0.15)] mb-4">
                <div className="w-[30px] h-[30px] rounded-[9px] bg-[rgba(91,141,255,0.14)] border border-[rgba(91,141,255,0.35)] text-[#5b8dff] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-[16px] h-[16px] stroke-[2.2]" />
                </div>
                <div className="text-[14.5px] font-black text-[#5b8dff] tracking-tight">
                  How it works
                </div>
              </div>

              <div className="space-y-4">
                {[
                  "Add an account with its phone number and UPI ID, then verify the connected Gmail to activate it.",
                  <span>Save up to <strong className="text-[#fff2f4] font-extrabold">3 accounts</strong> — only <strong className="text-[#fff2f4] font-extrabold">ONE</strong> can be active for checkout at a time, toggle between them anytime.</span>,
                  <span>An account not yet Gmail-verified shows as <strong className="text-[#fff2f4] font-extrabold">Inactive</strong> and can't be activated until verified.</span>,
                  "Once active, any Payment Link you create will generate a direct FamPay UPI Intent for your customers.",
                  "Payments are verified automatically via the active account's FamPay transaction history."
                ].map((text, idx) => (
                  <div key={idx} className="grid grid-cols-[26px_1fr] gap-3 items-start">
                    <span className="w-[26px] h-[26px] rounded-[8px] bg-[rgba(91,141,255,0.12)] border border-[rgba(91,141,255,0.3)] text-[#9ab4ff] text-[11.5px] font-black flex items-center justify-center shrink-0 pt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-[12.5px] text-[#b89fa5] leading-relaxed pt-0.5">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* DOWNLOAD FAMPAY BUTTON */}
            <a
              href="https://play.google.com/store/apps/details?id=com.fampay.in"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-[13px] text-[13.5px] font-black text-white bg-gradient-to-r from-[#a855f7] to-[#7c3aed] shadow-[0_10px_28px_rgba(168,85,247,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(168,85,247,0.6)] active:translate-y-0 transition-all duration-200 text-center tracking-tight"
            >
              <Play className="w-4 h-4 fill-current stroke-none shrink-0" />
              Download FamPay from Playstore
            </a>

          </div>

        </div>

      </main>

      {/* MODAL: ADD FAMPAY ACCOUNT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120306] border border-[rgba(255,45,85,0.3)] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,45,85,0.15)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ff1e4b]/15 text-[#ff1e4b] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-[#fff2f4]">Add FamPay Account</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#b89fa5] hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  Account / Merchant Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Store Account"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] focus:outline-none focus:border-[#ff1e4b]"
                />
              </div>

              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  FamPay Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9769516928"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={10}
                  className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                />
              </div>

              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  FamPay UPI ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9769516928@fam"
                  value={formUpi}
                  onChange={e => setFormUpi(e.target.value)}
                  className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#ff1e4b]"
                />
              </div>

              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  Connected Gmail Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. merchant@gmail.com"
                  value={formGmail}
                  onChange={e => setFormGmail(e.target.value)}
                  className="w-full bg-black/50 border border-[rgba(255,45,85,0.2)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] focus:outline-none focus:border-[#ff1e4b]"
                />
                <p className="text-[10px] text-[#83686e] mt-1">
                  Used for automated FamPay transaction alert verification.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#b89fa5] font-bold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white font-extrabold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VERIFY GMAIL */}
      {verifyModalAcc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120306] border border-[#ffb834]/30 w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ffb834]/15 text-[#ffb834] flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-[#fff2f4]">Verify Gmail Account</h3>
              </div>
              <button 
                onClick={() => setVerifyModalAcc(null)}
                className="text-[#b89fa5] hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#b89fa5] space-y-2">
              <p>
                Verification code sent to <strong className="text-[#fff2f4]">{verifyModalAcc.gmail}</strong> for FamPay UPI ID <strong className="text-[#fff2f4] font-mono">{verifyModalAcc.upiId}</strong>.
              </p>

              <form onSubmit={handleVerifyGmailSubmit} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[#b89fa5] font-bold mb-1">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code (e.g. 123456)"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono text-center tracking-widest text-sm focus:outline-none focus:border-[#ffb834]"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-2.5 rounded-xl bg-[#ffb834] hover:bg-[#ffa700] text-black font-extrabold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm Code & Activate'}
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickVerify}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#b89fa5] border border-white/10"
                  >
                    ⚡ Quick Verify (Simulate Instant Gmail Check)
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteModalAcc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120306] border border-rose-500/30 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#fff2f4]">Remove Account?</h3>
                <p className="text-[11px] text-[#b89fa5]">This operation cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#b89fa5] leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{deleteModalAcc.upiId}</strong> ({deleteModalAcc.phone})?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteModalAcc(null)}
                className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-bold text-[#b89fa5] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold text-white shadow-md active:scale-95"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
