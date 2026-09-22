import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, CheckCircle2, AlertCircle, Trash2, 
  ShieldCheck, ArrowRight, X, Check, RefreshCw, Smartphone, 
  ToggleLeft, ToggleRight, Building2
} from 'lucide-react';
import { 
  CashierAccount, 
  getCashierList, 
  addPaytmAccount, 
  toggleCashier, 
  deleteCashier 
} from '../services/cashier.service';

interface PaytmConnectViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
  unreadNotifications?: number;
}

export default function PaytmConnectView({
  showToast,
  onOpenSidebar,
  onViewChange,
  unreadNotifications = 0
}: PaytmConnectViewProps) {
  const [accounts, setAccounts] = useState<CashierAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteModalAcc, setDeleteModalAcc] = useState<CashierAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Form state
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [paytmMid, setPaytmMid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load accounts on mount
  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const res: any = await getCashierList();
      let rawList: CashierAccount[] = [];
      if (Array.isArray(res)) {
        rawList = res;
      } else if (Array.isArray(res?.cashiers)) {
        rawList = res.cashiers;
      } else if (Array.isArray(res?.accounts)) {
        rawList = res.accounts;
      } else if (Array.isArray(res?.data)) {
        rawList = res.data;
      }

      // Filter for Paytm accounts
      const paytmAccounts = rawList.filter(acc => {
        if (acc.type) return acc.type.toLowerCase() === 'paytm';
        if (acc.paytm_mid) return true;
        const upi = (acc.upi_id || acc.upiId || '').toLowerCase();
        return upi.includes('@paytm') || upi.includes('@ptyes') || upi.includes('@ptaxis');
      });

      setAccounts(paytmAccounts);
    } catch (err: any) {
      console.error('Error fetching cashier list:', err);
      showToast(err.message || 'Failed to load Paytm accounts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const openAddModal = () => {
    if (accounts.length >= 3) {
      showToast('Maximum 3 Paytm accounts allowed.', 'error');
      return;
    }
    setUpiId('');
    setPhone('');
    setPaytmMid('');
    setIsAddModalOpen(true);
  };

  // Submit Paytm Account
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let upiClean = upiId.trim();
    const phoneClean = phone.trim().replace(/\D/g, '');
    const midClean = paytmMid.trim();

    if (!upiClean) {
      showToast('Please enter Paytm UPI ID (e.g. 9769516928@paytm)', 'error');
      return;
    }

    if (!phoneClean || phoneClean.length < 10) {
      showToast('Please enter a valid 10-digit registered mobile number', 'error');
      return;
    }

    if (!upiClean.includes('@')) {
      upiClean = `${upiClean}@paytm`;
    }

    setIsSubmitting(true);
    try {
      await addPaytmAccount({
        upi_id: upiClean,
        phone: phoneClean,
        paytm_mid: midClean || undefined
      });

      showToast('Paytm account added successfully!', 'success');
      setIsAddModalOpen(false);
      await loadAccounts();
    } catch (err: any) {
      console.error('Error adding Paytm account:', err);
      showToast(err.message || 'Failed to add Paytm account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggle = async (account: CashierAccount) => {
    const accId = account.id || account._id;
    if (!accId) return;

    setIsTogglingId(accId);
    try {
      await toggleCashier(accId, 'paytm');
      showToast('Paytm account status updated', 'success');
      await loadAccounts();
    } catch (err: any) {
      console.error('Toggle error:', err);
      showToast(err.message || 'Failed to toggle account status', 'error');
    } finally {
      setIsTogglingId(null);
    }
  };

  // Delete Account
  const handleDeleteConfirm = async () => {
    if (!deleteModalAcc) return;
    const accId = deleteModalAcc.id || deleteModalAcc._id;
    if (!accId) return;

    setIsDeleting(true);
    try {
      await deleteCashier(accId);
      showToast('Paytm account deleted successfully', 'success');
      setDeleteModalAcc(null);
      await loadAccounts();
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete account', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070102] text-[#fff2f4] font-sans antialiased selection:bg-rose-500 selection:text-white">
      {/* MAIN CONTAINER */}
      <main className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-[46px] h-[46px] rounded-[13px] bg-gradient-to-br from-[#00b9f5] to-[#0072bc] flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(0,185,245,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]">
              <CreditCard className="w-[22px] h-[22px] text-white stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#fff2f4]">
                  Paytm Connect
                </h1>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#00b9f5]/15 text-[#38bdf8] border border-[#00b9f5]/30 tracking-wider">
                  Cashier Gateway
                </span>
              </div>
              <p className="text-xs text-[#b89fa5] leading-relaxed mt-0.5">
                Connect your Paytm business or personal UPI account for instant payment settlements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(0,185,245,0.08)] border border-[rgba(0,185,245,0.25)] text-xs font-bold text-[#38bdf8]">
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
                  : 'bg-gradient-to-r from-[#00b9f5] to-[#0072bc] shadow-[0_8px_24px_rgba(0,185,245,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,185,245,0.55)] active:translate-y-0'
              }`}
            >
              <Plus className="w-[15px] h-[15px] stroke-[2.8]" />
              Add Paytm Account
            </button>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5 items-start">
          {/* LEFT PANEL: ACCOUNTS */}
          <div className="p-4 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(0,185,245,0.2)] transition-colors hover:border-[rgba(0,185,245,0.4)]">
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[rgba(0,185,245,0.15)] mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-extrabold tracking-tight text-[#fff2f4]">
                  Connected Paytm Accounts
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#00b9f5]/15 text-[#38bdf8] border border-[#00b9f5]/30">
                  {accounts.length}
                </span>
              </div>
              <span className="text-[11.5px] font-extrabold px-3 py-1 rounded-full bg-[rgba(0,185,245,0.08)] border border-[rgba(0,185,245,0.25)] text-[#b89fa5] tracking-wide">
                Max 3 accounts
              </span>
            </div>

            {/* Loading state */}
            {isLoading ? (
              <div className="py-16 text-center text-[#b89fa5] flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#00b9f5]" />
                <span className="text-xs font-semibold">Loading Paytm accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              /* EMPTY STATE */
              <div className="flex flex-col items-center justify-center text-center py-14 px-4 gap-3.5">
                <div className="w-[60px] h-[60px] rounded-2xl bg-[rgba(0,185,245,0.05)] border border-[rgba(0,185,245,0.15)] flex items-center justify-center text-[#00b9f5]/50 mb-1">
                  <CreditCard className="w-8 h-8 stroke-[1.5]" />
                </div>
                <p className="text-[13.5px] font-bold text-[#b89fa5] leading-relaxed max-w-[340px]">
                  No Paytm accounts connected yet — add your Paytm UPI ID to enable instant cashier settlements.
                </p>
                <button
                  onClick={openAddModal}
                  className="mt-2 text-xs font-bold text-[#38bdf8] hover:text-[#00b9f5] flex items-center gap-1.5 underline decoration-[rgba(0,185,245,0.4)] underline-offset-4"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Connect Paytm account now
                </button>
              </div>
            ) : (
              /* ACCOUNTS LIST */
              <div className="space-y-3.5">
                {accounts.map((acc) => {
                  const accId = acc.id || acc._id || '';
                  const isActive = Boolean(acc.is_active ?? acc.isActive);
                  const upi = acc.upi_id || acc.upiId || 'Paytm UPI';
                  const mid = acc.paytm_mid || 'Standard Account';
                  const isToggling = isTogglingId === accId;

                  return (
                    <div
                      key={accId}
                      className={`p-4 rounded-xl border transition-all duration-200 flex flex-col gap-3 ${
                        isActive
                          ? 'bg-[rgba(0,185,245,0.06)] border-[rgba(0,185,245,0.4)] shadow-[0_4px_20px_rgba(0,185,245,0.12)]'
                          : 'bg-black/40 border-[rgba(0,185,245,0.12)] hover:border-[rgba(0,185,245,0.25)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${
                            isActive
                              ? 'bg-[#00b9f5]/15 text-[#38bdf8] border border-[#00b9f5]/30'
                              : 'bg-slate-800 text-[#b89fa5]'
                          }`}>
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-extrabold text-[#fff2f4] font-mono block">
                              {upi}
                            </span>
                            <span className="text-[11px] font-mono text-[#b89fa5] block">
                              Phone: {acc.phone}
                            </span>
                          </div>
                        </div>

                        {/* Toggle button */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(acc)}
                            disabled={isToggling}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold transition-all active:scale-95 ${
                              isActive
                                ? 'bg-[#2bf29a]/15 text-[#2bf29a] border border-[#2bf29a]/40 shadow-[0_0_12px_rgba(43,242,154,0.25)]'
                                : 'bg-slate-800/80 text-[#83686e] border border-slate-700/60 hover:text-[#b89fa5]'
                            }`}
                            title="Click to toggle Active/Inactive"
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
                                <span>Inactive</span>
                              </>
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteModalAcc(acc)}
                            className="p-1.5 rounded-lg text-[#83686e] hover:text-[#ff1e4b] hover:bg-rose-500/10 transition-all ml-1"
                            title="Remove Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Detail Pill */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] bg-black/35 p-2.5 rounded-lg border border-white/5">
                        <div>
                          <span className="text-[#83686e] text-[9.5px] uppercase font-bold tracking-wider block">Merchant MID</span>
                          <span className="font-mono text-[#fff2f4] truncate block">{mid}</span>
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
            <div className="p-5 sm:p-6 rounded-[18px] bg-gradient-to-b from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(0,185,245,0.2)]">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-[rgba(0,185,245,0.15)] mb-4">
                <div className="w-[30px] h-[30px] rounded-[9px] bg-[rgba(0,185,245,0.14)] border border-[rgba(0,185,245,0.35)] text-[#38bdf8] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-[16px] h-[16px] stroke-[2.2]" />
                </div>
                <div className="text-[14.5px] font-black text-[#38bdf8] tracking-tight">
                  Paytm Cashier Guide
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-[#b89fa5]">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#00b9f5]/15 text-[#38bdf8] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                  <span>Enter your <strong className="text-white">Paytm UPI ID</strong> (e.g. mobile@paytm).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#00b9f5]/15 text-[#38bdf8] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                  <span>Optionally enter your <strong className="text-white">Paytm Merchant MID</strong> if using a business account.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#00b9f5]/15 text-[#38bdf8] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                  <span>Enable the <strong className="text-[#2bf29a]">Active</strong> switch to receive customer payments through your Paytm account.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ADD PAYTM ACCOUNT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120306] border border-[rgba(0,185,245,0.35)] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(0,185,245,0.2)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00b9f5]/15 text-[#38bdf8] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fff2f4]">Add Paytm Account</h3>
                  <span className="text-[10px] text-[#38bdf8] font-bold">Cashier Setup</span>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#b89fa5] hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  Paytm UPI ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9769516928@paytm"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  className="w-full bg-black/50 border border-[rgba(0,185,245,0.25)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#00b9f5]"
                />
                <p className="text-[10px] text-[#83686e] mt-1">
                  Your registered Paytm UPI handle ending with @paytm.
                </p>
              </div>

              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  Registered Mobile *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9769516928"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black/50 border border-[rgba(0,185,245,0.25)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#00b9f5]"
                />
                <p className="text-[10px] text-[#83686e] mt-1">
                  10-digit mobile number registered with Paytm.
                </p>
              </div>

              <div>
                <label className="block text-[#b89fa5] font-bold mb-1">
                  Merchant ID / MID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PAYTM_MID_12345"
                  value={paytmMid}
                  onChange={e => setPaytmMid(e.target.value)}
                  className="w-full bg-black/50 border border-[rgba(0,185,245,0.25)] rounded-xl px-3.5 py-2.5 text-[#fff2f4] placeholder-[#83686e] font-mono focus:outline-none focus:border-[#00b9f5]"
                />
                <p className="text-[10px] text-[#83686e] mt-1">
                  Only required if using a Paytm Business Merchant account.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#b89fa5] font-bold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00b9f5] to-[#0072bc] text-white font-extrabold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Account</span>
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
                <p className="text-[11px] text-[#b89fa5]">This will remove the Paytm cashier.</p>
              </div>
            </div>

            <p className="text-xs text-[#b89fa5] leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{deleteModalAcc.upi_id || deleteModalAcc.upiId}</strong> ({deleteModalAcc.phone})?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteModalAcc(null)}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-bold text-[#b89fa5] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold text-white shadow-md active:scale-95 flex items-center justify-center gap-1.5"
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
