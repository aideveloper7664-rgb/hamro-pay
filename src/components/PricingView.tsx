import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Check,
  Lock,
  Award,
  Crown,
  Code2,
  Star,
  Sparkles,
  Loader2,
  Shield,
  Rocket,
  Clock,
  RefreshCw,
  AlertCircle,
  QrCode,
  Receipt
} from 'lucide-react';
import { CurrentPlanState, PlanDefinition } from '../types';
import {
  getPlans,
  getCurrentPlan,
  getDaysLeftFromExpiry,
  hasDeveloperPortalAccess,
  hasApiDocsAccess,
  ShowToastFn
} from '../services/plans.service';
import {
  BillingOrder,
  createBillingCheckout,
  getBillingOrders,
  formatBillingError
} from '../services/billing.service';
import { getCreditBalance } from '../services/credits.service';
import BillingCheckoutModal from './BillingCheckoutModal';

interface PricingViewProps {
  currentPlanState?: CurrentPlanState | null;
  plansCatalog?: PlanDefinition[];
  onPlanUpdated?: (nextState: CurrentPlanState) => void;
  showToast?: ShowToastFn;
  onViewChange?: (view: string) => void;
}

const getPlanStyleMeta = (name: string) => {
  const upper = name.toUpperCase();
  switch (upper) {
    case 'FREE':
      return { iconType: 'slate', Icon: Zap, tag: null, isPopular: false };
    case 'BASIC':
      return { iconType: 'gold', Icon: Award, tag: 'Starter', isPopular: false };
    case 'STARTER':
      return { iconType: 'purple', Icon: Rocket, tag: null, isPopular: false };
    case 'GROWTH':
      return { iconType: 'blue', Icon: Star, tag: null, isPopular: true };
    case 'BUSINESS':
      return { iconType: 'red', Icon: Code2, tag: 'API + Themes', isPopular: false };
    case 'ADVANCE':
      return { iconType: 'gold', Icon: Crown, tag: 'Branding', isPopular: false };
    case 'ELITE':
      return { iconType: 'purple', Icon: Sparkles, tag: 'Max Scale', isPopular: false };
    default:
      return { iconType: 'blue', Icon: Shield, tag: null, isPopular: false };
  }
};

const formatAccountsText = (accounts?: PlanDefinition['accounts']): string => {
  if (!accounts) return 'Cashier accounts';
  const vals = [accounts.fampay, accounts.paytm_mid, accounts.amazon];
  const allNull = vals.every((v) => v === null);
  if (allNull) return 'Unlimited cashier accounts';
  if (vals[0] !== null && vals[0] === vals[1] && vals[1] === vals[2]) {
    const n = vals[0]!;
    return `${n} account${n === 1 ? '' : 's'} per provider`;
  }
  const fmt = (v: number | null) => (v === null ? '∞' : String(v));
  return `FamPay ${fmt(accounts.fampay)} · Paytm ${fmt(accounts.paytm_mid)} · Amazon ${fmt(accounts.amazon)}`;
};

