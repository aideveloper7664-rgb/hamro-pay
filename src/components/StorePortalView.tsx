import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Store,
  Plus,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Package,
  ShoppingBag,
  Settings,
  Edit3,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  Download,
  Image as ImageIcon,
  Save,
  Clock,
  CheckCircle2,
  XCircle,
  Palette,
  Zap,
  Link2,
} from 'lucide-react';
import {
  CashierAccount,
} from '../services/cashier.service';
import {
  createStoreProduct,
  deleteStoreProduct,
  getStore,
  getStoreOrders,
  getStoreProducts,
  updateStoreOrder,
  updateStoreProduct,
  upsertStore,
} from '../services/store.service';
import { notifyApiOrPlanError, ShowToastFn } from '../services/plans.service';
import {
  CurrentPlanState,
  StoreConfig,
  StoreFulfilmentStatus,
  StoreOrder,
  StoreOrderStatus,
  StoreProduct,
  StoreUsage,
} from '../types';

interface StorePortalViewProps {
  showToast: ShowToastFn;
  onViewChange: (view: string) => void;
  activeCashier?: CashierAccount | null;
  planState?: CurrentPlanState | null;
  onOpenNoCashierModal?: () => void;
}

const SLUG_REGEX = /^[a-z0-9-]{3,40}$/;

