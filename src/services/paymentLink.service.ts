import { apiCall } from './api';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://hamro-pay-kilj.vercel.app';

export const createLink = async (data: { title: string; amount: number; note?: string; is_test?: boolean }) =>
  apiCall('/api/payment-link/create', 'POST', data);

export const getLinks = async () => apiCall('/api/payment-link/list');

export const deleteLink = async (linkId: string) =>
  apiCall(`/api/payment-link/${linkId}`, 'DELETE');

export const getLinkPaymentUrl = (linkId: string) => {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost:5173')
    ? window.location.origin
    : (FRONTEND_URL);
  return `${base}/pay/${linkId}`;
};
