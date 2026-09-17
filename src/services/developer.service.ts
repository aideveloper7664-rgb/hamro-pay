import { apiCall } from './api';

export const getTokenInfo = async () => {
  return apiCall('/api/developer/token', 'GET');
};

export const regenerateKey = async () => {
  const data = await apiCall('/api/developer/token/regenerate', 'POST');
  if (data?.api_key) {
    try {
      const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      merchant.api_key = data.api_key;
      localStorage.setItem('hamropay_merchant', JSON.stringify(merchant));
    } catch {}
  }
  return data;
};

export const getWebhooks = async () => {
  return apiCall('/api/developer/webhooks', 'GET');
};

export const addWebhook = async (payload: { url: string; events?: string[] }) => {
  return apiCall('/api/developer/webhooks', 'POST', payload);
};

export const setMode = async (mode: string) => {
  return apiCall('/api/developer/mode', 'POST', { mode });
};

// Aliases for compatibility
export const getApiKeys = async () => [];
export const generateApiKey = regenerateKey;
export const revokeApiKey = async () => {};
