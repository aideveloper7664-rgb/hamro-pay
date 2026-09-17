import { apiCall } from './api';

export const getWalletBalance = async () => apiCall('/wallet/balance');
export const getBalance = getWalletBalance;
export const getTransactions = async () => apiCall('/wallet/transactions');
export const requestWithdrawal = async (amount: number, upi_id: string) =>
  apiCall('/wallet/withdraw', 'POST', { amount, upi_id });
export const getWithdrawals = async () => apiCall('/wallet/withdrawals');
