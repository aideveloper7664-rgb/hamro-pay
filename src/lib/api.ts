import { PaymentLink, Transaction, Notification, MerchantProfile } from '../types';

// The requested API base URL
export const DEFAULT_API_BASE = 'https://zappay-beta.vercel.app';

// Helper to get or set active API configuration
export interface ApiConfig {
  baseUrl: string;
  isEnabled: boolean;
  isSimulatedFallback: boolean;
  token: string;
}

export function getApiConfig(): ApiConfig {
  const savedBaseUrl = localStorage.getItem('hamro_api_base_url') || DEFAULT_API_BASE;
  const savedEnabled = localStorage.getItem('hamro_api_enabled') !== 'false'; // default true
  const savedSimulated = localStorage.getItem('hamro_api_simulated') === 'true'; // default false
  const savedToken = localStorage.getItem('hamro_api_token') || '';
  
  return {
    baseUrl: savedBaseUrl,
    isEnabled: savedEnabled,
    isSimulatedFallback: savedSimulated,
    token: savedToken,
  };
}

export function saveApiConfig(config: ApiConfig) {
  localStorage.setItem('hamro_api_base_url', config.baseUrl);
  localStorage.setItem('hamro_api_enabled', String(config.isEnabled));
  localStorage.setItem('hamro_api_simulated', String(config.isSimulatedFallback));
  localStorage.setItem('hamro_api_token', config.token);
}

/**
 * Universal safe fetcher that tries to connect to the real Vercel API.
 * If the API is offline, fails CORS, or is unavailable, it gracefully handles it
 * and falls back to simulated responses while maintaining local data integrity.
 */
async function apiRequest<T>(
  path: string, 
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', 
  body?: any
): Promise<{ data: T | null; error: string | null; isSimulated: boolean }> {
  const config = getApiConfig();
  
  if (!config.isEnabled) {
    return { data: null, error: 'API Connection is manually disabled', isSimulated: true };
  }

  const url = `${config.baseUrl}${path}`;
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { data, error: null, isSimulated: false };
  } catch (err: any) {
    console.warn(`[API] Connection to ${url} failed: ${err.message}. Falling back to sandbox emulator.`);
    return { 
      data: null, 
      error: err.message || 'Network error / CORS policy restriction', 
      isSimulated: true 
    };
  }
}

