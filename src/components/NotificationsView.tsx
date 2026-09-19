import { useState, useRef, useEffect } from 'react';
import { Notification } from '../types';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
}

export default function NotificationsView({
  notifications,
  onMarkAllRead
}: NotificationsViewProps) {
  const [pushStatus, setPushStatus] = useState<'idle' | 'enabling' | 'enabled'>('idle');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleMarkAllRead = () => {
    onMarkAllRead();
    showToast('All notifications marked as read');
  };

  const handleEnablePush = () => {
    if (pushStatus === 'enabled' || pushStatus === 'enabling') return;
    setPushStatus('enabling');
    setTimeout(() => {
      setPushStatus('enabled');
      showToast('Push notifications enabled');
    }, 1200);
  };

  return (
    <div className="hp-notif-container">
      {/* Page Header */}
      <div className="hp-notif-page-header">
        <div className="hp-notif-page-head-left">
          <div className="hp-notif-page-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <div className="hp-notif-page-info">
            <h1>Notifications</h1>
            <p>Your latest alerts and updates.</p>
          </div>
        </div>

        <button
          type="button"
          id="markAllBtn"
          className="hp-notif-mark-all-btn"
          onClick={handleMarkAllRead}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Mark all read
        </button>
      </div>

      {/* Push notifications enable */}
      <div className="hp-notif-panel hp-notif-push-panel">
        <div className="hp-notif-push-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>
        <div className="hp-notif-push-body">
          <div className="hp-notif-push-title">Push Notifications</div>
          <div className="hp-notif-push-desc">
            Get notified instantly for payments, withdrawals, and more — even when this tab isn't open.
          </div>
        </div>
        <button
          type="button"
          className="hp-notif-enable-btn"
          id="enablePushBtn"
          onClick={handleEnablePush}
          disabled={pushStatus === 'enabling'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span id="enableBtnText">
            {pushStatus === 'idle' && 'Enable'}
            {pushStatus === 'enabling' && 'Enabling…'}
            {pushStatus === 'enabled' && 'Enabled'}
          </span>
        </button>
      </div>

      {/* Notifications list or Empty state */}
      <div className="hp-notif-panel" style={{ padding: 0 }}>
        {notifications.length > 0 ? (
          <div>
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`hp-notif-item ${n.unread ? 'unread' : ''}`}
              >
                <div className={`hp-notif-dot ${n.unread ? '' : 'read'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3
                      className={`text-sm tracking-tight text-[#fff2f4] ${
                        n.unread ? 'font-extrabold' : 'font-semibold'
                      }`}
                    >
                      {n.title}
                    </h3>
                    <time className="text-[11px] text-[#83686e] font-semibold whitespace-nowrap">
                      {n.time}
                    </time>
                  </div>
                  <p className="text-xs text-[#b89fa5] font-medium leading-relaxed">
                    {n.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hp-notif-empty-state">
            <div className="hp-notif-empty-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>
            <div className="hp-notif-empty-title">No notifications yet</div>
            <div className="hp-notif-empty-sub">
              You're all caught up. Alerts about payments, withdrawals and updates will appear here.
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '11px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(165deg, rgba(28,8,14,0.97), rgba(14,3,7,0.98))',
            border: '1px solid rgba(255,45,85,0.28)',
            boxShadow: '0 14px 34px rgba(0,0,0,0.6), 0 0 26px rgba(255,30,75,0.15)',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#fff',
            maxWidth: 'calc(100% - 24px)',
            transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)'
          }}
        >
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '7px',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(43,242,154,0.14)',
              color: '#2bf29a',
              border: '1px solid rgba(43,242,154,0.28)',
              flexShrink: 0
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <span id="notifToastMsg">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
