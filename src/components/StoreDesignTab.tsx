import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Palette,
  LayoutGrid,
  Image as ImageIcon,
  SlidersHorizontal,
  Share2,
  FileText,
  Search as SearchIcon,
  ChevronDown,
  Lock,
  RotateCcw,
  Save,
  Loader2,
  AlertCircle,
  Smartphone,
  Monitor,
  Sparkles,
  Check,
  Undo2,
  ArrowUpRight,
} from 'lucide-react';
import {
  getStoreCustomization,
  resetStoreCustomization,
  updateStoreCustomization,
} from '../services/store.service';
import { ShowToastFn } from '../services/plans.service';
import {
  PublicStoreProduct,
  StoreConfig,
  StoreCustomization,
  StoreCustomizeOptions,
  StoreProduct,
} from '../types';
import { StorefrontRenderer } from '../pages/store/PublicStorePage';
import {
  DEFAULT_STORE_CUSTOMIZATION,
  isValidHex,
  mergeStoreCustomization,
  SAMPLE_PREVIEW_PRODUCTS,
  STORE_FONT_CONFIG,
  STORE_PRESET_PATCHES,
} from '../utils/storeTheme';

interface StoreDesignTabProps {
  store: StoreConfig;
  products: StoreProduct[];
  showToast: ShowToastFn;
  onViewChange: (view: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type AccordionId =
  | 'theme'
  | 'layout'
  | 'header'
  | 'products'
  | 'social'
  | 'policies'
  | 'seo';

const COLOR_FIELDS: Array<{
  key: keyof Pick<
    StoreCustomization,
    | 'primary_color'
    | 'accent_color'
    | 'background_color'
    | 'text_color'
    | 'card_color'
    | 'announcement_color'
  >;
  label: string;
}> = [
  { key: 'primary_color', label: 'Primary' },
  { key: 'accent_color', label: 'Accent' },
  { key: 'background_color', label: 'Background' },
  { key: 'text_color', label: 'Text' },
  { key: 'card_color', label: 'Card Surface' },
  { key: 'announcement_color', label: 'Announcement Bar' },
];

const formatOptionLabel = (key: string, val: string | number): string => {
  const s = String(val);
  if (key === 'font' && STORE_FONT_CONFIG[s]?.label) {
    return STORE_FONT_CONFIG[s].label;
  }
  if (key === 'columns_mobile') {
    return s === '2' ? '2 Columns' : '1 Column';
  }
  if (key === 'sort_default') {
    const map: Record<string, string> = {
      newest: 'Newest First',
      oldest: 'Oldest First',
      price_asc: 'Price: Low to High',
      price_desc: 'Price: High to Low',
      name_asc: 'Name: A–Z',
      name_desc: 'Name: Z–A',
      featured: 'Featured',
    };
    if (map[s]) return map[s];
  }
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const normalizeValueForCompare = (val: unknown): unknown => {
  if (val === undefined || val === '') return null;
  if (typeof val === 'string') return val;
  return val;
};

export default function StoreDesignTab({
  store,
  products,
  showToast,
  onViewChange,
  onDirtyChange,
}: StoreDesignTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saved, setSaved] = useState<StoreCustomization>(DEFAULT_STORE_CUSTOMIZATION);
  const [draft, setDraft] = useState<StoreCustomization>(DEFAULT_STORE_CUSTOMIZATION);
  const [options, setOptions] = useState<StoreCustomizeOptions>({});
  const [textLimits, setTextLimits] = useState<Record<string, number>>({});
  const [canHideBranding, setCanHideBranding] = useState(false);

  const [openSection, setOpenSection] = useState<AccordionId | null>('theme');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [brandingLockedError, setBrandingLockedError] = useState<string | null>(null);

  const loadCustomization = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getStoreCustomization();
      const mergedDefaults = mergeStoreCustomization(
        res.defaults,
        DEFAULT_STORE_CUSTOMIZATION
      );
      const mergedCurrent = mergeStoreCustomization(
        res.customization,
        mergedDefaults
      );
      setSaved(mergedCurrent);
      setDraft(mergedCurrent);
      setOptions(res.options || {});
      setTextLimits(res.text_limits || {});
      setCanHideBranding(Boolean(res.can_hide_branding));
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load store design settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomization();
  }, [loadCustomization]);