const buildPlanFeatures = (plan: PlanDefinition) => {
  const linksText =
    plan.links_per_month === null
      ? 'Unlimited payment links'
      : `${plan.links_per_month.toLocaleString('en-IN')}/month payment links`;
  const linksBold =
    plan.links_per_month === null
      ? 'Unlimited'
      : `${plan.links_per_month.toLocaleString('en-IN')}/month`;

  const expiryText =
    plan.link_expiry_days === null
      ? 'Never expires'
      : `${plan.link_expiry_days} day link expiry`;
  const expiryBold =
    plan.link_expiry_days === null ? 'Never expires' : `${plan.link_expiry_days} day`;

  const maxAmountText =
    plan.max_amount === null
      ? 'Unlimited amount per link'
      : `Up to ₹${plan.max_amount.toLocaleString('en-IN')} per link`;
  const maxAmountBold =
    plan.max_amount === null ? 'Unlimited' : `₹${plan.max_amount.toLocaleString('en-IN')}`;

  const commissionText = `${plan.commission}% commission`;
  const commissionBold = `${plan.commission}%`;

  const webhooksLocked = plan.webhooks === 0;
  const webhooksText =
    plan.webhooks === null
      ? 'Unlimited webhooks'
      : plan.webhooks === 0
        ? 'Webhooks'
        : `${plan.webhooks} webhook${plan.webhooks === 1 ? '' : 's'}`;
  const webhooksBold =
    plan.webhooks === null ? 'Unlimited' : plan.webhooks === 0 ? '' : String(plan.webhooks);

  const accountsText = formatAccountsText(plan.accounts);

  return [
    { text: linksText, locked: false, bold: linksBold },
    { text: expiryText, locked: false, bold: expiryBold },
    { text: maxAmountText, locked: false, bold: maxAmountBold },
    { text: commissionText, locked: false, bold: commissionBold },
    { text: accountsText, locked: false, bold: '' },
    { text: webhooksText, locked: webhooksLocked, bold: webhooksBold },
    { text: 'Developer Portal & API', locked: !hasDeveloperPortalAccess(plan), bold: '' },
    { text: 'API integration docs', locked: !hasApiDocsAccess(plan), bold: '' },
    { text: 'Custom themes & QR styling', locked: !(plan.custom_pages || plan.qr_theme), bold: '' },
    { text: 'Custom branding & logo', locked: !plan.branding, bold: '' },
    ...(plan.advanced_api ? [{ text: 'Advanced API access', locked: false, bold: '' }] : []),
    ...(plan.multiple_pages ? [{ text: 'Multiple checkout pages', locked: false, bold: '' }] : []),
  ];
};

const computeTotalAccountLimit = (accounts?: PlanDefinition['accounts']): number | null => {
  if (!accounts) return null;
  const vals = [accounts.fampay, accounts.paytm_mid, accounts.amazon];
  if (vals.some((v) => v === null)) return null;
  return vals.reduce<number>((sum, v) => sum + Number(v || 0), 0);
};

