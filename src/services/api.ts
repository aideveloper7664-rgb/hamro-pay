const API_URL = import.meta.env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

const getMerchant = () => {
  try {
    return JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
  } catch { return {}; }
};

const getApiKey = (): string => getMerchant().api_key || '';
const getToken = (): string => localStorage.getItem('hamropay_token') || '';

// For merchant API calls (uses x-api-key)
export const apiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object
) => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'API Error');
  return data.data;
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
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'API Error');
  return data.data;
};

export { API_URL, getApiKey, getToken };
