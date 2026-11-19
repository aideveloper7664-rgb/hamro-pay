import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Plus, ArrowUpRight, CheckCircle2
} from 'lucide-react';
import { FamPayIcon, PaytmIcon, AmazonPayIcon } from './BrandIcons';
import {
  CashierAccount,
  getCashierList,
  toggleCashier,
  getCashierProviderMeta,
  maskUpiId
} from '../services/cashier.service';

interface PaymentRoutingCardProps {
  onViewChange: (view: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onCashierChanged?: (active: CashierAccount | null) => void;
  refreshTrigger?: number;
}

const getProviderBrandBadge = (type?: string) => {
  const norm = (type || '').toLowerCase();
  if (norm === 'amazon') {
    return {
      Icon: AmazonPayIcon,
      bg: '#232f3e',
      border: 'rgba(255, 153, 0, 0.45)',
    };
  }
  if (norm === 'paytm' || norm === 'paytm_mid') {
    return {
      Icon: PaytmIcon,
      bg: '#ffffff',
      border: 'rgba(0, 186, 242, 0.5)',
    };
  }
  return {
    Icon: FamPayIcon,
    bg: 'linear-gradient(135deg, #17171c, #0c0c10)',
    border: 'rgba(255, 138, 0, 0.45)',
  };
};

export default function PaymentRoutingCard({
  onViewChange,
  showToast,
  onCashierChanged,
  refreshTrigger = 0,
}: PaymentRoutingCardProps) {
  const [accounts, setAccounts] = useState<CashierAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await getCashierList();
      setAccounts(list);
    } catch {
      // Keep current state cleanly
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts, refreshTrigger]);

  const handleSelectAccount = async (target: CashierAccount) => {
    const targetId = target.id || target._id;
    const isLegacyPaytm = (target.type || '').toLowerCase() === 'paytm';
    if (!targetId || switchingId || isLegacyPaytm) return;

    const alreadyActive = Boolean(target.is_active ?? target.isActive);
    if (alreadyActive) return;

    const previousSnapshot = accounts;
    const optimisticList = accounts.map(acc => {
      const accId = acc.id || acc._id;
      const isSelected = accId === targetId;
      return { ...acc, is_active: isSelected, isActive: isSelected };
    });

    setAccounts(optimisticList);
    setSwitchingId(targetId);

    try {
      await toggleCashier(targetId);
      const activated = optimisticList.find(a => (a.id || a._id) === targetId) || target;
      onCashierChanged?.(activated);
      const meta = getCashierProviderMeta(target.type);
      showToast?.(`Payment routing switched to ${meta.label}`, 'success');
    } catch (err: unknown) {
      setAccounts(previousSnapshot);
      const errMsg = (err as { message?: string })?.message || 'Could not switch active account';
      showToast?.(errMsg, 'error');
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div
      className="dash-panel"
      style={{ marginBottom: '20px' }}
    >
      <div className="panel-head" style={{ marginBottom: '12px', paddingBottom: '12px' }}>
        <div>
          <div className="panel-title">
            <span className="t-icon" style={{ background: 'rgba(43,242,154,0.14)', borderColor: 'rgba(43,242,154,0.3)', color: '#2bf29a' }}>
              <CheckCircle2 className="w-4 h-4" />
            </span>
            Payment routing
          </div>
          <p className="text-[11px] text-[#b89fa5] mt-1 font-medium">
            Customers will pay to the selected account. Only one account is active at a time.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onViewChange('fampay')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-[#ff9933] transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <FamPayIcon className="w-3.5 h-3.5 shrink-0" />
            <span>FamPay</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('paytm')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-sky-400 transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <span className="w-4 h-4 rounded bg-white inline-flex items-center justify-center shrink-0">
              <PaytmIcon className="w-3 h-3" />
            </span>
            <span>Paytm</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('amazon')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-amber-400 transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <AmazonPayIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Amazon Pay</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {[1, 2].map(i => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse border border-white/5" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-4 rounded-xl bg-black/40 border border-[rgba(255,45,85,0.14)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-[#b89fa5]">
            No payment account connected yet. Connect <strong className="text-white">FamPay</strong>, <strong className="text-white">Amazon Pay</strong>, or <strong className="text-white">Paytm</strong> to accept UPI payments.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onViewChange('fampay')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer hover:brightness-110 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Account</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {accounts.map(acc => {
            const accId = acc.id || acc._id || '';
            const isLegacyPaytm = (acc.type || '').toLowerCase() === 'paytm';
            const isActive = !isLegacyPaytm && Boolean(acc.is_active ?? acc.isActive);
            const isSwitching = switchingId === accId;
            const meta = getCashierProviderMeta(acc.type);
            const brandBadge = getProviderBrandBadge(acc.type);
            const BrandIcon = brandBadge.Icon;
            const upi = acc.upi_id || acc.upiId || '';

            return (
              <button
                key={accId}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={Boolean(switchingId) || isLegacyPaytm}
                onClick={() => handleSelectAccount(acc)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 ${
                  isLegacyPaytm
                    ? 'bg-black/25 border-white/10 opacity-60 cursor-not-allowed'
                    : isActive
                    ? 'bg-[rgba(43,242,154,0.08)] border-[#2bf29a]/45 shadow-[0_4px_18px_rgba(43,242,154,0.12)] cursor-pointer'
                    : 'bg-black/40 border-[rgba(255,45,85,0.14)] hover:border-[rgba(255,45,85,0.35)] hover:bg-black/60 cursor-pointer'
                } disabled:opacity-70`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Radio indicator */}
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isLegacyPaytm
                        ? 'border-slate-700'
                        : isActive
                        ? 'border-[#2bf29a]'
                        : 'border-[#83686e]'
                    }`}
                  >
                    {isSwitching ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#ff4d6d]" />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[#2bf29a]" />
                    ) : null}
                  </span>

                  {/* Provider Icon */}
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      background: brandBadge.bg,
                      borderColor: brandBadge.border,
                    }}
                  >
                    <BrandIcon className="w-4.5 h-4.5" />
                  </span>

                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#fff2f4] flex items-center gap-1.5 truncate">
                      <span>{meta.badgeLabel}</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#b89fa5] truncate">
                      {isLegacyPaytm ? `${maskUpiId(upi)} · Reconnect with MID` : maskUpiId(upi)}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                    isLegacyPaytm
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                      : isActive
                      ? 'bg-[#2bf29a]/15 text-[#2bf29a] border border-[#2bf29a]/35'
                      : 'bg-white/5 text-[#83686e] border border-white/10'
                  }`}
                >
                  {isLegacyPaytm ? 'Unsupported' : isActive ? 'Active' : 'Standby'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
