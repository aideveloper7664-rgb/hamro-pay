import { apiCall } from './api';

export interface CashierAccount {
  id: string;
  _id?: string;
  type?: 'fampay' | string;
  upi_id: string;
  upiId?: string;
  phone: string;
  gmail_email?: string;
  gmail?: string;
  email?: string;
  is_active?: boolean;
  isActive?: boolean;
  status?: string;
  created_at?: string;
  createdAt?: string;
  is_verified?: boolean;
}

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
  else if (Array.isArray(res?.data)) list = res.data;
  else if (res && typeof res === 'object') {
    list = res.data || res.cashiers || [];
  }

  // Filter out any default dummy accounts
  return list.filter(a => a && a.id && !String(a.id).includes('-default'));
};

export const addFamPayAccount = async (data: {
  upi_id: string;
  phone: string;
  gmail_email: string;
  gmail_app_password: string;
}): Promise<{ success: boolean; data: CashierAccount; cashier: CashierAccount; message: string }> => {
  const res = await apiCall('/api/cashier/fampay/add', 'POST', data);
  const account = res?.data || res?.cashier || res;
  return {
    success: true,
    data: account,
    cashier: account,
    message: res?.message || 'FamPay account verified & connected successfully!'
  };
};

export const toggleCashier = async (id: string, type: 'fampay' | string = 'fampay') => {
  return await apiCall(`/api/cashier/${id}/toggle`, 'PATCH', { type });
};

export const deleteCashier = async (id: string) => {
  return await apiCall(`/api/cashier/${id}`, 'DELETE');
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
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    // 404 indicates valid state: "No active cashier found"
    if (errMsg.includes('404') || errMsg.includes('no active cashier') || err?.status === 404) {
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

export interface CashierHistoryData {
  transactions: CashierTransaction[];
  stats: CashierStats;
}

export const getCashierHistory = async (refresh: boolean = false): Promise<CashierHistoryData> => {
  const res = await apiCall(`/api/cashier/history${refresh ? '?refresh=1' : ''}`, 'GET');
  const payload = (res?.data !== undefined ? res.data : res) || {};
  return {
    transactions: Array.isArray(payload.transactions) ? payload.transactions : [],
    stats: payload.stats || {
      shown: 0,
      total_amount: 0,
      balance: null,
      last_synced: new Date().toISOString(),
      window_days: 30
    }
  };
};

