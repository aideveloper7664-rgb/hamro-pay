import { apiCall, publicApiCall } from './api';

export const createOrder = async (linkId: string, customerMobile?: string) => {
  return publicApiCall('/api/payment/create-order', 'POST', { linkId, customerMobile });
};

export const getHistory = async () => {
  return apiCall('/api/payment/history', 'GET');
};

export const getOrderStatus = async (orderId: string) => {
  return publicApiCall(`/api/developer/order-status?orderId=${orderId}`, 'GET');
};
