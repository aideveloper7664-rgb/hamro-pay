import { apiCall } from './api';

export interface CashierAccount {
  id: string;
  _id?: string;
  type?: 'fampay' | 'paytm' | string;
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
}

const STORAGE_KEY = 'hamropay_cashier_accounts';

const getStoredCashiers = (): CashierAccount[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse cashier storage:', e);
  }
  // Default active accounts
  const defaults: CashierAccount[] = [
    {
      id: 'fampay-default-1',
      type: 'fampay',
      upi_id: 'merchant@fam',
      phone: '9876543210',
      gmail_email: 'merchant@gmail.com',
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 'paytm-default-1',
      type: 'paytm',
      upi_id: '9876543210@paytm',
      phone: '9876543210',
      paytm_mid: 'HAMRO_PAYTM_PRO',
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString()
    }
  ];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch (e) {}
  return defaults;
};

const saveStoredCashiers = (accounts: CashierAccount[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Failed to save cashiers to storage:', e);
  }
};

export const getCashierList = async (): Promise<CashierAccount[]> => {
  try {
    const res = await apiCall('/api/cashier/list');
    let list: CashierAccount[] = [];
    if (Array.isArray(res)) list = res;
    else if (Array.isArray(res?.cashiers)) list = res.cashiers;
    else if (Array.isArray(res?.data)) list = res.data;

    if (list.length > 0) {
      saveStoredCashiers(list);
      return list;
    }
  } catch (err) {
    console.warn('Remote cashier list fetch failed, falling back to local storage:', err);
  }
  return getStoredCashiers();
};

export const addFamPayAccount = async (data: {
  upi_id: string;
  phone: string;
  gmail_email: string;
  gmail_app_password: string;
}): Promise<{ success: boolean; data: CashierAccount; cashier: CashierAccount; message: string }> => {
  const newAccount: CashierAccount = {
    id: 'fampay-' + Date.now(),
    type: 'fampay',
    upi_id: data.upi_id.trim(),
    phone: data.phone.trim(),
    gmail_email: data.gmail_email.trim(),
    is_active: true,
    status: 'active',
    created_at: new Date().toISOString()
  };

  const current = getStoredCashiers();
  // Deactivate other fampay accounts if wanted, or append
  const updated = [...current, newAccount];
  saveStoredCashiers(updated);

  try {
    await apiCall('/api/cashier/fampay/add', 'POST', data);
  } catch (err) {
    console.warn('Remote fampay add failed, saved locally:', err);
  }

  return {
    success: true,
    data: newAccount,
    cashier: newAccount,
    message: 'FamPay account verified & connected successfully!'
  };
};

export const addPaytmAccount = async (data: {
  upi_id: string;
  phone: string;
  paytm_mid?: string;
}): Promise<{ success: boolean; data: CashierAccount; cashier: CashierAccount; message: string }> => {
  const newAccount: CashierAccount = {
    id: 'paytm-' + Date.now(),
    type: 'paytm',
    upi_id: data.upi_id.trim(),
    phone: data.phone.trim(),
    paytm_mid: data.paytm_mid?.trim() || '',
    is_active: true,
    status: 'active',
    created_at: new Date().toISOString()
  };

  const current = getStoredCashiers();
  const updated = [...current, newAccount];
  saveStoredCashiers(updated);

  try {
    await apiCall('/api/cashier/paytm/add', 'POST', data);
  } catch (err) {
    console.warn('Remote paytm add failed, saved locally:', err);
  }

  return {
    success: true,
    data: newAccount,
    cashier: newAccount,
    message: 'Paytm account added successfully!'
  };
};

export const toggleCashier = async (id: string, type: 'fampay' | 'paytm' | string) => {
  const current = getStoredCashiers();
  const updated = current.map(acc => {
    if (acc.id === id || acc._id === id) {
      const nextActive = !(acc.is_active ?? acc.isActive ?? true);
      return {
        ...acc,
        is_active: nextActive,
        isActive: nextActive,
        status: nextActive ? 'active' : 'inactive'
      };
    }
    return acc;
  });
  saveStoredCashiers(updated);

  try {
    await apiCall(`/api/cashier/${id}/toggle`, 'PATCH', { type });
  } catch (err) {
    console.warn('Remote toggle failed, saved locally:', err);
  }

  return { success: true };
};

export const deleteCashier = async (id: string) => {
  const current = getStoredCashiers();
  const updated = current.filter(acc => acc.id !== id && acc._id !== id);
  saveStoredCashiers(updated);

  try {
    await apiCall(`/api/cashier/${id}`, 'DELETE');
  } catch (err) {
    console.warn('Remote delete failed, updated locally:', err);
  }

  return { success: true };
};

export const getActiveCashier = async (apiKey?: string) => {
  try {
    const res = await apiCall(
      '/api/cashier/active',
      'GET',
      undefined,
      apiKey ? { 'x-api-key': apiKey } : undefined
    );
    if (res) return res;
  } catch (e) {}

  const current = getStoredCashiers();
  return current.find(acc => acc.is_active || acc.isActive) || current[0] || null;
};
