import { useState } from 'react';
import { Link as LinkIcon, Plus, Search, Check, Copy, Edit, Ban, HelpCircle } from 'lucide-react';
import { PaymentLink } from '../types';

interface PaymentLinksViewProps {
  paymentLinks: PaymentLink[];
  onToggleActive: (id: string | number) => void;
  onEditLink: (id: string | number) => void;
  onCreateNewLink: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PaymentLinksView({
  paymentLinks,
  onToggleActive,
  onEditLink,
  onCreateNewLink,
  showToast
}: PaymentLinksViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Stats calculations
  const totalLinks = paymentLinks.length;
  const activeLinks = paymentLinks.filter(l => l.active).length;
  const totalCollected = paymentLinks.reduce((sum, l) => sum + l.amount * l.orders, 0);

  // Filter links
  const filteredLinks = paymentLinks.filter(link => {
    const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && link.active) || 
      (statusFilter === 'inactive' && !link.active);
    return matchesSearch && matchesStatus;
  });

  const API_URL = (import.meta as any).env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

  const handleCopyLink = (id: string | number) => {
    const url = `${API_URL}/pay/${id}`;
    navigator.clipboard?.writeText(url).then(() => {
      showToast('Payment link copied to clipboard.', 'success');
    }).catch(() => {
      showToast('Could not copy link.', 'error');
    });
  };

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <LinkIcon className="w-5 h-5 stroke-[2.5]" />
            </span>
            My Payment Links
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Branded UPI checkouts to share with your customers.
          </p>
        </div>
        <button 
          onClick={onCreateNewLink}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/10 active:scale-95 transition-all focus:outline-none"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Create New Link
        </button>
      </header>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Links</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">{totalLinks}</div>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Channels</div>
          <div className="text-lg font-black text-emerald-600 tracking-tight mt-1">{activeLinks}</div>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collected Value</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">Rs. {totalCollected.toLocaleString('en-NP')}</div>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Conversion</div>
          <div className="text-lg font-black text-slate-800 tracking-tight mt-1">38.6%</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search payment links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-rose-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filter Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="w-full sm:w-auto text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:border-rose-500 focus:outline-none transition-all cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Links List */}
      <div className="space-y-4">
        {filteredLinks.length > 0 ? (
          filteredLinks.map(link => {
            const calculatedTotal = link.amount * link.orders;
            return (
              <article 
                key={link.id} 
                className={`
                  p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white
                  ${link.active 
                    ? 'border-slate-100 hover:border-slate-200' 
                    : 'border-slate-100 opacity-70 bg-slate-50/50'
                  }
                `}
              >
                {/* Left Metadata block */}
                <div className="flex items-center gap-3.5">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border
                    ${link.active 
                      ? 'bg-rose-50 border-rose-100 text-rose-600' 
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                    }
                  `}>
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {link.title}
                      {!link.active && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                          Paused
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Rs. {link.amount.toLocaleString('en-NP')} · {link.orders} successful payments · {link.date}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono text-slate-400">
                      <span className="text-slate-400 font-semibold">URL:</span>
                      <span className="text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md truncate max-w-[280px]">
                        {API_URL}/pay/{link.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right stats and controls block */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-3 md:pt-0 border-slate-100">
                  <div className="flex items-center gap-6 text-xs text-slate-500 font-semibold mr-2">
                    <div className="text-left md:text-right">
                      <b className="block text-sm font-black text-slate-800 leading-none">
                        Rs. {calculatedTotal.toLocaleString('en-NP')}
                      </b>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Collected</span>
                    </div>
                    <div className="text-left md:text-right">
                      <b className="block text-sm font-black text-slate-800 leading-none">{link.orders}</b>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Orders</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2">
                    {/* Active Toggle Switch */}
                    <button
                      onClick={() => onToggleActive(link.id)}
                      className={`
                        w-10 h-6 rounded-full p-0.5 transition-all outline-none relative cursor-pointer
                        ${link.active ? 'bg-rose-600' : 'bg-slate-200'}
                      `}
                      aria-label="Toggle link active state"
                    >
                      <div className={`
                        w-5 h-5 rounded-full bg-white shadow-xs transition-all transform
                        ${link.active ? 'translate-x-4' : 'translate-x-0'}
                      `} />
                    </button>

                    {/* Copy Link Button */}
                    <button
                      onClick={() => handleCopyLink(link.id)}
                      className="p-2 bg-slate-50 border border-slate-100 hover:border-slate-200 text-slate-600 hover:text-rose-600 rounded-xl shadow-xs transition-all active:scale-95"
                      title="Copy Checkout Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Edit Link Button */}
                    <button
                      onClick={() => onEditLink(link.id)}
                      className="p-2 bg-slate-50 border border-slate-100 hover:border-slate-200 text-slate-600 hover:text-rose-600 rounded-xl shadow-xs transition-all active:scale-95"
                      title="Edit Link Configuration"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <article className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Search className="w-6 h-6" />
            </div>
            <b className="text-base font-bold text-slate-800 block mb-1">No payment channels match</b>
            <p className="text-xs text-slate-400 font-medium">
              Adjust your filter or create a new checkout channel to start collecting.
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
