import { apiCall, publicApiCallFull, clearHamroStorage } from './api';

export type OtpPurpose = 'signup' | 'login' | 'reset';

export interface AuthApiEnvelope<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export interface OtpStartData {
  expires_in?: number;
  resend_after?: number;
}

export interface AuthVerifyData {
  token: string;
  merchant: any;
  is_new_user?: boolean;
}

export const getMe = async () => apiCall('/auth/me', 'GET');

export const logout = async () => {
  clearHamroStorage();
};

export const startRegister = async (payload: {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}): Promise<AuthApiEnvelope<OtpStartData>> =>
  publicApiCallFull('/auth/register/start', 'POST', payload);

export const verifyRegister = async (payload: {
  email: string;
  code: string;
}): Promise<AuthApiEnvelope<AuthVerifyData>> =>
  publicApiCallFull('/auth/register/verify', 'POST', payload);

export const startLogin = async (payload: {
  email: string;
  password: string;
}): Promise<AuthApiEnvelope<OtpStartData>> =>
  publicApiCallFull('/auth/login/start', 'POST', payload);

export const verifyLogin = async (payload: {
  email: string;
  code: string;
}): Promise<AuthApiEnvelope<AuthVerifyData>> =>
  publicApiCallFull('/auth/login/verify', 'POST', payload);

export const startForgotPassword = async (payload: {
  email: string;
}): Promise<AuthApiEnvelope<OtpStartData>> =>
  publicApiCallFull('/auth/forgot/start', 'POST', payload);

export const verifyForgotPassword = async (payload: {
  email: string;
  code: string;
  new_password: string;
  confirm_password: string;
}): Promise<AuthApiEnvelope<any>> =>
  publicApiCallFull('/auth/forgot/verify', 'POST', payload);

export const resendAuthOtp = async (payload: {
  email: string;
  purpose: OtpPurpose;
}): Promise<AuthApiEnvelope<OtpStartData>> =>
  publicApiCallFull('/auth/resend', 'POST', payload);
