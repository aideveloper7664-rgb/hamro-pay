import React, { useState, useEffect } from 'react';
import { Zap, Check, ShieldCheck, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
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
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>(currentPlan || 'Blaze Free');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, type);
  };

  // Default fallback plans
  const fallbackPlans = [
    {
      id: 'Blaze Free',
      name: 'Blaze',
      price: 0,
      period: '/month',
      desc: 'For merchants starting to collect.',
      features: [
        '100 payment links monthly',
        'Standard payment page',
        '1.5% collection fee',
        'Standard email receipts'
      ],
      isPopular: false
    },
    {
      id: 'Pulse',
      name: 'Pulse',
      price: 299,
      period: '/month',
      desc: 'For growing independent businesses.',
      features: [
        'Unlimited payment links',
        'Custom payment themes',
        '1.0% collection fee',
        'Priority email support',
        'Fast settlement clearance'
      ],
      isPopular: true
    },
    {
      id: 'Summit',
      name: 'Summit',
      price: 799,
      period: '/month',
      desc: 'For larger merchant operations.',
      features: [
        'Everything in Pulse',
        'Advanced merchant analytics',
        '0.7% collection fee',
        'Dedicated VIP support line',
        'Automated storefront configurations'
      ],
      isPopular: false
    }
  ];

  // Fetch plans from backend API
  const fetchPlansData = async () => {
    setIsLoading(true);
    try {
      const [listRes, currRes] = await Promise.allSettled([
        getPlans(),
        getCurrentPlan()
      ]);

      if (listRes.status === 'fulfilled' && Array.isArray(listRes.value) && listRes.value.length > 0) {
        setPlans(listRes.value);
      } else {
        setPlans(fallbackPlans);
      }

      if (currRes.status === 'fulfilled' && currRes.value) {
        const curr = currRes.value;
        const planName = curr.plan_id || curr.plan || curr.name || currentPlan;
        if (planName) setActivePlanId(planName);
      }
    } catch {
      setPlans(fallbackPlans);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansData();
  }, []);

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

  const displayPlans = plans.length > 0 ? plans : fallbackPlans;

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
              <Zap className="w-5 h-5 stroke-[2.5]" />
            </span>
            Upgrade Plan
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Select a merchant subscription plan. Payment is automatically deducted from your Hamro Cash wallet.
          </p>
        </div>

        <button
          onClick={fetchPlansData}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Plans</span>
        </button>
      </header>

      {/* Info notice box */}
      <div className="flex gap-3 bg-rose-50/70 border border-rose-200/80 text-rose-950 rounded-2xl p-4 text-xs font-semibold leading-relaxed shadow-xs">
        <ShieldCheck className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          Your active merchant plan is <b className="text-rose-600 font-black">{activePlanId}</b>. Upgrades unlock higher payment link limits and lower transaction fees instantly.
        </div>
      </div>

      {/* Plans grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
          <span>Loading subscription plans...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {displayPlans.map(plan => {
            const planId = plan.id || plan.plan_id || plan.name;
            const isCurrent = planId === activePlanId || planId === currentPlan;
            const price = typeof plan.price === 'number' ? plan.price : Number(plan.price || 0);
            const isPopular = plan.isPopular || plan.popular || planId === 'Pulse';

            return (
              <article 
                key={planId}
                className={`
                  relative bg-white border rounded-2xl p-6 flex flex-col justify-between shadow-xs transition-all hover:shadow-md
                  ${isPopular ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200'}
                  ${isCurrent ? 'bg-slate-50/50 border-rose-400' : ''}
                `}
              >
                {/* Hot Popular Badge */}
                {isPopular && (
                  <span className="absolute top-0 right-6 -translate-y-1/2 bg-rose-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  {/* Active Plan Badge */}
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-[9px] font-black text-rose-700 uppercase tracking-wider mb-4">
                      Active Plan
                    </span>
                  )}

                  <h2 className="text-lg font-black text-slate-900 tracking-tight">{plan.name || planId}</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">{plan.desc || plan.description || 'Merchant subscription plan'}</p>

                  {/* Price block */}
                  <div className="flex items-baseline gap-1 my-5 text-slate-900">
                    <span className="text-3xl font-black tracking-tight">
                      ₹ {price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {plan.period || '/month'}
                    </span>
                  </div>

                  {/* Features Checklist */}
                  <ul className="space-y-2.5 my-6 text-xs font-semibold text-slate-600">
                    {(plan.features || [
                      'Payment link generation',
                      'Instant UPI cashier integration',
                      '24/7 automated settlements'
                    ]).map((f: string, i: number) => (
                      <li key={i} className="flex gap-2 items-start leading-snug">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleUpgrade(planId, price)}
                  disabled={isCurrent || upgradingId === planId}
                  className={`
                    w-full py-3 rounded-xl text-xs font-extrabold tracking-wide transition-all text-center cursor-pointer flex items-center justify-center gap-2
                    ${isCurrent
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 !cursor-default'
                      : isPopular
                        ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20 active:scale-[0.98]'
                        : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
                    }
                  `}
                >
                  {upgradingId === planId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Upgrading...</span>
                    </>
                  ) : isCurrent ? (
                    'Active Plan'
                  ) : (
                    `Upgrade to ${plan.name || planId}`
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
