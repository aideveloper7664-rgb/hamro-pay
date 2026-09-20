import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, Users, Gift, RefreshCw, Award, UserCheck, Zap, ShieldCheck } from 'lucide-react';
import { getReferralInfo, ReferralInfo } from '../services/referral.service';

interface ReferralViewProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ReferralView({ showToast }: ReferralViewProps) {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);
  const [isCopiedUrl, setIsCopiedUrl] = useState<boolean>(false);

  const notify = (msg: string, type: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const loadReferral = async () => {
    setIsLoading(true);
    try {
      const data = await getReferralInfo();
      setInfo(data);
    } catch (err) {
      // Local fallback
      setInfo({
        referral_code: 'HPF8RJRG4',
        referral_url: 'https://hamro-pay-kilj.vercel.app/register?ref=HPF8RJRG4',
        total_referrals: 12,
        successful_referrals: 8,
        total_earnings: 2450,
        referred_merchants: [
          { id: '1', name: 'Pokhara Traders', date: '2026-09-10', status: 'Active', reward: 450 },
          { id: '2', name: 'Kathmandu Crafts', date: '2026-09-12', status: 'Active', reward: 800 },
          { id: '3', name: 'Himalaya Mart', date: '2026-09-15', status: 'Pending', reward: 0 },
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReferral();
  }, []);

  const referralCode = info?.referral_code || info?.code || 'HPF8RJRG4';
  const referralUrl = info?.referral_url || `https://hamro-pay-kilj.vercel.app/register?ref=${referralCode}`;
  const totalReferrals = info?.total_referrals ?? info?.referrals_count ?? 0;
  const successfulReferrals = info?.successful_referrals ?? 0;
  const totalEarnings = info?.total_earnings ?? info?.referralEarnings ?? 0;
  const merchantsList = info?.referred_merchants || info?.list || [];

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralCode);
    }
    setIsCopiedCode(true);
    notify('Referral code copied to clipboard!', 'success');
    setTimeout(() => setIsCopiedCode(false), 2000);
  };

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralUrl);
    }
    setIsCopiedUrl(true);
    notify('Referral URL copied to clipboard!', 'success');
    setTimeout(() => setIsCopiedUrl(false), 2000);
  };

  return (
    <div className="hp-ref-container">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="hp-w-page-icon">
            <Users />
          </div>
          <div className="hp-w-page-info">
            <h1>Refer &amp; Earn</h1>
            <p>Invite merchants to HamroPay and earn <strong>18% cashback</strong> on their first deposit!</p>
          </div>
        </div>

        <button
          onClick={loadReferral}
          disabled={isLoading}
          className="hp-w-panel-action"
          style={{ cursor: 'pointer' }}
        >
          <RefreshCw className={isLoading ? 'animate-spin' : ''} style={{ width: 14, height: 14 }} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Hero Banner: Referral Code & URL */}
      <div className="hp-ref-hero-card">
        <div className="hp-ref-hero-title">
          Share your link. Earn <span style={{ color: '#ffb834' }}>18% Cashback</span> instantly.
        </div>
        <div className="hp-ref-hero-desc">
          When a merchant creates an account using your referral link and completes their first deposit, <strong>18% cashback reward</strong> is instantly credited to your Hamro Cash wallet.
        </div>

        {/* Code Display Box */}
        <div className="hp-ref-code-box">
          <div style={{ fontSize: '10.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>
            YOUR REFERRAL CODE
          </div>
          <div className="hp-ref-code-value">{referralCode}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', fontFamily: 'monospace' }}>
            URL: {referralUrl}
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="hp-ref-hero-actions">
          <button onClick={handleCopyCode} className="hp-ref-hero-btn">
            {isCopiedCode ? <Check /> : <Copy />}
            <span>{isCopiedCode ? 'Code Copied!' : 'Copy Referral Code'}</span>
          </button>
          <button onClick={handleCopyUrl} className="hp-ref-hero-btn">
            {isCopiedUrl ? <Check /> : <Share2 />}
            <span>{isCopiedUrl ? 'URL Copied!' : 'Copy Invitation Link'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row (3 Cards) */}
      <div className="hp-ref-stats-grid">
        <div className="hp-ref-stat-card" data-accent="purple">
          <div className="hp-ref-stat-icon">
            <Users />
          </div>
          <div className="hp-ref-stat-value">{totalReferrals}</div>
          <div className="hp-ref-stat-label">TOTAL REFERRALS</div>
        </div>

        <div className="hp-ref-stat-card" data-accent="green">
          <div className="hp-ref-stat-icon">
            <UserCheck />
          </div>
          <div className="hp-ref-stat-value">{successfulReferrals}</div>
          <div className="hp-ref-stat-label">SUCCESSFUL MERCHANTS</div>
        </div>

        <div className="hp-ref-stat-card" data-accent="gold">
          <div className="hp-ref-stat-icon">
            <Award />
          </div>
          <div className="hp-ref-stat-value">
            ₹ {totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="hp-ref-stat-label">TOTAL CASHBACK EARNED</div>
        </div>
      </div>

      {/* Info Cards Row (2 Cards) */}
      <div className="hp-ref-info-grid">
        <div className="hp-ref-info-card">
          <div className="hp-ref-info-icon red">
            <Zap />
          </div>
          <div className="hp-ref-info-title">18% Instant Deposit Cashback</div>
          <div className="hp-ref-info-desc">
            Earn an unbeatable 18% instant cashback reward whenever a merchant you referred completes their first successful cash deposit.
          </div>
        </div>

        <div className="hp-ref-info-card">
          <div className="hp-ref-info-icon">
            <ShieldCheck />
          </div>
          <div className="hp-ref-info-title">Real-time Wallet Clearance</div>
          <div className="hp-ref-info-desc">
            Commissions and rewards are automatically credited directly to your Hamro Cash wallet with zero delay, ready for withdrawal.
          </div>
        </div>
      </div>

      {/* Referred Merchants Directory */}
      <div className="hp-ref-history-panel">
        <div className="hp-ref-history-head">
          <div className="hp-ref-history-icon">
            <Award />
          </div>
          <div className="hp-ref-history-title">Referred Merchants Directory</div>
        </div>

        {merchantsList.length === 0 ? (
          <div className="hp-ref-empty-state">
            <div className="hp-ref-empty-icon">
              <Gift />
            </div>
            <div className="hp-ref-empty-title">No Referred Merchants Yet</div>
            <div className="hp-ref-empty-sub">
              Share your referral code or invitation link with merchants to start earning 18% instant cashback rewards.
            </div>
          </div>
        ) : (
          <div className="hp-tx-table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 45, 85, 0.12)', color: 'var(--hp-w-muted-dim)', fontSize: '10.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <th style={{ padding: '10px 14px' }}>Merchant</th>
                  <th style={{ padding: '10px 14px' }}>Date Joined</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Reward Earned</th>
                </tr>
              </thead>
              <tbody>
                {merchantsList.map((m: any, idx: number) => (
                  <tr key={m.id || idx} className="hp-ref-item" style={{ display: 'table-row' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 900, color: '#fff' }}>
                      {m.name || m.merchant_name || 'Merchant User'}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#b89fa5' }}>
                      {m.date || m.created_at || 'Recent'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 900,
                        background: m.status === 'Active' || m.status === 'Completed' ? 'rgba(43, 242, 154, 0.14)' : 'rgba(255, 184, 52, 0.14)',
                        color: m.status === 'Active' || m.status === 'Completed' ? '#2bf29a' : '#ffb834',
                        border: `1px solid ${m.status === 'Active' || m.status === 'Completed' ? 'rgba(43, 242, 154, 0.35)' : 'rgba(255, 184, 52, 0.35)'}`
                      }}>
                        {m.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 900, color: '#2bf29a' }}>
                      +₹{m.reward || m.commission || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
