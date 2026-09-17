import { apiCall, publicApiCall } from './api';

export const getMe = async () => apiCall('/auth/me', 'GET');
export const logout = async () => {
  localStorage.removeItem('hamropay_token');
  localStorage.removeItem('hamropay_merchant');
  localStorage.removeItem('hamro_is_logged_in');
};
export const sendOTP = async () => {};
export const verifyOTP = async () => {};
export const resetPassword = async () => {};
export const googleLogin = async () => {};
export const register = async (data: any) => publicApiCall('/auth/register', 'POST', data);
export const login = async (data: any) => publicApiCall('/auth/login', 'POST', data);
