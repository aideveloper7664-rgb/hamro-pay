import { apiCall } from './api';

export const getTokenInfo = async () => {
  return apiCall('/api/developer/token', 'GET');
};

export const regenerateKey = async () => {
  return apiCall('/api/developer/token/regenerate', 'POST');
};

export const getWebhooks = async () => {
  return apiCall('/api/developer/webhooks', 'GET');
};

export const addWebhook = async (url: string, events: string[]) => {
  return apiCall('/api/developer/webhooks', 'POST', { url, events });
};

export const deleteWebhook = async (webhookId: string) => {
  return apiCall(`/api/developer/webhooks?webhookId=${webhookId}`, 'DELETE');
};

export const setMode = async (mode: 'test' | 'live') => {
  return apiCall('/api/developer/mode', 'POST', { mode });
};

export const setRouting = async (routing: string) => {
  return apiCall('/api/developer/routing', 'POST', { routing });
};
