import { apiCall, publicApiCall } from './api';

export const getConfig = async () => {
  return publicApiCall('/api/config', 'GET');
};

export const getReferral = async () => {
  return apiCall('/api/referral/my', 'GET');
};

export const applyPromo = async (code: string) => {
  return apiCall('/api/promo/apply', 'POST', { code });
};

export const updateProfile = async (data: { name: string; phone?: string; emailReceipts?: boolean; withdrawalAlerts?: boolean }) => {
  return apiCall('/api/user/profile', 'POST', data);
};

export const getStoreAccess = async () => {
  return apiCall('/api/store/access', 'GET');
};

export const unlockStoreWallet = async () => {
  return apiCall('/api/store/unlock/wallet', 'POST');
};
