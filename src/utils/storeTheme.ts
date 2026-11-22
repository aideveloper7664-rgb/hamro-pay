import { PublicStoreProduct, StoreCustomization } from '../types';

export const DEFAULT_STORE_CUSTOMIZATION: StoreCustomization = {
  preset: 'classic',
  mode: 'light',
  primary_color: '#e11d48',
  accent_color: '#fb7185',
  background_color: '#f8fafc',
  text_color: '#0f172a',
  card_color: '#ffffff',
  announcement_color: '#e11d48',
  font: 'inter',
  radius: 'lg',
  card_style: 'border',
  button_style: 'solid',
  button_text: 'Add',
  layout: 'grid',
  columns_mobile: 1,
  header_style: 'left',
  banner_url: null,
  hero_title: null,
  hero_subtitle: null,
  announcement: null,
  sort_default: 'newest',
  show_search: true,
  show_sort: false,
  show_stock: true,
  show_description: true,
  hide_branding: false,
  whatsapp: null,
  instagram: null,
  facebook: null,
  telegram: null,
  website: null,
  footer_text: null,
  shipping_policy: null,
  return_policy: null,
  meta_title: null,
  meta_description: null,
};

export const STORE_PRESET_PATCHES: Record<string, Partial<StoreCustomization>> = {
  classic: {
    mode: 'light',
    primary_color: '#e11d48',
    accent_color: '#fb7185',
    background_color: '#f8fafc',
    text_color: '#0f172a',
    card_color: '#ffffff',
    announcement_color: '#be123c',
    radius: 'lg',
    card_style: 'border',
    button_style: 'solid',
    font: 'inter',
  },
  modern: {
    mode: 'dark',
    primary_color: '#6366f1',
    accent_color: '#06b6d4',
    background_color: '#09090b',
    text_color: '#f4f4f5',
    card_color: '#18181b',
    announcement_color: '#4f46e5',
    radius: 'lg',
    card_style: 'border',
    button_style: 'gradient',
    font: 'poppins',
  },
  minimal: {
    mode: 'light',
    primary_color: '#18181b',
    accent_color: '#52525b',
    background_color: '#ffffff',
    text_color: '#18181b',
    card_color: '#fafafa',
    announcement_color: '#18181b',
    radius: 'sm',
    card_style: 'flat',
    button_style: 'outline',
    font: 'inter',
  },
  bold: {
    mode: 'dark',
    primary_color: '#ff1e4b',
    accent_color: '#f59e0b',
    background_color: '#0b0406',
    text_color: '#fff5f7',
    card_color: '#18080d',
    announcement_color: '#d8002f',
    radius: 'md',
    card_style: 'shadow',
    button_style: 'gradient',
    font: 'montserrat',
  },
  soft: {
    mode: 'light',
    primary_color: '#0d9488',
    accent_color: '#34d399',
    background_color: '#f5f7f6',
    text_color: '#1e293b',
    card_color: '#ffffff',
    announcement_color: '#0f766e',
    radius: 'full',
    card_style: 'shadow',
    button_style: 'solid',
    font: 'nunito',
  },
};

export interface StoreFontMeta {
  label: string;
  cssFamily: string;
  googleSpec?: string;
}

export const STORE_FONT_CONFIG: Record<string, StoreFontMeta> = {
  inter: {
    label: 'Inter',
    cssFamily: "'Inter', system-ui, -apple-system, sans-serif",
    googleSpec: 'Inter:wght@400;500;600;700;800',
  },
  poppins: {
    label: 'Poppins',
    cssFamily: "'Poppins', system-ui, -apple-system, sans-serif",
    googleSpec: 'Poppins:wght@400;500;600;700;800',
  },
  nunito: {
    label: 'Nunito',
    cssFamily: "'Nunito', system-ui, -apple-system, sans-serif",
    googleSpec: 'Nunito:wght@400;500;600;700;800',
  },
  roboto: {
    label: 'Roboto',
    cssFamily: "'Roboto', system-ui, -apple-system, sans-serif",
    googleSpec: 'Roboto:wght@400;500;700',
  },
  playfair: {
    label: 'Playfair Display',
    cssFamily: "'Playfair Display', Georgia, serif",
    googleSpec: 'Playfair+Display:wght@500;600;700;800',
  },
  montserrat: {
    label: 'Montserrat',
    cssFamily: "'Montserrat', system-ui, -apple-system, sans-serif",
    googleSpec: 'Montserrat:wght@400;500;600;700;800',
  },
  mono: {
    label: 'JetBrains Mono',
    cssFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
    googleSpec: 'JetBrains+Mono:wght@400;500;600;700',
  },
};

