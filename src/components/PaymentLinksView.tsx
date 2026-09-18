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

  // Stats calculations
  const totalLinks = paymentLinks.length;
  const activeLinks = paymentLinks.filter(l => l.active).length;
  const totalCollected = paymentLinks.reduce((sum, l) => sum + l.amount * l.orders, 0);
  const expiredLinks = paymentLinks.filter(l => (l as any).expiry && new Date((l as any).expiry).getTime() < Date.now()).length;

  // Filter links
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
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both] text-[#fff2f4]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#b8002c] grid place-items-center text-white shrink-0 shadow-[0_0_22px_rgba(255,30,75,0.5)]">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">My Payment Links</h1>
            <p className="text-xs text-[#b89fa5] font-medium mt-0.5">All payment links you've created.</p>
          </div>
        </div>
        <button 
          onClick={onCreateNewLink}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-extrabold shadow-[0_8px_24px_rgba(255,30,75,0.35)] hover:shadow-[0_12px_30px_rgba(255,30,75,0.55)] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Link
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Links */}
        <div className="relative p-4 rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#5b8dff]" />
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(91,141,255,0.12)] border border-[rgba(91,141,255,0.28)] grid place-items-center text-[#5b8dff] mb-3">
            <LinkIcon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#83686e]">Total Links</span>
          <div className="text-2xl font-black tracking-tight text-white mt-1">{totalLinks}</div>
        </div>

        {/* Active */}
        <div className="relative p-4 rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#2bf29a]" />
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(43,242,154,0.12)] border border-[rgba(43,242,154,0.28)] grid place-items-center text-[#2bf29a] mb-3">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#83686e]">Active</span>
          <div className="text-2xl font-black tracking-tight text-white mt-1">{activeLinks}</div>
        </div>

        {/* Total Collected */}
        <div className="relative p-4 rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ffb834]" />
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(255,184,52,0.12)] border border-[rgba(255,184,52,0.28)] grid place-items-center text-[#ffb834] mb-3">
            <span className="font-bold text-sm">₹</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#83686e]">Total Collected</span>
          <div className="text-2xl font-black tracking-tight text-white mt-1">₹{totalCollected.toLocaleString('en-IN')}</div>
        </div>

        {/* Expired */}
        <div className="relative p-4 rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ff1e4b]" />
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(255,30,75,0.12)] border border-[rgba(255,30,75,0.28)] grid place-items-center text-[#ff4d6d] mb-3">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#83686e]">Expired</span>
          <div className="text-2xl font-black tracking-tight text-white mt-1">{expiredLinks}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5 p-3.5 rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)]">
        <div className="w-full sm:w-[160px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(20,5,10,0.85)] border border-[rgba(255,45,85,0.18)] text-white text-xs font-bold outline-none cursor-pointer focus:border-[rgba(255,60,95,0.6)]"
          >
            <option value="All" className="bg-[#120306] text-white">All Statuses</option>
            <option value="Active" className="bg-[#120306] text-white">Active</option>
            <option value="Expired" className="bg-[#120306] text-white">Expired</option>
            <option value="Disabled" className="bg-[#120306] text-white">Disabled</option>
          </select>
        </div>

        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b89fa5]" />
          <input
            type="text"
            placeholder="Search title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgba(20,5,10,0.85)] border border-[rgba(255,45,85,0.18)] text-white text-xs font-semibold placeholder:text-[rgba(184,159,165,0.5)] focus:border-[rgba(255,60,95,0.6)] focus:outline-none"
          />
        </div>
      </div>

      {/* Links List */}
      <div className="space-y-3">
        {filteredLinks.length > 0 ? (
          filteredLinks.map(link => {
            const calculatedTotal = link.amount * link.orders;
            return (
              <article
                key={link.id}
                className={`p-4 sm:p-5 rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.85)] to-[rgba(12,2,6,0.95)] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  link.active ? 'border-[rgba(255,45,85,0.18)] hover:border-[rgba(255,60,95,0.4)]' : 'border-white/5 opacity-70'
                }`}
              >
                {/* Left Info */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(255,30,75,0.12)] border border-[rgba(255,30,75,0.25)] flex items-center justify-center text-[#ff4d6d] shrink-0 mt-0.5 sm:mt-0">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                      <span className="truncate">{link.title}</span>
                      {!link.active && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-extrabold text-[#b89fa5] uppercase tracking-wider">
                          Paused
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#b89fa5] font-medium mt-0.5">
                      ₹{link.amount.toLocaleString('en-IN')} · {link.orders} payments · {link.date}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-[#b89fa5]">
                      <span className="text-[#83686e]">URL:</span>
                      <span className="text-[#ff94a7] bg-[rgba(255,30,75,0.08)] border border-[rgba(255,30,75,0.2)] px-2 py-0.5 rounded-md truncate max-w-[260px] sm:max-w-[340px]">
                        {getCheckoutUrl(link)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Controls & Stats */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-3 md:pt-0 border-[rgba(255,45,85,0.1)]">
                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-left md:text-right">
                      <b className="block text-sm font-black text-white leading-tight">
                        ₹{calculatedTotal.toLocaleString('en-IN')}
                      </b>
                      <span className="text-[10px] text-[#83686e] font-extrabold uppercase tracking-wider block mt-0.5">Collected</span>
                    </div>
                    <div className="text-left md:text-right">
                      <b className="block text-sm font-black text-white leading-tight">{link.orders}</b>
                      <span className="text-[10px] text-[#83686e] font-extrabold uppercase tracking-wider block mt-0.5">Orders</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Toggle Active */}
                    <button
                      onClick={() => onToggleActive(link.id)}
                      className={`w-10 h-6 rounded-full p-0.5 transition-all outline-none relative cursor-pointer ${
                        link.active ? 'bg-[#ff1e4b]' : 'bg-white/15'
                      }`}
                      aria-label="Toggle link active state"
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all transform ${
                        link.active ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>

                    {/* Copy */}
                    <button
                      onClick={() => handleCopyLink(link)}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#b89fa5] hover:text-white hover:bg-[rgba(255,30,75,0.15)] hover:border-[rgba(255,60,95,0.35)] transition-all cursor-pointer"
                      title="Copy Checkout Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => onEditLink(link.id)}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#b89fa5] hover:text-white hover:bg-[rgba(255,30,75,0.15)] hover:border-[rgba(255,60,95,0.35)] transition-all cursor-pointer"
                      title="Edit Link"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    {confirmDeleteId === link.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(link)}
                          disabled={deletingId === link.id}
                          className="px-2.5 py-1.5 bg-[#ff1e4b] hover:bg-[#d8002f] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-75"
                        >
                          {deletingId === link.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          <span>Confirm</span>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 bg-white/10 text-[#fff] rounded-xl text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(link.id)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#b89fa5] hover:text-[#ff4d6d] hover:bg-[rgba(255,30,75,0.15)] hover:border-[rgba(255,60,95,0.35)] transition-all cursor-pointer"
                        title="Delete Link"
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
          <div className="rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.75)] to-[rgba(12,2,6,0.9)] border border-[rgba(255,45,85,0.18)] p-12 sm:p-16 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[rgba(255,30,75,0.08)] border border-[rgba(255,30,75,0.2)] flex items-center justify-center text-[#ff4d6d]">
              <LinkIcon className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">No payment links yet</h3>
              <p className="text-xs text-[#b89fa5] max-w-sm mt-1">Create your first payment link to start receiving payments.</p>
            </div>
            <button
              onClick={onCreateNewLink}
              className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-extrabold shadow-[0_10px_26px_rgba(255,30,75,0.4)] hover:shadow-[0_14px_32px_rgba(255,30,75,0.6)] active:scale-95 transition-all cursor-pointer"
            >
              Create Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
