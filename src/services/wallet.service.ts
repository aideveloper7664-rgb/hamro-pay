import { apiCall } from './api';

export const getBalance = async () => {
  return apiCall('/api/wallet/balance', 'GET');
};

export const convertToCredit = async (amount: number) => {
  return apiCall('/api/wallet/convert-to-credit', 'POST', { amount });
};
