import { apiCall } from './api';

export const getStatus = async () => {
  return apiCall('/api/fampay/status', 'GET');
};

export const connect = async (data: any) => {
  return apiCall('/api/fampay/connect', 'POST', data);
};

export const disconnect = async () => {
  return apiCall('/api/fampay/disconnect', 'POST');
};

export const getHistory = async () => {
  return apiCall('/api/fampay/history', 'POST');
};