// --- API Service methods ---
export const ApiService = {
  /**
   * Test connection to the API base
   */
  async ping(): Promise<boolean> {
    const res = await apiRequest<{ status: string }>('/api/health');
    return !res.isSimulated;
  },

  /**
   * Authentication Login
   */
  async login(email: string, password: string): Promise<{ success: boolean; token?: string; user?: any; error?: string; isSimulated: boolean }> {
    const res = await apiRequest<{ token: string; user: any }>('/api/auth/login', 'POST', { email, password });
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'Login failed', isSimulated: res.isSimulated };
    }
    return { success: true, token: res.data.token, user: res.data.user, isSimulated: false };
  },

  /**
   * Authentication Signup
   */
  async signup(name: string, email: string, password: string): Promise<{ success: boolean; token?: string; user?: any; error?: string; isSimulated: boolean }> {
    const res = await apiRequest<{ token: string; user: any }>('/api/auth/signup', 'POST', { name, email, password });
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'Signup failed', isSimulated: res.isSimulated };
    }
    return { success: true, token: res.data.token, user: res.data.user, isSimulated: false };
  },

  /**
   * Retrieve session user data
   */
  async getMe(): Promise<{ success: boolean; user?: any; error?: string; isSimulated: boolean }> {
    const res = await apiRequest<{ user: any }>('/api/auth/me', 'GET');
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'Failed to fetch session', isSimulated: res.isSimulated };
    }
    return { success: true, user: res.data.user, isSimulated: false };
  },

  /**
   * Get User Profile details
   */
  async getUserProfile(): Promise<{ success: boolean; profile?: any; error?: string; isSimulated: boolean }> {
    const res = await apiRequest<{ success: boolean; profile: any }>('/api/user', 'GET');
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'Profile fetch failed', isSimulated: res.isSimulated };
    }
    return { success: true, profile: res.data.profile, isSimulated: false };
  },

  /**
   * Get all active payment links
   */
  async getLinks(localFallback: PaymentLink[]): Promise<{ links: PaymentLink[]; isSimulated: boolean }> {
    const res = await apiRequest<PaymentLink[]>('/api/payment');
    if (res.error || !res.data) {
      return { links: localFallback, isSimulated: true };
    }
    return { links: res.data, isSimulated: false };
  },

  /**
   * Create a new payment link
   */
  async createLink(link: Omit<PaymentLink, 'id' | 'orders' | 'date'>, localFallback: PaymentLink[]): Promise<{ link: PaymentLink; isSimulated: boolean }> {
    const res = await apiRequest<PaymentLink>('/api/payment', 'POST', link);
    if (res.error || !res.data) {
      // Simulate locally
      const mockLink: PaymentLink = {
        ...link,
        id: 'mock-' + Date.now(),
        orders: 0,
        date: 'Created just now'
      };
      return { link: mockLink, isSimulated: true };
    }
    return { link: res.data, isSimulated: false };
  },

  /**
   * Update an existing link
   */
  async updateLink(id: string | number, link: Partial<PaymentLink>): Promise<{ success: boolean; isSimulated: boolean }> {
    const res = await apiRequest<{ success: boolean }>('/api/payment/' + id, 'PUT', link);
    if (res.error || !res.data) {
      return { success: true, isSimulated: true };
    }
    return { success: res.data.success, isSimulated: false };
  },

  /**
   * Toggle a link active status
   */
  async toggleLinkActive(id: string | number, active: boolean): Promise<{ success: boolean; isSimulated: boolean }> {
    const res = await apiRequest<{ success: boolean }>(`/api/payment/${id}/toggle`, 'PATCH', { active });
    if (res.error || !res.data) {
      return { success: true, isSimulated: true };
    }
    return { success: res.data.success, isSimulated: false };
  },

  /**
   * Fetch ledger transactions
   */
  async getTransactions(localFallback: Transaction[]): Promise<{ transactions: Transaction[]; isSimulated: boolean }> {
    const res = await apiRequest<Transaction[]>('/api/withdrawal');
    if (res.error || !res.data) {
      return { transactions: localFallback, isSimulated: true };
    }
    return { transactions: res.data, isSimulated: false };
  },

  /**
   * Submit withdrawal request
   */
  async withdrawFunds(amount: number, upi: string): Promise<{ success: boolean; tx?: Transaction; isSimulated: boolean }> {
    const payload = { amount, upi };
    const res = await apiRequest<{ success: boolean; tx?: Transaction }>('/api/withdrawal', 'POST', payload);
    if (res.error || !res.data) {
      return { success: true, isSimulated: true };
    }
    return { success: res.data.success, tx: res.data.tx, isSimulated: false };
  },

  /**
   * Fetch system/payment notifications
   */
  async getNotifications(localFallback: Notification[]): Promise<{ notifications: Notification[]; isSimulated: boolean }> {
    const res = await apiRequest<Notification[]>('/api/notification');
    if (res.error || !res.data) {
      return { notifications: localFallback, isSimulated: true };
    }
    return { notifications: res.data, isSimulated: false };
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<{ success: boolean; isSimulated: boolean }> {
    const res = await apiRequest<{ success: boolean }>('/api/notification/read-all', 'POST');
    if (res.error || !res.data) {
      return { success: true, isSimulated: true };
    }
    return { success: res.data.success, isSimulated: false };
  },

  /**
   * Update profile data
   */
  async updateProfile(profile: MerchantProfile): Promise<{ success: boolean; isSimulated: boolean }> {
    const res = await apiRequest<{ success: boolean }>('/api/user', 'POST', profile);
    if (res.error || !res.data) {
      return { success: true, isSimulated: true };
    }
    return { success: res.data.success, isSimulated: false };
  },

  /**
   * Upgrade Plan / subscription
   */
  async upgradePlan(plan: string): Promise<{ success: boolean; plan?: string; feePercent?: number; linkLimit?: number; error?: string; isSimulated: boolean }> {
    const res = await apiRequest<{ success: boolean; plan: string; feePercent: number; linkLimit: number }>('/api/plans/upgrade', 'POST', { plan });
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'Plan upgrade failed', isSimulated: res.isSimulated };
    }
    return { success: true, plan: res.data.plan, feePercent: res.data.feePercent, linkLimit: res.data.linkLimit, isSimulated: false };
  },

  /**
   * Fetch Referral code and stats
   */
  async getReferral(): Promise<{ referralCode: string; referralsCount: number; referralEarnings: number; isSimulated: boolean }> {
    const res = await apiRequest<{ referralCode: string; referralsCount: number; referralEarnings: number }>('/api/referral', 'GET');
    if (res.error || !res.data) {
      return { referralCode: 'HAMRO980', referralsCount: 3, referralEarnings: 480, isSimulated: true };
    }
    return { ...res.data, isSimulated: false };
  },

  /**
   * Submit support message ticket
   */
  async submitSupport(topic: string, message: string, name?: string, email?: string): Promise<{ success: boolean; error?: string; isSimulated: boolean }> {
    const res = await apiRequest<{ success: boolean }>('/api/support', 'POST', { topic, message, name, email });
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'Support submit failed', isSimulated: res.isSimulated };
    }
    return { success: true, isSimulated: false };
  }
};
