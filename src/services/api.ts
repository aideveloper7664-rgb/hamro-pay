const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_URL =
  !rawApiUrl || rawApiUrl === 'https://hamropay-backends.onrender.com'
    ? 'https://hamropay-backends-54xp.onrender.com'
    : rawApiUrl;

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

const sanitizeForLog = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForLog);
  const copy: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (
      key.toLowerCase().includes('password') || 
      key === 'gmail_app_password' || 
      key === 'api_key' || 
      key === 'token'
    ) {
      copy[key] = '***';
    } else if (typeof val === 'object' && val !== null) {
      copy[key] = sanitizeForLog(val);
    } else {
      copy[key] = val;
    }
  }
  return copy;
};

export const PLAN_ERROR_CODES = new Set([
  'PLAN_AMOUNT_LIMIT',
  'PLAN_LINK_LIMIT',
  'PLAN_API_DISABLED',
  'PLAN_WEBHOOK_LIMIT',
  'PLAN_ACCOUNT_LIMIT',
  'PLAN_FEATURE',
  'LINK_EXPIRED',
]);

const performApiCall = async (
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

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err: any) {
    const networkErr: any = new Error('Server unreachable, try again in 30 seconds');
    networkErr.status = 0;
    networkErr.code = 'NETWORK_ERROR';
    throw networkErr;
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok || (data && data.success === false)) {
    const errorMsg = data?.message || data?.error || res.statusText || 'API Error';
    const isPlanCode = Boolean(data?.code && PLAN_ERROR_CODES.has(String(data.code)));
    if (
      res.status === 401 &&
      !isPlanCode &&
      typeof window !== 'undefined' &&
      !extraHeaders?.['x-api-key'] &&
      !extraHeaders?.['X-HamroAPI-Key']
    ) {
      window.dispatchEvent(
        new CustomEvent('hamropay:unauthorized', { detail: { message: errorMsg } })
      );
    }
    const errorObj: any = new Error(errorMsg);
    errorObj.status = res.status;
    errorObj.code = data?.code;
    errorObj.data = data;
    throw errorObj;
  }
  return data;
};

// For merchant API calls (uses x-api-key)
export const apiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object,
  extraHeaders?: Record<string, string>
) => {
  const data = await performApiCall(path, method, body, extraHeaders);
  return data.data !== undefined ? data.data : data;
};

// Preserves full JSON payload when top-level metadata (e.g. limit, enabled) sits beside data
export const apiCallFull = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object,
  extraHeaders?: Record<string, string>
) => performApiCall(path, method, body, extraHeaders);

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
    const netErr: any = new Error('Server unreachable, try again in 30 seconds');
    netErr.status = 0;
    netErr.code = 'NETWORK_ERROR';
    throw netErr;
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok || (data && data.success === false)) {
    const errorMsg = data?.message || data?.error || res.statusText || 'API Error';
    const errObj: any = new Error(errorMsg);
    errObj.status = res.status;
    errObj.code = data?.code;
    errObj.data = data;
    throw errObj;
  }
  return data.data !== undefined ? data.data : data;
};

export { API_URL, getApiKey, getToken };
