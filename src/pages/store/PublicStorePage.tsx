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
  ArrowLeft,
  ExternalLink,
  Search,
  Package,
  History,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Globe,
  MessageCircle,
  Send,
  Truck,
  RotateCcw,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import {
  checkoutPublicStore,
  getPublicStore,
  getPublicStoreOrder,
} from '../../services/store.service';
import {
  PublicStoreData,
  PublicStoreInfo,
  PublicStoreOrderStatus,
  PublicStoreProduct,
  StoreCustomization,
} from '../../types';
import {
  buildSocialHref,
  buildTelHref,
  DEFAULT_STORE_CUSTOMIZATION,
  getContrastTextColor,
  getStoreFontFamily,
  hexToRgba,
  isDarkColor,
  loadStoreGoogleFont,
  mergeStoreCustomization,
  sanitizeHttpUrl,
  sanitizeHttpsImageUrl,
} from '../../utils/storeTheme';

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

export interface StorefrontRendererProps {
  store: PublicStoreInfo;
  products: PublicStoreProduct[];
  customization?: Partial<StoreCustomization> | null;
  sortOptions?: string[];
  isPreview?: boolean;
  previewDevice?: 'mobile' | 'desktop';
  orderCode?: string | null;
  orderState?: PublicStoreOrderStatus | null;
  isLoadingOrder?: boolean;
  orderError?: string | null;
  recentOrders?: SavedOrderEntry[];
  onNavigateOrder?: (code: string | null) => void;
  onSubmitOrder?: (
    items: Array<{ product_id: string; qty: number }>,
    customer: {
      name: string;
      phone: string;
      email?: string;
      address?: string;
      note?: string;
    }
  ) => Promise<void>;
}

const RECENT_ORDERS_KEY = (slug: string) => `hp_store_orders_${slug}`;

const DEFAULT_SORT_LABELS: Record<string, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  name_asc: 'Name: A–Z',
  name_desc: 'Name: Z–A',
  featured: 'Featured',
};

const formatSortLabel = (key: string) =>
  DEFAULT_SORT_LABELS[key] ||
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

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
  const hasInternalWords = /\b(plan|credits?|hamro\s*cash|subscription|tier)\b/i.test(
    rawMsg
  );
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

const RADIUS_TOKENS: Record<
  string,
  { card: string; btn: string; input: string; media: string }
> = {
  none: {
    card: '0px',
    btn: '0px',
    input: '0px',
    media: '0px',
  },
  sm: {
    card: '6px',
    btn: '6px',
    input: '6px',
    media: '4px',
  },
  md: {
    card: '12px',
    btn: '10px',
    input: '10px',
    media: '8px',
  },
  lg: {
    card: '18px',
    btn: '12px',
    input: '12px',
    media: '12px',
  },
  full: {
    card: '24px',
    btn: '9999px',
    input: '9999px',
    media: '16px',
  },
};

