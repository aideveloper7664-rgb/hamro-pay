import { apiCall, publicApiCall, PLAN_ERROR_CODES } from './api';
import { CurrentPlanState, PlanDefinition, PlanType } from '../types';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ShowToastFn = (
  msg: string,
  type?: 'success' | 'error' | 'info',
  action?: ToastAction
) => void;

export const DEFAULT_FREE_PLAN: PlanDefinition = {
  name: 'FREE',
  price: 0,
  duration_days: 30,
  links_per_month: 20,
  link_expiry_days: 7,
  max_amount: 5000,
  commission: 5,
  webhooks: 0,
  developer_portal: false,
  api_orders: false,
  api_docs: false,
  advanced_api: false,
  accounts: { fampay: 1, paytm_mid: 1, amazon: 1 },
  custom_pages: false,
  qr_theme: false,
  branding: false,
  multiple_pages: false,
};

export const getPlans = async (): Promise<PlanDefinition[]> => {
  const res = await publicApiCall('/api/plans');
  const list = Array.isArray(res) ? res : (res?.plans || res?.data || []);
  return Array.isArray(list) ? list : [];
};

export const normalizeCurrentPlan = (
  raw: any,
  catalog: PlanDefinition[] = []
): CurrentPlanState => {
  const rawPlan = raw?.plan;
  const planNameRaw =
    typeof rawPlan === 'string'
      ? rawPlan
      : rawPlan?.name || raw?.plan_id || raw?.name || 'FREE';

  const normalizedName = String(planNameRaw).trim().toUpperCase() as PlanType;
  const fromCatalog = catalog.find(
    (p) => p.name.toUpperCase() === normalizedName
  );

  const planObj: PlanDefinition =
    typeof rawPlan === 'object' && rawPlan !== null
      ? {
          ...DEFAULT_FREE_PLAN,
          ...(fromCatalog || {}),
          ...rawPlan,
          name: (rawPlan.name || normalizedName) as PlanType,
          accounts: {
            ...DEFAULT_FREE_PLAN.accounts,
            ...(fromCatalog?.accounts || {}),
            ...(rawPlan.accounts || {}),
          },
        }
      : {
          ...(fromCatalog || DEFAULT_FREE_PLAN),
          name: normalizedName || 'FREE',
        };

  const rawUsage = raw?.usage || {};
  const linksLimit =
    rawUsage.links_limit !== undefined
      ? rawUsage.links_limit
      : planObj.links_per_month;
  const webhooksLimit =
    rawUsage.webhooks_limit !== undefined
      ? rawUsage.webhooks_limit
      : planObj.webhooks;

  return {
    plan: planObj,
    expires_at: raw?.expires_at ?? null,
    usage: {
      links_used: Number(rawUsage.links_used ?? 0),
      links_limit: linksLimit ?? null,
      webhooks_used: Number(rawUsage.webhooks_used ?? 0),
      webhooks_limit: webhooksLimit ?? null,
      accounts_used: Number(rawUsage.accounts_used ?? 0),
      accounts_limit:
        rawUsage.accounts_limit !== undefined
          ? rawUsage.accounts_limit
          : undefined,
    },
  };
};

export const getCurrentPlan = async (
  catalog: PlanDefinition[] = []
): Promise<CurrentPlanState> => {
  const res = await apiCall('/api/plans/current');
  return normalizeCurrentPlan(res, catalog);
};

export const upgradePlan = async (plan_id: string) =>
  apiCall('/api/plans/upgrade', 'POST', { plan_id });

export const isPlanBlockError = (err: any): boolean => {
  const code = err?.code || err?.data?.code;
  return Boolean(code && PLAN_ERROR_CODES.has(String(code)));
};

export const getRequiredPlanName = (
  catalog: PlanDefinition[],
  predicate: (plan: PlanDefinition) => boolean,
  fallbackName: string
): string => {
  if (!catalog || catalog.length === 0) return fallbackName;
  const sorted = [...catalog].sort((a, b) => Number(a.price) - Number(b.price));
  const match = sorted.find(predicate);
  return match?.name ? String(match.name) : fallbackName;
};

export const getDaysLeftFromExpiry = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const expMs = Date.parse(expiresAt);
  if (isNaN(expMs)) return null;
  const diff = expMs - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const hasDeveloperPortalAccess = (plan?: PlanDefinition | null): boolean => {
  if (!plan) return false;
  if (typeof plan.developer_portal === 'boolean') return plan.developer_portal;
  if (typeof plan.api_orders === 'boolean') return plan.api_orders;
  return Number(plan.price) > 0;
};

export const hasApiDocsAccess = (plan?: PlanDefinition | null): boolean => {
  if (!plan) return false;
  if (typeof plan.api_docs === 'boolean') return plan.api_docs;
  return hasDeveloperPortalAccess(plan);
};

export const isApiDisabledError = (err: any): boolean => {
  const code = err?.code || err?.data?.code;
  return String(code || '').toUpperCase() === 'PLAN_API_DISABLED';
};

export const notifyApiOrPlanError = (
  err: any,
  fallbackMessage: string,
  showToast?: ShowToastFn,
  onOpenPlans?: () => void
) => {
  if (!showToast) return;
  const msg = err?.message || fallbackMessage;
  if (isPlanBlockError(err) && onOpenPlans) {
    showToast(msg, 'error', {
      label: 'Upgrade',
      onClick: onOpenPlans,
    });
  } else {
    showToast(msg, 'error');
  }
};
