// Vite builds use your existing environment variables automatically.
// For unbundled static hosting, enter browser-safe public settings here.
// Never add a Supabase service_role key or private server credentials.
export const PUBLIC_RUNTIME_CONFIG = {
  EXPO_PUBLIC_LASTFM_API_KEY: 'df9f7d473f125519b9adedac8c7bc2f0',
 EXPO_PUBLIC_SUPABASE_URL: 'https://kkstpjzwxdytjuogfmmz.supabase.co',
 VITE_TMDB_READ_ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyYTljNzIwZmIwYWRhYjc3MjNmNmU1MDMwOGNhMDgyOSIsIm5iZiI6MTc4NTAzNjUyOS4zMzcsInN1YiI6IjZhNjU3ZWYxMmQzN2NlYzliZjg2ZWFjNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.LfVnIp-zgpGOxtWeYIpxz69OtLQuxON3e0VQP9GuTHY',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_Y8j_uX53HuaGhKSkz0FCdA_KmzJImRY',
  VITE_WEB_PUSH_PUBLIC_KEY: 'BB_AsaSdXykeO_vwGdL0lzyu6aSMr9j1s9GDbr96D3hU6WkYD10lXlf4IKv54pFSTnic-82BmiaEqkzhaARMaaI',
};

// Add browser-safe settings inside PUBLIC_RUNTIME_CONFIG above:
// VITE_WEB_PUSH_PUBLIC_KEY: 'YOUR_VAPID_PUBLIC_KEY',
// VITE_TMDB_READ_ACCESS_TOKEN: 'YOUR_EXISTING_TMDB_TOKEN',
// Keep the VAPID private key and Supabase service role key in Edge Function secrets only.
