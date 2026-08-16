const lastfmApiKey =
  import.meta.env.VITE_LASTFM_API_KEY ||
  import.meta.env.EXPO_PUBLIC_LASTFM_API_KEY ||
  import.meta.env.VITE_LASTFM_KEY ||
  import.meta.env.EXPO_PUBLIC_LASTFM_KEY ||
  '';

const lastfmApiKeySource = import.meta.env.VITE_LASTFM_API_KEY
  ? 'VITE_LASTFM_API_KEY'
  : import.meta.env.EXPO_PUBLIC_LASTFM_API_KEY
    ? 'EXPO_PUBLIC_LASTFM_API_KEY'
    : import.meta.env.VITE_LASTFM_KEY
      ? 'VITE_LASTFM_KEY'
      : import.meta.env.EXPO_PUBLIC_LASTFM_KEY
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
  import.meta.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  import.meta.env.VITE_GOOGLE_PLACES_API_KEY ||
  '';

const googlePlacesApiKeySource = import.meta.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
  ? 'EXPO_PUBLIC_GOOGLE_PLACES_API_KEY'
  : import.meta.env.VITE_GOOGLE_PLACES_API_KEY
    ? 'VITE_GOOGLE_PLACES_API_KEY'
    : 'missing';

export const API_CONFIG = {
  tmdbToken: import.meta.env.EXPO_PUBLIC_TMDB_READ_ACCESS_TOKEN || import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN || '',
  googleBooksKey: import.meta.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY || import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || '',
  // Keep YouTube on its own API key so Google Books restrictions cannot block playlist calls.
  youtubeKey: import.meta.env.EXPO_PUBLIC_YOUTUBE_API_KEY || import.meta.env.VITE_YOUTUBE_API_KEY || '',
  itunesCountry: (import.meta.env.EXPO_PUBLIC_ITUNES_COUNTRY || import.meta.env.VITE_ITUNES_COUNTRY || 'CA').toUpperCase(),
  tmdbWatchRegion: (import.meta.env.EXPO_PUBLIC_TMDB_WATCH_REGION || import.meta.env.VITE_TMDB_WATCH_REGION || 'CA').toUpperCase(),
  ticketmasterKey: import.meta.env.EXPO_PUBLIC_TICKETMASTER_API_KEY || import.meta.env.VITE_TICKETMASTER_API_KEY || '',
  googlePlacesKey: normalizeGooglePlacesKey(googlePlacesApiKeyRaw),
  googlePlacesKeySource: googlePlacesApiKeySource,
  googlePlacesKeyWasNormalized: Boolean(googlePlacesApiKeyRaw) && normalizeGooglePlacesKey(googlePlacesApiKeyRaw) !== String(googlePlacesApiKeyRaw),
  lastfmApiKey,
  lastfmApiKeySource,
  homeCity: import.meta.env.EXPO_PUBLIC_HOME_CITY || import.meta.env.VITE_HOME_CITY || '',
  homeCountry: import.meta.env.EXPO_PUBLIC_HOME_COUNTRY || import.meta.env.VITE_HOME_COUNTRY || '',
  homeLat: import.meta.env.EXPO_PUBLIC_HOME_LAT || import.meta.env.VITE_HOME_LAT || '',
  homeLon: import.meta.env.EXPO_PUBLIC_HOME_LON || import.meta.env.VITE_HOME_LON || '',
  movieGluClient: import.meta.env.EXPO_PUBLIC_MOVIEGLU_CLIENT || import.meta.env.VITE_MOVIEGLU_CLIENT || '',
  movieGluApiKey: import.meta.env.EXPO_PUBLIC_MOVIEGLU_API_KEY || import.meta.env.VITE_MOVIEGLU_API_KEY || '',
  movieGluAuthorization: import.meta.env.EXPO_PUBLIC_MOVIEGLU_AUTHORIZATION || import.meta.env.VITE_MOVIEGLU_AUTHORIZATION || '',
  movieGluTerritory: import.meta.env.EXPO_PUBLIC_MOVIEGLU_TERRITORY || import.meta.env.VITE_MOVIEGLU_TERRITORY || 'CA'
};
