import { apiCall, apiCallFull, publicApiCall } from './api';
import {
  PublicCheckoutResponse,
  PublicStoreData,
  PublicStoreOrderStatus,
  StoreConfig,
  StoreCustomization,
  StoreCustomizeResponse,
  StoreDashboardData,
  StoreFulfilmentStatus,
  StoreOrder,
  StoreProduct,
} from '../types';

export interface UpsertStorePayload {
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  contact_phone?: string;
  is_active?: boolean;
}

export interface StoreProductPayload {
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock?: number | null;
  is_active?: boolean;
}

export interface PublicCheckoutPayload {
  items: Array<{ product_id: string; qty: number }>;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    note?: string;
  };
}

export const getStore = async (): Promise<StoreDashboardData> => {
  const res: any = await apiCallFull('/api/store');
  const rawUsage = res?.usage || res?.data?.usage || {};
  const rawStore = res?.data !== undefined ? res.data : res?.store ?? null;
  const storeObj: StoreConfig | null =
    rawStore && typeof rawStore === 'object' && rawStore.id ? rawStore : null;

  return {
    store: storeObj,
    usage: {
      products_used: Number(rawUsage.products_used ?? 0),
      products_limit:
        rawUsage.products_limit !== undefined ? rawUsage.products_limit : null,
    },
    plan: res?.plan ?? null,
  };
};

export const upsertStore = async (
  payload: UpsertStorePayload
): Promise<StoreDashboardData> => {
  const res: any = await apiCallFull('/api/store', 'PUT', payload);
  const rawUsage = res?.usage || res?.data?.usage || {};
  const rawStore = res?.data !== undefined ? res.data : res?.store ?? null;
  const storeObj: StoreConfig | null =
    rawStore && typeof rawStore === 'object' && rawStore.id ? rawStore : null;

  return {
    store: storeObj,
    usage: {
      products_used: Number(rawUsage.products_used ?? 0),
      products_limit:
        rawUsage.products_limit !== undefined ? rawUsage.products_limit : null,
    },
    plan: res?.plan ?? null,
  };
};

export const getStoreProducts = async (): Promise<StoreProduct[]> => {
  const res: any = await apiCall('/api/store/products');
  const list = Array.isArray(res) ? res : res?.products || res?.data || [];
  return Array.isArray(list) ? list : [];
};

export const createStoreProduct = async (
  payload: StoreProductPayload
): Promise<StoreProduct> => {
  const res: any = await apiCall('/api/store/products', 'POST', payload);
  return res?.product || res;
};

export const updateStoreProduct = async (
  id: string,
  payload: Partial<StoreProductPayload>
): Promise<StoreProduct> => {
  const res: any = await apiCall(
    `/api/store/products/${encodeURIComponent(id)}`,
    'PATCH',
    payload
  );
  return res?.product || res;
};

export const deleteStoreProduct = async (id: string): Promise<void> => {
  await apiCall(`/api/store/products/${encodeURIComponent(id)}`, 'DELETE');
};

export const getStoreOrders = async (): Promise<StoreOrder[]> => {
  const res: any = await apiCall('/api/store/orders');
  const list = Array.isArray(res) ? res : res?.orders || res?.data || [];
  return Array.isArray(list) ? list : [];
};

export const updateStoreOrder = async (
  orderCode: string,
  payload: { fulfilment: StoreFulfilmentStatus; note?: string }
): Promise<StoreOrder> => {
  const res: any = await apiCall(
    `/api/store/orders/${encodeURIComponent(orderCode)}`,
    'PATCH',
    payload
  );
  return res?.order || res;
};

export const getStoreCustomization = async (): Promise<StoreCustomizeResponse> => {
  const res: any = await apiCall('/api/store/customize');
  return {
    customization: res?.customization || res,
    defaults: res?.defaults || res?.customization || {},
    options: res?.options || {},
    text_limits: res?.text_limits || {},
    can_hide_branding: Boolean(res?.can_hide_branding),
  };
};

export const updateStoreCustomization = async (
  patch: Partial<StoreCustomization>
): Promise<StoreCustomization> => {
  const res: any = await apiCall('/api/store/customize', 'PUT', patch);
  return res?.customization || res;
};

export const resetStoreCustomization = async (): Promise<StoreCustomization> => {
  const res: any = await apiCall('/api/store/customize', 'DELETE');
  return res?.customization || res;
};

export const getPublicStore = async (slug: string): Promise<PublicStoreData> => {
  const res: any = await publicApiCall(
    `/api/store/public/${encodeURIComponent(slug)}`
  );
  const store = res?.store || {};
  const products = Array.isArray(res?.products) ? res.products : [];
  const customization = res?.customization || null;
  return { store, products, customization };
};

export const checkoutPublicStore = async (
  slug: string,
  payload: PublicCheckoutPayload
): Promise<PublicCheckoutResponse> => {
  return publicApiCall(
    `/api/store/public/${encodeURIComponent(slug)}/checkout`,
    'POST',
    payload
  );
};

export const getPublicStoreOrder = async (
  slug: string,
  code: string
): Promise<PublicStoreOrderStatus> => {
  return publicApiCall(
    `/api/store/public/${encodeURIComponent(slug)}/order/${encodeURIComponent(code)}`
  );
};
