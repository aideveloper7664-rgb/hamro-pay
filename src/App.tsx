import { useState, useEffect } from 'react';
import { 
  initialLinks, 
  initialTransactions, 
  initialNotifications, 
  defaultProfile 
} from './data/initialData';
import { PaymentLink, Transaction, Notification, MerchantProfile, PlanType } from './types';
import { ApiService, getApiConfig, saveApiConfig, DEFAULT_API_BASE } from './lib/api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import DashboardView from './components/DashboardView';
import PaymentLinksView from './components/PaymentLinksView';
import WalletView from './components/WalletView';
import TransactionsView from './components/TransactionsView';
import WithdrawView from './components/WithdrawView';
import NotificationsView from './components/NotificationsView';
import PricingView from './components/PricingView';
import ProfileView from './components/ProfileView';
import ReferralView from './components/ReferralView';
import SupportView from './components/SupportView';
import ConnectView from './components/ConnectView';
import DeveloperPortalView from './components/DeveloperPortalView';
import Modal from './components/Modal';
import Toast, { ToastItem } from './components/Toast';
import { Link as LinkIcon, Wallet, CheckCircle, Info, Cloud, Wifi, HelpCircle, Key } from 'lucide-react';
import { PayPage } from './pages/pay/PayPage';

export default function App() {
  // --- Persistent State Synchronization (localStorage) ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('hamro_is_logged_in') === 'true';
  });

  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);

  const [currentView, setCurrentView] = useState<string>(() => {
    return localStorage.getItem('hamro_current_view') || 'dashboard';
  });

  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem('hamro_balance');
    return saved ? parseFloat(saved) : 12840.50;
  });

  const [pendingWithdrawals, setPendingWithdrawals] = useState<number>(() => {
    const saved = localStorage.getItem('hamro_pending_withdrawals');
    return saved ? parseFloat(saved) : 0;
  });

  const [currentPlan, setCurrentPlan] = useState<PlanType>(() => {
    return (localStorage.getItem('hamro_plan') as PlanType) || 'Blaze Free';
  });

  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>(() => {
    const saved = localStorage.getItem('hamro_links');
    return saved ? JSON.parse(saved) : initialLinks;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('hamro_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('hamro_notifications');
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [profile, setProfile] = useState<MerchantProfile>(() => {
    const saved = localStorage.getItem('hamro_profile');
    return saved ? JSON.parse(saved) : defaultProfile;
  });

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

  const [feePercent, setFeePercent] = useState<number>(() => {
    const saved = localStorage.getItem('hamro_fee_percent');
    return saved ? parseFloat(saved) : 1.5;
  });

  const [linkLimit, setLinkLimit] = useState<number>(() => {
    const saved = localStorage.getItem('hamro_link_limit');
    return saved ? parseInt(saved) : 100;
  });

  const [isSessionChecking, setIsSessionChecking] = useState<boolean>(true);

  const [apiStatus, setApiStatus] = useState<Record<string, { status: 'REAL' | 'SIMULATED'; route: string; error?: string }>>({
    auth: { status: 'SIMULATED', route: 'POST /api/auth/login' },
    paymentLinks: { status: 'SIMULATED', route: 'GET /api/payment' },
    balance: { status: 'SIMULATED', route: 'GET /api/user' },
    transactions: { status: 'SIMULATED', route: 'GET /api/withdrawal' },
    withdrawals: { status: 'SIMULATED', route: 'POST /api/withdrawal' },
    notifications: { status: 'SIMULATED', route: 'GET /api/notification' },
    profile: { status: 'SIMULATED', route: 'POST /api/user' },
    plans: { status: 'SIMULATED', route: 'POST /api/plans/upgrade' },
    referral: { status: 'SIMULATED', route: 'GET /api/referral' },
    support: { status: 'SIMULATED', route: 'POST /api/support' }
  });

  // UI Control states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // Modals controller states
  const [activeModal, setActiveModal] = useState<'create_link' | 'add_funds' | 'confirm_plan' | 'api_settings' | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | number | null>(null);
  
  // Form states inside modals
  const [modalLinkTitle, setModalLinkTitle] = useState('');
  const [modalLinkAmount, setModalLinkAmount] = useState('');
  const [modalLinkNote, setModalLinkNote] = useState('');
  const [modalFundAmount, setModalFundAmount] = useState('');
  const [selectedPendingPlan, setSelectedPendingPlan] = useState<{ id: PlanType; price: number } | null>(null);

  // Form states for API settings
  const [modalApiUrlInput, setModalApiUrlInput] = useState(apiBaseUrl);
  const [modalApiEnabledInput, setModalApiEnabledInput] = useState(apiEnabled);
  const [modalApiTokenInput, setModalApiTokenInput] = useState(apiToken);

  // --- Effect syncs to local storage ---
  useEffect(() => {
    localStorage.setItem('hamro_is_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('hamro_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('hamro_balance', String(balance));
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('hamro_pending_withdrawals', String(pendingWithdrawals));
  }, [pendingWithdrawals]);

  useEffect(() => {
    localStorage.setItem('hamro_plan', currentPlan);
  }, [currentPlan]);

  useEffect(() => {
    localStorage.setItem('hamro_fee_percent', String(feePercent));
  }, [feePercent]);

  useEffect(() => {
    localStorage.setItem('hamro_link_limit', String(linkLimit));
  }, [linkLimit]);

  useEffect(() => {
    localStorage.setItem('hamro_links', JSON.stringify(paymentLinks));
  }, [paymentLinks]);

  useEffect(() => {
    localStorage.setItem('hamro_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('hamro_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('hamro_profile', JSON.stringify(profile));
  }, [profile]);

  // Synchronize with API client helper on settings changes
  useEffect(() => {
    saveApiConfig({
      baseUrl: apiBaseUrl,
      isEnabled: apiEnabled,
      isSimulatedFallback: isApiSimulated,
      token: apiToken
    });
  }, [apiBaseUrl, apiEnabled, isApiSimulated, apiToken]);

  // --- Session restoration on mount ---
  useEffect(() => {
    const restoreSession = async () => {
      const config = getApiConfig();
      if (config.token) {
        setIsSessionChecking(true);
        try {
          const res = await ApiService.getMe();
          if (res.success && res.user) {
            setProfile({
              name: res.user.name,
              email: res.user.email,
              phone: res.user.phone || '',
              emailReceipts: res.user.emailReceipts ?? true,
              withdrawalAlerts: res.user.withdrawalAlerts ?? true
            });
            setBalance(res.user.availableBalance ?? 0);
            setPendingWithdrawals(res.user.pendingPayout ?? 0);
            setCurrentPlan(res.user.plan || 'Blaze Free');
            setFeePercent(res.user.feePercent ?? 1.5);
            setLinkLimit(res.user.linkLimit ?? 100);
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
            showToast(`Session restored for ${res.user.name}`, 'success');
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

  // Try to sync with remote API on login/mount
  useEffect(() => {
    if (isLoggedIn) {
      const syncInitialData = async () => {
        showToast('Syncing workspace with Hamro Pay API...', 'info');
        
        // 1. Payment Links
        const linksRes = await ApiService.getLinks(paymentLinks);
        if (!linksRes.isSimulated) {
          setPaymentLinks(linksRes.links);
          setApiStatus(prev => ({ ...prev, paymentLinks: { status: 'REAL', route: 'GET /api/payment' } }));
        } else {
          setApiStatus(prev => ({ ...prev, paymentLinks: { status: 'SIMULATED', route: 'GET /api/payment', error: 'Service unavailable' } }));
        }

        // 2. Transactions
        const txRes = await ApiService.getTransactions(transactions);
        if (!txRes.isSimulated) {
          setTransactions(txRes.transactions);
          setApiStatus(prev => ({ ...prev, transactions: { status: 'REAL', route: 'GET /api/withdrawal' } }));
        } else {
          setApiStatus(prev => ({ ...prev, transactions: { status: 'SIMULATED', route: 'GET /api/withdrawal', error: 'Service unavailable' } }));
        }

        // 3. Notifications
        const notifRes = await ApiService.getNotifications(notifications);
        if (!notifRes.isSimulated) {
          setNotifications(notifRes.notifications);
          setApiStatus(prev => ({ ...prev, notifications: { status: 'REAL', route: 'GET /api/notification' } }));
        } else {
          setApiStatus(prev => ({ ...prev, notifications: { status: 'SIMULATED', route: 'GET /api/notification', error: 'Service unavailable' } }));
        }

        // 4. Profile details
        const profRes = await ApiService.getUserProfile();
        if (profRes.success && !profRes.isSimulated) {
          setProfile({
            name: profRes.profile.name || 'Merchant User',
            email: profRes.profile.email || 'merchant@hamropay.demo',
            phone: profRes.profile.phone || '',
            emailReceipts: profRes.profile.emailReceipts ?? true,
            withdrawalAlerts: profRes.profile.withdrawalAlerts ?? true
          });
          setApiStatus(prev => ({ ...prev, profile: { status: 'REAL', route: 'GET /api/user' } }));
        } else {
          setApiStatus(prev => ({ ...prev, profile: { status: 'SIMULATED', route: 'GET /api/user', error: profRes.error } }));
        }

        // 5. Referral System
        const refRes = await ApiService.getReferral();
        if (!refRes.isSimulated) {
          setApiStatus(prev => ({ ...prev, referral: { status: 'REAL', route: 'GET /api/referral' } }));
        } else {
          setApiStatus(prev => ({ ...prev, referral: { status: 'SIMULATED', route: 'GET /api/referral' } }));
        }

        // Set remaining routes with status mapping
        setApiStatus(prev => ({
          ...prev,
          auth: { status: 'REAL', route: 'GET /api/auth/me' },
          withdrawals: { status: 'REAL', route: 'POST /api/withdrawal' },
          plans: { status: 'REAL', route: 'POST /api/plans/upgrade' },
          support: { status: 'REAL', route: 'POST /api/support' }
        }));

        setIsApiSimulated(false);
        showToast('All core merchant modules successfully synchronized.', 'success');
      };
      
      syncInitialData();
    }
  }, [isLoggedIn, apiBaseUrl]);

  // --- Global Toasts handlers ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const newToast: ToastItem = {
      id: Date.now() + Math.random(),
      message,
      type
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string | number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Login handler ---
  const handleLoginSuccess = (token: string, user: any) => {
    setApiToken(token);
    setIsApiSimulated(false);
    
    // Save configurations
    saveApiConfig({
      baseUrl: apiBaseUrl,
      isEnabled: true,
      isSimulatedFallback: false,
      token: token
    });

    setProfile({
      name: user.name || 'Merchant User',
      email: user.email || 'merchant@hamropay.demo',
      phone: user.phone || '',
      emailReceipts: user.emailReceipts ?? true,
      withdrawalAlerts: user.withdrawalAlerts ?? true
    });
    setBalance(user.availableBalance ?? 0);
    setPendingWithdrawals(user.pendingPayout ?? 0);
    setCurrentPlan(user.plan || 'Blaze Free');
    setFeePercent(user.feePercent ?? 1.5);
    setLinkLimit(user.linkLimit ?? 100);

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

  const handleSignOut = () => {
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
    setAuthMode(null);
    showToast('You have been signed out of your merchant workspace.', 'info');
  };

  // --- Notifications handler ---
  const handleMarkAllRead = async () => {
    const { isSimulated } = await ApiService.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    
    if (!isSimulated) {
      showToast('All alerts marked as read and synchronized with Vercel Cloud.', 'success');
    } else {
      showToast('All alerts marked as read locally.', 'success');
    }
  };

  const unreadNotificationsCount = notifications.filter(n => n.unread).length;

  // --- Payment Link Builder Actions ---
  const handleToggleLinkActive = async (id: string | number) => {
    const link = paymentLinks.find(l => l.id === id);
    if (!link) return;

    const nextState = !link.active;
    const { isSimulated } = await ApiService.toggleLinkActive(id, nextState);

    setPaymentLinks(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, active: nextState };
      }
      return l;
    }));

    if (!isSimulated) {
      showToast(`Payment link ${nextState ? 'activated' : 'paused'} on Vercel API.`, 'info');
    } else {
      showToast(`Payment checkout link is now ${nextState ? 'active' : 'paused'} (locally synced).`, 'info');
    }
  };

  const handleOpenEditLink = (id: string | number) => {
    const link = paymentLinks.find(l => l.id === id);
    if (link) {
      setEditingLinkId(id);
      setModalLinkTitle(link.title);
      setModalLinkAmount(String(link.amount));
      setModalLinkNote(link.note || '');
      setActiveModal('create_link');
    }
  };

  const handleOpenCreateLink = () => {
    setEditingLinkId(null);
    setModalLinkTitle('');
    setModalLinkAmount('');
    setModalLinkNote('');
    setActiveModal('create_link');
  };

  const handleDeleteLink = (id: string | number) => {
    setPaymentLinks(prev => prev.filter(l => l.id !== id && (l as any).link_id !== id));
  };

  const handleSavePaymentLinkSubmit = async () => {
    const amountNum = parseFloat(modalLinkAmount);
    if (!modalLinkTitle.trim() || isNaN(amountNum) || amountNum <= 0) {
      showToast('Please specify a title and valid price amount.', 'error');
      return;
    }

    if (editingLinkId !== null) {
      // Edit Link mode
      const { isSimulated } = await ApiService.updateLink(editingLinkId, {
        title: modalLinkTitle.trim(),
        amount: amountNum,
        note: modalLinkNote.trim()
      });

      setPaymentLinks(prev => prev.map(l => {
        if (l.id === editingLinkId) {
          return {
            ...l,
            title: modalLinkTitle.trim(),
            amount: amountNum,
            note: modalLinkNote.trim(),
            date: 'Updated just now'
          };
        }
        return l;
      }));

      if (!isSimulated) {
        showToast('Payment link updated successfully on Vercel.', 'success');
      } else {
        showToast('Payment link updated successfully.', 'success');
      }
    } else {
      // Create New Link Mode
      const newLinkPayload = {
        title: modalLinkTitle.trim(),
        amount: amountNum,
        active: true,
        note: modalLinkNote.trim()
      };

      const { link, isSimulated } = await ApiService.createLink(newLinkPayload, paymentLinks);
      
      setPaymentLinks(prev => [link, ...prev]);

      if (!isSimulated) {
        showToast('Payment link generated & published on Vercel.', 'success');
      } else {
        showToast('Payment link generated.', 'success');
      }
    }

    setActiveModal(null);
    setEditingLinkId(null);
  };

  // --- Payout / Withdrawal Action ---
  const handleWithdrawalSubmit = async (amount: number, upi: string) => {
    setBalance(prev => prev - amount);
    setPendingWithdrawals(prev => prev + amount);

    const { isSimulated } = await ApiService.withdrawFunds(amount, upi);

    const newTx: Transaction = {
      id: 'tx-' + Date.now(),
      type: 'withdrawal',
      ref: 'WD-' + Math.floor(100000 + Math.random() * 899999),
      name: `UPI · ${upi}`,
      amount,
      status: 'Pending',
      date: 'Just now'
    };

    setTransactions(prev => [newTx, ...prev]);

    if (!isSimulated) {
      showToast(`Settlement transfer of Rs. ${amount.toLocaleString('en-NP')} successfully synchronized via Vercel.`, 'success');
    } else {
      showToast(`Settlement transfer of Rs. ${amount.toLocaleString('en-NP')} is pending.`, 'success');
    }
    setCurrentView('transactions');
  };

  // --- Add Wallet Funds Actions ---
  const handleConfirmAddFunds = () => {
    const amountNum = parseFloat(modalFundAmount);
    if (isNaN(amountNum) || amountNum < 100) {
      showToast('Minimum funding threshold is Rs. 100.', 'error');
      return;
    }

    setBalance(prev => prev + amountNum);

    const newTx: Transaction = {
      id: 'tx-' + Date.now(),
      type: 'received',
      ref: 'HP-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      name: 'Local Sandbox Top-Up',
      amount: amountNum,
      status: 'Success',
      date: 'Just now'
    };

    setTransactions(prev => [newTx, ...prev]);
    setActiveModal(null);
    setModalFundAmount('');
    showToast(`Rs. ${amountNum.toLocaleString('en-NP')} credited to Hamro Cash.`, 'success');
  };

  // --- Plan Subscription Switch Action ---
  const handleOpenPlanConfirm = (planId: PlanType, price: number) => {
    setSelectedPendingPlan({ id: planId, price });
    setActiveModal('confirm_plan');
  };

  const handleConfirmPlanSwitch = async () => {
    if (selectedPendingPlan) {
      const planToSet = selectedPendingPlan.id;
      const res = await ApiService.upgradePlan(planToSet);
      if (res.success && !res.isSimulated) {
        setCurrentPlan(res.plan as any);
        setFeePercent(res.feePercent ?? 1.5);
        setLinkLimit(res.linkLimit ?? 100);
        showToast(`Subscription plan upgraded to ${res.plan} on HamroPay.`, 'success');
      } else {
        setCurrentPlan(planToSet);
        if (planToSet === 'Blaze Free') {
          setFeePercent(1.5);
          setLinkLimit(100);
        } else if (planToSet === 'Blaze Pro') {
          setFeePercent(1.0);
          setLinkLimit(1000);
        } else {
          setFeePercent(0.5);
          setLinkLimit(1000000);
        }
        showToast(`Subscription plan updated to ${planToSet} locally.`, 'success');
      }
      setActiveModal(null);
      setSelectedPendingPlan(null);
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
    showToast(`Cloud API parameters successfully updated. Connecting to Vercel.`, 'success');
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
            paymentLinks={paymentLinks}
            transactions={transactions}
            currentPlan={currentPlan}
            onViewChange={setCurrentView}
            onCreatePaymentLink={handleOpenCreateLink}
            pendingWithdrawals={pendingWithdrawals}
            feePercent={feePercent}
            linkLimit={linkLimit}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            unreadNotifications={unreadNotificationsCount}
          />
        );
      case 'links':
        return (
          <PaymentLinksView
            paymentLinks={paymentLinks}
            onToggleActive={handleToggleLinkActive}
            onEditLink={handleOpenEditLink}
            onDeleteLink={handleDeleteLink}
            onCreateNewLink={handleOpenCreateLink}
            showToast={showToast}
          />
        );
      case 'wallet':
        return (
          <WalletView
            balance={balance}
            transactions={transactions}
            onAddFunds={() => setActiveModal('add_funds')}
            onViewChange={setCurrentView}
          />
        );
      case 'transactions':
        return (
          <TransactionsView
            transactions={transactions}
            onExportCSV={handleExportTransactionsCSV}
          />
        );
      case 'withdraw':
        return (
          <WithdrawView
            balance={balance}
            onWithdrawSubmit={handleWithdrawalSubmit}
            showToast={showToast}
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
            currentPlan={currentPlan}
            onPlanSelect={handleOpenPlanConfirm}
          />
        );
      case 'profile':
        return (
          <ProfileView
            profile={profile}
            onProfileSave={handleProfileSave}
            showToast={showToast}
          />
        );
      case 'referral':
        return <ReferralView showToast={showToast} />;
      case 'support':
        return (
          <SupportView 
            showToast={showToast} 
            profileName={profile.name} 
            profileEmail={profile.email} 
          />
        );
      
      case 'developer':
        return (
          <DeveloperPortalView showToast={showToast} />
        );

      // Accordionconnected placeholders
      case 'fampay':
      case 'store':
        return (
          <ConnectView 
            viewId={currentView} 
            showToast={showToast} 
            isApiSimulated={isApiSimulated}
            apiBaseUrl={apiBaseUrl}
            apiToken={apiToken}
            apiStatus={apiStatus}
          />
        );

      default:
        return (
          <DashboardView
            profileName={profile.name}
            balance={balance}
            paymentLinks={paymentLinks}
            transactions={transactions}
            currentPlan={currentPlan}
            onViewChange={setCurrentView}
            onCreatePaymentLink={handleOpenCreateLink}
            pendingWithdrawals={pendingWithdrawals}
            feePercent={feePercent}
            linkLimit={linkLimit}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            unreadNotifications={unreadNotificationsCount}
          />
        );
    }
  };

  // Profile update handler to synchronize with real API
  const handleProfileSave = async (updated: MerchantProfile) => {
    setProfile(updated);
    const { success, isSimulated } = await ApiService.updateProfile(updated);
    if (!isSimulated && success) {
      showToast('Merchant profile details updated and synchronized with Vercel.', 'success');
    } else {
      showToast('Merchant profile details saved locally.', 'success');
    }
  };

  // Check if current route is Pay View (public payment checkout link: /pay/:linkId)
  const isPayView = typeof window !== 'undefined' && window.location.pathname.includes('/pay/');
  if (isPayView) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <PayPage onBackToDashboard={() => {
          window.history.pushState({}, '', '/');
          window.location.reload();
        }} />
      </div>
    );
  }

  // If session is restoring and token exists, show loading screen
  if (isSessionChecking && apiToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center animate-bounce shadow-lg">
            <Wallet className="w-7 h-7 stroke-[2.5]" />
          </div>
          <p className="text-sm font-bold text-slate-600 animate-pulse">Restoring secure session...</p>
        </div>
      </div>
    );
  }

  // If not signed in, show clone LandingPage or AuthScreen
  if (!isLoggedIn) {
    if (authMode) {
      return (
        <div className="min-h-screen bg-slate-50 font-sans">
          <AuthScreen 
            onLoginSuccess={(token, user) => {
              setAuthMode(null);
              handleLoginSuccess(token, user);
            }} 
            showToast={showToast} 
            onBackToLanding={() => setAuthMode(null)}
            initialIsSignUp={authMode === 'signup'}
          />
          <Toast toasts={toasts} onRemove={removeToast} />
        </div>
      );
    }

    return (
      <div className="min-h-screen font-sans">
        <LandingPage onOpenAuth={(mode) => setAuthMode(mode || 'signup')} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentView === 'dashboard' ? 'bg-[#070102]' : 'bg-slate-50'} text-slate-800 font-sans antialiased flex`}>
      {/* Sidebar Rail */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        balance={balance}
        profileName={profile.name}
        profileEmail={profile.email}
        unreadNotifications={unreadNotificationsCount}
        currentPlan={currentPlan}
        onSignOut={handleSignOut}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main viewport area */}
      <div className={`flex-1 ml-0 md:ml-64 flex flex-col min-h-screen ${currentView === 'dashboard' ? 'bg-[#070102]' : ''}`}>
        {currentView !== 'dashboard' && (
          <Header
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onViewChange={setCurrentView}
            unreadNotifications={unreadNotificationsCount}
            balance={balance}
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
        <main className={currentView === 'dashboard' ? 'flex-grow w-full' : 'flex-grow p-6 md:p-8 max-w-7xl mx-auto w-full'}>
          {renderActiveView()}
        </main>
      </div>

      {/* Global Toasts Overlay */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* MODAL 1: Create / Edit Payment Link */}
      <Modal
        isOpen={activeModal === 'create_link'}
        onClose={() => setActiveModal(null)}
        title={
          <span className="flex items-center gap-2">
            <span className="w-6.5 h-6.5 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-3.5 h-3.5" />
            </span>
            {editingLinkId ? 'Edit Payment Link' : 'Create Payment Link'}
          </span>
        }
        footer={
          <>
            <button 
              onClick={() => setActiveModal(null)}
              className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 outline-none"
            >
              Cancel
            </button>
            <button 
              onClick={handleSavePaymentLinkSubmit}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/10 active:scale-95 outline-none"
            >
              {editingLinkId ? 'Save Changes' : 'Generate Checkout Link'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="linkTitle" className="block text-xs font-bold text-slate-700 uppercase">
              What are you collecting for?
            </label>
            <input
              id="linkTitle"
              type="text"
              placeholder="e.g. Website development retainer"
              value={modalLinkTitle}
              onChange={(e) => setModalLinkTitle(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:outline-none transition-all font-semibold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="linkAmount" className="block text-xs font-bold text-slate-700 uppercase">
              Amount (Rs.)
            </label>
            <input
              id="linkAmount"
              type="number"
              min="1"
              placeholder="0"
              value={modalLinkAmount}
              onChange={(e) => setModalLinkAmount(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:outline-none transition-all font-semibold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="linkNote" className="block text-xs font-bold text-slate-700 uppercase">
              Internal Note <span className="text-slate-400 lowercase font-medium">(optional)</span>
            </label>
            <textarea
              id="linkNote"
              rows={2}
              placeholder="Add a reference note for this payment checkout channel..."
              value={modalLinkNote}
              onChange={(e) => setModalLinkNote(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:outline-none transition-all font-semibold resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Add Wallet Funds */}
      <Modal
        isOpen={activeModal === 'add_funds'}
        onClose={() => setActiveModal(null)}
        title={
          <span className="flex items-center gap-2">
            <span className="w-6.5 h-6.5 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </span>
            Add Wallet Funds
          </span>
        }
        footer={
          <>
            <button 
              onClick={() => setActiveModal(null)}
              className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 outline-none"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirmAddFunds}
              className="px-4 py-2 bg-emerald-650 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 outline-none"
            >
              Confirm Top-Up
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="fundAmount" className="block text-xs font-bold text-slate-700 uppercase">
              Amount to Deposit (Rs.)
            </label>
            <input
              id="fundAmount"
              type="number"
              min="100"
              placeholder="Minimum Rs. 100"
              value={modalFundAmount}
              onChange={(e) => setModalFundAmount(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:outline-none transition-all font-semibold"
              required
            />
          </div>

          <div className="flex gap-2.5 bg-sky-50 border border-sky-100 text-sky-900/80 rounded-xl p-3 text-xs leading-normal font-semibold">
            <Info className="w-4.5 h-4.5 text-sky-600 shrink-0 mt-0.5" />
            <span>
              This triggers a demo wallet funding sandbox transaction. Funds will appear instantly on your on-screen cash reserves.
            </span>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Plan Switching Confirmation */}
      <Modal
        isOpen={activeModal === 'confirm_plan'}
        onClose={() => setActiveModal(null)}
        title={
          <span className="flex items-center gap-2">
            <span className="w-6.5 h-6.5 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 animate-pulse" />
            </span>
            Confirm Subscription
          </span>
        }
        footer={
          <>
            <button 
              onClick={() => setActiveModal(null)}
              className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 outline-none"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirmPlanSwitch}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/10 active:scale-95 outline-none"
            >
              Confirm Subscription Upgrade
            </button>
          </>
        }
      >
        {selectedPendingPlan && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              You are switching your digital merchant workspace subscription plan to 
              <b className="text-rose-600 px-1 font-black">{selectedPendingPlan.id}</b> 
              at a recurring local billing rate of 
              <b className="text-slate-800 px-1">
                {selectedPendingPlan.price === 0 ? 'Rs. 0' : `Rs. ${selectedPendingPlan.price}/month`}
              </b>.
            </p>
            <div className="flex gap-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs leading-normal text-slate-500 font-semibold">
              <Info className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Plan updates reconfigure maximum payment link limits and lower automated ledger collection fees on-the-fly.
              </span>
            </div>
          </div>
        )}
      </Modal>

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
                placeholder="https://hamropay-backends.onrender.com"
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
