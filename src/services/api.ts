const API_URL = (import.meta as any).env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

export const getApiKey = (): string => {
  try {
    const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
    return merchant.api_key || '';
  } catch { return ''; }
};

export const apiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': getApiKey(),
  };

  const token = localStorage.getItem('hamropay_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'API Error');
  return data.data;
};

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
