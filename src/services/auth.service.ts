import { apiCall, publicApiCall } from './api';

export const getMe = async () => apiCall('/auth/me', 'GET');

export const logout = async () => {
  localStorage.removeItem('hamropay_token');
  localStorage.removeItem('hamropay_merchant');
  localStorage.removeItem('hamro_is_logged_in');
  localStorage.removeItem('hamropay_api_key');
};

export const sendOTP = async (email: string) =>
  publicApiCall('/auth/send-otp', 'POST', { email });

export const verifyOTP = async (email: string, otp: string) =>
  publicApiCall('/auth/verify-otp', 'POST', { email, otp });

export const verifyOTPLogin = async (email: string, otp: string) =>
  publicApiCall('/auth/verify-otp', 'POST', { email, otp });

export const forgotPassword = async (email: string) =>
  publicApiCall('/auth/forgot-password', 'POST', { email });

export const resetPassword = async (token: string, password: string) =>
  publicApiCall('/auth/reset-password', 'POST', { token, password });

export const register = async (data: {
  name: string;
  email: string;
  password: string;
  referral_code?: string;
}) => publicApiCall('/auth/register', 'POST', data);

export const login = async (data: { email: string; password?: string }) =>
  publicApiCall('/auth/login', 'POST', data);
