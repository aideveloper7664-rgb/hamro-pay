import { apiCall } from './api';

export const createLink = async (data: { title: string; amount: number; note?: string }) => {
  return apiCall('/api/payment-link/create', 'POST', data);
};

export const getLinks = async () => {
  return apiCall('/api/payment-link/list', 'GET');
};

export const deleteLink = async (id: string | number) => {
  return apiCall(`/api/payment-link/${id}`, 'DELETE');
};
