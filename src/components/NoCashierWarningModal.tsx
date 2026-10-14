import React from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight, X } from 'lucide-react';

interface NoCashierWarningModalProps {
  isOpen: boolean;
  onConnectFamPay: () => void;
  onClose: () => void;
}

export default function NoCashierWarningModal({
  isOpen,
  onConnectFamPay,
  onClose
}: NoCashierWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040102]/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[460px] rounded-[22px] bg-gradient-to-br from-[rgba(24,6,10,0.98)] to-[rgba(12,2,6,0.99)] border border-[rgba(255,45,85,0.25)] shadow-[0_40px_90px_rgba(0,0,0,0.85),0_0_70px_rgba(255,30,75,0.2)] text-[#fff2f4] overflow-hidden p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 grid place-items-center text-amber-400 shadow-lg shadow-amber-500/10">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Body */}
        <div className="space-y-2">
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>No Payment Account Connected</span>
          </h3>
          <p className="text-xs text-[#d4c2c7] leading-relaxed">
            Please connect your FamPay account first to create payment links. Without a connected cashier, customer payments cannot be processed.
          </p>
        </div>

        {/* Notice Card */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11.5px] text-amber-200 font-medium flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Connecting your FamPay UPI account gives you instant direct settlements.</span>
        </div>

        {/* Actions: Connect FamPay or Cancel */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={onConnectFamPay}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-extrabold shadow-md shadow-rose-600/30 hover:shadow-lg hover:shadow-rose-600/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Connect FamPay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
