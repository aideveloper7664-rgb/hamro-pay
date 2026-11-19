import { apiCall } from './api';

export type CashierType = 'fampay' | 'amazon' | 'paytm' | 'paytm_mid';

export interface CashierAccount {
  id: string;
  _id?: string;
  type?: CashierType | string;
  cashier_type?: CashierType | string;
  upi_id: string;
  upiId?: string;
  phone: string;
  gmail_email?: string;
  gmail?: string;
  email?: string;
  paytm_mid?: string;
  is_active?: boolean;
  isActive?: boolean;
  status?: string;
  created_at?: string;
  createdAt?: string;
  is_verified?: boolean;
}

export interface CashierProviderMeta {
  type: CashierType | string;
  label: string;
  shortLabel: string;
  badgeLabel: string;
  isGmailBased: boolean;
  accentColor: string;
}

export const getCashierProviderMeta = (type?: string): CashierProviderMeta => {
  const normalized = (type || '').toLowerCase();
  switch (normalized) {
    case 'fampay':
      return {
        type: 'fampay',
        label: 'FamPay',
        shortLabel: 'FamPay',
        badgeLabel: 'FamPay · Gmail',
        isGmailBased: true,
        accentColor: '#ff7a00',
      };
    case 'amazon':
      return {
        type: 'amazon',
        label: 'Amazon Pay',
        shortLabel: 'Amazon Pay',
        badgeLabel: 'Amazon Pay · Gmail',
        isGmailBased: true,
        accentColor: '#ff9900',
      };
    case 'paytm':
      return {
        type: 'paytm',
        label: 'Paytm',
        shortLabel: 'Paytm',
        badgeLabel: 'Paytm · Gmail',
        isGmailBased: true,
        accentColor: '#00baf2',
      };
    case 'paytm_mid':
      return {
        type: 'paytm_mid',
        label: 'Paytm Business',
        shortLabel: 'Paytm MID',
        badgeLabel: 'Paytm · MID API',
        isGmailBased: false,
        accentColor: '#00baf2',
      };
    default:
      return {
        type: normalized || 'fampay',
        label: 'Payment Account',
        shortLabel: 'UPI',
        badgeLabel: 'UPI Cashier',
        isGmailBased: false,
        accentColor: '#ff1e4b',
      };
  }
};

export const maskUpiId = (upi?: string): string => {
  if (!upi) return '—';
  const atIndex = upi.indexOf('@');
  if (atIndex <= 2) return upi;
  const local = upi.slice(0, atIndex);
  const handle = upi.slice(atIndex);
  if (local.length <= 4) {
    return `${local.slice(0, 1)}•••${handle}`;
  }
  return `${local.slice(0, 2)}••••${local.slice(-2)}${handle}`;
};

// Clean up legacy local storage cache on initialization
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hamropay_cashier_accounts');
  }
} catch {
  // Ignore localStorage access errors
}

export const getCashierList = async (): Promise<CashierAccount[]> => {
  const res = await apiCall('/api/cashier/list');
  let list: CashierAccount[] = [];
  if (Array.isArray(res)) list = res;
  else if (Array.isArray(res?.cashiers)) list = res.cashiers;
  else if (Array.isArray(res?.accounts)) list = res.accounts;
  else if (Array.isArray(res?.data)) list = res.data;
  else if (res && typeof res === 'object') {
    list = res.data || res.cashiers || [];
  }

  // Filter out any default dummy accounts
  return list.filter(a => a && a.id && !String(a.id).includes('-default'));
};

export interface GmailCashierPayload {
  upi_id: string;
  phone: string;
  gmail_email: string;
  gmail_app_password: string;
}

export interface PaytmMidPayload {
  upi_id: string;
  phone: string;
  paytm_mid: string;
  paytm_merchant_key: string;
}

export interface AddCashierResponse {
  success: boolean;
  data: CashierAccount;
  cashier: CashierAccount;
  message: string;
}

export const addFamPayAccount = async (
  data: GmailCashierPayload
): Promise<AddCashierResponse> => {
  const res = await apiCall('/api/cashier/fampay/add', 'POST', data);
  const account = res?.data || res?.cashier || res;
  return {
    success: true,
    data: account,
    cashier: account,
    message: res?.message || 'FamPay account verified & connected successfully!'
  };
};

