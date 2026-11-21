import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initialNotifications,
  defaultProfile
} from './data/initialData';
import { PaymentLink, Transaction, Notification, MerchantProfile, CurrentPlanState, PlanDefinition } from './types';
import { ApiService, getApiConfig, saveApiConfig, DEFAULT_API_BASE } from './lib/api';
import { clearHamroStorage, removeStaleCacheKeys } from './services/api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import DashboardView from './components/DashboardView';
import PaymentLinksView from './components/PaymentLinksView';
import WalletView from './components/WalletView';
import TransactionsView from './components/TransactionsView';
import PaytmConnectView from './components/PaytmConnectView';
import NotificationsView from './components/NotificationsView';
import PricingView from './components/PricingView';
import ProfileView from './components/ProfileView';
import ReferralView from './components/ReferralView';
import PromoView from './components/PromoView';
import SupportView from './components/SupportView';
import DeveloperPortalView from './components/DeveloperPortalView';
import FamPayConnectView from './components/FamPayConnectView';
import AmazonConnectView from './components/AmazonConnectView';
import CustomizePageView from './components/CustomizePageView';
import StorePortalView from './components/StorePortalView';
import { CashierAccount, getActiveCashier, getCashierList } from './services/cashier.service';
import { getCreditBalance } from './services/credits.service';
import { getWalletBalance } from './services/wallet.service';
import { setMode } from './services/developer.service';
import {
  getPlans,
  getCurrentPlan,
  getRequiredPlanName,
  hasDeveloperPortalAccess,
  hasApiDocsAccess,
  notifyApiOrPlanError,
  ShowToastFn,
} from './services/plans.service';
import UpgradeRequiredView from './components/UpgradeRequiredView';
import Modal from './components/Modal';
import CreatePaymentLinkModal from './components/CreatePaymentLinkModal';
import NoCashierWarningModal from './components/NoCashierWarningModal';
import Toast, { ToastItem } from './components/Toast';
import { Link as LinkIcon, Wallet, Info, Cloud, Wifi, HelpCircle, Key } from 'lucide-react';
import { PayPage } from './pages/pay/PayPage';
import { PublicStorePage } from './pages/store/PublicStorePage';
import { ApiDocsPage } from './pages/docs/ApiDocsPage';
import AuthCallback from './pages/AuthCallback';
import { supabase } from './config/supabase';

