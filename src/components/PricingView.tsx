import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { PlanType } from '../types';
import { getPlans, getCurrentPlan, upgradePlan } from '../services/plans.service';

interface PricingViewProps {
  currentPlan: PlanType;
  onPlanSelect: (plan: PlanType, price: number) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PricingView({
  currentPlan,
  onPlanSelect,
  showToast
}: PricingViewProps) {
  const [activePlanId, setActivePlanId] = useState<string>(currentPlan || 'Blaze');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, type);
  };

  // Exact 6 plans matching user specification
  const plansList = [
    {
      id: 'Blaze',
      name: 'Blaze',
      price: 0,
      period: '',
      isFree: true,
      tag: null,
      iconType: 'purple',
      isPopular: false,
      features: [
        { text: '100/month payment links', locked: false, bold: '100' },
        { text: '₹500 wallet limit', locked: false, bold: '₹500' },
        { text: '7 day link expiry', locked: false, bold: '7 day' },
        { text: '5% commission', locked: false, bold: '5%' },
        { text: '1 withdrawal/week', locked: false, bold: '1' },
        { text: '3 webhooks', locked: false, bold: '3' },
        { text: 'Unlock premium themes', locked: true, bold: '' },
        { text: 'Hide QR Code', locked: true, bold: '' }
      ]
    },
    {
      id: 'Bronze',
      name: 'Bronze',
      price: 29,
      period: '/30 days',
      isFree: false,
      tag: 'Starter',
      iconType: 'gold',
      isPopular: false,
      features: [
        { text: '250/month payment links', locked: false, bold: '250' },
        { text: '₹1,000 wallet limit', locked: false, bold: '₹1,000' },
        { text: '15 day link expiry', locked: false, bold: '15 day' },
        { text: '3.5% commission', locked: false, bold: '3.5%' },
        { text: '3 withdrawal/week', locked: false, bold: '3' },
        { text: '5 webhooks', locked: false, bold: '5' },
        { text: 'Unlock premium themes', locked: true, bold: '' },
        { text: 'Hide QR Code', locked: true, bold: '' }
      ]
    },
    {
      id: 'Silver',
      name: 'Silver',
      price: 59,
      period: '/30 days',
      isFree: false,
      tag: null,
      iconType: 'slate',
      isPopular: true,
      features: [
        { text: '1,000/month payment links', locked: false, bold: '1,000' },
        { text: '₹3,000 wallet limit', locked: false, bold: '₹3,000' },
        { text: '30 day link expiry', locked: false, bold: '30 day' },
        { text: '2% commission', locked: false, bold: '2%' },
        { text: '1 withdrawal/day', locked: false, bold: '1' },
        { text: '10 webhooks', locked: false, bold: '10' },
        { text: 'Unlock premium themes', locked: false, bold: '' },
        { text: 'Hide QR Code', locked: true, bold: '' }
      ]
    },
    {
      id: 'Gold',
      name: 'Gold',
      price: 149,
      period: '/30 days',
      isFree: false,
      tag: null,
      iconType: 'gold',
      isPopular: false,
      features: [
        { text: '3,000/month payment links', locked: false, bold: '3,000' },
        { text: '₹7,500 wallet limit', locked: false, bold: '₹7,500' },
        { text: '90 day link expiry', locked: false, bold: '90 day' },
        { text: '1% commission', locked: false, bold: '1%' },
        { text: '3 withdrawal/day', locked: false, bold: '3' },
        { text: '25 webhooks', locked: false, bold: '25' },
        { text: 'Unlock premium themes', locked: false, bold: '' },
        { text: 'Hide QR Code', locked: false, bold: '' }
      ]
    },
    {
      id: 'Developer',
      name: 'Developer',
      price: 299,
      period: '/30 days',
      isFree: false,
      tag: null,
      iconType: 'purple',
      isPopular: false,
      features: [
        { text: 'Unlimited payment links', locked: false, bold: 'Unlimited' },
        { text: '₹20,000 wallet limit', locked: false, bold: '₹20,000' },
        { text: 'Never expires', locked: false, bold: 'Never' },
        { text: '0.5% commission', locked: false, bold: '0.5%' },
        { text: '10 withdrawal/day', locked: false, bold: '10' },
        { text: 'Unlimited webhooks', locked: false, bold: 'Unlimited' },
        { text: 'Unlock premium themes', locked: false, bold: '' },
        { text: 'Hide QR Code', locked: false, bold: '' }
      ]
    },
    {
      id: 'Business',
      name: 'Business',
      price: 499,
      period: '/30 days',
      isFree: false,
      tag: null,
      iconType: 'blue',
      isPopular: false,
      features: [
        { text: 'Unlimited payment links', locked: false, bold: 'Unlimited' },
        { text: 'Unlimited wallet limit', locked: false, bold: 'Unlimited' },
        { text: 'Never expires', locked: false, bold: 'Never' },
        { text: '0% commission', locked: false, bold: '0%' },
        { text: 'Unlimited withdrawals', locked: false, bold: 'Unlimited' },
        { text: 'Unlimited webhooks', locked: false, bold: 'Unlimited' },
        { text: 'Unlock premium themes', locked: false, bold: '' },
        { text: 'Hide QR Code', locked: false, bold: '' }
      ]
    }
  ];

  // Fetch current active plan
  const fetchActivePlan = async () => {
    setIsLoading(true);
    try {
      const res = await getCurrentPlan();
      if (res) {
        const planName = res.plan_id || res.plan || res.name || currentPlan;
        if (planName) setActivePlanId(planName);
      }
    } catch {
      // Fallback to prop
      setActivePlanId(currentPlan || 'Blaze');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePlan();
  }, [currentPlan]);

  const handleUpgrade = async (planId: string, price: number) => {
    setUpgradingId(planId);
    try {
      const res = await upgradePlan(planId);
      notify(res?.message || `Successfully upgraded to ${planId} plan!`, 'success');
      setActivePlanId(planId);
      onPlanSelect(planId as PlanType, price);
    } catch (err: any) {
      notify(err?.message || `Failed to upgrade to ${planId}. Check wallet balance.`, 'error');
    } finally {
      setUpgradingId(null);
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Page Head */}
      <div className="plan-page-head">
        <h1 className="plan-page-title">Choose Your Plan</h1>
        <p className="plan-page-sub">Upgrade to unlock more links, lower commission &amp; higher wallet limits.</p>
        <div className="current-badge">
          <span style={{ color: 'var(--muted, #b89fa5)' }}>Current:</span>
          <span className="plan-name-badge">
            <span className="bolt">⚡</span> {activePlanId}
          </span>
        </div>
      </div>

      {/* Plans Grid (6 Columns) */}
      <div className="plans-grid">
        {plansList.map((plan) => {
          const isCurrent =
            plan.id.toLowerCase() === activePlanId.toLowerCase() ||
            (plan.id === 'Blaze' && (activePlanId.toLowerCase() === 'blaze' || activePlanId.toLowerCase() === 'free' || activePlanId.toLowerCase() === 'blaze free'));

          return (
            <div
              key={plan.id}
              className={`plan-card ${isCurrent ? 'active' : ''} ${plan.isPopular ? 'popular' : ''}`}
            >
              {/* Ribbon */}
              {isCurrent ? (
                <div className="plan-ribbon active-plan">
                  <Check style={{ width: 10, height: 10, strokeWidth: 3 }} />
                  <span>Active Plan</span>
                </div>
              ) : plan.isPopular ? (
                <div className="plan-ribbon popular-plan">
                  <Star style={{ width: 10, height: 10, fill: 'currentColor' }} />
                  <span>Most Popular</span>
                </div>
              ) : null}

              {/* Plan Icon */}
              <div className={`plan-icon ${plan.iconType}`}>
                {plan.id === 'Blaze' && <Zap style={{ fill: 'currentColor' }} />}
                {plan.id === 'Bronze' && <Award style={{ fill: 'currentColor' }} />}
                {plan.id === 'Silver' && <Star style={{ fill: 'currentColor' }} />}
                {plan.id === 'Gold' && <Crown style={{ fill: 'currentColor' }} />}
                {plan.id === 'Developer' && <Code2 />}
                {plan.id === 'Business' && <Sparkles style={{ fill: 'currentColor' }} />}
              </div>

              {/* Plan Name */}
              <div className="plan-name-title">
                <span>{plan.name}</span>
                {plan.tag && <span className="plan-tag">{plan.tag}</span>}
              </div>

              {/* Price */}
              <div className="plan-price-box">
                {plan.isFree ? (
                  <span className="amount free">Free</span>
                ) : (
                  <>
                    <span className="amount">₹{plan.price}</span>
                    <span className="period">{plan.period}</span>
                  </>
                )}
              </div>

              {/* Features List */}
              <div className="plan-features-list">
                {plan.features.map((feat, idx) => (
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
              {isCurrent ? (
                <button className="plan-action-btn current" disabled>
                  <Check style={{ width: 13, height: 13, strokeWidth: 2.6 }} />
                  <span>Current Plan</span>
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id, plan.price)}
                  disabled={upgradingId === plan.id}
                  className="plan-action-btn upgrade"
                >
                  {upgradingId === plan.id ? (
                    <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                  ) : (
                    <Zap style={{ width: 13, height: 13, fill: 'currentColor' }} />
                  )}
                  <span>
                    {upgradingId === plan.id
                      ? 'Upgrading...'
                      : `Upgrade — ₹${plan.price}`}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div className="plan-note">
        All paid plans are valid for <strong>30 days</strong>. Payment via UPI / Wallet balance.
      </div>
    </div>
  );
}
