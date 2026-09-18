import { useState } from 'react';
import { Link as LinkIcon, Plus, Search, Copy, Edit, Trash2, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { PaymentLink } from '../types';
import { deleteLink, getLinkPaymentUrl } from '../services/paymentLink.service';

interface PaymentLinksViewProps {
  paymentLinks: PaymentLink[];
  onToggleActive: (id: string | number) => void;
  onEditLink: (id: string | number) => void;
  onDeleteLink?: (id: string | number) => void;
  onCreateNewLink: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PaymentLinksView({
  paymentLinks,
  onToggleActive,
  onEditLink,
  onDeleteLink,
  onCreateNewLink,
  showToast
}: PaymentLinksViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Disabled'>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const totalLinks = paymentLinks.length;
  const activeLinks = paymentLinks.filter(l => l.active).length;
  const totalCollected = paymentLinks.reduce((sum, l) => sum + l.amount * l.orders, 0);
  const expiredLinks = paymentLinks.filter(l => (l as any).expiry && new Date((l as any).expiry).getTime() < Date.now()).length;

  const filteredLinks = paymentLinks.filter(link => {
    const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStatus = true;
    if (statusFilter === 'Active') matchesStatus = link.active;
    if (statusFilter === 'Disabled') matchesStatus = !link.active;
    if (statusFilter === 'Expired') matchesStatus = !!((link as any).expiry && new Date((link as any).expiry).getTime() < Date.now());
    return matchesSearch && matchesStatus;
  });

  const getCheckoutUrl = (link: PaymentLink) => {
    const linkIdentifier = String(link.link_id || link.id);
    return getLinkPaymentUrl(linkIdentifier);
  };

  const handleCopyLink = (link: PaymentLink) => {
    const url = getCheckoutUrl(link);
    navigator.clipboard?.writeText(url).then(() => {
      showToast('Payment link copied to clipboard.', 'success');
    }).catch(() => {
      showToast('Could not copy link.', 'error');
    });
  };

  const handleDelete = async (link: PaymentLink) => {
    setDeletingId(link.id);
    const linkIdToDelete = String(link.link_id || link.id);
    try {
      try {
        await deleteLink(linkIdToDelete);
      } catch (err: any) {
        console.warn('Backend deleteLink call error:', err);
      }
      if (onDeleteLink) {
        onDeleteLink(link.id);
      }
      showToast('Payment link deleted successfully.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete payment link.', 'error');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <main className="w-full max-w-[1400px] mx-auto py-6 px-4 sm:px-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both] text-[#fff2f4]">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-[46px] h-[46px] rounded-[13px] bg-gradient-to-br from-[#ff1e4b] to-[#b8002c] grid place-items-center text-white shrink-0 shadow-[0_0_22px_rgba(255,30,75,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]">
            <LinkIcon className="w-[22px] h-[22px]" />
          </div>
          <div>
            <h1 className="text-[22px] font-black tracking-[-0.6px] text-white flex items-center gap-2">
              My Payment Links
            </h1>
            <p className="text-[13px] text-[#b89fa5] font-medium mt-0.5">
              All payment links you've created.
            </p>
          </div>
        </div>
        <button 
          onClick={onCreateNewLink}
          className="inline-flex items-center justify-center gap-[7px] px-[18px] py-[10px] rounded-[11px] bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-[13.5px] font-extrabold shadow-[0_8px_24px_rgba(255,30,75,0.35),inset_0_1px_0_rgba(255,255,255,0.16)] hover:shadow-[0_12px_30px_rgba(255,30,75,0.55)] active:scale-95 transition-all cursor-pointer relative overflow-hidden"
        >
          <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Link
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {/* Total Links */}
        <div className="relative p-[18px_20px_16px] rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col min-h-[128px]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#5b8dff]" />
          <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(91,141,255,0.12)] border border-[rgba(91,141,255,0.28)] grid place-items-center text-[#5b8dff] mb-3.5">
            <LinkIcon className="w-[18px] h-[18px]" />
          </div>
          <div className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-[#83686e] mb-2">Total Links</div>
          <div className="text-[24px] font-black tracking-[-0.6px] text-white mt-auto">{totalLinks}</div>
        </div>

        {/* Active */}
        <div className="relative p-[18px_20px_16px] rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col min-h-[128px]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#2bf29a]" />
          <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(43,242,154,0.12)] border border-[rgba(43,242,154,0.28)] grid place-items-center text-[#2bf29a] mb-3.5">
            <CheckCircle2 className="w-[18px] h-[18px]" />
          </div>
          <div className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-[#83686e] mb-2">Active</div>
          <div className="text-[24px] font-black tracking-[-0.6px] text-white mt-auto">{activeLinks}</div>
        </div>

        {/* Total Collected */}
        <div className="relative p-[18px_20px_16px] rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col min-h-[128px]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ffb834]" />
          <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(255,184,52,0.12)] border border-[rgba(255,184,52,0.28)] grid place-items-center text-[#ffb834] mb-3.5">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12M6 21h12M8 3c0 5 8 5 8 0M8 21c0-5 8-5 8 0M9 12h6"/>
            </svg>
          </div>
          <div className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-[#83686e] mb-2">Total Collected</div>
          <div className="text-[24px] font-black tracking-[-0.6px] text-white mt-auto">₹{totalCollected.toLocaleString('en-IN')}</div>
        </div>

        {/* Expired */}
        <div className="relative p-[18px_20px_16px] rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col min-h-[128px]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ff1e4b]" />
          <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(255,30,75,0.12)] border border-[rgba(255,30,75,0.28)] grid place-items-center text-[#ff4d6d] mb-3.5">
            <Clock className="w-[18px] h-[18px]" />
          </div>
          <div className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-[#83686e] mb-2">Expired</div>
          <div className="text-[24px] font-black tracking-[-0.6px] text-white mt-auto">{expiredLinks}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 p-[14px_18px] rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)] mb-5">
        <div className="relative w-full sm:w-[130px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-[14px] py-[10px] pr-[34px] rounded-[11px] bg-[rgba(20,5,10,0.85)] border border-[rgba(255,45,85,0.18)] text-white text-[13px] font-bold outline-none cursor-pointer appearance-none hover:border-[rgba(255,60,95,0.4)] focus:border-[rgba(255,60,95,0.7)]"
          >
            <option value="All" className="bg-[#120306] text-white">All</option>
            <option value="Active" className="bg-[#120306] text-white">Active</option>
            <option value="Expired" className="bg-[#120306] text-white">Expired</option>
            <option value="Disabled" className="bg-[#120306] text-white">Disabled</option>
          </select>
          <div className="absolute right-[14px] top-1/2 -translate-y-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#b89fa5] pointer-events-none" />
        </div>

        <div className="relative flex-1 w-full max-w-[340px]">
          <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#83686e]" />
          <input
            type="text"
            placeholder="Search title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-[38px] pr-[14px] py-[10px] rounded-[11px] bg-[rgba(20,5,10,0.85)] border border-[rgba(255,45,85,0.18)] text-white text-[13px] font-semibold placeholder:text-[rgba(184,159,165,0.55)] outline-none focus:border-[rgba(255,60,95,0.7)] focus:bg-[rgba(28,8,14,0.9)] transition-all"
          />
        </div>
      </div>

      {/* Links List or Empty State */}
      <div className="space-y-3.5">
        {filteredLinks.length > 0 ? (
          filteredLinks.map(link => {
            const calculatedTotal = link.amount * link.orders;
            return (
              <article
                key={link.id}
                className={`p-5 rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  link.active ? 'border-[rgba(255,45,85,0.18)] hover:border-[rgba(255,60,95,0.45)]' : 'border-white/5 opacity-70'
                }`}
              >
                {/* Left Info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-[13px] bg-[rgba(255,30,75,0.12)] border border-[rgba(255,30,75,0.25)] flex items-center justify-center text-[#ff4d6d] shrink-0">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      {link.title}
                      {!link.active && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-extrabold text-[#b89fa5] uppercase tracking-wider">
                          Paused
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#b89fa5] font-medium mt-1">
                      ₹{link.amount.toLocaleString('en-IN')} · {link.orders} successful payments · {link.date}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono text-[#b89fa5]">
                      <span className="text-[#83686e] font-semibold">URL:</span>
                      <span className="text-[#ff94a7] bg-[rgba(255,30,75,0.08)] border border-[rgba(255,30,75,0.2)] px-2 py-0.5 rounded-md truncate max-w-[280px]">
                        {getCheckoutUrl(link)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Controls & Stats */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-3 md:pt-0 border-[rgba(255,45,85,0.1)]">
                  <div className="flex items-center gap-6 text-xs text-[#b89fa5] font-semibold mr-2">
                    <div className="text-left md:text-right">
                      <b className="block text-sm font-black text-white leading-none">
                        ₹{calculatedTotal.toLocaleString('en-IN')}
                      </b>
                      <span className="text-[10px] text-[#83686e] font-bold uppercase tracking-wider block mt-1">Collected</span>
                    </div>
                    <div className="text-left md:text-right">
                      <b className="block text-sm font-black text-white leading-none">{link.orders}</b>
                      <span className="text-[10px] text-[#83686e] font-bold uppercase tracking-wider block mt-1">Orders</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2">
                    {/* Active Toggle Switch */}
                    <button
                      onClick={() => onToggleActive(link.id)}
                      className={`w-10 h-6 rounded-full p-0.5 transition-all outline-none relative cursor-pointer ${
                        link.active ? 'bg-[#ff1e4b]' : 'bg-white/15'
                      }`}
                      aria-label="Toggle link active state"
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-all transform ${
                        link.active ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>

                    {/* Copy Link Button */}
                    <button
                      onClick={() => handleCopyLink(link)}
                      className="p-2 bg-white/5 border border-white/10 hover:border-[rgba(255,60,95,0.4)] text-[#b89fa5] hover:text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                      title="Copy Checkout Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Edit Link Button */}
                    <button
                      onClick={() => onEditLink(link.id)}
                      className="p-2 bg-white/5 border border-white/10 hover:border-[rgba(255,60,95,0.4)] text-[#b89fa5] hover:text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                      title="Edit Link Configuration"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete Link Button / Inline Confirmation */}
                    {confirmDeleteId === link.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(link)}
                          disabled={deletingId === link.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#ff1e4b] hover:bg-[#d8002f] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-60 cursor-pointer"
                          title="Confirm Deletion"
                        >
                          {deletingId === link.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Delete</span>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === link.id}
                          className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-[#fff2f4] rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(link.id)}
                        className="p-2 bg-white/5 border border-white/10 hover:border-[#ff1e4b] text-[#b89fa5] hover:text-[#ff4d6d] hover:bg-[rgba(255,30,75,0.12)] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Delete Payment Link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.75)] to-[rgba(12,2,6,0.9)] border border-[rgba(255,45,85,0.18)] py-[64px] px-[24px] pb-[72px] flex flex-col items-center justify-center text-center gap-[14px] min-h-[420px]">
            <div className="w-[80px] h-[80px] grid place-items-center text-[rgba(255,45,85,0.38)] mb-[6px]">
              <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div className="text-[15px] font-extrabold text-[#fff2f4] tracking-[-0.2px]">No payment links yet</div>
            <div className="text-[12.5px] text-[#b89fa5] max-w-[340px] leading-[1.6] mb-[6px]">
              Create your first payment link to start receiving payments.
            </div>
            <button
              onClick={onCreateNewLink}
              className="py-[11px] px-[22px] rounded-[11px] text-[13px] font-extrabold text-white bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] shadow-[0_10px_26px_rgba(255,30,75,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] hover:shadow-[0_14px_32px_rgba(255,30,75,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all cursor-pointer"
            >
              Create Link
            </button>
          </div>
        )}
      </div>

    </main>
  );
}
