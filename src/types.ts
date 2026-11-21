export interface PaymentLink {
  id: string | number;
  link_id?: string;
  title: string;
  amount: number;
  orders: number;
  active: boolean;
  is_test?: boolean;
  date: string;
  note?: string;
  payment_url?: string;
  redirectUrl?: string;
  expiry?: string;
  expires_at?: string | null;
  created_at?: string;
  usageLimit?: number;
}

export interface Transaction {
  id: string;
  type: 'received' | 'withdrawal';
  ref: string;
  name: string;
  amount: number;
  status: 'Success' | 'Completed' | 'Pending' | 'Failed' | 'Timeout' | 'Cancelled';
  date: string;
}

export interface PaymentRow {
  id: string;
  order_id: string | null;
  link_id: string | null;
  link_title: string | null;
  amount: number;
  net_amount: number | null;
  commission: number | null;
  status: 'success' | 'pending' | 'timeout' | 'cancelled' | 'failed' | string;
  utr: string | null;
  created_at: string;
  paid_at: string | null;
  source?: 'checkout' | 'manual' | string;
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

export type PlanType =
  | 'FREE'
  | 'BASIC'
  | 'STARTER'
  | 'GROWTH'
  | 'BUSINESS'
  | 'ADVANCE'
  | 'ELITE';

export interface PlanAccountsLimit {
  fampay: number | null;
  paytm_mid: number | null;
  amazon: number | null;
}

export interface PlanDefinition {
  name: PlanType | string;
  price: number;
  duration_days: number;
  links_per_month: number | null;
  link_expiry_days: number | null;
  max_amount: number | null;
  commission: number;
  webhooks: number | null;
  developer_portal?: boolean;
  api_orders: boolean;
  api_docs: boolean;
  advanced_api: boolean;
  accounts: PlanAccountsLimit;
  custom_pages: boolean;
  qr_theme: boolean;
  branding: boolean;
  multiple_pages: boolean;
}

export interface PlanUsage {
  links_used: number;
  links_limit: number | null;
  webhooks_used: number;
  webhooks_limit: number | null;
  accounts_used: number;
  accounts_limit?: number | null;
}

export interface CurrentPlanState {
  plan: PlanDefinition;
  expires_at: string | null;
  usage: PlanUsage;
}

export interface StoreConfig {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  contact_phone?: string | null;
  is_active: boolean;
  url: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoreUsage {
  products_used: number;
  products_limit: number | null;
}

export interface StoreDashboardData {
  store: StoreConfig | null;
  usage: StoreUsage;
  plan?: PlanDefinition | null;
}

export interface StoreProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  stock: number | null;
  is_active: boolean;
  created_at?: string;
}

export interface StoreOrderItem {
  product_id?: string;
  name: string;
  price: number;
  qty: number;
}

export type StoreOrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled';
export type StoreFulfilmentStatus = 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface StoreOrder {
  order_code: string;
  status: StoreOrderStatus;
  fulfilment: StoreFulfilmentStatus;
  items: StoreOrderItem[];
  total: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  address?: string | null;
  note?: string | null;
  created_at: string;
  paid_at?: string | null;
}

export interface PublicStoreInfo {
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  contact_phone?: string | null;
  merchant_name?: string | null;
}

export interface PublicStoreProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  in_stock: boolean;
  stock: number | null;
}

export interface PublicStoreData {
  store: PublicStoreInfo;
  products: PublicStoreProduct[];
}

export interface PublicCheckoutResponse {
  order_code: string;
  total: number;
  pay_amount: number;
  payment_url: string;
  expires_at?: string | null;
}

export interface PublicStoreOrderStatus {
  order_code?: string;
  status: StoreOrderStatus | string;
  fulfilment: StoreFulfilmentStatus | string;
  items: StoreOrderItem[];
  total: number;
  payment_url?: string | null;
  customer_name?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
}

