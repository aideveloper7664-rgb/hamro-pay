import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  X,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sun,
  Moon,
  ArrowLeft,
  ExternalLink,
  Search,
  Package,
  History,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  checkoutPublicStore,
  getPublicStore,
  getPublicStoreOrder,
} from '../../services/store.service';
import {
  PublicStoreData,
  PublicStoreOrderStatus,
  PublicStoreProduct,
} from '../../types';

interface PublicStorePageProps {
  slug: string;
}

interface CartItem {
  product: PublicStoreProduct;
  qty: number;
}

interface SavedOrderEntry {
  order_code: string;
  total?: number;
  created_at: string;
}

const RECENT_ORDERS_KEY = (slug: string) => `hp_store_orders_${slug}`;
const THEME_PREF_KEY = 'hp_public_store_theme';

const formatINR = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const sanitizeCustomerError = (err: any, status?: number): string => {
  const code = String(err?.code || err?.data?.code || '').toUpperCase();
  if (status === 429 || err?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  const rawMsg = String(err?.message || '').trim();
  const hasInternalWords = /\b(plan|credits?|hamro\s*cash|subscription|tier)\b/i.test(rawMsg);
  if (code === 'STORE_AMOUNT_LIMIT' || err?.status === 403) {
    return !hasInternalWords && rawMsg
      ? rawMsg
      : 'Order amount exceeds the allowed checkout limit for this store.';
  }
  if (err?.status === 409) {
    return !hasInternalWords && rawMsg
      ? rawMsg
      : 'Some items are out of stock or this store is temporarily unable to accept payments.';
  }
  if (!hasInternalWords && rawMsg) {
    return rawMsg;
  }
  return 'Unable to place order right now. Please try again shortly.';
};

const getQueryOrderCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('order');
  return code ? code.trim() : null;
};

