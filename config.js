import { PUBLIC_RUNTIME_CONFIG } from './runtime-config.js';

const env = { ...PUBLIC_RUNTIME_CONFIG, ...(import.meta.env || {}) };

const lastfmApiKey =
  env.VITE_LASTFM_API_KEY ||
  env.EXPO_PUBLIC_LASTFM_API_KEY ||
  env.VITE_LASTFM_KEY ||
  env.EXPO_PUBLIC_LASTFM_KEY ||
  '';

const lastfmApiKeySource = env.VITE_LASTFM_API_KEY
  ? 'VITE_LASTFM_API_KEY'
  : env.EXPO_PUBLIC_LASTFM_API_KEY
    ? 'EXPO_PUBLIC_LASTFM_API_KEY'
    : env.VITE_LASTFM_KEY
      ? 'VITE_LASTFM_KEY'
      : env.EXPO_PUBLIC_LASTFM_KEY
        ? 'EXPO_PUBLIC_LASTFM_KEY'
        : 'missing';


function normalizeGooglePlacesKey(value) {
  let key = String(value || '').trim();
  // GitHub Actions secrets should contain only the value, but tolerate a pasted
  // .env-style assignment or wrapping quotes so an otherwise valid key is not
  // sent to Google as `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...`.
  key = key.replace(/^EXPO_PUBLIC_GOOGLE_PLACES_API_KEY\s*=\s*/i, '');
  key = key.replace(/^VITE_GOOGLE_PLACES_API_KEY\s*=\s*/i, '');
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

const googlePlacesApiKeyRaw =
  env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  env.VITE_GOOGLE_PLACES_API_KEY ||
  '';

const googlePlacesApiKeySource = env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
  ? 'EXPO_PUBLIC_GOOGLE_PLACES_API_KEY'
  : env.VITE_GOOGLE_PLACES_API_KEY
    ? 'VITE_GOOGLE_PLACES_API_KEY'
    : 'missing';

export const API_CONFIG = {
  tmdbToken: env.EXPO_PUBLIC_TMDB_READ_ACCESS_TOKEN || env.VITE_TMDB_READ_ACCESS_TOKEN || '',
  googleBooksKey: env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY || env.VITE_GOOGLE_BOOKS_API_KEY || '',
  // Keep YouTube on its own API key so Google Books restrictions cannot block playlist calls.
  youtubeKey: env.EXPO_PUBLIC_YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY || '',
  itunesCountry: (env.EXPO_PUBLIC_ITUNES_COUNTRY || env.VITE_ITUNES_COUNTRY || 'CA').toUpperCase(),
  tmdbWatchRegion: (env.EXPO_PUBLIC_TMDB_WATCH_REGION || env.VITE_TMDB_WATCH_REGION || 'CA').toUpperCase(),
  ticketmasterKey: env.EXPO_PUBLIC_TICKETMASTER_API_KEY || env.VITE_TICKETMASTER_API_KEY || '',
  googlePlacesKey: normalizeGooglePlacesKey(googlePlacesApiKeyRaw),
  googlePlacesKeySource: googlePlacesApiKeySource,
  googlePlacesKeyWasNormalized: Boolean(googlePlacesApiKeyRaw) && normalizeGooglePlacesKey(googlePlacesApiKeyRaw) !== String(googlePlacesApiKeyRaw),
  lastfmApiKey,
  lastfmApiKeySource,
  homeCity: env.EXPO_PUBLIC_HOME_CITY || env.VITE_HOME_CITY || '',
  homeCountry: env.EXPO_PUBLIC_HOME_COUNTRY || env.VITE_HOME_COUNTRY || '',
  homeLat: env.EXPO_PUBLIC_HOME_LAT || env.VITE_HOME_LAT || '',
  homeLon: env.EXPO_PUBLIC_HOME_LON || env.VITE_HOME_LON || '',
  movieGluClient: env.EXPO_PUBLIC_MOVIEGLU_CLIENT || env.VITE_MOVIEGLU_CLIENT || '',
  movieGluApiKey: env.EXPO_PUBLIC_MOVIEGLU_API_KEY || env.VITE_MOVIEGLU_API_KEY || '',
  movieGluAuthorization: env.EXPO_PUBLIC_MOVIEGLU_AUTHORIZATION || env.VITE_MOVIEGLU_AUTHORIZATION || '',
  movieGluTerritory: env.EXPO_PUBLIC_MOVIEGLU_TERRITORY || env.VITE_MOVIEGLU_TERRITORY || 'CA',
  // IGDB and BoardGameGeek credentials stay server-side. This is only the public
  // URL of the catalogue proxy. Prefer an explicit override, but normally derive
  // it from Omni's existing Supabase URL so Games needs no extra frontend secret.
  gameCatalogueProxyUrl: env.EXPO_PUBLIC_GAME_CATALOGUE_PROXY_URL
    || env.VITE_GAME_CATALOGUE_PROXY_URL
    || (() => {
      const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
      return supabaseUrl ? `${String(supabaseUrl).replace(/\/$/, '')}/functions/v1/game-catalogue` : '';
    })(),
  // Public Edge Function used to read Letterboxd's RSS feed server-side. The
  // browser calls this with a simple GET so GitHub Pages never needs to make a
  // cross-origin request to Letterboxd itself and no CORS preflight is needed.
  letterboxdRssProxyUrl: env.EXPO_PUBLIC_LETTERBOXD_RSS_PROXY_URL
    || env.VITE_LETTERBOXD_RSS_PROXY_URL
    || (() => {
      const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
      return supabaseUrl ? `${String(supabaseUrl).replace(/\/$/, '')}/functions/v1/letterboxd-rss` : '';
    })()
};
