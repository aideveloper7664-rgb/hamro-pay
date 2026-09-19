import { apiCall } from './api';

export interface CashierAccount {
  id: string;
  _id?: string;
  type?: 'fampay' | 'paytm' | string;
  upi_id: string;
  upiId?: string;
  phone: string;
  gmail_email?: string;
  gmail?: string;
  email?: string;
  paytm_mid?: string;
  is_active?: boolean;
  isActive?: boolean;
  status?: string;
  created_at?: string;
  createdAt?: string;
}

export const getCashierList = async () => apiCall('/api/cashier/list');

export const addFamPayAccount = async (data: {
  upi_id: string;
  phone: string;
  gmail_email: string;
  gmail_app_password: string;
}) => apiCall('/api/cashier/fampay/add', 'POST', data);

export const addPaytmAccount = async (data: {
  upi_id: string;
  phone: string;
  paytm_mid?: string;
}) => apiCall('/api/cashier/paytm/add', 'POST', data);

export const toggleCashier = async (id: string, type: 'fampay' | 'paytm' | string) =>
  apiCall(`/api/cashier/${id}/toggle`, 'PATCH', { type });

export const deleteCashier = async (id: string) =>
  apiCall(`/api/cashier/${id}`, 'DELETE');

export const getActiveCashier = async (apiKey?: string) =>
  apiCall(
    '/api/cashier/active',
    'GET',
    undefined,
    apiKey ? { 'x-api-key': apiKey } : undefined
  );
