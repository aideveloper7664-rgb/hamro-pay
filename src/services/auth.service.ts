import { apiCall, publicApiCall, clearHamroStorage } from './api';

export const getMe = async () => apiCall('/auth/me', 'GET');

export const logout = async () => {
  clearHamroStorage();
};

export interface SendEmailOtpResponse {
  expires_in: number;
  resend_after: number;
}

export interface VerifyEmailOtpResponse {
  token: string;
  merchant: any;
  is_new_user?: boolean;
}

export const sendEmailOtp = async (email: string): Promise<SendEmailOtpResponse> =>
  publicApiCall('/auth/otp/send', 'POST', { email });

export const verifyEmailOtp = async (payload: {
  email: string;
  code: string;
  name?: string;
}): Promise<VerifyEmailOtpResponse> =>
  publicApiCall('/auth/otp/verify', 'POST', payload);

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
