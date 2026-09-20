import { apiCall } from './api';

export const getWalletBalance = async () => apiCall('/wallet/balance');
export const getTransactions = async () => apiCall('/wallet/transactions');

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
