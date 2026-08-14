// Vite replaces import.meta.env during a proper dev/build run.
// The fallback prevents a hard crash if someone accidentally serves the raw source.
const ENV = import.meta.env ?? {};

export const API_CONFIG = {
  tmdbToken: ENV.EXPO_PUBLIC_TMDB_READ_ACCESS_TOKEN || '',
  googleBooksKey: ENV.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY || '',
  youtubeKey: ENV.EXPO_PUBLIC_YOUTUBE_API_KEY || '',
  itunesCountry: (ENV.EXPO_PUBLIC_ITUNES_COUNTRY || 'CA').toUpperCase(),
  tmdbWatchRegion: (ENV.EXPO_PUBLIC_TMDB_WATCH_REGION || 'CA').toUpperCase(),
  ticketmasterKey: ENV.EXPO_PUBLIC_TICKETMASTER_API_KEY || '',
  homeCity: ENV.EXPO_PUBLIC_HOME_CITY || '',
  homeCountry: ENV.EXPO_PUBLIC_HOME_COUNTRY || '',
  homeLat: ENV.EXPO_PUBLIC_HOME_LAT || '',
  homeLon: ENV.EXPO_PUBLIC_HOME_LON || '',
  movieGluClient: ENV.EXPO_PUBLIC_MOVIEGLU_CLIENT || '',
  movieGluApiKey: ENV.EXPO_PUBLIC_MOVIEGLU_API_KEY || '',
  movieGluAuthorization: ENV.EXPO_PUBLIC_MOVIEGLU_AUTHORIZATION || '',
  movieGluTerritory: ENV.EXPO_PUBLIC_MOVIEGLU_TERRITORY || 'CA'
};
