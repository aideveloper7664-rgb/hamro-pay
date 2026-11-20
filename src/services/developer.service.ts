import { apiCall, apiCallFull } from './api';

export interface WebhooksResponse {
  webhooks: { url: string }[];
  limit: number | null;
  enabled: boolean;
}

export const getTokenInfo = async () => apiCall('/api/developer/token');
export const regenerateKey = async () => apiCall('/api/developer/token/regenerate', 'POST');

export const getWebhooks = async (): Promise<WebhooksResponse> => {
  const res = await apiCallFull('/api/developer/webhooks');
  const rawList = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.webhooks)
      ? res.webhooks
      : [];

  const webhooks = rawList
    .map((item: any) => (typeof item === 'string' ? { url: item } : item))
    .filter((item: any) => Boolean(item?.url));

  const limit =
    res?.limit !== undefined
      ? res.limit
      : res?.data?.limit !== undefined
        ? res.data.limit
        : null;

  const enabled =
    res?.enabled !== undefined
      ? Boolean(res.enabled)
      : res?.data?.enabled !== undefined
        ? Boolean(res.data.enabled)
        : limit === null || Number(limit) > 0;

  return { webhooks, limit, enabled };
};

export const addWebhook = async (url: string) =>
  apiCall('/api/developer/webhooks', 'POST', { url });

export const deleteWebhook = async (url?: string) =>
  apiCall('/api/developer/webhooks', 'DELETE', url ? { url } : undefined);

export const setMode = async (mode: 'test' | 'live') =>
  apiCall('/api/developer/mode', 'POST', { mode });

export const getApiOrders = async () => apiCall('/api/developer/orders');

export const createApiOrder = async (data: { amount: number; title?: string }, apiKey: string) =>
  apiCall('/api/developer/create-order', 'POST', data, { 'X-HamroAPI-Key': apiKey });
