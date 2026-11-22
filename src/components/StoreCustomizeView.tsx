import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Store,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { getStore, getStoreProducts } from '../services/store.service';
import { ShowToastFn } from '../services/plans.service';
import { StoreConfig, StoreProduct } from '../types';
import StoreDesignTab from './StoreDesignTab';

interface StoreCustomizeViewProps {
  showToast: ShowToastFn;
  onViewChange: (view: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function StoreCustomizeView({
  showToast,
  onViewChange,
  onDirtyChange,
}: StoreCustomizeViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [store, setStore] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);

  const loadStoreContext = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const storeRes = await getStore();
      setStore(storeRes.store);
      if (storeRes.store) {
        const prodList = await getStoreProducts().catch(() => [] as StoreProduct[]);
        setProducts(prodList);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load store details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoreContext();
  }, [loadStoreContext]);

  const publicStoreUrl = store
    ? store.url && store.url.startsWith('http')
      ? store.url
      : `${typeof window !== 'undefined' ? window.location.origin : ''}/store/${store.slug}`
    : '';
  const localStorePath = store ? `/store/${store.slug}` : '';

  if (isLoading) {
    return (
      <div className="page-content space-y-6 animate-pulse">
        <div className="h-14 w-72 rounded-2xl bg-white/10" />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-6 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/5" />
            ))}
          </div>
          <div className="xl:col-span-6 h-[560px] rounded-3xl bg-white/5" />
        </div>
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
          <h2 className="text-lg font-black text-white">Unable to Load Store Customization</h2>
          <p className="text-xs text-[#b89fa5] mt-1 max-w-sm">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={loadStoreContext}
          className="btn-primary px-5 py-2.5 text-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="page-content animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both] py-12">
        <div className="max-w-lg mx-auto rounded-2xl bg-gradient-to-br from-[rgba(28,7,12,0.88)] to-[rgba(12,2,6,0.96)] border border-[rgba(255,45,85,0.22)] p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#7c5cf0] grid place-items-center text-white shadow-[0_0_24px_rgba(167,139,250,0.35)]">
            <Store className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-black text-white">Create your store first</h1>
            <p className="text-xs text-[#b89fa5] leading-relaxed">
              Set up your store name, link slug, and products in My Store before customizing your storefront theme and layout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onViewChange('store')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-black shadow-[0_8px_24px_rgba(255,30,75,0.35)] hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <span>Open My Store</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both] space-y-6 pb-14">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-[46px] h-[46px] rounded-[13px] bg-gradient-to-br from-[#a78bfa] to-[#7c5cf0] grid place-items-center text-white shrink-0 shadow-[0_0_22px_rgba(167,139,250,0.4)]">
            <Palette className="w-[22px] h-[22px]" />
          </div>
          <div>
            <h1 className="text-[22px] font-black tracking-[-0.6px] text-white">
              Store Customization
            </h1>
            <p className="text-[13px] text-[#b89fa5] font-medium mt-0.5">
              Design {store.name} with live preview before publishing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onViewChange('store')}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-[11px] bg-white/5 hover:bg-white/10 border border-white/12 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
          >
            <Store className="w-3.5 h-3.5 text-[#ff4d6d]" />
            <span>My Store</span>
          </button>
          <a
            href={localStorePath || publicStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] bg-gradient-to-br from-[#ff1e4b] to-[#d8002f] text-white text-xs font-extrabold shadow-[0_8px_24px_rgba(255,30,75,0.35)] hover:brightness-110 active:scale-95 transition whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open my store</span>
          </a>
        </div>
      </div>

      <StoreDesignTab
        store={store}
        products={products}
        showToast={showToast}
        onViewChange={onViewChange}
        onDirtyChange={onDirtyChange}
      />
    </div>
  );
}