export function loadStoreGoogleFont(fontKey?: string | null): void {
  if (typeof document === 'undefined') return;
  const key = String(fontKey || 'inter').toLowerCase();
  const meta = STORE_FONT_CONFIG[key] || STORE_FONT_CONFIG.inter;
  if (!meta.googleSpec) return;

  const href = `https://fonts.googleapis.com/css2?family=${meta.googleSpec}&display=swap`;
  const id = 'hp-storefront-google-font';
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (link) {
    if (link.href !== href) {
      link.href = href;
    }
    return;
  }
  link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function getStoreFontFamily(fontKey?: string | null): string {
  const key = String(fontKey || 'inter').toLowerCase();
  return (STORE_FONT_CONFIG[key] || STORE_FONT_CONFIG.inter).cssFamily;
}

export function isValidHex(value?: string | null): boolean {
  if (!value) return false;
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeHex(value: string | undefined | null, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = normalizeHex(hex, '#000000').slice(1);
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function isDarkColor(hex: string): boolean {
  const [r, g, b] = parseHexRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.52;
}

export function getContrastTextColor(bgHex: string): string {
  return isDarkColor(bgHex) ? '#ffffff' : '#0f172a';
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function sanitizeHttpUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeHttpsImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type SocialPlatform = 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'website';

export function buildSocialHref(
  platform: SocialPlatform,
  raw?: string | null
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (platform === 'whatsapp') {
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(trimmed)) {
      return sanitizeHttpUrl(trimmed);
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return null;
    return `https://wa.me/${digits}`;
  }

  if (platform === 'website') {
    return sanitizeHttpUrl(trimmed);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return sanitizeHttpUrl(trimmed);
  }

  const handle = trimmed.replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!handle) return null;

  if (platform === 'instagram') return `https://instagram.com/${handle}`;
  if (platform === 'facebook') return `https://facebook.com/${handle}`;
  if (platform === 'telegram') return `https://t.me/${handle}`;
  return null;
}

export function buildTelHref(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[^\d+]/g, '');
  if (cleaned.replace(/\D/g, '').length < 6) return null;
  return `tel:${cleaned}`;
}

export function mergeStoreCustomization(
  partial?: Partial<StoreCustomization> | null,
  fallback: StoreCustomization = DEFAULT_STORE_CUSTOMIZATION
): StoreCustomization {
  if (!partial) return { ...fallback };
  return {
    ...fallback,
    ...partial,
    primary_color: normalizeHex(partial.primary_color, fallback.primary_color),
    accent_color: normalizeHex(partial.accent_color, fallback.accent_color),
    background_color: normalizeHex(partial.background_color, fallback.background_color),
    text_color: normalizeHex(partial.text_color, fallback.text_color),
    card_color: normalizeHex(partial.card_color, fallback.card_color),
    announcement_color: normalizeHex(
      partial.announcement_color,
      fallback.announcement_color
    ),
    button_text:
      partial.button_text !== undefined && partial.button_text !== null
        ? String(partial.button_text)
        : fallback.button_text,
    columns_mobile:
      partial.columns_mobile !== undefined && partial.columns_mobile !== null
        ? Number(partial.columns_mobile) || fallback.columns_mobile
        : fallback.columns_mobile,
  };
}

export const SAMPLE_PREVIEW_PRODUCTS: PublicStoreProduct[] = [
  {
    id: 'sample-1',
    name: 'Signature Starter Pack',
    description: 'Instant digital delivery with priority support included.',
    price: 299,
    image_url: null,
    in_stock: true,
    stock: 14,
  },
  {
    id: 'sample-2',
    name: 'Creator Pro Bundle',
    description: 'Complete toolkit with lifetime updates and bonus templates.',
    price: 799,
    image_url: null,
    in_stock: true,
    stock: 5,
  },
  {
    id: 'sample-3',
    name: 'Minimalist Desk Kit',
    description: 'Handcrafted everyday essentials for a clean workspace.',
    price: 499,
    image_url: null,
    in_stock: true,
    stock: null,
  },
  {
    id: 'sample-4',
    name: 'Limited Edition Pass',
    description: 'Exclusive seasonal release with member perks.',
    price: 149,
    image_url: null,
    in_stock: false,
    stock: 0,
  },
];