export default function App() {
  // --- Persistent State Synchronization (localStorage) ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('hamro_is_logged_in') === 'true';
  });

  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);

  const VALID_VIEWS = new Set([
    'dashboard', 'links', 'store', 'wallet', 'transactions', 'notifications', 'pricing',
    'profile', 'referral', 'promo', 'support', 'developer', 'api-docs',
    'api-integration', 'fampay', 'amazon', 'paytm', 'customize'
  ]);

  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.startsWith('/api/docs') || p.startsWith('/api/dosc') || p === '/docs' || p.startsWith('/docs')) {
        return 'api-docs';
      }
      try {
        const saved = localStorage.getItem('hamro_current_view');
        if (saved && VALID_VIEWS.has(saved)) {
          return saved;
        }
      } catch {
        // Ignore storage errors
      }
    }
    return 'dashboard';
  });

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p.startsWith('/api/docs') || p.startsWith('/api/dosc') || p === '/docs' || p.startsWith('/docs')) {
        setCurrentView('api-docs');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [credits, setCredits] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [activeCashier, setActiveCashier] = useState<CashierAccount | null>(null);
  const [plansCatalog, setPlansCatalog] = useState<PlanDefinition[]>([]);
  const [isPlanLoaded, setIsPlanLoaded] = useState<boolean>(false);
  const [currentPlanState, setCurrentPlanState] = useState<CurrentPlanState | null>(null);
  const [isLinksLoaded, setIsLinksLoaded] = useState<boolean>(false);
  const [isTransactionsLoaded, setIsTransactionsLoaded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const isRefreshingRef = useRef<boolean>(false);
  const lastSyncAtRef = useRef<number>(0);
  const plansCatalogRef = useRef<PlanDefinition[]>([]);
  plansCatalogRef.current = plansCatalog;

  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>(() => {
    try {
      const saved = localStorage.getItem('hamro_links');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('hamro_transactions');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const saved = localStorage.getItem('hamro_notifications');
      return saved ? JSON.parse(saved) : initialNotifications;
    } catch {
      return initialNotifications;
    }
  });

  const [profile, setProfile] = useState<MerchantProfile>(() => {
    try {
      const saved = localStorage.getItem('hamro_profile');
      return saved ? JSON.parse(saved) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const [gatewayMode, setGatewayMode] = useState<'live' | 'test'>('live');

  // --- API Connection Management States ---
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(() => {
    return getApiConfig().baseUrl;
  });
  const [apiEnabled, setApiEnabled] = useState<boolean>(() => {
    return getApiConfig().isEnabled;
  });
  const [isApiSimulated, setIsApiSimulated] = useState<boolean>(() => {
    return getApiConfig().isSimulatedFallback;
  });
  const [apiToken, setApiToken] = useState<string>(() => {
    return getApiConfig().token;
  });

  const refreshCredits = useCallback(async () => {
    try {
      const res: any = await getCreditBalance();
      const val = res?.data !== undefined ? res.data : res;
      const c = typeof val?.balance === 'number' ? val.balance : (typeof val === 'number' ? val : 0);
      setCredits(c);
    } catch {
      // Keep current credits on transient failure
    }
  }, []);

  const refreshActiveCashier = useCallback(async () => {
    try {
      const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      const apiKey = merchant.api_key || localStorage.getItem('hamropay_api_key') || '';
      const active = await getActiveCashier(apiKey || undefined);
      setActiveCashier(active);
    } catch {
      // Keep current cashier on transient failure
    }
  }, []);

  const applyPlanState = useCallback((nextState: CurrentPlanState) => {
    setCurrentPlanState(nextState);
    setIsPlanLoaded(true);
    removeStaleCacheKeys();
    try {
      const m = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      if (m && typeof m === 'object') {
        m.plan_name = nextState.plan.name;
        m.plan_expires_at = nextState.expires_at;
        localStorage.setItem('hamropay_merchant', JSON.stringify(m));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const refreshPlanState = useCallback(async (catalogOverride?: PlanDefinition[]) => {
    try {
      let catalog = catalogOverride || plansCatalogRef.current;
      if (!catalog || catalog.length === 0) {
        catalog = await getPlans().catch(() => []);
        if (catalog.length > 0) setPlansCatalog(catalog);
      }
      const cur = await getCurrentPlan(catalog);
      applyPlanState(cur);
      return cur;
    } catch {
      // Do not fabricate a plan on transient failure
      return null;
    } finally {
      setIsPlanLoaded(true);
    }
  }, [applyPlanState]);

  const [isSessionChecking, setIsSessionChecking] = useState<boolean>(true);

  const [apiStatus, setApiStatus] = useState<Record<string, { status: 'REAL' | 'SIMULATED'; route: string; error?: string }>>({
    auth: { status: 'SIMULATED', route: 'POST /api/auth/login' },
    paymentLinks: { status: 'SIMULATED', route: 'GET /api/payment' },
    balance: { status: 'SIMULATED', route: 'GET /api/user' },
    transactions: { status: 'SIMULATED', route: 'GET /api/withdrawal' },
    withdrawals: { status: 'SIMULATED', route: 'POST /api/withdrawal' },
    notifications: { status: 'SIMULATED', route: 'GET /api/notification' },
    profile: { status: 'SIMULATED', route: 'POST /api/user' },
    plans: { status: 'SIMULATED', route: 'POST /api/billing/checkout' },
    referral: { status: 'SIMULATED', route: 'GET /api/referral' },
    support: { status: 'SIMULATED', route: 'POST /api/support' }
  });

  // UI Control states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // Modals controller states
  const [activeModal, setActiveModal] = useState<'create_link' | 'add_funds' | 'api_settings' | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | number | null>(null);
  const [isNoCashierModalOpen, setIsNoCashierModalOpen] = useState<boolean>(false);
  
  // Form states inside modals
  const [modalLinkTitle, setModalLinkTitle] = useState('');
  const [modalLinkAmount, setModalLinkAmount] = useState('');
  const [modalLinkNote, setModalLinkNote] = useState('');
  const [modalLinkRedirect, setModalLinkRedirect] = useState('');
  const [modalLinkExpiry, setModalLinkExpiry] = useState<'7d' | '30d' | '90d' | 'never' | 'custom'>('7d');
  const [modalLinkUsageLimit, setModalLinkUsageLimit] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [modalFundAmount, setModalFundAmount] = useState('');

  // Form states for API settings
  const [modalApiUrlInput, setModalApiUrlInput] = useState(apiBaseUrl);
  const [modalApiEnabledInput, setModalApiEnabledInput] = useState(apiEnabled);
  const [modalApiTokenInput, setModalApiTokenInput] = useState(apiToken);

  // --- Effect syncs first-paint caches to local storage (only while logged in) ---
  useEffect(() => {
    localStorage.setItem('hamro_is_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('hamro_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      localStorage.setItem('hamro_links', JSON.stringify(paymentLinks));
    } catch {}
  }, [paymentLinks, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      localStorage.setItem('hamro_transactions', JSON.stringify(transactions));
    } catch {}
  }, [transactions, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      localStorage.setItem('hamro_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      localStorage.setItem('hamro_profile', JSON.stringify(profile));
    } catch {}
  }, [profile, isLoggedIn]);

  // Synchronize with API client helper on settings changes
  useEffect(() => {
    saveApiConfig({
      baseUrl: apiBaseUrl,
      isEnabled: apiEnabled,
      isSimulatedFallback: isApiSimulated,
      token: apiToken
    });
  }, [apiBaseUrl, apiEnabled, isApiSimulated, apiToken]);

  // Unified workspace refresh from backend (single source of truth)
  const refreshWorkspaceData = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    if (!isLoggedIn) return;
    const now = Date.now();
    if (!opts?.force) {
      if (isRefreshingRef.current) return;
      if (now - lastSyncAtRef.current < 5000) return;
    }

    isRefreshingRef.current = true;
    lastSyncAtRef.current = now;
    if (!opts?.silent) setIsRefreshing(true);

    try {
      removeStaleCacheKeys();

      let catalog = plansCatalogRef.current;
      const fetchedPlans = await getPlans().catch(() => catalog);
      if (Array.isArray(fetchedPlans) && fetchedPlans.length > 0) {
        catalog = fetchedPlans;
        setPlansCatalog(fetchedPlans);
      }

      const [
        planRes,
        walletRes,
        creditRes,
        linksRes,
        txRes,
        cashierListRes,
        activeCashierRes,
        profRes,
      ] = await Promise.allSettled([
        getCurrentPlan(catalog),
        getWalletBalance(),
        getCreditBalance(),
        ApiService.getLinks(),
        ApiService.getTransactions(),
        getCashierList(),
        getActiveCashier(),
        ApiService.getUserProfile(),
      ]);

      if (planRes.status === 'fulfilled' && planRes.value) {
        applyPlanState(planRes.value);
      } else {
        setIsPlanLoaded(true);
      }

      if (walletRes.status === 'fulfilled' && walletRes.value) {
        const w = walletRes.value;
        const nextBalance = Number(w.balance ?? (w as { available_balance?: number }).available_balance ?? 0);
        setBalance(nextBalance);
        if (typeof w.credits === 'number') {
          setCredits(w.credits);
        }
        try {
          const m = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
          if (w.plan_name) m.plan_name = w.plan_name;
          if (w.plan_expires_at !== undefined) m.plan_expires_at = w.plan_expires_at;
          localStorage.setItem('hamropay_merchant', JSON.stringify(m));
        } catch {}
      }

      if (creditRes.status === 'fulfilled' && creditRes.value !== undefined) {
        const raw: any = creditRes.value;
        const val = raw?.data !== undefined ? raw.data : raw;
        const c = typeof val?.balance === 'number' ? val.balance : (typeof val === 'number' ? val : 0);
        setCredits(c);
      }

      if (linksRes.status === 'fulfilled' && linksRes.value) {
        setPaymentLinks(linksRes.value.links);
        setIsLinksLoaded(true);
        setApiStatus(prev => ({ ...prev, paymentLinks: { status: 'REAL', route: 'GET /api/payment-link/list' } }));
      } else if (linksRes.status === 'rejected') {
        setIsLinksLoaded(true);
        setApiStatus(prev => ({
          ...prev,
          paymentLinks: { status: 'SIMULATED', route: 'GET /api/payment-link/list', error: linksRes.reason?.message }
        }));
      }

      if (txRes.status === 'fulfilled' && txRes.value) {
        setTransactions(txRes.value.transactions);
        setIsTransactionsLoaded(true);
        setApiStatus(prev => ({ ...prev, transactions: { status: 'REAL', route: 'GET /wallet/transactions' } }));
      } else if (txRes.status === 'rejected') {
        setIsTransactionsLoaded(true);
        setApiStatus(prev => ({
          ...prev,
          transactions: { status: 'SIMULATED', route: 'GET /wallet/transactions', error: txRes.reason?.message }
        }));
      }

      if (activeCashierRes.status === 'fulfilled') {
        setActiveCashier(activeCashierRes.value);
      } else if (cashierListRes.status === 'fulfilled' && Array.isArray(cashierListRes.value)) {
        const activeFromList = cashierListRes.value.find(c => Boolean(c.is_active ?? c.isActive)) || null;
        setActiveCashier(activeFromList);
      }

      if (profRes.status === 'fulfilled' && profRes.value?.success) {
        setProfile(prev => ({
          ...prev,
          name: profRes.value.profile.name || prev.name,
          email: profRes.value.profile.email || prev.email,
        }));
      }

      setApiStatus(prev => ({
        ...prev,
        auth: { status: 'REAL', route: 'GET /api/auth/me' },
        withdrawals: { status: 'REAL', route: 'POST /api/withdrawal' },
        plans: { status: 'REAL', route: 'GET /api/plans/current' },
        support: { status: 'REAL', route: 'POST /api/support' }
      }));
      setIsApiSimulated(false);
      setRefreshTick(t => t + 1);

      if (!opts?.silent) {
        showToast('Dashboard synced with server.', 'success');
      }
    } catch (err: any) {
      if (!opts?.silent) {
        showToast(err?.message || 'Failed to sync with server.', 'error');
      }
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [isLoggedIn, applyPlanState]);

  const handlePlanUpdated = useCallback((nextState: CurrentPlanState) => {
    applyPlanState(nextState);
    refreshWorkspaceData({ silent: true, force: true });
  }, [applyPlanState, refreshWorkspaceData]);

  const handleCashierChanged = useCallback(() => {
    refreshActiveCashier();
    refreshWorkspaceData({ silent: true, force: true });
  }, [refreshActiveCashier, refreshWorkspaceData]);

  useEffect(() => {
    getPlans()
      .then((list) => {
        if (list.length > 0) setPlansCatalog(list);
      })
      .catch(() => {});
  }, []);

  // --- Session restoration on mount ---
  useEffect(() => {
    const restoreSession = async () => {
      const config = getApiConfig();
      if (config.token) {
        setIsSessionChecking(true);
        try {
          removeStaleCacheKeys();
          const res = await ApiService.getMe();
          if (res.success && res.user) {
            setProfile({
              name: res.user.name,
              email: res.user.email,
              phone: res.user.phone || '',
              emailReceipts: res.user.emailReceipts ?? true,
              withdrawalAlerts: res.user.withdrawalAlerts ?? true
            });
            setApiToken(config.token);
            setIsLoggedIn(true);
            setIsApiSimulated(false);
            setApiStatus(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(k => {
                next[k] = { ...next[k], status: 'REAL' };
              });
              return next;
            });
          } else {
            console.warn('Session check fail:', res.error);
            setApiStatus(prev => ({
              ...prev,
              auth: { status: 'SIMULATED', route: 'GET /api/auth/me', error: res.error }
            }));
            if (res.error?.includes('Invalid token') || res.error?.includes('401')) {
              handleSignOut();
            }
          }
        } catch (err: any) {
          console.error('Session check error:', err);
          setApiStatus(prev => ({
            ...prev,
            auth: { status: 'SIMULATED', route: 'GET /api/auth/me', error: err.message }
          }));
        } finally {
          setIsSessionChecking(false);
        }
      } else {
        setIsSessionChecking(false);
      }
    };
    restoreSession();
  }, [apiBaseUrl]);

  useEffect(() => {
    let handling401 = false;
    const onUnauthorized = () => {
      if (handling401 || !isLoggedIn) return;
      handling401 = true;
      clearHamroStorage();
      setApiToken('');
      setIsLoggedIn(false);
      setIsPlanLoaded(false);
      setCurrentPlanState(null);
      setPaymentLinks([]);
      setTransactions([]);
      setCredits(0);
      setBalance(0);
      setActiveCashier(null);
      setAuthMode('login');
      showToast('Session expired or invalid API key. Please sign in again.', 'error');
    };
    window.addEventListener('hamropay:unauthorized', onUnauthorized);
    return () => window.removeEventListener('hamropay:unauthorized', onUnauthorized);
  }, [isLoggedIn]);

  // Initial sync on login + refetch on focus, visibilitychange, and 60s interval
  useEffect(() => {
    if (!isLoggedIn) return;

    refreshWorkspaceData({ silent: true, force: true });

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshWorkspaceData({ silent: true });
      }
    };

    const onWindowFocus = () => {
      refreshWorkspaceData({ silent: true });
    };

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshWorkspaceData({ silent: true });
      }
    }, 60000);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      window.clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [isLoggedIn, apiBaseUrl, refreshWorkspaceData]);

  // --- Global Toasts handlers ---
  const showToast: ShowToastFn = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    action?: { label: string; onClick: () => void }
  ) => {
    const newToast: ToastItem = {
      id: Date.now() + Math.random(),
      message,
      type,
      actionLabel: action?.label,
      onAction: action?.onClick,
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string | number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Login handler ---
  const handleLoginSuccess = (token: string, user: any) => {
    removeStaleCacheKeys();
    setApiToken(token);
    setIsApiSimulated(false);
    setIsPlanLoaded(false);
    setCurrentPlanState(null);
    setIsLinksLoaded(false);
    setIsTransactionsLoaded(false);

    // Save configurations
    saveApiConfig({
      baseUrl: apiBaseUrl,
      isEnabled: true,
      isSimulatedFallback: false,
      token: token
    });

    setProfile({
      name: user.name || 'Merchant User',
      email: user.email || '',
      phone: user.phone || '',
      emailReceipts: user.emailReceipts ?? true,
      withdrawalAlerts: user.withdrawalAlerts ?? true
    });

    setApiStatus(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], status: 'REAL' };
      });
      return next;
    });

    setIsLoggedIn(true);
    setCurrentView('dashboard');
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signout error:', err);
    }
    clearHamroStorage();
    setApiToken('');
    saveApiConfig({
      baseUrl: apiBaseUrl,
      isEnabled: apiEnabled,
      isSimulatedFallback: true,
      token: ''
    });
    setApiStatus(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], status: 'SIMULATED' };
      });
      return next;
    });
    setIsLoggedIn(false);
    setIsPlanLoaded(false);
    setCurrentPlanState(null);
    setIsLinksLoaded(false);
    setIsTransactionsLoaded(false);
    setPaymentLinks([]);
    setTransactions([]);
    setCredits(0);
    setBalance(0);
    setAuthMode(null);
    setActiveCashier(null);
    showToast('You have been signed out of your merchant workspace.', 'info');
  };

  // --- Notifications handler ---
  const handleMarkAllRead = async () => {
    const { isSimulated } = await ApiService.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    
    showToast('All alerts marked as read.', 'success');
  };

  const unreadNotificationsCount = notifications.filter(n => n.unread).length;

  const [togglingLinkId, setTogglingLinkId] = useState<string | number | null>(null);

  // --- Payment Link Builder Actions ---
  const handleToggleLinkActive = async (id: string | number) => {
    const link = paymentLinks.find(l => l.id === id);
    if (!link || togglingLinkId === id) return;

    const nextState = !link.active;
    const linkIdentifier = String(link.link_id || link.id);

    setTogglingLinkId(id);
    try {
      await ApiService.toggleLinkActive(linkIdentifier, nextState);
      setPaymentLinks(prev => prev.map(l => {
        if (l.id === id) {
          return { ...l, active: nextState };
        }
        return l;
      }));
      showToast(nextState ? 'Payment link enabled' : 'Payment link disabled', 'success');
      refreshWorkspaceData({ silent: true, force: true });
    } catch (err: any) {
      console.error('Toggle link active error:', err);
      const errMsg = err?.message || 'Failed to update link status';
      showToast(errMsg, 'error');
    } finally {
      setTogglingLinkId(null);
    }
  };

  const handleToggleLinkTestMode = async (id: string | number, nextIsTest: boolean) => {
    const link = paymentLinks.find(l => l.id === id);
    if (!link || togglingLinkId === id) return;

    const linkIdentifier = String(link.link_id || link.id);

    setTogglingLinkId(id);
    try {
      await ApiService.updateLink(linkIdentifier, { is_test: nextIsTest });
      setPaymentLinks(prev => prev.map(l => {
        if (l.id === id) {
          return { ...l, is_test: nextIsTest };
        }
        return l;
      }));
      showToast(nextIsTest ? 'Test mode enabled' : 'Live mode enabled', 'success');
      refreshWorkspaceData({ silent: true, force: true });
    } catch (err: any) {
      console.error('Toggle link test mode error:', err);
      const errMsg = err?.message || 'Failed to update test mode';
      showToast(errMsg, 'error');
    } finally {
      setTogglingLinkId(null);
    }
  };

  const handleOpenEditLink = (id: string | number) => {
    const link = paymentLinks.find(l => l.id === id);
    if (link) {
      setEditingLinkId(id);
      setModalLinkTitle(link.title);
      setModalLinkAmount(String(link.amount));
      setModalLinkNote(link.note || '');
      setModalLinkRedirect((link as any).redirectUrl || '');
      setModalLinkExpiry((link as any).expiry || '7d');
      setModalLinkUsageLimit((link as any).usageLimit ? String((link as any).usageLimit) : '');
      setIsAdvancedOpen(false);
      setActiveModal('create_link');
    }
  };

  const openCreateLinkDirectly = () => {
    setEditingLinkId(null);
    setModalLinkTitle('');
    setModalLinkAmount('');
    setModalLinkNote('');
    setModalLinkRedirect('');
    setModalLinkExpiry('7d');
    setModalLinkUsageLimit('');
    setIsAdvancedOpen(false);
    setActiveModal('create_link');
  };

  const handleOpenCreateLink = async () => {
    const merchant = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
    const apiKey = merchant.api_key || localStorage.getItem('hamropay_api_key') || '';

    try {
      const active = await getActiveCashier(apiKey);
      if (!active || !(active.upi_id || active.upiId || active.id)) {
        setIsNoCashierModalOpen(true);
      } else {
        openCreateLinkDirectly();
      }
    } catch (err: any) {
      console.error('Active cashier check error:', err);
      showToast('Could not verify payment account, try again', 'error');
    }
  };

  const handleDeleteLink = (id: string | number) => {
    setPaymentLinks(prev => prev.filter(l => l.id !== id && (l as any).link_id !== id));
    refreshWorkspaceData({ silent: true, force: true });
  };

  const handleSavePaymentLinkSubmit = async () => {
    const amountNum = parseFloat(modalLinkAmount);
    if (!modalLinkTitle.trim() || isNaN(amountNum) || amountNum <= 0) {
      showToast('Please specify a title and valid price amount.', 'error');
      return;
    }

    if (editingLinkId !== null) {
      // Edit Link mode
      try {
        const editLink = paymentLinks.find(l => l.id === editingLinkId);
        const linkIdentifier = String(editLink?.link_id || editingLinkId);
        await ApiService.updateLink(linkIdentifier, {
          title: modalLinkTitle.trim(),
          amount: amountNum,
          note: modalLinkNote.trim(),
          redirectUrl: modalLinkRedirect.trim(),
          expiry: modalLinkExpiry,
          usageLimit: modalLinkUsageLimit ? parseInt(modalLinkUsageLimit) : undefined
        });

        setPaymentLinks(prev => prev.map(l => {
          if (l.id === editingLinkId) {
            return {
              ...l,
              title: modalLinkTitle.trim(),
              amount: amountNum,
              note: modalLinkNote.trim(),
              redirectUrl: modalLinkRedirect.trim(),
              expiry: modalLinkExpiry,
              usageLimit: modalLinkUsageLimit ? parseInt(modalLinkUsageLimit) : undefined,
              date: 'Updated just now'
            };
          }
          return l;
        }));

        showToast('Payment link updated successfully.', 'success');
        setActiveModal(null);
        setEditingLinkId(null);
      } catch (err: any) {
        showToast(`Link update failed: ${err.message || 'Unknown error'}`, 'error');
      }
    } else {
      // Create New Link Mode
      const newLinkPayload = {
        title: modalLinkTitle.trim(),
        amount: amountNum,
        active: true,
        note: modalLinkNote.trim(),
        redirectUrl: modalLinkRedirect.trim(),
        expiry: modalLinkExpiry,
        usageLimit: modalLinkUsageLimit ? parseInt(modalLinkUsageLimit) : undefined
      };

      try {
        const { link } = await ApiService.createLink(newLinkPayload);
        const realId = link?.link_id || link?.id;
        if (!link || !realId) {
          throw new Error('No valid link_id returned from server');
        }

        setPaymentLinks(prev => [link, ...prev]);
        showToast('Payment link generated successfully.', 'success');
        setActiveModal(null);
        setEditingLinkId(null);
        refreshPlanState();
      } catch (err: any) {
        console.error('Link create failed:', err);
        const errMsg = err?.message || 'Unknown error';
        if (
          errMsg.toLowerCase().includes('connect fampay') || 
          errMsg.toLowerCase().includes('connect amazon') || 
          errMsg.toLowerCase().includes('connect paytm') || 
          errMsg.toLowerCase().includes('payment account first')
        ) {
          setActiveModal(null);
          setIsNoCashierModalOpen(true);
        } else if (
          errMsg.toLowerCase().includes('insufficient hamro credits') || 
          errMsg.toLowerCase().includes('insufficient credits')
        ) {
          showToast('Insufficient Hamro Credits: Please top up your wallet credits', 'error');
          setActiveModal(null);
          setCurrentView('wallet');
        } else {
          notifyApiOrPlanError(err, `Link create failed: ${errMsg}`, showToast, () => {
            setActiveModal(null);
            setCurrentView('pricing');
          });
        }
      }
    }
  };

  // --- API Sync Settings Action ---
  const handleSaveApiSettings = () => {
    let cleanUrl = modalApiUrlInput.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    if (!cleanUrl) {
      showToast('API Base URL cannot be empty.', 'error');
      return;
    }

    setApiBaseUrl(cleanUrl);
    setApiEnabled(modalApiEnabledInput);
    setApiToken(modalApiTokenInput.trim());
    setActiveModal(null);
    showToast('API configuration updated successfully.', 'success');
  };

  // --- Transactions CSV Exporter ---
  const handleExportTransactionsCSV = () => {
    const headers = 'Type,Reference ID,Customer/Destination,Amount,Status,Date\n';
    const rows = transactions.map(tx => {
      const typeStr = tx.type === 'withdrawal' ? 'Withdrawal' : 'Collection';
      const amtStr = tx.type === 'withdrawal' ? `-${tx.amount}` : `+${tx.amount}`;
      return `"${typeStr}","${tx.ref}","${tx.name.replace(/"/g, '""')}","${amtStr}","${tx.status}","${tx.date}"`;
    }).join('\n');

    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "hamropay-ledger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Transactions ledger CSV file downloaded successfully.', 'success');
  };

  // --- Render active viewport ---
  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            profileName={profile.name}
            balance={balance}
            credits={credits}
            paymentLinks={paymentLinks}
            transactions={transactions}
            currentPlanState={currentPlanState}
            isPlanLoaded={isPlanLoaded}
            onViewChange={setCurrentView}
            onCreatePaymentLink={handleOpenCreateLink}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            unreadNotifications={unreadNotificationsCount}
            showToast={showToast}
            onCashierChanged={handleCashierChanged}
            isRefreshing={isRefreshing}
            onRefresh={() => refreshWorkspaceData({ silent: false, force: true })}
            refreshTrigger={refreshTick}
          />
        );
      case 'links':
        return (
          <PaymentLinksView
            paymentLinks={paymentLinks}
            isLoading={!isLinksLoaded}
            onToggleActive={handleToggleLinkActive}
            onToggleTestMode={handleToggleLinkTestMode}
            togglingLinkId={togglingLinkId}
            onEditLink={handleOpenEditLink}
            onDeleteLink={handleDeleteLink}
            onCreateNewLink={handleOpenCreateLink}
            showToast={showToast}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onViewChange={setCurrentView}
            unreadNotifications={unreadNotificationsCount}
          />
        );
      case 'wallet':
        return (
          <WalletView
            onViewChange={setCurrentView}
            showToast={showToast}
            onRefreshWallet={() => refreshWorkspaceData({ silent: true, force: true })}
            onRefreshPlan={() => refreshWorkspaceData({ silent: true, force: true })}
          />
        );
      case 'transactions':
        return (
          <TransactionsView
            transactions={transactions}
            onExportCSV={handleExportTransactionsCSV}
          />
        );
      case 'notifications':
        return (
          <NotificationsView
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
          />
        );
      case 'pricing':
        return (
          <PricingView
            currentPlanState={currentPlanState}
            plansCatalog={plansCatalog}
            onPlanUpdated={handlePlanUpdated}
            showToast={showToast}
            onViewChange={setCurrentView}
          />
        );
      case 'profile':
        return (
          <ProfileView
            profile={profile}
            onProfileSave={handleProfileSave}
            showToast={showToast}
            onViewChange={setCurrentView}
            activeCashier={activeCashier}
            planState={currentPlanState}
            plansCatalog={plansCatalog}
            onApiKeyChanged={() => refreshWorkspaceData({ silent: true, force: true })}
          />
        );
      case 'referral':
        return <ReferralView showToast={showToast} />;
      case 'promo':
        return (
          <PromoView
            showToast={showToast}
            onRefreshWallet={() => refreshWorkspaceData({ silent: true, force: true })}
          />
        );
      case 'support':
        return (
          <SupportView 
            showToast={showToast} 
            profileName={profile.name} 
            profileEmail={profile.email} 
          />
        );
      
      case 'developer': {
        if (!isPlanLoaded || !currentPlanState) {
          return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 gap-3">
              <div className="w-48 h-4 rounded-lg bg-white/10 animate-pulse" />
              <div className="w-64 h-3 rounded-lg bg-white/5 animate-pulse" />
            </div>
          );
        }
        if (!hasDeveloperPortalAccess(currentPlanState.plan)) {
          const reqPortalPlan = getRequiredPlanName(
            plansCatalog,
            (p) => hasDeveloperPortalAccess(p),
            'BASIC'
          );
          return (
            <UpgradeRequiredView
              title="Upgrade required"
              message={`Developer Portal & API docs are available from the ${reqPortalPlan} plan`}
              requiredPlanName={reqPortalPlan}
              currentPlanName={currentPlanState.plan.name}
              pageTitle="Developer Portal"
              onUpgrade={() => setCurrentView('pricing')}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onOpenSidebar={() => setIsSidebarOpen(true)}
            />
          );
        }
        return (
          <DeveloperPortalView 
            showToast={showToast}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onViewChange={setCurrentView}
            gatewayMode={gatewayMode}
            setGatewayMode={setGatewayMode}
            activeCashier={activeCashier}
            planState={currentPlanState}
            plansCatalog={plansCatalog}
            onDeveloperUpdated={() => refreshWorkspaceData({ silent: true, force: true })}
          />
        );
      }

      case 'api-docs':
      case 'api-integration': {
        if (!isPlanLoaded || !currentPlanState) {
          return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 gap-3">
              <div className="w-48 h-4 rounded-lg bg-white/10 animate-pulse" />
              <div className="w-64 h-3 rounded-lg bg-white/5 animate-pulse" />
            </div>
          );
        }
        if (!hasApiDocsAccess(currentPlanState.plan)) {
          const reqDocsPlan = getRequiredPlanName(
            plansCatalog,
            (p) => hasApiDocsAccess(p),
            'BASIC'
          );
          return (
            <UpgradeRequiredView
              title="Upgrade required"
              message={`Developer Portal & API docs are available from the ${reqDocsPlan} plan`}
              requiredPlanName={reqDocsPlan}
              currentPlanName={currentPlanState.plan.name}
              pageTitle="API Documentation"
              onUpgrade={() => {
                if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
                setCurrentView('pricing');
              }}
              onBackToDashboard={() => {
                if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
                setCurrentView('dashboard');
              }}
              onOpenSidebar={() => setIsSidebarOpen(true)}
            />
          );
        }
        return (
          <ApiDocsPage 
            onBackToDashboard={() => {
              window.history.pushState({}, '', '/');
              setCurrentView('developer');
            }}
          />
        );
      }

      case 'paytm':
        return (
          <PaytmConnectView
            onViewChange={setCurrentView}
            showToast={showToast}
            onCashierChanged={handleCashierChanged}
            planState={currentPlanState}
            plansCatalog={plansCatalog}
          />
        );

      case 'amazon':
        return (
          <AmazonConnectView
            showToast={showToast}
            onViewChange={setCurrentView}
            onCashierChanged={handleCashierChanged}
            planState={currentPlanState}
            plansCatalog={plansCatalog}
          />
        );

      case 'fampay':
        return (
          <FamPayConnectView
            showToast={showToast}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onViewChange={setCurrentView}
            unreadNotifications={unreadNotificationsCount}
            onCashierChanged={handleCashierChanged}
            planState={currentPlanState}
            plansCatalog={plansCatalog}
          />
        );

      case 'customize':
        return (
          <CustomizePageView
            showToast={showToast}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onViewChange={setCurrentView}
            merchantName={profile.name}
            planState={currentPlanState}
            plansCatalog={plansCatalog}
          />
        );

      case 'store':
        return (
          <StorePortalView
            showToast={showToast}
            onViewChange={setCurrentView}
            activeCashier={activeCashier}
            planState={currentPlanState}
            onOpenNoCashierModal={() => setIsNoCashierModalOpen(true)}
          />
        );

      default:
        console.warn('Unknown view:', currentView);
        return (
          <DashboardView
            profileName={profile.name}
            balance={balance}
            credits={credits}
            paymentLinks={paymentLinks}
            transactions={transactions}
            currentPlanState={currentPlanState}
            isPlanLoaded={isPlanLoaded}
            onViewChange={setCurrentView}
            onCreatePaymentLink={handleOpenCreateLink}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            unreadNotifications={unreadNotificationsCount}
            showToast={showToast}
            onCashierChanged={handleCashierChanged}
            isRefreshing={isRefreshing}
            onRefresh={() => refreshWorkspaceData({ silent: false, force: true })}
            refreshTrigger={refreshTick}
          />
        );
    }
  };

  // Profile update handler to synchronize with real API
  const handleProfileSave = async (updated: MerchantProfile) => {
    setProfile(updated);
    const { success } = await ApiService.updateProfile(updated);
    if (success) {
      showToast('Merchant profile details updated successfully.', 'success');
    } else {
      showToast('Failed to update merchant profile.', 'error');
    }
  };

  // Check if current route is Auth Callback (/auth/callback)
  const isCallbackView = typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback');
  if (isCallbackView) {
    return <AuthCallback />;
  }

  // Check if current route is Pay View (public payment checkout link: /pay/:linkId or /pay/:orderId)
  const isPayView = typeof window !== 'undefined' && (window.location.pathname.includes('/pay/') || window.location.pathname === '/pay' || window.location.pathname.startsWith('/pay'));
  if (isPayView) {
    return (
      <div className="min-h-screen bg-[#070102] text-[#fff2f4] font-sans">
        <PayPage onBackToDashboard={() => {
          window.history.pushState({}, '', '/');
          window.location.reload();
        }} />
      </div>
    );
  }

  // Check if current route is Public Store View (/store/:slug)
  const publicStoreMatch =
    typeof window !== 'undefined'
      ? window.location.pathname.match(/^\/store\/([^/?#]+)\/?$/)
      : null;
  if (publicStoreMatch && publicStoreMatch[1]) {
    const storeSlug = decodeURIComponent(publicStoreMatch[1]);
    return <PublicStorePage slug={storeSlug} />;
  }

  // Check if current route is API Docs (/api/docs or /api/dosc or /docs)
  const isDocsView = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/api/docs') ||
    window.location.pathname.startsWith('/api/dosc') ||
    window.location.pathname === '/docs' ||
    window.location.pathname.startsWith('/docs')
  );
  if (isDocsView) {
    if (isLoggedIn) {
      if (!isPlanLoaded || !currentPlanState) {
        return (
          <div className="min-h-screen bg-[#070102] text-white flex flex-col justify-center items-center gap-3">
            <div className="w-48 h-4 rounded-lg bg-white/10 animate-pulse" />
            <div className="w-64 h-3 rounded-lg bg-white/5 animate-pulse" />
          </div>
        );
      }
      if (!hasApiDocsAccess(currentPlanState.plan)) {
        const reqDocsPlan = getRequiredPlanName(plansCatalog, (p) => hasApiDocsAccess(p), 'BASIC');
        return (
          <div className="min-h-screen bg-[#070102] text-[#fff2f4]">
            <UpgradeRequiredView
              title="Upgrade required"
              message={`Developer Portal & API docs are available from the ${reqDocsPlan} plan`}
              requiredPlanName={reqDocsPlan}
              currentPlanName={currentPlanState.plan.name}
              pageTitle="API Documentation"
              onUpgrade={() => {
                window.history.pushState({}, '', '/');
                setCurrentView('pricing');
              }}
              onBackToDashboard={() => {
                window.history.pushState({}, '', '/');
                setCurrentView('dashboard');
              }}
            />
          </div>
        );
      }
    }
    return (
      <ApiDocsPage 
        onBackToDashboard={() => {
          window.history.pushState({}, '', '/');
          setCurrentView('developer');
          if (!isLoggedIn) {
            window.location.href = '/';
          }
        }} 
      />
    );
  }

  // If session is restoring and token exists, show loading screen
  if (isSessionChecking && apiToken) {
    return (
      <div className="min-h-screen bg-[#070102] text-white flex flex-col justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center animate-bounce shadow-lg shadow-rose-600/30">
            <Wallet className="w-7 h-7 stroke-[2.5]" />
          </div>
          <p className="text-sm font-bold text-rose-200/80 animate-pulse">Restoring secure session...</p>
        </div>
      </div>
    );
  }

  // If not signed in, show LandingPage or AuthScreen (handling /login)
  if (!isLoggedIn) {
    const isLoginRoute = typeof window !== 'undefined' && window.location.pathname.includes('/login');

    if (authMode || isLoginRoute) {
      return (
        <div className="min-h-screen bg-[#070102] text-white font-sans">
          <AuthScreen 
            onLoginSuccess={(token, user) => {
              setAuthMode(null);
              handleLoginSuccess(token, user);
            }} 
            showToast={showToast} 
            onBackToLanding={() => {
              setAuthMode(null);
              if (isLoginRoute) {
                window.history.pushState({}, '', '/');
              }
            }}
          />
          <Toast toasts={toasts} onRemove={removeToast} />
        </div>
      );
    }

    return (
      <div className="min-h-screen font-sans">
        <LandingPage onOpenAuth={() => setAuthMode('login')} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar Rail */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        credits={credits}
        balance={balance}
        profileName={profile.name}
        profileEmail={profile.email}
        unreadNotifications={unreadNotificationsCount}
        planState={currentPlanState}
        onSignOut={handleSignOut}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main viewport area */}
      <div className="main-area">
        {gatewayMode === 'test' && (
          <div className="bg-amber-950/40 border-b border-amber-800/50 p-3 text-center text-amber-200 text-sm font-bold flex items-center justify-center gap-3">
            <span>TEST MODE is ON: real payments for API orders are disabled.</span>
            <button
              onClick={async () => {
                try {
                  await setMode('live');
                  setGatewayMode('live');
                  showToast('Switched gateway to LIVE mode', 'success');
                } catch {
                  setCurrentView('developer');
                }
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Switch to Live
            </button>
          </div>
        )}
        {currentView !== 'dashboard' && currentView !== 'developer' && currentView !== 'api-docs' && currentView !== 'api-integration' && currentView !== 'links' && (
          <Header
            currentView={currentView}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onViewChange={setCurrentView}
            unreadNotifications={unreadNotificationsCount}
            credits={credits}
            apiBaseUrl={apiBaseUrl}
            apiEnabled={apiEnabled}
            isSimulated={isApiSimulated}
            onOpenApiSettings={() => {
              setModalApiUrlInput(apiBaseUrl);
              setModalApiEnabledInput(apiEnabled);
              setModalApiTokenInput(apiToken);
              setActiveModal('api_settings');
            }}
          />
        )}

        {/* Dynamic content viewport */}
        <div className="flex-1">
          {renderActiveView()}
        </div>
      </div>

      {/* Global Toasts Overlay */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* MODAL 1: Create / Edit Payment Link */}
      <CreatePaymentLinkModal
        isOpen={activeModal === 'create_link'}
        onClose={() => setActiveModal(null)}
        onSubmit={async (data) => {
          const amountNum = data.amount;
          if (!data.title.trim() || isNaN(amountNum) || amountNum <= 0) {
            showToast('Please specify a title and valid price amount.', 'error');
            return;
          }

          if (editingLinkId !== null) {
            // Edit Link mode
            try {
              const editLink = paymentLinks.find(l => l.id === editingLinkId);
              const linkIdentifier = String(editLink?.link_id || editingLinkId);
              await ApiService.updateLink(linkIdentifier, {
                title: data.title,
                amount: amountNum,
                note: data.note,
                is_test: data.is_test,
                redirectUrl: data.redirectUrl,
                expiry: data.expiry,
                usageLimit: data.usageLimit
              });

              setPaymentLinks(prev => prev.map(l => {
                if (l.id === editingLinkId) {
                  return {
                    ...l,
                    title: data.title,
                    amount: amountNum,
                    note: data.note,
                    is_test: data.is_test,
                    redirectUrl: data.redirectUrl,
                    expiry: data.expiry,
                    usageLimit: data.usageLimit,
                    date: 'Updated just now'
                  };
                }
                return l;
              }));

              showToast('Payment link updated successfully.', 'success');
              setActiveModal(null);
              setEditingLinkId(null);
              refreshWorkspaceData({ silent: true, force: true });
            } catch (err: any) {
              notifyApiOrPlanError(err, `Link update failed: ${err.message || 'Unknown error'}`, showToast, () => {
                setActiveModal(null);
                setCurrentView('pricing');
              });
              throw err;
            }
          } else {
            // Create New Link Mode
            const newLinkPayload = {
              title: data.title,
              amount: amountNum,
              active: true,
              is_test: !!data.is_test,
              note: data.note,
              redirectUrl: data.redirectUrl,
              expiry: data.expiry,
              usageLimit: data.usageLimit
            };

            try {
              const { link } = await ApiService.createLink(newLinkPayload);
              const realId = link?.link_id || link?.id;
              if (!link || !realId) {
                throw new Error('No valid link_id returned from server');
              }

              setPaymentLinks(prev => [link, ...prev]);
              showToast('Payment link generated successfully.', 'success');
              setActiveModal(null);
              setEditingLinkId(null);
              refreshWorkspaceData({ silent: true, force: true });
            } catch (err: any) {
              console.error('Link create failed:', err);
              const errMsg = err?.message || 'Unknown error';
              if (
                errMsg.toLowerCase().includes('connect fampay') || 
                errMsg.toLowerCase().includes('connect amazon') || 
                errMsg.toLowerCase().includes('connect paytm') || 
                errMsg.toLowerCase().includes('payment account first')
              ) {
                setActiveModal(null);
                setIsNoCashierModalOpen(true);
              } else if (
                errMsg.toLowerCase().includes('insufficient hamro credits') || 
                errMsg.toLowerCase().includes('insufficient credits')
              ) {
                showToast('Insufficient Hamro Credits: Please top up your wallet credits', 'error');
                setActiveModal(null);
                setCurrentView('wallet');
              } else {
                notifyApiOrPlanError(err, `Link create failed: ${errMsg}`, showToast, () => {
                  setActiveModal(null);
                  setCurrentView('pricing');
                });
              }
              throw err;
            }
          }
        }}
        initialData={
          editingLinkId !== null 
            ? (() => {
                const l = paymentLinks.find(x => x.id === editingLinkId);
                return l ? {
                  title: l.title,
                  amount: l.amount,
                  note: l.note,
                  is_test: l.is_test,
                  redirectUrl: l.redirectUrl,
                  expiry: l.expiry,
                  usageLimit: l.usageLimit
                } : null;
              })()
            : null
        }
        isEditing={editingLinkId !== null}
        linkLimit={currentPlanState ? currentPlanState.usage.links_limit : 0}
        linksUsed={currentPlanState?.usage.links_used ?? 0}
        commission={currentPlanState?.plan.commission ?? 0}
        maxAmount={currentPlanState?.plan.max_amount ?? null}
        linkExpiryDays={currentPlanState?.plan.link_expiry_days ?? null}
        planName={currentPlanState?.plan.name || ''}
        onUpgradeClick={() => {
          setActiveModal(null);
          setCurrentView('pricing');
        }}
        showToast={showToast}
      />

      {/* MODAL 1B: No Cashier Warning */}
      <NoCashierWarningModal
        isOpen={isNoCashierModalOpen}
        onClose={() => setIsNoCashierModalOpen(false)}
        onSelectProvider={(view) => {
          setIsNoCashierModalOpen(false);
          setCurrentView(view);
        }}
      />

      {/* MODAL 4: API Sync Settings */}
      <Modal
        isOpen={activeModal === 'api_settings'}
        onClose={() => setActiveModal(null)}
        title={
          <span className="flex items-center gap-2">
            <span className="w-6.5 h-6.5 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
              <Cloud className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </span>
            Cloud API Connection
          </span>
        }
        footer={
          <>
            <button 
              onClick={() => {
                setModalApiUrlInput(DEFAULT_API_BASE);
                showToast('Reset endpoint URL to HamroPay production.', 'info');
              }}
              className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 outline-none mr-auto cursor-pointer"
            >
              Reset to Default
            </button>
            <button 
              onClick={() => setActiveModal(null)}
              className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveApiSettings}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/10 active:scale-95 outline-none cursor-pointer"
            >
              Apply Settings
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-slate-800">Enable Remote Cloud Sync</span>
              <span className="block text-[10px] text-slate-400 font-semibold leading-tight">
                Route collections, ledger, and payouts to remote backend API.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={modalApiEnabledInput} 
                onChange={(e) => setModalApiEnabledInput(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="apiUrlInput" className="block text-xs font-bold text-slate-700 uppercase">
              HamroPay Backend URL
            </label>
            <div className="relative">
              <input
                id="apiUrlInput"
                type="url"
                placeholder="https://hamropay-backends-54xp.onrender.com"
                value={modalApiUrlInput}
                onChange={(e) => setModalApiUrlInput(e.target.value)}
                disabled={!modalApiEnabledInput}
                className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:outline-none transition-all font-semibold disabled:bg-slate-50 disabled:text-slate-400"
                required
              />
              <Wifi className={`absolute left-2.5 top-3 w-4 h-4 ${modalApiEnabledInput ? 'text-slate-400' : 'text-slate-300'}`} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="apiTokenInput" className="block text-xs font-bold text-slate-700 uppercase">
              Authentication Token (Bearer JWT)
            </label>
            <div className="relative">
              <input
                id="apiTokenInput"
                type="password"
                placeholder="Enter Bearer Token (Optional if endpoints are public)"
                value={modalApiTokenInput}
                onChange={(e) => setModalApiTokenInput(e.target.value)}
                disabled={!modalApiEnabledInput}
                className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:outline-none transition-all font-semibold disabled:bg-slate-50 disabled:text-slate-400 font-mono"
              />
              <Key className={`absolute left-2.5 top-3.5 w-4 h-4 ${modalApiEnabledInput ? 'text-slate-400' : 'text-slate-300'}`} />
            </div>
          </div>

          <div className="flex gap-2.5 bg-sky-50 border border-sky-100 text-sky-900/80 rounded-xl p-3.5 text-xs leading-normal font-semibold">
            <Info className="w-4.5 h-4.5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="block font-bold text-sky-950">Intelligent Sandbox Fallback</span>
              <span className="block text-slate-500 font-medium leading-relaxed">
                If the remote API endpoint is offline, unreachable, or blocks requests due to cross-origin policies (CORS), the application seamlessly falls back to local sandbox storage. This keeps your interface beautiful and functional under any network condition!
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
