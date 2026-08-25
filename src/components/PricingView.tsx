import { Zap, Check, HelpCircle } from 'lucide-react';
import { PlanType } from '../types';

interface PricingViewProps {
  currentPlan: PlanType;
  onPlanSelect: (plan: PlanType, price: number) => void;
}

export default function PricingView({
  currentPlan,
  onPlanSelect
}: PricingViewProps) {
  const plans = [
    {
      id: 'Blaze Free' as PlanType,
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
      id: 'Pulse' as PlanType,
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
      id: 'Summit' as PlanType,
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

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 stroke-[2.5]" />
          </span>
          Upgrade Plan
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Select a merchant subscription plan configured for your collection volumes.
        </p>
      </header>

      {/* Info notice box */}
      <div className="flex gap-3 bg-rose-50/50 border border-rose-100 text-rose-950 rounded-2xl p-4 text-xs font-semibold leading-relaxed">
        <Check className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          Your current plan level is <b className="text-rose-600 font-black">{currentPlan === 'Blaze Free' ? 'Blaze Free' : currentPlan}</b>. Subscriptions and monthly billing parameters apply instantly to your local demo.
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {plans.map(plan => {
          const isCurrent = plan.id === currentPlan;
          return (
            <article 
              key={plan.id}
              className={`
                relative bg-white border rounded-2xl p-6 flex flex-col justify-between shadow-xs transition-all hover:shadow-md
                ${plan.isPopular ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-100'}
                ${isCurrent ? 'bg-slate-50/30' : ''}
              `}
            >
              {/* Hot Popular Badge */}
              {plan.isPopular && (
                <span className="absolute top-0 right-6 -translate-y-1/2 bg-rose-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                  Most Popular
                </span>
              )}

              <div>
                {/* Plan Badge */}
                {isCurrent && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[8px] font-bold text-rose-600 uppercase tracking-wider mb-4">
                    Active Plan
                  </span>
                )}

                <h2 className="text-lg font-black text-slate-800 tracking-tight">{plan.name}</h2>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-snug">{plan.desc}</p>

                {/* Price block */}
                <div className="flex items-baseline gap-1 my-5 text-slate-800">
                  <span className="text-3xl font-black tracking-tight">
                    Rs. {plan.price.toLocaleString('en-NP')}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{plan.period}</span>
                </div>

                {/* Features Checklist */}
                <ul className="space-y-2.5 my-6 text-xs font-semibold text-slate-600">
                  {plan.features.map(f => (
                    <li key={f} className="flex gap-2 items-start leading-snug">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onPlanSelect(plan.id, plan.price)}
                disabled={isCurrent}
                className={`
                  w-full py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition-all text-center
                  ${isCurrent
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                    : plan.isPopular
                      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/10 active:scale-[0.98]'
                      : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-[0.98]'
                  }
                `}
              >
                {isCurrent ? 'Current Plan' : `Choose ${plan.name}`}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
