import { apiCall } from './api';

export interface ReferralInfo {
  referral_code?: string;
  code?: string;
  referral_url?: string;
  total_referrals?: number;
  referrals_count?: number;
  successful_referrals?: number;
  total_earnings?: number;
  referralEarnings?: number;
  referred_merchants?: Array<{
    id?: string;
    name?: string;
    merchant_name?: string;
    date?: string;
    created_at?: string;
    status?: string;
    reward?: number;
    commission?: number;
  }>;
  list?: any[];
}

export const getReferralInfo = async (): Promise<ReferralInfo> =>
  apiCall('/api/referral/info');
