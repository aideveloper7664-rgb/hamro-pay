export interface PaymentLink {
  id: string | number;
  link_id?: string;
  title: string;
  amount: number;
  orders: number;
  active: boolean;
  date: string;
  note?: string;
  payment_url?: string;
  redirectUrl?: string;
  expiry?: string;
  usageLimit?: number;
}

export interface Transaction {
  id: string;
  type: 'received' | 'withdrawal';
  ref: string;
  name: string;
  amount: number;
  status: 'Success' | 'Completed' | 'Pending' | 'Failed';
  date: string;
}

export interface Notification {
  id: string | number;
  title: string;
  text: string;
  time: string;
  unread: boolean;
}

export interface MerchantProfile {
  name: string;
  email: string;
  phone: string;
  emailReceipts: boolean;
  withdrawalAlerts: boolean;
}

export type PlanType = 'Blaze Free' | 'Pulse' | 'Summit';
