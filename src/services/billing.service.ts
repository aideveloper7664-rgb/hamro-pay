import { apiCall } from './api';

export type BillingOrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed';

export interface BillingOrder {
  order_id: string;
  kind: 'plan' | 'credits';
  plan_name?: string | null;
  credits?: number | null;
  base_amount: number;
  pay_amount: number;
  status: BillingOrderStatus;
  fulfilled?: boolean;
  utr?: string | null;
  expires_at: string;
  server_time?: string;
  upi_id?: string;
  upi_uri?: string;
  qr_code?: string;
  created_at?: string;
  paid_at?: string | null;
  message?: string;
}

export type BillingCheckoutRequest =
  | { kind: 'plan'; plan: string }
  | { kind: 'credits'; amount: number };

export const createBillingCheckout = async (
  payload: BillingCheckoutRequest
): Promise<BillingOrder> => {
  return apiCall('/api/billing/checkout', 'POST', payload);
};

export const getBillingOrderStatus = async (
  orderId: string
): Promise<BillingOrder> => {
  return apiCall(`/api/billing/status/${encodeURIComponent(orderId)}`);
};

export const verifyBillingOrder = async (
  orderId: string,
  utr: string
): Promise<BillingOrder> => {
  return apiCall('/api/billing/verify', 'POST', { order_id: orderId, utr });
};

export const cancelBillingOrder = async (
  orderId: string
): Promise<BillingOrder> => {
  return apiCall(`/api/billing/cancel/${encodeURIComponent(orderId)}`, 'POST');
};

export const getBillingOrders = async (): Promise<BillingOrder[]> => {
  const res = await apiCall('/api/billing/orders');
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.orders)) return res.orders;
  return [];
};

export const formatBillingError = (
  err: any,
  fallback = 'Unable to start payment checkout'
): string => {
  const code = String(err?.code || err?.data?.code || '').toUpperCase();
  if (err?.status === 503 || code === 'PLATFORM_ACCOUNT_MISSING') {
    return 'Payments temporarily unavailable';
  }
  return err?.message || fallback;
};
