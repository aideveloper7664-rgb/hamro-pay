import { apiCall, publicApiCall } from './api';

export const createOrder = async (amount: number, customer_name?: string, customer_email?: string) =>
  apiCall('/order/create', 'POST', { amount, customer_name, customer_email });

export const verifyPayment = async (order_id: string, utr: string) =>
  publicApiCall('/order/verify', 'POST', { order_id, utr });

export const getOrderStatus = async (order_id: string) =>
  publicApiCall(`/order/status/${order_id}`);

export const verifyLinkPayment = async (linkId: string, utr: string, amount?: number) =>
  publicApiCall(`/api/payment-link/${linkId}/verify`, 'POST', { utr, amount });
