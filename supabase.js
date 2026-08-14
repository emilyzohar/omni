import { createClient } from '@supabase/supabase-js';

// Vite injects these values at build time. Keeping a fallback here avoids
// a fatal error if raw source files are accidentally served by GitHub Pages.
const ENV = import.meta.env ?? {};

const supabaseUrl = ENV.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  ENV.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
