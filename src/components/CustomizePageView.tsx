import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Palette, Smartphone, Monitor, Maximize2, RotateCcw, Save, Undo2, 
  Search, Check, AlertCircle, RefreshCw, Sparkles, CheckCircle2, 
  Image as ImageIcon, Type, Square, X, PanelLeft
} from 'lucide-react';
import { 
  CustomizeThemesCatalog, 
  CustomizeSettings, 
  BrandingObject, 
  DEFAULT_BRANDING, 
  ThemeItem,
  getCustomizeThemes, 
  getCustomizeConfig, 
  updateCustomizeConfig, 
  previewCustomizeConfig, 
  resetCustomizeConfig 
} from '../services/customize.service';
import { CheckoutPreview } from './CheckoutPreview';

interface CustomizePageViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
  merchantName?: string;
}

export default function CustomizePageView({
  showToast,
  onOpenSidebar,
  onViewChange,
  merchantName = 'Demo Merchant'
}: CustomizePageViewProps) {
  // Page data states
  const [catalog, setCatalog] = useState<CustomizeThemesCatalog | null>(null);
  const [savedSettings, setSavedSettings] = useState<CustomizeSettings | null>(null);
  const [draft, setDraft] = useState<CustomizeSettings>({
    theme: 'crimson',
    color: null,
    brand_name: null,
    logo_url: null,
    footer: null,
    shape: 'round',
    font: 'modern'
  });

  const [activeBranding, setActiveBranding] = useState<BrandingObject>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Mobile Tabs: 'edit' | 'preview'
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  // Preview options
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [showTestSimulator, setShowTestSimulator] = useState<boolean>(false);
  const [isFullScreenPreview, setIsFullScreenPreview] = useState<boolean>(false);

  // Theme Gallery Filters
  const [themeFilter, setThemeFilter] = useState<'All' | 'Dark' | 'Gradient' | 'Light'>('All');
  const [themeSearch, setThemeSearch] = useState<string>('');

  // Reset Confirmation Modal
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Logo live test
  const [logoTestError, setLogoTestError] = useState<boolean>(false);

  // Debounced preview ref
  const previewTimerRef = useRef<any>(null);
  const latestDraftRef = useRef<CustomizeSettings>(draft);
  latestDraftRef.current = draft;

  // Unsaved changes check
  const hasChanges = useMemo(() => {
    if (!savedSettings) return false;
    return (
      draft.theme !== savedSettings.theme ||
      (draft.color || null) !== (savedSettings.color || null) ||
      (draft.brand_name || null) !== (savedSettings.brand_name || null) ||
      (draft.logo_url || null) !== (savedSettings.logo_url || null) ||
      (draft.footer || null) !== (savedSettings.footer || null) ||
      draft.shape !== savedSettings.shape ||
      draft.font !== savedSettings.font
    );
  }, [draft, savedSettings]);

  // Window beforeunload prompt when unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Load Catalog and Settings on Mount
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setFieldErrors({});

    try {
      const [themesRes, configRes] = await Promise.all([
        getCustomizeThemes(),
        getCustomizeConfig()
      ]);

      setCatalog(themesRes);
      setSavedSettings(configRes.settings);
      setDraft({
        theme: configRes.settings.theme || themesRes.defaults?.theme || 'crimson',
        color: configRes.settings.color || null,
        brand_name: configRes.settings.brand_name || null,
        logo_url: configRes.settings.logo_url || null,
        footer: configRes.settings.footer || null,
        shape: configRes.settings.shape || themesRes.defaults?.shape || 'round',
        font: configRes.settings.font || themesRes.defaults?.font || 'modern'
      });

      if (configRes.branding) {
        setActiveBranding(configRes.branding);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load customization data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced preview updates (200ms)
  const triggerDebouncedPreview = useCallback((currentDraft: CustomizeSettings) => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    previewTimerRef.current = setTimeout(async () => {
      try {
        const previewBranding = await previewCustomizeConfig(currentDraft);
        if (previewBranding && previewBranding.vars) {
          setActiveBranding(previewBranding);
        }
      } catch {
        // Silently keep last preview to avoid flicker
      }
    }, 200);
  }, []);

  // Update draft and trigger debounced preview
  const updateDraft = (updates: Partial<CustomizeSettings>) => {
    setDraft(prev => {
      const next = { ...prev, ...updates };
      triggerDebouncedPreview(next);
      return next;
    });

    // Clear field-specific error if user edited that field
    const keys = Object.keys(updates);
    if (keys.some(k => fieldErrors[k])) {
      setFieldErrors(prev => {
        const next = { ...prev };
        keys.forEach(k => delete next[k]);
        return next;
      });
    }
  };

  // Discard changes
  const handleDiscard = () => {
    if (!savedSettings) return;
    setDraft({ ...savedSettings });
    setFieldErrors({});
    triggerDebouncedPreview(savedSettings);
    showToast('Changes discarded', 'info');
  };

  // Reset to default
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await resetCustomizeConfig();
      setSavedSettings(res.settings);
      setDraft(res.settings);
      setActiveBranding(res.branding);
      setFieldErrors({});
      setShowResetModal(false);
      showToast('Reset to default checkout look successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset settings', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!hasChanges || isSaving) return;

    // Client-side quick checks
    if (draft.logo_url && draft.logo_url.trim()) {
      const trimmed = draft.logo_url.trim();
      if (!trimmed.startsWith('https://')) {
        setFieldErrors(prev => ({ ...prev, logo_url: 'Logo URL must start with https://' }));
        showToast('Please fix the highlighted fields', 'error');
        return;
      }
    }

    if (draft.color && draft.color.trim()) {
      const hex = draft.color.trim();
      if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
        setFieldErrors(prev => ({ ...prev, color: 'Please enter a valid hex color code (e.g. #ff2d55)' }));
        showToast('Please fix the highlighted fields', 'error');
        return;
      }
    }

    setIsSaving(true);
    setFieldErrors({});

    try {
      const payload: Partial<CustomizeSettings> = {
        theme: draft.theme,
        color: draft.color ? draft.color.trim() : null,
        brand_name: draft.brand_name ? draft.brand_name.trim() : null,
        logo_url: draft.logo_url ? draft.logo_url.trim() : null,
        footer: draft.footer ? draft.footer.trim() : null,
        shape: draft.shape,
        font: draft.font
      };

      const res = await updateCustomizeConfig(payload);
      setSavedSettings(res.settings);
      setDraft(res.settings);
      if (res.branding) {
        setActiveBranding(res.branding);
      }
      showToast('Saved. Customers will see the new look the next time they open the page.', 'success');
    } catch (err: any) {
      // Backend validation error (HTTP 400 with errors array)
      const errorsArr = err.data?.errors || err.errors;
      if (Array.isArray(errorsArr) && errorsArr.length > 0) {
        const errMap: Record<string, string> = {};
        errorsArr.forEach((e: any) => {
          if (e.field && e.msg) {
            errMap[e.field] = e.msg;
          }
        });
        setFieldErrors(errMap);
        showToast('Please fix the highlighted fields', 'error');
      } else {
        showToast(err.message || 'Failed to save customization', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered themes
  const filteredThemes = useMemo(() => {
    if (!catalog?.themes) return [];
    return catalog.themes.filter(t => {
      const matchesGroup = themeFilter === 'All' || t.group === themeFilter;
      const matchesSearch = !themeSearch.trim() || t.name.toLowerCase().includes(themeSearch.toLowerCase().trim());
      return matchesGroup && matchesSearch;
    });
  }, [catalog?.themes, themeFilter, themeSearch]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="page-content py-8 animate-pulse">
        <div className="h-8 w-64 bg-white/5 rounded-xl mb-4" />
        <div className="h-4 w-96 bg-white/5 rounded-lg mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-72 bg-white/5 rounded-2xl" />
            <div className="h-48 bg-white/5 rounded-2xl" />
            <div className="h-48 bg-white/5 rounded-2xl" />
          </div>
          <div className="lg:col-span-5">
            <div className="h-[600px] bg-white/5 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  // Load error state
  if (loadError) {
    return (
      <div className="page-content py-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Unable to Load Customize Page</h2>
        <p className="text-sm text-[#b89fa5] max-w-md mb-6">{loadError}</p>
        <button
          onClick={loadData}
          className="btn-primary inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const brandNameLimit = catalog?.limits?.brand_name || 40;
  const logoUrlLimit = catalog?.limits?.logo_url || 500;
  const footerLimit = catalog?.limits?.footer || 120;

  return (
    <div className="min-h-full pb-28">
      {/* Top Header */}
      <div className="border-b border-[rgba(255,45,85,0.18)] bg-[#070102]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#b89fa5] hover:text-white hover:bg-white/10 transition cursor-pointer md:hidden"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#b8002c] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,30,75,0.4)]">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">Customize Page</h1>
              {hasChanges && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="text-xs text-[#b89fa5]">Personalize the checkout appearance for your customers</p>
          </div>
        </div>

        {/* Mobile View Switcher Tabs */}
        <div className="flex lg:hidden items-center p-1 bg-black/40 border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setMobileTab('edit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              mobileTab === 'edit'
                ? 'bg-[rgba(255,45,85,0.2)] text-white border border-[rgba(255,45,85,0.4)]'
                : 'text-[#b89fa5] hover:text-white'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              mobileTab === 'preview'
                ? 'bg-[rgba(255,45,85,0.2)] text-white border border-[rgba(255,45,85,0.4)]'
                : 'text-[#b89fa5] hover:text-white'
            }`}
          >
            <span>Preview</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#2bf29a]" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="page-content pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ========================================================
              LEFT COLUMN: CUSTOMIZATION CONTROLS
             ======================================================== */}
          <div className={`lg:col-span-7 space-y-6 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
            
            {/* 1. THEMES GALLERY */}
            <div className="panel">
              <div className="panel-head mb-4">
                <div className="panel-title-wrap">
                  <div className="panel-icon">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="panel-title-text">
                    <h2>Checkout Themes</h2>
                    <p>Select a curated color palette for your payment page</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-[#ff94a7] bg-[rgba(255,30,75,0.12)] border border-[rgba(255,45,85,0.3)] px-2.5 py-1 rounded-full">
                  {catalog?.themes ? `${catalog.themes.length} themes` : '20 themes'}
                </div>
              </div>

              {/* Filter Chips + Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {(['All', 'Dark', 'Gradient', 'Light'] as const).map(grp => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setThemeFilter(grp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                        themeFilter === grp
                          ? 'bg-[rgba(255,45,85,0.25)] text-white border border-[rgba(255,60,95,0.5)] shadow-[0_0_12px_rgba(255,30,75,0.25)]'
                          : 'bg-white/5 text-[#b89fa5] hover:text-white border border-white/5'
                      }`}
                    >
                      {grp}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#83686e]" />
                  <input
                    type="text"
                    value={themeSearch}
                    onChange={e => setThemeSearch(e.target.value)}
                    placeholder="Search themes..."
                    className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-[#83686e] outline-none focus:border-[#ff4d6d]"
                  />
                  {themeSearch && (
                    <button
                      type="button"
                      onClick={() => setThemeSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#83686e] hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredThemes.map((item: ThemeItem) => {
                  const isSelected = draft.theme === item.id;
                  const p = item.preview;
                  return (
                    <div
                      key={item.id}
                      onClick={() => updateDraft({ theme: item.id })}
                      className={`group relative p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[rgba(255,45,85,0.12)] border-[#ff2d55] ring-2 ring-[rgba(255,45,85,0.4)] shadow-[0_4px_20px_rgba(255,30,75,0.25)]'
                          : 'bg-black/30 border-white/10 hover:border-white/25 hover:bg-white/5'
                      }`}
                    >
                      {/* Mini Preview Box */}
                      <div
                        className="w-full h-20 rounded-xl p-2 flex flex-col justify-between overflow-hidden shadow-inner relative"
                        style={{ background: p.bg || p.base }}
                      >
                        {/* Mini Inner Card */}
                        <div
                          className="w-full rounded-lg p-1.5 shadow-xs flex flex-col gap-1 border"
                          style={{
                            background: p.surface,
                            borderColor: p.accent ? `${p.accent}33` : 'rgba(255,255,255,0.1)'
                          }}
                        >
                          <div
                            className="h-1.5 w-10 rounded-full"
                            style={{ background: p.text }}
                          />
                          <div
                            className="h-1 w-14 rounded-full opacity-60"
                            style={{ background: p.text }}
                          />
                        </div>

                        {/* Mini Accent Button */}
                        <div
                          className="w-full h-4 rounded-md flex items-center justify-center text-[8px] font-black tracking-tight shadow-xs"
                          style={{
                            background: p.accent,
                            color: p.on_accent || '#ffffff'
                          }}
                        >
                          Pay
                        </div>
                      </div>

                      {/* Theme Name & Tag */}
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <div className="min-w-0">
                          <div className={`text-xs font-black truncate ${isSelected ? 'text-[#ff4d6d]' : 'text-white'}`}>
                            {item.name}
                          </div>
                          <span className="text-[9.5px] font-bold uppercase text-[#83686e]">
                            {item.mode}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#ff1e4b] flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. ACCENT COLOR */}
            <div className="panel">
              <div className="panel-head mb-3">
                <div className="panel-title-wrap">
                  <div className="panel-icon gold">
                    <span className="text-base font-black">#</span>
                  </div>
                  <div className="panel-title-text">
                    <h2>Accent Color</h2>
                    <p>Override button, link, and highlight colors</p>
                  </div>
                </div>
                {draft.color && (
                  <button
                    type="button"
                    onClick={() => updateDraft({ color: null })}
                    className="text-xs font-bold text-[#ff94a7] hover:text-white underline cursor-pointer"
                  >
                    Use theme color
                  </button>
                )}
              </div>

              {/* Swatches */}
              <div className="flex items-center gap-2.5 flex-wrap mb-4">
                {(catalog?.accent_presets || ['#ff2d55', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#6366f1']).map(c => {
                  const isCurrent = draft.color?.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateDraft({ color: c })}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 relative flex items-center justify-center cursor-pointer shadow-md"
                      style={{ background: c }}
                      title={c}
                    >
                      {isCurrent && (
                        <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                      )}
                    </button>
                  );
                })}

                {/* Native Color Picker */}
                <label className="w-8 h-8 rounded-full border-2 border-dashed border-white/30 hover:border-white/60 flex items-center justify-center cursor-pointer relative overflow-hidden bg-white/5 transition">
                  <input
                    type="color"
                    value={draft.color || '#ff2d55'}
                    onChange={e => updateDraft({ color: e.target.value })}
                    className="opacity-0 absolute inset-0 cursor-pointer"
                  />
                  <span className="text-[10px] font-black text-white">+</span>
                </label>
              </div>

              {/* Hex Input Row */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#83686e]">
                    HEX
                  </span>
                  <input
                    type="text"
                    value={draft.color || ''}
                    onChange={e => updateDraft({ color: e.target.value })}
                    placeholder="#ff2d55 (optional)"
                    className={`hp-input w-full pl-12 pr-4 py-2 text-xs font-mono ${
                      fieldErrors.color ? 'border-rose-500' : ''
                    }`}
                  />
                </div>
                <div
                  className="w-9 h-9 rounded-xl border border-white/20 shrink-0 shadow-sm"
                  style={{ background: draft.color || activeBranding.vars['--hp-accent'] || '#ff2d55' }}
                />
              </div>
              {fieldErrors.color && (
                <p className="text-xs font-bold text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{fieldErrors.color}</span>
                </p>
              )}
            </div>

            {/* 3. SHAPE & 4. FONT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* SHAPE */}
              <div className="panel mb-0">
                <div className="panel-head mb-3">
                  <div className="panel-title-wrap">
                    <div className="panel-icon blue">
                      <Square className="w-4 h-4 text-white" />
                    </div>
                    <div className="panel-title-text">
                      <h2>Corner Shape</h2>
                      <p>Card &amp; button radius</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sharp', name: 'Sharp', radiusClass: 'rounded-none' },
                    { id: 'round', name: 'Rounded', radiusClass: 'rounded-lg' },
                    { id: 'pill', name: 'Pill', radiusClass: 'rounded-full' }
                  ].map(s => {
                    const isSelected = draft.shape === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateDraft({ shape: s.id })}
                        className={`p-2.5 flex flex-col items-center gap-2 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[rgba(255,45,85,0.15)] border-[#ff2d55] text-white shadow-[0_0_12px_rgba(255,30,75,0.2)]'
                            : 'bg-black/30 border-white/10 text-[#b89fa5] hover:text-white'
                        } rounded-xl`}
                      >
                        <div
                          className={`w-12 h-6 border-2 flex items-center justify-center text-[9px] font-bold ${s.radiusClass} ${
                            isSelected ? 'border-[#ff4d6d] bg-[#ff1e4b]/20 text-white' : 'border-white/30 text-[#83686e]'
                          }`}
                        >
                          Button
                        </div>
                        <span className="text-[11px] font-black">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FONT */}
              <div className="panel mb-0">
                <div className="panel-head mb-3">
                  <div className="panel-title-wrap">
                    <div className="panel-icon purple">
                      <Type className="w-4 h-4 text-white" />
                    </div>
                    <div className="panel-title-text">
                      <h2>Typography</h2>
                      <p>Heading &amp; text font</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'modern', name: 'Modern', stack: "Inter, system-ui, -apple-system, sans-serif" },
                    { id: 'classic', name: 'Classic', stack: "Georgia, Cambria, 'Times New Roman', serif" },
                    { id: 'mono', name: 'Monospace', stack: "'SF Mono', Monaco, Menlo, Consolas, monospace" },
                    { id: 'rounded', name: 'Rounded', stack: "'Quicksand', 'Nunito', system-ui, sans-serif" }
                  ].map(f => {
                    const isSelected = draft.font === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updateDraft({ font: f.id })}
                        style={{ fontFamily: f.stack }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[rgba(255,45,85,0.15)] border-[#ff2d55] text-white shadow-[0_0_12px_rgba(255,30,75,0.2)]'
                            : 'bg-black/30 border-white/10 text-[#b89fa5] hover:text-white'
                        }`}
                      >
                        <div className="text-sm font-extrabold">{f.name}</div>
                        <div className="text-[10px] opacity-60">Rs 499.00</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 5. BRANDING & TEXT */}
            <div className="panel">
              <div className="panel-head mb-4">
                <div className="panel-title-wrap">
                  <div className="panel-icon green">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="panel-title-text">
                    <h2>Merchant Branding</h2>
                    <p>Customize brand identity, logo, and footer text</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Brand Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold text-[#fff2f4]">Brand / Shop Name</label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.brand_name || '').length}/{brandNameLimit}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={brandNameLimit}
                    value={draft.brand_name || ''}
                    onChange={e => updateDraft({ brand_name: e.target.value })}
                    placeholder="Your shop name (e.g. Apex Store)"
                    className={`hp-input w-full px-3.5 py-2.5 text-xs font-semibold ${
                      fieldErrors.brand_name ? 'border-rose-500' : ''
                    }`}
                  />
                  {fieldErrors.brand_name && (
                    <p className="text-xs font-bold text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{fieldErrors.brand_name}</span>
                    </p>
                  )}
                </div>

                {/* Logo URL */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold text-[#fff2f4]">Logo Image URL (HTTPS)</label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.logo_url || '').length}/{logoUrlLimit}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      maxLength={logoUrlLimit}
                      value={draft.logo_url || ''}
                      onChange={e => {
                        setLogoTestError(false);
                        updateDraft({ logo_url: e.target.value });
                      }}
                      placeholder="https://.../logo.png"
                      className={`hp-input flex-1 px-3.5 py-2.5 text-xs font-mono ${
                        fieldErrors.logo_url || logoTestError ? 'border-rose-500' : ''
                      }`}
                    />
                    {draft.logo_url && draft.logo_url.trim() && (
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={draft.logo_url.trim()}
                          alt="Logo preview"
                          className="max-h-full max-w-full object-contain"
                          onError={() => setLogoTestError(true)}
                          onLoad={() => setLogoTestError(false)}
                        />
                      </div>
                    )}
                  </div>
                  {logoTestError && (
                    <p className="text-xs font-bold text-amber-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Could not load image. Make sure the URL is direct and public.</span>
                    </p>
                  )}
                  {fieldErrors.logo_url && (
                    <p className="text-xs font-bold text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{fieldErrors.logo_url}</span>
                    </p>
                  )}
                </div>

                {/* Footer Text */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold text-[#fff2f4]">Custom Footer Help Text</label>
                    <span className="text-[10px] font-mono text-[#83686e]">
                      {(draft.footer || '').length}/{footerLimit}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={footerLimit}
                    value={draft.footer || ''}
                    onChange={e => updateDraft({ footer: e.target.value })}
                    placeholder="Need help? WhatsApp +91 98765 43210 or email support@example.com"
                    className={`hp-input w-full px-3.5 py-2.5 text-xs font-semibold ${
                      fieldErrors.footer ? 'border-rose-500' : ''
                    }`}
                  />
                  {fieldErrors.footer && (
                    <p className="text-xs font-bold text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{fieldErrors.footer}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>


          {/* ========================================================
              RIGHT COLUMN: LIVE STICKY PREVIEW
             ======================================================== */}
          <div className={`lg:col-span-5 ${mobileTab === 'edit' ? 'hidden lg:block' : 'block'}`}>
            <div className="lg:sticky lg:top-24 space-y-3">
              
              {/* Preview Toolbar */}
              <div className="p-3 rounded-2xl bg-[#0f0407] border border-[rgba(255,45,85,0.18)] flex items-center justify-between gap-2 shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white px-2">Preview</span>
                  <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        previewDevice === 'mobile'
                          ? 'bg-[rgba(255,45,85,0.25)] text-white shadow-xs'
                          : 'text-[#83686e] hover:text-white'
                      }`}
                      title="Mobile View (360px)"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        previewDevice === 'desktop'
                          ? 'bg-[rgba(255,45,85,0.25)] text-white shadow-xs'
                          : 'text-[#83686e] hover:text-white'
                      }`}
                      title="Desktop View (520px)"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#b89fa5] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showTestSimulator}
                      onChange={e => setShowTestSimulator(e.target.checked)}
                      className="accent-[#ff2d55] rounded"
                    />
                    <span>Test mode</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsFullScreenPreview(true)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#b89fa5] hover:text-white border border-white/10 transition cursor-pointer"
                    title="Full Screen Preview"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview Container Frame */}
              <div className="rounded-3xl border border-[rgba(255,45,85,0.2)] bg-[#070102] p-2 flex justify-center shadow-2xl overflow-hidden min-h-[560px]">
                <div
                  className="w-full transition-all duration-300 flex justify-center"
                  style={{ maxWidth: previewDevice === 'mobile' ? '360px' : '520px' }}
                >
                  <CheckoutPreview
                    branding={activeBranding}
                    merchantName={draft.brand_name || merchantName}
                    isTestMode={showTestSimulator}
                    className="rounded-2xl border border-white/5 shadow-inner"
                  />
                </div>
              </div>

              <div className="text-center text-[11px] text-[#83686e] font-medium">
                Real customer pages (<code className="text-[#ff94a7]">/pay/lnk_...</code> &amp; <code className="text-[#ff94a7]">/pay/HP...</code>) use these exact styles.
              </div>
            </div>
          </div>

        </div>
      </div>


      {/* ========================================================
          STICKY SAVE / ACTION BAR AT BOTTOM
         ======================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b0204]/95 backdrop-blur-xl border-t border-[rgba(255,45,85,0.2)] px-4 sm:px-8 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b89fa5] hover:text-white transition cursor-pointer px-2 py-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#ff4d6d]" />
              <span>Reset to default</span>
            </button>
            {hasChanges && (
              <span className="hidden sm:inline-block text-xs font-bold text-amber-300">
                You have unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#b89fa5] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="btn-primary px-5 py-2.5 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>


      {/* ========================================================
          FULL SCREEN PREVIEW MODAL
         ======================================================== */}
      {isFullScreenPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-white">Full Screen Customer View</span>
              <span className="text-xs text-[#83686e]">({activeBranding.theme_name || draft.theme})</span>
            </div>
            <button
              onClick={() => setIsFullScreenPreview(false)}
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center pb-8">
            <div className="w-full max-w-[420px]">
              <CheckoutPreview
                branding={activeBranding}
                merchantName={draft.brand_name || merchantName}
                isTestMode={showTestSimulator}
                className="rounded-3xl border border-white/10 shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}


      {/* ========================================================
          RESET CONFIRMATION MODAL
         ======================================================== */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#140408] border border-[rgba(255,45,85,0.3)] p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white mb-2">Reset Checkout Appearance?</h3>
            <p className="text-xs text-[#b89fa5] leading-relaxed mb-6">
              Reset the checkout page to the default look? Any custom colors, theme selection, or overrides will return to the platform default.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white transition cursor-pointer shadow-md"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
