import { apiCall } from './api';

export const requestWithdrawal = async (data: { amount: number; bankAccount?: string; upiId?: string }) => {
  return apiCall('/api/withdrawal/request', 'POST', data);
};

export const getHistory = async () => {
  return apiCall('/api/withdrawal/history', 'GET');
};
