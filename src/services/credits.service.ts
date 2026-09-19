import { apiCall } from './api';

export interface CreditBalanceResponse {
  balance: number;
  credits?: number;
  currency?: string;
}

export interface CreditTransaction {
  id: string;
  _id?: string;
  amount: number;
  utr: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | string;
  type?: string;
  description?: string;
  created_at?: string;
  createdAt?: string;
  date?: string;
}

export const getCreditBalance = async () => apiCall('/api/credits/balance');

export const purchaseCredits = async (amount: number, utr: string) =>
  apiCall('/api/credits/purchase', 'POST', { amount, utr });

export const getCreditHistory = async () => apiCall('/api/credits/history');
