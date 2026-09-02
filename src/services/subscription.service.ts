import { apiCall } from './api';

export const getMySub = async () => {
  return apiCall('/api/subscription/my', 'GET');
};

export const getPlans = async () => {
  return apiCall('/api/subscription/plans', 'GET');
};

export const getDurationOptions = async (planId: string) => {
  return apiCall(`/api/subscription/duration-options?planId=${planId}`, 'GET');
};

export const purchaseWithWallet = async (planId: string, months: number) => {
  return apiCall('/api/subscription/purchase-wallet', 'POST', { planId, months });
};
