import { apiCall, publicApiCall, API_URL } from './api';

export interface ThemePreview {
  bg: string;
  base: string;
  surface: string;
  text: string;
  accent: string;
  accent2: string;
  on_accent: string;
}

export interface ThemeItem {
  id: string;
  name: string;
  group: 'Dark' | 'Gradient' | 'Light';
  mode: 'dark' | 'light';
  preview: ThemePreview;
}

export interface ShapeItem {
  id: 'sharp' | 'round' | 'pill';
  name: string;
}

export interface FontItem {
  id: 'modern' | 'classic' | 'mono' | 'rounded';
  name: string;
  stack: string;
}

export interface CustomizeThemesCatalog {
  themes: ThemeItem[];
  shapes: ShapeItem[];
  fonts: FontItem[];
  accent_presets: string[];
  limits: {
    brand_name: number;
    logo_url: number;
    footer: number;
  };
  defaults: {
    theme: string;
    shape: string;
    font: string;
  };
}

export interface BrandingVars {
  '--hp-bg': string;
  '--hp-bg-base': string;
  '--hp-surface': string;
  '--hp-surface-2': string;
  '--hp-border': string;
  '--hp-text': string;
  '--hp-muted': string;
  '--hp-accent': string;
  '--hp-accent-2': string;
  '--hp-on-accent': string;
  '--hp-grad': string;
  '--hp-glow': string;
  '--hp-accent-soft': string;
  '--hp-ok': string;
  '--hp-warn': string;
  '--hp-bad': string;
  '--hp-radius': string;
  '--hp-radius-sm': string;
  '--hp-radius-btn': string;
  '--hp-font': string;
  [key: string]: string;
}

export interface BrandingObject {
  theme_id?: string;
  theme_name?: string;
  mode: 'dark' | 'light';
  custom_color: string | null;
  brand_name: string;
  logo_url: string | null;
  footer: string | null;
  shape?: string;
  font?: string;
  powered_by: string;
  vars: BrandingVars;
}

export interface CustomizeSettings {
  theme: string;
  color: string | null;
  brand_name: string | null;
  logo_url: string | null;
  footer: string | null;
  shape: 'sharp' | 'round' | 'pill' | string;
  font: 'modern' | 'classic' | 'mono' | 'rounded' | string;
}

export const DEFAULT_BRANDING: BrandingObject = {
  theme_id: 'default',
  theme_name: 'Crimson Night',
  mode: 'dark',
  custom_color: null,
  brand_name: '',
  logo_url: null,
  footer: null,
  shape: 'round',
  font: 'modern',
  powered_by: 'Hamro Pay',
  vars: {
    '--hp-bg': 'radial-gradient(ellipse at top, #2a0a14 0%, #0b0508 62%)',
    '--hp-bg-base': '#0b0508',
    '--hp-surface': '#150a0e',
    '--hp-surface-2': '#1e0f15',
    '--hp-border': '#3a1522',
    '--hp-text': '#fff4f6',
    '--hp-muted': '#c9a3ae',
    '--hp-accent': '#ff2d55',
    '--hp-accent-2': '#be123c',
    '--hp-on-accent': '#ffffff',
    '--hp-grad': 'linear-gradient(135deg, #ff2d55, #be123c)',
    '--hp-glow': 'rgba(255, 45, 85, 0.35)',
    '--hp-accent-soft': 'rgba(255, 45, 85, 0.14)',
    '--hp-ok': '#34d399',
    '--hp-warn': '#fbbf24',
    '--hp-bad': '#fb7185',
    '--hp-radius': '20px',
    '--hp-radius-sm': '12px',
    '--hp-radius-btn': '12px',
    '--hp-font': "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  }
};

let cachedCatalog: CustomizeThemesCatalog | null = null;
let catalogPromise: Promise<CustomizeThemesCatalog> | null = null;

export const getCustomizeThemes = async (): Promise<CustomizeThemesCatalog> => {
  if (cachedCatalog) return cachedCatalog;
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/customize/themes`);
      if (!res.ok) {
        throw new Error(`Failed to load themes (HTTP ${res.status})`);
      }
      const json = await res.json();
      const catalogData = json?.data || json;
      cachedCatalog = catalogData;
      return catalogData;
    } finally {
      catalogPromise = null;
    }
  })();

  return catalogPromise;
};

export const getCustomizeConfig = async (): Promise<{ settings: CustomizeSettings; branding: BrandingObject }> => {
  const data = await apiCall('/api/customize');
  return {
    settings: data.settings,
    branding: data.branding
  };
};

export const updateCustomizeConfig = async (
  draft: Partial<CustomizeSettings>
): Promise<{ settings: CustomizeSettings; branding: BrandingObject }> => {
  const data = await apiCall('/api/customize', 'PUT', draft);
  return {
    settings: data.settings,
    branding: data.branding
  };
};

let activePreviewAbort: AbortController | null = null;

export const previewCustomizeConfig = async (
  draft: CustomizeSettings
): Promise<BrandingObject> => {
  if (activePreviewAbort) {
    activePreviewAbort.abort();
  }
  const controller = new AbortController();
  activePreviewAbort = controller;

  try {
    const res = await fetch(`${API_URL}/api/customize/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`Preview failed (HTTP ${res.status})`);
    }

    const json = await res.json();
    return json?.data?.branding || json?.branding || json;
  } finally {
    if (activePreviewAbort === controller) {
      activePreviewAbort = null;
    }
  }
};

export const resetCustomizeConfig = async (): Promise<{ settings: CustomizeSettings; branding: BrandingObject }> => {
  const data = await apiCall('/api/customize/reset', 'POST');
  return {
    settings: data.settings,
    branding: data.branding
  };
};
