import { apiCall } from './api';
import { PaymentRow } from '../types';

export interface GetPaymentsParams {
  before?: string;
  limit?: number;
}

export interface PaymentsResponse {
  payments: PaymentRow[];
  has_more: boolean;
  next_before: string | null;
}

export const getWalletBalance = async () => apiCall('/wallet/balance');
export const getTransactions = async () => apiCall('/wallet/transactions');

export const getPayments = async (params: GetPaymentsParams = {}): Promise<PaymentsResponse> => {
  const queryParts: string[] = [];
  if (params.limit !== undefined) {
    queryParts.push(`limit=${encodeURIComponent(params.limit)}`);
  }
  if (params.before) {
    queryParts.push(`before=${encodeURIComponent(params.before)}`);
  }
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const res: any = await apiCall(`/wallet/payments${queryString}`);
  const data = (res?.data !== undefined ? res.data : res) || {};
  return {
    payments: Array.isArray(data.payments) ? data.payments : (Array.isArray(res) ? res : []),
    has_more: Boolean(data.has_more),
    next_before: data.next_before || null,
  };
};

export const requestWithdrawal = async (
  dataOrAmount: number | {
    amount: number;
    method?: 'upi' | 'bank' | string;
    upi_id?: string;
    upiId?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    account_holder?: string;
    [key: string]: any;
  },
  destination?: string
) => {
  if (typeof dataOrAmount === 'object') {
    return apiCall('/wallet/withdraw', 'POST', dataOrAmount);
  }
  return apiCall('/wallet/withdraw', 'POST', {
    amount: dataOrAmount,
    destination: destination || '',
    upi_id: destination
  });
};

export const getWithdrawals = async () => apiCall('/wallet/withdrawals');
