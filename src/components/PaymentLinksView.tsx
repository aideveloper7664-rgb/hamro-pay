import { useState, useEffect, useRef } from 'react';
import {
  Link as LinkIcon,
  Search,
  Copy,
  Check,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  PanelLeft,
  Palette,
  Eye,
  MoreHorizontal,
  Power,
  FlaskConical,
  PauseCircle
} from 'lucide-react';
import { PaymentLink } from '../types';
import { deleteLink, getLinkPaymentUrl } from '../services/paymentLink.service';

interface PaymentLinksViewProps {
  paymentLinks: PaymentLink[];
  onToggleActive: (id: string | number) => void;
  onToggleTestMode?: (id: string | number, nextIsTest: boolean) => Promise<void> | void;
  togglingLinkId?: string | number | null;
  onEditLink: (id: string | number) => void;
  onDeleteLink?: (id: string | number) => void;
  onCreateNewLink: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
  unreadNotifications?: number;
  isLoading?: boolean;
}

const isValidDateStr = (val?: string | null): boolean => {
  if (!val) return false;
  if (val === '7d' || val === '30d' || val === '90d' || val === 'never') return false;
  const ms = Date.parse(val);
  return !isNaN(ms);
};

const isLinkExpired = (link: PaymentLink): boolean => {
  const raw = link.expires_at || link.expiry;
  if (!isValidDateStr(raw)) return false;
  return Date.parse(raw!) < Date.now();
};

