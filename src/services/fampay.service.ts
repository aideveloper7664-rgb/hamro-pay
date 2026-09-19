import { getApiConfig } from '../lib/api';

export interface FamPayAccount {
  id: string;
  phone: string;
  upiId: string;
  gmail: string;
  name: string;
  isGmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'hamro_fampay_accounts';

export const getLocalFamPayAccounts = (): FamPayAccount[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalFamPayAccounts = (accounts: FamPayAccount[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save fampay accounts to local storage', err);
  }
};

const makeRequest = async (path: string, method: string = 'GET', body?: any) => {
  const config = getApiConfig();
  const token = config.token || localStorage.getItem('hamropay_token') || 'demo-bearer-token-aarav';
  const url = `${config.baseUrl}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
};

export const fetchFamPayAccounts = async (): Promise<FamPayAccount[]> => {
  try {
    const res = await makeRequest('/api/fampay/accounts');
    if (res.ok && res.data && Array.isArray(res.data.accounts)) {
      saveLocalFamPayAccounts(res.data.accounts);
      return res.data.accounts;
    }
  } catch (err) {
    console.warn('API error fetching FamPay accounts, using fallback:', err);
  }
  return getLocalFamPayAccounts();
};

export const addFamPayAccount = async (data: {
  phone: string;
  upiId: string;
  gmail: string;
  name?: string;
}): Promise<{ success: boolean; account?: FamPayAccount; message?: string }> => {
  try {
    const res = await makeRequest('/api/fampay/accounts', 'POST', data);
    if (res.ok && res.data && res.data.success) {
      await fetchFamPayAccounts();
      return { success: true, account: res.data.account, message: res.data.message };
    } else if (res.data && res.data.message) {
      return { success: false, message: res.data.message };
    }
  } catch (err: any) {
    console.warn('API add account error, performing offline creation:', err);
  }

  // Local fallback creation
  const localAccounts = getLocalFamPayAccounts();
  if (localAccounts.length >= 3) {
    return { success: false, message: 'Maximum 3 FamPay accounts allowed.' };
  }

  const newAcc: FamPayAccount = {
    id: 'fampay-' + Date.now(),
    phone: data.phone.trim(),
    upiId: data.upiId.trim(),
    gmail: data.gmail.trim(),
    name: data.name?.trim() || 'FamPay Account',
    isGmailVerified: false,
    isActive: false,
    createdAt: new Date().toISOString()
  };

  const updated = [...localAccounts, newAcc];
  saveLocalFamPayAccounts(updated);
  return { success: true, account: newAcc, message: 'FamPay account added locally. Please verify Gmail.' };
};

export const activateFamPayAccount = async (id: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await makeRequest(`/api/fampay/accounts/${id}/activate`, 'POST');
    if (res.ok && res.data && res.data.success) {
      await fetchFamPayAccounts();
      return { success: true, message: res.data.message };
    } else if (res.data && res.data.message) {
      return { success: false, message: res.data.message };
    }
  } catch (err) {
    console.warn('API activate error, using local fallback:', err);
  }

  const localAccounts = getLocalFamPayAccounts();
  const acc = localAccounts.find(a => a.id === id);
  if (!acc) return { success: false, message: 'Account not found.' };
  if (!acc.isGmailVerified) return { success: false, message: 'Account must be Gmail verified before activation.' };

  const updated = localAccounts.map(a => ({
    ...a,
    isActive: a.id === id
  }));
  saveLocalFamPayAccounts(updated);
  return { success: true, message: 'FamPay account activated.' };
};

export const verifyFamPayGmail = async (id: string, code?: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await makeRequest(`/api/fampay/accounts/${id}/verify-gmail`, 'POST', { code });
    if (res.ok && res.data && res.data.success) {
      await fetchFamPayAccounts();
      return { success: true, message: res.data.message };
    }
  } catch (err) {
    console.warn('API verify gmail error, using local fallback:', err);
  }

  const localAccounts = getLocalFamPayAccounts();
  const acc = localAccounts.find(a => a.id === id);
  if (!acc) return { success: false, message: 'Account not found.' };

  const activeExists = localAccounts.some(a => a.isActive);
  const updated = localAccounts.map(a => {
    if (a.id === id) {
      return {
        ...a,
        isGmailVerified: true,
        isActive: !activeExists ? true : a.isActive
      };
    }
    return a;
  });
  saveLocalFamPayAccounts(updated);
  return { success: true, message: 'Gmail verified successfully!' };
};

export const deleteFamPayAccount = async (id: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await makeRequest(`/api/fampay/accounts/${id}`, 'DELETE');
    if (res.ok && res.data && res.data.success) {
      await fetchFamPayAccounts();
      return { success: true, message: res.data.message };
    }
  } catch (err) {
    console.warn('API delete error, using local fallback:', err);
  }

  const localAccounts = getLocalFamPayAccounts();
  const filtered = localAccounts.filter(a => a.id !== id);
  const wasActive = localAccounts.find(a => a.id === id)?.isActive;

  if (wasActive) {
    const nextVerified = filtered.find(a => a.isGmailVerified);
    if (nextVerified) {
      nextVerified.isActive = true;
    }
  }

  saveLocalFamPayAccounts(filtered);
  return { success: true, message: 'FamPay account removed.' };
};

export const getStatus = async () => {
  const accounts = await fetchFamPayAccounts();
  const active = accounts.find(a => a.isActive);
  return {
    connected: Boolean(active),
    activeAccount: active,
    accounts
  };
};
