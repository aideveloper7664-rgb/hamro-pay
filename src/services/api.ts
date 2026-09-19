const API_URL = import.meta.env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

const getMerchant = () => {
  try {
    return JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
  } catch { return {}; }
};

const getApiKey = (): string => {
  const merchant = getMerchant();
  return merchant.api_key || merchant.apiKey || localStorage.getItem('hamropay_api_key') || '';
};
const getToken = (): string => localStorage.getItem('hamropay_token') || '';

// For merchant API calls (uses x-api-key)
export const apiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object,
  extraHeaders?: Record<string, string>
) => {
  const apiKey = extraHeaders?.['x-api-key'] || getApiKey();
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders,
  };

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.message || data?.error || `API Error (${res.status})`);
  }
  return data.data !== undefined ? data.data : data;
};

// For public API calls (no auth)
export const publicApiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object
) => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.message || data?.error || 'API Error');
  }
  return data.data !== undefined ? data.data : data;
};

export { API_URL, getApiKey, getToken };
