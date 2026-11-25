import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  BillingOrder,
  getBillingOrderStatus,
  verifyBillingOrder,
  cancelBillingOrder,
  formatBillingError,
} from '../services/billing.service';
import { ShowToastFn } from '../services/plans.service';
import { DEFAULT_BRANDING } from '../services/customize.service';
import {
  PayAnimStyles, AnimatedAmount, QrScanFrame, TrustRow,
  InvalidUtrModal, ConfirmCancelModal, ProcessingSheet, ResultPanel,
} from './pay/PayAnimations';

interface BillingCheckoutModalProps {
  order: BillingOrder | null;
  onClose: () => void;
  onRetry: () => Promise<void> | void;
  onFulfilled: (order: BillingOrder) => void;
  showToast?: ShowToastFn;
}

const FINAL_UNFULFILLED_STATUSES = new Set(['expired', 'cancelled', 'failed']);

export default function BillingCheckoutModal({
  order: initialOrder,
  onClose,
  onRetry,
  onFulfilled,
  showToast,
}: BillingCheckoutModalProps) {
  const [order, setOrder] = useState<BillingOrder | null>(initialOrder);
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [utr, setUtr] = useState<string>('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState<boolean>(false);
  const [invalidUtrMsg, setInvalidUtrMsg] = useState<string | null>(null);
  const utrInputRef = useRef<HTMLInputElement | null>(null);

  const fulfilledTriggeredRef = useRef<boolean>(false);
  const onFulfilledRef = useRef(onFulfilled);
  onFulfilledRef.current = onFulfilled;

  // Reset internal state when a new initialOrder is passed in
  useEffect(() => {
    setOrder(initialOrder);
    setUtr('');
    setVerifyError(null);
    setIsVerifying(false);
    setIsCancelling(false);
    setIsRetrying(false);
    fulfilledTriggeredRef.current = Boolean(
      initialOrder?.status === 'paid' && initialOrder?.fulfilled
    );
  }, [initialOrder?.order_id, initialOrder?.pay_amount, initialOrder?.expires_at]);

  // Countdown using server_time for clock skew
  useEffect(() => {
    if (!order || !order.expires_at) return;
    if (
      (order.status === 'paid' && order.fulfilled) ||
      FINAL_UNFULFILLED_STATUSES.has(order.status)
    ) {
      setSecondsLeft(0);
      return;
    }

    const serverMs = order.server_time ? Date.parse(order.server_time) : Date.now();
    const skewOffset = isNaN(serverMs) ? 0 : serverMs - Date.now();
    const expMs = Date.parse(order.expires_at);

    const calcRemaining = () => {
      if (isNaN(expMs)) return 0;
      return Math.max(0, Math.floor((expMs - (Date.now() + skewOffset)) / 1000));
    };

    setSecondsLeft(calcRemaining());
    const timer = setInterval(() => {
      const rem = calcRemaining();
      setSecondsLeft(rem);
      if (rem <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order?.order_id, order?.expires_at, order?.server_time, order?.status, order?.fulfilled]);

  // Poll GET /api/billing/status/:order_id every 3.5s until final status
  const isFinalFulfilled = order?.status === 'paid' && Boolean(order?.fulfilled);
  const isFinalFailedOrCancelled = Boolean(
    order && FINAL_UNFULFILLED_STATUSES.has(order.status)
  );
  const shouldPoll = Boolean(order?.order_id) && !isFinalFulfilled && !isFinalFailedOrCancelled;

  useEffect(() => {
    if (!shouldPoll || !order?.order_id) return;
    let active = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const targetOrderId = order.order_id;

    const poll = async () => {
      if (!active) return;
      try {
        const latest = await getBillingOrderStatus(targetOrderId);
        if (!active || !latest) return;

        setOrder((prev) => (prev ? { ...prev, ...latest } : latest));

        if (latest.status === 'paid' && latest.fulfilled === true) {
          if (!fulfilledTriggeredRef.current) {
            fulfilledTriggeredRef.current = true;
            onFulfilledRef.current(latest);
          }
          return;
        }

        if (FINAL_UNFULFILLED_STATUSES.has(latest.status)) {
          return;
        }
      } catch {
        // Keep polling transiently unless modal is closed
      }

      if (active) {
        timerId = setTimeout(poll, 3500);
      }
    };

    timerId = setTimeout(poll, 3500);

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [shouldPoll, order?.order_id]);

  if (!order) return null;

  const payAmountStr = Number(order.pay_amount ?? order.base_amount ?? 0).toFixed(2);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const countdownStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isCountdownZero = secondsLeft <= 0 && order.status === 'pending';
  const effectiveExpired = order.status === 'expired' || isCountdownZero;

  const itemTitle =
    order.kind === 'plan'
      ? `${order.plan_name || 'Plan'} Plan`
      : `${(order.credits ?? order.base_amount).toLocaleString('en-IN')} Hamro Credits`;

  const handleCopyUpi = () => {
    if (!order.upi_id) return;
    navigator.clipboard
      ?.writeText(order.upi_id)
      .then(() => {
        setCopiedUpi(true);
        showToast?.('UPI ID copied', 'success');
        setTimeout(() => setCopiedUpi(false), 1800);
      })
      .catch(() => {});
  };

  const handleVerifyUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = utr.trim();
    if (cleaned.length < 6) {
      setVerifyError('Please enter a valid UTR number (minimum 6 characters).');
      setInvalidUtrMsg('Please enter a valid UTR number (minimum 6 characters).');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    const minWait = new Promise<void>((resolve) => setTimeout(resolve, 2300));
    try {
      const updated = await verifyBillingOrder(order.order_id, cleaned);
      await minWait;
      const merged: BillingOrder = { ...order, ...updated };
      setOrder(merged);

      if (merged.status === 'paid' && merged.fulfilled === true) {
        if (!fulfilledTriggeredRef.current) {
          fulfilledTriggeredRef.current = true;
          onFulfilledRef.current(merged);
        }
      } else if (merged.status === 'paid') {
        showToast?.('Payment matched! Activating your order...', 'info');
      }
    } catch (err: any) {
      await minWait;
      const msg = formatBillingError(err, 'Verification failed. Please verify the UTR and exact amount paid.');
      setVerifyError(msg);
      setInvalidUtrMsg(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = async () => {
    if (isCancelling) return;
    setShowConfirmCancel(false);
    setIsCancelling(true);
    const minDisplay = new Promise<void>((resolve) => setTimeout(resolve, 2600));
    try {
      const res = await cancelBillingOrder(order.order_id);
      await minDisplay;
      setOrder((prev) =>
        prev ? { ...prev, ...(res || {}), status: 'cancelled' } : prev
      );
      showToast?.('Payment order cancelled', 'info');
    } catch (err: any) {
      showToast?.(formatBillingError(err, 'Failed to cancel order'), 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetryClick = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#120306] border border-[rgba(255,45,85,0.3)] p-5 sm:p-6 shadow-2xl space-y-4 text-[#fff2f4] my-auto hpa-pop"
        data-mode="dark"
        style={DEFAULT_BRANDING.vars as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <PayAnimStyles />
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,45,85,0.16)]">
          <div className="min-w-0">
            <h3 className="text-base font-black text-white truncate">
              {order.kind === 'plan' ? `Activate ${itemTitle}` : `Buy ${itemTitle}`}
            </h3>
            <div className="text-[11px] font-mono text-[#b89fa5] truncate">
              Order #{order.order_id}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#b89fa5] hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label="Close checkout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. SUCCESS SCREEN */}
        {isFinalFulfilled ? (
          <ResultPanel
            bare
            kind="success"
            title="Payment Successful"
            merchant={order.kind === 'plan' ? `${order.plan_name || 'Plan'} Plan` : 'Hamro Credits'}
            amount={`₹${payAmountStr}`}
            chipText="Paid"
            subtitle={
              order.kind === 'plan'
                ? `Your ${order.plan_name || ''} plan is now active.`
                : `${(order.credits ?? order.base_amount).toLocaleString('en-IN')} Hamro Credits added to your wallet.`
            }
            rows={[
              { label: 'Order ID', value: order.order_id, mono: true },
              ...(order.utr ? [{ label: 'UTR Reference', value: order.utr, mono: true }] : []),
            ]}
          >
            <button
              type="button"
              onClick={onClose}
              className="hpa-press mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white text-xs font-black shadow-lg shadow-rose-600/30 hover:brightness-110 cursor-pointer"
            >
              Done
            </button>
          </ResultPanel>
        ) : effectiveExpired || order.status === 'cancelled' || order.status === 'failed' ? (
          /* 2. EXPIRED / CANCELLED / FAILED SCREEN */
          <ResultPanel
            bare
            kind="failed"
            merchant={order.kind === 'plan' ? `${order.plan_name || 'Plan'} Plan` : 'Hamro Credits'}
            amount={`₹${payAmountStr}`}
            chipText={order.status === 'cancelled' ? 'Cancelled by user' : order.status === 'failed' ? 'Failed' : 'Expired'}
            title={order.status === 'expired' || effectiveExpired && order.status === 'pending' ? 'Payment Window Expired' : 'Payment Failed'}
            subtitle={
              order.message ||
              (order.status === 'cancelled'
                ? 'This checkout order was cancelled. Retry anytime to generate a new QR.'
                : order.status === 'failed'
                  ? 'We could not confirm this payment. Please retry with a fresh order.'
                  : 'The 15-minute payment window expired. Generate a fresh QR to complete payment.')
            }
            rows={[
              { label: 'Order ID', value: order.order_id, mono: true, accent: true },
              {
                label: 'Reason',
                value: order.status === 'cancelled' ? 'Cancelled by user' : order.status === 'failed' ? 'Payment not confirmed' : 'Window expired',
              },
            ]}
          >
            <div className="mt-4">
            <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#d4c2c7] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isRetrying}
                  onClick={handleRetryClick}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 hover:brightness-110 cursor-pointer disabled:opacity-60"
                >
                  {isRetrying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Retry</span>
                </button>
              </div>
            </div>
          </ResultPanel>
        ) : (
          /* 3. ACTIVE PENDING QR PAYMENT SCREEN */
          <div className="space-y-3.5 hpa-stagger">
            {/* Timer + Status */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-black/45 border border-[rgba(255,45,85,0.18)]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#ff8ca3]" />
                <span className="text-xs font-bold text-[#d4c2c7]">Expires in</span>
                <span className="text-sm font-black font-mono text-white">{countdownStr}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold text-[#2bf29a]">
                <span className="w-2 h-2 rounded-full bg-[#2bf29a] animate-pulse" />
                {order.status === 'paid' ? 'Activating...' : 'Awaiting Payment'}
              </span>
            </div>

            {/* Exact Amount Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[rgba(255,30,75,0.12)] to-[rgba(255,184,52,0.08)] border border-[rgba(255,45,85,0.3)] text-center space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#ff94a7]">
                Exact Amount to Pay
              </div>
              <div className="text-3xl font-black font-mono text-white tracking-tight">
                <AnimatedAmount value={payAmountStr} />
              </div>
              <p className="text-[11px] font-bold text-amber-200 leading-snug">
                {order.kind === 'plan'
                  ? 'Pay the exact amount shown. Your plan activates automatically.'
                  : 'Pay the exact amount shown. Your credits activate automatically.'}
              </p>
            </div>

            {/* QR Code & UPI ID */}
            <div className="flex flex-col items-center gap-2.5">
              {order.qr_code && (
                <QrScanFrame>
                  <div className="p-3 rounded-2xl bg-white shadow-lg">
                    <img
                      src={order.qr_code}
                      alt={`Scan to pay ₹${payAmountStr}`}
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                </QrScanFrame>
              )}

              {order.upi_id && (
                <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-black/45 border border-white/10">
                  <div className="min-w-0">
                    <span className="text-[9.5px] uppercase font-bold text-[#83686e] block">
                      UPI ID
                    </span>
                    <span className="text-xs font-mono font-bold text-white truncate block">
                      {order.upi_id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-[#d4c2c7] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="w-3 h-3 text-[#2bf29a]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#ff4d6d]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {order.upi_uri && (
                <a
                  href={order.upi_uri}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 hover:brightness-110 transition no-underline"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pay ₹{payAmountStr}</span>
                </a>
              )}
            </div>

            {/* Fallback UTR Verification */}
            <form
              onSubmit={handleVerifyUtr}
              className="pt-3 border-t border-[rgba(255,45,85,0.14)] space-y-2"
            >
              <label className="block text-[11px] font-extrabold text-[#d4c2c7]">
                Paid but not activated? Enter UTR
              </label>
              <div className="flex gap-2">
                <input
                  ref={utrInputRef}
                  type="text"
                  value={utr}
                  onChange={(e) => {
                    setUtr(e.target.value.replace(/[^A-Za-z0-9]/g, ''));
                    if (verifyError) setVerifyError(null);
                  }}
                  placeholder="Enter 12-digit UTR"
                  maxLength={30}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 focus:border-[#ff2d55] text-xs font-mono text-white outline-none"
                />
                <button
                  type="submit"
                  disabled={isVerifying || utr.trim().length < 6}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-black text-white disabled:opacity-45 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {isVerifying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2bf29a]" />
                  )}
                  <span>Verify</span>
                </button>
              </div>
              {verifyError && (
                <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/35 text-[11px] font-semibold text-rose-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{verifyError}</span>
                </div>
              )}
            </form>

            <TrustRow />

            {/* Cancel Action */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setShowConfirmCancel(true)}
                className="text-[11.5px] font-bold text-[#b89fa5] hover:text-[#ff4d6d] transition cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel payment'}
              </button>
            </div>
          </div>
        )}
      </div>

      {isVerifying && <ProcessingSheet mode="verify" />}
      {isCancelling && <ProcessingSheet mode="cancel" />}
      {showConfirmCancel && (
        <ConfirmCancelModal onNo={() => setShowConfirmCancel(false)} onYes={handleCancel} />
      )}
      {invalidUtrMsg !== null && (
        <InvalidUtrModal
          message={invalidUtrMsg}
          onRetry={() => {
            setInvalidUtrMsg(null);
            setTimeout(() => utrInputRef.current?.focus(), 50);
          }}
        />
      )}
    </div>
  );
}
