import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const SUPABASE_URL = 'https://rdccyabdhaemwhmtoniy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7IdMwl571W9lU8lZ1zGVxA_E6D9OEig';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
