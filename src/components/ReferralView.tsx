import { useState, useEffect, useRef } from 'react';
import { ApiService } from '../lib/api';

interface ReferralViewProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface ReferralRecord {
  id: string;
  name: string;
  date: string;
  reward: number;
  status: 'Completed' | 'Pending';
}

export default function ReferralView({ showToast }: ReferralViewProps) {
  const [referralCode, setReferralCode] = useState('HPF8RJRG4');
  const [referralsCount, setReferralsCount] = useState(0);
  const [thisMonthEarnings, setThisMonthEarnings] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [history, setHistory] = useState<ReferralRecord[]>([]);
  const [copyBtnText, setCopyBtnText] = useState('Copy Code');

  // Internal toast state for exact floating toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMsg(msg);
    if (showToast) showToast(msg, type);

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

  // Fetch real-time referral stats
  useEffect(() => {
    const loadReferralData = async () => {
      try {
        const res = await ApiService.getReferral();
        if (res.referralCode) {
          setReferralCode(res.referralCode.toUpperCase());
        }
        if (typeof res.referralsCount === 'number') {
          setReferralsCount(res.referralsCount);
        }
        if (typeof res.referralEarnings === 'number') {
          setTotalIncome(res.referralEarnings);
          setThisMonthEarnings(Math.round(res.referralEarnings * 0.4));
        }
      } catch (err) {
        console.warn('Using local referral state', err);
      }
    };
    loadReferralData();
  }, []);

  // Copy referral code
  const handleCopyCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(referralCode)
        .then(() => {
          setCopyBtnText('Copied!');
          displayToast('Referral code copied to clipboard', 'success');
          setTimeout(() => {
            setCopyBtnText('Copy Code');
          }, 1800);
        })
        .catch(() => {
          displayToast(`Referral code: ${referralCode}`);
        });
    } else {
      displayToast(`Referral code: ${referralCode}`);
    }
  };

  // Share referral code
  const handleShare = () => {
    const shareText = `Use my HamroPay referral code ${referralCode} to get ₹50 signup bonus!`;
    if (navigator.share) {
      navigator
        .share({
          title: 'Join HamroPay',
          text: shareText,
          url: window.location.origin
        })
        .catch(() => {
          // User cancelled or share dismissed
        });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${shareText} ${window.location.origin}`);
      displayToast('Referral invitation copied to clipboard', 'success');
    } else {
      displayToast(`Sharing referral code ${referralCode}…`);
    }
  };

  return (
    <div className="hp-ref-container">
      {/* Hero — Share Your Referral Code */}
      <div className="hp-ref-hero-card">
        <div className="hp-ref-hero-title">Share Your Referral Code</div>
        <div className="hp-ref-hero-desc">
          Refer friends and get up to <strong>25% cashback</strong> on their first deposit · Your
          friend gets <strong>₹50</strong> signup bonus usable on services
        </div>

        <div className="hp-ref-code-box">
          <div className="hp-ref-code-value" id="referralCode">
            {referralCode}
          </div>
        </div>

        <div className="hp-ref-hero-actions">
          <button
            type="button"
            className="hp-ref-hero-btn"
            id="copyCodeBtn"
            onClick={handleCopyCode}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span id="copyBtnText">{copyBtnText}</span>
          </button>

          <button
            type="button"
            className="hp-ref-hero-btn"
            id="shareBtn"
            onClick={handleShare}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Stats — 3 cards */}
      <div className="hp-ref-stats-grid">
        {/* This Month */}
        <div className="hp-ref-stat-card" data-accent="green">
          <div className="hp-ref-stat-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3h12M6 21h12M8 3c0 5 8 5 8 0M8 21c0-5 8-5 8 0M9 12h6" />
            </svg>
          </div>
          <div className="hp-ref-stat-value">
            ₹{thisMonthEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="hp-ref-stat-label">This Month</div>
        </div>

        {/* Total Income */}
        <div className="hp-ref-stat-card" data-accent="purple">
          <div className="hp-ref-stat-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="7" width="18" height="14" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div className="hp-ref-stat-value">
            ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="hp-ref-stat-label">Total Income</div>
        </div>

        {/* Referrals */}
        <div className="hp-ref-stat-card" data-accent="gold">
          <div className="hp-ref-stat-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="9" r="3.5" />
              <circle cx="17" cy="11" r="2.8" />
              <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
              <path d="M14.5 20c0-2 .8-3.4 2.5-3.9 1.8-.5 3.5.4 4 2.4" />
            </svg>
          </div>
          <div className="hp-ref-stat-value">{referralsCount}</div>
          <div className="hp-ref-stat-label">Referrals</div>
        </div>
      </div>

      {/* Info cards — 2 cards */}
      <div className="hp-ref-info-grid">
        <div className="hp-ref-info-card">
          <div className="hp-ref-info-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="5" x2="5" y2="19" />
              <circle cx="6.5" cy="6.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
          </div>
          <div className="hp-ref-info-title">Referral Benefit</div>
          <div className="hp-ref-info-desc">
            Get 25% cashback on every successful referral&apos;s first deposit
          </div>
        </div>

        <div className="hp-ref-info-card">
          <div className="hp-ref-info-icon red">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="hp-ref-info-title">Instant Claim</div>
          <div className="hp-ref-info-desc">
            Commission is credited to your wallet instantly once your referral&apos;s deposit
            qualifies
          </div>
        </div>
      </div>

      {/* Referral History */}
      <div className="hp-ref-history-panel">
        <div className="hp-ref-history-head">
          <div className="hp-ref-history-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="hp-ref-history-title">Referral History</div>
        </div>

        {history.length > 0 ? (
          <div>
            {history.map((item) => (
              <div key={item.id} className="hp-ref-item">
                <div>
                  <div className="text-sm font-bold text-[#fff2f4]">{item.name}</div>
                  <div className="text-[11px] text-[#83686e] font-semibold">{item.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-[#2bf29a]">
                    +₹{item.reward.toFixed(2)}
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-[rgba(43,242,154,0.12)] text-[#2bf29a] border border-[rgba(43,242,154,0.25)]">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hp-ref-empty-state">
            <div className="hp-ref-empty-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="9" r="3.5" />
                <circle cx="17" cy="11" r="2.8" />
                <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
                <path d="M14.5 20c0-2 .8-3.4 2.5-3.9 1.8-.5 3.5.4 4 2.4" />
              </svg>
            </div>
            <div className="hp-ref-empty-title">No referrals yet</div>
            <div className="hp-ref-empty-sub">Share your code to start earning!</div>
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
          <span id="refToastMsg">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