const toSlug = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const formatCurrency = (val: number) =>
  `₹${Number(val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ORDER_STATUS_META: Record<
  StoreOrderStatus,
  { label: string; className: string }
> = {
  paid: {
    label: 'Paid',
    className: 'bg-emerald-500/15 text-[#2bf29a] border-emerald-500/30',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  expired: {
    label: 'Expired',
    className: 'bg-white/10 text-[#b89fa5] border-white/15',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

const FULFILMENT_OPTIONS: { value: StoreFulfilmentStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function StorePortalView({
  showToast,
  onViewChange,
  activeCashier,
  planState,
  onOpenNoCashierModal,
}: StorePortalViewProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings'>('products');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [store, setStore] = useState<StoreConfig | null>(null);
  const [usage, setUsage] = useState<StoreUsage>({
    products_used: 0,
    products_limit: null,
  });
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);

  // Create / Edit store form state
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [storeDescription, setStoreDescription] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeActive, setStoreActive] = useState(true);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSavingStore, setIsSavingStore] = useState(false);

  // Copy & QR modal state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const qrCanvasRef = useRef<HTMLDivElement | null>(null);

  // Product state
  const [productSearch, setProductSearch] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodDeliveryLink, setProdDeliveryLink] = useState('');
  const [prodDeliveryNote, setProdDeliveryNote] = useState('');
  const [prodFormError, setProdFormError] = useState<string | null>(null);
  const [prodActive, setProdActive] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<StoreProduct | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Orders state
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | StoreOrderStatus>('all');
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [drawerFulfilment, setDrawerFulfilment] = useState<StoreFulfilmentStatus>('new');
  const [drawerNote, setDrawerNote] = useState('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [updatingOrderCode, setUpdatingOrderCode] = useState<string | null>(null);
  const [copiedDeliveryKey, setCopiedDeliveryKey] = useState<string | null>(null);

  const syncStoreForm = (s: StoreConfig | null) => {
    if (!s) {
      setStoreName('');
      setStoreSlug('');
      setSlugTouched(false);
      setStoreDescription('');
      setStoreLogoUrl('');
      setStorePhone('');
      setStoreActive(true);
      return;
    }
    setStoreName(s.name || '');
    setStoreSlug(s.slug || '');
    setSlugTouched(true);
    setStoreDescription(s.description || '');
    setStoreLogoUrl(s.logo_url || '');
    setStorePhone(s.contact_phone || '');
    setStoreActive(s.is_active !== false);
  };

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const storeRes = await getStore();
      setStore(storeRes.store);
      setUsage(storeRes.usage);
      if (!silent) {
        syncStoreForm(storeRes.store);
      }

      if (storeRes.store) {
        const [prodList, ordList] = await Promise.all([
          getStoreProducts().catch(() => [] as StoreProduct[]),
          getStoreOrders().catch(() => [] as StoreOrder[]),
        ]);
        setProducts(prodList);
        setOrders(ordList);
      } else {
        setProducts([]);
        setOrders([]);
      }
    } catch (err: any) {
      if (!silent) {
        setLoadError(err?.message || 'Could not load store data.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll(false);
  }, [loadAll]);

  const refreshOrdersOnly = useCallback(async (silent = false) => {
    if (!store) return;
    if (!silent) setIsRefreshingOrders(true);
    try {
      const ordList = await getStoreOrders();
      setOrders(ordList);
      setSelectedOrder((prev) =>
        prev ? ordList.find((o) => o.order_code === prev.order_code) || prev : null
      );
    } catch (err: any) {
      if (!silent) {
        showToast(err?.message || 'Failed to refresh orders.', 'error');
      }
    } finally {
      if (!silent) setIsRefreshingOrders(false);
    }
  }, [store, showToast]);

  // Auto-refresh orders every 30s while visible and store exists
  useEffect(() => {
    if (!store) return;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshOrdersOnly(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [store, refreshOrdersOnly]);

  const publicStoreUrl = store
    ? store.url && store.url.startsWith('http')
      ? store.url
      : `${typeof window !== 'undefined' ? window.location.origin : ''}/store/${store.slug}`
    : '';

  const localStorePath = store ? `/store/${store.slug}` : '';

  const handleCopyUrl = () => {
    if (!publicStoreUrl) return;
    navigator.clipboard
      ?.writeText(publicStoreUrl)
      .then(() => {
        setCopiedUrl(true);
        showToast('Store link copied to clipboard.', 'success');
        setTimeout(() => setCopiedUrl(false), 1800);
      })
      .catch(() => showToast('Could not copy link.', 'error'));
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${store?.slug || 'hamropay-store'}-qr.png`;
    a.click();
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlugError(null);

    const trimmedName = storeName.trim();
    const cleanedSlug = storeSlug.trim().toLowerCase();

    if (!trimmedName) {
      showToast('Please enter a store name.', 'error');
      return;
    }

    if (cleanedSlug && !SLUG_REGEX.test(cleanedSlug)) {
      const msg = 'Slug must be 3–40 characters using only lowercase a-z, 0-9, and dashes.';
      setSlugError(msg);
      showToast(msg, 'error');
      return;
    }

    setIsSavingStore(true);
    try {
      const res = await upsertStore({
        name: trimmedName,
        ...(cleanedSlug ? { slug: cleanedSlug } : {}),
        description: storeDescription.trim(),
        logo_url: storeLogoUrl.trim(),
        contact_phone: storePhone.trim(),
        is_active: storeActive,
      });

      const wasNew = !store;
      setStore(res.store);
      setUsage(res.usage);
      syncStoreForm(res.store);
      showToast(wasNew ? 'Store created successfully!' : 'Store settings saved.', 'success');

      if (wasNew && res.store) {
        const [prodList, ordList] = await Promise.all([
          getStoreProducts().catch(() => [] as StoreProduct[]),
          getStoreOrders().catch(() => [] as StoreOrder[]),
        ]);
        setProducts(prodList);
        setOrders(ordList);
      }
    } catch (err: any) {
      if (err?.status === 409) {
        const msg = err?.message || 'That store slug is already taken. Try another one.';
        setSlugError(msg);
        showToast(msg, 'error');
      } else {
        notifyApiOrPlanError(err, 'Could not save store details.', showToast, () =>
          onViewChange('pricing')
        );
      }
    } finally {
      setIsSavingStore(false);
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdPrice('');
    setProdDescription('');
    setProdImageUrl('');
    setProdStock('');
    setProdDeliveryLink('');
    setProdDeliveryNote('');
    setProdFormError(null);
    setProdActive(true);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (p: StoreProduct) => {
    setEditingProduct(p);
    setProdName(p.name || '');
    setProdPrice(String(p.price ?? ''));
    setProdDescription(p.description || '');
    setProdImageUrl(p.image_url || '');
    setProdStock(p.stock === null || p.stock === undefined ? '' : String(p.stock));
    setProdDeliveryLink(p.delivery_link || '');
    setProdDeliveryNote(p.delivery_note || '');
    setProdFormError(null);
    setProdActive(p.is_active !== false);
    setIsProductModalOpen(true);
  };

  const handleCopyText = (text: string, key: string, label = 'Copied to clipboard.') => {
    if (!text) return;
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopiedDeliveryKey(key);
        showToast(label, 'success');
        setTimeout(() => setCopiedDeliveryKey((prev) => (prev === key ? null : prev)), 1600);
      })
      .catch(() => showToast('Could not copy text.', 'error'));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdFormError(null);
    const trimmedName = prodName.trim();
    const numericPrice = Number(prodPrice);

    if (!trimmedName || isNaN(numericPrice) || numericPrice <= 0) {
      const msg = 'Enter a valid product name and price.';
      setProdFormError(msg);
      showToast(msg, 'error');
      return;
    }

    const stockTrimmed = prodStock.trim();
    let parsedStock: number | null = null;
    if (stockTrimmed !== '') {
      const s = Number(stockTrimmed);
      if (!Number.isInteger(s) || s < 0) {
        const msg = 'Stock must be 0 or a positive whole number (leave empty for unlimited).';
        setProdFormError(msg);
        showToast(msg, 'error');
        return;
      }
      parsedStock = s;
    }

    const trimmedDeliveryLink = prodDeliveryLink.trim();
    const trimmedDeliveryNote = prodDeliveryNote.trim();

    setIsSavingProduct(true);
    try {
      const payload = {
        name: trimmedName,
        price: numericPrice,
        description: prodDescription.trim() || undefined,
        image_url: prodImageUrl.trim() || undefined,
        stock: parsedStock,
        delivery_link: trimmedDeliveryLink
          ? trimmedDeliveryLink
          : editingProduct
            ? null
            : undefined,
        delivery_note: trimmedDeliveryNote
          ? trimmedDeliveryNote
          : editingProduct
            ? null
            : undefined,
        is_active: prodActive,
      };

      if (editingProduct) {
        await updateStoreProduct(editingProduct.id, payload);
        showToast('Product updated.', 'success');
      } else {
        await createStoreProduct(payload);
        showToast('Product added to your store.', 'success');
      }

      setIsProductModalOpen(false);
      await loadAll(true);
    } catch (err: any) {
      if (err?.status === 400) {
        const msg = err?.message || 'Invalid product details. Please check the delivery link.';
        setProdFormError(msg);
        showToast(msg, 'error');
      } else {
        notifyApiOrPlanError(err, 'Failed to save product.', showToast, () => {
          setIsProductModalOpen(false);
          onViewChange('pricing');
        });
      }
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleToggleProductActive = async (product: StoreProduct) => {
    setTogglingProductId(product.id);
    try {
      const nextActive = !product.is_active;
      const updated = await updateStoreProduct(product.id, { is_active: nextActive });
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, ...updated, is_active: nextActive } : item
        )
      );
      showToast(
        `${product.name} ${nextActive ? 'is now visible in store' : 'hidden from store'}.`,
        'info'
      );
    } catch (err: any) {
      notifyApiOrPlanError(err, 'Could not update product status.', showToast, () =>
        onViewChange('pricing')
      );
    } finally {
      setTogglingProductId(null);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!confirmDeleteProduct) return;
    setDeletingProductId(confirmDeleteProduct.id);
    try {
      await deleteStoreProduct(confirmDeleteProduct.id);
      setProducts((prev) => prev.filter((p) => p.id !== confirmDeleteProduct.id));
      setConfirmDeleteProduct(null);
      showToast('Product removed from store.', 'success');
      await loadAll(true);
    } catch (err: any) {
      notifyApiOrPlanError(err, 'Could not delete product.', showToast, () =>
        onViewChange('pricing')
      );
    } finally {
      setDeletingProductId(null);
    }
  };

  const openOrderDrawer = (order: StoreOrder) => {
    setSelectedOrder(order);
    setDrawerFulfilment(order.fulfilment || 'new');
    setDrawerNote(order.note || '');
  };

  const handleQuickFulfilmentChange = async (
    order: StoreOrder,
    nextFulfilment: StoreFulfilmentStatus
  ) => {
    setUpdatingOrderCode(order.order_code);
    try {
      const updated = await updateStoreOrder(order.order_code, {
        fulfilment: nextFulfilment,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.order_code === order.order_code
            ? { ...o, ...updated, fulfilment: nextFulfilment }
            : o
        )
      );
      if (selectedOrder?.order_code === order.order_code) {
        setSelectedOrder((prev) => (prev ? { ...prev, fulfilment: nextFulfilment } : null));
        setDrawerFulfilment(nextFulfilment);
      }
      showToast(`Order ${order.order_code} marked as ${nextFulfilment}.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not update order fulfilment.', 'error');
    } finally {
      setUpdatingOrderCode(null);
    }
  };

  const handleSaveOrderDrawer = async () => {
    if (!selectedOrder) return;
    setIsSavingOrder(true);
    try {
      const updated = await updateStoreOrder(selectedOrder.order_code, {
        fulfilment: drawerFulfilment,
        note: drawerNote.trim() || undefined,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.order_code === selectedOrder.order_code
            ? { ...o, ...updated, fulfilment: drawerFulfilment, note: drawerNote.trim() }
            : o
        )
      );
      setSelectedOrder((prev) =>
        prev ? { ...prev, fulfilment: drawerFulfilment, note: drawerNote.trim() } : null
      );
      showToast(`Order ${selectedOrder.order_code} updated.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update order.', 'error');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    !productSearch.trim()
      ? true
      : p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orders.filter((o) =>
    orderStatusFilter === 'all' ? true : o.status === orderStatusFilter
  );

  const paidOrdersCount = orders.filter((o) => o.status === 'paid').length;
  const totalStoreRevenue = orders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const productsUsedCount = Math.max(usage.products_used, products.length);
  const productsLimit = usage.products_limit;
  const maxAmountLimit = planState?.plan?.max_amount ?? null;

  if (isLoading) {
    return (
      <div className="page-content space-y-6 animate-pulse">
        <div className="h-14 w-64 rounded-2xl bg-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="h-28 rounded-2xl bg-white/5" />
        </div>
        <div className="h-72 rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-content py-16 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 grid place-items-center text-rose-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Unable to Load Online Store</h2>
          <p className="text-xs text-[#b89fa5] mt-1 max-w-sm">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={() => loadAll(false)}
          className="btn-primary px-5 py-2.5 text-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="page-content animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both] space-y-6 pb-14">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-[46px] h-[46px] rounded-[13px] bg-gradient-to-br from-[#ff1e4b] to-[#b8002c] grid place-items-center text-white shrink-0 shadow-[0_0_22px_rgba(255,30,75,0.45)]">
            <Store className="w-[22px] h-[22px]" />
          </div>
          <div>
            <h1 className="text-[22px] font-black tracking-[-0.6px] text-white">
              {store ? store.name : 'Online Store'}
            </h1>
            <p className="text-[13px] text-[#b89fa5] font-medium mt-0.5">
              {store
                ? 'Manage products, orders, and your public storefront checkout'
                : 'Launch your mobile-first storefront with direct UPI payments'}
            </p>
          </div>
        </div>

        {store && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onViewChange('store-customize')}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-[11px] bg-white/5 hover:bg-white/10 border border-white/12 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              <Palette className="w-3.5 h-3.5 text-[#a78bfa]" />
              <span>Customize design</span>
            </button>
            <button
              type="button"
              onClick={openAddProductModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-extrabold shadow-[0_8px_24px_rgba(255,30,75,0.35)] hover:brightness-110 active:scale-95 transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>

      {/* No Cashier Warning Banner */}
      {!activeCashier && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/10 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/35 grid place-items-center text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">
                Connect FamPay / Amazon Pay / Paytm to accept store payments
              </div>
              <p className="text-[11.5px] text-amber-200/80 mt-0.5">
                Customers cannot complete checkout until an active UPI cashier account is connected.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenNoCashierModal ? onOpenNoCashierModal() : onViewChange('fampay')
            }
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#120306] text-xs font-black transition cursor-pointer shrink-0 whitespace-nowrap"
          >
            Connect Payment Account
          </button>
        </div>
      )}

      {/* INITIAL CREATE STORE SCREEN */}
      {!store ? (
        <div className="max-w-2xl mx-auto rounded-2xl bg-gradient-to-br from-[rgba(28,7,12,0.88)] to-[rgba(12,2,6,0.96)] border border-[rgba(255,45,85,0.22)] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1.5 border-b border-[rgba(255,45,85,0.14)] pb-4">
            <h2 className="text-lg font-black text-white">Create your store</h2>
            <p className="text-xs text-[#b89fa5]">
              Set up your store link, catalog identity, and support contact. You can edit these anytime.
            </p>
          </div>

          <form onSubmit={handleSaveStore} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                  Store Name <span className="text-[#ff1e4b]">*</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStoreName(val);
                    if (!slugTouched) {
                      setStoreSlug(toSlug(val));
                      setSlugError(null);
                    }
                  }}
                  placeholder="e.g. Apex Digital Shop"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-semibold focus:border-[#ff1e4b] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                  Store URL Slug
                </label>
                <div className="relative flex items-center">
                  <span className="pl-3 pr-1 text-[11px] font-mono text-[#83686e] select-none">
                    /store/
                  </span>
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlugError(null);
                      setStoreSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                      );
                    }}
                    placeholder="my-shop"
                    maxLength={40}
                    className={`w-full pr-3 py-2.5 rounded-xl bg-black/60 border text-white text-xs font-mono focus:outline-none ${
                      slugError
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-[rgba(255,45,85,0.2)] focus:border-[#ff1e4b]'
                    }`}
                  />
                </div>
                {slugError ? (
                  <p className="text-[11px] font-bold text-rose-400">{slugError}</p>
                ) : (
                  <p className="text-[10.5px] text-[#83686e]">
                    3–40 chars: lowercase letters, numbers, dashes
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                Description
              </label>
              <textarea
                rows={2}
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                placeholder="Short summary of what you sell..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-medium focus:border-[#ff1e4b] focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                  Logo Image URL (HTTPS)
                </label>
                <input
                  type="url"
                  value={storeLogoUrl}
                  onChange={(e) => setStoreLogoUrl(e.target.value)}
                  placeholder="https://.../logo.png"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-mono focus:border-[#ff1e4b] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-semibold focus:border-[#ff1e4b] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingStore}
                className="px-6 py-3 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-black shadow-[0_8px_24px_rgba(255,30,75,0.35)] hover:brightness-110 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingStore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Store className="w-4 h-4" />
                )}
                <span>{isSavingStore ? 'Creating Store...' : 'Create Store'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Store Public URL + Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 p-5 rounded-2xl bg-gradient-to-br from-[rgba(28,7,12,0.85)] to-[rgba(14,3,7,0.96)] border border-[rgba(255,45,85,0.2)] flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-white/10 bg-black/40 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-[rgba(255,30,75,0.16)] border border-[rgba(255,45,85,0.35)] grid place-items-center text-[#ff4d6d] font-black text-base shrink-0">
                      {(store.name[0] || 'S').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white truncate">
                        {store.name}
                      </span>
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${
                          store.is_active
                            ? 'bg-emerald-500/12 border-emerald-500/25 text-[#2bf29a]'
                            : 'bg-white/10 border-white/15 text-[#b89fa5]'
                        }`}
                      >
                        {store.is_active ? 'Live' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-xs text-[#b89fa5] truncate mt-0.5">
                      {store.description || 'Public storefront URL'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-xl bg-black/50 border border-[rgba(255,45,85,0.18)] text-xs font-mono text-[#e5d2d6] truncate select-all">
                  {publicStoreUrl}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedUrl ? (
                      <Check className="w-3.5 h-3.5 text-[#2bf29a]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#d4c2c7]" />
                    )}
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={localStorePath || publicStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#5b8dff]" />
                    <span>Open</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white grid place-items-center cursor-pointer"
                    title="View Store QR Code"
                    aria-label="View Store QR Code"
                  >
                    <QrCode className="w-4 h-4 text-[#ff4d6d]" />
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-[rgba(28,7,12,0.85)] to-[rgba(14,3,7,0.96)] border border-[rgba(255,45,85,0.18)] flex flex-col justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#83686e]">
                Products Used
              </div>
              <div className="text-2xl font-black text-white tabular-nums mt-2">
                {productsUsedCount}{' '}
                <span className="text-sm font-bold text-[#b89fa5]">
                  / {productsLimit === null ? 'Unlimited' : productsLimit}
                </span>
              </div>
              <div className="text-[11px] text-[#b89fa5] mt-1">
                {productsLimit === null
                  ? 'Unlimited catalog slots'
                  : `${Math.max(0, productsLimit - productsUsedCount)} slots remaining`}
              </div>
            </div>

            <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-[rgba(28,7,12,0.85)] to-[rgba(14,3,7,0.96)] border border-[rgba(255,45,85,0.18)] flex flex-col justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#83686e]">
                Paid Orders
              </div>
              <div className="text-2xl font-black text-[#2bf29a] tabular-nums mt-2">
                {paidOrdersCount}
              </div>
              <div className="text-[11px] text-[#b89fa5] mt-1 tabular-nums">
                {orders.length} total checkouts
              </div>
            </div>

            <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-[rgba(28,7,12,0.85)] to-[rgba(14,3,7,0.96)] border border-[rgba(255,45,85,0.18)] flex flex-col justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#83686e]">
                Store Revenue
              </div>
              <div className="text-2xl font-black text-white tabular-nums mt-2">
                {formatCurrency(totalStoreRevenue)}
              </div>
              <div className="text-[11px] text-[#b89fa5] mt-1">Direct UPI settled</div>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/45 border border-[rgba(255,45,85,0.18)] w-fit max-w-full overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'products'
                  ? 'bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white shadow-md shadow-rose-600/30'
                  : 'text-[#b89fa5] hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Products ({products.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white shadow-md shadow-rose-600/30'
                  : 'text-[#b89fa5] hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Orders ({orders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                syncStoreForm(store);
                setSlugError(null);
                setActiveTab('settings');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white shadow-md shadow-rose-600/30'
                  : 'text-[#b89fa5] hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Store Settings</span>
            </button>
          </div>

          {/* TAB 1: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[rgba(20,5,10,0.85)] border border-[rgba(255,45,85,0.18)]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#83686e] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/50 border border-[rgba(255,45,85,0.18)] text-white text-xs font-semibold outline-none focus:border-[#ff4d6d]"
                  />
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-bold text-[#d4c2c7]">
                  <span className="tabular-nums">
                    {productsUsedCount} /{' '}
                    {productsLimit === null ? 'Unlimited' : productsLimit} products
                  </span>
                  <button
                    type="button"
                    onClick={openAddProductModal}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#ff4d6d]" />
                    <span>New Product</span>
                  </button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl bg-[rgba(18,4,8,0.85)] border border-[rgba(255,45,85,0.18)] py-14 px-6 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[rgba(255,30,75,0.12)] border border-[rgba(255,45,85,0.28)] grid place-items-center text-[#ff4d6d]">
                    <Package className="w-7 h-7" />
                  </div>
                  <div className="text-sm font-black text-white">
                    {products.length === 0 ? 'No products in your store yet' : 'No matching products'}
                  </div>
                  <p className="text-xs text-[#b89fa5] max-w-sm mx-auto">
                    Add products with prices and optional stock counts to start accepting orders on your store link.
                  </p>
                  {products.length === 0 && (
                    <button
                      type="button"
                      onClick={openAddProductModal}
                      className="btn-primary px-5 py-2.5 text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Product</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => {
                    const isUnlimitedStock = product.stock === null || product.stock === undefined;
                    const outOfStock = !isUnlimitedStock && Number(product.stock) <= 0;
                    const isToggling = togglingProductId === product.id;

                    return (
                      <article
                        key={product.id}
                        className={`rounded-2xl bg-gradient-to-br from-[rgba(24,6,10,0.9)] to-[rgba(12,2,6,0.97)] border border-[rgba(255,45,85,0.18)] overflow-hidden flex flex-col transition ${
                          !product.is_active ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="aspect-[4/3] w-full bg-black/50 relative overflow-hidden border-b border-[rgba(255,45,85,0.12)]">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1f060c] to-[#0d0205] text-[#83686e]">
                              <ImageIcon className="w-8 h-8 opacity-60" />
                              <span className="text-[11px] font-semibold">No image</span>
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-black text-white truncate">
                                {product.name}
                              </h3>
                              {product.delivery_link && product.delivery_link.trim() && (
                                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-200">
                                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                                  <span>Digital / Instant delivery</span>
                                </span>
                              )}
                              {product.description && (
                                <p className="text-xs text-[#b89fa5] line-clamp-2 mt-1">
                                  {product.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                                product.is_active
                                  ? 'bg-emerald-500/12 border-emerald-500/25 text-[#2bf29a]'
                                  : 'bg-white/10 border-white/15 text-[#b89fa5]'
                              }`}
                            >
                              {product.is_active ? 'Active' : 'Hidden'}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between gap-2 mt-auto pt-1">
                            <span className="text-lg font-black font-mono tabular-nums text-[#5b8dff]">
                              {formatCurrency(product.price)}
                            </span>
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                outOfStock ? 'text-rose-400' : 'text-[#b89fa5]'
                              }`}
                            >
                              {isUnlimitedStock
                                ? 'Unlimited stock'
                                : outOfStock
                                  ? 'Out of stock'
                                  : `${product.stock} in stock`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleProductActive(product)}
                              className="flex items-center gap-2 text-xs font-bold text-[#d4c2c7] hover:text-white cursor-pointer disabled:opacity-50"
                            >
                              <div
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                                  product.is_active ? 'bg-emerald-500' : 'bg-white/15'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    product.is_active ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </div>
                              <span>{product.is_active ? 'Enabled' : 'Disabled'}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditProductModal(product)}
                                className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#5b8dff]" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteProduct(product)}
                                className="h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 grid place-items-center cursor-pointer"
                                aria-label={`Delete ${product.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[rgba(20,5,10,0.85)] border border-[rgba(255,45,85,0.18)]">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {(['all', 'paid', 'pending', 'expired', 'cancelled'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer whitespace-nowrap shrink-0 ${
                          orderStatusFilter === st
                            ? 'bg-[rgba(255,30,75,0.22)] text-white border border-[rgba(255,60,95,0.5)]'
                            : 'bg-white/5 text-[#b89fa5] hover:text-white border border-white/5'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => refreshOrdersOnly(false)}
                  disabled={isRefreshingOrders}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshingOrders ? 'animate-spin' : ''}`}
                  />
                  <span>Refresh Orders</span>
                </button>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl bg-[rgba(18,4,8,0.85)] border border-[rgba(255,45,85,0.18)] py-14 px-6 text-center space-y-2">
                  <ShoppingBag className="w-10 h-10 text-[#ff4d6d]/50 mx-auto" />
                  <div className="text-sm font-black text-white">No store orders found</div>
                  <p className="text-xs text-[#b89fa5]">
                    Share your store URL or QR code with customers to receive orders.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-[rgba(24,6,10,0.9)] to-[rgba(12,2,6,0.96)] border border-[rgba(255,45,85,0.18)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10.5px] font-extrabold uppercase tracking-wider text-[#83686e]">
                          <th className="py-3.5 px-4">Order Code</th>
                          <th className="py-3.5 px-4">Customer</th>
                          <th className="py-3.5 px-4">Items</th>
                          <th className="py-3.5 px-4 text-right">Total</th>
                          <th className="py-3.5 px-4">Payment</th>
                          <th className="py-3.5 px-4">Fulfilment</th>
                          <th className="py-3.5 px-4 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {filteredOrders.map((order) => {
                          const meta =
                            ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;
                          const itemCount = (order.items || []).reduce(
                            (acc, it) => acc + Number(it.qty || 1),
                            0
                          );
                          return (
                            <tr
                              key={order.order_code}
                              onClick={() => openOrderDrawer(order)}
                              className="hover:bg-white/[0.04] cursor-pointer transition-colors"
                            >
                              <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                                {order.order_code}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white">
                                  {order.customer_name || 'Customer'}
                                </div>
                                <div className="text-[11px] text-[#b89fa5] font-mono tabular-nums">
                                  {order.customer_phone}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-[#d4c2c7] tabular-nums">
                                {itemCount} item{itemCount === 1 ? '' : 's'}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black tabular-nums text-white whitespace-nowrap">
                                {formatCurrency(order.total)}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-bold ${meta.className}`}
                                >
                                  {meta.label}
                                </span>
                              </td>
                              <td
                                className="py-3.5 px-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {order.status === 'paid' ? (
                                  <select
                                    value={order.fulfilment || 'new'}
                                    disabled={updatingOrderCode === order.order_code}
                                    onChange={(e) =>
                                      handleQuickFulfilmentChange(
                                        order,
                                        e.target.value as StoreFulfilmentStatus
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs font-bold text-white outline-none focus:border-[#ff4d6d] cursor-pointer disabled:opacity-50"
                                  >
                                    {FULFILMENT_OPTIONS.map((opt) => (
                                      <option
                                        key={opt.value}
                                        value={opt.value}
                                        className="bg-[#120306]"
                                      >
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-[#83686e] capitalize">
                                    {order.fulfilment || '—'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right text-[11px] text-[#b89fa5] whitespace-nowrap tabular-nums">
                                {formatDateTime(order.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <form
              onSubmit={handleSaveStore}
              className="max-w-3xl rounded-2xl bg-gradient-to-br from-[rgba(24,6,10,0.9)] to-[rgba(12,2,6,0.96)] border border-[rgba(255,45,85,0.2)] p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-base font-black text-white">Storefront Details</h2>
                  <p className="text-xs text-[#b89fa5] mt-0.5">
                    Update your store name, URL slug, logo, and availability.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStoreActive(!storeActive)}
                  className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer"
                >
                  <div
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                      storeActive ? 'bg-emerald-500' : 'bg-white/15'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                        storeActive ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <span>{storeActive ? 'Store Active' : 'Store Paused'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Store Name <span className="text-[#ff1e4b]">*</span>
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-semibold focus:border-[#ff1e4b] focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => {
                      setSlugError(null);
                      setStoreSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                      );
                    }}
                    maxLength={40}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-black/60 border text-white text-xs font-mono focus:outline-none ${
                      slugError
                        ? 'border-rose-500'
                        : 'border-[rgba(255,45,85,0.2)] focus:border-[#ff1e4b]'
                    }`}
                  />
                  {slugError && (
                    <p className="text-[11px] font-bold text-rose-400">{slugError}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  placeholder="Describe your products or delivery terms..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-medium focus:border-[#ff1e4b] focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Logo URL (HTTPS)
                  </label>
                  <input
                    type="url"
                    value={storeLogoUrl}
                    onChange={(e) => setStoreLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-mono focus:border-[#ff1e4b] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-semibold focus:border-[#ff1e4b] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingStore}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-black shadow-lg shadow-rose-600/30 hover:brightness-110 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingStore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingStore ? 'Saving...' : 'Save Store Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && store && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040102]/85 backdrop-blur-md"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-[rgba(26,6,12,0.98)] to-[rgba(12,2,6,0.99)] border border-[rgba(255,45,85,0.28)] p-6 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">{store.name} QR Code</h3>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 grid place-items-center text-[#b89fa5] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              ref={qrCanvasRef}
              className="mx-auto w-fit p-4 rounded-2xl bg-white shadow-inner"
            >
              <QRCodeCanvas value={publicStoreUrl} size={200} level="M" />
            </div>

            <p className="text-xs font-mono text-[#d4c2c7] break-all">{publicStoreUrl}</p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-xs font-black text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040102]/85 backdrop-blur-md"
          onClick={() => setIsProductModalOpen(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-[22px] bg-gradient-to-br from-[rgba(26,6,12,0.98)] to-[rgba(12,2,6,0.99)] border border-[rgba(255,45,85,0.25)] shadow-2xl overflow-hidden text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,45,85,0.16)]">
              <h3 className="text-base font-black text-white">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 grid place-items-center text-[#b89fa5] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {prodFormError && (
                <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/35 text-xs font-semibold text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{prodFormError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                  Product Name <span className="text-[#ff1e4b]">*</span>
                </label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Premium UI Kit"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-semibold focus:border-[#ff1e4b] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Price (₹) <span className="text-[#ff1e4b]">*</span>
                    </label>
                    {maxAmountLimit !== null && (
                      <span className="text-[10px] text-[#83686e] font-bold">
                        Max ₹{maxAmountLimit.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="199"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-mono font-bold focus:border-[#ff1e4b] focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Stock (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="Empty = unlimited"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-mono focus:border-[#ff1e4b] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  placeholder="https://.../product.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-mono focus:border-[#ff1e4b] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="Key details about this product..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-medium focus:border-[#ff1e4b] focus:outline-none resize-none"
                />
              </div>

              {/* Digital Delivery Link & Note */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-violet-500/25 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-200">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instant Digital Delivery (Optional)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#d4c2c7]">
                    Delivery link (customer gets it after payment)
                  </label>
                  <input
                    type="url"
                    value={prodDeliveryLink}
                    onChange={(e) => {
                      setProdDeliveryLink(e.target.value);
                      if (prodFormError) setProdFormError(null);
                    }}
                    placeholder="https://drive.google.com/... or https://t.me/+..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-mono focus:border-[#ff1e4b] focus:outline-none"
                  />
                  <p className="text-[10.5px] text-[#9b7e85] leading-relaxed">
                    Customers only see this after a successful payment. Use a link that only you control (e.g. &apos;anyone with the link&apos; Drive file / private Telegram channel invite)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-[#d4c2c7]">
                      Delivery note (optional)
                    </label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {prodDeliveryNote.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={prodDeliveryNote}
                    onChange={(e) => setProdDeliveryNote(e.target.value)}
                    placeholder="Password, license key, or access instructions..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-[rgba(255,45,85,0.2)] text-white text-xs font-medium focus:border-[#ff1e4b] focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setProdActive(!prodActive)}
                  className="flex items-center gap-2 text-xs font-bold text-[#d4c2c7] cursor-pointer"
                >
                  <div
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      prodActive ? 'bg-emerald-500' : 'bg-white/15'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        prodActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <span>Visible in store</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="px-5 py-2 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-xs font-black text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProduct && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingProduct ? 'Save Product' : 'Add Product'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirm Modal */}
      {confirmDeleteProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040102]/85 backdrop-blur-md"
          onClick={() => setConfirmDeleteProduct(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#160409] border border-rose-500/35 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-white">Delete product?</h3>
            <p className="text-xs text-[#d4c2c7] leading-relaxed">
              Remove <strong className="text-white">{confirmDeleteProduct.name}</strong> from your store catalog? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(deletingProductId)}
                onClick={() => setConfirmDeleteProduct(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingProductId)}
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 rounded-xl bg-[#ff1e4b] text-xs font-black text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingProductId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-md h-full bg-[#120306] border-l border-[rgba(255,45,85,0.22)] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#83686e]">
                  Order Details
                </div>
                <div className="text-sm font-mono font-black text-white mt-0.5">
                  {selectedOrder.order_code}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 grid place-items-center text-[#b89fa5] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/50 border border-white/10">
                <div className="flex items-center gap-2">
                  {selectedOrder.status === 'paid' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2bf29a]" />
                  ) : selectedOrder.status === 'pending' ? (
                    <Clock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="font-bold text-white capitalize">
                    Payment {selectedOrder.status}
                  </span>
                </div>
                <span className="text-[11px] text-[#b89fa5] tabular-nums">
                  {selectedOrder.paid_at
                    ? `Paid ${formatDateTime(selectedOrder.paid_at)}`
                    : formatDateTime(selectedOrder.created_at)}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-2.5 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#83686e]">
                  Customer
                </div>
                <div className="font-black text-sm text-white">
                  {selectedOrder.customer_name}
                </div>
                <div className="flex items-center gap-2 text-[#d4c2c7] font-mono">
                  <Phone className="w-3.5 h-3.5 text-[#83686e]" />
                  <span>{selectedOrder.customer_phone}</span>
                </div>
                {selectedOrder.customer_email && (
                  <div className="flex items-center gap-2 text-[#d4c2c7]">
                    <Mail className="w-3.5 h-3.5 text-[#83686e]" />
                    <span>{selectedOrder.customer_email}</span>
                  </div>
                )}
                {selectedOrder.address && (
                  <div className="flex items-start gap-2 text-[#d4c2c7]">
                    <MapPin className="w-3.5 h-3.5 text-[#83686e] shrink-0 mt-0.5" />
                    <span>{selectedOrder.address}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2.5 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#83686e]">
                  Items
                </div>
                <div className="divide-y divide-white/5">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="py-2 flex items-center justify-between gap-2"
                    >
                      <div className="text-white font-semibold">
                        {item.name}{' '}
                        <span className="text-[#83686e] font-mono">× {item.qty}</span>
                      </div>
                      <div className="font-mono font-bold text-[#d4c2c7] tabular-nums">
                        {formatCurrency(Number(item.price) * Number(item.qty || 1))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between font-black text-sm text-white">
                  <span>Total</span>
                  <span className="font-mono tabular-nums text-[#2bf29a]">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
              </div>

              {/* Digital Deliveries (paid orders) */}
              {selectedOrder.status === 'paid' &&
                selectedOrder.deliveries &&
                selectedOrder.deliveries.length > 0 && (
                  <div className="space-y-3 p-4 rounded-xl bg-violet-500/[0.07] border border-violet-500/25">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-violet-200">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Delivered Digital Links</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#2bf29a]">
                        Unlocked on payment
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {selectedOrder.deliveries.map((del, idx) => {
                        const safeLink =
                          /^https?:\/\//i.test(del.link || '') ? del.link : '';
                        const linkKey = `link-${idx}`;
                        const noteKey = `note-${idx}`;
                        return (
                          <div
                            key={`${del.product_id || del.name}-${idx}`}
                            className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2"
                          >
                            <div className="font-bold text-white text-xs">
                              {del.name}
                            </div>

                            {del.link && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-[#e5d2d6] truncate select-all flex items-center gap-1.5">
                                  <Link2 className="w-3 h-3 text-violet-300 shrink-0" />
                                  <span className="truncate">{del.link}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyText(del.link, linkKey, 'Delivery link copied.')
                                  }
                                  className="h-7 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  {copiedDeliveryKey === linkKey ? (
                                    <Check className="w-3 h-3 text-[#2bf29a]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>
                                    {copiedDeliveryKey === linkKey ? 'Copied' : 'Copy'}
                                  </span>
                                </button>
                                {safeLink && (
                                  <a
                                    href={safeLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/15 text-white grid place-items-center shrink-0"
                                    title="Open delivery link"
                                  >
                                    <ExternalLink className="w-3 h-3 text-[#5b8dff]" />
                                  </a>
                                )}
                              </div>
                            )}

                            {del.note && (
                              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10 flex items-start justify-between gap-2">
                                <p className="text-[11px] text-[#d4c2c7] whitespace-pre-line select-all flex-1">
                                  {del.note}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyText(del.note || '', noteKey, 'Delivery note copied.')
                                  }
                                  className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  {copiedDeliveryKey === noteKey ? (
                                    <Check className="w-2.5 h-2.5 text-[#2bf29a]" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                  <span>
                                    {copiedDeliveryKey === noteKey ? 'Copied' : 'Copy'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Fulfilment update for paid orders */}
              {selectedOrder.status === 'paid' && (
                <div className="space-y-3 p-4 rounded-xl bg-black/40 border border-[rgba(255,45,85,0.2)]">
                  <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#83686e]">
                    Fulfilment &amp; Note
                  </div>
                  <select
                    value={drawerFulfilment}
                    onChange={(e) =>
                      setDrawerFulfilment(e.target.value as StoreFulfilmentStatus)
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-bold text-white outline-none focus:border-[#ff4d6d]"
                  >
                    {FULFILMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#120306]">
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <textarea
                    rows={2}
                    value={drawerNote}
                    onChange={(e) => setDrawerNote(e.target.value)}
                    placeholder="Optional tracking ID or fulfilment note..."
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white focus:border-[#ff4d6d] focus:outline-none resize-none"
                  />

                  <button
                    type="button"
                    disabled={isSavingOrder}
                    onClick={handleSaveOrderDrawer}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-xs font-black text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingOrder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update Order</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
