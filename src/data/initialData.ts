import { PaymentLink, Transaction, Notification, MerchantProfile } from '../types';

export const initialLinks: PaymentLink[] = [];

export const initialTransactions: Transaction[] = [];

export const initialNotifications: Notification[] = [];

export const defaultProfile: MerchantProfile = {
  name: 'Merchant User',
  email: '',
  phone: '',
  emailReceipts: true,
  withdrawalAlerts: true
};