export default function PricingView({
  currentPlanState: propPlanState,
  plansCatalog: propPlansCatalog,
  onPlanUpdated,
  showToast,
  onViewChange,
}: PricingViewProps) {
  const [plans, setPlans] = useState<PlanDefinition[]>(propPlansCatalog || []);
  const [currentState, setCurrentState] = useState<CurrentPlanState | null>(propPlanState || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingOutPlan, setCheckingOutPlan] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<BillingOrder | null>(null);
  const [pendingRetryPlan, setPendingRetryPlan] = useState<string | null>(null);
  const [billingOrders, setBillingOrders] = useState<BillingOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    showToast?.(msg, type);
  };

  const loadBillingOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const orders = await getBillingOrders();
      setBillingOrders(orders);
    } catch {
      // Keep existing orders on transient failure
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const fetchedPlans = await getPlans();
      setPlans(fetchedPlans);
      try {
        const cur = await getCurrentPlan(fetchedPlans);
        setCurrentState(cur);
        onPlanUpdated?.(cur);
      } catch {
        // Keep propPlanState if /current temporarily unavailable
      }
      loadBillingOrders();
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  }, [onPlanUpdated, loadBillingOrders]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (propPlanState) {
      setCurrentState(propPlanState);
    }
  }, [propPlanState]);

  const activePlan = currentState?.plan;
  const activePlanName = (activePlan?.name || 'FREE').toUpperCase();
  const daysLeft = getDaysLeftFromExpiry(currentState?.expires_at || null);
  const usage = currentState?.usage;

  const linksUsed = usage?.links_used ?? 0;
  const linksLimit = usage?.links_limit !== undefined ? usage.links_limit : (activePlan?.links_per_month ?? null);
  const webhooksUsed = usage?.webhooks_used ?? 0;
  const webhooksLimit = usage?.webhooks_limit !== undefined ? usage.webhooks_limit : (activePlan?.webhooks ?? null);
  const accountsUsed = usage?.accounts_used ?? 0;
  const accountsLimit =
    usage?.accounts_limit !== undefined
      ? usage.accounts_limit
      : computeTotalAccountLimit(activePlan?.accounts);

  const startPlanCheckout = async (planName: string) => {
    setCheckingOutPlan(planName);
    setPendingRetryPlan(planName);
    try {
      const order = await createBillingCheckout({ kind: 'plan', plan: planName });
      setCheckoutOrder(order);
      loadBillingOrders();
    } catch (err: any) {
      notify(formatBillingError(err, 'Unable to start plan checkout'), 'error');
    } finally {
      setCheckingOutPlan(null);
    }
  };

  const resumeOrderCheckout = async (orderItem: BillingOrder) => {
    const key = orderItem.order_id;
    setCheckingOutPlan(key);
    try {
      const freshOrder =
        orderItem.kind === 'plan' && orderItem.plan_name
          ? await createBillingCheckout({ kind: 'plan', plan: orderItem.plan_name })
          : await createBillingCheckout({
              kind: 'credits',
              amount: Number(orderItem.credits ?? orderItem.base_amount),
            });
      if (orderItem.kind === 'plan' && orderItem.plan_name) {
        setPendingRetryPlan(orderItem.plan_name);
      }
      setCheckoutOrder(freshOrder);
    } catch (err: any) {
      notify(formatBillingError(err, 'Unable to resume payment order'), 'error');
    } finally {
      setCheckingOutPlan(null);
    }
  };

  const handleCheckoutFulfilled = async (fulfilledOrder: BillingOrder) => {
    try {
      const updated = await getCurrentPlan(plans).catch(() => null);
      if (updated) {
        setCurrentState(updated);
        onPlanUpdated?.(updated);
      }
      await getCreditBalance().catch(() => {});
    } finally {
      loadBillingOrders();
      notify(
        fulfilledOrder.kind === 'plan'
          ? `${fulfilledOrder.plan_name || 'Plan'} activated successfully!`
          : 'Credits added to your balance!',
        'success'
      );
    }
  };

  const renderUsageBar = (
    label: string,
    used: number,
    limit: number | null,
    subHint?: string
  ) => {
    const isUnlimited = limit === null;
    const pct = isUnlimited || limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
    const isNearLimit = !isUnlimited && limit > 0 && pct >= 85;

    return (
      <div className="p-3.5 rounded-xl bg-black/40 border border-[rgba(255,45,85,0.16)] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#b89fa5]">
            {label}
          </span>
          <span className="text-xs font-black font-mono text-white">
            {used.toLocaleString('en-IN')} / {isUnlimited ? '∞' : limit.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isUnlimited
                ? 'bg-emerald-500/70'
                : isNearLimit
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-[#2bf29a] to-[#10b673]'
            }`}
            style={{ width: isUnlimited ? '100%' : `${Math.max(used > 0 ? 6 : 0, pct)}%` }}
          />
        </div>
        {subHint && (
          <div className="text-[10.5px] text-[#83686e] font-semibold">{subHint}</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '48px' }}>
      {/* Page Head */}
      <div className="plan-page-head">
        <h1 className="plan-page-title">Choose Your Plan</h1>
        <p className="plan-page-sub">
          Upgrade to unlock higher amounts, more links, API orders, webhooks, and custom checkout branding.
        </p>
        <div className="current-badge">
          <span style={{ color: 'var(--muted, #b89fa5)' }}>Current:</span>
          <span className="plan-name-badge">
            <span className="bolt">⚡</span> {activePlanName}
          </span>
          {activePlan && activePlan.price > 0 && daysLeft !== null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2bf29a] pl-2 border-l border-white/15">
              <Clock className="w-3 h-3" />
              {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
            </span>
          )}
        </div>
      </div>

      {/* Current Plan & Usage Summary */}
      {currentState && (
        <div className="mb-7 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[rgba(24,6,10,0.86)] to-[rgba(12,2,6,0.96)] border border-[rgba(255,45,85,0.2)] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(255,45,85,0.12)]">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-white tracking-tight">
                  Active Plan Usage — {activePlanName}
                </h2>
                <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {activePlan?.commission ?? 5}% Commission
                </span>
              </div>
              <p className="text-[11.5px] text-[#b89fa5] mt-0.5">
                {activePlan && activePlan.price > 0 && currentState.expires_at
                  ? `Valid until ${new Date(currentState.expires_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })} (${daysLeft ?? 0} day${daysLeft === 1 ? '' : 's'} left)`
                  : 'Free tier — upgrade anytime via instant UPI QR'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onViewChange?.('wallet')}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-extrabold text-white transition cursor-pointer self-start sm:self-auto"
            >
              + Buy Hamro Credits
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {renderUsageBar(
              'Links this month',
              linksUsed,
              linksLimit,
              linksLimit === null ? 'Unlimited monthly links' : `${Math.max(0, linksLimit - linksUsed)} remaining`
            )}
            {renderUsageBar(
              'Webhooks',
              webhooksUsed,
              webhooksLimit,
              webhooksLimit === 0
                ? 'Locked on current plan'
                : webhooksLimit === null
                  ? 'Unlimited webhooks'
                  : `${Math.max(0, webhooksLimit - webhooksUsed)} slots available`
            )}
            {renderUsageBar(
              'Cashier accounts',
              accountsUsed,
              accountsLimit,
              accountsLimit === null ? 'Unlimited cashier accounts' : 'Across FamPay, Paytm & Amazon Pay'
            )}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      {isLoading ? (
        <div className="plans-grid">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="plan-card animate-pulse"
              style={{ minHeight: '420px', opacity: 0.6 }}
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="p-8 rounded-2xl bg-[rgba(24,6,10,0.85)] border border-rose-500/30 text-center space-y-3 mb-6">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <div className="text-sm font-bold text-white">{loadError}</div>
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map((plan) => {
            const meta = getPlanStyleMeta(plan.name);
            const PlanIcon = meta.Icon;
            const isCurrent = plan.name.toUpperCase() === activePlanName;
            const isFree = Number(plan.price) === 0;
            const features = buildPlanFeatures(plan);
            const isUpgrading = checkingOutPlan === plan.name;

            return (
              <div
                key={plan.name}
                className={`plan-card ${isCurrent ? 'active' : ''} ${meta.isPopular ? 'popular' : ''}`}
              >
                {/* Ribbon */}
                {isCurrent ? (
                  <div className="plan-ribbon active-plan">
                    <Check style={{ width: 10, height: 10, strokeWidth: 3 }} />
                    <span>Active Plan</span>
                  </div>
                ) : meta.isPopular ? (
                  <div className="plan-ribbon popular-plan">
                    <Star style={{ width: 10, height: 10, fill: 'currentColor' }} />
                    <span>Most Popular</span>
                  </div>
                ) : null}

                {/* Plan Icon */}
                <div className={`plan-icon ${meta.iconType}`}>
                  <PlanIcon />
                </div>

                {/* Plan Name */}
                <div className="plan-name-title">
                  <span>{plan.name}</span>
                  {meta.tag && <span className="plan-tag">{meta.tag}</span>}
                </div>

                {/* Price */}
                <div className="plan-price-box">
                  {isFree ? (
                    <span className="amount free">₹0</span>
                  ) : (
                    <>
                      <span className="amount">₹{plan.price}</span>
                      <span className="period">/{plan.duration_days || 30} days</span>
                    </>
                  )}
                </div>

                {/* Features List */}
                <div className="plan-features-list">
                  {features.map((feat, idx) => (
                    <div
                      key={idx}
                      className={`plan-feature-item ${feat.locked ? 'locked' : ''}`}
                    >
                      <span className="plan-feature-icon">
                        {feat.locked ? (
                          <Lock style={{ width: 9, height: 9 }} />
                        ) : (
                          <Check style={{ width: 9, height: 9, strokeWidth: 3 }} />
                        )}
                      </span>
                      <span>
                        {feat.bold ? (
                          <>
                            <strong>{feat.bold}</strong>
                            {feat.text.replace(feat.bold, '')}
                          </>
                        ) : (
                          feat.text
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                {isCurrent && isFree ? (
                  <button className="plan-action-btn current" disabled>
                    <Check style={{ width: 13, height: 13, strokeWidth: 2.6 }} />
                    <span>Current Plan</span>
                  </button>
                ) : isFree ? (
                  <button className="plan-action-btn current" disabled>
                    <span>Free Tier</span>
                  </button>
                ) : isCurrent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => startPlanCheckout(plan.name)}
                      disabled={Boolean(checkingOutPlan)}
                      className="plan-action-btn upgrade"
                    >
                      {isUpgrading ? (
                        <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                      ) : (
                        <RefreshCw style={{ width: 13, height: 13 }} />
                      )}
                      <span>
                        {isUpgrading
                          ? 'Creating QR...'
                          : `Renew (+${plan.duration_days || 30}d) — ₹${plan.price}`}
                      </span>
                    </button>
                    <span style={{ fontSize: '10px', color: '#2bf29a', textAlign: 'center', fontWeight: 700 }}>
                      Extends active plan by {plan.duration_days || 30} days
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => startPlanCheckout(plan.name)}
                      disabled={Boolean(checkingOutPlan)}
                      className="plan-action-btn upgrade"
                    >
                      {isUpgrading ? (
                        <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                      ) : (
                        <QrCode style={{ width: 13, height: 13 }} />
                      )}
                      <span>
                        {isUpgrading ? 'Creating QR...' : `Upgrade — ₹${plan.price}`}
                      </span>
                    </button>
                    <span style={{ fontSize: '10px', color: '#ff8ca3', textAlign: 'center', fontWeight: 600 }}>
                      Instant UPI QR activation
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Note */}
      <div className="plan-note">
        All plans run for <strong>30 days</strong>. Upgrades &amp; renewals activate automatically via <strong>UPI QR payment</strong>.
      </div>

      {/* Billing Order History */}
      {billingOrders.length > 0 && (
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[rgba(24,6,10,0.86)] to-[rgba(12,2,6,0.96)] border border-[rgba(255,45,85,0.2)] shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[rgba(255,45,85,0.12)]">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#ff8ca3]" />
              <h3 className="text-sm font-black text-white">Billing Orders History</h3>
            </div>
            <button
              type="button"
              onClick={loadBillingOrders}
              disabled={loadingOrders}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-[#d4c2c7] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loadingOrders ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#83686e]">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Pay Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">UTR</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {billingOrders.slice(0, 10).map((ord) => {
                  const statusLower = String(ord.status || '').toLowerCase();
                  const isPaid = statusLower === 'paid';
                  const isPending = statusLower === 'pending';
                  return (
                    <tr key={ord.order_id} className="border-b border-white/5 last:border-b-0">
                      <td className="py-2.5 pr-3 font-bold text-white whitespace-nowrap">
                        {ord.kind === 'plan'
                          ? `${ord.plan_name || 'Plan'} Plan`
                          : `${(ord.credits ?? ord.base_amount).toLocaleString('en-IN')} Credits`}
                      </td>
                      <td className="py-2.5 pr-3 font-mono font-black text-[#2bf29a] whitespace-nowrap">
                        ₹{Number(ord.pay_amount ?? ord.base_amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isPaid
                              ? 'bg-emerald-500/15 text-[#2bf29a] border border-emerald-500/30'
                              : isPending
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-white/5 text-[#b89fa5] border border-white/10'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-[#b89fa5]">
                        {ord.utr || '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-[#83686e] whitespace-nowrap">
                        {ord.created_at
                          ? new Date(ord.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {isPending ? (
                          <button
                            type="button"
                            disabled={checkingOutPlan === ord.order_id}
                            onClick={() => resumeOrderCheckout(ord)}
                            className="px-2.5 py-1 rounded-lg bg-[#ff1e4b]/20 hover:bg-[#ff1e4b]/30 border border-[#ff2d55]/40 text-[11px] font-bold text-white cursor-pointer"
                          >
                            {checkingOutPlan === ord.order_id ? 'Opening...' : 'Pay QR'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#83686e] font-mono">
                            {ord.order_id.slice(0, 10)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UPI QR Checkout Modal */}
      <BillingCheckoutModal
        order={checkoutOrder}
        onClose={() => {
          setCheckoutOrder(null);
          loadBillingOrders();
        }}
        onRetry={async () => {
          const targetPlan = pendingRetryPlan || checkoutOrder?.plan_name;
          if (!targetPlan) return;
          await startPlanCheckout(targetPlan);
        }}
        onFulfilled={handleCheckoutFulfilled}
        showToast={showToast}
      />
    </div>
  );
}