const ProductThumbnail: React.FC<{
  src?: string | null;
  alt: string;
  isDarkSurface: boolean;
  mutedColor: string;
  surfaceTint: string;
}> = ({ src, alt, isDarkSurface, mutedColor, surfaceTint }) => {
  const [failed, setFailed] = useState(false);
  const safeSrc = useMemo(() => sanitizeHttpsImageUrl(src), [src]);

  if (!safeSrc || failed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-1.5"
        style={{
          backgroundColor: isDarkSurface ? 'rgba(255,255,255,0.04)' : surfaceTint,
          color: mutedColor,
        }}
      >
        <Package className="w-7 h-7 stroke-[1.5] opacity-70" />
        <span className="text-[11px] font-medium px-2 text-center truncate max-w-full opacity-80">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
};

export const StorefrontRenderer: React.FC<StorefrontRendererProps> = ({
  store,
  products,
  customization: rawCustomization,
  sortOptions,
  isPreview = false,
  previewDevice = 'mobile',
  orderCode = null,
  orderState = null,
  isLoadingOrder = false,
  orderError = null,
  recentOrders = [],
  onNavigateOrder,
  onSubmitOrder,
}) => {
  const config = useMemo(
    () => mergeStoreCustomization(rawCustomization, DEFAULT_STORE_CUSTOMIZATION),
    [rawCustomization]
  );

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener?.('change', listener);
    return () => mq.removeEventListener?.('change', listener);
  }, []);

  useEffect(() => {
    loadStoreGoogleFont(config.font);
  }, [config.font]);

  const resolvedTokens = useMemo(() => {
    const effectiveMode =
      config.mode === 'auto'
        ? systemPrefersDark
          ? 'dark'
          : 'light'
        : config.mode === 'dark'
          ? 'dark'
          : 'light';

    let bg = config.background_color;
    let text = config.text_color;
    let card = config.card_color;

    if (config.mode === 'auto') {
      const bgIsDefaultLight =
        bg.toLowerCase() === '#f8fafc' || bg.toLowerCase() === '#ffffff';
      const bgIsDefaultDark =
        bg.toLowerCase() === '#09090b' || bg.toLowerCase() === '#0b0b0e';
      if (effectiveMode === 'dark' && bgIsDefaultLight) {
        bg = '#09090b';
        text = '#f4f4f5';
        card = '#18181b';
      } else if (effectiveMode === 'light' && bgIsDefaultDark) {
        bg = '#f8fafc';
        text = '#0f172a';
        card = '#ffffff';
      }
    }

    const darkBg = isDarkColor(bg);
    const darkCard = isDarkColor(card);
    const borderColor = darkCard
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(15, 23, 42, 0.1)';
    const subtleSurface = darkCard
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(15, 23, 42, 0.04)';
    const mutedText = hexToRgba(text, 0.64);
    const radii = RADIUS_TOKENS[config.radius] || RADIUS_TOKENS.lg;
    const primary = config.primary_color;
    const accent = config.accent_color;
    const primaryContrast = getContrastTextColor(primary);
    const announcementBg = config.announcement_color || primary;
    const announcementContrast = getContrastTextColor(announcementBg);

    let cardBoxStyle: React.CSSProperties = {
      backgroundColor: card,
      borderRadius: radii.card,
    };
    if (config.card_style === 'flat') {
      cardBoxStyle.border = '1px solid transparent';
    } else if (config.card_style === 'shadow') {
      cardBoxStyle.border = `1px solid ${hexToRgba(text, 0.06)}`;
      cardBoxStyle.boxShadow = darkBg
        ? '0 10px 28px rgba(0, 0, 0, 0.45)'
        : '0 10px 26px rgba(15, 23, 42, 0.08)';
    } else {
      cardBoxStyle.border = `1px solid ${borderColor}`;
    }

    const getPrimaryButtonStyle = (): React.CSSProperties => {
      if (config.button_style === 'outline') {
        return {
          backgroundColor: 'transparent',
          color: primary,
          border: `1.5px solid ${primary}`,
          borderRadius: radii.btn,
        };
      }
      if (config.button_style === 'gradient') {
        return {
          backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
          color: primaryContrast,
          border: '1px solid transparent',
          borderRadius: radii.btn,
        };
      }
      return {
        backgroundColor: primary,
        color: primaryContrast,
        border: '1px solid transparent',
        borderRadius: radii.btn,
      };
    };

    return {
      bg,
      text,
      card,
      darkBg,
      darkCard,
      borderColor,
      subtleSurface,
      mutedText,
      radii,
      primary,
      accent,
      primaryContrast,
      announcementBg,
      announcementContrast,
      cardBoxStyle,
      primaryButtonStyle: getPrimaryButtonStyle(),
      fontFamily: getStoreFontFamily(config.font),
    };
  }, [config, systemPrefersDark]);

  // Interactive catalog & cart state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState(config.sort_default || 'newest');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = useState(false);
  const [orderLookupInput, setOrderLookupInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openPolicy, setOpenPolicy] = useState<'shipping' | 'return' | null>(null);

  // Checkout form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCopyText = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1600);
    }).catch(() => {});
  };

  const handleOrderLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = orderLookupInput.trim();
    if (!cleaned) return;
    setIsRecentOrdersOpen(false);
    setOrderLookupInput('');
    onNavigateOrder?.(cleaned);
  };

  // Sync default sort if merchant changes sort_default
  useEffect(() => {
    setSelectedSort(config.sort_default || 'newest');
  }, [config.sort_default]);

  const availableSortOptions = useMemo(() => {
    const base =
      sortOptions && sortOptions.length > 0
        ? sortOptions
        : ['newest', 'price_asc', 'price_desc', 'name_asc'];
    if (config.sort_default && !base.includes(config.sort_default)) {
      return [config.sort_default, ...base];
    }
    return base;
  }, [sortOptions, config.sort_default]);

  const displayedProducts = useMemo(() => {
    let list = [...products];
    if (config.show_search && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }

    const activeSort = (config.show_sort ? selectedSort : config.sort_default) || 'newest';
    if (activeSort === 'price_asc') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (activeSort === 'price_desc') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (activeSort === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (activeSort === 'name_desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (activeSort === 'oldest') {
      list.reverse();
    }
    return list;
  }, [products, config.show_search, config.show_sort, config.sort_default, searchQuery, selectedSort]);

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

  const isAllDigitalCart = useMemo(
    () => cart.length > 0 && cart.every((item) => Boolean(item.product.is_digital)),
    [cart]
  );

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    setPreviewNotice(null);

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    if (isPreview) {
      setPreviewNotice('Live preview mode — customers will proceed to UPI checkout here.');
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

    if (!onSubmitOrder) return;
    setIsCheckingOut(true);
    try {
      await onSubmitOrder(
        cart.map((item) => ({ product_id: item.product.id, qty: item.qty })),
        {
          name: trimmedName,
          phone: normalizedPhone,
          ...(customerEmail.trim() ? { email: customerEmail.trim() } : {}),
          ...(customerAddress.trim() ? { address: customerAddress.trim() } : {}),
          ...(customerNote.trim() ? { note: customerNote.trim() } : {}),
        }
      );
    } catch (err: any) {
      setCheckoutError(sanitizeCustomerError(err, err?.status));
    } finally {
      setIsCheckingOut(false);
    }
  };

  const safeLogoUrl = useMemo(
    () => sanitizeHttpsImageUrl(store.logo_url),
    [store.logo_url]
  );
  const safeBannerUrl = useMemo(
    () => sanitizeHttpsImageUrl(config.banner_url),
    [config.banner_url]
  );
  const safePhoneHref = useMemo(
    () => buildTelHref(store.contact_phone),
    [store.contact_phone]
  );

  const socialLinks = useMemo(() => {
    const items: Array<{ key: string; label: string; href: string }> = [];
    const wa = buildSocialHref('whatsapp', config.whatsapp);
    if (wa) items.push({ key: 'whatsapp', label: 'WhatsApp', href: wa });
    const ig = buildSocialHref('instagram', config.instagram);
    if (ig) items.push({ key: 'instagram', label: 'Instagram', href: ig });
    const fb = buildSocialHref('facebook', config.facebook);
    if (fb) items.push({ key: 'facebook', label: 'Facebook', href: fb });
    const tg = buildSocialHref('telegram', config.telegram);
    if (tg) items.push({ key: 'telegram', label: 'Telegram', href: tg });
    const web = buildSocialHref('website', config.website);
    if (web) items.push({ key: 'website', label: 'Website', href: web });
    return items;
  }, [config.whatsapp, config.instagram, config.facebook, config.telegram, config.website]);

  const isMobilePreview = isPreview && previewDevice === 'mobile';
  const mobileCols = Number(config.columns_mobile) === 2 ? 2 : 1;
  const gridClass =
    isMobilePreview
      ? mobileCols === 2
        ? 'grid grid-cols-2 gap-2.5'
        : 'grid grid-cols-1 gap-3.5'
      : mobileCols === 2
        ? 'grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6';

  const buttonLabel = (config.button_text || '').trim() || 'Add';
  const heroTitleText = (config.hero_title || '').trim() || store.name;
  const heroSubtitleText =
    config.hero_subtitle !== null && config.hero_subtitle !== undefined && config.hero_subtitle.trim() !== ''
      ? config.hero_subtitle
      : store.description || '';

  const overlayPositionClass = isPreview ? 'absolute inset-0 z-40' : 'fixed inset-0 z-50';
  const hasPolicies = Boolean(
    (config.shipping_policy && config.shipping_policy.trim()) ||
      (config.return_policy && config.return_policy.trim())
  );

  const renderSocialIcon = (key: string) => {
    if (key === 'whatsapp') return <MessageCircle className="w-4 h-4" />;
    if (key === 'telegram') return <Send className="w-4 h-4" />;
    if (key === 'instagram') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    }
    if (key === 'facebook') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    }
    return <Globe className="w-4 h-4" />;
  };

  return (
    <div
      className={`flex flex-col transition-colors duration-200 relative ${
        isPreview ? 'min-h-full' : 'min-h-screen'
      }`}
      style={{
        backgroundColor: resolvedTokens.bg,
        color: resolvedTokens.text,
        fontFamily: resolvedTokens.fontFamily,
      }}
    >
      {/* Top Announcement Bar */}
      {config.announcement && config.announcement.trim() && (
        <div
          className="px-3 py-2 text-center text-xs font-semibold tracking-tight"
          style={{
            backgroundColor: resolvedTokens.announcementBg,
            color: resolvedTokens.announcementContrast,
          }}
        >
          {config.announcement}
        </div>
      )}

      {/* Store Header */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: hexToRgba(resolvedTokens.card, 0.92),
          borderColor: resolvedTokens.borderColor,
        }}
      >
        <div
          className={`mx-auto flex items-center justify-between gap-2 ${
            isMobilePreview ? 'px-3 h-14' : 'max-w-6xl px-4 sm:px-6 h-16'
          }`}
        >
          <button
            type="button"
            onClick={() => onNavigateOrder?.(null)}
            className={`flex items-center gap-2.5 min-w-0 cursor-pointer ${
              config.header_style === 'center' ? 'text-left' : 'text-left'
            }`}
          >
            {safeLogoUrl ? (
              <img
                src={safeLogoUrl}
                alt={store.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 object-cover border shrink-0"
                style={{
                  borderRadius: resolvedTokens.radii.media,
                  borderColor: resolvedTokens.borderColor,
                }}
              />
            ) : (
              <div
                className="w-9 h-9 font-bold text-sm grid place-items-center shrink-0"
                style={{
                  backgroundColor: resolvedTokens.primary,
                  color: resolvedTokens.primaryContrast,
                  borderRadius: resolvedTokens.radii.media,
                }}
              >
                {(store.name[0] || 'S').toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold tracking-tight truncate">
                {store.name}
              </div>
              {store.merchant_name && (
                <div
                  className="text-[11px] truncate"
                  style={{ color: resolvedTokens.mutedText }}
                >
                  by {store.merchant_name}
                </div>
              )}
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {!isPreview && (
              <button
                type="button"
                onClick={() => setIsRecentOrdersOpen(true)}
                className="h-9 px-2.5 border text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                style={{
                  borderRadius: resolvedTokens.radii.btn,
                  borderColor: resolvedTokens.borderColor,
                  backgroundColor: resolvedTokens.subtleSurface,
                }}
                title="My orders & order lookup"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  My orders{recentOrders.length > 0 ? ` (${recentOrders.length})` : ''}
                </span>
              </button>
            )}

            {!orderCode && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="h-9 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition"
                style={
                  config.button_style === 'gradient'
                    ? {
                        backgroundImage: `linear-gradient(135deg, ${resolvedTokens.primary}, ${resolvedTokens.accent})`,
                        color: resolvedTokens.primaryContrast,
                        borderRadius: resolvedTokens.radii.btn,
                      }
                    : {
                        backgroundColor: resolvedTokens.primary,
                        color: resolvedTokens.primaryContrast,
                        borderRadius: resolvedTokens.radii.btn,
                      }
                }
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Cart</span>
                {cartItemCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums"
                    style={{
                      backgroundColor: resolvedTokens.primaryContrast,
                      color: resolvedTokens.primary,
                      borderRadius: resolvedTokens.radii.btn,
                    }}
                  >
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`flex-1 w-full mx-auto ${
          isMobilePreview ? 'px-3 py-4' : 'max-w-6xl px-4 sm:px-6 py-6 sm:py-8'
        }`}
      >
        {orderCode ? (
          /* ORDER STATUS VIEW (?order=CODE) */
          <div className="max-w-xl mx-auto space-y-5">
            <button
              type="button"
              onClick={() => onNavigateOrder?.(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              style={{ color: resolvedTokens.mutedText }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {store.name}</span>
            </button>

            <div className="p-6 space-y-5" style={resolvedTokens.cardBoxStyle}>
              {isLoadingOrder && !orderState ? (
                <div className="py-10 flex flex-col items-center gap-3">
                  <Loader2
                    className="w-6 h-6 animate-spin"
                    style={{ color: resolvedTokens.primary }}
                  />
                  <p className="text-sm" style={{ color: resolvedTokens.mutedText }}>
                    Loading order {orderCode}...
                  </p>
                </div>
              ) : orderError ? (
                <div className="py-6 text-center space-y-3">
                  <AlertCircle
                    className="w-8 h-8 mx-auto"
                    style={{ color: resolvedTokens.primary }}
                  />
                  <h2 className="text-base font-bold">{orderError}</h2>
                  <button
                    type="button"
                    onClick={() => onNavigateOrder?.(null)}
                    className="px-4 py-2 text-xs font-bold cursor-pointer"
                    style={resolvedTokens.primaryButtonStyle}
                  >
                    Return to Store
                  </button>
                </div>
              ) : orderState ? (
                <>
                  {orderState.status === 'paid' && (
                    <div className="space-y-4">
                      <div
                        className="p-4 border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3"
                        style={{ borderRadius: resolvedTokens.radii.media }}
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <h1 className="text-base font-bold text-emerald-500">
                            Payment received · order {orderCode}
                          </h1>
                          <p
                            className="text-xs mt-1 capitalize"
                            style={{ color: resolvedTokens.mutedText }}
                          >
                            Fulfilment status: {orderState.fulfilment || 'new'}
                          </p>
                        </div>
                      </div>

                      {orderState.deliveries && orderState.deliveries.length > 0 && (
                        <div
                          className="p-4 border space-y-3"
                          style={{
                            borderRadius: resolvedTokens.radii.media,
                            borderColor: hexToRgba(resolvedTokens.primary, 0.35),
                            backgroundColor: hexToRgba(resolvedTokens.primary, 0.06),
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Zap
                              className="w-4 h-4 shrink-0"
                              style={{ color: resolvedTokens.primary }}
                            />
                            <h2 className="text-sm font-bold">Your purchase</h2>
                          </div>

                          <div className="space-y-2.5">
                            {orderState.deliveries.map((del, idx) => {
                              const safeHref = sanitizeHttpUrl(del.link);
                              const noteKey = `cust-note-${idx}`;
                              return (
                                <div
                                  key={`${del.name}-${idx}`}
                                  className="p-3.5 border space-y-2.5"
                                  style={{
                                    backgroundColor: resolvedTokens.card,
                                    borderColor: resolvedTokens.borderColor,
                                    borderRadius: resolvedTokens.radii.media,
                                  }}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="text-sm font-semibold">{del.name}</div>
                                    {safeHref && (
                                      <a
                                        href={safeHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3.5 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition"
                                        style={resolvedTokens.primaryButtonStyle}
                                      >
                                        <span>Open / Download</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>

                                  {del.note && (
                                    <div
                                      className="p-2.5 border flex items-start justify-between gap-2"
                                      style={{
                                        backgroundColor: resolvedTokens.subtleSurface,
                                        borderColor: resolvedTokens.borderColor,
                                        borderRadius: resolvedTokens.radii.media,
                                      }}
                                    >
                                      <p className="text-xs leading-relaxed whitespace-pre-line select-all flex-1">
                                        {del.note}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(del.note || '', noteKey)}
                                        className="px-2.5 py-1 border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                                        style={{
                                          borderRadius: resolvedTokens.radii.btn,
                                          borderColor: resolvedTokens.borderColor,
                                          backgroundColor: resolvedTokens.card,
                                        }}
                                      >
                                        {copiedKey === noteKey ? (
                                          <Check className="w-3 h-3 text-emerald-500" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>
                                          {copiedKey === noteKey ? 'Copied' : 'Copy'}
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
                    </div>
                  )}

                  {orderState.status === 'pending' && (
                    <div
                      className="p-4 border border-amber-500/30 bg-amber-500/10 space-y-3"
                      style={{ borderRadius: resolvedTokens.radii.media }}
                    >
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h1 className="text-base font-bold">
                            Payment pending · {orderCode}
                          </h1>
                          <p
                            className="text-xs mt-1"
                            style={{ color: resolvedTokens.mutedText }}
                          >
                            Complete your UPI payment to confirm this order. Checking status automatically...
                          </p>
                        </div>
                      </div>
                      {orderState.payment_url && (
                        <a
                          href={orderState.payment_url}
                          className="w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2"
                          style={resolvedTokens.primaryButtonStyle}
                        >
                          <span>Complete payment</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {(orderState.status === 'expired' ||
                    orderState.status === 'cancelled') && (
                    <div
                      className="p-4 border border-rose-500/30 bg-rose-500/10 space-y-3"
                      style={{ borderRadius: resolvedTokens.radii.media }}
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <h1 className="text-base font-bold capitalize">
                            Order {orderState.status} · {orderCode}
                          </h1>
                          <p
                            className="text-xs mt-1"
                            style={{ color: resolvedTokens.mutedText }}
                          >
                            This checkout session is no longer active. You can place a new order anytime.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateOrder?.(null)}
                        className="w-full py-2.5 px-4 text-xs font-bold cursor-pointer"
                        style={resolvedTokens.primaryButtonStyle}
                      >
                        Retry Order in Store
                      </button>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div
                    className="pt-4 border-t space-y-2.5"
                    style={{ borderColor: resolvedTokens.borderColor }}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span style={{ color: resolvedTokens.mutedText }}>Order Code</span>
                      <span className="font-mono font-bold">{orderCode}</span>
                    </div>
                    {orderState.customer_name && (
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span style={{ color: resolvedTokens.mutedText }}>Customer</span>
                        <span>{orderState.customer_name}</span>
                      </div>
                    )}
                    <div
                      className="pt-2 border-t space-y-2"
                      style={{ borderColor: resolvedTokens.borderColor }}
                    >
                      {(orderState.items || []).map((it, idx) => (
                        <div
                          key={`${it.name}-${idx}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>
                            {it.name}{' '}
                            <span
                              className="text-xs font-mono"
                              style={{ color: resolvedTokens.mutedText }}
                            >
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
                      className="pt-3 border-t flex items-center justify-between text-base font-bold"
                      style={{ borderColor: resolvedTokens.borderColor }}
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
          /* PUBLIC STORE CATALOG */
          <div className="space-y-5">
            {/* Hero / Header Section */}
            {config.header_style === 'banner' ? (
              <div
                className="relative overflow-hidden border"
                style={{
                  borderRadius: resolvedTokens.radii.card,
                  borderColor: resolvedTokens.borderColor,
                  minHeight: isMobilePreview ? '148px' : '200px',
                  backgroundImage: safeBannerUrl
                    ? undefined
                    : `linear-gradient(135deg, ${resolvedTokens.primary}, ${resolvedTokens.accent})`,
                }}
              >
                {safeBannerUrl && (
                  <img
                    src={safeBannerUrl}
                    alt={heroTitleText}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div
                  className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-7"
                  style={{
                    minHeight: isMobilePreview ? '148px' : '200px',
                    background: safeBannerUrl
                      ? 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.72) 100%)'
                      : 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100%)',
                    color: '#ffffff',
                  }}
                >
                  <h1
                    className={`font-bold tracking-tight ${
                      isMobilePreview ? 'text-lg' : 'text-2xl sm:text-3xl'
                    }`}
                  >
                    {heroTitleText}
                  </h1>
                  {heroSubtitleText && (
                    <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-2xl leading-relaxed">
                      {heroSubtitleText}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`space-y-3 ${
                  config.header_style === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {safeBannerUrl && (
                  <div
                    className="overflow-hidden border"
                    style={{
                      borderRadius: resolvedTokens.radii.card,
                      borderColor: resolvedTokens.borderColor,
                      maxHeight: isMobilePreview ? '120px' : '220px',
                    }}
                  >
                    <img
                      src={safeBannerUrl}
                      alt={heroTitleText}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div
                  className={`space-y-1.5 ${
                    config.header_style === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'
                  }`}
                >
                  <h1
                    className={`font-bold tracking-tight ${
                      isMobilePreview ? 'text-xl' : 'text-2xl sm:text-3xl'
                    }`}
                  >
                    {heroTitleText}
                  </h1>
                  {heroSubtitleText && (
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{ color: resolvedTokens.mutedText }}
                    >
                      {heroSubtitleText}
                    </p>
                  )}
                  {safePhoneHref && store.contact_phone && (
                    <div
                      className={`pt-0.5 ${
                        config.header_style === 'center' ? 'flex justify-center' : ''
                      }`}
                    >
                      <a
                        href={safePhoneHref}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: resolvedTokens.primary }}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{store.contact_phone}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search & Sort Controls */}
            {products.length > 0 && (config.show_search || config.show_sort) && (
              <div
                className={`flex gap-2.5 ${
                  isMobilePreview
                    ? 'flex-col'
                    : 'flex-col sm:flex-row sm:items-center sm:justify-between'
                }`}
              >
                {config.show_search && (
                  <div
                    className={`relative ${
                      isMobilePreview ? 'w-full' : 'w-full sm:max-w-xs'
                    }`}
                  >
                    <Search
                      className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: resolvedTokens.mutedText }}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-9 pr-3.5 py-2 border text-xs sm:text-sm outline-none transition"
                      style={{
                        backgroundColor: resolvedTokens.card,
                        color: resolvedTokens.text,
                        borderColor: resolvedTokens.borderColor,
                        borderRadius: resolvedTokens.radii.input,
                      }}
                    />
                  </div>
                )}

                {config.show_sort && (
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    aria-label="Sort products"
                    className="px-3 py-2 border text-xs sm:text-sm font-medium outline-none cursor-pointer"
                    style={{
                      backgroundColor: resolvedTokens.card,
                      color: resolvedTokens.text,
                      borderColor: resolvedTokens.borderColor,
                      borderRadius: resolvedTokens.radii.input,
                    }}
                  >
                    {availableSortOptions.map((opt) => (
                      <option
                        key={opt}
                        value={opt}
                        style={{
                          backgroundColor: resolvedTokens.card,
                          color: resolvedTokens.text,
                        }}
                      >
                        {formatSortLabel(opt)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Product Display */}
            {displayedProducts.length === 0 ? (
              <div
                className="py-12 px-6 text-center space-y-2"
                style={resolvedTokens.cardBoxStyle}
              >
                <Package
                  className="w-9 h-9 mx-auto"
                  style={{ color: resolvedTokens.mutedText }}
                />
                <div className="text-sm font-bold">
                  {products.length === 0 ? 'No products listed yet' : 'No matching products'}
                </div>
                <p className="text-xs" style={{ color: resolvedTokens.mutedText }}>
                  {products.length === 0
                    ? 'Please check back soon.'
                    : 'Try clearing your search filter.'}
                </p>
              </div>
            ) : config.layout === 'list' ? (
              <div className="space-y-3">
                {displayedProducts.map((product) => {
                  const qtyInCart = cartQtyMap.get(product.id) || 0;
                  const outOfStock = !product.in_stock || product.stock === 0;
                  const maxStock =
                    product.stock !== null && product.stock !== undefined
                      ? product.stock
                      : Infinity;

                  return (
                    <article
                      key={product.id}
                      className="group p-3 flex items-center gap-3.5 transition"
                      style={resolvedTokens.cardBoxStyle}
                    >
                      <div
                        className={`shrink-0 overflow-hidden border ${
                          isMobilePreview ? 'w-20 h-20' : 'w-24 h-24 sm:w-28 sm:h-28'
                        }`}
                        style={{
                          borderRadius: resolvedTokens.radii.media,
                          borderColor: resolvedTokens.borderColor,
                        }}
                      >
                        <ProductThumbnail
                          src={product.image_url}
                          alt={product.name}
                          isDarkSurface={resolvedTokens.darkCard}
                          mutedColor={resolvedTokens.mutedText}
                          surfaceTint={resolvedTokens.subtleSurface}
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="text-sm sm:text-base font-semibold leading-snug truncate">
                              {product.name}
                            </h2>
                            {product.is_digital && (
                              <span
                                className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5"
                                style={{
                                  backgroundColor: hexToRgba(resolvedTokens.primary, 0.12),
                                  color: resolvedTokens.primary,
                                  borderRadius: resolvedTokens.radii.media,
                                }}
                              >
                                ⚡ Instant delivery
                              </span>
                            )}
                          </div>
                          {config.show_stock &&
                            (outOfStock ? (
                              <span className="text-[11px] font-semibold text-rose-500 shrink-0">
                                Out of stock
                              </span>
                            ) : (
                              product.stock !== null &&
                              product.stock !== undefined && (
                                <span
                                  className="text-[11px] font-medium shrink-0 tabular-nums"
                                  style={{ color: resolvedTokens.mutedText }}
                                >
                                  {product.stock} left
                                </span>
                              )
                            ))}
                        </div>

                        {config.show_description && product.description && (
                          <p
                            className="text-xs line-clamp-2 leading-relaxed"
                            style={{ color: resolvedTokens.mutedText }}
                          >
                            {product.description}
                          </p>
                        )}

                        <div className="pt-1.5 flex items-center justify-between gap-2">
                          <span className="text-sm sm:text-base font-bold font-mono tabular-nums">
                            {formatINR(product.price)}
                          </span>

                          {outOfStock ? (
                            <button
                              type="button"
                              disabled
                              className="h-8 px-3 border text-xs font-semibold opacity-50 cursor-not-allowed"
                              style={{
                                borderRadius: resolvedTokens.radii.btn,
                                borderColor: resolvedTokens.borderColor,
                              }}
                            >
                              Unavailable
                            </button>
                          ) : qtyInCart > 0 ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateCartQty(product.id, -1)}
                                className="w-8 h-8 border grid place-items-center cursor-pointer"
                                style={{
                                  borderRadius: resolvedTokens.radii.btn,
                                  borderColor: resolvedTokens.borderColor,
                                }}
                                aria-label={`Decrease quantity of ${product.name}`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold tabular-nums">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                disabled={qtyInCart >= maxStock}
                                onClick={() => updateCartQty(product.id, 1)}
                                className="w-8 h-8 border grid place-items-center cursor-pointer disabled:opacity-40"
                                style={{
                                  borderRadius: resolvedTokens.radii.btn,
                                  borderColor: resolvedTokens.borderColor,
                                }}
                                aria-label={`Increase quantity of ${product.name}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className="h-8 px-3.5 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap transition"
                              style={resolvedTokens.primaryButtonStyle}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{buttonLabel}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : config.layout === 'compact' ? (
              <div
                className={
                  isMobilePreview
                    ? 'space-y-2'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-2.5'
                }
              >
                {displayedProducts.map((product) => {
                  const qtyInCart = cartQtyMap.get(product.id) || 0;
                  const outOfStock = !product.in_stock || product.stock === 0;
                  const maxStock =
                    product.stock !== null && product.stock !== undefined
                      ? product.stock
                      : Infinity;

                  return (
                    <article
                      key={product.id}
                      className="group px-3 py-2.5 flex items-center justify-between gap-2.5 transition"
                      style={resolvedTokens.cardBoxStyle}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-12 h-12 shrink-0 overflow-hidden border"
                          style={{
                            borderRadius: resolvedTokens.radii.media,
                            borderColor: resolvedTokens.borderColor,
                          }}
                        >
                          <ProductThumbnail
                            src={product.image_url}
                            alt={product.name}
                            isDarkSurface={resolvedTokens.darkCard}
                            mutedColor={resolvedTokens.mutedText}
                            surfaceTint={resolvedTokens.subtleSurface}
                          />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-xs sm:text-sm font-semibold truncate">
                            {product.name}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-xs sm:text-sm font-bold font-mono tabular-nums">
                              {formatINR(product.price)}
                            </span>
                            {product.is_digital && (
                              <span
                                className="text-[10px] font-semibold"
                                style={{ color: resolvedTokens.primary }}
                              >
                                ⚡ Instant delivery
                              </span>
                            )}
                            {config.show_stock && outOfStock && (
                              <span className="text-[10px] font-semibold text-rose-500">
                                Out of stock
                              </span>
                            )}
                            {config.show_stock &&
                              !outOfStock &&
                              product.stock !== null &&
                              product.stock !== undefined && (
                                <span
                                  className="text-[10px] tabular-nums"
                                  style={{ color: resolvedTokens.mutedText }}
                                >
                                  {product.stock} left
                                </span>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {outOfStock ? (
                          <span
                            className="text-[11px] font-semibold opacity-50"
                            style={{ color: resolvedTokens.mutedText }}
                          >
                            Unavailable
                          </span>
                        ) : qtyInCart > 0 ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateCartQty(product.id, -1)}
                              className="w-7 h-7 border grid place-items-center cursor-pointer"
                              style={{
                                borderRadius: resolvedTokens.radii.btn,
                                borderColor: resolvedTokens.borderColor,
                              }}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold tabular-nums">
                              {qtyInCart}
                            </span>
                            <button
                              type="button"
                              disabled={qtyInCart >= maxStock}
                              onClick={() => updateCartQty(product.id, 1)}
                              className="w-7 h-7 border grid place-items-center cursor-pointer disabled:opacity-40"
                              style={{
                                borderRadius: resolvedTokens.radii.btn,
                                borderColor: resolvedTokens.borderColor,
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            className="h-8 px-3 text-xs font-bold cursor-pointer whitespace-nowrap transition"
                            style={resolvedTokens.primaryButtonStyle}
                          >
                            {buttonLabel}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* GRID LAYOUT */
              <div className={gridClass}>
                {displayedProducts.map((product) => {
                  const qtyInCart = cartQtyMap.get(product.id) || 0;
                  const outOfStock = !product.in_stock || product.stock === 0;
                  const maxStock =
                    product.stock !== null && product.stock !== undefined
                      ? product.stock
                      : Infinity;
                  const isTwoColMobile = isMobilePreview && mobileCols === 2;

                  return (
                    <article
                      key={product.id}
                      className="group overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
                      style={resolvedTokens.cardBoxStyle}
                    >
                      <div
                        className="aspect-[4/3] w-full overflow-hidden border-b"
                        style={{ borderColor: resolvedTokens.borderColor }}
                      >
                        <ProductThumbnail
                          src={product.image_url}
                          alt={product.name}
                          isDarkSurface={resolvedTokens.darkCard}
                          mutedColor={resolvedTokens.mutedText}
                          surfaceTint={resolvedTokens.subtleSurface}
                        />
                      </div>

                      <div
                        className={`flex-1 flex flex-col gap-2.5 ${
                          isTwoColMobile ? 'p-2.5' : 'p-3.5 sm:p-4'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <h2
                              className={`font-semibold leading-snug ${
                                isTwoColMobile ? 'text-xs line-clamp-2' : 'text-sm sm:text-base'
                              }`}
                            >
                              {product.name}
                            </h2>
                            {config.show_stock &&
                              !isTwoColMobile &&
                              (outOfStock ? (
                                <span className="text-[11px] font-semibold text-rose-500 shrink-0">
                                  Out of stock
                                </span>
                              ) : (
                                product.stock !== null &&
                                product.stock !== undefined && (
                                  <span
                                    className="text-[11px] font-medium shrink-0 tabular-nums"
                                    style={{ color: resolvedTokens.mutedText }}
                                  >
                                    {product.stock} left
                                  </span>
                                )
                              ))}
                          </div>
                          {product.is_digital && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5"
                              style={{
                                backgroundColor: hexToRgba(resolvedTokens.primary, 0.12),
                                color: resolvedTokens.primary,
                                borderRadius: resolvedTokens.radii.media,
                              }}
                            >
                              ⚡ Instant delivery
                            </span>
                          )}
                          {config.show_description &&
                            product.description &&
                            !isTwoColMobile && (
                              <p
                                className="text-xs leading-relaxed line-clamp-2"
                                style={{ color: resolvedTokens.mutedText }}
                              >
                                {product.description}
                              </p>
                            )}
                        </div>

                        <div
                          className={`pt-1.5 mt-auto flex items-center justify-between gap-2 ${
                            isTwoColMobile ? 'flex-col items-stretch' : ''
                          }`}
                        >
                          <span
                            className={`font-bold font-mono tabular-nums ${
                              isTwoColMobile ? 'text-sm' : 'text-base sm:text-lg'
                            }`}
                          >
                            {formatINR(product.price)}
                          </span>

                          {outOfStock ? (
                            <button
                              type="button"
                              disabled
                              className="h-8 px-3 border text-[11px] font-semibold opacity-50 cursor-not-allowed"
                              style={{
                                borderRadius: resolvedTokens.radii.btn,
                                borderColor: resolvedTokens.borderColor,
                              }}
                            >
                              Unavailable
                            </button>
                          ) : qtyInCart > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateCartQty(product.id, -1)}
                                className="w-8 h-8 border grid place-items-center cursor-pointer"
                                style={{
                                  borderRadius: resolvedTokens.radii.btn,
                                  borderColor: resolvedTokens.borderColor,
                                }}
                                aria-label={`Decrease quantity of ${product.name}`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold tabular-nums">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                disabled={qtyInCart >= maxStock}
                                onClick={() => updateCartQty(product.id, 1)}
                                className="w-8 h-8 border grid place-items-center cursor-pointer disabled:opacity-40"
                                style={{
                                  borderRadius: resolvedTokens.radii.btn,
                                  borderColor: resolvedTokens.borderColor,
                                }}
                                aria-label={`Increase quantity of ${product.name}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className="h-8 px-3 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap transition"
                              style={resolvedTokens.primaryButtonStyle}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="truncate">{buttonLabel}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Shipping & Return Policies (Expandable) */}
            {hasPolicies && (
              <div className="pt-2 space-y-2">
                {config.shipping_policy && config.shipping_policy.trim() && (
                  <div style={resolvedTokens.cardBoxStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPolicy((prev) => (prev === 'shipping' ? null : 'shipping'))
                      }
                      className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-semibold cursor-pointer text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Truck className="w-4 h-4" style={{ color: resolvedTokens.primary }} />
                        <span>Shipping &amp; Delivery Policy</span>
                      </span>
                      {openPolicy === 'shipping' ? (
                        <ChevronUp className="w-4 h-4 opacity-70" />
                      ) : (
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      )}
                    </button>
                    {openPolicy === 'shipping' && (
                      <div
                        className="px-4 pb-3.5 pt-1 border-t text-xs leading-relaxed whitespace-pre-line"
                        style={{
                          borderColor: resolvedTokens.borderColor,
                          color: resolvedTokens.mutedText,
                        }}
                      >
                        {config.shipping_policy}
                      </div>
                    )}
                  </div>
                )}

                {config.return_policy && config.return_policy.trim() && (
                  <div style={resolvedTokens.cardBoxStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPolicy((prev) => (prev === 'return' ? null : 'return'))
                      }
                      className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-semibold cursor-pointer text-left"
                    >
                      <span className="flex items-center gap-2">
                        <RotateCcw
                          className="w-4 h-4"
                          style={{ color: resolvedTokens.primary }}
                        />
                        <span>Return &amp; Refund Policy</span>
                      </span>
                      {openPolicy === 'return' ? (
                        <ChevronUp className="w-4 h-4 opacity-70" />
                      ) : (
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      )}
                    </button>
                    {openPolicy === 'return' && (
                      <div
                        className="px-4 pb-3.5 pt-1 border-t text-xs leading-relaxed whitespace-pre-line"
                        style={{
                          borderColor: resolvedTokens.borderColor,
                          color: resolvedTokens.mutedText,
                        }}
                      >
                        {config.return_policy}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="border-t py-5 px-4 text-xs"
        style={{
          borderColor: resolvedTokens.borderColor,
          color: resolvedTokens.mutedText,
        }}
      >
        <div
          className={`mx-auto space-y-3 ${
            isMobilePreview ? '' : 'max-w-6xl'
          }`}
        >
          {(socialLinks.length > 0 || (safePhoneHref && store.contact_phone)) && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {safePhoneHref && store.contact_phone && (
                <a
                  href={safePhoneHref}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border text-xs font-medium"
                  style={{
                    borderRadius: resolvedTokens.radii.btn,
                    borderColor: resolvedTokens.borderColor,
                    color: resolvedTokens.text,
                  }}
                >
                  <Phone className="w-3.5 h-3.5" style={{ color: resolvedTokens.primary }} />
                  <span>{store.contact_phone}</span>
                </a>
              )}
              {socialLinks.map((soc) => (
                <a
                  key={soc.key}
                  href={soc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border text-xs font-medium transition hover:opacity-80"
                  style={{
                    borderRadius: resolvedTokens.radii.btn,
                    borderColor: resolvedTokens.borderColor,
                    color: resolvedTokens.text,
                  }}
                  aria-label={soc.label}
                  title={soc.label}
                >
                  <span style={{ color: resolvedTokens.primary }}>
                    {renderSocialIcon(soc.key)}
                  </span>
                  <span>{soc.label}</span>
                </a>
              ))}
            </div>
          )}

          {config.footer_text && config.footer_text.trim() && (
            <p className="text-xs leading-relaxed text-center sm:text-left">
              {config.footer_text}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {store.name} · Direct UPI Checkout
              </span>
            </span>

            <div className="flex items-center gap-3">
              {!isPreview && !orderCode && (
                <button
                  type="button"
                  onClick={() => setIsRecentOrdersOpen(true)}
                  className="text-[11px] font-semibold underline cursor-pointer"
                  style={{ color: resolvedTokens.text }}
                >
                  Find my order
                </button>
              )}

              {!config.hide_branding && (
                <span className="text-[11px] font-medium">
                  Powered by <strong style={{ color: resolvedTokens.text }}>HamroPay</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Floating mobile view-cart bar */}
      {!orderCode && cartItemCount > 0 && !isCartOpen && (
        <div
          className={
            isPreview
              ? 'sticky bottom-3 px-3 pb-3 z-30'
              : 'fixed bottom-4 left-4 right-4 z-30 sm:hidden'
          }
        >
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full h-11 px-4 shadow-xl flex items-center justify-between text-xs sm:text-sm font-bold cursor-pointer"
            style={
              config.button_style === 'gradient'
                ? {
                    backgroundImage: `linear-gradient(135deg, ${resolvedTokens.primary}, ${resolvedTokens.accent})`,
                    color: resolvedTokens.primaryContrast,
                    borderRadius: resolvedTokens.radii.btn,
                  }
                : {
                    backgroundColor: resolvedTokens.primary,
                    color: resolvedTokens.primaryContrast,
                    borderRadius: resolvedTokens.radii.btn,
                  }
            }
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
          className={`${overlayPositionClass} flex justify-end bg-black/60 backdrop-blur-xs`}
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="w-full max-w-md h-full border-l flex flex-col shadow-2xl"
            style={{
              backgroundColor: resolvedTokens.card,
              color: resolvedTokens.text,
              borderColor: resolvedTokens.borderColor,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-4 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: resolvedTokens.borderColor }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag
                  className="w-4 h-4"
                  style={{ color: resolvedTokens.primary }}
                />
                <h2 className="text-sm sm:text-base font-bold">
                  Your Cart ({cartItemCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 border grid place-items-center cursor-pointer"
                style={{
                  borderRadius: resolvedTokens.radii.btn,
                  borderColor: resolvedTokens.borderColor,
                }}
                aria-label="Close cart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <ShoppingBag
                    className="w-10 h-10 mx-auto"
                    style={{ color: resolvedTokens.mutedText }}
                  />
                  <p className="text-sm font-semibold">Your cart is empty</p>
                  <p className="text-xs" style={{ color: resolvedTokens.mutedText }}>
                    Add products from the store to continue to checkout.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="divide-y"
                    style={{ borderColor: resolvedTokens.borderColor }}
                  >
                    {cart.map(({ product, qty }) => {
                      const maxStock =
                        product.stock !== null && product.stock !== undefined
                          ? product.stock
                          : Infinity;
                      return (
                        <div
                          key={product.id}
                          className="py-2.5 flex items-center justify-between gap-2.5"
                          style={{ borderColor: resolvedTokens.borderColor }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-semibold truncate">
                              {product.name}
                            </div>
                            <div
                              className="text-[11px] font-mono tabular-nums"
                              style={{ color: resolvedTokens.mutedText }}
                            >
                              {formatINR(product.price)} × {qty} ={' '}
                              {formatINR(Number(product.price) * qty)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartQty(product.id, -1)}
                              className="w-7 h-7 border grid place-items-center cursor-pointer"
                              style={{
                                borderRadius: resolvedTokens.radii.btn,
                                borderColor: resolvedTokens.borderColor,
                              }}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              disabled={qty >= maxStock}
                              onClick={() => updateCartQty(product.id, 1)}
                              className="w-7 h-7 border grid place-items-center cursor-pointer disabled:opacity-40"
                              style={{
                                borderRadius: resolvedTokens.radii.btn,
                                borderColor: resolvedTokens.borderColor,
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="w-7 h-7 text-rose-500 hover:bg-rose-500/10 grid place-items-center cursor-pointer"
                              style={{ borderRadius: resolvedTokens.radii.btn }}
                              aria-label={`Remove ${product.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="p-3 border flex items-center justify-between"
                    style={{
                      backgroundColor: resolvedTokens.subtleSurface,
                      borderColor: resolvedTokens.borderColor,
                      borderRadius: resolvedTokens.radii.media,
                    }}
                  >
                    <span className="text-xs font-semibold">Estimated Total</span>
                    <span className="text-sm sm:text-base font-bold font-mono tabular-nums">
                      {formatINR(cartTotal)}
                    </span>
                  </div>

                  {previewNotice && (
                    <div
                      className="p-3 border text-xs font-medium"
                      style={{
                        borderColor: resolvedTokens.primary,
                        backgroundColor: hexToRgba(resolvedTokens.primary, 0.12),
                        borderRadius: resolvedTokens.radii.media,
                      }}
                    >
                      {previewNotice}
                    </div>
                  )}

                  <form
                    id="storeCheckoutForm"
                    onSubmit={handleCheckoutSubmit}
                    className="space-y-3"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider">
                      Customer Details
                    </div>

                    {checkoutError && (
                      <div
                        className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-500 flex items-start gap-2"
                        style={{ borderRadius: resolvedTokens.radii.media }}
                      >
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
                        className="w-full px-3 py-2 border text-xs sm:text-sm outline-none"
                        style={{
                          backgroundColor: resolvedTokens.bg,
                          color: resolvedTokens.text,
                          borderColor: resolvedTokens.borderColor,
                          borderRadius: resolvedTokens.radii.input,
                        }}
                        required={!isPreview}
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
                        className="w-full px-3 py-2 border text-xs sm:text-sm font-mono outline-none"
                        style={{
                          backgroundColor: resolvedTokens.bg,
                          color: resolvedTokens.text,
                          borderColor: resolvedTokens.borderColor,
                          borderRadius: resolvedTokens.radii.input,
                        }}
                        required={!isPreview}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold">
                        Email{' '}
                        <span
                          className="font-normal"
                          style={{ color: resolvedTokens.mutedText }}
                        >
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 border text-xs sm:text-sm outline-none"
                        style={{
                          backgroundColor: resolvedTokens.bg,
                          color: resolvedTokens.text,
                          borderColor: resolvedTokens.borderColor,
                          borderRadius: resolvedTokens.radii.input,
                        }}
                      />
                    </div>

                    {isAllDigitalCart ? (
                      <div
                        className="p-2.5 border text-xs font-medium"
                        style={{
                          backgroundColor: hexToRgba(resolvedTokens.primary, 0.08),
                          borderColor: hexToRgba(resolvedTokens.primary, 0.25),
                          borderRadius: resolvedTokens.radii.media,
                        }}
                      >
                        ⚡ Digital items deliver instantly after payment — no shipping address needed.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold">
                          Delivery Address{' '}
                          <span
                            className="font-normal"
                            style={{ color: resolvedTokens.mutedText }}
                          >
                            (Optional)
                          </span>
                        </label>
                        <textarea
                          rows={2}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="House no, street, city, pincode"
                          className="w-full px-3 py-2 border text-xs sm:text-sm outline-none resize-none"
                          style={{
                            backgroundColor: resolvedTokens.bg,
                            color: resolvedTokens.text,
                            borderColor: resolvedTokens.borderColor,
                            borderRadius: resolvedTokens.radii.media,
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold">
                        Order Note{' '}
                        <span
                          className="font-normal"
                          style={{ color: resolvedTokens.mutedText }}
                        >
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        placeholder="Any special instructions..."
                        className="w-full px-3 py-2 border text-xs sm:text-sm outline-none"
                        style={{
                          backgroundColor: resolvedTokens.bg,
                          color: resolvedTokens.text,
                          borderColor: resolvedTokens.borderColor,
                          borderRadius: resolvedTokens.radii.input,
                        }}
                      />
                    </div>
                  </form>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div
                className="p-4 border-t"
                style={{ borderColor: resolvedTokens.borderColor }}
              >
                <button
                  type="submit"
                  form="storeCheckoutForm"
                  disabled={isCheckingOut}
                  className="w-full py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition"
                  style={
                    config.button_style === 'gradient'
                      ? {
                          backgroundImage: `linear-gradient(135deg, ${resolvedTokens.primary}, ${resolvedTokens.accent})`,
                          color: resolvedTokens.primaryContrast,
                          borderRadius: resolvedTokens.radii.btn,
                        }
                      : {
                          backgroundColor: resolvedTokens.primary,
                          color: resolvedTokens.primaryContrast,
                          borderRadius: resolvedTokens.radii.btn,
                        }
                  }
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

      {/* MY ORDERS & ORDER LOOKUP MODAL */}
      {!isPreview && isRecentOrdersOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsRecentOrdersOpen(false)}
        >
          <div
            className="w-full max-w-sm p-5 space-y-4 shadow-2xl"
            style={resolvedTokens.cardBoxStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">My orders</h3>
              <button
                type="button"
                onClick={() => setIsRecentOrdersOpen(false)}
                className="w-8 h-8 border grid place-items-center cursor-pointer"
                style={{
                  borderRadius: resolvedTokens.radii.btn,
                  borderColor: resolvedTokens.borderColor,
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOrderLookupSubmit} className="space-y-1.5">
              <label
                className="block text-[11px] font-semibold"
                style={{ color: resolvedTokens.mutedText }}
              >
                Find my order
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={orderLookupInput}
                  onChange={(e) => setOrderLookupInput(e.target.value)}
                  placeholder="Enter order code..."
                  className="flex-1 min-w-0 px-3 py-2 border text-xs font-mono outline-none"
                  style={{
                    backgroundColor: resolvedTokens.bg,
                    color: resolvedTokens.text,
                    borderColor: resolvedTokens.borderColor,
                    borderRadius: resolvedTokens.radii.input,
                  }}
                />
                <button
                  type="submit"
                  className="h-9 px-3.5 text-xs font-bold cursor-pointer shrink-0"
                  style={resolvedTokens.primaryButtonStyle}
                >
                  Find
                </button>
              </div>
            </form>

            {recentOrders.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pt-1">
                {recentOrders.map((entry) => (
                  <button
                    key={entry.order_code}
                    type="button"
                    onClick={() => {
                      setIsRecentOrdersOpen(false);
                      onNavigateOrder?.(entry.order_code);
                    }}
                    className="w-full p-3 border flex items-center justify-between text-left cursor-pointer transition"
                    style={{
                      backgroundColor: resolvedTokens.subtleSurface,
                      borderColor: resolvedTokens.borderColor,
                      borderRadius: resolvedTokens.radii.media,
                    }}
                  >
                    <div>
                      <div className="text-xs font-mono font-bold">
                        {entry.order_code}
                      </div>
                      <div className="text-[11px]" style={{ color: resolvedTokens.mutedText }}>
                        {new Date(entry.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </div>
                    <div
                      className="text-xs font-bold"
                      style={{ color: resolvedTokens.primary }}
                    >
                      {entry.total ? formatINR(entry.total) : 'Open →'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center py-2" style={{ color: resolvedTokens.mutedText }}>
                No saved orders on this device yet. Enter your order code above to view links.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const PublicStorePage: React.FC<PublicStorePageProps> = ({ slug }) => {
  const [storeData, setStoreData] = useState<PublicStoreData | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [orderCode, setOrderCode] = useState<string | null>(() => getQueryOrderCode());
  const [orderState, setOrderState] = useState<PublicStoreOrderStatus | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [recentOrders, setRecentOrders] = useState<SavedOrderEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RECENT_ORDERS_KEY(slug));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

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

  useEffect(() => {
    const onPop = () => setOrderCode(getQueryOrderCode());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const updateMetaTags = useCallback(
    (title: string, description: string) => {
      if (typeof document === 'undefined') return;
      document.title = title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', description);
      }
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
    },
    []
  );

  const fetchStore = useCallback(async () => {
    setIsLoadingStore(true);
    setNotFound(false);
    setStoreError(null);
    try {
      const data = await getPublicStore(slug);
      setStoreData(data);
      const custom = data?.customization;
      const seoTitle =
        (custom?.meta_title && custom.meta_title.trim()) ||
        data?.store?.name ||
        'Online Store';
      const seoDesc =
        (custom?.meta_description && custom.meta_description.trim()) ||
        data?.store?.description ||
        '';
      updateMetaTags(seoTitle, seoDesc);
    } catch (err: any) {
      if (err?.status === 404) {
        setNotFound(true);
        updateMetaTags('Store not found', '');
      } else {
        setStoreError(sanitizeCustomerError(err, err?.status));
      }
    } finally {
      setIsLoadingStore(false);
    }
  }, [slug, updateMetaTags]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  useEffect(() => {
    if (orderCode) {
      saveOrderToHistory(orderCode);
    }
  }, [orderCode, saveOrderToHistory]);

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

  const navigateToOrder = (code: string | null) => {
    const url = code
      ? `/store/${encodeURIComponent(slug)}?order=${encodeURIComponent(code)}`
      : `/store/${encodeURIComponent(slug)}`;
    window.history.pushState({}, '', url);
    setOrderCode(code);
  };

  const handleRealCheckout = async (
    items: Array<{ product_id: string; qty: number }>,
    customer: {
      name: string;
      phone: string;
      email?: string;
      address?: string;
      note?: string;
    }
  ) => {
    const res = await checkoutPublicStore(slug, { items, customer });
    if (res?.order_code) {
      saveOrderToHistory(res.order_code, res.total);
    }
    if (res?.payment_url) {
      window.location.href = res.payment_url;
    } else if (res?.order_code) {
      navigateToOrder(res.order_code);
    } else {
      throw new Error('Checkout created without a payment link.');
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 grid place-items-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Store not found</h1>
          <p className="text-sm text-slate-500">
            The store link you opened does not exist or is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingStore) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="h-16 rounded-2xl border border-slate-200 bg-white" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-80 rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (storeError || !storeData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold">Could not open store</h1>
          <p className="text-sm text-slate-500">
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

  return (
    <StorefrontRenderer
      store={storeData.store}
      products={storeData.products}
      customization={storeData.customization}
      orderCode={orderCode}
      orderState={orderState}
      isLoadingOrder={isLoadingOrder}
      orderError={orderError}
      recentOrders={recentOrders}
      onNavigateOrder={navigateToOrder}
      onSubmitOrder={handleRealCheckout}
    />
  );
};

export default PublicStorePage;
