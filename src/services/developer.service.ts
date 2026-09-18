import { apiCall } from './api';

export const getTokenInfo = async () => apiCall('/api/developer/token');
export const regenerateKey = async () => apiCall('/api/developer/token/regenerate', 'POST');
export const getWebhooks = async () => apiCall('/api/developer/webhooks');
export const addWebhook = async (url: string, events: string[]) =>
  apiCall('/api/developer/webhooks', 'POST', { url, events });
export const deleteWebhook = async () => apiCall('/api/developer/webhooks', 'DELETE');
export const setMode = async (mode: 'test' | 'live') =>
  apiCall('/api/developer/mode', 'POST', { mode });
export const getApiOrders = async () => apiCall('/api/developer/orders');
