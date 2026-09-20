import { apiCall } from './api';

export const applyPromo = async (code: string) =>
  apiCall('/api/promo/apply', 'POST', { code });

export const getBonusBalance = async () =>
  apiCall('/api/promo/bonus');

export const convertBonusToCredit = async (amount: number) =>
  apiCall('/api/promo/bonus/convert-to-credit', 'POST', { amount });

export const convertCashToCredit = async (amount: number) =>
  apiCall('/api/promo/cash/convert-to-credit', 'POST', { amount });