  const changedPatch = useMemo(() => {
    const patch: Partial<StoreCustomization> = {};
    (Object.keys(draft) as Array<keyof StoreCustomization>).forEach((key) => {
      const cur = normalizeValueForCompare(draft[key]);
      const orig = normalizeValueForCompare(saved[key]);
      if (cur !== orig) {
        (patch as any)[key] = draft[key] === '' ? null : draft[key];
      }
    });
    return patch;
  }, [draft, saved]);

  const dirtyCount = Object.keys(changedPatch).length;
  const isDirty = dirtyCount > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateField = <K extends keyof StoreCustomization>(
    key: K,
    value: StoreCustomization[K]
  ) => {
    setInlineError(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectPreset = (presetKey: string) => {
    setInlineError(null);
    const palette = STORE_PRESET_PATCHES[presetKey];
    setDraft((prev) => ({
      ...prev,
      preset: presetKey,
      ...(palette || {}),
    }));
  };

  const handleSelectMode = (modeKey: string) => {
    setInlineError(null);
    setDraft((prev) => {
      const next: StoreCustomization = { ...prev, mode: modeKey };
      const bgLow = prev.background_color.toLowerCase();
      if (
        modeKey === 'dark' &&
        (bgLow === '#f8fafc' || bgLow === '#ffffff' || bgLow === '#f5f7f6')
      ) {
        next.background_color = '#09090b';
        next.text_color = '#f4f4f5';
        next.card_color = '#18181b';
      } else if (
        modeKey === 'light' &&
        (bgLow === '#09090b' || bgLow === '#0b0b0e' || bgLow === '#0b0406')
      ) {
        next.background_color = '#f8fafc';
        next.text_color = '#0f172a';
        next.card_color = '#ffffff';
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setInlineError(null);
    setBrandingLockedError(null);

    // Quick client check on hex fields before sending
    for (const { key, label } of COLOR_FIELDS) {
      if (changedPatch[key] && !isValidHex(String(draft[key]))) {
        setInlineError(`${label} color must be a valid #rrggbb hex code.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const updated = await updateStoreCustomization(changedPatch);
      const merged = mergeStoreCustomization(updated, draft);
      setSaved(merged);
      setDraft(merged);
      showToast('Store design saved and live!', 'success');
    } catch (err: any) {
      const code = String(err?.code || err?.data?.code || '').toUpperCase();
      if (err?.status === 403 && code === 'PLAN_FEATURE') {
        setCanHideBranding(false);
        setDraft((prev) => ({ ...prev, hide_branding: false }));
        const msg =
          err?.message ||
          'Hiding HamroPay branding requires the ADVANCE or ELITE plan.';
        setBrandingLockedError(msg);
        setOpenSection('products');
        showToast(msg, 'error');
      } else {
        const msg = err?.message || 'Failed to save design settings.';
        setInlineError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetConfirm = async () => {
    setIsResetting(true);
    setInlineError(null);
    setBrandingLockedError(null);
    try {
      const resetData = await resetStoreCustomization();
      const merged = mergeStoreCustomization(
        resetData,
        DEFAULT_STORE_CUSTOMIZATION
      );
      setSaved(merged);
      setDraft(merged);
      setIsResetModalOpen(false);
      showToast('Store design reset to defaults.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not reset store design.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const getLimit = (field: string, fallback: number): number =>
    Number(textLimits[field] ?? fallback);

  const previewProducts: PublicStoreProduct[] = useMemo(() => {
    const active = products
      .filter((p) => p.is_active !== false)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || null,
        price: Number(p.price),
        image_url: p.image_url || null,
        in_stock: p.stock === null || p.stock === undefined || p.stock > 0,
        stock: p.stock ?? null,
      }));
    return active.length > 0 ? active : SAMPLE_PREVIEW_PRODUCTS;
  }, [products]);

  const usingSampleProducts = products.filter((p) => p.is_active !== false).length === 0;

  const getOptionsList = (key: keyof StoreCustomizeOptions, fallback: Array<string | number>) => {
    const list = options[key];
    return Array.isArray(list) && list.length > 0 ? list : fallback;
  };

  const renderAccordionHeader = (
    id: AccordionId,
    title: string,
    subtitle: string,
    icon: React.ReactNode
  ) => {
    const isOpen = openSection === id;
    return (
      <button
        type="button"
        onClick={() => setOpenSection(isOpen ? null : id)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-white/[0.03] transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[rgba(255,30,75,0.12)] border border-[rgba(255,45,85,0.22)] grid place-items-center text-[#ff4d6d] shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white">{title}</div>
            <div className="text-[11px] text-[#9b7e85] truncate">{subtitle}</div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#9b7e85] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-pulse">
        <div className="xl:col-span-6 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/5" />
          ))}
        </div>
        <div className="xl:col-span-6 h-[560px] rounded-3xl bg-white/5" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl bg-[rgba(18,4,8,0.85)] border border-rose-500/30 p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <div className="text-sm font-black text-white">Could not load Design studio</div>
        <p className="text-xs text-[#b89fa5]">{loadError}</p>
        <button
          type="button"
          onClick={loadCustomization}
          className="px-4 py-2 rounded-xl bg-[#ff1e4b] text-white text-xs font-bold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[rgba(20,5,10,0.85)] border border-[rgba(255,45,85,0.18)]">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[#ff4d6d] shrink-0" />
          <div>
            <div className="text-xs font-black text-white">Storefront Designer</div>
            <p className="text-[11px] text-[#b89fa5]">
              Customize colors, layout, policies, and SEO with instant live preview
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsResetModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#d4c2c7] hover:text-white flex items-center gap-1.5 cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset design</span>
        </button>
      </div>

      {inlineError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/12 border border-rose-500/35 flex items-start gap-2.5 text-xs font-semibold text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{inlineError}</span>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls + Sticky Save Bar */}
        <div className="xl:col-span-6 space-y-3">
          {/* 1. THEME */}
          <section className="rounded-2xl bg-[rgba(20,5,10,0.88)] border border-[rgba(255,45,85,0.18)] overflow-hidden">
            {renderAccordionHeader(
              'theme',
              'Theme & Colors',
              'Preset, light/dark mode, colors, font, shape, button',
              <Palette className="w-4 h-4" />
            )}

            {openSection === 'theme' && (
              <div className="px-4 pb-5 pt-2 border-t border-white/10 space-y-4">
                {/* Preset */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Style Preset
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {getOptionsList('preset', ['classic', 'modern', 'minimal', 'bold', 'soft']).map(
                      (item) => {
                        const val = String(item);
                        const active = draft.preset === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleSelectPreset(val)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              active
                                ? 'bg-[#ff1e4b] border-[#ff1e4b] text-white'
                                : 'bg-black/45 border-white/10 text-[#d4c2c7] hover:border-white/25'
                            }`}
                          >
                            {formatOptionLabel('preset', val)}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Mode */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Color Mode
                  </label>
                  <div className="inline-flex p-1 rounded-xl bg-black/50 border border-white/10 gap-1">
                    {getOptionsList('mode', ['light', 'dark', 'auto']).map((item) => {
                      const val = String(item);
                      const active = draft.mode === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleSelectMode(val)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            active
                              ? 'bg-white/15 text-white'
                              : 'text-[#9b7e85] hover:text-white'
                          }`}
                        >
                          {formatOptionLabel('mode', val)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Pickers */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Palette Colors
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {COLOR_FIELDS.map(({ key, label }) => {
                      const val = String(draft[key] || '#000000');
                      const valid = isValidHex(val);
                      return (
                        <div
                          key={key}
                          className="p-2.5 rounded-xl bg-black/45 border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="color"
                              value={valid ? val : '#e11d48'}
                              onChange={(e) => updateField(key, e.target.value)}
                              aria-label={`${label} color picker`}
                              className="w-8 h-8 rounded-lg border border-white/15 bg-transparent cursor-pointer shrink-0 p-0"
                            />
                            <span className="text-xs font-bold text-[#e5d2d6] truncate">
                              {label}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={val}
                            maxLength={7}
                            onChange={(e) => updateField(key, e.target.value)}
                            className={`w-[82px] px-2 py-1 rounded-lg bg-black/60 border text-[11px] font-mono text-white outline-none ${
                              valid
                                ? 'border-white/15 focus:border-[#ff4d6d]'
                                : 'border-rose-500'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Typography */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Font Family
                  </label>
                  <select
                    value={draft.font}
                    onChange={(e) => updateField('font', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-bold text-white outline-none focus:border-[#ff4d6d]"
                  >
                    {getOptionsList('font', [
                      'inter',
                      'poppins',
                      'nunito',
                      'roboto',
                      'playfair',
                      'montserrat',
                      'mono',
                    ]).map((item) => {
                      const val = String(item);
                      return (
                        <option key={val} value={val} className="bg-[#120306]">
                          {formatOptionLabel('font', val)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Radius & Card Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Corner Radius
                    </label>
                    <select
                      value={draft.radius}
                      onChange={(e) => updateField('radius', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-bold text-white outline-none focus:border-[#ff4d6d]"
                    >
                      {getOptionsList('radius', ['none', 'sm', 'md', 'lg', 'full']).map(
                        (item) => {
                          const val = String(item);
                          return (
                            <option key={val} value={val} className="bg-[#120306]">
                              {formatOptionLabel('radius', val)}
                            </option>
                          );
                        }
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Card Style
                    </label>
                    <select
                      value={draft.card_style}
                      onChange={(e) => updateField('card_style', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-bold text-white outline-none focus:border-[#ff4d6d]"
                    >
                      {getOptionsList('card_style', ['flat', 'shadow', 'border']).map(
                        (item) => {
                          const val = String(item);
                          return (
                            <option key={val} value={val} className="bg-[#120306]">
                              {formatOptionLabel('card_style', val)}
                            </option>
                          );
                        }
                      )}
                    </select>
                  </div>
                </div>

                {/* Button Style & CTA Text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Button Style
                    </label>
                    <select
                      value={draft.button_style}
                      onChange={(e) => updateField('button_style', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-bold text-white outline-none focus:border-[#ff4d6d]"
                    >
                      {getOptionsList('button_style', ['solid', 'outline', 'gradient']).map(
                        (item) => {
                          const val = String(item);
                          return (
                            <option key={val} value={val} className="bg-[#120306]">
                              {formatOptionLabel('button_style', val)}
                            </option>
                          );
                        }
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                        Button Text
                      </label>
                      <span className="text-[10px] font-mono text-[#83686e]">
                        {(draft.button_text || '').length}/{getLimit('button_text', 24)}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={draft.button_text || ''}
                      maxLength={getLimit('button_text', 24)}
                      onChange={(e) => updateField('button_text', e.target.value)}
                      placeholder="Add"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-semibold text-white outline-none focus:border-[#ff4d6d]"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 2. LAYOUT */}
          <section className="rounded-2xl bg-[rgba(20,5,10,0.88)] border border-[rgba(255,45,85,0.18)] overflow-hidden">
            {renderAccordionHeader(
              'layout',
              'Layout & Catalog Grid',
              'Card density, mobile columns, default sort order',
              <LayoutGrid className="w-4 h-4" />
            )}

            {openSection === 'layout' && (
              <div className="px-4 pb-5 pt-2 border-t border-white/10 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Product Layout
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {getOptionsList('layout', ['grid', 'list', 'compact']).map((item) => {
                      const val = String(item);
                      const active = draft.layout === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => updateField('layout', val)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            active
                              ? 'bg-[#ff1e4b] border-[#ff1e4b] text-white'
                              : 'bg-black/45 border-white/10 text-[#d4c2c7] hover:border-white/25'
                          }`}
                        >
                          {formatOptionLabel('layout', val)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Mobile Grid Columns
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {getOptionsList('columns_mobile', [1, 2]).map((item) => {
                        const num = Number(item);
                        const active = Number(draft.columns_mobile) === num;
                        return (
                          <button
                            key={String(item)}
                            type="button"
                            onClick={() => updateField('columns_mobile', num)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              active
                                ? 'bg-white/15 border-white/30 text-white'
                                : 'bg-black/45 border-white/10 text-[#9b7e85] hover:text-white'
                            }`}
                          >
                            {formatOptionLabel('columns_mobile', num)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Default Sort
                    </label>
                    <select
                      value={draft.sort_default}
                      onChange={(e) => updateField('sort_default', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-bold text-white outline-none focus:border-[#ff4d6d]"
                    >
                      {getOptionsList('sort_default', [
                        'newest',
                        'price_asc',
                        'price_desc',
                        'name_asc',
                      ]).map((item) => {
                        const val = String(item);
                        return (
                          <option key={val} value={val} className="bg-[#120306]">
                            {formatOptionLabel('sort_default', val)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 3. HEADER & BANNER */}
          <section className="rounded-2xl bg-[rgba(20,5,10,0.88)] border border-[rgba(255,45,85,0.18)] overflow-hidden">
            {renderAccordionHeader(
              'header',
              'Header & Banner',
              'Header alignment, hero image, headline, announcement bar',
              <ImageIcon className="w-4 h-4" />
            )}

            {openSection === 'header' && (
              <div className="px-4 pb-5 pt-2 border-t border-white/10 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Header Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {getOptionsList('header_style', ['left', 'center', 'banner']).map(
                      (item) => {
                        const val = String(item);
                        const active = draft.header_style === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => updateField('header_style', val)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              active
                                ? 'bg-[#ff1e4b] border-[#ff1e4b] text-white'
                                : 'bg-black/45 border-white/10 text-[#d4c2c7] hover:border-white/25'
                            }`}
                          >
                            {formatOptionLabel('header_style', val)}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    Banner Image URL (HTTPS)
                  </label>
                  <input
                    type="url"
                    value={draft.banner_url || ''}
                    maxLength={getLimit('banner_url', 500)}
                    onChange={(e) =>
                      updateField('banner_url', e.target.value || null)
                    }
                    placeholder="https://example.com/banner.jpg"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-white outline-none focus:border-[#ff4d6d]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Hero Title
                    </label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.hero_title || '').length}/{getLimit('hero_title', 80)}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={draft.hero_title || ''}
                    maxLength={getLimit('hero_title', 80)}
                    onChange={(e) =>
                      updateField('hero_title', e.target.value || null)
                    }
                    placeholder={store.name}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-semibold text-white outline-none focus:border-[#ff4d6d]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Hero Subtitle
                    </label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.hero_subtitle || '').length}/{getLimit('hero_subtitle', 180)}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={draft.hero_subtitle || ''}
                    maxLength={getLimit('hero_subtitle', 180)}
                    onChange={(e) =>
                      updateField('hero_subtitle', e.target.value || null)
                    }
                    placeholder={store.description || 'Short welcome tagline for shoppers...'}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none focus:border-[#ff4d6d] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Announcement Bar
                    </label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.announcement || '').length}/{getLimit('announcement', 120)}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={draft.announcement || ''}
                    maxLength={getLimit('announcement', 120)}
                    onChange={(e) =>
                      updateField('announcement', e.target.value || null)
                    }
                    placeholder="Leave empty to hide top announcement strip"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-semibold text-white outline-none focus:border-[#ff4d6d]"
                  />
                </div>
              </div>
            )}
          </section>

          {/* 4. PRODUCTS & VISIBILITY */}
          <section className="rounded-2xl bg-[rgba(20,5,10,0.88)] border border-[rgba(255,45,85,0.18)] overflow-hidden">
            {renderAccordionHeader(
              'products',
              'Products & Store Toggles',
              'Search bar, sort picker, stock count, descriptions, branding',
              <SlidersHorizontal className="w-4 h-4" />
            )}

            {openSection === 'products' && (
              <div className="px-4 pb-5 pt-2 border-t border-white/10 space-y-2.5">
                {(
                  [
                    {
                      key: 'show_search',
                      label: 'Show search bar',
                      desc: 'Let shoppers filter your catalog by keyword',
                    },
                    {
                      key: 'show_sort',
                      label: 'Show sort dropdown',
                      desc: 'Allow visitors to change product sort order',
                    },
                    {
                      key: 'show_stock',
                      label: 'Show stock badge',
                      desc: 'Display remaining stock count on product cards',
                    },
                    {
                      key: 'show_description',
                      label: 'Show product descriptions',
                      desc: 'Show short description lines beneath item titles',
                    },
                  ] as const
                ).map((item) => {
                  const enabled = Boolean(draft[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updateField(item.key, !enabled)}
                      className="w-full p-3 rounded-xl bg-black/45 border border-white/10 flex items-center justify-between gap-3 text-left cursor-pointer hover:border-white/20"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{item.label}</div>
                        <div className="text-[11px] text-[#9b7e85]">{item.desc}</div>
                      </div>
                      <div
                        className={`w-10 h-5.5 rounded-full p-0.5 transition-colors shrink-0 ${
                          enabled ? 'bg-emerald-500' : 'bg-white/15'
                        }`}
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                            enabled ? 'translate-x-4.5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}

                {/* Hide Branding (ADVANCE+) */}
                <div className="p-3 rounded-xl bg-black/45 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Hide &ldquo;Powered by HamroPay&rdquo;
                        </span>
                        {!canHideBranding && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black inline-flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            ADVANCE+
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9b7e85] mt-0.5">
                        Remove platform footer branding on your public store
                      </div>
                    </div>

                    {canHideBranding ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateField('hide_branding', !draft.hide_branding)
                        }
                        className="cursor-pointer shrink-0"
                        aria-label="Toggle hide branding"
                      >
                        <div
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                            draft.hide_branding ? 'bg-emerald-500' : 'bg-white/15'
                          }`}
                        >
                          <div
                            className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                              draft.hide_branding ? 'translate-x-4.5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onViewChange('pricing')}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-[11px] font-black flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>Upgrade</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {brandingLockedError && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-[11px] text-amber-200">
                      <span>{brandingLockedError}</span>
                      <button
                        type="button"
                        onClick={() => onViewChange('pricing')}
                        className="font-black text-amber-300 underline cursor-pointer shrink-0"
                      >
                        View Plans
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 5. CONTACT & SOCIAL */}
          <section className="rounded-2xl bg-[rgba(20,5,10,0.88)] border border-[rgba(255,45,85,0.18)] overflow-hidden">
            {renderAccordionHeader(
              'social',
              'Contact & Social Links',
              'WhatsApp, Instagram, Facebook, Telegram, website footer icons',
              <Share2 className="w-4 h-4" />
            )}

            {openSection === 'social' && (
              <div className="px-4 pb-5 pt-2 border-t border-white/10 space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                    WhatsApp Number (with country code)
                  </label>
                  <input
                    type="text"
                    value={draft.whatsapp || ''}
                    maxLength={getLimit('whatsapp', 40)}
                    onChange={(e) => updateField('whatsapp', e.target.value || null)}
                    placeholder="919876543210"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-white outline-none focus:border-[#ff4d6d]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Instagram (@handle or URL)
                    </label>
                    <input
                      type="text"
                      value={draft.instagram || ''}
                      maxLength={getLimit('instagram', 120)}
                      onChange={(e) =>
                        updateField('instagram', e.target.value || null)
                      }
                      placeholder="@yourstore"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none focus:border-[#ff4d6d]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Telegram (@handle or URL)
                    </label>
                    <input
                      type="text"
                      value={draft.telegram || ''}
                      maxLength={getLimit('telegram', 120)}
                      onChange={(e) =>
                        updateField('telegram', e.target.value || null)
                      }
                      placeholder="@yourchannel"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none focus:border-[#ff4d6d]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Facebook Page or URL
                    </label>
                    <input
                      type="text"
                      value={draft.facebook || ''}
                      maxLength={getLimit('facebook', 160)}
                      onChange={(e) =>
                        updateField('facebook', e.target.value || null)
                      }
                      placeholder="https://facebook.com/yourpage"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none focus:border-[#ff4d6d]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={draft.website || ''}
                      maxLength={getLimit('website', 200)}
                      onChange={(e) => updateField('website', e.target.value || null)}
                      placeholder="https://yourbrand.com"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-white outline-none focus:border-[#ff4d6d]"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 6. POLICIES & FOOTER */}
          <section className="rounded-2xl bg-[rgba(20,5,10,0.88)] border border-[rgba(255,45,85,0.18)] overflow-hidden">
            {renderAccordionHeader(
              'policies',
              'Policies & Footer',
              'Shipping terms, return policy, footer copyright text',
              <FileText className="w-4 h-4" />
            )}

            {openSection === 'policies' && (
              <div className="px-4 pb-5 pt-2 border-t border-white/10 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Shipping Policy
                    </label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.shipping_policy || '').length}/
                      {getLimit('shipping_policy', 1000)}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={draft.shipping_policy || ''}
                    maxLength={getLimit('shipping_policy', 1000)}
                    onChange={(e) =>
                      updateField('shipping_policy', e.target.value || null)
                    }
                    placeholder="Delivery timelines, digital fulfillment details..."
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none focus:border-[#ff4d6d] resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Return &amp; Refund Policy
                    </label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.return_policy || '').length}/
                      {getLimit('return_policy', 1000)}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={draft.return_policy || ''}
                    maxLength={getLimit('return_policy', 1000)}
                    onChange={(e) =>
                      updateField('return_policy', e.target.value || null)
                    }
                    placeholder="Conditions for returns, exchanges, or refunds..."
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none focus:border-[#ff4d6d] resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Footer Text
                    </label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.footer_text || '').length}/{getLimit('footer_text', 160)}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={draft.footer_text || ''}
                    maxLength={getLimit('footer_text', 160)}
                    onChange={(e) =>
                      updateField('footer_text', e.target.value || null)
                    }
                    placeholder="Support hours or copyright line..."
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none focus:border-[#ff4d6d]"
                  />
                </div>
              </div>
            )}
          </section>

          {/* 7. SEO */}
          <section className="rounded-2xl bg-[rgba(20,5,10,0.88)] border border-[rgba(255,45,85,0.18)] overflow-hidden">
            {renderAccordionHeader(
              'seo',
              'SEO & Link Preview',
              'Browser tab title and search meta description',
              <SearchIcon className="w-4 h-4" />
            )}

            {openSection === 'seo' && (
              <div className="px-4 pb-5 pt-2 border-t border-white/10 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Meta Title
                    </label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.meta_title || '').length}/{getLimit('meta_title', 70)}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={draft.meta_title || ''}
                    maxLength={getLimit('meta_title', 70)}
                    onChange={(e) =>
                      updateField('meta_title', e.target.value || null)
                    }
                    placeholder={store.name}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-semibold text-white outline-none focus:border-[#ff4d6d]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d4c2c7]">
                      Meta Description
                    </label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.meta_description || '').length}/
                      {getLimit('meta_description', 160)}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={draft.meta_description || ''}
                    maxLength={getLimit('meta_description', 160)}
                    onChange={(e) =>
                      updateField('meta_description', e.target.value || null)
                    }
                    placeholder={store.description || 'Summary shown in Google & link shares'}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none focus:border-[#ff4d6d] resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#83686e]">
                    Search Result Preview
                  </div>
                  <div className="text-xs font-bold text-[#60a5fa] truncate">
                    {draft.meta_title?.trim() || store.name}
                  </div>
                  <div className="text-[11px] text-[#2bf29a] font-mono truncate">
                    /store/{store.slug}
                  </div>
                  <div className="text-[11px] text-[#b89fa5] line-clamp-2">
                    {draft.meta_description?.trim() ||
                      store.description ||
                      'Shop directly with instant UPI checkout.'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Sticky Save Changes Bar */}
          <div className="sticky bottom-3 z-20 p-3.5 rounded-2xl bg-[#160409]/95 backdrop-blur-md border border-[rgba(255,45,85,0.3)] shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {isDirty ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white truncate">
                    {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}
                  </span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#2bf29a] shrink-0" />
                  <span className="text-xs font-semibold text-[#b89fa5] truncate">
                    All changes saved
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isDirty && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setDraft(saved);
                    setInlineError(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>
              )}

              <button
                type="button"
                disabled={!isDirty || isSaving}
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-xs font-black text-white shadow-lg shadow-rose-600/30 hover:brightness-110 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save changes'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Live Preview */}
        <div className="xl:col-span-6 xl:sticky xl:top-6 space-y-3">
          <div className="p-3.5 rounded-2xl bg-[rgba(20,5,10,0.88)] border border-[rgba(255,45,85,0.18)] flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black text-white flex items-center gap-2">
                <span>Live Store Preview</span>
                {usingSampleProducts && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-[#d4c2c7]">
                    Sample items
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#9b7e85]">
                Updates immediately before saving
              </div>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-black/50 border border-white/10 gap-1">
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-[#ff1e4b] text-white'
                    : 'text-[#9b7e85] hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'bg-[#ff1e4b] text-white'
                    : 'text-[#9b7e85] hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
            </div>
          </div>

          {previewDevice === 'mobile' ? (
            <div className="mx-auto w-full max-w-[380px] rounded-[38px] p-2.5 bg-[#120408] border-[3px] border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
              <div className="mx-auto w-24 h-4 rounded-full bg-black mb-2" />
              <div className="rounded-[26px] overflow-hidden border border-white/10 h-[620px] overflow-y-auto relative">
                <StorefrontRenderer
                  isPreview
                  previewDevice="mobile"
                  sortOptions={
                    options.sort_default?.map(String) || undefined
                  }
                  store={{
                    name: store.name,
                    slug: store.slug,
                    description: store.description,
                    logo_url: store.logo_url,
                    contact_phone: store.contact_phone,
                  }}
                  products={previewProducts}
                  customization={draft}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-white/15 shadow-2xl h-[640px] overflow-y-auto relative">
              <StorefrontRenderer
                isPreview
                previewDevice="desktop"
                sortOptions={options.sort_default?.map(String) || undefined}
                store={{
                  name: store.name,
                  slug: store.slug,
                  description: store.description,
                  logo_url: store.logo_url,
                  contact_phone: store.contact_phone,
                }}
                products={previewProducts}
                customization={draft}
              />
            </div>
          )}
        </div>
      </div>

      {/* Reset Design Confirmation Modal */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040102]/85 backdrop-blur-md"
          onClick={() => !isResetting && setIsResetModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#160409] border border-rose-500/35 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-white">Reset store design?</h3>
            <p className="text-xs text-[#d4c2c7] leading-relaxed">
              This will restore all colors, layout, banners, social links, policies, and SEO fields back to their defaults.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetConfirm}
                className="px-4 py-2 rounded-xl bg-[#ff1e4b] text-xs font-black text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Reset Design</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
