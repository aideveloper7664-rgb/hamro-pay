import { apiCall, publicApiCall } from '../services/api';
import { PaymentLink, Transaction, Notification, MerchantProfile } from '../types';

export { apiCall, publicApiCall };

export const DEFAULT_API_BASE = (import.meta as any).env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

export interface ApiConfig {
  baseUrl: string;
  isEnabled: boolean;
  isSimulatedFallback: boolean;
  token: string;
}

export function getApiConfig(): ApiConfig {
  return {
    baseUrl: DEFAULT_API_BASE,
    isEnabled: true,
    isSimulatedFallback: false,
    token: localStorage.getItem('hamropay_token') || '',
  };
}

export function saveApiConfig(config: ApiConfig) {
  if (config.token) {
    localStorage.setItem('hamropay_token', config.token);
  }
}

export const ApiService = {
  async getMe() {
    try {
      const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      const balanceData = await apiCall('/wallet/balance', 'GET').catch(() => ({ balance: 0 }));
      return {
        success: true,
        user: {
          name: merchant.name || 'Merchant',
          email: merchant.email || '',
          phone: '',
          emailReceipts: true,
          withdrawalAlerts: true,
          availableBalance: balanceData?.balance ?? 0,
          pendingPayout: 0,
          plan: 'Blaze Free',
          feePercent: 1.5,
          linkLimit: 100,
        },
        error: undefined as string | undefined
      };
    } catch (err: any) {
      return { success: false, user: null as any, error: err.message };
    }
  },

  async getWalletBalance() {
    return apiCall('/wallet/balance', 'GET');
  },

  async getTransactions(localFallback: Transaction[]) {
    try {
      const data = await apiCall('/wallet/transactions', 'GET');
      if (Array.isArray(data)) {
        const mapped: Transaction[] = data.map((item: any, idx: number) => ({
          id: item.id || item.transaction_id || `tx-${idx}`,
          ref: item.ref || item.order_id || item.utr || `TXN${1000 + idx}`,
          name: item.customer_name || item.name || item.upi_id || 'FamPay Customer',
          amount: Number(item.amount || item.net_amount || 0),
          type: item.type === 'withdraw' || item.type === 'withdrawal' ? 'withdrawal' : 'received',
          status: item.status === 'success' || item.status === 'PAID' ? 'Success' : item.status === 'failed' ? 'Failed' : 'Pending',
          date: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'
        }));
        return { transactions: mapped, isSimulated: false };
      }
      return { transactions: localFallback, isSimulated: false };
    } catch {
      return { transactions: localFallback, isSimulated: false };
    }
  },

  async getLinks(localFallback: PaymentLink[]) {
    return { links: localFallback, isSimulated: false };
  },

  async createLink(link: Omit<PaymentLink, 'id' | 'orders' | 'date'>, localFallback: PaymentLink[]) {
    const newLink: PaymentLink = {
      ...link,
      id: 'link-' + Date.now(),
      orders: 0,
      date: 'Created just now'
    };
    return { link: newLink, isSimulated: false };
  },

  async updateLink(id: string | number, updates: Partial<PaymentLink>, localFallback?: PaymentLink[]) {
    return { isSimulated: false };
  },

  async toggleLinkActive(id: string | number, active: boolean) {
    return { isSimulated: false };
  },

  async withdrawFunds(amount: number, upi_id: string) {
    try {
      const res = await apiCall('/wallet/withdraw', 'POST', { amount, upi_id });
      return { success: true, isSimulated: false, data: res };
    } catch (err: any) {
      return { success: false, isSimulated: false, error: err.message };
    }
  },

  async getUserProfile() {
    const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
    return {
      success: true,
      profile: {
        name: merchant.name || 'Merchant',
        email: merchant.email || '',
        phone: '',
        emailReceipts: true,
        withdrawalAlerts: true,
      },
      isSimulated: false,
      error: undefined as string | undefined,
    };
  },

  async updateProfile(profile: MerchantProfile) {
    const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
    merchant.name = profile.name;
    merchant.email = profile.email;
    localStorage.setItem('hamropay_merchant', JSON.stringify(merchant));
    return { success: true, isSimulated: false };
  },

  async getNotifications(notifications: Notification[]) {
    return { notifications, isSimulated: false };
  },

  async markAllNotificationsRead() {
    return { isSimulated: false };
  },

  async getReferral() {
    return { isSimulated: false, referralCode: 'HAMRO-VIP', referralsCount: 0, referralEarnings: 0 };
  },

  async upgradePlan(plan: string) {
    return { success: true, isSimulated: false, plan, feePercent: 1.5, linkLimit: 100 };
  },

  async submitSupport(topic: string, message: string, name?: string, email?: string) {
    return { success: true, isSimulated: false };
  }
};
