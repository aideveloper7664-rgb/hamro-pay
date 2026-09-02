import { apiCall } from './api';

export const getCount = async () => {
  return apiCall('/api/notification/count', 'GET');
};

export const getList = async () => {
  return apiCall('/api/notification/list', 'GET');
};

export const markAllRead = async () => {
  return apiCall('/api/notification/read-all', 'POST');
};

export const saveFcmToken = async (token: string) => {
  return apiCall('/api/notification/fcm-token', 'POST', { token });
};
