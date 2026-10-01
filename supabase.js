import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.52.1/+esm';
import { PUBLIC_RUNTIME_CONFIG } from './runtime-config.js';

const env = { ...PUBLIC_RUNTIME_CONFIG, ...(import.meta.env || {}) };

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
const supabaseKey =
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
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
