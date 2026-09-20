import { apiCall, publicApiCall } from './api';

export const getPlans = async () => publicApiCall('/api/plans/list');
export const getCurrentPlan = async () => apiCall('/api/plans/current');
export const upgradePlan = async (plan_id: string) =>
  apiCall('/api/plans/upgrade', 'POST', { plan_id });
