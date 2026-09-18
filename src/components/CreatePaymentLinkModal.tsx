import { useState } from 'react';
import { X, Link as LinkIcon, DollarSign, Settings, ChevronDown } from 'lucide-react';

interface CreatePaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    note: string;
    redirectUrl: string;
    expiry: string;
    usageLimit?: number;
  }) => void;
  initialData?: {
    title: string;
    amount: number;
    note?: string;
    redirectUrl?: string;
    expiry?: string;
    usageLimit?: number;
  } | null;
  isEditing: boolean;
  linkLimit: number;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function CreatePaymentLinkModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing,
  linkLimit,
  showToast
}: CreatePaymentLinkModalProps) {
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [title, setTitle] = useState(initialData ? initialData.title : '');
  const [note, setNote] = useState(initialData ? initialData.note || '' : '');
  const [redirectUrl, setRedirectUrl] = useState(initialData ? initialData.redirectUrl || '' : '');
  const [expiry, setExpiry] = useState(initialData ? initialData.expiry || '7d' : '7d');
  const [usageLimit, setUsageLimit] = useState(initialData?.usageLimit ? String(initialData.usageLimit) : '');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleQuickAmount = (val: number) => {
    setAmount(String(val));
  };

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (!title.trim() || isNaN(num) || num <= 0) {
      showToast('Please specify a valid title and amount.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit({
        title: title.trim(),
        amount: num,
        note: note.trim(),
        redirectUrl: redirectUrl.trim(),
        expiry,
        usageLimit: usageLimit ? parseInt(usageLimit) : undefined
      });
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040102]/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Box */}
      <div className="relative w-full max-w-[560px] max-h-[calc(100vh-48px)] flex flex-col rounded-[22px] bg-gradient-to-br from-[rgba(24,6,10,0.97)] to-[rgba(12,2,6,0.99)] border border-[rgba(255,45,85,0.18)] shadow-[0_40px_90px_rgba(0,0,0,0.75),0_0_70px_rgba(255,30,75,0.16)] text-[#fff2f4] overflow-hidden">
        
        {/* Header */}
        <div className="relative flex items-center gap-3.5 px-6 py-5 bg-gradient-to-br from-[rgba(60,10,20,0.95)] to-[rgba(28,5,12,0.98)] border-b border-[rgba(255,45,85,0.22)]">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#b8002c] grid place-items-center text-white shrink-0 shadow-[0_0_22px_rgba(255,30,75,0.5)]">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black tracking-tight text-white leading-tight">
              {isEditing ? 'Edit Payment Link' : 'Create Payment Link'}
            </h2>
            <p className="text-[11.55px] text-[#e5b8c4] font-medium mt-0.5">
              Create a secure payment request in seconds
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#ffdcfe]/80 hover:text-white hover:bg-[rgba(255,30,75,0.18)] hover:border-[rgba(255,60,95,0.4)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Section Head */}
          <div className="flex items-center gap-3 pb-3.5 border-b border-[rgba(255,45,85,0.10)]">
            <div className="w-8 h-8 rounded-xl bg-[rgba(255,30,75,0.12)] border border-[rgba(255,30,75,0.25)] grid place-items-center text-[#ff4d6d]">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <strong className="block text-sm font-black text-white tracking-tight">Payment Details</strong>
              <span className="block text-[11.5px] text-[#b89fa5] font-medium">Enter the basic details of your payment link</span>
            </div>
          </div>

          {/* Amount Field */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#fce4e8] tracking-wide">
              Amount (₹) <span className="text-[#ff1e4b]">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[15px] font-black text-[#ff4d6d]">₹</span>
              <input
                type="number"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[rgba(12,2,6,0.75)] border border-[rgba(255,45,85,0.18)] text-white text-sm font-bold focus:border-[rgba(255,60,95,0.7)] focus:bg-[rgba(20,4,9,0.9)] focus:outline-none focus:ring-4 focus:ring-[rgba(255,30,75,0.12)] transition-all placeholder:text-[rgba(184,159,165,0.5)]"
                required
              />
            </div>
          </div>

          {/* Quick Amount Chips */}
          <div>
            <div className="text-[11px] font-bold text-[#b89fa5] uppercase tracking-wider mb-2">Quick Amount</div>
            <div className="grid grid-cols-4 gap-2">
              {[99, 199, 499, 999].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className={`py-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                    amount === String(val)
                      ? 'bg-gradient-to-br from-[rgba(255,30,75,0.28)] to-[rgba(255,30,75,0.1)] border-[rgba(255,60,95,0.6)] text-white shadow-[0_4px_16px_rgba(255,30,75,0.22)]'
                      : 'bg-[rgba(20,5,10,0.85)] border-[rgba(255,45,85,0.15)] text-[#ffd6dc] hover:border-[rgba(255,60,95,0.45)] hover:text-white'
                  }`}
                >
                  ₹{val}
                </button>
              ))}
            </div>
          </div>

          {/* Title Field */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#fce4e8] tracking-wide">
              Title <span className="text-[#ff1e4b]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Website Design, Product Order"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[rgba(12,2,6,0.75)] border border-[rgba(255,45,85,0.18)] text-white text-sm font-semibold focus:border-[rgba(255,60,95,0.7)] focus:bg-[rgba(20,4,9,0.9)] focus:outline-none focus:ring-4 focus:ring-[rgba(255,30,75,0.12)] transition-all placeholder:text-[rgba(184,159,165,0.5)]"
              required
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#fce4e8] tracking-wide">
              Description <span className="text-[#83686e] font-normal text-[11px]">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Additional details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[rgba(12,2,6,0.75)] border border-[rgba(255,45,85,0.18)] text-white text-sm font-semibold focus:border-[rgba(255,60,95,0.7)] focus:bg-[rgba(20,4,9,0.9)] focus:outline-none focus:ring-4 focus:ring-[rgba(255,30,75,0.12)] transition-all placeholder:text-[rgba(184,159,165,0.5)] resize-none"
            />
          </div>

          {/* Advanced Options Card */}
          <div className="rounded-xl bg-gradient-to-br from-[rgba(20,5,10,0.75)] to-[rgba(12,2,6,0.85)] border border-[rgba(255,45,85,0.16)] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex items-center gap-3 p-3.5 text-left cursor-pointer hover:bg-[rgba(255,30,75,0.04)] transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-[rgba(167,139,250,0.14)] border border-[rgba(167,139,250,0.28)] grid place-items-center text-[#a78bfa] shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block text-xs font-bold text-white">Advanced Options</strong>
                <span className="block text-[11px] text-[#b89fa5]">Redirect, expiry and more settings</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#b89fa5] transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAdvancedOpen && (
              <div className="p-4 pt-1 space-y-4 border-t border-[rgba(255,45,85,0.10)] bg-[rgba(8,1,4,0.4)]">
                {/* Redirect URL */}
                <div className="space-y-1.5 pt-3">
                  <label className="block text-[11.5px] font-bold text-[#fce4e8]">
                    Redirect URL <span className="text-[#83686e] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourwebsite.com/thank-you"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(12,2,6,0.75)] border border-[rgba(255,45,85,0.18)] text-white text-xs font-semibold focus:border-[rgba(255,60,95,0.7)] focus:outline-none"
                  />
                  <p className="text-[10.5px] text-[#83686e]">Customer will be redirected here after a successful payment.</p>
                </div>

                {/* Expiry */}
                <div className="space-y-1.5">
                  <label className="block text-[11.5px] font-bold text-[#fce4e8]">Link Expiry</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: '7d', label: '7 Days' },
                      { id: '30d', label: '30 Days' },
                      { id: '90d', label: '90 Days' },
                      { id: 'never', label: 'Never Expire' }
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setExpiry(item.id)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          expiry === item.id
                            ? 'bg-gradient-to-br from-[rgba(255,30,75,0.28)] to-[rgba(255,30,75,0.1)] border-[rgba(255,60,95,0.6)] text-white shadow-sm'
                            : 'bg-[rgba(12,2,6,0.75)] border-[rgba(255,45,85,0.16)] text-[#d4c2c7] hover:border-[rgba(255,60,95,0.42)] hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Usage Limit */}
                <div className="space-y-1.5">
                  <label className="block text-[11.5px] font-bold text-[#fce4e8]">
                    Usage Limit (Max Payments) <span className="text-[#83686e] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50 (Leave blank for unlimited)"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(12,2,6,0.75)] border border-[rgba(255,45,85,0.18)] text-white text-xs font-semibold focus:border-[rgba(255,60,95,0.7)] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-b from-[rgba(12,2,6,0.6)] to-[rgba(8,1,4,0.9)] border-t border-[rgba(255,45,85,0.12)] space-y-3">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[rgba(20,5,10,0.7)] border border-[rgba(255,45,85,0.14)] text-xs">
            <div>
              <span className="block text-[10px] font-bold text-[#83686e] uppercase">Commission</span>
              <span className="font-extrabold text-[#ff5274]">1.5%</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold text-[#83686e] uppercase">Links Remaining</span>
              <span className="font-extrabold text-[#2bf29a]">{linkLimit} remaining</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-[rgba(28,8,12,0.75)] border border-[rgba(255,45,85,0.22)] text-[#d4c2c7] text-xs font-extrabold hover:bg-[rgba(48,12,19,0.9)] hover:border-[rgba(255,60,95,0.5)] hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="py-3 px-4 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-extrabold shadow-[0_10px_26px_rgba(255,30,75,0.4)] hover:shadow-[0_14px_34px_rgba(255,30,75,0.6)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
            >
              <LinkIcon className="w-4 h-4" />
              {isSubmitting ? 'Generating...' : isEditing ? 'Save Changes' : 'Generate Payment Link'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
