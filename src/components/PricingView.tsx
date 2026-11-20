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
  X
} from 'lucide-react';
import { CurrentPlanState, PlanDefinition } from '../types';
import {
  getPlans,
  getCurrentPlan,
  upgradePlan,
  getDaysLeftFromExpiry,
  ShowToastFn
} from '../services/plans.service';

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
    { text: 'Developer API orders', locked: !plan.api_orders, bold: '' },
    { text: 'API integration docs', locked: !plan.api_docs, bold: '' },
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
  const [confirmPlan, setConfirmPlan] = useState<{ plan: PlanDefinition; isRenew: boolean } | null>(null);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    showToast?.(msg, type);
  };

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
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  }, [onPlanUpdated]);

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

  const handleConfirmUpgrade = async () => {
    if (!confirmPlan) return;
    const { plan, isRenew } = confirmPlan;
    setUpgradingId(plan.name);
    try {
      const res = await upgradePlan(plan.name);
      const updated = await getCurrentPlan(plans).catch(() => null);
      if (updated) {
        setCurrentState(updated);
        onPlanUpdated?.(updated);
      }
      notify(
        res?.message ||
          (isRenew
            ? `Renewed ${plan.name} plan (+${plan.duration_days || 30} days)!`
            : `Upgraded to ${plan.name} plan!`),
        'success'
      );
      setConfirmPlan(null);
    } catch (err: any) {
      const msg = err?.message || 'Plan update failed';
      notify(msg, 'error');
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('credit')) {
        setConfirmPlan(null);
        onViewChange?.('wallet');
      }
    } finally {
      setUpgradingId(null);
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
                  : 'Free tier — upgrade anytime using Hamro Credits'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onViewChange?.('wallet')}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-extrabold text-white transition cursor-pointer self-start sm:self-auto"
            >
              + Add Hamro Credits
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
            const isUpgrading = upgradingId === plan.name;

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
                ) : isCurrent && !isFree ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmPlan({ plan, isRenew: true })}
                      disabled={isUpgrading}
                      className="plan-action-btn upgrade"
                    >
                      {isUpgrading ? (
                        <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                      ) : (
                        <RefreshCw style={{ width: 13, height: 13 }} />
                      )}
                      <span>Renew (+{plan.duration_days || 30}d) — ₹{plan.price}</span>
                    </button>
                    <span style={{ fontSize: '10px', color: '#2bf29a', textAlign: 'center', fontWeight: 700 }}>
                      Extends active plan by 30 days
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmPlan({ plan, isRenew: false })}
                      disabled={isUpgrading}
                      className="plan-action-btn upgrade"
                    >
                      {isUpgrading ? (
                        <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                      ) : (
                        <Zap style={{ width: 13, height: 13, fill: 'currentColor' }} />
                      )}
                      <span>
                        {isUpgrading
                          ? 'Processing...'
                          : isFree
                            ? 'Switch to Free'
                            : `Upgrade — ₹${plan.price}`}
                      </span>
                    </button>
                    <span style={{ fontSize: '10px', color: '#ff8ca3', textAlign: 'center', fontWeight: 600 }}>
                      {isFree ? 'No charge' : 'Paid from Hamro Credits'}
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
        All plans run for <strong>30 days</strong>. Upgrades &amp; renewals are paid directly from <strong>Hamro Credits</strong>.
      </div>

      {/* Confirmation Modal */}
      {confirmPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !upgradingId && setConfirmPlan(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#120306] border border-[rgba(255,45,85,0.3)] p-6 shadow-2xl space-y-4 text-[#fff2f4]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,45,85,0.15)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#b8002c] flex items-center justify-center text-white">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {confirmPlan.isRenew ? `Renew ${confirmPlan.plan.name}` : `Upgrade to ${confirmPlan.plan.name}`}
                  </h3>
                  <span className="text-[11px] text-[#b89fa5] font-semibold">
                    {confirmPlan.plan.duration_days || 30} days validity
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={Boolean(upgradingId)}
                onClick={() => setConfirmPlan(null)}
                className="p-1.5 rounded-lg text-[#b89fa5] hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-black/45 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#b89fa5]">Plan</span>
                <span className="font-black text-white">{confirmPlan.plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#b89fa5]">Amount</span>
                <span className="font-black text-[#2bf29a]">₹{confirmPlan.plan.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#b89fa5]">Commission</span>
                <span className="font-bold text-white">{confirmPlan.plan.commission}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#b89fa5]">Payment Method</span>
                <span className="font-bold text-sky-300">Hamro Credits</span>
              </div>
            </div>

            <p className="text-[11.5px] text-[#b89fa5] leading-relaxed">
              {confirmPlan.isRenew
                ? `This will deduct ₹${confirmPlan.plan.price} from your Hamro Credits and extend your ${confirmPlan.plan.name} plan by ${confirmPlan.plan.duration_days || 30} days.`
                : `This will deduct ₹${confirmPlan.plan.price} from your Hamro Credits and activate ${confirmPlan.plan.name} immediately.`}
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={Boolean(upgradingId)}
                onClick={() => setConfirmPlan(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#d4c2c7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(upgradingId)}
                onClick={handleConfirmUpgrade}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff1e4b] to-[#d8002f] text-white text-xs font-black shadow-lg shadow-rose-600/30 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {upgradingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>
                    {confirmPlan.isRenew
                      ? `Confirm Renewal — ₹${confirmPlan.plan.price}`
                      : `Confirm Upgrade — ₹${confirmPlan.plan.price}`}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