const ProductThumbnail: React.FC<{
  src?: string | null;
  alt: string;
  isDark: boolean;
}> = ({ src, alt, isDark }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center gap-1.5 ${
          isDark
            ? 'bg-zinc-800/70 text-zinc-500'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        <Package className="w-8 h-8 stroke-[1.5]" />
        <span className="text-[11px] font-medium px-3 text-center truncate max-w-full">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
};

export const PublicStorePage: React.FC<PublicStorePageProps> = ({ slug }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(THEME_PREF_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {
      // Ignore
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  });

  const [storeData, setStoreData] = useState<PublicStoreData | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [orderCode, setOrderCode] = useState<string | null>(() => getQueryOrderCode());
  const [orderState, setOrderState] = useState<PublicStoreOrderStatus | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<SavedOrderEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RECENT_ORDERS_KEY(slug));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Customer checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const saveOrderToHistory = useCallback(
    (code: string, total?: number) => {
      if (!code || typeof window === 'undefined') return;
      try {
        const existingRaw = localStorage.getItem(RECENT_ORDERS_KEY(slug));
        const existing: SavedOrderEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
        const filtered = existing.filter((e) => e.order_code !== code);
        const next: SavedOrderEntry[] = [
          { order_code: code, total, created_at: new Date().toISOString() },
          ...filtered,
        ].slice(0, 10);
        localStorage.setItem(RECENT_ORDERS_KEY(slug), JSON.stringify(next));
        setRecentOrders(next);
      } catch {
        // Ignore storage errors
      }
    },
    [slug]
  );

  // Sync URL popstate for ?order=CODE
  useEffect(() => {
    const onPop = () => {
      setOrderCode(getQueryOrderCode());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Load storefront
  const fetchStore = useCallback(async () => {
    setIsLoadingStore(true);
    setNotFound(false);
    setStoreError(null);
    try {
      const data = await getPublicStore(slug);
      setStoreData(data);
      if (data?.store?.name) {
        document.title = data.store.name;
      }
    } catch (err: any) {
      if (err?.status === 404) {
        setNotFound(true);
        document.title = 'Store not found';
      } else {
        setStoreError(sanitizeCustomerError(err, err?.status));
      }
    } finally {
      setIsLoadingStore(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  // Save order code if URL starts with ?order=CODE
  useEffect(() => {
    if (orderCode) {
      saveOrderToHistory(orderCode);
    }
  }, [orderCode, saveOrderToHistory]);

  // Poll order status when ?order=CODE is active
  const fetchOrderStatus = useCallback(
    async (silent = false) => {
      if (!orderCode) return;
      if (!silent) {
        setIsLoadingOrder(true);
        setOrderError(null);
      }
      try {
        const res = await getPublicStoreOrder(slug, orderCode);
        setOrderState(res);
        saveOrderToHistory(orderCode, res.total);
      } catch (err: any) {
        if (!silent) {
          setOrderError(
            err?.status === 404
              ? 'Order not found.'
              : sanitizeCustomerError(err, err?.status)
          );
        }
      } finally {
        if (!silent) setIsLoadingOrder(false);
      }
    },
    [orderCode, slug, saveOrderToHistory]
  );

  useEffect(() => {
    if (!orderCode) {
      setOrderState(null);
      setOrderError(null);
      return;
    }
    fetchOrderStatus(false);
  }, [orderCode, fetchOrderStatus]);

  useEffect(() => {
    if (!orderCode || orderState?.status !== 'pending') return;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchOrderStatus(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [orderCode, orderState?.status, fetchOrderStatus]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_PREF_KEY, next ? 'dark' : 'light');
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const navigateToOrder = (code: string | null) => {
    const url = code
      ? `/store/${encodeURIComponent(slug)}?order=${encodeURIComponent(code)}`
      : `/store/${encodeURIComponent(slug)}`;
    window.history.pushState({}, '', url);
    setOrderCode(code);
    setIsRecentOrdersOpen(false);
  };

  const addToCart = (product: PublicStoreProduct) => {
    if (!product.in_stock || product.stock === 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const maxQty =
          product.stock !== null && product.stock !== undefined
            ? product.stock
            : Infinity;
        if (existing.qty >= maxQty) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const maxQty =
            item.product.stock !== null && item.product.stock !== undefined
              ? item.product.stock
              : Infinity;
          const nextQty = Math.min(maxQty, item.qty + delta);
          return nextQty <= 0 ? null : { ...item, qty: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) map.set(item.product.id, item.qty);
    return map;
  }, [cart]);

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.price) * item.qty, 0),
    [cart]
  );

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setCheckoutError('Please enter your full name.');
      return;
    }

    const digitsOnly = customerPhone.replace(/\D/g, '');
    const normalizedPhone =
      digitsOnly.length === 12 && digitsOnly.startsWith('91')
        ? digitsOnly.slice(2)
        : digitsOnly;

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setCheckoutError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsCheckingOut(true);
    try {
      const res = await checkoutPublicStore(slug, {
        items: cart.map((item) => ({
          product_id: item.product.id,
          qty: item.qty,
        })),
        customer: {
          name: trimmedName,
          phone: normalizedPhone,
          ...(customerEmail.trim() ? { email: customerEmail.trim() } : {}),
          ...(customerAddress.trim() ? { address: customerAddress.trim() } : {}),
          ...(customerNote.trim() ? { note: customerNote.trim() } : {}),
        },
      });

      if (res?.order_code) {
        saveOrderToHistory(res.order_code, res.total);
      }

      if (res?.payment_url) {
        window.location.href = res.payment_url;
      } else if (res?.order_code) {
        setIsCartOpen(false);
        navigateToOrder(res.order_code);
      } else {
        throw new Error('Checkout created without a payment link.');
      }
    } catch (err: any) {
      setCheckoutError(sanitizeCustomerError(err, err?.status));
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const list = storeData?.products || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [storeData?.products, searchQuery]);

  // Theme tokens (clean dual-theme contrast pairs)
  const theme = isDark
    ? {
        pageBg: 'bg-[#0b0b0e] text-zinc-100',
        headerBg: 'bg-[#0b0b0e]/90 border-zinc-800',
        surface: 'bg-[#141418] border-zinc-800',
        surfaceSubtle: 'bg-zinc-900/70 border-zinc-800',
        muted: 'text-zinc-400',
        input:
          'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500',
        secondaryBtn:
          'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700',
        divider: 'border-zinc-800',
      }
    : {
        pageBg: 'bg-[#f8fafc] text-slate-900',
        headerBg: 'bg-white/95 border-slate-200',
        surface: 'bg-white border-slate-200',
        surfaceSubtle: 'bg-slate-50 border-slate-200',
        muted: 'text-slate-500',
        input:
          'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-rose-600',
        secondaryBtn:
          'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200',
        divider: 'border-slate-200',
      };

  // 404 Store Not Found
  if (notFound) {
    return (
      <div
        className={`min-h-screen ${theme.pageBg} flex flex-col items-center justify-center p-6 text-center`}
      >
        <div
          className={`w-full max-w-md rounded-2xl border p-8 space-y-4 ${theme.surface}`}
        >
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 grid place-items-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Store not found</h1>
          <p className={`text-sm ${theme.muted}`}>
            The store link you opened does not exist or is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingStore) {
    return (
      <div className={`min-h-screen ${theme.pageBg} p-4 sm:p-8`}>
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className={`h-16 rounded-2xl border ${theme.surface}`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-80 rounded-2xl border ${theme.surface}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (storeError || !storeData) {
    return (
      <div
        className={`min-h-screen ${theme.pageBg} flex flex-col items-center justify-center p-6 text-center`}
      >
        <div
          className={`w-full max-w-md rounded-2xl border p-8 space-y-4 ${theme.surface}`}
        >
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold">Could not open store</h1>
          <p className={`text-sm ${theme.muted}`}>
            {storeError || 'Please try again in a few seconds.'}
          </p>
          <button
            type="button"
            onClick={fetchStore}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { store } = storeData;

  return (
    <div className={`min-h-screen ${theme.pageBg} flex flex-col transition-colors duration-200`}>
      {/* Store Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${theme.headerBg}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateToOrder(null)}
            className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
          >
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                referrerPolicy="no-referrer"
                className={`w-10 h-10 rounded-xl object-cover border shrink-0 ${theme.divider}`}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white font-bold text-base grid place-items-center shrink-0">
                {(store.name[0] || 'S').toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-base font-bold tracking-tight truncate">
                {store.name}
              </div>
              {store.merchant_name && (
                <div className={`text-xs truncate ${theme.muted}`}>
                  by {store.merchant_name}
                </div>
              )}
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {recentOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setIsRecentOrdersOpen(true)}
                className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${theme.secondaryBtn}`}
                title="View recent orders"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Orders ({recentOrders.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-xl border grid place-items-center cursor-pointer ${theme.secondaryBtn}`}
              aria-label="Toggle light or dark mode"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {!orderCode && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="h-10 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Cart</span>
                {cartItemCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-white text-rose-600 text-[11px] font-extrabold tabular-nums">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {orderCode ? (
          /* ORDER STATUS VIEW (?order=CODE) */
          <div className="max-w-xl mx-auto space-y-5">
            <button
              type="button"
              onClick={() => navigateToOrder(null)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${theme.muted} hover:text-rose-500`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {store.name}</span>
            </button>

            <div className={`rounded-2xl border p-6 space-y-5 ${theme.surface}`}>
              {isLoadingOrder && !orderState ? (
                <div className="py-10 flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <p className={`text-sm ${theme.muted}`}>
                    Loading order {orderCode}...
                  </p>
                </div>
              ) : orderError ? (
                <div className="py-6 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <h2 className="text-base font-bold">{orderError}</h2>
                  <button
                    type="button"
                    onClick={() => navigateToOrder(null)}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Return to Store
                  </button>
                </div>
              ) : orderState ? (
                <>
                  {orderState.status === 'paid' && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h1 className="text-base font-bold text-emerald-500">
                          Payment received ✓ order {orderCode}
                        </h1>
                        <p className={`text-xs mt-1 capitalize ${theme.muted}`}>
                          Fulfilment status: {orderState.fulfilment || 'new'}
                        </p>
                      </div>
                    </div>
                  )}

                  {orderState.status === 'pending' && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h1 className="text-base font-bold">
                            Payment pending · {orderCode}
                          </h1>
                          <p className={`text-xs mt-1 ${theme.muted}`}>
                            Complete your UPI payment to confirm this order. Checking status automatically...
                          </p>
                        </div>
                      </div>
                      {orderState.payment_url && (
                        <a
                          href={orderState.payment_url}
                          className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2"
                        >
                          <span>Complete payment</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {(orderState.status === 'expired' ||
                    orderState.status === 'cancelled') && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <h1 className="text-base font-bold capitalize">
                            Order {orderState.status} · {orderCode}
                          </h1>
                          <p className={`text-xs mt-1 ${theme.muted}`}>
                            This checkout session is no longer active. You can place a new order anytime.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToOrder(null)}
                        className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Retry Order in Store
                      </button>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className={`pt-4 border-t space-y-2.5 ${theme.divider}`}>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={theme.muted}>Order Code</span>
                      <span className="font-mono font-bold">{orderCode}</span>
                    </div>
                    {orderState.customer_name && (
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={theme.muted}>Customer</span>
                        <span>{orderState.customer_name}</span>
                      </div>
                    )}
                    <div className={`pt-2 border-t space-y-2 ${theme.divider}`}>
                      {(orderState.items || []).map((it, idx) => (
                        <div
                          key={`${it.name}-${idx}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>
                            {it.name}{' '}
                            <span className={`text-xs font-mono ${theme.muted}`}>
                              × {it.qty}
                            </span>
                          </span>
                          <span className="font-mono font-semibold tabular-nums">
                            {formatINR(Number(it.price) * Number(it.qty || 1))}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div
                      className={`pt-3 border-t flex items-center justify-between text-base font-bold ${theme.divider}`}
                    >
                      <span>Total</span>
                      <span className="font-mono tabular-nums">
                        {formatINR(orderState.total)}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          /* PUBLIC CATALOG GRID */
          <div className="space-y-6">
            {/* Store Intro & Search */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {store.name}
                </h1>
                {store.description && (
                  <p className={`text-sm leading-relaxed ${theme.muted}`}>
                    {store.description}
                  </p>
                )}
                {store.contact_phone && (
                  <a
                    href={`tel:${store.contact_phone}`}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold pt-1 hover:text-rose-500 ${theme.muted}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{store.contact_phone}</span>
                  </a>
                )}
              </div>

              {storeData.products.length > 0 && (
                <div className="relative w-full md:w-72">
                  <Search
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.muted}`}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition ${theme.input}`}
                  />
                </div>
              )}
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className={`rounded-2xl border py-16 px-6 text-center space-y-2 ${theme.surface}`}>
                <Package className={`w-10 h-10 mx-auto ${theme.muted}`} />
                <div className="text-base font-bold">
                  {storeData.products.length === 0
                    ? 'No products listed yet'
                    : 'No matching products'}
                </div>
                <p className={`text-sm ${theme.muted}`}>
                  {storeData.products.length === 0
                    ? 'Please check back soon.'
                    : 'Try clearing your search filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const qtyInCart = cartQtyMap.get(product.id) || 0;
                  const outOfStock = !product.in_stock || product.stock === 0;
                  const maxStock =
                    product.stock !== null && product.stock !== undefined
                      ? product.stock
                      : Infinity;

                  return (
                    <article
                      key={product.id}
                      className={`group rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 ${theme.surface}`}
                    >
                      <div
                        className={`aspect-[4/3] w-full overflow-hidden border-b ${theme.divider}`}
                      >
                        <ProductThumbnail
                          src={product.image_url}
                          alt={product.name}
                          isDark={isDark}
                        />
                      </div>

                      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="text-base font-semibold leading-snug">
                              {product.name}
                            </h2>
                            {outOfStock ? (
                              <span className="text-[11px] font-semibold text-rose-500 shrink-0">
                                Out of stock
                              </span>
                            ) : (
                              product.stock !== null &&
                              product.stock !== undefined && (
                                <span
                                  className={`text-[11px] font-medium shrink-0 tabular-nums ${theme.muted}`}
                                >
                                  {product.stock} left
                                </span>
                              )
                            )}
                          </div>
                          {product.description && (
                            <p className={`text-xs leading-relaxed line-clamp-2 ${theme.muted}`}>
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 mt-auto flex items-center justify-between gap-3">
                          <span className="text-lg font-bold font-mono tabular-nums">
                            {formatINR(product.price)}
                          </span>

                          {outOfStock ? (
                            <button
                              type="button"
                              disabled
                              className={`h-10 px-4 rounded-xl border text-xs font-semibold opacity-50 cursor-not-allowed ${theme.secondaryBtn}`}
                            >
                              Unavailable
                            </button>
                          ) : qtyInCart > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateCartQty(product.id, -1)}
                                className={`w-9 h-9 rounded-xl border grid place-items-center cursor-pointer ${theme.secondaryBtn}`}
                                aria-label={`Decrease quantity of ${product.name}`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-7 text-center text-sm font-bold tabular-nums">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                disabled={qtyInCart >= maxStock}
                                onClick={() => updateCartQty(product.id, 1)}
                                className={`w-9 h-9 rounded-xl border grid place-items-center cursor-pointer disabled:opacity-40 ${theme.secondaryBtn}`}
                                aria-label={`Increase quantity of ${product.name}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-5 px-4 text-center text-xs ${theme.divider} ${theme.muted}`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{store.name}</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Direct UPI Checkout</span>
          </span>
        </div>
      </footer>

      {/* Floating mobile view-cart bar (only when cart > 0 and drawer closed) */}
      {!orderCode && cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-30 sm:hidden">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full h-12 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-xl flex items-center justify-between text-sm font-bold cursor-pointer"
          >
            <span>
              {cartItemCount} item{cartItemCount === 1 ? '' : 's'} · {formatINR(cartTotal)}
            </span>
            <span>Checkout →</span>
          </button>
        </div>
      )}

      {/* CART & CHECKOUT DRAWER */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className={`w-full max-w-md h-full border-l flex flex-col shadow-2xl ${theme.surface}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${theme.divider}`}>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-rose-500" />
                <h2 className="text-base font-bold">Your Cart ({cartItemCount})</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className={`w-8 h-8 rounded-xl border grid place-items-center cursor-pointer ${theme.secondaryBtn}`}
                aria-label="Close cart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <ShoppingBag className={`w-10 h-10 mx-auto ${theme.muted}`} />
                  <p className="text-sm font-semibold">Your cart is empty</p>
                  <p className={`text-xs ${theme.muted}`}>
                    Add products from the store to continue to checkout.
                  </p>
                </div>
              ) : (
                <>
                  {/* Items list */}
                  <div className={`divide-y ${theme.divider}`}>
                    {cart.map(({ product, qty }) => {
                      const maxStock =
                        product.stock !== null && product.stock !== undefined
                          ? product.stock
                          : Infinity;
                      return (
                        <div
                          key={product.id}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">
                              {product.name}
                            </div>
                            <div className={`text-xs font-mono tabular-nums ${theme.muted}`}>
                              {formatINR(product.price)} × {qty} ={' '}
                              {formatINR(Number(product.price) * qty)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartQty(product.id, -1)}
                              className={`w-8 h-8 rounded-lg border grid place-items-center cursor-pointer ${theme.secondaryBtn}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              disabled={qty >= maxStock}
                              onClick={() => updateCartQty(product.id, 1)}
                              className={`w-8 h-8 rounded-lg border grid place-items-center cursor-pointer disabled:opacity-40 ${theme.secondaryBtn}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-500/10 grid place-items-center cursor-pointer"
                              aria-label={`Remove ${product.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Subtotal */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${theme.surfaceSubtle}`}
                  >
                    <span className="text-xs font-semibold">Estimated Total</span>
                    <span className="text-base font-bold font-mono tabular-nums">
                      {formatINR(cartTotal)}
                    </span>
                  </div>

                  {/* Customer Checkout Form */}
                  <form id="storeCheckoutForm" onSubmit={handleCheckout} className="space-y-3.5">
                    <div className="text-xs font-bold uppercase tracking-wider">
                      Customer Details
                    </div>

                    {checkoutError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-500 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your full name"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold">
                        10-Digit Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={13}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="9876543210"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none ${theme.input}`}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold">
                        Email <span className={`font-normal ${theme.muted}`}>(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold">
                        Delivery Address{' '}
                        <span className={`font-normal ${theme.muted}`}>(Optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="House no, street, city, pincode"
                        className={`w-full px-3.5 py-2 rounded-xl border text-sm outline-none resize-none ${theme.input}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold">
                        Order Note{' '}
                        <span className={`font-normal ${theme.muted}`}>(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        placeholder="Any special instructions..."
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>
                  </form>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className={`p-5 border-t ${theme.divider}`}>
                <button
                  type="submit"
                  form="storeCheckoutForm"
                  disabled={isCheckingOut}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition"
                >
                  {isCheckingOut && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isCheckingOut
                      ? 'Creating Checkout...'
                      : `Pay ${formatINR(cartTotal)}`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECENT ORDERS MODAL */}
      {isRecentOrdersOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsRecentOrdersOpen(false)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl ${theme.surface}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Your Recent Orders</h3>
              <button
                type="button"
                onClick={() => setIsRecentOrdersOpen(false)}
                className={`w-8 h-8 rounded-xl border grid place-items-center cursor-pointer ${theme.secondaryBtn}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recentOrders.map((entry) => (
                <button
                  key={entry.order_code}
                  type="button"
                  onClick={() => navigateToOrder(entry.order_code)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-left cursor-pointer hover:border-rose-500 transition ${theme.surfaceSubtle}`}
                >
                  <div>
                    <div className="text-xs font-mono font-bold">
                      {entry.order_code}
                    </div>
                    <div className={`text-[11px] ${theme.muted}`}>
                      {new Date(entry.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-rose-500">
                    {entry.total ? formatINR(entry.total) : 'Track →'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicStorePage;
