export const API_CONFIG = {
  tmdbToken: import.meta.env.EXPO_PUBLIC_TMDB_READ_ACCESS_TOKEN || '',
  googleBooksKey: import.meta.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY || '',
  // Keep YouTube on its own API key so Google Books restrictions cannot block playlist calls.
  youtubeKey: import.meta.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '',
  itunesCountry: (import.meta.env.EXPO_PUBLIC_ITUNES_COUNTRY || 'CA').toUpperCase(),
  tmdbWatchRegion: (import.meta.env.EXPO_PUBLIC_TMDB_WATCH_REGION || 'CA').toUpperCase(),
  ticketmasterKey: import.meta.env.EXPO_PUBLIC_TICKETMASTER_API_KEY || '',
  homeCity: import.meta.env.EXPO_PUBLIC_HOME_CITY || '',
  homeCountry: import.meta.env.EXPO_PUBLIC_HOME_COUNTRY || '',
  homeLat: import.meta.env.EXPO_PUBLIC_HOME_LAT || '',
  homeLon: import.meta.env.EXPO_PUBLIC_HOME_LON || '',
  movieGluClient: import.meta.env.EXPO_PUBLIC_MOVIEGLU_CLIENT || '',
  movieGluApiKey: import.meta.env.EXPO_PUBLIC_MOVIEGLU_API_KEY || '',
  movieGluAuthorization: import.meta.env.EXPO_PUBLIC_MOVIEGLU_AUTHORIZATION || '',
  movieGluTerritory: import.meta.env.EXPO_PUBLIC_MOVIEGLU_TERRITORY || 'CA'
};
