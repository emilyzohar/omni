import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.EXPO_PUBLIC_SUPABASE_URL,
  import.meta.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);