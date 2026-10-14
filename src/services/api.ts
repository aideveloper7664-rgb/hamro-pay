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

  if (!apiKey) {
    throw new Error('API key missing, please log in again');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders,
  };

  const isCreateCall = path.includes('create') || path.includes('payment-link');
  if (isCreateCall) {
    console.log(`[API Call Request] ${method} ${path}:`, {
      payload: body,
      headers: { ...headers, 'x-api-key': apiKey ? `${apiKey.substring(0, 4)}***` : 'missing' },
    });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err: any) {
    console.error(`[API Network Error] ${method} ${path}:`, err);
    throw new Error('Server unreachable, try again in 30 seconds');
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (isCreateCall) {
    console.log(`[API Call Response] ${method} ${path} (${res.status}):`, data);
  }

  if (!res.ok || (data && data.success === false)) {
    const errorMsg = data?.message || data?.error || res.statusText || 'API Error';
    throw new Error(`API Error (${res.status}): ${errorMsg}`);
  }
  return data.data !== undefined ? data.data : data;
};

// For public API calls (no auth)
export const publicApiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object
) => {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err: any) {
    console.error(`[Public API Network Error] ${method} ${path}:`, err);
    throw new Error('Server unreachable, try again in 30 seconds');
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok || (data && data.success === false)) {
    const errorMsg = data?.message || data?.error || res.statusText || 'API Error';
    throw new Error(`API Error (${res.status}): ${errorMsg}`);
  }
  return data.data !== undefined ? data.data : data;
};

export { API_URL, getApiKey, getToken };
