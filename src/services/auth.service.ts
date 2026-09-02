import { apiCall, publicApiCall } from './api';

export const getMe = async () => {
  return apiCall('/api/auth/me', 'GET');
};

export const googleLogin = async (idToken: string) => {
  return publicApiCall('/api/auth/google', 'POST', { idToken });
};

export const logout = async () => {
  return apiCall('/api/auth/logout', 'POST');
};

export const sendOTP = async (email: string, type: 'signup' | 'login' | 'reset') => {
  return publicApiCall('/api/otp/send', 'POST', { email, type });
};

export const verifyOTP = async (email: string, code: string, type: 'signup' | 'login' | 'reset') => {
  return publicApiCall('/api/otp/verify', 'POST', { email, code, type });
};

export const resetPassword = async (email: string, code: string, newPassword: any) => {
  return publicApiCall('/api/otp/reset-password', 'POST', { email, code, newPassword });
};