const formatDisplayDate = (val?: string | null): string | null => {
  if (!isValidDateStr(val)) return null;
  return new Date(val!).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function PaymentLinksView({
  paymentLinks,
  onToggleActive,
  onToggleTestMode,
  togglingLinkId,
  onEditLink,
  onDeleteLink,
  onCreateNewLink,
  showToast,
  onOpenSidebar,
  onViewChange,
  isLoading = false,
}: PaymentLinksViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Disabled'>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [confirmLiveModal, setConfirmLiveModal] = useState<{ id: string | number; nextIsTest: boolean } | null>(null);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openMenuId === null) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setConfirmDeleteId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openMenuId]);

  const totalLinks = paymentLinks.length;
  const activeLinks = paymentLinks.filter((l) => l.active && !isLinkExpired(l)).length;
  const totalCollected = paymentLinks.reduce((sum, l) => sum + (l.is_test ? 0 : l.amount * l.orders), 0);
  const expiredLinks = paymentLinks.filter((l) => isLinkExpired(l)).length;

  const handleTestModeToggleClick = (link: PaymentLink) => {
    const nextIsTest = !link.is_test;
    setOpenMenuId(null);
    if (!nextIsTest) {
      setConfirmLiveModal({ id: link.id, nextIsTest: false });
    } else if (onToggleTestMode) {
      onToggleTestMode(link.id, true);
    }
  };

  const handleConfirmLiveModal = () => {
    if (confirmLiveModal && onToggleTestMode) {
      onToggleTestMode(confirmLiveModal.id, confirmLiveModal.nextIsTest);
    }
    setConfirmLiveModal(null);
  };

  const filteredLinks = paymentLinks.filter((link) => {
    const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase());
    const expired = isLinkExpired(link);
    let matchesStatus = true;
    if (statusFilter === 'Active') matchesStatus = link.active && !expired;
    if (statusFilter === 'Disabled') matchesStatus = !link.active && !expired;
    if (statusFilter === 'Expired') matchesStatus = expired;
    return matchesSearch && matchesStatus;
  });

  const getCheckoutUrl = (link: PaymentLink) => {
    const linkIdentifier = String(link.link_id || link.id);
    return link.payment_url && link.payment_url.startsWith('http')
      ? link.payment_url
      : getLinkPaymentUrl(linkIdentifier);
  };

  const handleCopyLink = (link: PaymentLink) => {
    const url = getCheckoutUrl(link);
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopiedId(link.id);
        showToast('Payment link copied to clipboard.', 'success');
        setTimeout(() => {
          setCopiedId((prev) => (prev === link.id ? null : prev));
        }, 1800);
      })
      .catch(() => {
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
        if (err?.status !== 404) {
          throw err;
        }
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
      setOpenMenuId(null);
    }
  };

  return (
    <div className="min-h-screen text-[#fff2f4] flex flex-col">
      {/* Top Nav */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="w-9 h-9 rounded-[11px] bg-[#1a050a] border border-[#831f33] flex items-center justify-center text-[#ff8ca3] hover:text-white hover:border-[#ff2d55] hover:bg-[#280810] transition-all cursor-pointer shadow-[0_2px_10px_rgba(255,30,75,0.15)] active:scale-95"
            aria-label="Open navigation menu"
            onClick={onOpenSidebar}
            title="Toggle Navigation Menu"
          >
            <PanelLeft className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>
        </div>

        <div className="topbar-center">My Links</div>

        <div className="topbar-right">
          <button
            className="icon-btn"
            aria-label="Notifications"
            onClick={() => onViewChange?.('notifications')}
            title="View Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="badge-dot"></span>
          </button>
        </div>
      </header>

      <div className="page-content animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
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
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onViewChange?.('customize')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,30,75,0.12)] border border-[rgba(255,45,85,0.25)] text-[#fff2f4] hover:text-white text-[13px] font-bold transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
              title="Customize Checkout Theme & Page"
            >
              <Palette className="w-4 h-4 text-[#ff4d6d]" />
              <span>Customize checkout</span>
            </button>
            <button
              onClick={onCreateNewLink}
              className="inline-flex items-center justify-center gap-[7px] px-[18px] py-[10px] rounded-[11px] bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-[13.5px] font-extrabold shadow-[0_8px_24px_rgba(255,30,75,0.35),inset_0_1px_0_rgba(255,255,255,0.16)] hover:shadow-[0_12px_30px_rgba(255,30,75,0.55)] active:scale-95 transition-all cursor-pointer relative overflow-hidden whitespace-nowrap"
            >
              <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Link
            </button>
          </div>
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
            <div className="text-[24px] font-black tracking-[-0.6px] text-white tabular-nums mt-auto">{totalLinks}</div>
          </div>

          {/* Active */}
          <div className="relative p-[18px_20px_16px] rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col min-h-[128px]">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[#2bf29a]" />
            <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(43,242,154,0.12)] border border-[rgba(43,242,154,0.28)] grid place-items-center text-[#2bf29a] mb-3.5">
              <CheckCircle2 className="w-[18px] h-[18px]" />
            </div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-[#83686e] mb-2">Active</div>
            <div className="text-[24px] font-black tracking-[-0.6px] text-white tabular-nums mt-auto">{activeLinks}</div>
          </div>

          {/* Total Collected */}
          <div className="relative p-[18px_20px_16px] rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col min-h-[128px]">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ffb834]" />
            <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(255,184,52,0.12)] border border-[rgba(255,184,52,0.28)] grid place-items-center text-[#ffb834] mb-3.5">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12M6 21h12M8 3c0 5 8 5 8 0M8 21c0-5 8-5 8 0M9 12h6" />
              </svg>
            </div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-[#83686e] mb-2">Total Collected</div>
            <div className="text-[24px] font-black tracking-[-0.6px] text-white tabular-nums mt-auto">₹{totalCollected.toLocaleString('en-IN')}</div>
          </div>

          {/* Expired */}
          <div className="relative p-[18px_20px_16px] rounded-[18px] bg-gradient-to-br from-[rgba(28,7,12,0.82)] to-[rgba(14,3,7,0.95)] border border-[rgba(255,45,85,0.18)] shadow-lg overflow-hidden flex flex-col min-h-[128px]">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ff1e4b]" />
            <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(255,30,75,0.12)] border border-[rgba(255,30,75,0.28)] grid place-items-center text-[#ff4d6d] mb-3.5">
              <Clock className="w-[18px] h-[18px]" />
            </div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-[#83686e] mb-2">Expired</div>
            <div className="text-[24px] font-black tracking-[-0.6px] text-white tabular-nums mt-auto">{expiredLinks}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 p-[14px_18px] rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.82)] to-[rgba(12,2,6,0.95)] border border-[rgba(255,45,85,0.18)] mb-5">
          <div className="relative w-full sm:w-[140px]">
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

        {/* Links Card Grid or Empty State */}
        {isLoading && paymentLinks.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="p-5 rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.88)] to-[rgba(12,2,6,0.96)] border border-[rgba(255,45,85,0.18)] flex flex-col gap-4 animate-pulse"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-32 rounded bg-white/10" />
                  <div className="h-6 w-16 rounded-lg bg-white/10" />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="h-3 w-12 rounded bg-white/5" />
                    <div className="h-7 w-24 rounded bg-white/10" />
                  </div>
                  <div className="space-y-1.5 items-end flex flex-col">
                    <div className="h-3 w-12 rounded bg-white/5" />
                    <div className="h-4 w-16 rounded bg-white/10" />
                  </div>
                </div>
                <div className="h-9 w-full rounded-xl bg-white/5" />
                <div className="flex items-center gap-1.5">
                  <div className="h-9 flex-1 rounded-xl bg-white/10" />
                  <div className="h-9 w-9 rounded-xl bg-white/5" />
                  <div className="h-9 w-9 rounded-xl bg-white/5" />
                  <div className="h-9 w-9 rounded-xl bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLinks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredLinks.map((link) => {
              const calculatedTotal = link.is_test ? 0 : link.amount * link.orders;
              const checkoutUrl = getCheckoutUrl(link);
              const expired = isLinkExpired(link);
              const expiryFormatted = formatDisplayDate(link.expires_at || link.expiry);
              const isMenuOpen = openMenuId === link.id;
              const isToggling = togglingLinkId === link.id;
              const isCopied = copiedId === link.id;

              const shareText = encodeURIComponent(
                `Pay ₹${link.amount.toLocaleString('en-IN')} for ${link.title}: ${checkoutUrl}`
              );
              const whatsappUrl = `https://wa.me/?text=${shareText}`;
              const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
                checkoutUrl
              )}&text=${encodeURIComponent(`Pay ₹${link.amount.toLocaleString('en-IN')} for ${link.title}`)}`;

              return (
                <article
                  key={link.id}
                  className={`relative p-5 rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.88)] to-[rgba(12,2,6,0.96)] border transition-all flex flex-col gap-4 ${
                    isMenuOpen ? 'z-30' : 'z-0'
                  } ${
                    expired
                      ? 'border-[rgba(255,45,85,0.14)] opacity-85'
                      : link.active
                        ? 'border-[rgba(255,45,85,0.2)] hover:border-[rgba(255,60,95,0.48)]'
                        : 'border-white/10 opacity-75'
                  }`}
                >
                  {/* Row 1: Title & Status */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-[15px] font-black text-white tracking-tight truncate">
                        {link.title}
                      </h3>
                      {link.is_test && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-black text-amber-300 uppercase tracking-wider shrink-0">
                          TEST
                        </span>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 border ${
                        expired
                          ? 'bg-white/5 border-white/10 text-[#b89fa5]'
                          : link.active
                            ? 'bg-emerald-500/12 border-emerald-500/25 text-[#2bf29a]'
                            : 'bg-amber-500/12 border-amber-500/25 text-amber-300'
                      }`}
                    >
                      {expired ? (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Expired</span>
                        </>
                      ) : link.active ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3 h-3" />
                          <span>Paused</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Row 2: Amount & Paid Stats */}
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#83686e]">
                        Amount
                      </div>
                      <div className="text-[22px] font-black font-mono tabular-nums text-[#5b8dff] leading-tight mt-0.5">
                        ₹{link.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#83686e] tabular-nums">
                        PAID {link.orders}x
                      </div>
                      <div className="text-[13px] font-black font-mono tabular-nums text-[#2bf29a] mt-0.5">
                        ₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Checkout URL Box */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/45 border border-[rgba(255,45,85,0.16)]">
                    <LinkIcon className="w-3.5 h-3.5 text-[#5b8dff] shrink-0" />
                    <span
                      className="text-xs font-mono text-[#d4c2c7] truncate select-all"
                      title={checkoutUrl}
                    >
                      {checkoutUrl}
                    </span>
                  </div>

                  {/* Row 4: Action Buttons */}
                  <div
                    className="relative flex items-center gap-1.5"
                    ref={isMenuOpen ? menuContainerRef : null}
                  >
                    <button
                      type="button"
                      onClick={() => handleCopyLink(link)}
                      className="flex-1 h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[rgba(255,60,95,0.45)] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#2bf29a]" />
                          <span className="text-[#2bf29a]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#d4c2c7]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* WhatsApp */}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-[#d4c2c7] hover:text-[#2bf29a] grid place-items-center transition shrink-0"
                      title="Share on WhatsApp"
                      aria-label="Share on WhatsApp"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </a>

                    {/* Telegram */}
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-sky-500/15 border border-white/10 hover:border-sky-500/40 text-[#d4c2c7] hover:text-sky-400 grid place-items-center transition shrink-0"
                      title="Share on Telegram"
                      aria-label="Share on Telegram"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </svg>
                    </a>

                    {/* Preview / View */}
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[rgba(255,60,95,0.45)] text-[#d4c2c7] hover:text-white grid place-items-center transition shrink-0"
                      title="Open Payment Page"
                      aria-label="Open Payment Page"
                    >
                      <Eye className="w-4 h-4" />
                    </a>

                    {/* More Menu Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteId(null);
                        setOpenMenuId(isMenuOpen ? null : link.id);
                      }}
                      className={`w-9 h-9 rounded-xl border grid place-items-center transition shrink-0 cursor-pointer ${
                        isMenuOpen
                          ? 'bg-[rgba(255,30,75,0.2)] border-[#ff2d55] text-white'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-[rgba(255,60,95,0.45)] text-[#d4c2c7] hover:text-white'
                      }`}
                      title="More actions"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 bottom-11 w-48 rounded-xl bg-[#160409] border border-[rgba(255,45,85,0.32)] shadow-[0_18px_40px_rgba(0,0,0,0.85)] p-1.5 z-40 space-y-0.5">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => {
                            setOpenMenuId(null);
                            onToggleActive(link.id);
                          }}
                          className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-[#fff2f4] hover:bg-white/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Power className={`w-3.5 h-3.5 ${link.active ? 'text-amber-300' : 'text-[#2bf29a]'}`} />
                          <span>{link.active ? 'Pause Link' : 'Activate Link'}</span>
                        </button>

                        {onToggleTestMode && (
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleTestModeToggleClick(link)}
                            className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-[#fff2f4] hover:bg-white/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <FlaskConical className={`w-3.5 h-3.5 ${link.is_test ? 'text-[#2bf29a]' : 'text-amber-300'}`} />
                            <span>{link.is_test ? 'Switch to Live Mode' : 'Switch to Test Mode'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            onEditLink(link.id);
                          }}
                          className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-[#fff2f4] hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#5b8dff]" />
                          <span>Edit Link</span>
                        </button>

                        <div className="my-1 border-t border-white/10" />

                        {confirmDeleteId === link.id ? (
                          <div className="p-1.5 space-y-1.5">
                            <div className="text-[11px] font-bold text-rose-300 px-1">Delete this link?</div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={deletingId === link.id}
                                onClick={() => handleDelete(link)}
                                className="flex-1 py-1.5 rounded-lg bg-[#ff1e4b] hover:bg-[#d8002f] text-white text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {deletingId === link.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <span>Delete</span>
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === link.id}
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[#d4c2c7] text-[11px] font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(link.id)}
                            className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Link</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 5: Footer Expiry / Date */}
                  <div className="flex items-center justify-between gap-2 text-[11.5px] text-[#83686e] font-semibold">
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {expiryFormatted
                          ? `Expires: ${expiryFormatted}`
                          : link.expiry === 'never'
                            ? 'Never expires'
                            : `Created: ${link.date}`}
                      </span>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[18px] bg-gradient-to-br from-[rgba(24,6,10,0.75)] to-[rgba(12,2,6,0.9)] border border-[rgba(255,45,85,0.18)] py-[64px] px-[24px] pb-[72px] flex flex-col items-center justify-center text-center gap-[14px] min-h-[420px]">
            <div className="w-[80px] h-[80px] grid place-items-center text-[rgba(255,45,85,0.38)] mb-[6px]">
              <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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

        {/* Confirm Live Dialog Modal */}
        {confirmLiveModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040102]/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setConfirmLiveModal(null)}
          >
            <div
              className="relative w-full max-w-[420px] rounded-[22px] bg-gradient-to-br from-[rgba(26,6,12,0.98)] to-[rgba(12,2,6,0.99)] border border-amber-500/35 p-6 space-y-4 shadow-[0_40px_90px_rgba(0,0,0,0.85)] text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/35 grid place-items-center text-amber-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-white">Switch to Live Mode?</h3>
              </div>
              <p className="text-xs text-[#d8c5ca] leading-relaxed">
                Live karne par customer ke asli payments is link par lagenge. Continue?
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmLiveModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLiveModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-black shadow-md shadow-rose-600/30 hover:shadow-lg transition cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
