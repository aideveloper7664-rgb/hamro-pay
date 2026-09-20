import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://biixeghfsyxspdnwkcim.supabase.co';
const supabaseKey = 'sb_publishable_wlz2zg6bVt3FY0boH6683Q_7pd3tkeN';

export const supabase = createClient(supabaseUrl, supabaseKey);
