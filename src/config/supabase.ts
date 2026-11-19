import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL || '').trim() ||
  'https://biixeghfsyxspdnwkcim.supabase.co';
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim() ||
  'sb_publishable_wlz2zg6bVt3FY0boH6683Q_7pd3tkeN';

export const supabase = createClient(supabaseUrl, supabaseKey);