export const addAmazonAccount = async (
  data: GmailCashierPayload
): Promise<AddCashierResponse> => {
  const res = await apiCall('/api/cashier/amazon/add', 'POST', data);
  const account = res?.data || res?.cashier || res;
  return {
    success: true,
    data: account,
    cashier: account,
    message: res?.message || 'Amazon Pay account verified & connected successfully!'
  };
};

export const addPaytmGmailAccount = async (
  data: GmailCashierPayload
): Promise<AddCashierResponse> => {
  const res = await apiCall('/api/cashier/paytm/add', 'POST', data);
  const account = res?.data || res?.cashier || res;
  return {
    success: true,
    data: account,
    cashier: account,
    message: res?.message || 'Paytm account verified & connected successfully!'
  };
};

export const addPaytmMidAccount = async (
  data: PaytmMidPayload
): Promise<AddCashierResponse> => {
  const res = await apiCall('/api/cashier/paytm-mid/add', 'POST', data);
  const account = res?.data || res?.cashier || res;
  return {
    success: true,
    data: account,
    cashier: account,
    message: res?.message || 'Paytm MID account verified & connected successfully!'
  };
};

export const toggleCashier = async (id: string) => {
  return await apiCall(`/api/cashier/${encodeURIComponent(id)}/toggle`, 'PATCH');
};

export const deleteCashier = async (id: string) => {
  return await apiCall(`/api/cashier/${encodeURIComponent(id)}`, 'DELETE');
};

export const getActiveCashier = async (apiKey?: string): Promise<CashierAccount | null> => {
  try {
    const res = await apiCall(
      '/api/cashier/active',
      'GET',
      undefined,
      apiKey ? { 'x-api-key': apiKey } : undefined
    );
    if (!res) return null;
    return (res.cashier || res.data || res) as CashierAccount;
  } catch (err: unknown) {
    const typedErr = err as { message?: string; status?: number };
    const errMsg = (typedErr?.message || '').toLowerCase();
    // 404 indicates valid state: "No active cashier found"
    if (errMsg.includes('404') || errMsg.includes('no active cashier') || typedErr?.status === 404) {
      return null;
    }
    // Any other error (network unreachable, 500, 401) should throw so UI can show proper alert
    throw err;
  }
};

export interface CashierTransaction {
  reference: string;
  alt_reference?: string;
  message_id?: string;
  amount: number;
  sender: string;
  purpose: string | null;
  date: string;
}

export interface CashierStats {
  shown: number;
  total_amount: number;
  balance: number | null;
  last_synced: string;
  window_days?: number;
}

export interface CashierWindow {
  from?: string;
  to?: string | null;
  truncated?: boolean;
  next_before?: string;
}

export interface CashierHistoryData {
  transactions: CashierTransaction[];
  stats: CashierStats;
  window?: CashierWindow;
}

export interface GetCashierHistoryParams {
  refresh?: boolean;
  before?: string;
}

export const getCashierHistory = async (
  options?: boolean | GetCashierHistoryParams
): Promise<CashierHistoryData> => {
  const params: GetCashierHistoryParams =
    typeof options === 'boolean' ? { refresh: options } : (options || {});

  const queryParts: string[] = [];
  if (params.refresh) queryParts.push('refresh=1');
  if (params.before) queryParts.push(`before=${encodeURIComponent(params.before)}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  try {
    const res = await apiCall(`/api/cashier/history${queryString}`, 'GET');
    const payload = (res?.data !== undefined ? res.data : res) || {};
    return {
      transactions: Array.isArray(payload.transactions) ? payload.transactions : [],
      stats: payload.stats || {
        shown: 0,
        total_amount: 0,
        balance: null,
        last_synced: new Date().toISOString(),
        window_days: 30,
      },
      window: payload.window,
    };
  } catch (err: unknown) {
    const typedErr = err as { message?: string; status?: number; code?: string; data?: { code?: string } };
    const errorObj: Error & { status?: number; code?: string; data?: unknown } = new Error(
      typedErr?.message || 'Failed to fetch cashier history'
    );
    errorObj.status = typedErr?.status;
    errorObj.code = typedErr?.code || typedErr?.data?.code;
    errorObj.data = typedErr?.data;
    throw errorObj;
  }
};

