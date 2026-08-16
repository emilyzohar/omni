import { TrackerAPI } from './api.js?v=discover-multiselect-2';
import { API_CONFIG } from './config.js?v=discover-multiselect-2';
import { supabase, hasSupabaseConfig } from './supabase.js';

const ITEMS_KEY = 'zoharTracker.items.v4';
const CACHE_KEY = 'zoharTracker.apiCache.v1';
const CUSTOM_TYPES_KEY = 'zoharTracker.customTypes.v1';
const HISTORY_KEY = 'zoharTracker.history.v1';
const DISCOVER_PREFS_KEY = 'zoharTracker.discoverPrefs.v1';
const STICKER_PREFS_KEY = 'zoharTracker.stickerPrefs.v1';
const STREAK_PREFS_KEY = 'zoharTracker.streakPrefs.v1';
const LIBRARY_PREFS_KEY = 'zoharTracker.libraryPrefs.v1';
const ATTACHMENT_DB_NAME = 'zoharTracker.attachments.v1';
const ATTACHMENT_STORE_NAME = 'files';
const STATE_DB_NAME = 'zoharTracker.state.v1';
const STATE_STORE_NAME = 'largeState';
const HISTORY_IDB_KEY = 'history';
const CACHE_TTL = 60 * 60 * 1000;
const mobileCalendarQuery = window.matchMedia('(max-width: 760px)');

const TYPE_LABELS = {
  tv: 'TV',
  book: 'Books',
  movie: 'Movies',
  music: 'Music',
  food: 'Food',
  event: 'Events',
  workout: 'Workouts',
  other: 'Other'
};

const SOURCE_ITEM_LABELS = {
  tv: 'TV',
  movie: 'Movie',
  book: 'Book',
  music: 'Music',
  artist: 'Artist',
  song: 'Song',
  concert: 'Concert',
  event: 'Event',
  food: 'Food',
  restaurant: 'Restaurant',
  recipe: 'Recipe'
};

const RESERVED_DISPLAY_TYPES = new Set(['tv', 'movie', 'book', 'music', 'artist', 'song', 'concert', 'event', 'food', 'restaurant', 'recipe', 'other']);
const STICKER_COLORS = ['rust', 'red', 'coral', 'orange', 'yellow', 'cream', 'peach', 'pink', 'lavender', 'purple', 'navy', 'blue', 'sky', 'teal', 'green', 'mint', 'brown', 'black', 'white'];

const CLOUD_STATE_VERSION = 2;
const TICKETMASTER_EVENT_CATEGORIES = [
  { key: 'music', label: 'Music', classificationName: 'Music' },
  { key: 'sports', label: 'Sports', classificationName: 'Sports' },
  { key: 'arts-theatre', label: 'Arts & Theatre', classificationName: 'Arts & Theatre' },
  { key: 'family', label: 'Family', classificationName: 'Family' },
  { key: 'film', label: 'Film', classificationName: 'Film' },
  { key: 'comedy', label: 'Comedy', classificationName: 'Comedy' },
  { key: 'rock', label: 'Rock', classificationName: 'Rock' },
  { key: 'pop', label: 'Pop', classificationName: 'Pop' },
  { key: 'hip-hop-rap', label: 'Hip-Hop/Rap', classificationName: 'Hip-Hop/Rap' },
  { key: 'dance-electronic', label: 'Dance / Electronic', classificationName: 'Dance/Electronic' },
  { key: 'country', label: 'Country', classificationName: 'Country' },
  { key: 'hockey', label: 'Hockey', classificationName: 'Hockey' },
  { key: 'basketball', label: 'Basketball', classificationName: 'Basketball' },
  { key: 'baseball', label: 'Baseball', classificationName: 'Baseball' },
  { key: 'football', label: 'Football', classificationName: 'Football' },
  { key: 'soccer', label: 'Soccer', classificationName: 'Soccer' },
  { key: 'tennis', label: 'Tennis', classificationName: 'Tennis' },
  { key: 'theatre', label: 'Theatre', classificationName: 'Theatre' },
  { key: 'dance', label: 'Dance', classificationName: 'Dance' }
];
const DEFAULT_DISCOVER_PREFS = {
  streamingProviderIds: [],
  streamingProviderNames: [],
  prioritizeAuthors: true,
  englishTVOnly: false,
  contentTypes: ['tv', 'movie'],
  genre: 'all',
  eventCity: API_CONFIG.homeCity || '',
  eventCountry: API_CONFIG.homeCountry || API_CONFIG.tmdbWatchRegion || 'CA',
  eventEverything: true,
  eventCategoryKeys: [],
  eventExcludedCategoryKeys: [],
  eventPriorityTerms: [],
  eventCalendarFollowTerms: [],
  eventAutoLikedArtistCalendar: true,
  upcomingHorizonDays: 30
};
const DISCOVER_CONTENT_TYPES = ['tv', 'movie', 'book', 'music', 'artist', 'song', 'concert', 'restaurant', 'event'];
const DISCOVER_CONTENT_TYPE_LABELS = {
  tv: 'TV', movie: 'Movies', book: 'Books', music: 'Albums', artist: 'Artists', song: 'Songs',
  concert: 'Concerts', restaurant: 'Restaurants', event: 'Live Events'
};
function normalizedDiscoverContentTypes(prefs = state?.discoverPrefs || DEFAULT_DISCOVER_PREFS) {
  let values = Array.isArray(prefs?.contentTypes) ? prefs.contentTypes : null;
  if (!values) {
    const legacy = String(prefs?.contentType || '').trim();
    values = legacy && legacy !== 'all' ? [legacy] : ['tv', 'movie'];
  }
  const valid = [...new Set(values.map(value => String(value || '').trim()).filter(value => DISCOVER_CONTENT_TYPES.includes(value)))];
  return valid.length ? valid : ['tv', 'movie'];
}
function discoverTypeSelected(type) {
  return normalizedDiscoverContentTypes().includes(type);
}
function discoverSelectionLabel(types = normalizedDiscoverContentTypes()) {
  const selected = [...types];
  if (selected.length === 2 && selected.includes('tv') && selected.includes('movie')) return 'TV + Movies';
  if (selected.length === DISCOVER_CONTENT_TYPES.length) return 'Everything';
  if (selected.length <= 3) return selected.map(type => DISCOVER_CONTENT_TYPE_LABELS[type] || type).join(' + ');
  return `${selected.length} categories`;
}
function syncDiscoverTypeFilterUI() {
  const selected = new Set(normalizedDiscoverContentTypes());
  els.discoverTypeFilterOptions?.querySelectorAll('input[type="checkbox"][value]').forEach(input => {
    input.checked = selected.has(input.value);
  });
  if (els.discoverTypeFilterSummary) els.discoverTypeFilterSummary.textContent = discoverSelectionLabel([...selected]);
}

const DEFAULT_LIBRARY_PREFS = { defaultTypeKeys: null };
let currentUser = null;
let appStarted = false;
let localOnlyMode = false;
let cloudSyncTimer = null;
let cloudSyncBusy = false;
let cloudSyncQueued = false;
let lastCloudUpdatedAt = '';
let discoverFeedObserver = null;


const state = {
  items: loadJSON(ITEMS_KEY, []),
  settings: API_CONFIG,
  cache: loadJSON(CACHE_KEY, {}),
  customTypes: loadJSON(CUSTOM_TYPES_KEY, []),
  history: loadJSON(HISTORY_KEY, []),
  discoverPrefs: loadJSON(DISCOVER_PREFS_KEY, DEFAULT_DISCOVER_PREFS),
  stickerPrefs: loadJSON(STICKER_PREFS_KEY, {}),
  streakPrefs: loadJSON(STREAK_PREFS_KEY, {}),
  libraryPrefs: loadJSON(LIBRARY_PREFS_KEY, DEFAULT_LIBRARY_PREFS),
  watchProviderCatalog: [],
  discoverProviderDraft: new Map(),
  selectedSource: null,
  loadedPlaylist: null,
  openDetailId: null,
  discoverResults: new Map(),
  calendarWeekStart: null,
  attachmentDraft: emptyAttachmentDraft(),
  attachmentObjectUrl: null,
  queueView: 'upnext',
  queueTypeFilter: 'all',
  pendingDiscoverKey: null,
  openDiscoverKey: null,
  openDiscoverEpisode: null,
  pendingDiscoverRatingKey: null,
  pendingDiscoverRatingTrackTV: false,
  pendingDiscoverRatingValue: 0,
  pendingDiscoverDateValue: '',
  pendingDiscoverRecommendedValue: false,
  pendingDiscoverCompletionIntent: false,
  discoverQuickAddRollback: null,
  discoverQuickAddCommitted: false,
  pendingRestaurantQuickKey: null,
  pendingRestaurantQuickRating: 0,
  tvDraftProviderId: '',
  tvDraftWatched: new Set(),
  tvDraftInitialWatched: new Set(),
  tvDraftBulkBaseline: null,
  tvDraftLocked: new Set(),
  tvDraftSeasons: [],
  tvDraftDetails: null,
  discoverFeedItems: [],
  discoverFeedSeen: new Set(),
  discoverFeedPage: 0,
  discoverFeedLoading: false,
  discoverFeedDone: false,
  discoverFeedInitialized: false,
  discoverFeedEmptyPasses: 0,
  discoverFeedOffsets: { tv: 1, movie: 1, book: 0 },
  discoverFeedSession: Math.random(),
  discoverMode: 'for-you',
  discoverCalendarMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
  discoverCalendarLoading: false,
  discoverCalendarEntries: [],
  discoverCalendarExpandedDays: new Set(),
  discoverSearchQuery: '',
  discoverGenreCatalog: { tv: [], movie: [] },
  discoverKeywordCatalog: {},
  libraryView: 'all',
  libraryVisibleTypes: null,
  libraryExpandedGroups: new Set(),
  librarySearchQuery: ''
};

console.log('[Config] API availability', {
  lastFmConfigured: Boolean(API_CONFIG.lastfmApiKey),
  lastFmEnvName: API_CONFIG.lastfmApiKeySource || 'missing',
  ticketmasterConfigured: Boolean(API_CONFIG.ticketmasterKey),
  googlePlacesConfigured: Boolean(API_CONFIG.googlePlacesKey),
  googlePlacesEnvName: API_CONFIG.googlePlacesKeySource || 'missing',
  googlePlacesKeyWasNormalized: Boolean(API_CONFIG.googlePlacesKeyWasNormalized),
  tmdbConfigured: Boolean(API_CONFIG.tmdbToken),
  googleBooksConfigured: Boolean(API_CONFIG.googleBooksKey),
  note: 'API keys are intentionally not logged'
});
if (!API_CONFIG.lastfmApiKey) {
  console.warn('[Config][Last.fm] API key not exposed to this build. Set EXPO_PUBLIC_LASTFM_API_KEY (supported by this project’s Vite envPrefix) or VITE_LASTFM_API_KEY, then restart/rebuild the app.');
}



const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const els = {
  authScreen: $('#authScreen'),
  authForm: $('#authForm'),
  authEmail: $('#authEmail'),
  authPassword: $('#authPassword'),
  authMessage: $('#authMessage'),
  signInButton: $('#signInButton'),
  signUpButton: $('#signUpButton'),
  continueLocalButton: $('#continueLocalButton'),
  signOutButton: $('#signOutButton'),
  userEmail: $('#userEmail'),
  syncStatus: $('#syncStatus'),
  upNextList: $('#upNextList'),
  upNextEmpty: $('#upNextEmpty'),
  queueHeading: $('#queueHeading'),
  queueTabs: $$('.queue-tab[data-queue-tab]'),
  queueTypeFilter: $('#queueTypeFilter'),
  openAddModal: $('#openAddModal'),
  openLibraryAdd: $('#openLibraryAdd'),
  openTrackAdd: $('#openTrackAdd'),
  openStickerSettings: $('#openStickerSettings'),
  stickerSettingsModal: $('#stickerSettingsModal'),
  stickerSettingsForm: $('#stickerSettingsForm'),
  stickerSettingsRows: $('#stickerSettingsRows'),
  resetStickerSettings: $('#resetStickerSettings'),
  openStreakSettings: $('#openStreakSettings'),
  streakSettingsModal: $('#stickerSettingsModal'),
  streakSettingsForm: $('#streakSettingsForm'),
  streakSettingsRows: $('#streakSettingsRows'),
  resetStreakSettings: $('#resetStreakSettings'),
  monthPicker: $('#monthPicker'),
  monthLabel: $('#monthLabel'),
  previousMonth: $('#previousMonth'),
  nextMonth: $('#nextMonth'),
  trackerGrid: $('#trackerGrid'),
  trackStreakSummary: $('#trackStreakSummary'),
  weekControls: $('#weekControls'),
  previousWeek: $('#previousWeek'),
  currentWeek: $('#currentWeek'),
  nextWeek: $('#nextWeek'),
  typeFilter: $('#typeFilter'),
  typeFilterSummary: $('#typeFilterSummary'),
  typeFilterOptions: $('#typeFilterOptions'),
  librarySort: $('#librarySort'),
  librarySearch: $('#librarySearch'),
  openLibrarySettings: $('#openLibrarySettings'),
  librarySettingsModal: $('#librarySettingsModal'),
  librarySettingsForm: $('#librarySettingsForm'),
  libraryDefaultTypeOptions: $('#libraryDefaultTypeOptions'),
  resetLibraryDefaults: $('#resetLibraryDefaults'),
  libraryViewTabs: $$('.library-folder-tab[data-library-view]'),
  libraryGroups: $('#libraryGroups'),
  libraryEmpty: $('#libraryEmpty'),
  refreshDiscover: $('#refreshDiscover'),
  discoverStatus: $('#discoverStatus'),
  discoverFeed: $('#discoverFeed'),
  discoverFeedSentinel: $('#discoverFeedSentinel'),
  discoverFeedMessage: $('#discoverFeedMessage'),
  discoverFeedSection: $('#discoverFeedSection'),
  discoverCalendarSection: $('#discoverCalendarSection'),
  discoverCalendarGrid: $('#discoverCalendarGrid'),
  discoverCalendarMonthLabel: $('#discoverCalendarMonthLabel'),
  discoverCalendarMessage: $('#discoverCalendarMessage'),
  discoverCalendarPrevious: $('#discoverCalendarPrevious'),
  discoverCalendarToday: $('#discoverCalendarToday'),
  discoverCalendarNext: $('#discoverCalendarNext'),
  discoverModeTabs: $$('.discover-mode-tab[data-discover-mode]'),
  discoverTypeFilter: $('#discoverTypeFilter'),
  discoverTypeFilterOptions: $('#discoverTypeFilterOptions'),
  discoverTypeFilterSummary: $('#discoverTypeFilterSummary'),
  discoverGenreFilter: $('#discoverGenreFilter'),
  discoverUpcomingWindowField: $('#discoverUpcomingWindowField'),
  discoverUpcomingWindow: $('#discoverUpcomingWindow'),
  discoverSearchForm: $('#discoverSearchForm'),
  discoverSearchInput: $('#discoverSearchInput'),
  clearDiscoverSearch: $('#clearDiscoverSearch'),
  discoverFeedIntroText: $('#discoverFeedIntroText'),
  discoverTrendingTV: $('#discoverTrendingTV'),
  discoverTrendingMovies: $('#discoverTrendingMovies'),
  discoverNewBooks: $('#discoverNewBooks'),
  discoverRecommendationsBlock: $('#discoverRecommendationsBlock'),
  discoverRecommendations: $('#discoverRecommendations'),
  discoverQueueModal: $('#discoverQueueModal'),
  discoverQueueTitle: $('#discoverQueueTitle'),
  discoverRatingModal: $('#discoverRatingModal'),
  discoverRatingTitle: $('#discoverRatingTitle'),
  discoverRatingPicker: $('#discoverRatingPicker'),
  discoverRatingRecommendHeart: $('#discoverRatingRecommendHeart'),
  discoverRatingDate: $('#discoverRatingDate'),
  restaurantQuickAddModal: $('#restaurantQuickAddModal'),
  restaurantQuickAddTitle: $('#restaurantQuickAddTitle'),
  restaurantQuickAddDate: $('#restaurantQuickAddDate'),
  restaurantQuickAddRatingPicker: $('#restaurantQuickAddRatingPicker'),
  openDiscoverSettings: $('#openDiscoverSettings'),
  discoverSettingsModal: $('#discoverSettingsModal'),
  discoverSettingsForm: $('#discoverSettingsForm'),
  streamingProviderSearch: $('#streamingProviderSearch'),
  streamingProviderOptions: $('#streamingProviderOptions'),
  streamingRegionNote: $('#streamingRegionNote'),
  prioritizeAuthors: $('#prioritizeAuthors'),
  englishTVOnly: $('#englishTVOnly'),
  clearStreamingProviders: $('#clearStreamingProviders'),
  eventCity: $('#eventCity'),
  eventCountry: $('#eventCountry'),
  eventEverything: $('#eventEverything'),
  eventCategoryOptions: $('#eventCategoryOptions'),
  eventExclusionOptions: $('#eventExclusionOptions'),
  eventPriorityTerms: $('#eventPriorityTerms'),
  eventCalendarFollowTerms: $('#eventCalendarFollowTerms'),
  eventAutoLikedArtistCalendar: $('#eventAutoLikedArtistCalendar'),
  itemModal: $('#itemModal'),
  detailModal: $('#detailModal'),
  detailBody: $('#detailBody'),
  historyEditModal: $('#historyEditModal'),
  historyEditForm: $('#historyEditForm'),
  historyEditId: $('#historyEditId'),
  historyEditTitle: $('#historyEditTitle'),
  historyEditType: $('#historyEditType'),
  historyEditSubcategory: $('#historyEditSubcategory'),
  historyEditSubtitle: $('#historyEditSubtitle'),
  historyEditDate: $('#historyEditDate'),
  historyEditRating: $('#historyEditRating'),
  historyEditNote: $('#historyEditNote'),
  historyEditShowCalendar: $('#historyEditShowCalendar'),
  historyEditDelete: $('#historyEditDelete'),
  historyRatingPicker: $('#historyRatingPicker'),
  historyClearRating: $('#historyClearRating'),
  historyRecommendHeart: $('#historyRecommendHeart'),
  bookProgressModal: $('#bookProgressModal'),
  itemForm: $('#itemForm'),
  itemSourceType: $('#itemSourceType'),
  displayTypeBlock: $('#displayTypeBlock'),
  itemDisplayType: $('#itemDisplayType'),
  itemSubcategory: $('#itemSubcategory'),
  displayTypeLabel: $('#displayTypeLabel'),
  displayTypeHint: $('#displayTypeHint'),
  catalogueSearchBlock: $('#catalogueSearchBlock'),
  catalogueQuery: $('#catalogueQuery'),
  catalogueSearchButton: $('#catalogueSearchButton'),
  searchResults: $('#searchResults'),
  selectedSource: $('#selectedSource'),
  workoutBlock: $('#workoutBlock'),
  reminderBlock: $('#reminderBlock'),
  reminderFrequency: $('#reminderFrequency'),
  reminderDateField: $('#reminderDateField'),
  reminderDateLabel: $('#reminderDateLabel'),
  reminderDueDate: $('#reminderDueDate'),
  reminderCustomFields: $('#reminderCustomFields'),
  reminderInterval: $('#reminderInterval'),
  reminderIntervalUnit: $('#reminderIntervalUnit'),
  reminderWeekdayField: $('#reminderWeekdayField'),
  reminderWeekday: $('#reminderWeekday'),
  playlistInput: $('#playlistInput'),
  playlistLoadButton: $('#playlistLoadButton'),
  playlistPreview: $('#playlistPreview'),
  manualTitleBlock: $('#manualTitleBlock'),
  manualTitle: $('#manualTitle'),
  tvProgressFields: $('#tvProgressFields'),
  nextSeason: $('#nextSeason'),
  nextEpisode: $('#nextEpisode'),
  tvWatchSetupStatus: $('#tvWatchSetupStatus'),
  tvWatchSetupList: $('#tvWatchSetupList'),
  tvMarkAllWatched: $('#tvMarkAllWatched'),
  tvClearWatched: $('#tvClearWatched'),
  bookProgressFields: $('#bookProgressFields'),
  bookCurrentPage: $('#bookCurrentPage'),
  bookTotalPages: $('#bookTotalPages'),
  bookStartDate: $('#bookStartDate'),
  bookEndDate: $('#bookEndDate'),
  itemRating: $('#itemRating'),
  starPicker: $('#starPicker'),
  clearRating: $('#clearRating'),
  itemNote: $('#itemNote'),
  itemFiles: $('#itemFiles'),
  attachmentEditorList: $('#attachmentEditorList'),
  itemLinkLabel: $('#itemLinkLabel'),
  itemLinkUrl: $('#itemLinkUrl'),
  addItemLink: $('#addItemLink'),
  linkEditorList: $('#linkEditorList'),
  attachmentModal: $('#attachmentModal'),
  attachmentTitle: $('#attachmentTitle'),
  attachmentBody: $('#attachmentBody'),
  itemDate: $('#itemDate'),
  itemDateField: $('#itemDateField'),
  itemReleaseDate: $('#itemReleaseDate'),
  itemReleaseDateField: $('#itemReleaseDateField'),
  itemRecommended: $('#itemRecommended'),
  itemRecommendHeart: $('#itemRecommendHeart'),
  queueStatusField: $('#queueStatusField'),
  itemQueueStatus: $('#itemQueueStatus'),
  editingId: $('#editingId'),
  provider: $('#provider'),
  providerId: $('#providerId'),
  providerImage: $('#providerImage'),
  providerSubtitle: $('#providerSubtitle'),
  itemModalEyebrow: $('#itemModalEyebrow'),
  itemModalTitle: $('#itemModalTitle'),
  deleteItem: $('#deleteItem'),
  formMessage: $('#formMessage'),
  bookProgressForm: $('#bookProgressForm'),
  bookProgressId: $('#bookProgressId'),
  bookProgressTitle: $('#bookProgressTitle'),
  progressCurrentPage: $('#progressCurrentPage'),
  progressTotalPages: $('#progressTotalPages'),
  bookPeriodsList: $('#bookPeriodsList'),
  bookAddPeriod: $('#bookAddPeriod'),
  bookPauseResume: $('#bookPauseResume')
};

bootstrapAuth();

async function bootstrapAuth() {
  bindAuthEvents();

  if (!hasSupabaseConfig) {
    lockApp();
    setAuthMessage('Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env, then rebuild the site.', true);
    if (els.continueLocalButton) els.continueLocalButton.hidden = false;
    return;
  }

  setAuthMessage('Checking your session…', false);
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    lockApp();
    setAuthMessage(error.message || 'Could not check your session.', true);
    return;
  }

  if (data.session?.user) {
    await startForUser(data.session.user);
  } else {
    lockApp();
    setAuthMessage('', false);
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      currentUser = null;
      clearLocalSyncedState();
      window.location.reload();
      return;
    }
    if (session?.user && !currentUser) startForUser(session.user);
  });
}

function bindAuthEvents() {
  els.authForm?.addEventListener('submit', handleAuthSubmit);
  els.continueLocalButton?.addEventListener('click', async () => {
    localOnlyMode = true;
    await hydrateLargeLocalState();
    unlockApp();
    startAppOnce();
  });
  els.signOutButton?.addEventListener('click', handleSignOut);
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const action = event.submitter?.dataset?.authAction || 'signin';
  if (!hasSupabaseConfig || !supabase) {
    setAuthMessage('Supabase is not configured in this deployment. Add the Supabase URL and publishable key to the GitHub Actions secrets, then rebuild the site.', true);
    return;
  }

  if (!els.authForm?.reportValidity()) return;

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;

  setAuthBusy(true);

  try {
    if (action === 'signup') {
      setAuthMessage('Creating your account…', false);

      // Do not force a redirect URL here. Supabase will use the Site URL
      // configured under Authentication → URL Configuration. This avoids
      // signup failures caused by a GitHub Pages path not matching the allow-list.
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        const message = friendlyAuthError(error, 'signup');
        setAuthMessage(message, true);
        return;
      }

      if (data.session?.user) {
        await startForUser(data.session.user);
      } else if (data.user) {
        setAuthMessage('Account created. Check your email for the confirmation link, then return here and sign in.', false);
      } else {
        setAuthMessage('Supabase accepted the signup request. If email confirmation is enabled, check your inbox before signing in.', false);
      }
      return;
    }

    setAuthMessage('Signing in…', false);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthMessage(friendlyAuthError(error, 'signin'), true);
      return;
    }

    if (data.user) await startForUser(data.user);
  } catch (error) {
    console.error('Authentication error:', error);
    setAuthMessage(`Authentication failed: ${error?.message || 'Unknown error'}`, true);
  } finally {
    setAuthBusy(false);
  }
}

function friendlyAuthError(error, action) {
  const message = String(error?.message || 'Authentication failed.');
  const lower = message.toLowerCase();

  if (lower.includes('signup') && lower.includes('disabled')) {
    return 'New account creation is disabled in Supabase. In Supabase, open Authentication → Sign In / Providers → Email and enable new-user signups.';
  }
  if (lower.includes('email') && lower.includes('disabled')) {
    return 'Email authentication is disabled in Supabase. Enable the Email provider under Authentication → Sign In / Providers.';
  }
  if (lower.includes('redirect')) {
    return 'Supabase rejected the authentication redirect. Set the Site URL to your GitHub Pages address under Authentication → URL Configuration.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'That email/password combination was not recognized. If you just created the account, confirm your email first.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your account exists, but the email has not been confirmed yet. Open the confirmation email from Supabase first.';
  }
  if (lower.includes('password')) {
    return message;
  }
  if (action === 'signup' && lower.includes('user already registered')) {
    return 'An account with that email already exists. Use Sign in instead.';
  }
  return message;
}

async function handleSignOut() {
  if (!supabase) return;
  setSyncStatus('Signing out…');
  await supabase.auth.signOut();
}

async function startForUser(user) {
  if (!user || currentUser?.id === user.id) return;
  currentUser = user;
  if (els.userEmail) els.userEmail.textContent = user.email || '';
  setAuthMessage('Loading your profile…', false);
  try {
    await hydrateLargeLocalState();
    await hydrateCloudProfile(user.id);
    unlockApp();
    startAppOnce();
    setSyncStatus('Synced');
    window.addEventListener('focus', refreshCloudProfile);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshCloudProfile();
    });
  } catch (error) {
    currentUser = null;
    lockApp();
    setAuthMessage(`Signed in, but your cloud profile could not load: ${error.message}`, true);
  }
}

function startAppOnce() {
  if (appStarted) {
    renderAll();
    return;
  }
  appStarted = true;
  init();
}

function lockApp() {
  document.body.classList.remove('auth-pending');
  document.body.classList.add('auth-locked');
  if (els.authScreen) els.authScreen.hidden = false;
}

function unlockApp() {
  document.body.classList.remove('auth-pending', 'auth-locked');
  if (els.authScreen) els.authScreen.hidden = true;
}

function setAuthBusy(busy) {
  if (els.signInButton) els.signInButton.disabled = busy;
  if (els.signUpButton) els.signUpButton.disabled = busy;
}

function setAuthMessage(message, isError = false) {
  if (!els.authMessage) return;
  els.authMessage.textContent = message;
  els.authMessage.hidden = !message;
  els.authMessage.classList.toggle('is-error', Boolean(isError));
}

function setSyncStatus(message, isError = false) {
  if (!els.syncStatus) return;
  els.syncStatus.textContent = message;
  els.syncStatus.classList.toggle('is-error', Boolean(isError));
}

const MUSIC_SUBCATEGORY_BY_SOURCE = Object.freeze({
  artist: 'Artist',
  song: 'Song',
  concert: 'Concert'
});

function musicSubcategoryForSourceType(sourceType) {
  return MUSIC_SUBCATEGORY_BY_SOURCE[sourceType] || '';
}

function inferredMusicSubcategory(item) {
  if (!item) return '';
  const sourceType = getSourceType(item);
  const fixed = musicSubcategoryForSourceType(sourceType);
  if (fixed) return fixed;
  if (sourceType !== 'music') return '';
  const existing = cleanTypeLabel(item.subcategory || '');
  if (existing) return existing;
  // iTunes `music` results in this app are album results. Manual Music items are
  // allowed to remain uncategorized (or use any user-entered subcategory).
  if (item.provider === 'itunes' && item.providerId) return 'Album';
  return '';
}

function normalizeMusicFamilyItem(item) {
  if (!item) return false;
  const sourceType = getSourceType(item);
  if (!['music', 'artist', 'song', 'concert'].includes(sourceType)) return false;
  const subcategory = inferredMusicSubcategory(item);
  let changed = false;
  if (item.type !== 'music') { item.type = 'music'; changed = true; }
  if (item.typeLabel !== 'Music') { item.typeLabel = 'Music'; changed = true; }
  if (subcategory && cleanTypeLabel(item.subcategory || '') !== subcategory) { item.subcategory = subcategory; changed = true; }
  return changed;
}

const FOOD_SUBCATEGORY_BY_SOURCE = Object.freeze({
  restaurant: 'Restaurant',
  recipe: 'Recipe'
});

function foodSubcategoryForSourceType(sourceType) {
  return FOOD_SUBCATEGORY_BY_SOURCE[sourceType] || '';
}

function normalizeFoodFamilyItem(item) {
  if (!item) return false;
  const sourceType = getSourceType(item);
  if (!['food','restaurant','recipe'].includes(sourceType)) return false;
  const subcategory = foodSubcategoryForSourceType(sourceType) || cleanTypeLabel(item.subcategory || '');
  let changed = false;
  if (item.type !== 'food') { item.type = 'food'; changed = true; }
  if (item.typeLabel !== 'Food') { item.typeLabel = 'Food'; changed = true; }
  if (subcategory && cleanTypeLabel(item.subcategory || '') !== subcategory) { item.subcategory = subcategory; changed = true; }
  return changed;
}

function migrateSavedFoodClassification() {
  let itemsChanged = false;
  let historyChanged = false;
  for (const item of state.items) if (normalizeFoodFamilyItem(item)) itemsChanged = true;
  for (const entry of state.history) {
    const source = entry.sourceItemId ? state.items.find(item => item.id === entry.sourceItemId) : null;
    const sourceType = source ? getSourceType(source) : entry.sourceType || '';
    if (!['food','restaurant','recipe'].includes(sourceType)) continue;
    const subcategory = source ? (foodSubcategoryForSourceType(sourceType) || source.subcategory || '') : (foodSubcategoryForSourceType(sourceType) || entry.subcategory || '');
    if (entry.type !== 'food') { entry.type = 'food'; historyChanged = true; }
    if (entry.typeLabel !== 'Food') { entry.typeLabel = 'Food'; historyChanged = true; }
    if (subcategory && cleanTypeLabel(entry.subcategory || '') !== cleanTypeLabel(subcategory)) { entry.subcategory = cleanTypeLabel(subcategory); historyChanged = true; }
  }
  if (itemsChanged) saveItems();
  if (historyChanged) saveHistory();
}

function migrateSavedMusicClassification() {
  let itemsChanged = false;
  let historyChanged = false;
  for (const item of state.items) {
    if (normalizeMusicFamilyItem(item)) itemsChanged = true;
    const sourceType = getSourceType(item);
    if (!['event', 'concert'].includes(sourceType)) continue;

    // Older Discover + Calendar entries went straight onto the tracked Calendar.
    // They now become scheduled Up Next calendar entries and wait for the explicit check.
    if (item.discoverCalendarOnly === true && item.queueCalendarScheduled !== true) {
      item.queueCalendarScheduled = true;
      item.calendarTracked = false;
      item.calendarExplicit = false;
      item.calendarHidden = true;
      item.calendarQueueOnly = true;
      itemsChanged = true;
    }
  }

  for (const entry of state.history) {
    const source = entry.sourceItemId ? state.items.find(item => item.id === entry.sourceItemId) : null;
    let sourceType = source ? getSourceType(source) : '';
    if (!sourceType && ['artist', 'song', 'concert'].includes(entry.type)) sourceType = entry.type;
    if (!sourceType && entry.type === 'music') {
      const current = cleanTypeLabel(entry.subcategory || '');
      sourceType = current === 'Artist' ? 'artist' : current === 'Song' ? 'song' : current === 'Concert' ? 'concert' : 'music';
    }
    if (!['music', 'artist', 'song', 'concert'].includes(sourceType)) continue;
    const currentSubcategory = cleanTypeLabel(entry.subcategory || '');
    const subcategory = source ? inferredMusicSubcategory(source) : (musicSubcategoryForSourceType(sourceType) || currentSubcategory);
    if (entry.type !== 'music') { entry.type = 'music'; historyChanged = true; }
    if (entry.typeLabel !== 'Music') { entry.typeLabel = 'Music'; historyChanged = true; }
    if (subcategory && currentSubcategory !== subcategory) { entry.subcategory = subcategory; historyChanged = true; }
  }

  if (itemsChanged) saveItems();
  if (historyChanged) saveHistory();
}

function init() {
  migrateSavedMusicClassification();
  migrateSavedFoodClassification();
  reconcileLocalProgressQueues();
  const now = new Date();
  if (els.monthPicker) {
    els.monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  state.calendarWeekStart = startOfWeek(now);

  bindEvents();
  renderAll();
}

function resetDialogScrollPosition(dialog) {
  if (!dialog) return;
  dialog.scrollTop = 0;
  dialog.scrollLeft = 0;
  const scrollables = dialog.querySelectorAll('*');
  for (const element of scrollables) {
    if (!(element instanceof HTMLElement)) continue;
    const style = getComputedStyle(element);
    const canScrollY = ['auto', 'scroll'].includes(style.overflowY) && element.scrollHeight > element.clientHeight;
    const canScrollX = ['auto', 'scroll'].includes(style.overflowX) && element.scrollWidth > element.clientWidth;
    if (canScrollY) element.scrollTop = 0;
    if (canScrollX) element.scrollLeft = 0;
  }
}

function showDialogAtTop(dialog) {
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
  const reset = () => resetDialogScrollPosition(dialog);
  reset();
  requestAnimationFrame(() => {
    reset();
    requestAnimationFrame(reset);
  });
}

function enableMobileDialogSwipeToClose() {
  const dialogs = [...document.querySelectorAll('dialog.modal')];
  for (const dialog of dialogs) {
    if (dialog.dataset.swipeCloseBound === 'true') continue;
    dialog.dataset.swipeCloseBound = 'true';

    let startY = 0;
    let lastY = 0;
    let startTime = 0;
    let dragging = false;

    dialog.addEventListener('touchstart', event => {
      if (!window.matchMedia('(max-width: 760px)').matches || !dialog.open || dialog.scrollTop > 0) return;
      const touch = event.touches[0];
      if (!touch) return;
      const rect = dialog.getBoundingClientRect();
      if (touch.clientY > rect.top + 76) return;
      if (event.target.closest('button, input, select, textarea, a, label')) return;
      startY = lastY = touch.clientY;
      startTime = performance.now();
      dragging = true;
      dialog.classList.add('is-swipe-dragging');
    }, { passive: true });

    dialog.addEventListener('touchmove', event => {
      if (!dragging) return;
      const touch = event.touches[0];
      if (!touch) return;
      const delta = Math.max(0, touch.clientY - startY);
      lastY = touch.clientY;
      if (delta < 4) return;
      event.preventDefault();
      dialog.style.transform = `translateY(${delta}px)`;
    }, { passive: false });

    const finishSwipe = () => {
      if (!dragging) return;
      const delta = Math.max(0, lastY - startY);
      const elapsed = Math.max(1, performance.now() - startTime);
      const velocity = delta / elapsed;
      dragging = false;
      dialog.classList.remove('is-swipe-dragging');
      if (delta > 115 || (delta > 55 && velocity > 0.65)) {
        dialog.style.transform = 'translateY(105%)';
        setTimeout(() => {
          dialog.style.transform = '';
          if (dialog.open) dialog.close();
        }, 150);
      } else {
        dialog.style.transform = '';
      }
    };

    dialog.addEventListener('touchend', finishSwipe, { passive: true });
    dialog.addEventListener('touchcancel', finishSwipe, { passive: true });
    dialog.addEventListener('close', () => {
      dragging = false;
      dialog.classList.remove('is-swipe-dragging');
      dialog.style.transform = '';
    });
  }
}

function bindEvents() {
  els.openAddModal?.addEventListener('click', () => openItemModal('', state.queueView === 'tbr' ? 'tbr' : 'upnext'));
  els.queueTabs?.forEach(tab => tab.addEventListener('click', () => setQueueView(tab.dataset.queueTab)));
  els.queueTypeFilter?.addEventListener('change', () => {
    state.queueTypeFilter = els.queueTypeFilter.value || 'all';
    renderUpNext();
  });
  els.openLibraryAdd?.addEventListener('click', () => openItemModal());
  els.openTrackAdd?.addEventListener('click', () => openItemModal('', 'library'));
  els.openStickerSettings?.addEventListener('click', openStickerSettings);
  els.stickerSettingsModal?.querySelectorAll('[data-track-settings-tab]').forEach(tab => {
    tab.addEventListener('click', () => setTrackSettingsTab(tab.dataset.trackSettingsTab));
  });
  els.stickerSettingsForm?.addEventListener('submit', saveStickerSettings);
  els.stickerSettingsRows?.addEventListener('input', previewStickerSettings);
  els.stickerSettingsRows?.addEventListener('change', previewStickerSettings);
  els.resetStickerSettings?.addEventListener('click', resetStickerSettings);
  els.openStreakSettings?.addEventListener('click', openStreakSettings);
  els.streakSettingsForm?.addEventListener('submit', saveStreakSettings);
  els.streakSettingsRows?.addEventListener('change', previewStreakSettings);
  els.resetStreakSettings?.addEventListener('click', resetStreakSettings);
  els.itemSourceType?.addEventListener('change', () => {
    clearSourceSelectionForTypeChange();
    updateItemFormForType();
  });
  els.catalogueSearchButton?.addEventListener('click', searchCatalogue);
  els.catalogueQuery?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchCatalogue();
    }
  });
  els.playlistLoadButton?.addEventListener('click', loadPlaylistPreview);
  els.reminderFrequency?.addEventListener('change', updateReminderFormFields);
  els.reminderIntervalUnit?.addEventListener('change', updateReminderFormFields);
  els.tvWatchSetupList?.addEventListener('change', handleTVDraftEpisodeToggle);
  els.tvWatchSetupList?.addEventListener('click', handleTVDraftSeasonAction);
  els.tvMarkAllWatched?.addEventListener('click', toggleAllTVDraftEpisodes);
  els.tvClearWatched?.addEventListener('click', () => { state.tvDraftBulkBaseline = null; setAllTVDraftEpisodes(false); });
  els.itemForm?.addEventListener('submit', saveItemFromForm);
  els.deleteItem?.addEventListener('click', deleteEditingItem);
  els.historyEditForm?.addEventListener('submit', saveHistoryEdit);
  els.historyEditDelete?.addEventListener('click', deleteHistoryEdit);
  els.historyRatingPicker?.addEventListener('click', chooseHistoryRating);
  els.historyClearRating?.addEventListener('click', () => setHistoryRating(0));
  els.starPicker?.addEventListener('click', chooseRating);
  els.clearRating?.addEventListener('click', () => setRating(0));
  els.itemRecommendHeart?.addEventListener('click', toggleItemFormRecommended);
  els.historyRecommendHeart?.addEventListener('click', toggleHistorySourceRecommended);
  els.itemFiles?.addEventListener('change', addDraftFiles);
  els.addItemLink?.addEventListener('click', addDraftLink);
  els.attachmentEditorList?.addEventListener('click', handleAttachmentEditorClick);
  els.linkEditorList?.addEventListener('click', handleLinkEditorClick);
  els.attachmentModal?.addEventListener('close', cleanupAttachmentViewer);
  els.monthPicker?.addEventListener('change', () => {
    const [year, month] = els.monthPicker.value.split('-').map(Number);
    state.calendarWeekStart = startOfWeek(new Date(year, month - 1, 1, 12));
    renderTracker();
  });
  els.previousMonth?.addEventListener('click', () => shiftCalendarMonth(-1));
  els.nextMonth?.addEventListener('click', () => shiftCalendarMonth(1));
  els.previousWeek?.addEventListener('click', () => shiftCalendarWeek(-7));
  els.nextWeek?.addEventListener('click', () => shiftCalendarWeek(7));
  els.currentWeek?.addEventListener('click', () => {
    state.calendarWeekStart = startOfWeek(new Date());
    renderTracker();
  });
  mobileCalendarQuery.addEventListener?.('change', () => {
    if (els.trackerGrid) renderTracker();
    if (els.upNextList && state.queueView === 'tbr') renderUpNext();
  });
  els.typeFilterOptions?.addEventListener('change', handleLibraryTypeFilterChange);
  els.librarySort?.addEventListener('change', renderLibrary);
  els.librarySearch?.addEventListener('input', () => { state.librarySearchQuery = els.librarySearch.value || ''; renderLibrary(); });
  els.openLibrarySettings?.addEventListener('click', openLibrarySettings);
  els.librarySettingsForm?.addEventListener('submit', saveLibrarySettings);
  els.resetLibraryDefaults?.addEventListener('click', resetLibrarySettingsDraft);
  els.libraryViewTabs?.forEach(tab => tab.addEventListener('click', () => setLibraryView(tab.dataset.libraryView)));
  els.upNextList?.addEventListener('click', handleUpNextClick);
  els.trackerGrid?.addEventListener('click', handleTrackerClick);
  els.libraryGroups?.addEventListener('click', handleLibraryClick);
  els.refreshDiscover?.addEventListener('click', () => renderDiscover(true));
  els.discoverCalendarPrevious?.addEventListener('click', () => shiftDiscoverCalendarMonth(-1));
  els.discoverCalendarToday?.addEventListener('click', () => jumpDiscoverCalendarToToday());
  els.discoverCalendarNext?.addEventListener('click', () => shiftDiscoverCalendarMonth(1));
  els.discoverCalendarGrid?.addEventListener('click', handleDiscoverCalendarClick);
  els.discoverModeTabs?.forEach(tab => tab.addEventListener('click', () => setDiscoverMode(tab.dataset.discoverMode)));
  els.discoverTypeFilterOptions?.addEventListener('change', async event => {
    const changed = event.target.closest('input[type="checkbox"][value]');
    if (!changed) return;
    let selected = [...els.discoverTypeFilterOptions.querySelectorAll('input[type="checkbox"][value]:checked')].map(input => input.value);
    if (!selected.length) {
      changed.checked = true;
      selected = [changed.value];
    }
    state.discoverPrefs = { ...DEFAULT_DISCOVER_PREFS, ...state.discoverPrefs, contentTypes: selected };
    delete state.discoverPrefs.contentType;
    safeLocalSet(DISCOVER_PREFS_KEY, JSON.stringify(state.discoverPrefs));
    scheduleCloudSync();
    syncDiscoverTypeFilterUI();
    await refreshDiscoverForFilters();
  });
  els.discoverGenreFilter?.addEventListener('change', async () => {
    state.discoverPrefs = { ...DEFAULT_DISCOVER_PREFS, ...state.discoverPrefs, genre: els.discoverGenreFilter.value || 'all' };
    safeLocalSet(DISCOVER_PREFS_KEY, JSON.stringify(state.discoverPrefs));
    scheduleCloudSync();
    await refreshDiscoverForFilters();
  });
  els.discoverUpcomingWindow?.addEventListener('change', async () => {
    state.discoverPrefs = {
      ...DEFAULT_DISCOVER_PREFS,
      ...state.discoverPrefs,
      upcomingHorizonDays: Number(els.discoverUpcomingWindow.value || 30)
    };
    safeLocalSet(DISCOVER_PREFS_KEY, JSON.stringify(state.discoverPrefs));
    scheduleCloudSync();
    if (state.discoverMode === 'new') {
      resetDiscoverFeed(false);
      await loadMoreDiscoverFeed();
    }
  });
  els.discoverSearchForm?.addEventListener('submit', async event => {
    event.preventDefault();
    await runDiscoverSearch();
  });
  els.clearDiscoverSearch?.addEventListener('click', async () => {
    state.discoverSearchQuery = '';
    if (els.discoverSearchInput) els.discoverSearchInput.value = '';
    els.clearDiscoverSearch.hidden = true;
    resetDiscoverFeed(false);
    updateDiscoverModeUI();
    await loadMoreDiscoverFeed();
  });
  els.openDiscoverSettings?.addEventListener('click', openDiscoverSettings);
  els.discoverSettingsForm?.addEventListener('submit', saveDiscoverSettings);
  els.eventEverything?.addEventListener('change', syncTicketmasterPreferenceControls);
  els.streamingProviderSearch?.addEventListener('input', () => renderStreamingProviderOptions(els.streamingProviderSearch.value));
  els.streamingProviderOptions?.addEventListener('change', handleStreamingProviderToggle);
  els.clearStreamingProviders?.addEventListener('click', clearStreamingProviderSelection);
  document.querySelector('#discover')?.addEventListener('click', handleDiscoverClick);
  els.discoverQueueModal?.addEventListener('click', handleDiscoverQueueChoice);
  els.discoverRatingModal?.addEventListener('click', handleDiscoverRatingChoice);
  els.restaurantQuickAddModal?.addEventListener('click', handleRestaurantQuickAddChoice);
  els.detailBody?.addEventListener('click', handleDiscoverQuickMetaClick);
  els.discoverRatingModal?.addEventListener('close', () => {
    // Discover quick-add is intentionally write-free until Continue is pressed.
    // Closing with X / Escape / swipe therefore needs no rollback.
    state.pendingDiscoverRatingKey = null;
    state.pendingDiscoverRatingTrackTV = false;
    state.pendingDiscoverRatingValue = 0;
    state.pendingDiscoverDateValue = '';
    state.pendingDiscoverRecommendedValue = false;
    state.pendingDiscoverCompletionIntent = false;
    if (els.discoverRatingDate) els.discoverRatingDate.value = '';
  });
  els.restaurantQuickAddModal?.addEventListener('close', () => { state.pendingRestaurantQuickKey = null; state.pendingRestaurantQuickRating = 0; if (els.restaurantQuickAddDate) els.restaurantQuickAddDate.value = ''; });
  els.bookProgressForm?.addEventListener('submit', saveBookProgress);
  els.bookAddPeriod?.addEventListener('click', () => addBookPeriodEditorRow({ startDate: todayString(), endDate: '' }));
  els.bookPauseResume?.addEventListener('click', toggleBookPauseResume);
  els.bookPeriodsList?.addEventListener('click', handleBookPeriodEditorClick);
  els.bookPeriodsList?.addEventListener('input', updateBookPauseResumeButton);
  enableMobileDialogSwipeToClose();

  document.addEventListener('click', async event => {
    const close = event.target.closest('[data-close]');
    if (close) {
      event.preventDefault();
      event.stopPropagation();
      document.getElementById(close.dataset.close)?.close();
      return;
    }

    const libraryTrack = event.target.closest('[data-library-track]');
    if (libraryTrack) {
      const item = findItem(libraryTrack.dataset.libraryTrack || state.openDetailId);
      if (item) await trackLibraryItem(item, libraryTrack);
      return;
    }

    const libraryDnf = event.target.closest('[data-library-dnf]');
    if (libraryDnf) {
      const item = findItem(libraryDnf.dataset.libraryDnf || state.openDetailId);
      if (item) openDnfChoice(item);
      return;
    }

    const dnfChoice = event.target.closest('[data-dnf-choice]');
    if (dnfChoice) {
      const dialog = document.getElementById('dnfChoiceModal');
      const item = findItem(dialog?.dataset.itemId || '');
      if (item) await applyLibraryDnfChoice(item, dnfChoice.dataset.dnfChoice);
      return;
    }

    const restaurantSuggestion = event.target.closest('[data-restaurant-suggestion]');
    if (restaurantSuggestion) {
      try {
        const result = JSON.parse(restaurantSuggestion.dataset.restaurantSuggestion || '{}');
        els.detailModal?.close();
        openItemModal('', 'library');
        if (els.itemSourceType) els.itemSourceType.value = 'restaurant';
        updateItemFormForType();
        selectCatalogueResult(result);
      } catch {}
      return;
    }

    const recommendToggle = event.target.closest('[data-toggle-recommended]');
    if (recommendToggle) {
      const item = findItem(recommendToggle.dataset.toggleRecommended);
      if (item) {
        item.recommended = !item.recommended;
        item.updatedAt = new Date().toISOString();
        saveItems();
        renderLibrary();
        if (els.detailModal?.open) openDetails(item.id);
      }
      return;
    }

    const discoverRecommend = event.target.closest('[data-discover-recommend]');
    if (discoverRecommend) {
      await toggleDiscoverRecommended(discoverRecommend.dataset.discoverRecommend);
      return;
    }

    const discoverDirectQueue = event.target.closest('[data-discover-direct-queue]');
    if (discoverDirectQueue) {
      const key = discoverDirectQueue.dataset.discoverKey;
      const result = state.discoverResults.get(key);
      if (result) {
        let item = findDiscoverItem(result);
        const target = discoverDirectQueue.dataset.discoverDirectQueue;
        if (!item) item = ensureDiscoverItem(result, target);
        else await moveItemToQueue(item, getQueueStatus(item) === target ? 'library' : target);
        if (!findDiscoverItem(result)?.updatedAt) saveItems();
        renderAll();
        if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
      }
      return;
    }

    const discoverEventCalendar = event.target.closest('[data-discover-event-calendar]');
    if (discoverEventCalendar) {
      const key = discoverEventCalendar.dataset.discoverEventCalendar;
      const result = state.discoverResults.get(key);
      if (result) {
        let item = findDiscoverItem(result);
        if (!item) {
          item = ensureDiscoverItem(result, 'library');
          item.discoverCalendarOnly = true;
          item.calendarQueueOnly = true;
        }
        const scheduling = item.queueCalendarScheduled !== true;
        item.queueCalendarScheduled = scheduling;
        if (!item.date) item.date = result.eventDate || item.eventMeta?.eventDate || '';
        if (scheduling && item.calendarTracked !== true) {
          item.calendarHidden = true;
          item.calendarQueueOnly = true;
        }
        normalizeMusicFamilyItem(item);
        item.updatedAt = new Date().toISOString();
        if (!scheduling && item.calendarQueueOnly === true && item.calendarTracked !== true) {
          state.items = state.items.filter(existing => existing.id !== item.id);
        }
        saveItems();
        renderAll();
        if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
      }
      return;
    }

    const ticketmasterFollow = event.target.closest('[data-ticketmaster-calendar-follow]');
    if (ticketmasterFollow) {
      const key = ticketmasterFollow.dataset.ticketmasterCalendarFollow;
      const result = state.discoverResults.get(key);
      if (result) {
        const eventDetails = result.providerId
          ? await getCached(`ticketmaster:event:${result.providerId}`, () => TrackerAPI.getTicketmasterEvent(result.providerId, state.settings)).catch(() => result)
          : result;
        const term = ticketmasterFollowTermForEvent(eventDetails);
        if (term) {
          const current = normalizedTicketmasterCalendarTerms();
          const normalized = normalizeArtistName(term);
          const exists = current.some(value => normalizeArtistName(value) === normalized);
          state.discoverPrefs = {
            ...DEFAULT_DISCOVER_PREFS,
            ...state.discoverPrefs,
            eventCalendarFollowTerms: exists ? current.filter(value => normalizeArtistName(value) !== normalized) : [...current, term]
          };
          safeLocalSet(DISCOVER_PREFS_KEY, JSON.stringify(state.discoverPrefs));
          scheduleCloudSync();
          if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
        }
      }
      return;
    }

    const libraryRating = event.target.closest('[data-library-rating]');
    if (libraryRating) {
      const item = findItem(libraryRating.dataset.itemId);
      const selected = Number(libraryRating.dataset.libraryRating);
      saveLibraryRating(libraryRating.dataset.itemId, toggledStarRating(item?.rating, selected));
      return;
    }

    const clearLibraryRating = event.target.closest('[data-clear-library-rating]');
    if (clearLibraryRating) {
      saveLibraryRating(clearLibraryRating.dataset.itemId, 0);
      return;
    }

    const saveLibraryMeta = event.target.closest('[data-save-library-meta]');
    if (saveLibraryMeta) {
      saveLibraryPersonalMetadata(saveLibraryMeta.dataset.saveLibraryMeta);
      return;
    }

    const calendarVisibility = event.target.closest('[data-toggle-library-calendar]');
    if (calendarVisibility) {
      const item = findItem(calendarVisibility.dataset.toggleLibraryCalendar);
      if (item) {
        const sourceType = getSourceType(item);
        if (['event', 'concert'].includes(sourceType) && item.queueCalendarScheduled === true) {
          const tracked = !(item.calendarTracked === true && !item.calendarHidden);
          item.calendarTracked = tracked;
          item.calendarExplicit = tracked;
          item.calendarHidden = !tracked;
        } else {
          item.calendarHidden = !Boolean(item.calendarHidden);
        }
        item.updatedAt = new Date().toISOString();
        saveItems();
        renderAll();
        if (els.detailModal?.open) await openDetails(item.id);
      }
      return;
    }

    const edit = event.target.closest('[data-edit-id]');
    if (edit) {
      els.detailModal.close();
      openItemModal(edit.dataset.editId);
      return;
    }

    const attachmentButton = event.target.closest('[data-attachment-id]');
    if (attachmentButton) {
      await openAttachmentViewer(attachmentButton.dataset.attachmentId);
      return;
    }

    const tvEpisodeCheck = event.target.closest('[data-check-tv-episode]');
    if (tvEpisodeCheck) {
      const item = findItem(tvEpisodeCheck.dataset.itemId || state.openDetailId);
      if (item) await toggleSpecificTVEpisode(item, Number(tvEpisodeCheck.dataset.tvSeasonNumber), Number(tvEpisodeCheck.dataset.checkTvEpisode));
      return;
    }

    const youtubeVideoCheck = event.target.closest('[data-check-youtube-video]');
    if (youtubeVideoCheck) {
      const item = findItem(youtubeVideoCheck.dataset.itemId || state.openDetailId);
      if (item) await logSpecificYouTubeVideo(item, youtubeVideoCheck.dataset.checkYoutubeVideo);
      return;
    }

    const youtubeVideoButton = event.target.closest('[data-youtube-video]');
    if (youtubeVideoButton) {
      const item = findItem(youtubeVideoButton.dataset.itemId || state.openDetailId);
      if (item) renderYouTubeVideoDetail(item, youtubeVideoButton.dataset.youtubeVideo);
      return;
    }

    const youtubePlaylistButton = event.target.closest('[data-youtube-playlist]');
    if (youtubePlaylistButton) {
      const item = findItem(youtubePlaylistButton.dataset.itemId || state.openDetailId);
      if (item) renderWorkoutDetails(item);
      return;
    }

    const tvSeasonCheck = event.target.closest('[data-tv-mark-season]');
    if (tvSeasonCheck) {
      const item = findItem(tvSeasonCheck.dataset.itemId || state.openDetailId);
      if (item) await markTVSeasonWatched(item, Number(tvSeasonCheck.dataset.tvMarkSeason));
      return;
    }

    const tvSeriesComplete = event.target.closest('[data-tv-mark-series-complete]');
    if (tvSeriesComplete) {
      const item = findItem(tvSeriesComplete.dataset.tvMarkSeriesComplete || state.openDetailId);
      if (item) await markWholeTVSeriesComplete(item);
      return;
    }

    const bookCompleteItem = event.target.closest('[data-book-mark-complete-item]');
    if (bookCompleteItem) {
      const item = findItem(bookCompleteItem.dataset.bookMarkCompleteItem || state.openDetailId);
      if (item) await markWholeBookComplete(item);
      return;
    }

    const bookDnfToggle = event.target.closest('[data-book-toggle-dnf]');
    if (bookDnfToggle) {
      const item = findItem(bookDnfToggle.dataset.bookToggleDnf || state.openDetailId);
      if (item) await toggleBookDNF(item);
      return;
    }

    const bookCompleteProgress = event.target.closest('[data-book-mark-complete-progress]');
    if (bookCompleteProgress) {
      const item = findItem(els.bookProgressId?.value);
      if (item?.completedAt) {
        await markWholeBookComplete(item);
        els.progressCurrentPage.value = String(item.progress?.currentPage || 0);
        bookCompleteProgress.textContent = '✓ Mark book complete';
        bookCompleteProgress.classList.remove('is-complete');
        return;
      }
      const total = Math.max(0, Number(els.progressTotalPages?.value || 0));
      if (!total) {
        alert('Add the total number of pages first.');
        return;
      }
      els.progressCurrentPage.value = String(total);
      els.bookProgressForm?.requestSubmit();
      return;
    }

    const bookCompleteDraft = event.target.closest('[data-book-mark-complete-draft]');
    if (bookCompleteDraft) {
      const total = Math.max(0, Number(els.bookTotalPages?.value || 0));
      if (!total) {
        alert('Add the total number of pages first.');
        return;
      }
      if (bookCompleteDraft.dataset.bulkActive === 'true') {
        els.bookCurrentPage.value = bookCompleteDraft.dataset.previousPage || '0';
        if (els.bookEndDate) els.bookEndDate.value = bookCompleteDraft.dataset.previousEndDate || '';
        bookCompleteDraft.dataset.bulkActive = 'false';
        bookCompleteDraft.textContent = '✓ Mark book complete';
      } else {
        bookCompleteDraft.dataset.previousPage = els.bookCurrentPage.value || '0';
        bookCompleteDraft.dataset.previousEndDate = els.bookEndDate?.value || '';
        bookCompleteDraft.dataset.bulkActive = 'true';
        els.bookCurrentPage.value = String(total);
        if (els.bookEndDate && !els.bookEndDate.value) els.bookEndDate.value = todayString();
        bookCompleteDraft.textContent = '↶ Mark unread';
      }
      return;
    }

    const reminderCompleteButton = event.target.closest('[data-reminder-complete]');
    if (reminderCompleteButton) {
      const item = findItem(reminderCompleteButton.dataset.reminderComplete);
      if (!item) return;
      const record = reminderCompletionRecord(item);
      addHistoryRecord(record);
      item.lastCompletedAt = new Date().toISOString();
      const oneTime = isOneTimeReminder(item);
      if (oneTime) {
        state.items = state.items.filter(existing => existing.id !== item.id);
      } else {
        setItemQueueStatus(item, 'upnext');
      }
      saveItems();
      saveHistory();
      renderAll();
      if (oneTime) {
        state.openDetailId = null;
        els.detailModal.close();
      } else {
        renderReminderDetails(item);
      }
      return;
    }

    const queueMoveButton = event.target.closest('[data-move-queue]');
    if (queueMoveButton) {
      const item = findItem(queueMoveButton.dataset.itemId || state.openDetailId);
      if (item) await moveItemToQueue(item, queueMoveButton.dataset.moveQueue);
      return;
    }

    const seasonButton = event.target.closest('[data-tv-season]');
    if (seasonButton) {
      const item = findItem(seasonButton.dataset.itemId || state.openDetailId);
      if (item) renderTVSeasonDetail(item, Number(seasonButton.dataset.tvSeason));
      return;
    }

    const episodeButton = event.target.closest('[data-tv-episode]');
    if (episodeButton) {
      const item = findItem(episodeButton.dataset.itemId || state.openDetailId);
      if (item) renderTVEpisodeDetail(item, Number(episodeButton.dataset.tvSeasonNumber), Number(episodeButton.dataset.tvEpisode));
      return;
    }

    const discoverSeasonButton = event.target.closest('[data-discover-season]');
    if (discoverSeasonButton) {
      await renderDiscoverTVDetail(discoverSeasonButton.dataset.discoverKey, Number(discoverSeasonButton.dataset.discoverSeason));
      return;
    }

    const discoverEpisodeCheck = event.target.closest('[data-discover-check-tv-episode]');
    if (discoverEpisodeCheck) {
      await logDiscoverTVEpisode(
        discoverEpisodeCheck.dataset.discoverKey,
        Number(discoverEpisodeCheck.dataset.tvSeasonNumber),
        Number(discoverEpisodeCheck.dataset.discoverCheckTvEpisode)
      );
      return;
    }

    const discoverEpisodeButton = event.target.closest('[data-discover-tv-episode]');
    if (discoverEpisodeButton) {
      await renderDiscoverTVEpisodeDetail(
        discoverEpisodeButton.dataset.discoverKey,
        Number(discoverEpisodeButton.dataset.tvSeasonNumber),
        Number(discoverEpisodeButton.dataset.discoverTvEpisode)
      );
      return;
    }

    const discoverSeasonCheck = event.target.closest('[data-discover-mark-season]');
    if (discoverSeasonCheck) {
      await markDiscoverSeasonWatched(discoverSeasonCheck.dataset.discoverKey, Number(discoverSeasonCheck.dataset.discoverMarkSeason));
      return;
    }

    const discoverAllCheck = event.target.closest('[data-discover-mark-all-tv]');
    if (discoverAllCheck) {
      await markDiscoverSeriesWatched(discoverAllCheck.dataset.discoverKey, discoverAllCheck);
      return;
    }

    const discoverQueueFromDetail = event.target.closest('[data-discover-detail-add]');
    if (discoverQueueFromDetail) {
      openDiscoverQueueChoice(discoverQueueFromDetail.dataset.discoverDetailAdd);
      return;
    }

    const discoverCompleteFromDetail = event.target.closest('[data-discover-detail-complete]');
    if (discoverCompleteFromDetail) {
      await markDiscoverCompleted(discoverCompleteFromDetail.dataset.discoverDetailComplete, { promptForRating: true });
      return;
    }

    const discoverTVRating = event.target.closest('[data-discover-tv-rating]');
    if (discoverTVRating) {
      const key = discoverTVRating.dataset.discoverKey;
      const section = els.detailBody?.querySelector(`[data-discover-tv-meta="${CSS.escape(key)}"]`);
      const selected = Number(discoverTVRating.dataset.discoverTvRating);
      const rating = toggledStarRating(section?.dataset.pendingRating, selected);
      setDiscoverTVPendingRating(key, rating);
      persistDiscoverRating(key, rating);
      return;
    }

    const clearDiscoverTVRating = event.target.closest('[data-clear-discover-tv-rating]');
    if (clearDiscoverTVRating) {
      setDiscoverTVPendingRating(clearDiscoverTVRating.dataset.discoverKey, 0);
      persistDiscoverRating(clearDiscoverTVRating.dataset.discoverKey, 0);
      return;
    }

    const saveDiscoverTVMeta = event.target.closest('[data-save-discover-tv-meta]');
    if (saveDiscoverTVMeta) {
      saveDiscoverTVPersonalMetadata(saveDiscoverTVMeta.dataset.discoverKey);
      return;
    }

    const tvWatchAction = event.target.closest('[data-tv-watch-action]');
    if (tvWatchAction) {
      const item = findItem(tvWatchAction.dataset.itemId || state.openDetailId);
      if (item) await applyTVWatchAction(item, tvWatchAction.dataset.tvWatchAction);
      return;
    }

    const seriesButton = event.target.closest('[data-tv-series]');
    if (seriesButton) {
      const item = findItem(seriesButton.dataset.itemId || state.openDetailId);
      if (item) renderTVDetails(item);
    }
  });
}

function renderAll() {
  reconcileLocalProgressQueues();
  if (els.upNextList) renderUpNext();
  if (els.trackerGrid) renderTracker();
  if (els.trackStreakSummary) renderTrackStreakSummary();
  if (els.libraryGroups) renderLibrary();
  if (els.discoverStatus) renderDiscover();
}

// ---------------------------
// UP NEXT
// ---------------------------
function queueTypeGroupKey(item) {
  return slugifyType(getItemTypeLabel(item));
}

function refreshQueueTypeFilter(items = []) {
  if (!els.queueTypeFilter) return;
  const groups = new Map();
  for (const item of items) {
    const key = queueTypeGroupKey(item);
    if (!groups.has(key)) groups.set(key, getItemTypeLabel(item));
  }
  const sorted = [...groups.entries()].sort((a,b) => a[1].localeCompare(b[1]));
  if (state.queueTypeFilter !== 'all' && !groups.has(state.queueTypeFilter)) state.queueTypeFilter = 'all';
  els.queueTypeFilter.innerHTML = '<option value="all">All types</option>' + sorted
    .map(([key,label]) => `<option value="${escapeAttr(key)}">${escapeHtml(label)}</option>`)
    .join('');
  els.queueTypeFilter.value = state.queueTypeFilter || 'all';
}

async function renderUpNext(options = {}) {
  const skipReconcile = Boolean(options.skipReconcile);
  const view = ['tbr', 'calendar'].includes(state.queueView) ? state.queueView : 'upnext';

  // Every queue tab owns a different layout. Always clear the previous tab's
  // layout classes before rendering so TBR's poster grid cannot leak into the
  // Up Next or Calendar views.
  els.upNextList?.classList.remove('queue-calendar-list', 'tbr-thumbnail-grid', 'tbr-grouped-list');

  if (view === 'calendar') {
    await renderQueueCalendar();
    return;
  }
  const today = todayString();
  const availableItems = state.items.filter(item => {
    if (getQueueStatus(item) !== view) return false;
    if (view === 'upnext' && getSourceType(item) === 'reminder') {
      const dueDate = getNextReminderDueDate(item);
      return !dueDate || dueDate <= today;
    }
    return true;
  });

  refreshQueueTypeFilter(availableItems);
  const selectedType = state.queueTypeFilter || 'all';
  const items = availableItems
    .filter(item => selectedType === 'all' || queueTypeGroupKey(item) === selectedType)
    .sort((a,b) => queueSortKey(a, view).localeCompare(queueSortKey(b, view)));

  if (els.queueHeading) els.queueHeading.textContent = view === 'tbr' ? 'TBR' : 'Up Next';
  els.queueTabs?.forEach(tab => {
    const active = tab.dataset.queueTab === view;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  const thumbnailTBR = view === 'tbr';
  els.upNextList.classList.toggle('tbr-grouped-list', thumbnailTBR);
  els.upNextList.classList.remove('tbr-thumbnail-grid');
  els.upNextList.innerHTML = '';
  els.upNextEmpty.hidden = items.length > 0;
  els.upNextEmpty.textContent = items.length === 0 && availableItems.length > 0
    ? 'No items match this type filter.'
    : view === 'tbr'
      ? 'Save something for later from Discover or the + button.'
      : 'Add something to Up Next to start your queue.';

  if (thumbnailTBR) {
    const grouped = new Map();
    for (const item of items) {
      const key = queueTypeGroupKey(item);
      if (!grouped.has(key)) grouped.set(key, { label: getItemTypeLabel(item), items: [] });
      grouped.get(key).items.push(item);
    }

    const preferred = ['TV', 'Movie', 'Book'];
    const groups = [...grouped.values()].sort((a, b) => {
      const ai = preferred.indexOf(a.label);
      const bi = preferred.indexOf(b.label);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      return a.label.localeCompare(b.label);
    });

    for (const group of groups) {
      const section = document.createElement('section');
      section.className = 'tbr-type-section';
      const heading = document.createElement('h3');
      heading.className = 'tbr-type-heading';
      heading.textContent = group.label;
      const grid = document.createElement('div');
      grid.className = 'tbr-type-grid';

      for (const item of group.items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tbr-thumbnail-button';
        button.dataset.action = 'details';
        button.dataset.id = item.id;
        button.setAttribute('aria-label', `Open ${item.title}`);
        button.title = item.title;
        if (getSourceType(item) === 'restaurant') {
          button.classList.add('tbr-text-button');
          button.innerHTML = `<span class="tbr-text-title">${escapeHtml(item.title || 'Restaurant')}</span><span class="tbr-text-meta">Restaurant</span>`;
        } else {
          button.innerHTML = item.image
            ? `<img class="tbr-thumbnail-image" src="${escapeAttr(item.image)}" alt="" loading="lazy" />`
            : `<span class="tbr-thumbnail-placeholder">${escapeHtml((item.title || '?').slice(0,1).toUpperCase())}</span>`;
        }
        grid.appendChild(button);
      }

      section.append(heading, grid);
      els.upNextList.appendChild(section);
    }
    return;
  }

  const cards = new Map();
  for (const item of items) {
    const card = document.createElement('article');
    card.className = `upnext-card${view === 'tbr' ? ' tbr-card queue-loading' : ' queue-loading'}`;
    card.dataset.id = item.id;
    card.innerHTML = queueCardMarkup(item, {
      title: item.title,
      meta: view === 'tbr' ? tbrMeta(item) : progressFallback(item),
      image: item.image || '',
      tbr: view === 'tbr'
    });
    els.upNextList.appendChild(card);
    cards.set(item.id, card);
  }

  if (view === 'tbr') {
    await Promise.all(items.map(async item => {
      const card = cards.get(item.id);
      if (!card) return;
      let streaming = '';
      if (isStreamingItem(item)) {
        try {
          const availability = await getItemStreamingAvailability(item);
          streaming = streamingAvailabilityLabel(availability, 3, '');
        } catch {}
      }
      card.classList.remove('queue-loading');
      card.innerHTML = queueCardMarkup(item, {
        title: item.title,
        meta: tbrMeta(item),
        image: item.image || '',
        streaming,
        tbr: true
      });
    }));
    return;
  }

  // Show the existing queue immediately. TV reconciliation can be expensive
  // because it may inspect several seasons, so run it after the skeleton cards
  // are already on screen and refresh the queue only if membership changed.
  const reconciliation = skipReconcile ? Promise.resolve(false) : reconcileTVQueueStates();

  const nonTV = items.filter(item => getSourceType(item) !== 'tv');
  await Promise.all(nonTV.map(async item => {
    const card = cards.get(item.id);
    if (!card) return;
    try {
      const [info, availability] = await Promise.all([
        getUpNextInfo(item),
        isStreamingItem(item) ? getItemStreamingAvailability(item).catch(() => null) : Promise.resolve(null)
      ]);
      if (availability) info.streaming = streamingAvailabilityLabel(availability, 3, '');
      card.classList.remove('queue-loading');
      card.innerHTML = queueCardMarkup(item, info);
    } catch (error) {
      card.classList.remove('queue-loading');
      card.innerHTML = queueCardMarkup(item, {
        meta: progressFallback(item),
        image: item.image || '',
        error: error.message
      });
    }
  }));

  const changed = await reconciliation;
  if (changed && !skipReconcile) {
    if (els.libraryGroups) renderLibrary();
    await renderUpNext({ skipReconcile: true });
    return;
  }

  const tvItems = items.filter(item => getSourceType(item) === 'tv');
  // TV cards can each inspect multiple TMDB endpoints. Enrich them serially so
  // the "episodes remaining" feature cannot create a large parallel request burst.
  for (const item of tvItems) {
    const card = cards.get(item.id);
    if (!card) continue;
    try {
      const [info, availability] = await Promise.all([
        getUpNextInfo(item),
        getItemStreamingAvailability(item).catch(() => null)
      ]);
      if (availability) info.streaming = streamingAvailabilityLabel(availability, 3, '');
      card.classList.remove('queue-loading');
      card.innerHTML = queueCardMarkup(item, info);
    } catch (error) {
      card.classList.remove('queue-loading');
      card.innerHTML = queueCardMarkup(item, {
        meta: progressFallback(item),
        image: item.image || '',
        error: error.message
      });
    }
    await new Promise(resolve => setTimeout(resolve, 125));
  }
}

function setQueueView(view) {
  state.queueView = ['tbr', 'calendar'].includes(view) ? view : 'upnext';
  renderUpNext();
}

async function renderQueueCalendar() {
  if (!els.upNextList || !els.upNextEmpty) return;
  els.upNextList.classList.remove('tbr-thumbnail-grid');
  els.upNextList.classList.add('queue-calendar-list');
  if (els.queueHeading) els.queueHeading.textContent = 'Calendar';
  els.queueTabs?.forEach(tab => {
    const active = tab.dataset.queueTab === 'calendar';
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  els.upNextList.innerHTML = '<p class="queue-calendar-loading">Loading upcoming dates…</p>';
  els.upNextEmpty.hidden = true;
  const entries = await buildQueueCalendarEntries();
  refreshQueueTypeFilter(entries.map(entry => entry.item));
  const selectedType = state.queueTypeFilter || 'all';
  const visible = entries.filter(entry => selectedType === 'all' || queueTypeGroupKey(entry.item) === selectedType);

  els.upNextList.innerHTML = '';
  if (!visible.length) {
    els.upNextEmpty.hidden = false;
    els.upNextEmpty.textContent = entries.length ? 'Nothing scheduled for this type.' : 'Nothing upcoming yet. Future reminders, events, TV episodes, and dated items will appear here.';
    return;
  }

  els.upNextEmpty.hidden = true;
  let currentDate = '';
  let group = null;
  for (const entry of visible) {
    if (entry.date !== currentDate) {
      currentDate = entry.date;
      group = document.createElement('section');
      group.className = 'queue-calendar-day';
      group.innerHTML = `<div class="queue-calendar-date"><span>${escapeHtml(formatQueueCalendarWeekday(entry.date))}</span><strong>${escapeHtml(formatQueueCalendarDate(entry.date))}</strong></div><div class="queue-calendar-day-items"></div>`;
      els.upNextList.appendChild(group);
    }
    group.querySelector('.queue-calendar-day-items')?.insertAdjacentHTML('beforeend', queueCalendarEntryMarkup(entry));
  }
}

function normalizeArtistName(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function explicitLikedArtistItems() {
  return state.items.filter(item => getSourceType(item) === 'artist' && item.title);
}

function inferredMusicArtistNames() {
  const explicit = new Set(explicitLikedArtistItems().map(item => normalizeArtistName(item.title)));
  const names = [];
  for (const item of state.items) {
    const sourceType = getSourceType(item);
    if (!['music','song'].includes(sourceType)) continue;
    const name = String(item.artistName || item.raw?.artistName || item.subtitle || '').split(' · ')[0].trim();
    if (!name || explicit.has(normalizeArtistName(name))) continue;
    names.push(name);
  }
  return [...new Map(names.map(name => [normalizeArtistName(name), name])).values()];
}

function ticketmasterMusicGenreLabel(value) {
  const raw = String(value || '').trim();
  const key = raw.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  if (!key || key === 'music') return '';
  if (/hip hop|hiphop|rap/.test(key)) return 'Hip-Hop/Rap';
  if (/r and b|rhythm and blues|soul/.test(key)) return 'R&B';
  if (/electronic|dance|edm|house|techno/.test(key)) return 'Dance/Electronic';
  if (/alternative/.test(key)) return 'Alternative';
  if (/rock/.test(key)) return 'Rock';
  if (/pop/.test(key)) return 'Pop';
  if (/country/.test(key)) return 'Country';
  if (/jazz/.test(key)) return 'Jazz';
  if (/blues/.test(key)) return 'Blues';
  if (/metal/.test(key)) return 'Metal';
  if (/folk|singer songwriter|americana|bluegrass/.test(key)) return 'Folk';
  if (/reggae|ska/.test(key)) return 'Reggae';
  if (/latin|salsa|bachata|regional mexican|urbano/.test(key)) return 'Latin';
  if (/classical|opera/.test(key)) return 'Classical';
  if (/punk/.test(key)) return 'Rock';
  return raw;
}

function musicTasteGenreNames() {
  const scores = new Map();
  for (const item of state.items) {
    const sourceType = getSourceType(item);
    if (!['music','artist','song'].includes(sourceType)) continue;
    const genres = [...(item.genres || [])];
    if (!genres.length && sourceType === 'artist' && item.subtitle) genres.push(item.subtitle);
    for (const genreValue of genres) {
      const genre = ticketmasterMusicGenreLabel(genreValue);
      if (!genre) continue;
      const weight = 1 + (item.recommended ? 1.25 : 0) + Math.max(0, Number(item.rating || 0)) / 5;
      scores.set(genre, (scores.get(genre) || 0) + weight);
    }
  }
  return [...scores.entries()].sort((a,b) => b[1] - a[1]).map(([genre]) => genre).slice(0, 8);
}

function knownMusicArtistNameSet() {
  return new Set([
    ...explicitLikedArtistItems().map(item => item.title),
    ...inferredMusicArtistNames()
  ].map(normalizeArtistName).filter(Boolean));
}

async function getRelatedMusicAttractions(batchNumber = 1, limit = 8) {
  if (!state.settings.ticketmasterKey) return [];
  const genres = musicTasteGenreNames();
  const genre = genres.length ? genres[(Math.max(1, batchNumber) - 1) % genres.length] : 'Music';
  const countryCode = state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA';
  const page = Math.max(0, (Math.max(1, batchNumber) - 1) % 5);
  const cacheKey = `ticketmaster:related-attractions:${genre.toLowerCase()}:${countryCode}:${page}`;
  const results = await getCached(cacheKey, () => TrackerAPI.searchTicketmasterAttractions('', state.settings, {
    classificationName: genre,
    preferredCountry: countryCode,
    page,
    size: Math.max(12, Math.min(30, limit * 3)),
    sort: 'random'
  }));
  const known = knownMusicArtistNameSet();
  return (results || [])
    .filter(result => result.title && !known.has(normalizeArtistName(result.title)))
    .filter(result => genre === 'Music' || (result.classifications || []).some(value => String(value).toLowerCase().includes(genre.toLowerCase())))
    .slice(0, limit)
    .map(result => ({ ...result, relatedGenre: genre }));
}

async function getRelatedTicketmasterConcerts(batchNumber = 1, limit = 12) {
  if (!state.settings.ticketmasterKey) return [];
  const genres = musicTasteGenreNames();
  const genre = genres.length ? genres[(Math.max(1, batchNumber) - 1) % genres.length] : 'Music';
  const city = state.discoverPrefs.eventCity || state.settings.homeCity || '';
  const countryCode = state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA';
  const page = Math.max(0, (Math.max(1, batchNumber) - 1) % 4);
  const cacheKey = `ticketmaster:related-concerts:${genre.toLowerCase()}:${city}:${countryCode}:${page}`;
  const events = await getCached(cacheKey, () => TrackerAPI.searchTicketmasterEvents('', state.settings, {
    city,
    countryCode,
    page,
    size: Math.max(16, Math.min(40, limit * 2)),
    classificationName: genre,
    sort: 'date,asc'
  }));
  const known = knownMusicArtistNameSet();
  const mapped = (events || []).map(event => {
    const lineup = [...new Set(event.attractions || [])];
    const newArtist = lineup.find(name => !known.has(normalizeArtistName(name))) || lineup[0] || event.title || '';
    return {
      ...ticketmasterConcertFromEvent(event, newArtist, false),
      relatedGenre: genre,
      recommendationReason: genres.length ? `Related to your ${genre} taste` : 'Nearby music you might like',
      _discoverSource: 'related-concert'
    };
  });
  const novel = mapped.filter(event => !(event.lineup || []).some(name => known.has(normalizeArtistName(name))));
  return dedupeTicketmasterEvents([...novel, ...mapped]).slice(0, limit);
}

function ticketmasterEventMatchesArtist(event, artistName) {
  const target = normalizeArtistName(artistName);
  if (!target) return false;
  const attractions = (event?.attractions || []).map(normalizeArtistName).filter(Boolean);
  if (attractions.some(name => name === target)) return true;
  const title = normalizeArtistName(event?.title || '');
  return title === target || title.startsWith(`${target} `) || title.includes(` ${target} `);
}

function ticketmasterConcertFromEvent(event, artistName, likedArtist = false) {
  const lineup = [...new Set(event?.attractions || [])];
  return {
    ...event,
    sourceType: 'concert',
    provider: 'ticketmaster',
    artistName: artistName || lineup[0] || event?.title || '',
    lineup,
    recommendationReason: likedArtist ? 'Saved artist' : 'Based on your music',
    likedArtist: Boolean(likedArtist)
  };
}

async function getNearbyTicketmasterConcerts({ includeInferred = false, startDate = '', endDate = '', artistLimit = 10 } = {}) {
  if (!state.settings.ticketmasterKey) return [];
  const explicit = explicitLikedArtistItems().map(item => item.title);
  const inferred = includeInferred ? inferredMusicArtistNames() : [];
  const names = [...new Map([...explicit, ...inferred].map(name => [normalizeArtistName(name), name])).values()].slice(0, artistLimit);
  if (!names.length) return [];
  const explicitSet = new Set(explicit.map(normalizeArtistName));
  const city = state.discoverPrefs.eventCity || state.settings.homeCity || '';
  const countryCode = state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA';
  const dateOptions = {
    ...(startDate ? { startDateTime: ticketmasterMonthBoundary(startDate) } : {}),
    ...(endDate ? { endDateTime: ticketmasterMonthBoundary(endDate, true) } : {})
  };
  const settled = await Promise.allSettled(names.map(async artistName => {
    const cacheKey = `ticketmaster:artist:${normalizeArtistName(artistName)}:${city}:${countryCode}:${startDate || 'now'}:${endDate || 'future'}`;
    const events = await getCached(cacheKey, () => TrackerAPI.searchTicketmasterEvents(artistName, state.settings, {
      city,
      countryCode,
      classificationName: 'Music',
      size: 18,
      sort: 'date,asc',
      ...dateOptions
    }));
    return (events || [])
      .filter(event => ticketmasterEventMatchesArtist(event, artistName))
      .map(event => ticketmasterConcertFromEvent(event, artistName, explicitSet.has(normalizeArtistName(artistName))));
  }));
  return dedupeTicketmasterEvents(settled.flatMap(entry => entry.status === 'fulfilled' ? entry.value : []))
    .sort((a,b) => String(a.eventDate || '').localeCompare(String(b.eventDate || '')) || String(a.title || '').localeCompare(String(b.title || '')));
}

function normalizedTicketmasterCalendarTerms(values = state.discoverPrefs.eventCalendarFollowTerms) {
  return normalizedTicketmasterPriorityTerms(values).slice(0, 20);
}

function ticketmasterEventMatchesFollowTerm(event, term) {
  const target = normalizeArtistName(term);
  if (!target) return false;
  const names = [event?.title, event?.venueName, ...(event?.attractions || [])].map(normalizeArtistName).filter(Boolean);
  return names.some(name => name === target || name.includes(target) || target.includes(name));
}

async function getFollowedTicketmasterEvents({ startDate = '', endDate = '', termLimit = 12 } = {}) {
  if (!state.settings.ticketmasterKey) return [];
  const terms = normalizedTicketmasterCalendarTerms().slice(0, termLimit);
  if (!terms.length) return [];
  const city = state.discoverPrefs.eventCity || state.settings.homeCity || '';
  const countryCode = state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA';
  const settled = await Promise.allSettled(terms.map(async term => {
    const cacheKey = `ticketmaster:follow:${normalizeArtistName(term)}:${city}:${countryCode}:${startDate || 'now'}:${endDate || 'future'}`;
    const events = await getCached(cacheKey, () => TrackerAPI.searchTicketmasterEvents(term, state.settings, {
      city,
      countryCode,
      size: 12,
      sort: 'date,asc',
      ...(startDate ? { startDateTime: ticketmasterMonthBoundary(startDate) } : {}),
      ...(endDate ? { endDateTime: ticketmasterMonthBoundary(endDate, true) } : {})
    }));
    return (events || [])
      .filter(event => ticketmasterEventMatchesFollowTerm(event, term))
      .map(event => ({ ...event, sourceType: 'event', recommendationReason: `Following ${term}`, followedTerm: term }));
  }));
  return dedupeTicketmasterEvents(settled.flatMap(entry => entry.status === 'fulfilled' ? entry.value : []))
    .sort((a,b) => String(a.eventDate || '').localeCompare(String(b.eventDate || '')) || String(a.title || '').localeCompare(String(b.title || '')));
}

async function buildQueueCalendarEntries() {
  const today = todayString();
  const horizon = addDaysToDateString(today, 120);
  const entries = [];
  const add = (item, date, title, meta, image = '', kind = '') => {
    if (!item || !date || date < today) return;
    entries.push({ item, date, title: title || item.title, meta: meta || '', image: image || item.image || '', kind });
  };

  for (const item of state.items) {
    const sourceType = getSourceType(item);
    if (sourceType === 'reminder') {
      let due = getNextReminderDueDate(item);
      if (!due || due < today) continue;
      const frequency = reminderFrequency(item);
      const recurrence = reminderRecurrence(item);
      const maxOccurrences = frequency === 'none' ? 1 : 130;
      for (let count = 0; count < maxOccurrences && due && due <= horizon; count += 1) {
        add(item, due, item.title, reminderScheduleLabel(item), item.image, 'reminder');
        if (!recurrence) break;
        due = advanceReminderDate(due, recurrence);
      }
      continue;
    }

    if (sourceType === 'event' || sourceType === 'concert') {
      // Scheduled live events may be hidden from the tracked Calendar while still
      // belonging to Up Next → Calendar. The check on that row controls tracking.
      if (item.calendarHidden && item.queueCalendarScheduled !== true) continue;
      const date = item.date || item.eventMeta?.eventDate || '';
      const tracked = item.calendarTracked === true && !item.calendarHidden;
      add(item, date, item.title, [formatEventClock(item.eventMeta?.eventTime || ''), item.eventMeta?.venueName || '', item.eventMeta?.city || '', tracked ? 'Tracked' : '', getQueueStatus(item) === 'tbr' ? 'TBR' : ''].filter(Boolean).join(' · '), item.image, sourceType === 'concert' ? 'concert' : 'event');
      continue;
    }

    if (!item.calendarHidden && item.date && item.date >= today) {
      add(item, item.date, item.title, [getItemTypeLabel(item), getQueueStatus(item) === 'tbr' ? 'TBR' : ''].filter(Boolean).join(' · '), item.image, 'dated');
    } else if (['movie'].includes(sourceType) && item.releaseDate && item.releaseDate >= today && getQueueStatus(item) !== 'library') {
      add(item, item.releaseDate, item.title, `${getItemTypeLabel(item)} release${getQueueStatus(item) === 'tbr' ? ' · TBR' : ''}`, item.image, 'release');
    }
  }

  const followedTV = state.items.filter(item => getSourceType(item) === 'tv' && item.providerId && item.watchDisposition !== 'watch-later' && item.watchDisposition !== 'stopped');
  const tvSettled = await Promise.allSettled(followedTV.map(async item => {
    const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
    return { item, episode: details?.next_episode_to_air || null };
  }));
  for (const result of tvSettled) {
    if (result.status !== 'fulfilled' || !result.value.episode?.air_date) continue;
    const { item, episode } = result.value;
    add(item, episode.air_date, item.title, `S${episode.season_number} E${episode.episode_number}${episode.name ? ` · ${episode.name}` : ''}`, TrackerAPI.tmdbImage(episode.still_path) || item.image, 'tv-episode');
  }

  if (state.settings.ticketmasterKey) {
    try {
      const autoConcerts = state.discoverPrefs.eventAutoLikedArtistCalendar === false
        ? []
        : await getNearbyTicketmasterConcerts({ includeInferred: false, startDate: today, endDate: horizon, artistLimit: 14 });
      const followedEvents = await getFollowedTicketmasterEvents({ startDate: today, endDate: horizon, termLimit: 12 });
      const liveEvents = dedupeTicketmasterEvents([...autoConcerts, ...followedEvents]);
      const savedScheduledLiveIds = new Set(state.items
        .filter(item => ['event', 'concert'].includes(getSourceType(item)) && item.queueCalendarScheduled === true)
        .map(item => String(item.providerId || ''))
        .filter(Boolean));
      for (const liveEvent of liveEvents) {
        if (savedScheduledLiveIds.has(String(liveEvent.providerId || ''))) continue;
        const isConcert = liveEvent.sourceType === 'concert';
        const artistItem = isConcert ? explicitLikedArtistItems().find(item => normalizeArtistName(item.title) === normalizeArtistName(liveEvent.artistName)) : null;
        const pseudoItem = {
          id: `live:${liveEvent.providerId}`,
          sourceType: isConcert ? 'concert' : 'event',
          type: isConcert ? 'music' : 'event',
          typeLabel: isConcert ? 'Music' : 'Event',
          subcategory: isConcert ? 'Concert' : '',
          title: liveEvent.title,
          image: artistItem?.image || liveEvent.image || '',
          provider: 'ticketmaster',
          providerId: liveEvent.providerId
        };
        entries.push({
          item: pseudoItem,
          date: liveEvent.eventDate,
          title: liveEvent.title,
          meta: [formatEventClock(liveEvent.eventTime || ''), liveEvent.venueName || '', liveEvent.city || '', liveEvent.recommendationReason || ''].filter(Boolean).join(' · '),
          image: artistItem?.image || liveEvent.image || '',
          kind: isConcert ? 'concert' : 'live-event',
          url: liveEvent.ticketUrl || ''
        });
      }
    } catch {}
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function queueCalendarEntryMarkup(entry) {
  const label = getItemTypeLabel(entry.item);
  const subcategory = cleanTypeLabel(entry.item?.subcategory || '');
  const art = entry.image ? `<img src="${escapeAttr(entry.image)}" alt="" />` : `<div class="queue-calendar-thumb placeholder">${escapeHtml(label?.[0] || '•')}</div>`;
  const openAction = entry.url
    ? `<a class="upnext-arrow" href="${escapeAttr(entry.url)}" target="_blank" rel="noopener" aria-label="Open event">→</a>`
    : `<button class="upnext-arrow" type="button" data-action="details" data-id="${escapeAttr(entry.item.id)}" aria-label="Open details">→</button>`;
  const sourceType = getSourceType(entry.item);
  const canToggleTracked = ['event', 'concert'].includes(sourceType) && entry.item?.queueCalendarScheduled === true && !String(entry.item?.id || '').startsWith('live:');
  const tracked = canToggleTracked && entry.item.calendarTracked === true && !entry.item.calendarHidden;
  const trackAction = canToggleTracked
    ? `<button class="check-button queue-calendar-track-check${tracked ? ' is-complete' : ''}" type="button" data-action="track-calendar" data-id="${escapeAttr(entry.item.id)}" aria-label="${tracked ? 'Remove from tracked calendar' : 'Add to tracked calendar'}" title="${tracked ? 'Remove from tracked calendar' : 'Add to tracked calendar'}">✓</button>`
    : '';
  return `<article class="queue-calendar-entry${entry.kind === 'concert' ? ' queue-calendar-concert' : ''}">
    ${art}
    <div class="queue-calendar-entry-copy"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml([label, subcategory, entry.meta].filter(Boolean).join(' · '))}</span></div>
    <div class="queue-calendar-entry-actions">${trackAction}${openAction}</div>
  </article>`;
}

function formatQueueCalendarWeekday(dateString) {
  return new Intl.DateTimeFormat('en-CA', { weekday: 'short' }).format(parseLocalDateString(dateString));
}

function formatQueueCalendarDate(dateString) {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(parseLocalDateString(dateString));
}

function queueCardMarkup(item, info) {
  const image = info.image || item.image;
  const art = image
    ? `<img class="upnext-art" src="${escapeAttr(image)}" alt="" />`
    : `<div class="upnext-art placeholder">${escapeHtml(getItemTypeLabel(item)?.[0] || '•')}</div>`;
  const sourceType = getSourceType(item);
  const isTBR = Boolean(info.tbr);

  let action = '';
  if (isTBR) {
    action = `<button class="check-button start-button" type="button" data-action="start" data-id="${item.id}" aria-label="Up Next" title="Up Next">→</button>`;
  } else if (sourceType === 'book') {
    action = `<button class="check-button book-check" type="button" data-action="complete" data-id="${item.id}" aria-label="Update pages & dates" title="Update pages & dates">↗</button>`;
  } else if (sourceType === 'reminder') {
    const due = info.dueDate || getNextReminderDueDate(item);
    const canComplete = !due || due <= todayString();
    action = `<button class="check-button reminder-check" type="button" data-action="complete" data-id="${item.id}" aria-label="Mark reminder complete" title="${canComplete ? 'Mark complete' : `Due ${escapeAttr(formatLongDate(due))}`}" ${canComplete ? '' : 'disabled'}>✓</button>`;
  } else {
    const label = sourceType === 'tv' ? 'Mark episode watched' : sourceType === 'youtube' ? `Mark ${getItemTypeLabel(item).toLowerCase()} complete` : 'Mark completed';
    action = `<button class="check-button" type="button" data-action="complete" data-id="${item.id}" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">✓</button>`;
  }

  return `
    ${art}
    <div class="upnext-main">
      <div>
        <p class="upnext-title">${escapeHtml(info.title || item.title)}</p>
        <p class="upnext-meta">${escapeHtml(info.meta || progressFallback(item))}</p>
        <p class="upnext-category">${escapeHtml([getItemTypeLabel(item), isTBR ? 'TBR' : '', info.streaming || ''].filter(Boolean).join(' · '))}</p>
        ${info.error ? `<div class="queue-error">${escapeHtml(info.error)}</div>` : ''}
      </div>
      <button class="upnext-arrow" type="button" data-action="details" data-id="${item.id}" aria-label="Open details">→</button>
    </div>
    <div class="upnext-actions">${action}</div>
  `;
}

function isStreamingItem(item) {
  const sourceType = getSourceType(item);
  return ['tv', 'movie'].includes(sourceType) && Boolean(item?.providerId);
}

async function getItemStreamingAvailability(item) {
  if (!isStreamingItem(item)) return { providers: [], link: '' };
  const sourceType = getSourceType(item);
  const region = (state.settings.tmdbWatchRegion || 'CA').toUpperCase();
  return getCached(
    `watch:${sourceType}:${item.providerId}:${region}`,
    () => TrackerAPI.getWatchProviders(sourceType, item.providerId, state.settings)
  );
}

function streamingProviderNames(availability) {
  return [...new Set((availability?.providers || []).map(provider => provider?.name).filter(Boolean))];
}

function streamingAvailabilityLabel(availability, maxProviders = 3, prefix = 'Available on ') {
  const names = streamingProviderNames(availability);
  if (!names.length) return '';
  const shown = names.slice(0, maxProviders);
  const extra = names.length - shown.length;
  return `${prefix}${shown.join(' · ')}${extra > 0 ? ` +${extra}` : ''}`;
}

function streamingDetailMarkup(availability) {
  const names = streamingProviderNames(availability);
  const region = (state.settings.tmdbWatchRegion || 'CA').toUpperCase();
  const providerText = names.length ? names.join(' · ') : `No streaming provider listed for ${region}`;
  return `<section class="detail-section streaming-detail"><h3>Streaming</h3><p>${escapeHtml(providerText)}</p>${availability?.link ? `<a href="${escapeAttr(availability.link)}" target="_blank" rel="noopener">See availability ↗</a>` : ''}</section>`;
}

function tbrMeta(item) {
  const sourceType = getSourceType(item);
  if (sourceType === 'tv') return [item.subtitle, 'Not started'].filter(Boolean).join(' · ');
  if (sourceType === 'book') return [item.subtitle, 'To be read'].filter(Boolean).join(' · ');
  if (sourceType === 'youtube') return [item.subtitle, 'Playlist'].filter(Boolean).join(' · ');
  if (sourceType === 'reminder') return reminderScheduleLabel(item);
  if (['event', 'concert'].includes(sourceType)) return eventQueueMeta(item);
  return item.subtitle || 'Saved for later';
}

async function countRemainingAvailableTVEpisodes(item) {
  if (!item?.providerId) return 0;
  const cachedAt = Date.parse(item.tvMeta?.remainingCheckedAt || '');
  const cachedCount = Number(item.tvMeta?.remainingAvailableCount);
  if (Number.isFinite(cachedAt) && Date.now() - cachedAt < 60 * 60 * 1000 && Number.isFinite(cachedCount)) {
    return Math.max(0, cachedCount);
  }
  const show = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
  const seasons = (show.seasons || []).filter(season => Number(season.season_number) > 0 && Number(season.episode_count) > 0);
  let remaining = 0;
  for (const info of seasons) {
    const season = await getCached(`season:${item.providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(item.providerId, info.season_number, state.settings));
    for (const episode of (season.episodes || [])) {
      if (Number(episode.episode_number) <= 0 || !isEpisodeAvailable(episode)) continue;
      if (!isTVEpisodeConsumed(item, info.season_number, episode.episode_number)) remaining += 1;
    }
  }
  item.tvMeta = {
    ...(item.tvMeta || {}),
    remainingAvailableCount: remaining,
    remainingCheckedAt: new Date().toISOString()
  };
  saveItems();
  return remaining;
}

async function getUpNextInfo(item) {
  if (getSourceType(item) === 'tv') {
    const checkedAt = Date.parse(item.tvMeta?.checkedAt || '');
    if (!Number.isFinite(checkedAt) || Date.now() - checkedAt > 60 * 60 * 1000) {
      await syncTVProgressToFirstUnwatched(item);
    }
    const episode = await getCached(`tv:${item.providerId}:s${item.progress?.nextSeason || 1}e${item.progress?.nextEpisode || 1}`, () =>
      TrackerAPI.getTVEpisode(item.providerId, item.progress?.nextSeason || 1, item.progress?.nextEpisode || 1, state.settings)
    );
    const remaining = await countRemainingAvailableTVEpisodes(item);
    return {
      title: item.title,
      meta: `S${episode.season_number} E${episode.episode_number} · ${episode.name || 'Episode'}${remaining ? ` · + ${remaining} −` : ''}`,
      image: TrackerAPI.tmdbImage(episode.still_path) || item.image
    };
  }

  if (getSourceType(item) === 'youtube') {
    const playlist = await getPlaylistCached(item.providerId);
    let index = Math.max(0, Number(item.progress?.currentIndex || 0));
    while (index < playlist.items.length && isYouTubeVideoLogged(item, playlist.items[index].videoId)) index += 1;
    if (index !== Number(item.progress?.currentIndex || 0)) {
      item.progress = { ...item.progress, currentIndex: index };
      saveItems();
    }
    const video = playlist.items[index];
    if (!video) return { title: item.title, meta: 'Playlist complete', image: item.image };
    return {
      title: video.title,
      meta: `${index + 1} of ${playlist.items.length}${video.channelTitle ? ` · ${video.channelTitle}` : ''}`,
      image: video.image || item.image
    };
  }

  if (getSourceType(item) === 'reminder') {
    const dueDate = getNextReminderDueDate(item);
    return {
      title: item.title,
      meta: `${reminderScheduleLabel(item)} · ${reminderDueLabel(dueDate)}`,
      image: item.image,
      dueDate
    };
  }

  if (['event', 'concert'].includes(getSourceType(item))) {
    return {
      title: item.title,
      meta: eventQueueMeta(item),
      image: item.image,
      dueDate: item.date || item.eventMeta?.eventDate || ''
    };
  }

  if (getSourceType(item) === 'book') {
    const current = Number(item.progress?.currentPage || 0);
    const total = Number(item.progress?.totalPages || 0);
    return {
      title: item.title,
      meta: total ? `Page ${current} of ${total} · ${Math.min(100, Math.round((current / total) * 100))}%` : `Page ${current}`,
      image: item.image
    };
  }

  return { title: item.title, meta: item.subtitle || '', image: item.image };
}

async function handleUpNextClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = findItem(button.dataset.id);
  if (!item) return;

  if (button.dataset.action === 'details') {
    openDetails(item.id);
    return;
  }

  if (button.dataset.action === 'track-calendar') {
    const sourceType = getSourceType(item);
    if (['event', 'concert'].includes(sourceType) && item.queueCalendarScheduled === true) {
      const tracked = !(item.calendarTracked === true && !item.calendarHidden);
      item.calendarTracked = tracked;
      item.calendarExplicit = tracked;
      item.calendarHidden = !tracked;
      if (tracked) { item.calendarQueueOnly = false; item.discoverCalendarOnly = false; }
      item.updatedAt = new Date().toISOString();
      normalizeMusicFamilyItem(item);
      saveItems();
      renderAll();
    }
    return;
  }

  if (button.dataset.action === 'start') {
    if (getSourceType(item) === 'tv') item.watchDisposition = 'following';
    setItemQueueStatus(item, 'upnext');
    item.updatedAt = new Date().toISOString();
    saveItems();
    state.queueView = 'upnext';
    renderAll();
    return;
  }

  if (button.dataset.action === 'complete') {
    if (getSourceType(item) === 'book') {
      openBookProgress(item);
      return;
    }
    button.disabled = true;
    try {
      let completed = null;
      if (getSourceType(item) === 'tv') completed = await advanceTV(item);
      else if (getSourceType(item) === 'youtube') completed = await advanceWorkout(item);
      else if (getSourceType(item) === 'reminder') completed = reminderCompletionRecord(item);
      else completed = genericCompletionRecord(item, true);
      if (completed) addHistoryRecord(completed);
      if (!['tv','youtube','reminder'].includes(getSourceType(item))) {
        item.completedAt = todayString();
        setItemQueueStatus(item, 'library');
      }
      if (getSourceType(item) === 'reminder') {
        item.lastCompletedAt = new Date().toISOString();
        if (isOneTimeReminder(item)) {
          state.items = state.items.filter(existing => existing.id !== item.id);
        } else {
          setItemQueueStatus(item, 'upnext');
        }
      }
      saveItems();
      saveHistory();
      renderAll();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
    }
  }
}

function queueSortKey(item, view = 'upnext') {
  if (view === 'upnext' && getSourceType(item) === 'reminder') return `0:${getNextReminderDueDate(item) || '9999-12-31'}:${item.createdAt || ''}`;
  if (['event', 'concert'].includes(getSourceType(item))) return `0:${item.date || item.eventMeta?.eventDate || '9999-12-31'}:${item.createdAt || ''}`;
  return `1:${item.createdAt || ''}`;
}

function eventQueueMeta(item) {
  const date = item?.date || item?.eventMeta?.eventDate || '';
  const time = formatEventClock(item?.eventMeta?.eventTime || '');
  const venue = item?.eventMeta?.venueName || '';
  const city = item?.eventMeta?.city || '';
  return [date ? formatLongDate(date) : '', time, venue, city].filter(Boolean).join(' · ') || item?.subtitle || 'Upcoming event';
}

function formatEventClock(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function reminderCompletionRecord(item) {
  const scheduledDate = getNextReminderDueDate(item) || todayString();
  return {
    sourceItemId: item.id,
    type: item.type,
    typeLabel: getItemTypeLabel(item),
    date: todayString(),
    showOnCalendar: true,
    kind: 'reminder-completed',
    title: item.title,
    subtitle: reminderScheduleLabel(item),
    notes: item.notes || '',
    rating: Number(item.rating || 0),
    image: item.image || '',
    provider: 'reminder',
    providerId: '',
    scheduledDate
  };
}

function reminderFrequency(item) {
  const value = item?.reminder?.frequency;
  if (['none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom'].includes(value)) return value;
  return 'weekly';
}

function reminderRecurrence(item) {
  const frequency = reminderFrequency(item);
  if (frequency === 'none') return null;
  if (frequency === 'daily') return { interval: 1, unit: 'days' };
  if (frequency === 'weekly') return { interval: 1, unit: 'weeks' };
  if (frequency === 'biweekly') return { interval: 2, unit: 'weeks' };
  if (frequency === 'monthly') return { interval: 1, unit: 'months' };
  const interval = Math.max(1, Math.min(365, Number(item?.reminder?.interval || 1)));
  const unit = ['days', 'weeks', 'months'].includes(item?.reminder?.intervalUnit) ? item.reminder.intervalUnit : 'weeks';
  return { interval, unit };
}

function isOneTimeReminder(item) {
  return getSourceType(item) === 'reminder' && reminderFrequency(item) === 'none';
}

function getReminderScheduleStart(item) {
  return item?.reminder?.scheduleStart || item?.reminder?.dueDate || localDateString(new Date(item?.createdAt || Date.now()));
}

function getNextReminderDueDate(item) {
  if (getSourceType(item) !== 'reminder') return '';
  const frequency = reminderFrequency(item);
  const scheduleStart = getReminderScheduleStart(item);

  if (frequency === 'none') {
    return item.reminder?.dueDate || scheduleStart || todayString();
  }

  const completed = state.history
    .filter(entry => entry.sourceItemId === item.id && entry.kind === 'reminder-completed')
    .sort((a,b) => String(a.scheduledDate || a.date || '').localeCompare(String(b.scheduledDate || b.date || '')));

  if (!completed.length) {
    // Legacy weekly reminders stored a weekday separately. Preserve that first occurrence
    // until the reminder is edited/saved into the newer date-anchored recurrence model.
    if (frequency === 'weekly' && !item.reminder?.intervalUnit && Number.isInteger(Number(item.reminder?.weekday))) {
      return weekdayOnOrAfter(scheduleStart, Math.max(0, Math.min(6, Number(item.reminder.weekday))));
    }
    return scheduleStart;
  }

  const latest = completed.at(-1);
  const scheduled = latest.scheduledDate || latest.date || scheduleStart;
  const anchor = latest.date && latest.date > scheduled ? latest.date : scheduled;
  return advanceReminderDate(anchor, reminderRecurrence(item));
}

function weekdayOnOrAfter(dateString, weekday) {
  const date = parseLocalDateString(dateString);
  const delta = (weekday - date.getDay() + 7) % 7;
  return localDateString(addDays(date, delta));
}

function weekdayStrictlyAfter(dateString, weekday) {
  const date = parseLocalDateString(dateString);
  let delta = (weekday - date.getDay() + 7) % 7;
  if (delta === 0) delta = 7;
  return localDateString(addDays(date, delta));
}

function addDaysToDateString(dateString, days) {
  return localDateString(addDays(parseLocalDateString(dateString), days));
}

function addMonthsToDateString(dateString, months) {
  const source = parseLocalDateString(dateString);
  const wantedDay = source.getDate();
  const target = new Date(source.getFullYear(), source.getMonth() + Number(months || 0), 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  target.setDate(Math.min(wantedDay, lastDay));
  return localDateString(target);
}

function advanceReminderDate(dateString, recurrence) {
  if (!recurrence) return '';
  const interval = Math.max(1, Number(recurrence.interval || 1));
  if (recurrence.unit === 'months') return addMonthsToDateString(dateString, interval);
  if (recurrence.unit === 'weeks') return addDaysToDateString(dateString, interval * 7);
  return addDaysToDateString(dateString, interval);
}

function parseLocalDateString(value) {
  const [year, month, day] = String(value || todayString()).split('-').map(Number);
  return new Date(year, Math.max(0, month - 1), Math.max(1, day), 12);
}

function reminderScheduleLabel(item) {
  const frequency = reminderFrequency(item);
  if (frequency === 'none') {
    const dueDate = getNextReminderDueDate(item);
    return dueDate ? `Once · ${formatLongDate(dueDate)}` : 'One-time';
  }
  if (frequency === 'daily') return 'Every day';
  if (frequency === 'weekly') {
    if (!item.reminder?.intervalUnit && Number.isInteger(Number(item.reminder?.weekday))) {
      const weekday = Math.max(0, Math.min(6, Number(item.reminder.weekday)));
      return `Every ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][weekday]}`;
    }
    return 'Every week';
  }
  if (frequency === 'biweekly') return 'Every 2 weeks';
  if (frequency === 'monthly') return 'Every month';
  const recurrence = reminderRecurrence(item);
  const unit = recurrence.unit === 'days' ? 'day' : recurrence.unit === 'weeks' ? 'week' : 'month';
  return `Every ${recurrence.interval} ${unit}${recurrence.interval === 1 ? '' : 's'}`;
}

function reminderDueLabel(dateString) {
  if (!dateString) return 'Scheduled';
  const today = todayString();
  if (dateString === today) return 'Due today';
  if (dateString < today) return `Overdue · ${formatLongDate(dateString)}`;
  return `Next ${formatLongDate(dateString)}`;
}

function formatLongDate(dateString) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).format(parseLocalDateString(dateString));
}

function genericCompletionRecord(item, showOnCalendar = true) {
  return {
    sourceItemId: item.id,
    type: item.type,
    typeLabel: getItemTypeLabel(item),
    date: showOnCalendar ? todayString() : '',
    showOnCalendar,
    kind: getSourceType(item) === 'movie' ? 'movie-watched' : 'item-completed',
    title: item.title,
    subtitle: item.subtitle || '',
    notes: item.notes || '',
    rating: Number(item.rating || 0),
    image: item.image || '',
    provider: item.provider || getSourceType(item),
    providerId: item.providerId || ''
  };
}

async function advanceTV(item) {
  const seasonNumber = Number(item.progress?.nextSeason || 1);
  const episodeNumber = Number(item.progress?.nextEpisode || 1);
  const watched = await getTVEpisodeFromSeason(item, seasonNumber, episodeNumber);

  if (!watched) throw new Error(`Could not find S${seasonNumber} E${episodeNumber} in TMDB.`);

  const completed = tvHistoryRecord(item, watched, seasonNumber, episodeNumber);
  const next = await findNextUnwatchedTVEpisode(item, seasonNumber, episodeNumber);

  if (next) {
    item.progress = { ...item.progress, nextSeason: next.seasonNumber, nextEpisode: next.episodeNumber };
    item.completedAt = '';
  } else {
    setItemQueueStatus(item, 'library');
    item.completedAt = todayString();
  }
  return completed;
}

async function getTVEpisodeFromSeason(item, seasonNumber, episodeNumber) {
  const season = await getCached(`season:${item.providerId}:${seasonNumber}`, () => TrackerAPI.getTVSeason(item.providerId, seasonNumber, state.settings));
  return (season.episodes || []).find(ep => ep.episode_number === episodeNumber) || null;
}

function tvHistoryRecord(item, episode, seasonNumber, episodeNumber) {
  return {
    sourceItemId: item.id,
    type: item.type,
    typeLabel: getItemTypeLabel(item),
    date: todayString(),
    kind: 'episode-watched',
    title: item.title,
    subtitle: `S${seasonNumber} E${episodeNumber} · ${episode.name || 'Episode'}`,
    notes: '',
    rating: Number(item.rating || 0),
    image: TrackerAPI.tmdbImage(episode.still_path) || item.image || '',
    provider: item.provider,
    providerId: item.providerId,
    seasonNumber,
    episodeNumber
  };
}

function isTVEpisodeLogged(item, seasonNumber, episodeNumber) {
  return state.history.some(entry =>
    entry.kind === 'episode-watched' &&
    entry.sourceItemId === item.id &&
    Number(entry.seasonNumber) === Number(seasonNumber) &&
    Number(entry.episodeNumber) === Number(episodeNumber)
  );
}

function isTVEpisodeConsumed(item, seasonNumber, episodeNumber) {
  // Episode history is the source of truth. Progress is derived from history,
  // so a checked episode can always be unchecked later.
  return isTVEpisodeLogged(item, seasonNumber, episodeNumber);
}

function removeTVEpisodeHistory(item, seasonNumber, episodeNumber) {
  const before = state.history.length;
  const oldBulkToken = item?.seriesCompletionToken || '';
  state.history = state.history.filter(entry => !(
    entry.kind === 'episode-watched' &&
    entry.sourceItemId === item.id &&
    Number(entry.seasonNumber) === Number(seasonNumber) &&
    Number(entry.episodeNumber) === Number(episodeNumber)
  ));
  // Manually clearing any episode breaks the bulk-series completion state. Remaining
  // watched episodes become ordinary selections so a later bulk undo cannot erase them.
  state.history = state.history.filter(entry => !(
    entry.kind === 'series-watched' && entry.sourceItemId === item.id
  ));
  if (oldBulkToken) {
    for (const entry of state.history) {
      if (entry.sourceItemId === item.id && entry.bulkCompletionToken === oldBulkToken) {
        delete entry.bulkCompletionToken;
        delete entry.bulkCompletionScope;
      }
    }
    item.seriesCompletionToken = '';
  }
  return state.history.length !== before;
}

async function recalculateTVProgress(item) {
  const next = await findNextUnwatchedTVEpisode(item, 0, 0);
  if (next) {
    item.progress = { ...item.progress, nextSeason: next.seasonNumber, nextEpisode: next.episodeNumber };
    item.completedAt = '';
  } else {
    item.completedAt = item.completedAt || todayString();
  }
  await reconcileSingleTVItem(item);
}

function isEpisodeAvailable(episode) {
  if (!episode?.air_date) return true;
  return episode.air_date <= todayString();
}

async function findNextUnwatchedTVEpisode(item, afterSeason = 0, afterEpisode = 0) {
  const show = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
  const seasons = (show.seasons || [])
    .filter(season => season.season_number > 0 && season.episode_count > 0)
    .sort((a,b) => a.season_number - b.season_number);

  for (const seasonInfo of seasons) {
    if (seasonInfo.season_number < afterSeason) continue;
    const season = await getCached(`season:${item.providerId}:${seasonInfo.season_number}`, () => TrackerAPI.getTVSeason(item.providerId, seasonInfo.season_number, state.settings));
    const episodes = (season.episodes || [])
      .filter(ep => ep.episode_number > 0 && isEpisodeAvailable(ep))
      .sort((a,b) => a.episode_number - b.episode_number);
    for (const episode of episodes) {
      if (seasonInfo.season_number === afterSeason && episode.episode_number <= afterEpisode) continue;
      if (!isTVEpisodeConsumed(item, seasonInfo.season_number, episode.episode_number)) {
        return { seasonNumber: seasonInfo.season_number, episodeNumber: episode.episode_number, episode };
      }
    }
  }
  return null;
}

function getTVWatchDisposition(item) {
  if (['following', 'watch-later', 'paused', 'stopped'].includes(item.watchDisposition)) return item.watchDisposition;
  if (getQueueStatus(item) === 'tbr') return 'watch-later';
  return 'following';
}

function isCancelledSeriesStatus(status) {
  return ['canceled', 'cancelled'].includes(String(status || '').toLowerCase());
}

function isTerminalSeriesStatus(status) {
  return ['ended', 'canceled', 'cancelled'].includes(String(status || '').toLowerCase());
}

async function reconcileSingleTVItem(item, prefetchedDetails = null) {
  if (getSourceType(item) !== 'tv' || !item.providerId) return false;

  const before = JSON.stringify({
    queueStatus: getQueueStatus(item),
    watchDisposition: item.watchDisposition || '',
    progress: item.progress || {},
    tvMeta: { seriesStatus: item.tvMeta?.seriesStatus || '', hasUnwatched: Boolean(item.tvMeta?.hasUnwatched) }
  });

  const details = prefetchedDetails || await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
  const next = await findNextUnwatchedTVEpisode(item, 0, 0);
  const disposition = getTVWatchDisposition(item);

  item.watchDisposition = disposition;
  item.tvMeta = {
    ...(item.tvMeta || {}),
    seriesStatus: details.status || '',
    hasUnwatched: Boolean(next),
    checkedAt: new Date().toISOString()
  };

  if (next) {
    item.progress = { ...item.progress, nextSeason: next.seasonNumber, nextEpisode: next.episodeNumber };
    item.completedAt = '';
  }

  if (['paused', 'stopped'].includes(disposition)) {
    setItemQueueStatus(item, 'library');
  } else if (disposition === 'watch-later') {
    setItemQueueStatus(item, 'tbr');
  } else if (next) {
    setItemQueueStatus(item, 'upnext');
  } else {
    setItemQueueStatus(item, 'library');
  }

  const after = JSON.stringify({
    queueStatus: getQueueStatus(item),
    watchDisposition: item.watchDisposition || '',
    progress: item.progress || {},
    tvMeta: { seriesStatus: item.tvMeta?.seriesStatus || '', hasUnwatched: Boolean(item.tvMeta?.hasUnwatched) }
  });
  return before !== after;
}

async function reconcileTVQueueStates() {
  // Reconcile only TV that is actually in Up Next. The previous implementation
  // refreshed every TV title in the Library in parallel, which could launch 100+
  // TMDB requests at once and immediately hit 429 rate limits.
  const tvItems = state.items.filter(item =>
    getSourceType(item) === 'tv' &&
    item.providerId &&
    getQueueStatus(item) === 'upnext'
  );
  const results = [];
  for (const item of tvItems) {
    const checkedAt = Date.parse(item.tvMeta?.checkedAt || '');
    if (Number.isFinite(checkedAt) && Date.now() - checkedAt < 60 * 60 * 1000) {
      results.push(false);
      continue;
    }
    try {
      results.push(await reconcileSingleTVItem(item));
    } catch (error) {
      console.warn(`Could not refresh TV status for ${item.title}:`, error);
      results.push(false);
    }
    // Avoid a burst even when several Up Next shows need fresh metadata.
    await new Promise(resolve => setTimeout(resolve, 175));
  }
  const changed = results.some(Boolean);
  if (changed) saveItems();
  return changed;
}

async function syncTVProgressToFirstUnwatched(item) {
  const changed = await reconcileSingleTVItem(item);
  if (changed) saveItems();
}

function tvStatusLabels(item, details = null) {
  const disposition = getTVWatchDisposition(item);
  const status = details?.status || item.tvMeta?.seriesStatus || '';
  const hasUnwatched = Boolean(item.tvMeta?.hasUnwatched);
  const labels = [];

  if (disposition === 'paused') labels.push({ label: 'Paused', tone: 'later' });
  else if (disposition === 'stopped') labels.push({ label: 'Stopped', tone: 'muted' });
  else if (disposition === 'watch-later') labels.push({ label: 'TBR', tone: 'later' });
  else if (hasUnwatched) labels.push({ label: 'In progress', tone: 'progress' });
  else if (isTerminalSeriesStatus(status)) labels.push({ label: 'Finished', tone: 'finished' });
  else labels.push({ label: 'Up to date', tone: 'current' });

  if (isCancelledSeriesStatus(status)) labels.push({ label: 'Cancelled', tone: 'cancelled' });
  return labels;
}

function tvStatusBadgeMarkup(item, details = null) {
  return tvStatusLabels(item, details)
    .map(entry => `<span class="tv-status-badge tv-status-${escapeAttr(entry.tone)}">${escapeHtml(entry.label)}</span>`)
    .join('');
}

function tvDetailControls(item) {
  const wholeComplete = hasSeriesBulkCompletion(item);
  const completeButton = `<button class="secondary-button${wholeComplete ? ' is-complete' : ''}" type="button" data-tv-mark-series-complete="${escapeAttr(item.id)}">${wholeComplete ? '↶ Undo complete' : 'Mark complete'}</button>`;
  return libraryDetailActions(item, { trailing: completeButton, className: 'tv-watch-actions' });
}

async function applyTVWatchAction(item, action) {
  if (action === 'stop') {
    item.watchDisposition = 'stopped';
    setItemQueueStatus(item, 'library');
  } else if (action === 'watch-later') {
    item.watchDisposition = 'watch-later';
    setItemQueueStatus(item, 'tbr');
  } else if (action === 'resume') {
    item.watchDisposition = 'following';
    await reconcileSingleTVItem(item);
  } else {
    return;
  }

  item.updatedAt = new Date().toISOString();
  saveItems();
  renderAll();
  await renderTVDetails(item);
}

async function markWholeTVSeriesComplete(item) {
  if (!item || getSourceType(item) !== 'tv') return;

  const activeToken = item.seriesCompletionToken || state.history.find(entry =>
    entry.kind === 'series-watched' && entry.sourceItemId === item.id && entry.bulkCompletionToken
  )?.bulkCompletionToken || '';

  if (activeToken) {
    state.history = state.history.filter(entry => !(
      entry.sourceItemId === item.id &&
      ((entry.kind === 'episode-watched' && entry.bulkCompletionToken === activeToken) || entry.kind === 'series-watched')
    ));
    item.seriesCompletionToken = '';
    item.completedAt = '';
    await recalculateTVProgress(item);
    saveItems();
    saveHistory();
    renderAll();
    if (els.detailModal?.open && state.openDetailId === item.id) await renderTVDetails(item);
    return;
  }

  const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
  const seasons = (details.seasons || []).filter(season => season.season_number > 0 && season.episode_count > 0);
  const token = `series-${makeId()}`;
  for (const info of seasons) {
    const season = await getCached(`season:${item.providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(item.providerId, info.season_number, state.settings));
    for (const episode of (season.episodes || []).filter(ep => Number(ep.episode_number) > 0 && isEpisodeAvailable(ep))) {
      addImportedTVEpisode(item, episode, info.season_number, { bulkCompletionToken: token, bulkCompletionScope: 'series' });
    }
  }
  item.seriesCompletionToken = token;
  await recalculateTVProgress(item);
  item.completedAt = item.completedAt || todayString();
  setItemQueueStatus(item, 'library');
  item.updatedAt = new Date().toISOString();
  state.history = state.history.filter(entry => !(entry.kind === 'series-watched' && entry.sourceItemId === item.id));
  addHistoryRecord({
    sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: '', showOnCalendar: false,
    kind: 'series-watched', title: item.title, subtitle: item.subtitle || '', notes: item.notes || '', rating: Number(item.rating || 0),
    image: item.image || '', provider: item.provider, providerId: item.providerId, bulkCompletionToken: token
  });
  saveItems();
  saveHistory();
  renderAll();
  if (els.detailModal?.open && state.openDetailId === item.id) await renderTVDetails(item);
}

function hasSeriesBulkCompletion(item) {
  if (!item) return false;
  if (item.seriesCompletionToken) return true;
  return state.history.some(entry => entry.kind === 'series-watched' && entry.sourceItemId === item.id && entry.bulkCompletionToken);
}

async function markWholeBookComplete(item, options = {}) {
  if (!item || getSourceType(item) !== 'book') return;
  const createReadingPeriod = options.createReadingPeriod !== false;

  if (item.completedAt) {
    const snapshot = item.bookCompletionSnapshot || null;
    if (snapshot) {
      item.progress = {
        ...item.progress,
        currentPage: Number(snapshot.currentPage || 0),
        readingPeriods: sanitizeBookReadingPeriods(snapshot.readingPeriods || [])
      };
    }
    item.completedAt = '';
    delete item.bookCompletionSnapshot;
    state.history = state.history.filter(entry => !(entry.sourceItemId === item.id && entry.kind === 'book-finished'));
    item.updatedAt = new Date().toISOString();
    saveItems();
    saveHistory();
    renderAll();
    if (els.detailModal?.open && state.openDetailId === item.id) await renderBookDetails(item);
    return;
  }

  if (['paused', 'dnf'].includes(item.bookDisposition)) {
    item.bookDisposition = '';
    delete item.bookDNFSnapshot;
  }

  let total = Math.max(0, Number(item.progress?.totalPages || 0));
  if (!total && item.providerId) {
    try {
      const data = await getCached(`book:${item.providerId}`, () => TrackerAPI.getBookDetails(item.providerId, state.settings));
      total = Math.max(0, Number(data?.volumeInfo?.pageCount || 0));
    } catch {}
  }
  const periods = getBookReadingPeriods(item);
  item.bookCompletionSnapshot = {
    currentPage: Number(item.progress?.currentPage || 0),
    readingPeriods: periods.map(period => ({ ...period }))
  };
  if (periods.length) {
    const latest = periods.at(-1);
    if (latest && !latest.endDate) latest.endDate = todayString();
  } else if (createReadingPeriod) {
    periods.push({ startDate: todayString(), endDate: todayString() });
  }
  item.progress = { ...item.progress, currentPage: total || Number(item.progress?.currentPage || 0), totalPages: total || Number(item.progress?.totalPages || 0), readingPeriods: periods };
  item.completedAt = todayString();
  setItemQueueStatus(item, 'library');
  item.updatedAt = new Date().toISOString();
  state.history = state.history.filter(entry => !(entry.sourceItemId === item.id && entry.kind === 'book-finished'));
  addHistoryRecord({
    sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: '', showOnCalendar: false,
    kind: 'book-finished', title: item.title, subtitle: total ? `Finished · ${total} pages` : 'Finished', notes: item.notes || '',
    rating: Number(item.rating || 0), image: item.image || '', provider: item.provider, providerId: item.providerId
  });
  saveItems();
  saveHistory();
  renderAll();
  if (els.detailModal?.open && state.openDetailId === item.id) await renderBookDetails(item);
}

async function toggleSpecificTVEpisode(item, seasonNumber, episodeNumber) {
  const wasEpisodeDetail = Boolean(els.detailBody?.querySelector('.detail-back-button[data-tv-season]'));
  const wasSeasonDetail = Boolean(els.detailBody?.querySelector('.detail-back-button[data-tv-series]'));
  const alreadyWatched = isTVEpisodeLogged(item, seasonNumber, episodeNumber);

  if (alreadyWatched) {
    removeTVEpisodeHistory(item, seasonNumber, episodeNumber);
    await recalculateTVProgress(item);
  } else {
    const episode = await getTVEpisodeFromSeason(item, seasonNumber, episodeNumber);
    if (!episode) throw new Error(`Could not find S${seasonNumber} E${episodeNumber}.`);
    // A single episode checked from the normal show detail is something watched now,
    // so it is eligible for today's calendar. Whole-season/import actions are not.
    addHistoryRecord(tvHistoryRecord(item, episode, seasonNumber, episodeNumber));
    if (getTVWatchDisposition(item) === 'watch-later') item.watchDisposition = 'following';
    await recalculateTVProgress(item);
  }

  item.updatedAt = new Date().toISOString();
  saveItems();
  saveHistory();
  renderAll();
  if (els.detailModal?.open) {
    if (wasEpisodeDetail) await renderTVEpisodeDetail(item, seasonNumber, episodeNumber);
    else if (wasSeasonDetail) await renderTVSeasonDetail(item, seasonNumber);
    else await renderTVDetails(item);
  }
}

async function getEarlierUnwatchedTVEpisodes(item, seasonNumber) {
  if (Number(seasonNumber) <= 1) return [];
  const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
  const priorSeasons = (details.seasons || [])
    .filter(info => Number(info.season_number) > 0 && Number(info.season_number) < Number(seasonNumber) && Number(info.episode_count || 0) > 0)
    .sort((a, b) => a.season_number - b.season_number);

  const missing = [];
  for (const info of priorSeasons) {
    const season = await getCached(`season:${item.providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(item.providerId, info.season_number, state.settings));
    for (const episode of (season.episodes || []).filter(ep => Number(ep.episode_number) > 0 && isEpisodeAvailable(ep))) {
      if (!isTVEpisodeLogged(item, info.season_number, episode.episode_number)) {
        missing.push({ seasonNumber: info.season_number, episode });
      }
    }
  }
  return missing;
}

function addImportedTVEpisode(item, episode, seasonNumber, metadata = {}) {
  if (isTVEpisodeLogged(item, seasonNumber, episode.episode_number)) return false;
  const record = tvHistoryRecord(item, episode, seasonNumber, episode.episode_number);
  addHistoryRecord({
    ...record,
    date: '',
    showOnCalendar: false,
    imported: true,
    importedAt: new Date().toISOString(),
    notes: '',
    ...metadata
  });
  return true;
}

async function maybeMarkEarlierTVSeasonsWatched(item, seasonNumber) {
  const missing = await getEarlierUnwatchedTVEpisodes(item, seasonNumber);
  if (!missing.length) return false;

  const highestPrior = Math.max(...missing.map(entry => entry.seasonNumber));
  const okay = confirm(
    `You are marking Season ${seasonNumber} watched. Also mark all previously aired episodes through Season ${highestPrior} as watched?`
  );
  if (!okay) return false;

  for (const { seasonNumber: priorSeasonNumber, episode } of missing) {
    addImportedTVEpisode(item, episode, priorSeasonNumber);
  }
  return true;
}

async function markTVSeasonWatched(item, seasonNumber) {
  const wasSeasonDetail = Boolean(els.detailBody?.querySelector('.detail-back-button[data-tv-series]'));
  const season = await getCached(`season:${item.providerId}:${seasonNumber}`, () => TrackerAPI.getTVSeason(item.providerId, seasonNumber, state.settings));
  const aired = (season.episodes || []).filter(ep => Number(ep.episode_number) > 0 && isEpisodeAvailable(ep));
  const allWatched = aired.length > 0 && aired.every(ep => isTVEpisodeLogged(item, seasonNumber, ep.episode_number));

  if (allWatched) {
    for (const episode of aired) removeTVEpisodeHistory(item, seasonNumber, episode.episode_number);
  } else {
    await maybeMarkEarlierTVSeasonsWatched(item, seasonNumber);
    for (const episode of aired) addImportedTVEpisode(item, episode, seasonNumber);
    if (getTVWatchDisposition(item) === 'watch-later') item.watchDisposition = 'following';
  }

  await recalculateTVProgress(item);
  item.updatedAt = new Date().toISOString();
  saveHistory();
  saveItems();
  renderAll();
  if (els.detailModal?.open) {
    if (wasSeasonDetail) await renderTVSeasonDetail(item, seasonNumber);
    else await renderTVDetails(item);
  }
  return aired.length;
}

function tvHasProgress(item) {
  if (!item || getSourceType(item) !== 'tv') return false;
  if (item.completedAt) return true;
  if (state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched')) return true;
  return Number(item.progress?.nextSeason || 1) > 1 || Number(item.progress?.nextEpisode || 1) > 1;
}

function bookHasProgress(item) {
  if (!item || getSourceType(item) !== 'book') return false;
  return Boolean(item.completedAt) || Number(item.progress?.currentPage || 0) > 0 || getBookReadingPeriods(item).length > 0;
}

function closeActiveBookPeriod(item) {
  const periods = getBookReadingPeriods(item);
  const latest = periods.at(-1);
  if (latest?.startDate && !latest.endDate) latest.endDate = todayString();
  item.progress = { ...item.progress, readingPeriods: periods };
}

function libraryDnfState(item) {
  const sourceType = getSourceType(item);
  if (sourceType === 'tv') {
    if (item.watchDisposition === 'stopped') return 'stopped';
    if (item.watchDisposition === 'paused' || (getQueueStatus(item) === 'tbr' && tvHasProgress(item) && !item.completedAt)) return 'paused';
    return '';
  }
  if (sourceType === 'book') {
    if (item.bookDisposition === 'dnf') return 'stopped';
    if (item.bookDisposition === 'paused' || (getQueueStatus(item) === 'tbr' && bookHasProgress(item) && !item.completedAt)) return 'paused';
    return '';
  }
  if (sourceType === 'movie') return item.mediaDisposition === 'paused' ? 'paused' : item.mediaDisposition === 'stopped' ? 'stopped' : '';
  return '';
}

function openDnfChoice(item) {
  if (!item) return;
  const dialog = document.getElementById('dnfChoiceModal');
  if (!dialog) return;
  dialog.dataset.itemId = item.id;
  const title = dialog.querySelector('h2');
  if (title) title.textContent = `DNF · ${item.title}`;
  showDialogAtTop(dialog);
}

async function applyLibraryDnfChoice(item, choice) {
  if (!item || !['pause', 'stop'].includes(choice)) return;
  const sourceType = getSourceType(item);

  if (sourceType === 'tv') {
    item.watchDisposition = choice === 'pause' ? 'paused' : 'stopped';
    setItemQueueStatus(item, choice === 'pause' ? 'tbr' : 'library');
  } else if (sourceType === 'book') {
    closeActiveBookPeriod(item);
    item.bookDisposition = choice === 'pause' ? 'paused' : 'dnf';
    setItemQueueStatus(item, choice === 'pause' ? 'tbr' : 'library');
  } else if (sourceType === 'movie') {
    item.mediaDisposition = choice === 'pause' ? 'paused' : 'stopped';
    setItemQueueStatus(item, choice === 'pause' ? 'tbr' : 'library');
  } else {
    return;
  }

  item.updatedAt = new Date().toISOString();
  saveItems();
  renderAll();
  document.getElementById('dnfChoiceModal')?.close();
  if (els.detailModal?.open && state.openDetailId === item.id) await openDetails(item.id);
}

async function trackLibraryItem(item, button = null) {
  if (!item) return;
  const sourceType = getSourceType(item);
  if (button) button.disabled = true;
  try {
    if (sourceType === 'tv') {
      item.watchDisposition = 'following';
      setItemQueueStatus(item, 'upnext');
      await reconcileSingleTVItem(item);
      if (item.tvMeta?.hasUnwatched) {
        const completed = await advanceTV(item);
        if (completed) addHistoryRecord(completed);
      }
      item.updatedAt = new Date().toISOString();
      saveItems();
      saveHistory();
      renderAll();
      if (els.detailModal?.open && state.openDetailId === item.id) await renderTVDetails(item);
      return;
    }

    if (sourceType === 'book') {
      const wasPausedOrStopped = ['paused', 'dnf'].includes(item.bookDisposition);
      if (wasPausedOrStopped) { item.bookDisposition = ''; delete item.bookDNFSnapshot; }
      if (wasPausedOrStopped && Number(item.progress?.currentPage || 0) > 0 && !item.completedAt) {
        const periods = getBookReadingPeriods(item);
        const latest = periods.at(-1);
        if (!latest || latest.endDate) periods.push({ startDate: todayString(), endDate: '' });
        item.progress = { ...item.progress, readingPeriods: periods };
      }
      if ((Number(item.progress?.currentPage || 0) > 0 || getBookReadingPeriods(item).some(period => period.startDate && !period.endDate)) && !item.completedAt) setItemQueueStatus(item, 'upnext');
      item.updatedAt = new Date().toISOString();
      saveItems();
      renderAll();
      els.detailModal?.close();
      openBookProgress(item);
      return;
    }

    if (sourceType === 'movie') {
      item.mediaDisposition = '';
      if (!item.completedAt) {
        addHistoryRecord(genericCompletionRecord(item, true));
        item.completedAt = todayString();
      }
      setItemQueueStatus(item, 'library');
      item.updatedAt = new Date().toISOString();
      saveItems();
      saveHistory();
      renderAll();
      if (els.detailModal?.open && state.openDetailId === item.id) await renderMovieDetails(item);
    }
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
}

const RELEASE_QUEUE_SOURCE_TYPES = new Set(['tv', 'movie', 'book']);

function normalizedReleaseDate(value) {
  const date = String(value || '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function itemReleaseDate(item) {
  return normalizedReleaseDate(item?.releaseDate);
}

function isItemNotReleased(item, today = todayString()) {
  const releaseDate = itemReleaseDate(item);
  return Boolean(releaseDate && releaseDate > today);
}

function releaseQueueStage(item, today = todayString()) {
  const releaseDate = itemReleaseDate(item);
  if (!releaseDate || releaseDate <= today) return 'released';
  return today >= addDaysToDateString(releaseDate, -7) ? 'tbr' : 'library';
}

function setReleaseQueueStatus(item, status) {
  const sourceType = getSourceType(item);
  setItemQueueStatus(item, status);
  if (sourceType === 'tv') {
    if (status === 'tbr') item.watchDisposition = 'watch-later';
    else if (status === 'upnext') item.watchDisposition = 'following';
  }
  if (sourceType === 'book' && status === 'upnext' && item.bookDisposition === 'paused') item.bookDisposition = '';
}

function applyReleaseQueueAutomation(item, today = todayString()) {
  if (!item) return false;
  const releaseDate = itemReleaseDate(item);
  const sourceType = getSourceType(item);
  const supportsQueue = RELEASE_QUEUE_SOURCE_TYPES.has(sourceType);
  const before = JSON.stringify({ queueStatus: getQueueStatus(item), watchDisposition: item.watchDisposition || '', bookDisposition: item.bookDisposition || '', releaseAutomation: item.releaseAutomation || null });

  if (!releaseDate) {
    if (item.releaseAutomation) delete item.releaseAutomation;
  } else if (releaseDate > today) {
    const desired = releaseQueueStage(item, today);
    if (supportsQueue) setReleaseQueueStatus(item, desired);
    item.releaseAutomation = { date: releaseDate, stage: desired };
  } else if (supportsQueue && item.releaseAutomation?.date === releaseDate && ['library', 'tbr'].includes(item.releaseAutomation?.stage)) {
    if (!item.completedAt && libraryDnfState(item) !== 'stopped') setReleaseQueueStatus(item, 'upnext');
    item.releaseAutomation = { date: releaseDate, stage: 'released', activatedAt: today };
  } else if (item.releaseAutomation?.date && item.releaseAutomation.date !== releaseDate) {
    if (releaseDate > today) {
      const desired = releaseQueueStage(item, today);
      if (supportsQueue) setReleaseQueueStatus(item, desired);
      item.releaseAutomation = { date: releaseDate, stage: desired };
    } else {
      delete item.releaseAutomation;
    }
  }

  const after = JSON.stringify({ queueStatus: getQueueStatus(item), watchDisposition: item.watchDisposition || '', bookDisposition: item.bookDisposition || '', releaseAutomation: item.releaseAutomation || null });
  return before !== after;
}

function reconcileLocalProgressQueues() {
  let changed = false;
  for (const item of state.items) {
    if (applyReleaseQueueAutomation(item)) changed = true;
    const sourceType = getSourceType(item);
    if (isItemNotReleased(item)) continue;
    if (sourceType === 'book') {
      const current = Number(item.progress?.currentPage || 0);
      const total = Number(item.progress?.totalPages || 0);
      const finished = Boolean(item.completedAt) || (total > 0 && current >= total);
      const periods = getBookReadingPeriods(item);
      const latest = periods.at(-1);
      const activeReadingPeriod = Boolean(latest?.startDate && !latest.endDate);
      if (!finished && !item.bookDisposition && latest?.endDate && ['library', 'tbr'].includes(getQueueStatus(item))) {
        item.bookDisposition = 'paused';
        changed = true;
      }
      if (item.bookDisposition === 'paused') {
        if (getQueueStatus(item) !== 'tbr') { setItemQueueStatus(item, 'tbr'); changed = true; }
      } else if (item.bookDisposition === 'dnf') {
        if (getQueueStatus(item) !== 'library') { setItemQueueStatus(item, 'library'); changed = true; }
      } else if ((current > 0 || activeReadingPeriod) && !finished && getQueueStatus(item) !== 'upnext') {
        setItemQueueStatus(item, 'upnext');
        changed = true;
      }
    } else if (sourceType === 'tv') {
      const disposition = getTVWatchDisposition(item);
      if (disposition === 'paused' && getQueueStatus(item) !== 'tbr') {
        setItemQueueStatus(item, 'tbr');
        changed = true;
      } else if (disposition === 'stopped' && getQueueStatus(item) !== 'library') {
        setItemQueueStatus(item, 'library');
        changed = true;
      } else if (disposition === 'following' && item.tvMeta?.hasUnwatched && getQueueStatus(item) !== 'upnext') {
        setItemQueueStatus(item, 'upnext');
        changed = true;
      }
    }
  }
  if (changed) saveItems();
}

async function moveItemToQueue(item, status) {
  let next = ['upnext', 'tbr', 'library'].includes(status) ? status : 'library';
  const sourceType = getSourceType(item);
  const current = getQueueStatus(item);
  const progressedPause = next === 'tbr' && current === 'tbr' && (
    (sourceType === 'tv' && tvHasProgress(item) && !item.completedAt) ||
    (sourceType === 'book' && bookHasProgress(item) && !item.completedAt) ||
    libraryDnfState(item) === 'paused'
  );
  if (progressedPause) return;
  if (next !== 'library' && current === next) next = 'library';

  if (sourceType === 'tv') {
    if (next === 'upnext') {
      item.watchDisposition = 'following';
      setItemQueueStatus(item, 'upnext');
      await reconcileSingleTVItem(item);
    } else if (next === 'tbr') {
      if (tvHasProgress(item) && !item.completedAt) {
        item.watchDisposition = 'paused';
      } else {
        item.watchDisposition = 'watch-later';
      }
      setItemQueueStatus(item, 'tbr');
    } else {
      setItemQueueStatus(item, 'library');
    }
  } else if (sourceType === 'book') {
    if (next === 'upnext') {
      if (item.bookDisposition === 'paused') item.bookDisposition = '';
      setItemQueueStatus(item, 'upnext');
    } else if (next === 'tbr') {
      if (bookHasProgress(item) && !item.completedAt) {
        closeActiveBookPeriod(item);
        item.bookDisposition = 'paused';
      } else {
        item.bookDisposition = '';
      }
      setItemQueueStatus(item, 'tbr');
    } else {
      setItemQueueStatus(item, 'library');
    }
  } else if (sourceType === 'movie') {
    if (next === 'tbr' && item.mediaDisposition !== 'paused') item.mediaDisposition = '';
    setItemQueueStatus(item, next);
  } else {
    setItemQueueStatus(item, next);
  }
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderAll();
  if (els.detailModal?.open && state.openDetailId === item.id) {
    if (sourceType === 'tv') await renderTVDetails(item);
    else if (sourceType === 'youtube') await renderWorkoutDetails(item);
    else if (sourceType === 'book') await renderBookDetails(item);
    else if (sourceType === 'movie') await renderMovieDetails(item);
    else if (sourceType === 'music') await renderMusicDetails(item);
    else if (sourceType === 'artist') await renderArtistDetails(item);
    else if (sourceType === 'song') await renderSongDetails(item);
    else if (sourceType === 'reminder') renderReminderDetails(item);
    else if (['event', 'concert'].includes(sourceType)) await renderEventDetails(item);
    else if (sourceType === 'restaurant') await renderRestaurantDetails(item);
    else renderManualDetails(item);
  }
}

function queueMoveControls(item) {
  if (!item) return '';
  const sourceType = getSourceType(item);
  const current = getQueueStatus(item);

  if (sourceType === 'restaurant') {
    return `<div class="queue-toggle-buttons" aria-label="Library placement">
      <button class="secondary-button queue-toggle-button${current === 'library' ? ' is-selected' : ''}" type="button" data-move-queue="library" data-item-id="${item.id}" aria-pressed="${current === 'library'}">Track</button>
      <button class="secondary-button queue-toggle-button${current === 'tbr' ? ' is-selected' : ''}" type="button" data-move-queue="tbr" data-item-id="${item.id}" aria-pressed="${current === 'tbr'}">TBR</button>
    </div>`;
  }

  if (!['tv', 'movie', 'book'].includes(sourceType)) return '';
  const dnfState = libraryDnfState(item);
  const trackSelected = sourceType === 'movie' ? Boolean(item.completedAt) : current === 'upnext';
  const unreleased = isItemNotReleased(item);
  return `<div class="queue-toggle-buttons library-status-actions" aria-label="Status">
    <button class="secondary-button queue-toggle-button${trackSelected ? ' is-selected' : ''}" type="button" data-library-track="${escapeAttr(item.id)}" aria-pressed="${trackSelected}" ${unreleased ? 'disabled' : ''}>Track</button>
    <button class="secondary-button queue-toggle-button${current === 'tbr' ? ' is-selected' : ''}" type="button" data-move-queue="tbr" data-item-id="${escapeAttr(item.id)}" aria-pressed="${current === 'tbr'}" ${(item.completedAt || unreleased) ? 'disabled' : ''}>TBR</button>
    <button class="secondary-button queue-toggle-button${dnfState === 'stopped' ? ' is-selected' : ''}" type="button" data-library-dnf="${escapeAttr(item.id)}" aria-pressed="${dnfState === 'stopped'}" ${(item.completedAt || unreleased) ? 'disabled' : ''}>DNF</button>
  </div>`;
}

async function advanceWorkout(item) {
  const playlist = await getPlaylistCached(item.providerId);
  const index = Math.max(0, Number(item.progress?.currentIndex || 0));
  const video = playlist.items[index];
  if (!video) throw new Error('There is no remaining YouTube video to complete.');

  const completed = youtubeHistoryRecord(item, playlist, video, index);
  let nextIndex = index + 1;
  while (nextIndex < playlist.items.length && isYouTubeVideoLogged(item, playlist.items[nextIndex].videoId)) nextIndex += 1;

  item.progress = { ...item.progress, currentIndex: nextIndex };
  if (nextIndex >= playlist.items.length) {
    setItemQueueStatus(item, 'library');
    item.completedAt = todayString();
  }
  return completed;
}

function youtubeHistoryRecord(item, playlist, video, index) {
  return {
    sourceItemId: item.id,
    type: item.type,
    typeLabel: getItemTypeLabel(item),
    date: todayString(),
    kind: 'youtube-completed',
    title: video.title,
    subtitle: `${item.title} · ${index + 1} of ${playlist.items.length}`,
    notes: video.description || '',
    rating: Number(item.rating || 0),
    image: video.image || item.image || '',
    provider: 'youtube',
    providerId: item.providerId,
    videoId: video.videoId,
    playlistIndex: index
  };
}

function isYouTubeVideoLogged(item, videoId) {
  return state.history.some(entry =>
    entry.kind === 'youtube-completed' &&
    entry.sourceItemId === item.id &&
    entry.videoId === videoId
  );
}

async function logSpecificYouTubeVideo(item, videoId) {
  if (isYouTubeVideoLogged(item, videoId)) return;

  const playlist = await getPlaylistCached(item.providerId);
  const index = playlist.items.findIndex(video => video.videoId === videoId);
  if (index < 0) throw new Error('Could not find that video in the playlist.');

  const currentIndex = Math.max(0, Number(item.progress?.currentIndex || 0));
  let record;
  if (index === currentIndex) {
    record = await advanceWorkout(item);
  } else {
    record = youtubeHistoryRecord(item, playlist, playlist.items[index], index);
  }

  addHistoryRecord(record);
  saveItems();
  saveHistory();
  renderAll();
  await renderWorkoutDetails(item);
}

// ---------------------------
// ADD / EDIT
// ---------------------------
function openItemModal(id = '', defaultQueueStatus = 'library') {
  resetItemForm(defaultQueueStatus);
  const item = id ? findItem(id) : null;

  if (item) {
    els.editingId.value = item.id;
    els.itemModalEyebrow.textContent = 'EDIT';
    els.itemModalTitle.textContent = item.title;
    const sourceType = getSourceType(item);
    els.itemSourceType.value = sourceType;
    if (['youtube', 'reminder', 'other'].includes(sourceType)) els.itemDisplayType.value = getItemTypeLabel(item);
    els.provider.value = item.provider || 'manual';
    els.providerId.value = item.providerId || '';
    els.providerImage.value = item.image || '';
    els.providerSubtitle.value = item.subtitle || '';
    els.manualTitle.value = item.title || '';
    if (els.itemSubcategory) els.itemSubcategory.value = item.subcategory || '';
    els.itemNote.value = item.notes || '';
    els.itemDate.value = item.date || '';
    if (els.itemReleaseDate) els.itemReleaseDate.value = normalizedReleaseDate(item.releaseDate);
    if (els.itemRecommended) els.itemRecommended.checked = Boolean(item.recommended);
    syncItemRecommendHeart();
    els.itemQueueStatus.value = getQueueStatus(item);
    setRating(Number(item.rating || 0));

    if (sourceType === 'tv') {
      els.nextSeason.value = item.progress?.nextSeason || 1;
      els.nextEpisode.value = item.progress?.nextEpisode || 1;
    }
    if (sourceType === 'book') {
      els.bookCurrentPage.value = item.progress?.currentPage || 0;
      els.bookTotalPages.value = item.progress?.totalPages || '';
      const periods = getBookReadingPeriods(item);
      const latest = periods.at(-1) || null;
      els.bookStartDate.value = latest?.startDate || '';
      els.bookEndDate.value = latest?.endDate || '';
    }
    if (sourceType === 'youtube') {
      els.playlistInput.value = item.providerId || '';
      state.loadedPlaylist = null;
      showSelectedSource({ title: item.title, subtitle: item.subtitle, image: item.image }, true);
    } else if (sourceType === 'reminder') {
      if (els.reminderFrequency) els.reminderFrequency.value = reminderFrequency(item);
      if (els.reminderDueDate) els.reminderDueDate.value = (reminderFrequency(item) === 'weekly' && !item.reminder?.intervalUnit && Number.isInteger(Number(item.reminder?.weekday))) ? (getNextReminderDueDate(item) || todayString()) : (item.reminder?.dueDate || item.reminder?.scheduleStart || getNextReminderDueDate(item) || todayString());
      if (els.reminderInterval) els.reminderInterval.value = String(Math.max(1, Number(item.reminder?.interval || 2)));
      if (els.reminderIntervalUnit) els.reminderIntervalUnit.value = ['days','weeks','months'].includes(item.reminder?.intervalUnit) ? item.reminder.intervalUnit : 'weeks';
      if (els.reminderWeekday) els.reminderWeekday.value = String(Number.isInteger(Number(item.reminder?.weekday)) ? Number(item.reminder.weekday) : 6);
    } else if (item.provider && item.provider !== 'manual' && item.provider !== 'reminder') {
      state.selectedSource = { provider: item.provider, providerId: item.providerId, title: item.title, subtitle: item.subtitle, image: item.image };
      showSelectedSource(state.selectedSource);
    }
    state.attachmentDraft = {
      existingFiles: (item.attachments || []).map(file => ({ ...file })),
      newFiles: [],
      removedFileIds: new Set(),
      links: (item.links || []).map(link => ({ ...link }))
    };
    renderAttachmentEditor();
    els.deleteItem.hidden = false;
  }

  updateItemFormForType();
  showDialogAtTop(els.itemModal);
  if (item && getSourceType(item) === 'tv' && item.providerId) {
    prepareTVWatchSetup(item.providerId, item.id).catch(error => {
      if (els.tvWatchSetupStatus) els.tvWatchSetupStatus.textContent = error.message;
    });
  }
}

function resetItemForm(defaultQueueStatus = 'library') {
  els.itemForm.reset();
  els.editingId.value = '';
  els.itemSourceType.value = 'tv';
  els.itemDisplayType.value = 'Workout';
  if (els.itemSubcategory) els.itemSubcategory.value = '';
  els.itemQueueStatus.value = ['upnext','tbr','library'].includes(defaultQueueStatus) ? defaultQueueStatus : 'library';
  els.nextSeason.value = 1;
  els.nextEpisode.value = 1;
  els.bookCurrentPage.value = 0;
  els.bookTotalPages.value = '';
  if (els.bookStartDate) els.bookStartDate.value = '';
  if (els.bookEndDate) els.bookEndDate.value = '';
  if (els.itemReleaseDate) els.itemReleaseDate.value = '';
  if (els.reminderFrequency) els.reminderFrequency.value = 'none';
  if (els.reminderDueDate) els.reminderDueDate.value = todayString();
  if (els.reminderInterval) els.reminderInterval.value = '2';
  if (els.reminderIntervalUnit) els.reminderIntervalUnit.value = 'weeks';
  if (els.reminderWeekday) els.reminderWeekday.value = '6';
  els.provider.value = '';
  els.providerId.value = '';
  els.providerImage.value = '';
  els.providerSubtitle.value = '';
  els.itemModalEyebrow.textContent = 'ADD';
  els.itemModalTitle.textContent = 'Add something';
  if (els.itemRecommended) els.itemRecommended.checked = false;
  syncItemRecommendHeart();
  els.deleteItem.hidden = true;
  els.searchResults.hidden = true;
  els.searchResults.innerHTML = '';
  els.selectedSource.hidden = true;
  els.playlistPreview.hidden = true;
  els.formMessage.hidden = true;
  state.selectedSource = null;
  state.loadedPlaylist = null;
  resetTVDraftSetup();
  state.attachmentDraft = emptyAttachmentDraft();
  if (els.itemFiles) els.itemFiles.value = '';
  if (els.itemLinkLabel) els.itemLinkLabel.value = '';
  if (els.itemLinkUrl) els.itemLinkUrl.value = '';
  renderAttachmentEditor();
  const draftBookComplete = document.querySelector('[data-book-mark-complete-draft]');
  if (draftBookComplete) {
    draftBookComplete.dataset.bulkActive = 'false';
    delete draftBookComplete.dataset.previousPage;
    delete draftBookComplete.dataset.previousEndDate;
    draftBookComplete.textContent = '✓ Mark book complete';
  }
  setRating(0);
  updateItemFormForType();
}

function clearSourceSelectionForTypeChange() {
  state.selectedSource = null;
  state.loadedPlaylist = null;
  resetTVDraftSetup();
  els.provider.value = '';
  els.providerId.value = '';
  els.providerImage.value = '';
  els.providerSubtitle.value = '';
  if (els.itemReleaseDate) els.itemReleaseDate.value = '';
  els.catalogueQuery.value = '';
  els.playlistInput.value = '';
  els.searchResults.hidden = true;
  els.searchResults.innerHTML = '';
  els.selectedSource.hidden = true;
  els.playlistPreview.hidden = true;
}

function updateItemFormForType() {
  const sourceType = els.itemSourceType.value;
  const isCatalogue = ['tv', 'book', 'movie', 'music', 'artist', 'song', 'concert', 'event', 'restaurant'].includes(sourceType);
  const isYouTube = sourceType === 'youtube';
  const isReminder = sourceType === 'reminder';
  const isManual = sourceType === 'other';
  const isFoodManual = ['food','recipe'].includes(sourceType);

  els.catalogueSearchBlock.hidden = !isCatalogue;
  els.workoutBlock.hidden = !isYouTube;
  if (els.reminderBlock) els.reminderBlock.hidden = !isReminder;
  els.displayTypeBlock.hidden = !(isYouTube || isReminder || isManual);
  els.manualTitleBlock.hidden = false;
  els.tvProgressFields.hidden = sourceType !== 'tv';
  els.bookProgressFields.hidden = sourceType !== 'book';
  if (els.itemDateField) els.itemDateField.hidden = sourceType === 'book' || isReminder;
  if (els.itemReleaseDateField) els.itemReleaseDateField.hidden = !['tv','movie','book','music','artist','song'].includes(sourceType);
  if (sourceType === 'book' && !els.editingId.value && els.bookStartDate && !els.bookStartDate.value) {
    els.bookStartDate.value = todayString();
  }
  if (els.queueStatusField) els.queueStatusField.hidden = isReminder || ['music','artist','song','concert','food','recipe'].includes(sourceType);
  const upNextOption = els.itemQueueStatus?.querySelector('option[value="upnext"]');
  if (upNextOption) {
    upNextOption.hidden = sourceType === 'restaurant';
    upNextOption.disabled = sourceType === 'restaurant';
    if (sourceType === 'restaurant' && els.itemQueueStatus.value === 'upnext') els.itemQueueStatus.value = 'library';
  }

  const fixedMusicSubcategory = musicSubcategoryForSourceType(sourceType) || foodSubcategoryForSourceType(sourceType) || (sourceType === 'music' && (state.selectedSource?.provider === 'itunes' || els.provider?.value === 'itunes') ? 'Album' : '');
  if (els.itemSubcategory) {
    if (fixedMusicSubcategory) {
      els.itemSubcategory.value = fixedMusicSubcategory;
      els.itemSubcategory.readOnly = true;
      els.itemSubcategory.placeholder = fixedMusicSubcategory;
    } else {
      els.itemSubcategory.readOnly = false;
      if (!els.editingId.value) els.itemSubcategory.value = '';
      els.itemSubcategory.placeholder = 'e.g. Documentary, Lecture, Gym';
    }
  }

  if (isYouTube) {
    els.displayTypeLabel.textContent = 'Display as';
    els.displayTypeHint.textContent = 'Name this kind of YouTube content. For example: Workout, Pilates, Yoga, Tutorials.';
    if (!els.itemDisplayType.value.trim()) els.itemDisplayType.value = 'Workout';
  } else if (isReminder) {
    els.displayTypeLabel.textContent = 'Type';
    els.displayTypeHint.textContent = 'This is the calendar/streak category for the reminder. For example: Chores, Medication, Cleaning.';
    if (!els.editingId.value || !els.itemDisplayType.value.trim()) els.itemDisplayType.value = 'Chores';
    if (els.itemQueueStatus) els.itemQueueStatus.value = 'upnext';
  } else if (isManual) {
    els.displayTypeLabel.textContent = 'New type name';
    els.displayTypeHint.textContent = 'This creates a reusable type for the tracker and library.';
    if (!els.editingId.value) els.itemDisplayType.value = '';
  }

  if (!els.editingId.value) {
    state.selectedSource = null;
    state.loadedPlaylist = null;
    els.provider.value = isYouTube ? 'youtube' : isReminder ? 'reminder' : (isManual || isFoodManual) ? 'manual' : '';
    els.providerId.value = '';
    els.providerImage.value = '';
    els.providerSubtitle.value = '';
    els.searchResults.hidden = true;
    els.selectedSource.hidden = true;
    els.playlistPreview.hidden = true;
  }

  updateReminderFormFields();

  const placeholders = {
    tv: 'Search TV shows',
    movie: 'Search movies',
    book: 'Search books',
    music: 'Search albums (optional)',
    artist: 'Search artists',
    song: 'Search songs',
    concert: 'Search concerts — past or upcoming',
    event: 'Search events',
    restaurant: 'Search restaurants'
  };
  els.catalogueQuery.placeholder = placeholders[sourceType] || 'Search title';

  if (els.manualTitle) {
    els.manualTitle.placeholder = sourceType === 'recipe'
      ? 'Recipe name'
      : sourceType === 'restaurant'
        ? 'Name this restaurant in your tracker'
        : 'Title';
  }
  if (els.itemNote) {
    els.itemNote.placeholder = sourceType === 'restaurant'
      ? 'What you ordered, who you went with, or anything to remember'
      : sourceType === 'recipe'
        ? 'What you changed, how it turned out, or anything to remember'
        : 'Anything you want to remember';
  }
  if (els.itemLinkLabel) els.itemLinkLabel.placeholder = sourceType === 'recipe' ? 'Recipe source (optional)' : 'Link label (optional)';
}

function updateReminderFormFields() {
  if (!els.reminderFrequency) return;
  const frequency = els.reminderFrequency.value;
  const custom = frequency === 'custom';
  if (els.reminderWeekdayField) els.reminderWeekdayField.hidden = true;
  if (els.reminderDateField) els.reminderDateField.hidden = false;
  if (els.reminderDateLabel) els.reminderDateLabel.textContent = frequency === 'none' ? 'Date' : 'Starts';
  if (els.reminderCustomFields) els.reminderCustomFields.hidden = !custom;
  if (els.reminderDueDate && !els.reminderDueDate.value) els.reminderDueDate.value = todayString();
  if (custom && els.reminderInterval && Number(els.reminderInterval.value || 0) < 1) els.reminderInterval.value = '1';
}

async function searchCatalogue() {
  const type = els.itemSourceType.value;
  const query = els.catalogueQuery.value.trim();
  if (!query) return;
  showFormMessage('Searching…', false);
  els.catalogueSearchButton.disabled = true;

  try {
    const liveSearch = ['concert', 'event'].includes(type);
    const restaurantSearch = type === 'restaurant';
    const results = await TrackerAPI.searchCatalogue(query, type, state.settings, (liveSearch || restaurantSearch) ? {
      city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
      countryCode: state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA',
      region: state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA',
    } : {});
    renderSearchResults(results);
    showFormMessage('', false);
  } catch (error) {
    showFormMessage(error.message, true);
  } finally {
    els.catalogueSearchButton.disabled = false;
  }
}

function renderSearchResults(results) {
  els.searchResults.innerHTML = '';
  if (!results.length) {
    const sourceType = els.itemSourceType.value;
    const city = state.discoverPrefs.eventCity || state.settings.homeCity || '';
    const liveMessage = sourceType === 'concert'
      ? `No upcoming Ticketmaster concert results${city ? ` in ${city}` : ''}. You can always add a past concert manually.`
      : sourceType === 'event'
        ? `No Ticketmaster results${city ? ` in ${city}` : ''}.`
        : sourceType === 'restaurant'
          ? `No restaurant results${city ? ` near ${city}` : ''}.`
          : 'No results.';
    els.searchResults.innerHTML = `<div class="search-result-meta" style="padding:14px">${escapeHtml(liveMessage)}</div>`;
    els.searchResults.hidden = false;
    return;
  }

  results.forEach((result, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result';
    button.dataset.index = String(index);
    button.innerHTML = `
      ${result.image ? `<img src="${escapeAttr(result.image)}" alt="" />` : '<div class="search-result-placeholder"></div>'}
      <div>
        <div class="search-result-title">${escapeHtml(result.title)}</div>
        <div class="search-result-meta">${escapeHtml([
          result.eventDate && result.eventDate < todayString() ? 'Past' : '',
          result.subtitle || ''
        ].filter(Boolean).join(' · '))}</div>
      </div>`;
    button.addEventListener('click', () => selectCatalogueResult(result));
    els.searchResults.appendChild(button);
  });
  if (els.itemSourceType.value === 'restaurant') {
    const attribution = document.createElement('div');
    attribution.className = 'gmp-attribution';
    attribution.setAttribute('translate', 'no');
    attribution.textContent = 'Google Maps';
    els.searchResults.appendChild(attribution);
  }
  els.searchResults.hidden = false;
}

function selectCatalogueResult(result) {
  state.selectedSource = result;
  const selectingRestaurant = els.itemSourceType.value === 'restaurant' && result.provider === 'googlePlaces';
  // Selecting a restaurant should behave like selecting a movie: use the
  // catalogue result's actual display name as the prefilled tracker title.
  if (selectingRestaurant) {
    els.manualTitle.value = result.title || String(els.catalogueQuery?.value || '').trim();
    els.manualTitle.placeholder = 'Restaurant name';
  } else {
    els.manualTitle.value = result.title || '';
  }
  els.provider.value = result.provider;
  els.providerId.value = result.providerId;
  els.providerImage.value = selectingRestaurant ? '' : (result.image || '');
  els.providerSubtitle.value = selectingRestaurant ? '' : (result.subtitle || '');
  els.searchResults.hidden = true;
  showSelectedSource(result);

  if (els.itemSourceType.value === 'book' && result.pageCount && !els.bookTotalPages.value) {
    els.bookTotalPages.value = result.pageCount;
  }
  if (['event', 'concert'].includes(els.itemSourceType.value) && result.eventDate && els.itemDate) {
    els.itemDate.value = result.eventDate;
  }
  if (els.itemReleaseDate && ['tv','movie','book','music','artist','song'].includes(els.itemSourceType.value)) {
    const releaseDate = normalizedReleaseDate(extractItemReleaseDate(els.itemSourceType.value, result, null));
    if (releaseDate) els.itemReleaseDate.value = releaseDate;
  }
  if (els.itemSourceType.value === 'music' && result.provider === 'itunes' && els.itemSubcategory) {
    els.itemSubcategory.value = 'Album';
    els.itemSubcategory.readOnly = true;
    els.itemSubcategory.placeholder = 'Album';
  }
  if (els.itemSourceType.value === 'tv' && result.providerId) {
    prepareTVWatchSetup(result.providerId).catch(error => {
      if (els.tvWatchSetupStatus) els.tvWatchSetupStatus.textContent = error.message;
    });
  }
}


function resetTVDraftSetup() {
  state.tvDraftProviderId = '';
  state.tvDraftWatched = new Set();
  state.tvDraftInitialWatched = new Set();
  state.tvDraftBulkBaseline = null;
  state.tvDraftLocked = new Set();
  state.tvDraftSeasons = [];
  state.tvDraftDetails = null;
  if (els.tvWatchSetupList) els.tvWatchSetupList.innerHTML = '';
  if (els.tvWatchSetupStatus) els.tvWatchSetupStatus.textContent = 'Choose a TV search result to load its seasons and episodes.';
}

function tvDraftEpisodeKey(seasonNumber, episodeNumber) {
  return `${Number(seasonNumber)}:${Number(episodeNumber)}`;
}

async function prepareTVWatchSetup(providerId, itemId = '') {
  if (!providerId || !els.tvWatchSetupList) return;
  state.tvDraftProviderId = String(providerId);
  state.tvDraftWatched = new Set();
  state.tvDraftInitialWatched = new Set();
  state.tvDraftBulkBaseline = null;
  state.tvDraftLocked = new Set();
  state.tvDraftSeasons = [];
  if (els.tvWatchSetupStatus) els.tvWatchSetupStatus.textContent = 'Loading seasons and episodes…';
  els.tvWatchSetupList.innerHTML = '<p class="tv-watch-loading">Loading episode history…</p>';

  const details = await getCached(`tv:${providerId}`, () => TrackerAPI.getTVDetails(providerId, state.settings));
  const seasonInfos = (details.seasons || [])
    .filter(info => Number(info.season_number) > 0 && Number(info.episode_count) > 0)
    .sort((a,b) => Number(a.season_number) - Number(b.season_number));

  const seasons = await Promise.all(seasonInfos.map(async info => {
    const season = await getCached(`season:${providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(providerId, info.season_number, state.settings));
    return {
      seasonNumber: Number(info.season_number),
      name: season.name || `Season ${info.season_number}`,
      airDate: season.air_date || info.air_date || '',
      episodes: (season.episodes || []).filter(ep => Number(ep.episode_number) > 0)
    };
  }));

  if (state.tvDraftProviderId !== String(providerId)) return;
  state.tvDraftDetails = details;
  state.tvDraftSeasons = seasons;

  const existing = itemId ? findItem(itemId) : null;
  if (existing) {
    for (const season of seasons) {
      for (const episode of season.episodes) {
        const key = tvDraftEpisodeKey(season.seasonNumber, episode.episode_number);
        if (isTVEpisodeConsumed(existing, season.seasonNumber, episode.episode_number)) {
          state.tvDraftWatched.add(key);
          state.tvDraftInitialWatched.add(key);
        }
      }
    }
  }

  renderTVWatchSetup();
}

function renderTVWatchSetup() {
  if (!els.tvWatchSetupList) return;
  if (!state.tvDraftSeasons.length) {
    els.tvWatchSetupList.innerHTML = '<p class="tv-watch-loading">No seasons found.</p>';
    if (els.tvWatchSetupStatus) els.tvWatchSetupStatus.textContent = 'No episode list is available for this show.';
    return;
  }

  let airedCount = 0;
  let selectedCount = 0;
  const html = state.tvDraftSeasons.map((season, seasonIndex) => {
    const aired = season.episodes.filter(isEpisodeAvailable);
    airedCount += aired.length;
    selectedCount += aired.filter(ep => state.tvDraftWatched.has(tvDraftEpisodeKey(season.seasonNumber, ep.episode_number))).length;
    const seasonSelected = aired.length > 0 && aired.every(ep => state.tvDraftWatched.has(tvDraftEpisodeKey(season.seasonNumber, ep.episode_number)));
    const episodes = season.episodes.map(ep => {
      const key = tvDraftEpisodeKey(season.seasonNumber, ep.episode_number);
      const available = isEpisodeAvailable(ep);
      const checked = state.tvDraftWatched.has(key);
      return `<label class="tv-watch-episode${available ? '' : ' is-future'}">
        <input type="checkbox" data-tv-draft-episode="${escapeAttr(key)}" ${checked ? 'checked' : ''} ${!available ? 'disabled' : ''} />
        <span class="tv-watch-check">✓</span>
        <span class="tv-watch-episode-copy">
          <strong>E${ep.episode_number} · ${escapeHtml(ep.name || 'Episode')}</strong>
          <small>${escapeHtml([ep.air_date || '', checked ? 'watched' : !available ? 'not aired yet' : ''].filter(Boolean).join(' · '))}</small>
        </span>
      </label>`;
    }).join('');
    return `<details class="tv-watch-season" ${seasonIndex === 0 ? 'open' : ''}>
      <summary>
        <span><strong>Season ${season.seasonNumber}</strong><small>${season.episodes.length} episodes${season.airDate ? ` · ${escapeHtml(season.airDate.slice(0,4))}` : ''}</small></span>
        <span class="tv-watch-season-actions">
          <button class="tv-season-mark-button${seasonSelected ? ' is-complete' : ''}" type="button" data-tv-draft-season-action="${season.seasonNumber}">${seasonSelected ? '✓ Watched' : 'Mark season watched'}</button>
        </span>
      </summary>
      <div class="tv-watch-episodes">${episodes}</div>
    </details>`;
  }).join('');

  els.tvWatchSetupList.innerHTML = html;
  if (els.tvWatchSetupStatus) {
    els.tvWatchSetupStatus.textContent = `${selectedCount} of ${airedCount} aired episodes marked watched. Future episodes are ignored until they air.`;
  }
  if (els.tvMarkAllWatched) {
    els.tvMarkAllWatched.textContent = state.tvDraftBulkBaseline instanceof Set ? '↶ Undo series complete' : '✓ Mark series complete';
  }
}

function handleTVDraftEpisodeToggle(event) {
  const input = event.target.closest('[data-tv-draft-episode]');
  if (!input) return;
  const key = input.dataset.tvDraftEpisode;
  if (input.checked) state.tvDraftWatched.add(key);
  else state.tvDraftWatched.delete(key);
  renderTVWatchSetup();
}

function handleTVDraftSeasonAction(event) {
  const button = event.target.closest('[data-tv-draft-season-action]');
  if (!button) return;
  event.preventDefault();
  const seasonNumber = Number(button.dataset.tvDraftSeasonAction);
  const season = state.tvDraftSeasons.find(entry => entry.seasonNumber === seasonNumber);
  if (!season) return;
  const aired = season.episodes.filter(isEpisodeAvailable);
  const allSelected = aired.length > 0 && aired.every(ep => state.tvDraftWatched.has(tvDraftEpisodeKey(seasonNumber, ep.episode_number)));

  if (!allSelected && seasonNumber > 1) {
    const earlierMissing = state.tvDraftSeasons
      .filter(entry => entry.seasonNumber > 0 && entry.seasonNumber < seasonNumber)
      .flatMap(entry => entry.episodes
        .filter(isEpisodeAvailable)
        .map(ep => ({ seasonNumber: entry.seasonNumber, ep })))
      .filter(({ seasonNumber: priorSeason, ep }) => !state.tvDraftWatched.has(tvDraftEpisodeKey(priorSeason, ep.episode_number)));

    if (earlierMissing.length && confirm(`Also mark all previously aired episodes before Season ${seasonNumber} as watched?`)) {
      for (const { seasonNumber: priorSeason, ep } of earlierMissing) {
        state.tvDraftWatched.add(tvDraftEpisodeKey(priorSeason, ep.episode_number));
      }
    }
  }

  for (const ep of aired) {
    const key = tvDraftEpisodeKey(seasonNumber, ep.episode_number);
    if (allSelected) state.tvDraftWatched.delete(key);
    else state.tvDraftWatched.add(key);
  }
  renderTVWatchSetup();
}

function toggleAllTVDraftEpisodes() {
  if (state.tvDraftBulkBaseline instanceof Set) {
    state.tvDraftWatched = new Set(state.tvDraftBulkBaseline);
    state.tvDraftBulkBaseline = null;
  } else {
    state.tvDraftBulkBaseline = new Set(state.tvDraftWatched);
    setAllTVDraftEpisodes(true);
    return;
  }
  renderTVWatchSetup();
}

function setAllTVDraftEpisodes(markWatched) {
  for (const season of state.tvDraftSeasons) {
    for (const ep of season.episodes.filter(isEpisodeAvailable)) {
      const key = tvDraftEpisodeKey(season.seasonNumber, ep.episode_number);
      if (markWatched) state.tvDraftWatched.add(key);
      else state.tvDraftWatched.delete(key);
    }
  }
  renderTVWatchSetup();
}

function findTVDraftEpisode(seasonNumber, episodeNumber) {
  const season = state.tvDraftSeasons.find(entry => entry.seasonNumber === Number(seasonNumber));
  return season?.episodes.find(ep => Number(ep.episode_number) === Number(episodeNumber)) || null;
}

async function persistTVDraftWatchHistory(item) {
  if (!item || getSourceType(item) !== 'tv' || String(item.providerId) !== state.tvDraftProviderId) return;

  // Remove episodes that were previously watched but have now been unchecked.
  const existingRecords = state.history.filter(entry => entry.kind === 'episode-watched' && entry.sourceItemId === item.id);
  for (const entry of existingRecords) {
    const key = tvDraftEpisodeKey(entry.seasonNumber, entry.episodeNumber);
    if (!state.tvDraftWatched.has(key)) removeTVEpisodeHistory(item, entry.seasonNumber, entry.episodeNumber);
  }

  const bulkBaseline = state.tvDraftBulkBaseline instanceof Set ? state.tvDraftBulkBaseline : null;
  const bulkToken = bulkBaseline ? `series-${makeId()}` : '';

  // Add newly checked episodes as undated imported history. When the top-level
  // series button produced the selection, tag only episodes it added so that
  // undoing that bulk completion later preserves the user's pre-existing checks.
  for (const key of state.tvDraftWatched) {
    const [seasonNumber, episodeNumber] = key.split(':').map(Number);
    if (isTVEpisodeLogged(item, seasonNumber, episodeNumber)) continue;
    const episode = findTVDraftEpisode(seasonNumber, episodeNumber);
    if (!episode || !isEpisodeAvailable(episode)) continue;
    const metadata = bulkToken && !bulkBaseline.has(key)
      ? { bulkCompletionToken: bulkToken, bulkCompletionScope: 'series' }
      : {};
    addImportedTVEpisode(item, episode, seasonNumber, metadata);
  }

  if (bulkToken) {
    item.seriesCompletionToken = bulkToken;
    state.history = state.history.filter(entry => !(entry.kind === 'series-watched' && entry.sourceItemId === item.id));
    addHistoryRecord({
      sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: '', showOnCalendar: false,
      kind: 'series-watched', title: item.title, subtitle: item.subtitle || '', notes: item.notes || '', rating: Number(item.rating || 0),
      image: item.image || '', provider: item.provider, providerId: item.providerId, bulkCompletionToken: bulkToken
    });
  }

  await recalculateTVProgress(item);
}


function showSelectedSource(source, playlist = false) {
  const target = playlist ? els.playlistPreview : els.selectedSource;
  const isGooglePlace = source.provider === 'googlePlaces';
  target.innerHTML = `
    ${source.image ? `<img src="${escapeAttr(source.image)}" alt="" />` : '<div style="width:64px;height:84px;background:rgba(21,36,58,.08);border-radius:5px"></div>'}
    <div><strong>${escapeHtml(source.title || 'Selected')}</strong><span>${escapeHtml(source.subtitle || '')}</span>${isGooglePlace ? '<small class="gmp-attribution" translate="no">Google Maps</small>' : ''}</div>`;
  target.hidden = false;
}

async function loadPlaylistPreview() {
  const value = els.playlistInput.value.trim();
  if (!value) return;
  els.playlistLoadButton.disabled = true;
  showFormMessage('Loading playlist…', false);
  try {
    const playlist = await TrackerAPI.getPlaylist(value, state.settings);
    state.loadedPlaylist = playlist;
    els.provider.value = 'youtube';
    els.providerId.value = playlist.providerId;
    els.providerImage.value = playlist.image || '';
    els.providerSubtitle.value = playlist.subtitle || '';
    els.manualTitle.value = playlist.title || '';
    showSelectedSource({ title: playlist.title, subtitle: `${playlist.items.length} videos · ${playlist.subtitle || ''}`, image: playlist.image }, true);
    showFormMessage('', false);
    cachePut(`playlist:${playlist.providerId}`, playlist);
  } catch (error) {
    showFormMessage(error.message, true);
  } finally {
    els.playlistLoadButton.disabled = false;
  }
}

async function saveItemFromForm(event) {
  event.preventDefault();
  const sourceType = els.itemSourceType.value;
  const editing = findItem(els.editingId.value);
  let title = els.manualTitle.value.trim();
  let provider = els.provider.value;
  let providerId = els.providerId.value;
  let image = els.providerImage.value;
  let subtitle = els.providerSubtitle.value;

  let type = sourceType;
  let typeLabel = SOURCE_ITEM_LABELS[sourceType] || '';
  let fixedSubcategory = '';

  if (['music', 'artist', 'song', 'concert'].includes(sourceType)) {
    type = 'music';
    typeLabel = 'Music';
    fixedSubcategory = musicSubcategoryForSourceType(sourceType);
    if (sourceType === 'music' && (state.selectedSource?.provider === 'itunes' || (editing?.provider === 'itunes' && editing?.providerId))) {
      fixedSubcategory = 'Album';
    }
  }
  if (['food','restaurant','recipe'].includes(sourceType)) {
    type = 'food';
    typeLabel = 'Food';
    fixedSubcategory = foodSubcategoryForSourceType(sourceType);
  }

  if (sourceType === 'youtube') {
    typeLabel = cleanTypeLabel(els.itemDisplayType.value) || 'Workout';
    type = displayTypeSlug(typeLabel, 'youtube');
    registerCustomType(type, typeLabel);

    if (state.loadedPlaylist) {
      provider = 'youtube';
      providerId = state.loadedPlaylist.providerId;
      image = state.loadedPlaylist.image || '';
      subtitle = state.loadedPlaylist.subtitle || '';
    } else if (editing) {
      provider = editing.provider;
      providerId = editing.providerId;
      image = editing.image;
      subtitle = editing.subtitle;
    }
  } else if (sourceType === 'reminder') {
    typeLabel = cleanTypeLabel(els.itemDisplayType.value) || 'Chores';
    type = displayTypeSlug(typeLabel, 'other');
    registerCustomType(type, typeLabel);
    provider = 'reminder';
    providerId = '';
    image = '';
    subtitle = '';
  } else if (['food','recipe'].includes(sourceType)) {
    provider = 'manual';
    providerId = editing?.providerId || '';
    image = editing?.image || '';
    subtitle = editing?.subtitle || '';
  } else if (sourceType === 'other') {
    typeLabel = cleanTypeLabel(els.itemDisplayType.value);
    if (!typeLabel) {
      showFormMessage('Enter a name for the new type.', true);
      return;
    }
    type = displayTypeSlug(typeLabel, 'other');
    registerCustomType(type, typeLabel);
    provider = 'manual';
    providerId = '';
    image = '';
    subtitle = '';
  } else {
    const source = state.selectedSource;
    if (source) {
      provider = source.provider;
      providerId = source.providerId;
      image = source.image || '';
      subtitle = source.subtitle || '';
    } else if (editing) {
      provider = editing.provider;
      providerId = editing.providerId;
      image = editing.image;
      subtitle = editing.subtitle;
    }
  }

  // Music and Concert can be entered manually. Search is optional for these
  // types; selecting a catalogue result simply enriches metadata.
  if (['music', 'concert'].includes(sourceType) && !providerId) {
    provider = 'manual';
    image = editing?.image || image || '';
    subtitle = editing?.subtitle || subtitle || '';
  }

  if (!title) {
    showFormMessage('Add a title.', true);
    return;
  }
  if (sourceType === 'youtube' && (provider !== 'youtube' || !providerId)) {
    showFormMessage('Load a YouTube playlist first.', true);
    return;
  }
  const validProvider = sourceType === 'book'
    ? provider === 'googleBooks'
    : sourceType === 'music'
      ? ['itunes', 'manual'].includes(provider)
      : ['artist', 'song'].includes(sourceType)
        ? ['itunes', 'lastfm'].includes(provider)
        : sourceType === 'concert'
          ? ['ticketmaster', 'manual'].includes(provider)
          : sourceType === 'restaurant'
            ? provider === 'googlePlaces'
          : sourceType === 'event'
            ? provider === 'ticketmaster'
            : ['tv', 'movie'].includes(sourceType)
              ? provider === 'tmdb'
              : true;
  const requiresCatalogueSelection = ['tv','book','movie','artist','song','event','restaurant'].includes(sourceType);
  if ((requiresCatalogueSelection && !providerId) || !validProvider) {
    showFormMessage(['music', 'concert','food','recipe'].includes(sourceType) ? 'Search for a result or enter the item manually.' : 'Choose a search result first.', true);
    return;
  }
  if (sourceType === 'reminder' && !els.reminderDueDate?.value) {
    showFormMessage(els.reminderFrequency?.value === 'none' ? 'Choose a date for the reminder.' : 'Choose a start date for the repeating reminder.', true);
    return;
  }
  if (sourceType === 'reminder' && els.reminderFrequency?.value === 'custom' && Number(els.reminderInterval?.value || 0) < 1) {
    showFormMessage('Custom repeats must be at least every 1 day, week, or month.', true);
    return;
  }

  let attachmentFiles = [];
  try {
    attachmentFiles = await persistDraftAttachments();
  } catch (error) {
    showFormMessage(`Could not save attachment: ${error.message}`, true);
    return;
  }

  const item = {
    id: editing?.id || makeId(),
    sourceType,
    type,
    typeLabel,
    subcategory: fixedSubcategory || cleanTypeLabel(els.itemSubcategory?.value || ''),
    title,
    provider,
    providerId,
    image,
    subtitle,
    rating: Number(els.itemRating.value || 0),
    notes: els.itemNote.value.trim(),
    recommended: Boolean(els.itemRecommended?.checked),
    genres: extractItemGenres(sourceType, state.selectedSource, editing),
    releaseDate: ['tv','movie','book','music','artist','song'].includes(sourceType)
      ? (normalizedReleaseDate(els.itemReleaseDate?.value) || normalizedReleaseDate(extractItemReleaseDate(sourceType, state.selectedSource, editing)))
      : normalizedReleaseDate(extractItemReleaseDate(sourceType, state.selectedSource, editing)),
    attachments: attachmentFiles,
    links: state.attachmentDraft.links.map(link => ({ ...link })),
    date: sourceType === 'reminder' ? '' : (['event','concert'].includes(sourceType) ? (els.itemDate.value || state.selectedSource?.eventDate || editing?.date || '') : (els.itemDate.value || '')),
    queueStatus: sourceType === 'reminder' ? 'upnext' : (sourceType === 'restaurant' ? (els.itemQueueStatus.value === 'tbr' ? 'tbr' : 'library') : (['music','artist','song','concert','food','recipe'].includes(sourceType) ? 'library' : (els.itemQueueStatus.value || 'library'))),
    active: sourceType === 'reminder' || (sourceType !== 'restaurant' && !['music','artist','song','concert','food','recipe'].includes(sourceType) && (els.itemQueueStatus.value || 'library') === 'upnext'),
    createdAt: editing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: editing?.completedAt || '',
    progress: { ...(editing?.progress || {}) },
    ...(sourceType === 'tv' ? {
      watchDisposition: editing?.watchDisposition || ((els.itemQueueStatus.value || 'library') === 'tbr' ? 'watch-later' : 'following'),
      tvMeta: { ...(editing?.tvMeta || {}) }
    } : {}),
    ...(['event', 'concert'].includes(sourceType) ? {
      eventMeta: {
        ...(editing?.eventMeta || {}),
        eventDate: state.selectedSource?.eventDate || editing?.eventMeta?.eventDate || els.itemDate.value || '',
        eventTime: state.selectedSource?.eventTime || editing?.eventMeta?.eventTime || '',
        startDateTime: state.selectedSource?.startDateTime || editing?.eventMeta?.startDateTime || '',
        timezone: state.selectedSource?.timezone || editing?.eventMeta?.timezone || '',
        venueName: state.selectedSource?.venueName || editing?.eventMeta?.venueName || '',
        city: state.selectedSource?.city || editing?.eventMeta?.city || '',
        region: state.selectedSource?.region || editing?.eventMeta?.region || '',
        address: state.selectedSource?.address || editing?.eventMeta?.address || '',
        ticketUrl: state.selectedSource?.ticketUrl || editing?.eventMeta?.ticketUrl || '',
        status: state.selectedSource?.status || editing?.eventMeta?.status || '',
        classifications: state.selectedSource?.classifications || editing?.eventMeta?.classifications || [],
        priceRange: state.selectedSource?.priceRange || editing?.eventMeta?.priceRange || null
      }
    } : {}),

  };

  if (sourceType === 'reminder') {
    const frequency = ['none','daily','weekly','biweekly','monthly','custom'].includes(els.reminderFrequency?.value)
      ? els.reminderFrequency.value
      : 'none';
    const scheduleStart = els.reminderDueDate?.value || todayString();
    const dueDate = frequency === 'none' ? scheduleStart : '';
    item.reminder = {
      frequency,
      dueDate,
      scheduleStart,
      interval: frequency === 'custom' ? Math.max(1, Math.min(365, Number(els.reminderInterval?.value || 1))) : undefined,
      intervalUnit: frequency === 'custom' && ['days','weeks','months'].includes(els.reminderIntervalUnit?.value)
        ? els.reminderIntervalUnit.value
        : undefined
    };
  }
  if (sourceType === 'tv') {
    item.progress.nextSeason = Math.max(1, Number(els.nextSeason.value || 1));
    item.progress.nextEpisode = Math.max(1, Number(els.nextEpisode.value || 1));
  }
  if (sourceType === 'book') {
    item.progress.currentPage = Math.max(0, Number(els.bookCurrentPage.value || 0));
    item.progress.totalPages = Math.max(0, Number(els.bookTotalPages.value || 0));
    const priorPeriods = getBookReadingPeriods(editing || item);
    const startDate = els.bookStartDate?.value || '';
    const endDate = els.bookEndDate?.value || '';
    if (startDate && endDate && endDate < startDate) {
      showFormMessage('The book end/pause date cannot be before the reading start date.');
      return;
    }
    if (startDate) {
      if (priorPeriods.length) priorPeriods[priorPeriods.length - 1] = { ...priorPeriods.at(-1), startDate, endDate };
      else priorPeriods.push({ startDate, endDate });
    }
    item.progress.readingPeriods = sanitizeBookReadingPeriods(priorPeriods);
    // Books use reading periods for the calendar rather than a one-day item date.
    item.date = '';
    if (item.progress.totalPages > 0 && item.progress.currentPage >= item.progress.totalPages) {
      item.completedAt = editing?.completedAt || todayString();
      setItemQueueStatus(item, 'library');
      const latest = item.progress.readingPeriods.at(-1);
      if (latest && !latest.endDate) latest.endDate = todayString();
    } else {
      item.completedAt = '';
      if (editing && getQueueStatus(editing) === 'tbr' && item.progress.currentPage > 0) {
        setItemQueueStatus(item, 'upnext');
      }
    }
  }
  if (sourceType === 'youtube') {
    item.progress.currentIndex = editing?.progress?.currentIndex || 0;
    if (state.loadedPlaylist && editing?.providerId !== state.loadedPlaylist.providerId) item.progress.currentIndex = 0;
  }

  // Food history is event-like: the Library keeps the place/recipe while each
  // dated restaurant visit or recipe attempt becomes its own tracked record.
  const foodHistoryDate = ['restaurant', 'recipe'].includes(sourceType) ? (els.itemDate?.value || '') : '';
  if (['restaurant', 'recipe'].includes(sourceType)) item.date = '';

  // A Google Place is one Library restaurant. Re-adding the same Place ID logs a
  // new visit/order instead of creating a duplicate restaurant card.
  const existingRestaurant = !editing && sourceType === 'restaurant' && providerId
    ? state.items.find(existing =>
        getSourceType(existing) === 'restaurant' &&
        existing.provider === 'googlePlaces' &&
        String(existing.providerId || '') === String(providerId)
      )
    : null;

  if (existingRestaurant) {
    const formRating = Number(els.itemRating.value || 0);
    const formNotes = els.itemNote.value.trim();
    if (formRating > 0) existingRestaurant.rating = formRating;
    if (els.itemRecommended?.checked) existingRestaurant.recommended = true;
    if (formNotes && !String(existingRestaurant.notes || '').trim()) existingRestaurant.notes = formNotes;
    if (els.itemQueueStatus?.value === 'tbr') setItemQueueStatus(existingRestaurant, 'tbr');
    else setItemQueueStatus(existingRestaurant, 'library');
    existingRestaurant.updatedAt = new Date().toISOString();
    existingRestaurant.attachments = [
      ...(existingRestaurant.attachments || []),
      ...attachmentFiles.filter(file => !(existingRestaurant.attachments || []).some(saved => saved.id === file.id))
    ];
    existingRestaurant.links = [
      ...(existingRestaurant.links || []),
      ...state.attachmentDraft.links.filter(link => !(existingRestaurant.links || []).some(saved => saved.url === link.url))
    ];

    if (foodHistoryDate) {
      const duplicateVisit = state.history.some(entry =>
        entry.sourceItemId === existingRestaurant.id &&
        entry.kind === 'restaurant-visit' &&
        entry.date === foodHistoryDate &&
        String(entry.notes || '') === formNotes
      );
      if (!duplicateVisit) {
        addHistoryRecord({
          sourceItemId: existingRestaurant.id,
          sourceType: 'restaurant',
          type: 'food',
          typeLabel: 'Food',
          subcategory: 'Restaurant',
          date: foodHistoryDate,
          showOnCalendar: true,
          kind: 'restaurant-visit',
          title: existingRestaurant.title,
          subtitle: 'Restaurant visit',
          notes: formNotes,
          rating: formRating,
          image: '',
          provider: 'googlePlaces',
          providerId: existingRestaurant.providerId
        });
        saveHistory();
      }
    }

    saveItems();
    await deleteRemovedDraftAttachments();
    els.itemModal.close();
    renderAll();
    return;
  }

  applyReleaseQueueAutomation(item);

  if (editing) {
    state.items = state.items.map(existing => existing.id === item.id ? item : existing);
  } else {
    state.items.push(item);
  }

  if (foodHistoryDate && ['restaurant', 'recipe'].includes(sourceType)) {
    const historyKind = sourceType === 'restaurant' ? 'restaurant-visit' : 'recipe-tried';
    const duplicate = state.history.some(entry =>
      entry.sourceItemId === item.id && entry.kind === historyKind && entry.date === foodHistoryDate && entry.notes === item.notes
    );
    if (!duplicate) {
      addHistoryRecord({
        sourceItemId: item.id,
        sourceType,
        type: 'food',
        typeLabel: 'Food',
        subcategory: foodSubcategoryForSourceType(sourceType),
        date: foodHistoryDate,
        showOnCalendar: true,
        kind: historyKind,
        title: item.title,
        subtitle: sourceType === 'restaurant' ? 'Restaurant visit' : 'Recipe tried',
        notes: item.notes || '',
        rating: Number(item.rating || 0),
        image: item.image || '',
        provider: item.provider,
        providerId: item.providerId
      });
      saveHistory();
    }
  }

  if (sourceType === 'book' && item.completedAt && !state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'book-finished')) {
    addHistoryRecord({
      sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: '', showOnCalendar: false,
      kind: 'book-finished', title: item.title, subtitle: item.progress.totalPages ? `Finished · ${item.progress.totalPages} pages` : 'Finished',
      notes: item.notes || '', rating: Number(item.rating || 0), image: item.image || '', provider: item.provider, providerId: item.providerId
    });
    saveHistory();
  }

  if (sourceType === 'tv') {
    try {
      await persistTVDraftWatchHistory(item);
      saveHistory();
    } catch (error) {
      console.warn('Could not fully reconcile TV watch history:', error);
    }
  }

  saveItems();
  await deleteRemovedDraftAttachments();
  els.itemModal.close();
  renderAll();
}

async function deleteEditingItem() {
  const id = els.editingId.value;
  const item = findItem(id);
  if (!item) return;
  if (!confirm(`Delete “${item.title}”?`)) return;
  await Promise.all((item.attachments || []).map(file => deleteAttachmentBlob(file.id).catch(() => {})));
  state.items = state.items.filter(existing => existing.id !== id);
  saveItems();
  els.itemModal.close();
  renderAll();
}

function toggledStarRating(currentValue, selectedValue) {
  const current = Math.max(0, Math.min(5, Number(currentValue || 0)));
  const selected = Math.max(0, Math.min(5, Number(selectedValue || 0)));
  return current === selected ? 0 : selected;
}

function chooseRating(event) {
  const button = event.target.closest('[data-rating]');
  if (!button) return;
  const selected = Number(button.dataset.rating);
  setRating(toggledStarRating(els.itemRating?.value, selected));
}

function syncItemRecommendHeart() {
  if (!els.itemRecommendHeart) return;
  const recommended = Boolean(els.itemRecommended?.checked);
  els.itemRecommendHeart.textContent = recommended ? '♥' : '♡';
  els.itemRecommendHeart.classList.toggle('is-recommended', recommended);
  els.itemRecommendHeart.setAttribute('aria-pressed', String(recommended));
  els.itemRecommendHeart.setAttribute('aria-label', recommended ? 'Remove from Recommended' : 'Add to Recommended');
}

function toggleItemFormRecommended() {
  if (!els.itemRecommended) return;
  els.itemRecommended.checked = !els.itemRecommended.checked;
  syncItemRecommendHeart();
}

function setRating(value) {
  els.itemRating.value = String(value);
  $$('#starPicker [data-rating]').forEach(button => button.classList.toggle('filled', Number(button.dataset.rating) <= value));
}

let actionFeedbackTimer = null;
function showActionFeedback(message, error = false) {
  let node = document.getElementById('omniActionFeedback');
  if (!node) {
    node = document.createElement('div');
    node.id = 'omniActionFeedback';
    node.className = 'omni-action-feedback';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    document.body.appendChild(node);
  }
  node.textContent = String(message || '');
  node.classList.toggle('is-error', Boolean(error));
  node.classList.add('is-visible');
  clearTimeout(actionFeedbackTimer);
  actionFeedbackTimer = setTimeout(() => node.classList.remove('is-visible'), 3200);
}

function showFormMessage(message, error = false) {
  els.formMessage.textContent = message;
  els.formMessage.hidden = !message;
  els.formMessage.style.color = error ? '#9b2d1a' : '#646b75';
}

// ---------------------------
// DETAILS
// ---------------------------
async function openDetails(id) {
  const item = findItem(id);
  if (!item) return;
  state.openDetailId = id;
  els.detailBody.innerHTML = '<p class="loading-detail">Loading details…</p>';
  showDialogAtTop(els.detailModal);

  try {
    const sourceType = getSourceType(item);
    if (sourceType === 'tv') await renderTVDetails(item);
    else if (sourceType === 'youtube') await renderWorkoutDetails(item);
    else if (sourceType === 'book') await renderBookDetails(item);
    else if (sourceType === 'movie') await renderMovieDetails(item);
    else if (sourceType === 'music') await renderMusicDetails(item);
    else if (sourceType === 'artist') await renderArtistDetails(item);
    else if (sourceType === 'song') await renderSongDetails(item);
    else if (sourceType === 'reminder') renderReminderDetails(item);
    else if (['event', 'concert'].includes(sourceType)) await renderEventDetails(item);
    else if (sourceType === 'restaurant') await renderRestaurantDetails(item);
    else renderManualDetails(item);
    appendLibraryReleaseDateSummary(item);
    appendLibraryDateSummary(item);
    appendLibraryPersonalMetadata(item);
    appendItemResources(item);
  } catch (error) {
    els.detailBody.innerHTML = `${basicDetailHero(item)}<div class="api-error">${escapeHtml(error.message)}</div>${detailEditButton(item)}`;
    appendLibraryReleaseDateSummary(item);
    appendLibraryDateSummary(item);
    appendLibraryPersonalMetadata(item);
    appendItemResources(item);
  }
}

async function renderTVDetails(item) {
  const [details, availability] = await Promise.all([
    getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings)),
    getItemStreamingAvailability(item).catch(() => ({ providers: [], link: '' }))
  ]);
  const detailGenres = (details.genres || []).map(genre => genre.name).filter(Boolean);
  const metadataChanged = (detailGenres.length && JSON.stringify(item.genres || []) !== JSON.stringify(detailGenres)) || (details.first_air_date && item.releaseDate !== details.first_air_date);
  if (detailGenres.length) item.genres = detailGenres;
  if (details.first_air_date) item.releaseDate = details.first_air_date;
  const changed = await reconcileSingleTVItem(item, details);
  if (changed || metadataChanged) saveItems();
  const seasonNumber = Number(item.progress?.nextSeason || 1);
  const episodeNumber = Number(item.progress?.nextEpisode || 1);
  const season = await getCached(`season:${item.providerId}:${seasonNumber}`, () => TrackerAPI.getTVSeason(item.providerId, seasonNumber, state.settings));
  const next = (season.episodes || []).find(ep => ep.episode_number === episodeNumber);

  const seasonRows = await Promise.all((details.seasons || [])
    .filter(info => info.season_number > 0)
    .map(async info => {
      const seasonData = await getCached(`season:${item.providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(item.providerId, info.season_number, state.settings));
      const aired = (seasonData.episodes || []).filter(ep => Number(ep.episode_number) > 0 && isEpisodeAvailable(ep));
      const allWatched = aired.length > 0 && aired.every(ep => isTVEpisodeLogged(item, info.season_number, ep.episode_number));
      return `<div class="season-row${info.season_number === seasonNumber ? ' is-current' : ''}">
        <div>
          <div class="list-title">Season ${info.season_number}</div>
          <div class="list-meta">${info.episode_count || 0} episodes${info.air_date ? ` · ${escapeHtml(info.air_date.slice(0,4))}` : ''}</div>
        </div>
        <div class="episode-row-actions">
          <span class="watched-label">${allWatched ? 'WATCHED' : ''}</span>
          <button class="episode-check-button${allWatched ? ' is-checked' : ''}" type="button" data-tv-mark-season="${info.season_number}" data-item-id="${item.id}" aria-label="${allWatched ? `Clear watched Season ${info.season_number}` : `Mark Season ${info.season_number} watched`}" title="${allWatched ? 'Clear season watched' : 'Mark whole season watched'}">✓</button>
          <button class="detail-arrow-button" type="button" data-tv-season="${info.season_number}" data-item-id="${item.id}" aria-label="Open season ${info.season_number}">→</button>
        </div>
      </div>`;
    }));
  const seasons = seasonRows.join('');

  const episodes = (season.episodes || []).map(ep => {
    const isLogged = isTVEpisodeLogged(item, seasonNumber, ep.episode_number);
    const image = TrackerAPI.tmdbImage(ep.still_path);
    return `<div class="episode-row">
      ${image ? `<img src="${escapeAttr(image)}" alt="" />` : '<div class="episode-image-placeholder"></div>'}
      <div><div class="list-title">E${ep.episode_number} · ${escapeHtml(ep.name || 'Episode')}</div><div class="list-meta">${escapeHtml(shorten(ep.overview || '', 120))}</div></div>
      <div class="episode-row-actions">
        <span class="watched-label">${isLogged ? 'WATCHED' : ep.episode_number === episodeNumber ? 'NEXT' : ''}</span>
        <button class="episode-check-button${isLogged ? ' is-checked' : ''}" type="button" data-check-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}" aria-label="${isLogged ? `Mark episode ${ep.episode_number} not watched` : `Mark episode ${ep.episode_number} watched`}" title="${isLogged ? 'Mark not watched' : 'Mark watched'}">✓</button>
        <button class="detail-arrow-button" type="button" data-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}" aria-label="Open episode ${ep.episode_number}">→</button>
      </div>
    </div>`;
  }).join('');

  const hasUnwatched = Boolean(item.tvMeta?.hasUnwatched);
  els.detailBody.innerHTML = `
    ${detailHero({ type:'TV', title:details.name || item.title, image:TrackerAPI.tmdbImage(details.poster_path) || item.image, subtitle:[details.first_air_date?.slice(0,4), details.genres?.map(g=>g.name).join(' · ')].filter(Boolean).join(' · '), overview:details.overview || '' })}
    <div class="tv-status-row">${tvStatusBadgeMarkup(item, details)}</div>
    <div class="detail-progress"><strong>${hasUnwatched ? 'Up next' : 'Progress'}</strong>${hasUnwatched && next ? `S${seasonNumber} E${episodeNumber} · ${escapeHtml(next.name || 'Episode')}` : hasUnwatched ? `S${seasonNumber} E${episodeNumber}` : isTerminalSeriesStatus(details.status) ? 'All available episodes watched.' : 'You are caught up. New aired episodes will return to Up Next automatically.'}</div>
    ${tvDetailControls(item)}
    ${streamingDetailMarkup(availability)}
    <section class="detail-section"><div class="detail-section-heading"><h3>Seasons</h3><span class="discover-history-note compact-note">✓ marks the entire season · → opens its episodes</span></div><div class="season-list season-list-rows">${seasons || '—'}</div></section>
    <section class="detail-section"><h3>Season ${seasonNumber} episodes</h3><div class="episode-list">${episodes || 'No episodes found.'}</div></section>
  `;
}

async function renderTVSeasonDetail(item, seasonNumber) {
  els.detailBody.innerHTML = '<p class="loading-detail">Loading season…</p>';
  try {
    const [series, season] = await Promise.all([
      getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings)),
      getCached(`season:${item.providerId}:${seasonNumber}`, () => TrackerAPI.getTVSeason(item.providerId, seasonNumber, state.settings))
    ]);
    const nextSeason = Number(item.progress?.nextSeason || 1);
    const nextEpisode = Number(item.progress?.nextEpisode || 1);
    const image = TrackerAPI.tmdbImage(season.poster_path) || TrackerAPI.tmdbImage(series.poster_path) || item.image;
    const episodes = (season.episodes || []).map(ep => {
      const isNext = seasonNumber === nextSeason && ep.episode_number === nextEpisode;
      const isLogged = isTVEpisodeLogged(item, seasonNumber, ep.episode_number);
      const still = TrackerAPI.tmdbImage(ep.still_path);
      return `<div class="episode-row">
        ${still ? `<img src="${escapeAttr(still)}" alt="" />` : '<div class="episode-image-placeholder"></div>'}
        <div>
          <div class="list-title">E${ep.episode_number} · ${escapeHtml(ep.name || 'Episode')}</div>
          <div class="list-meta">${escapeHtml(shorten(ep.overview || '', 150))}</div>
        </div>
        <div class="episode-row-actions">
          <span class="watched-label">${isLogged ? 'WATCHED' : isNext ? 'NEXT' : ''}</span>
          <button class="episode-check-button${isLogged ? ' is-checked' : ''}" type="button" data-check-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}" aria-label="${isLogged ? `Mark episode ${ep.episode_number} not watched` : `Mark episode ${ep.episode_number} watched`}" title="${isLogged ? 'Mark not watched' : 'Mark watched'}">✓</button>
          <button class="detail-arrow-button" type="button" data-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}" aria-label="Open episode ${ep.episode_number}">→</button>
        </div>
      </div>`;
    }).join('');
    const seasonAired = (season.episodes || []).filter(ep => Number(ep.episode_number) > 0 && isEpisodeAvailable(ep));
    const seasonAllWatched = seasonAired.length > 0 && seasonAired.every(ep => isTVEpisodeLogged(item, seasonNumber, ep.episode_number));

    els.detailBody.innerHTML = `
      <button class="detail-back-button" type="button" data-tv-series="true" data-item-id="${item.id}">← Series</button>
      ${detailHero({
        type: `TV · SEASON ${seasonNumber}`,
        title: season.name || `${series.name || item.title} · Season ${seasonNumber}`,
        image,
        subtitle: [season.air_date?.slice(0,4), `${(season.episodes || []).length} episodes`].filter(Boolean).join(' · '),
        overview: season.overview || series.overview || ''
      })}
      <section class="detail-section"><div class="detail-section-heading"><h3>Episodes</h3><button class="quiet-button" type="button" data-tv-mark-season="${seasonNumber}" data-item-id="${item.id}">${seasonAllWatched ? 'Clear season watched' : '✓ Mark season watched'}</button></div><p class="discover-history-note">Whole-season changes are saved without a date and do not create calendar stickers.</p><div class="episode-list">${episodes || 'No episodes found.'}</div></section>
    `;
  } catch (error) {
    els.detailBody.innerHTML = `<button class="detail-back-button" type="button" data-tv-series="true" data-item-id="${item.id}">← Series</button><div class="api-error">${escapeHtml(error.message)}</div>`;
  }
}

async function renderTVEpisodeDetail(item, seasonNumber, episodeNumber) {
  els.detailBody.innerHTML = '<p class="loading-detail">Loading episode…</p>';
  try {
    const [series, episode] = await Promise.all([
      getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings)),
      getCached(`tv:${item.providerId}:s${seasonNumber}e${episodeNumber}`, () => TrackerAPI.getTVEpisode(item.providerId, seasonNumber, episodeNumber, state.settings))
    ]);
    const image = TrackerAPI.tmdbImage(episode.still_path) || TrackerAPI.tmdbImage(series.backdrop_path) || item.image;
    const credits = [
      ...(episode.guest_stars || []).slice(0,5).map(person => person.name),
      ...(episode.crew || []).filter(person => ['Director','Writer'].includes(person.job)).slice(0,3).map(person => `${person.job}: ${person.name}`)
    ];

    els.detailBody.innerHTML = `
      <button class="detail-back-button" type="button" data-tv-season="${seasonNumber}" data-item-id="${item.id}">← Season ${seasonNumber}</button>
      ${detailHero({
        type: `TV · S${seasonNumber} E${episodeNumber}`,
        title: episode.name || `Episode ${episodeNumber}`,
        image,
        subtitle: [episode.air_date || '', episode.runtime ? `${episode.runtime} min` : '', episode.vote_average ? `★ ${Number(episode.vote_average).toFixed(1)}` : ''].filter(Boolean).join(' · '),
        overview: episode.overview || ''
      })}
      <div class="detail-actions">
        <button class="primary-button" type="button" data-check-tv-episode="${episodeNumber}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}">${isTVEpisodeLogged(item, seasonNumber, episodeNumber) ? '✓ Mark not watched' : '✓ Mark watched'}</button>
      </div>
      ${credits.length ? `<section class="detail-section"><h3>People</h3><p>${escapeHtml(credits.join(' · '))}</p></section>` : ''}
    `;
  } catch (error) {
    els.detailBody.innerHTML = `<button class="detail-back-button" type="button" data-tv-season="${seasonNumber}" data-item-id="${item.id}">← Season ${seasonNumber}</button><div class="api-error">${escapeHtml(error.message)}</div>`;
  }
}

async function renderWorkoutDetails(item) {
  const playlist = await getPlaylistCached(item.providerId);
  const index = Number(item.progress?.currentIndex || 0);
  const videos = playlist.items.map((video, i) => {
    const isLogged = isYouTubeVideoLogged(item, video.videoId);
    return `<div class="video-row">
      ${video.image ? `<img src="${escapeAttr(video.image)}" alt="" />` : '<div class="episode-image-placeholder"></div>'}
      <div><div class="list-title">${escapeHtml(video.title)}</div><div class="list-meta">${escapeHtml(video.channelTitle || '')}${Number.isFinite(video.position) ? ` · ${video.position + 1} of ${playlist.items.length}` : ''}</div></div>
      <div class="episode-row-actions">
        <span class="watched-label">${isLogged || i < index ? 'DONE' : i === index ? 'NEXT' : ''}</span>
        <button class="episode-check-button${isLogged ? ' is-checked' : ''}" type="button" data-check-youtube-video="${escapeAttr(video.videoId)}" data-item-id="${item.id}" ${isLogged ? 'disabled' : ''} aria-label="${isLogged ? 'Video logged' : `Mark ${escapeAttr(video.title)} complete`}">✓</button>
        <button class="detail-arrow-button" type="button" data-youtube-video="${escapeAttr(video.videoId)}" data-item-id="${item.id}" aria-label="Open ${escapeAttr(video.title)}">→</button>
      </div>
    </div>`;
  }).join('');

  els.detailBody.innerHTML = `
    ${detailHero({ type:`${getItemTypeLabel(item).toUpperCase()} · YOUTUBE`, title:playlist.title || item.title, image:playlist.image || item.image, subtitle:`${playlist.items.length} videos · ${playlist.subtitle || ''}`, overview:playlist.description || '' })}
    <div class="detail-progress"><strong>Progress</strong>${Math.min(index, playlist.items.length)} of ${playlist.items.length} completed</div>
    ${detailEditButton(item)}
    <section class="detail-section"><h3>Playlist</h3><div class="video-list">${videos || 'No public videos found.'}</div></section>
  `;
}

async function renderYouTubeVideoDetail(item, videoId) {
  els.detailBody.innerHTML = '<p class="loading-detail">Loading video…</p>';
  try {
    const [playlist, video] = await Promise.all([
      getPlaylistCached(item.providerId),
      getCached(`youtube:video:${videoId}`, () => TrackerAPI.getYouTubeVideo(videoId, state.settings))
    ]);
    const snippet = video.snippet || {};
    const position = playlist.items.findIndex(entry => entry.videoId === videoId);
    const image = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || playlist.items[position]?.image || item.image;
    const duration = formatISO8601Duration(video.contentDetails?.duration || '');
    const stats = video.statistics || {};
    const meta = [
      position >= 0 ? `${position + 1} of ${playlist.items.length}` : '',
      snippet.channelTitle || '',
      duration,
      snippet.publishedAt ? new Date(snippet.publishedAt).toLocaleDateString() : ''
    ].filter(Boolean).join(' · ');

    els.detailBody.innerHTML = `
      <button class="detail-back-button" type="button" data-youtube-playlist="true" data-item-id="${item.id}">← Playlist</button>
      ${detailHero({ type:`${getItemTypeLabel(item).toUpperCase()} · YOUTUBE VIDEO`, title:snippet.title || 'Video', image, subtitle:meta, overview:snippet.description || '' })}
      <div class="detail-actions library-detail-actions">
        <button class="primary-button" type="button" data-check-youtube-video="${escapeAttr(videoId)}" data-item-id="${item.id}" ${isYouTubeVideoLogged(item, videoId) ? 'disabled' : ''}>${isYouTubeVideoLogged(item, videoId) ? '✓ Logged' : '✓ Mark complete'}</button>
        <a class="secondary-button detail-link-button" href="https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}" target="_blank" rel="noopener">Open on YouTube ↗</a>
        ${libraryDetailActionContents(item)}
      </div>
      ${(stats.viewCount || stats.likeCount) ? `<section class="detail-section"><h3>Video info</h3><p>${escapeHtml([stats.viewCount ? `${Number(stats.viewCount).toLocaleString()} views` : '', stats.likeCount ? `${Number(stats.likeCount).toLocaleString()} likes` : ''].filter(Boolean).join(' · '))}</p></section>` : ''}
    `;
  } catch (error) {
    els.detailBody.innerHTML = `<button class="detail-back-button" type="button" data-youtube-playlist="true" data-item-id="${item.id}">← Playlist</button><div class="api-error">${escapeHtml(error.message)}</div>`;
  }
}

async function renderBookDetails(item) {
  const data = await getCached(`book:${item.providerId}`, () => TrackerAPI.getBookDetails(item.providerId, state.settings));
  const info = data.volumeInfo || {};
  if (info.categories?.length) item.genres = [...new Set(info.categories)];
  if (info.publishedDate) item.releaseDate = info.publishedDate;
  saveItems();
  const image = info.imageLinks?.large?.replace('http://','https://') || info.imageLinks?.thumbnail?.replace('http://','https://') || item.image;
  const current = Number(item.progress?.currentPage || 0);
  const total = Number(item.progress?.totalPages || info.pageCount || 0);

  const periods = getBookReadingPeriods(item);
  const periodMarkup = periods.length
    ? periods.map((period, index) => `<div class="book-period-summary"><span>Period ${index + 1}</span><strong>${escapeHtml(formatShortCalendarDate(period.startDate))}${period.endDate ? ` → ${escapeHtml(formatShortCalendarDate(period.endDate))}` : ' → now'}</strong></div>`).join('')
    : '<p class="detail-meta">No reading dates yet.</p>';
  els.detailBody.innerHTML = `
    ${detailHero({ type:'BOOK', title:info.title || item.title, image, subtitle:(info.authors || []).join(', '), overview:stripHtml(info.description || '') })}
    <div class="tv-status-row book-status-row">${bookStatusBadgeMarkup(item)}</div>
    <div class="detail-progress"><strong>Reading progress</strong>${total ? `Page ${current} of ${total} · ${Math.min(100, Math.round(current/total*100))}%` : `Page ${current}`}<small>${escapeHtml(bookReadingStatusText(item))}</small></div>
    ${libraryDetailActions(item)}
    <section class="detail-section"><h3>Reading dates</h3><div class="book-period-summary-list">${periodMarkup}</div></section>
    <section class="detail-section"><h3>Book info</h3><p>${escapeHtml([info.publisher, info.publishedDate, info.pageCount ? `${info.pageCount} pages` : ''].filter(Boolean).join(' · '))}</p></section>
  `;
}

async function renderMovieDetails(item) {
  const [details, availability] = await Promise.all([
    getCached(`movie:${item.providerId}`, () => TrackerAPI.getMovieDetails(item.providerId, state.settings)),
    getItemStreamingAvailability(item).catch(() => ({ providers: [], link: '' }))
  ]);
  const detailGenres = (details.genres || []).map(genre => genre.name).filter(Boolean);
  if (detailGenres.length) item.genres = detailGenres;
  if (details.release_date) item.releaseDate = details.release_date;
  saveItems();
  els.detailBody.innerHTML = `
    ${detailHero({ type:'MOVIE', title:details.title || item.title, image:TrackerAPI.tmdbImage(details.poster_path) || item.image, subtitle:[details.release_date?.slice(0,4), details.runtime ? `${details.runtime} min` : '', details.genres?.map(g=>g.name).join(' · ')].filter(Boolean).join(' · '), overview:details.overview || '' })}
    ${item.mediaDisposition ? `<div class="tv-status-row"><span class="tv-status-badge tv-status-${item.mediaDisposition === 'paused' ? 'later' : 'muted'}">${item.mediaDisposition === 'paused' ? 'Paused' : 'Stopped'}</span></div>` : ''}
    ${detailEditButton(item)}
    ${streamingDetailMarkup(availability)}
  `;
}


async function renderEventDetails(item) {
  let event = null;
  if (item.provider === 'ticketmaster' && item.providerId) {
    event = await getCached(`ticketmaster:event:${item.providerId}`, () => TrackerAPI.getTicketmasterEvent(item.providerId, state.settings));
  }
  event = event || {
    title: item.title,
    image: item.image,
    eventDate: item.date || item.eventMeta?.eventDate || '',
    eventTime: item.eventMeta?.eventTime || '',
    venueName: item.eventMeta?.venueName || '',
    city: item.eventMeta?.city || '',
    region: item.eventMeta?.region || '',
    address: item.eventMeta?.address || '',
    ticketUrl: item.eventMeta?.ticketUrl || '',
    description: item.notes || '',
    classifications: item.eventMeta?.classifications || [],
    priceRange: item.eventMeta?.priceRange || null,
    status: item.eventMeta?.status || ''
  };

  item.date = event.eventDate || item.date || '';
  item.eventMeta = {
    ...(item.eventMeta || {}),
    eventDate: event.eventDate || item.date || '',
    eventTime: event.eventTime || '',
    startDateTime: event.startDateTime || '',
    timezone: event.timezone || '',
    venueName: event.venueName || '',
    city: event.city || '',
    region: event.region || '',
    address: event.address || '',
    ticketUrl: event.ticketUrl || item.eventMeta?.ticketUrl || '',
    status: event.status || '',
    classifications: event.classifications || [],
    priceRange: event.priceRange || null
  };
  if (event.image) item.image = event.image;
  if (event.subtitle) item.subtitle = event.subtitle;
  saveItems();

  const dateLine = [event.eventDate ? formatLongDate(event.eventDate) : '', formatEventClock(event.eventTime), event.venueName, [event.city, event.region].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  const price = event.priceRange;
  const priceText = price && (price.min || price.max)
    ? `${price.currency || ''} ${Number(price.min || price.max).toLocaleString()}${price.max && Number(price.max) !== Number(price.min) ? `–${Number(price.max).toLocaleString()}` : ''}`.trim()
    : '';
  const classifications = (event.classifications || []).filter(Boolean).join(' · ');
  const info = [classifications, priceText, event.status && event.status !== 'onsale' ? event.status.replace(/_/g, ' ') : ''].filter(Boolean).join(' · ');

  els.detailBody.innerHTML = `
    ${detailHero({ type:getSourceType(item) === 'concert' ? 'CONCERT' : 'EVENT', title:event.title || item.title, image:event.image || item.image, subtitle:dateLine, overview:event.description || item.notes || '' })}
    ${detailEditButton(item)}
    <section class="detail-section event-detail-section"><h3>Event details</h3>
      ${info ? `<p>${escapeHtml(info)}</p>` : ''}
      ${event.address ? `<p class="detail-meta">${escapeHtml(event.address)}</p>` : ''}
      ${event.ticketUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(event.ticketUrl)}" target="_blank" rel="noopener">Tickets / event page ↗</a>` : ''}
    </section>`;
}

async function renderMusicDetails(item) {
  const data = await getCached(`music:${item.providerId}`, () => TrackerAPI.getMusicDetails(item.providerId, state.settings));
  const collection = (data.results || []).find(r => r.wrapperType === 'collection') || (data.results || [])[0] || {};
  const tracks = (data.results || []).filter(r => r.wrapperType === 'track').map((track, index) => `<div class="track-row"><div>${index+1}</div><div><div class="list-title">${escapeHtml(track.trackName || 'Track')}</div><div class="list-meta">${escapeHtml(track.artistName || '')}</div></div><div>${track.trackTimeMillis ? formatMillis(track.trackTimeMillis) : ''}</div></div>`).join('');
  const image = (collection.artworkUrl100 || item.image || '').replace('100x100bb','600x600bb');
  els.detailBody.innerHTML = `
    ${detailHero({ type:'ALBUM', title:collection.collectionName || item.title, image, subtitle:collection.artistName || item.subtitle || '', overview:collection.primaryGenreName || '' })}
    ${detailEditButton(item)}
    <section class="detail-section"><h3>Tracks</h3><div class="track-list">${tracks || 'No tracks returned.'}</div></section>
  `;
}

async function renderArtistDetails(item) {
  const data = await getCached(`artist:${item.providerId}`, () => TrackerAPI.getArtistDetails(item.providerId, state.settings));
  const artist = (data.results || []).find(result => result.wrapperType === 'artist') || {};
  const albums = (data.results || []).filter(result => result.wrapperType === 'collection');
  const image = (albums.find(album => album.artworkUrl100)?.artworkUrl100 || item.image || '').replace('100x100bb', '600x600bb');
  if (!item.image && image) { item.image = image; saveItems(); }
  const albumRows = albums.slice(0, 8).map(album => `<div class="track-row"><div>•</div><div><div class="list-title">${escapeHtml(album.collectionName || 'Album')}</div><div class="list-meta">${escapeHtml(String(album.releaseDate || '').slice(0, 4))}</div></div></div>`).join('');
  els.detailBody.innerHTML = `
    ${detailHero({ type:'ARTIST', title:artist.artistName || item.title, image, subtitle:artist.primaryGenreName || item.subtitle || '', overview:item.notes || '' })}
    ${detailEditButton(item)}
    ${albumRows ? `<section class="detail-section"><h3>Recent albums</h3><div class="track-list">${albumRows}</div></section>` : ''}`;
}

async function renderSongDetails(item) {
  const data = await getCached(`song:${item.providerId}`, () => TrackerAPI.getSongDetails(item.providerId, state.settings));
  const track = (data.results || []).find(result => result.wrapperType === 'track') || (data.results || [])[0] || {};
  const image = (track.artworkUrl100 || item.image || '').replace('100x100bb', '600x600bb');
  els.detailBody.innerHTML = `
    ${detailHero({ type:'SONG', title:track.trackName || item.title, image, subtitle:[track.artistName || item.subtitle || '', track.collectionName || '', track.primaryGenreName || ''].filter(Boolean).join(' · '), overview:item.notes || '' })}
    ${detailEditButton(item)}
    ${track.trackViewUrl ? `<section class="detail-section"><a class="secondary-button detail-link-button" href="${escapeAttr(track.trackViewUrl)}" target="_blank" rel="noopener">Open in Apple Music / iTunes ↗</a></section>` : ''}`;
}

function renderReminderDetails(item) {
  const dueDate = getNextReminderDueDate(item);
  const dueNow = !dueDate || dueDate <= todayString();
  els.detailBody.innerHTML = `
    ${detailHero({ type:getItemTypeLabel(item), title:item.title, image:'', subtitle:reminderScheduleLabel(item), overview:item.notes || '' })}
    <div class="detail-progress"><strong>Next reminder</strong>${escapeHtml(reminderDueLabel(dueDate))}</div>
    <div class="detail-actions library-detail-actions">
      <button class="primary-button" type="button" data-reminder-complete="${escapeAttr(item.id)}" ${dueNow ? '' : 'disabled'}>✓ ${dueNow ? 'Mark complete' : 'Not due yet'}</button>
      ${libraryDetailActionContents(item)}
    </div>`;
}

async function renderRestaurantDetails(item) {
  let live = null;
  if (item.provider === 'googlePlaces' && item.providerId && state.settings.googlePlacesKey) {
    try { live = await TrackerAPI.getRestaurantDetails(item.providerId, state.settings); }
    catch (error) { console.warn('Google Places details unavailable:', error?.message || error); }
  }
  const visits = state.history
    .filter(entry => entry.sourceItemId === item.id && entry.kind === 'restaurant-visit')
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const googleRating = Number(live?.rating || 0);
  const ratingText = googleRating ? `Google ${googleRating.toFixed(1)}★${live?.userRatingCount ? ` · ${Number(live.userRatingCount).toLocaleString()} reviews` : ''}` : '';

  let suggestions = [];
  if (state.settings.googlePlacesKey) {
    const seed = live?.primaryTypeDisplayName || live?.primaryType || (item.title ? `restaurants like ${item.title}` : 'restaurants');
    try {
      const nearby = await TrackerAPI.searchRestaurants(seed, state.settings, {
        city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
        region: state.discoverPrefs.eventCountry || state.settings.homeCountry || 'CA',
        maxResultCount: 10
      });
      const savedIds = new Set(state.items.filter(saved => getSourceType(saved) === 'restaurant').map(saved => String(saved.providerId || '')));
      suggestions = (nearby || []).filter(result => String(result.providerId || '') !== String(item.providerId || '') && !savedIds.has(String(result.providerId || ''))).slice(0, 6);
    } catch (error) {
      console.warn('Restaurant recommendations unavailable:', error?.message || error);
    }
  }

  const visitsMarkup = visits.length
    ? visits.map(entry => `<article class="restaurant-history-row"><div><strong>${escapeHtml(formatLongDate(entry.date))}</strong>${entry.notes ? `<p>${escapeHtml(entry.notes)}</p>` : ''}</div>${Number(entry.rating || 0) ? `<span>${formatPersonalRating(entry.rating)}★</span>` : ''}</article>`).join('')
    : '<p class="detail-meta">No dated visits or orders logged yet. Edit this restaurant and add a date + notes to record one.</p>';
  const suggestionsMarkup = suggestions.length
    ? `<div class="restaurant-suggestion-grid">${suggestions.map(result => `<button class="restaurant-suggestion-card" type="button" data-restaurant-suggestion="${escapeAttr(JSON.stringify(result))}"><strong>${escapeHtml(result.title)}</strong><span>${escapeHtml([result.rating ? `${Number(result.rating).toFixed(1)}★` : '', result.primaryTypeDisplayName || '', result.formattedAddress || result.subtitle || ''].filter(Boolean).join(' · '))}</span></button>`).join('')}</div><div class="gmp-attribution" translate="no">Google Maps</div>`
    : '<p class="detail-meta">No additional nearby recommendations returned yet.</p>';

  els.detailBody.innerHTML = `
    ${detailHero({ type:'RESTAURANT', title:item.title, image:item.image || '', subtitle:[ratingText, live?.formattedAddress || ''].filter(Boolean).join(' · '), overview:item.notes || '' })}
    ${live ? '<div class="gmp-attribution detail-gmp-attribution" translate="no">Google Maps</div>' : ''}
    ${detailEditButton(item)}
    <section class="detail-section restaurant-history-section"><h3>Order / visit history</h3>${visitsMarkup}</section>
    <section class="detail-section"><h3>Try somewhere similar</h3>${suggestionsMarkup}</section>
    ${(live?.googleMapsUrl || live?.websiteUrl) ? `<section class="detail-section restaurant-links">${live.googleMapsUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(live.googleMapsUrl)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>` : ''}${live.websiteUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(live.websiteUrl)}" target="_blank" rel="noopener">Website ↗</a>` : ''}</section>` : ''}`;
}

function renderManualDetails(item) {
  els.detailBody.innerHTML = `${basicDetailHero(item)}${detailEditButton(item)}`;
}

function detailHero({ type, title, image, subtitle, overview }) {
  return `<div class="detail-hero">
    ${image ? `<img class="detail-poster" src="${escapeAttr(image)}" alt="" />` : '<div class="detail-poster"></div>'}
    <div><p class="detail-type">${escapeHtml(type)}</p><h2>${escapeHtml(title)}</h2>${subtitle ? `<p class="detail-meta">${escapeHtml(subtitle)}</p>` : ''}${overview ? `<p class="detail-overview">${escapeHtml(shorten(overview, 900))}</p>` : ''}</div>
  </div>`;
}

function basicDetailHero(item) {
  return detailHero({ type: getItemTypeLabel(item), title:item.title, image:item.image, subtitle:item.subtitle || '', overview:item.notes || '' });
}

function itemHasCalendarAssociations(item) {
  if (!item) return false;
  // Keep the calendar toggle available for anything with logged activity, even if
  // its calendar entries are currently hidden or an individual log was previously
  // marked not to show. This makes Remove/Show on calendar reliably reversible.
  if (item.date && getSourceType(item) !== 'book') return true;
  if (getSourceType(item) === 'book' && getBookReadingPeriods(item).length) return true;
  return state.history.some(entry => entry.sourceItemId === item.id);
}

function libraryCalendarToggleButton(item) {
  if (!itemHasCalendarAssociations(item)) return '';
  const sourceType = getSourceType(item);
  // A scheduled live event must use the Up Next Calendar check for its first
  // tracked-calendar inclusion; do not provide a bypass in its detail panel.
  if (['event', 'concert'].includes(sourceType) && item.queueCalendarScheduled === true && item.calendarTracked !== true) return '';
  const hidden = Boolean(item.calendarHidden);
  return `<button class="quiet-button library-calendar-toggle${hidden ? ' is-hidden' : ''}" type="button" data-toggle-library-calendar="${escapeAttr(item.id)}">${hidden ? 'Show on calendar' : 'Remove from calendar'}</button>`;
}

function libraryDetailActionContents(item, { leading = '', trailing = '' } = {}) {
  return `${leading}${queueMoveControls(item)}${trailing}${libraryCalendarToggleButton(item)}<button class="secondary-button" type="button" data-edit-id="${escapeAttr(item.id)}">Edit</button>`;
}

function libraryDetailActions(item, { leading = '', trailing = '', className = '' } = {}) {
  const classes = ['detail-actions', 'library-detail-actions', className].filter(Boolean).join(' ');
  return `<div class="${classes}">${libraryDetailActionContents(item, { leading, trailing })}</div>`;
}

function detailEditButton(item) {
  return libraryDetailActions(item);
}

function libraryReleaseDateSummaryMarkup(item) {
  const releaseDate = itemReleaseDate(item);
  // Release metadata is useful in Library only while the item is genuinely upcoming.
  // Once released, omit it entirely so historical catalogue dates do not clutter details.
  if (!releaseDate || !isItemNotReleased(item)) return '';
  return `<div class="library-detail-date-strip library-release-date-strip" data-library-release-date="${escapeAttr(item.id)}"><span>Release</span><strong>${escapeHtml(formatLongDate(releaseDate))}</strong></div>`;
}

function appendLibraryReleaseDateSummary(item) {
  if (!els.detailBody || !item || els.detailBody.querySelector(`[data-library-release-date="${CSS.escape(item.id)}"]`)) return;
  const markup = libraryReleaseDateSummaryMarkup(item);
  if (!markup) return;
  const hero = els.detailBody.querySelector('.detail-hero');
  if (hero) hero.insertAdjacentHTML('afterend', markup);
  else els.detailBody.insertAdjacentHTML('afterbegin', markup);
}

function libraryAssociatedDateInfo(item) {
  if (!item) return null;
  const sourceType = getSourceType(item);

  if (sourceType === 'book') {
    const periods = getBookReadingPeriods(item);
    if (periods.length) {
      const latest = periods[periods.length - 1];
      const start = latest.startDate ? formatLongDate(latest.startDate) : '';
      const end = latest.endDate ? formatLongDate(latest.endDate) : '';
      return { label: 'Reading', values: [start && end ? `${start} – ${end}` : start || end].filter(Boolean), extra: Math.max(0, periods.length - 1) };
    }
  }

  const historyDates = state.history
    .filter(entry => entry.sourceItemId === item.id && entry.date)
    .map(entry => entry.date);
  const dates = [...new Set([item.date, ...historyDates].filter(Boolean))].sort((a, b) => String(b).localeCompare(String(a)));
  if (!dates.length) return null;

  let label = 'Tracked';
  if (sourceType === 'restaurant') label = dates.length > 1 ? 'Visits' : 'Visit';
  else if (['event', 'concert'].includes(sourceType)) label = 'Date';
  else if (item.date && dates.length === 1) label = 'Date';

  return {
    label,
    values: dates.slice(0, 3).map(formatLongDate),
    extra: Math.max(0, dates.length - 3)
  };
}

function libraryDateSummaryMarkup(item) {
  const info = libraryAssociatedDateInfo(item);
  if (!info?.values?.length) return '';
  return `<div class="library-detail-date-strip" data-library-date-summary="${escapeAttr(item.id)}"><span>${escapeHtml(info.label)}</span><strong>${info.values.map(escapeHtml).join(' · ')}</strong>${info.extra ? `<em>+${info.extra}</em>` : ''}</div>`;
}

function appendLibraryDateSummary(item) {
  if (!els.detailBody || !item || els.detailBody.querySelector(`[data-library-date-summary="${CSS.escape(item.id)}"]`)) return;
  const markup = libraryDateSummaryMarkup(item);
  if (!markup) return;
  // Keep the date log visually attached to the item title. This is deliberately
  // inside the hero text column, directly below the H2, rather than below the
  // entire hero/poster block.
  const title = els.detailBody.querySelector('.detail-hero h2');
  if (title) title.insertAdjacentHTML('afterend', markup);
  else {
    const hero = els.detailBody.querySelector('.detail-hero');
    if (hero) hero.insertAdjacentHTML('afterend', markup);
    else els.detailBody.insertAdjacentHTML('afterbegin', markup);
  }
}

function formatPersonalRating(value) {
  const rating = Number(value || 0);
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1).replace(/\.0$/, '');
}

function libraryPersonalMetadataMarkup(item) {
  const rating = Math.max(0, Math.min(5, Number(item.rating || 0)));
  return `<section class="detail-section library-personal-meta" data-library-personal-meta="${escapeAttr(item.id)}" data-pending-rating="${rating}">
    <div class="detail-section-heading">
      <div>
        <h3>Your rating & notes</h3>
        <p class="personal-meta-help">Saved to this item in your Library.</p>
      </div>
    </div>
    <fieldset class="rating-fieldset library-rating-fieldset">
      <legend>Rating <span>optional</span></legend>
      <div class="star-picker library-detail-rating-picker rating-with-heart" aria-label="Your rating out of five stars">
        ${[1,2,3,4,5].map(value => `<button type="button" data-library-rating="${value}" data-item-id="${escapeAttr(item.id)}" class="${value <= rating ? 'filled' : ''}" aria-label="${value} star${value === 1 ? '' : 's'}">★</button>`).join('')}
        <button class="clear-rating" type="button" data-clear-library-rating data-item-id="${escapeAttr(item.id)}">clear</button>
        <button class="rating-heart-button${item.recommended ? ' is-recommended' : ''}" type="button" data-toggle-recommended="${escapeAttr(item.id)}" aria-label="${item.recommended ? 'Remove from Recommended' : 'Add to Recommended'}" aria-pressed="${Boolean(item.recommended)}" title="Recommended">${item.recommended ? '♥' : '♡'}</button>
      </div>
    </fieldset>
    <label class="field">
      <span>Notes <em>optional</em></span>
      <textarea class="library-personal-notes" rows="3" placeholder="Anything you want to remember">${escapeHtml(item.notes || '')}</textarea>
    </label>
    <div class="detail-actions compact-actions">
      <button class="primary-button" type="button" data-save-library-meta="${escapeAttr(item.id)}">Save notes</button>
      <span class="library-meta-status" aria-live="polite"></span>
    </div>
  </section>`;
}

function appendLibraryPersonalMetadata(item) {
  if (!els.detailBody || !item || els.detailBody.querySelector(`[data-library-personal-meta="${CSS.escape(item.id)}"]`)) return;
  const markup = libraryPersonalMetadataMarkup(item);
  const anchor = els.detailBody.querySelector('.detail-actions') || els.detailBody.querySelector('.detail-progress') || els.detailBody.querySelector('.detail-hero');
  if (anchor) anchor.insertAdjacentHTML('afterend', markup);
  else els.detailBody.insertAdjacentHTML('beforeend', markup);
}

function setLibraryPendingRating(itemId, value) {
  const section = els.detailBody?.querySelector(`[data-library-personal-meta="${CSS.escape(itemId)}"]`);
  if (!section) return;
  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  section.dataset.pendingRating = String(rating);
  section.querySelectorAll('[data-library-rating]').forEach(button => {
    button.classList.toggle('filled', Number(button.dataset.libraryRating) <= rating);
  });
}

function saveLibraryRating(itemId, value) {
  const item = findItem(itemId);
  const section = els.detailBody?.querySelector(`[data-library-personal-meta="${CSS.escape(itemId)}"]`);
  if (!item || !section) return;

  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  setLibraryPendingRating(itemId, rating);
  item.rating = rating;
  item.updatedAt = new Date().toISOString();

  for (const entry of state.history) {
    if (entry.sourceItemId !== item.id) continue;
    if (['series-watched', 'movie-watched', 'book-finished', 'item-completed'].includes(entry.kind)) {
      entry.rating = item.rating;
    }
  }

  saveItems();
  saveHistory();
  renderLibrary();

  const status = section.querySelector('.library-meta-status');
  if (status) {
    status.textContent = rating ? 'Rating saved' : 'Rating cleared';
    setTimeout(() => { if (status.isConnected) status.textContent = ''; }, 1200);
  }
}

function saveLibraryPersonalMetadata(itemId) {
  const item = findItem(itemId);
  const section = els.detailBody?.querySelector(`[data-library-personal-meta="${CSS.escape(itemId)}"]`);
  if (!item || !section) return;

  item.rating = Math.max(0, Math.min(5, Number(section.dataset.pendingRating || 0)));
  item.notes = section.querySelector('.library-personal-notes')?.value.trim() || '';
  item.updatedAt = new Date().toISOString();

  // Keep completion-level history ratings aligned with the Library item, but
  // never copy a show note into individual episode history.
  for (const entry of state.history) {
    if (entry.sourceItemId !== item.id) continue;
    if (['series-watched', 'movie-watched', 'book-finished', 'item-completed'].includes(entry.kind)) {
      entry.rating = item.rating;
    }
  }

  saveItems();
  saveHistory();
  renderLibrary();
  const status = section.querySelector('.library-meta-status');
  if (status) {
    status.textContent = 'Saved';
    setTimeout(() => { if (status.isConnected) status.textContent = ''; }, 1500);
  }
}

// ---------------------------
// ATTACHMENTS / LINKS
// ---------------------------
function emptyAttachmentDraft() {
  return { existingFiles: [], newFiles: [], removedFileIds: new Set(), links: [] };
}

function addDraftFiles(event) {
  const files = [...(event.target.files || [])];
  for (const file of files) {
    state.attachmentDraft.newFiles.push({
      id: makeId(),
      file,
      name: file.name || 'File',
      mime: file.type || 'application/octet-stream',
      size: file.size || 0
    });
  }
  event.target.value = '';
  renderAttachmentEditor();
}

function addDraftLink() {
  const raw = els.itemLinkUrl?.value.trim() || '';
  if (!raw) return;
  const url = normalizeExternalUrl(raw);
  if (!url) {
    showFormMessage('Use a valid http:// or https:// link.', true);
    return;
  }
  const label = els.itemLinkLabel?.value.trim() || domainLabel(url);
  state.attachmentDraft.links.push({ id: makeId(), label, url });
  els.itemLinkLabel.value = '';
  els.itemLinkUrl.value = '';
  showFormMessage('', false);
  renderAttachmentEditor();
}

function handleAttachmentEditorClick(event) {
  const remove = event.target.closest('[data-remove-file]');
  if (!remove) return;
  const id = remove.dataset.removeFile;
  const existing = state.attachmentDraft.existingFiles.find(file => file.id === id);
  if (existing) {
    state.attachmentDraft.existingFiles = state.attachmentDraft.existingFiles.filter(file => file.id !== id);
    state.attachmentDraft.removedFileIds.add(id);
  } else {
    state.attachmentDraft.newFiles = state.attachmentDraft.newFiles.filter(file => file.id !== id);
  }
  renderAttachmentEditor();
}

function handleLinkEditorClick(event) {
  const remove = event.target.closest('[data-remove-link]');
  if (!remove) return;
  state.attachmentDraft.links = state.attachmentDraft.links.filter(link => link.id !== remove.dataset.removeLink);
  renderAttachmentEditor();
}

function renderAttachmentEditor() {
  if (!els.attachmentEditorList || !els.linkEditorList) return;
  const files = [
    ...state.attachmentDraft.existingFiles.map(file => ({ ...file, pending: false })),
    ...state.attachmentDraft.newFiles.map(file => ({ ...file, pending: true }))
  ];
  els.attachmentEditorList.innerHTML = files.map(file => `
    <div class="attachment-editor-row">
      <span class="attachment-kind">${attachmentKindLabel(file.mime)}</span>
      <span class="attachment-name">${escapeHtml(file.name)}</span>
      <span class="attachment-size">${formatBytes(file.size)}</span>
      <button class="attachment-remove" type="button" data-remove-file="${escapeAttr(file.id)}" aria-label="Remove ${escapeAttr(file.name)}">×</button>
    </div>`).join('');

  els.linkEditorList.innerHTML = state.attachmentDraft.links.map(link => `
    <div class="attachment-editor-row">
      <span class="attachment-kind">LINK</span>
      <span class="attachment-name">${escapeHtml(link.label)}</span>
      <span class="attachment-size">${escapeHtml(domainLabel(link.url))}</span>
      <button class="attachment-remove" type="button" data-remove-link="${escapeAttr(link.id)}" aria-label="Remove ${escapeAttr(link.label)}">×</button>
    </div>`).join('');
}

async function persistDraftAttachments() {
  for (const entry of state.attachmentDraft.newFiles) {
    await putAttachmentBlob(entry.id, entry.file);
  }
  return [
    ...state.attachmentDraft.existingFiles.map(file => ({ id: file.id, name: file.name, mime: file.mime, size: file.size })),
    ...state.attachmentDraft.newFiles.map(file => ({ id: file.id, name: file.name, mime: file.mime, size: file.size }))
  ];
}

async function deleteRemovedDraftAttachments() {
  const ids = [...state.attachmentDraft.removedFileIds];
  await Promise.all(ids.map(id => deleteAttachmentBlob(id).catch(() => {})));
  state.attachmentDraft.removedFileIds.clear();
}

function appendItemResources(item) {
  const attachments = item.attachments || [];
  const links = item.links || [];
  if (!attachments.length && !links.length) return;

  const section = document.createElement('section');
  section.className = 'detail-section resources-section';
  section.innerHTML = `
    <h3>Files & links</h3>
    ${attachments.length ? `<div class="resource-grid">${attachments.map(file => `
      <button class="resource-card" type="button" data-attachment-id="${escapeAttr(file.id)}">
        <span class="resource-icon">${attachmentKindIcon(file.mime)}</span>
        <span><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(attachmentKindLabel(file.mime))} · ${formatBytes(file.size)}</small></span>
        <span class="resource-arrow">↗</span>
      </button>`).join('')}</div>` : ''}
    ${links.length ? `<div class="external-links">${links.map(link => `
      <a class="external-link-button" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">
        <span>${escapeHtml(link.label)}</span><span>↗</span>
      </a>`).join('')}</div>` : ''}`;
  els.detailBody.appendChild(section);
}

async function openAttachmentViewer(id) {
  const meta = findAttachmentMeta(id);
  if (!meta || !els.attachmentModal) return;
  cleanupAttachmentViewer();
  els.attachmentTitle.textContent = meta.name || 'File';
  els.attachmentBody.innerHTML = '<p class="loading-detail">Opening…</p>';
  showDialogAtTop(els.attachmentModal);

  try {
    const record = await getAttachmentBlob(id);
    if (!record?.blob) throw new Error('This attachment is not stored in this browser.');
    const blob = record.blob;
    const mime = meta.mime || blob.type || 'application/octet-stream';

    if (mime.startsWith('text/') || ['application/json', 'application/xml'].includes(mime)) {
      const text = await blob.text();
      els.attachmentBody.innerHTML = `<pre class="attachment-text-preview">${escapeHtml(text)}</pre>`;
      return;
    }

    state.attachmentObjectUrl = URL.createObjectURL(blob);
    const url = state.attachmentObjectUrl;
    if (mime.startsWith('image/')) {
      els.attachmentBody.innerHTML = `<img class="attachment-image-preview" src="${escapeAttr(url)}" alt="${escapeAttr(meta.name || '')}" />`;
    } else if (mime === 'application/pdf') {
      els.attachmentBody.innerHTML = `<iframe class="attachment-frame" src="${escapeAttr(url)}" title="${escapeAttr(meta.name || 'PDF')}"></iframe>`;
    } else if (mime.startsWith('video/')) {
      els.attachmentBody.innerHTML = `<video class="attachment-media-preview" src="${escapeAttr(url)}" controls playsinline></video>`;
    } else if (mime.startsWith('audio/')) {
      els.attachmentBody.innerHTML = `<audio class="attachment-audio-preview" src="${escapeAttr(url)}" controls></audio>`;
    } else {
      els.attachmentBody.innerHTML = `<div class="attachment-unsupported"><strong>${escapeHtml(meta.name)}</strong><p>This file is saved, but this browser cannot preview ${escapeHtml(meta.mime || 'this file type')} inside the site.</p></div>`;
    }
  } catch (error) {
    els.attachmentBody.innerHTML = `<div class="api-error">${escapeHtml(error.message)}</div>`;
  }
}

function cleanupAttachmentViewer() {
  if (state.attachmentObjectUrl) {
    URL.revokeObjectURL(state.attachmentObjectUrl);
    state.attachmentObjectUrl = null;
  }
  if (els.attachmentBody) els.attachmentBody.innerHTML = '';
}

function findAttachmentMeta(id) {
  for (const item of state.items) {
    const found = (item.attachments || []).find(file => file.id === id);
    if (found) return found;
  }
  return null;
}

function resourceSummary(item) {
  const files = (item.attachments || []).length;
  const links = (item.links || []).length;
  const parts = [];
  if (files) parts.push(`${files} ${files === 1 ? 'file' : 'files'}`);
  if (links) parts.push(`${links} ${links === 1 ? 'link' : 'links'}`);
  return parts.join(', ');
}

function attachmentKindLabel(mime = '') {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  if (mime.startsWith('text/') || mime === 'application/json') return 'TEXT';
  return 'FILE';
}

function attachmentKindIcon(mime = '') {
  if (mime.startsWith('image/')) return '▧';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('video/')) return '▶';
  if (mime.startsWith('audio/')) return '♪';
  if (mime.startsWith('text/')) return 'T';
  return 'F';
}

function normalizeExternalUrl(value) {
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch {
    return '';
  }
}

function domainLabel(value) {
  try { return new URL(value).hostname.replace(/^www\./, ''); }
  catch { return 'Website'; }
}

function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function openAttachmentDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('This browser does not support local file storage.'));
    const request = indexedDB.open(ATTACHMENT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ATTACHMENT_STORE_NAME)) db.createObjectStore(ATTACHMENT_STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open attachment storage.'));
  });
}

async function putAttachmentBlob(id, blob) {
  const db = await openAttachmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE_NAME, 'readwrite');
    tx.objectStore(ATTACHMENT_STORE_NAME).put({ id, blob });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const error = tx.error; db.close(); reject(error || new Error('Could not save file.')); };
  });
}

async function getAttachmentBlob(id) {
  const db = await openAttachmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE_NAME, 'readonly');
    const request = tx.objectStore(ATTACHMENT_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Could not open file.'));
    tx.oncomplete = () => db.close();
  });
}

async function deleteAttachmentBlob(id) {
  const db = await openAttachmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE_NAME, 'readwrite');
    tx.objectStore(ATTACHMENT_STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const error = tx.error; db.close(); reject(error || new Error('Could not delete file.')); };
  });
}

// ---------------------------
// BOOK PROGRESS / READING PERIODS
// ---------------------------
function getBookReadingPeriods(item) {
  if (!item) return [];
  const explicit = Array.isArray(item.progress?.readingPeriods) ? item.progress.readingPeriods : [];
  if (explicit.length) return sanitizeBookReadingPeriods(explicit);

  // Backward-compatible fallback for books saved before reading periods existed.
  // A legacy date becomes the reading start, and a completion date closes it.
  if (item.date) {
    return sanitizeBookReadingPeriods([{ startDate: item.date, endDate: item.completedAt || '' }]);
  }
  return [];
}

function sanitizeBookReadingPeriods(periods) {
  return (periods || [])
    .map(period => ({
      startDate: String(period?.startDate || '').slice(0, 10),
      endDate: String(period?.endDate || '').slice(0, 10)
    }))
    .filter(period => /^\d{4}-\d{2}-\d{2}$/.test(period.startDate))
    .map(period => ({
      ...period,
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(period.endDate) ? period.endDate : ''
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function openBookProgress(item) {
  els.bookProgressId.value = item.id;
  els.bookProgressTitle.textContent = `Update ${item.title}`;
  els.progressCurrentPage.value = item.progress?.currentPage || 0;
  els.progressTotalPages.value = item.progress?.totalPages || '';
  const completeButton = els.bookProgressModal?.querySelector('[data-book-mark-complete-progress]');
  if (completeButton) {
    completeButton.textContent = item.completedAt ? '↶ Mark unread' : '✓ Mark book complete';
    completeButton.classList.toggle('is-complete', Boolean(item.completedAt));
  }
  renderBookPeriodsEditor(item);
  showDialogAtTop(els.bookProgressModal);
}

function renderBookPeriodsEditor(item) {
  if (!els.bookPeriodsList) return;
  els.bookPeriodsList.innerHTML = '';
  const periods = getBookReadingPeriods(item);
  if (!periods.length) periods.push({ startDate: '', endDate: '' });
  periods.forEach(period => addBookPeriodEditorRow(period));
  updateBookPauseResumeButton();
}

function addBookPeriodEditorRow(period = { startDate: '', endDate: '' }) {
  if (!els.bookPeriodsList) return;
  const row = document.createElement('div');
  row.className = 'book-period-row';
  row.innerHTML = `
    <label class="field compact-field">
      <span>Start</span>
      <input data-book-period-start type="date" value="${escapeAttr(period.startDate || '')}" />
    </label>
    <label class="field compact-field">
      <span>End / pause</span>
      <input data-book-period-end type="date" value="${escapeAttr(period.endDate || '')}" />
    </label>
    <button class="quiet-button book-period-remove" type="button" data-remove-book-period aria-label="Remove reading period">×</button>`;
  els.bookPeriodsList.appendChild(row);
  updateBookPauseResumeButton();
}

function handleBookPeriodEditorClick(event) {
  const remove = event.target.closest('[data-remove-book-period]');
  if (!remove) return;
  remove.closest('.book-period-row')?.remove();
  if (els.bookPeriodsList && !els.bookPeriodsList.children.length) addBookPeriodEditorRow({ startDate: '', endDate: '' });
  updateBookPauseResumeButton();
}

function collectBookPeriodEditorRows() {
  const periods = [...(els.bookPeriodsList?.querySelectorAll('.book-period-row') || [])]
    .map(row => ({
      startDate: row.querySelector('[data-book-period-start]')?.value || '',
      endDate: row.querySelector('[data-book-period-end]')?.value || ''
    }))
    .filter(period => period.startDate);

  for (const period of periods) {
    if (period.endDate && period.endDate < period.startDate) {
      throw new Error(`A reading period ends before it starts (${period.startDate} → ${period.endDate}).`);
    }
  }
  return sanitizeBookReadingPeriods(periods);
}

function toggleBookPauseResume() {
  if (!els.bookPeriodsList) return;
  const rows = [...els.bookPeriodsList.querySelectorAll('.book-period-row')];
  const last = rows.at(-1);
  if (!last) {
    addBookPeriodEditorRow({ startDate: todayString(), endDate: '' });
    return;
  }
  const start = last.querySelector('[data-book-period-start]');
  const end = last.querySelector('[data-book-period-end]');
  if (start?.value && !end?.value) {
    end.value = todayString();
  } else {
    addBookPeriodEditorRow({ startDate: todayString(), endDate: '' });
  }
  updateBookPauseResumeButton();
}

function updateBookPauseResumeButton() {
  if (!els.bookPauseResume || !els.bookPeriodsList) return;
  const rows = [...els.bookPeriodsList.querySelectorAll('.book-period-row')];
  const last = rows.at(-1);
  const active = Boolean(last?.querySelector('[data-book-period-start]')?.value && !last?.querySelector('[data-book-period-end]')?.value);
  els.bookPauseResume.textContent = active ? 'Pause today' : 'Resume today';
}

function bookReadingStatusText(item) {
  if (item?.bookDisposition === 'paused') return 'Paused';
  if (item?.bookDisposition === 'dnf') return 'Stopped';
  const periods = getBookReadingPeriods(item);
  if (!periods.length) return 'No reading dates yet';
  const latest = periods.at(-1);
  if (!latest.endDate) return `Reading since ${formatShortCalendarDate(latest.startDate)}`;
  return `Paused after ${formatShortCalendarDate(latest.endDate)}`;
}

function formatShortCalendarDate(date) {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

function saveBookProgress(event) {
  event.preventDefault();
  const item = findItem(els.bookProgressId.value);
  if (!item) return;
  const wasFinished = Boolean(item.completedAt) && Number(item.progress?.totalPages || 0) > 0 && Number(item.progress?.currentPage || 0) >= Number(item.progress?.totalPages || 0);
  const current = Math.max(0, Number(els.progressCurrentPage.value || 0));
  const total = Math.max(0, Number(els.progressTotalPages.value || 0));

  let periods;
  try {
    periods = collectBookPeriodEditorRows();
  } catch (error) {
    alert(error.message);
    return;
  }

  item.progress = { ...item.progress, currentPage: current, totalPages: total, readingPeriods: periods };
  item.date = '';

  const latestDraftPeriod = periods.at(-1);
  const readingPaused = Boolean(latestDraftPeriod?.startDate && latestDraftPeriod.endDate);
  if (current > 0 && !(total && current >= total)) {
    if (readingPaused) {
      item.bookDisposition = 'paused';
      setItemQueueStatus(item, 'library');
    } else if (!['paused', 'dnf'].includes(item.bookDisposition)) {
      item.bookDisposition = '';
      setItemQueueStatus(item, 'upnext');
    }
  }

  if (total && current >= total) {
    item.bookDisposition = '';
    delete item.bookDNFSnapshot;
    setItemQueueStatus(item, 'library');
    item.completedAt = todayString();
    // Finishing the book closes an active reading period today. The range itself
    // represents the completion on the calendar, so the completion history is undated.
    const latest = item.progress.readingPeriods.at(-1);
    if (latest && !latest.endDate) latest.endDate = todayString();
    if (!wasFinished && !state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'book-finished')) {
      addHistoryRecord({
        sourceItemId: item.id,
        type: item.type,
        typeLabel: getItemTypeLabel(item),
        date: '',
        showOnCalendar: false,
        kind: 'book-finished',
        title: item.title,
        subtitle: `Finished · ${total} pages`,
        notes: item.notes || '',
        rating: Number(item.rating || 0),
        image: item.image || '',
        provider: item.provider,
        providerId: item.providerId
      });
    }
  } else if (item.completedAt && (!total || current < total)) {
    item.completedAt = '';
  }

  saveItems();
  saveHistory();
  els.bookProgressModal.close();
  renderAll();
}

// ---------------------------
// TRACKER / CALENDAR HISTORY
// ---------------------------
function getCalendarEntries() {
  const savedItems = state.items
    .filter(item => {
      const sourceType = getSourceType(item);
      if (!item.date || sourceType === 'book' || item.calendarHidden) return false;
      // + Calendar schedules a live event in Up Next first. The tracked Calendar
      // only receives it after the explicit check in that Up Next calendar row.
      if (['event', 'concert'].includes(sourceType) && item.queueCalendarScheduled === true && item.calendarTracked !== true) return false;
      return true;
    })
    .map(item => ({
      id: `item:${item.id}`,
      sourceItemId: item.id,
      type: item.type,
      typeLabel: getItemTypeLabel(item),
      subcategory: item.subcategory || '',
      date: item.date,
      kind: 'dated-item',
      title: item.title,
      subtitle: item.subtitle || '',
      notes: item.notes || '',
      rating: Number(item.rating || 0),
      image: item.image || '',
      provider: item.provider || getSourceType(item),
      createdAt: item.createdAt || item.updatedAt || ''
    }));

  const bookRanges = state.items
    .filter(item => getSourceType(item) === 'book' && !item.calendarHidden)
    .flatMap(item => bookReadingCalendarEntries(item));

  const historyEntries = state.history.filter(entry => {
    if (entry.showOnCalendar === false) return false;
    const source = entry.sourceItemId ? findItem(entry.sourceItemId) : null;
    if (source?.calendarHidden) return false;
    if (entry.kind === 'book-finished') {
      const source = entry.sourceItemId ? findItem(entry.sourceItemId) : null;
      if (source && getBookReadingPeriods(source).length) return false;
    }
    return true;
  }).map(entry => {
    const source = entry.sourceItemId ? findItem(entry.sourceItemId) : null;
    return {
      ...entry,
      subcategory: entry.subcategory || source?.subcategory || ''
    };
  });

  return [...savedItems, ...historyEntries, ...bookRanges];
}

function bookReadingCalendarEntries(item) {
  const periods = getBookReadingPeriods(item);
  const today = todayString();
  const output = [];

  periods.forEach((period, periodIndex) => {
    const start = period.startDate;
    const effectiveEnd = period.endDate || today;
    if (!start || effectiveEnd < start) return;

    let cursor = parseLocalDate(start);
    const end = parseLocalDate(effectiveEnd);
    let guard = 0;
    while (cursor <= end && guard < 5000) {
      const date = localDateString(cursor);
      let rangePosition = 'middle';
      if (date === start && date === effectiveEnd) rangePosition = 'single';
      else if (date === start) rangePosition = 'start';
      else if (date === effectiveEnd) rangePosition = period.endDate ? 'end' : 'open-end';

      output.push({
        id: `book-range:${item.id}:${periodIndex}:${date}`,
        sourceItemId: item.id,
        type: item.type,
        typeLabel: getItemTypeLabel(item),
        subcategory: item.subcategory || '',
        date,
        kind: 'book-reading-day',
        title: item.title,
        subtitle: item.subtitle || '',
        notes: item.notes || '',
        rating: Number(item.rating || 0),
        image: item.image || '',
        provider: item.provider || 'googleBooks',
        providerId: item.providerId || '',
        bookPeriodIndex: periodIndex,
        rangeStart: start,
        rangeEnd: period.endDate || '',
        rangePosition,
        createdAt: item.createdAt || item.updatedAt || ''
      });
      cursor = addDays(cursor, 1);
      guard += 1;
    }
  });

  return output;
}

function parseLocalDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12);
}

function bookRangeLane(itemId) {
  let hash = 0;
  for (const char of String(itemId || 'book')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 4;
}

function bookRangeColorClass(entry) {
  const config = getStickerConfig(entry.type, entry);
  return `sticker-palette-${config.color}`;
}

function bookRangeSegmentMarkup(entry) {
  const position = ['start','middle','end','single','open-end'].includes(entry.rangePosition) ? entry.rangePosition : 'middle';
  return `<button class="book-range-segment book-range-${position} ${bookRangeColorClass(entry)}" type="button" data-book-range-source="${escapeAttr(entry.sourceItemId)}" title="${escapeAttr(`${entry.title} · ${entry.rangeStart}${entry.rangeEnd ? ` to ${entry.rangeEnd}` : ' · currently reading'}`)}"><span></span></button>`;
}

function renderTracker() {
  if (mobileCalendarQuery.matches) {
    renderWeekTracker();
  } else {
    renderMonthTracker();
  }
}

function renderMonthTracker() {
  const [yearText, monthText] = els.monthPicker.value.split('-');
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const days = new Date(year, month + 1, 0).getDate();
  els.monthLabel.textContent = new Intl.DateTimeFormat('en-CA', { month: 'long' }).format(new Date(year, month, 1));
  els.trackerGrid.className = 'tracker-grid tracker-month-grid';
  els.trackerGrid.style.setProperty('--days', String(days));
  els.trackerGrid.innerHTML = '';

  const dated = getCalendarEntries().filter(entry => {
    if (!entry.date) return false;
    const [y,m] = entry.date.split('-').map(Number);
    return y === year && m - 1 === month;
  });
  const groupsByKey = new Map();
  for (const entry of dated) {
    const key = getCalendarTypeGroupKey(entry);
    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        key,
        label: getCalendarTypeGroupLabel(entry),
        representativeType: entry.type,
        representativeEntry: entry
      });
    }
  }
  const displayGroups = groupsByKey.size
    ? [...groupsByKey.values()]
    : ['workout', 'tv', 'book', 'movie'].map(type => ({
        key: slugifyType(getTypeLabel(type)),
        label: getCalendarCategoryLabel(type, getTypeLabel(type)),
        representativeType: type,
        representativeEntry: { type, typeLabel: getTypeLabel(type) }
      }));

  const today = todayString();
  const isCurrentMonth = today.startsWith(`${yearText}-${monthText}-`);

  els.trackerGrid.appendChild(cell('tracker-cell tracker-corner', ''));
  for (let day=1; day<=days; day++) {
    const date = `${yearText}-${monthText}-${String(day).padStart(2, '0')}`;
    const dayCell = cell(`tracker-cell tracker-day${isCurrentMonth && date === today ? ' is-today' : ''}`, String(day));
    if (isCurrentMonth && date === today) dayCell.setAttribute('aria-current', 'date');
    els.trackerGrid.appendChild(dayCell);
  }

  for (const group of displayGroups) {
    els.trackerGrid.appendChild(cell('tracker-cell tracker-category', group.label.toLowerCase()));
    for (let day=1; day<=days; day++) {
      const date = `${yearText}-${monthText}-${String(day).padStart(2, '0')}`;
      const container = cell(`tracker-cell${isCurrentMonth && date === today ? ' is-today-column' : ''}`, '');
      const matches = dated.filter(entry => getCalendarTypeGroupKey(entry) === group.key && entry.date === date);
      const rangeMatches = matches.filter(entry => entry.kind === 'book-reading-day');
      const eventMatches = matches.filter(entry => entry.kind !== 'book-reading-day');

      if (rangeMatches.length) {
        const stack = document.createElement('div');
        stack.className = 'book-range-stack';
        stack.innerHTML = rangeMatches.map(bookRangeSegmentMarkup).join('');
        container.appendChild(stack);
      }

      if (eventMatches.length) {
        const first = eventMatches[0];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sticker-button sticker-group-button';
        button.dataset.groupKey = group.key;
        button.dataset.date = date;
        button.title = eventMatches.length === 1 ? first.title : `${eventMatches.length} ${group.label} entries`;
        button.innerHTML = `${calendarStickerMarkup(first.type, first)}${eventMatches.length > 1 ? `<span class="sticker-count">${eventMatches.length}</span>` : ''}`;
        container.appendChild(button);
      }
      els.trackerGrid.appendChild(container);
    }
  }
}

function renderWeekTracker() {
  const start = state.calendarWeekStart || startOfWeek(new Date());
  const end = addDays(start, 6);
  state.calendarWeekStart = start;

  els.monthLabel.textContent = formatWeekRange(start, end);
  els.monthPicker.value = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  els.trackerGrid.className = 'tracker-week-list';
  els.trackerGrid.style.removeProperty('--days');
  els.trackerGrid.innerHTML = '';

  const entries = getCalendarEntries();
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(start, offset);
    const date = localDateString(day);
    const matches = entries.filter(entry => entry.date === date);
    const groups = new Map();

    for (const entry of matches) {
      const key = getCalendarTypeGroupKey(entry);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }

    const section = document.createElement('section');
    section.className = `week-day${date === todayString() ? ' is-today' : ''}`;

    const header = document.createElement('div');
    header.className = 'week-day-header';
    const isToday = date === todayString();
    header.innerHTML = `
      <span class="week-weekday-row"><span class="week-weekday">${new Intl.DateTimeFormat('en-CA', { weekday: 'long' }).format(day)}</span>${isToday ? '<span class="week-today-badge">Today</span>' : ''}</span>
      <span class="week-date">${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(day)}</span>`;
    section.appendChild(header);

    const body = document.createElement('div');
    body.className = 'week-day-events week-sticker-collection';

    if (!groups.size) {
      body.innerHTML = '<span class="week-empty">Nothing tracked</span>';
    } else {
      const groupedEntries = [...groups.entries()];
      const stickerHeight = weekStickerCollectionHeight(groupedEntries.length);
      if (stickerHeight > 0) body.style.minHeight = `${stickerHeight}px`;
      for (const [index, [groupKey, typeEntries]] of groupedEntries.entries()) {
        const first = typeEntries[0];
        const label = getCalendarTypeGroupLabel(first);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'week-sticker-cluster sticker-group-button';
        button.dataset.groupKey = groupKey;
        button.dataset.date = date;
        button.setAttribute('aria-label', `${typeEntries.length} ${label} ${typeEntries.length === 1 ? 'entry' : 'entries'} on ${date}`);
        button.title = `${label} · tap for details`;

        const clusterPosition = weekStickerClusterPosition(date, groupKey, index, groupedEntries.length);
        button.style.setProperty('--cluster-left', `${clusterPosition.left}%`);
        button.style.setProperty('--cluster-top', `${clusterPosition.top}px`);
        button.style.setProperty('--cluster-rotate', `${clusterPosition.rotate}deg`);

        button.innerHTML = weekStickerPileMarkup(typeEntries, date, groupKey);
        body.appendChild(button);
      }
    }

    section.appendChild(body);
    els.trackerGrid.appendChild(section);
  }
}

function shiftCalendarMonth(months) {
  if (!els.monthPicker) return;
  const [yearText, monthText] = String(els.monthPicker.value || '').split('-');
  const base = Number(yearText) && Number(monthText)
    ? new Date(Number(yearText), Number(monthText) - 1, 1, 12)
    : new Date();
  const target = new Date(base.getFullYear(), base.getMonth() + Number(months || 0), 1, 12);
  els.monthPicker.value = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
  state.calendarWeekStart = startOfWeek(target);
  renderTracker();
}

function shiftCalendarWeek(days) {
  state.calendarWeekStart = addDays(state.calendarWeekStart || startOfWeek(new Date()), days);
  renderTracker();
}

function startOfWeek(date) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const day = value.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + mondayOffset);
  return value;
}

function addDays(date, days) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  value.setDate(value.getDate() + days);
  return value;
}


function weekStickerPileMarkup(entries = [], date = '', groupKey = '') {
  const visibleEntries = (entries || []).slice(0, 6);
  const stickers = visibleEntries.map((entry, index) => {
    const position = weekStickerPilePosition(entry, index, date, groupKey);
    return `<span class="week-sticker-pile-item" style="--pile-left:${position.left}px; --pile-top:${position.top}px; --pile-rotate:${position.rotate}deg; --pile-z:${position.z};">${calendarStickerMarkup(entry.type, entry)}</span>`;
  }).join('');
  const extra = entries.length > visibleEntries.length
    ? `<span class="week-entry-count">+${entries.length - visibleEntries.length}</span>`
    : '';
  return `
    <span class="week-sticker-cluster-icons week-sticker-pile" aria-hidden="true">${stickers}</span>
    ${extra}`;
}

function weekStickerPilePosition(entry, index, date, groupKey) {
  const seed = stableCalendarHash(`${date}:${groupKey}:${entry?.id || entry?.sourceItemId || entry?.title || entry?.type || 'entry'}:${index}`);
  const leftBase = [2, 17, 33, 8, 24, 40][index] ?? (index * 10);
  const topBase = [11, 2, 13, 26, 18, 29][index] ?? (8 + index * 3);
  const left = leftBase + ((seed % 7) - 3);
  const top = topBase + ((Math.floor(seed / 7) % 7) - 3);
  const rotate = ((Math.floor(seed / 49) % 13) - 6) + (index % 2 === 0 ? -1 : 1);
  return { left, top, rotate, z: 10 + index };
}

function weekStickerClusterPosition(date, groupKey, index, total) {
  // Keep up to four piles inside the calendar row's natural header height.
  // Only create another vertical band when there are too many piles to fit.
  const pilesPerBand = 4;
  const row = Math.floor(index / pilesPerBand);
  const column = index % pilesPerBand;
  const seed = stableCalendarHash(`${date}:${groupKey}:cluster:${index}:${total}`);
  const baseLeftByColumn = [2, 25, 49, 71];
  const rowShift = row % 2 === 0 ? 0 : 4;
  const leftJitter = ((seed % 9) - 4) * 0.75;
  const left = Math.max(1, Math.min(78, baseLeftByColumn[column] + rowShift + leftJitter));

  const baseTop = row * 49 + [2, 8, 0, 6][column];
  const topJitter = (Math.floor(seed / 17) % 7) - 3;
  const top = Math.max(0, baseTop + topJitter);
  const rotate = ((Math.floor(seed / 71) % 17) - 8) * 0.9;
  return { left, top, rotate };
}

function weekStickerCollectionHeight(total) {
  // Absolute-positioned stickers do not contribute to row height. For one band,
  // return 0 so the weekday/date header alone determines the row's minimum height.
  // Extra bands explicitly grow only that day's row.
  const rows = Math.ceil(Math.max(0, total) / 4);
  if (rows <= 1) return 0;
  return 60 + (rows - 1) * 49;
}

function stableCalendarHash(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function formatWeekRange(start, end) {
  const startMonth = new Intl.DateTimeFormat('en-CA', { month: 'short' }).format(start);
  const endMonth = new Intl.DateTimeFormat('en-CA', { month: 'short' }).format(end);
  if (start.getFullYear() !== end.getFullYear()) return `${startMonth} ${start.getDate()}, ${start.getFullYear()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  if (start.getMonth() !== end.getMonth()) return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
  return `${startMonth} ${start.getDate()}–${end.getDate()}`;
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarStickerMarkup(type, entry = {}) {
  const config = getStickerConfig(type, entry);
  const shapeClass = `sticker-${config.shape}`;
  const paletteClass = `sticker-palette-${config.color}`;
  const tiltClass = `sticker-tilt-${config.tilt}`;
  const text = config.shape === 'star' ? '★' : config.shape === 'heart' ? '♥' : escapeHtml(config.label || '');
  const ariaLabel = [getTypeLabel(type), cleanTypeLabel(entry?.subcategory || '')].filter(Boolean).join(' · ');
  const aria = escapeAttr(`${ariaLabel} sticker`);
  return `<span class="sticker ${shapeClass} ${paletteClass} ${tiltClass}" aria-label="${aria}">${text}</span>`;
}

function stickerPreferenceKey(type, entry = {}) {
  const subcategory = cleanTypeLabel(entry?.subcategory || '');
  return subcategory ? `${type}::subcategory::${slugifyType(subcategory)}` : type;
}

function getStickerConfig(type, entry = {}) {
  const defaults = getDefaultStickerConfig(type, entry);
  const key = stickerPreferenceKey(type, entry);
  const parentSaved = state.stickerPrefs?.[type] || {};
  const saved = key !== type ? (state.stickerPrefs?.[key] || parentSaved) : parentSaved;
  const shape = ['square', 'circle', 'star', 'heart'].includes(saved.shape) ? saved.shape : defaults.shape;
  const color = STICKER_COLORS.includes(saved.color) ? saved.color : defaults.color;
  const label = cleanStickerLabel(saved.label !== undefined ? saved.label : defaults.label);
  return { ...defaults, shape, color, label };
}

function getDefaultStickerConfig(type, entry = {}) {
  const provider = String(entry.provider || '').toLowerCase();
  const relatedItem = state.items.find(item => item.type === type);
  const sourceType = relatedItem ? getSourceType(relatedItem) : (provider === 'youtube' ? 'youtube' : type);
  const label = getTypeLabel(type) || type || 'Item';
  const letter = label.trim().slice(0, 1).toUpperCase() || '•';

  if (type === 'tv') return { shape: 'square', label: 'TV', color: 'rust', tilt: 'left' };
  if (type === 'book') return { shape: 'square', label: 'B', color: 'yellow', tilt: 'right' };
  if (type === 'movie') return { shape: 'circle', label: '', color: 'cream', tilt: 'none' };
  if (type === 'music') return { shape: 'star', label: '★', color: 'lavender', tilt: 'left' };
  if (sourceType === 'youtube') return { shape: 'star', label: '★', color: 'yellow', tilt: 'right' };

  const variant = stickerVariantForType(type);
  if (variant === 'star') return { shape: 'star', label: '★', color: 'yellow', tilt: 'left' };
  if (variant === 'circle') return { shape: 'circle', label: '', color: 'rust', tilt: 'none' };
  return { shape: 'square', label: letter, color: 'cream', tilt: 'right' };
}

function stickerVariantForType(type) {
  const value = String(type || 'item');
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return ['square', 'star', 'circle'][Math.abs(hash) % 3];
}

function cleanStickerLabel(value) {
  return String(value ?? '').replace(/\s+/g, '').slice(0, 3).toUpperCase();
}

function getCalendarCategoryLabel(type, fallbackLabel = '') {
  const saved = state.stickerPrefs?.[type] || {};
  const custom = cleanTypeLabel(saved.calendarLabel || '');
  return custom || cleanTypeLabel(fallbackLabel || getTypeLabel(type)) || 'Other';
}

function getCalendarTypeGroupLabel(entry) {
  return getCalendarCategoryLabel(entry?.type, entry?.typeLabel || getTypeLabel(entry?.type));
}

function getCalendarTypeGroupKey(entry) {
  // Keep the category's internal identity stable when its Calendar display name changes.
  // This prevents renaming "TV" to "Shows" from changing grouping behavior or merging it
  // with a different type that happens to use the same display name.
  const baseLabel = cleanTypeLabel(entry?.typeLabel || getTypeLabel(entry?.type)) || String(entry?.type || 'other');
  return slugifyType(baseLabel);
}

function handleTrackerClick(event) {
  const bookRange = event.target.closest('[data-book-range-source]');
  if (bookRange) {
    openDetails(bookRange.dataset.bookRangeSource);
    return;
  }
  const button = event.target.closest('.sticker-group-button[data-date][data-group-key]');
  if (!button) return;
  openCalendarGroup(button.dataset.groupKey, button.dataset.date);
}

function openCalendarGroup(groupKey, date) {
  const entries = getCalendarEntries()
    .filter(entry => getCalendarTypeGroupKey(entry) === groupKey && entry.date === date)
    .sort((a,b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  if (!entries.length) return;

  const formattedDate = new Intl.DateTimeFormat('en-CA', { weekday:'long', month:'long', day:'numeric', year:'numeric' }).format(new Date(`${date}T12:00:00`));
  const rows = entries.map(entry => {
    const rating = Number(entry.rating || 0);
    const ratingMarkup = rating > 0 ? `<div class="calendar-event-rating" aria-label="${rating} out of 5 stars">${'★'.repeat(Math.floor(rating))}${rating % 1 ? '½' : ''} <span>${rating}/5</span></div>` : '';
    const editButton = (entry.kind === 'dated-item' || entry.kind === 'book-reading-day')
      ? `<button class="secondary-button" type="button" data-edit-calendar-item="${escapeAttr(entry.sourceItemId)}">Edit</button>`
      : `<button class="secondary-button" type="button" data-edit-history-id="${escapeAttr(entry.id)}">Edit</button>`;
    return `
      <article class="calendar-event-row">
        ${entry.image ? `<img class="calendar-event-image" src="${escapeAttr(entry.image)}" alt="" />` : `<div class="calendar-event-image placeholder"></div>`}
        <div class="calendar-event-copy">
          <div class="list-title">${escapeHtml(entry.title)}</div>
          ${entry.subtitle ? `<div class="list-meta">${escapeHtml(entry.subtitle)}</div>` : ''}
          ${ratingMarkup}
          ${entry.notes ? `<p class="calendar-event-notes">${escapeHtml(shorten(entry.notes, 240))}</p>` : ''}
        </div>
        <div class="calendar-event-actions">
          ${editButton}
          ${entry.sourceItemId ? `<button class="quiet-button calendar-open-source" type="button" data-open-source-id="${escapeAttr(entry.sourceItemId)}">Open source</button>` : ''}
        </div>
      </article>`;
  }).join('');

  els.detailBody.innerHTML = `
    <div class="calendar-group-heading">
      <p class="detail-type">${escapeHtml(getCalendarTypeGroupLabel(entries[0]))}</p>
      <h2>${escapeHtml(formattedDate)}</h2>
      <p class="detail-meta">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · every past entry can be edited</p>
    </div>
    <section class="detail-section calendar-event-list">${rows}</section>`;
  showDialogAtTop(els.detailModal);

  els.detailBody.querySelectorAll('[data-open-source-id]').forEach(button => {
    button.addEventListener('click', () => {
      const sourceId = button.dataset.openSourceId;
      els.detailModal.close();
      openDetails(sourceId);
    });
  });
  els.detailBody.querySelectorAll('[data-edit-calendar-item]').forEach(button => {
    button.addEventListener('click', () => {
      els.detailModal.close();
      openItemModal(button.dataset.editCalendarItem);
    });
  });
  els.detailBody.querySelectorAll('[data-edit-history-id]').forEach(button => {
    button.addEventListener('click', () => {
      els.detailModal.close();
      openHistoryEdit(button.dataset.editHistoryId);
    });
  });
}

function openHistoryEdit(id) {
  const entry = state.history.find(record => record.id === id);
  if (!entry || !els.historyEditModal) return;
  const source = entry.sourceItemId ? findItem(entry.sourceItemId) : null;
  els.historyEditId.value = entry.id;
  els.historyEditTitle.value = entry.title || '';
  els.historyEditType.value = entry.typeLabel || getTypeLabel(entry.type) || '';
  if (els.historyEditSubcategory) els.historyEditSubcategory.value = entry.subcategory || source?.subcategory || '';
  els.historyEditSubtitle.value = entry.subtitle || '';
  els.historyEditDate.value = entry.date || '';
  els.historyEditNote.value = entry.notes || '';
  els.historyEditShowCalendar.checked = entry.showOnCalendar !== false;
  setHistoryRating(Number(entry.rating ?? source?.rating ?? 0));
  syncHistoryRecommendHeart(source);
  showDialogAtTop(els.historyEditModal);
}

function syncHistoryRecommendHeart(source = null) {
  if (!els.historyRecommendHeart) return;
  const item = source || (() => {
    const entry = state.history.find(record => record.id === els.historyEditId?.value);
    return entry?.sourceItemId ? findItem(entry.sourceItemId) : null;
  })();
  const recommended = Boolean(item?.recommended);
  els.historyRecommendHeart.disabled = !item;
  els.historyRecommendHeart.textContent = recommended ? '♥' : '♡';
  els.historyRecommendHeart.classList.toggle('is-recommended', recommended);
  els.historyRecommendHeart.setAttribute('aria-pressed', String(recommended));
  els.historyRecommendHeart.setAttribute('aria-label', !item ? 'No Library item to recommend' : recommended ? 'Remove from Recommended' : 'Add to Recommended');
}

function toggleHistorySourceRecommended() {
  const entry = state.history.find(record => record.id === els.historyEditId?.value);
  const item = entry?.sourceItemId ? findItem(entry.sourceItemId) : null;
  if (!item) return;
  item.recommended = !item.recommended;
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderLibrary();
  syncHistoryRecommendHeart(item);
}

function chooseHistoryRating(event) {
  const button = event.target.closest('[data-history-rating]');
  if (!button) return;
  const selected = Number(button.dataset.historyRating);
  setHistoryRating(toggledStarRating(els.historyEditRating?.value, selected));
}

function setHistoryRating(value) {
  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  if (els.historyEditRating) els.historyEditRating.value = String(rating);
  if (els.historyRatingPicker) {
    els.historyRatingPicker.querySelectorAll('[data-history-rating]').forEach(button => {
      button.classList.toggle('filled', Number(button.dataset.historyRating) <= rating);
    });
  }
}

function saveHistoryEdit(event) {
  event.preventDefault();
  const id = els.historyEditId?.value;
  const entry = state.history.find(record => record.id === id);
  if (!entry) return;

  const typeLabel = cleanTypeLabel(els.historyEditType.value) || entry.typeLabel || getTypeLabel(entry.type);
  const type = editableTypeFromLabel(typeLabel, entry.type);
  registerCustomType(type, typeLabel);

  entry.title = els.historyEditTitle.value.trim() || entry.title;
  entry.type = type;
  entry.typeLabel = typeLabel;
  entry.subcategory = cleanTypeLabel(els.historyEditSubcategory?.value || '');
  entry.subtitle = els.historyEditSubtitle.value.trim();
  entry.date = els.historyEditDate.value || '';
  entry.rating = Number(els.historyEditRating.value || 0);
  entry.notes = els.historyEditNote.value.trim();
  entry.showOnCalendar = Boolean(els.historyEditShowCalendar.checked && entry.date);
  entry.updatedAt = new Date().toISOString();

  saveHistory();
  els.historyEditModal.close();
  renderAll();
}


function editableTypeFromLabel(label, currentType = 'other') {
  const cleaned = cleanTypeLabel(label).toLowerCase();
  const builtIns = {
    tv: 'tv', television: 'tv', 'tv show': 'tv', 'tv shows': 'tv',
    book: 'book', books: 'book',
    movie: 'movie', movies: 'movie', film: 'movie', films: 'movie',
    music: 'music', album: 'music', albums: 'music', artist: 'artist', artists: 'artist', song: 'song', songs: 'song',
    workout: 'workout', workouts: 'workout',
    other: 'other'
  };
  if (builtIns[cleaned]) return builtIns[cleaned];
  if (cleanTypeLabel(getTypeLabel(currentType)).toLowerCase() === cleaned) return currentType;
  return slugifyType(label);
}

function deleteHistoryEdit() {
  const id = els.historyEditId?.value;
  const entry = state.history.find(record => record.id === id);
  if (!entry) return;
  if (!confirm(`Delete tracked entry “${entry.title}”?`)) return;
  state.history = state.history.filter(record => record.id !== id);
  saveHistory();
  els.historyEditModal.close();
  renderAll();
}

// ---------------------------
// DISCOVER
// ---------------------------
const DISCOVER_MODES = new Set(['for-you', 'new', 'popular']);
const DISCOVER_BOOK_BATCH_SIZE = 20;
const DISCOVER_GENRES = [
  { value: 'action-adventure', label: 'Action & Adventure', tmdb: ['Action', 'Adventure', 'Action & Adventure'], keywords: ['action', 'adventure'], book: ['action', 'adventure'] },
  { value: 'animation', label: 'Animation', tmdb: ['Animation'], keywords: ['animation'], book: ['animation', 'graphic novels'] },
  { value: 'biography', label: 'Biography & Memoir', tmdb: [], keywords: ['biography', 'biographical'], book: ['biography', 'memoir'] },
  { value: 'comedy', label: 'Comedy', tmdb: ['Comedy'], keywords: ['comedy'], book: ['humor', 'comedy'] },
  { value: 'crime', label: 'Crime', tmdb: ['Crime'], keywords: ['crime'], book: ['crime'] },
  { value: 'documentary', label: 'Documentary', tmdb: ['Documentary'], keywords: ['documentary'], book: ['documentary', 'nonfiction'] },
  { value: 'drama', label: 'Drama', tmdb: ['Drama'], keywords: ['drama'], book: ['drama'] },
  { value: 'family', label: 'Family', tmdb: ['Family'], keywords: ['family'], book: ['family'] },
  { value: 'fantasy', label: 'Fantasy', tmdb: ['Fantasy', 'Sci-Fi & Fantasy'], keywords: ['fantasy'], book: ['fantasy'] },
  { value: 'history', label: 'History', tmdb: ['History', 'War & Politics'], keywords: ['history', 'historical'], book: ['history'] },
  { value: 'horror', label: 'Horror', tmdb: ['Horror'], keywords: ['horror'], book: ['horror'] },
  { value: 'mystery', label: 'Mystery', tmdb: ['Mystery'], keywords: ['mystery'], book: ['mystery'] },
  { value: 'philosophy', label: 'Philosophy', tmdb: [], keywords: ['philosophy'], book: ['philosophy'] },
  { value: 'psychology', label: 'Psychology', tmdb: [], keywords: ['psychology'], book: ['psychology'] },
  { value: 'romance', label: 'Romance', tmdb: ['Romance'], keywords: ['romance'], book: ['romance'] },
  { value: 'science', label: 'Science', tmdb: [], keywords: ['science'], book: ['science'] },
  { value: 'science-fiction', label: 'Science Fiction', tmdb: ['Science Fiction', 'Sci-Fi & Fantasy'], keywords: ['science fiction'], book: ['science fiction'] },
  { value: 'thriller', label: 'Thriller', tmdb: ['Thriller'], keywords: ['thriller', 'suspense'], book: ['thriller', 'suspense'] }
]

function selectedDiscoverGenre() {
  return DISCOVER_GENRES.find(genre => genre.value === (state.discoverPrefs.genre || 'all')) || null;
}

async function ensureDiscoverGenreCatalog() {
  if (!els.discoverGenreFilter) return;
  if (!state.discoverGenreCatalog.tv.length || !state.discoverGenreCatalog.movie.length) {
    const [tv, movie] = await Promise.allSettled([
      TrackerAPI.getTMDBGenres('tv', state.settings),
      TrackerAPI.getTMDBGenres('movie', state.settings)
    ]);
    if (tv.status === 'fulfilled') state.discoverGenreCatalog.tv = tv.value;
    if (movie.status === 'fulfilled') state.discoverGenreCatalog.movie = movie.value;
  }

  const selected = selectedDiscoverGenre();
  if (selected && !state.discoverKeywordCatalog[selected.value]) {
    try {
      state.discoverKeywordCatalog[selected.value] = await TrackerAPI.getTMDBKeywordIds(selected.keywords || [], state.settings);
    } catch {
      state.discoverKeywordCatalog[selected.value] = [];
    }
  }

  const current = state.discoverPrefs.genre || 'all';
  els.discoverGenreFilter.innerHTML = '<option value="all">All genres</option>' + DISCOVER_GENRES.map(genre => `<option value="${escapeAttr(genre.value)}">${escapeHtml(genre.label)}</option>`).join('');
  els.discoverGenreFilter.value = DISCOVER_GENRES.some(genre => genre.value === current) ? current : 'all';
}

function discoverTMDBGenreIds(type) {
  const genre = selectedDiscoverGenre();
  if (!genre) return [];
  const allowed = new Set(genre.tmdb.map(name => name.toLowerCase()));
  return (state.discoverGenreCatalog[type] || []).filter(entry => allowed.has(String(entry.name || '').toLowerCase())).map(entry => String(entry.id));
}

function discoverTMDBKeywordIds(type) {
  const genre = selectedDiscoverGenre();
  if (!genre || discoverTMDBGenreIds(type).length) return [];
  return (state.discoverKeywordCatalog[genre.value] || []).map(String).filter(Boolean);
}

function discoverTMDBOptions(type, options = {}) {
  const genre = selectedDiscoverGenre();
  const languageOptions = type === 'tv' && state.discoverPrefs.englishTVOnly === true ? { originalLanguage: 'en' } : {};
  if (!genre) return { ...options, ...languageOptions };
  const genreIds = discoverTMDBGenreIds(type);
  if (genreIds.length) return { ...options, ...languageOptions, genreIds, genreTag: genre.value };
  const keywordIds = discoverTMDBKeywordIds(type);
  if (keywordIds.length) return { ...options, ...languageOptions, keywordIds, genreTag: genre.value };
  return { ...options, ...languageOptions };
}

function discoverBookOptions(options = {}) {
  const genre = selectedDiscoverGenre();
  if (!genre?.book?.length) return options;
  const subject = genre.book[0].includes(' ') ? `subject:"${genre.book[0]}"` : `subject:${genre.book[0]}`;
  const existing = String(options.query || '').trim();
  if (!existing || /^subject:/i.test(existing)) return { ...options, query: subject };
  return { ...options, query: `${existing} ${subject}` };
}

function discoverResultMatchesGenre(result) {
  const genre = selectedDiscoverGenre();
  if (!genre) return true;
  if (result.sourceType === 'tv' || result.sourceType === 'movie') {
    if (result._discoverGenreTag === genre.value) return true;
    const ids = new Set((result.raw?.genre_ids || []).map(String));
    const allowedIds = discoverTMDBGenreIds(result.sourceType);
    if (allowedIds.length) return allowedIds.some(id => ids.has(String(id)));
    const keywordIds = new Set(discoverTMDBKeywordIds(result.sourceType));
    const resultKeywordIds = new Set((result._tmdbKeywordIds || []).map(String));
    return keywordIds.size ? [...keywordIds].some(id => resultKeywordIds.has(id)) : false;
  }
  if (result.sourceType === 'event') {
    const haystack = [result.title, ...(result.classifications || [])].join(' ').toLowerCase();
    const terms = [...(genre.tmdb || []), ...(genre.keywords || []), ...(genre.book || [])].map(value => String(value).toLowerCase());
    return terms.some(term => haystack.includes(term));
  }
  if (result.sourceType === 'book') {
    // If this result came back from a Google Books subject query for the selected
    // genre, trust Google's match. volumeInfo.categories is optional and is often
    // missing even on valid Romance results.
    const trustedSubject = String(result._bookGenreSubject || '').toLowerCase();
    if (trustedSubject && genre.book.some(term => trustedSubject.includes(term.toLowerCase()) || term.toLowerCase().includes(trustedSubject))) {
      return true;
    }
    const categories = result.categories || result.raw?.volumeInfo?.categories || [];
    const haystack = categories.join(' ').toLowerCase();
    return genre.book.some(term => haystack.includes(term.toLowerCase()));
  }
  return true;
}

async function discoverSearchResultMatchesGenre(result) {
  const genre = selectedDiscoverGenre();
  if (!genre || result.sourceType === 'book' || result.sourceType === 'event') return discoverResultMatchesGenre(result);
  if (result.sourceType !== 'tv' && result.sourceType !== 'movie') return true;
  const officialIds = discoverTMDBGenreIds(result.sourceType);
  if (officialIds.length) return discoverResultMatchesGenre(result);
  const keywordIds = discoverTMDBKeywordIds(result.sourceType);
  if (!keywordIds.length || !result.providerId) return false;
  try {
    const keywords = await TrackerAPI.getTMDBItemKeywords(result.sourceType, result.providerId, state.settings);
    const itemIds = keywords.map(keyword => String(keyword.id));
    result._tmdbKeywordIds = itemIds;
    return keywordIds.some(id => itemIds.includes(String(id)));
  } catch {
    return false;
  }
}

async function refreshDiscoverForFilters() {
  await ensureDiscoverGenreCatalog();
  if (state.discoverSearchQuery) return runDiscoverSearch(state.discoverSearchQuery);
  resetDiscoverFeed(false);
  return loadMoreDiscoverFeed();
}

async function runDiscoverSearch(forcedQuery = '') {
  if (!els.discoverFeed) return;
  await ensureDiscoverGenreCatalog();
  const query = String(forcedQuery || els.discoverSearchInput?.value || '').trim();
  if (!query) {
    state.discoverSearchQuery = '';
    if (els.clearDiscoverSearch) els.clearDiscoverSearch.hidden = true;
    resetDiscoverFeed(false);
    return loadMoreDiscoverFeed();
  }

  state.discoverSearchQuery = query;
  if (els.discoverSearchInput) els.discoverSearchInput.value = query;
  if (els.clearDiscoverSearch) els.clearDiscoverSearch.hidden = false;
  state.discoverFeedDone = true;
  state.discoverFeedLoading = true;
  state.discoverFeedItems = [];
  state.discoverFeedSeen = new Set();
  state.discoverResults.clear();
  els.discoverFeed.classList.remove('is-period-grouped');
  els.discoverFeed.innerHTML = '';
  if (els.discoverStatus) {
    els.discoverStatus.hidden = false;
    els.discoverStatus.textContent = `Searching for “${query}”…`;
  }
  if (els.discoverFeedMessage) els.discoverFeedMessage.textContent = 'Search results';

  try {
    const types = normalizedDiscoverContentTypes();
    const settled = await Promise.allSettled(types.map(type => {
      if (type === 'concert') return TrackerAPI.searchCatalogue(query, 'concert', state.settings, {
        city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
        countryCode: state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA'
      });
      if (type === 'restaurant') return TrackerAPI.searchCatalogue(query, 'restaurant', state.settings, {
        city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
        region: state.discoverPrefs.eventCountry || state.settings.homeCountry || 'CA',
        maxResultCount: 20
      });
      if (type === 'event') return fetchTicketmasterEventsForPreferences(query, { size: 40, skipPrioritySearch: true });
      if (type !== 'book') return TrackerAPI.searchCatalogue(query, type, state.settings);
      const genre = selectedDiscoverGenre();
      if (!genre?.book?.length) return TrackerAPI.searchCatalogue(query, type, state.settings);
      const subject = genre.book[0].includes(' ') ? `subject:"${genre.book[0]}"` : `subject:${genre.book[0]}`;
      return TrackerAPI.searchCatalogue(`${query} ${subject}`, type, state.settings);
    }));
    const results = [];
    for (let index = 0; index < settled.length; index += 1) {
      const entry = settled[index];
      if (entry.status !== 'fulfilled') continue;
      const sourceType = types[index];
      const availableResults = filterAlreadyKnown(entry.value || [], sourceType);
      for (const result of availableResults) {
        const normalized = { ...result, sourceType, categories: result.raw?.volumeInfo?.categories || result.categories || [] };
        if (state.discoverPrefs.englishTVOnly === true && sourceType === 'tv' && String(normalized.raw?.original_language || '').toLowerCase() !== 'en') continue;
        if (!(await discoverSearchResultMatchesGenre(normalized))) continue;
        results.push(normalized);
      }
    }
    const ranked = await rankDiscoverFeedCandidates(results, Math.max(1, results.length));
    state.discoverFeedItems = ranked;
    for (const result of ranked) state.discoverFeedSeen.add(discoverResultIdentity(result));
    renderDiscoverFeedItems();
    if (els.discoverStatus) {
      els.discoverStatus.hidden = ranked.length > 0;
      els.discoverStatus.textContent = ranked.length ? '' : `No results for “${query}” with these filters.`;
    }
    if (els.discoverFeedMessage) els.discoverFeedMessage.textContent = ranked.length ? `${ranked.length} result${ranked.length === 1 ? '' : 's'}` : 'No results';
  } catch (error) {
    if (els.discoverStatus) {
      els.discoverStatus.hidden = false;
      els.discoverStatus.textContent = `Search failed: ${error.message}`;
    }
  } finally {
    state.discoverFeedLoading = false;
  }
}

function setDiscoverMode(mode) {
  const next = DISCOVER_MODES.has(mode) ? mode : 'for-you';
  state.discoverSearchQuery = '';
  if (els.discoverSearchInput) els.discoverSearchInput.value = '';
  if (els.clearDiscoverSearch) els.clearDiscoverSearch.hidden = true;
  if (state.discoverMode === next && state.discoverFeedInitialized) return;
  state.discoverMode = next;
  updateDiscoverModeUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  resetDiscoverFeed(false);
  loadMoreDiscoverFeed();
}

function normalizedUpcomingHorizonDays() {
  const allowed = [14, 30, 90, 180];
  const value = Number(state.discoverPrefs.upcomingHorizonDays || 30);
  return allowed.includes(value) ? value : 30;
}

function updateDiscoverModeUI() {
  const mode = DISCOVER_MODES.has(state.discoverMode) ? state.discoverMode : 'for-you';
  const copy = {
    'for-you': `Personalized recommendations across ${discoverSelectionLabel(normalizedDiscoverContentTypes())}. Most results follow your taste, with some broader discoveries mixed in.`,
    new: 'Chronological releases and events: this week, last week, upcoming, then an endless stream of recently released things from newest to oldest.',
    popular: 'What is broadly popular or trending now across your enabled content types. Your location and availability settings filter results, but your taste does not determine the ranking.'
  };
  els.discoverModeTabs?.forEach(tab => {
    const active = tab.dataset.discoverMode === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  if (els.discoverFeedIntroText) els.discoverFeedIntroText.textContent = copy[mode];
  syncDiscoverTypeFilterUI();
  if (els.discoverGenreFilter) els.discoverGenreFilter.value = state.discoverPrefs.genre || 'all';
  if (els.discoverUpcomingWindow) els.discoverUpcomingWindow.value = String(normalizedUpcomingHorizonDays());
  if (els.discoverUpcomingWindowField) els.discoverUpcomingWindowField.hidden = mode !== 'new';
  if (els.discoverFeedSection) els.discoverFeedSection.hidden = false;
  if (els.discoverSearchForm) els.discoverSearchForm.hidden = false;
  if (els.refreshDiscover) els.refreshDiscover.textContent = mode === 'for-you' ? 'Shuffle' : 'Refresh';
}

async function renderDiscover(force = false) {
  if (!els.discoverStatus) return;
  await ensureDiscoverGenreCatalog();
  if (!DISCOVER_MODES.has(state.discoverMode)) state.discoverMode = 'for-you';
  updateDiscoverModeUI();
  if (state.discoverSearchQuery) return runDiscoverSearch(state.discoverSearchQuery);

  if (!els.discoverFeed) return renderLegacyDiscover(force);

  if (force || !state.discoverFeedInitialized) {
    resetDiscoverFeed(force);
  } else {
    state.discoverFeedItems = state.discoverFeedItems.filter(result => !findDiscoverItem(result));
    renderDiscoverFeedItems();
  }

  setupDiscoverInfiniteScroll();
  if (!state.discoverFeedItems.length && !state.discoverFeedLoading) {
    await loadMoreDiscoverFeed();
  }
}

function discoverCalendarMonthDate() {
  const match = String(state.discoverCalendarMonth || '').match(/^(\d{4})-(\d{2})/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth();
  return new Date(year, month, 1, 12, 0, 0, 0);
}

function discoverCalendarBounds() {
  const monthDate = discoverCalendarMonthDate();
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 12);
  return { monthDate, startDate: localDateString(start), endDate: localDateString(end) };
}

function shiftDiscoverCalendarMonth(delta) {
  const monthDate = discoverCalendarMonthDate();
  monthDate.setMonth(monthDate.getMonth() + Number(delta || 0));
  state.discoverCalendarMonth = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`;
  state.discoverCalendarExpandedDays.clear();
  renderDiscoverCalendar(false);
}

function jumpDiscoverCalendarToToday() {
  const now = new Date();
  state.discoverCalendarMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  state.discoverCalendarExpandedDays.clear();
  renderDiscoverCalendar(false);
}

function discoverCalendarCachePrefix() {
  const month = String(state.discoverCalendarMonth || '').slice(0, 7);
  return `discover:calendar:${month}:`;
}

function clearDiscoverCalendarCache() {
  const prefix = discoverCalendarCachePrefix();
  for (const key of Object.keys(state.cache)) {
    if (key.startsWith(prefix)) delete state.cache[key];
  }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(state.cache)); } catch {}
}

function ticketmasterMonthBoundary(dateString, atEnd = false) {
  return `${dateString}T${atEnd ? '23:59:59' : '00:00:00'}Z`;
}

async function renderDiscoverCalendar(force = false) {
  if (!els.discoverCalendarSection || !els.discoverCalendarGrid || state.discoverCalendarLoading) return;
  updateDiscoverModeUI();
  if (force) clearDiscoverCalendarCache();
  state.discoverCalendarLoading = true;
  const { monthDate } = discoverCalendarBounds();
  if (els.discoverCalendarMonthLabel) {
    els.discoverCalendarMonthLabel.textContent = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  if (els.discoverStatus) {
    els.discoverStatus.hidden = false;
    els.discoverStatus.textContent = 'Loading upcoming concerts and releases…';
  }
  if (els.discoverCalendarMessage) els.discoverCalendarMessage.textContent = '';
  els.discoverCalendarGrid.innerHTML = '<div class="discover-calendar-loading">Loading calendar…</div>';

  try {
    const entries = await collectDiscoverCalendarEntries();
    state.discoverCalendarEntries = entries;
    renderDiscoverCalendarGrid(entries);
    if (els.discoverStatus) els.discoverStatus.hidden = true;
    if (els.discoverCalendarMessage) {
      const selectedTypes = normalizedDiscoverContentTypes();
      const calendarCapable = selectedTypes.some(type => ['tv','movie','concert','event'].includes(type));
      if (!calendarCapable) {
        els.discoverCalendarMessage.textContent = 'The selected Discover categories do not use this release calendar.';
      } else if (!entries.length) {
        els.discoverCalendarMessage.textContent = 'Nothing matching your current type, genre, and location was found for this month.';
      } else {
        const concertCount = entries.filter(entry => entry.sourceType === 'concert').length;
        const eventCount = entries.filter(entry => entry.sourceType === 'event').length;
        const movieCount = entries.filter(entry => entry.sourceType === 'movie').length;
        const tvCount = entries.filter(entry => entry.sourceType === 'tv').length;
        els.discoverCalendarMessage.textContent = [
          concertCount ? `${concertCount} concert${concertCount === 1 ? '' : 's'}` : '',
          eventCount ? `${eventCount} followed event${eventCount === 1 ? '' : 's'}` : '',
          movieCount ? `${movieCount} movie release${movieCount === 1 ? '' : 's'}` : '',
          tvCount ? `${tvCount} TV date${tvCount === 1 ? '' : 's'}` : ''
        ].filter(Boolean).join(' · ');
      }
    }
  } catch (error) {
    els.discoverCalendarGrid.innerHTML = '';
    if (els.discoverStatus) {
      els.discoverStatus.hidden = false;
      els.discoverStatus.textContent = `Calendar could not load: ${error.message}`;
    }
  } finally {
    state.discoverCalendarLoading = false;
  }
}

async function collectDiscoverCalendarEntries() {
  const { startDate, endDate } = discoverCalendarBounds();
  const selectedTypes = new Set(normalizedDiscoverContentTypes());
  if (![...selectedTypes].some(type => ['tv','movie','concert','event'].includes(type))) return [];
  const entries = [];
  state.discoverResults.clear();

  if (state.settings.ticketmasterKey && (selectedTypes.has('concert') || selectedTypes.has('event'))) {
    if (selectedTypes.has('concert')) {
      const concerts = state.discoverPrefs.eventAutoLikedArtistCalendar === false
        ? []
        : await getNearbyTicketmasterConcerts({ includeInferred: false, startDate, endDate, artistLimit: 14 });
      for (const result of concerts) {
        entries.push({
          ...result,
          sourceType: 'concert',
          date: result.eventDate,
          calendarKind: 'Concert',
          calendarSecondary: [formatEventClock(result.eventTime || ''), result.venueName || result.city || '', result.recommendationReason || ''].filter(Boolean).join(' · ')
        });
      }
    }
    if (selectedTypes.has('event')) {
      const followed = await getFollowedTicketmasterEvents({ startDate, endDate, termLimit: 12 });
      for (const result of followed) {
        entries.push({
          ...result,
          sourceType: 'event',
          date: result.eventDate,
          calendarKind: 'Followed event',
          calendarSecondary: [formatEventClock(result.eventTime || ''), result.venueName || result.city || '', result.recommendationReason || ''].filter(Boolean).join(' · ')
        });
      }
    }
  }

  if (selectedTypes.has('movie')) {
    const region = String(state.settings.tmdbWatchRegion || state.discoverPrefs.eventCountry || 'CA').toUpperCase();
    const options = discoverTMDBOptions('movie', {
      afterDate: startDate,
      beforeDate: endDate,
      dateField: 'release',
      region,
      releaseTypes: '2|3|4',
      sortBy: 'popularity.desc',
      minVotes: 0
    });
    for (let page = 1; page <= 5; page += 1) {
      const key = `${discoverCalendarCachePrefix()}movies:${region}:${state.discoverPrefs.genre || 'all'}:${page}`;
      const data = await getCached(key, () => TrackerAPI.getTMDBDiscover('movie', page, state.settings, options));
      for (const result of data?.results || []) {
        const date = String(result.raw?.release_date || '').slice(0, 10);
        if (!date || date < startDate || date > endDate || !discoverResultMatchesGenre(result)) continue;
        entries.push({
          ...result,
          sourceType: 'movie',
          date,
          calendarKind: 'Movie release',
          calendarSecondary: 'Release'
        });
      }
      if (page >= Number(data?.totalPages || 1)) break;
    }
  }

  if (selectedTypes.has('tv')) {
    const options = discoverTMDBOptions('tv', {
      afterDate: startDate,
      beforeDate: endDate,
      sortBy: 'popularity.desc',
      minVotes: 0
    });
    for (let page = 1; page <= 4; page += 1) {
      const key = `${discoverCalendarCachePrefix()}tv-premieres:${state.discoverPrefs.genre || 'all'}:${state.discoverPrefs.englishTVOnly ? 'en' : 'any'}:${page}`;
      const data = await getCached(key, () => TrackerAPI.getTMDBDiscover('tv', page, state.settings, options));
      for (const result of data?.results || []) {
        const date = String(result.raw?.first_air_date || '').slice(0, 10);
        if (!date || date < startDate || date > endDate || !discoverResultMatchesGenre(result)) continue;
        entries.push({
          ...result,
          sourceType: 'tv',
          date,
          calendarKind: 'TV premiere',
          calendarSecondary: 'Series premiere'
        });
      }
      if (page >= Number(data?.totalPages || 1)) break;
    }

    const tracked = state.items.filter(item => getSourceType(item) === 'tv' && item.providerId && item.watchDisposition !== 'stopped' && item.watchDisposition !== 'watch-later');
    for (let start = 0; start < tracked.length; start += 5) {
      const batch = tracked.slice(start, start + 5);
      const resolved = await Promise.allSettled(batch.map(async item => {
        const key = `${discoverCalendarCachePrefix()}tracked-tv:${item.providerId}`;
        const details = await getCached(key, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
        return { item, details };
      }));
      for (const settled of resolved) {
        if (settled.status !== 'fulfilled') continue;
        const { item, details } = settled.value;
        const next = details?.next_episode_to_air;
        const date = String(next?.air_date || '').slice(0, 10);
        if (!date || date < startDate || date > endDate) continue;
        const result = {
          sourceType: 'tv',
          provider: 'tmdb',
          providerId: String(item.providerId),
          title: details?.name || item.title || 'TV show',
          subtitle: String(details?.first_air_date || item.subtitle || '').slice(0, 4),
          image: details?.poster_path ? TrackerAPI.tmdbImage(details.poster_path) : (item.image || ''),
          description: details?.overview || '',
          rating: details?.vote_average || 0,
          raw: { ...details, genre_ids: (details?.genres || []).map(genre => genre.id) }
        };
        if (!discoverResultMatchesGenre(result)) continue;
        const episodeLabel = `S${Number(next.season_number || 0)} E${Number(next.episode_number || 0)}`;
        entries.push({
          ...result,
          date,
          calendarKind: 'Next episode',
          calendarSecondary: `${episodeLabel}${next.name ? ` · ${next.name}` : ''}`,
          calendarEpisode: { season: Number(next.season_number || 0), episode: Number(next.episode_number || 0) }
        });
      }
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const entry of entries) {
    const episode = entry.calendarEpisode ? `:${entry.calendarEpisode.season}:${entry.calendarEpisode.episode}` : '';
    const key = `${entry.sourceType}:${entry.providerId}:${entry.date}:${entry.calendarKind}${episode}`;
    if (!entry.date || seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped.sort((a, b) => String(a.date).localeCompare(String(b.date)) || discoverCalendarTypeOrder(a.sourceType) - discoverCalendarTypeOrder(b.sourceType) || String(a.title || '').localeCompare(String(b.title || '')));
}

function discoverCalendarTypeOrder(type) {
  return type === 'concert' || type === 'event' ? 0 : type === 'movie' ? 1 : 2;
}

function renderDiscoverCalendarGrid(entries) {
  if (!els.discoverCalendarGrid) return;
  const { monthDate } = discoverCalendarBounds();
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);
  const lastOffset = (7 - ((last.getDay() + 6) % 7) - 1 + 7) % 7;
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + lastOffset);
  const byDate = new Map();
  for (const entry of entries || []) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, []);
    byDate.get(entry.date).push(entry);
  }

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let html = weekdays.map(day => `<div class="discover-calendar-weekday">${day}</div>`).join('');
  const cursor = new Date(gridStart);
  const today = todayString();
  const currentMonth = monthDate.getMonth();
  while (cursor <= gridEnd) {
    const date = localDateString(cursor);
    const dayEntries = byDate.get(date) || [];
    const expanded = state.discoverCalendarExpandedDays.has(date);
    const limit = expanded ? dayEntries.length : 4;
    const visible = dayEntries.slice(0, limit);
    const outside = cursor.getMonth() !== currentMonth;
    html += `<div class="discover-calendar-day${outside ? ' is-outside' : ''}${date === today ? ' is-today' : ''}" data-discover-calendar-date="${escapeAttr(date)}">
      <div class="discover-calendar-day-number"><span>${cursor.getDate()}</span>${date === today ? '<small>Today</small>' : ''}</div>
      <div class="discover-calendar-day-items">
        ${visible.map(discoverCalendarEntryMarkup).join('')}
        ${!expanded && dayEntries.length > limit ? `<button class="discover-calendar-more" type="button" data-discover-calendar-expand="${escapeAttr(date)}">+${dayEntries.length - limit} more</button>` : ''}
        ${expanded && dayEntries.length > 4 ? `<button class="discover-calendar-more" type="button" data-discover-calendar-collapse="${escapeAttr(date)}">Show less</button>` : ''}
      </div>
    </div>`;
    cursor.setDate(cursor.getDate() + 1);
  }
  els.discoverCalendarGrid.innerHTML = html;
}

function discoverCalendarEntryMarkup(entry) {
  const key = rememberDiscoverResult(entry, entry.sourceType);
  const typeLabel = entry.sourceType === 'concert' ? 'Concert' : entry.sourceType === 'event' ? 'Event' : entry.sourceType === 'movie' ? 'Movie' : 'TV';
  const secondary = entry.calendarSecondary || entry.calendarKind || '';
  return `<button class="discover-calendar-entry ${escapeAttr(entry.sourceType)}" type="button" data-discover-calendar-key="${escapeAttr(key)}"${entry.calendarEpisode ? ` data-discover-calendar-season="${entry.calendarEpisode.season}" data-discover-calendar-episode="${entry.calendarEpisode.episode}"` : ''}>
    <span class="discover-calendar-entry-type">${escapeHtml(typeLabel)} · ${escapeHtml(entry.calendarKind || '')}</span>
    <strong>${escapeHtml(entry.title || 'Untitled')}</strong>
    ${secondary ? `<small>${escapeHtml(secondary)}</small>` : ''}
  </button>`;
}

async function handleDiscoverCalendarClick(event) {
  const expand = event.target.closest('[data-discover-calendar-expand]');
  if (expand) {
    state.discoverCalendarExpandedDays.add(expand.dataset.discoverCalendarExpand);
    renderDiscoverCalendarGrid(state.discoverCalendarEntries);
    return;
  }
  const collapse = event.target.closest('[data-discover-calendar-collapse]');
  if (collapse) {
    state.discoverCalendarExpandedDays.delete(collapse.dataset.discoverCalendarCollapse);
    renderDiscoverCalendarGrid(state.discoverCalendarEntries);
    return;
  }
  const button = event.target.closest('[data-discover-calendar-key]');
  if (!button) return;
  const key = button.dataset.discoverCalendarKey;
  const season = Number(button.dataset.discoverCalendarSeason || 0);
  const episode = Number(button.dataset.discoverCalendarEpisode || 0);
  if (season && episode) {
    state.openDiscoverKey = key;
    showDialogAtTop(els.detailModal);
    els.detailBody.innerHTML = '<p class="loading-detail">Loading episode…</p>';
    try {
      await renderDiscoverTVEpisodeDetail(key, season, episode);
    } catch (error) {
      els.detailBody.innerHTML = `<div class="api-error">${escapeHtml(error.message)}</div>`;
    }
    return;
  }
  await openDiscoverDetail(key);
}

async function renderLegacyDiscover(force = false) {
  els.discoverStatus.hidden = false;
  els.discoverStatus.textContent = 'Loading recommendations…';
  if (force) {
    for (const key of Object.keys(state.cache)) {
      if (key.startsWith('discover:')) delete state.cache[key];
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state.cache)); } catch {}
  }

  try {
    const [rawTV, rawMovies, rawBooks] = await Promise.all([
      getCached('discover:trending:tv', () => TrackerAPI.getTrending('tv', state.settings)),
      getCached('discover:trending:movie', () => TrackerAPI.getTrending('movie', state.settings)),
      getCached('discover:new:books', () => TrackerAPI.getNewBooks(state.settings))
    ]);

    const readAuthors = getReadAuthors();
    const tv = await prioritizeByStreaming(filterAlreadyKnown(rawTV, 'tv'), 'tv');
    const movies = await prioritizeByStreaming(filterAlreadyKnown(rawMovies, 'movie'), 'movie');
    const books = prioritizeBooksByAuthors(filterAlreadyKnown(rawBooks, 'book'), readAuthors);

    renderDiscoverGrid(els.discoverTrendingTV, tv, 'tv');
    renderDiscoverGrid(els.discoverTrendingMovies, movies, 'movie');
    renderDiscoverGrid(els.discoverNewBooks, books, 'book');
    await renderPersonalRecommendations(readAuthors);
    els.discoverStatus.hidden = true;
  } catch (error) {
    els.discoverStatus.hidden = false;
    els.discoverStatus.textContent = `Discover could not load: ${error.message}`;
  }
}

function resetDiscoverFeed(clearApiCache = false) {
  if (clearApiCache) {
    for (const key of Object.keys(state.cache)) {
      if (key.startsWith('discover:feed:') || key.startsWith('discover:recommend:') || key.startsWith('discover:author:')) delete state.cache[key];
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state.cache)); } catch {}
  }

  state.discoverFeedItems = [];
  state.discoverFeedSeen = new Set();
  state.discoverFeedPage = 0;
  state.discoverFeedLoading = false;
  state.discoverFeedDone = false;
  state.discoverFeedInitialized = true;
  state.discoverFeedEmptyPasses = 0;
  state.discoverFeedSession = Math.random();
  const exploratory = state.discoverMode === 'for-you';
  state.discoverFeedOffsets = {
    tv: exploratory ? 1 + Math.floor(Math.random() * 3) : 1,
    movie: exploratory ? 1 + Math.floor(Math.random() * 3) : 1,
    book: exploratory ? Math.floor(Math.random() * 3) : 0
  };
  state.discoverResults.clear();
  if (els.discoverFeed) els.discoverFeed.innerHTML = '';
  if (els.discoverStatus) {
    els.discoverStatus.hidden = false;
    els.discoverStatus.textContent = discoverLoadingLabel(false);
  }
  if (els.discoverFeedMessage) els.discoverFeedMessage.textContent = discoverEndlessLabel();
}

function setupDiscoverInfiniteScroll() {
  if (!els.discoverFeedSentinel || discoverFeedObserver) return;
  discoverFeedObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) loadMoreDiscoverFeed();
  }, { rootMargin: '900px 0px 900px 0px', threshold: 0.01 });
  discoverFeedObserver.observe(els.discoverFeedSentinel);
}

async function loadMoreDiscoverFeed() {
  if (!els.discoverFeed || state.discoverFeedLoading || state.discoverFeedDone) return;
  state.discoverFeedLoading = true;
  state.discoverFeedPage += 1;
  const batchNumber = state.discoverFeedPage;

  if (els.discoverStatus) {
    els.discoverStatus.hidden = false;
    els.discoverStatus.textContent = discoverLoadingLabel(Boolean(state.discoverFeedItems.length));
  }
  els.discoverFeedSentinel?.classList.add('is-loading');

  try {
    const candidates = await collectDiscoverFeedCandidates(batchNumber);
    const requestedContentTypes = normalizedDiscoverContentTypes();
    const selectedContentTypes = new Set(requestedContentTypes);
    musicDiscoverDebug('feed candidates collected', {
      mode: state.discoverMode,
      batchNumber,
      requestedContentTypes,
      total: candidates.length,
      byType: musicDiscoverTypeCounts(candidates)
    });
    const fresh = candidates.filter(result => {
      const key = discoverResultIdentity(result);
      if (!key || state.discoverFeedSeen.has(key) || findDiscoverItem(result)) return false;
      if (!selectedContentTypes.has(result.sourceType || '')) return false;
      if (state.discoverPrefs.englishTVOnly === true && (result.sourceType || '') === 'tv') {
        if (String(result.raw?.original_language || '').toLowerCase() !== 'en') return false;
      }
      return discoverResultMatchesGenre(result);
    });

    const dedicatedMusicView = requestedContentTypes.length > 0 && requestedContentTypes.every(type => ['artist', 'song', 'music'].includes(type));
    const batchSize = state.discoverMode === 'new'
      ? (window.matchMedia('(max-width: 760px)').matches ? 30 : 60)
      : dedicatedMusicView
        ? (window.matchMedia('(max-width: 760px)').matches ? 18 : 28)
        : (window.matchMedia('(max-width: 760px)').matches ? 12 : 20);
    let ranked = await rankDiscoverFeedCandidates(fresh, batchSize);
    ranked = diversifyDiscoverFeed(ranked).slice(0, batchSize);
    musicDiscoverDebug('feed batch ranked', {
      mode: state.discoverMode,
      batchNumber,
      requestedContentTypes,
      fresh: fresh.length,
      requestedBatchSize: batchSize,
      rendered: ranked.length,
      byType: musicDiscoverTypeCounts(ranked)
    });

    if (!ranked.length) {
      state.discoverFeedEmptyPasses += 1;
      if (state.discoverFeedEmptyPasses >= 3) {
        state.discoverFeedDone = true;
        if (els.discoverFeedMessage) els.discoverFeedMessage.textContent = 'End of results';
      }
    } else {
      state.discoverFeedEmptyPasses = 0;
      for (const result of ranked) {
        state.discoverFeedSeen.add(discoverResultIdentity(result));
        state.discoverFeedItems.push(result);
      }
      if (state.discoverMode === 'new' && !state.discoverSearchQuery) renderDiscoverFeedItems();
      else appendDiscoverFeedItems(ranked);
      if (els.discoverFeedMessage) els.discoverFeedMessage.textContent = discoverEndlessLabel();
    }

    if (els.discoverStatus) els.discoverStatus.hidden = true;
  } catch (error) {
    if (els.discoverStatus) {
      els.discoverStatus.hidden = false;
      els.discoverStatus.textContent = `Discover could not load more: ${error.message}`;
    }
  } finally {
    state.discoverFeedLoading = false;
    els.discoverFeedSentinel?.classList.remove('is-loading');
  }
}

const MUSIC_DISCOVERY_TERMS = [
  'pop', 'rock', 'alternative', 'indie', 'indie rock', 'alternative rock', 'art pop',
  'dream pop', 'shoegaze', 'post punk', 'synthpop', 'hip hop', 'rap', 'r&b',
  'electronic', 'house', 'techno', 'ambient', 'dance', 'jazz', 'blues', 'funk',
  'soul', 'country', 'folk', 'americana', 'singer songwriter', 'metal', 'punk',
  'classical', 'soundtrack', 'reggae', 'latin', 'afrobeat', 'k-pop', 'j-pop',
  'gospel', 'world', 'experimental', 'acoustic'
];

const MUSIC_DISCOVER_DEBUG = true;

function musicDiscoverTypeCounts(results) {
  return (results || []).reduce((counts, result) => {
    const type = result?.sourceType || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
}

function musicDiscoverDebug(label, details = {}) {
  if (!MUSIC_DISCOVER_DEBUG) return;
  console.log(`[Discover][Music] ${label}`, details);
}

function musicDiscoverWarn(label, details = {}) {
  console.warn(`[Discover][Music] ${label}`, details);
}

function musicTasteDiscoveryTerms() {
  const terms = [];
  for (const item of state.items) {
    if (!['music','artist','song'].includes(getSourceType(item))) continue;
    const rawGenre = item.raw?.primaryGenreName || item.genres?.[0] || item.description || '';
    const genre = String(rawGenre || '').split('·').at(-1)?.trim().toLowerCase() || '';
    if (genre && genre !== 'music' && genre.length < 40) terms.push(genre);
  }
  return [...new Set(terms)];
}

function rotatingMusicDiscoveryTerms(batchNumber, count = 2, includeTaste = true) {
  const taste = includeTaste ? musicTasteDiscoveryTerms() : [];
  const pool = [...taste, ...MUSIC_DISCOVERY_TERMS];
  const unique = [...new Set(pool.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return ['pop', 'rock'].slice(0, count);
  const start = ((Math.max(1, batchNumber) - 1) * count + Math.floor(state.discoverFeedSession * unique.length)) % unique.length;
  return Array.from({ length: Math.min(count, unique.length) }, (_, index) => unique[(start + index) % unique.length]);
}

function ticketmasterDiscoverSourceType(result) {
  const music = (result?.classifications || []).some(value => String(value || '').toLowerCase() === 'music');
  return music ? 'concert' : 'event';
}

function asLiveDiscoverCandidate(result, source, boost = 0, exploration = false) {
  return {
    ...result,
    sourceType: ticketmasterDiscoverSourceType(result),
    _discoverSource: source,
    _discoverBoost: boost,
    _discoverExploration: Boolean(exploration)
  };
}

async function collectDiscoverFeedCandidates(batchNumber) {
  const selectedTypes = normalizedDiscoverContentTypes();
  const selected = new Set(selectedTypes);
  const musicOnly = selectedTypes.length > 0 && selectedTypes.every(type => ['music', 'artist', 'song'].includes(type));

  // When every selected category is music-related, bypass unrelated catalogue
  // collectors and use the richer Last.fm/iTunes music engine directly.
  if (musicOnly) {
    const mode = state.discoverMode === 'new' ? 'new' : state.discoverMode === 'popular' ? 'popular' : 'for-you';
    const music = await collectMusicDiscoverCandidates(batchNumber, mode);
    const filtered = music.filter(result => selected.has(result.sourceType));
    musicDiscoverDebug('dedicated music view candidates', {
      mode,
      batchNumber,
      selectedTypes,
      totalMusicPool: music.length,
      matchingType: filtered.length
    });
    return dedupeDiscoverCandidatesByBoost(filtered);
  }

  if (selectedTypes.length === 1 && selected.has('restaurant')) {
    return collectRestaurantDiscoverCandidates(batchNumber, state.discoverMode);
  }

  let candidates;
  if (state.discoverMode === 'new') candidates = await collectNewDiscoverCandidates(batchNumber);
  else if (state.discoverMode === 'popular') candidates = await collectPopularDiscoverCandidates(batchNumber);
  else candidates = await collectForYouDiscoverCandidates(batchNumber);

  return dedupeDiscoverCandidatesByBoost(candidates.filter(result => selected.has(result.sourceType)));
}

function musicRecommendationSeedScore(item) {
  if (!item) return 0;
  const rating = Math.max(0, Number(item.rating || 0));
  const recommended = item.recommended ? 7 : 0;
  const consumed = item.completedAt || item.date ? 2 : 0;
  const updated = Date.parse(item.updatedAt || item.createdAt || '') || 0;
  const recency = updated ? Math.max(0, 2.5 - (Date.now() - updated) / (1000 * 60 * 60 * 24 * 180)) : 0;
  return recommended + rating * 1.6 + consumed + recency;
}

function savedMusicSongSeeds() {
  return state.items
    .filter(item => getSourceType(item) === 'song' && item.title)
    .map(item => ({
      item,
      artistName: String(item.artistName || item.raw?.artistName || item.subtitle || '').split(' · ')[0].trim(),
      trackName: item.title,
      score: musicRecommendationSeedScore(item)
    }))
    .filter(seed => seed.artistName && seed.trackName)
    .sort((a,b) => b.score - a.score);
}

function rotatedSlice(values, batchNumber, count) {
  if (!values?.length || count <= 0) return [];
  const start = ((Math.max(1, batchNumber) - 1) * count) % values.length;
  return Array.from({ length: Math.min(count, values.length) }, (_, index) => values[(start + index) % values.length]);
}

async function itunesAlbumsForArtistName(artistName) {
  const key = normalizeArtistName(artistName);
  const albums = await getCached(`itunes:lastfm:albums:${key}`, () => TrackerAPI.searchMusic(artistName, state.settings));
  return (albums || []).filter(album => normalizeArtistName(album.artistName || album.subtitle) === key);
}

async function resolveLastFmArtistCandidate(lastfmArtist) {
  const artistName = String(lastfmArtist?.name || '').trim();
  if (!artistName) return null;
  const normalized = normalizeArtistName(artistName);
  try {
    const albums = await itunesAlbumsForArtistName(artistName);
    const firstAlbum = albums[0];
    const artistId = String(firstAlbum?.artistId || firstAlbum?.raw?.artistId || '');
    if (artistId) {
      return {
        sourceType: 'artist',
        provider: 'itunes',
        providerId: artistId,
        artistId,
        artistName,
        title: artistName,
        subtitle: firstAlbum?.raw?.primaryGenreName || firstAlbum?.description || 'Artist',
        description: firstAlbum?.raw?.primaryGenreName || '',
        image: firstAlbum?.image || '',
        raw: {
          artistId,
          artistName,
          primaryGenreName: firstAlbum?.raw?.primaryGenreName || '',
          lastfmMbid: lastfmArtist?.mbid || '',
          lastfmMatch: Number(lastfmArtist?.match || 0)
        }
      };
    }
  } catch {}

  try {
    const artists = await getCached(`itunes:lastfm:artist:${normalized}`, () => TrackerAPI.searchArtists(artistName, state.settings));
    const exact = (artists || []).find(artist => normalizeArtistName(artist.title) === normalized);
    return exact || null;
  } catch {
    return null;
  }
}

async function resolveLastFmTrackCandidate(lastfmTrack) {
  const trackName = String(lastfmTrack?.name || '').trim();
  const artistName = String(lastfmTrack?.artistName || '').trim();
  if (!trackName || !artistName) return null;
  const trackKey = normalizeArtistName(trackName);
  const artistKey = normalizeArtistName(artistName);
  const cacheKey = `itunes:lastfm:track:${artistKey}:${trackKey}`;
  try {
    const songs = await getCached(cacheKey, () => TrackerAPI.searchSongs(`${trackName} ${artistName}`, state.settings));
    return (songs || []).find(song =>
      normalizeArtistName(song.title) === trackKey &&
      normalizeArtistName(song.artistName || song.subtitle) === artistKey
    ) || (songs || []).find(song =>
      normalizeArtistName(song.artistName || song.subtitle) === artistKey &&
      normalizeArtistName(song.title).includes(trackKey)
    ) || null;
  } catch {
    return null;
  }
}

function lastFmStableId(kind, parts = []) {
  const token = parts.map(value => normalizeArtistName(value)).filter(Boolean).join('::');
  return `lastfm:${kind}:${token}`;
}

function lastFmArtistDiscoverCandidate(lastfmArtist) {
  const artistName = String(lastfmArtist?.name || '').trim();
  if (!artistName) return null;
  return {
    sourceType: 'artist',
    provider: 'lastfm',
    providerId: lastFmStableId('artist', [artistName]),
    artistId: '',
    artistName,
    title: artistName,
    subtitle: 'Artist',
    description: '',
    image: lastfmArtist?.image || '',
    lastfmUrl: lastfmArtist?.url || '',
    raw: {
      lastfmMbid: lastfmArtist?.mbid || '',
      lastfmMatch: Number(lastfmArtist?.match || 0),
      lastfmUrl: lastfmArtist?.url || ''
    }
  };
}

function lastFmTrackDiscoverCandidate(lastfmTrack) {
  const trackName = String(lastfmTrack?.name || '').trim();
  const artistName = String(lastfmTrack?.artistName || '').trim();
  if (!trackName || !artistName) return null;
  return {
    sourceType: 'song',
    provider: 'lastfm',
    providerId: lastFmStableId('track', [artistName, trackName]),
    artistId: '',
    artistName,
    title: trackName,
    subtitle: artistName,
    albumName: '',
    description: '',
    image: lastfmTrack?.image || '',
    lastfmUrl: lastfmTrack?.url || '',
    releaseDate: '',
    raw: {
      artistName,
      lastfmMbid: lastfmTrack?.mbid || '',
      lastfmMatch: Number(lastfmTrack?.match || 0),
      lastfmUrl: lastfmTrack?.url || ''
    }
  };
}

async function collectLastFmResolvedArtists(lastfmArtists, limit = 6) {
  const knownNames = knownMusicArtistNameSet();
  const knownIds = new Set(state.items.filter(item => getSourceType(item) === 'artist').map(item => String(item.providerId || '')).filter(Boolean));
  const output = [];
  const seen = new Set();
  for (const artist of lastfmArtists || []) {
    const key = normalizeArtistName(artist?.name);
    if (!key || knownNames.has(key) || seen.has(key)) continue;
    seen.add(key);
    const candidate = lastFmArtistDiscoverCandidate(artist);
    if (!candidate || knownIds.has(String(candidate.providerId))) continue;
    output.push(candidate);
    if (output.length >= limit) break;
  }
  musicDiscoverDebug('Last.fm artist candidates mapped directly', {
    supplied: lastfmArtists?.length || 0,
    mapped: output.length,
    target: limit,
    iTunesRequests: 0
  });
  return output;
}

async function collectLastFmResolvedTracks(lastfmTracks, limit = 7) {
  const knownSignatures = new Set(state.items
    .filter(item => getSourceType(item) === 'song')
    .map(item => `${normalizeArtistName(item.artistName || item.raw?.artistName || item.subtitle)}::${normalizeArtistName(item.title)}`));
  const knownIds = new Set(state.items.filter(item => getSourceType(item) === 'song').map(item => String(item.providerId || '')).filter(Boolean));
  const output = [];
  const seen = new Set();
  for (const track of lastfmTracks || []) {
    const signature = `${normalizeArtistName(track?.artistName)}::${normalizeArtistName(track?.name)}`;
    if (!signature || signature === '::' || knownSignatures.has(signature) || seen.has(signature)) continue;
    seen.add(signature);
    const candidate = lastFmTrackDiscoverCandidate(track);
    if (!candidate || knownIds.has(String(candidate.providerId))) continue;
    output.push(candidate);
    if (output.length >= limit) break;
  }
  musicDiscoverDebug('Last.fm track candidates mapped directly', {
    supplied: lastfmTracks?.length || 0,
    mapped: output.length,
    target: limit,
    iTunesRequests: 0
  });
  return output;
}

async function collectMusicDiscoverCandidates(batchNumber, mode = 'for-you') {
  const personalized = mode === 'for-you';
  const includeArtists = mode !== 'new';
  const requestedContentTypes = normalizedDiscoverContentTypes();
  const dedicatedArtistView = requestedContentTypes.length === 1 && requestedContentTypes[0] === 'artist';
  const dedicatedSongView = requestedContentTypes.length === 1 && requestedContentTypes[0] === 'song';
  const dedicatedAlbumView = requestedContentTypes.length === 1 && requestedContentTypes[0] === 'music';
  const explicitArtists = explicitLikedArtistItems();
  const inferredNames = inferredMusicArtistNames();
  const knownArtistIds = new Set(state.items.filter(item => getSourceType(item) === 'artist').map(item => String(item.providerId || '')).filter(Boolean));
  const knownSongIds = new Set(state.items.filter(item => getSourceType(item) === 'song').map(item => String(item.providerId || '')).filter(Boolean));
  const knownAlbumIds = new Set(state.items.filter(item => getSourceType(item) === 'music').map(item => String(item.providerId || '')).filter(Boolean));
  const candidates = [];

  const addArtist = (artist, source, boost, exploration = false, extra = {}) => {
    if (!artist?.providerId || knownArtistIds.has(String(artist.providerId))) return;
    candidates.push({ ...artist, ...extra, sourceType: 'artist', _discoverSource: source, _discoverBoost: boost, _discoverExploration: exploration });
  };
  const addSong = (song, source, boost, exploration = false, extra = {}) => {
    if (!song?.providerId || knownSongIds.has(String(song.providerId))) return;
    candidates.push({ ...song, ...extra, sourceType: 'song', _discoverSource: source, _discoverBoost: boost, _discoverExploration: exploration });
  };
  const addAlbum = (album, source, boost, exploration = false, extra = {}) => {
    if (!album?.providerId || knownAlbumIds.has(String(album.providerId))) return;
    candidates.push({ ...album, ...extra, sourceType: 'music', _discoverSource: source, _discoverBoost: boost, _discoverExploration: exploration });
  };

  const tasteNames = [...new Map([
    ...explicitArtists
      .sort((a,b) => musicRecommendationSeedScore(b) - musicRecommendationSeedScore(a))
      .map(item => item.title),
    ...inferredNames
  ].map(name => [normalizeArtistName(name), name])).values()].filter(Boolean);

  musicDiscoverDebug('music collector start', {
    mode,
    batchNumber,
    requestedContentTypes,
    lastFmConfigured: Boolean(state.settings.lastfmApiKey),
    explicitArtistCount: explicitArtists.length,
    inferredArtistCount: inferredNames.length,
    tasteSeedCount: tasteNames.length,
    tasteSeeds: tasteNames.slice(0, 8)
  });

  // Keep a small amount of familiar material in For You, but it is no longer
  // the recommendation engine. Most new artists/tracks below come from Last.fm.
  if (personalized && tasteNames.length && !dedicatedArtistView && !dedicatedSongView) {
    const familiarArtist = rotatedSlice(tasteNames, batchNumber, 1)[0];
    if (familiarArtist) {
      try {
        const [albums, songs] = await Promise.all([
          getCached(`itunes:familiar:albums:${normalizeArtistName(familiarArtist)}`, () => TrackerAPI.searchMusic(familiarArtist, state.settings)),
          getCached(`itunes:familiar:songs:${normalizeArtistName(familiarArtist)}`, () => TrackerAPI.searchSongs(familiarArtist, state.settings))
        ]);
        (albums || []).filter(album => normalizeArtistName(album.artistName || album.subtitle) === normalizeArtistName(familiarArtist)).slice(0, 3)
          .forEach(album => addAlbum(album, 'familiar-artist-album', 7.5, false, { recommendationReason: `Album by ${familiarArtist}` }));
        (songs || []).filter(song => normalizeArtistName(song.artistName || song.subtitle) === normalizeArtistName(familiarArtist)).slice(0, 4)
          .forEach(song => addSong(song, 'familiar-artist-song', 7.5, false, { recommendationReason: `Song by ${familiarArtist}` }));
      } catch {}
    }
  }

  const hasLastFm = Boolean(state.settings.lastfmApiKey);

  if (hasLastFm && personalized) {
    // 1) Direct Last.fm similarity. Dedicated Artist view maps
    // a much larger pool directly without an iTunes request per artist and rotates across more saved/inferred artist seeds.
    const artistSeedCount = dedicatedArtistView ? Math.min(4, tasteNames.length) : Math.min(3, tasteNames.length);
    const artistSeeds = rotatedSlice(tasteNames, batchNumber, artistSeedCount);
    if (artistSeeds.length) {
      const similarSettled = await Promise.allSettled(artistSeeds.map(seed =>
        getCached(`lastfm:similar-artists:${normalizeArtistName(seed)}`, () => TrackerAPI.getLastFmSimilarArtists(seed, state.settings, 50))
      ));
      const similarArtists = [];
      for (let index = 0; index < similarSettled.length; index += 1) {
        const result = similarSettled[index];
        if (result.status === 'fulfilled') {
          musicDiscoverDebug('Last.fm similar artists returned', { seed: artistSeeds[index], count: result.value?.length || 0 });
          similarArtists.push(...(result.value || []));
        } else {
          musicDiscoverWarn('Last.fm similar artists failed', { seed: artistSeeds[index], error: result.reason?.message || String(result.reason || '') });
        }
      }
      similarArtists.sort((a,b) => Number(b.match || 0) - Number(a.match || 0));
      const similarArtistTarget = dedicatedArtistView ? 20 : 11;
      const resolvedArtists = await collectLastFmResolvedArtists(similarArtists, similarArtistTarget);
      for (let index = 0; index < resolvedArtists.length; index += 1) {
        const artist = resolvedArtists[index];
        const seedLabel = artistSeeds.length === 1 ? artistSeeds[0] : 'artists you like';
        addArtist(artist, 'lastfm-similar-artist', 11 - index * .22, false, { recommendationReason: `Similar to ${seedLabel}` });
        if (!dedicatedArtistView && !dedicatedSongView && index < 2) {
          try {
            const albums = await itunesAlbumsForArtistName(artist.title);
            (albums || []).slice(0, 1).forEach(album => addAlbum(album, 'lastfm-similar-artist-album', 7.2 - index * .12, true, { recommendationReason: `Album by related artist ${artist.title}` }));
          } catch (error) {
            musicDiscoverWarn('related artist album resolution failed', { artist: artist.title, error: error?.message || String(error) });
          }
        }
      }
    } else {
      musicDiscoverWarn('no artist seeds available for direct similarity', { requestedContentTypes, batchNumber });
    }

    // 2) Track-to-track similarity. Dedicated Song view maps more tracks directly and
    // rotates across two strong song seeds instead of one.
    const songSeeds = savedMusicSongSeeds();
    const selectedSongSeeds = rotatedSlice(songSeeds.slice(0, Math.max(12, Math.min(30, songSeeds.length))), batchNumber, dedicatedSongView ? 2 : 1);
    for (const songSeed of selectedSongSeeds) {
      try {
        const similarTracks = await getCached(
          `lastfm:similar-tracks:${normalizeArtistName(songSeed.artistName)}:${normalizeArtistName(songSeed.trackName)}`,
          () => TrackerAPI.getLastFmSimilarTracks(songSeed.artistName, songSeed.trackName, state.settings, 50)
        );
        musicDiscoverDebug('Last.fm similar tracks returned', { seed: `${songSeed.artistName} — ${songSeed.trackName}`, count: similarTracks?.length || 0 });
        const resolvedTracks = await collectLastFmResolvedTracks(similarTracks, dedicatedSongView ? 14 : 9);
        resolvedTracks.forEach((song, index) => addSong(
          song,
          'lastfm-similar-track',
          11 - index * .22,
          false,
          { recommendationReason: `Similar to ${songSeed.trackName}` }
        ));
      } catch (error) {
        musicDiscoverWarn('Last.fm similar tracks failed', { seed: `${songSeed.artistName} — ${songSeed.trackName}`, error: error?.message || String(error) });
      }
    }

    // 3) Tag discovery widens the pool beyond direct neighbours. Dedicated Artist
    // and Song views use multiple rotating tags and deeper resolution targets.
    const tagCount = dedicatedArtistView || dedicatedSongView ? 2 : 1;
    const discoveryTags = rotatingMusicDiscoveryTerms(batchNumber, tagCount, true);
    for (let tagIndex = 0; tagIndex < discoveryTags.length; tagIndex += 1) {
      const discoveryTag = discoveryTags[tagIndex];
      if (!discoveryTag) continue;
      try {
        const tagPage = 1 + ((Math.max(1, batchNumber) - 1 + tagIndex) % 5);
        const [tagArtists, tagTracks] = await Promise.all([
          getCached(`lastfm:tag-artists:${discoveryTag}:${tagPage}`, () => TrackerAPI.getLastFmTopArtistsByTag(discoveryTag, state.settings, 50, tagPage)),
          getCached(`lastfm:tag-tracks:${discoveryTag}:${tagPage}`, () => TrackerAPI.getLastFmTopTracksByTag(discoveryTag, state.settings, 50, tagPage))
        ]);
        musicDiscoverDebug('Last.fm tag pool returned', { tag: discoveryTag, page: tagPage, artists: tagArtists?.length || 0, tracks: tagTracks?.length || 0 });
        const [resolvedTagArtists, resolvedTagTracks] = await Promise.all([
          includeArtists ? collectLastFmResolvedArtists(tagArtists, dedicatedArtistView ? 12 : 6) : [],
          collectLastFmResolvedTracks(tagTracks, dedicatedSongView ? 12 : 6)
        ]);
        resolvedTagArtists.forEach((artist, index) => addArtist(
          artist,
          'lastfm-tag-artist',
          6.8 - index * .13,
          true,
          { recommendationReason: `Explore ${discoveryTag}` }
        ));
        resolvedTagTracks.forEach((song, index) => addSong(
          song,
          'lastfm-tag-track',
          6.6 - index * .12,
          true,
          { recommendationReason: `Explore ${discoveryTag}` }
        ));
      } catch (error) {
        musicDiscoverWarn('Last.fm tag discovery failed', { tag: discoveryTag, error: error?.message || String(error) });
      }
    }

    // 4) Global Last.fm charts provide a guaranteed exploration source when the
    // user's Library is small or similar-artist resolution is sparse.
    if (dedicatedArtistView || dedicatedSongView || tasteNames.length < 2) {
      try {
        const chartPage = 1 + ((Math.max(1, batchNumber) - 1) % 6);
        const [chartArtists, chartTracks] = await Promise.all([
          getCached(`lastfm:chart-artists:${chartPage}`, () => TrackerAPI.getLastFmChartTopArtists(state.settings, 50, chartPage)),
          getCached(`lastfm:chart-tracks:${chartPage}`, () => TrackerAPI.getLastFmChartTopTracks(state.settings, 50, chartPage))
        ]);
        const [resolvedChartArtists, resolvedChartTracks] = await Promise.all([
          includeArtists ? collectLastFmResolvedArtists(chartArtists, dedicatedArtistView ? 10 : 5) : [],
          collectLastFmResolvedTracks(chartTracks, dedicatedSongView ? 10 : 5)
        ]);
        resolvedChartArtists.forEach((artist, index) => addArtist(artist, 'lastfm-chart-explore', 5.4 - index * .08, true, { recommendationReason: 'Popular on Last.fm' }));
        resolvedChartTracks.forEach((song, index) => addSong(song, 'lastfm-chart-explore', 5.3 - index * .08, true, { recommendationReason: 'Popular on Last.fm' }));
        musicDiscoverDebug('Last.fm chart exploration resolved', { page: chartPage, artists: resolvedChartArtists.length, tracks: resolvedChartTracks.length });
      } catch (error) {
        musicDiscoverWarn('Last.fm chart exploration failed', { error: error?.message || String(error) });
      }
    }
  } else if (hasLastFm && mode === 'popular') {

    // Popular music should be genuinely broad/global rather than personalized.
    try {
      const page = 1 + ((Math.max(1, batchNumber) - 1) % 4);
      const [topArtists, topTracks] = await Promise.all([
        getCached(`lastfm:chart-artists:${page}`, () => TrackerAPI.getLastFmChartTopArtists(state.settings, 30, page)),
        getCached(`lastfm:chart-tracks:${page}`, () => TrackerAPI.getLastFmChartTopTracks(state.settings, 30, page))
      ]);
      const [resolvedArtists, resolvedTracks] = await Promise.all([
        includeArtists ? collectLastFmResolvedArtists(topArtists, 8) : [],
        collectLastFmResolvedTracks(topTracks, 10)
      ]);
      resolvedArtists.forEach((artist, index) => addArtist(artist, 'lastfm-popular-artist', 7.5 - index * .18, false, { recommendationReason: 'Popular on Last.fm' }));
      resolvedTracks.forEach((song, index) => addSong(song, 'lastfm-popular-track', 7.5 - index * .15, false, { recommendationReason: 'Popular on Last.fm' }));
      for (const [index, artist] of resolvedArtists.slice(0, 2).entries()) {
        try {
          const albums = await itunesAlbumsForArtistName(artist.title);
          if (albums?.[0]) addAlbum(albums[0], 'lastfm-popular-album', 6.8 - index * .16, false, { recommendationReason: `Popular artist · ${artist.title}` });
        } catch {}
      }
    } catch {}
  }

  // The free iTunes Search API remains the fallback and the release-date source
  // for New. With Last.fm configured, For You/Popular no longer depend on these
  // loose genre text searches for artist/track recommendations.
  const currentTypeCounts = musicDiscoverTypeCounts(dedupeDiscoverCandidatesByBoost(candidates));
  const sparseDedicatedArtistView = dedicatedArtistView && Number(currentTypeCounts.artist || 0) < 18;
  const sparseDedicatedSongView = dedicatedSongView && Number(currentTypeCounts.song || 0) < 18;
  if (!hasLastFm || mode === 'new' || sparseDedicatedArtistView || sparseDedicatedSongView) {
    if (hasLastFm && (sparseDedicatedArtistView || sparseDedicatedSongView)) {
      musicDiscoverWarn('Last.fm pool sparse; enabling iTunes supplemental fallback', {
        requestedContentTypes,
        artistCandidates: currentTypeCounts.artist || 0,
        songCandidates: currentTypeCounts.song || 0
      });
    }
    const broadTerms = rotatingMusicDiscoveryTerms(batchNumber, mode === 'for-you' ? (dedicatedArtistView || dedicatedSongView ? 2 : 1) : 2, personalized);
    for (const term of broadTerms) {
      try {
        const [albums, songs] = await Promise.all([
          getCached(`itunes:discover:albums:${term}`, () => TrackerAPI.searchMusic(term, state.settings)),
          getCached(`itunes:discover:songs:${term}`, () => TrackerAPI.searchSongs(term, state.settings))
        ]);
        const broadBoost = mode === 'popular' ? 5 : mode === 'new' ? 3 : 4;
        if (includeArtists) {
          const artistSources = [...(songs || []), ...(albums || [])];
          const seenBroadArtists = new Set();
          for (const source of artistSources) {
            const artistId = String(source.artistId || source.raw?.artistId || '');
            const artistName = String(source.artistName || source.subtitle || '').trim();
            if (!artistId || !artistName || seenBroadArtists.has(artistId)) continue;
            seenBroadArtists.add(artistId);
            addArtist({
              sourceType: 'artist',
              provider: 'itunes',
              providerId: artistId,
              artistId,
              artistName,
              title: artistName,
              subtitle: source.raw?.primaryGenreName || source.description || 'Artist',
              description: source.raw?.primaryGenreName || '',
              image: source.image || '',
              raw: { artistId, artistName, primaryGenreName: source.raw?.primaryGenreName || '' }
            }, mode === 'popular' ? 'music-popular' : 'music-explore', broadBoost + 1.5, mode === 'for-you', {
              recommendationReason: mode === 'for-you' ? `Explore ${term}` : ''
            });
            if (seenBroadArtists.size >= 12) break;
          }
        }
        (albums || []).slice(0, 12).forEach((album, index) => addAlbum(
          album,
          mode === 'popular' ? 'music-popular' : mode === 'new' ? 'music-new' : 'music-explore',
          broadBoost + Math.max(0, 2 - index * .12),
          mode === 'for-you',
          { recommendationReason: mode === 'for-you' ? `Explore ${term}` : '' }
        ));
        (songs || []).slice(0, 18).forEach((song, index) => addSong(
          song,
          mode === 'popular' ? 'music-popular' : mode === 'new' ? 'music-new' : 'music-explore',
          broadBoost + Math.max(0, 2 - index * .08),
          mode === 'for-you',
          { recommendationReason: mode === 'for-you' ? `Explore ${term}` : '' }
        ));
      } catch {}
    }
  }

  // Last.fm is the primary related-artist engine now. Ticketmaster still drives
  // concerts elsewhere, so no extra Ticketmaster -> artist text-resolution calls
  // are needed here when Last.fm is configured.
  if (!hasLastFm && personalized && state.settings.ticketmasterKey) {
    try {
      const relatedAttractions = await getRelatedMusicAttractions(batchNumber, 5);
      for (const attraction of relatedAttractions.slice(0, 3)) {
        try {
          const artist = await resolveLastFmArtistCandidate({ name: attraction.title });
          if (artist) addArtist(artist, 'ticketmaster-related-artist', 7.5, true, {
            image: artist.image || attraction.image || '',
            recommendationReason: attraction.relatedGenre && attraction.relatedGenre !== 'Music' ? `Related ${attraction.relatedGenre} artist` : 'Related artist'
          });
        } catch {}
      }
    } catch {}
  }

  const dedupedMusicCandidates = dedupeDiscoverCandidatesByBoost(candidates);
  musicDiscoverDebug('music collector complete', {
    mode,
    batchNumber,
    requestedContentTypes,
    total: dedupedMusicCandidates.length,
    byType: musicDiscoverTypeCounts(dedupedMusicCandidates)
  });
  return dedupedMusicCandidates;
}

async function collectShuffledDiscoverCandidates(batchNumber) {
  const selectedProviders = (state.discoverPrefs.streamingProviderIds || []).map(String).filter(Boolean);
  const tvPage = Math.min(500, state.discoverFeedOffsets.tv + batchNumber - 1);
  const moviePage = Math.min(500, state.discoverFeedOffsets.movie + batchNumber - 1);
  const bookStart = (state.discoverFeedOffsets.book + batchNumber - 1) * DISCOVER_BOOK_BATCH_SIZE;
  const readAuthors = getReadAuthors();
  const bookPlan = chooseDiscoverBookPlan(readAuthors, batchNumber);

  const tasks = [
    TrackerAPI.getTMDBDiscover('tv', tvPage, state.settings, discoverTMDBOptions('tv')),
    TrackerAPI.getTMDBDiscover('movie', moviePage, state.settings, discoverTMDBOptions('movie')),
    TrackerAPI.getBookFeed(bookStart, state.settings, discoverBookOptions(bookPlan))
  ];

  if (selectedProviders.length) {
    // Pull a parallel catalogue slice from services the user actually has. This
    // is a boost, not a filter: the general catalogue above still supplies variety.
    const providerPage = 1 + ((batchNumber + Math.floor(state.discoverFeedSession * 7)) % 6);
    tasks.push(TrackerAPI.getTMDBDiscover('tv', providerPage, state.settings, discoverTMDBOptions('tv', { providerIds: selectedProviders })));
    tasks.push(TrackerAPI.getTMDBDiscover('movie', providerPage, state.settings, discoverTMDBOptions('movie', { providerIds: selectedProviders })));
  }

  const settled = await Promise.allSettled(tasks);
  const candidates = [];
  const add = (results, sourceType, source, boost = 0) => {
    for (const result of results || []) {
      candidates.push({ ...result, sourceType: result.sourceType || sourceType, _discoverSource: source, _discoverBoost: boost });
    }
  };

  const generalTV = settled[0].status === 'fulfilled' ? settled[0].value.results : [];
  const generalMovies = settled[1].status === 'fulfilled' ? settled[1].value.results : [];
  const generalBooks = settled[2].status === 'fulfilled' ? settled[2].value.results : [];
  add(filterAlreadyKnown(generalTV, 'tv'), 'tv', 'catalogue', 0);
  add(filterAlreadyKnown(generalMovies, 'movie'), 'movie', 'catalogue', 0);
  add(filterAlreadyKnown(generalBooks, 'book'), 'book', bookPlan.personalized ? 'personal-book' : 'books', bookPlan.personalized ? 5 : 1);

  let taskIndex = 3;
  if (selectedProviders.length) {
    const preferredTV = settled[taskIndex++]?.status === 'fulfilled' ? settled[taskIndex - 1].value.results : [];
    const preferredMovies = settled[taskIndex++]?.status === 'fulfilled' ? settled[taskIndex - 1].value.results : [];
    add(filterAlreadyKnown(preferredTV, 'tv'), 'tv', 'preferred-streaming', 7);
    add(filterAlreadyKnown(preferredMovies, 'movie'), 'movie', 'preferred-streaming', 7);
  }

  // Rotate through different things the user has consumed instead of anchoring
  // the page to the same single seed on every visit.
  const seedType = batchNumber % 2 === 0 ? 'movie' : 'tv';
  const seed = pickDiscoverSeed(seedType);
  if (seed?.providerId) {
    try {
      const recommendationPage = 1 + ((batchNumber - 1) % 3);
      const recs = await getCached(
        `discover:feed:recommend:${seedType}:${seed.providerId}:${recommendationPage}`,
        () => TrackerAPI.getTMDBRecommendations(seedType, seed.providerId, state.settings, recommendationPage)
      );
      add(filterAlreadyKnown(recs, seedType), seedType, 'personal', 7);
    } catch {}
  }

  const bookSeed = pickDiscoverSeed('book');
  if (bookSeed?.providerId && batchNumber % 2 === 1) {
    try {
      const recs = await getCached(
        `discover:feed:recommend:book:${bookSeed.providerId}`,
        () => TrackerAPI.getBookRecommendations(bookSeed.providerId, state.settings)
      );
      add(filterAlreadyKnown(recs, 'book'), 'book', 'personal', 7);
    } catch {}
  }

  // A little current material near the top of each new mix, without making the
  // whole feed the same trending page every time.
  if (batchNumber === 1) {
    const current = await Promise.allSettled([
      getCached('discover:trending:tv', () => TrackerAPI.getTrending('tv', state.settings)),
      getCached('discover:trending:movie', () => TrackerAPI.getTrending('movie', state.settings)),
      getCached('discover:new:books', () => TrackerAPI.getNewBooks(state.settings))
    ]);
    if (current[0].status === 'fulfilled') add(filterAlreadyKnown(current[0].value, 'tv'), 'tv', 'trending', 3);
    if (current[1].status === 'fulfilled') add(filterAlreadyKnown(current[1].value, 'movie'), 'movie', 'trending', 3);
    if (current[2].status === 'fulfilled') add(filterAlreadyKnown(current[2].value, 'book'), 'book', 'new', 2);
  }

  return dedupeDiscoverCandidatesByBoost(candidates);
}

async function annotateLatestTVEpisodeDates(results) {
  return Promise.all((results || []).map(async result => {
    if (result.sourceType !== 'tv' || !result.providerId) return result;
    try {
      const details = await getCached(`tv:${result.providerId}`, () => TrackerAPI.getTVDetails(result.providerId, state.settings));
      const latestEpisodeDate = details.last_episode_to_air?.air_date || details.last_air_date || result.raw?.first_air_date || '';
      const nextEpisodeDate = details.next_episode_to_air?.air_date || '';
      const today = todayString();
      const newReleaseDate = nextEpisodeDate && nextEpisodeDate >= today ? nextEpisodeDate : latestEpisodeDate;
      return { ...result, latestEpisodeDate, nextEpisodeDate, newReleaseDate, _discoverLatestDate: newReleaseDate || latestEpisodeDate };
    } catch {
      const fallback = result.raw?.first_air_date || '';
      return { ...result, latestEpisodeDate: fallback, nextEpisodeDate: '', newReleaseDate: fallback, _discoverLatestDate: fallback };
    }
  }));
}

async function collectNewDiscoverCandidates(batchNumber) {
  const selectedProviders = (state.discoverPrefs.streamingProviderIds || []).map(String).filter(Boolean);
  const today = todayString();
  const horizonDays = normalizedUpcomingHorizonDays();
  const upcomingEnd = addDaysToDateString(today, horizonDays);

  // Batch 1 covers the current/new material plus the chosen future window.
  // Subsequent batches step backward in fixed windows, which lets the
  // "Recently Released" section continue loading indefinitely.
  let windowStart;
  let windowEnd;
  let tmdbPage = 1;
  if (batchNumber <= 3) {
    // Spend three pages filling the immediate period before moving farther back.
    windowStart = addDaysToDateString(today, -45);
    windowEnd = upcomingEnd;
    tmdbPage = batchNumber;
  } else {
    const historicalBatch = batchNumber - 4;
    const historicalWindow = Math.floor(historicalBatch / 3);
    tmdbPage = (historicalBatch % 3) + 1;
    windowEnd = addDaysToDateString(today, -45 - (historicalWindow * 90));
    windowStart = addDaysToDateString(windowEnd, -90);
  }

  const bookStart = (batchNumber - 1) * DISCOVER_BOOK_BATCH_SIZE;
  const newBookTopics = ['subject:fiction','subject:mystery','subject:romance','subject:fantasy','subject:biography','subject:history','subject:science','subject:psychology','subject:philosophy','subject:memoir'];
  const newBookQuery = newBookTopics[(batchNumber - 1) % newBookTopics.length];
  const tasks = [
    TrackerAPI.getTMDBDiscover('tv', tmdbPage, state.settings, discoverTMDBOptions('tv', {
      sortBy: 'popularity.desc', minVotes: 3, afterDate: windowStart, beforeDate: windowEnd, dateField: 'air'
    })),
    TrackerAPI.getTMDBDiscover('movie', tmdbPage, state.settings, discoverTMDBOptions('movie', {
      sortBy: 'primary_release_date.desc', minVotes: 5, afterDate: windowStart, beforeDate: windowEnd, dateField: 'release'
    })),
    TrackerAPI.getBookFeed(bookStart, state.settings, discoverBookOptions({ query: newBookQuery, orderBy: 'newest', maxResults: DISCOVER_BOOK_BATCH_SIZE }))
  ];
  if (selectedProviders.length) {
    tasks.push(TrackerAPI.getTMDBDiscover('tv', tmdbPage, state.settings, discoverTMDBOptions('tv', {
      sortBy: 'popularity.desc', minVotes: 2, afterDate: windowStart, beforeDate: windowEnd, dateField: 'air', providerIds: selectedProviders
    })));
    tasks.push(TrackerAPI.getTMDBDiscover('movie', tmdbPage, state.settings, discoverTMDBOptions('movie', {
      sortBy: 'primary_release_date.desc', minVotes: 3, afterDate: windowStart, beforeDate: windowEnd, dateField: 'release', providerIds: selectedProviders
    })));
  }

  const settled = await Promise.allSettled(tasks);
  const candidates = [];
  const add = (results, sourceType, source, boost = 0) => (results || []).forEach(result => candidates.push({ ...result, sourceType, _discoverSource: source, _discoverBoost: boost }));
  add(filterAlreadyKnown(settled[0].status === 'fulfilled' ? settled[0].value.results : [], 'tv'), 'tv', 'new', 3);
  add(filterAlreadyKnown(settled[1].status === 'fulfilled' ? settled[1].value.results : [], 'movie'), 'movie', 'new', 3);
  add(filterAlreadyKnown(settled[2].status === 'fulfilled' ? settled[2].value.results : [], 'book'), 'book', 'new', 2);
  if (selectedProviders.length) {
    add(filterAlreadyKnown(settled[3]?.status === 'fulfilled' ? settled[3].value.results : [], 'tv'), 'tv', 'preferred-streaming', 4);
    add(filterAlreadyKnown(settled[4]?.status === 'fulfilled' ? settled[4].value.results : [], 'movie'), 'movie', 'preferred-streaming', 4);
  }

  const annotated = await annotateLatestTVEpisodeDates(dedupeDiscoverCandidatesByBoost(candidates));

  // iTunes catalogue results are broad searches rather than recommendations in
  // New. Artists have no release date, so only dated albums/songs can enter.
  if (normalizedDiscoverContentTypes().some(type => ['music','artist','song'].includes(type))) {
    try {
      const music = await collectMusicDiscoverCandidates(batchNumber, 'new');
      musicDiscoverDebug('New music candidates', { batchNumber, total: music.length, byType: musicDiscoverTypeCounts(music) });
      annotated.push(...music.filter(result => ['music','song'].includes(result.sourceType)));
    } catch {}
  }

  // Future Ticketmaster events belong in New, but only within the user-selected
  // horizon. They are added once; older infinite-scroll batches focus on releases.
  if (state.settings.ticketmasterKey && batchNumber === 1 && normalizedDiscoverContentTypes().some(type => ['concert','event'].includes(type))) {
    try {
      const events = await fetchTicketmasterEventsForPreferences('', {
        page: 0,
        size: 50,
        skipPrioritySearch: true,
        startDateTime: ticketmasterMonthBoundary(today),
        endDateTime: ticketmasterMonthBoundary(upcomingEnd, true)
      });
      annotated.push(...events.map(result => asLiveDiscoverCandidate(result, 'new-live', 3, false)));
    } catch {}
  }

  return dedupeDiscoverCandidatesByBoost(annotated).filter(result => {
    const date = discoverNewDate(result);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    return date >= windowStart && date <= windowEnd;
  });
}

async function collectPopularDiscoverCandidates(batchNumber) {
  const selectedProviders = (state.discoverPrefs.streamingProviderIds || []).map(String).filter(Boolean);
  const topics = ['subject:fiction','subject:mystery','subject:romance','subject:fantasy','subject:biography','subject:history','subject:science','subject:psychology'];
  const bookQuery = topics[(batchNumber - 1) % topics.length];
  const bookStart = Math.floor((batchNumber - 1) / topics.length) * DISCOVER_BOOK_BATCH_SIZE;
  const tasks = [
    TrackerAPI.getTMDBDiscover('tv', batchNumber, state.settings, discoverTMDBOptions('tv', { sortBy: 'popularity.desc', minVotes: 100 })),
    TrackerAPI.getTMDBDiscover('movie', batchNumber, state.settings, discoverTMDBOptions('movie', { sortBy: 'popularity.desc', minVotes: 150 })),
    TrackerAPI.getBookFeed(bookStart, state.settings, discoverBookOptions({ query: bookQuery, orderBy: 'relevance', maxResults: DISCOVER_BOOK_BATCH_SIZE }))
  ];
  if (selectedProviders.length) {
    tasks.push(TrackerAPI.getTMDBDiscover('tv', Math.min(batchNumber, 30), state.settings, discoverTMDBOptions('tv', { sortBy: 'popularity.desc', minVotes: 30, providerIds: selectedProviders })));
    tasks.push(TrackerAPI.getTMDBDiscover('movie', Math.min(batchNumber, 30), state.settings, discoverTMDBOptions('movie', { sortBy: 'popularity.desc', minVotes: 50, providerIds: selectedProviders })));
  }
  const settled = await Promise.allSettled(tasks);
  const candidates = [];
  const add = (results, sourceType, source, boost = 0) => (results || []).forEach(result => candidates.push({ ...result, sourceType, _discoverSource: source, _discoverBoost: boost }));
  add(filterAlreadyKnown(settled[0].status === 'fulfilled' ? settled[0].value.results : [], 'tv'), 'tv', 'popular', 5);
  add(filterAlreadyKnown(settled[1].status === 'fulfilled' ? settled[1].value.results : [], 'movie'), 'movie', 'popular', 5);
  add(filterAlreadyKnown(settled[2].status === 'fulfilled' ? settled[2].value.results : [], 'book'), 'book', 'popular', 3);
  if (selectedProviders.length) {
    // Availability can help surface something the user can actually watch, but
    // it does not count as a taste/personalization signal.
    add(filterAlreadyKnown(settled[3]?.status === 'fulfilled' ? settled[3].value.results : [], 'tv'), 'tv', 'available-popular', 5);
    add(filterAlreadyKnown(settled[4]?.status === 'fulfilled' ? settled[4].value.results : [], 'movie'), 'movie', 'available-popular', 5);
  }
  if (batchNumber === 1) {
    const current = await Promise.allSettled([
      getCached('discover:trending:tv', () => TrackerAPI.getTrending('tv', state.settings)),
      getCached('discover:trending:movie', () => TrackerAPI.getTrending('movie', state.settings))
    ]);
    if (current[0].status === 'fulfilled') add(filterAlreadyKnown(current[0].value, 'tv'), 'tv', 'trending', 10);
    if (current[1].status === 'fulfilled') add(filterAlreadyKnown(current[1].value, 'movie'), 'movie', 'trending', 10);
  }

  if (normalizedDiscoverContentTypes().some(type => ['music','artist','song'].includes(type))) {
    try { candidates.push(...await collectMusicDiscoverCandidates(batchNumber, 'popular')); } catch (error) { musicDiscoverWarn('Popular music collector failed', { batchNumber, error: error?.message || String(error) }); }
  }

  if (state.settings.ticketmasterKey && batchNumber <= 4 && normalizedDiscoverContentTypes().some(type => ['concert','event'].includes(type))) {
    try {
      const events = await fetchTicketmasterEventsForPreferences('', {
        page: Math.max(0, batchNumber - 1), size: 24, skipPrioritySearch: true
      });
      candidates.push(...events.map(result => asLiveDiscoverCandidate(result, 'popular-live', 4, false)));
    } catch {}
  }

  return dedupeDiscoverCandidatesByBoost(candidates);
}

async function collectRestaurantDiscoverCandidates(batchNumber, mode = 'for-you') {
  if (!state.settings.googlePlacesKey) return [];
  const saved = state.items.filter(item => getSourceType(item) === 'restaurant');
  const cuisineSeeds = saved
    .filter(item => item.recommended || Number(item.rating || 0) >= 4)
    .map(item => item.title ? `restaurants like ${item.title}` : '')
    .filter(Boolean);
  const broad = ['restaurants', 'casual dining', 'coffee and brunch', 'pizza', 'sushi', 'thai food', 'italian food', 'mexican food'];
  const seedPool = cuisineSeeds.length ? [...new Set([...cuisineSeeds, ...broad])] : broad;
  const seed = seedPool[(batchNumber - 1) % seedPool.length] || 'restaurants';
  try {
    const results = await TrackerAPI.searchRestaurants(seed, state.settings, {
      city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
      region: state.discoverPrefs.eventCountry || state.settings.homeCountry || 'CA',
      maxResultCount: 20,
      minRating: mode === 'popular' ? 4 : 0
    });
    return filterAlreadyKnown(results, 'restaurant').map(result => ({
      ...result,
      sourceType: 'restaurant',
      _discoverSource: cuisineSeeds.includes(seed) ? 'restaurant-taste' : 'restaurant-explore',
      _discoverBoost: cuisineSeeds.includes(seed) ? 9 : (mode === 'popular' ? 6 : 3),
      _discoverExploration: !cuisineSeeds.includes(seed)
    }));
  } catch (error) {
    console.warn('Restaurant Discover unavailable:', error?.message || error);
    return [];
  }
}

async function collectForYouDiscoverCandidates(batchNumber) {
  const selectedProviders = (state.discoverPrefs.streamingProviderIds || []).map(String).filter(Boolean);
  const candidates = [];
  const add = (results, sourceType, source, boost = 0, exploration = false) => (results || []).forEach(result => candidates.push({
    ...result,
    sourceType,
    _discoverSource: source,
    _discoverBoost: boost,
    _discoverExploration: Boolean(exploration)
  }));
  const recommendationPage = 1 + ((batchNumber - 1) % 3);

  for (const sourceType of ['tv', 'movie']) {
    const used = new Set();
    for (let i = 0; i < 3; i++) {
      const seed = pickDiscoverSeed(sourceType, used);
      if (!seed?.providerId) continue;
      used.add(String(seed.providerId));
      try {
        const recs = await getCached(
          `discover:for-you:${sourceType}:${seed.providerId}:${recommendationPage}`,
          () => TrackerAPI.getTMDBRecommendations(sourceType, seed.providerId, state.settings, recommendationPage)
        );
        add(filterAlreadyKnown(recs, sourceType), sourceType, 'personal', 11 + Number(seed.rating || 0));
      } catch {}
    }
  }

  const readAuthors = getReadAuthors();
  if (readAuthors.length && state.discoverPrefs.prioritizeAuthors !== false) {
    const start = ((batchNumber - 1) * 2) % readAuthors.length;
    for (const author of [readAuthors[start], readAuthors[(start + 1) % readAuthors.length]].filter(Boolean)) {
      try {
        const books = await getCached(`discover:for-you:author:${author.toLowerCase()}`, () => TrackerAPI.getBooksByAuthor(author, state.settings));
        add(filterAlreadyKnown(books, 'book'), 'book', 'familiar-author', 13);
      } catch {}
    }
  }

  const bookSeed = pickDiscoverSeed('book');
  if (bookSeed?.providerId) {
    try {
      const books = await getCached(`discover:for-you:book:${bookSeed.providerId}`, () => TrackerAPI.getBookRecommendations(bookSeed.providerId, state.settings));
      add(filterAlreadyKnown(books, 'book'), 'book', 'personal', 11 + Number(bookSeed.rating || 0));
    } catch {}
  }

  if (selectedProviders.length) {
    const providerPage = 1 + ((batchNumber - 1) % 8);
    const providerResults = await Promise.allSettled([
      TrackerAPI.getTMDBDiscover('tv', providerPage, state.settings, discoverTMDBOptions('tv', { providerIds: selectedProviders, sortBy: 'popularity.desc', minVotes: 20 })),
      TrackerAPI.getTMDBDiscover('movie', providerPage, state.settings, discoverTMDBOptions('movie', { providerIds: selectedProviders, sortBy: 'popularity.desc', minVotes: 30 }))
    ]);
    if (providerResults[0].status === 'fulfilled') add(filterAlreadyKnown(providerResults[0].value.results, 'tv'), 'tv', 'preferred-streaming', 8);
    if (providerResults[1].status === 'fulfilled') add(filterAlreadyKnown(providerResults[1].value.results, 'movie'), 'movie', 'preferred-streaming', 8);
  }

  // Deliberate exploration: roughly a quarter of the final For You batch is
  // reserved for broader catalogue material, rather than hiding it in a separate
  // "Discover" tab. These candidates are marked so rankDiscoverFeedCandidates
  // can guarantee they actually survive the personalized ranking.
  const explorationPage = 1 + ((batchNumber + Math.floor(state.discoverFeedSession * 11)) % 12);
  const explore = await Promise.allSettled([
    TrackerAPI.getTMDBDiscover('tv', explorationPage, state.settings, discoverTMDBOptions('tv', { sortBy: 'popularity.desc', minVotes: 25 })),
    TrackerAPI.getTMDBDiscover('movie', explorationPage, state.settings, discoverTMDBOptions('movie', { sortBy: 'popularity.desc', minVotes: 40 })),
    TrackerAPI.getBookFeed((batchNumber - 1) * DISCOVER_BOOK_BATCH_SIZE, state.settings, discoverBookOptions({ query: chooseDiscoverBookPlan([], batchNumber).query, orderBy: 'relevance', maxResults: DISCOVER_BOOK_BATCH_SIZE }))
  ]);
  if (explore[0].status === 'fulfilled') add(filterAlreadyKnown(explore[0].value.results, 'tv'), 'tv', 'explore', 4, true);
  if (explore[1].status === 'fulfilled') add(filterAlreadyKnown(explore[1].value.results, 'movie'), 'movie', 'explore', 4, true);
  if (explore[2].status === 'fulfilled') add(filterAlreadyKnown(explore[2].value.results, 'book'), 'book', 'explore', 3, true);

  if (normalizedDiscoverContentTypes().some(type => ['music','artist','song'].includes(type))) {
    try {
      candidates.push(...await collectMusicDiscoverCandidates(batchNumber, 'for-you'));
    } catch (error) {
      musicDiscoverWarn('For You music collector failed', { batchNumber, error: error?.message || String(error) });
    }
  }

  if (state.settings.googlePlacesKey && batchNumber <= 5 && discoverTypeSelected('restaurant')) {
    candidates.push(...await collectRestaurantDiscoverCandidates(batchNumber, 'for-you'));
  }

  if (state.settings.ticketmasterKey && batchNumber <= 5 && normalizedDiscoverContentTypes().some(type => ['concert','event'].includes(type))) {
    try {
      const [concerts, relatedConcerts, generalEvents] = await Promise.all([
        getNearbyTicketmasterConcerts({ includeInferred: true, artistLimit: 12 }),
        getRelatedTicketmasterConcerts(batchNumber, 12),
        fetchTicketmasterEventsForPreferences('', { page: Math.max(0, batchNumber - 1), size: 12, skipPrioritySearch: true })
      ]);
      candidates.push(...concerts.map(result => ({
        ...result, sourceType: 'concert', _discoverSource: 'ticketmaster-liked',
        _discoverBoost: result.likedArtist ? 14 : 10, _discoverExploration: false
      })));
      candidates.push(...relatedConcerts.map(result => ({
        ...result, sourceType: 'concert', _discoverSource: 'ticketmaster-related',
        _discoverBoost: 8, _discoverExploration: false
      })));
      candidates.push(...generalEvents.map(result => asLiveDiscoverCandidate(result, 'live-explore', 3, true)));
    } catch {}
  }

  return dedupeDiscoverCandidatesByBoost(candidates);
}

function discoverLoadingLabel() {
  return 'Loading…';
}

function discoverEndlessLabel() {
  return '';
}

function dedupeDiscoverCandidatesByBoost(results) {
  const best = new Map();
  for (const result of results || []) {
    const key = discoverResultIdentity(result);
    if (!key) continue;
    const existing = best.get(key);
    if (!existing || Number(result._discoverBoost || 0) > Number(existing._discoverBoost || 0)) best.set(key, result);
  }
  return [...best.values()];
}

function chooseDiscoverBookPlan(readAuthors, batchNumber) {
  const useKnownAuthor = readAuthors.length && state.discoverPrefs.prioritizeAuthors !== false && Math.random() < 0.42;
  if (useKnownAuthor) {
    const author = readAuthors[Math.floor(Math.random() * Math.min(readAuthors.length, 8))];
    return { query: `inauthor:${author}`, orderBy: 'relevance', maxResults: DISCOVER_BOOK_BATCH_SIZE, personalized: true };
  }

  const topics = [
    'subject:fiction', 'subject:literary fiction', 'subject:mystery', 'subject:biography',
    'subject:history', 'subject:science', 'subject:psychology', 'subject:philosophy',
    'subject:fantasy', 'subject:romance', 'subject:memoir', 'subject:essays'
  ];
  const index = (batchNumber + Math.floor(state.discoverFeedSession * topics.length) + Math.floor(Math.random() * 4)) % topics.length;
  return { query: topics[index], orderBy: Math.random() < 0.28 ? 'newest' : 'relevance', maxResults: DISCOVER_BOOK_BATCH_SIZE, personalized: false };
}

function discoverSeedWeight(item) {
  const rating = Number(item.rating || 0);
  let weight = rating >= 5 ? 20 : rating >= 4 ? 11 : rating >= 3 ? 4 : rating === 2 ? .45 : rating === 1 ? .12 : 3;
  if (item.recommended) weight += 9;
  if (getSourceType(item) === 'tv' && getTVWatchDisposition(item) === 'stopped') weight *= .12;
  return Math.max(.05, weight);
}

function pickDiscoverSeed(type, excludedIds = new Set()) {
  const pool = state.items
    .filter(item => getSourceType(item) === type && item.providerId && !excludedIds.has(String(item.providerId)))
    .filter(item => {
      if (type === 'tv') return item.completedAt || Number(item.progress?.nextSeason || 1) > 1 || Number(item.progress?.nextEpisode || 1) > 1 || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched');
      if (type === 'book') return item.completedAt || Number(item.progress?.currentPage || 0) > 0;
      if (type === 'movie') return item.completedAt || item.date || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'movie-watched');
      return false;
    });
  if (!pool.length) return null;

  // Keep recommendations responsive to recent activity without letting one recent
  // low-rated item dominate. Ratings, explicit recommendations, and stopped-TV
  // status determine the lottery weight.
  const recent = [...pool]
    .sort((a,b) => String(b.updatedAt || b.completedAt || '').localeCompare(String(a.updatedAt || a.completedAt || '')))
    .slice(0, 24);
  const weighted = recent.map(item => ({ item, weight: discoverSeedWeight(item) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return weighted.at(-1)?.item || null;
}

function discoverTasteProfile(type) {
  const profile = new Map();
  const now = Date.now();
  for (const item of state.items) {
    if (getSourceType(item) !== type || !item.genres?.length) continue;
    const rating = Number(item.rating || 0);
    const queue = getQueueStatus(item);
    const queued = queue === 'upnext' || queue === 'tbr';
    const engaged = Boolean(item.completedAt) || item.recommended || queued ||
      (type === 'tv' && state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched')) ||
      (type === 'book' && Number(item.progress?.currentPage || 0) > 0);
    if (!engaged && !rating) continue;

    let signal = 0;
    if (rating >= 4) signal += (rating - 3) * 2.2;
    else if (rating === 3) signal += .5;
    else if (rating > 0) signal -= (3 - rating) * 2.4;
    else if (engaged) signal += .7;
    if (queued && !item.completedAt) signal += .35;
    if (item.recommended) signal += 3.2;
    if (type === 'tv' && getTVWatchDisposition(item) === 'stopped') signal -= 3;
    if (type === 'book' && item.bookDisposition === 'dnf') signal -= 3;

    const activityTime = Date.parse(item.updatedAt || item.completedAt || item.createdAt || '');
    if (Number.isFinite(activityTime)) {
      const ageDays = Math.max(0, (now - activityTime) / 86400000);
      const halfLife = item.recommended ? 1460 : 730;
      const recency = Math.max(item.recommended ? .72 : .30, Math.exp(-ageDays / halfLife));
      signal *= recency;
    }

    for (const genre of item.genres) {
      const key = String(genre || '').trim().toLowerCase();
      if (!key) continue;
      profile.set(key, (profile.get(key) || 0) + signal);
    }
  }
  return profile;
}

function discoverCandidateGenreNames(result) {
  if (result.sourceType === 'book') {
    return [...new Set((result.categories || result.raw?.volumeInfo?.categories || []).map(value => String(value || '').trim()).filter(Boolean))];
  }
  if (result.sourceType === 'tv' || result.sourceType === 'movie') {
    const direct = (result.genres || []).map(genre => typeof genre === 'string' ? genre : genre?.name).filter(Boolean);
    if (direct.length) return [...new Set(direct)];
    const map = result.sourceType === 'tv' ? TMDB_TV_GENRES : TMDB_MOVIE_GENRES;
    return [...new Set((result.raw?.genre_ids || []).map(id => map[Number(id)]).filter(Boolean))];
  }
  return [];
}

function discoverGenreAffinity(result, profiles) {
  const profile = profiles[result.sourceType];
  if (!profile?.size) return 0;
  const values = discoverCandidateGenreNames(result)
    .map(genre => profile.get(String(genre).toLowerCase()) || 0)
    .filter(value => value !== 0)
    .sort((a,b) => Math.abs(b) - Math.abs(a));
  if (!values.length) return 0;
  // Two strongest genre signals are enough; cap them so genre history guides
  // ranking without overwhelming seed-based recommendations.
  const affinity = values.slice(0, 2).reduce((sum, value) => sum + value, 0);
  return Math.max(-9, Math.min(12, affinity));
}

async function rankDiscoverFeedCandidates(results, batchSize) {
  const readAuthors = getReadAuthors();
  const authorSet = new Set(readAuthors.map(author => author.toLowerCase()));
  const mode = DISCOVER_MODES.has(state.discoverMode) ? state.discoverMode : 'for-you';
  const tasteProfiles = mode === 'for-you' ? {
    tv: discoverTasteProfile('tv'),
    movie: discoverTasteProfile('movie'),
    book: discoverTasteProfile('book')
  } : {};
  const prelim = (results || []).map(result => {
    let score = Number(result._discoverBoost || 0);
    const rating = Number(result.rating || 0);
    if (rating) score += Math.min(3, rating / 3.5);

    if (mode === 'for-you' && result.sourceType === 'book' && authorSet.size) {
      const resultAuthors = String(result.subtitle || '').split(',').map(value => value.trim().toLowerCase());
      if (resultAuthors.some(author => authorSet.has(author))) {
        result = { ...result, authorMatch: true };
        score += 10;
      }
    }

    if (mode === 'for-you') {
      score += discoverGenreAffinity(result, tasteProfiles);
    }

    if (mode === 'popular') {
      const popularity = Number(result.raw?.popularity || 0);
      score += Math.log1p(popularity) * 1.8;
    }
    if (mode === 'new') {
      const rawDate = discoverNewDate(result);
      const time = Date.parse(rawDate || '');
      if (Number.isFinite(time)) {
        const ageDays = Math.max(0, (Date.now() - time) / 86400000);
        score += Math.max(0, 20 - ageDays / 8);
      }
    }

    const jitterMax = mode === 'for-you' ? 2.2 : .6;
    const jitter = Math.random() * jitterMax;
    return { ...result, _discoverScore: score + jitter, _discoverJitter: jitter };
  }).sort((a,b) => b._discoverScore - a._discoverScore);

  // Pick the batch first, then resolve watch-provider names only for TV/movies
  // that will actually be rendered. This matters for an endless feed: it avoids
  // dozens of unnecessary provider calls for cards the user never sees.
  let selected;
  if (mode === 'new') {
    const groupKeys = ['this-week', 'last-week', 'upcoming', 'recently-released'];
    const perGroup = Math.max(4, Math.floor(batchSize / groupKeys.length));
    const picked = [];
    const pickedIds = new Set();
    for (const key of groupKeys) {
      const group = prelim.filter(result => discoverNewPeriod(result).key === key).slice(0, perGroup);
      for (const result of group) {
        const id = discoverResultIdentity(result);
        if (!pickedIds.has(id)) { picked.push(result); pickedIds.add(id); }
      }
    }
    for (const result of prelim) {
      if (picked.length >= batchSize) break;
      const id = discoverResultIdentity(result);
      if (!pickedIds.has(id)) { picked.push(result); pickedIds.add(id); }
    }
    selected = diversifyDiscoverFeed(picked).slice(0, batchSize);
  } else if (mode === 'for-you') {
    const explorationTarget = Math.max(2, Math.round(batchSize * .25));
    const exploration = prelim.filter(result => result._discoverExploration);
    const core = prelim.filter(result => !result._discoverExploration);
    const explorationSelected = selectAcrossContentFamilies(exploration, explorationTarget);
    const initial = [
      ...core.slice(0, Math.max(0, batchSize - explorationSelected.length)),
      ...explorationSelected
    ];
    const selectedIds = new Set(initial.map(discoverResultIdentity));
    // Do not leave a dedicated Artist/Song view half empty just because its core
    // vs exploration proportions could not hit the requested quota exactly.
    for (const result of prelim) {
      if (initial.length >= batchSize) break;
      const id = discoverResultIdentity(result);
      if (!id || selectedIds.has(id)) continue;
      selectedIds.add(id);
      initial.push(result);
    }
    selected = diversifyDiscoverFeed(initial).slice(0, batchSize);
  } else {
    selected = diversifyDiscoverFeed(prelim).slice(0, batchSize);
  }
  const tv = selected.filter(result => result.sourceType === 'tv');
  const movie = selected.filter(result => result.sourceType === 'movie');
  const [tvAnnotated, movieAnnotated] = await Promise.all([
    tv.length ? prioritizeByStreaming(tv, 'tv') : [],
    movie.length ? prioritizeByStreaming(movie, 'movie') : []
  ]);
  const annotations = new Map([...tvAnnotated, ...movieAnnotated].map(result => [discoverResultIdentity(result), result]));
  selected = selected.map(result => annotations.get(discoverResultIdentity(result)) || result);

  // Availability is resolved only for the cards in this batch to keep API work
  // bounded, but it should still affect their order rather than being display-only.
  if ((state.discoverPrefs.streamingProviderIds || []).length) {
    selected.sort((a,b) => Number(b.preferredStreaming) - Number(a.preferredStreaming) || Number(b._discoverScore || 0) - Number(a._discoverScore || 0));
    selected = diversifyDiscoverFeed(selected);
  }
  return selected;
}

function discoverContentFamily(sourceType) {
  if (['music','artist','song'].includes(sourceType)) return 'music';
  if (['concert','event'].includes(sourceType)) return 'live';
  if (sourceType === 'restaurant') return 'food';
  return sourceType || 'other';
}

function selectAcrossContentFamilies(results, limit) {
  const buckets = new Map();
  for (const result of results || []) {
    const family = discoverContentFamily(result.sourceType);
    if (!buckets.has(family)) buckets.set(family, []);
    buckets.get(family).push(result);
  }
  const families = [...buckets.keys()];
  const selected = [];
  let round = 0;
  while (selected.length < limit && families.some(family => buckets.get(family)?.[round])) {
    for (const family of families) {
      const value = buckets.get(family)?.[round];
      if (value) selected.push(value);
      if (selected.length >= limit) break;
    }
    round += 1;
  }
  return selected;
}

function diversifyDiscoverFeed(results) {
  const remaining = [...(results || [])];
  const output = [];
  while (remaining.length) {
    const recentFamilies = output.slice(-2).map(item => discoverContentFamily(item.sourceType));
    let index = remaining.findIndex((item, candidateIndex) => {
      if (candidateIndex >= 10) return false;
      const family = discoverContentFamily(item.sourceType);
      return !(recentFamilies.length === 2 && recentFamilies.every(value => value === family));
    });
    if (index < 0) index = 0;
    output.push(remaining.splice(index, 1)[0]);
  }
  return output;
}

function normalizeBookMatchText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function bookAuthorNames(value) {
  if (Array.isArray(value)) return value.map(normalizeBookMatchText).filter(Boolean);
  return String(value || '')
    .split(/,|\s+&\s+|\s+and\s+/i)
    .map(normalizeBookMatchText)
    .filter(Boolean);
}

function bookTitleAuthorSignature(title, authors) {
  const normalizedTitle = normalizeBookMatchText(title);
  const normalizedAuthors = bookAuthorNames(authors).sort();
  if (!normalizedTitle || !normalizedAuthors.length) return '';
  return `${normalizedTitle}::${normalizedAuthors.join('|')}`;
}

function discoverBookSignature(result) {
  return bookTitleAuthorSignature(
    result?.title || result?.raw?.volumeInfo?.title || '',
    result?.raw?.volumeInfo?.authors || result?.authors || result?.subtitle || ''
  );
}

function isEnglishDiscoverBook(result) {
  const language = String(result?.language || result?.raw?.volumeInfo?.language || '').trim().toLowerCase();
  return language === 'en' || language.startsWith('en-');
}

function isDiscoverBookBundle(result) {
  const info = result?.raw?.volumeInfo || {};
  const text = [result?.title, info.title, info.subtitle].filter(Boolean).join(' ');
  if (!text) return false;
  const patterns = [
    /\bbox(?:ed)?\s+set\b/i,
    /\bbundle\b/i,
    /\bomnibus\b/i,
    /\bcomplete\s+(?:series|trilogy|duology|saga|collection)\b/i,
    /\bbooks?\s*\d+\s*(?:[-–—]|to|through|&|and)\s*\d+\b/i,
    /\bvol(?:ume)?s?\s*\d+\s*(?:[-–—]|to|through|&|and)\s*\d+\b/i,
    /\b\d+\s*[- ](?:book|volume)\s+(?:set|collection|bundle)\b/i,
    /\b\d+\s*[- ]in[- ]1\b/i,
    /\bbooks?\s+\d+\s*,\s*\d+(?:\s*(?:&|and)\s*\d+)?\b/i
  ];
  return patterns.some(pattern => pattern.test(text));
}

function trackedBookSignatures() {
  const signatures = new Set();
  for (const item of state.items) {
    if (getSourceType(item) !== 'book') continue;
    const signature = bookTitleAuthorSignature(
      item.title,
      item.raw?.volumeInfo?.authors || item.authors || item.subtitle || ''
    );
    if (signature) signatures.add(signature);
  }
  return signatures;
}

function discoverResultIdentity(result) {
  if (!result) return '';
  if (result.sourceType === 'book') {
    const signature = discoverBookSignature(result);
    if (signature) return `book:${signature}`;
  }
  if (!result.providerId) return '';
  return `${result.sourceType || 'book'}:${result.providerId}`;
}

function discoverNewDate(result) {
  if (!result) return '';
  if (result.sourceType === 'event' || result.sourceType === 'concert') return result.eventDate || '';
  if (result.sourceType === 'book') return result.publishedDate || result.raw?.volumeInfo?.publishedDate || '';
  if (result.sourceType === 'tv') return result.newReleaseDate || result.nextEpisodeDate || result.latestEpisodeDate || result._discoverLatestDate || result.raw?.first_air_date || '';
  if (result.sourceType === 'movie') return result.raw?.release_date || result.releaseDate || '';
  if (result.sourceType === 'music' || result.sourceType === 'song') return result.releaseDate || String(result.raw?.releaseDate || '').slice(0,10);
  return '';
}

function mondayWeekStartString(dateString) {
  const date = parseLocalDateString(dateString);
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  return localDateString(addDays(date, delta));
}

function monthKey(dateString) {
  return String(dateString || '').slice(0, 7);
}

function discoverNewPeriod(result) {
  const date = discoverNewDate(result);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { key: 'undated', label: 'Recently Released', order: 40, date };
  const today = todayString();
  const thisWeek = mondayWeekStartString(today);
  const nextWeek = addDaysToDateString(thisWeek, 7);
  const lastWeek = addDaysToDateString(thisWeek, -7);
  const upcomingEnd = addDaysToDateString(today, normalizedUpcomingHorizonDays());

  if (date >= thisWeek && date < nextWeek) return { key: 'this-week', label: 'This Week', order: 10, date };
  if (date >= lastWeek && date < thisWeek) return { key: 'last-week', label: 'Last Week', order: 20, date };
  if (date >= nextWeek && date <= upcomingEnd) return { key: 'upcoming', label: 'Upcoming', order: 30, date };
  if (date < lastWeek) return { key: 'recently-released', label: 'Recently Released', order: 40, date };
  return { key: 'outside-window', label: 'Upcoming', order: 90, date };
}

function upcomingHorizonLabel() {
  const days = normalizedUpcomingHorizonDays();
  if (days === 14) return 'next 2 weeks';
  if (days === 30) return 'next month';
  if (days === 90) return 'next 3 months';
  if (days === 180) return 'next 6 months';
  return `next ${days} days`;
}

function renderDiscoverNewGroupedItems() {
  if (!els.discoverFeed) return;
  els.discoverFeed.classList.add('is-period-grouped');
  const groups = new Map();
  for (const result of state.discoverFeedItems) {
    const period = discoverNewPeriod(result);
    if (period.key === 'outside-window') continue;
    if (!groups.has(period.key)) groups.set(period.key, { ...period, items: [] });
    groups.get(period.key).items.push(result);
  }
  const ordered = [...groups.values()].sort((a,b) => a.order - b.order);
  els.discoverFeed.innerHTML = ordered.map(group => {
    const upcoming = group.key === 'upcoming';
    group.items.sort((a,b) => {
      const ad = discoverNewDate(a), bd = discoverNewDate(b);
      return upcoming ? String(ad).localeCompare(String(bd)) : String(bd).localeCompare(String(ad));
    });
    const cards = group.items.map(result => {
      const key = rememberDiscoverResult(result, result.sourceType);
      return discoverCardMarkup(result, key, result.sourceType);
    }).join('');
    const sub = group.key === 'upcoming' ? `<span class="discover-new-period-subtitle">${escapeHtml(upcomingHorizonLabel())}</span>` : '';
    const note = group.key === 'recently-released' ? '<span class="discover-new-period-subtitle">newest → oldest · keep scrolling for older releases</span>' : '';
    return `<section class="discover-new-period-group"><div class="discover-new-period-heading"><h2>${escapeHtml(group.label)}</h2>${sub || note}</div><div class="discover-new-period-grid">${cards}</div></section>`;
  }).join('');
}

function renderDiscoverFeedItems() {
  if (!els.discoverFeed) return;
  if (state.discoverMode === 'new' && !state.discoverSearchQuery) {
    renderDiscoverNewGroupedItems();
    return;
  }
  els.discoverFeed.classList.remove('is-period-grouped');
  els.discoverFeed.innerHTML = '';
  for (const result of state.discoverFeedItems) {
    const key = rememberDiscoverResult(result, result.sourceType);
    els.discoverFeed.insertAdjacentHTML('beforeend', discoverCardMarkup(result, key, result.sourceType));
  }
}

function appendDiscoverFeedItems(results) {
  if (!els.discoverFeed) return;
  const fragment = document.createDocumentFragment();
  const holder = document.createElement('div');
  holder.innerHTML = (results || []).map(result => {
    const key = rememberDiscoverResult(result, result.sourceType);
    return discoverCardMarkup(result, key, result.sourceType);
  }).join('');
  while (holder.firstChild) fragment.appendChild(holder.firstChild);
  els.discoverFeed.appendChild(fragment);
}

function renderDiscoverGrid(container, results, fallbackType) {
  if (!container) return;
  container.innerHTML = '';
  for (const result of (results || []).slice(0, 8)) {
    const key = rememberDiscoverResult(result, fallbackType);
    container.insertAdjacentHTML('beforeend', discoverCardMarkup(result, key, fallbackType));
  }
  prepareDiscoverCarousel(container);
}

function prepareDiscoverCarousel(track) {
  if (!track || track.dataset.carouselReady === 'true') {
    if (track) updateDiscoverCarouselControls(track);
    return;
  }

  track.dataset.carouselReady = 'true';
  const parent = track.parentElement;
  if (!parent) return;

  let controls = parent.querySelector(':scope > .discover-carousel-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'discover-carousel-controls';
    controls.innerHTML = `
      <button class="discover-carousel-arrow" type="button" data-carousel-direction="-1" aria-label="Previous items">←</button>
      <span class="discover-carousel-position" aria-live="polite"></span>
      <button class="discover-carousel-arrow" type="button" data-carousel-direction="1" aria-label="Next items">→</button>`;
    track.insertAdjacentElement('afterend', controls);
  }

  controls.querySelectorAll('[data-carousel-direction]').forEach(button => {
    button.addEventListener('click', () => {
      const direction = Number(button.dataset.carouselDirection || 1);
      const card = track.querySelector('.discover-card');
      const gap = parseFloat(getComputedStyle(track).gap || '12') || 12;
      const distance = card ? card.getBoundingClientRect().width + gap : track.clientWidth * .8;
      track.scrollBy({ left: direction * distance, behavior: 'smooth' });
    });
  });

  let raf = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => updateDiscoverCarouselControls(track));
  }, { passive: true });
  window.addEventListener('resize', () => updateDiscoverCarouselControls(track), { passive: true });
  updateDiscoverCarouselControls(track);
}

function updateDiscoverCarouselControls(track) {
  const parent = track?.parentElement;
  const controls = parent?.querySelector(':scope > .discover-carousel-controls');
  if (!track || !controls) return;

  const cards = [...track.querySelectorAll('.discover-card')];
  const prev = controls.querySelector('[data-carousel-direction="-1"]');
  const next = controls.querySelector('[data-carousel-direction="1"]');
  const position = controls.querySelector('.discover-carousel-position');
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);

  if (!cards.length || maxScroll <= 2) {
    controls.classList.add('is-static');
    if (position) position.textContent = cards.length ? `${cards.length} item${cards.length === 1 ? '' : 's'}` : '';
    if (prev) prev.disabled = true;
    if (next) next.disabled = true;
    return;
  }

  controls.classList.remove('is-static');
  if (prev) prev.disabled = track.scrollLeft <= 2;
  if (next) next.disabled = track.scrollLeft >= maxScroll - 2;

  if (position) {
    const trackRect = track.getBoundingClientRect();
    let closestIndex = 0;
    let closestDistance = Infinity;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - trackRect.left);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    position.textContent = `${closestIndex + 1} / ${cards.length}`;
  }
}

async function renderPersonalRecommendations(readAuthors = getReadAuthors()) {
  const seeds = chooseRecommendationSeeds();
  const groups = [];

  if (seeds.tv) {
    try {
      let recs = await getCached(`discover:recommend:tv:${seeds.tv.providerId}`, () => TrackerAPI.getTMDBRecommendations('tv', seeds.tv.providerId, state.settings));
      recs = await prioritizeByStreaming(filterAlreadyKnown(recs, 'tv'), 'tv');
      if (recs.length) groups.push({ title: `Because you watched ${seeds.tv.title}`, type: 'tv', results: recs });
    } catch {}
  }
  if (seeds.movie) {
    try {
      let recs = await getCached(`discover:recommend:movie:${seeds.movie.providerId}`, () => TrackerAPI.getTMDBRecommendations('movie', seeds.movie.providerId, state.settings));
      recs = await prioritizeByStreaming(filterAlreadyKnown(recs, 'movie'), 'movie');
      if (recs.length) groups.push({ title: `Because you watched ${seeds.movie.title}`, type: 'movie', results: recs });
    } catch {}
  }

  if (readAuthors.length && state.discoverPrefs.prioritizeAuthors !== false) {
    try {
      const authorResults = [];
      for (const author of readAuthors.slice(0, 4)) {
        const books = await getCached(`discover:author:${author.toLowerCase()}`, () => TrackerAPI.getBooksByAuthor(author, state.settings));
        authorResults.push(...books.map(book => ({ ...book, recommendationAuthor: author })));
      }
      const filtered = dedupeDiscoverResults(filterAlreadyKnown(authorResults, 'book'));
      if (filtered.length) groups.push({ title: 'More from authors you’ve read', type: 'book', results: filtered });
    } catch {}
  }

  if (seeds.book) {
    try {
      let recs = await getCached(`discover:recommend:book:${seeds.book.providerId}`, () => TrackerAPI.getBookRecommendations(seeds.book.providerId, state.settings));
      recs = prioritizeBooksByAuthors(filterAlreadyKnown(recs, 'book'), readAuthors);
      if (recs.length) groups.push({ title: `Because you read ${seeds.book.title}`, type: 'book', results: recs });
    } catch {}
  }

  const usable = groups.filter(group => group.results?.length);
  els.discoverRecommendationsBlock.hidden = usable.length === 0;
  els.discoverRecommendations.innerHTML = '';
  for (const group of usable) {
    const cards = group.results.slice(0, 8).map(result => {
      const key = rememberDiscoverResult(result, group.type);
      return discoverCardMarkup(result, key, group.type);
    }).join('');
    els.discoverRecommendations.insertAdjacentHTML('beforeend', `<section class="recommendation-group"><h3>${escapeHtml(group.title)}</h3><div class="discover-grid">${cards}</div></section>`);
    const newestGroup = els.discoverRecommendations.lastElementChild;
    prepareDiscoverCarousel(newestGroup?.querySelector('.discover-grid'));
  }
}

function chooseRecommendationSeeds() {
  const byRecent = values => [...values].sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0] || null;
  const episodeHistory = [...state.history].reverse().find(entry => entry.kind === 'episode-watched' && entry.sourceItemId);
  const bookHistory = [...state.history].reverse().find(entry => entry.kind === 'book-finished' && entry.sourceItemId);
  const finishedMovie = byRecent(state.items.filter(item => getSourceType(item) === 'movie' && item.providerId && (item.completedAt || item.date)));
  return {
    tv: episodeHistory ? findItem(episodeHistory.sourceItemId) : byRecent(state.items.filter(item => getSourceType(item) === 'tv' && item.providerId && (item.completedAt || item.progress?.nextEpisode > 1 || item.progress?.nextSeason > 1))),
    movie: finishedMovie || byRecent(state.items.filter(item => getSourceType(item) === 'movie' && item.providerId)),
    book: bookHistory ? findItem(bookHistory.sourceItemId) : byRecent(state.items.filter(item => getSourceType(item) === 'book' && item.providerId && item.completedAt))
  };
}

function filterAlreadyKnown(results, type) {
  const blocked = new Set();
  for (const item of state.items) {
    if (getSourceType(item) === type && item.providerId) blocked.add(String(item.providerId));
  }
  for (const entry of state.history) {
    if (!entry.providerId) continue;
    if (type === 'tv' && entry.kind === 'episode-watched') blocked.add(String(entry.providerId));
    if (type === 'book' && entry.kind === 'book-finished') blocked.add(String(entry.providerId));
  }

  // Google Books assigns a different volume ID to many editions of the same
  // book. Block by normalized title + author as well as provider ID so Discover
  // does not recommend another edition of a book the user already tracks.
  const knownBookSignatures = type === 'book' ? trackedBookSignatures() : null;

  return (results || []).filter(result => {
    if (blocked.has(String(result.providerId))) return false;
    if (type === 'book') {
      if (!isEnglishDiscoverBook(result)) return false;
      if (isDiscoverBookBundle(result)) return false;
      const signature = discoverBookSignature(result);
      if (signature && knownBookSignatures.has(signature)) return false;
    }
    if (type === 'tv' && state.discoverPrefs.englishTVOnly === true) {
      return String(result.raw?.original_language || '').toLowerCase() === 'en';
    }
    return true;
  });
}

function getReadAuthors() {
  const completedBookIds = new Set(
    state.history.filter(entry => entry.kind === 'book-finished' && entry.sourceItemId).map(entry => entry.sourceItemId)
  );
  const authors = [];
  const seen = new Set();
  const books = state.items
    .filter(item => getSourceType(item) === 'book' && (item.completedAt || completedBookIds.has(item.id)))
    .filter(item => !Number(item.rating || 0) || Number(item.rating || 0) >= 3 || item.recommended)
    .sort((a,b) => String(b.completedAt || b.updatedAt || '').localeCompare(String(a.completedAt || a.updatedAt || '')));

  for (const book of books) {
    for (const author of String(book.subtitle || '').split(',').map(value => value.trim()).filter(Boolean)) {
      const key = author.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        authors.push(author);
      }
    }
  }
  return authors;
}

function prioritizeBooksByAuthors(results, authors) {
  if (!authors?.length || state.discoverPrefs.prioritizeAuthors === false) return results || [];
  const authorSet = new Set(authors.map(author => author.toLowerCase()));
  return (results || []).map((result, index) => {
    const resultAuthors = String(result.subtitle || '').split(',').map(value => value.trim().toLowerCase());
    const authorMatch = resultAuthors.some(author => authorSet.has(author));
    return { ...result, authorMatch, _originalIndex: index };
  }).sort((a,b) => Number(b.authorMatch) - Number(a.authorMatch) || a._originalIndex - b._originalIndex);
}

async function prioritizeByStreaming(results, type) {
  const selectedIds = new Set((state.discoverPrefs.streamingProviderIds || []).map(String));
  if (!['tv','movie'].includes(type)) return results || [];

  const annotated = [];
  const source = results || [];
  for (let start = 0; start < source.length; start += 5) {
    const batch = source.slice(start, start + 5);
    const resolved = await Promise.all(batch.map(async (result, offset) => {
      try {
        const availability = await getCached(
          `discover:watch:${type}:${result.providerId}:${state.settings.tmdbWatchRegion || 'CA'}`,
          () => TrackerAPI.getWatchProviders(type, result.providerId, state.settings)
        );
        const allProviders = availability.providers || [];
        const matches = allProviders.filter(provider => selectedIds.has(String(provider.providerId)));
        return {
          ...result,
          preferredStreaming: matches.length > 0,
          preferredProviderNames: matches.map(provider => provider.name),
          streamingProviderNames: allProviders.map(provider => provider.name),
          streamingLink: availability.link || '',
          _originalIndex: start + offset
        };
      } catch {
        return { ...result, preferredStreaming: false, preferredProviderNames: [], streamingProviderNames: [], _originalIndex: start + offset };
      }
    }));
    annotated.push(...resolved);
  }

  return annotated.sort((a,b) => Number(b.preferredStreaming) - Number(a.preferredStreaming) || a._originalIndex - b._originalIndex);
}

function dedupeDiscoverResults(results) {
  const seen = new Set();
  return (results || []).filter(result => {
    const key = `${result.sourceType || 'book'}:${result.providerId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizedTicketmasterPreferenceKeys(values) {
  const valid = new Set(TICKETMASTER_EVENT_CATEGORIES.map(category => category.key));
  return [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(value => valid.has(value)))];
}

function normalizedTicketmasterPriorityTerms(values) {
  const source = Array.isArray(values) ? values : String(values || '').split(/[,\n]/);
  return [...new Set(source.map(value => String(value || '').trim()).filter(Boolean))].slice(0, 20);
}

function ticketmasterCategoryForKey(key) {
  return TICKETMASTER_EVENT_CATEGORIES.find(category => category.key === key) || null;
}

function ticketmasterPreferenceSignature() {
  const categories = normalizedTicketmasterPreferenceKeys(state.discoverPrefs.eventCategoryKeys).sort();
  const excluded = normalizedTicketmasterPreferenceKeys(state.discoverPrefs.eventExcludedCategoryKeys).sort();
  const priorities = normalizedTicketmasterPriorityTerms(state.discoverPrefs.eventPriorityTerms).map(value => value.toLowerCase()).sort();
  return [state.discoverPrefs.eventEverything !== false ? 'all' : categories.join(','), `x:${excluded.join(',')}`, `p:${priorities.join(',')}`].join('|');
}

function ticketmasterClassificationText(result) {
  return (result?.classifications || []).map(value => String(value || '').trim().toLowerCase()).filter(Boolean);
}

function ticketmasterMatchesCategory(result, key) {
  const category = ticketmasterCategoryForKey(key);
  if (!category) return false;
  const target = category.classificationName.toLowerCase();
  return ticketmasterClassificationText(result).some(value => value === target || value.includes(target) || target.includes(value));
}

function ticketmasterMatchesEventPreferences(result) {
  const excluded = normalizedTicketmasterPreferenceKeys(state.discoverPrefs.eventExcludedCategoryKeys);
  if (excluded.some(key => ticketmasterMatchesCategory(result, key))) return false;
  if (state.discoverPrefs.eventEverything !== false) return true;
  const selected = normalizedTicketmasterPreferenceKeys(state.discoverPrefs.eventCategoryKeys);
  if (!selected.length) return false;
  return selected.some(key => ticketmasterMatchesCategory(result, key));
}

function ticketmasterPriorityHaystack(result) {
  return [
    result?.title,
    result?.venueName,
    result?.city,
    ...(result?.attractions || []),
    ...(result?.classifications || [])
  ].filter(Boolean).join(' ').toLowerCase();
}

function ticketmasterPreferenceBoost(result) {
  const terms = [...new Set([
    ...normalizedTicketmasterPriorityTerms(state.discoverPrefs.eventPriorityTerms),
    ...normalizedTicketmasterCalendarTerms()
  ])];
  if (!terms.length) return 0;
  const haystack = ticketmasterPriorityHaystack(result);
  return terms.some(term => haystack.includes(term.toLowerCase())) ? 12 : 0;
}

function dedupeTicketmasterEvents(results) {
  const seen = new Set();
  return (results || []).filter(result => {
    const key = String(result?.providerId || '').trim() || `${result?.title || ''}:${result?.eventDate || ''}:${result?.venueName || ''}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchTicketmasterEventsForPreferences(query = '', options = {}) {
  if (!state.settings.ticketmasterKey) return [];
  const city = state.discoverPrefs.eventCity || state.settings.homeCity || '';
  const countryCode = state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA';
  const page = Math.max(0, Number(options.page || 0));
  const size = Math.min(50, Math.max(1, Number(options.size || 20)));
  const selected = normalizedTicketmasterPreferenceKeys(state.discoverPrefs.eventCategoryKeys);
  const excluded = normalizedTicketmasterPreferenceKeys(state.discoverPrefs.eventExcludedCategoryKeys);
  const everything = state.discoverPrefs.eventEverything !== false;
  const priorityTerms = [...new Set([
    ...normalizedTicketmasterPriorityTerms(state.discoverPrefs.eventPriorityTerms),
    ...normalizedTicketmasterCalendarTerms()
  ])];
  if (!everything && !selected.length) return [];

  const requests = [];
  const includedClassificationNames = everything
    ? []
    : selected.map(key => ticketmasterCategoryForKey(key)?.classificationName).filter(Boolean);
  const excludedClassificationNames = excluded
    .map(key => ticketmasterCategoryForKey(key)?.classificationName)
    .filter(Boolean)
    .map(name => `-${name}`);
  const classificationNames = [...includedClassificationNames, ...excludedClassificationNames];
  requests.push(TrackerAPI.searchTicketmasterEvents(query, state.settings, {
    city,
    countryCode,
    page,
    size,
    classificationNames,
    startDateTime: options.startDateTime,
    endDateTime: options.endDateTime
  }));

  // Ticketmaster's default API limit is five requests/second. Keep each feed
  // batch to at most four requests: one catalogue request plus up to three
  // rotating priority keyword requests. All saved priority terms still receive
  // a ranking boost when they occur naturally in the catalogue.
  if (!options.skipPrioritySearch && !String(query || '').trim() && priorityTerms.length) {
    const start = (page * 3) % priorityTerms.length;
    const focusedTerms = Array.from({ length: Math.min(3, priorityTerms.length) }, (_, index) => priorityTerms[(start + index) % priorityTerms.length]);
    for (const term of focusedTerms) {
      requests.push(TrackerAPI.searchTicketmasterEvents(term, state.settings, {
        city,
        countryCode,
        page: 0,
        size: 8,
        classificationNames,
        startDateTime: options.startDateTime,
        endDateTime: options.endDateTime
      }));
    }
  }

  const settled = await Promise.allSettled(requests);
  let results = settled.flatMap(entry => entry.status === 'fulfilled' ? (entry.value || []) : []);
  results = dedupeTicketmasterEvents(results).filter(ticketmasterMatchesEventPreferences);
  results.sort((a, b) => {
    const boostDiff = ticketmasterPreferenceBoost(b) - ticketmasterPreferenceBoost(a);
    if (boostDiff) return boostDiff;
    return String(a.eventDate || '9999-12-31').localeCompare(String(b.eventDate || '9999-12-31'));
  });
  return results.slice(0, size);
}

function renderTicketmasterPreferenceOptions() {
  if (!els.eventCategoryOptions || !els.eventExclusionOptions) return;
  const selected = new Set(normalizedTicketmasterPreferenceKeys(state.discoverPrefs.eventCategoryKeys));
  const excluded = new Set(normalizedTicketmasterPreferenceKeys(state.discoverPrefs.eventExcludedCategoryKeys));
  const optionMarkup = (category, mode, checked) => `
    <label class="event-preference-option">
      <input type="checkbox" value="${escapeAttr(category.key)}" data-event-pref-mode="${mode}" ${checked ? 'checked' : ''} />
      <span>${escapeHtml(category.label)}</span>
    </label>`;
  els.eventCategoryOptions.innerHTML = TICKETMASTER_EVENT_CATEGORIES.map(category => optionMarkup(category, 'include', selected.has(category.key))).join('');
  els.eventExclusionOptions.innerHTML = TICKETMASTER_EVENT_CATEGORIES.map(category => optionMarkup(category, 'exclude', excluded.has(category.key))).join('');
  syncTicketmasterPreferenceControls();
}

function syncTicketmasterPreferenceControls() {
  const everything = Boolean(els.eventEverything?.checked);
  els.eventCategoryOptions?.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.disabled = everything;
  });
  els.eventCategoryOptions?.classList.toggle('is-disabled', everything);
}

async function openDiscoverSettings() {
  if (!els.discoverSettingsModal) return;
  els.prioritizeAuthors.checked = state.discoverPrefs.prioritizeAuthors !== false;
  if (els.englishTVOnly) els.englishTVOnly.checked = state.discoverPrefs.englishTVOnly === true;
  if (els.eventCity) els.eventCity.value = state.discoverPrefs.eventCity || state.settings.homeCity || '';
  if (els.eventCountry) els.eventCountry.value = (state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA').toUpperCase();
  if (els.eventEverything) els.eventEverything.checked = state.discoverPrefs.eventEverything !== false;
  if (els.eventPriorityTerms) els.eventPriorityTerms.value = normalizedTicketmasterPriorityTerms(state.discoverPrefs.eventPriorityTerms).join(', ');
  if (els.eventCalendarFollowTerms) els.eventCalendarFollowTerms.value = normalizedTicketmasterCalendarTerms().join(', ');
  if (els.eventAutoLikedArtistCalendar) els.eventAutoLikedArtistCalendar.checked = state.discoverPrefs.eventAutoLikedArtistCalendar !== false;
  renderTicketmasterPreferenceOptions();

  state.discoverProviderDraft = new Map(
    (state.discoverPrefs.streamingProviderIds || []).map((id, index) => [String(id), (state.discoverPrefs.streamingProviderNames || [])[index] || ''])
  );
  els.streamingProviderSearch.value = '';
  els.streamingRegionNote.textContent = `Streaming region: ${(state.settings.tmdbWatchRegion || 'CA').toUpperCase()}`;
  showDialogAtTop(els.discoverSettingsModal);

  try {
    if (!state.watchProviderCatalog.length) {
      state.watchProviderCatalog = await getCached(
        `discover:providerCatalog:${state.settings.tmdbWatchRegion || 'CA'}`,
        () => TrackerAPI.getWatchProviderCatalog(state.settings)
      );
    }
    renderStreamingProviderOptions('');
  } catch (error) {
    els.streamingProviderOptions.innerHTML = `<p class="provider-loading">Could not load services: ${escapeHtml(error.message)}</p>`;
  }
}

function renderStreamingProviderOptions(filter = '') {
  if (!els.streamingProviderOptions) return;
  const selected = new Set(state.discoverProviderDraft.keys());
  const query = filter.trim().toLowerCase();
  const providers = state.watchProviderCatalog
    .filter(provider => !query || provider.name.toLowerCase().includes(query))
    .slice(0, query ? 50 : 36);

  if (!providers.length) {
    els.streamingProviderOptions.innerHTML = '<p class="provider-loading">No matching services.</p>';
    return;
  }

  els.streamingProviderOptions.innerHTML = providers.map(provider => `
    <label class="streaming-provider-option">
      <input type="checkbox" value="${escapeAttr(provider.providerId)}" data-provider-name="${escapeAttr(provider.name)}" ${selected.has(String(provider.providerId)) ? 'checked' : ''} />
      ${provider.logo ? `<img src="${escapeAttr(provider.logo)}" alt="" />` : '<span class="provider-logo-placeholder"></span>'}
      <span>${escapeHtml(provider.name)}</span>
    </label>`).join('');
}

function handleStreamingProviderToggle(event) {
  const input = event.target.closest('input[type="checkbox"]');
  if (!input) return;
  const id = String(input.value);
  if (input.checked) state.discoverProviderDraft.set(id, input.dataset.providerName || '');
  else state.discoverProviderDraft.delete(id);
}

function clearStreamingProviderSelection() {
  state.discoverProviderDraft.clear();
  els.streamingProviderOptions?.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
}

function saveDiscoverSettings(event) {
  event.preventDefault();
  const selectedEntries = [...state.discoverProviderDraft.entries()];
  state.discoverPrefs = {
    ...DEFAULT_DISCOVER_PREFS,
    ...state.discoverPrefs,
    streamingProviderIds: selectedEntries.map(([id]) => id),
    streamingProviderNames: selectedEntries.map(([, name]) => name),
    prioritizeAuthors: els.prioritizeAuthors.checked,
    englishTVOnly: Boolean(els.englishTVOnly?.checked),
    contentTypes: normalizedDiscoverContentTypes(),
    genre: state.discoverPrefs.genre || 'all',
    eventCity: String(els.eventCity?.value || '').trim(),
    eventCountry: String(els.eventCountry?.value || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA').trim().toUpperCase(),
    eventEverything: Boolean(els.eventEverything?.checked),
    eventCategoryKeys: [...(els.eventCategoryOptions?.querySelectorAll('input[type="checkbox"]:checked') || [])].map(input => input.value),
    eventExcludedCategoryKeys: [...(els.eventExclusionOptions?.querySelectorAll('input[type="checkbox"]:checked') || [])].map(input => input.value),
    eventPriorityTerms: normalizedTicketmasterPriorityTerms(els.eventPriorityTerms?.value || ''),
    eventCalendarFollowTerms: normalizedTicketmasterPriorityTerms(els.eventCalendarFollowTerms?.value || ''),
    eventAutoLikedArtistCalendar: els.eventAutoLikedArtistCalendar?.checked !== false
  };
  localStorage.setItem(DISCOVER_PREFS_KEY, JSON.stringify(state.discoverPrefs));
  scheduleCloudSync();
  els.discoverSettingsModal.close();
  renderDiscover(true);
}

function rememberDiscoverResult(result, fallbackType) {
  const type = result.sourceType || fallbackType;
  const key = `${type}:${result.providerId}`;
  state.discoverResults.set(key, { ...result, sourceType: type });
  return key;
}

function discoverCardMarkup(result, key, fallbackType) {
  const type = result.sourceType || fallbackType;
  const item = findDiscoverItem(result);
  const completed = isDiscoverCompleted(result);
  const newDate = state.discoverMode === 'new' ? discoverNewDate(result) : '';
  const year = newDate
    ? formatLongDate(newDate)
    : type === 'book'
      ? String(result.publishedDate || '').slice(0, 4)
      : String(result.subtitle || '').slice(0, 4);
  const rating = result.rating ? `★ ${Number(result.rating).toFixed(1)}` : '';
  const providers = (result.streamingProviderNames || result.preferredProviderNames || []).slice(0, 2);
  const streaming = providers.length ? providers.join(' + ') : (['tv','movie'].includes(type) ? 'Streaming varies' : '');
  const meta = type === 'concert' || type === 'event'
    ? [result.eventDate ? formatLongDate(result.eventDate) : '', formatEventClock(result.eventTime || ''), result.venueName || '', result.city || '', result.recommendationReason || ''].filter(Boolean).join(' · ')
    : type === 'song'
      ? [result.artistName || result.subtitle || '', result.albumName || '', year].filter(Boolean).join(' · ')
      : type === 'artist'
        ? [result.subtitle || result.description || 'Artist'].filter(Boolean).join(' · ')
        : type === 'restaurant'
          ? [result.rating ? `${Number(result.rating).toFixed(1)}★` : '', result.primaryTypeDisplayName || '', result.formattedAddress || result.subtitle || '', 'Google Maps'].filter(Boolean).join(' · ')
          : [year, rating, streaming].filter(Boolean).join(' · ');
  const queueStatus = item ? getQueueStatus(item) : '';
  const plusLabel = queueStatus === 'upnext' ? '+ Queue' : queueStatus === 'tbr' ? '+ TBR' : '+ Add';
  const libraryOnly = ['music','artist','song','restaurant'].includes(type);

  // Restaurants from Google Places generally do not provide a useful poster-style
  // image in this tracker. Render them as compact text cards instead of reserving
  // a large empty 2:3 thumbnail area.
  if (type === 'restaurant') {
    return `<article class="discover-card discover-text-card discover-restaurant-card">
      <button class="discover-text-card-open" type="button" data-discover-detail="${escapeAttr(key)}" aria-label="Open ${escapeAttr(result.title || 'restaurant details')}">
        <span class="discover-text-type-chip">${escapeHtml(getTypeLabel(type))}</span>
        <strong class="discover-text-card-title">${escapeHtml(result.title || 'Untitled')}</strong>
        ${meta ? `<span class="discover-text-card-meta">${escapeHtml(meta)}</span>` : ''}
      </button>
      <div class="discover-card-actions no-complete discover-text-card-actions">
        <button class="discover-add-button${item ? ' is-added' : ''}" type="button" data-discover-restaurant-add="${escapeAttr(key)}">${item ? (getQueueStatus(item) === 'tbr' ? 'In TBR' : '+ Visit') : '+ Add'}</button>
      </div>
    </article>`;
  }

  return `<article class="discover-card">
    <button class="discover-card-open" type="button" data-discover-detail="${escapeAttr(key)}" aria-label="Open ${escapeAttr(result.title || 'details')}">
      <div class="discover-poster-wrap">
        ${result.image ? `<img class="discover-poster" src="${escapeAttr(result.image)}" alt="" />` : '<div class="discover-poster placeholder"></div>'}
        <span class="discover-type-chip">${escapeHtml(getTypeLabel(type))}</span>
      </div>
    </button>
    <div class="discover-card-copy">
      <button class="discover-title-button" type="button" data-discover-detail="${escapeAttr(key)}"><h3>${escapeHtml(result.title || 'Untitled')}</h3></button>
      ${meta ? `<p class="discover-card-meta">${escapeHtml(meta)}</p>` : ''}
      ${result.subtitle && ['book','music'].includes(type) ? `<p class="discover-card-subtitle">${escapeHtml(result.subtitle)}</p>` : ''}
      <div class="discover-card-actions${['event','concert','music','artist','song','restaurant'].includes(type) ? ' no-complete' : ''}">
        ${['tv','movie','book'].includes(type) ? `<button class="discover-complete-button${completed ? ' is-complete' : ''}" type="button" data-discover-complete="${escapeAttr(key)}" aria-label="${type === 'tv' ? 'Choose watched seasons or episodes' : completed ? 'Undo completed' : 'Mark completed'}" title="${type === 'tv' ? 'Choose watched seasons / episodes' : completed ? 'Undo watched / read' : 'Mark watched / read'}">${completed && type !== 'tv' ? '↶' : '✓'}</button>` : ''}
        ${['tv','movie','book'].includes(type) ? `<button class="discover-add-button" type="button" data-discover-add="${escapeAttr(key)}">${escapeHtml(plusLabel)}</button>` : ''}
        ${libraryOnly ? `<button class="discover-add-button${item ? ' is-added' : ''}" type="button" data-discover-library-add="${escapeAttr(key)}" ${item ? 'disabled' : ''}>${item ? 'In Library' : '+ Library'}</button>` : ''}
      </div>
    </div>
  </article>`;
}

function openRestaurantResultForTracking(result) {
  if (!result) return;
  els.detailModal?.close();
  openItemModal('', 'library');
  if (els.itemSourceType) els.itemSourceType.value = 'restaurant';
  updateItemFormForType();
  if (els.catalogueQuery) els.catalogueQuery.value = '';
  selectCatalogueResult(result);
  if (els.manualTitle) {
    els.manualTitle.value = result.title || '';
    els.manualTitle.placeholder = 'Restaurant name';
    els.manualTitle.focus();
  }
}

function openRestaurantQuickAdd(key) {
  const result = state.discoverResults.get(key);
  if (!result || result.sourceType !== 'restaurant' || !els.restaurantQuickAddModal) return;
  state.pendingRestaurantQuickKey = key;
  const existing = findDiscoverItem(result);
  const rating = Math.max(0, Math.min(5, Number(existing?.rating || 0)));
  state.pendingRestaurantQuickRating = rating;
  if (els.restaurantQuickAddTitle) els.restaurantQuickAddTitle.textContent = result.title || 'Restaurant';
  if (els.restaurantQuickAddDate) els.restaurantQuickAddDate.value = '';
  els.restaurantQuickAddRatingPicker?.querySelectorAll('[data-restaurant-quick-rating]').forEach(button => {
    button.classList.toggle('filled', Number(button.dataset.restaurantQuickRating) <= rating);
  });
  showDialogAtTop(els.restaurantQuickAddModal);
}

function saveRestaurantToTBR(key) {
  const result = state.discoverResults.get(key);
  if (!result || result.sourceType !== 'restaurant') return null;
  const item = ensureDiscoverItem(result, 'tbr');
  setItemQueueStatus(item, 'tbr');
  item.date = '';
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderAll();
  renderDiscoverCardInPlace(key);
  return item;
}

function trackRestaurantFromDiscover(key, { date = '', rating = 0 } = {}) {
  const result = state.discoverResults.get(key);
  if (!result || result.sourceType !== 'restaurant') return null;
  const item = ensureDiscoverItem(result, 'library');
  setItemQueueStatus(item, 'library');
  if (Number(rating || 0) > 0) item.rating = Number(rating);
  item.updatedAt = new Date().toISOString();
  item.date = '';

  const visitDate = String(date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    const duplicateVisit = state.history.some(entry =>
      entry.sourceItemId === item.id && entry.kind === 'restaurant-visit' && entry.date === visitDate
    );
    if (!duplicateVisit) {
      addHistoryRecord({
        sourceItemId: item.id,
        sourceType: 'restaurant',
        type: 'food',
        typeLabel: 'Food',
        subcategory: 'Restaurant',
        date: visitDate,
        showOnCalendar: true,
        kind: 'restaurant-visit',
        title: item.title,
        subtitle: 'Restaurant visit',
        notes: '',
        rating: Number(rating || 0),
        image: '',
        provider: item.provider,
        providerId: item.providerId
      });
      saveHistory();
    }
  }

  saveItems();
  renderAll();
  renderDiscoverCardInPlace(key);
  return item;
}

async function handleRestaurantQuickAddChoice(event) {
  const ratingButton = event.target.closest('[data-restaurant-quick-rating]');
  if (ratingButton) {
    event.preventDefault();
    const selected = Number(ratingButton.dataset.restaurantQuickRating || 0);
    state.pendingRestaurantQuickRating = toggledStarRating(state.pendingRestaurantQuickRating, selected);
    els.restaurantQuickAddRatingPicker?.querySelectorAll('[data-restaurant-quick-rating]').forEach(button => {
      button.classList.toggle('filled', Number(button.dataset.restaurantQuickRating) <= state.pendingRestaurantQuickRating);
    });
    return;
  }
  const clearRating = event.target.closest('[data-restaurant-quick-rating-clear]');
  if (clearRating) {
    event.preventDefault();
    state.pendingRestaurantQuickRating = 0;
    els.restaurantQuickAddRatingPicker?.querySelectorAll('[data-restaurant-quick-rating]').forEach(button => button.classList.remove('filled'));
    return;
  }
  const action = event.target.closest('[data-restaurant-quick-action]');
  if (!action || !state.pendingRestaurantQuickKey) return;
  const key = state.pendingRestaurantQuickKey;
  if (action.dataset.restaurantQuickAction === 'tbr') {
    saveRestaurantToTBR(key);
  } else {
    trackRestaurantFromDiscover(key, {
      date: els.restaurantQuickAddDate?.value || '',
      rating: state.pendingRestaurantQuickRating
    });
  }
  els.restaurantQuickAddModal?.close();
  if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
}

async function handleDiscoverClick(event) {
  const complete = event.target.closest('[data-discover-complete]');
  if (complete) {
    const key = complete.dataset.discoverComplete;
    const result = state.discoverResults.get(key);
    if (result?.sourceType === 'tv') {
      await openDiscoverDetail(key);
      requestAnimationFrame(() => {
        const picker = els.detailBody?.querySelector('[data-tv-watch-picker]');
        picker?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    } else if (result && isDiscoverCompleted(result)) {
      // Undo is an explicit action and can happen immediately.
      await markDiscoverCompleted(key, { promptForRating: false });
    } else if (result) {
      // New completion is provisional until the quick-add Continue button.
      openDiscoverRatingPrompt(key, { completionIntent: true });
    }
    return;
  }

  const add = event.target.closest('[data-discover-add]');
  if (add) {
    openDiscoverQueueChoice(add.dataset.discoverAdd);
    return;
  }

  const restaurantAdd = event.target.closest('[data-discover-restaurant-add]');
  if (restaurantAdd) {
    openRestaurantQuickAdd(restaurantAdd.dataset.discoverRestaurantAdd);
    return;
  }

  const libraryAdd = event.target.closest('[data-discover-library-add]');
  if (libraryAdd) {
    const key = libraryAdd.dataset.discoverLibraryAdd;
    const result = state.discoverResults.get(key);
    if (result?.sourceType === 'restaurant') {
      openRestaurantResultForTracking(result);
    } else if (result && ['music','artist','song'].includes(result.sourceType)) {
      ensureDiscoverItem(result, 'library');
      renderAll();
      renderDiscoverCardInPlace(key);
      if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
    }
    return;
  }

  const detail = event.target.closest('[data-discover-detail]');
  if (detail) {
    await openDiscoverDetail(detail.dataset.discoverDetail);
  }
}

function cloneDiscoverQuickAddValue(value) {
  if (value == null) return value;
  try {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function beginDiscoverQuickAddSession(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  if (state.discoverQuickAddRollback?.key === key) return;

  // Only one quick-add dialog can be active at a time. If a stale session is
  // left behind, discard the marker rather than allowing it to affect a new card.
  state.discoverQuickAddRollback = null;
  state.discoverQuickAddCommitted = false;

  const existing = findDiscoverItem(result);
  state.discoverQuickAddRollback = {
    key,
    itemId: existing?.id || '',
    itemSnapshot: existing ? cloneDiscoverQuickAddValue(existing) : null,
    historySnapshot: existing
      ? state.history.filter(entry => entry.sourceItemId === existing.id).map(cloneDiscoverQuickAddValue)
      : []
  };
}

function commitDiscoverQuickAddSession(key = '') {
  if (!state.discoverQuickAddRollback) return;
  if (key && state.discoverQuickAddRollback.key !== key) return;
  state.discoverQuickAddCommitted = true;
  state.discoverQuickAddRollback = null;
}

function rollbackDiscoverQuickAddSession(key = '') {
  const rollback = state.discoverQuickAddRollback;
  if (!rollback || state.discoverQuickAddCommitted) return false;
  if (key && rollback.key !== key) return false;
  const result = state.discoverResults.get(rollback.key);

  if (rollback.itemSnapshot) {
    const index = state.items.findIndex(item => item.id === rollback.itemId);
    const restored = cloneDiscoverQuickAddValue(rollback.itemSnapshot);
    if (index >= 0) state.items.splice(index, 1, restored);
    else state.items.push(restored);

    state.history = state.history.filter(entry => entry.sourceItemId !== rollback.itemId);
    state.history.push(...rollback.historySnapshot.map(cloneDiscoverQuickAddValue));
  } else if (result) {
    const current = findDiscoverItem(result);
    if (current) {
      state.items = state.items.filter(item => item.id !== current.id);
      state.history = state.history.filter(entry => entry.sourceItemId !== current.id);
    }
  }

  state.discoverQuickAddRollback = null;
  state.discoverQuickAddCommitted = false;
  saveItems();
  saveHistory();
  renderAll();
  renderDiscoverCardInPlace(rollback.key);
  return true;
}

function finishDiscoverQuickAddClose(key = '') {
  if (!state.discoverQuickAddCommitted) rollbackDiscoverQuickAddSession(key);
  state.discoverQuickAddRollback = null;
  state.discoverQuickAddCommitted = false;
}

async function handleDiscoverRateRecommend(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const existing = findDiscoverItem(result);

  // Existing Recommended can still be explicitly removed without opening a
  // quick-add flow. For a new recommendation, do not create anything yet.
  if (existing?.recommended) {
    existing.recommended = false;
    existing.updatedAt = new Date().toISOString();
    saveItems();
    renderLibrary();
    renderDiscoverCardInPlace(key);
    return;
  }

  if (result.sourceType === 'tv') {
    state.pendingDiscoverRatingTrackTV = true;
    openDiscoverRatingPrompt(key, { allowTV: true, recommendIntent: true });
    return;
  }

  if (result.sourceType === 'movie' || result.sourceType === 'book') {
    openDiscoverRatingPrompt(key, {
      completionIntent: !isDiscoverCompleted(result),
      recommendIntent: true
    });
  }
}

async function toggleDiscoverRecommended(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');
  item.recommended = !item.recommended;
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderLibrary();
  renderDiscoverCardInPlace(key);
  if (els.discoverRatingRecommendHeart && state.pendingDiscoverRatingKey === key) {
    els.discoverRatingRecommendHeart.textContent = item.recommended ? '♥' : '♡';
    els.discoverRatingRecommendHeart.classList.toggle('is-recommended', Boolean(item.recommended));
    els.discoverRatingRecommendHeart.setAttribute('aria-pressed', String(Boolean(item.recommended)));
    els.discoverRatingRecommendHeart.setAttribute('aria-label', item.recommended ? 'Remove from Recommended' : 'Add to Recommended');
  }
  if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
}

function renderDiscoverCardInPlace(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const button = document.querySelector(`[data-discover-detail="${CSS.escape(key)}"]`);
  const card = button?.closest('.discover-card');
  if (!card) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = discoverCardMarkup(result, key, result.sourceType).trim();
  const replacement = wrapper.firstElementChild;
  if (replacement) card.replaceWith(replacement);
}

function openDiscoverQueueChoice(key) {
  const result = state.discoverResults.get(key);
  if (!result || !els.discoverQueueModal) return;
  state.pendingDiscoverKey = key;
  els.discoverQueueTitle.textContent = result.title || 'Where should this go?';
  showDialogAtTop(els.discoverQueueModal);
}

async function handleDiscoverQueueChoice(event) {
  const button = event.target.closest('[data-discover-queue-choice]');
  if (!button || !state.pendingDiscoverKey) return;
  const key = state.pendingDiscoverKey;
  const status = button.dataset.discoverQueueChoice === 'tbr' ? 'tbr' : 'upnext';
  try {
    const item = addDiscoverToQueue(key, status);
    const result = state.discoverResults.get(key);
    if (!item || (result && !findDiscoverItem(result))) throw new Error('Discover item was not saved.');
  } catch (error) {
    console.error('[Discover] Could not add item to queue', { key, status, error });
    showActionFeedback('Could not add to Library. Try again.', true);
    return;
  }
  els.discoverQueueModal.close();
  state.pendingDiscoverKey = null;
  await renderDiscover();
  if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
}

function addDiscoverToQueue(key, status) {
  const result = state.discoverResults.get(key);
  if (!result) return null;
  const item = ensureDiscoverItem(result, status);
  setItemQueueStatus(item, status);
  item.completedAt = '';
  applyReleaseQueueAutomation(item);
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderAll();
  return item;
}

function findDiscoverItem(result) {
  return state.items.find(item =>
    getSourceType(item) === result.sourceType &&
    String(item.providerId || '') === String(result.providerId || '')
  ) || null;
}

function ensureDiscoverItem(result, queueStatus = 'library') {
  let item = findDiscoverItem(result);
  if (item) return item;

  const sourceType = result.sourceType;
  const isMusicFamily = ['music', 'artist', 'song', 'concert'].includes(sourceType);
  const isFoodFamily = ['food', 'restaurant', 'recipe'].includes(sourceType);
  const discoverMusicSubcategory = sourceType === 'music' ? 'Album' : musicSubcategoryForSourceType(sourceType);
  const discoverFoodSubcategory = foodSubcategoryForSourceType(sourceType);
  item = {
    id: makeId(),
    sourceType,
    type: isMusicFamily ? 'music' : isFoodFamily ? 'food' : sourceType,
    typeLabel: isMusicFamily ? 'Music' : isFoodFamily ? 'Food' : (SOURCE_ITEM_LABELS[sourceType] || getTypeLabel(sourceType)),
    subcategory: isMusicFamily ? discoverMusicSubcategory : discoverFoodSubcategory,
    title: result.title || 'Untitled',
    provider: result.provider || (sourceType === 'book' ? 'googleBooks' : ['music','artist','song'].includes(sourceType) ? 'itunes' : sourceType === 'restaurant' ? 'googlePlaces' : sourceType === 'concert' ? 'ticketmaster' : sourceType === 'event' ? 'ticketmaster' : 'tmdb'),
    providerId: String(result.providerId || ''),
    image: result.image || '',
    subtitle: result.subtitle || '',
    rating: 0,
    notes: '',
    recommended: false,
    genres: extractItemGenres(sourceType, result, null),
    releaseDate: extractItemReleaseDate(sourceType, result, null),
    attachments: [],
    links: [],
    date: ['event','concert'].includes(sourceType) ? (result.eventDate || '') : '',
    queueStatus,
    active: queueStatus === 'upnext',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: {},
    artistName: result.artistName || (sourceType === 'artist' ? result.title : result.subtitle) || '',
    artistId: result.artistId || '',
    albumName: result.albumName || '',
    lastfmUrl: result.lastfmUrl || result.raw?.lastfmUrl || '',
    raw: result.raw ? { ...result.raw } : {}
  };

  if (sourceType === 'tv') item.progress = { nextSeason: 1, nextEpisode: 1 };
  if (sourceType === 'book') item.progress = { currentPage: 0, totalPages: Number(result.pageCount || 0), readingPeriods: [] };
  if (sourceType === 'event' || sourceType === 'concert') {
    item.eventMeta = {
      eventDate: result.eventDate || '', eventTime: result.eventTime || '', startDateTime: result.startDateTime || '', timezone: result.timezone || '',
      venueName: result.venueName || '', city: result.city || '', region: result.region || '', address: result.address || '',
      ticketUrl: result.ticketUrl || '', status: result.status || '', classifications: result.classifications || [], priceRange: result.priceRange || null
    };
    item.genres = [...(result.classifications || [])];
    item.releaseDate = result.eventDate || '';
  }
  applyReleaseQueueAutomation(item);
  state.items.push(item);
  saveItems();
  return item;
}

function isDiscoverCompleted(result) {
  const item = findDiscoverItem(result);
  if (item?.completedAt) return true;
  const providerId = String(result.providerId || '');
  return state.history.some(entry =>
    entry.showOnCalendar === false &&
    String(entry.providerId || '') === providerId &&
    ['series-watched','movie-watched','book-finished'].includes(entry.kind)
  );
}

async function markDiscoverCompleted(key, { promptForRating = false } = {}) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');

  if (result.sourceType === 'book') {
    const wasComplete = Boolean(item.completedAt);
    await markWholeBookComplete(item, { createReadingPeriod: false });
    renderDiscoverCardInPlace(key);
    if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
    if (!wasComplete && promptForRating) openDiscoverRatingPrompt(key, { completionIntent: false });
    return;
  }

  const completed = isDiscoverCompleted(result);
  if (completed) {
    item.completedAt = '';
    state.history = state.history.filter(entry => !(
      entry.sourceItemId === item.id && ['movie-watched','item-completed'].includes(entry.kind)
    ));
    item.updatedAt = new Date().toISOString();
    saveItems();
    saveHistory();
    renderAll();
    renderDiscoverCardInPlace(key);
    if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
    return;
  }

  setItemQueueStatus(item, 'library');
  item.completedAt = todayString();
  item.updatedAt = new Date().toISOString();
  const kind = result.sourceType === 'movie' ? 'movie-watched' : 'item-completed';
  state.history = state.history.filter(entry => !(entry.sourceItemId === item.id && entry.kind === kind));
  addHistoryRecord({
    sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: '', showOnCalendar: false, kind,
    title: item.title, subtitle: item.subtitle || '', notes: result.description || '', rating: Number(item.rating || 0),
    image: item.image || '', provider: item.provider, providerId: item.providerId
  });
  saveItems();
  saveHistory();
  renderAll();
  renderDiscoverCardInPlace(key);
  if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
  if (promptForRating && result.sourceType === 'movie') openDiscoverRatingPrompt(key, { completionIntent: false });
}

function openDiscoverRatingPrompt(key, { allowTV = false, completionIntent = false, recommendIntent = null } = {}) {
  const result = state.discoverResults.get(key);
  const allowed = ['movie','book'].includes(result?.sourceType) || (allowTV && result?.sourceType === 'tv');
  if (!result || !allowed || !els.discoverRatingModal) return;

  // IMPORTANT: opening this modal must not mutate Library/history. Everything
  // below is temporary UI state until the user presses Continue.
  state.pendingDiscoverRatingKey = key;
  state.pendingDiscoverCompletionIntent = Boolean(completionIntent);
  if (els.discoverRatingTitle) els.discoverRatingTitle.textContent = `Rate ${result.title || (result.sourceType === 'book' ? 'this book' : 'this movie')}`;
  const existing = findDiscoverItem(result);
  const rating = Math.max(0, Math.min(5, Number(existing?.rating || 0)));
  state.pendingDiscoverRatingValue = rating;
  state.pendingDiscoverDateValue = existing?.date || '';
  state.pendingDiscoverRecommendedValue = recommendIntent == null ? Boolean(existing?.recommended) : Boolean(recommendIntent);
  if (els.discoverRatingDate) els.discoverRatingDate.value = state.pendingDiscoverDateValue;
  els.discoverRatingPicker?.querySelectorAll('[data-discover-rating-choice]').forEach(button => {
    button.classList.toggle('filled', Number(button.dataset.discoverRatingChoice) <= rating);
  });
  if (els.discoverRatingRecommendHeart) {
    const recommended = state.pendingDiscoverRecommendedValue;
    els.discoverRatingRecommendHeart.dataset.discoverRecommend = key;
    els.discoverRatingRecommendHeart.textContent = recommended ? '♥' : '♡';
    els.discoverRatingRecommendHeart.classList.toggle('is-recommended', recommended);
    els.discoverRatingRecommendHeart.setAttribute('aria-pressed', String(recommended));
    els.discoverRatingRecommendHeart.setAttribute('aria-label', recommended ? 'Remove from Recommended' : 'Add to Recommended');
  }
  showDialogAtTop(els.discoverRatingModal);
}

function persistDiscoverOptionalDate(key, dateValue) {
  const date = String(dateValue || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = findDiscoverItem(result) || ensureDiscoverItem(result, 'library');
  item.date = date;
  item.calendarHidden = false;
  item.updatedAt = new Date().toISOString();
  for (const entry of state.history) {
    if (entry.sourceItemId !== item.id) continue;
    if (['series-watched','movie-watched','book-finished','item-completed'].includes(entry.kind)) {
      entry.date = date;
      entry.showOnCalendar = true;
    }
  }
  saveItems();
  saveHistory();
  renderAll();
}

async function commitDiscoverQuickAddOnContinue(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;

  const rating = Math.max(0, Math.min(5, Number(state.pendingDiscoverRatingValue || 0)));
  const date = String(els.discoverRatingDate?.value || state.pendingDiscoverDateValue || '').trim();
  const recommended = Boolean(state.pendingDiscoverRecommendedValue);
  const completionIntent = Boolean(state.pendingDiscoverCompletionIntent);
  let item = findDiscoverItem(result);

  // Continue is the save boundary. Rating, recommendation, and date are all
  // optional; leaving every optional field blank must still save the item.
  if (!item) {
    item = ensureDiscoverItem(result, 'library');
    if (!item || !findDiscoverItem(result)) throw new Error('Discover item was not saved.');
    if (result.sourceType === 'tv') item.watchDisposition = 'stopped';
  }

  item.rating = rating;
  item.recommended = recommended;
  item.updatedAt = new Date().toISOString();
  saveItems();

  if (completionIntent && !isDiscoverCompleted(result)) {
    await markDiscoverCompleted(key, { promptForRating: false });
    item = findDiscoverItem(result) || item;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    persistDiscoverOptionalDate(key, date);
  } else {
    // Keep completion-history ratings synchronized even when no date is given.
    for (const entry of state.history) {
      if (entry.sourceItemId === item.id && ['series-watched','movie-watched','book-finished','item-completed'].includes(entry.kind)) {
        entry.rating = rating;
      }
    }
    saveHistory();
    renderAll();
  }
  renderDiscoverCardInPlace(key);
}

async function handleDiscoverRatingChoice(event) {
  const heart = event.target.closest('[data-discover-recommend]');
  if (heart && state.pendingDiscoverRatingKey) {
    event.preventDefault();
    event.stopPropagation();
    state.pendingDiscoverRecommendedValue = !state.pendingDiscoverRecommendedValue;
    heart.textContent = state.pendingDiscoverRecommendedValue ? '♥' : '♡';
    heart.classList.toggle('is-recommended', state.pendingDiscoverRecommendedValue);
    heart.setAttribute('aria-pressed', String(state.pendingDiscoverRecommendedValue));
    heart.setAttribute('aria-label', state.pendingDiscoverRecommendedValue ? 'Remove from Recommended' : 'Add to Recommended');
    return;
  }

  const choice = event.target.closest('[data-discover-rating-choice]');
  if (choice && state.pendingDiscoverRatingKey) {
    event.preventDefault();
    event.stopPropagation();
    const selected = Number(choice.dataset.discoverRatingChoice);
    const rating = toggledStarRating(state.pendingDiscoverRatingValue, selected);
    state.pendingDiscoverRatingValue = rating;
    els.discoverRatingPicker?.querySelectorAll('[data-discover-rating-choice]').forEach(button => {
      button.classList.toggle('filled', Number(button.dataset.discoverRatingChoice) <= rating);
    });
    return;
  }
  if (event.target.closest('[data-discover-rating-continue]')) {
    event.preventDefault();
    event.stopPropagation();
    const key = state.pendingDiscoverRatingKey;
    try {
      if (key) await commitDiscoverQuickAddOnContinue(key);
      const result = key ? state.discoverResults.get(key) : null;
      if (result && !findDiscoverItem(result)) throw new Error('Discover item was not saved.');
    } catch (error) {
      console.error('[Discover] Continue failed', { key, error });
      showActionFeedback('Could not add to Library. Try again.', true);
      return;
    }

    // Continue is the commit boundary. X / Escape / swipe never write anything.
    els.discoverRatingModal?.close();
  }
}

async function handleDiscoverQuickMetaClick(event) {
  const seriesComplete = event.target.closest('[data-discover-mark-all-tv]');
  if (seriesComplete) {
    event.preventDefault();
    event.stopPropagation();
    await markDiscoverSeriesWatched(seriesComplete.dataset.discoverKey, seriesComplete);
    return;
  }

  const restaurantAdd = event.target.closest('[data-discover-restaurant-add]');
  if (restaurantAdd) {
    openRestaurantQuickAdd(restaurantAdd.dataset.discoverRestaurantAdd);
    return;
  }

  const libraryAdd = event.target.closest('[data-discover-library-add]');
  if (libraryAdd) {
    event.preventDefault();
    event.stopPropagation();
    const key = libraryAdd.dataset.discoverLibraryAdd;
    const result = state.discoverResults.get(key);
    if (result?.sourceType === 'restaurant') {
      openRestaurantResultForTracking(result);
    } else if (result && ['music','artist','song'].includes(result.sourceType)) {
      ensureDiscoverItem(result, 'library');
      renderAll();
      renderDiscoverCardInPlace(key);
      if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
    }
    return;
  }

  const ratingButton = event.target.closest('[data-discover-tv-rating]');
  if (ratingButton) {
    event.preventDefault();
    event.stopPropagation();
    const key = ratingButton.dataset.discoverKey;
    const section = els.detailBody?.querySelector(`[data-discover-tv-meta="${CSS.escape(key)}"]`);
    const selected = Number(ratingButton.dataset.discoverTvRating);
    const rating = toggledStarRating(section?.dataset.pendingRating, selected);
    setDiscoverTVPendingRating(key, rating);
    persistDiscoverRating(key, rating);
    return;
  }

  const clearRatingButton = event.target.closest('[data-clear-discover-tv-rating]');
  if (clearRatingButton) {
    event.preventDefault();
    event.stopPropagation();
    const key = clearRatingButton.dataset.discoverKey;
    setDiscoverTVPendingRating(key, 0);
    persistDiscoverRating(key, 0);
    return;
  }

  const heart = event.target.closest('[data-discover-recommend]');
  if (heart) {
    event.preventDefault();
    event.stopPropagation();
    await toggleDiscoverRecommended(heart.dataset.discoverRecommend);
  }
}

async function openDiscoverTVTrackingAfterRating(key) {
  await openDiscoverDetail(key);
  requestAnimationFrame(() => {
    els.detailBody?.querySelector('[data-tv-watch-picker]')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
}

async function openDiscoverDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  state.openDiscoverKey = key;
  if (!els.detailModal.open) showDialogAtTop(els.detailModal);
  els.detailBody.innerHTML = '<p class="loading-detail">Loading details…</p>';
  try {
    if (result.sourceType === 'tv') await renderDiscoverTVDetail(key);
    else if (result.sourceType === 'movie') await renderDiscoverMovieDetail(key);
    else if (result.sourceType === 'book') await renderDiscoverBookDetail(key);
    else if (result.sourceType === 'music') await renderDiscoverAlbumDetail(key);
    else if (result.sourceType === 'artist') await renderDiscoverArtistDetail(key);
    else if (result.sourceType === 'song') await renderDiscoverSongDetail(key);
    else if (result.sourceType === 'concert') await renderDiscoverConcertDetail(key);
    else if (result.sourceType === 'restaurant') await renderDiscoverRestaurantDetail(key);
    else if (result.sourceType === 'event') await renderDiscoverEventDetail(key);
  } catch (error) {
    els.detailBody.innerHTML = `<div class="api-error">${escapeHtml(error.message)}</div>`;
  }
}

function hasDiscoverTVWatchHistory(item) {
  if (!item) return false;
  return Boolean(item.completedAt) || state.history.some(entry =>
    entry.sourceItemId === item.id && ['episode-watched', 'series-watched'].includes(entry.kind)
  );
}

function discoverTVPersonalMetadataMarkup(item, key) {
  const rating = Math.max(0, Math.min(5, Number(item?.rating || 0)));
  return `<section class="detail-section discover-personal-meta" data-discover-tv-meta="${escapeAttr(key)}" data-item-id="${escapeAttr(item?.id || '')}" data-pending-rating="${rating}">
    <div class="detail-section-heading">
      <div>
        <h3>Your rating & notes</h3>
        <p class="discover-history-note">Choosing a star saves immediately. Notes are saved with the button below.</p>
      </div>
    </div>
    <fieldset class="rating-fieldset discover-rating-fieldset">
      <legend>Rating <span>optional</span></legend>
      <div class="star-picker discover-tv-rating-picker rating-with-heart" aria-label="Your rating out of five stars">
        ${[1,2,3,4,5].map(value => `<button type="button" data-discover-tv-rating="${value}" data-discover-key="${escapeAttr(key)}" class="${value <= rating ? 'filled' : ''}" aria-label="${value} star${value === 1 ? '' : 's'}">★</button>`).join('')}
        <button class="clear-rating" type="button" data-clear-discover-tv-rating data-discover-key="${escapeAttr(key)}">clear</button>
        <button class="rating-heart-button${item?.recommended ? ' is-recommended' : ''}" type="button" data-discover-recommend="${escapeAttr(key)}" aria-label="${item?.recommended ? 'Remove from Recommended' : 'Add to Recommended'}" aria-pressed="${Boolean(item?.recommended)}" title="Recommended">${item?.recommended ? '♥' : '♡'}</button>
      </div>
    </fieldset>
    <label class="field">
      <span>Notes <em>optional</em></span>
      <textarea class="discover-tv-notes" rows="3" placeholder="Anything you want to remember">${escapeHtml(item?.notes || '')}</textarea>
    </label>
    <div class="detail-actions compact-actions">
      <button class="primary-button" type="button" data-save-discover-tv-meta="${escapeAttr(key)}">Save notes</button>
      <span class="discover-tv-meta-status" aria-live="polite"></span>
    </div>
  </section>`;
}

function setDiscoverTVPendingRating(key, value) {
  const section = els.detailBody?.querySelector(`[data-discover-tv-meta="${CSS.escape(key)}"]`);
  if (!section) return;
  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  section.dataset.pendingRating = String(rating);
  section.querySelectorAll('[data-discover-tv-rating]').forEach(button => {
    button.classList.toggle('filled', Number(button.dataset.discoverTvRating) <= rating);
  });
}

function persistDiscoverRating(key, value) {
  const result = state.discoverResults.get(key);
  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  let item = result ? findDiscoverItem(result) : null;

  // Clearing an unsaved zero should not create a new Library item.
  if (!item && !rating) return;
  if (!item && result) {
    item = ensureDiscoverItem(result, 'library');
    // A rating alone should not silently start following a TV show.
    if (result.sourceType === 'tv') item.watchDisposition = 'stopped';
  }
  if (!item) return;

  item.rating = rating;
  item.updatedAt = new Date().toISOString();

  for (const entry of state.history) {
    if (entry.sourceItemId !== item.id) continue;
    if (['series-watched', 'movie-watched', 'book-finished', 'item-completed'].includes(entry.kind)) {
      entry.rating = rating;
    }
  }

  const section = els.detailBody?.querySelector(`[data-discover-tv-meta="${CSS.escape(key)}"]`);
  if (section) {
    section.dataset.itemId = item.id;
    const status = section.querySelector('.discover-tv-meta-status');
    if (status) {
      status.textContent = 'Saved';
      setTimeout(() => { if (status.isConnected) status.textContent = ''; }, 1200);
    }
  }

  saveItems();
  saveHistory();
  renderLibrary();
}

function saveDiscoverTVPersonalMetadata(key) {
  const section = els.detailBody?.querySelector(`[data-discover-tv-meta="${CSS.escape(key)}"]`);
  if (!section) return;

  const result = state.discoverResults.get(key);
  let item = section.dataset.itemId ? findItem(section.dataset.itemId) : null;
  if (!item && result) item = ensureDiscoverItem(result, 'library');
  if (!item) return;

  item.rating = Math.max(0, Math.min(5, Number(section.dataset.pendingRating || 0)));
  item.notes = section.querySelector('.discover-tv-notes')?.value.trim() || '';
  item.updatedAt = new Date().toISOString();
  section.dataset.itemId = item.id;

  for (const entry of state.history) {
    if (entry.sourceItemId !== item.id) continue;
    if (['series-watched', 'movie-watched', 'book-finished', 'item-completed'].includes(entry.kind)) {
      entry.rating = item.rating;
      entry.notes = item.notes;
    }
  }

  saveItems();
  saveHistory();
  renderLibrary();

  const status = section.querySelector('.discover-tv-meta-status');
  if (status) {
    status.textContent = 'Saved';
    setTimeout(() => { if (status.isConnected) status.textContent = ''; }, 1600);
  }
}

function discoverQueueButtonsMarkup(result, key) {
  if (!result || !['tv','movie','book'].includes(result.sourceType)) return '';
  const item = findDiscoverItem(result);
  const current = item ? getQueueStatus(item) : 'library';
  return `<div class="queue-toggle-buttons" aria-label="Queue placement">
    <button class="secondary-button queue-toggle-button${current === 'upnext' ? ' is-selected' : ''}" type="button" data-discover-direct-queue="upnext" data-discover-key="${escapeAttr(key)}" aria-pressed="${current === 'upnext'}">Up Next</button>
    <button class="secondary-button queue-toggle-button${current === 'tbr' ? ' is-selected' : ''}" type="button" data-discover-direct-queue="tbr" data-discover-key="${escapeAttr(key)}" aria-pressed="${current === 'tbr'}">TBR</button>
  </div>`;
}

async function renderDiscoverTVDetail(key, requestedSeason = null) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  state.openDiscoverKey = key;
  state.openDiscoverEpisode = null;
  const details = await getCached(`tv:${result.providerId}`, () => TrackerAPI.getTVDetails(result.providerId, state.settings));
  const availability = await getCached(
    `discover:watch:tv:${result.providerId}:${state.settings.tmdbWatchRegion || 'CA'}`,
    () => TrackerAPI.getWatchProviders('tv', result.providerId, state.settings)
  ).catch(() => ({ providers: [], link: '' }));
  const seasons = (details.seasons || []).filter(season => season.season_number > 0 && season.episode_count > 0);
  const existing = findDiscoverItem(result);
  const seasonNumber = requestedSeason || Number(existing?.progress?.nextSeason || seasons[0]?.season_number || 1);
  const season = await getCached(`season:${result.providerId}:${seasonNumber}`, () => TrackerAPI.getTVSeason(result.providerId, seasonNumber, state.settings));
  const seriesCompleted = hasSeriesBulkCompletion(existing);
  const providers = (availability.providers || []).map(provider => provider.name);
  const providerText = providers.length ? providers.slice(0, 4).join(' · ') : 'No streaming provider listed for your region';

  const seasonRows = (await Promise.all(seasons.map(async info => {
    const seasonData = await getCached(`season:${result.providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(result.providerId, info.season_number, state.settings));
    const aired = (seasonData.episodes || []).filter(ep => Number(ep.episode_number) > 0 && isEpisodeAvailable(ep));
    const allWatched = Boolean(existing) && aired.length > 0 && aired.every(ep => isTVEpisodeLogged(existing, info.season_number, ep.episode_number));
    return `<div class="season-row discover-season-row${info.season_number === seasonNumber ? ' is-current' : ''}">
      <div><div class="list-title">Season ${info.season_number}</div><div class="list-meta">${info.episode_count || 0} episodes${info.air_date ? ` · ${escapeHtml(info.air_date.slice(0,4))}` : ''}</div></div>
      <div class="episode-row-actions">
        <span class="watched-label">${allWatched ? 'WATCHED' : ''}</span>
        <button class="episode-check-button${allWatched ? ' is-checked' : ''}" type="button" data-discover-mark-season="${info.season_number}" data-discover-key="${escapeAttr(key)}" aria-label="${allWatched ? `Clear watched Season ${info.season_number}` : `Mark Season ${info.season_number} watched`}" title="${allWatched ? 'Clear season watched' : 'Mark whole season watched'}">✓</button>
        <button class="detail-arrow-button" type="button" data-discover-season="${info.season_number}" data-discover-key="${escapeAttr(key)}" aria-label="Open Season ${info.season_number}">→</button>
      </div>
    </div>`;
  }))).join('');

  const episodeRows = (season.episodes || []).map(ep => {
    const watched = Boolean(existing && isTVEpisodeLogged(existing, seasonNumber, ep.episode_number));
    const still = TrackerAPI.tmdbImage(ep.still_path);
    return `<div class="episode-row discover-episode-row">
      ${still ? `<img src="${escapeAttr(still)}" alt="" />` : '<div class="episode-image-placeholder"></div>'}
      <div>
        <div class="list-title">E${ep.episode_number} · ${escapeHtml(ep.name || 'Episode')}</div>
        <div class="list-meta">${escapeHtml(shorten(ep.overview || '', 140))}</div>
      </div>
      <div class="episode-row-actions">
        <span class="watched-label">${watched ? 'WATCHED' : ''}</span>
        <button class="episode-check-button${watched ? ' is-checked' : ''}" type="button" data-discover-check-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-discover-key="${escapeAttr(key)}" aria-label="${watched ? `Mark episode ${ep.episode_number} not watched` : `Mark episode ${ep.episode_number} watched`}" title="${watched ? 'Mark not watched' : 'Mark watched'}">✓</button>
        <button class="detail-arrow-button" type="button" data-discover-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-discover-key="${escapeAttr(key)}" aria-label="Open episode ${ep.episode_number}">→</button>
      </div>
    </div>`;
  }).join('');

  els.detailBody.innerHTML = `
    ${detailHero({
      type:'TV',
      title:details.name || result.title,
      image:TrackerAPI.tmdbImage(details.poster_path) || result.image,
      subtitle:[details.first_air_date?.slice(0,4), details.vote_average ? `★ ${Number(details.vote_average).toFixed(1)}` : '', providerText].filter(Boolean).join(' · '),
      overview:details.overview || result.description || ''
    })}
    <div class="discover-detail-actions">
      ${discoverQueueButtonsMarkup(result, key)}
      <button class="secondary-button${seriesCompleted ? ' is-complete' : ''}" type="button" data-discover-mark-all-tv="${escapeAttr(key)}">${seriesCompleted ? '↶ Undo series complete' : '✓ Mark series complete'}</button>
    </div>
    ${discoverTVPersonalMetadataMarkup(existing, key)}
    <section class="detail-section streaming-detail"><h3>Streaming</h3><p>${escapeHtml(providerText)}</p>${availability.link ? `<a href="${escapeAttr(availability.link)}" target="_blank" rel="noopener">See availability ↗</a>` : ''}</section>
    <section class="detail-section" data-tv-watch-picker>
      <div class="detail-section-heading"><h3>Seasons</h3><span class="discover-history-note compact-note">✓ marks the whole season · → opens episodes</span></div>
      <p class="discover-history-note">Watched selections here go to Library history only and never create calendar stickers.</p>
      <div class="season-list season-list-rows">${seasonRows || 'No seasons found.'}</div>
    </section>
    <section class="detail-section">
      <h3>Season ${seasonNumber} episodes</h3>
      <div class="episode-list">${episodeRows || 'No episodes found.'}</div>
    </section>`;
}

async function renderDiscoverTVEpisodeDetail(key, seasonNumber, episodeNumber) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  state.openDiscoverKey = key;
  state.openDiscoverEpisode = { key, seasonNumber, episodeNumber };
  const [series, episode] = await Promise.all([
    getCached(`tv:${result.providerId}`, () => TrackerAPI.getTVDetails(result.providerId, state.settings)),
    getCached(`tv:${result.providerId}:s${seasonNumber}e${episodeNumber}`, () => TrackerAPI.getTVEpisode(result.providerId, seasonNumber, episodeNumber, state.settings))
  ]);
  const existing = findDiscoverItem(result);
  const watched = Boolean(existing && isTVEpisodeLogged(existing, seasonNumber, episodeNumber));
  const image = TrackerAPI.tmdbImage(episode.still_path) || TrackerAPI.tmdbImage(series.backdrop_path) || result.image;

  els.detailBody.innerHTML = `
    <button class="detail-back-button" type="button" data-discover-season="${seasonNumber}" data-discover-key="${escapeAttr(key)}">← Season ${seasonNumber}</button>
    ${detailHero({
      type: `TV · S${seasonNumber} E${episodeNumber}`,
      title: episode.name || `Episode ${episodeNumber}`,
      image,
      subtitle: [series.name || result.title, episode.air_date || '', episode.runtime ? `${episode.runtime} min` : '', episode.vote_average ? `★ ${Number(episode.vote_average).toFixed(1)}` : ''].filter(Boolean).join(' · '),
      overview: episode.overview || ''
    })}
    <div class="detail-actions">
      <button class="primary-button${watched ? ' is-complete' : ''}" type="button" data-discover-check-tv-episode="${episodeNumber}" data-tv-season-number="${seasonNumber}" data-discover-key="${escapeAttr(key)}">${watched ? '✓ Mark not watched' : '✓ Mark watched'}</button>
    </div>`;
}

async function logDiscoverTVEpisode(key, seasonNumber, episodeNumber) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');

  if (isTVEpisodeLogged(item, seasonNumber, episodeNumber)) {
    removeTVEpisodeHistory(item, seasonNumber, episodeNumber);
  } else {
    const episode = await getTVEpisodeFromSeason(item, seasonNumber, episodeNumber);
    if (!episode) throw new Error(`Could not find S${seasonNumber} E${episodeNumber}.`);
    const record = tvHistoryRecord(item, episode, seasonNumber, episodeNumber);
    addHistoryRecord({ ...record, date: '', showOnCalendar: false, imported: true });
  }

  await syncDiscoverTVProgress(item);
  saveItems();
  saveHistory();
  renderAll();
  if (state.openDiscoverEpisode?.key === key && Number(state.openDiscoverEpisode.seasonNumber) === Number(seasonNumber) && Number(state.openDiscoverEpisode.episodeNumber) === Number(episodeNumber)) {
    await renderDiscoverTVEpisodeDetail(key, seasonNumber, episodeNumber);
  } else {
    await renderDiscoverTVDetail(key, seasonNumber);
  }
}

async function markDiscoverSeasonWatched(key, seasonNumber) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');
  const season = await getCached(`season:${result.providerId}:${seasonNumber}`, () => TrackerAPI.getTVSeason(result.providerId, seasonNumber, state.settings));
  const aired = (season.episodes || []).filter(ep => Number(ep.episode_number) > 0 && isEpisodeAvailable(ep));
  const allWatched = aired.length > 0 && aired.every(ep => isTVEpisodeLogged(item, seasonNumber, ep.episode_number));

  if (allWatched) {
    for (const episode of aired) removeTVEpisodeHistory(item, seasonNumber, episode.episode_number);
  } else {
    await maybeMarkEarlierTVSeasonsWatched(item, seasonNumber);
    for (const episode of aired) addImportedTVEpisode(item, episode, seasonNumber);
  }

  await syncDiscoverTVProgress(item);
  saveItems();
  saveHistory();
  renderAll();
  await renderDiscoverTVDetail(key, seasonNumber);
}

async function markDiscoverSeriesWatched(key, triggerButton = null) {
  const result = state.discoverResults.get(key);
  if (!result || result.sourceType !== 'tv') return;
  const item = ensureDiscoverItem(result, 'library');
  const undoing = hasSeriesBulkCompletion(item);

  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.setAttribute('aria-busy', 'true');
    triggerButton.textContent = undoing ? 'Undoing series…' : 'Marking series…';
  }

  try {
    // Reuse the provenance-aware bulk completion routine so undo removes only
    // episodes added by this bulk action and preserves episodes checked manually.
    await markWholeTVSeriesComplete(item);
    renderDiscoverCardInPlace(key);
    if (els.detailModal?.open && state.openDiscoverKey === key) {
      await renderDiscoverTVDetail(key);
    }
  } catch (error) {
    console.error('Could not update Discover series completion:', error);
    if (triggerButton?.isConnected) {
      triggerButton.disabled = false;
      triggerButton.removeAttribute('aria-busy');
      triggerButton.textContent = undoing ? '↶ Undo series complete' : '✓ Mark series complete';
    }
  }
}

async function syncDiscoverTVProgress(item) {
  const next = await findNextUnwatchedTVEpisode(item, 0, 0);
  if (next) {
    item.progress = { ...item.progress, nextSeason: next.seasonNumber, nextEpisode: next.episodeNumber };
    item.completedAt = '';
    state.history = state.history.filter(entry => !(entry.kind === 'series-watched' && entry.sourceItemId === item.id));
    if (item.seriesCompletionToken) {
      const token = item.seriesCompletionToken;
      for (const entry of state.history) {
        if (entry.sourceItemId === item.id && entry.bulkCompletionToken === token) {
          delete entry.bulkCompletionToken;
          delete entry.bulkCompletionScope;
        }
      }
      item.seriesCompletionToken = '';
    }
  } else {
    setItemQueueStatus(item, 'library');
    item.completedAt = item.completedAt || todayString();
  }
}

async function renderDiscoverMovieDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const [details, availability] = await Promise.all([
    getCached(`movie:${result.providerId}`, () => TrackerAPI.getMovieDetails(result.providerId, state.settings)),
    getCached(`discover:watch:movie:${result.providerId}:${state.settings.tmdbWatchRegion || 'CA'}`, () => TrackerAPI.getWatchProviders('movie', result.providerId, state.settings)).catch(() => ({ providers: [], link: '' }))
  ]);
  const providers = (availability.providers || []).map(provider => provider.name);
  const providerText = providers.length ? providers.slice(0, 4).join(' · ') : 'No streaming provider listed for your region';
  const completed = isDiscoverCompleted(result);
  els.detailBody.innerHTML = `
    ${detailHero({
      type:'MOVIE', title:details.title || result.title, image:TrackerAPI.tmdbImage(details.poster_path) || result.image,
      subtitle:[details.release_date?.slice(0,4), details.vote_average ? `★ ${Number(details.vote_average).toFixed(1)}` : '', providerText].filter(Boolean).join(' · '),
      overview:details.overview || result.description || ''
    })}
    <div class="discover-detail-actions">
      ${discoverQueueButtonsMarkup(result, key)}
      <button class="secondary-button${completed ? ' is-complete' : ''}" type="button" data-discover-detail-complete="${escapeAttr(key)}">${completed ? '↶ Mark not watched' : '✓ Mark watched'}</button>
    </div>
    ${discoverTVPersonalMetadataMarkup(findDiscoverItem(result), key)}
    <section class="detail-section streaming-detail"><h3>Streaming</h3><p>${escapeHtml(providerText)}</p>${availability.link ? `<a href="${escapeAttr(availability.link)}" target="_blank" rel="noopener">See availability ↗</a>` : ''}</section>
    ${details.genres?.length ? `<section class="detail-section"><h3>Genres</h3><p>${escapeHtml(details.genres.map(genre => genre.name).join(' · '))}</p></section>` : ''}`;
}


function discoverLibraryOnlyActionMarkup(result, key) {
  const item = findDiscoverItem(result);
  return `<div class="detail-actions"><button class="secondary-button${item ? ' is-selected' : ''}" type="button" data-discover-library-add="${escapeAttr(key)}" ${item ? 'disabled' : ''}>${item ? 'In Library' : '+ Add to Library'}</button></div>`;
}

async function renderDiscoverRestaurantDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = findDiscoverItem(result);
  const ratingText = Number(result.rating || 0) ? `${Number(result.rating).toFixed(1)}★${result.userRatingCount ? ` · ${Number(result.userRatingCount).toLocaleString()} reviews` : ''}` : '';
  els.detailBody.innerHTML = `
    ${detailHero({ type:'RESTAURANT', title:result.title, image:result.image || '', subtitle:[ratingText, result.primaryTypeDisplayName || '', result.formattedAddress || result.subtitle || ''].filter(Boolean).join(' · '), overview:'' })}
    <div class="gmp-attribution detail-gmp-attribution" translate="no">Google Maps</div>
    <div class="detail-actions"><button class="secondary-button${item ? ' is-selected' : ''}" type="button" data-discover-restaurant-add="${escapeAttr(key)}">${item ? (getQueueStatus(item) === 'tbr' ? 'In TBR' : '+ Visit') : '+ Add'}</button></div>
    ${(result.googleMapsUrl || result.websiteUrl) ? `<section class="detail-section restaurant-links">${result.googleMapsUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(result.googleMapsUrl)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>` : ''}${result.websiteUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(result.websiteUrl)}" target="_blank" rel="noopener">Website ↗</a>` : ''}</section>` : ''}
    ${item ? `<section class="detail-section"><p class="detail-meta">Saved in Food · Restaurant. Edit it to add a visit date and order notes.</p></section>` : ''}`;
}

async function renderDiscoverAlbumDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const data = await getCached(`music:${result.providerId}`, () => TrackerAPI.getMusicDetails(result.providerId, state.settings));
  const collection = (data.results || []).find(r => r.wrapperType === 'collection') || (data.results || [])[0] || {};
  const tracks = (data.results || []).filter(r => r.wrapperType === 'track').slice(0, 20);
  const image = (collection.artworkUrl100 || result.image || '').replace('100x100bb','600x600bb');
  els.detailBody.innerHTML = `
    ${detailHero({ type:'ALBUM', title:collection.collectionName || result.title, image, subtitle:[collection.artistName || result.subtitle || '', collection.primaryGenreName || ''].filter(Boolean).join(' · '), overview:'' })}
    ${discoverLibraryOnlyActionMarkup(result, key)}
    ${tracks.length ? `<section class="detail-section"><h3>Tracks</h3><div class="track-list">${tracks.map((track,index) => `<div class="track-row"><div>${index+1}</div><div><div class="list-title">${escapeHtml(track.trackName || 'Track')}</div><div class="list-meta">${escapeHtml(track.artistName || '')}</div></div><div>${track.trackTimeMillis ? formatMillis(track.trackTimeMillis) : ''}</div></div>`).join('')}</div></section>` : ''}`;
}

async function renderDiscoverArtistDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  let artist = {};
  let albums = [];
  let metadataError = '';
  try {
    let itunesArtistId = String(result.raw?.itunesArtistId || result.artistId || '');
    if (!itunesArtistId || result.provider !== 'itunes') {
      musicDiscoverDebug('lazy iTunes artist detail resolution start', { artist: result.title, provider: result.provider });
      const resolved = await resolveLastFmArtistCandidate({ name: result.title, mbid: result.raw?.lastfmMbid || '', match: result.raw?.lastfmMatch || 0 });
      itunesArtistId = String(resolved?.providerId || '');
      if (resolved) {
        result.raw = { ...(result.raw || {}), itunesArtistId };
        result.artistId = itunesArtistId;
        result.image = result.image || resolved.image || '';
        result.subtitle = resolved.subtitle || result.subtitle;
        result.description = resolved.description || result.description;
      }
    }
    if (itunesArtistId) {
      const data = await getCached(`artist:${itunesArtistId}`, () => TrackerAPI.getArtistDetails(itunesArtistId, state.settings));
      artist = (data.results || []).find(r => r.wrapperType === 'artist') || {};
      albums = (data.results || []).filter(r => r.wrapperType === 'collection');
      musicDiscoverDebug('lazy iTunes artist detail resolution complete', { artist: result.title, itunesArtistId, albums: albums.length });
    }
  } catch (error) {
    metadataError = error?.message || String(error);
    musicDiscoverWarn('lazy iTunes artist detail resolution failed', { artist: result.title, error: metadataError });
  }
  const image = (albums.find(album => album.artworkUrl100)?.artworkUrl100 || result.image || '').replace('100x100bb','600x600bb');
  if (!result.image && image) result.image = image;
  const externalUrl = result.lastfmUrl || result.raw?.lastfmUrl || '';
  els.detailBody.innerHTML = `
    ${detailHero({ type:'ARTIST', title:artist.artistName || result.title, image, subtitle:artist.primaryGenreName || result.subtitle || '', overview:'' })}
    ${discoverLibraryOnlyActionMarkup(result, key)}
    ${metadataError ? `<section class="detail-section"><p class="list-meta">Extra iTunes metadata is temporarily unavailable. The Last.fm recommendation is still usable.</p></section>` : ''}
    ${albums.length ? `<section class="detail-section"><h3>Recent albums</h3><div class="track-list">${albums.slice(0,8).map(album => `<div class="track-row"><div>•</div><div><div class="list-title">${escapeHtml(album.collectionName || 'Album')}</div><div class="list-meta">${escapeHtml(String(album.releaseDate || '').slice(0,4))}</div></div></div>`).join('')}</div></section>` : ''}
    ${externalUrl ? `<section class="detail-section"><a class="secondary-button detail-link-button" href="${escapeAttr(externalUrl)}" target="_blank" rel="noopener">Open on Last.fm ↗</a></section>` : ''}`;
}

async function renderDiscoverSongDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  let track = {};
  let metadataError = '';
  try {
    let itunesTrackId = String(result.raw?.itunesTrackId || (result.provider === 'itunes' ? result.providerId : ''));
    if (!itunesTrackId) {
      musicDiscoverDebug('lazy iTunes song detail resolution start', { artist: result.artistName || result.subtitle, track: result.title });
      const resolved = await resolveLastFmTrackCandidate({ name: result.title, artistName: result.artistName || result.subtitle, mbid: result.raw?.lastfmMbid || '' });
      itunesTrackId = String(resolved?.providerId || '');
      if (resolved) {
        result.raw = { ...(result.raw || {}), itunesTrackId };
        result.image = result.image || resolved.image || '';
        result.albumName = resolved.albumName || result.albumName;
        result.releaseDate = resolved.releaseDate || result.releaseDate;
      }
    }
    if (itunesTrackId) {
      const data = await getCached(`song:${itunesTrackId}`, () => TrackerAPI.getSongDetails(itunesTrackId, state.settings));
      track = (data.results || []).find(r => r.wrapperType === 'track') || (data.results || [])[0] || {};
      musicDiscoverDebug('lazy iTunes song detail resolution complete', { artist: result.artistName || result.subtitle, track: result.title, itunesTrackId });
    }
  } catch (error) {
    metadataError = error?.message || String(error);
    musicDiscoverWarn('lazy iTunes song detail resolution failed', { artist: result.artistName || result.subtitle, track: result.title, error: metadataError });
  }
  const image = (track.artworkUrl100 || result.image || '').replace('100x100bb','600x600bb');
  const externalUrl = track.trackViewUrl || result.lastfmUrl || result.raw?.lastfmUrl || '';
  els.detailBody.innerHTML = `
    ${detailHero({ type:'SONG', title:track.trackName || result.title, image, subtitle:[track.artistName || result.subtitle || '', track.collectionName || result.albumName || '', track.primaryGenreName || ''].filter(Boolean).join(' · '), overview:'' })}
    ${discoverLibraryOnlyActionMarkup(result, key)}
    ${metadataError ? `<section class="detail-section"><p class="list-meta">Extra iTunes metadata is temporarily unavailable. The Last.fm recommendation is still usable.</p></section>` : ''}
    ${externalUrl ? `<section class="detail-section"><a class="secondary-button detail-link-button" href="${escapeAttr(externalUrl)}" target="_blank" rel="noopener">${track.trackViewUrl ? 'Open in Apple Music / iTunes' : 'Open on Last.fm'} ↗</a></section>` : ''}`;
}

function discoverEventCalendarActionMarkup(result, key) {
  const item = findDiscoverItem(result);
  const scheduled = Boolean(item?.queueCalendarScheduled);
  return `<button class="secondary-button${scheduled ? ' is-selected' : ''}" type="button" data-discover-event-calendar="${escapeAttr(key)}">${scheduled ? 'Remove from Up Next Calendar' : '+ Calendar'}</button>`;
}

function ticketmasterFollowTermForEvent(event) {
  return String(event?.attractions?.[0] || event?.venueName || event?.title || '').trim();
}

function ticketmasterCalendarFollowButtonMarkup(event, key) {
  const term = ticketmasterFollowTermForEvent(event);
  if (!term) return '';
  const followed = normalizedTicketmasterCalendarTerms().some(value => normalizeArtistName(value) === normalizeArtistName(term));
  return `<button class="secondary-button${followed ? ' is-selected' : ''}" type="button" data-ticketmaster-calendar-follow="${escapeAttr(key)}">${followed ? '♥ Following' : '♡ Follow'} ${escapeHtml(term)}</button>`;
}

async function renderDiscoverConcertDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const dateLine = [result.eventDate ? formatLongDate(result.eventDate) : '', formatEventClock(result.eventTime || ''), result.venueName || '', [result.city, result.region].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  els.detailBody.innerHTML = `
    ${detailHero({ type:'CONCERT', title:result.artistName || result.title, image:result.image || '', subtitle:dateLine, overview:result.description || '' })}
    ${result.recommendationReason ? `<p class="discover-history-note">${escapeHtml(result.recommendationReason)}</p>` : ''}
    <div class="detail-actions">
      ${discoverEventCalendarActionMarkup(result, key)}
      ${result.ticketUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(result.ticketUrl)}" target="_blank" rel="noopener">Tickets on Ticketmaster ↗</a>` : ''}
    </div>
    ${result.lineup?.length ? `<section class="detail-section"><h3>Lineup</h3><p>${escapeHtml(result.lineup.join(' · '))}</p></section>` : ''}`;
}

async function renderDiscoverEventDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const event = result.providerId
    ? await getCached(`ticketmaster:event:${result.providerId}`, () => TrackerAPI.getTicketmasterEvent(result.providerId, state.settings))
    : result;
  const item = findDiscoverItem(result);
  const dateLine = [event.eventDate ? formatLongDate(event.eventDate) : '', formatEventClock(event.eventTime || ''), event.venueName || '', [event.city, event.region].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  const price = event.priceRange;
  const priceText = price && (price.min || price.max)
    ? `${price.currency || ''} ${Number(price.min || price.max).toLocaleString()}${price.max && Number(price.max) !== Number(price.min) ? `–${Number(price.max).toLocaleString()}` : ''}`.trim()
    : '';
  const info = [(event.classifications || []).join(' · '), priceText].filter(Boolean).join(' · ');
  els.detailBody.innerHTML = `
    ${detailHero({ type:'EVENT', title:event.title || result.title, image:event.image || result.image, subtitle:dateLine, overview:event.description || result.description || '' })}
    <div class="detail-actions">
      ${discoverEventCalendarActionMarkup(result, key)}
      ${ticketmasterCalendarFollowButtonMarkup(event, key)}
      ${event.ticketUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(event.ticketUrl)}" target="_blank" rel="noopener">Tickets on Ticketmaster ↗</a>` : ''}
    </div>
    <section class="detail-section"><h3>Event details</h3>${info ? `<p>${escapeHtml(info)}</p>` : ''}${event.address ? `<p class="detail-meta">${escapeHtml(event.address)}</p>` : ''}</section>
  `;
}

async function renderDiscoverBookDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const data = await getCached(`book:${result.providerId}`, () => TrackerAPI.getBookDetails(result.providerId, state.settings));
  const info = data.volumeInfo || {};
  const existing = findDiscoverItem(result);
  if (existing) {
    let changed = false;
    if (info.categories?.length) {
      const genres = [...new Set(info.categories)];
      if (JSON.stringify(existing.genres || []) !== JSON.stringify(genres)) {
        existing.genres = genres;
        changed = true;
      }
    }
    if (info.publishedDate && existing.releaseDate !== info.publishedDate) {
      existing.releaseDate = info.publishedDate;
      changed = true;
    }
    if (changed) saveItems();
  }
  const image = info.imageLinks?.large?.replace('http://','https://') || info.imageLinks?.thumbnail?.replace('http://','https://') || result.image;
  const completed = isDiscoverCompleted(result);
  els.detailBody.innerHTML = `
    ${detailHero({
      type:'BOOK', title:info.title || result.title, image,
      subtitle:[(info.authors || []).join(', '), info.publishedDate?.slice(0,4), info.pageCount ? `${info.pageCount} pages` : ''].filter(Boolean).join(' · '),
      overview:info.description || result.description || ''
    })}
    <div class="discover-detail-actions">
      ${discoverQueueButtonsMarkup(result, key)}
      <button class="secondary-button${completed ? ' is-complete' : ''}" type="button" data-discover-detail-complete="${escapeAttr(key)}">${completed ? '↶ Mark unread' : '✓ Mark read'}</button>
    </div>
    ${discoverTVPersonalMetadataMarkup(existing, key)}
    ${info.categories?.length ? `<section class="detail-section"><h3>Categories</h3><p>${escapeHtml(info.categories.join(' · '))}</p></section>` : ''}`;
}

// ---------------------------
// STICKER SETTINGS
// ---------------------------
function setTrackSettingsTab(tabName = 'stickers') {
  const modal = els.stickerSettingsModal;
  if (!modal) return;
  const active = tabName === 'streaks' ? 'streaks' : 'stickers';
  modal.querySelectorAll('[data-track-settings-tab]').forEach(tab => {
    const selected = tab.dataset.trackSettingsTab === active;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  modal.querySelectorAll('[data-track-settings-panel]').forEach(panel => {
    panel.hidden = panel.dataset.trackSettingsPanel !== active;
  });
  if (active === 'streaks') renderStreakSettingsRows();
  else renderStickerSettingsRows();
  resetDialogScrollPosition(modal);
}

function openStickerSettings() {
  if (!els.stickerSettingsModal || !els.stickerSettingsRows) return;
  setTrackSettingsTab('stickers');
  showDialogAtTop(els.stickerSettingsModal);
}

function getRecognizedStickerTargets() {
  const parents = getRecognizedTypes();
  const targets = [];
  for (const parent of parents) {
    targets.push({ type: parent.type, label: parent.label, subcategory: '', key: parent.type });
    const subcategories = new Set();
    state.items.forEach(item => {
      if (item.type === parent.type && cleanTypeLabel(item.subcategory || '')) subcategories.add(cleanTypeLabel(item.subcategory));
    });
    state.history.forEach(entry => {
      if (entry.type === parent.type && cleanTypeLabel(entry.subcategory || '')) subcategories.add(cleanTypeLabel(entry.subcategory));
    });
    [...subcategories].sort((a,b) => a.localeCompare(b)).forEach(subcategory => {
      targets.push({
        type: parent.type,
        label: `${parent.label} · ${subcategory}`,
        subcategory,
        key: stickerPreferenceKey(parent.type, { subcategory })
      });
    });
  }
  return targets;
}

function renderStickerSettingsRows() {
  const targets = getRecognizedStickerTargets();
  els.stickerSettingsRows.innerHTML = '';

  for (const target of targets) {
    const sampleEntry = state.history.find(entry => entry.type === target.type && cleanTypeLabel(entry.subcategory || '') === target.subcategory)
      || state.items.find(item => item.type === target.type && cleanTypeLabel(item.subcategory || '') === target.subcategory)
      || { type: target.type, subcategory: target.subcategory };
    const config = getStickerConfig(target.type, sampleEntry);
    const row = document.createElement('div');
    row.className = `sticker-setting-row${target.subcategory ? ' sticker-setting-subcategory' : ''}`;
    row.dataset.stickerType = target.type;
    row.dataset.stickerKey = target.key;
    row.dataset.stickerSubcategory = target.subcategory;
    const parentSaved = state.stickerPrefs?.[target.type] || {};
    row.innerHTML = `
      <div class="sticker-setting-card-head">
        <div class="sticker-setting-title-wrap">
          <strong class="sticker-setting-type">${escapeHtml(target.label)}</strong>
          ${target.subcategory
            ? `<span class="sticker-setting-calendar-inherit">Uses ${escapeHtml(getCalendarCategoryLabel(target.type, getTypeLabel(target.type)))}</span>`
            : ''}
        </div>
        <div class="sticker-setting-preview">${calendarStickerMarkup(target.type, sampleEntry)}</div>
      </div>
      <div class="sticker-setting-card-controls">
        ${target.subcategory
          ? ''
          : `<label class="sticker-setting-field sticker-setting-calendar-name sticker-setting-field-wide">
              <span class="sticker-setting-mobile-label">Calendar name</span>
              <input data-sticker-field="calendar-label" type="text" maxlength="30" value="${escapeAttr(parentSaved.calendarLabel || '')}" placeholder="${escapeAttr(target.label)}" />
            </label>`}
        <label class="sticker-setting-field sticker-setting-shape-field">
          <span class="sticker-setting-mobile-label">Shape</span>
          <select data-sticker-field="shape">
            <option value="square" ${config.shape === 'square' ? 'selected' : ''}>Square</option>
            <option value="circle" ${config.shape === 'circle' ? 'selected' : ''}>Circle</option>
            <option value="star" ${config.shape === 'star' ? 'selected' : ''}>Star</option>
            <option value="heart" ${config.shape === 'heart' ? 'selected' : ''}>Heart</option>
          </select>
        </label>
        <label class="sticker-setting-field sticker-setting-color-field">
          <span class="sticker-setting-mobile-label">Color</span>
          <select data-sticker-field="color">
            ${STICKER_COLORS.map(color => `<option value="${color}" ${config.color === color ? 'selected' : ''}>${color[0].toUpperCase()+color.slice(1)}</option>`).join('')}
          </select>
        </label>
        <label class="sticker-setting-field sticker-setting-text-field sticker-setting-field-wide">
          <span class="sticker-setting-mobile-label">Sticker text</span>
          <input data-sticker-field="label" type="text" maxlength="3" value="${escapeAttr(['star','heart'].includes(config.shape) ? '' : config.label)}" placeholder="Optional, up to 3 characters" ${['star','heart'].includes(config.shape) ? 'disabled' : ''} />
        </label>
      </div>`;
    els.stickerSettingsRows.appendChild(row);
  }
}

function previewStickerSettings(event) {
  const row = event.target.closest('.sticker-setting-row[data-sticker-type]');
  if (!row) return;
  const shape = row.querySelector('[data-sticker-field="shape"]')?.value || 'square';
  const color = row.querySelector('[data-sticker-field="color"]')?.value || 'cream';
  const labelInput = row.querySelector('[data-sticker-field="label"]');
  if (labelInput) labelInput.disabled = ['star','heart'].includes(shape);
  const label = ['star','heart'].includes(shape) ? '' : cleanStickerLabel(labelInput?.value ?? '');
  const sampleEntry = { type: row.dataset.stickerType, subcategory: row.dataset.stickerSubcategory || '' };
  const defaults = getDefaultStickerConfig(row.dataset.stickerType, sampleEntry);
  const preview = row.querySelector('.sticker-setting-preview');
  if (preview) {
    const symbol = shape === 'star' ? '★' : shape === 'heart' ? '♥' : escapeHtml(label);
    preview.innerHTML = `<span class="sticker sticker-${shape} sticker-palette-${color} sticker-tilt-${defaults.tilt}">${symbol}</span>`;
  }
}

function saveStickerSettings(event) {
  event.preventDefault();
  const next = { ...state.stickerPrefs };

  els.stickerSettingsRows.querySelectorAll('.sticker-setting-row[data-sticker-type]').forEach(row => {
    const key = row.dataset.stickerKey || row.dataset.stickerType;
    const shape = row.querySelector('[data-sticker-field="shape"]')?.value || 'square';
    const color = row.querySelector('[data-sticker-field="color"]')?.value || 'cream';
    const label = ['star','heart'].includes(shape) ? '' : cleanStickerLabel(row.querySelector('[data-sticker-field="label"]')?.value ?? '');
    const existing = next[key] || {};
    const calendarInput = row.querySelector('[data-sticker-field="calendar-label"]');
    const calendarLabel = calendarInput ? cleanTypeLabel(calendarInput.value) : existing.calendarLabel;
    next[key] = { ...existing, shape, color, label };
    if (calendarInput) {
      if (calendarLabel) next[key].calendarLabel = calendarLabel;
      else delete next[key].calendarLabel;
    }
  });

  state.stickerPrefs = next;
  localStorage.setItem(STICKER_PREFS_KEY, JSON.stringify(state.stickerPrefs));
  scheduleCloudSync();
  els.stickerSettingsModal.close();
  renderTracker();
}

function resetStickerSettings() {
  if (!confirm('Reset every sticker to its default style?')) return;
  state.stickerPrefs = {};
  localStorage.removeItem(STICKER_PREFS_KEY);
  scheduleCloudSync();
  renderStickerSettingsRows();
  renderTracker();
}

function getRecognizedTypes() {
  const types = new Map();
  Object.keys(TYPE_LABELS).forEach(type => types.set(type, getTypeLabel(type)));
  state.customTypes.forEach(entry => types.set(entry.type, entry.label));
  state.items.filter(item => getQueueStatus(item) !== 'tbr').forEach(item => types.set(item.type, getItemTypeLabel(item)));
  state.history.forEach(entry => {
    if (entry.type) types.set(entry.type, entry.typeLabel || getTypeLabel(entry.type));
  });
  return [...types.entries()]
    .map(([type, label]) => ({ type, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function defaultStickerLabel(type) {
  return getDefaultStickerConfig(type, state.history.find(entry => entry.type === type) || {}).label || getTypeLabel(type).slice(0, 1).toUpperCase();
}

// ---------------------------
// STREAKS
// ---------------------------
const WEEKDAY_OPTIONS = [
  { value: 1, short: 'M', label: 'Monday' },
  { value: 2, short: 'T', label: 'Tuesday' },
  { value: 3, short: 'W', label: 'Wednesday' },
  { value: 4, short: 'T', label: 'Thursday' },
  { value: 5, short: 'F', label: 'Friday' },
  { value: 6, short: 'S', label: 'Saturday' },
  { value: 0, short: 'S', label: 'Sunday' }
];

function getRecognizedStreakGroups() {
  const groups = new Map();

  for (const { type, label } of getRecognizedTypes()) {
    const cleanLabel = cleanTypeLabel(label || getTypeLabel(type)) || 'Other';
    const key = slugifyType(cleanLabel);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: cleanLabel,
        memberTypes: [],
        representativeType: type,
        representativeEntry: null
      });
    }
    const group = groups.get(key);
    if (!group.memberTypes.includes(type)) group.memberTypes.push(type);
  }

  // Calendar entries are the final authority for visible grouping. This also
  // catches two different internal source types that have the same displayed
  // type label (for example a YouTube item and a manual item both called
  // "Workout").
  for (const entry of getCalendarEntries()) {
    const label = getCalendarTypeGroupLabel(entry);
    const key = getCalendarTypeGroupKey(entry);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        memberTypes: [],
        representativeType: entry.type,
        representativeEntry: entry
      });
    }
    const group = groups.get(key);
    if (entry.type && !group.memberTypes.includes(entry.type)) group.memberTypes.push(entry.type);
    if (!group.representativeEntry) group.representativeEntry = entry;
  }

  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function resolveStreakGroup(typeOrGroupKey) {
  const value = String(typeOrGroupKey || '');
  const groups = getRecognizedStreakGroups();
  return groups.find(group => group.key === value || group.memberTypes.includes(value)) || {
    key: slugifyType(getTypeLabel(value) || value || 'Other'),
    label: getTypeLabel(value) || value || 'Other',
    memberTypes: value ? [value] : [],
    representativeType: value || 'other',
    representativeEntry: null
  };
}

function getStreakConfig(typeOrGroupKey) {
  const group = resolveStreakGroup(typeOrGroupKey);

  // New streak preferences are keyed by the visible type name. Fall back to
  // the old internal-type keys so existing settings survive this migration.
  let saved = state.streakPrefs?.[group.key];
  if (!saved) {
    for (const memberType of group.memberTypes) {
      if (state.streakPrefs?.[memberType]) {
        saved = state.streakPrefs[memberType];
        break;
      }
    }
  }
  saved ||= {};

  return {
    enabled: Boolean(saved.enabled),
    restDays: Array.isArray(saved.restDays)
      ? [...new Set(saved.restDays.map(Number).filter(day => day >= 0 && day <= 6))]
      : []
  };
}

function getTypeActivityDates(typeOrGroupKey) {
  const group = resolveStreakGroup(typeOrGroupKey);
  return new Set(
    getCalendarEntries()
      .filter(entry => getCalendarTypeGroupKey(entry) === group.key && entry.date && entry.showOnCalendar !== false)
      .map(entry => entry.date)
  );
}

function calculateTypeStreak(typeOrGroupKey, overrideConfig = null) {
  const config = overrideConfig || getStreakConfig(typeOrGroupKey);
  if (!config.enabled) return { enabled: false, count: 0, restToday: false };

  const activityDates = getTypeActivityDates(typeOrGroupKey);
  const restDays = new Set((config.restDays || []).map(Number));
  const now = new Date();
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  let count = 0;
  let firstCalendarDay = true;

  // Ten years is only a safety guard against malformed dates/settings.
  for (let guard = 0; guard < 3650; guard += 1) {
    const weekday = cursor.getDay();
    const date = localDateString(cursor);

    if (restDays.has(weekday)) {
      cursor = addDays(cursor, -1);
      firstCalendarDay = false;
      continue;
    }

    if (activityDates.has(date)) {
      count += 1;
      cursor = addDays(cursor, -1);
      firstCalendarDay = false;
      continue;
    }

    // Today is still in progress, so absence today does not break a streak yet.
    if (firstCalendarDay) {
      cursor = addDays(cursor, -1);
      firstCalendarDay = false;
      continue;
    }

    break;
  }

  return {
    enabled: true,
    count,
    restToday: restDays.has(now.getDay())
  };
}

function streakText(typeOrGroupKey, overrideConfig = null) {
  const streak = calculateTypeStreak(typeOrGroupKey, overrideConfig);
  if (!streak.enabled) return '';
  return `${streak.count} day${streak.count === 1 ? '' : 's'}`;
}

function streakInlineMarkup(typeOrGroupKey) {
  const text = streakText(typeOrGroupKey);
  return text ? `<span class="type-streak-inline"> · ${escapeHtml(text)}</span>` : '';
}

function streakBadgeMarkup(typeOrGroupKey) {
  const text = streakText(typeOrGroupKey);
  return text ? `<span class="type-streak-badge">${escapeHtml(text)}</span>` : '';
}

function renderTrackStreakSummary() {
  if (!els.trackStreakSummary) return;
  const active = getRecognizedStreakGroups()
    .map(group => ({ ...group, text: streakText(group.key) }))
    .filter(entry => entry.text);

  els.trackStreakSummary.hidden = active.length === 0;
  if (!active.length) {
    els.trackStreakSummary.innerHTML = '';
    return;
  }

  els.trackStreakSummary.innerHTML = active.map(group => {
    const representative = group.representativeEntry
      || getCalendarEntries().find(entry => getCalendarTypeGroupKey(entry) === group.key)
      || { type: group.representativeType, typeLabel: group.label };
    return `
      <div class="track-streak-card">
        <span class="track-streak-sticker">${calendarStickerMarkup(representative.type, representative)}</span>
        <span class="track-streak-copy"><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.text)}</small></span>
      </div>`;
  }).join('');
}

function openStreakSettings() {
  if (!els.stickerSettingsModal || !els.streakSettingsRows) return;
  setTrackSettingsTab('streaks');
  showDialogAtTop(els.stickerSettingsModal);
}

function renderStreakSettingsRows() {
  if (!els.streakSettingsRows) return;
  els.streakSettingsRows.innerHTML = '';

  for (const group of getRecognizedStreakGroups()) {
    const config = getStreakConfig(group.key);
    const row = document.createElement('div');
    row.className = `streak-setting-row${config.enabled ? ' is-enabled' : ''}`;
    row.dataset.streakType = group.key;
    row.innerHTML = `
      <div class="streak-setting-type"><strong>${escapeHtml(group.label)}</strong></div>
      <label class="streak-toggle">
        <input data-streak-field="enabled" type="checkbox" ${config.enabled ? 'checked' : ''} />
        <span>On</span>
      </label>
      <div class="rest-day-picker" aria-label="Rest days for ${escapeAttr(group.label)}">
        ${WEEKDAY_OPTIONS.map(day => `
          <label class="rest-day-chip" title="${day.label}">
            <input data-streak-rest-day="${day.value}" type="checkbox" ${config.restDays.includes(day.value) ? 'checked' : ''} />
            <span>${day.short}</span>
          </label>`).join('')}
      </div>
      <div class="streak-setting-current">${escapeHtml(streakText(group.key, config) || 'Off')}</div>`;
    els.streakSettingsRows.appendChild(row);
  }
}

function readStreakRowConfig(row) {
  return {
    enabled: Boolean(row.querySelector('[data-streak-field="enabled"]')?.checked),
    restDays: [...row.querySelectorAll('[data-streak-rest-day]:checked')]
      .map(input => Number(input.dataset.streakRestDay))
  };
}

function previewStreakSettings(event) {
  const row = event.target.closest('.streak-setting-row[data-streak-type]');
  if (!row) return;
  const config = readStreakRowConfig(row);
  row.classList.toggle('is-enabled', config.enabled);
  const current = row.querySelector('.streak-setting-current');
  if (current) current.textContent = streakText(row.dataset.streakType, config) || 'Off';
}

function saveStreakSettings(event) {
  event.preventDefault();
  const next = {};
  els.streakSettingsRows?.querySelectorAll('.streak-setting-row[data-streak-type]').forEach(row => {
    next[row.dataset.streakType] = readStreakRowConfig(row);
  });
  state.streakPrefs = next;
  localStorage.setItem(STREAK_PREFS_KEY, JSON.stringify(state.streakPrefs));
  scheduleCloudSync();
  els.stickerSettingsModal?.close();
  renderAll();
}

function resetStreakSettings() {
  if (!confirm('Turn off all streaks and clear scheduled rest days?')) return;
  state.streakPrefs = {};
  localStorage.removeItem(STREAK_PREFS_KEY);
  scheduleCloudSync();
  renderStreakSettingsRows();
  renderAll();
}

// ---------------------------
// LIBRARY
// ---------------------------
const TMDB_MOVIE_GENRES = {
  28:'Action', 12:'Adventure', 16:'Animation', 35:'Comedy', 80:'Crime', 99:'Documentary',
  18:'Drama', 10751:'Family', 14:'Fantasy', 36:'History', 27:'Horror', 10402:'Music',
  9648:'Mystery', 10749:'Romance', 878:'Science Fiction', 10770:'TV Movie', 53:'Thriller',
  10752:'War', 37:'Western'
};
const TMDB_TV_GENRES = {
  10759:'Action & Adventure', 16:'Animation', 35:'Comedy', 80:'Crime', 99:'Documentary',
  18:'Drama', 10751:'Family', 10762:'Kids', 9648:'Mystery', 10763:'News', 10764:'Reality',
  10765:'Sci-Fi & Fantasy', 10766:'Soap', 10767:'Talk', 10768:'War & Politics', 37:'Western'
};

function extractItemGenres(sourceType, source, editing) {
  if (!source && editing?.genres?.length) return [...editing.genres];
  if (sourceType === 'book') {
    const categories = source?.categories || source?.raw?.volumeInfo?.categories || editing?.genres || [];
    return [...new Set(categories.map(value => String(value || '').trim()).filter(Boolean))];
  }
  if (sourceType === 'tv' || sourceType === 'movie') {
    const direct = source?.genres?.map?.(genre => typeof genre === 'string' ? genre : genre?.name).filter(Boolean) || [];
    if (direct.length) return [...new Set(direct)];
    const ids = source?.raw?.genre_ids || source?.genre_ids || [];
    const map = sourceType === 'tv' ? TMDB_TV_GENRES : TMDB_MOVIE_GENRES;
    const names = ids.map(id => map[Number(id)]).filter(Boolean);
    return names.length ? [...new Set(names)] : [...(editing?.genres || [])];
  }
  if (['music','artist','song'].includes(sourceType)) {
    const genre = source?.raw?.primaryGenreName || source?.description || editing?.genres?.[0] || '';
    return genre ? [String(genre)] : [];
  }
  if (['event', 'concert'].includes(sourceType)) {
    const classifications = source?.classifications || editing?.eventMeta?.classifications || editing?.genres || [];
    return [...new Set(classifications.map(value => String(value || '').trim()).filter(Boolean))];
  }
  return [...(editing?.genres || [])];
}

function extractItemReleaseDate(sourceType, source, editing) {
  if (sourceType === 'book') return normalizedReleaseDate(source?.publishedDate || source?.raw?.volumeInfo?.publishedDate || editing?.releaseDate || '');
  if (sourceType === 'tv') return normalizedReleaseDate(source?.raw?.first_air_date || editing?.releaseDate || '');
  if (sourceType === 'movie') return normalizedReleaseDate(source?.raw?.release_date || editing?.releaseDate || '');
  if (sourceType === 'music' || sourceType === 'song') return normalizedReleaseDate(source?.releaseDate || source?.raw?.releaseDate || editing?.releaseDate || '');
  if (sourceType === 'artist') return normalizedReleaseDate(editing?.releaseDate || '');
  if (['event', 'concert'].includes(sourceType)) return normalizedReleaseDate(source?.eventDate || source?.raw?.dates?.start?.localDate || editing?.date || editing?.releaseDate || '');
  return normalizedReleaseDate(editing?.releaseDate || '');
}

function setLibraryView(view) {
  state.libraryView = view === 'recommended' ? 'recommended' : 'all';
  els.libraryViewTabs?.forEach(tab => {
    const active = tab.dataset.libraryView === state.libraryView;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  renderLibrary();
}

function itemLibraryDate(item) {
  // Library → Recent follows the calendar, not when an item was added, edited,
  // rated, or silently completed. If an item has been removed from the calendar,
  // it is intentionally treated as undated here as well.
  if (!item || item.calendarHidden) return '';

  const dates = state.history
    .filter(entry => entry.sourceItemId === item.id && entry.date && entry.showOnCalendar !== false)
    .map(entry => String(entry.date).slice(0, 10))
    .filter(Boolean);

  const sourceType = getSourceType(item);

  // Non-book items with an explicit item date appear on the calendar directly.
  if (sourceType !== 'book' && item.date) {
    dates.push(String(item.date).slice(0, 10));
  }

  // Book reading periods generate calendar entries for each day in the range.
  // The most recent visible day is the end date, or today for an active period.
  if (sourceType === 'book') {
    const today = todayString();
    for (const period of getBookReadingPeriods(item)) {
      const start = String(period?.startDate || '').slice(0, 10);
      if (!start) continue;
      const end = String(period?.endDate || today).slice(0, 10);
      if (end >= start) dates.push(end);
    }
  }

  return dates.sort().at(-1) || '';
}

function normalizeLibraryPrefs(value) {
  const keys = Array.isArray(value?.defaultTypeKeys)
    ? [...new Set(value.defaultTypeKeys.map(key => slugifyType(key)).filter(Boolean))]
    : null;
  return { defaultTypeKeys: keys };
}

function isCoreLibraryGroupKey(key) {
  const normalized = slugifyType(key).replace(/s$/, '');
  return ['tv','movie','book','music'].includes(normalized);
}

function libraryAvailableTypeGroups() {
  const groups = new Map();
  for (const item of state.items.filter(item => getQueueStatus(item) !== 'tbr')) {
    const key = libraryTypeGroupKey(item);
    if (!groups.has(key)) groups.set(key, getItemTypeLabel(item));
  }

  // Keep the three core content types available even before the user has saved
  // something in each category.
  [['tv', 'TV'], ['movie', 'Movie'], ['book', 'Book'], ['music', 'Music']].forEach(([key, label]) => {
    if (!groups.has(key) && ![...groups.keys()].some(existing => slugifyType(existing).replace(/s$/, '') === key)) {
      groups.set(key, label);
    }
  });

  return [...groups.entries()].sort(([aKey,aLabel],[bKey,bLabel]) => {
    const preferred = ['tv','movie','movies','book','books','music'];
    const ai = preferred.indexOf(aKey);
    const bi = preferred.indexOf(bKey);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return aLabel.localeCompare(bLabel);
  });
}

function libraryDefaultTypeKeys() {
  const prefs = normalizeLibraryPrefs(state.libraryPrefs);
  if (Array.isArray(prefs.defaultTypeKeys)) return prefs.defaultTypeKeys;
  return libraryAvailableTypeGroups().map(([key]) => key).filter(isCoreLibraryGroupKey);
}

function ensureLibraryVisibleTypes() {
  if (!(state.libraryVisibleTypes instanceof Set)) {
    state.libraryVisibleTypes = new Set(libraryDefaultTypeKeys());
  } else if (!Array.isArray(normalizeLibraryPrefs(state.libraryPrefs).defaultTypeKeys)) {
    // When the user has not explicitly customized Library defaults, newly available
    // core media types (including the unified Music category) should become visible automatically.
    for (const [key] of libraryAvailableTypeGroups()) {
      if (isCoreLibraryGroupKey(key)) state.libraryVisibleTypes.add(key);
    }
  }
  return state.libraryVisibleTypes;
}

function libraryTypeFilterSummary() {
  const selected = ensureLibraryVisibleTypes();
  const groups = new Map(libraryAvailableTypeGroups());
  const labels = [...selected].map(key => groups.get(key) || getTypeLabel(key)).filter(Boolean);
  if (!labels.length) return 'No types';
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
}

function refreshTypeFilter() {
  if (!els.typeFilterOptions) return;
  const selected = ensureLibraryVisibleTypes();
  const groups = libraryAvailableTypeGroups();
  els.typeFilterOptions.innerHTML = groups.map(([key,label]) => `
    <label class="library-type-option">
      <input type="checkbox" value="${escapeAttr(key)}" ${selected.has(key) ? 'checked' : ''}>
      <span>${escapeHtml(label)}</span>
    </label>`).join('');
  if (els.typeFilterSummary) els.typeFilterSummary.textContent = libraryTypeFilterSummary();
}

function handleLibraryTypeFilterChange() {
  state.libraryVisibleTypes = new Set(
    [...(els.typeFilterOptions?.querySelectorAll('input[type="checkbox"]:checked') || [])].map(input => input.value)
  );
  if (els.typeFilterSummary) els.typeFilterSummary.textContent = libraryTypeFilterSummary();
  renderLibrary();
}

function renderLibraryDefaultTypeOptions(selectedKeys = new Set(libraryDefaultTypeKeys())) {
  if (!els.libraryDefaultTypeOptions) return;
  els.libraryDefaultTypeOptions.innerHTML = libraryAvailableTypeGroups().map(([key,label]) => `
    <label class="library-default-type-option">
      <input type="checkbox" value="${escapeAttr(key)}" ${selectedKeys.has(key) ? 'checked' : ''}>
      <span>${escapeHtml(label)}</span>
    </label>`).join('');
}

function openLibrarySettings() {
  renderLibraryDefaultTypeOptions(new Set(libraryDefaultTypeKeys()));
  showDialogAtTop(els.librarySettingsModal);
}

function resetLibrarySettingsDraft() {
  const core = new Set(libraryAvailableTypeGroups().map(([key]) => key).filter(isCoreLibraryGroupKey));
  renderLibraryDefaultTypeOptions(core);
}

function saveLibrarySettings(event) {
  event.preventDefault();
  const selected = [...(els.libraryDefaultTypeOptions?.querySelectorAll('input[type="checkbox"]:checked') || [])]
    .map(input => input.value);
  state.libraryPrefs = { defaultTypeKeys: [...new Set(selected)] };
  safeLocalSet(LIBRARY_PREFS_KEY, state.libraryPrefs);
  state.libraryVisibleTypes = new Set(state.libraryPrefs.defaultTypeKeys);
  scheduleCloudSync();
  els.librarySettingsModal?.close();
  renderLibrary();
}

function tvLibraryStatusKey(item) {
  if (isItemNotReleased(item)) return 'not-released';
  const disposition = getTVWatchDisposition(item);
  if (disposition === 'paused' || (getQueueStatus(item) === 'tbr' && tvHasProgress(item) && !item.completedAt)) return 'paused';
  if (disposition === 'stopped') return 'stopped';
  if (Boolean(item.tvMeta?.hasUnwatched) || getQueueStatus(item) === 'upnext') return 'in-progress';
  if (isTerminalSeriesStatus(item.tvMeta?.seriesStatus || '')) return 'finished';
  return 'up-to-date';
}

function tvLibraryStatusLabel(key) {
  return ({
    'not-released': 'Not Released',
    'in-progress': 'In progress',
    'up-to-date': 'Up to date',
    finished: 'Finished',
    paused: 'Paused',
    stopped: 'Stopped'
  })[key] || key;
}

function bookLibraryStatusKey(item) {
  if (isItemNotReleased(item)) return 'not-released';
  if (item?.bookDisposition === 'paused' || (getQueueStatus(item) === 'tbr' && bookHasProgress(item) && !item.completedAt)) return 'paused';
  if (item?.bookDisposition === 'dnf') return 'dnf';
  const current = Math.max(0, Number(item?.progress?.currentPage || 0));
  const total = Math.max(0, Number(item?.progress?.totalPages || 0));
  if (item?.completedAt || (total > 0 && current >= total)) return 'finished';
  if (current > 0 || getBookReadingPeriods(item).length) return 'in-progress';
  return 'not-started';
}

function bookLibraryStatusLabel(key) {
  return ({
    'not-released': 'Not Released',
    'in-progress': 'In progress',
    finished: 'Finished',
    paused: 'Paused',
    dnf: 'Stopped',
    'not-started': 'Not started'
  })[key] || key;
}

function bookStatusBadgeMarkup(item) {
  const key = bookLibraryStatusKey(item);
  const tone = key === 'not-released' ? 'later'
    : key === 'in-progress' ? 'progress'
    : key === 'finished' ? 'finished'
      : key === 'paused' ? 'later'
        : key === 'dnf' ? 'muted'
        : 'later';
  return `<span class="tv-status-badge tv-status-${tone}">${escapeHtml(bookLibraryStatusLabel(key))}</span>`;
}

async function toggleBookDNF(item) {
  if (!item || getSourceType(item) !== 'book') return;

  if (item.bookDisposition === 'dnf') {
    item.bookDisposition = '';
    const previous = item.bookDNFSnapshot?.queueStatus;
    delete item.bookDNFSnapshot;
    const fallback = Number(item.progress?.currentPage || 0) > 0 ? 'upnext' : 'library';
    setItemQueueStatus(item, ['upnext','tbr','library'].includes(previous) ? previous : fallback);
  } else {
    const previousQueueStatus = getQueueStatus(item);

    // If the book had been bulk-marked finished, DNF should represent the
    // pre-completion reading state rather than a 100%-read book.
    if (item.completedAt) {
      const snapshot = item.bookCompletionSnapshot || null;
      if (snapshot) {
        item.progress = {
          ...item.progress,
          currentPage: Number(snapshot.currentPage || 0),
          readingPeriods: sanitizeBookReadingPeriods(snapshot.readingPeriods || [])
        };
      }
      item.completedAt = '';
      delete item.bookCompletionSnapshot;
      state.history = state.history.filter(entry => !(entry.sourceItemId === item.id && entry.kind === 'book-finished'));
    }

    item.bookDNFSnapshot = { queueStatus: previousQueueStatus };
    item.bookDisposition = 'dnf';
    setItemQueueStatus(item, 'library');
  }

  item.updatedAt = new Date().toISOString();
  saveItems();
  saveHistory();
  renderAll();
  if (els.detailModal?.open && state.openDetailId === item.id) await renderBookDetails(item);
}

function tvLibraryProgressScore(item) {
  let watchedEpisodes = 0;
  for (const entry of state.history) {
    if (entry.sourceItemId === item.id && entry.kind === 'episode-watched') watchedEpisodes += 1;
  }
  const nextSeason = Number(item.progress?.nextSeason || 1);
  const nextEpisode = Number(item.progress?.nextEpisode || 1);
  return watchedEpisodes * 100000 + nextSeason * 1000 + nextEpisode;
}

function compareTVLibraryProgress(a, b) {
  return tvLibraryProgressScore(b) - tvLibraryProgressScore(a)
    || String(b.updatedAt || b.completedAt || '').localeCompare(String(a.updatedAt || a.completedAt || ''))
    || a.title.localeCompare(b.title);
}

function normalizeSearchText(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function makeLibraryPoster(item) {
  const poster = document.createElement('button');
  poster.type = 'button';
  poster.className = 'library-poster-button';
  poster.dataset.detailsId = item.id;
  poster.setAttribute('aria-label', `Open ${item.title}`);
  poster.title = [item.title, item.rating ? `${item.rating}/5` : '', item.genres?.[0] || ''].filter(Boolean).join(' · ');
  const personalRating = Math.max(0, Math.min(5, Number(item.rating || 0)));
  const hasThumbnail = Boolean(String(item.image || '').trim());
  if (!hasThumbnail) {
    poster.classList.add('library-text-card-button');
    // Let longer titles claim a little more horizontal space in the carousel.
    // CSS still clamps this to sensible responsive bounds, but the title itself
    // is never line-clamped.
    poster.style.setProperty('--library-text-title-chars', String(Math.min(42, Math.max(12, String(item.title || '').trim().length || 12))));
  }
  const recommendedBadge = item.recommended
    ? `<span class="library-recommended-badge" aria-label="Recommended" title="Recommended">♥</span>`
    : '';
  const subcategoryLabel = cleanTypeLabel(item.subcategory || '');
  const subcategoryBadge = subcategoryLabel
    ? `<span class="library-subcategory-badge" title="${escapeAttr(subcategoryLabel)}">${escapeHtml(subcategoryLabel)}</span>`
    : '';
  const dispositionState = libraryDnfState(item);
  const releaseDate = itemReleaseDate(item);
  const releaseBadge = isItemNotReleased(item)
    ? `<span class="library-disposition-badge not-released">Not Released · ${escapeHtml(formatShortCalendarDate(releaseDate))}</span>`
    : '';
  const dispositionBadge = dispositionState && !releaseBadge
    ? `<span class="library-disposition-badge ${escapeAttr(dispositionState)}">${dispositionState === 'paused' ? 'Paused' : 'Stopped'}</span>`
    : releaseBadge;
  poster.innerHTML = hasThumbnail
    ? `<img class="library-poster-image" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" loading="lazy" />
       ${recommendedBadge}
       ${subcategoryBadge}
       ${dispositionBadge}
       ${personalRating > 0 ? `<span class="library-rating-badge" aria-label="Your rating ${personalRating} out of 5">★ ${escapeHtml(formatPersonalRating(personalRating))}</span>` : ''}`
    : `<span class="library-text-card">
         ${recommendedBadge}
         ${subcategoryBadge}
         ${dispositionBadge}
         <strong class="library-text-card-title">${escapeHtml(item.title || 'Untitled')}</strong>
         ${personalRating > 0 ? `<span class="library-text-card-rating">★ ${escapeHtml(formatPersonalRating(personalRating))} / 5</span>` : ''}
         ${String(item.notes || '').trim() ? `<span class="library-text-card-notes">${escapeHtml(String(item.notes || '').trim())}</span>` : ''}
       </span>`;
  return poster;
}

function renderLibrary() {
  refreshTypeFilter();
  const visibleTypes = ensureLibraryVisibleTypes();
  const sort = els.librarySort?.value || 'date';

  const libraryQuery = normalizeSearchText(state.librarySearchQuery || els.librarySearch?.value || '');
  let filtered = state.items
    .filter(item => getQueueStatus(item) !== 'tbr' || libraryDnfState(item) === 'paused' || isItemNotReleased(item))
    .filter(item => !(item.calendarQueueOnly === true && item.calendarTracked !== true))
    .filter(item => state.libraryView !== 'recommended' || item.recommended)
    .filter(item => visibleTypes.has(libraryTypeGroupKey(item)))
    .filter(item => !libraryQuery || normalizeSearchText([item.title, item.subtitle, item.notes, item.subcategory, getItemTypeLabel(item), item.artistName].filter(Boolean).join(' ')).includes(libraryQuery));

  // For Recent, dated/calendar-associated items always come first in descending
  // date order. Undated items are deliberately shuffled at the end instead of
  // falling back to rating/title/createdAt, which previously made "Recent" feel wrong.
  const undatedRecentOrder = new Map(filtered.map(item => [item.id, Math.random()]));
  const compare = sort === 'rating'
    ? (a,b) => Number(b.rating || 0) - Number(a.rating || 0) || String(itemLibraryDate(b)).localeCompare(String(itemLibraryDate(a))) || a.title.localeCompare(b.title)
    : sort === 'title'
      ? (a,b) => a.title.localeCompare(b.title)
      : (a,b) => {
          const aDate = itemLibraryDate(a);
          const bDate = itemLibraryDate(b);
          if (aDate && bDate) return String(bDate).localeCompare(String(aDate));
          if (aDate) return -1;
          if (bDate) return 1;
          return Number(undatedRecentOrder.get(a.id) || 0) - Number(undatedRecentOrder.get(b.id) || 0);
        };

  const preferredLabels = ['TV','Movie','Book','Music','Food','Workout','Other'];
  const preferredOrder = preferredLabels.map(label => slugifyType(label));
  const grouped = new Map();
  for (const item of filtered) {
    const groupKey = libraryTypeGroupKey(item);
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey).push(item);
  }
  for (const values of grouped.values()) values.sort(compare);

  const customOrder = [...grouped.keys()]
    .filter(key => !preferredOrder.includes(key))
    .sort((a,b) => libraryTypeGroupLabel(grouped.get(a), a).localeCompare(libraryTypeGroupLabel(grouped.get(b), b)));
  const order = [...preferredOrder, ...customOrder];

  els.libraryGroups.innerHTML = '';
  const hasLibraryItems = filtered.length > 0;
  els.libraryEmpty.hidden = hasLibraryItems;
  if (!hasLibraryItems) {
    els.libraryEmpty.textContent = state.libraryView === 'recommended' ? 'Nothing in Recommended yet.' : 'Nothing saved yet.';
    return;
  }


  for (const groupKey of order) {
    const items = grouped.get(groupKey);
    if (!items?.length) continue;
    const groupLabel = libraryTypeGroupLabel(items, groupKey);

    if (slugifyType(groupKey).replace(/s$/, '') === 'tv') {
      const rootExpansionKey = 'tv:root';
      const rootExpanded = state.libraryExpandedGroups.has(rootExpansionKey);
      const section = document.createElement('section');
      section.className = `library-group library-shelf library-tv-shelf${rootExpanded ? ' is-expanded' : ' is-collapsed'}`;
      section.dataset.libraryGroup = groupKey;
      section.innerHTML = `
        <div class="library-group-heading-row">
          <div class="library-group-title-wrap">
            <h2 class="library-group-title">${escapeHtml(groupLabel)}</h2>
            <span class="library-group-count">${items.length}</span>
          </div>
          <div class="library-shelf-controls">
            ${rootExpanded ? '' : '<button class="library-carousel-button" type="button" data-library-carousel="prev" aria-label="Scroll TV left">‹</button><button class="library-carousel-button" type="button" data-library-carousel="next" aria-label="Scroll TV right">›</button>'}
            <button class="library-expand-button" type="button" data-library-expand="${rootExpansionKey}">${rootExpanded ? 'Collapse' : 'View all'}</button>
          </div>
        </div>
        ${rootExpanded
          ? '<div class="tv-library-status-groups"></div>'
          : '<div class="library-poster-grid tv-library-preview"></div>'}`;

      if (rootExpanded) {
        const statusHost = section.querySelector('.tv-library-status-groups');
        for (const statusKey of ['not-released', 'in-progress', 'up-to-date', 'finished', 'paused', 'stopped']) {
          const statusItems = items.filter(item => tvLibraryStatusKey(item) === statusKey).sort(compare);
          if (!statusItems.length) continue;
          const expansionKey = `tv:${statusKey}`;
          const expanded = state.libraryExpandedGroups.has(expansionKey);
          const statusSection = document.createElement('section');
          statusSection.className = `tv-library-status-group${expanded ? ' is-expanded' : ''}`;
          statusSection.innerHTML = `
            <div class="tv-library-status-heading">
              <div>
                <h3 class="tv-library-status-title">${escapeHtml(tvLibraryStatusLabel(statusKey))}</h3>
                <span class="library-group-count">${statusItems.length}</span>
              </div>
              <div class="library-shelf-controls">
                ${expanded ? '' : '<button class="library-carousel-button" type="button" data-library-carousel="prev" aria-label="Scroll left">‹</button><button class="library-carousel-button" type="button" data-library-carousel="next" aria-label="Scroll right">›</button>'}
                <button class="library-expand-button" type="button" data-library-expand="${escapeAttr(expansionKey)}">${expanded ? 'Carousel' : 'View all'}</button>
              </div>
            </div>
            <div class="library-poster-grid${expanded ? ' is-expanded' : ''}"></div>`;
          const grid = statusSection.querySelector('.library-poster-grid');
          for (const item of statusItems) grid.appendChild(makeLibraryPoster(item));
          statusHost.appendChild(statusSection);
        }
      } else {
        const previewGrid = section.querySelector('.tv-library-preview');
        for (const item of items) previewGrid.appendChild(makeLibraryPoster(item));
      }

      els.libraryGroups.appendChild(section);
      continue;
    }

    if (slugifyType(groupKey).replace(/s$/, '') === 'book') {
      const rootExpansionKey = 'book:root';
      const rootExpanded = state.libraryExpandedGroups.has(rootExpansionKey);
      const section = document.createElement('section');
      section.className = `library-group library-shelf library-book-shelf${rootExpanded ? ' is-expanded' : ' is-collapsed'}`;
      section.dataset.libraryGroup = groupKey;
      section.innerHTML = `
        <div class="library-group-heading-row">
          <div class="library-group-title-wrap">
            <h2 class="library-group-title">${escapeHtml(groupLabel)}</h2>
            <span class="library-group-count">${items.length}</span>
          </div>
          <div class="library-shelf-controls">
            ${rootExpanded ? '' : '<button class="library-carousel-button" type="button" data-library-carousel="prev" aria-label="Scroll Books left">‹</button><button class="library-carousel-button" type="button" data-library-carousel="next" aria-label="Scroll Books right">›</button>'}
            <button class="library-expand-button" type="button" data-library-expand="${rootExpansionKey}">${rootExpanded ? 'Collapse' : 'View all'}</button>
          </div>
        </div>
        ${rootExpanded
          ? '<div class="tv-library-status-groups book-library-status-groups"></div>'
          : '<div class="library-poster-grid book-library-preview"></div>'}`;

      if (rootExpanded) {
        const statusHost = section.querySelector('.book-library-status-groups');
        for (const statusKey of ['not-released', 'in-progress', 'finished', 'paused', 'dnf', 'not-started']) {
          const statusItems = items.filter(item => bookLibraryStatusKey(item) === statusKey).sort(compare);
          if (!statusItems.length) continue;
          const expansionKey = `book:${statusKey}`;
          const expanded = state.libraryExpandedGroups.has(expansionKey);
          const statusSection = document.createElement('section');
          statusSection.className = `tv-library-status-group book-library-status-group${expanded ? ' is-expanded' : ''}`;
          statusSection.innerHTML = `
            <div class="tv-library-status-heading">
              <div>
                <h3 class="tv-library-status-title">${escapeHtml(bookLibraryStatusLabel(statusKey))}</h3>
                <span class="library-group-count">${statusItems.length}</span>
              </div>
              <div class="library-shelf-controls">
                ${expanded ? '' : '<button class="library-carousel-button" type="button" data-library-carousel="prev" aria-label="Scroll left">‹</button><button class="library-carousel-button" type="button" data-library-carousel="next" aria-label="Scroll right">›</button>'}
                <button class="library-expand-button" type="button" data-library-expand="${escapeAttr(expansionKey)}">${expanded ? 'Carousel' : 'View all'}</button>
              </div>
            </div>
            <div class="library-poster-grid${expanded ? ' is-expanded' : ''}"></div>`;
          const grid = statusSection.querySelector('.library-poster-grid');
          for (const item of statusItems) grid.appendChild(makeLibraryPoster(item));
          statusHost.appendChild(statusSection);
        }
      } else {
        const previewGrid = section.querySelector('.book-library-preview');
        for (const item of items) previewGrid.appendChild(makeLibraryPoster(item));
      }

      els.libraryGroups.appendChild(section);
      continue;
    }

    const expanded = state.libraryExpandedGroups.has(groupKey);
    const hasSubcategories = items.some(item => cleanTypeLabel(item.subcategory || '') || isItemNotReleased(item));
    const section = document.createElement('section');
    section.className = `library-group library-shelf${expanded ? ' is-expanded' : ''}`;
    section.dataset.libraryGroup = groupKey;
    section.innerHTML = `
      <div class="library-group-heading-row">
        <div class="library-group-title-wrap">
          <h2 class="library-group-title">${escapeHtml(groupLabel)}</h2>
          <span class="library-group-count">${items.length}</span>
        </div>
        <div class="library-shelf-controls">
          ${expanded ? '' : '<button class="library-carousel-button" type="button" data-library-carousel="prev" aria-label="Scroll left">‹</button><button class="library-carousel-button" type="button" data-library-carousel="next" aria-label="Scroll right">›</button>'}
          <button class="library-expand-button" type="button" data-library-expand="${escapeAttr(groupKey)}">${expanded ? 'Carousel' : `View all`}</button>
        </div>
      </div>
      ${expanded && hasSubcategories ? '<div class="tv-library-status-groups library-subcategory-groups"></div>' : `<div class="library-poster-grid${expanded ? ' is-expanded' : ''}"></div>`}`;

    if (expanded && hasSubcategories) {
      const host = section.querySelector('.library-subcategory-groups');
      const bySubcategory = new Map();
      for (const item of items) {
        // Upcoming releases stay inside their normal parent type and collect under
        // a local Not Released subsection instead of a global Library shelf.
        const label = isItemNotReleased(item) ? 'Not Released' : (cleanTypeLabel(item.subcategory || '') || 'General');
        if (!bySubcategory.has(label)) bySubcategory.set(label, []);
        bySubcategory.get(label).push(item);
      }
      const preferredMusic = ['Not Released', 'Album', 'Artist', 'Song', 'Concert', 'General'];
      const labels = [...bySubcategory.keys()].sort((a, b) => {
        if (a === 'Not Released') return -1;
        if (b === 'Not Released') return 1;
        if (groupLabel === 'Music') {
          const ai = preferredMusic.indexOf(a);
          const bi = preferredMusic.indexOf(b);
          if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b);
        }
        if (a === 'General') return 1;
        if (b === 'General') return -1;
        return a.localeCompare(b);
      });
      for (const label of labels) {
        const subItems = bySubcategory.get(label).sort(compare);
        const subSection = document.createElement('section');
        subSection.className = 'tv-library-status-group library-subcategory-group is-expanded';
        subSection.innerHTML = `
          <div class="tv-library-status-heading library-subcategory-heading">
            <div>
              <h3 class="tv-library-status-title">${escapeHtml(label)}</h3>
              <span class="library-group-count">${subItems.length}</span>
            </div>
          </div>
          <div class="library-poster-grid is-expanded"></div>`;
        const grid = subSection.querySelector('.library-poster-grid');
        for (const item of subItems) grid.appendChild(makeLibraryPoster(item));
        host.appendChild(subSection);
      }
    } else {
      const grid = section.querySelector('.library-poster-grid');
      for (const item of items) grid.appendChild(makeLibraryPoster(item));
    }
    els.libraryGroups.appendChild(section);
  }
}

function handleLibraryClick(event) {
  const carousel = event.target.closest('[data-library-carousel]');
  if (carousel) {
    const shelf = carousel.closest('.library-shelf, .tv-library-status-group');
    const grid = shelf?.querySelector('.library-poster-grid:not(.is-expanded)');
    if (grid) {
      const direction = carousel.dataset.libraryCarousel === 'prev' ? -1 : 1;
      grid.scrollBy({ left: direction * Math.max(280, grid.clientWidth * .78), behavior: 'smooth' });
    }
    return;
  }
  const expand = event.target.closest('[data-library-expand]');
  if (expand) {
    const type = expand.dataset.libraryExpand;
    if (state.libraryExpandedGroups.has(type)) state.libraryExpandedGroups.delete(type);
    else state.libraryExpandedGroups.add(type);
    renderLibrary();
    return;
  }
  const title = event.target.closest('[data-details-id]');
  if (!title || event.target.closest('a')) return;
  openDetails(title.dataset.detailsId);
}

function libraryProgressText(item) {
  const sourceType = getSourceType(item);
  if (sourceType === 'tv') {
    const labels = tvStatusLabels(item).map(entry => entry.label);
    const next = item.tvMeta?.hasUnwatched ? `Next: S${item.progress?.nextSeason || 1} E${item.progress?.nextEpisode || 1}` : '';
    return [labels.join(' · '), next].filter(Boolean).join(' · ');
  }
  if (sourceType === 'youtube') return `Video ${(item.progress?.currentIndex || 0) + 1}`;
  if (sourceType === 'book') {
    const current = item.progress?.currentPage || 0;
    const total = item.progress?.totalPages || 0;
    return total ? `${current} / ${total} pages` : `${current} pages`;
  }
  if (['event', 'concert'].includes(sourceType)) return eventQueueMeta(item);
  if (item.date) return item.date;
  return item.subtitle || '';
}

// ---------------------------
// TYPES
// ---------------------------
function getSourceType(item) {
  if (!item) return 'other';
  if (item.sourceType) return item.sourceType;
  if (item.provider === 'youtube' || item.type === 'workout') return 'youtube';
  if (item.provider === 'ticketmaster') return 'event';
  if (['tv', 'movie', 'book', 'music', 'artist', 'song', 'concert', 'event'].includes(item.type)) return item.type;
  return 'other';
}

function getQueueStatus(item) {
  if (!item) return 'library';
  if (['upnext', 'tbr', 'library'].includes(item.queueStatus)) return item.queueStatus;
  if (item.active !== false && ['tv', 'youtube', 'book', 'reminder', 'event'].includes(getSourceType(item))) return 'upnext';
  return 'library';
}

function setItemQueueStatus(item, status) {
  const next = ['upnext', 'tbr', 'library'].includes(status) ? status : 'library';
  item.queueStatus = next;
  item.active = next === 'upnext';
  if (getSourceType(item) === 'tv') {
    if (next === 'tbr') item.watchDisposition = 'watch-later';
    else if (next === 'upnext' && !['paused', 'stopped'].includes(item.watchDisposition)) item.watchDisposition = 'following';
  }
  return item;
}

function displayTypeSlug(label, sourceType) {
  const base = slugifyType(label);
  if (sourceType === 'youtube') {
    if (base === 'workout') return 'workout';
    return RESERVED_DISPLAY_TYPES.has(base) ? `youtube-${base}` : base;
  }
  if (sourceType === 'other') {
    return (RESERVED_DISPLAY_TYPES.has(base) || base === 'workout') ? `custom-${base}` : base;
  }
  return base;
}

function cleanTypeLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slugifyType(value) {
  return cleanTypeLabel(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'other';
}

function isBuiltInType(type) {
  return Object.prototype.hasOwnProperty.call(TYPE_LABELS, type);
}

function getItemTypeLabel(item) {
  return item?.typeLabel || getTypeLabel(item?.type);
}

function getTypeLabel(type) {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  const saved = state.customTypes.find(entry => entry.type === type);
  if (saved?.label) return saved.label;
  return String(type || 'Other')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function registerCustomType(type, label) {
  if (!type || isBuiltInType(type)) return;
  const cleanLabel = cleanTypeLabel(label) || getTypeLabel(type);
  const existing = state.customTypes.find(entry => entry.type === type);
  if (existing) existing.label = cleanLabel;
  else state.customTypes.push({ type, label: cleanLabel });
  state.customTypes.sort((a,b) => a.label.localeCompare(b.label));
  localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(state.customTypes));
  scheduleCloudSync();
}

function libraryTypeGroupKey(item) {
  return slugifyType(getItemTypeLabel(item));
}

function libraryTypeGroupLabel(items = [], groupKey = '') {
  // Prefer the canonical built-in spelling/capitalization when one exists.
  for (const label of Object.values(TYPE_LABELS)) {
    if (slugifyType(label) === groupKey) return label;
  }
  const labels = items
    .map(item => cleanTypeLabel(getItemTypeLabel(item)))
    .filter(Boolean);
  return labels[0] || getTypeLabel(groupKey);
}


// ---------------------------
// SETTINGS / CACHE / STORAGE
// ---------------------------
async function getPlaylistCached(id) {
  return getCached(`playlist:${id}`, () => TrackerAPI.getPlaylist(id, state.settings));
}

async function getCached(key, loader) {
  const cached = state.cache[key];
  if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached.value;
  const value = await loader();
  cachePut(key, value);
  return value;
}

function cachePut(key, value) {
  state.cache[key] = { savedAt: Date.now(), value };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(state.cache)); } catch {}
}

function saveItems() {
  safeLocalSet(ITEMS_KEY, state.items);
  scheduleCloudSync();
}

function saveHistory() {
  // History can contain hundreds or thousands of episode/video records.
  // localStorage is intentionally not used here because browsers normally
  // cap it at only a few MB per origin. IndexedDB is the durable local cache.
  saveLargeState(HISTORY_IDB_KEY, state.history).catch(error => {
    console.error('Could not save history to IndexedDB:', error);
    setSyncStatus('Local history cache failed', true);
  });
  localStorage.removeItem(HISTORY_KEY);
  scheduleCloudSync();
}

function buildCloudState() {
  return {
    version: CLOUD_STATE_VERSION,
    items: state.items,
    history: state.history,
    customTypes: state.customTypes,
    discoverPrefs: state.discoverPrefs,
    stickerPrefs: state.stickerPrefs,
    streakPrefs: state.streakPrefs,
    libraryPrefs: normalizeLibraryPrefs(state.libraryPrefs)
  };
}

function hasMeaningfulLocalState(snapshot = buildCloudState()) {
  return Boolean(
    snapshot.items?.length ||
    snapshot.history?.length ||
    snapshot.customTypes?.length ||
    Object.keys(snapshot.stickerPrefs || {}).length ||
    Object.keys(snapshot.streakPrefs || {}).length ||
    Array.isArray(snapshot.libraryPrefs?.defaultTypeKeys) ||
    snapshot.discoverPrefs?.streamingProviderIds?.length
  );
}

async function persistCloudStateLocally(snapshot) {
  state.items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  state.history = Array.isArray(snapshot?.history) ? snapshot.history : [];
  state.customTypes = Array.isArray(snapshot?.customTypes) ? snapshot.customTypes : [];
  state.discoverPrefs = snapshot?.discoverPrefs && typeof snapshot.discoverPrefs === 'object'
    ? { ...DEFAULT_DISCOVER_PREFS, ...snapshot.discoverPrefs }
    : { ...DEFAULT_DISCOVER_PREFS };
  state.stickerPrefs = snapshot?.stickerPrefs && typeof snapshot.stickerPrefs === 'object'
    ? snapshot.stickerPrefs
    : {};
  state.streakPrefs = snapshot?.streakPrefs && typeof snapshot.streakPrefs === 'object'
    ? snapshot.streakPrefs
    : {};
  state.libraryPrefs = normalizeLibraryPrefs(snapshot?.libraryPrefs || DEFAULT_LIBRARY_PREFS);
  state.libraryVisibleTypes = null;

  safeLocalSet(ITEMS_KEY, state.items);
  safeLocalSet(CUSTOM_TYPES_KEY, state.customTypes);
  safeLocalSet(DISCOVER_PREFS_KEY, state.discoverPrefs);
  safeLocalSet(STICKER_PREFS_KEY, state.stickerPrefs);
  safeLocalSet(STREAK_PREFS_KEY, state.streakPrefs);
  safeLocalSet(LIBRARY_PREFS_KEY, state.libraryPrefs);
  await saveLargeState(HISTORY_IDB_KEY, state.history);
  localStorage.removeItem(HISTORY_KEY);
}

async function hydrateCloudProfile(userId) {
  if (!supabase || !userId) return;

  const localSnapshot = buildCloudState();
  const { data, error } = await supabase
    .from('user_state')
    .select('state, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (data?.state) {
    await persistCloudStateLocally(data.state);
    lastCloudUpdatedAt = data.updated_at || '';
    return;
  }

  const initialState = localSnapshot;
  const updatedAt = new Date().toISOString();
  const { error: insertError } = await supabase
    .from('user_state')
    .upsert({
      user_id: userId,
      state: initialState,
      updated_at: updatedAt
    });

  if (insertError) throw insertError;
  lastCloudUpdatedAt = updatedAt;
}

function scheduleCloudSync() {
  if (localOnlyMode || !currentUser || !supabase) return;
  clearTimeout(cloudSyncTimer);
  setSyncStatus('Saving…');
  cloudSyncTimer = setTimeout(pushCloudState, 350);
}

async function pushCloudState() {
  if (localOnlyMode || !currentUser || !supabase) return;
  if (cloudSyncBusy) {
    cloudSyncQueued = true;
    return;
  }

  cloudSyncBusy = true;
  const updatedAt = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('user_state')
      .upsert({
        user_id: currentUser.id,
        state: buildCloudState(),
        updated_at: updatedAt
      });

    if (error) throw error;
    lastCloudUpdatedAt = updatedAt;
    setSyncStatus('Synced');
  } catch (error) {
    setSyncStatus('Not synced', true);
    console.error('Cloud sync failed:', error);
  } finally {
    cloudSyncBusy = false;
    if (cloudSyncQueued) {
      cloudSyncQueued = false;
      scheduleCloudSync();
    }
  }
}

async function refreshCloudProfile() {
  if (localOnlyMode || !currentUser || !supabase || cloudSyncBusy) return;

  try {
    const { data, error } = await supabase
      .from('user_state')
      .select('state, updated_at')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (error) throw error;
    if (!data?.state || !data.updated_at || data.updated_at === lastCloudUpdatedAt) return;

    if (!lastCloudUpdatedAt || new Date(data.updated_at) > new Date(lastCloudUpdatedAt)) {
      await persistCloudStateLocally(data.state);
      lastCloudUpdatedAt = data.updated_at;
      if (appStarted) renderAll();
      setSyncStatus('Synced');
    }
  } catch (error) {
    console.error('Cloud refresh failed:', error);
    setSyncStatus('Offline', true);
  }
}

function clearLocalSyncedState() {
  [ITEMS_KEY, HISTORY_KEY, CUSTOM_TYPES_KEY, DISCOVER_PREFS_KEY, STICKER_PREFS_KEY, STREAK_PREFS_KEY].forEach(key => {
    localStorage.removeItem(key);
  });
  deleteLargeState(HISTORY_IDB_KEY).catch(() => {});
}

async function hydrateLargeLocalState() {
  try {
    const indexedHistory = await loadLargeState(HISTORY_IDB_KEY);
    if (Array.isArray(indexedHistory)) {
      state.history = indexedHistory;
      // Remove the legacy copy so it can no longer consume localStorage quota.
      localStorage.removeItem(HISTORY_KEY);
      return;
    }

    // One-time migration from builds that stored history in localStorage.
    const legacyHistory = loadJSON(HISTORY_KEY, []);
    if (Array.isArray(legacyHistory) && legacyHistory.length) {
      state.history = legacyHistory;
      await saveLargeState(HISTORY_IDB_KEY, legacyHistory);
      localStorage.removeItem(HISTORY_KEY);
    }
  } catch (error) {
    console.error('Could not hydrate IndexedDB history:', error);
  }
}

function openStateDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STATE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STATE_STORE_NAME)) {
        db.createObjectStore(STATE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadLargeState(key) {
  const db = await openStateDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE_NAME, 'readonly');
      const request = tx.objectStore(STATE_STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function saveLargeState(key, value) {
  const db = await openStateDB();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE_NAME, 'readwrite');
      tx.objectStore(STATE_STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  } finally {
    db.close();
  }
}

async function deleteLargeState(key) {
  const db = await openStateDB();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE_NAME, 'readwrite');
      tx.objectStore(STATE_STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (error?.name === 'QuotaExceededError') {
      console.warn(`localStorage quota exceeded while saving ${key}.`, error);
      // API cache is disposable; clearing it often frees space left by older builds.
      try {
        localStorage.removeItem(CACHE_KEY);
        if (key !== CACHE_KEY) localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {}
    }
    console.error(`Could not save ${key} to localStorage:`, error);
    return false;
  }
}

function addHistoryRecord(record) {
  const source = record?.sourceItemId ? findItem(record.sourceItemId) : null;
  state.history.push({
    id: makeId(),
    createdAt: new Date().toISOString(),
    subcategory: source?.subcategory || '',
    ...record
  });
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function findItem(id) { return state.items.find(item => item.id === id); }
function makeId() { return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function todayString() { return localDateString(new Date()); }

function progressFallback(item) {
  const sourceType = getSourceType(item);
  if (sourceType === 'tv') return `S${item.progress?.nextSeason || 1} E${item.progress?.nextEpisode || 1}`;
  if (sourceType === 'youtube') return `Video ${(item.progress?.currentIndex || 0) + 1}`;
  if (sourceType === 'book') return `Page ${item.progress?.currentPage || 0}`;
  if (['event', 'concert'].includes(sourceType)) return eventQueueMeta(item);
  return '';
}

function cell(className, text) {
  const div = document.createElement('div');
  div.className = className;
  div.textContent = text;
  return div;
}

function ratingStars(value) {
  const n = Math.max(0, Math.min(5, Number(value || 0)));
  if (!n) return '—';
  return `${'★'.repeat(n)}${'☆'.repeat(5-n)}`;
}

function shorten(text, max) {
  const clean = String(text || '').replace(/\s+/g,' ').trim();
  return clean.length > max ? `${clean.slice(0,max).trim()}…` : clean;
}

function stripHtml(value) {
  const div = document.createElement('div');
  div.innerHTML = value || '';
  return div.textContent || '';
}

function formatMillis(ms) {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2,'0');
  return `${minutes}:${seconds}`;
}

function formatISO8601Duration(value) {
  const match = String(value || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return '';
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  if (hours) return `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  return `${minutes}:${String(seconds).padStart(2,'0')}`;
}


function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
function escapeAttr(value) { return escapeHtml(value); }
