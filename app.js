import { TrackerAPI } from './api.js?v=omni-due-subtypes-log-88';
import { API_CONFIG } from './config.js?v=omni-due-subtypes-log-88';
import { supabase, hasSupabaseConfig } from './supabase.js';

const ITEMS_KEY = 'zoharTracker.items.v4';
const CACHE_KEY = 'zoharTracker.apiCache.v1';
const CUSTOM_TYPES_KEY = 'zoharTracker.customTypes.v1';
const HISTORY_KEY = 'zoharTracker.history.v1';
const DISCOVER_PREFS_KEY = 'zoharTracker.discoverPrefs.v1';
const STICKER_PREFS_KEY = 'zoharTracker.stickerPrefs.v1';
const STREAK_PREFS_KEY = 'zoharTracker.streakPrefs.v1';
const LIBRARY_PREFS_KEY = 'zoharTracker.libraryPrefs.v1';
const ALBUMS_KEY = 'zoharTracker.albums.v1';
const TYPE_USAGE_KEY = 'zoharTracker.typeUsage.v1';
const PHOTO_UPLOAD_LOG_KEY = 'zoharTracker.photoUploadLog.v1';
const ONBOARDING_KEY = 'zoharTracker.onboarding.v1';
const ONBOARDING_STEP_KEY = 'zoharTracker.onboardingStep.v2';
const LOG_TYPE_PREFS_KEY = 'zoharTracker.logTypePrefs.v1';
const PHOTO_WEEKLY_LIMIT = 20;
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
  game: 'Games',
  music: 'Music',
  food: 'Food',
  event: 'Events',
  activity: 'Activities',
  class: 'Classes',
  workout: 'Workouts',
  shopping: 'Shopping',
  other: 'Other'
};

const SOURCE_ITEM_LABELS = {
  tv: 'TV',
  movie: 'Movie',
  book: 'Book',
  game: 'Game',
  'video-game': 'Video Game',
  'board-game': 'Board Game',
  music: 'Music',
  artist: 'Artist',
  song: 'Song',
  concert: 'Concert',
  event: 'Event',
  activity: 'Activity',
  class: 'Class',
  food: 'Food',
  restaurant: 'Restaurant',
  place: 'Place',
  shopping: 'Shopping',
  recipe: 'Recipe'
};

const RESERVED_DISPLAY_TYPES = new Set(['tv', 'movie', 'book', 'game', 'video-game', 'board-game', 'music', 'artist', 'song', 'concert', 'event', 'activity', 'class', 'food', 'restaurant', 'recipe', 'shopping', 'other']);
const STICKER_COLORS = ['rust', 'burgundy', 'red', 'coral', 'orange', 'yellow', 'cream', 'sand', 'peach', 'pink', 'lavender', 'purple', 'navy', 'blue', 'sky', 'slate', 'teal', 'green', 'forest', 'mint', 'olive', 'stone', 'brown', 'charcoal', 'black', 'white'];
const CALENDAR_THEMES = [
  { id: 'blue', label: 'Dusty blue' },
  { id: 'burgundy', label: 'Burgundy' },
  { id: 'slate', label: 'Slate' },
  { id: 'charcoal', label: 'Charcoal' },
  { id: 'forest', label: 'Forest' },
  { id: 'espresso', label: 'Espresso' }
];

const CLOUD_STATE_VERSION = 3;
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
const DISCOVER_CONTENT_TYPES = ['tv', 'movie', 'book', 'game', 'artist', 'concert', 'restaurant', 'event'];
const DISCOVER_CONTENT_TYPE_LABELS = {
  tv: 'TV', movie: 'Movies', book: 'Books', game: 'Games', artist: 'Music',
  concert: 'Concerts', restaurant: 'Restaurants', event: 'Live Events'
};
function normalizedDiscoverContentTypes(prefs = state?.discoverPrefs || DEFAULT_DISCOVER_PREFS) {
  let values = Array.isArray(prefs?.contentTypes) ? prefs.contentTypes : null;
  if (!values) {
    const legacy = String(prefs?.contentType || '').trim();
    values = legacy && legacy !== 'all' ? [legacy] : ['tv', 'movie'];
  }
  values = values.map(value => ['music','song'].includes(String(value || '').trim()) ? 'artist' : String(value || '').trim());
  const valid = [...new Set(values.filter(value => DISCOVER_CONTENT_TYPES.includes(value)))];
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
const attachmentCoverObjectUrls = new Map();


const state = {
  items: loadJSON(ITEMS_KEY, []),
  settings: API_CONFIG,
  cache: loadJSON(CACHE_KEY, {}),
  customTypes: loadJSON(CUSTOM_TYPES_KEY, []),
  albums: loadJSON(ALBUMS_KEY, []),
  typeUsage: loadJSON(TYPE_USAGE_KEY, {}),
  photoUploadLog: loadJSON(PHOTO_UPLOAD_LOG_KEY, []),
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
  authMark: $('.auth-mark'),
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
  calendarThemePicker: $('#calendarThemePicker'),
  resetStickerSettings: $('#resetStickerSettings'),
  openStreakSettings: $('#openStreakSettings'),
  streakSettingsModal: $('#stickerSettingsModal'),
  streakSettingsForm: $('#streakSettingsForm'),
  streakSettingsRows: $('#streakSettingsRows'),
  resetStreakSettings: $('#resetStreakSettings'),
  calendarRowSettingsForm: $('#calendarRowSettingsForm'),
  calendarRowSettingsRows: $('#calendarRowSettingsRows'),
  resetCalendarRowSettings: $('#resetCalendarRowSettings'),
  addCalendarRow: $('#addCalendarRow'),
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
  openLibraryMap: $('#openLibraryMap'),
  statsSummary: $('#statsSummary'),
  statsTypes: $('#statsTypes'),
  statsGenres: $('#statsGenres'),
  albumsGrid: $('#albumsGrid'),
  albumsEmpty: $('#albumsEmpty'),
  openAlbumCreate: $('#openAlbumCreate'),
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
  itemActionChoice: $('#itemActionChoice'),
  itemKindChoice: $('#itemKindChoice'),
  itemSubtypeBlock: $('#itemSubtypeBlock'),
  itemSubtype: $('#itemSubtype'),
  itemSubtypeLabel: $('#itemSubtypeLabel'),
  displayTypeBlock: $('#displayTypeBlock'),
  itemDisplayType: $('#itemDisplayType'),
  itemSubcategory: $('#itemSubcategory'),
  itemSubcategorySelect: $('#itemSubcategorySelect'),
  itemSubcategoryNewField: $('#itemSubcategoryNewField'),
  itemSubcategoryDisclosure: $('#itemSubcategoryDisclosure'),
  itemSubcategorySummary: $('#itemSubcategorySummary'),
  displayTypeLabel: $('#displayTypeLabel'),
  displayTypeHint: $('#displayTypeHint'),
  catalogueSearchBlock: $('#catalogueSearchBlock'),
  itemFindSource: $('#itemFindSource'),
  itemFindSourceDisclosure: $('#itemFindSourceDisclosure'),
  itemFindSourceSummary: $('#itemFindSourceSummary'),
  itemFeaturesDisclosure: $('#itemFeaturesDisclosure'),
  itemFeaturesSummary: $('#itemFeaturesSummary'),
  itemProgressMode: $('#itemProgressMode'),
  itemUseDateRange: $('#itemUseDateRange'),
  itemUseRepeatLog: $('#itemUseRepeatLog'),
  itemLogEntryFields: $('#itemLogEntryFields'),
  itemLogEntryTitle: $('#itemLogEntryTitle'),
  itemLogModeHint: $('#itemLogModeHint'),
  findSourcePrompt: $('#findSourcePrompt'),
  itemUsePlaylist: $('#itemUsePlaylist'),
  catalogueQuery: $('#catalogueQuery'),
  catalogueSearchButton: $('#catalogueSearchButton'),
  searchResults: $('#searchResults'),
  selectedSource: $('#selectedSource'),
  workoutBlock: $('#workoutBlock'),
  reminderBlock: $('#reminderBlock'),
  reminderFrequency: $('#reminderFrequency'),
  itemRepeatSummary: $('#itemRepeatSummary'),
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
  activityFields: $('#activityFields'),
  activityStartDate: $('#activityStartDate'),
  activityEndDate: $('#activityEndDate'),
  itemPeopleBlock: $('#itemPeopleBlock'),
  itemPeopleDisclosure: $('#itemPeopleDisclosure'),
  itemPeopleSummary: $('#itemPeopleSummary'),
  itemSocialMetaRow: $('#itemSocialMetaRow'),
  itemBuddyWatchField: $('#itemBuddyWatchField'),
  itemBuddyWatchToggle: $('#itemBuddyWatchToggle'),
  itemBuddyWatchPersonField: $('#itemBuddyWatchPersonField'),
  itemBuddyWatchPerson: $('#itemBuddyWatchPerson'),
  itemPeople: $('#itemPeople'),
  itemPeopleSuggestions: $('#itemPeopleSuggestions'),
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
  itemNoteDisclosure: $('#itemNoteDisclosure'),
  itemComment: $('#itemComment'),
  itemFiles: $('#itemFiles'),
  itemAttachmentsDisclosure: $('#itemAttachmentsDisclosure'),
  itemAttachmentsSummary: $('#itemAttachmentsSummary'),
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
  itemDateOptionsDisclosure: $('#itemDateOptionsDisclosure'),
  itemDateOptionsSummary: $('#itemDateOptionsSummary'),
  itemReleaseDate: $('#itemReleaseDate'),
  itemReleaseDateField: $('#itemReleaseDateField'),
  itemRecommended: $('#itemRecommended'),
  itemRecommendHeart: $('#itemRecommendHeart'),
  queueStatusField: $('#queueStatusField'),
  itemStatusPicker: $('#itemStatusPicker'),
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
  if (els.authMark) els.authMark.textContent = 'omni';
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

      if (data.user?.id) {
        localStorage.setItem(`${ONBOARDING_KEY}.${data.user.id}`, 'pending');
        localStorage.setItem(`${ONBOARDING_STEP_KEY}.${data.user.id}`, '0');
      }
      if (data.session?.user) {
        // New accounts always begin onboarding from Home, regardless of which
        // page the account was created on. The tour then intentionally moves
        // between pages and persists its step in localStorage.
        window.location.assign('index.html');
        return;
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
  const onboardingPending = localStorage.getItem(`${ONBOARDING_KEY}.${user.id}`) === 'pending';
  const onboardingStep = Number(localStorage.getItem(`${ONBOARDING_STEP_KEY}.${user.id}`) || 0);
  const pageName = String(window.location.pathname || '').split('/').pop() || 'index.html';
  if (onboardingPending && onboardingStep <= 0 && pageName !== 'index.html') {
    window.location.assign('index.html');
    return;
  }
  currentUser = user;
  if (els.userEmail) els.userEmail.textContent = user.email || '';
  setAuthMessage('Loading your profile…', false);
  try {
    await hydrateLargeLocalState();
    await hydrateCloudProfile(user.id);
    unlockApp();
    startAppOnce();
    initializeSocialForUser().catch(error => console.warn('[Social] background initialization failed:', error));
    maybeShowOnboarding(user);
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

function onboardingStatusKey(userId) {
  return `${ONBOARDING_KEY}.${userId}`;
}

function onboardingStepKey(userId) {
  return `${ONBOARDING_STEP_KEY}.${userId}`;
}

function onboardingStep(user = currentUser) {
  if (!user?.id) return 0;
  return Math.max(0, Number(localStorage.getItem(onboardingStepKey(user.id)) || 0));
}

function setOnboardingStep(step, user = currentUser) {
  if (!user?.id) return;
  localStorage.setItem(onboardingStepKey(user.id), String(Math.max(0, Number(step) || 0)));
}

function finishOnboarding(user = currentUser) {
  if (!user?.id) return;
  localStorage.setItem(onboardingStatusKey(user.id), 'done');
  localStorage.removeItem(onboardingStepKey(user.id));
  clearOnboardingGuide();
  const modal = $('#onboardingColorModal');
  if (modal?.open) modal.close();
  const typesModal = $('#onboardingLogTypesModal');
  if (typesModal?.open) typesModal.close();
}

function validCalendarThemeId(themeId) {
  return CALENDAR_THEMES.some(theme => theme.id === themeId) ? themeId : 'blue';
}

function setCalendarThemeNow(themeId) {
  const valid = validCalendarThemeId(themeId);
  const current = state.stickerPrefs && typeof state.stickerPrefs === 'object' ? state.stickerPrefs : {};
  state.stickerPrefs = {
    ...current,
    __calendar: { ...(current.__calendar || {}), theme: valid }
  };
  safeLocalSet(STICKER_PREFS_KEY, state.stickerPrefs);
  calendarThemeDraft = valid;
  applyCalendarTheme(valid);
  renderCalendarThemePicker();
  if (els.trackerGrid && els.monthPicker?.value) renderTracker();
  scheduleCloudSync();
  scheduleSocialSnapshotPublish(100);
  return valid;
}

function ensureOnboardingColorModal() {
  let modal = $('#onboardingColorModal');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'onboardingColorModal';
  modal.className = 'modal small-modal onboarding-color-modal';
  modal.innerHTML = `<div class="modal-heading"><p class="modal-eyebrow">WELCOME TO OMNI</p><h2>Pick your colour</h2></div><div class="onboarding-color-picker" role="radiogroup" aria-label="Choose your Omni colour"></div><div class="modal-actions"><button class="quiet-button" type="button" data-onboarding-skip>Skip tour</button><div class="actions-right"><button class="primary-button" type="button" data-onboarding-colour-continue>Continue</button></div></div>`;
  document.body.appendChild(modal);
  const picker = modal.querySelector('.onboarding-color-picker');
  const render = () => {
    const selected = savedCalendarThemeId();
    picker.innerHTML = CALENDAR_THEMES.map(theme => `<button class="onboarding-color-choice${selected === theme.id ? ' is-selected' : ''}" type="button" role="radio" aria-checked="${selected === theme.id ? 'true' : 'false'}" data-onboarding-theme="${escapeAttr(theme.id)}"><span class="onboarding-color-dot" data-theme-dot="${escapeAttr(theme.id)}" aria-hidden="true"></span><span>${escapeHtml(theme.label)}</span></button>`).join('');
  };
  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-onboarding-theme]');
    if (!button) return;
    setCalendarThemeNow(button.dataset.onboardingTheme || 'blue');
    render();
  });
  modal.querySelector('[data-onboarding-colour-continue]').addEventListener('click', () => {
    modal.close();
    showDialogAtTop(ensureOnboardingLogTypesModal());
  });
  modal.querySelector('[data-onboarding-skip]').addEventListener('click', () => finishOnboarding());
  modal.addEventListener('cancel', event => event.preventDefault());
  render();
  return modal;
}

function ensureOnboardingLogTypesModal() {
  let modal = $('#onboardingLogTypesModal');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'onboardingLogTypesModal';
  modal.className = 'modal small-modal onboarding-log-types-modal';
  modal.innerHTML = `<div class="modal-heading"><p class="modal-eyebrow">WELCOME TO OMNI</p><h2>What do you want to log?</h2><p>Pick the main Types you use. Add will stay simple and show only these. You can change this later in Profile settings.</p></div><div class="onboarding-log-type-grid"></div><div class="modal-actions"><button class="quiet-button" type="button" data-onboarding-log-all>Use all</button><div class="actions-right"><button class="primary-button" type="button" data-onboarding-log-continue>Continue</button></div></div>`;
  document.body.appendChild(modal);
  const render = () => {
    const grid = modal.querySelector('.onboarding-log-type-grid');
    if (grid) grid.innerHTML = logTypeChoiceMarkup(enabledLogTypeKeys());
  };
  modal.querySelector('[data-onboarding-log-all]')?.addEventListener('click', () => {
    saveEnabledLogTypeKeys(DEFAULT_LOG_TYPE_KEYS);
    render();
  });
  modal.querySelector('[data-onboarding-log-continue]')?.addEventListener('click', () => {
    const checked = [...modal.querySelectorAll('.onboarding-log-type-grid input:checked')].map(input => input.value);
    saveEnabledLogTypeKeys(checked.length ? checked : DEFAULT_LOG_TYPE_KEYS);
    refreshItemKindChoices();
    setOnboardingStep(1);
    modal.close();
    showOnboardingGuideStep();
  });
  modal.addEventListener('cancel', event => event.preventDefault());
  render();
  return modal;
}

function renderSocialLogTypeSettings() {
  const form = $('#socialProfileSettingsForm');
  if (!form) return;
  let section = $('#socialLogTypeSettingsSection');
  if (!section) {
    section = document.createElement('section');
    section.id = 'socialLogTypeSettingsSection';
    section.className = 'social-settings-section social-log-types-setting';
    section.innerHTML = `<div class="social-sharing-heading"><div><h3>What you log</h3><small>These are the main Types shown in Add. Custom Types still remain available.</small></div></div><div id="socialLogTypeSettings" class="onboarding-log-type-grid"></div>`;
    const sharing = $('#socialShareSettings')?.closest('.social-settings-section');
    if (sharing) sharing.insertAdjacentElement('beforebegin', section);
    else form.prepend(section);
  }
  const host = $('#socialLogTypeSettings');
  if (host) host.innerHTML = logTypeChoiceMarkup(enabledLogTypeKeys());
}

function saveSocialLogTypeSettings() {
  const checked = [...$$('#socialLogTypeSettings input:checked')].map(input => input.value);
  saveEnabledLogTypeKeys(checked.length ? checked : DEFAULT_LOG_TYPE_KEYS);
  refreshItemKindChoices();
}

let onboardingGuideCleanup = null;

function clearOnboardingGuide() {
  if (typeof onboardingGuideCleanup === 'function') onboardingGuideCleanup();
  onboardingGuideCleanup = null;
  document.querySelectorAll('.onboarding-target').forEach(node => node.classList.remove('onboarding-target'));
  $('#onboardingGuide')?.remove();
}

function currentPageName() {
  return String(window.location.pathname || '').split('/').pop() || 'index.html';
}

function onboardingTargetFor(selector) {
  try { return document.querySelector(selector); } catch { return null; }
}

function positionOnboardingGuide(guide, target) {
  if (!guide || !target) return;
  const rect = target.getBoundingClientRect();
  const gap = 14;
  const width = Math.min(330, Math.max(260, window.innerWidth - 28));
  guide.style.width = `${width}px`;
  guide.style.left = `${Math.max(14, Math.min(window.innerWidth - width - 14, rect.left + rect.width / 2 - width / 2))}px`;
  const guideHeight = guide.offsetHeight || 160;
  const roomBelow = window.innerHeight - rect.bottom;
  const top = roomBelow >= guideHeight + gap
    ? rect.bottom + gap
    : Math.max(14, rect.top - guideHeight - gap);
  guide.style.top = `${Math.max(14, Math.min(window.innerHeight - guideHeight - 14, top))}px`;
}

function showOnboardingGuide({ target, eyebrow = 'GETTING STARTED', title, body, actionLabel = '', onAction = null, waitForClick = false }) {
  clearOnboardingGuide();
  if (!target) return false;
  target.classList.add('onboarding-target');
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

  const guide = document.createElement('aside');
  guide.id = 'onboardingGuide';
  guide.className = 'onboarding-guide';
  guide.setAttribute('role', 'dialog');
  guide.setAttribute('aria-live', 'polite');
  guide.innerHTML = `<p class="modal-eyebrow">${escapeHtml(eyebrow)}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p><div class="onboarding-guide-actions"><button class="quiet-button" type="button" data-onboarding-guide-skip>Skip tour</button>${actionLabel ? `<button class="primary-button" type="button" data-onboarding-guide-action>${escapeHtml(actionLabel)}</button>` : ''}</div>${waitForClick ? '<p class="onboarding-wait-note">Use the highlighted control to continue.</p>' : ''}`;
  const guideHost = target.closest('dialog')?.open ? target.closest('dialog') : document.body;
  guideHost.appendChild(guide);

  const reposition = () => positionOnboardingGuide(guide, target);
  const timer = setTimeout(reposition, 280);
  requestAnimationFrame(reposition);
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);

  const cleanup = () => {
    clearTimeout(timer);
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
    target.classList.remove('onboarding-target');
    guide.remove();
  };
  onboardingGuideCleanup = cleanup;

  guide.querySelector('[data-onboarding-guide-skip]')?.addEventListener('click', () => finishOnboarding());
  if (actionLabel && typeof onAction === 'function') {
    guide.querySelector('[data-onboarding-guide-action]')?.addEventListener('click', onAction);
  }
  return true;
}

function routeOnboardingClick(target, nextStep) {
  if (!target) return;
  const handler = () => {
    setOnboardingStep(nextStep);
    clearOnboardingGuide();
  };
  target.addEventListener('click', handler, { once: true, capture: true });
  const previousCleanup = onboardingGuideCleanup;
  onboardingGuideCleanup = () => {
    target.removeEventListener('click', handler, { capture: true });
    if (typeof previousCleanup === 'function') previousCleanup();
  };
}

function closeItemModalForTour() {
  if (els.itemModal?.open) els.itemModal.close();
}

function showOnboardingGuideStep(user = currentUser) {
  if (!user?.id || localStorage.getItem(onboardingStatusKey(user.id)) !== 'pending') return;
  const step = onboardingStep(user);
  const page = currentPageName();

  if (step <= 0) {
    if (page !== 'index.html') { window.location.assign('index.html'); return; }
    requestAnimationFrame(() => showDialogAtTop(ensureOnboardingColorModal()));
    return;
  }

  if (step === 1) {
    if (page !== 'index.html') { window.location.assign('index.html'); return; }
    const target = onboardingTargetFor('#openAddModal');
    if (showOnboardingGuide({ target, title: 'Add something', body: 'Press + to open Add.', waitForClick: true })) {
      routeOnboardingClick(target, 2);
      target.addEventListener('click', () => setTimeout(() => showOnboardingGuideStep(user), 180), { once: true });
    }
    return;
  }

  if (step >= 2 && step <= 7) {
    if (page !== 'index.html') { window.location.assign('index.html'); return; }
    if (!els.itemModal?.open) openItemModal();
    setTimeout(() => {
      const steps = {
        2: {
          selector: '.add-type-subtype-grid',
          title: 'Pick a Type',
          body: 'Add only shows the Types you chose during onboarding. Open Subtype when you want to be more specific.'
        },
        3: {
          selector: '#catalogueSearchBlock',
          title: 'Find it or type it',
          body: 'Find it searches the selected source shown inside the box. Change the source from its dropdown, or enter a Title manually.'
        },
        4: {
          selector: '.rating-fieldset',
          title: 'Rate it',
          body: 'Choose 1–5 stars. Tap the heart if you recommend it.'
        },
        5: {
          selector: '.item-comment-field',
          title: 'Comment or note',
          body: 'Comment is public. Open Note to self underneath for a private note.'
        },
        6: {
          selector: '#itemDateField',
          title: 'Add a date',
          body: 'Add a date when you want the item recorded on Track.'
        },
        7: {
          selector: '#queueStatusField',
          title: 'Choose status',
          body: 'Finished saves it in Library. Up Next is active. TBR is not started yet.'
        }
      };
      const config = steps[step];
      const target = onboardingTargetFor(config?.selector) || onboardingTargetFor('#itemForm');
      showOnboardingGuide({
        target,
        eyebrow: 'ADD',
        title: config?.title || 'Add',
        body: config?.body || '',
        actionLabel: step === 7 ? 'Continue tour' : 'Next',
        onAction: () => {
          if (step === 7) closeItemModalForTour();
          setOnboardingStep(step + 1);
          showOnboardingGuideStep(user);
        }
      });
    }, 90);
    return;
  }

  if (step === 8) {
    if (page !== 'index.html') { window.location.assign('index.html'); return; }
    const target = onboardingTargetFor('#track');
    showOnboardingGuide({
      target,
      title: 'Track',
      body: 'See what you logged by date. Use + here to add directly from the calendar.',
      actionLabel: 'Next',
      onAction: () => { setOnboardingStep(9); showOnboardingGuideStep(user); }
    });
    return;
  }

  if (step === 9) {
    if (page !== 'index.html') { window.location.assign('index.html'); return; }
    const target = onboardingTargetFor('.site-header a[href="library.html"]');
    if (showOnboardingGuide({ target, title: 'Open Library', body: 'Press Library.', waitForClick: true })) routeOnboardingClick(target, 10);
    return;
  }

  if (step === 10) {
    if (page !== 'library.html') { window.location.assign('library.html'); return; }
    const target = onboardingTargetFor('.library-controls') || onboardingTargetFor('#library');
    showOnboardingGuide({
      target,
      title: 'Library controls',
      body: 'Search, filter by Type, sort, or open saved Places on the map.',
      actionLabel: 'Next',
      onAction: () => { setOnboardingStep(11); showOnboardingGuideStep(user); }
    });
    return;
  }

  if (step === 11) {
    if (page !== 'library.html') { window.location.assign('library.html'); return; }
    const target = onboardingTargetFor('.site-header a[href="discover.html"]');
    if (showOnboardingGuide({ target, title: 'Open Discover', body: 'Press Discover.', waitForClick: true })) routeOnboardingClick(target, 12);
    return;
  }

  if (step === 12) {
    if (page !== 'discover.html') { window.location.assign('discover.html'); return; }
    const target = onboardingTargetFor('#discover');
    showOnboardingGuide({
      target,
      title: 'Discover',
      body: 'Open a card for details, then save it or add it to a queue.',
      actionLabel: 'Next',
      onAction: () => { setOnboardingStep(13); showOnboardingGuideStep(user); }
    });
    return;
  }

  if (step === 13) {
    if (page !== 'discover.html') { window.location.assign('discover.html'); return; }
    const target = onboardingTargetFor('.site-header a[href="social.html"]');
    if (showOnboardingGuide({ target, title: 'Open Social', body: 'Press Social.', waitForClick: true })) routeOnboardingClick(target, 14);
    return;
  }

  if (step >= 14) {
    if (page !== 'social.html') { window.location.assign('social.html'); return; }
    const target = onboardingTargetFor('.social-tabs') || onboardingTargetFor('#socialRoot');
    showOnboardingGuide({
      target,
      title: 'Social',
      body: 'Use Feed, Following, People, and Profile here.',
      actionLabel: 'Finish',
      onAction: () => finishOnboarding(user)
    });
  }
}

function maybeShowOnboarding(user = currentUser) {
  if (!user?.id) return;
  if (localStorage.getItem(onboardingStatusKey(user.id)) !== 'pending') return;
  requestAnimationFrame(() => showOnboardingGuideStep(user));
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

const CANONICAL_LIBRARY_ENTITY_TYPES = new Set([
  'tv','movie','book','youtube','music','artist','song','concert','event','restaurant','place','recipe','food','shopping'
]);

function canonicalLibraryIdentity(value) {
  if (!value) return '';
  const sourceType = getSourceType(value);
  const title = normalizeSearchText(value.title || '');
  const subtitle = normalizeSearchText(value.artistName || value.subtitle || '');
  const providerId = String(value.providerId || '').trim();

  // Prefer semantic identities where Omni can encounter the same catalogue entity
  // through more than one provider (e.g. Last.fm vs iTunes artists).
  if (sourceType === 'book') {
    const signature = bookTitleAuthorSignature(
      value.title || value.raw?.volumeInfo?.title || '',
      value.raw?.volumeInfo?.authors || value.authors || value.subtitle || ''
    );
    if (signature) return `book:${signature}`;
  }
  if (sourceType === 'artist' && title) return `artist:${title}`;
  if (sourceType === 'song' && title) return `song:${subtitle}:${title}`;
  if (sourceType === 'music' && title) return `music:${subtitle}:${title}`;

  if (providerId) return `${sourceType}:${providerId}`;
  if (!CANONICAL_LIBRARY_ENTITY_TYPES.has(sourceType) || !title) return '';

  if (['event','concert'].includes(sourceType)) {
    const date = String(value.eventDate || value.date || value.eventMeta?.eventDate || '').slice(0, 10);
    const venue = normalizeSearchText(value.venueName || value.eventMeta?.venueName || '');
    return `${sourceType}:manual:${title}:${date}:${venue}`;
  }
  if (['restaurant','place'].includes(sourceType)) {
    const address = normalizeSearchText(value.address || value.raw?.formattedAddress || value.eventMeta?.address || '');
    return `restaurant:manual:${title}:${address}`;
  }
  return `${sourceType}:manual:${title}:${subtitle}`;
}

function findCanonicalLibraryItem(value, excludeId = '') {
  const identity = canonicalLibraryIdentity(value);
  if (!identity) return null;
  return state.items.find(item => item.id !== excludeId && canonicalLibraryIdentity(item) === identity) || null;
}

function libraryItemPreservationScore(item) {
  if (!item) return -Infinity;
  const sourceType = getSourceType(item);
  const historyCount = state.history.filter(entry => entry.sourceItemId === item.id).length;
  let progress = 0;
  if (sourceType === 'tv') progress = Number(item.progress?.nextSeason || 1) * 10000 + Number(item.progress?.nextEpisode || 1);
  else if (sourceType === 'book') progress = Number(item.progress?.currentPage || 0);
  else if (sourceType === 'youtube') progress = Number(item.progress?.currentIndex || 0);
  return historyCount * 1000000 + (item.completedAt ? 500000 : 0) + progress * 10 + Number(item.rating || 0) * 100 + ((item.notes || '').trim() ? 50 : 0);
}

function mergeLibraryItemRecords(primary, duplicate) {
  if (!primary || !duplicate || primary.id === duplicate.id) return primary;
  const sourceType = getSourceType(primary);
  const primaryScore = libraryItemPreservationScore(primary);
  const duplicateScore = libraryItemPreservationScore(duplicate);

  // Metadata: preserve the richer/current record without replacing meaningful
  // values with blanks from an accidental duplicate.
  for (const key of ['title','subtitle','image','provider','providerId','subcategory','typeLabel','releaseDate','artistName','artistId','albumName','lastfmUrl','comment']) {
    if (!primary[key] && duplicate[key]) primary[key] = duplicate[key];
  }
  if (!primary.notes && duplicate.notes) primary.notes = duplicate.notes;
  if (!Number(primary.rating || 0) && Number(duplicate.rating || 0)) primary.rating = Number(duplicate.rating || 0);
  primary.recommended = Boolean(primary.recommended || duplicate.recommended);
  primary.people = [...new Set([...(primary.people || []), ...(duplicate.people || [])].filter(Boolean))];
  primary.genres = [...new Set([...(primary.genres || []), ...(duplicate.genres || [])].filter(Boolean))];
  primary.attachments = [
    ...(primary.attachments || []),
    ...(duplicate.attachments || []).filter(file => !(primary.attachments || []).some(saved => saved.id === file.id))
  ];
  // Attachments are detail resources, never automatic poster art.
  primary.coverAttachmentId = '';
  primary.links = [
    ...(primary.links || []),
    ...(duplicate.links || []).filter(link => !(primary.links || []).some(saved => saved.url === link.url))
  ];
  primary.createdAt = [primary.createdAt, duplicate.createdAt].filter(Boolean).sort()[0] || primary.createdAt || duplicate.createdAt || new Date().toISOString();
  primary.updatedAt = [primary.updatedAt, duplicate.updatedAt].filter(Boolean).sort().at(-1) || new Date().toISOString();
  if (!primary.completedAt && duplicate.completedAt) primary.completedAt = duplicate.completedAt;

  if (sourceType === 'tv') {
    const a = Number(primary.progress?.nextSeason || 1) * 10000 + Number(primary.progress?.nextEpisode || 1);
    const b = Number(duplicate.progress?.nextSeason || 1) * 10000 + Number(duplicate.progress?.nextEpisode || 1);
    if (b > a) primary.progress = { ...(primary.progress || {}), ...(duplicate.progress || {}) };
    primary.tvMeta = { ...(duplicate.tvMeta || {}), ...(primary.tvMeta || {}) };
    if (!primary.watchDisposition && duplicate.watchDisposition) primary.watchDisposition = duplicate.watchDisposition;
  } else if (sourceType === 'book') {
    primary.progress = {
      ...(duplicate.progress || {}),
      ...(primary.progress || {}),
      currentPage: Math.max(Number(primary.progress?.currentPage || 0), Number(duplicate.progress?.currentPage || 0)),
      totalPages: Math.max(Number(primary.progress?.totalPages || 0), Number(duplicate.progress?.totalPages || 0)),
      readingPeriods: sanitizeBookReadingPeriods([
        ...getBookReadingPeriods(primary),
        ...getBookReadingPeriods(duplicate)
      ].filter((period, index, all) => all.findIndex(other => other.startDate === period.startDate && other.endDate === period.endDate) === index))
    };
  } else if (duplicateScore > primaryScore && duplicate.progress) {
    primary.progress = { ...(duplicate.progress || {}), ...(primary.progress || {}) };
  }

  const statuses = new Set([getQueueStatus(primary), getQueueStatus(duplicate)]);
  if (primary.completedAt) setItemQueueStatus(primary, 'library');
  else if (statuses.has('upnext')) setItemQueueStatus(primary, 'upnext');
  else if (statuses.has('tbr')) setItemQueueStatus(primary, 'tbr');
  else setItemQueueStatus(primary, 'library');

  for (const entry of state.history) {
    if (entry.sourceItemId === duplicate.id) entry.sourceItemId = primary.id;
  }
  return primary;
}

function historyRepeatIdentity(record) {
  if (!record?.sourceItemId) return '';
  const source = findItem(record.sourceItemId);
  const sourceType = source ? getSourceType(source) : String(record.sourceType || record.type || '');
  if (record.kind === 'episode-watched') {
    return `${record.sourceItemId}:episode:${Number(record.seasonNumber || 0)}:${Number(record.episodeNumber || 0)}`;
  }
  if (record.kind === 'series-watched') return `${record.sourceItemId}:series`;
  if (record.kind === 'movie-watched') return `${record.sourceItemId}:movie`;
  if (record.kind === 'book-finished') return `${record.sourceItemId}:book`;
  if (record.kind === 'item-completed' && sourceType === 'youtube') return `${record.sourceItemId}:youtube`;
  return '';
}

function repeatConsumptionLabel(record) {
  const source = record?.sourceItemId ? findItem(record.sourceItemId) : null;
  const sourceType = source ? getSourceType(source) : String(record?.sourceType || record?.type || '');
  if (sourceType === 'book') return 'Reread';
  return 'Rewatch';
}

function annotateRepeatedHistoryRecords() {
  const groups = new Map();
  const ordered = [...state.history].sort((a, b) => String(a.createdAt || a.date || '').localeCompare(String(b.createdAt || b.date || '')));
  let changed = false;
  for (const entry of ordered) {
    const key = historyRepeatIdentity(entry);
    if (!key) continue;
    const count = (groups.get(key) || 0) + 1;
    groups.set(key, count);
    const shouldRepeat = count > 1;
    if (Boolean(entry.rewatch) !== shouldRepeat) { entry.rewatch = shouldRepeat; changed = true; }
    if (Number(entry.repeatIndex || 0) !== count) { entry.repeatIndex = count; changed = true; }
    if (shouldRepeat) {
      const label = repeatConsumptionLabel(entry);
      const subtitle = String(entry.subtitle || '');
      if (!subtitle.startsWith(`${label} ·`) && subtitle !== label) {
        entry.subtitle = subtitle ? `${label} · ${subtitle}` : label;
        changed = true;
      }
    }
  }
  return changed;
}

function migrateDuplicateLibraryItems() {
  const groups = new Map();
  for (const item of state.items) {
    const key = canonicalLibraryIdentity(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  let itemsChanged = false;
  let historyChanged = false;
  const removeIds = new Set();
  const replacementIds = new Map();
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    const sorted = [...items].sort((a, b) => libraryItemPreservationScore(b) - libraryItemPreservationScore(a) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    const primary = sorted[0];
    for (const duplicate of sorted.slice(1)) {
      mergeLibraryItemRecords(primary, duplicate);
      replacementIds.set(duplicate.id, primary.id);
      removeIds.add(duplicate.id);
      itemsChanged = true;
      historyChanged = true;
    }
  }
  if (removeIds.size) {
    state.items = state.items.filter(item => !removeIds.has(item.id));
    let albumsChanged = false;
    state.albums = (state.albums || []).map(album => {
      const nextIds = [...new Set((album.itemIds || []).map(id => replacementIds.get(id) || id).filter(id => state.items.some(item => item.id === id)))];
      if (nextIds.join('|') !== (album.itemIds || []).join('|')) albumsChanged = true;
      return { ...album, itemIds: nextIds };
    });
    if (albumsChanged) saveAlbums();
  }
  if (annotateRepeatedHistoryRecords()) historyChanged = true;
  if (itemsChanged) saveItems();
  if (historyChanged) saveHistory();
}

function init() {
  migrateSavedMusicClassification();
  migrateSavedFoodClassification();
  migrateDuplicateLibraryItems();
  migrateCustomTypesFromLibrary();
  migrateCustomTypeActionCategories();
  seedTypeUsageFromLibrary();
  reconcileLocalProgressQueues();
  const now = new Date();
  if (els.monthPicker) {
    els.monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  state.calendarWeekStart = startOfWeek(now);

  bindEvents();
  initSocialPage();
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
  els.calendarThemePicker?.addEventListener('click', chooseCalendarThemeDraft);
  els.resetStickerSettings?.addEventListener('click', resetStickerSettings);
  els.stickerSettingsModal?.addEventListener('close', () => { calendarThemeDraft = ''; applyCalendarTheme(); });
  els.openStreakSettings?.addEventListener('click', openStreakSettings);
  els.streakSettingsForm?.addEventListener('submit', saveStreakSettings);
  els.streakSettingsRows?.addEventListener('change', previewStreakSettings);
  els.streakSettingsRows?.addEventListener('click', handleStreakSettingsClick);
  els.resetStreakSettings?.addEventListener('click', resetStreakSettings);
  els.calendarRowSettingsForm?.addEventListener('submit', saveCalendarRowSettings);
  els.resetCalendarRowSettings?.addEventListener('click', resetCalendarRowSettings);
  els.addCalendarRow?.addEventListener('click', addCalendarRowSettingsGroup);
  els.calendarRowSettingsRows?.addEventListener('pointerdown', beginCalendarRowChipDrag);
  els.calendarRowSettingsRows?.addEventListener('click', handleCalendarRowSettingsClick);
  document.addEventListener('pointermove', moveCalendarRowChipDrag, { passive: false });
  document.addEventListener('pointerup', endCalendarRowChipDrag);
  document.addEventListener('pointercancel', cancelCalendarRowChipDrag);
  els.itemActionChoice?.addEventListener('change', () => {
    refreshItemKindChoices('', els.itemActionChoice.value);
    applyItemKindChoice(true);
  });
  els.itemKindChoice?.addEventListener('change', () => applyItemKindChoice(true));
  els.itemSourceType?.addEventListener('change', () => {
    clearSourceSelectionForTypeChange();
    configureItemSubtype(true);
    updateItemFormForType();
  });
  els.itemSubtype?.addEventListener('change', () => {
    clearSourceSelectionForTypeChange();
    updateItemFormForType();
  });
  els.itemSubcategorySelect?.addEventListener('change', () => {
    const value = els.itemSubcategorySelect.value || '';
    const creating = value === '__new__';
    els.itemSubcategorySelect.dataset.creatingNew = creating ? 'true' : 'false';
    els.itemSubcategorySelect.dataset.explicitNone = !creating && !value ? 'true' : 'false';
    if (els.itemSubcategoryNewField) els.itemSubcategoryNewField.hidden = !creating;
    if (els.itemSubcategory) {
      els.itemSubcategory.value = creating ? '' : value;
      if (creating) requestAnimationFrame(() => els.itemSubcategory?.focus());
    }
    clearSourceSelectionForTypeChange();
    updateItemFormForType();
  });
  els.itemFindSource?.addEventListener('change', () => {
    clearSourceSelectionForTypeChange();
    syncItemFindSourceSummary();
    els.itemFindSource?.classList.remove('needs-choice');
    if (els.findSourcePrompt) els.findSourcePrompt.hidden = true;
    updateItemFormForType();
  });
  els.itemStatusPicker?.addEventListener('click', event => {
    const button = event.target.closest('[data-item-status]');
    if (!button || !els.itemQueueStatus) return;
    els.itemQueueStatus.value = button.dataset.itemStatus || 'library';
    syncItemStatusPicker();
  });
  els.itemProgressMode?.addEventListener('change', updateItemFormForType);
  els.itemUseDateRange?.addEventListener('change', updateItemFormForType);
  els.itemUseRepeatLog?.addEventListener('change', updateItemFormForType);
  els.itemUsePlaylist?.addEventListener('change', updateItemFormForType);
  els.catalogueSearchButton?.addEventListener('click', searchCatalogue);
  els.catalogueQuery?.addEventListener('focus', () => {
    if (selectedSavedTypeEntry() && defaultFindSourceForType(automaticFormSourceType()) === 'manual' && (els.itemFindSource?.value || 'auto') === 'auto') {
      if (els.findSourcePrompt) els.findSourcePrompt.hidden = false;
      els.itemFindSource?.classList.add('needs-choice');
    }
  });
  els.catalogueQuery?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchCatalogue();
    }
  });
  els.playlistLoadButton?.addEventListener('click', loadPlaylistPreview);
  els.reminderFrequency?.addEventListener('change', updateReminderFormFields);
  els.reminderWeekday?.addEventListener('change', updateReminderFormFields);
  els.reminderDueDate?.addEventListener('change', updateReminderFormFields);
  els.reminderIntervalUnit?.addEventListener('change', updateReminderFormFields);
  els.tvWatchSetupList?.addEventListener('change', handleTVDraftEpisodeToggle);
  els.tvWatchSetupList?.addEventListener('click', handleTVDraftSeasonAction);
  els.tvMarkAllWatched?.addEventListener('click', toggleAllTVDraftEpisodes);
  els.tvClearWatched?.addEventListener('click', () => { state.tvDraftBulkBaseline = null; setAllTVDraftEpisodes(false); });
  els.itemForm?.addEventListener('submit', saveItemFromForm);
  els.itemPeopleSuggestions?.addEventListener('click', handleItemPeopleSuggestionClick);
  els.itemPeople?.addEventListener('input', () => {
    renderItemPeopleSuggestions();
    syncItemPeopleDisclosure();
  });
  els.itemSubcategory?.addEventListener('input', () => {
    if (els.itemSubcategorySelect?.dataset.creatingNew === 'true') els.itemSubcategorySelect.value = '__new__';
    if (els.itemSubcategorySelect) els.itemSubcategorySelect.dataset.explicitNone = 'false';
    syncItemSubcategoryDisclosure();
    updateItemFormForType();
  });
  els.itemBuddyWatchToggle?.addEventListener('change', syncItemBuddyWatchToggle);
  els.deleteItem?.addEventListener('click', deleteEditingItem);
  document.addEventListener('click', event => {
    const shortcut = event.target.closest('[data-buddy-watch-item]');
    if (!shortcut) return;
    const item = findItem(shortcut.dataset.buddyWatchItem || '');
    if (item) openQuickBuddyWatchForItem(item).catch(error => console.warn('[Buddy Watch] could not open:', error));
  });
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
  els.typeFilterOptions?.addEventListener('click', handleLibraryTypeFilterAction);
  els.librarySort?.addEventListener('change', renderLibrary);
  els.librarySearch?.addEventListener('input', () => { state.librarySearchQuery = els.librarySearch.value || ''; renderLibrary(); });
  els.openLibrarySettings?.addEventListener('click', openLibrarySettings);
  els.librarySettingsForm?.addEventListener('submit', saveLibrarySettings);
  els.resetLibraryDefaults?.addEventListener('click', resetLibrarySettingsDraft);
  els.libraryViewTabs?.forEach(tab => tab.addEventListener('click', () => setLibraryView(tab.dataset.libraryView)));
  els.upNextList?.addEventListener('click', handleUpNextClick);
  els.trackerGrid?.addEventListener('click', handleTrackerClick);
  els.libraryGroups?.addEventListener('click', handleLibraryClick);
  els.openAlbumCreate?.addEventListener('click', () => openAlbumEditor());
  els.albumsGrid?.addEventListener('click', handleAlbumsClick);
  els.statsSummary?.addEventListener('click', handleStatsBreakdownClick);
  els.statsTypes?.addEventListener('click', handleStatsBreakdownClick);
  els.statsGenres?.addEventListener('click', handleStatsBreakdownClick);
  els.statsGenres?.addEventListener('keydown', event => {
    const slice = event.target.closest?.('[data-stats-genre-list]');
    if (!slice || !['Enter',' '].includes(event.key)) return;
    event.preventDefault();
    slice.click();
  });
  els.openLibraryMap?.addEventListener('click', () => openLibraryMap().catch(error => alert(error?.message || 'Could not load map.')));
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

    const detailCollection = event.target.closest('.library-detail-mobile-collection-button[data-library-add-album]');
    if (detailCollection) {
      event.preventDefault();
      event.stopPropagation();
      openLibraryAddToAlbum(detailCollection.dataset.libraryAddAlbum);
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

    const librarySimilar = event.target.closest('[data-library-similar]');
    if (librarySimilar) {
      try {
        const result = JSON.parse(librarySimilar.dataset.librarySimilar || '{}');
        const sourceType = result.sourceType || 'other';
        els.detailModal?.close();
        openItemModal('', 'library');
        setItemFormSourceType(sourceType, sourceType === 'music' ? { provider: result.provider, subcategory: 'Album' } : null);
        updateItemFormForType();
        selectCatalogueResult(result);
      } catch (error) {
        console.warn('[Library Recommendations] could not open recommendation', error);
      }
      return;
    }

    const restaurantSuggestion = event.target.closest('[data-restaurant-suggestion]');
    if (restaurantSuggestion) {
      try {
        const result = JSON.parse(restaurantSuggestion.dataset.restaurantSuggestion || '{}');
        els.detailModal?.close();
        openItemModal('', 'library');
        setItemFormSourceType('restaurant');
        updateItemFormForType();
        selectCatalogueResult(result);
      } catch {}
      return;
    }

    const addRepeatLog = event.target.closest('[data-add-repeat-log]');
    if (addRepeatLog) {
      const item = findItem(addRepeatLog.dataset.addRepeatLog || state.openDetailId);
      if (item) openRepeatLogModal(item);
      return;
    }
    const editRepeatHistory = event.target.closest('[data-edit-repeat-history]');
    if (editRepeatHistory) {
      els.detailModal?.close();
      openHistoryEdit(editRepeatHistory.dataset.editRepeatHistory);
      return;
    }
    const deleteRepeatHistory = event.target.closest('[data-delete-repeat-history]');
    if (deleteRepeatHistory) {
      const id = deleteRepeatHistory.dataset.deleteRepeatHistory;
      const entry = state.history.find(record => record.id === id);
      if (entry && confirm(`Delete this ${entry.date ? formatLongDate(entry.date) : 'log'} entry?`)) {
        state.history = state.history.filter(record => record.id !== id);
        saveHistory(); renderAll();
        const item = findItem(entry.sourceItemId || '');
        if (item && els.detailModal?.open) await openDetails(item.id);
      }
      return;
    }

    const artistAlbumToggle = event.target.closest('[data-artist-album-toggle]');
    if (artistAlbumToggle) {
      event.preventDefault();
      await toggleArtistAlbumTracks(artistAlbumToggle);
      return;
    }

    const artistFavorite = event.target.closest('[data-artist-favorite]');
    if (artistFavorite) {
      const item = findItem(artistFavorite.dataset.artistItemId || state.openDetailId);
      if (item) {
        try {
          const payload = JSON.parse(decodeURIComponent(artistFavorite.dataset.artistFavorite || ''));
          toggleArtistFavorite(item, payload);
          saveItems();
          await openDetails(item.id);
        } catch (error) {
          console.warn('[Artist favorites] Could not update favorite', error);
        }
      }
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
      const selected = ratingFromStarPointer(event, libraryRating, 'data-library-rating');
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

    const addClassLog = event.target.closest('[data-add-class-log]');
    if (addClassLog) {
      els.detailModal.close();
      openItemModal('', 'library');
      if (els.itemActionChoice) els.itemActionChoice.value = 'completed';
      refreshItemKindChoices('class', 'completed');
      setUnderlyingFormTypeForKind('class');
      if (els.itemKindChoice) els.itemKindChoice.value = 'class';
      if (els.itemSourceType) els.itemSourceType.value = 'class';
      if (els.itemFindSource) els.itemFindSource.value = 'manual';
      if (els.itemDate) els.itemDate.value = todayString();
      updateItemFormForType();
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
      if (item) await toggleSpecificYouTubeVideo(item, youtubeVideoCheck.dataset.checkYoutubeVideo);
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
        if (getSourceType(item) === 'reminder') renderReminderDetails(item);
        else await openDetails(item.id);
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
      const selected = ratingFromStarPointer(event, discoverTVRating, 'data-discover-tv-rating');
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

function saveAlbums() {
  safeLocalSet(ALBUMS_KEY, state.albums);
  scheduleCloudSync();
}

function albumItemPreviewMarkup(item) {
  if (!item) return '';
  return item.image
    ? `<img src="${escapeAttr(item.image)}" alt="" loading="lazy" />`
    : `<span class="album-preview-text">${escapeHtml((item.title || '?').slice(0,1).toUpperCase())}</span>`;
}

function renderAlbums() {
  if (!els.albumsGrid) return;
  state.albums = (Array.isArray(state.albums) ? state.albums : []).map(album => ({ ...album, itemIds: [...new Set((album.itemIds || []).filter(id => findItem(id)))] }));
  els.albumsGrid.innerHTML = state.albums.map(album => {
    const items = (album.itemIds || []).map(findItem).filter(Boolean);
    const previews = items.slice(0,4).map(albumItemPreviewMarkup).join('');
    return `<button class="album-card" type="button" data-album-open="${escapeAttr(album.id)}"><span class="album-cover-grid">${previews || '<span class="album-preview-text">+</span>'}</span><span class="album-card-copy"><strong>${escapeHtml(album.title || 'Collection')}</strong><small>${items.length} ${items.length === 1 ? 'item' : 'items'}</small></span></button>`;
  }).join('');
  if (els.albumsEmpty) els.albumsEmpty.hidden = state.albums.length > 0;
}

let albumEditorSelectedIds = new Set();
let albumEditorTypeFilters = new Set();
let albumEditorSort = 'recent';

function albumAvailableTypeGroups() {
  const groups = new Map();
  for (const item of state.items) {
    const key = libraryTypeGroupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()]
    .map(([key, items]) => ({ key, label: libraryTypeGroupLabel(items, key), count: items.length }))
    .sort((a,b) => a.label.localeCompare(b.label));
}

function renderAlbumTypeFilterOptions() {
  const modal = $('#albumEditorModal');
  const options = $('#albumTypeFilterOptions');
  const summary = $('#albumTypeFilterSummary');
  if (!modal || !options || !summary) return;
  const groups = albumAvailableTypeGroups();
  const available = new Set(groups.map(group => group.key));
  albumEditorTypeFilters = new Set([...albumEditorTypeFilters].filter(key => available.has(key)));
  if (!albumEditorTypeFilters.size && groups.length) albumEditorTypeFilters = new Set(groups.map(group => group.key));
  options.innerHTML = groups.map(group => `<label class="library-type-option album-type-option"><input type="checkbox" value="${escapeAttr(group.key)}" ${albumEditorTypeFilters.has(group.key) ? 'checked' : ''} /><span>${escapeHtml(group.label)}</span><small>${group.count}</small></label>`).join('');
  summary.textContent = albumEditorTypeFilters.size === groups.length
    ? 'All types'
    : groups.filter(group => albumEditorTypeFilters.has(group.key)).map(group => group.label).slice(0,3).join(', ') + (albumEditorTypeFilters.size > 3 ? ` +${albumEditorTypeFilters.size - 3}` : '');
}

function ensureAlbumEditorModal() {
  let modal = $('#albumEditorModal');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'albumEditorModal';
  modal.className = 'modal album-editor-modal';
  modal.innerHTML = `<button class="modal-x" type="button" data-close="albumEditorModal" aria-label="Close">×</button>
    <div class="modal-heading"><h2 id="albumEditorTitle">New collection</h2></div>
    <form id="albumEditorForm" class="item-form album-editor-form">
      <input id="albumEditingId" type="hidden"/>
      <div class="album-editor-toolbar">
        <label class="album-toolbar-name"><span class="sr-only">Collection name</span><input id="albumName" type="text" maxlength="80" placeholder="Collection name" aria-label="Collection name" required/></label>
        <label class="album-toolbar-search"><span class="sr-only">Search your Library</span><input id="albumItemSearch" type="search" autocomplete="off" placeholder="Search Library…" aria-label="Search your Library" /></label>
        <details id="albumTypeFilter" class="library-type-filter album-type-filter">
          <summary id="albumTypeFilterSummary">All types</summary>
          <div id="albumTypeFilterOptions" class="library-type-options album-type-options" role="group" aria-label="Collection item types"></div>
        </details>
        <label class="album-sort-control"><span class="sr-only">Sort collection Library</span><select id="albumSort" aria-label="Sort collection Library"><option value="recent">Recent</option><option value="rating">Rating</option><option value="title">Title</option></select></label>
      </div>
      <div id="albumSelectedSummary" class="album-selected-summary"></div>
      <div id="albumItemChoices" class="album-library-browser"></div>
      <details class="compact-add-option"><summary><span class="compact-add-plus" aria-hidden="true">+</span><span>Note</span></summary><label class="field compact-add-body"><span class="sr-only">Collection note</span><input id="albumNote" type="text" maxlength="160"/></label></details>
      <div class="modal-actions"><button id="albumDelete" class="delete-button" type="button" hidden>Delete</button><div class="actions-right"><button class="quiet-button" type="button" data-close="albumEditorModal">Cancel</button><button class="primary-button" type="submit">Save</button></div></div>
    </form>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close="albumEditorModal"]')?.addEventListener('click', () => modal.close());
  modal.querySelector('#albumItemSearch')?.addEventListener('input', renderAlbumItemChoices);
  modal.querySelector('#albumSort')?.addEventListener('change', event => {
    albumEditorSort = ['recent', 'rating', 'title'].includes(event.target.value) ? event.target.value : 'recent';
    renderAlbumItemChoices();
  });
  modal.querySelector('#albumTypeFilterOptions')?.addEventListener('change', event => {
    const input = event.target.closest('input[type="checkbox"][value]');
    if (!input) return;
    if (input.checked) albumEditorTypeFilters.add(input.value);
    else albumEditorTypeFilters.delete(input.value);
    if (!albumEditorTypeFilters.size) {
      input.checked = true;
      albumEditorTypeFilters.add(input.value);
    }
    renderAlbumTypeFilterOptions();
    renderAlbumItemChoices();
  });
  modal.querySelector('#albumItemChoices')?.addEventListener('change', event => {
    if (!event.target.matches('[data-album-item]')) return;
    if (event.target.checked) albumEditorSelectedIds.add(event.target.value);
    else albumEditorSelectedIds.delete(event.target.value);
    renderAlbumSelectedSummary();
  });
  modal.querySelector('#albumEditorForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const id = $('#albumEditingId')?.value || '';
    const existing = state.albums.find(album => album.id === id);
    const title = String($('#albumName')?.value || '').trim();
    if (!title) return;
    const itemIds = [...albumEditorSelectedIds].filter(id => findItem(id));
    const album = existing || { id: makeId(), createdAt: new Date().toISOString() };
    album.title = title;
    album.description = String($('#albumNote')?.value || '').trim();
    album.itemIds = itemIds;
    album.updatedAt = new Date().toISOString();
    if (!existing) state.albums.unshift(album);
    saveAlbums(); renderAlbums(); modal.close(); scheduleCloudSync();
  });
  modal.querySelector('#albumDelete')?.addEventListener('click', () => {
    const id = $('#albumEditingId')?.value || '';
    if (!id) return;
    state.albums = state.albums.filter(album => album.id !== id);
    saveAlbums(); renderAlbums(); modal.close(); scheduleCloudSync();
  });
  return modal;
}

function albumLibraryChoiceMarkup(item, selected) {
  const hasImage = Boolean(String(item.image || '').trim());
  const rating = Math.max(0, Math.min(5, Number(item.rating || 0)));
  return `<label class="album-library-choice${selected ? ' is-selected' : ''}" title="${escapeAttr(item.title || 'Untitled')}">
    <input type="checkbox" data-album-item value="${escapeAttr(item.id)}" ${selected ? 'checked' : ''}/>
    <span class="album-library-poster${hasImage ? '' : ' is-text'}">
      ${hasImage ? `<img src="${escapeAttr(item.image)}" alt="" loading="lazy"/>` : `<strong>${escapeHtml(item.title || 'Untitled')}</strong>`}
      <span class="album-library-check" aria-hidden="true">✓</span>
      ${rating ? `<span class="album-library-rating">★ ${escapeHtml(formatPersonalRating(rating))}</span>` : ''}
    </span>
    <span class="album-library-title">${escapeHtml(item.title || 'Untitled')}</span>
  </label>`;
}

function renderAlbumSelectedSummary() {
  const modal = $('#albumEditorModal');
  const target = $('#albumSelectedSummary');
  if (!modal || !target) return;
  const selected = [...albumEditorSelectedIds].map(findItem).filter(Boolean);
  target.innerHTML = selected.length
    ? `<strong>${selected.length} selected</strong><span>${selected.slice(0,5).map(item => escapeHtml(item.title)).join(' · ')}${selected.length > 5 ? ' · …' : ''}</span>`
    : '<span>Choose from your Library.</span>';
}

function renderAlbumItemChoices() {
  const modal = $('#albumEditorModal');
  const container = $('#albumItemChoices');
  if (!modal || !container) return;
  const search = normalizeSearchText($('#albumItemSearch')?.value || '');
  const checkedIds = albumEditorSelectedIds;
  const filtered = state.items
    .slice()
    .filter(item => albumEditorTypeFilters.has(libraryTypeGroupKey(item)))
    .filter(item => !search || normalizeSearchText([item.title, item.subtitle, getItemTypeLabel(item), item.subcategory, ...(item.genres || [])].filter(Boolean).join(' ')).includes(search));

  const grouped = new Map();
  for (const item of filtered) {
    const key = libraryTypeGroupKey(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  for (const items of grouped.values()) items.sort((a,b) => {
    if (albumEditorSort === 'rating') {
      return Number(b.rating || 0) - Number(a.rating || 0)
        || String(itemLastTrackedDate(b)).localeCompare(String(itemLastTrackedDate(a)))
        || String(a.title || '').localeCompare(String(b.title || ''));
    }
    if (albumEditorSort === 'title') {
      return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' })
        || String(itemLastTrackedDate(b)).localeCompare(String(itemLastTrackedDate(a)));
    }
    const aDate = itemLastTrackedDate(a);
    const bDate = itemLastTrackedDate(b);
    if (aDate && bDate) return String(bDate).localeCompare(String(aDate)) || String(a.title || '').localeCompare(String(b.title || ''));
    if (aDate) return -1;
    if (bDate) return 1;
    return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
  });

  const groups = [...grouped.entries()].sort((a,b) => libraryTypeGroupLabel(a[1], a[0]).localeCompare(libraryTypeGroupLabel(b[1], b[0])));
  container.innerHTML = groups.map(([key, items]) => {
    const label = libraryTypeGroupLabel(items, key);
    return `<section class="album-library-group">
      <div class="album-library-group-heading"><h3>${escapeHtml(label)}</h3><span>${items.length}</span></div>
      <div class="album-library-shelf">${items.map(item => albumLibraryChoiceMarkup(item, checkedIds.has(item.id))).join('')}</div>
    </section>`;
  }).join('') || '<p class="empty-state album-picker-empty">No matches.</p>';
  renderAlbumSelectedSummary();
}

function openAlbumEditor(id = '', preselectItemId = '') {
  const modal = ensureAlbumEditorModal();
  const album = state.albums.find(entry => entry.id === id) || null;
  $('#albumEditingId').value = album?.id || '';
  $('#albumEditorTitle').textContent = album ? 'Edit collection' : 'New collection';
  $('#albumName').value = album?.title || '';
  $('#albumNote').value = album?.description || '';
  $('#albumDelete').hidden = !album;
  albumEditorSelectedIds = new Set(album?.itemIds || []);
  if (!album && preselectItemId && findItem(preselectItemId)) albumEditorSelectedIds.add(preselectItemId);
  $('#albumItemSearch').value = '';
  albumEditorSort = 'recent';
  $('#albumSort').value = albumEditorSort;
  albumEditorTypeFilters = new Set(albumAvailableTypeGroups().map(group => group.key));
  renderAlbumTypeFilterOptions();
  renderAlbumItemChoices();
  showDialogAtTop(modal);
}

function ensureLibraryAddToAlbumModal() {
  let modal = $('#libraryAddToAlbumModal');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'libraryAddToAlbumModal';
  modal.className = 'modal small-modal library-add-album-modal';
  modal.innerHTML = `<button class="modal-x" type="button" data-close="libraryAddToAlbumModal" aria-label="Close">×</button>
    <div class="modal-heading"><h2>Add to collection</h2></div>
    <div id="libraryAddToAlbumChoices" class="library-add-album-choices"></div>
    <button class="secondary-button library-new-album-button" type="button" data-library-new-album>+ New collection</button>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close="libraryAddToAlbumModal"]')?.addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    const add = event.target.closest('[data-library-album-target]');
    if (add) {
      const itemId = modal.dataset.itemId || '';
      const album = state.albums.find(entry => entry.id === add.dataset.libraryAlbumTarget);
      if (!album || !findItem(itemId)) return;
      album.itemIds = [...new Set([...(album.itemIds || []), itemId])];
      album.updatedAt = new Date().toISOString();
      saveAlbums(); renderAlbums(); modal.close();
      return;
    }
    if (event.target.closest('[data-library-new-album]')) {
      const itemId = modal.dataset.itemId || '';
      modal.close();
      openAlbumEditor('', itemId);
    }
  });
  return modal;
}

function openLibraryAddToAlbum(itemId) {
  const item = findItem(itemId);
  if (!item) return;
  const modal = ensureLibraryAddToAlbumModal();
  modal.dataset.itemId = item.id;
  const target = $('#libraryAddToAlbumChoices');
  target.innerHTML = state.albums.length
    ? state.albums.map(album => {
        const already = (album.itemIds || []).includes(item.id);
        return `<button type="button" data-library-album-target="${escapeAttr(album.id)}" ${already ? 'disabled' : ''}><strong>${escapeHtml(album.title || 'Collection')}</strong><span>${already ? 'Already added' : `${(album.itemIds || []).length} ${(album.itemIds || []).length === 1 ? 'item' : 'items'}`}</span></button>`;
      }).join('')
    : '<p class="empty-state">No collections yet.</p>';
  showDialogAtTop(modal);
}

function ensureAlbumDetailModal() {
  let modal = $('#albumDetailModal');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'albumDetailModal'; modal.className = 'modal album-detail-modal';
  modal.innerHTML = `<button class="modal-x" type="button" data-close="albumDetailModal" aria-label="Close">×</button><div id="albumDetailBody"></div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close="albumDetailModal"]')?.addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    const itemButton = event.target.closest('[data-album-open-item]');
    if (itemButton) { modal.close(); openDetails(itemButton.dataset.albumOpenItem); return; }
    const edit = event.target.closest('[data-album-edit]');
    if (edit) { modal.close(); openAlbumEditor(edit.dataset.albumEdit); }
  });
  return modal;
}

function appleMusicSearchUrl(item) {
  const term = [item.title, item.artistName || item.subtitle || ''].filter(Boolean).join(' ');
  return `https://music.apple.com/ca/search?term=${encodeURIComponent(term)}`;
}

function openAlbumDetail(id) {
  const album = state.albums.find(entry => entry.id === id);
  if (!album) return;
  const modal = ensureAlbumDetailModal();
  const items = (album.itemIds || []).map(findItem).filter(Boolean);
  const allSongs = items.length > 0 && items.every(item => getSourceType(item) === 'song');
  $('#albumDetailBody').innerHTML = `<div class="modal-heading"><h2>${escapeHtml(album.title)}</h2>${album.description ? `<p>${escapeHtml(album.description)}</p>` : ''}</div><div class="album-detail-actions"><button class="secondary-button" type="button" data-album-edit="${escapeAttr(album.id)}">Edit</button></div><div class="album-detail-items">${items.map(item => `<article class="album-detail-item"><button type="button" data-album-open-item="${escapeAttr(item.id)}">${item.image ? `<img src="${escapeAttr(item.image)}" alt=""/>` : '<span class="album-choice-placeholder"></span>'}<span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(getItemTypeLabel(item))}</small></span></button>${getSourceType(item) === 'song' ? `<a href="${escapeAttr(appleMusicSearchUrl(item))}" target="_blank" rel="noopener">Apple Music ↗</a>` : ''}</article>`).join('') || '<p class="empty-state">Empty collection.</p>'}</div>${allSongs ? '<p class="album-apple-note">This song collection can become one Apple Music playlist after Apple Music is connected. Until then, songs open individually.</p>' : ''}`;
  showDialogAtTop(modal);
}

function handleAlbumsClick(event) {
  const button = event.target.closest('[data-album-open]');
  if (button) openAlbumDetail(button.dataset.albumOpen);
}

function watchedTitleHasConsumption(item) {
  const type = getSourceType(item);
  if (type === 'tv') return state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched');
  if (type === 'movie') return Boolean(item.completedAt) || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'movie-watched');
  if (type === 'youtube') return Boolean(item.completedAt) || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'item-completed');
  return false;
}

const STATS_GENRE_COLORS = Object.freeze({
  Action:'#307351', Adventure:'#648767', Animation:'#f7e186', Comedy:'#669bbc', Crime:'#c1121f',
  Documentary:'#2C4251', Drama:'#003049', Family:'#21A179', Fantasy:'#297373', History:'#595A4A',
  Horror:'#0F110C', Mystery:'#67597A', Romance:'#780000', 'Science Fiction':'#A09BE7', Thriller:'#031D44',
  War:'#6d7480', Western:'#9c7450', 'TV Movie':'#8fa8bc', Politics:'#9a4353', Reality:'#F786AA',
  Music:'#bb7a3e', News:'#597c8d', Soap:'#9d6b78', Talk:'#7770a6', Other:'#b0a79a'
});
const STATS_RECOGNIZED_GENRES = new Set(Object.keys(STATS_GENRE_COLORS).filter(label => label !== 'Other'));

function canonicalStatsGenreLabels(value) {
  const label = cleanTypeLabel(typeof value === 'string' ? value : value?.name || '');
  if (!label) return [];
  const normalized = label.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  if (['sci-fi & fantasy','science fiction & fantasy','sci fi & fantasy'].includes(normalized)) return ['Science Fiction','Fantasy'];
  if (['sci-fi','sci fi','science-fiction','science fiction'].includes(normalized)) return ['Science Fiction'];
  if (normalized === 'action & adventure') return ['Action','Adventure'];
  if (normalized === 'kids') return ['Family'];
  if (normalized === 'war & politics') return ['War'];
  if (['reality','reality tv','reality television'].includes(normalized)) return ['Reality'];
  if (normalized === 'horror') return ['Horror'];
  if (normalized === 'thriller') return ['Thriller'];
  const exact = [...STATS_RECOGNIZED_GENRES].find(candidate => candidate.toLowerCase() === normalized);
  return [exact || label];
}

function watchedGenreCounts() {
  const counts = new Map();
  for (const item of state.items) {
    if (!watchedTitleHasConsumption(item)) continue;
    const perTitle = new Set();
    for (const genre of item.genres || []) {
      for (const label of canonicalStatsGenreLabels(genre)) if (label) perTitle.add(label);
    }
    for (const label of perTitle) counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const statsTvGenreEnrichmentInFlight = new Set();
async function enrichWatchedTVStatsGenres() {
  if (!state.settings.tmdbToken || !TrackerAPI.getTVDetails) return false;
  let changed = false;
  const watched = state.items.filter(item => getSourceType(item) === 'tv' && item.providerId && watchedTitleHasConsumption(item));
  for (const item of watched) {
    if (statsTvGenreEnrichmentInFlight.has(item.id)) continue;
    statsTvGenreEnrichmentInFlight.add(item.id);
    try {
      const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
      const merged = new Set(item.genres || []);
      for (const genre of details?.genres || []) if (genre?.name) merged.add(genre.name);

      // TMDB has no native TV Horror/Thriller genres, so use its keywords for those two.
      if (TrackerAPI.getTMDBItemKeywords) {
        try {
          const keywords = await getCached(`tv:${item.providerId}:stats-keywords`, () => TrackerAPI.getTMDBItemKeywords('tv', item.providerId, state.settings));
          const names = (keywords || []).map(keyword => String(keyword?.name || '').toLowerCase());
          const horrorTerms = ['horror','supernatural horror','psychological horror','slasher','zombie'];
          const thrillerTerms = ['thriller','suspense','psychological thriller','crime thriller'];
          if (names.some(name => horrorTerms.some(term => name.includes(term)))) merged.add('Horror');
          if (names.some(name => thrillerTerms.some(term => name.includes(term)))) merged.add('Thriller');
        } catch {}
      }
      const next = [...merged];
      if (JSON.stringify(next) !== JSON.stringify(item.genres || [])) {
        item.genres = next;
        changed = true;
      }
    } catch {} finally {
      statsTvGenreEnrichmentInFlight.delete(item.id);
    }
  }
  if (changed) saveItems();
  return changed;
}

function iso8601DurationMinutes(value) {
  const match = String(value || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 60 + Number(match[2] || 0) + Number(match[3] || 0) / 60;
}

async function watchedYouTubeMinutes() {
  if (!state.settings.youtubeKey || !TrackerAPI.getYouTubeVideos) return 0;
  const ids = [];
  for (const item of state.items) {
    if (getSourceType(item) !== 'youtube') continue;
    if (isYouTubePlaylistItem(item)) {
      for (const entry of state.history) {
        if (entry.sourceItemId === item.id && entry.kind === 'youtube-completed' && entry.videoId) ids.push(String(entry.videoId));
      }
    } else if (item.completedAt || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'item-completed')) {
      if (item.providerId) ids.push(String(item.providerId));
    }
  }
  const unique = [...new Set(ids)];
  let minutes = 0;
  for (let index = 0; index < unique.length; index += 50) {
    const chunk = unique.slice(index, index + 50);
    try {
      const key = `youtube:stats-durations:${chunk.slice().sort().join(',')}`;
      const videos = await getCached(key, () => TrackerAPI.getYouTubeVideos(chunk, state.settings));
      for (const video of videos || []) minutes += iso8601DurationMinutes(video?.contentDetails?.duration || '');
    } catch {}
  }
  return minutes;
}

function estimatedWatchMinutesStored() {
  let total = 0;
  for (const item of state.items) {
    const type = getSourceType(item);
    if (type === 'movie') {
      const logs = state.history.filter(entry => entry.sourceItemId === item.id && entry.kind === 'movie-watched').length;
      const plays = logs || (item.completedAt ? 1 : 0);
      if (!plays) continue;
      const runtime = Number(item.runtimeMinutes || item.raw?.runtime || 0);
      total += Math.max(0, runtime) * plays;
      continue;
    }
    if (type === 'tv') {
      const episodes = state.history.filter(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched').length;
      if (!episodes) continue;
      const runtime = Number(item.tvMeta?.episodeRuntimeMinutes || item.raw?.episode_run_time?.[0] || 0);
      total += Math.max(0, runtime) * episodes;
    }
  }
  return total;
}

function formatWatchHours(minutes) {
  const value = Number(minutes || 0);
  if (!(value > 0)) return '—';
  return `≈ ${(value / 60).toFixed(value >= 600 ? 0 : 1)} h`;
}

async function estimatedWatchMinutes() {
  let total = 0;
  let changed = false;
  for (const item of state.items) {
    const type = getSourceType(item);
    if (type === 'movie') {
      const logs = state.history.filter(entry => entry.sourceItemId === item.id && entry.kind === 'movie-watched').length;
      const plays = logs || (item.completedAt ? 1 : 0);
      if (!plays) continue;
      let runtime = Number(item.runtimeMinutes || item.raw?.runtime || 0);
      if (!runtime && item.providerId && state.settings.tmdbToken) {
        try {
          const details = await getCached(`movie:${item.providerId}`, () => TrackerAPI.getMovieDetails(item.providerId, state.settings));
          runtime = Number(details?.runtime || 0);
          if (runtime) { item.runtimeMinutes = runtime; changed = true; }
          const genres = (details?.genres || []).map(genre => genre.name).filter(Boolean);
          if (genres.length && !(item.genres || []).length) { item.genres = genres; changed = true; }
        } catch {}
      }
      total += Math.max(0, runtime) * plays;
      continue;
    }
    if (type === 'tv') {
      const episodes = state.history.filter(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched').length;
      if (!episodes) continue;
      let runtime = Number(item.tvMeta?.episodeRuntimeMinutes || item.raw?.episode_run_time?.[0] || 0);
      if (!runtime && item.providerId && state.settings.tmdbToken) {
        try {
          const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
          runtime = Number((details?.episode_run_time || []).find(value => Number(value) > 0) || 0);
          if (runtime) { item.tvMeta = { ...(item.tvMeta || {}), episodeRuntimeMinutes: runtime }; changed = true; }
          const genres = (details?.genres || []).map(genre => genre.name).filter(Boolean);
          if (genres.length && !(item.genres || []).length) { item.genres = genres; changed = true; }
        } catch {}
      }
      total += Math.max(0, runtime) * episodes;
    }
  }
  total += await watchedYouTubeMinutes();
  if (changed) saveItems();
  return total;
}

function statsGenreItems(labels = []) {
  const wanted = new Set((labels || []).flatMap(canonicalStatsGenreLabels).map(value => cleanTypeLabel(value).toLowerCase()).filter(Boolean));
  if (!wanted.size) return [];
  return state.items.filter(item => {
    if (!watchedTitleHasConsumption(item)) return false;
    const canonical = new Set((item.genres || []).flatMap(canonicalStatsGenreLabels).map(value => value.toLowerCase()));
    return [...wanted].some(label => canonical.has(label));
  });
}

function statsPiePath(cx, cy, radius, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep >= Math.PI * 2 - 0.0001) {
    return `M ${cx} ${cy-radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy+radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy-radius} Z`;
  }
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${startX.toFixed(3)} ${startY.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${endX.toFixed(3)} ${endY.toFixed(3)} Z`;
}

function renderGenrePie(genres = []) {
  if (!els.statsGenres) return;
  if (!genres.length) {
    els.statsGenres.innerHTML = '<p class="empty-state">No watched genres yet.</p>';
    return;
  }

  // Keep meaningful categories readable. Any recognized genre representing less
  // than 5% of the pie joins Other; genuinely unrecognized genres always live
  // in Other as well. Exactly 5% remains its own slice.
  const rawTotal = genres.reduce((sum, [, count]) => sum + Number(count || 0), 0) || 1;
  const visible = [];
  const otherGenres = [];
  for (const [label, countValue] of genres) {
    const count = Number(countValue || 0);
    const share = count / rawTotal;
    if (STATS_RECOGNIZED_GENRES.has(label) && share >= 0.02) {
      visible.push({ label, count, labels: [label], isOther: false });
    } else {
      otherGenres.push({ label, count });
    }
  }
  if (otherGenres.length) {
    visible.push({
      label: 'Other',
      count: otherGenres.reduce((sum, entry) => sum + entry.count, 0),
      labels: otherGenres.map(entry => entry.label),
      isOther: true
    });
  }

  visible.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const total = visible.reduce((sum, entry) => sum + entry.count, 0) || 1;
  const genreColor = label => STATS_GENRE_COLORS[label] || STATS_GENRE_COLORS.Other;
  let angle = -Math.PI / 2;
  const paths = visible.map(entry => {
    const next = angle + (entry.count / total) * Math.PI * 2;
    const d = statsPiePath(100, 100, 82, angle, next);
    angle = next;
    const encoded = escapeAttr(JSON.stringify(entry.labels));
    return `<path class="stats-genre-slice" d="${d}" fill="${genreColor(entry.label)}" tabindex="0" role="button" data-stats-genre-list="${encoded}" ${entry.isOther ? 'data-stats-genre-other="true"' : ''} aria-label="${escapeAttr(`${entry.label}: ${entry.count}`)}"><title>${escapeHtml(entry.label)} · ${entry.count}</title></path>`;
  }).join('');
  const legend = visible.map(entry => `<button class="stats-genre-legend-row" type="button" data-stats-genre-list="${escapeAttr(JSON.stringify(entry.labels))}" ${entry.isOther ? 'data-stats-genre-other="true"' : ''}><span class="stats-genre-swatch" style="--genre-color:${genreColor(entry.label)}"></span><span>${escapeHtml(entry.label)}</span><strong>${entry.count}</strong></button>`).join('');
  els.statsGenres.innerHTML = `<div class="stats-genre-pie-layout"><svg class="stats-genre-pie" viewBox="0 0 200 200" role="img" aria-label="Genres watched pie chart">${paths}</svg><div class="stats-genre-legend">${legend}</div></div>`;
}

function ensureStatsCatalogueModal() {
  let modal = $('#statsCatalogueModal');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'statsCatalogueModal';
  modal.className = 'modal stats-catalogue-modal';
  modal.innerHTML = `<button class="modal-x" type="button" data-close="statsCatalogueModal" aria-label="Close">×</button><div class="modal-heading"><h2 id="statsCatalogueTitle">Library</h2><p id="statsCatalogueCount"></p></div><div id="statsCatalogueGrid" class="library-poster-grid is-expanded stats-catalogue-grid"></div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close="statsCatalogueModal"]')?.addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    const addCollection = event.target.closest('[data-library-add-album]');
    if (addCollection) {
      event.preventDefault();
      event.stopPropagation();
      openLibraryAddToAlbum(addCollection.dataset.libraryAddAlbum);
      return;
    }
    const open = event.target.closest('[data-details-id]');
    if (open) {
      modal.close();
      openDetails(open.dataset.detailsId);
    }
  });
  return modal;
}

function openStatsCatalogue(title, items = []) {
  const modal = ensureStatsCatalogueModal();
  const unique = [...new Map((items || []).map(item => [item.id,item])).values()];
  $('#statsCatalogueTitle').textContent = title || 'Library';
  $('#statsCatalogueCount').textContent = `${unique.length} ${unique.length === 1 ? 'item' : 'items'}`;
  const grid = $('#statsCatalogueGrid');
  grid.classList.remove('stats-genre-other-grid');
  grid.innerHTML = '';
  for (const item of unique) grid.appendChild(makeLibraryPoster(item));
  if (!unique.length) grid.innerHTML = '<p class="empty-state">No items.</p>';
  showDialogAtTop(modal);
}


function openStatsOtherGenres(labels = []) {
  const modal = ensureStatsCatalogueModal();
  const countMap = new Map(watchedGenreCounts());
  const groups = [...new Set((labels || []).map(label => cleanTypeLabel(label)).filter(Boolean))]
    .map(label => ({ label, count: Number(countMap.get(label) || 0), items: statsGenreItems([label]) }))
    .filter(group => group.items.length)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const uniqueItems = [...new Map(groups.flatMap(group => group.items).map(item => [item.id, item])).values()];
  $('#statsCatalogueTitle').textContent = 'Other genres';
  $('#statsCatalogueCount').textContent = `${groups.length} ${groups.length === 1 ? 'genre' : 'genres'} · ${uniqueItems.length} ${uniqueItems.length === 1 ? 'item' : 'items'}`;
  const grid = $('#statsCatalogueGrid');
  grid.innerHTML = '';
  grid.classList.add('stats-genre-other-grid');

  if (!groups.length) {
    grid.innerHTML = '<p class="empty-state">No items.</p>';
  } else {
    for (const group of groups) {
      const section = document.createElement('section');
      section.className = 'stats-genre-other-section';
      section.innerHTML = `<div class="stats-genre-other-heading"><h3>${escapeHtml(group.label)}</h3><span>${group.items.length}</span></div><div class="library-poster-grid is-expanded stats-genre-other-posters"></div>`;
      const posters = section.querySelector('.stats-genre-other-posters');
      for (const item of group.items) posters.appendChild(makeLibraryPoster(item));
      grid.appendChild(section);
    }
  }
  showDialogAtTop(modal);
}

function handleStatsBreakdownClick(event) {
  const recentButton = event.target.closest('[data-stats-recent]');
  if (recentButton) {
    openStatsRecentHistory(Number(recentButton.dataset.statsRecent || 30));
    return;
  }
  const typeButton = event.target.closest('[data-stats-type-key]');
  if (typeButton) {
    const key = typeButton.dataset.statsTypeKey || '';
    const items = state.items.filter(item => libraryTypeGroupKey(item) === key);
    openStatsCatalogue(typeButton.dataset.statsLabel || libraryTypeGroupLabel(items,key), items);
    return;
  }
  const genreTarget = event.target.closest('[data-stats-genre-list]');
  if (genreTarget) {
    let labels = [];
    try { labels = JSON.parse(genreTarget.dataset.statsGenreList || '[]'); } catch {}
    if (genreTarget.dataset.statsGenreOther === 'true') openStatsOtherGenres(labels);
    else openStatsCatalogue(labels[0] || 'Genre', statsGenreItems(labels));
  }
}

function recentTrackedEntries(days = 30) {
  const span = Math.max(1, Number(days || 30));
  const today = todayString();
  const cutoffDate = localDateString(addDays(parseLocalDate(today), -(span - 1)));
  const historyDates = new Set(state.history
    .filter(entry => entry.sourceItemId && entry.date)
    .map(entry => `${entry.sourceItemId}|${String(entry.date).slice(0,10)}`));
  return getCalendarEntries({ respectVisibility: false })
    .filter(entry => {
      const date = String(entry.date || '').slice(0, 10);
      if (!date || date < cutoffDate || date > today) return false;
      if (entry.kind === 'dated-item' && entry.sourceItemId && historyDates.has(`${entry.sourceItemId}|${date}`)) return false;
      return true;
    })
    .sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))
      || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      || String(a.title || '').localeCompare(String(b.title || '')));
}

function statsDayHeading(date) {
  const value = String(date || '').slice(0, 10);
  if (!value) return '';
  const parsed = parseLocalDate(value);
  const today = todayString();
  const yesterday = localDateString(addDays(parseLocalDate(today), -1));
  const formatted = new Intl.DateTimeFormat('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
    ...(parsed.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {})
  }).format(parsed);
  if (value === today) return `Today · ${formatted}`;
  if (value === yesterday) return `Yesterday · ${formatted}`;
  return formatted;
}

function makeRecentTrackedPoster(entry) {
  const source = entry.sourceItemId ? findItem(entry.sourceItemId) : null;
  const display = source
    ? {
        ...source,
        image: entry.image || source.image || '',
        title: entry.title || source.title || 'Untitled',
        notes: String(entry.notes || source.notes || '').trim(),
        rating: Number(entry.rating || source.rating || 0),
        subcategory: entry.subcategory || source.subcategory || ''
      }
    : {
        id: `history:${entry.id || makeId()}`,
        type: entry.type || 'other',
        typeLabel: entry.typeLabel || 'Other',
        title: entry.title || 'Untitled',
        image: entry.image || '',
        notes: entry.notes || '',
        rating: Number(entry.rating || 0),
        subcategory: entry.subcategory || ''
      };
  const shell = makeLibraryPoster(display);
  shell.classList.add('stats-recent-card');
  const poster = shell.querySelector('.library-poster-button');
  if (poster) {
    poster.title = [entry.title || display.title, entry.subtitle || '', getItemTypeLabel(source || display)].filter(Boolean).join(' · ');
    if (!source) {
      delete poster.dataset.detailsId;
      if (entry.id) poster.dataset.recentHistoryEdit = entry.id;
    }
    const episode = String(entry.subtitle || '').match(/^(S\d+\s+E\d+)/i)?.[1];
    if (episode) {
      const badge = document.createElement('span');
      badge.className = 'stats-recent-context-badge';
      badge.textContent = episode;
      poster.appendChild(badge);
    }
  }
  if (!source) shell.querySelector('.library-card-album-button')?.remove();
  return shell;
}

function ensureStatsRecentModal() {
  let modal = $('#statsRecentModal');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'statsRecentModal';
  modal.className = 'modal stats-recent-modal';
  modal.innerHTML = `<button class="modal-x" type="button" data-close="statsRecentModal" aria-label="Close">×</button><div class="modal-heading"><h2 id="statsRecentTitle">Last 30 days</h2><p id="statsRecentCount"></p></div><div id="statsRecentDays" class="stats-recent-days"></div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close="statsRecentModal"]')?.addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    const addCollection = event.target.closest('[data-library-add-album]');
    if (addCollection) {
      event.preventDefault();
      event.stopPropagation();
      openLibraryAddToAlbum(addCollection.dataset.libraryAddAlbum);
      return;
    }
    const historyEdit = event.target.closest('[data-recent-history-edit]');
    if (historyEdit) {
      modal.close();
      openHistoryEdit(historyEdit.dataset.recentHistoryEdit);
      return;
    }
    const open = event.target.closest('[data-details-id]');
    if (open) {
      modal.close();
      openDetails(open.dataset.detailsId);
    }
  });
  return modal;
}

function openStatsRecentHistory(days = 30) {
  const span = Math.max(1, Number(days || 30));
  const entries = recentTrackedEntries(span);
  const modal = ensureStatsRecentModal();
  $('#statsRecentTitle').textContent = span === 30 ? 'Last 30 days' : `Last ${span} days`;
  $('#statsRecentCount').textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
  const groups = new Map();
  for (const entry of entries) {
    const date = String(entry.date || '').slice(0,10);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(entry);
  }
  const host = $('#statsRecentDays');
  host.innerHTML = '';
  for (const [date, dayEntries] of groups) {
    const section = document.createElement('section');
    section.className = 'stats-recent-day';
    section.innerHTML = `<div class="stats-recent-day-heading"><h3>${escapeHtml(statsDayHeading(date))}</h3><span>${dayEntries.length}</span></div><div class="library-poster-grid is-expanded stats-recent-day-grid"></div>`;
    const grid = section.querySelector('.stats-recent-day-grid');
    dayEntries.forEach(entry => grid.appendChild(makeRecentTrackedPoster(entry)));
    host.appendChild(section);
  }
  if (!entries.length) host.innerHTML = '<p class="empty-state">Nothing tracked in the last 30 days.</p>';
  showDialogAtTop(modal);
}

async function renderStats() {
  if (!els.statsSummary) return;
  const recent30 = recentTrackedEntries(30);
  const logged30 = recent30.length;
  const rated = state.items.filter(item => Number(item.rating || 0) > 0);
  const avg = rated.length ? rated.reduce((sum,item) => sum + Number(item.rating || 0),0) / rated.length : 0;
  const repeats = state.history.filter(entry => entry.rewatch).length;
  const genres = watchedGenreCounts();
  const storedMinutes = estimatedWatchMinutesStored();
  const requestToken = `${state.items.length}:${state.history.length}:${Date.now()}`;
  els.statsSummary.dataset.renderToken = requestToken;
  els.statsSummary.innerHTML = `
    <div class="stat-card"><strong>${escapeHtml(String(state.items.length))}</strong><span>Library</span></div>
    <button class="stat-card stat-card-action" type="button" data-stats-recent="30" aria-label="Open activity from the last 30 days"><strong>${escapeHtml(String(logged30))}</strong><span>Last 30 days</span></button>
    <div class="stat-card"><strong>${escapeHtml(avg ? avg.toFixed(1) : '—')}</strong><span>Average rating</span></div>
    <div class="stat-card"><strong>${escapeHtml(String(repeats))}</strong><span>Rewatches / rereads</span></div>
    <div class="stat-card"><strong>${escapeHtml(formatWatchHours(storedMinutes))}</strong><span>Watch hours</span></div>`;
  if (els.statsTypes) {
    const groups = new Map();
    state.items.forEach(item => {
      const key = libraryTypeGroupKey(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    els.statsTypes.innerHTML = [...groups.entries()]
      .map(([key,items]) => ({ key, items, label:libraryTypeGroupLabel(items,key) }))
      .sort((a,b) => b.items.length - a.items.length || a.label.localeCompare(b.label))
      .map(group => `<button class="stat-type-row" type="button" data-stats-type-key="${escapeAttr(group.key)}" data-stats-label="${escapeAttr(group.label)}"><span>${escapeHtml(group.label)}</span><strong>${group.items.length}</strong></button>`).join('');
  }
  renderGenrePie(genres);
  const [minutes] = await Promise.all([estimatedWatchMinutes(), enrichWatchedTVStatsGenres()]);
  if (els.statsSummary?.dataset.renderToken !== requestToken) return;
  const hours = formatWatchHours(minutes);
  const cards = [...els.statsSummary.querySelectorAll('.stat-card')];
  const watchCard = cards.find(card => card.querySelector('span')?.textContent === 'Watch hours');
  if (watchCard) watchCard.querySelector('strong').textContent = hours;
  // Runtime lookups can also fill missing genre metadata.
  renderGenrePie(watchedGenreCounts());
}

function isPlaceBackedItem(item) {
  if (!item) return false;
  const sourceType = getSourceType(item);
  return item.provider === 'googlePlaces'
    || item.featureConfig?.findSource === 'google-places'
    || ['restaurant', 'place', 'shopping'].includes(sourceType)
    || ['restaurant', 'shopping', 'store', 'place'].includes(slugifyType(getItemTypeLabel(item)));
}

function libraryGroupMapButtonMarkup(groupKey, groupLabel, items = []) {
  const placeItems = items.filter(isPlaceBackedItem);
  if (!placeItems.length) return '';
  return `<button class="library-category-map-button" type="button" data-library-map-group="${escapeAttr(groupKey)}" data-library-map-label="${escapeAttr(groupLabel)}">View on map</button>`;
}

function ensureLibraryMapModal() {
  let modal = $('#libraryMapModal');
  if (modal) return modal;
  modal = document.createElement('dialog'); modal.id = 'libraryMapModal'; modal.className = 'modal library-map-modal';
  modal.innerHTML = `<button class="modal-x" type="button" data-close="libraryMapModal" aria-label="Close">×</button><div class="modal-heading"><h2 id="libraryMapTitle">Places</h2></div><div id="libraryMapLegend" class="library-map-legend" hidden></div><div id="libraryMapCanvas" class="library-map-canvas"></div><div id="libraryMapList" class="library-map-list"></div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close="libraryMapModal"]')?.addEventListener('click', () => modal.close());
  return modal;
}

let leafletPromise = null;
let libraryLeafletMap = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve,reject) => {
    if (!document.querySelector('link[data-omni-leaflet]')) {
      const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; link.dataset.omniLeaflet='1'; document.head.appendChild(link);
    }
    const script = document.createElement('script'); script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload=()=>resolve(window.L); script.onerror=reject; document.head.appendChild(script);
  });
  return leafletPromise;
}

const LIBRARY_MAP_TYPE_COLORS = ['#720014','#7889c2','#677b53','#97280c','#756091','#b86982','#263852','#9b7513','#5f7284','#8a5f45'];

function libraryMapTypeLabel(item) {
  return cleanTypeLabel(getItemTypeLabel(item)) || cleanTypeLabel(item?.subcategory || '') || 'Place';
}

function libraryMapTypeColorMap(items = []) {
  const labels = [...new Set(items.map(libraryMapTypeLabel).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  return new Map(labels.map((label,index) => [label, LIBRARY_MAP_TYPE_COLORS[index % LIBRARY_MAP_TYPE_COLORS.length]]));
}

async function openLibraryMap(groupKey = '', groupLabel = '', subcategory = '') {
  const modal = ensureLibraryMapModal();
  const canvas = $('#libraryMapCanvas'); const list = $('#libraryMapList');
  const title = $('#libraryMapTitle'); const legend = $('#libraryMapLegend');
  if (title) title.textContent = groupLabel ? `${groupLabel} map` : 'Places';
  const items = state.items.filter(item => isPlaceBackedItem(item) && (!groupKey || libraryTypeGroupKey(item) === groupKey) && (!subcategory || (cleanTypeLabel(item.subcategory || '') || 'General') === subcategory));
  if (!items.length) {
    canvas.innerHTML='<p class="empty-state">No saved places.</p>'; list.innerHTML='';
    if (legend) { legend.hidden = true; legend.innerHTML = ''; }
    showDialogAtTop(modal); return;
  }
  const typeColors = libraryMapTypeColorMap(items);
  if (legend) {
    if (typeColors.size > 1) {
      legend.hidden = false;
      legend.innerHTML = [...typeColors.entries()].map(([label,color]) => `<span class="library-map-legend-item"><i style="--library-pin-color:${color}"></i>${escapeHtml(label)}</span>`).join('');
    } else { legend.hidden = true; legend.innerHTML = ''; }
  }
  canvas.innerHTML=loadingMarkup('Loading map…'); list.innerHTML=''; showDialogAtTop(modal);
  const details = [];
  for (const item of items) {
    let live = item.placeMeta || null;
    if ((!live?.location) && item.providerId && state.settings.googlePlacesKey) {
      try { live = await TrackerAPI.getPlaceDetails(item.providerId, state.settings, getSourceType(item) === 'restaurant' ? 'restaurant' : 'place'); } catch {}
    }
    if (live) {
      item.placeMeta = { formattedAddress: live.formattedAddress || '', googleMapsUrl: live.googleMapsUrl || '', websiteUrl: live.websiteUrl || '', location: live.location || null };
      details.push({ item, ...item.placeMeta });
    }
  }
  saveItems();
  list.innerHTML = details.map(entry => {
    const typeLabel = libraryMapTypeLabel(entry.item);
    const typeColor = typeColors.get(typeLabel) || LIBRARY_MAP_TYPE_COLORS[0];
    return `<button type="button" data-map-open-item="${escapeAttr(entry.item.id)}"><span class="library-map-list-heading"><i style="--library-pin-color:${typeColor}"></i><strong>${escapeHtml(entry.item.title)}</strong></span><span>${escapeHtml(typeLabel)}${entry.item.rating ? ` · ★ ${escapeHtml(formatPersonalRating(entry.item.rating))}` : ''}${entry.formattedAddress ? ` · ${escapeHtml(entry.formattedAddress)}` : ''}</span></button>`;
  }).join('');
  list.onclick = event => { const b=event.target.closest('[data-map-open-item]'); if (b) { modal.close(); openDetails(b.dataset.mapOpenItem); } };
  const points = details.filter(entry => Number.isFinite(Number(entry.location?.latitude)) && Number.isFinite(Number(entry.location?.longitude)));
  if (!points.length) { canvas.innerHTML='<p class="empty-state">Saved places do not have map coordinates yet.</p>'; return; }
  const L = await loadLeaflet();
  if (libraryLeafletMap) { try { libraryLeafletMap.remove(); } catch {} libraryLeafletMap = null; }
  canvas.innerHTML='';
  const map = L.map(canvas).setView([points[0].location.latitude, points[0].location.longitude], 11);
  libraryLeafletMap = map;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  const bounds=[];
  points.forEach(entry => {
    const latlng=[entry.location.latitude,entry.location.longitude];
    bounds.push(latlng);
    const rating = Number(entry.item.rating || 0);
    const typeLabel = libraryMapTypeLabel(entry.item);
    const typeColor = typeColors.get(typeLabel) || LIBRARY_MAP_TYPE_COLORS[0];
    const icon = L.divIcon({
      className: 'library-rating-map-marker',
      html: `<span style="--library-pin-color:${typeColor}" title="${escapeAttr(typeLabel)}">${rating ? `★${escapeHtml(formatPersonalRating(rating))}` : '•'}</span>`,
      iconSize: [42, 28],
      iconAnchor: [21, 14]
    });
    L.marker(latlng, { icon }).addTo(map).bindPopup(`<strong>${escapeHtml(entry.item.title)}</strong><br><span>${escapeHtml(typeLabel)}</span>${rating ? `<br>★ ${escapeHtml(formatPersonalRating(rating))} / 5` : ''}`);
  });
  if (bounds.length > 1) map.fitBounds(bounds,{padding:[28,28]});
  setTimeout(()=>map.invalidateSize(),100);
}

function renderAll() {
  reconcileLocalProgressQueues();
  if (els.upNextList) renderUpNext();
  if (els.trackerGrid) renderTracker();
  if (els.trackStreakSummary) renderTrackStreakSummary();
  if (els.libraryGroups) renderLibrary();
  if (els.albumsGrid) renderAlbums();
  if (els.statsSummary) renderStats();
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
    if (view === 'upnext' && item.reminder) {
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
        if (libraryDnfState(item) === 'paused') button.insertAdjacentHTML('beforeend', '<span class="tbr-paused-badge">Paused</span>');
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
    card.className = `upnext-card${view === 'tbr' ? ' tbr-card queue-loading' : ' queue-loading'}${!view.includes('tbr') && buddyWatchContextForItem(item) ? ' is-buddy-watch' : ''}`;
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

  els.upNextList.innerHTML = loadingMarkup('Loading upcoming dates…');
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
    // TMDB may roll next_episode_to_air forward as soon as today's episode airs.
    // Prefer an unlogged episode airing today before the later next episode so the
    // queue Calendar and Up Next stay aligned throughout the day.
    const candidates = [details?.last_episode_to_air, details?.next_episode_to_air]
      .filter(ep => ep?.air_date && ep.air_date >= today)
      .filter(ep => !isTVEpisodeLogged(item, Number(ep.season_number), Number(ep.episode_number)))
      .sort((a,b) => String(a.air_date).localeCompare(String(b.air_date)));
    return { item, episode: candidates[0] || null };
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

function buddyWatchContextForItem(item) {
  if (!item || !Array.isArray(socialState.buddyWatches)) return null;
  const match = socialState.buddyWatches.find(watch => {
    if (watch.status && watch.status !== 'active') return false;
    if (watch.myMembership?.status && !['accepted','pending'].includes(watch.myMembership.status)) return false;
    const shared = watch.item || {};
    if (shared.providerId && item.providerId && String(shared.providerId) === String(item.providerId) && String(shared.provider || '') === String(item.provider || '')) return true;
    return normalizeSearchText(shared.title || '') === normalizeSearchText(item.title || '') && String(shared.sourceType || '') === String(getSourceType(item));
  });
  if (!match) return null;
  const other = (match.members || []).find(member => String(member.user_id) !== String(currentUser?.id || ''));
  const mine = (match.progress || []).find(row => String(row.user_id) === String(currentUser?.id || ''));
  const theirs = other ? (match.progress || []).find(row => String(row.user_id) === String(other.user_id)) : null;
  return { watch: match, other, mine, theirs };
}

function buddyQueueMarkup(item) {
  const context = buddyWatchContextForItem(item);
  if (!context) return '';
  const person = context.other?.profile?.display_name || context.other?.profile?.username || 'Buddy';
  const positions = [context.mine?.progress_text ? `You: ${context.mine.progress_text}` : '', context.theirs?.progress_text ? `${person}: ${context.theirs.progress_text}` : ''].filter(Boolean).join(' · ');
  return `<div class="buddy-queue-link" aria-label="Buddy Watch with ${escapeAttr(person)}"><span class="buddy-queue-link-icon" aria-hidden="true">🔗</span><span>${escapeHtml(person)}${positions ? ` · ${escapeHtml(positions)}` : ''}</span></div>`;
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
        ${!isTBR ? buddyQueueMarkup(item) : ''}
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
  if (sourceType === 'youtube') return isYouTubePlaylistItem(item) ? [item.subtitle, 'Playlist'].filter(Boolean).join(' · ') : (item.subtitle || 'YouTube');
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
      meta: `S${episode.season_number} E${episode.episode_number} · ${episode.name || 'Episode'}${remaining ? ` · + ${remaining}` : ''}`,
      image: TrackerAPI.tmdbImage(episode.still_path) || item.image
    };
  }

  if (getSourceType(item) === 'youtube') {
    if (!isYouTubePlaylistItem(item)) {
      return { title: item.title, meta: item.subtitle || 'YouTube', image: item.image };
    }
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

  if (button.dataset.action === 'buddy') {
    await openQuickBuddyWatchForItem(item);
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
      else if (getSourceType(item) === 'youtube') completed = isYouTubePlaylistItem(item) ? await advanceWorkout(item) : genericCompletionRecord(item, true);
      else if (getSourceType(item) === 'reminder') completed = reminderCompletionRecord(item);
      else completed = genericCompletionRecord(item, true);
      if (completed) addHistoryRecord(completed);
      if (!['tv','youtube','reminder'].includes(getSourceType(item)) || (getSourceType(item) === 'youtube' && !isYouTubePlaylistItem(item))) {
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
      const shouldPromptBuddyWatch = getSourceType(item) === 'tv' && Boolean(completed);
      saveItems();
      saveHistory();
      renderAll();
      if (shouldPromptBuddyWatch) await maybePromptBuddyWatchForTVOverlap(item);
    } catch (error) {
      alert(error.message);
      button.disabled = false;
    }
  }
}

function queueSortKey(item, view = 'upnext') {
  if (view === 'upnext' && item.reminder) return `0:${getNextReminderDueDate(item) || '9999-12-31'}:${item.createdAt || ''}`;
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
  return item?.reminder ? 'weekly' : 'none';
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
  if (!item?.reminder) return '';
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
  // Up Next shows still get a full reconciliation. In addition, scan followed TV
  // that is currently resting in Library: if TMDB says an unlogged episode has
  // aired by today, reconcile that show so it can automatically re-enter Up Next.
  // Requests remain serialized to avoid the large burst that the older version caused.
  const today = todayString();
  const tvItems = state.items.filter(item =>
    getSourceType(item) === 'tv' &&
    item.providerId &&
    (getQueueStatus(item) === 'upnext' || getTVWatchDisposition(item) === 'following')
  );
  const results = [];
  for (const item of tvItems) {
    const alreadyUpNext = getQueueStatus(item) === 'upnext';
    const checkedAt = Date.parse(item.tvMeta?.checkedAt || '');
    if (alreadyUpNext && Number.isFinite(checkedAt) && Date.now() - checkedAt < 60 * 60 * 1000) {
      results.push(false);
      continue;
    }
    try {
      if (!alreadyUpNext) {
        const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
        const candidates = [details?.last_episode_to_air, details?.next_episode_to_air].filter(Boolean);
        const dueUnlogged = candidates.some(ep =>
          ep?.air_date && ep.air_date <= today &&
          !isTVEpisodeLogged(item, Number(ep.season_number), Number(ep.episode_number))
        );
        if (!dueUnlogged) {
          results.push(false);
          await new Promise(resolve => setTimeout(resolve, 90));
          continue;
        }
      }
      results.push(await reconcileSingleTVItem(item));
    } catch (error) {
      console.warn(`Could not refresh TV status for ${item.title}:`, error);
      results.push(false);
    }
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

async function markWholeTVSeriesComplete(item, options = {}) {
  if (!item || getSourceType(item) !== 'tv') return;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  const activeToken = item.seriesCompletionToken || state.history.find(entry =>
    entry.kind === 'series-watched' && entry.sourceItemId === item.id && entry.bulkCompletionToken
  )?.bulkCompletionToken || '';

  if (activeToken) {
    onProgress?.({ phase: 'undo', completed: 0, total: 1 });
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
    onProgress?.({ phase: 'done', completed: 1, total: 1 });
    if (els.detailModal?.open && state.openDetailId === item.id) await renderTVDetails(item);
    return;
  }

  const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
  const seasons = (details.seasons || [])
    .filter(season => Number(season.season_number) > 0 && Number(season.episode_count) > 0)
    .sort((a,b) => Number(a.season_number) - Number(b.season_number));
  if (!seasons.length) throw new Error('No seasons were available to mark complete.');

  // Load every season first, in small batches. This makes Discover's series action
  // much faster than the old sequential loop while avoiding a burst of TMDB calls.
  // Nothing is written until all requested season data has loaded successfully.
  const loadedSeasons = [];
  const batchSize = 4;
  for (let offset = 0; offset < seasons.length; offset += batchSize) {
    const batch = seasons.slice(offset, offset + batchSize);
    const settled = await Promise.allSettled(batch.map(info =>
      getCached(`season:${item.providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(item.providerId, info.season_number, state.settings))
        .then(data => ({ info, data }))
    ));
    const failed = settled.find(result => result.status === 'rejected');
    if (failed) throw failed.reason || new Error('Could not load every season.');
    loadedSeasons.push(...settled.map(result => result.value));
    onProgress?.({ phase: 'load', completed: Math.min(offset + batch.length, seasons.length), total: seasons.length });
  }

  const token = `series-${makeId()}`;
  for (const { info, data: season } of loadedSeasons) {
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
  onProgress?.({ phase: 'done', completed: seasons.length, total: seasons.length });
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
  const loggedNow = !alreadyWatched;

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
  if (loggedNow) await maybePromptBuddyWatchForTVOverlap(item);
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
  if (!missing.length) return { includedEarlier: false, missingCount: 0 };

  const highestPrior = Math.max(...missing.map(entry => entry.seasonNumber));
  const includeEarlier = confirm(
    `You are marking Season ${seasonNumber} watched.\n\n` +
    `Also mark previously aired episodes through Season ${highestPrior} as watched?\n\n` +
    `OK = Yes, include earlier seasons.\n` +
    `Cancel = No, mark only Season ${seasonNumber}. You can still mark any other season or episode manually later.`
  );

  // Declining the backfill never cancels the season the person actually chose.
  // It also never records a lock/skip flag: every other season and episode stays
  // independently editable from the TV detail UI afterward.
  if (!includeEarlier) {
    showActionFeedback(`Season ${seasonNumber} only — earlier seasons were left unchanged.`);
    return { includedEarlier: false, missingCount: missing.length };
  }

  for (const { seasonNumber: priorSeasonNumber, episode } of missing) {
    addImportedTVEpisode(item, episode, priorSeasonNumber);
  }
  return { includedEarlier: true, missingCount: missing.length };
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
  const today = todayString();
  for (const item of state.items) {
    const dueReminder = item.reminder && getNextReminderDueDate(item) && getNextReminderDueDate(item) <= today;
    const scheduledDate = item.date || item.eventMeta?.eventDate || '';
    const dueScheduledEvent = ['event','concert'].includes(getSourceType(item)) && item.queueCalendarScheduled === true && scheduledDate && scheduledDate <= today;
    const dueDatedItem = !item.reminder && !['book','tv'].includes(getSourceType(item)) && !item.calendarHidden && item.date && item.date <= today && !item.completedAt;
    if ((dueReminder || dueScheduledEvent || dueDatedItem) && getQueueStatus(item) !== 'upnext') {
      setItemQueueStatus(item, 'upnext');
      item.updatedAt = new Date().toISOString();
      changed = true;
    }
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
    else if (sourceType === 'youtube') { if (isYouTubePlaylistItem(item)) await renderWorkoutDetails(item); else await renderStandaloneYouTubeDetails(item); }
    else if (sourceType === 'book') await renderBookDetails(item);
    else if (sourceType === 'movie') await renderMovieDetails(item);
    else if (['video-game','board-game'].includes(sourceType)) await renderGameDetails(item);
    else if (sourceType === 'music') await renderMusicDetails(item);
    else if (sourceType === 'artist') await renderArtistDetails(item);
    else if (sourceType === 'song') await renderSongDetails(item);
    else if (sourceType === 'reminder') renderReminderDetails(item);
    else if (['event', 'concert'].includes(sourceType)) await renderEventDetails(item);
    else if (sourceType === 'restaurant') await renderRestaurantDetails(item);
    else if (sourceType === 'place') await renderPlaceDetails(item);
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

function isYouTubePlaylistItem(item) {
  if (!item || getSourceType(item) !== 'youtube') return false;
  if (item.featureConfig?.youtubePlaylist === true) return true;
  // Legacy playlist/workout items predate featureConfig.
  if (item.type === 'workout' || Array.isArray(item.playlistItems)) return true;
  return false;
}

async function renderStandaloneYouTubeDetails(item) {
  let video = null;
  if (item.provider === 'youtube' && item.providerId) {
    try { video = await getCached(`youtube:video:${item.providerId}`, () => TrackerAPI.getYouTubeVideo(item.providerId, state.settings)); }
    catch (error) { console.warn('YouTube video details unavailable:', error?.message || error); }
  }
  const snippet = video?.snippet || {};
  const image = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || item.image || '';
  const meta = [snippet.channelTitle || item.subtitle || '', snippet.publishedAt ? new Date(snippet.publishedAt).toLocaleDateString() : ''].filter(Boolean).join(' · ');
  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:getItemTypeLabel(item).toUpperCase(), title:snippet.title || item.title, image, subtitle:meta, overview:snippet.description || '' })}
    <div class="detail-actions library-detail-actions">
      ${item.providerId ? `<a class="secondary-button detail-link-button" href="https://www.youtube.com/watch?v=${encodeURIComponent(item.providerId)}" target="_blank" rel="noopener">YouTube ↗</a>` : ''}
      ${libraryDetailActionContents(item)}
    </div>`;
}

function flexibleFeatureProgressMarkup(item) {
  const mode = item?.featureConfig?.progressMode || '';
  const sourceType = getSourceType(item);
  const rows = [];
  if (mode === 'book' && sourceType !== 'book') {
    const current = Math.max(0, Number(item.progress?.currentPage || 0));
    const total = Math.max(0, Number(item.progress?.totalPages || 0));
    rows.push(total ? `Page ${current} of ${total} · ${Math.min(100, Math.round((current / total) * 100))}%` : `Page ${current}`);
  }
  if (mode === 'tv' && sourceType !== 'tv') {
    rows.push(`S${Math.max(1, Number(item.progress?.nextSeason || 1))} E${Math.max(1, Number(item.progress?.nextEpisode || 1))}`);
  }
  if (item?.featureConfig?.dateRange && sourceType !== 'activity') {
    const start = item.activityMeta?.startDate || item.date || '';
    const end = item.activityMeta?.endDate || start;
    if (start) rows.push(end && end !== start ? `${formatLongDate(start)} – ${formatLongDate(end)}` : formatLongDate(start));
  }
  if (!rows.length) return '';
  return `<div class="detail-progress flexible-feature-progress"><strong>Progress</strong>${rows.map(escapeHtml).join(' · ')}</div>`;
}

function appendFlexibleFeatureProgress(item) {
  if (!els.detailBody || !item || els.detailBody.querySelector('.flexible-feature-progress')) return;
  const markup = flexibleFeatureProgressMarkup(item);
  if (!markup) return;
  const hero = els.detailBody.querySelector('.detail-hero');
  if (hero) hero.insertAdjacentHTML('afterend', markup);
  else els.detailBody.insertAdjacentHTML('afterbegin', markup);
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

async function toggleSpecificYouTubeVideo(item, videoId) {
  const playlist = await getPlaylistCached(item.providerId);
  const index = playlist.items.findIndex(video => video.videoId === videoId);
  if (index < 0) throw new Error('Could not find that video in the playlist.');

  if (isYouTubeVideoLogged(item, videoId)) {
    const wasCompleted = Boolean(item.completedAt);
    state.history = state.history.filter(entry => !(
      entry.kind === 'youtube-completed' &&
      entry.sourceItemId === item.id &&
      entry.videoId === videoId
    ));

    let nextIndex = 0;
    while (nextIndex < playlist.items.length && isYouTubeVideoLogged(item, playlist.items[nextIndex].videoId)) nextIndex += 1;
    item.progress = { ...item.progress, currentIndex: nextIndex };

    if (nextIndex < playlist.items.length) {
      item.completedAt = '';
      if (wasCompleted && getQueueStatus(item) === 'library') setItemQueueStatus(item, 'upnext');
    }

    saveItems();
    saveHistory();
    renderAll();
    await renderWorkoutDetails(item);
    return;
  }

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
const BASE_ITEM_TYPE_OPTIONS = [
  ['tv','TV'], ['movie','Movie'], ['book','Book'], ['game','Games'], ['music','Music'], ['food','Food'],
  ['event','Event'], ['activity','Activity'], ['class','Class'], ['shopping','Shopping'], ['youtube','YouTube'], ['workout','Workouts'], ['reminder','Reminder'], ['other','New type']
];

const MAIN_ADD_KIND_OPTIONS = Object.freeze([
  { value: 'workout', label: 'Workouts', parent: 'workout' },
  { value: 'movie', label: 'Movies', parent: 'movie' },
  { value: 'tv', label: 'TV', parent: 'tv' },
  { value: 'book', label: 'Books', parent: 'book' },
  { value: 'artist', label: 'Music', parent: 'music', subtype: 'artist' },
  { value: 'food', label: 'Food', parent: 'food', subtype: 'manual' },
  { value: 'game', label: 'Games', parent: 'game', subtype: 'video-game' },
  { value: 'event', label: 'Events', parent: 'event', subtype: 'live-event' }
]);
const DEFAULT_LOG_TYPE_KEYS = Object.freeze(MAIN_ADD_KIND_OPTIONS.map(option => option.value));

function logTypePrefsStorageKey(user = currentUser) {
  return `${LOG_TYPE_PREFS_KEY}.${user?.id || 'local'}`;
}
function enabledLogTypeKeys(user = currentUser) {
  const saved = loadJSON(logTypePrefsStorageKey(user), null);
  if (!Array.isArray(saved) || !saved.length) return new Set(DEFAULT_LOG_TYPE_KEYS);
  const valid = saved.filter(value => DEFAULT_LOG_TYPE_KEYS.includes(value));
  return new Set(valid.length ? valid : DEFAULT_LOG_TYPE_KEYS);
}
function saveEnabledLogTypeKeys(values, user = currentUser) {
  const valid = [...new Set((values || []).filter(value => DEFAULT_LOG_TYPE_KEYS.includes(value)))];
  safeLocalSet(logTypePrefsStorageKey(user), valid.length ? valid : [...DEFAULT_LOG_TYPE_KEYS]);
  scheduleCloudSync();
  return new Set(valid.length ? valid : DEFAULT_LOG_TYPE_KEYS);
}
function mainAddKindOption(kind) {
  return MAIN_ADD_KIND_OPTIONS.find(option => option.value === kind) || null;
}
function logTypeChoiceMarkup(selected = enabledLogTypeKeys()) {
  return MAIN_ADD_KIND_OPTIONS.map(option => `<label class="log-type-choice"><input type="checkbox" value="${escapeAttr(option.value)}" ${selected.has(option.value) ? 'checked' : ''} /><span>${escapeHtml(option.label)}</span></label>`).join('');
}

function itemTypeOptionUsageKey(value) {
  return String(value || '').startsWith('custom:') ? String(value) : `builtin:${value}`;
}

function typeUsageCount(value) {
  return Number(state.typeUsage?.[itemTypeOptionUsageKey(value)]?.count || 0);
}


const ADD_ACTION_KIND_OPTIONS = Object.freeze({
  watched: [
    { value: 'movie', label: 'Movie', parent: 'movie' },
    { value: 'tv', label: 'TV', parent: 'tv' },
    { value: 'youtube', label: 'YouTube', parent: 'youtube' }
  ],
  read: [
    { value: 'book', label: 'Book', parent: 'book' }
  ],
  went: [
    { value: 'restaurant', label: 'Restaurant', parent: 'food', subtype: 'restaurant' },
    { value: 'shopping', label: 'Shopping / store', parent: 'shopping' }
  ],
  completed: [
    { value: 'workout', label: 'Workout', parent: 'workout' },
    { value: 'activity', label: 'Activity', parent: 'activity' },
    { value: 'class', label: 'Class', parent: 'class' }
  ],
  other: [
    { value: 'event', label: 'Event', parent: 'event' },
    { value: 'concert', label: 'Concert', parent: 'music', subtype: 'concert' },
    { value: 'music', label: 'Music album', parent: 'music', subtype: 'album' },
    { value: 'artist', label: 'Artist', parent: 'music', subtype: 'artist' },
    { value: 'song', label: 'Song', parent: 'music', subtype: 'song' },
    { value: 'recipe', label: 'Recipe', parent: 'food', subtype: 'recipe' },
    { value: 'food', label: 'Food', parent: 'food', subtype: 'manual' },
    { value: 'reminder', label: 'Reminder', parent: 'reminder' }
  ]
});

const UNIVERSAL_ADD_KIND_OPTIONS = Object.freeze([
  { value: 'other-item', label: 'Other', parent: 'other', generic: true },
  { value: 'new-type', label: 'Create new…', parent: 'other', createNew: true }
]);

function addKindUsageValue(option) {
  if (!option) return '';
  if (String(option.value || '').startsWith('custom:')) return option.value;
  return option.parent || option.value || '';
}

const ADD_ACTION_CATEGORIES = Object.freeze(['watched','read','went','completed','other']);

function normalizeAddActionCategory(value, fallback = 'other') {
  const clean = String(value || '').trim().toLowerCase();
  return ADD_ACTION_CATEGORIES.includes(clean) ? clean : fallback;
}

function inferCustomTypeActionCategory(entry) {
  if (!entry) return 'other';
  if (ADD_ACTION_CATEGORIES.includes(String(entry.actionCategory || ''))) return entry.actionCategory;

  const matchingItems = (state.items || []).filter(item => String(item?.type || '') === String(entry.type || ''));
  const explicitCounts = new Map();
  for (const item of matchingItems) {
    const action = String(item?.actionCategory || '');
    if (!ADD_ACTION_CATEGORIES.includes(action)) continue;
    explicitCounts.set(action, (explicitCounts.get(action) || 0) + 1);
  }
  if (explicitCounts.size) {
    return [...explicitCounts.entries()].sort((a,b) => b[1] - a[1])[0][0];
  }

  // Older custom Types predate the I… category field. Use the content backend as
  // a best-effort migration so existing Types land somewhere useful instead of
  // disappearing into Other forever. Users can still create the same Type under a
  // different I… category later, which updates the saved category.
  for (const item of matchingItems) {
    const source = String(getSourceType(item) || '');
    const findSource = String(item?.featureConfig?.findSource || '');
    if (['tv','movie','youtube'].includes(source) || /tmdb|youtube/.test(findSource)) return 'watched';
    if (source === 'book' || findSource === 'google-books') return 'read';
    if (['restaurant','place','shopping','event','concert'].includes(source) || /google-places|ticketmaster/.test(findSource)) return 'went';
    if (source === 'workout') return 'completed';
  }
  return 'other';
}

function customAddKindOptions(action = '') {
  const requestedAction = action ? normalizeAddActionCategory(action) : '';
  return (state.customTypes || [])
    .filter(entry => !requestedAction || inferCustomTypeActionCategory(entry) === requestedAction)
    .map(entry => ({
      value: `custom:${entry.type}`,
      label: entry.label || getTypeLabel(entry.type),
      parent: `custom:${entry.type}`,
      actionCategory: inferCustomTypeActionCategory(entry),
      custom: true
    })).sort((a,b) => {
      const delta = typeUsageCount(addKindUsageValue(b)) - typeUsageCount(addKindUsageValue(a));
      return delta || a.label.localeCompare(b.label);
    });
}

function addActionForKind(kind) {
  for (const [action, options] of Object.entries(ADD_ACTION_KIND_OPTIONS)) {
    if (options.some(option => option.value === kind)) return action;
  }
  if (UNIVERSAL_ADD_KIND_OPTIONS.some(option => option.value === kind)) return 'other';
  if (String(kind || '').startsWith('custom:')) {
    const type = String(kind).slice(7);
    const entry = (state.customTypes || []).find(candidate => candidate.type === type);
    return inferCustomTypeActionCategory(entry);
  }
  return 'other';
}

function kindForCurrentForm(item = null) {
  const raw = String(els.itemSourceType?.value || '');
  if (raw.startsWith('custom:')) return raw;
  const parent = formParentType();
  const subtype = els.itemSubtype?.value || formSubtypeForItem(getSourceType(item), item);
  if (parent === 'food' && subtype === 'restaurant') return 'restaurant';
  if (parent === 'food' && subtype === 'recipe') return 'recipe';
  if (parent === 'music' && ['artist','song','concert'].includes(subtype)) return subtype;
  if (parent === 'music' && subtype === 'album') return 'music';
  if (parent === 'other') {
    if (els.itemKindChoice?.value === 'other-item') return 'other-item';
    return 'new-type';
  }
  return parent;
}

function refreshItemKindChoices(preferredKind = '', actionOverride = '') {
  if (!els.itemKindChoice) return;
  const enabled = enabledLogTypeKeys();
  const base = MAIN_ADD_KIND_OPTIONS.filter(option => enabled.has(option.value));
  const custom = customAddKindOptions('');
  const options = [
    ...base,
    ...custom,
    { value: 'new-type', label: 'Create your own…', parent: 'other', createNew: true }
  ];
  const seen = new Set();
  const uniqueOptions = options.filter(option => option?.value && !seen.has(option.value) && seen.add(option.value));
  const current = preferredKind || els.itemKindChoice.value || uniqueOptions[0]?.value || 'new-type';
  if (current && !uniqueOptions.some(option => option.value === current)) {
    const legacy = [...Object.values(ADD_ACTION_KIND_OPTIONS).flat(), ...UNIVERSAL_ADD_KIND_OPTIONS].find(option => option.value === current);
    if (legacy) uniqueOptions.unshift(legacy);
  }
  els.itemKindChoice.innerHTML = uniqueOptions.map(option => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`).join('');
  els.itemKindChoice.value = uniqueOptions.some(option => option.value === current) ? current : (uniqueOptions[0]?.value || 'new-type');
}

function setUnderlyingFormTypeForKind(kind) {
  if (!els.itemSourceType) return;
  const all = [...MAIN_ADD_KIND_OPTIONS, ...Object.values(ADD_ACTION_KIND_OPTIONS).flat(), ...UNIVERSAL_ADD_KIND_OPTIONS];
  const option = String(kind || '').startsWith('custom:')
    ? { value: kind, parent: kind }
    : all.find(entry => entry.value === kind) || { value: 'new-type', parent: 'other' };
  refreshItemTypeOptions(option.parent);
  els.itemSourceType.value = option.parent;
  configureItemSubtype(true);
  if (option.subtype && els.itemSubtype) els.itemSubtype.value = option.subtype;
  if (els.itemSubcategory && !String(kind || '').startsWith('custom:')) {
    const suggested = option.value === 'artist' ? 'Artist' : option.value === 'game' ? 'Video Game' : option.value === 'event' ? 'Live Event' : '';
    if (!els.editingId?.value || !els.itemSubcategory.value) els.itemSubcategory.value = suggested;
  }
}

function applyItemKindChoice(clearSource = false) {
  if (!els.itemKindChoice) return;
  if (clearSource) clearSourceSelectionForTypeChange();
  setUnderlyingFormTypeForKind(els.itemKindChoice.value);
  updateItemFormForType();
}

function syncAddActionControls(item = null) {
  if (!els.itemKindChoice) return;
  const kind = kindForCurrentForm(item);
  refreshItemKindChoices(kind);
}

function preferredAddKindFromUsage() {
  const enabled = enabledLogTypeKeys();
  const candidates = MAIN_ADD_KIND_OPTIONS.filter(option => enabled.has(option.value)).map(option => ({ option }));
  for (const option of customAddKindOptions('')) candidates.push({ option });
  candidates.sort((a,b) => typeUsageCount(addKindUsageValue(b.option)) - typeUsageCount(addKindUsageValue(a.option)));
  const best = candidates[0]?.option;
  return { action: best ? addActionForKind(best.value) : 'other', kind: best?.value || MAIN_ADD_KIND_OPTIONS.find(option => enabled.has(option.value))?.value || 'new-type' };
}

function selectedSavedTypeEntry() {
  const raw = String(els.itemSourceType?.value || '');
  if (!raw.startsWith('custom:')) return null;
  const type = raw.slice(7);
  return state.customTypes.find(entry => entry.type === type) || { type, label: getTypeLabel(type) };
}

function formParentType() {
  return selectedSavedTypeEntry() ? 'other' : (els.itemSourceType?.value || 'tv');
}

function refreshItemTypeOptions(preferredValue = '') {
  if (!els.itemSourceType) return;
  const current = preferredValue || els.itemSourceType.value || 'tv';
  const base = BASE_ITEM_TYPE_OPTIONS.map(([value,label], order) => ({ value, label, order, custom: false }));
  const custom = state.customTypes.map((entry, index) => ({ value: `custom:${entry.type}`, label: entry.label || getTypeLabel(entry.type), order: 100 + index, custom: true }));
  const options = [...base, ...custom].sort((a,b) => {
    const au = typeUsageCount(a.value), bu = typeUsageCount(b.value);
    if (au !== bu) return bu - au;
    if (a.custom !== b.custom) return a.custom ? -1 : 1;
    return a.custom ? a.label.localeCompare(b.label) : a.order - b.order;
  });
  els.itemSourceType.innerHTML = options.map(option => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`).join('');
  if (options.some(option => option.value === current)) els.itemSourceType.value = current;
  else els.itemSourceType.value = options[0]?.value || 'tv';
}

function migrateCustomTypesFromLibrary() {
  const known = new Set((state.customTypes || []).map(entry => entry.type));
  let changed = false;
  for (const item of state.items || []) {
    const type = String(item?.type || '').trim();
    if (!type || isBuiltInType(type) || known.has(type)) continue;
    state.customTypes.push({
      type,
      label: cleanTypeLabel(item.typeLabel || getTypeLabel(type)) || type,
      actionCategory: ADD_ACTION_CATEGORIES.includes(String(item.actionCategory || '')) ? item.actionCategory : ''
    });
    known.add(type);
    changed = true;
  }
  if (changed) {
    safeLocalSet(CUSTOM_TYPES_KEY, state.customTypes);
    scheduleCloudSync();
  }
}

function migrateCustomTypeActionCategories() {
  let changed = false;
  for (const entry of state.customTypes || []) {
    const next = inferCustomTypeActionCategory(entry);
    if (entry.actionCategory !== next) {
      entry.actionCategory = next;
      changed = true;
    }
  }
  if (changed) {
    safeLocalSet(CUSTOM_TYPES_KEY, state.customTypes);
    scheduleCloudSync();
  }
}

function seedTypeUsageFromLibrary() {
  if (Object.keys(state.typeUsage || {}).length || !state.items.length) return;
  const seeded = {};
  for (const item of state.items) {
    const value = isBuiltInType(item.type)
      ? item.type
      : state.customTypes.some(entry => entry.type === item.type)
        ? `custom:${item.type}`
        : (BASE_ITEM_TYPE_OPTIONS.some(([candidate]) => candidate === getSourceType(item)) ? getSourceType(item) : `custom:${item.type}`);
    const key = itemTypeOptionUsageKey(value);
    const current = seeded[key] || { count: 0, lastUsedAt: '' };
    current.count += 1;
    const date = String(item.updatedAt || item.createdAt || '');
    if (date > current.lastUsedAt) current.lastUsedAt = date;
    seeded[key] = current;
  }
  state.typeUsage = seeded;
  safeLocalSet(TYPE_USAGE_KEY, state.typeUsage);
}

function recordTypeUse(item) {
  if (!item) return;
  const value = isBuiltInType(item.type)
    ? item.type
    : state.customTypes.some(entry => entry.type === item.type)
      ? `custom:${item.type}`
      : (BASE_ITEM_TYPE_OPTIONS.some(([value]) => value === getSourceType(item)) ? getSourceType(item) : `custom:${item.type}`);
  const key = itemTypeOptionUsageKey(value);
  const existing = state.typeUsage[key] || { count: 0, lastUsedAt: '' };
  state.typeUsage[key] = { count: Number(existing.count || 0) + 1, lastUsedAt: new Date().toISOString() };
  safeLocalSet(TYPE_USAGE_KEY, state.typeUsage);
}

function openItemModal(id = '', defaultQueueStatus = 'library') {
  resetItemForm(defaultQueueStatus);
  const item = id ? findItem(id) : null;

  if (item) {
    els.editingId.value = item.id;
    els.itemModalEyebrow.textContent = 'EDIT';
    els.itemModalTitle.textContent = item.title;
    const sourceType = getSourceType(item);
    if (els.itemForm) els.itemForm.dataset.sourceTypeHint = sourceType;
    setItemFormSourceType(sourceType, item);
    if (els.itemFindSource) els.itemFindSource.value = item.featureConfig?.findSource || (sourceType === 'place' ? 'google-places' : 'auto');
    if (els.itemProgressMode) els.itemProgressMode.value = item.featureConfig?.progressMode || 'auto';
    if (els.itemUseDateRange) els.itemUseDateRange.checked = Boolean(item.featureConfig?.dateRange || (item.activityMeta && sourceType !== 'activity'));
    if (els.itemUseRepeatLog) els.itemUseRepeatLog.checked = Boolean(item.featureConfig?.repeatableLog);
    if (els.itemLogEntryTitle) els.itemLogEntryTitle.value = '';
    if (els.itemUsePlaylist) els.itemUsePlaylist.checked = Boolean(item.featureConfig?.youtubePlaylist || (sourceType === 'youtube' && (item.type === 'workout' || item.playlistItems)));
    if (['youtube', 'reminder', 'other', 'place'].includes(sourceType) || selectedSavedTypeEntry()) els.itemDisplayType.value = getItemTypeLabel(item);
    els.provider.value = item.provider || 'manual';
    els.providerId.value = item.providerId || '';
    els.providerImage.value = item.image || '';
    els.providerSubtitle.value = item.subtitle || '';
    els.manualTitle.value = item.title || '';
    if (els.itemSubcategory) els.itemSubcategory.value = item.subcategory || '';
    if (els.itemPeople) els.itemPeople.value = getItemPeople(item).join(', ');
    els.itemNote.value = item.notes || '';
    if (els.itemComment) els.itemComment.value = item.comment || '';
    if (els.itemNoteDisclosure) els.itemNoteDisclosure.open = Boolean(String(item.notes || '').trim());
    els.itemDate.value = item.date || '';
    if (sourceType === 'activity' || els.itemUseDateRange?.checked) {
      if (els.activityStartDate) els.activityStartDate.value = item.activityMeta?.startDate || item.date || '';
      if (els.activityEndDate) els.activityEndDate.value = item.activityMeta?.endDate || item.date || '';
    }
    if (els.itemReleaseDate) els.itemReleaseDate.value = normalizedReleaseDate(item.releaseDate);
    if (els.itemRecommended) els.itemRecommended.checked = Boolean(item.recommended);
    syncItemRecommendHeart();
    els.itemQueueStatus.value = getQueueStatus(item);
    syncItemStatusPicker();
    setRating(Number(item.rating || 0));

    const itemProgressMode = item.featureConfig?.progressMode || (sourceType === 'tv' ? 'tv' : sourceType === 'book' ? 'book' : 'none');
    if (itemProgressMode === 'tv') {
      els.nextSeason.value = item.progress?.nextSeason || 1;
      els.nextEpisode.value = item.progress?.nextEpisode || 1;
    }
    if (itemProgressMode === 'book') {
      els.bookCurrentPage.value = item.progress?.currentPage || 0;
      els.bookTotalPages.value = item.progress?.totalPages || '';
      const periods = getBookReadingPeriods(item);
      const latest = periods.at(-1) || null;
      els.bookStartDate.value = latest?.startDate || '';
      els.bookEndDate.value = latest?.endDate || '';
    }
    if (item.reminder) {
      if (els.reminderFrequency) els.reminderFrequency.value = reminderFrequency(item);
      if (els.reminderDueDate) els.reminderDueDate.value = item.reminder?.dueDate || item.reminder?.scheduleStart || getNextReminderDueDate(item) || item.date || todayString();
      if (els.reminderInterval) els.reminderInterval.value = String(Math.max(1, Number(item.reminder?.interval || 2)));
      if (els.reminderIntervalUnit) els.reminderIntervalUnit.value = ['days','weeks','months'].includes(item.reminder?.intervalUnit) ? item.reminder.intervalUnit : 'weeks';
      if (els.reminderWeekday) els.reminderWeekday.value = String(Number.isInteger(Number(item.reminder?.weekday)) ? Number(item.reminder.weekday) : new Date(`${els.reminderDueDate?.value || todayString()}T12:00:00`).getDay());
    }
    if (sourceType === 'youtube') {
      els.playlistInput.value = item.providerId || '';
      state.loadedPlaylist = null;
      showSelectedSource({ title: item.title, subtitle: item.subtitle, image: item.image }, true);
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
  syncItemOptionalDisclosures();
  showDialogAtTop(els.itemModal);
  refreshItemPeopleSuggestions().catch(error => console.warn('[Social] people tags unavailable:', error));
  refreshItemBuddyWatchOptions().catch(error => console.warn('[Buddy Watch] people unavailable:', error));
  if (item && getSourceType(item) === 'tv' && item.providerId) {
    prepareTVWatchSetup(item.providerId, item.id).catch(error => {
      if (els.tvWatchSetupStatus) els.tvWatchSetupStatus.textContent = error.message;
      if (els.tvProgressFields) els.tvProgressFields.hidden = true;
    });
  }
}

function resetItemForm(defaultQueueStatus = 'library') {
  els.itemForm.reset();
  delete els.itemForm.dataset.sourceTypeHint;
  els.editingId.value = '';
  refreshItemTypeOptions();
  const preferredAdd = preferredAddKindFromUsage();
  if (els.itemActionChoice) els.itemActionChoice.value = preferredAdd.action;
  refreshItemKindChoices(preferredAdd.kind, preferredAdd.action);
  setUnderlyingFormTypeForKind(preferredAdd.kind);
  els.itemDisplayType.value = 'Workout';
  if (els.itemSubcategory) els.itemSubcategory.value = '';
  if (els.itemSubcategorySelect) {
    els.itemSubcategorySelect.value = '';
    els.itemSubcategorySelect.dataset.creatingNew = 'false';
    els.itemSubcategorySelect.dataset.explicitNone = 'false';
  }
  if (els.itemSubcategoryNewField) els.itemSubcategoryNewField.hidden = true;
  if (els.itemSubcategoryDisclosure) els.itemSubcategoryDisclosure.open = false;
  if (els.itemDateOptionsDisclosure) els.itemDateOptionsDisclosure.open = false;
  if (els.itemPeopleDisclosure) els.itemPeopleDisclosure.open = false;
  if (els.itemAttachmentsDisclosure) els.itemAttachmentsDisclosure.open = false;
  if (els.itemFindSourceDisclosure) els.itemFindSourceDisclosure.open = false;
  if (els.itemNoteDisclosure) els.itemNoteDisclosure.open = false;
  if (els.itemBuddyWatchToggle) els.itemBuddyWatchToggle.checked = false;
  if (els.itemFindSource) els.itemFindSource.value = 'auto';
  if (els.itemProgressMode) els.itemProgressMode.value = 'auto';
  if (els.itemUseDateRange) els.itemUseDateRange.checked = false;
  if (els.itemUseRepeatLog) els.itemUseRepeatLog.checked = false;
  if (els.itemLogEntryTitle) els.itemLogEntryTitle.value = '';
  if (els.itemUsePlaylist) els.itemUsePlaylist.checked = false;
  if (els.itemFeaturesDisclosure) els.itemFeaturesDisclosure.open = false;
  if (els.itemBuddyWatchPerson) els.itemBuddyWatchPerson.innerHTML = '';
  if (els.itemBuddyWatchPersonField) els.itemBuddyWatchPersonField.hidden = true;
  if (els.activityStartDate) els.activityStartDate.value = todayString();
  if (els.activityEndDate) els.activityEndDate.value = '';
  if (els.itemPeople) els.itemPeople.value = '';
  if (els.itemComment) els.itemComment.value = '';
  if (els.itemDate) els.itemDate.value = todayString();
  els.itemQueueStatus.value = ['upnext','tbr','library'].includes(defaultQueueStatus) ? defaultQueueStatus : 'library';
  syncItemStatusPicker();
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
  if (els.reminderWeekday) els.reminderWeekday.value = String(new Date(`${todayString()}T12:00:00`).getDay());
  els.provider.value = '';
  els.providerId.value = '';
  els.providerImage.value = '';
  els.providerSubtitle.value = '';
  els.itemModalEyebrow.textContent = 'ADD';
  els.itemModalTitle.textContent = 'Add';
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
  syncItemOptionalDisclosures();
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

const FORM_SUBTYPE_OPTIONS = {
  music: [
    { value: 'artist', label: 'Artist' }
  ],
  food: [
    { value: 'manual', label: 'Food' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'recipe', label: 'Recipe' }
  ],
  game: [
    { value: 'video-game', label: 'Video Game' },
    { value: 'board-game', label: 'Board Game' }
  ],
  event: [
    { value: 'live-event', label: 'Live Event' },
    { value: 'personal-event', label: 'Personal Event' }
  ]
};

function formSubtypeForItem(sourceType, item = null) {
  const label = cleanTypeLabel(item?.subcategory || '').toLowerCase();
  if (sourceType === 'artist') return 'artist';
  if (sourceType === 'restaurant') return 'restaurant';
  if (sourceType === 'recipe') return 'recipe';
  if (sourceType === 'video-game') return 'video-game';
  if (sourceType === 'board-game') return 'board-game';
  if (sourceType === 'event') return /personal|vacation|trip|occasion/.test(label) ? 'personal-event' : 'live-event';
  if (sourceType === 'food') return 'manual';
  return '';
}

function configureItemSubtype(reset = false, sourceTypeHint = '', item = null) {
  if (!els.itemSubtypeBlock || !els.itemSubtype) return;
  if (reset && els.itemSubcategorySelect) {
    els.itemSubcategorySelect.dataset.creatingNew = 'false';
    els.itemSubcategorySelect.dataset.explicitNone = 'false';
  }
  const parent = formParentType();
  const options = FORM_SUBTYPE_OPTIONS[parent] || [];
  // The hidden select keeps the behavioural subtype separate from the visible,
  // user-editable Subtype field. The visible field can always contain a custom subtype.
  els.itemSubtypeBlock.hidden = true;
  if (!options.length) {
    els.itemSubtype.innerHTML = '';
    return;
  }
  const previous = reset ? '' : els.itemSubtype.value;
  els.itemSubtype.innerHTML = options.map(option => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`).join('');
  const hinted = formSubtypeForItem(sourceTypeHint, item);
  const fallback = options[0]?.value || '';
  const preferred = hinted || (options.some(option => option.value === previous) ? previous : fallback);
  els.itemSubtype.value = options.some(option => option.value === preferred) ? preferred : fallback;
}

function itemMatchesCurrentSubtypeType(entry, parent = formParentType(), rawType = String(els.itemSourceType?.value || '')) {
  if (!entry) return false;
  const customType = rawType.startsWith('custom:') ? rawType.slice(7) : '';
  if (customType) return String(entry.type || '') === customType;
  const sourceType = getSourceType(entry);
  if (parent === 'game') return entry.type === 'game' || ['game','video-game','board-game'].includes(sourceType);
  if (parent === 'music') return entry.type === 'music' || ['music','artist','song','concert'].includes(sourceType);
  if (parent === 'food') return entry.type === 'food' || ['food','restaurant','recipe'].includes(sourceType);
  if (parent === 'event') return entry.type === 'event' || ['event','concert'].includes(sourceType);
  if (parent === 'shopping') return entry.type === 'shopping' || sourceType === 'place' || sourceType === 'shopping';
  return entry.type === parent || sourceType === parent;
}

function savedSubtypeValuesForCurrentType() {
  const parent = formParentType();
  const builtIns = {
    music: ['Artist'],
    food: ['Food', 'Restaurant', 'Recipe'],
    game: ['Video Game', 'Board Game'],
    event: ['Live Event', 'Personal Event']
  }[parent] || [];
  const rawType = String(els.itemSourceType?.value || '');
  const saved = new Map();
  for (const entry of [...(state.items || []), ...(state.history || [])]) {
    if (!itemMatchesCurrentSubtypeType(entry, parent, rawType)) continue;
    const value = cleanTypeLabel(entry?.subcategory || '');
    if (value) saved.set(value.toLowerCase(), value);
  }
  for (const value of builtIns) if (!saved.has(value.toLowerCase())) saved.set(value.toLowerCase(), value);
  return [...saved.values()].sort((a,b) => a.localeCompare(b));
}

function syncSubtypeSuggestionsForType() {
  if (!els.itemSubcategory) return;
  const values = savedSubtypeValuesForCurrentType();
  const current = cleanTypeLabel(els.itemSubcategory.value || '');
  const creatingNew = els.itemSubcategorySelect?.dataset.creatingNew === 'true' || els.itemSubcategorySelect?.value === '__new__';
  const list = document.querySelector('#itemSubtypeSuggestions');
  if (list) list.innerHTML = values.map(value => `<option value="${escapeAttr(value)}"></option>`).join('');

  if (els.itemSubcategorySelect) {
    const options = [...values];
    if (current && !creatingNew && !options.some(value => value.toLowerCase() === current.toLowerCase())) options.push(current);
    els.itemSubcategorySelect.innerHTML = [
      '<option value="">No subtype</option>',
      ...options.map(value => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`),
      '<option value="__new__">Create new…</option>'
    ].join('');
    if (creatingNew) {
      els.itemSubcategorySelect.value = '__new__';
      els.itemSubcategorySelect.dataset.creatingNew = 'true';
    } else {
      const match = options.find(value => value.toLowerCase() === current.toLowerCase()) || '';
      els.itemSubcategorySelect.value = match;
      els.itemSubcategorySelect.dataset.creatingNew = 'false';
    }
  }
  if (els.itemSubcategoryNewField) els.itemSubcategoryNewField.hidden = !creatingNew;
  els.itemSubcategory.placeholder = values.length ? `e.g. ${values.slice(0, 2).join(', ')}` : 'New subtype';
}

const FIND_SOURCE_CONFIG = Object.freeze({
  'tmdb-tv': { sourceType: 'tv', label: 'TV' },
  'tmdb-movie': { sourceType: 'movie', label: 'Movies' },
  'google-books': { sourceType: 'book', label: 'Books' },
  'igdb-games': { sourceType: 'video-game', label: 'Video games' },
  'bgg-games': { sourceType: 'board-game', label: 'Board games' },
  'apple-albums': { sourceType: 'music', label: 'Albums' },
  'lastfm-artists': { sourceType: 'artist', label: 'Artists' },
  'apple-songs': { sourceType: 'song', label: 'Songs' },
  'youtube-videos': { sourceType: 'youtube', label: 'YouTube videos' },
  'google-places': { sourceType: 'place', label: 'Places' },
  'ticketmaster-events': { sourceType: 'event', label: 'Events' },
  'ticketmaster-concerts': { sourceType: 'concert', label: 'Concerts' },
  'manual': { sourceType: 'other', label: 'No lookup' }
});

function automaticFormSourceType() {
  const parent = formParentType();
  const visibleSubtype = cleanTypeLabel(els.itemSubcategory?.value || '').toLowerCase();
  if (parent === 'shopping') return 'place';
  if (parent === 'workout') return 'workout';
  if (parent === 'music') return 'artist';
  if (parent === 'food') {
    if (/restaurant/.test(visibleSubtype) || els.itemSubtype?.value === 'restaurant') return 'restaurant';
    if (/recipe/.test(visibleSubtype) || els.itemSubtype?.value === 'recipe') return 'recipe';
    return 'food';
  }
  if (parent === 'game') {
    if (/board/.test(visibleSubtype) || els.itemSubtype?.value === 'board-game') return 'board-game';
    return 'video-game';
  }
  if (parent === 'event') return 'event';
  return parent;
}

function findSourceForSourceType(sourceType = '') {
  return ({
    tv: 'tmdb-tv', movie: 'tmdb-movie', book: 'google-books',
    'video-game': 'igdb-games', 'board-game': 'bgg-games',
    music: 'apple-albums', artist: 'lastfm-artists', song: 'apple-songs', concert: 'ticketmaster-concerts',
    event: 'ticketmaster-events', restaurant: 'google-places', place: 'google-places', shopping: 'google-places', youtube: 'youtube-videos'
  })[sourceType] || 'manual';
}

function learnedFindSourceForCurrentSubtype() {
  const parent = formParentType();
  const rawType = String(els.itemSourceType?.value || '');
  const subtype = cleanTypeLabel(els.itemSubcategory?.value || '').toLowerCase();
  const candidates = (state.items || [])
    .filter(item => itemMatchesCurrentSubtypeType(item, parent, rawType))
    .filter(item => cleanTypeLabel(item.subcategory || '').toLowerCase() === subtype)
    .sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  for (const item of candidates) {
    const saved = String(item.featureConfig?.findSource || '');
    if (saved && saved !== 'auto' && (saved === 'manual' || FIND_SOURCE_CONFIG[saved])) return saved;
    const inferred = findSourceForSourceType(getSourceType(item));
    if (inferred) return inferred;
  }
  return '';
}

function defaultFindSourceForType(sourceType = automaticFormSourceType()) {
  if (formParentType() === 'event' && /personal/.test(cleanTypeLabel(els.itemSubcategory?.value || '').toLowerCase())) return 'manual';
  const learned = learnedFindSourceForCurrentSubtype();
  if (learned) return learned;
  return findSourceForSourceType(sourceType);
}

function selectedLookupSourceType() {
  const automatic = automaticFormSourceType();
  const findSource = els.itemFindSource?.value || 'auto';
  const sourceKey = findSource === 'auto' ? defaultFindSourceForType(automatic) : findSource;
  if (sourceKey === 'google-places' && automatic === 'restaurant') return 'restaurant';
  return FIND_SOURCE_CONFIG[sourceKey]?.sourceType || automatic;
}

function selectedFormSourceType() {
  const automatic = automaticFormSourceType();
  if (els.itemUsePlaylist?.checked) return 'youtube';
  const findSource = els.itemFindSource?.value || 'auto';
  const editingHint = String(els.itemForm?.dataset?.sourceTypeHint || '');
  // Existing custom items retain their saved backend until the user chooses a new Find source.
  if (findSource === 'auto' && editingHint && selectedSavedTypeEntry()) return editingHint;
  return selectedLookupSourceType() || automatic;
}
function effectiveItemProgressMode(sourceType = selectedFormSourceType()) {
  const explicit = els.itemProgressMode?.value || 'auto';
  if (explicit === 'tv' || explicit === 'book' || explicit === 'none') return explicit;
  const parent = formParentType();
  // Type and lookup source are independent, but Auto should preserve the familiar
  // progress behavior for TV/Book while also doing the sensible thing when a
  // custom Type is backed by one of those catalogue sources.
  if (parent === 'tv' || sourceType === 'tv') return 'tv';
  if (parent === 'book' || sourceType === 'book') return 'book';
  return 'none';
}


function syncItemFindSourceSummary() {
  if (!els.itemFindSource) return;
  const automaticKey = defaultFindSourceForType(automaticFormSourceType());
  els.itemFindSource.dataset.defaultSource = automaticKey;
  const automaticOption = els.itemFindSource.querySelector('option[value="auto"]');
  const automaticLabel = automaticKey === 'manual' ? 'Choose source' : (FIND_SOURCE_CONFIG[automaticKey]?.label || 'Choose source');
  if (automaticOption) automaticOption.textContent = automaticLabel;
  const option = els.itemFindSource.options[els.itemFindSource.selectedIndex];
  if (els.itemFindSourceSummary) els.itemFindSourceSummary.textContent = option?.textContent || automaticLabel;
}

function syncItemStatusPicker() {
  if (!els.itemStatusPicker || !els.itemQueueStatus) return;
  const current = els.itemQueueStatus.value || 'library';
  els.itemStatusPicker.querySelectorAll('[data-item-status]').forEach(button => {
    const selected = button.dataset.itemStatus === current;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function syncItemFeatureSummary() {
  if (!els.itemFeaturesSummary) return;
  const bits = [];
  const progress = effectiveItemProgressMode();
  if (progress === 'tv') bits.push('episodes');
  if (progress === 'book') bits.push('pages');
  if (els.itemUseDateRange?.checked) bits.push('date range');
  if (els.itemUsePlaylist?.checked) bits.push('playlist');
  els.itemFeaturesSummary.textContent = bits.length ? bits.join(' · ') : 'None';
}


function setItemFormSourceType(sourceType, item = null) {
  if (!els.itemSourceType) return;
  refreshItemTypeOptions();
  // Display Type and lookup source are independent. When editing, restore the
  // saved display Type first even if that item was found through another API.
  if (item?.type && !isBuiltInType(item.type) && state.customTypes.some(entry => entry.type === item.type)) {
    els.itemSourceType.value = `custom:${item.type}`;
  } else if (item?.type && BASE_ITEM_TYPE_OPTIONS.some(([value]) => value === item.type)) {
    els.itemSourceType.value = item.type;
  } else if (['music','artist','song','concert'].includes(sourceType)) els.itemSourceType.value = 'music';
  else if (['food','restaurant','recipe'].includes(sourceType)) els.itemSourceType.value = 'food';
  else if (sourceType === 'place') els.itemSourceType.value = 'shopping';
  else if (BASE_ITEM_TYPE_OPTIONS.some(([value]) => value === sourceType)) els.itemSourceType.value = sourceType;
  else els.itemSourceType.value = 'other';
  configureItemSubtype(true, sourceType, item);
  syncAddActionControls(item);
}

function clearSourceSelectionForTypeChange() {
  if (els.itemForm) delete els.itemForm.dataset.sourceTypeHint;
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


function syncItemSubcategoryDisclosure() {
  if (!els.itemSubcategoryDisclosure) return;
  const value = cleanTypeLabel(els.itemSubcategory?.value || '');
  if (els.itemSubcategorySummary) els.itemSubcategorySummary.textContent = value ? `· ${value}` : '';
  els.itemSubcategoryDisclosure.classList.toggle('has-value', Boolean(value));
}

function syncItemPeopleDisclosure() {
  if (!els.itemPeopleDisclosure) return;
  const people = parseItemPeople(els.itemPeople?.value || '');
  if (els.itemPeopleSummary) {
    els.itemPeopleSummary.textContent = people.length ? `· ${people.length} ${people.length === 1 ? 'person' : 'people'}` : '';
  }
  els.itemPeopleDisclosure.classList.toggle('has-value', people.length > 0);
}

function syncItemAttachmentsDisclosure() {
  if (!els.itemAttachmentsDisclosure) return;
  const removed = state.attachmentDraft?.removedFileIds || new Set();
  const existingCount = (state.attachmentDraft?.existingFiles || []).filter(file => !removed.has(file.id)).length;
  const newCount = (state.attachmentDraft?.newFiles || []).length;
  const linkCount = (state.attachmentDraft?.links || []).length;
  const total = existingCount + newCount + linkCount;
  if (els.itemAttachmentsSummary) els.itemAttachmentsSummary.textContent = total ? `${total} ${total === 1 ? 'item' : 'items'}` : '';
  els.itemAttachmentsDisclosure.classList.toggle('has-value', total > 0);
}

function syncItemDateOptionsDisclosure() {
  if (!els.itemDateOptionsDisclosure) return;
  const active = [];
  if (els.itemUseRepeatLog?.checked) active.push('Multiple logs');
  const repeat = String(els.itemRepeatSummary?.textContent || '').trim();
  if (repeat) active.push(repeat);
  if (els.itemUseDateRange?.checked) active.push('Multi-day');
  if (els.itemDateOptionsSummary) els.itemDateOptionsSummary.textContent = active.length ? `· ${active.join(' · ')}` : '';
  els.itemDateOptionsDisclosure.classList.toggle('has-value', active.length > 0);
}

function syncItemOptionalDisclosures() {
  syncItemSubcategoryDisclosure();
  syncItemDateOptionsDisclosure();
  syncItemPeopleDisclosure();
  syncItemAttachmentsDisclosure();
  syncItemBuddyWatchToggle();
}

function syncItemBuddyWatchToggle() {
  const enabled = Boolean(els.itemBuddyWatchToggle?.checked);
  if (els.itemBuddyWatchPersonField) els.itemBuddyWatchPersonField.hidden = !enabled;
  els.itemBuddyWatchField?.classList.toggle('is-enabled', enabled);
}

async function refreshItemBuddyWatchOptions() {
  if (!els.itemBuddyWatchField || !els.itemBuddyWatchPerson || !els.itemBuddyWatchToggle) return;
  const sourceType = selectedFormSourceType();
  const supported = ['tv','movie','youtube'].includes(sourceType);
  const available = supported && socialState.schemaReady && socialState.profile && currentUser && supabase;
  els.itemBuddyWatchField.hidden = !available;
  if (!available) {
    els.itemBuddyWatchToggle.checked = false;
    els.itemBuddyWatchPerson.innerHTML = '';
    els.itemBuddyWatchToggle.disabled = true;
    syncItemBuddyWatchToggle();
    return;
  }

  const previous = els.itemBuddyWatchPerson.value;
  const connections = await loadAcceptedSocialConnections();
  els.itemBuddyWatchPerson.innerHTML = connections.length
    ? `<option value="">Choose person…</option>${connections.map(profile => `<option value="${escapeAttr(profile.user_id)}">${escapeHtml(profile.display_name || profile.username)} (@${escapeHtml(profile.username)})</option>`).join('')}`
    : '<option value="">No connections yet</option>';
  els.itemBuddyWatchPerson.disabled = !connections.length;
  els.itemBuddyWatchToggle.disabled = !connections.length;
  if (previous && connections.some(profile => String(profile.user_id) === String(previous))) {
    els.itemBuddyWatchPerson.value = previous;
  }
  if (!connections.length) els.itemBuddyWatchToggle.checked = false;
  syncItemBuddyWatchToggle();
}

function ensureFlexibleEpisodeProgressFields() {
  let block = $('#flexEpisodeProgressFields');
  if (block) return block;
  block = document.createElement('div');
  block.id = 'flexEpisodeProgressFields';
  block.className = 'progress-fields generic-episode-progress';
  block.hidden = true;
  block.innerHTML = `<div class="two-column-fields"><label class="field compact-field"><span>Season</span><input id="flexNextSeason" type="number" min="1" step="1" value="1" /></label><label class="field compact-field"><span>Episode</span><input id="flexNextEpisode" type="number" min="1" step="1" value="1" /></label></div>`;
  const before = els.bookProgressFields || els.itemRating?.closest('.rating-fieldset') || null;
  if (before?.parentNode) before.parentNode.insertBefore(block, before);
  else els.itemForm?.appendChild(block);
  const sync = () => {
    if (els.nextSeason) els.nextSeason.value = String(Math.max(1, Number($('#flexNextSeason')?.value || 1)));
    if (els.nextEpisode) els.nextEpisode.value = String(Math.max(1, Number($('#flexNextEpisode')?.value || 1)));
  };
  block.addEventListener('input', sync);
  return block;
}

function syncFlexibleEpisodeProgressFields(sourceType, progressMode) {
  const block = ensureFlexibleEpisodeProgressFields();
  const visible = progressMode === 'tv' && sourceType !== 'tv';
  block.hidden = !visible;
  if (!visible) return;
  const season = block.querySelector('#flexNextSeason');
  const episode = block.querySelector('#flexNextEpisode');
  if (season) season.value = String(Math.max(1, Number(els.nextSeason?.value || 1)));
  if (episode) episode.value = String(Math.max(1, Number(els.nextEpisode?.value || 1)));
}

function syncTVDraftHistoryVisibility(sourceType = selectedFormSourceType()) {
  if (!els.tvProgressFields) return;
  const loaded = sourceType === 'tv' && Boolean(state.tvDraftDetails) && state.tvDraftSeasons.length > 0;
  els.tvProgressFields.hidden = !loaded;
}

function updateItemFormForType() {
  configureItemSubtype(false);
  const savedType = selectedSavedTypeEntry();
  const parentType = formParentType();
  const visibleSubtype = cleanTypeLabel(els.itemSubcategory?.value || '');

  // Keep the hidden behavioural subtype in sync with recognizable visible subtype names.
  if (els.itemSubtype) {
    const lower = visibleSubtype.toLowerCase();
    if (parentType === 'food') {
      if (/restaurant/.test(lower)) els.itemSubtype.value = 'restaurant';
      else if (/recipe/.test(lower)) els.itemSubtype.value = 'recipe';
      else els.itemSubtype.value = 'manual';
    } else if (parentType === 'game') {
      els.itemSubtype.value = /board/.test(lower) ? 'board-game' : 'video-game';
    } else if (parentType === 'event') {
      els.itemSubtype.value = /personal|vacation|trip|occasion/.test(lower) ? 'personal-event' : 'live-event';
    } else if (parentType === 'music') {
      els.itemSubtype.value = 'artist';
    }
  }

  const automaticType = automaticFormSourceType();
  const defaultSourceKey = defaultFindSourceForType(automaticType);
  if (els.itemFindSource && els.itemFindSource.value === 'auto') els.itemFindSource.dataset.defaultSource = defaultSourceKey;
  const findSource = els.itemFindSource?.value || 'auto';
  const sourceKey = findSource === 'auto' ? defaultSourceKey : findSource;
  const sourceType = selectedFormSourceType();
  const isCatalogue = sourceKey !== 'manual';
  const customNeedsSource = Boolean(savedType) && sourceKey === 'manual' && findSource === 'auto';
  const isYouTube = sourceKey === 'youtube-videos' || sourceType === 'youtube';

  if (els.catalogueSearchBlock) els.catalogueSearchBlock.hidden = false;
  if (els.catalogueQuery) {
    els.catalogueQuery.disabled = !isCatalogue;
    const placeholders = {
      tv: 'Search TV', movie: 'Search movies', book: 'Search books',
      'video-game': 'Search video games', 'board-game': 'Search board games',
      artist: 'Search artists', concert: 'Search concerts', event: 'Search events',
      restaurant: 'Search restaurants', place: 'Search places', youtube: 'Paste YouTube URL'
    };
    els.catalogueQuery.placeholder = customNeedsSource ? 'Choose a source first' : (isCatalogue ? (placeholders[sourceType] || 'Search') : 'Manual title only');
  }
  if (els.catalogueSearchButton) {
    els.catalogueSearchButton.disabled = !isCatalogue;
    els.catalogueSearchButton.textContent = isYouTube ? 'Load' : 'Find';
  }
  if (els.findSourcePrompt) els.findSourcePrompt.hidden = !customNeedsSource;

  if (els.workoutBlock) els.workoutBlock.hidden = !Boolean(els.itemUsePlaylist?.checked);
  if (els.activityFields) els.activityFields.hidden = !Boolean(els.itemUseDateRange?.checked);
  if (els.itemLogEntryFields) els.itemLogEntryFields.hidden = !Boolean(els.itemUseRepeatLog?.checked);
  if (els.itemLogModeHint) els.itemLogModeHint.hidden = !Boolean(els.itemUseRepeatLog?.checked);

  const bookDisplay = parentType === 'book' || sourceType === 'book';
  if (els.itemPeopleDisclosure) els.itemPeopleDisclosure.hidden = bookDisplay;
  if (els.itemPeopleBlock) els.itemPeopleBlock.hidden = bookDisplay;
  if (els.itemPeopleSuggestions && bookDisplay) els.itemPeopleSuggestions.hidden = true;
  else if (els.itemPeopleSuggestions && els.itemModal?.open) refreshItemPeopleSuggestions().catch(() => {});

  const creatingNewType = parentType === 'other' && !savedType && els.itemKindChoice?.value === 'new-type';
  if (els.displayTypeBlock) els.displayTypeBlock.hidden = !creatingNewType;
  if (els.manualTitleBlock) els.manualTitleBlock.hidden = false;

  const progressMode = effectiveItemProgressMode(sourceType);
  syncTVDraftHistoryVisibility(progressMode === 'tv' && sourceType === 'tv' ? 'tv' : sourceType);
  if (els.tvProgressFields && (progressMode !== 'tv' || sourceType !== 'tv')) els.tvProgressFields.hidden = true;
  syncFlexibleEpisodeProgressFields(sourceType, progressMode);
  if (els.bookProgressFields) els.bookProgressFields.hidden = progressMode !== 'book';
  if (els.itemDateField) els.itemDateField.hidden = bookDisplay;
  if (els.itemReleaseDateField) els.itemReleaseDateField.hidden = !['tv','movie','book','music','artist','song','video-game','board-game'].includes(sourceType);
  if (progressMode === 'book' && !els.editingId.value && els.bookStartDate && !els.bookStartDate.value) els.bookStartDate.value = todayString();

  // Status is explicit for every ordinary item: Finished, Up Next, or TBR.
  if (els.queueStatusField) els.queueStatusField.hidden = false;
  refreshItemBuddyWatchOptions().catch(() => {});

  if (els.itemSubcategory) {
    els.itemSubcategory.readOnly = false;
    const creatingNewSubtype = els.itemSubcategorySelect?.dataset.creatingNew === 'true';
    const explicitNoSubtype = els.itemSubcategorySelect?.dataset.explicitNone === 'true';
    if (!els.editingId.value && !els.itemSubcategory.value && !creatingNewSubtype && !explicitNoSubtype) {
      if (parentType === 'music') els.itemSubcategory.value = 'Artist';
      else if (parentType === 'game') els.itemSubcategory.value = 'Video Game';
      else if (parentType === 'event') els.itemSubcategory.value = 'Live Event';
    }
  }
  syncSubtypeSuggestionsForType();
  syncItemSubcategoryDisclosure();

  if (creatingNewType) {
    if (els.displayTypeLabel) els.displayTypeLabel.textContent = 'New type name';
    if (!els.editingId.value && els.itemDisplayType) els.itemDisplayType.value = '';
  }

  if (!els.editingId.value) {
    state.selectedSource = null;
    state.loadedPlaylist = null;
    if (els.provider) els.provider.value = isCatalogue ? '' : 'manual';
    if (els.providerId) els.providerId.value = '';
    if (els.providerImage) els.providerImage.value = '';
    if (els.providerSubtitle) els.providerSubtitle.value = '';
    if (els.searchResults) els.searchResults.hidden = true;
    if (els.selectedSource) els.selectedSource.hidden = true;
    if (els.playlistPreview) els.playlistPreview.hidden = true;
  }

  updateReminderFormFields();
  syncItemFeatureSummary();
  syncItemDateOptionsDisclosure();
  syncItemFindSourceSummary();
  syncItemStatusPicker();
  if (els.manualTitle) els.manualTitle.placeholder = 'Enter title manually';
  if (els.itemLinkLabel) els.itemLinkLabel.placeholder = sourceType === 'recipe' ? 'Recipe source (optional)' : 'Link label (optional)';
}

function updateReminderFormFields() {
  if (!els.reminderFrequency) return;
  const frequency = els.reminderFrequency.value;
  const weekday = Number(els.reminderWeekday?.value ?? new Date(`${els.reminderDueDate?.value || todayString()}T12:00:00`).getDay());
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const repeatLabels = {
    none: '', daily: 'Every day', weekly: `Every ${weekdays[weekday] || 'week'}`,
    biweekly: `Every 2 weeks${Number.isInteger(weekday) ? ` · ${weekdays[weekday]}` : ''}`,
    monthly: 'Every month', custom: 'Custom'
  };
  if (els.itemRepeatSummary) els.itemRepeatSummary.textContent = repeatLabels[frequency] || '';
  syncItemDateOptionsDisclosure();
  const custom = frequency === 'custom';
  const weekly = frequency === 'weekly' || frequency === 'biweekly';
  if (els.reminderWeekdayField) els.reminderWeekdayField.hidden = !weekly;
  if (els.reminderDateField) els.reminderDateField.hidden = frequency === 'none';
  if (els.reminderDateLabel) els.reminderDateLabel.textContent = 'Starts';
  if (els.reminderCustomFields) els.reminderCustomFields.hidden = !custom;
  if (els.reminderDueDate && !els.reminderDueDate.value) els.reminderDueDate.value = els.itemDate?.value || todayString();
  if (custom && els.reminderInterval && Number(els.reminderInterval.value || 0) < 1) els.reminderInterval.value = '1';
}

function parseYouTubeVideoId(value) {
  const raw = String(value || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (/youtu\.be$/i.test(url.hostname)) return url.pathname.split('/').filter(Boolean)[0] || '';
    if (/youtube\.com$/i.test(url.hostname) || /www\.youtube\.com$/i.test(url.hostname) || /m\.youtube\.com$/i.test(url.hostname)) {
      return url.searchParams.get('v') || url.pathname.match(/\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})/)?.[1] || '';
    }
  } catch {}
  return '';
}

function mapYouTubeVideoForFind(video) {
  const snippet = video?.snippet || {};
  return {
    sourceType: 'youtube', provider: 'youtube', providerId: String(video?.id || ''),
    title: snippet.title || 'Untitled video', subtitle: snippet.channelTitle || '',
    image: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
    description: snippet.description || '', raw: video
  };
}

async function searchCatalogue() {
  const query = els.catalogueQuery.value.trim();
  if (!query) return;
  const requested = els.itemFindSource?.value || 'auto';
  const sourceKey = requested === 'auto' ? defaultFindSourceForType(automaticFormSourceType()) : requested;
  if (sourceKey === 'manual') {
    showFormMessage('Enter it manually.', false);
    return;
  }
  const sourceType = sourceKey === 'google-places' && automaticFormSourceType() === 'restaurant'
    ? 'restaurant'
    : (FIND_SOURCE_CONFIG[sourceKey]?.sourceType || automaticFormSourceType());
  showFormMessage('Searching…', false);
  els.catalogueSearchButton.disabled = true;
  try {
    const options = {
      city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
      countryCode: state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA',
      region: state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA',
      maxResultCount: 20,
      pages: sourceKey === 'google-places' ? 2 : 1
    };
    let results = [];
    if (sourceKey === 'tmdb-tv') results = await TrackerAPI.searchCatalogue(query, 'tv', state.settings);
    else if (sourceKey === 'tmdb-movie') results = await TrackerAPI.searchCatalogue(query, 'movie', state.settings);
    else if (sourceKey === 'google-books') results = await TrackerAPI.searchCatalogue(query, 'book', state.settings);
    else if (sourceKey === 'igdb-games') results = await TrackerAPI.searchCatalogue(query, 'video-game', state.settings, { maxResults: 20 });
    else if (sourceKey === 'bgg-games') results = await TrackerAPI.searchCatalogue(query, 'board-game', state.settings, { maxResults: 20 });
    else if (sourceKey === 'apple-albums') results = await TrackerAPI.searchCatalogue(query, 'music', state.settings);
    else if (sourceKey === 'lastfm-artists') {
      try {
        const lastfm = await TrackerAPI.searchLastFmArtists(query, state.settings, 30, 1);
        results = (lastfm || []).map(lastFmArtistDiscoverCandidate).filter(Boolean);
      } catch {
        results = await TrackerAPI.searchCatalogue(query, 'artist', state.settings);
      }
    }
    else if (sourceKey === 'apple-songs') results = await TrackerAPI.searchCatalogue(query, 'song', state.settings);
    else if (sourceKey === 'youtube-videos') {
      const videoId = parseYouTubeVideoId(query);
      if (!videoId) throw new Error('Paste a YouTube video URL or video ID.');
      results = [mapYouTubeVideoForFind(await TrackerAPI.getYouTubeVideo(videoId, state.settings))].filter(result => result.providerId);
    }
    else if (sourceKey === 'google-places') results = sourceType === 'restaurant'
      ? await TrackerAPI.searchRestaurants(query, state.settings, options)
      : await TrackerAPI.searchPlaces(query, state.settings, options);
    else if (sourceKey === 'ticketmaster-concerts') results = await TrackerAPI.searchCatalogue(query, 'concert', state.settings, options);
    else if (sourceKey === 'ticketmaster-events') results = await TrackerAPI.searchCatalogue(query, 'event', state.settings, options);
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
    const sourceType = selectedFormSourceType();
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
  if (['restaurant','place'].includes(selectedFormSourceType())) {
    const attribution = document.createElement('div');
    attribution.className = 'gmp-attribution';
    attribution.setAttribute('translate', 'no');
    attribution.textContent = 'Google Maps';
    els.searchResults.appendChild(attribution);
  }
  els.searchResults.hidden = false;
}

function selectCatalogueResult(result) {
  const formSourceType = selectedFormSourceType();
  const existingMatch = findCanonicalLibraryItem({ ...result, sourceType: formSourceType }, els.editingId?.value || '');
  if (existingMatch) {
    openItemModal(existingMatch.id);
    showFormMessage('Already in your Library — loaded your existing status.', false);
    return;
  }
  state.selectedSource = result;
  const selectingRestaurant = formSourceType === 'restaurant' && result.provider === 'googlePlaces';
  const selectingPlace = formSourceType === 'place' && result.provider === 'googlePlaces';
  // Selecting a restaurant should behave like selecting a movie: use the
  // catalogue result's actual display name as the prefilled tracker title.
  if (selectingRestaurant || selectingPlace) {
    els.manualTitle.value = result.title || String(els.catalogueQuery?.value || '').trim();
    els.manualTitle.placeholder = 'Restaurant name';
  } else {
    els.manualTitle.value = result.title || '';
  }
  els.provider.value = result.provider;
  els.providerId.value = result.providerId;
  els.providerImage.value = (selectingRestaurant || selectingPlace) ? '' : (result.image || '');
  els.providerSubtitle.value = (selectingRestaurant || selectingPlace) ? (result.subtitle || '') : (result.subtitle || '');
  els.searchResults.hidden = true;
  showSelectedSource(result);

  if (formSourceType === 'book' && result.pageCount && !els.bookTotalPages.value) {
    els.bookTotalPages.value = result.pageCount;
  }
  if (['event', 'concert'].includes(formSourceType) && result.eventDate && els.itemDate) {
    els.itemDate.value = result.eventDate;
  }
  if (els.itemReleaseDate && ['tv','movie','book','music','artist','song'].includes(formSourceType)) {
    const releaseDate = normalizedReleaseDate(extractItemReleaseDate(formSourceType, result, null));
    if (releaseDate) els.itemReleaseDate.value = releaseDate;
  }
  if (formSourceType === 'music' && result.provider === 'itunes' && els.itemSubcategory) {
    els.itemSubcategory.value = 'Album';
    els.itemSubcategory.readOnly = true;
    els.itemSubcategory.placeholder = 'Album';
    syncItemSubcategoryDisclosure();
  }
  if (formSourceType === 'tv' && result.providerId) {
    prepareTVWatchSetup(result.providerId).catch(error => {
      if (els.tvWatchSetupStatus) els.tvWatchSetupStatus.textContent = error.message;
      if (els.tvProgressFields) els.tvProgressFields.hidden = true;
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
  if (els.tvProgressFields) els.tvProgressFields.hidden = true;
}

function tvDraftEpisodeKey(seasonNumber, episodeNumber) {
  return `${Number(seasonNumber)}:${Number(episodeNumber)}`;
}

async function prepareTVWatchSetup(providerId, itemId = '') {
  if (!providerId || !els.tvWatchSetupList) return;
  if (els.tvProgressFields) els.tvProgressFields.hidden = true;
  state.tvDraftProviderId = String(providerId);
  state.tvDraftWatched = new Set();
  state.tvDraftInitialWatched = new Set();
  state.tvDraftBulkBaseline = null;
  state.tvDraftLocked = new Set();
  state.tvDraftSeasons = [];
  if (els.tvWatchSetupStatus) els.tvWatchSetupStatus.textContent = `Loading seasons and episodes… · Tip: ${loadingTipText()}`;
  els.tvWatchSetupList.innerHTML = loadingMarkup('Loading episode history…');

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
    if (els.tvProgressFields) els.tvProgressFields.hidden = true;
    return;
  }

  if (els.tvProgressFields) els.tvProgressFields.hidden = false;
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
    return `<details class="tv-watch-season">
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
  const logFromAdd = event.submitter?.dataset?.itemSubmitAction === 'log';
  if (logFromAdd && els.itemDate && !els.itemDateField?.hidden && !els.itemDate.value) els.itemDate.value = todayString();
  const logDate = els.itemDate?.value || todayString();
  const startBuddyAfterSave = Boolean(els.itemBuddyWatchToggle?.checked);
  const buddyFriendId = startBuddyAfterSave ? (els.itemBuddyWatchPerson?.value || '') : '';
  const sourceType = selectedFormSourceType();
  const editing = findItem(els.editingId.value);
  const selectedActionCategory = normalizeAddActionCategory(editing?.actionCategory || addActionForKind(els.itemKindChoice?.value || '') || 'other');
  let title = els.manualTitle.value.trim();
  let provider = els.provider.value;
  let providerId = els.providerId.value;
  let image = els.providerImage.value;
  let subtitle = els.providerSubtitle.value;

  const displayParent = formParentType();
  const savedDisplayType = selectedSavedTypeEntry();
  const automaticSourceType = automaticFormSourceType();
  let type = displayParent;
  let typeLabel = SOURCE_ITEM_LABELS[displayParent] || getTypeLabel(displayParent);
  let fixedSubcategory = '';

  if (savedDisplayType) {
    type = savedDisplayType.type;
    typeLabel = savedDisplayType.label || getTypeLabel(savedDisplayType.type);
    // If the user changes I… while editing a custom Type, remember the new home
    // category so that Type appears under the same choice next time.
    registerCustomType(type, typeLabel, selectedActionCategory);
  } else if (displayParent === 'music') {
    type = 'music';
    typeLabel = 'Music';
    fixedSubcategory = cleanTypeLabel(els.itemSubcategory?.value || '') || musicSubcategoryForSourceType(automaticSourceType);
    if (automaticSourceType === 'music' && (state.selectedSource?.provider === 'itunes' || (editing?.provider === 'itunes' && editing?.providerId))) fixedSubcategory = 'Album';
  } else if (displayParent === 'food') {
    type = 'food';
    typeLabel = 'Food';
    fixedSubcategory = cleanTypeLabel(els.itemSubcategory?.value || '') || foodSubcategoryForSourceType(automaticSourceType);
  } else if (displayParent === 'game') {
    type = 'game';
    typeLabel = 'Games';
    fixedSubcategory = cleanTypeLabel(els.itemSubcategory?.value || '') || (automaticSourceType === 'board-game' ? 'Board Game' : 'Video Game');
  } else if (displayParent === 'event') {
    type = 'event';
    typeLabel = 'Events';
    fixedSubcategory = cleanTypeLabel(els.itemSubcategory?.value || '') || 'Live Event';
  } else if (displayParent === 'youtube') {
    type = 'youtube';
    typeLabel = 'YouTube';
  } else if (displayParent === 'reminder') {
    typeLabel = cleanTypeLabel(els.itemDisplayType.value) || 'Reminder';
    type = displayTypeSlug(typeLabel, 'other');
    registerCustomType(type, typeLabel, selectedActionCategory);
  } else if (displayParent === 'other') {
    const genericOther = els.itemKindChoice?.value === 'other-item';
    if (genericOther) {
      type = 'other';
      typeLabel = 'Other';
    } else {
      typeLabel = cleanTypeLabel(els.itemDisplayType.value);
      if (!typeLabel) {
        showFormMessage('Name the type.', true);
        return;
      }
      type = displayTypeSlug(typeLabel, 'other');
      registerCustomType(type, typeLabel, selectedActionCategory);
    }
  }

  const selectedSource = state.selectedSource;
  if (sourceType === 'reminder') {
    provider = 'reminder';
    providerId = '';
    image = '';
    subtitle = '';
  } else if (sourceType === 'activity' || sourceType === 'class' || sourceType === 'food' || sourceType === 'recipe' || sourceType === 'other') {
    provider = selectedSource?.provider || editing?.provider || 'manual';
    providerId = selectedSource?.providerId || editing?.providerId || '';
    image = selectedSource?.image || editing?.image || image || '';
    subtitle = selectedSource?.subtitle || editing?.subtitle || subtitle || '';
  } else if (sourceType === 'youtube' && els.itemUsePlaylist?.checked && state.loadedPlaylist) {
    provider = 'youtube';
    providerId = state.loadedPlaylist.providerId;
    image = state.loadedPlaylist.image || '';
    subtitle = state.loadedPlaylist.subtitle || '';
  } else if (selectedSource) {
    provider = selectedSource.provider;
    providerId = selectedSource.providerId;
    image = selectedSource.image || '';
    subtitle = selectedSource.subtitle || '';
  } else if (editing) {
    provider = editing.provider;
    providerId = editing.providerId;
    image = editing.image;
    subtitle = editing.subtitle;
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
    showFormMessage(els.itemUsePlaylist?.checked ? 'Load a playlist first.' : 'Choose a YouTube video first.', true);
    return;
  }
  const requestedFindSource = els.itemFindSource?.value || 'auto';
  const manualLookup = requestedFindSource === 'manual';
  const validProvider = manualLookup
    ? true
    : sourceType === 'book'
      ? provider === 'googleBooks'
      : sourceType === 'music'
        ? ['itunes', 'manual'].includes(provider)
        : ['artist', 'song'].includes(sourceType)
          ? ['itunes', 'lastfm'].includes(provider)
          : sourceType === 'concert'
            ? ['ticketmaster', 'manual'].includes(provider)
            : sourceType === 'video-game'
              ? provider === 'igdb'
              : sourceType === 'board-game'
                ? provider === 'bgg'
            : ['restaurant','place'].includes(sourceType)
              ? provider === 'googlePlaces'
              : sourceType === 'event'
                ? provider === 'ticketmaster'
                : ['tv', 'movie'].includes(sourceType)
                  ? provider === 'tmdb'
                  : sourceType === 'youtube'
                    ? provider === 'youtube'
                    : true;
  const requiresCatalogueSelection = !manualLookup && ['tv','book','movie','video-game','board-game','artist','song','event','restaurant','place','youtube'].includes(sourceType);
  if ((requiresCatalogueSelection && !providerId) || !validProvider) {
    showFormMessage('Choose a Find it result first, or switch Find it to Manual.', true);
    return;
  }
  if (logFromAdd && sourceType === 'tv') {
    const newlySelectedTVKeys = [...state.tvDraftWatched].filter(key => !state.tvDraftInitialWatched.has(key));
    if (!newlySelectedTVKeys.length) {
      showFormMessage('Select at least one newly watched episode to log.', true);
      return;
    }
  }
  if (sourceType === 'class' && !els.itemDate?.value) {
    showFormMessage('Choose the date for this class.', true);
    return;
  }
  if (els.reminderFrequency?.value !== 'none' && !els.reminderDueDate?.value) {
    showFormMessage('Choose when the repeat starts.', true);
    return;
  }
  if (els.reminderFrequency?.value === 'custom' && Number(els.reminderInterval?.value || 0) < 1) {
    showFormMessage('Custom repeats must be at least every 1 day, week, or month.', true);
    return;
  }
  if (startBuddyAfterSave && !buddyFriendId) {
    showFormMessage('Choose a person for Buddy Watch.', true);
    return;
  }
  if (sourceType === 'activity' || els.itemUseDateRange?.checked) {
    const startDate = els.activityStartDate?.value || '';
    const endDate = els.activityEndDate?.value || '';
    if (!startDate) {
      showFormMessage('Choose a start date.', true);
      return;
    }
    if (endDate && endDate < startDate) {
      showFormMessage('The end date cannot be before the start date.', true);
      return;
    }
  }

  const collisionCandidate = {
    sourceType, title, subtitle, provider, providerId,
    artistName: state.selectedSource?.artistName || editing?.artistName || '',
    eventDate: state.selectedSource?.eventDate || editing?.eventMeta?.eventDate || els.itemDate?.value || '',
    venueName: state.selectedSource?.venueName || editing?.eventMeta?.venueName || '',
    raw: state.selectedSource?.raw || editing?.raw || {}
  };
  const libraryCollision = findCanonicalLibraryItem(collisionCandidate, editing?.id || '');
  if (libraryCollision) {
    if (editing) {
      showFormMessage(`“${libraryCollision.title}” is already the Library item for this content.`, true);
    } else {
      els.itemModal.close();
      await openDetails(libraryCollision.id);
    }
    return;
  }

  let attachmentFiles = [];
  try {
    attachmentFiles = await persistDraftAttachments();
  } catch (error) {
    showFormMessage(`Could not save attachment: ${error.message}`, true);
    return;
  }

  const people = (formParentType() === 'book' || sourceType === 'book') ? [] : parseItemPeople(els.itemPeople?.value || '');

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
    actionCategory: selectedActionCategory,
    notes: els.itemNote.value.trim(),
    comment: String(els.itemComment?.value || '').trim(),
    people,
    recommended: Boolean(els.itemRecommended?.checked),
    genres: extractItemGenres(sourceType, state.selectedSource, editing),
    releaseDate: ['tv','movie','book','music','artist','song'].includes(sourceType)
      ? (normalizedReleaseDate(els.itemReleaseDate?.value) || normalizedReleaseDate(extractItemReleaseDate(sourceType, state.selectedSource, editing)))
      : normalizedReleaseDate(extractItemReleaseDate(sourceType, state.selectedSource, editing)),
    attachments: attachmentFiles,
    coverAttachmentId: '',
    links: state.attachmentDraft.links.map(link => ({ ...link })),
    date: (sourceType === 'activity' || els.itemUseDateRange?.checked) ? (els.activityStartDate?.value || els.itemDate?.value || '') : (['event','concert'].includes(sourceType) ? (els.itemDate.value || state.selectedSource?.eventDate || editing?.date || '') : (els.itemDate.value || '')),
    queueStatus: logFromAdd ? 'library' : (els.itemQueueStatus?.value || 'library'),
    active: !logFromAdd && (els.itemQueueStatus?.value || 'library') === 'upnext',
    featureConfig: {
      findSource: requestedFindSource,
      progressMode: effectiveItemProgressMode(sourceType),
      dateRange: Boolean(els.itemUseDateRange?.checked),
      youtubePlaylist: Boolean(els.itemUsePlaylist?.checked),
      repeatableLog: Boolean(els.itemUseRepeatLog?.checked)
    },
    createdAt: editing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: editing?.completedAt || '',
    progress: { ...(editing?.progress || {}) },
    ...(sourceType === 'tv' ? {
      watchDisposition: editing?.watchDisposition || ((!logFromAdd && (els.itemQueueStatus.value || 'library') === 'tbr') ? 'watch-later' : 'following'),
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
    ...((sourceType === 'activity' || els.itemUseDateRange?.checked) ? {
      activityMeta: {
        startDate: els.activityStartDate?.value || '',
        endDate: els.activityEndDate?.value || els.activityStartDate?.value || '',
        people
      }
    } : {}),

  };

  const repeatFrequency = ['none','daily','weekly','biweekly','monthly','custom'].includes(els.reminderFrequency?.value)
    ? els.reminderFrequency.value : 'none';
  if (repeatFrequency !== 'none') {
    const scheduleStart = els.reminderDueDate?.value || els.itemDate?.value || todayString();
    item.reminder = {
      frequency: repeatFrequency,
      dueDate: '',
      scheduleStart,
      weekday: ['weekly','biweekly'].includes(repeatFrequency) ? Number(els.reminderWeekday?.value ?? new Date(`${scheduleStart}T12:00:00`).getDay()) : undefined,
      interval: repeatFrequency === 'custom' ? Math.max(1, Math.min(365, Number(els.reminderInterval?.value || 1))) : undefined,
      intervalUnit: repeatFrequency === 'custom' && ['days','weeks','months'].includes(els.reminderIntervalUnit?.value) ? els.reminderIntervalUnit.value : undefined
    };
  } else {
    delete item.reminder;
  }
  const progressMode = effectiveItemProgressMode(sourceType);
  if (progressMode === 'tv') {
    item.progress.nextSeason = Math.max(1, Number(els.nextSeason.value || 1));
    item.progress.nextEpisode = Math.max(1, Number(els.nextEpisode.value || 1));
  }
  if (progressMode === 'book') {
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
    if (logFromAdd && item.progress.totalPages > 0 && item.progress.currentPage < item.progress.totalPages) item.progress.currentPage = item.progress.totalPages;
    if (logFromAdd || (item.progress.totalPages > 0 && item.progress.currentPage >= item.progress.totalPages)) {
      item.completedAt = editing?.completedAt || logDate || todayString();
      setItemQueueStatus(item, 'library');
      const latest = item.progress.readingPeriods.at(-1);
      if (latest && !latest.endDate) latest.endDate = logFromAdd ? logDate : todayString();
    } else {
      item.completedAt = '';
      if (editing && getQueueStatus(editing) === 'tbr' && item.progress.currentPage > 0) {
        setItemQueueStatus(item, 'upnext');
      }
    }
  }
  if (sourceType === 'youtube' && item.featureConfig.youtubePlaylist) {
    item.progress.currentIndex = editing?.progress?.currentIndex || 0;
    if (state.loadedPlaylist && editing?.providerId !== state.loadedPlaylist.providerId) item.progress.currentIndex = 0;
  } else if (sourceType === 'youtube') {
    delete item.progress.currentIndex;
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
    const formComment = String(els.itemComment?.value || '').trim();
    if (formRating > 0) existingRestaurant.rating = formRating;
    if (els.itemRecommended?.checked) existingRestaurant.recommended = true;
    if (formNotes && !String(existingRestaurant.notes || '').trim()) existingRestaurant.notes = formNotes;
    if (formComment) existingRestaurant.comment = formComment;
    if (els.itemQueueStatus?.value === 'tbr') setItemQueueStatus(existingRestaurant, 'tbr');
    else setItemQueueStatus(existingRestaurant, 'library');
    existingRestaurant.updatedAt = new Date().toISOString();
    existingRestaurant.attachments = [
      ...(existingRestaurant.attachments || []),
      ...attachmentFiles.filter(file => !(existingRestaurant.attachments || []).some(saved => saved.id === file.id))
    ];
    existingRestaurant.coverAttachmentId = '';
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

  if (sourceType === 'class' && !editing) {
    const existingClassGroup = state.items.find(existing => getSourceType(existing) === 'class' && existing.groupedClass !== false) || null;
    const classDate = els.itemDate?.value || todayString();
    const classRating = Number(els.itemRating?.value || 0);
    const classNotes = els.itemNote?.value.trim() || '';
    const classComment = String(els.itemComment?.value || '').trim();
    const classPeople = parseItemPeople(els.itemPeople?.value || '');

    const group = existingClassGroup || {
      id: makeId(), sourceType: 'class', type: 'class', typeLabel: 'Classes', subcategory: '',
      title: 'Classes', provider: 'manual', providerId: '', image: '', subtitle: '', rating: 0,
      actionCategory: 'completed', notes: '', comment: '', people: [], recommended: false, genres: [],
      releaseDate: '', attachments: [], coverAttachmentId: '', links: [], date: '', queueStatus: 'library', active: false,
      featureConfig: { findSource: 'manual', progressMode: 'none', dateRange: false, youtubePlaylist: false },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: '', progress: {}, groupedClass: true
    };

    group.attachments = [
      ...(group.attachments || []),
      ...attachmentFiles.filter(file => !(group.attachments || []).some(saved => saved.id === file.id))
    ];
    group.links = [
      ...(group.links || []),
      ...state.attachmentDraft.links.filter(link => !(group.links || []).some(saved => saved.url === link.url))
    ];
    group.coverAttachmentId = '';
    group.updatedAt = new Date().toISOString();
    setItemQueueStatus(group, 'library');
    if (!existingClassGroup) state.items.push(group);

    addHistoryRecord({
      sourceItemId: group.id, sourceType: 'class', type: 'class', typeLabel: 'Classes', subcategory: 'Class',
      date: classDate, showOnCalendar: true, kind: 'class-attended', title, subtitle: 'Class', notes: classNotes,
      comment: classComment, people: classPeople, rating: classRating, image: '', provider: 'manual', providerId: ''
    });

    const classRatings = state.history
      .filter(entry => entry.sourceItemId === group.id && entry.kind === 'class-attended' && Number(entry.rating || 0) > 0)
      .map(entry => Number(entry.rating));
    group.rating = classRatings.length ? Math.round((classRatings.reduce((sum, value) => sum + value, 0) / classRatings.length) * 2) / 2 : 0;
    recordTypeUse(group);
    saveItems();
    saveHistory();
    await deleteRemovedDraftAttachments();
    els.itemModal.close();
    renderAll();
    return;
  }

  applyReleaseQueueAutomation(item);

  // Logging a real date/progress on something that was sitting in TBR means it has started.
  // Preserve deliberate TBR saves, but do not leave an edited/logged item stranded there.
  if (editing && getQueueStatus(editing) === 'tbr' && item.date && item.date !== editing.date && getQueueStatus(item) === 'tbr') {
    resumeTbrItemAfterLog(item);
  }

  if (editing) {
    state.items = state.items.map(existing => existing.id === item.id ? item : existing);
  } else {
    state.items.push(item);
  }

  if ((!editing || logFromAdd) && item.featureConfig?.repeatableLog) {
    const repeatLogDate = els.itemDate?.value || todayString();
    addHistoryRecord({
      sourceItemId: item.id, sourceType, type: item.type, typeLabel: getItemTypeLabel(item),
      subcategory: item.subcategory || '', date: repeatLogDate, showOnCalendar: true, kind: 'repeatable-log',
      title: cleanTypeLabel(els.itemLogEntryTitle?.value || '') || item.title,
      subtitle: item.title, notes: item.notes || '', comment: item.comment || '', people: item.people || [],
      rating: Number(item.rating || 0), image: item.image || '', provider: item.provider, providerId: item.providerId
    });
    item.date = '';
    saveHistory();
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
      sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: logFromAdd ? logDate : '', showOnCalendar: Boolean(logFromAdd),
      kind: 'book-finished', title: item.title, subtitle: item.progress.totalPages ? `Finished · ${item.progress.totalPages} pages` : 'Finished',
      notes: item.notes || '', rating: Number(item.rating || 0), image: item.image || '', provider: item.provider, providerId: item.providerId
    });
    saveHistory();
  }

  if (sourceType === 'tv') {
    try {
      const newlySelectedTVKeys = logFromAdd
        ? new Set([...state.tvDraftWatched].filter(key => !state.tvDraftInitialWatched.has(key)))
        : new Set();
      await persistTVDraftWatchHistory(item);
      if (logFromAdd && newlySelectedTVKeys.size) {
        for (const entry of state.history) {
          if (entry.sourceItemId !== item.id || entry.kind !== 'episode-watched') continue;
          const key = tvDraftEpisodeKey(entry.seasonNumber, entry.episodeNumber);
          if (!newlySelectedTVKeys.has(key)) continue;
          entry.date = logDate;
          entry.showOnCalendar = true;
          entry.imported = false;
        }
      }
      saveHistory();
    } catch (error) {
      console.warn('Could not fully reconcile TV watch history:', error);
    }
  }

  if (logFromAdd && !['tv','book','restaurant','recipe','class'].includes(sourceType) && !item.featureConfig?.repeatableLog) {
    const kind = sourceType === 'movie'
      ? 'movie-watched'
      : ['video-game','board-game'].includes(sourceType)
        ? 'game-played'
        : 'item-completed';
    addHistoryRecord({
      ...genericCompletionRecord(item, true),
      sourceType,
      date: logDate,
      showOnCalendar: true,
      kind,
      comment: item.comment || '',
      people: item.people || []
    });
    item.completedAt = item.completedAt || logDate;
    setItemQueueStatus(item, 'library');
    saveHistory();
  }

  recordTypeUse(item);
  refreshItemTypeOptions();
  saveItems();
  await deleteRemovedDraftAttachments();

  let buddyWatchError = null;
  if (startBuddyAfterSave && buddyFriendId && ['tv','movie','youtube'].includes(getSourceType(item))) {
    try {
      await createBuddyWatchForItem(item, buddyFriendId);
    } catch (error) {
      buddyWatchError = error;
      console.warn('[Buddy Watch] could not start after save:', error);
    }
  }

  els.itemModal.close();
  renderAll();
  if (buddyWatchError) {
    alert(`“${item.title}” was saved, but Buddy Watch could not be started: ${buddyWatchError?.message || 'Unknown error'}`);
  }
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

function normalizeStarRating(value) {
  const clamped = Math.max(0, Math.min(5, Number(value || 0)));
  return Math.round(clamped * 2) / 2;
}

function toggledStarRating(currentValue, selectedValue) {
  const current = normalizeStarRating(currentValue);
  const selected = normalizeStarRating(selectedValue);
  return current === selected ? 0 : selected;
}

function ratingFromStarPointer(event, button, dataAttribute) {
  const wholeStar = normalizeStarRating(button?.getAttribute(dataAttribute));
  if (!button || !wholeStar) return wholeStar;
  // Keyboard activation has no useful pointer position, so it selects the full star.
  if (event?.detail === 0 || !Number.isFinite(Number(event?.clientX)) || Number(event.clientX) <= 0) return wholeStar;
  const rect = button.getBoundingClientRect();
  if (!rect.width) return wholeStar;
  return Number(event.clientX) < rect.left + rect.width / 2 ? Math.max(0.5, wholeStar - 0.5) : wholeStar;
}

function setStarButtonFill(button, starValue, ratingValue) {
  const star = Number(starValue || 0);
  const rating = normalizeStarRating(ratingValue);
  const filled = rating >= star;
  const halfFilled = !filled && rating >= star - 0.5;
  button.classList.toggle('filled', filled);
  button.classList.toggle('half-filled', halfFilled);
}

function syncStarPicker(root, selector, dataAttribute, ratingValue) {
  root?.querySelectorAll(selector).forEach(button => {
    setStarButtonFill(button, button.getAttribute(dataAttribute), ratingValue);
  });
}

function starFillClass(starValue, ratingValue) {
  const star = Number(starValue || 0);
  const rating = normalizeStarRating(ratingValue);
  if (rating >= star) return 'filled';
  if (rating >= star - 0.5) return 'half-filled';
  return '';
}

function chooseRating(event) {
  const button = event.target.closest('[data-rating]');
  if (!button) return;
  const selected = ratingFromStarPointer(event, button, 'data-rating');
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
  const rating = normalizeStarRating(value);
  els.itemRating.value = String(rating);
  syncStarPicker(els.starPicker, '[data-rating]', 'data-rating', rating);
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

function attachmentCoverIdForItem(item) {
  // User attachments should remain visible inside the item, not become its Library cover.
  return '';
}

function displayImageForItem(item) {
  const direct = String(item?.image || '').trim();
  if (direct) return direct;
  const id = attachmentCoverIdForItem(item);
  return id ? (attachmentCoverObjectUrls.get(id) || '') : '';
}

async function ensureAttachmentCoverUrl(item) {
  const id = attachmentCoverIdForItem(item);
  if (!id) return '';
  if (attachmentCoverObjectUrls.has(id)) return attachmentCoverObjectUrls.get(id);
  const record = await getAttachmentBlob(id);
  if (!record?.blob) return '';
  const url = URL.createObjectURL(record.blob);
  attachmentCoverObjectUrls.set(id, url);
  return url;
}

function hydrateAttachmentCoverImages(root = document) {
  root?.querySelectorAll?.('img[data-cover-attachment-id]:not([data-cover-ready])').forEach(img => {
    const id = img.dataset.coverAttachmentId || '';
    const item = findItem(img.closest?.('[data-library-item-id]')?.dataset?.libraryItemId || '');
    const ready = id && attachmentCoverObjectUrls.get(id);
    if (ready) { img.src = ready; img.dataset.coverReady = 'true'; return; }
    if (!item) return;
    ensureAttachmentCoverUrl(item).then(url => {
      if (!url || !img.isConnected) return;
      img.src = url;
      img.dataset.coverReady = 'true';
    }).catch(() => {});
  });
}

const LOADING_TIPS = [
  () => {
    const city = state.discoverPrefs?.eventCity || state.settings?.homeCity || 'your city';
    return `Add artists to your Library and their upcoming concerts in ${city} can appear in your Calendar.`;
  },
  () => 'Use Collections to group items from different types into one shelf.',
  () => 'A half-star works too: tap the left half of a star to save a .5 rating.',
  () => 'Add a date when you log something and Omni can use it for Calendar and Recent sorting.',
  () => 'For TV, logging an episode can spot friends watching the same show and offer a Buddy Watch.'
];

function loadingTipText() {
  const tips = LOADING_TIPS.map(tip => typeof tip === 'function' ? tip() : String(tip));
  const index = Math.abs(Math.floor(Date.now() / 5000)) % tips.length;
  return tips[index] || '';
}

function loadingMarkup(label = 'Loading…') {
  return `<div class=\"loading-with-tip\"><p class=\"loading-tip\"><strong>Tip</strong> ${escapeHtml(loadingTipText())}</p></div>`;
}

function repeatLogEntries(item) {
  return (state.history || []).filter(entry => entry.sourceItemId === item?.id && entry.kind === 'repeatable-log')
    .sort((a,b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
}

function ensureRepeatLogModal() {
  let modal = $('#repeatLogModal');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'repeatLogModal';
  modal.className = 'modal small-modal repeat-log-modal';
  modal.innerHTML = `<button class="modal-x" type="button" data-close="repeatLogModal" aria-label="Close">×</button><div class="modal-heading"><p class="modal-eyebrow">ADD LOG</p><h2 id="repeatLogModalTitle">Add log</h2></div><form id="repeatLogForm"><input id="repeatLogItemId" type="hidden"/><label class="field"><span>Entry name <em>optional</em></span><input id="repeatLogTitle" type="text" placeholder="e.g. Evening session"/></label><div class="rating-date-grid"><fieldset class="rating-fieldset"><legend>Rating</legend><div id="repeatLogRatingPicker" class="star-picker">${[1,2,3,4,5].map(value => `<button type="button" data-repeat-log-rating="${value}" aria-label="${value} stars">★</button>`).join('')}<button class="clear-rating" type="button" data-repeat-log-clear>clear</button></div><input id="repeatLogRating" type="hidden" value="0"/></fieldset><label class="field"><span>Date</span><input id="repeatLogDate" type="date" required/></label></div><label class="field"><span>Comment <em>optional</em></span><textarea id="repeatLogComment" rows="2"></textarea></label><label class="field"><span>Note to self <em>optional</em></span><textarea id="repeatLogNote" rows="2"></textarea></label><div class="modal-actions"><button class="quiet-button" type="button" data-close="repeatLogModal">Cancel</button><div class="actions-right"><button class="primary-button" type="submit">Add log</button></div></div></form>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    const star = event.target.closest('[data-repeat-log-rating]');
    if (star) {
      const value = ratingFromStarPointer(event, star, 'data-repeat-log-rating');
      $('#repeatLogRating').value = String(value);
      syncStarPicker($('#repeatLogRatingPicker'), '[data-repeat-log-rating]', 'data-repeat-log-rating', value);
      return;
    }
    if (event.target.closest('[data-repeat-log-clear]')) {
      $('#repeatLogRating').value = '0';
      syncStarPicker($('#repeatLogRatingPicker'), '[data-repeat-log-rating]', 'data-repeat-log-rating', 0);
    }
  });
  modal.querySelector('#repeatLogForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const item = findItem($('#repeatLogItemId')?.value || '');
    if (!item) return;
    addHistoryRecord({
      sourceItemId:item.id, sourceType:getSourceType(item), type:item.type, typeLabel:getItemTypeLabel(item), subcategory:item.subcategory || '',
      date:$('#repeatLogDate')?.value || todayString(), showOnCalendar:true, kind:'repeatable-log',
      title:cleanTypeLabel($('#repeatLogTitle')?.value || '') || item.title, subtitle:item.title,
      notes:String($('#repeatLogNote')?.value || '').trim(), comment:String($('#repeatLogComment')?.value || '').trim(),
      rating:Number($('#repeatLogRating')?.value || 0), image:item.image || '', provider:item.provider, providerId:item.providerId
    });
    saveHistory(); saveItems(); renderAll(); modal.close();
    if (els.detailModal?.open && state.openDetailId === item.id) openDetails(item.id);
  });
  return modal;
}

function openRepeatLogModal(item) {
  const modal = ensureRepeatLogModal();
  $('#repeatLogItemId').value = item.id;
  $('#repeatLogModalTitle').textContent = item.title;
  $('#repeatLogTitle').value = '';
  $('#repeatLogDate').value = todayString();
  $('#repeatLogComment').value = '';
  $('#repeatLogNote').value = '';
  $('#repeatLogRating').value = '0';
  syncStarPicker($('#repeatLogRatingPicker'), '[data-repeat-log-rating]', 'data-repeat-log-rating', 0);
  showDialogAtTop(modal);
}

function appendRepeatLogHistory(item) {
  if (!item?.featureConfig?.repeatableLog || !els.detailBody || els.detailBody.querySelector('[data-repeat-log-history]')) return;
  const entries = repeatLogEntries(item);
  const section = document.createElement('section');
  section.className = 'detail-section repeat-log-history-section';
  section.dataset.repeatLogHistory = 'true';
  section.innerHTML = `<div class="detail-section-heading"><div><h3>Logs</h3><p class="detail-meta">Separate dated entries for ${escapeHtml(item.title)}.</p></div><button class="secondary-button" type="button" data-add-repeat-log="${escapeAttr(item.id)}">+ Add log</button></div><div class="repeat-log-history-list">${entries.length ? entries.map(entry => `<article class="repeat-log-history-row"><div><strong>${escapeHtml(entry.title || item.title)}</strong><small>${escapeHtml(entry.date ? formatLongDate(entry.date) : 'Undated')}${Number(entry.rating || 0) ? ` · ★ ${escapeHtml(formatPersonalRating(entry.rating))}` : ''}</small>${entry.comment ? `<p>${escapeHtml(entry.comment)}</p>` : ''}</div><div class="repeat-log-row-actions"><button class="quiet-button" type="button" data-edit-repeat-history="${escapeAttr(entry.id)}">Edit</button><button class="quiet-button danger-text" type="button" data-delete-repeat-history="${escapeAttr(entry.id)}">Delete</button></div></article>`).join('') : '<p class="detail-meta">No logs yet.</p>'}</div>`;
  els.detailBody.appendChild(section);
}

function appendRepeatReminderControls(item) {
  if (!item?.reminder || getSourceType(item) === 'reminder' || !els.detailBody) return;
  if (els.detailBody.querySelector('[data-repeat-reminder-controls]')) return;
  const dueDate = getNextReminderDueDate(item);
  const dueNow = !dueDate || dueDate <= todayString();
  const section = document.createElement('section');
  section.className = 'detail-section repeat-reminder-controls';
  section.dataset.repeatReminderControls = 'true';
  section.innerHTML = `<div class="detail-section-heading"><div><h3>Repeat</h3><p class="detail-meta">${escapeHtml(reminderScheduleLabel(item))}${dueDate ? ` · next ${escapeHtml(formatLongDate(dueDate))}` : ''}</p></div><button class="secondary-button" type="button" data-reminder-complete="${escapeAttr(item.id)}" ${dueNow ? '' : 'disabled'}>${dueNow ? '✓ Done this time' : 'Not due yet'}</button></div>`;
  const actions = els.detailBody.querySelector('.library-detail-actions, .detail-actions');
  if (actions) actions.insertAdjacentElement('afterend', section);
  else els.detailBody.appendChild(section);
}

// ---------------------------
// DETAILS
// ---------------------------
async function openDetails(id) {
  const item = findItem(id);
  if (!item) return;
  state.openDetailId = id;
  els.detailBody.innerHTML = loadingMarkup('Loading details…');
  showDialogAtTop(els.detailModal);

  try {
    await ensureAttachmentCoverUrl(item).catch(() => '');
    const sourceType = getSourceType(item);
    if (sourceType === 'tv') await renderTVDetails(item);
    else if (sourceType === 'youtube') { if (isYouTubePlaylistItem(item)) await renderWorkoutDetails(item); else await renderStandaloneYouTubeDetails(item); }
    else if (sourceType === 'book') await renderBookDetails(item);
    else if (sourceType === 'movie') await renderMovieDetails(item);
    else if (['video-game','board-game'].includes(sourceType)) await renderGameDetails(item);
    else if (sourceType === 'music') await renderMusicDetails(item);
    else if (sourceType === 'artist') await renderArtistDetails(item);
    else if (sourceType === 'song') await renderSongDetails(item);
    else if (sourceType === 'reminder') renderReminderDetails(item);
    else if (['event', 'concert'].includes(sourceType)) await renderEventDetails(item);
    else if (sourceType === 'restaurant') await renderRestaurantDetails(item);
    else if (sourceType === 'place') await renderPlaceDetails(item);
    else if (sourceType === 'activity') renderActivityDetails(item);
    else if (sourceType === 'class') renderClassDetails(item);
    else renderManualDetails(item);
    appendFlexibleFeatureProgress(item);
    appendRepeatReminderControls(item);
    appendRepeatLogHistory(item);
    appendLibraryReleaseDateSummary(item);
    appendLibraryDateSummary(item);
    appendLibraryPeopleSummary(item);
    appendLibraryPersonalMetadata(item);
    await appendSocialFollowerContext(item, () => state.openDetailId === item.id && Boolean(els.detailModal?.open));
    await appendLibrarySimilarRecommendations(item);
    appendItemResources(item);
  } catch (error) {
    els.detailBody.innerHTML = `${basicDetailHero(item)}<div class="api-error">${escapeHtml(error.message)}</div>${detailEditButton(item)}`;
    appendFlexibleFeatureProgress(item);
    appendRepeatReminderControls(item);
    appendRepeatLogHistory(item);
    appendLibraryReleaseDateSummary(item);
    appendLibraryDateSummary(item);
    appendLibraryPeopleSummary(item);
    appendLibraryPersonalMetadata(item);
    await appendSocialFollowerContext(item, () => state.openDetailId === item.id && Boolean(els.detailModal?.open));
    appendItemResources(item);
  }
}

async function renderTVDetails(item) {
  const [details, availability] = await Promise.all([
    getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings)),
    getItemStreamingAvailability(item).catch(() => ({ providers: [], link: '' }))
  ]);
  const detailGenres = (details.genres || []).map(genre => genre.name).filter(Boolean);
  const mergedDetailGenres = [...new Set([...(item.genres || []), ...detailGenres])];
  const metadataChanged = (detailGenres.length && JSON.stringify(item.genres || []) !== JSON.stringify(mergedDetailGenres)) || (details.first_air_date && item.releaseDate !== details.first_air_date);
  if (detailGenres.length) item.genres = mergedDetailGenres;
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
  const streamingNames = streamingAvailabilityLabel(availability, 3, '');
  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:'TV', title:details.name || item.title, image:TrackerAPI.tmdbImage(details.poster_path) || item.image, subtitle:[details.first_air_date?.slice(0,4), details.genres?.map(g=>g.name).join(' · '), streamingNames].filter(Boolean).join(' · '), overview:details.overview || '', availabilityLink: availability?.link || '' })}
    <div class="tv-status-row">${tvStatusBadgeMarkup(item, details)}</div>
    <div class="detail-progress"><strong>${hasUnwatched ? 'Up next' : 'Progress'}</strong>${hasUnwatched && next ? `S${seasonNumber} E${episodeNumber} · ${escapeHtml(next.name || 'Episode')}` : hasUnwatched ? `S${seasonNumber} E${episodeNumber}` : isTerminalSeriesStatus(details.status) ? 'All available episodes watched.' : 'Caught up.'}</div>
    ${tvDetailControls(item)}
    <section class="detail-section"><div class="detail-section-heading"><h3>Seasons</h3></div><div class="season-list season-list-rows">${seasons || '—'}</div></section>
  `;
}

async function renderTVSeasonDetail(item, seasonNumber) {
  els.detailBody.innerHTML = loadingMarkup('Loading season…');
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
      ${libraryDetailHero({
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
  els.detailBody.innerHTML = loadingMarkup('Loading episode…');
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
      ${libraryDetailHero({
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
        <button class="episode-check-button${isLogged ? ' is-checked' : ''}" type="button" data-check-youtube-video="${escapeAttr(video.videoId)}" data-item-id="${item.id}" aria-pressed="${isLogged}" aria-label="${isLogged ? `Mark ${escapeAttr(video.title)} not watched` : `Mark ${escapeAttr(video.title)} watched`}">✓</button>
        <button class="detail-arrow-button" type="button" data-youtube-video="${escapeAttr(video.videoId)}" data-item-id="${item.id}" aria-label="Open ${escapeAttr(video.title)}">→</button>
      </div>
    </div>`;
  }).join('');

  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:`${getItemTypeLabel(item).toUpperCase()} · YOUTUBE`, title:playlist.title || item.title, image:playlist.image || item.image, subtitle:`${playlist.items.length} videos · ${playlist.subtitle || ''}`, overview:playlist.description || '' })}
    <div class="detail-progress"><strong>Progress</strong>${Math.min(index, playlist.items.length)} of ${playlist.items.length} completed</div>
    ${detailEditButton(item)}
    <section class="detail-section"><h3>Playlist</h3><div class="video-list">${videos || 'No public videos found.'}</div></section>
  `;
}

async function renderYouTubeVideoDetail(item, videoId) {
  els.detailBody.innerHTML = loadingMarkup('Loading video…');
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
      ${libraryDetailHero({ type:`${getItemTypeLabel(item).toUpperCase()} · YOUTUBE VIDEO`, title:snippet.title || 'Video', image, subtitle:meta, overview:snippet.description || '' })}
      <div class="detail-actions library-detail-actions">
        <button class="primary-button" type="button" data-check-youtube-video="${escapeAttr(videoId)}" data-item-id="${item.id}" aria-pressed="${isYouTubeVideoLogged(item, videoId)}">${isYouTubeVideoLogged(item, videoId) ? '✓ Mark not watched' : '✓ Mark watched'}</button>
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
    ${libraryDetailHero({ type:'BOOK', title:info.title || item.title, image, subtitle:(info.authors || []).join(', '), overview:stripHtml(info.description || '') })}
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
  const streamingNames = streamingAvailabilityLabel(availability, 3, '');
  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:'MOVIE', title:details.title || item.title, image:TrackerAPI.tmdbImage(details.poster_path) || item.image, subtitle:[details.release_date?.slice(0,4), details.runtime ? `${details.runtime} min` : '', details.genres?.map(g=>g.name).join(' · '), streamingNames].filter(Boolean).join(' · '), overview:details.overview || '', availabilityLink: availability?.link || '' })}
    ${item.mediaDisposition ? `<div class="tv-status-row"><span class="tv-status-badge tv-status-${item.mediaDisposition === 'paused' ? 'later' : 'muted'}">${item.mediaDisposition === 'paused' ? 'Paused' : 'Stopped'}</span></div>` : ''}
    ${detailEditButton(item)}
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
    description: '',
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
    ${libraryDetailHero({ type:getSourceType(item) === 'concert' ? 'CONCERT' : 'EVENT', title:event.title || item.title, image:event.image || item.image, subtitle:dateLine, overview:event.description || '' })}
    ${detailEditButton(item)}
    <section class="detail-section event-detail-section"><h3>Event details</h3>
      ${info ? `<p>${escapeHtml(info)}</p>` : ''}
      ${event.address ? `<p class="detail-meta">${escapeHtml(event.address)}</p>` : ''}
      ${event.ticketUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(event.ticketUrl)}" target="_blank" rel="noopener">Tickets / event page ↗</a>` : ''}
    </section>`;
}

async function renderGameDetails(item) {
  const sourceType = getSourceType(item);
  const details = sourceType === 'board-game'
    ? await getCached(`board-game:${item.providerId}`, () => TrackerAPI.getBoardGameDetails(item.providerId, state.settings))
    : await getCached(`video-game:${item.providerId}`, () => TrackerAPI.getVideoGameDetails(item.providerId, state.settings));
  const game = details || item;
  const meta = sourceType === 'board-game'
    ? [game.minPlayers && game.maxPlayers ? `${game.minPlayers}–${game.maxPlayers} players` : '', game.playTime ? `${game.playTime} min` : '', game.catalogueRating ? `★ ${Number(game.catalogueRating).toFixed(1)}` : ''].filter(Boolean).join(' · ')
    : [...(game.platforms || []).slice(0,3), game.catalogueRating ? `★ ${Number(game.catalogueRating).toFixed(0)}` : ''].filter(Boolean).join(' · ');
  els.detailBody.innerHTML = `${libraryDetailHero({ type: sourceType === 'board-game' ? 'BOARD GAME' : 'VIDEO GAME', title:game.title || item.title, image:game.image || item.image || '', subtitle:meta || game.subtitle || item.subtitle || '', overview:game.description || '' })}${detailEditButton(item)}${game.genres?.length ? `<section class="detail-section"><h3>Genres</h3><p>${escapeHtml(game.genres.join(' · '))}</p></section>` : ''}${sourceType === 'board-game' && game.mechanics?.length ? `<section class="detail-section"><h3>Mechanics</h3><p>${escapeHtml(game.mechanics.join(' · '))}</p></section>` : ''}`;
}

async function renderDiscoverGameDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const details = result.sourceType === 'board-game'
    ? await TrackerAPI.getBoardGameDetails(result.providerId, state.settings)
    : await TrackerAPI.getVideoGameDetails(result.providerId, state.settings);
  const game = details || result;
  const meta = result.sourceType === 'board-game'
    ? [game.minPlayers && game.maxPlayers ? `${game.minPlayers}–${game.maxPlayers} players` : '', game.playTime ? `${game.playTime} min` : '', game.catalogueRating ? `★ ${Number(game.catalogueRating).toFixed(1)}` : ''].filter(Boolean).join(' · ')
    : [...(game.platforms || []).slice(0,3), game.catalogueRating ? `★ ${Number(game.catalogueRating).toFixed(0)}` : ''].filter(Boolean).join(' · ');
  els.detailBody.innerHTML = `${detailHero({ type: result.sourceType === 'board-game' ? 'BOARD GAME' : 'VIDEO GAME', title:game.title || result.title, image:game.image || result.image || '', subtitle:meta || game.subtitle || result.subtitle || '', overview:game.description || result.description || '' })}<div class="discover-detail-actions">${discoverQueueButtonsMarkup(result, key)}<button class="secondary-button${isDiscoverCompleted(result) ? ' is-complete' : ''}" type="button" data-discover-complete="${escapeAttr(key)}">${isDiscoverCompleted(result) ? '↶ Undo played' : '✓ Played'}</button></div>${game.genres?.length ? `<section class="detail-section"><h3>Genres</h3><p>${escapeHtml(game.genres.join(' · '))}</p></section>` : ''}`;
}

async function renderMusicDetails(item) {
  const data = await getCached(`music:${item.providerId}`, () => TrackerAPI.getMusicDetails(item.providerId, state.settings));
  const collection = (data.results || []).find(r => r.wrapperType === 'collection') || (data.results || [])[0] || {};
  const tracks = (data.results || []).filter(r => r.wrapperType === 'track').map((track, index) => `<div class="track-row"><div>${index+1}</div><div><div class="list-title">${escapeHtml(track.trackName || 'Track')}</div><div class="list-meta">${escapeHtml(track.artistName || '')}</div></div><div>${track.trackTimeMillis ? formatMillis(track.trackTimeMillis) : ''}</div></div>`).join('');
  const image = (collection.artworkUrl100 || item.image || '').replace('100x100bb','600x600bb');
  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:'ALBUM', title:collection.collectionName || item.title, image, subtitle:collection.artistName || item.subtitle || '', overview:collection.primaryGenreName || '' })}
    ${detailEditButton(item)}
    ${collection.collectionViewUrl ? `<section class="detail-section artist-open-music"><a class="secondary-button detail-link-button" href="${escapeAttr(collection.collectionViewUrl)}" target="_blank" rel="noopener">Open album in Apple Music ↗</a></section>` : ''}
    <section class="detail-section"><h3>Tracks</h3><div class="track-list">${tracks || 'No tracks returned.'}</div></section>
  `;
}

function artistFavoritesFor(item, kind) {
  const source = item?.artistFavorites && typeof item.artistFavorites === 'object' ? item.artistFavorites : {};
  return Array.isArray(source[kind]) ? source[kind] : [];
}

function artistFavoriteId(entry = {}) {
  return String(entry.id || entry.collectionId || entry.trackId || '').trim();
}

function artistFavoriteIsSaved(item, kind, id) {
  const target = String(id || '');
  return artistFavoritesFor(item, kind).some(entry => artistFavoriteId(entry) === target);
}

function toggleArtistFavorite(item, payload = {}) {
  const kind = payload.kind === 'song' ? 'songs' : 'albums';
  const id = String(payload.id || '');
  if (!id) return;
  const favorites = {
    albums: [...artistFavoritesFor(item, 'albums')],
    songs: [...artistFavoritesFor(item, 'songs')]
  };
  const index = favorites[kind].findIndex(entry => artistFavoriteId(entry) === id);
  if (index >= 0) favorites[kind].splice(index, 1);
  else favorites[kind].unshift({ ...payload, id });
  item.artistFavorites = favorites;
  item.updatedAt = new Date().toISOString();
}

function mergeArtistCatalogWithFavorites(current, saved, idGetter) {
  const output = [];
  const seen = new Set();
  for (const entry of [...saved, ...current]) {
    const id = String(idGetter(entry) || artistFavoriteId(entry));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(entry);
  }
  return output;
}

function artistFavoriteButtonMarkup(item, payload) {
  const kind = payload.kind === 'song' ? 'songs' : 'albums';
  const selected = artistFavoriteIsSaved(item, kind, payload.id);
  return `<button class="artist-favorite-button${selected ? ' is-favorite' : ''}" type="button" data-artist-item-id="${escapeAttr(item.id)}" data-artist-favorite="${escapeAttr(encodeURIComponent(JSON.stringify(payload)))}" aria-label="${selected ? 'Remove from' : 'Add to'} favorite ${payload.kind === 'song' ? 'songs' : 'albums'}">♥</button>`;
}

function artistAlbumRowMarkup(item, album, { discover = false } = {}) {
  const id = String(album.collectionId || album.id || '');
  const title = album.collectionName || album.title || 'Album';
  const year = String(album.releaseDate || album.year || '').slice(0, 4);
  const image = album.artworkUrl100 || album.image || '';
  const url = album.collectionViewUrl || album.url || '';
  const favorite = !discover && item ? artistFavoriteButtonMarkup(item, { kind:'album', id, title, year, image, url }) : '';
  return `<article class="artist-album-entry" data-artist-album-entry="${escapeAttr(id)}">
    <button class="artist-album-toggle" type="button" data-artist-album-toggle="${escapeAttr(id)}" data-artist-owner-id="${escapeAttr(item?.id || '')}" aria-expanded="false">
      ${image ? `<img src="${escapeAttr(image.replace('100x100bb','160x160bb'))}" alt="" />` : '<span class="artist-album-placeholder">♪</span>'}
      <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(year)}</small></span><b aria-hidden="true">⌄</b>
    </button>
    <div class="artist-catalog-actions">${url ? `<a class="artist-music-link" href="${escapeAttr(url)}" target="_blank" rel="noopener">↗ Music</a>` : ''}${favorite}</div>
    <div class="artist-album-tracks" data-artist-album-tracks="${escapeAttr(id)}" hidden></div>
  </article>`;
}

function artistAlbumTracksMarkup(item, tracks = []) {
  if (!tracks.length) return '<p class="detail-meta">No tracks returned.</p>';
  return tracks.map((song, index) => {
    const id = String(song.trackId || '');
    const title = song.trackName || 'Song';
    const url = song.trackViewUrl || '';
    const payload = { kind:'song', id, title, albumName:song.collectionName || '', image:song.artworkUrl100 || '', url };
    return `<div class="artist-album-track${item && artistFavoriteIsSaved(item, 'songs', id) ? ' is-favorite' : ''}"><span>${index + 1}</span><strong>${escapeHtml(title)}</strong>${song.trackTimeMillis ? `<small>${escapeHtml(formatMillis(song.trackTimeMillis))}</small>` : ''}<span class="artist-catalog-actions">${url ? `<a class="artist-music-link" href="${escapeAttr(url)}" target="_blank" rel="noopener">↗</a>` : ''}${item ? artistFavoriteButtonMarkup(item, payload) : ''}</span></div>`;
  }).join('');
}

async function toggleArtistAlbumTracks(button) {
  const albumId = String(button?.dataset?.artistAlbumToggle || '');
  if (!albumId) return;
  const entry = button.closest('[data-artist-album-entry]');
  const body = entry?.querySelector(`[data-artist-album-tracks="${CSS.escape(albumId)}"]`);
  if (!body) return;
  const opening = body.hidden;
  body.hidden = !opening;
  button.setAttribute('aria-expanded', String(opening));
  entry?.classList.toggle('is-open', opening);
  if (!opening || body.dataset.loaded === 'true') return;
  body.innerHTML = loadingMarkup('Loading tracks…');
  try {
    const tracks = await getCached(`album-tracks:${albumId}`, () => TrackerAPI.getAlbumTracks(albumId, state.settings));
    const item = findItem(button.dataset.artistOwnerId || '');
    body.innerHTML = artistAlbumTracksMarkup(item, tracks || []);
    body.dataset.loaded = 'true';
  } catch (error) {
    body.innerHTML = `<p class="api-error">${escapeHtml(error?.message || 'Could not load tracks.')}</p>`;
  }
}

async function renderArtistDetails(item) {
  const data = await getCached(`artist:v3:${item.providerId}`, () => TrackerAPI.getArtistDetails(item.providerId, state.settings));
  const artist = (data.results || []).find(result => result.wrapperType === 'artist') || {};
  const liveAlbums = (data.results || []).filter(result => result.wrapperType === 'collection');
  const savedAlbums = artistFavoritesFor(item, 'albums');
  const albums = mergeArtistCatalogWithFavorites(liveAlbums, savedAlbums, entry => entry.collectionId || entry.id);
  const image = (liveAlbums.find(album => album.artworkUrl100)?.artworkUrl100 || savedAlbums.find(album => album.image)?.image || item.image || '').replace('100x100bb', '600x600bb');
  if (!item.image && image) { item.image = image; saveItems(); }
  const artistUrl = artist.artistLinkUrl || artist.artistViewUrl || item.artistViewUrl || '';
  const albumRows = albums.slice(0, 24).map(album => artistAlbumRowMarkup(item, album)).join('');
  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:'ARTIST', title:artist.artistName || item.title, image, subtitle:artist.primaryGenreName || item.subtitle || '', overview:'' })}
    ${detailEditButton(item)}
    ${artistUrl ? `<section class="detail-section artist-open-music"><a class="secondary-button detail-link-button" href="${escapeAttr(artistUrl)}" target="_blank" rel="noopener">Open artist in Apple Music ↗</a></section>` : ''}
    <section class="detail-section"><div class="detail-section-heading"><h3>Albums</h3><span class="artist-favorite-hint">Open an album to see songs · ♥ saves favorites</span></div><div class="artist-album-list">${albumRows || '<p class="detail-meta">No albums returned.</p>'}</div></section>`;
}


async function renderSongDetails(item) {
  const data = await getCached(`song:${item.providerId}`, () => TrackerAPI.getSongDetails(item.providerId, state.settings));
  const track = (data.results || []).find(result => result.wrapperType === 'track') || (data.results || [])[0] || {};
  const image = (track.artworkUrl100 || item.image || '').replace('100x100bb', '600x600bb');
  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:'SONG', title:track.trackName || item.title, image, subtitle:[track.artistName || item.subtitle || '', track.collectionName || '', track.primaryGenreName || ''].filter(Boolean).join(' · '), overview:'' })}
    ${detailEditButton(item)}
    ${track.trackViewUrl ? `<section class="detail-section"><a class="secondary-button detail-link-button" href="${escapeAttr(track.trackViewUrl)}" target="_blank" rel="noopener">Open song in Apple Music ↗</a></section>` : ''}`;
}

function renderReminderDetails(item) {
  const dueDate = getNextReminderDueDate(item);
  const dueNow = !dueDate || dueDate <= todayString();
  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:getItemTypeLabel(item), title:item.title, image:'', subtitle:reminderScheduleLabel(item), overview:'' })}
    <div class="detail-progress"><strong>Next reminder</strong>${escapeHtml(reminderDueLabel(dueDate))}</div>
    <div class="detail-actions library-detail-actions">
      <button class="primary-button" type="button" data-reminder-complete="${escapeAttr(item.id)}" ${dueNow ? '' : 'disabled'}>✓ ${dueNow ? 'Mark complete' : 'Not due yet'}</button>
      ${libraryDetailActionContents(item)}
    </div>`;
}

async function renderPlaceDetails(item) {
  let live = item.placeMeta || null;
  if (item.provider === 'googlePlaces' && item.providerId && state.settings.googlePlacesKey) {
    try { live = await TrackerAPI.getPlaceDetails(item.providerId, state.settings, 'place'); }
    catch (error) { console.warn('Google Places details unavailable:', error?.message || error); }
  }
  if (live) item.placeMeta = { formattedAddress: live.formattedAddress || '', googleMapsUrl: live.googleMapsUrl || '', websiteUrl: live.websiteUrl || '', location: live.location || null };
  const ratingText = Number(live?.rating || 0) ? `${Number(live.rating).toFixed(1)}★` : '';
  els.detailBody.innerHTML = `${libraryDetailHero({ type:getItemTypeLabel(item).toUpperCase(), title:item.title, image:item.image || '', subtitle:[ratingText, live?.primaryTypeDisplayName || '', live?.formattedAddress || item.subtitle || ''].filter(Boolean).join(' · '), overview:'' })}${live ? '<div class="gmp-attribution detail-gmp-attribution" translate="no">Google Maps</div>' : ''}${detailEditButton(item)}${(live?.googleMapsUrl || live?.websiteUrl) ? `<section class="detail-section restaurant-links">${live.googleMapsUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(live.googleMapsUrl)}" target="_blank" rel="noopener">Map ↗</a>` : ''}${live.websiteUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(live.websiteUrl)}" target="_blank" rel="noopener">Website ↗</a>` : ''}</section>` : ''}`;
  if (live) saveItems();
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

  const visitsMarkup = visits.length
    ? visits.map(entry => `<article class="restaurant-history-row"><div><strong>${escapeHtml(formatLongDate(entry.date))}</strong>${entry.notes ? `<p>${escapeHtml(entry.notes)}</p>` : ''}</div>${Number(entry.rating || 0) ? `<span>${formatPersonalRating(entry.rating)}★</span>` : ''}</article>`).join('')
    : '<p class="detail-meta">No dated visits or orders logged yet. Edit this restaurant and add a date + notes to record one.</p>';

  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:'RESTAURANT', title:item.title, image:item.image || '', subtitle:[ratingText, live?.formattedAddress || ''].filter(Boolean).join(' · '), overview:'' })}
    ${live ? '<div class="gmp-attribution detail-gmp-attribution" translate="no">Google Maps</div>' : ''}
    ${detailEditButton(item)}
    <section class="detail-section restaurant-history-section"><h3>Order / visit history</h3>${visitsMarkup}</section>
    ${(live?.googleMapsUrl || live?.websiteUrl) ? `<section class="detail-section restaurant-links">${live.googleMapsUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(live.googleMapsUrl)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>` : ''}${live.websiteUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(live.websiteUrl)}" target="_blank" rel="noopener">Website ↗</a>` : ''}</section>` : ''}`;
}

function renderActivityDetails(item) {
  const startDate = item.activityMeta?.startDate || item.date || '';
  const endDate = item.activityMeta?.endDate || startDate;
  const dateText = startDate
    ? (endDate && endDate !== startDate ? `${formatLongDate(startDate)} – ${formatLongDate(endDate)}` : formatLongDate(startDate))
    : '';
  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:'ACTIVITY', title:item.title, image:displayImageForItem(item), subtitle:[dateText, item.subcategory || ''].filter(Boolean).join(' · '), overview:'' })}
    ${detailEditButton(item)}
  `;
}

function classHistoryEntries(item) {
  return state.history
    .filter(entry => entry.sourceItemId === item.id && entry.kind === 'class-attended')
    .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
}

function renderClassDetails(item) {
  const entries = classHistoryEntries(item);
  const rows = entries.length
    ? entries.map(entry => `<article class=\"class-history-row\">
        <div class=\"class-history-date\">${escapeHtml(entry.date ? formatShortCalendarDate(entry.date) : 'Undated')}</div>
        <div class=\"class-history-copy\"><strong>${escapeHtml(entry.title || 'Class')}</strong>${entry.notes ? `<span>${escapeHtml(entry.notes)}</span>` : ''}</div>
        <div class=\"class-history-rating\">${Number(entry.rating || 0) ? `★ ${escapeHtml(formatPersonalRating(entry.rating))}` : ''}</div>
      </article>`).join('')
    : '<p class=\"detail-meta\">No classes logged yet.</p>';
  els.detailBody.innerHTML = `
    ${libraryDetailHero({ type:'CLASSES', title:'Classes', image:displayImageForItem(item), subtitle:`${entries.length} ${entries.length === 1 ? 'class' : 'classes'} logged`, overview:'' })}
    <section class=\"detail-section class-history-section\"><div class=\"detail-section-heading\"><h3>Class history</h3><button class=\"secondary-button\" type=\"button\" data-add-class-log>+ Add class</button></div><div class=\"class-history-list\">${rows}</div></section>`;
}

function libraryRecommendationIdentity(result) {
  return `${result?.sourceType || ''}:${result?.provider || ''}:${result?.providerId || normalizeArtistName(result?.title || '')}`;
}

async function getLibrarySimilarRecommendations(item) {
  const sourceType = getSourceType(item);
  let results = [];
  try {
    if (['tv','movie'].includes(sourceType) && item.providerId) {
      results = await getCached(`library:similar:${sourceType}:${item.providerId}`, () => TrackerAPI.getTMDBRecommendations(sourceType, item.providerId, state.settings, 1));
    } else if (sourceType === 'book' && item.providerId) {
      results = await getCached(`library:similar:book:${item.providerId}`, () => TrackerAPI.getBookRecommendations(item.providerId, state.settings));
    } else if (sourceType === 'restaurant' && state.settings.googlePlacesKey) {
      const live = item.providerId ? await TrackerAPI.getRestaurantDetails(item.providerId, state.settings).catch(() => null) : null;
      const seed = live?.primaryTypeDisplayName || live?.primaryType || `restaurants like ${item.title}`;
      results = await TrackerAPI.searchRestaurants(seed, state.settings, {
        city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
        region: state.discoverPrefs.eventCountry || state.settings.homeCountry || 'CA',
        maxResultCount: 10
      });
    } else if (sourceType === 'artist' && state.settings.lastfmApiKey && item.title) {
      const similar = await getCached(`library:lastfm:artist:${normalizeArtistName(item.title)}`, () => TrackerAPI.getLastFmSimilarArtists(item.title, state.settings, 12));
      results = similar.map(lastFmArtistDiscoverCandidate).filter(Boolean);
    } else if (sourceType === 'song' && state.settings.lastfmApiKey && item.title) {
      const artistName = item.subtitle || item.artistName || '';
      if (artistName) {
        const similar = await getCached(`library:lastfm:song:${normalizeArtistName(artistName)}:${normalizeArtistName(item.title)}`, () => TrackerAPI.getLastFmSimilarTracks(artistName, item.title, state.settings, 12));
        results = similar.map(lastFmTrackDiscoverCandidate).filter(Boolean);
      }
    } else if (sourceType === 'music' && state.settings.lastfmApiKey && item.subtitle) {
      const artistName = item.subtitle;
      const similar = await getCached(`library:lastfm:album-artist:${normalizeArtistName(artistName)}`, () => TrackerAPI.getLastFmSimilarArtists(artistName, state.settings, 12));
      results = similar.map(lastFmArtistDiscoverCandidate).filter(Boolean);
    } else if (sourceType === 'concert' && state.settings.lastfmApiKey && item.title) {
      const similar = await getCached(`library:lastfm:concert:${normalizeArtistName(item.title)}`, () => TrackerAPI.getLastFmSimilarArtists(item.title, state.settings, 12));
      results = similar.map(lastFmArtistDiscoverCandidate).filter(Boolean);
    } else if (sourceType === 'event' && state.settings.ticketmasterKey) {
      const seed = (item.eventMeta?.classifications || []).find(Boolean) || item.title;
      results = await TrackerAPI.searchTicketmasterEvents(seed, state.settings, {
        city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
        countryCode: state.discoverPrefs.eventCountry || state.settings.homeCountry || 'CA',
        size: 10,
        sort: 'date,asc'
      });
    }
  } catch (error) {
    console.warn('[Library Recommendations] unavailable', { item: item.title, sourceType, error: error?.message || error });
    return [];
  }

  const currentIdentity = `${sourceType}:${item.provider || ''}:${item.providerId || ''}`;
  const saved = new Set(state.items.map(savedItem => `${getSourceType(savedItem)}:${savedItem.provider || ''}:${savedItem.providerId || ''}`));
  const unique = new Map();
  for (const result of results || []) {
    if (!result?.title) continue;
    const identity = libraryRecommendationIdentity(result);
    const savedIdentity = `${result.sourceType || ''}:${result.provider || ''}:${result.providerId || ''}`;
    if (identity === currentIdentity || saved.has(savedIdentity) || unique.has(identity)) continue;
    unique.set(identity, result);
  }
  const output = [...unique.values()].slice(0, 3);
  return output.length === 3 ? output : [];
}

function librarySimilarRecommendationsMarkup(item, results) {
  if (!results?.length) return '';
  const isRestaurant = getSourceType(item) === 'restaurant';
  return `<details class="detail-section library-similar-details" data-library-similar-section="${escapeAttr(item.id)}">
    <summary>I think you’d also like</summary>
    <div class="library-similar-grid">
      ${results.map(result => `<button class="library-similar-card" type="button" data-library-similar="${escapeAttr(JSON.stringify(result))}">
        ${result.image ? `<img src="${escapeAttr(result.image)}" alt="" />` : ''}
        <span><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml([result.rating ? `${Number(result.rating).toFixed(1)}★` : '', result.subtitle || result.primaryTypeDisplayName || ''].filter(Boolean).join(' · '))}</small></span>
      </button>`).join('')}
    </div>
    ${isRestaurant ? '<div class="gmp-attribution" translate="no">Google Maps</div>' : ''}
  </details>`;
}

async function appendLibrarySimilarRecommendations(item) {
  if (!els.detailBody || !item || els.detailBody.querySelector(`[data-library-similar-section="${CSS.escape(item.id)}"]`)) return;
  const results = await getLibrarySimilarRecommendations(item);
  if (!results.length || state.openDetailId !== item.id || !els.detailModal?.open) return;
  els.detailBody.insertAdjacentHTML('beforeend', librarySimilarRecommendationsMarkup(item, results));
}

function renderManualDetails(item) {
  els.detailBody.innerHTML = `${basicDetailHero({ ...item, image: displayImageForItem(item) })}${detailEditButton(item)}`;
}

function detailHero({ type, title, image, subtitle, overview, collapseOverview = false, availabilityLink = '' }) {
  const overviewText = overview ? escapeHtml(shorten(overview, 900)) : '';
  const disclosure = collapseOverview
    ? ((overviewText || availabilityLink) ? `<div class="detail-disclosure-row">
        ${overviewText ? `<details class="detail-synopsis-details">
          <summary>Synopsis</summary>
          <div class="detail-synopsis-content"><p class="detail-overview">${overviewText}</p></div>
        </details>` : ''}
        ${availabilityLink ? `<a class="detail-availability-link" href="${escapeAttr(availabilityLink)}" target="_blank" rel="noopener">See availability ↗</a>` : ''}
      </div>` : '')
    : (overviewText ? `<p class="detail-overview">${overviewText}</p>` : '');
  return `<div class="detail-hero">
    ${image ? `<img class="detail-poster" src="${escapeAttr(image)}" alt="" />` : '<div class="detail-poster"></div>'}
    <div><p class="detail-type">${escapeHtml(type)}</p><h2>${escapeHtml(title)}</h2>${subtitle ? `<p class="detail-meta">${escapeHtml(subtitle)}</p>` : ''}${disclosure}</div>
  </div>`;
}

function libraryDetailHero(args) {
  return detailHero({ ...args, collapseOverview: true });
}

function basicDetailHero(item) {
  return libraryDetailHero({ type: getItemTypeLabel(item), title:item.title, image:item.image, subtitle:item.subtitle || '', overview:'' });
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
  return `<button class="library-calendar-footnote${hidden ? ' is-hidden' : ''}" type="button" data-toggle-library-calendar="${escapeAttr(item.id)}">${hidden ? 'Show on calendar' : 'Remove from calendar'}</button>`;
}

function buddyWatchItemActionMarkup(item) {
  if (!item || !socialState.schemaReady || !socialState.profile || !['tv','movie','youtube'].includes(getSourceType(item))) return '';
  return `<button class="secondary-button buddy-watch-item-action" type="button" data-buddy-watch-item="${escapeAttr(item.id)}">Buddy Watch</button>`;
}

function mobileCollectionActionMarkup(item) {
  if (!item) return '';
  return `<button class="secondary-button library-detail-mobile-collection-button" type="button" data-library-add-album="${escapeAttr(item.id)}">+ Collection</button>`;
}

function libraryDetailActionContents(item, { leading = '', trailing = '' } = {}) {
  return `${leading}${queueMoveControls(item)}${buddyWatchItemActionMarkup(item)}${mobileCollectionActionMarkup(item)}${trailing}`;
}

function libraryDetailActions(item, { leading = '', trailing = '', className = '' } = {}) {
  const contents = libraryDetailActionContents(item, { leading, trailing });
  if (!contents) return '';
  const classes = ['detail-actions', 'library-detail-actions', className].filter(Boolean).join(' ');
  return `<div class="${classes}">${contents}</div>`;
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

  if (sourceType === 'activity') {
    const startDate = item.activityMeta?.startDate || item.date || '';
    const endDate = item.activityMeta?.endDate || startDate;
    if (startDate) {
      const value = endDate && endDate !== startDate
        ? `${formatLongDate(startDate)} – ${formatLongDate(endDate)}`
        : formatLongDate(startDate);
      return { label: 'Date', values: [value], extra: 0 };
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

function libraryPeopleSummaryMarkup(item) {
  const people = getItemPeople(item);
  if (!people.length) return '';
  return `<div class="library-detail-date-strip library-people-strip" data-library-people-summary="${escapeAttr(item.id)}"><span>With</span><strong>${escapeHtml(people.join(', '))}</strong></div>`;
}

function appendLibraryPeopleSummary(item) {
  if (!els.detailBody || !item || getSourceType(item) === 'book' || els.detailBody.querySelector(`[data-library-people-summary="${CSS.escape(item.id)}"]`)) return;
  const markup = libraryPeopleSummaryMarkup(item);
  if (!markup) return;
  const dateSummary = els.detailBody.querySelector(`[data-library-date-summary="${CSS.escape(item.id)}"]`);
  if (dateSummary) {
    dateSummary.insertAdjacentHTML('afterend', markup);
    return;
  }
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
  if (getSourceType(item) === 'class') {
    const count = classHistoryEntries(item).length;
    return `<div class="library-personal-meta library-class-meta" data-library-personal-meta="${escapeAttr(item.id)}"><div class="library-personal-meta-row"><span class="library-class-meta-count">${count} ${count === 1 ? 'class' : 'classes'} logged</span><button class="secondary-button library-personal-edit" type="button" data-add-class-log>+ Add class</button></div></div>`;
  }
  const rating = Math.max(0, Math.min(5, Number(item.rating || 0)));
  const calendarFootnote = libraryCalendarToggleButton(item);
  return `<div class="library-personal-meta" data-library-personal-meta="${escapeAttr(item.id)}" data-pending-rating="${rating}">
    <div class="library-personal-meta-row">
      <div class="star-picker library-detail-rating-picker rating-with-heart" aria-label="Your rating out of five stars">
        ${[1,2,3,4,5].map(value => `<button type="button" data-library-rating="${value}" data-item-id="${escapeAttr(item.id)}" class="${starFillClass(value, rating)}" aria-label="${value} star${value === 1 ? '' : 's'}">★</button>`).join('')}
        <button class="rating-heart-button${item.recommended ? ' is-recommended' : ''}" type="button" data-toggle-recommended="${escapeAttr(item.id)}" aria-label="${item.recommended ? 'Remove from Recommended' : 'Add to Recommended'}" aria-pressed="${Boolean(item.recommended)}" title="Recommended">${item.recommended ? '♥' : '♡'}</button>
        <button class="clear-rating" type="button" data-clear-library-rating data-item-id="${escapeAttr(item.id)}">clear</button>
      </div>
      <button class="secondary-button library-personal-edit" type="button" data-edit-id="${escapeAttr(item.id)}">Edit</button>
    </div>
    ${String(item.comment || '').trim() ? `<p class="library-public-comment"><strong>Comment</strong> ${escapeHtml(item.comment)}</p>` : ''}
    ${String(item.notes || '').trim() ? `<p class="library-personal-note"><strong>Note to self</strong> ${escapeHtml(item.notes)}</p>` : ''}
    ${calendarFootnote ? `<div class="library-personal-footnotes">${calendarFootnote}</div>` : ''}
    <span class="library-meta-status" aria-live="polite"></span>
  </div>`;
}

function appendLibraryPersonalMetadata(item) {
  if (!els.detailBody || !item || els.detailBody.querySelector(`[data-library-personal-meta="${CSS.escape(item.id)}"]`)) return;
  const markup = libraryPersonalMetadataMarkup(item);
  const disclosure = els.detailBody.querySelector('.detail-disclosure-row');
  if (disclosure) {
    disclosure.insertAdjacentHTML('afterend', markup);
    return;
  }
  const hero = els.detailBody.querySelector('.detail-hero');
  if (hero) hero.insertAdjacentHTML('afterend', markup);
  else els.detailBody.insertAdjacentHTML('afterbegin', markup);
}

function setLibraryPendingRating(itemId, value) {
  const section = els.detailBody?.querySelector(`[data-library-personal-meta="${CSS.escape(itemId)}"]`);
  if (!section) return;
  const rating = normalizeStarRating(value);
  section.dataset.pendingRating = String(rating);
  syncStarPicker(section, '[data-library-rating]', 'data-library-rating', rating);
}

function saveLibraryRating(itemId, value) {
  const item = findItem(itemId);
  const section = els.detailBody?.querySelector(`[data-library-personal-meta="${CSS.escape(itemId)}"]`);
  if (!item || !section) return;

  const rating = normalizeStarRating(value);
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

function prunePhotoUploadLog() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  state.photoUploadLog = (Array.isArray(state.photoUploadLog) ? state.photoUploadLog : []).filter(value => {
    const time = Date.parse(value);
    return Number.isFinite(time) && time >= cutoff;
  });
  safeLocalSet(PHOTO_UPLOAD_LOG_KEY, state.photoUploadLog);
}

function remainingWeeklyPhotos() {
  prunePhotoUploadLog();
  const pending = (state.attachmentDraft?.newFiles || []).filter(entry => String(entry.mime || '').startsWith('image/')).length;
  return Math.max(0, PHOTO_WEEKLY_LIMIT - state.photoUploadLog.length - pending);
}

function addDraftFiles(event) {
  const files = [...(event.target.files || [])];
  let photosLeft = remainingWeeklyPhotos();
  let blockedPhotos = 0;
  for (const file of files) {
    const isPhoto = String(file.type || '').startsWith('image/');
    if (isPhoto && photosLeft <= 0) {
      blockedPhotos += 1;
      continue;
    }
    if (isPhoto) photosLeft -= 1;
    state.attachmentDraft.newFiles.push({
      id: makeId(), file, name: file.name || 'File', mime: file.type || 'application/octet-stream', size: file.size || 0
    });
  }
  event.target.value = '';
  if (blockedPhotos) showFormMessage(`Photo limit: ${PHOTO_WEEKLY_LIMIT} per 7 days.`, true);
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
  syncItemAttachmentsDisclosure();
}

async function persistDraftAttachments() {
  const savedAt = new Date().toISOString();
  for (const entry of state.attachmentDraft.newFiles) {
    await putAttachmentBlob(entry.id, entry.file);
    if (String(entry.mime || '').startsWith('image/')) state.photoUploadLog.push(savedAt);
  }
  prunePhotoUploadLog();
  safeLocalSet(PHOTO_UPLOAD_LOG_KEY, state.photoUploadLog);
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

  const images = attachments.filter(file => String(file.mime || '').startsWith('image/'));
  const otherFiles = attachments.filter(file => !String(file.mime || '').startsWith('image/'));
  const section = document.createElement('section');
  section.className = 'detail-section resources-section';
  section.innerHTML = `
    <h3>Files & links</h3>
    ${images.length ? `<div class="resource-image-grid">${images.map(file => `
      <button class="resource-image-card" type="button" data-attachment-id="${escapeAttr(file.id)}" aria-label="Open ${escapeAttr(file.name)}">
        <span class="resource-image-loading" data-inline-attachment-id="${escapeAttr(file.id)}">Photo</span>
      </button>`).join('')}</div>` : ''}
    ${otherFiles.length ? `<div class="resource-grid">${otherFiles.map(file => `
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
  hydrateInlineAttachmentImages(section);
}

function hydrateInlineAttachmentImages(root) {
  root?.querySelectorAll?.('[data-inline-attachment-id]').forEach(async placeholder => {
    const id = String(placeholder.dataset.inlineAttachmentId || '');
    if (!id) return;
    try {
      let url = attachmentCoverObjectUrls.get(id) || '';
      if (!url) {
        const record = await getAttachmentBlob(id);
        if (!record?.blob || !String(record.blob.type || '').startsWith('image/')) return;
        url = URL.createObjectURL(record.blob);
        attachmentCoverObjectUrls.set(id, url);
      }
      if (!placeholder.isConnected) return;
      const img = document.createElement('img');
      img.className = 'resource-inline-image';
      img.src = url;
      img.alt = '';
      placeholder.replaceWith(img);
    } catch {}
  });
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
function getCalendarEntries(options = {}) {
  const respectVisibility = options?.respectVisibility !== false;
  const savedItems = state.items
    .filter(item => {
      const sourceType = getSourceType(item);
      if (!item.date || ['book','activity'].includes(sourceType) || (respectVisibility && item.calendarHidden)) return false;
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
    .filter(item => getSourceType(item) === 'book' && (!respectVisibility || !item.calendarHidden))
    .flatMap(item => bookReadingCalendarEntries(item));

  const activityRanges = state.items
    .filter(item => getSourceType(item) === 'activity' && (!respectVisibility || !item.calendarHidden))
    .flatMap(item => activityCalendarEntries(item));

  const historyEntries = state.history.filter(entry => {
    if (respectVisibility && entry.showOnCalendar === false) return false;
    const source = entry.sourceItemId ? findItem(entry.sourceItemId) : null;
    if (respectVisibility && source?.calendarHidden) return false;
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

  return [...savedItems, ...historyEntries, ...bookRanges, ...activityRanges]
    .filter(entry => !respectVisibility || isCalendarTypeVisible(entry.type));
}

function activityCalendarEntries(item) {
  const start = item.activityMeta?.startDate || item.date || '';
  const endDate = item.activityMeta?.endDate || start;
  if (!start || !endDate || endDate < start) return [];
  const output = [];
  let cursor = parseLocalDate(start);
  const end = parseLocalDate(endDate);
  let guard = 0;
  while (cursor <= end && guard < 3660) {
    const date = localDateString(cursor);
    output.push({
      id: `activity-range:${item.id}:${date}`,
      sourceItemId: item.id,
      sourceType: 'activity',
      type: item.type,
      typeLabel: getItemTypeLabel(item),
      subcategory: item.subcategory || '',
      date,
      kind: 'activity-day',
      title: item.title,
      subtitle: getItemPeople(item).length ? `with ${getItemPeople(item).join(', ')}` : (item.subtitle || ''),
      notes: item.notes || '',
      rating: Number(item.rating || 0),
      image: item.image || '',
      provider: 'manual',
      providerId: item.providerId || '',
      createdAt: item.createdAt || item.updatedAt || ''
    });
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return output;
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
  applyCalendarTheme();
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
    : (() => {
        const defaults = new Map();
        ['workout', 'tv', 'book', 'movie'].filter(isCalendarTypeVisible).forEach(type => {
          const entry = { type, typeLabel: getTypeLabel(type) };
          const key = getCalendarTypeGroupKey(entry);
          if (!defaults.has(key)) {
            defaults.set(key, {
              key,
              label: getCalendarTypeGroupLabel(entry),
              representativeType: type,
              representativeEntry: entry
            });
          }
        });
        return [...defaults.values()];
      })();

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
        button.className = 'sticker-button sticker-group-button month-sticker-group-button';
        button.dataset.groupKey = group.key;
        button.dataset.date = date;
        button.title = eventMatches.length === 1 ? first.title : `${eventMatches.length} ${group.label} entries`;
        button.innerHTML = eventMatches.length === 1
          ? calendarStickerMarkup(first.type, first)
          : monthStickerPileMarkup(eventMatches, date, group.key);
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


function monthStickerPileMarkup(entries = [], date = '', groupKey = '') {
  const visibleEntries = (entries || []).slice(0, 7);
  return `<span class="month-sticker-pile" aria-hidden="true">${visibleEntries.map((entry, index) => {
    const position = monthStickerPilePosition(entry, index, date, groupKey);
    return `<span class="month-sticker-pile-item" style="--month-pile-x:${position.x}px; --month-pile-y:${position.y}px; --month-pile-rotate:${position.rotate}deg; --month-pile-z:${position.z};">${calendarStickerMarkup(entry.type, entry)}</span>`;
  }).join('')}</span>`;
}

function monthStickerPilePosition(entry, index, date, groupKey) {
  const seed = stableCalendarHash(`${date}:${groupKey}:${entry?.id || entry?.sourceItemId || entry?.title || entry?.type || 'entry'}:${index}:month`);
  const xBase = [-8, 4, -2, 8, -10, 1, 10][index] ?? 0;
  const yBase = [2, -3, 6, 4, -5, -7, 0][index] ?? 0;
  const x = xBase + ((seed % 5) - 2);
  const y = yBase + ((Math.floor(seed / 5) % 5) - 2);
  const rotate = ((Math.floor(seed / 25) % 17) - 8);
  return { x, y, rotate, z: 10 + index };
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

function defaultCalendarGroupId(type) {
  if (type === 'tv' || type === 'movie') return 'default:tv-movie';
  return `type:${String(type || 'other')}`;
}

function getCalendarGroupId(type) {
  const saved = state.stickerPrefs?.[type] || {};
  const explicit = String(saved.calendarGroup || '').trim();
  if (explicit) return explicit;
  // Preserve row groupings created by the earlier name-based Rows UI.
  const legacy = cleanTypeLabel(saved.calendarRow || '');
  if (legacy) return `legacy:${slugifyType(legacy)}`;
  return defaultCalendarGroupId(type);
}

function isCalendarTypeVisible(type) {
  return state.stickerPrefs?.[type]?.calendarVisible !== false;
}

function calendarGroupMemberTypes(groupId) {
  return getRecognizedTypes().filter(({ type }) => isCalendarTypeVisible(type) && getCalendarGroupId(type) === groupId);
}

function calendarGroupDisplayLabel(groupId, fallbackType = '', fallbackLabel = '') {
  const members = calendarGroupMemberTypes(groupId);
  const custom = members.map(({ type }) => cleanTypeLabel(state.stickerPrefs?.[type]?.calendarGroupLabel || '')).find(Boolean);
  if (custom) return custom;
  if (members.length) return members.map(({ label }) => cleanTypeLabel(label)).filter(Boolean).join(' + ');
  return getCalendarCategoryLabel(fallbackType, fallbackLabel);
}

function getCalendarRowName(type, fallbackLabel = '') {
  const groupId = getCalendarGroupId(type);
  return calendarGroupDisplayLabel(groupId, type, fallbackLabel);
}

function getCalendarTypeGroupLabel(entry) {
  return getCalendarRowName(entry?.type, entry?.typeLabel || getTypeLabel(entry?.type));
}

function getCalendarTypeGroupKey(entry) {
  return `row:${getCalendarGroupId(entry?.type)}`;
}

// Streaks intentionally keep their original type-level grouping. Calendar-row
// choices should only change the visual tracker, not merge independent streaks.
function getStreakTypeGroupLabel(entry) {
  return getCalendarCategoryLabel(entry?.type, entry?.typeLabel || getTypeLabel(entry?.type));
}

function getStreakTypeGroupKey(entry) {
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
    const editButton = (entry.kind === 'dated-item' || entry.kind === 'book-reading-day' || entry.kind === 'activity-day')
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
  const selected = ratingFromStarPointer(event, button, 'data-history-rating');
  setHistoryRating(toggledStarRating(els.historyEditRating?.value, selected));
}

function setHistoryRating(value) {
  const rating = normalizeStarRating(value);
  if (els.historyEditRating) els.historyEditRating.value = String(rating);
  syncStarPicker(els.historyRatingPicker, '[data-history-rating]', 'data-history-rating', rating);
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
  { value: 'reality', label: 'Reality', tmdb: ['Reality'], keywords: ['reality television', 'reality tv'], book: [] },
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
  if (result.sourceType === 'event' || result.sourceType === 'concert' || result.sourceType === 'restaurant' || ['music','artist','song'].includes(result.sourceType)) {
    // Live, food, and music have their own category/taste controls. The shared
    // Genre dropdown is built for TV, movies, and books; applying it here can
    // accidentally collapse an Events feed to only one or two cards.
    return true;
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
      if (type === 'game') return Promise.all([
        TrackerAPI.searchCatalogue(query, 'video-game', state.settings, { maxResults: 15 }),
        TrackerAPI.searchCatalogue(query, 'board-game', state.settings, { maxResults: 15 })
      ]).then(([video, board]) => [...video, ...board]);
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
      const selectedType = types[index];
      const availableResults = filterAlreadyKnown(entry.value || [], selectedType);
      for (const result of availableResults) {
        const sourceType = selectedType === 'game' ? (result.sourceType || 'video-game') : selectedType;
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
    els.discoverStatus.textContent = `Loading upcoming concerts and releases… · Tip: ${loadingTipText()}`;
  }
  if (els.discoverCalendarMessage) els.discoverCalendarMessage.textContent = '';
  els.discoverCalendarGrid.innerHTML = loadingMarkup('Loading calendar…');

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
    els.detailBody.innerHTML = loadingMarkup('Loading episode…');
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
  els.discoverStatus.textContent = `Loading recommendations… · Tip: ${loadingTipText()}`;
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
    const dedicatedRestaurantView = requestedContentTypes.length === 1 && requestedContentTypes[0] === 'restaurant';
    const dedicatedLiveView = requestedContentTypes.length > 0 && requestedContentTypes.every(type => ['concert', 'event'].includes(type));
    const mobileDiscover = window.matchMedia('(max-width: 760px)').matches;
    const batchSize = state.discoverMode === 'new'
      ? (mobileDiscover ? 30 : 60)
      : (dedicatedMusicView || dedicatedRestaurantView || dedicatedLiveView)
        ? (mobileDiscover ? 20 : 36)
        : (mobileDiscover ? 14 : 24);
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

function discoverSelectionTypeForSource(sourceType) {
  if (['video-game','board-game','game'].includes(sourceType)) return 'game';
  if (['music','song'].includes(sourceType)) return 'artist';
  return sourceType;
}

async function collectGameDiscoverCandidates(batchNumber, mode = state.discoverMode) {
  const gameMode = mode === 'new' ? 'new' : mode === 'popular' ? 'popular' : 'for-you';
  const [video, board] = await Promise.allSettled([
    TrackerAPI.discoverVideoGames(gameMode, batchNumber, state.settings, 18),
    TrackerAPI.discoverBoardGames(gameMode, batchNumber, state.settings, 18)
  ]);
  if (video.status === 'rejected') console.warn('[Discover][Video games] catalogue request failed:', video.reason?.message || video.reason);
  if (board.status === 'rejected') console.warn('[Discover][Board games] catalogue request failed:', board.reason?.message || board.reason);
  const vg = video.status === 'fulfilled' ? video.value : [];
  const bg = board.status === 'fulfilled' ? board.value : [];
  const mixed = [];
  const length = Math.max(vg.length, bg.length);
  for (let index = 0; index < length; index += 1) {
    if (vg[index]) mixed.push({ ...vg[index], sourceType:'video-game', _discoverSource:'igdb' });
    if (bg[index]) mixed.push({ ...bg[index], sourceType:'board-game', _discoverSource:'bgg' });
  }
  return mixed;
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

  if (selectedTypes.length === 1 && selected.has('game')) {
    return collectGameDiscoverCandidates(batchNumber, state.discoverMode);
  }
  if (selectedTypes.length === 1 && selected.has('restaurant')) {
    return collectRestaurantDiscoverCandidates(batchNumber, state.discoverMode);
  }

  const liveOnly = selectedTypes.length > 0 && selectedTypes.every(type => ['concert','event'].includes(type));
  if (liveOnly) {
    return collectLiveDiscoverCandidates(batchNumber, state.discoverMode);
  }

  let candidates;
  if (state.discoverMode === 'new') candidates = await collectNewDiscoverCandidates(batchNumber);
  else if (state.discoverMode === 'popular') candidates = await collectPopularDiscoverCandidates(batchNumber);
  else candidates = await collectForYouDiscoverCandidates(batchNumber);
  if (selected.has('game')) candidates.push(...await collectGameDiscoverCandidates(batchNumber, state.discoverMode));

  return dedupeDiscoverCandidatesByBoost(candidates.filter(result => selected.has(discoverSelectionTypeForSource(result.sourceType))));
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
      const similarArtistTarget = dedicatedArtistView ? 32 : 14;
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
    const tagCount = dedicatedArtistView ? 4 : dedicatedSongView ? 3 : 1;
    const discoveryTags = rotatingMusicDiscoveryTerms(batchNumber, tagCount, true);
    for (let tagIndex = 0; tagIndex < discoveryTags.length; tagIndex += 1) {
      const discoveryTag = discoveryTags[tagIndex];
      if (!discoveryTag) continue;
      try {
        const tagPage = 1 + ((Math.max(1, batchNumber) - 1 + tagIndex) % 20);
        const [tagArtists, tagTracks] = await Promise.all([
          getCached(`lastfm:tag-artists:${discoveryTag}:${tagPage}`, () => TrackerAPI.getLastFmTopArtistsByTag(discoveryTag, state.settings, 50, tagPage)),
          getCached(`lastfm:tag-tracks:${discoveryTag}:${tagPage}`, () => TrackerAPI.getLastFmTopTracksByTag(discoveryTag, state.settings, 50, tagPage))
        ]);
        musicDiscoverDebug('Last.fm tag pool returned', { tag: discoveryTag, page: tagPage, artists: tagArtists?.length || 0, tracks: tagTracks?.length || 0 });
        const [resolvedTagArtists, resolvedTagTracks] = await Promise.all([
          includeArtists ? collectLastFmResolvedArtists(tagArtists, dedicatedArtistView ? 24 : 8) : [],
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
        const chartPage = 1 + ((Math.max(1, batchNumber) - 1) % 20);
        const [chartArtists, chartTracks] = await Promise.all([
          getCached(`lastfm:chart-artists:${chartPage}`, () => TrackerAPI.getLastFmChartTopArtists(state.settings, 50, chartPage)),
          getCached(`lastfm:chart-tracks:${chartPage}`, () => TrackerAPI.getLastFmChartTopTracks(state.settings, 50, chartPage))
        ]);
        const [resolvedChartArtists, resolvedChartTracks] = await Promise.all([
          includeArtists ? collectLastFmResolvedArtists(chartArtists, dedicatedArtistView ? 24 : 8) : [],
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

  // Keep paging through upcoming Ticketmaster content as the user scrolls. Live
  // events keep the chosen upcoming horizon even when TV/movie/book batches move
  // backward into older release windows.
  if (state.settings.ticketmasterKey && normalizedDiscoverContentTypes().some(type => ['concert','event'].includes(type))) {
    try {
      const events = await fetchTicketmasterEventsForPreferences('', {
        page: Math.max(0, batchNumber - 1),
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
    if (['event','concert'].includes(result.sourceType)) return date >= today && date <= upcomingEnd;
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

  if (state.settings.ticketmasterKey && normalizedDiscoverContentTypes().some(type => ['concert','event'].includes(type))) {
    try {
      const events = await fetchTicketmasterEventsForPreferences('', {
        page: Math.max(0, batchNumber - 1), size: 40, skipPrioritySearch: true
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
  const broad = [
    'restaurants', 'casual dining', 'coffee and brunch', 'breakfast restaurants', 'pizza', 'sushi',
    'thai food', 'italian food', 'mexican food', 'chinese food', 'indian food', 'korean food',
    'vietnamese food', 'middle eastern food', 'mediterranean food', 'japanese food', 'ramen',
    'seafood restaurants', 'steakhouses', 'burgers', 'vegetarian restaurants', 'vegan restaurants',
    'bakeries and cafes', 'french restaurants', 'tapas restaurants', 'latin american restaurants',
    'caribbean restaurants', 'ethiopian restaurants', 'barbecue restaurants', 'dessert cafes'
  ];
  const seedPool = cuisineSeeds.length ? [...new Set([...cuisineSeeds, ...broad])] : broad;
  const seed = seedPool[(batchNumber - 1) % seedPool.length] || 'restaurants';
  const dedicatedRestaurantView = normalizedDiscoverContentTypes().length === 1 && discoverTypeSelected('restaurant');
  try {
    const results = await TrackerAPI.searchRestaurants(seed, state.settings, {
      city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
      region: state.discoverPrefs.eventCountry || state.settings.homeCountry || 'CA',
      pageSize: 20,
      pages: dedicatedRestaurantView ? 2 : 1,
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

async function collectLiveDiscoverCandidates(batchNumber, mode = 'for-you') {
  if (!state.settings.ticketmasterKey) return [];
  const today = todayString();
  const horizonDays = normalizedUpcomingHorizonDays();
  const upcomingEnd = addDaysToDateString(today, horizonDays);
  const selectedTypes = new Set(normalizedDiscoverContentTypes());
  const page = Math.max(0, batchNumber - 1);
  const options = {
    page,
    size: 50,
    skipPrioritySearch: mode !== 'for-you'
  };
  if (mode === 'new') {
    options.startDateTime = ticketmasterMonthBoundary(today);
    options.endDateTime = ticketmasterMonthBoundary(upcomingEnd, true);
  }
  try {
    const events = await fetchTicketmasterEventsForPreferences('', options);
    const mapped = events
      .map(result => asLiveDiscoverCandidate(
        result,
        mode === 'new' ? 'new-live' : mode === 'popular' ? 'popular-live' : 'live-scroll',
        mode === 'popular' ? 5 : mode === 'new' ? 4 : 3,
        mode === 'for-you'
      ))
      .filter(result => selectedTypes.has(result.sourceType));

    // In For You, add rotating related/liked concert sources on top of the full
    // paginated catalogue. The catalogue guarantees depth; these only improve
    // personalization and are deduped below.
    if (mode === 'for-you' && selectedTypes.has('concert')) {
      const extra = await Promise.allSettled([
        getNearbyTicketmasterConcerts({ includeInferred: true, artistLimit: 16 }),
        getRelatedTicketmasterConcerts(batchNumber, 20)
      ]);
      if (extra[0].status === 'fulfilled') mapped.push(...extra[0].value.map(result => ({
        ...result, sourceType: 'concert', _discoverSource: 'ticketmaster-liked',
        _discoverBoost: result.likedArtist ? 14 : 10, _discoverExploration: false
      })));
      if (extra[1].status === 'fulfilled') mapped.push(...extra[1].value.map(result => ({
        ...result, sourceType: 'concert', _discoverSource: 'ticketmaster-related',
        _discoverBoost: 8, _discoverExploration: false
      })));
    }
    return dedupeDiscoverCandidatesByBoost(mapped);
  } catch (error) {
    console.warn('Live-event Discover unavailable:', error?.message || error);
    return [];
  }
}

async function collectForYouDiscoverCandidates(batchNumber) {
  const selectedProviders = (state.discoverPrefs.streamingProviderIds || []).map(String).filter(Boolean);
  const candidates = [];
  const add = (results, sourceType, source, boost = 0, exploration = false, relatedItem = null) => {
    const relation = relatedItem ? discoverRelationEvidence(relatedItem) : null;
    (results || []).forEach(result => candidates.push({
      ...result,
      sourceType,
      _discoverSource: source,
      _discoverBoost: boost,
      _discoverExploration: Boolean(exploration),
      _discoverRelatedLibraryItems: relation ? [relation] : []
    }));
  };
  const recommendationPage = 1 + ((batchNumber - 1) % 3);

  // Direct recommendation overlap is the strongest For You evidence. Pull from a
  // wider Library seed set, then preserve every independent seed that recommends
  // the same candidate instead of throwing those overlaps away during dedupe.
  for (const sourceType of ['tv', 'movie']) {
    const seeds = discoverForYouSeeds(sourceType, batchNumber, 10);
    const settled = await Promise.allSettled(seeds.map(seed => getCached(
      `discover:for-you:${sourceType}:${seed.providerId}:${recommendationPage}`,
      () => TrackerAPI.getTMDBRecommendations(sourceType, seed.providerId, state.settings, recommendationPage)
    )));
    settled.forEach((response, index) => {
      if (response.status !== 'fulfilled') return;
      add(filterAlreadyKnown(response.value, sourceType), sourceType, 'personal', 11, false, seeds[index]);
    });
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

  const bookSeeds = discoverForYouSeeds('book', batchNumber, 6);
  const bookSettled = await Promise.allSettled(bookSeeds.map(seed => getCached(
    `discover:for-you:book:${seed.providerId}`,
    () => TrackerAPI.getBookRecommendations(seed.providerId, state.settings)
  )));
  bookSettled.forEach((response, index) => {
    if (response.status !== 'fulfilled') return;
    add(filterAlreadyKnown(response.value, 'book'), 'book', 'personal', 11, false, bookSeeds[index]);
  });

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

  if (state.settings.googlePlacesKey && discoverTypeSelected('restaurant')) {
    candidates.push(...await collectRestaurantDiscoverCandidates(batchNumber, 'for-you'));
  }

  if (state.settings.ticketmasterKey && normalizedDiscoverContentTypes().some(type => ['concert','event'].includes(type))) {
    try {
      const [concerts, relatedConcerts, generalEvents] = await Promise.all([
        getNearbyTicketmasterConcerts({ includeInferred: true, artistLimit: 12 }),
        getRelatedTicketmasterConcerts(batchNumber, 12),
        fetchTicketmasterEventsForPreferences('', { page: Math.max(0, batchNumber - 1), size: 36, skipPrioritySearch: true })
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
  return `Loading… · Tip: ${loadingTipText()}`;
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
    if (!existing) {
      best.set(key, {
        ...result,
        _discoverRelatedLibraryItems: mergeDiscoverRelationEvidence(result._discoverRelatedLibraryItems)
      });
      continue;
    }

    const preferred = Number(result._discoverBoost || 0) > Number(existing._discoverBoost || 0) ? result : existing;
    const relations = mergeDiscoverRelationEvidence(existing._discoverRelatedLibraryItems, result._discoverRelatedLibraryItems);
    best.set(key, {
      ...preferred,
      _discoverBoost: Math.max(Number(existing._discoverBoost || 0), Number(result._discoverBoost || 0)),
      // A candidate is exploration-only only if every route that found it was exploration.
      _discoverExploration: Boolean(existing._discoverExploration && result._discoverExploration),
      _discoverRelatedLibraryItems: relations
    });
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
  // Seed selection should represent the Library first. Ratings/progress are only
  // mild refinements so one 5-star niche title cannot hijack the candidate pool.
  const rating = Number(item.rating || 0);
  let weight = rating >= 5 ? 1.35 : rating >= 4 ? 1.20 : rating >= 3 ? 1.05 : rating === 2 ? .72 : rating === 1 ? .42 : 1;
  if (item.recommended) weight *= 1.12;
  const disposition = libraryDnfState(item);
  if (disposition === 'stopped') weight *= .10;
  else if (disposition === 'paused') weight *= .55;
  return Math.max(.05, weight);
}
function discoverSeedIsEngaged(item, type = getSourceType(item)) {
  if (!item?.providerId) return false;
  if (type === 'tv') return Boolean(item.completedAt) || Number(item.progress?.nextSeason || 1) > 1 || Number(item.progress?.nextEpisode || 1) > 1 || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched');
  if (type === 'book') return Boolean(item.completedAt) || Number(item.progress?.currentPage || 0) > 0 || getBookReadingPeriods(item).length > 0;
  if (type === 'movie') return Boolean(item.completedAt) || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'movie-watched');
  return false;
}

function discoverSeedPool(type, excludedIds = new Set()) {
  return state.items
    .filter(item => getSourceType(item) === type && item.providerId && !excludedIds.has(String(item.providerId)))
    .filter(item => discoverSeedIsEngaged(item, type));
}

function discoverStableUnit(value) {
  // Deterministic pseudo-random number in (0,1), stable for a feed batch.
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) + 1) / 4294967297;
}

function discoverForYouSeeds(type, batchNumber = 1, limit = 8) {
  const pool = discoverSeedPool(type);
  if (pool.length <= limit) return pool;

  // Sample across the whole engaged Library rather than mostly from recent items.
  // Because each Library item starts near weight 1, genre frequency in the Library
  // drives how often that genre supplies recommendation seeds. Ratings and status
  // only nudge the odds; stopped/DNF items are strongly down-weighted.
  return pool
    .map(item => {
      const unit = discoverStableUnit(`${type}:${batchNumber}:${state.discoverFeedSession}:${item.providerId || item.id}`);
      const weight = discoverSeedWeight(item);
      return { item, key: -Math.log(Math.max(1e-9, unit)) / weight };
    })
    .sort((a, b) => a.key - b.key)
    .slice(0, limit)
    .map(entry => entry.item);
}
function discoverRelationEvidence(item) {
  if (!item) return null;
  const type = getSourceType(item);
  const rating = Math.max(0, Math.min(5, Number(item.rating || 0)));
  const disposition = libraryDnfState(item);
  let strength = disposition === 'stopped' ? .05 : disposition === 'paused' ? .55 : 1;
  let signal = 0;

  // Rating is intentionally secondary to the number of independent Library
  // relations. It breaks ties among equally-supported recommendations.
  if (rating >= 4) signal += (rating - 3) * 4;
  else if (rating === 3) signal += 1;
  else if (rating === 2) signal -= 3.5;
  else if (rating === 1) signal -= 7;
  if (item.recommended) signal += 4.5;

  if (type === 'tv') {
    const watched = state.history.filter(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched').length;
    signal += Math.min(5, Math.log1p(watched) * 1.45);
    if (item.completedAt) signal += 1.5;
  } else if (type === 'book') {
    const current = Math.max(0, Number(item.progress?.currentPage || 0));
    const total = Math.max(0, Number(item.progress?.totalPages || 0));
    signal += total ? Math.min(4, (current / total) * 4) : Math.min(3, Math.log1p(current) / 2);
    if (item.completedAt) signal += 1.5;
  } else if (type === 'movie') {
    if (item.completedAt || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'movie-watched')) signal += 2;
  }

  if (disposition === 'paused') signal -= 3;
  if (disposition === 'stopped') signal -= 9;

  return {
    id: String(item.id || item.providerId || ''),
    providerId: String(item.providerId || ''),
    type,
    title: item.title || '',
    strength,
    signal: Math.max(-12, Math.min(12, signal))
  };
}

function mergeDiscoverRelationEvidence(...groups) {
  const byId = new Map();
  for (const group of groups) {
    for (const entry of Array.isArray(group) ? group : []) {
      const id = String(entry?.id || entry?.providerId || '');
      if (!id) continue;
      const existing = byId.get(id);
      if (!existing || Number(entry.signal || 0) > Number(existing.signal || 0)) byId.set(id, entry);
    }
  }
  return [...byId.values()];
}

function discoverBookAuthorRelations(result) {
  if (result?.sourceType !== 'book') return [];
  const candidateAuthors = new Set(bookAuthorNames(result.subtitle || result.raw?.volumeInfo?.authors || []));
  if (!candidateAuthors.size) return [];
  return state.items
    .filter(item => getSourceType(item) === 'book' && discoverSeedIsEngaged(item, 'book'))
    .filter(item => bookAuthorNames(item.subtitle || item.raw?.volumeInfo?.authors || []).some(author => candidateAuthors.has(author)))
    .map(discoverRelationEvidence)
    .filter(Boolean);
}

function pickDiscoverSeed(type, excludedIds = new Set()) {
  const pool = discoverSeedPool(type, excludedIds);
  if (!pool.length) return null;

  // Keep recommendations responsive to recent activity without letting one recent
  // low-rated item dominate. Ratings, explicit recommendations, and stopped/paused
  // status determine the lottery weight in non-For-You contexts.
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

function discoverLibraryItemGenreNames(item) {
  if (!item) return [];
  const sourceType = getSourceType(item);
  if (sourceType === 'book') {
    const values = item.genres || item.categories || item.raw?.volumeInfo?.categories || [];
    return [...new Set((Array.isArray(values) ? values : [values]).map(value => String(value || '').trim()).filter(Boolean))];
  }
  if (sourceType === 'tv' || sourceType === 'movie') {
    const direct = (item.genres || []).map(genre => typeof genre === 'string' ? genre : genre?.name).filter(Boolean);
    if (direct.length) return [...new Set(direct)];
    const map = sourceType === 'tv' ? TMDB_TV_GENRES : TMDB_MOVIE_GENRES;
    return [...new Set((item.raw?.genre_ids || []).map(id => map[Number(id)]).filter(Boolean))];
  }
  return [];
}

function discoverLibraryCompositionWeight(item) {
  // Presence in the Library is the baseline. A not-yet-started TBR item is weaker
  // evidence of taste; paused/stopped/DNF items are weaker still. Rating does not
  // alter this prevalence count — it is handled separately as quality evidence.
  const disposition = libraryDnfState(item);
  if (disposition === 'stopped') return .12;
  if (disposition === 'paused') return .50;
  const queue = getQueueStatus(item);
  const sourceType = getSourceType(item);
  const engaged = discoverSeedIsEngaged(item, sourceType) || Boolean(item.completedAt);
  if (queue === 'tbr' && !engaged) return .35;
  return 1;
}

function discoverLibraryQualitySignal(item) {
  const rating = Number(item.rating || 0);
  let signal = rating >= 5 ? 1 : rating >= 4 ? .55 : rating === 3 ? .10 : rating === 2 ? -.55 : rating === 1 ? -1 : 0;
  if (item.recommended) signal += .35;

  const sourceType = getSourceType(item);
  if (sourceType === 'tv') {
    const watched = state.history.filter(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched').length;
    if (watched > 0) signal += Math.min(.25, Math.log1p(watched) / 20);
  } else if (sourceType === 'book') {
    const current = Math.max(0, Number(item.progress?.currentPage || 0));
    const total = Math.max(0, Number(item.progress?.totalPages || 0));
    if (total > 0) signal += Math.min(.25, (current / total) * .25);
  }
  if (item.completedAt) signal += .10;

  const disposition = libraryDnfState(item);
  if (disposition === 'paused') signal -= .55;
  if (disposition === 'stopped') signal -= 1.25;
  return Math.max(-1.5, Math.min(1.5, signal));
}

function discoverTasteProfile(type) {
  // TV and movies share one screen-taste profile so the genre mix reflects the
  // audiovisual Library as a whole. Books retain their own category profile.
  const acceptedTypes = type === 'tv' || type === 'movie' ? new Set(['tv', 'movie']) : new Set([type]);
  const stats = new Map();
  let totalWeight = 0;

  for (const item of state.items) {
    const sourceType = getSourceType(item);
    if (!acceptedTypes.has(sourceType)) continue;
    const genres = discoverLibraryItemGenreNames(item);
    if (!genres.length) continue;

    const compositionWeight = discoverLibraryCompositionWeight(item);
    if (compositionWeight <= 0) continue;
    totalWeight += compositionWeight;
    const quality = discoverLibraryQualitySignal(item);

    for (const genre of genres) {
      const key = String(genre || '').trim().toLowerCase();
      if (!key) continue;
      const current = stats.get(key) || { count: 0, qualitySum: 0, items: 0 };
      current.count += compositionWeight;
      current.qualitySum += quality * compositionWeight;
      current.items += 1;
      stats.set(key, current);
    }
  }

  return { stats, totalWeight };
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
  if (!profile?.stats?.size || !profile.totalWeight) return 0;

  const matches = discoverCandidateGenreNames(result)
    .map(genre => {
      const stat = profile.stats.get(String(genre).toLowerCase());
      if (!stat) return null;
      const prevalence = Math.max(0, Math.min(1, stat.count / profile.totalWeight));
      const quality = stat.count > 0 ? stat.qualitySum / stat.count : 0;
      return { prevalence, quality };
    })
    .filter(Boolean)
    .sort((a, b) => b.prevalence - a.prevalence);
  if (!matches.length) return 0;

  // Genre prevalence is the primary taste signal. Example: if Drama appears in
  // 20% of the relevant Library and Horror in 5%, a pure Drama candidate receives
  // roughly four times the prevalence boost of a pure Horror candidate. Ratings,
  // recommendations, progress and stopped/DNF history then make a small adjustment.
  const strongest = matches.slice(0, 2);
  const prevalence = strongest.reduce((sum, entry) => sum + entry.prevalence, 0) / strongest.length;
  const quality = strongest.reduce((sum, entry) => sum + entry.quality, 0) / strongest.length;
  return prevalence * 140 + quality * 5;
}
async function rankDiscoverFeedCandidates(results, batchSize) {
  await loadFollowingSocialContext().catch(() => []);
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
    const followerLoggedCount = socialFollowerLoggedCount(result);
    if (followerLoggedCount) score += Math.min(3.2, followerLoggedCount * 1.15);
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
      const relations = mergeDiscoverRelationEvidence(
        result._discoverRelatedLibraryItems,
        discoverBookAuthorRelations(result)
      );
      const relationCount = relations.length;
      const relationStrength = relations.reduce((sum, entry) => sum + Math.max(0, Number(entry.strength || 0)), 0);
      const relationSignal = Math.max(-24, Math.min(24, relations.reduce((sum, entry) => sum + Number(entry.signal || 0), 0)));

      // Direct API relationships are useful evidence, but they are secondary to
      // the composition of the whole Library. This prevents one highly rated niche
      // title from flooding For You with that niche when it is rare in the Library.
      score += relationStrength * 8;
      score += relationSignal * .55;
      score += discoverGenreAffinity(result, tasteProfiles);
      result = {
        ...result,
        _discoverRelatedLibraryItems: relations,
        _discoverLibraryRelationCount: relationCount,
        _discoverLibraryRelationStrength: relationStrength,
        _discoverLibraryRelationSignal: relationSignal
      };
      if (relationCount > 1 && !result.recommendationReason) {
        result.recommendationReason = `Related to ${relationCount} specific items in your Library`;
      }
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
    return { ...result, _discoverScore: score + jitter, _discoverJitter: jitter, _discoverFollowerLoggedCount: followerLoggedCount };
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

  // Streaming availability remains useful, but it must not override the Library
  // relationship hierarchy. Treat it as a modest secondary bonus instead of a
  // primary sort key, so one extra independent Library relation always wins.
  if ((state.discoverPrefs.streamingProviderIds || []).length) {
    selected = selected.map(result => ({
      ...result,
      _discoverScore: Number(result._discoverScore || 0) + (result.preferredStreaming ? 6 : 0)
    }));
    selected.sort((a,b) => Number(b._discoverScore || 0) - Number(a._discoverScore || 0) || Number(b.preferredStreaming) - Number(a.preferredStreaming));
    selected = diversifyDiscoverFeed(selected);
  }
  return selected;
}

function discoverContentFamily(sourceType) {
  if (['video-game','board-game','game'].includes(sourceType)) return 'game';
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
    if (findCanonicalLibraryItem({ ...result, sourceType: result.sourceType || type })) return false;
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
  const artworkUrl = String(result.image || '').trim();
  const isLastFmGenericArtwork = /2a96cbd8b46e442fc41c2b86b821562f/i.test(artworkUrl);
  // Last.fm currently supplies a generic star for many artists. It is a fallback
  // asset, not actual artist artwork, so render those results as no-image cards.
  const noImage = !artworkUrl || isLastFmGenericArtwork;
  const completeAction = ['tv','movie','book','video-game','board-game'].includes(type)
    ? `<button class="discover-complete-button${completed ? ' is-complete' : ''}" type="button" data-discover-complete="${escapeAttr(key)}" aria-label="${type === 'tv' ? 'Choose watched seasons or episodes' : completed ? 'Undo completed' : 'Mark completed'}" title="${type === 'tv' ? 'Choose watched seasons / episodes' : completed ? 'Undo watched / read' : 'Mark watched / read'}">${completed && type !== 'tv' ? '↶' : '✓'}</button>`
    : '';
  const queueAction = ['tv','movie','book','video-game','board-game'].includes(type)
    ? `<button class="discover-add-button" type="button" data-discover-add="${escapeAttr(key)}">${escapeHtml(plusLabel)}</button>`
    : '';
  const libraryAction = libraryOnly && type !== 'restaurant'
    ? `<button class="discover-add-button${item ? ' is-added' : ''}" type="button" data-discover-library-add="${escapeAttr(key)}" ${item ? 'disabled' : ''}>${item ? 'In Library' : '+ Library'}</button>`
    : '';
  const restaurantAction = type === 'restaurant'
    ? `<button class="discover-add-button${item ? ' is-added' : ''}" type="button" data-discover-restaurant-add="${escapeAttr(key)}">${item ? (getQueueStatus(item) === 'tbr' ? 'In TBR' : '+ Visit') : '+ Add'}</button>`
    : '';

  // Discover results without artwork should be content-sized text cards. Do not
  // reserve an empty poster area or render an image placeholder. Restaurants use
  // the same treatment because their source often has no poster-style artwork.
  if (type === 'restaurant' || noImage) {
    const cardClass = type === 'restaurant' ? 'discover-restaurant-card' : 'discover-no-image-card';
    return `<article class="discover-card discover-text-card ${cardClass}">
      <button class="discover-text-card-open" type="button" data-discover-detail="${escapeAttr(key)}" aria-label="Open ${escapeAttr(result.title || 'details')}">
        <span class="discover-text-type-chip">${escapeHtml(getTypeLabel(type))}</span>
        <strong class="discover-text-card-title">${escapeHtml(result.title || 'Untitled')}</strong>
        ${meta ? `<span class="discover-text-card-meta">${escapeHtml(meta)}</span>` : ''}
        ${result.subtitle && ['book','music'].includes(type) ? `<span class="discover-text-card-meta discover-text-card-subtitle">${escapeHtml(result.subtitle)}</span>` : ''}
      </button>
      <div class="discover-card-actions${['event','concert','music','artist','song','restaurant'].includes(type) ? ' no-complete' : ''} discover-text-card-actions">
        ${restaurantAction || `${completeAction}${queueAction}${libraryAction}`}
      </div>
    </article>`;
  }

  return `<article class="discover-card">
    <button class="discover-card-open" type="button" data-discover-detail="${escapeAttr(key)}" aria-label="Open ${escapeAttr(result.title || 'details')}">
      <div class="discover-poster-wrap">
        <img class="discover-poster" src="${escapeAttr(result.image)}" alt="" />
        <span class="discover-type-chip">${escapeHtml(getTypeLabel(type))}</span>
      </div>
    </button>
    <div class="discover-card-copy">
      <button class="discover-title-button" type="button" data-discover-detail="${escapeAttr(key)}"><h3>${escapeHtml(result.title || 'Untitled')}</h3></button>
      ${meta ? `<p class="discover-card-meta">${escapeHtml(meta)}</p>` : ''}
      ${result.subtitle && ['book','music'].includes(type) ? `<p class="discover-card-subtitle">${escapeHtml(result.subtitle)}</p>` : ''}
      <div class="discover-card-actions${['event','concert','music','artist','song','restaurant'].includes(type) ? ' no-complete' : ''}">
        ${completeAction}${queueAction}${libraryAction}
      </div>
    </div>
  </article>`;
}

function openRestaurantResultForTracking(result) {
  if (!result) return;
  els.detailModal?.close();
  openItemModal('', 'library');
  setItemFormSourceType('restaurant');
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
  syncStarPicker(els.restaurantQuickAddRatingPicker, '[data-restaurant-quick-rating]', 'data-restaurant-quick-rating', rating);
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
    const selected = ratingFromStarPointer(event, ratingButton, 'data-restaurant-quick-rating');
    state.pendingRestaurantQuickRating = toggledStarRating(state.pendingRestaurantQuickRating, selected);
    syncStarPicker(els.restaurantQuickAddRatingPicker, '[data-restaurant-quick-rating]', 'data-restaurant-quick-rating', state.pendingRestaurantQuickRating);
    return;
  }
  const clearRating = event.target.closest('[data-restaurant-quick-rating-clear]');
  if (clearRating) {
    event.preventDefault();
    state.pendingRestaurantQuickRating = 0;
    syncStarPicker(els.restaurantQuickAddRatingPicker, '[data-restaurant-quick-rating]', 'data-restaurant-quick-rating', 0);
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
    discoverBookSaveDebug('completion check clicked', result, { discoverKey: key, alreadyCompleted: result ? isDiscoverCompleted(result) : false });
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
    const key = add.dataset.discoverAdd;
    const result = state.discoverResults.get(key);
    discoverBookSaveDebug('+ Add clicked', result, { discoverKey: key });
    openDiscoverQueueChoice(key);
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
  discoverBookSaveDebug('queue modal opened', result, { discoverKey: key });
  state.pendingDiscoverKey = key;
  els.discoverQueueTitle.textContent = result.title || 'Where should this go?';
  showDialogAtTop(els.discoverQueueModal);
}

async function handleDiscoverQueueChoice(event) {
  const button = event.target.closest('[data-discover-queue-choice]');
  if (!button || !state.pendingDiscoverKey) return;
  const key = state.pendingDiscoverKey;
  const status = button.dataset.discoverQueueChoice === 'tbr' ? 'tbr' : 'upnext';
  const result = state.discoverResults.get(key);
  discoverBookSaveDebug('queue choice clicked', result, { discoverKey: key, target: status });
  try {
    if (!result) throw new Error('Discover result is no longer available.');
    const item = addDiscoverToQueue(key, status);
    const verified = findDiscoverItem(result);
    if (!item || !verified) throw new Error('Discover item was not saved.');
    const visibility = result.sourceType === 'book' && status !== 'tbr'
      ? revealSavedDiscoverItemInLibrary(verified)
      : discoverLibraryVisibility(verified);
    discoverBookSaveDebug('queue save verified', result, { target: status, savedItemId: verified.id, visibility });
    if (result.sourceType === 'book') {
      console.log(`[Discover][Book Save] VERIFIED SAVED: ${verified.title} | itemId=${verified.id} | queue=${getQueueStatus(verified)} | visibility=${visibility.reason}`);
      showActionFeedback(status === 'tbr'
        ? `Added to TBR · ${verified.title}`
        : visibility.reason === 'search-filter'
          ? 'Added to Library · hidden by search'
          : `Added to Library · ${verified.title}`);
    }
  } catch (error) {
    console.error('[Discover] Could not add item to queue', { key, status, result, error });
    if (result?.sourceType === 'book') console.error('[Discover][Book Save] queue save failed', { key, status, title: result.title, providerId: result.providerId, error });
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
  discoverBookSaveDebug('addDiscoverToQueue start', result, { discoverKey: key, target: status });
  const item = ensureDiscoverItem(result, status);
  setItemQueueStatus(item, status);
  item.completedAt = '';
  applyReleaseQueueAutomation(item);
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderAll();
  discoverBookSaveDebug('addDiscoverToQueue complete', result, { savedItemId: item?.id || '', finalQueueStatus: item ? getQueueStatus(item) : '' });
  return item;
}

function discoverBookSaveDebug(label, result, extra = {}) {
  if (result?.sourceType !== 'book') return;
  const existing = findDiscoverItem(result);
  console.log(`[Discover][Book Save] ${label}`, {
    title: result.title || '',
    providerId: String(result.providerId || ''),
    key: `${result.sourceType || 'book'}:${String(result.providerId || '')}`,
    existingItemId: existing?.id || '',
    queueStatus: existing ? getQueueStatus(existing) : '',
    itemCount: state.items.length,
    ...extra
  });
}

function revealSavedDiscoverItemInLibrary(item) {
  if (!item) return { visible: false, reason: 'missing-item' };
  const groupKey = libraryTypeGroupKey(item);
  const selected = ensureLibraryVisibleTypes();
  if (!selected.has(groupKey)) selected.add(groupKey);
  if (state.libraryView === 'recommended' && !item.recommended) {
    state.libraryView = 'all';
  }
  refreshTypeFilter();
  renderLibraryViewToggle();
  renderLibrary();
  return discoverLibraryVisibility(item);
}

function discoverLibraryVisibility(item) {
  if (!item) return { visible: false, reason: 'missing-item' };
  const queueStatus = getQueueStatus(item);
  if (queueStatus === 'tbr' && libraryDnfState(item) !== 'paused' && !isItemNotReleased(item)) {
    return { visible: false, reason: 'tbr-only' };
  }
  if (item.calendarQueueOnly === true && item.calendarTracked !== true) {
    return { visible: false, reason: 'calendar-queue-only' };
  }
  if (state.libraryView === 'recommended' && !item.recommended) {
    return { visible: false, reason: 'recommended-filter' };
  }
  const groupKey = libraryTypeGroupKey(item);
  if (!ensureLibraryVisibleTypes().has(groupKey)) {
    return { visible: false, reason: `type-filter:${groupKey}` };
  }
  const query = normalizeSearchText(state.librarySearchQuery || els.librarySearch?.value || '');
  if (query) {
    const haystack = normalizeSearchText([item.title, item.subtitle, item.notes, item.subcategory, getItemTypeLabel(item), item.artistName].filter(Boolean).join(' '));
    if (!haystack.includes(query)) return { visible: false, reason: 'search-filter' };
  }
  return { visible: true, reason: 'visible' };
}

function findDiscoverItem(result) {
  return findCanonicalLibraryItem(result) || null;
}

function ensureDiscoverItem(result, queueStatus = 'library') {
  discoverBookSaveDebug('ensureDiscoverItem start', result, { requestedQueueStatus: queueStatus });
  let item = findDiscoverItem(result);
  if (item) {
    discoverBookSaveDebug('ensureDiscoverItem found existing', result, { requestedQueueStatus: queueStatus, itemId: item.id, existingQueueStatus: getQueueStatus(item) });
    return item;
  }

  const sourceType = result.sourceType;
  const isMusicFamily = ['music', 'artist', 'song', 'concert'].includes(sourceType);
  const isGameFamily = ['video-game','board-game'].includes(sourceType);
  const isFoodFamily = ['food', 'restaurant', 'recipe'].includes(sourceType);
  const discoverMusicSubcategory = sourceType === 'music' ? 'Album' : musicSubcategoryForSourceType(sourceType);
  const discoverFoodSubcategory = foodSubcategoryForSourceType(sourceType);
  item = {
    id: makeId(),
    sourceType,
    type: isGameFamily ? 'game' : isMusicFamily ? 'music' : isFoodFamily ? 'food' : sourceType,
    typeLabel: isGameFamily ? 'Games' : isMusicFamily ? 'Music' : isFoodFamily ? 'Food' : (SOURCE_ITEM_LABELS[sourceType] || getTypeLabel(sourceType)),
    subcategory: isGameFamily ? (sourceType === 'board-game' ? 'Board Game' : 'Video Game') : isMusicFamily ? discoverMusicSubcategory : discoverFoodSubcategory,
    title: result.title || 'Untitled',
    provider: result.provider || (sourceType === 'book' ? 'googleBooks' : sourceType === 'video-game' ? 'igdb' : sourceType === 'board-game' ? 'bgg' : ['music','artist','song'].includes(sourceType) ? 'itunes' : sourceType === 'restaurant' ? 'googlePlaces' : sourceType === 'concert' ? 'ticketmaster' : sourceType === 'event' ? 'ticketmaster' : 'tmdb'),
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
  discoverBookSaveDebug('ensureDiscoverItem created', result, {
    requestedQueueStatus: queueStatus,
    itemId: item.id,
    savedInState: state.items.some(candidate => candidate.id === item.id),
    finalQueueStatus: getQueueStatus(item)
  });
  return item;
}

function isDiscoverCompleted(result) {
  const item = findDiscoverItem(result);
  if (item?.completedAt) return true;
  const providerId = String(result.providerId || '');
  return state.history.some(entry =>
    entry.showOnCalendar === false &&
    String(entry.providerId || '') === providerId &&
    ['series-watched','movie-watched','book-finished','game-played'].includes(entry.kind)
  );
}

async function markDiscoverCompleted(key, { promptForRating = false } = {}) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');

  if (result.sourceType === 'book') {
    const wasComplete = Boolean(item.completedAt);
    discoverBookSaveDebug('book completion start', result, { itemId: item.id, wasComplete });
    await markWholeBookComplete(item, { createReadingPeriod: false });
    discoverBookSaveDebug('book completion saved', result, { itemId: item.id, completedAt: item.completedAt || '', queueStatus: getQueueStatus(item) });
    renderDiscoverCardInPlace(key);
    if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
    if (!wasComplete && promptForRating) openDiscoverRatingPrompt(key, { completionIntent: false });
    return;
  }

  const completed = isDiscoverCompleted(result);
  if (completed) {
    item.completedAt = '';
    state.history = state.history.filter(entry => !(
      entry.sourceItemId === item.id && ['movie-watched','game-played','item-completed'].includes(entry.kind)
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
  const kind = result.sourceType === 'movie' ? 'movie-watched' : ['video-game','board-game'].includes(result.sourceType) ? 'game-played' : 'item-completed';
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
  discoverBookSaveDebug('rating/date modal opened', result, { discoverKey: key, completionIntent: Boolean(completionIntent), recommendIntent });
  state.pendingDiscoverRatingKey = key;
  state.pendingDiscoverCompletionIntent = Boolean(completionIntent);
  if (els.discoverRatingTitle) els.discoverRatingTitle.textContent = `Rate ${result.title || (result.sourceType === 'book' ? 'this book' : 'this movie')}`;
  const existing = findDiscoverItem(result);
  const rating = Math.max(0, Math.min(5, Number(existing?.rating || 0)));
  state.pendingDiscoverRatingValue = rating;
  state.pendingDiscoverDateValue = existing?.date || '';
  state.pendingDiscoverRecommendedValue = recommendIntent == null ? Boolean(existing?.recommended) : Boolean(recommendIntent);
  if (els.discoverRatingDate) els.discoverRatingDate.value = state.pendingDiscoverDateValue;
  syncStarPicker(els.discoverRatingPicker, '[data-discover-rating-choice]', 'data-discover-rating-choice', rating);
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
  if (!result) throw new Error(`Discover result missing for key: ${key || '(empty)'}`);

  const rating = Math.max(0, Math.min(5, Number(state.pendingDiscoverRatingValue || 0)));
  const date = String(els.discoverRatingDate?.value || state.pendingDiscoverDateValue || '').trim();
  const recommended = Boolean(state.pendingDiscoverRecommendedValue);
  const completionIntent = Boolean(state.pendingDiscoverCompletionIntent);
  let item = findDiscoverItem(result);
  discoverBookSaveDebug('Continue commit start', result, { key, rating, date, recommended, completionIntent, existingItemId: item?.id || '' });

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
  const verified = findDiscoverItem(result);
  if (!verified) throw new Error('Discover item disappeared after save.');
  const visibility = discoverLibraryVisibility(verified);
  discoverBookSaveDebug('Continue commit verified', result, {
    itemId: verified.id,
    queueStatus: getQueueStatus(verified),
    rating: verified.rating,
    date: verified.date || '',
    completedAt: verified.completedAt || '',
    visibility,
    visibilityReason: visibility.reason
  });
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
    const selected = ratingFromStarPointer(event, choice, 'data-discover-rating-choice');
    const rating = toggledStarRating(state.pendingDiscoverRatingValue, selected);
    state.pendingDiscoverRatingValue = rating;
    syncStarPicker(els.discoverRatingPicker, '[data-discover-rating-choice]', 'data-discover-rating-choice', rating);
    return;
  }
  if (event.target.closest('[data-discover-rating-continue]')) {
    event.preventDefault();
    event.stopPropagation();
    const key = state.pendingDiscoverRatingKey;
    const result = key ? state.discoverResults.get(key) : null;
    discoverBookSaveDebug('Continue clicked', result, {
      key: key || '',
      pendingRating: state.pendingDiscoverRatingValue,
      pendingDate: els.discoverRatingDate?.value || state.pendingDiscoverDateValue || '',
      completionIntent: state.pendingDiscoverCompletionIntent
    });
    try {
      if (!key) throw new Error('No pending Discover item. The quick-add state was lost before Continue.');
      if (!result) throw new Error(`Discover result missing before Continue: ${key}`);
      await commitDiscoverQuickAddOnContinue(key);
      const verified = findDiscoverItem(result);
      if (!verified) throw new Error('Discover item was not saved.');
      if (result.sourceType === 'book') {
        const visibility = revealSavedDiscoverItemInLibrary(verified);
        const feedback = visibility.visible
          ? `Added to Library · ${verified.title}`
          : visibility.reason === 'tbr-only'
            ? `Added to TBR · ${verified.title}`
            : visibility.reason === 'search-filter'
              ? `Added to Library · hidden by search`
              : `Added to Library · ${verified.title}`;
        console.log(`[Discover][Book Save] VERIFIED SAVED: ${verified.title} | itemId=${verified.id} | queue=${getQueueStatus(verified)} | visibility=${visibility.reason}`);
        showActionFeedback(feedback);
      }
    } catch (error) {
      console.error('[Discover] Continue failed', { key, result, pendingState: {
        rating: state.pendingDiscoverRatingValue,
        date: els.discoverRatingDate?.value || state.pendingDiscoverDateValue || '',
        recommended: state.pendingDiscoverRecommendedValue,
        completionIntent: state.pendingDiscoverCompletionIntent
      }, error });
      if (result?.sourceType === 'book' || !result) console.error('[Discover][Book Save] Continue failed', { key, title: result?.title || '', providerId: result?.providerId || '', error });
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
    const selected = ratingFromStarPointer(event, ratingButton, 'data-discover-tv-rating');
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
  els.detailBody.innerHTML = loadingMarkup('Loading details…');
  try {
    if (result.sourceType === 'tv') await renderDiscoverTVDetail(key);
    else if (result.sourceType === 'movie') await renderDiscoverMovieDetail(key);
    else if (result.sourceType === 'book') await renderDiscoverBookDetail(key);
    else if (['video-game','board-game'].includes(result.sourceType)) await renderDiscoverGameDetail(key);
    else if (result.sourceType === 'music') await renderDiscoverAlbumDetail(key);
    else if (result.sourceType === 'artist') await renderDiscoverArtistDetail(key);
    else if (result.sourceType === 'song') await renderDiscoverSongDetail(key);
    else if (result.sourceType === 'concert') await renderDiscoverConcertDetail(key);
    else if (result.sourceType === 'restaurant') await renderDiscoverRestaurantDetail(key);
    else if (result.sourceType === 'event') await renderDiscoverEventDetail(key);
    await appendSocialFollowerContext(result, () => state.openDiscoverKey === key && Boolean(els.detailModal?.open));
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
        ${[1,2,3,4,5].map(value => `<button type="button" data-discover-tv-rating="${value}" data-discover-key="${escapeAttr(key)}" class="${starFillClass(value, rating)}" aria-label="${value} star${value === 1 ? '' : 's'}">★</button>`).join('')}
        <button class="rating-heart-button${item?.recommended ? ' is-recommended' : ''}" type="button" data-discover-recommend="${escapeAttr(key)}" aria-label="${item?.recommended ? 'Remove from Recommended' : 'Add to Recommended'}" aria-pressed="${Boolean(item?.recommended)}" title="Recommended">${item?.recommended ? '♥' : '♡'}</button>
        <button class="clear-rating" type="button" data-clear-discover-tv-rating data-discover-key="${escapeAttr(key)}">clear</button>
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
  const rating = normalizeStarRating(value);
  section.dataset.pendingRating = String(rating);
  syncStarPicker(section, '[data-discover-tv-rating]', 'data-discover-tv-rating', rating);
}

function persistDiscoverRating(key, value) {
  const result = state.discoverResults.get(key);
  const rating = normalizeStarRating(value);
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
    <details class="detail-section discover-seasons-details" data-tv-watch-picker open>
      <summary class="discover-seasons-summary">
        <span>Seasons</span>
        <small>${seasons.length} season${seasons.length === 1 ? '' : 's'} · tap to collapse</small>
      </summary>
      <div class="discover-seasons-panel">
        <p class="discover-history-note">✓ marks the whole season · → opens episodes. Watched selections go to Library history only.</p>
        <div class="season-list season-list-rows">${seasonRows || 'No seasons found.'}</div>
      </div>
    </details>
    <details class="detail-section discover-seasons-details discover-episodes-details">
      <summary class="discover-seasons-summary">
        <span>Season ${seasonNumber} episodes</span>
        <small>${(season.episodes || []).filter(ep => Number(ep.episode_number) > 0).length} episode${(season.episodes || []).filter(ep => Number(ep.episode_number) > 0).length === 1 ? '' : 's'} · tap to browse</small>
      </summary>
      <div class="discover-seasons-panel">
        <div class="episode-list">${episodeRows || 'No episodes found.'}</div>
      </div>
    </details>`;
  await appendSocialFollowerContext(result, () => state.openDiscoverKey === key && Boolean(els.detailModal?.open));
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
  await appendSocialFollowerContext(result, () => state.openDiscoverKey === key && Boolean(els.detailModal?.open));
}

async function logDiscoverTVEpisode(key, seasonNumber, episodeNumber) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');
  const alreadyWatched = isTVEpisodeLogged(item, seasonNumber, episodeNumber);
  const loggedNow = !alreadyWatched;

  if (alreadyWatched) {
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
  if (loggedNow) await maybePromptBuddyWatchForTVOverlap(item);
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
    triggerButton.dataset.originalLabel = triggerButton.textContent || '';
    triggerButton.textContent = undoing ? 'Undoing series…' : 'Loading seasons…';
  }

  try {
    // Reuse the provenance-aware bulk completion routine so undo removes only
    // episodes added by this bulk action and preserves episodes checked manually.
    await markWholeTVSeriesComplete(item, {
      onProgress: ({ phase, completed, total }) => {
        if (!triggerButton?.isConnected) return;
        if (phase === 'load') triggerButton.textContent = `Loading seasons ${completed}/${total}…`;
        else if (phase === 'undo') triggerButton.textContent = 'Undoing series…';
        else if (phase === 'done') triggerButton.textContent = undoing ? 'Series restored' : '✓ Series complete';
      }
    });
    renderDiscoverCardInPlace(key);
    showActionFeedback(undoing ? 'Series completion undone.' : 'Series marked complete.');
    if (els.detailModal?.open && state.openDiscoverKey === key) {
      await renderDiscoverTVDetail(key);
    }
  } catch (error) {
    console.error('Could not update Discover series completion:', error);
    showActionFeedback(error?.message ? `Could not mark series complete: ${error.message}` : 'Could not mark series complete. Try again.', true);
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
      const resolved = await resolveLastFmArtistCandidate({ name: result.title, mbid: result.raw?.lastfmMbid || '', match: result.raw?.lastfmMatch || 0 });
      itunesArtistId = String(resolved?.providerId || '');
      if (resolved) {
        result.raw = { ...(result.raw || {}), itunesArtistId };
        result.artistId = itunesArtistId;
        result.image = result.image || resolved.image || '';
        result.subtitle = resolved.subtitle || result.subtitle;
      }
    }
    if (itunesArtistId) {
      const data = await getCached(`artist:v3:${itunesArtistId}`, () => TrackerAPI.getArtistDetails(itunesArtistId, state.settings));
      artist = (data.results || []).find(r => r.wrapperType === 'artist') || {};
      albums = (data.results || []).filter(r => r.wrapperType === 'collection');
    }
  } catch (error) { metadataError = error?.message || String(error); }
  const image = (albums.find(album => album.artworkUrl100)?.artworkUrl100 || result.image || '').replace('100x100bb','600x600bb');
  if (!result.image && image) result.image = image;
  const externalUrl = result.lastfmUrl || result.raw?.lastfmUrl || '';
  els.detailBody.innerHTML = `
    ${detailHero({ type:'ARTIST', title:artist.artistName || result.title, image, subtitle:artist.primaryGenreName || result.subtitle || '', overview:'' })}
    ${discoverLibraryOnlyActionMarkup(result, key)}
    ${metadataError ? `<section class="detail-section"><p class="list-meta">Extra album metadata is temporarily unavailable.</p></section>` : ''}
    <section class="detail-section"><div class="detail-section-heading"><h3>Albums</h3><span class="artist-favorite-hint">Open an album to see its songs</span></div><div class="artist-album-list">${albums.slice(0,24).map(album => artistAlbumRowMarkup(null, album, { discover:true })).join('') || '<p class="detail-meta">No albums returned.</p>'}</div></section>
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
// TRACK APPEARANCE
// ---------------------------
let calendarThemeDraft = '';

function savedCalendarThemeId() {
  const value = String(state.stickerPrefs?.__calendar?.theme || 'blue');
  return CALENDAR_THEMES.some(theme => theme.id === value) ? value : 'blue';
}

function applyCalendarTheme(themeId = savedCalendarThemeId()) {
  const valid = CALENDAR_THEMES.some(theme => theme.id === themeId) ? themeId : 'blue';
  document.querySelectorAll('.track-section').forEach(section => { section.dataset.calendarTheme = valid; });
  if (els.stickerSettingsModal) els.stickerSettingsModal.dataset.calendarTheme = valid;
}

function renderCalendarThemePicker() {
  if (!els.calendarThemePicker) return;
  const selected = calendarThemeDraft || savedCalendarThemeId();
  els.calendarThemePicker.innerHTML = CALENDAR_THEMES.map(theme => `<button class="calendar-theme-swatch${selected === theme.id ? ' is-selected' : ''}" type="button" data-calendar-theme="${escapeAttr(theme.id)}" aria-pressed="${selected === theme.id ? 'true' : 'false'}"><span class="calendar-theme-dot" aria-hidden="true"></span><span>${escapeHtml(theme.label)}</span></button>`).join('');
}

function chooseCalendarThemeDraft(event) {
  const button = event.target.closest('[data-calendar-theme]');
  if (!button) return;
  calendarThemeDraft = button.dataset.calendarTheme || 'blue';
  applyCalendarTheme(calendarThemeDraft);
  renderCalendarThemePicker();
}

// ---------------------------
// STICKER SETTINGS
// ---------------------------
function setTrackSettingsTab(tabName = 'stickers') {
  const modal = els.stickerSettingsModal;
  if (!modal) return;
  const active = ['stickers', 'rows', 'streaks'].includes(tabName) ? tabName : 'stickers';
  modal.querySelectorAll('[data-track-settings-tab]').forEach(tab => {
    const selected = tab.dataset.trackSettingsTab === active;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  modal.querySelectorAll('[data-track-settings-panel]').forEach(panel => {
    panel.hidden = panel.dataset.trackSettingsPanel !== active;
  });
  if (active === 'streaks') renderStreakSettingsRows();
  else if (active === 'rows') renderCalendarRowSettingsRows();
  else { renderStickerSettingsRows(); renderCalendarThemePicker(); }
  resetDialogScrollPosition(modal);
}

function openStickerSettings() {
  if (!els.stickerSettingsModal || !els.stickerSettingsRows) return;
  calendarThemeDraft = savedCalendarThemeId();
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

  const calendarPrefs = { ...(next.__calendar || {}) };
  calendarPrefs.theme = calendarThemeDraft || savedCalendarThemeId();
  next.__calendar = calendarPrefs;
  state.stickerPrefs = next;
  localStorage.setItem(STICKER_PREFS_KEY, JSON.stringify(state.stickerPrefs));
  scheduleCloudSync();
  els.stickerSettingsModal.close();
  applyCalendarTheme();
  renderTracker();
}

function resetStickerSettings() {
  if (!confirm('Reset every sticker to its default style?')) return;
  const preservedRows = {};
  Object.entries(state.stickerPrefs || {}).forEach(([key, prefs]) => {
    if (!prefs || typeof prefs !== 'object' || key === '__calendar' || key.includes('::subcategory::')) return;
    const keep = {};
    ['calendarGroup', 'calendarGroupLabel', 'calendarVisible'].forEach(field => {
      if (prefs[field] !== undefined) keep[field] = prefs[field];
    });
    if (Object.keys(keep).length) preservedRows[key] = keep;
  });
  state.stickerPrefs = { ...preservedRows, __calendar: { theme: 'blue' } };
  localStorage.setItem(STICKER_PREFS_KEY, JSON.stringify(state.stickerPrefs));
  scheduleCloudSync();
  calendarThemeDraft = 'blue';
  renderStickerSettingsRows();
  renderCalendarThemePicker();
  applyCalendarTheme('blue');
  renderTracker();
}

let calendarRowChipDrag = null;
let calendarRowAutoScrollFrame = 0;
let calendarRowAutoScrollVelocity = 0;

function calendarRowMoveLabel(chip) {
  return chip?.querySelector('.calendar-row-chip-label')?.textContent?.trim() || 'Category';
}

function clearCalendarRowMoveUI({ keepSelected = false } = {}) {
  const root = els.calendarRowSettingsRows;
  if (!root) return;
  root.classList.remove('has-selected-chip', 'is-drag-active', 'is-auto-scrolling-up', 'is-auto-scrolling-down');
  root.querySelectorAll('.calendar-row-dropzone.is-move-target').forEach(zone => zone.classList.remove('is-move-target'));
  root.querySelector('[data-calendar-row-selection-banner]')?.remove();
  if (!keepSelected) root.querySelectorAll('.calendar-row-chip.is-selected').forEach(chip => chip.classList.remove('is-selected'));
  document.body.classList.remove('calendar-row-drag-active');
}

function showCalendarRowMoveUI(chip, mode = 'selected') {
  const root = els.calendarRowSettingsRows;
  if (!root || !chip) return;
  root.querySelector('[data-calendar-row-selection-banner]')?.remove();
  root.classList.toggle('has-selected-chip', mode !== 'dragging');
  root.classList.toggle('is-drag-active', mode === 'dragging');
  root.querySelectorAll('[data-calendar-row-dropzone]').forEach(zone => {
    zone.classList.toggle('is-move-target', !zone.contains(chip));
  });

  const banner = document.createElement('div');
  banner.className = 'calendar-row-selection-banner';
  banner.dataset.calendarRowSelectionBanner = '';
  const label = calendarRowMoveLabel(chip);
  banner.innerHTML = `<span><strong>${escapeHtml(label)}</strong>${mode === 'dragging' ? ' — drag to a row; move near the top or bottom to scroll.' : ' selected — scroll, then tap a row to move it.'}</span><button type="button" data-calendar-row-selection-cancel aria-label="Cancel moving ${escapeAttr(label)}">Cancel</button>`;
  root.prepend(banner);
}

function stopCalendarRowAutoScroll() {
  calendarRowAutoScrollVelocity = 0;
  if (calendarRowAutoScrollFrame) cancelAnimationFrame(calendarRowAutoScrollFrame);
  calendarRowAutoScrollFrame = 0;
  els.calendarRowSettingsRows?.classList.remove('is-auto-scrolling-up', 'is-auto-scrolling-down');
}

function updateCalendarRowDragDropzoneAtPoint(x, y) {
  if (!calendarRowChipDrag) return;
  calendarRowChipDrag.ghost.style.display = 'none';
  const target = document.elementFromPoint(x, y);
  calendarRowChipDrag.ghost.style.display = '';
  const dropzone = target?.closest?.('[data-calendar-row-dropzone]') || null;
  if (dropzone !== calendarRowChipDrag.dropzone) {
    calendarRowChipDrag.dropzone?.classList.remove('is-drag-over');
    dropzone?.classList.add('is-drag-over');
    calendarRowChipDrag.dropzone = dropzone;
  }
}

function updateCalendarRowAutoScroll(clientY) {
  const root = els.calendarRowSettingsRows;
  if (!root || !calendarRowChipDrag) return;
  const rect = root.getBoundingClientRect();
  const edge = Math.min(92, Math.max(54, rect.height * .16));
  let velocity = 0;
  if (clientY < rect.top + edge) {
    const strength = Math.min(1, Math.max(0, (rect.top + edge - clientY) / edge));
    velocity = -(3 + 17 * strength);
  } else if (clientY > rect.bottom - edge) {
    const strength = Math.min(1, Math.max(0, (clientY - (rect.bottom - edge)) / edge));
    velocity = 3 + 17 * strength;
  }

  calendarRowAutoScrollVelocity = velocity;
  root.classList.toggle('is-auto-scrolling-up', velocity < 0);
  root.classList.toggle('is-auto-scrolling-down', velocity > 0);
  if (!velocity) {
    if (calendarRowAutoScrollFrame) cancelAnimationFrame(calendarRowAutoScrollFrame);
    calendarRowAutoScrollFrame = 0;
    return;
  }
  if (calendarRowAutoScrollFrame) return;

  const tick = () => {
    if (!calendarRowChipDrag || !calendarRowAutoScrollVelocity) {
      calendarRowAutoScrollFrame = 0;
      return;
    }
    root.scrollTop += calendarRowAutoScrollVelocity;
    updateCalendarRowDragDropzoneAtPoint(calendarRowChipDrag.lastX, calendarRowChipDrag.lastY);
    calendarRowAutoScrollFrame = requestAnimationFrame(tick);
  };
  calendarRowAutoScrollFrame = requestAnimationFrame(tick);
}

function calendarRowChipMarkup(type, label, groupId, hidden = false) {
  const previewEntry = state.history.find(entry => entry.type === type) || state.items.find(item => item.type === type) || { type, typeLabel: label };
  return `<button class="calendar-row-chip${hidden ? ' is-hidden' : ''}" type="button" data-calendar-row-type="${escapeAttr(type)}" data-calendar-group-id="${escapeAttr(groupId)}" aria-label="${escapeAttr(label)}. Drag to move to another calendar row.">
    <span class="calendar-row-chip-handle" data-calendar-row-drag-handle aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
    <span class="calendar-row-chip-preview" aria-hidden="true">${calendarStickerMarkup(type, previewEntry)}</span>
    <span class="calendar-row-chip-label">${escapeHtml(label)}</span>
  </button>`;
}

function calendarRowGroupMarkup(groupId, members, index) {
  const generatedLabel = members.map(member => cleanTypeLabel(member.label)).filter(Boolean).join(' + ') || `Row ${index + 1}`;
  const customLabel = members.map(member => cleanTypeLabel(state.stickerPrefs?.[member.type]?.calendarGroupLabel || '')).find(Boolean) || '';
  return `<section class="calendar-row-group" data-calendar-row-group="${escapeAttr(groupId)}">
    <div class="calendar-row-group-head">
      <label class="calendar-row-name-wrap" title="Optional custom row name">
        <span class="calendar-row-name-pencil" aria-hidden="true">✎</span>
        <input class="calendar-row-group-name" data-calendar-row-name type="text" maxlength="28" value="${escapeAttr(customLabel)}" placeholder="${escapeAttr(generatedLabel)}" aria-label="Optional calendar row name" />
      </label>
      <span class="calendar-row-group-count">${members.length}</span>
    </div>
    <div class="calendar-row-dropzone" data-calendar-row-dropzone>${members.map(({ type, label: memberLabel }) => calendarRowChipMarkup(type, memberLabel, groupId, false)).join('')}</div>
  </section>`;
}

function renderCalendarRowSettingsRows() {
  if (!els.calendarRowSettingsRows) return;
  stopCalendarRowAutoScroll();
  clearCalendarRowMoveUI();
  const types = getRecognizedTypes();
  const groups = new Map();
  const hidden = [];
  for (const entry of types) {
    const groupId = getCalendarGroupId(entry.type);
    if (!isCalendarTypeVisible(entry.type)) {
      hidden.push({ ...entry, groupId });
      continue;
    }
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId).push(entry);
  }

  const orderedGroups = [...groups.entries()].sort((a, b) => {
    const aTV = a[1].some(entry => entry.type === 'tv' || entry.type === 'movie');
    const bTV = b[1].some(entry => entry.type === 'tv' || entry.type === 'movie');
    if (aTV !== bTV) return aTV ? -1 : 1;
    return a[1][0]?.label.localeCompare(b[1][0]?.label || '') || 0;
  });

  els.calendarRowSettingsRows.innerHTML = `
    <div class="calendar-row-visible-groups" data-calendar-visible-groups>
      ${orderedGroups.map(([groupId, members], index) => calendarRowGroupMarkup(groupId, members, index)).join('')}
    </div>
    <section class="calendar-row-hidden-group" data-calendar-hidden-group>
      <div class="calendar-row-group-head">
        <span class="calendar-row-group-title">Hidden from Track</span>
        <span class="calendar-row-group-count">${hidden.length}</span>
      </div>
      <div class="calendar-row-dropzone calendar-row-hidden-dropzone" data-calendar-row-dropzone data-calendar-hidden-dropzone>
        ${hidden.map(({ type, label, groupId }) => calendarRowChipMarkup(type, label, groupId, true)).join('')}
        <span class="calendar-row-hidden-empty">Drop categories here to hide them</span>
      </div>
    </section>`;
  refreshCalendarRowSettingsUI();
}

function addCalendarRowSettingsGroup() {
  const host = els.calendarRowSettingsRows?.querySelector('[data-calendar-visible-groups]');
  if (!host) return;
  const groupId = `custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const section = document.createElement('section');
  section.className = 'calendar-row-group is-empty';
  section.dataset.calendarRowGroup = groupId;
  section.innerHTML = `<div class="calendar-row-group-head"><label class="calendar-row-name-wrap"><span class="calendar-row-name-pencil" aria-hidden="true">✎</span><input class="calendar-row-group-name" data-calendar-row-name type="text" maxlength="28" value="" placeholder="New row" aria-label="Optional calendar row name" /></label><span class="calendar-row-group-count">0</span></div><div class="calendar-row-dropzone" data-calendar-row-dropzone></div>`;
  host.appendChild(section);
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  refreshCalendarRowSettingsUI();
}

function refreshCalendarRowSettingsUI() {
  if (!els.calendarRowSettingsRows) return;
  els.calendarRowSettingsRows.querySelectorAll('.calendar-row-group').forEach((group, index) => {
    const chips = [...group.querySelectorAll('.calendar-row-chip')];
    group.classList.toggle('is-empty', chips.length === 0);
    const nameInput = group.querySelector('[data-calendar-row-name]');
    const count = group.querySelector('.calendar-row-group-count');
    const generatedName = chips.length ? chips.map(chip => chip.querySelector('.calendar-row-chip-label')?.textContent || '').filter(Boolean).join(' + ') : 'New row';
    if (nameInput) nameInput.placeholder = generatedName;
    if (count) count.textContent = String(chips.length);
    chips.forEach(chip => {
      chip.classList.remove('is-hidden');
      chip.dataset.calendarGroupId = group.dataset.calendarRowGroup || chip.dataset.calendarGroupId || defaultCalendarGroupId(chip.dataset.calendarRowType);
    });
  });
  const hiddenGroup = els.calendarRowSettingsRows.querySelector('[data-calendar-hidden-group]');
  if (hiddenGroup) {
    const chips = [...hiddenGroup.querySelectorAll('.calendar-row-chip')];
    hiddenGroup.classList.toggle('is-empty', chips.length === 0);
    const count = hiddenGroup.querySelector('.calendar-row-group-count');
    if (count) count.textContent = String(chips.length);
    chips.forEach(chip => chip.classList.add('is-hidden'));
  }
}

function moveCalendarRowChipToDropzone(chip, dropzone) {
  if (!chip || !dropzone || !els.calendarRowSettingsRows?.contains(chip) || !els.calendarRowSettingsRows.contains(dropzone)) return;
  const sourceGroup = chip.closest('[data-calendar-row-group]');
  if (dropzone.hasAttribute('data-calendar-hidden-dropzone')) {
    if (sourceGroup?.dataset.calendarRowGroup) chip.dataset.calendarGroupId = sourceGroup.dataset.calendarRowGroup;
    dropzone.appendChild(chip);
  } else {
    const targetGroup = dropzone.closest('[data-calendar-row-group]');
    if (!targetGroup) return;
    chip.dataset.calendarGroupId = targetGroup.dataset.calendarRowGroup || defaultCalendarGroupId(chip.dataset.calendarRowType);
    dropzone.appendChild(chip);
  }
  els.calendarRowSettingsRows.querySelectorAll('.calendar-row-group.is-empty').forEach(group => {
    if (group.querySelectorAll('.calendar-row-chip').length === 0 && group !== dropzone.closest('.calendar-row-group')) group.remove();
  });
  refreshCalendarRowSettingsUI();
}

function handleCalendarRowSettingsClick(event) {
  if (event.target.closest('[data-calendar-row-selection-cancel]')) {
    clearCalendarRowMoveUI();
    return;
  }
  if (event.target.closest('[data-calendar-row-drag-handle]')) return;
  const chip = event.target.closest('.calendar-row-chip');
  const dropzone = event.target.closest('[data-calendar-row-dropzone]');
  if (chip && !event.target.closest('[data-calendar-row-drag-handle]')) {
    const wasSelected = chip.classList.contains('is-selected');
    clearCalendarRowMoveUI();
    if (!wasSelected) {
      chip.classList.add('is-selected');
      showCalendarRowMoveUI(chip, 'selected');
    }
    return;
  }
  if (dropzone) {
    const selected = els.calendarRowSettingsRows?.querySelector('.calendar-row-chip.is-selected');
    if (selected && !dropzone.contains(selected)) {
      moveCalendarRowChipToDropzone(selected, dropzone);
      clearCalendarRowMoveUI();
    }
  }
}

function beginCalendarRowChipDrag(event) {
  const handle = event.target.closest('[data-calendar-row-drag-handle]');
  const chip = handle?.closest('.calendar-row-chip');
  if (!handle || !chip || event.button > 0) return;
  event.preventDefault();
  clearCalendarRowMoveUI();
  const rect = chip.getBoundingClientRect();
  const ghost = chip.cloneNode(true);
  ghost.classList.add('calendar-row-chip-ghost');
  ghost.classList.remove('is-selected');
  ghost.style.width = `${rect.width}px`;
  document.body.appendChild(ghost);
  chip.classList.add('is-dragging', 'is-selected');
  calendarRowChipDrag = {
    chip, ghost, pointerId: event.pointerId,
    offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
    dropzone: null, lastX: event.clientX, lastY: event.clientY
  };
  document.body.classList.add('calendar-row-drag-active');
  showCalendarRowMoveUI(chip, 'dragging');
  positionCalendarRowChipGhost(event.clientX, event.clientY);
  updateCalendarRowDragDropzoneAtPoint(event.clientX, event.clientY);
}

function positionCalendarRowChipGhost(x, y) {
  if (!calendarRowChipDrag) return;
  calendarRowChipDrag.ghost.style.left = `${x - calendarRowChipDrag.offsetX}px`;
  calendarRowChipDrag.ghost.style.top = `${y - calendarRowChipDrag.offsetY}px`;
}

function moveCalendarRowChipDrag(event) {
  if (!calendarRowChipDrag || event.pointerId !== calendarRowChipDrag.pointerId) return;
  event.preventDefault();
  calendarRowChipDrag.lastX = event.clientX;
  calendarRowChipDrag.lastY = event.clientY;
  positionCalendarRowChipGhost(event.clientX, event.clientY);
  updateCalendarRowDragDropzoneAtPoint(event.clientX, event.clientY);
  updateCalendarRowAutoScroll(event.clientY);
}

function endCalendarRowChipDrag(event) {
  if (!calendarRowChipDrag || event.pointerId !== calendarRowChipDrag.pointerId) return;
  const { chip, ghost, dropzone } = calendarRowChipDrag;
  stopCalendarRowAutoScroll();
  dropzone?.classList.remove('is-drag-over');
  chip.classList.remove('is-dragging');
  ghost.remove();
  calendarRowChipDrag = null;
  document.body.classList.remove('calendar-row-drag-active');
  if (dropzone && !dropzone.contains(chip)) {
    moveCalendarRowChipToDropzone(chip, dropzone);
    clearCalendarRowMoveUI();
  } else {
    chip.classList.add('is-selected');
    showCalendarRowMoveUI(chip, 'selected');
  }
}

function cancelCalendarRowChipDrag(event) {
  if (!calendarRowChipDrag || (event.pointerId != null && event.pointerId !== calendarRowChipDrag.pointerId)) return;
  stopCalendarRowAutoScroll();
  calendarRowChipDrag.dropzone?.classList.remove('is-drag-over');
  calendarRowChipDrag.chip.classList.remove('is-dragging');
  calendarRowChipDrag.ghost.remove();
  calendarRowChipDrag = null;
  clearCalendarRowMoveUI();
}

function saveCalendarRowSettings(event) {
  event.preventDefault();
  const next = { ...state.stickerPrefs };

  els.calendarRowSettingsRows?.querySelectorAll('.calendar-row-group[data-calendar-row-group]').forEach(group => {
    const groupId = group.dataset.calendarRowGroup || '';
    const customLabel = cleanTypeLabel(group.querySelector('[data-calendar-row-name]')?.value || '');
    group.querySelectorAll('.calendar-row-chip[data-calendar-row-type]').forEach(chip => {
      const type = chip.dataset.calendarRowType;
      if (!type) return;
      const existing = { ...(next[type] || {}) };
      existing.calendarGroup = groupId || defaultCalendarGroupId(type);
      delete existing.calendarRow;
      delete existing.calendarVisible;
      if (customLabel) existing.calendarGroupLabel = customLabel;
      else delete existing.calendarGroupLabel;
      next[type] = existing;
    });
  });

  els.calendarRowSettingsRows?.querySelectorAll('[data-calendar-hidden-group] .calendar-row-chip[data-calendar-row-type]').forEach(chip => {
    const type = chip.dataset.calendarRowType;
    if (!type) return;
    const existing = { ...(next[type] || {}) };
    existing.calendarGroup = chip.dataset.calendarGroupId || existing.calendarGroup || defaultCalendarGroupId(type);
    delete existing.calendarRow;
    existing.calendarVisible = false;
    next[type] = existing;
  });

  state.stickerPrefs = next;
  localStorage.setItem(STICKER_PREFS_KEY, JSON.stringify(state.stickerPrefs));
  scheduleCloudSync();
  els.stickerSettingsModal?.close();
  renderTracker();
  renderTrackStreakSummary();
}

function resetCalendarRowSettings() {
  if (!confirm('Reset Track rows and show every category?')) return;
  const next = { ...state.stickerPrefs };
  Object.keys(next).forEach(key => {
    if (key.includes('::subcategory::')) return;
    if (!next[key] || typeof next[key] !== 'object') return;
    const copy = { ...next[key] };
    delete copy.calendarRow;
    delete copy.calendarGroup;
    delete copy.calendarVisible;
    delete copy.calendarGroupLabel;
    next[key] = copy;
  });
  state.stickerPrefs = next;
  localStorage.setItem(STICKER_PREFS_KEY, JSON.stringify(state.stickerPrefs));
  scheduleCloudSync();
  renderCalendarRowSettingsRows();
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

function getBaseStreakGroups(calendarEntries = null) {
  const groups = new Map();
  const entries = Array.isArray(calendarEntries) ? calendarEntries : getCalendarEntries({ respectVisibility: false });

  for (const { type, label } of getRecognizedTypes()) {
    const cleanLabel = cleanTypeLabel(label || getTypeLabel(type)) || 'Other';
    const key = slugifyType(cleanLabel);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        baseKey: key,
        scope: 'type',
        label: cleanLabel,
        memberTypes: [],
        subcategories: [],
        representativeType: type,
        representativeEntry: null
      });
    }
    const group = groups.get(key);
    if (!group.memberTypes.includes(type)) group.memberTypes.push(type);
  }

  for (const entry of entries) {
    const label = getStreakTypeGroupLabel(entry);
    const key = getStreakTypeGroupKey(entry);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        baseKey: key,
        scope: 'type',
        label,
        memberTypes: [],
        subcategories: [],
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

function getStreakSubcategories(baseKey, baseGroups = null, calendarEntries = null) {
  const entries = Array.isArray(calendarEntries) ? calendarEntries : getCalendarEntries({ respectVisibility: false });
  const bases = Array.isArray(baseGroups) ? baseGroups : getBaseStreakGroups(entries);
  const base = bases.find(group => group.key === baseKey);
  if (!base) return [];
  const names = new Map();
  const add = value => {
    const label = cleanTypeLabel(value || '');
    if (!label) return;
    const key = label.toLowerCase();
    if (!names.has(key)) names.set(key, label);
  };

  for (const item of state.items) {
    if (base.memberTypes.includes(item.type)) add(item.subcategory);
  }
  for (const entry of state.history) {
    if (base.memberTypes.includes(entry.type)) add(entry.subcategory);
  }
  for (const entry of entries) {
    if (getStreakTypeGroupKey(entry) === baseKey) add(entry.subcategory);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

function streakSubcategoryTargetKey(baseKey, subcategory) {
  return `${baseKey}::sub::${slugifyType(subcategory)}`;
}

function configuredStreakGroupsForBase(baseKey) {
  return Object.entries(state.streakPrefs || {})
    .filter(([, config]) => config && typeof config === 'object' && config.scope === 'group' && config.baseKey === baseKey)
    .map(([key, config]) => ({ key, config }));
}

function getRecognizedStreakGroups() {
  const targets = [];
  const calendarEntries = getCalendarEntries({ respectVisibility: false });
  const baseGroups = getBaseStreakGroups(calendarEntries);
  const baseByType = new Map();
  const subcategoriesByBase = new Map(baseGroups.map(base => [base.key, new Map()]));

  for (const base of baseGroups) {
    for (const type of base.memberTypes) baseByType.set(type, base.key);
  }
  const addSubcategory = (baseKey, value) => {
    const label = cleanTypeLabel(value || '');
    if (!baseKey || !label || !subcategoriesByBase.has(baseKey)) return;
    const map = subcategoriesByBase.get(baseKey);
    const normalized = label.toLowerCase();
    if (!map.has(normalized)) map.set(normalized, label);
  };
  for (const item of state.items) addSubcategory(baseByType.get(item.type), item.subcategory);
  for (const entry of state.history) addSubcategory(baseByType.get(entry.type), entry.subcategory);
  for (const entry of calendarEntries) addSubcategory(getStreakTypeGroupKey(entry), entry.subcategory);

  for (const base of baseGroups) {
    targets.push({ ...base, subcategories: [] });

    const subcategories = [...(subcategoriesByBase.get(base.key)?.values() || [])].sort((a, b) => a.localeCompare(b));
    for (const subcategory of subcategories) {
      targets.push({
        key: streakSubcategoryTargetKey(base.key, subcategory),
        baseKey: base.key,
        scope: 'subcategory',
        label: `${base.label} · ${subcategory}`,
        subcategory,
        subcategories: [subcategory],
        memberTypes: [...base.memberTypes],
        representativeType: base.representativeType,
        representativeEntry: calendarEntries.find(entry => getStreakTypeGroupKey(entry) === base.key && cleanTypeLabel(entry.subcategory || '').toLowerCase() === subcategory.toLowerCase()) || null
      });
    }

    for (const { key, config } of configuredStreakGroupsForBase(base.key)) {
      const selected = [...new Set((config.subcategories || []).map(value => cleanTypeLabel(value)).filter(Boolean))];
      if (selected.length < 2) continue;
      targets.push({
        key,
        baseKey: base.key,
        scope: 'group',
        label: cleanTypeLabel(config.label || '') || selected.join(' + '),
        subcategories: selected,
        memberTypes: [...base.memberTypes],
        representativeType: base.representativeType,
        representativeEntry: calendarEntries.find(entry => getStreakTypeGroupKey(entry) === base.key && selected.some(value => value.toLowerCase() === cleanTypeLabel(entry.subcategory || '').toLowerCase())) || null
      });
    }
  }
  return targets;
}

function resolveStreakGroup(typeOrGroupKey) {
  const value = String(typeOrGroupKey || '');
  const groups = getRecognizedStreakGroups();
  const exact = groups.find(group => group.key === value);
  if (exact) return exact;
  const base = groups.find(group => group.scope === 'type' && group.memberTypes.includes(value));
  if (base) return base;
  const label = getTypeLabel(value) || value || 'Other';
  const key = slugifyType(label);
  return {
    key,
    baseKey: key,
    scope: 'type',
    label,
    memberTypes: value ? [value] : [],
    subcategories: [],
    representativeType: value || 'other',
    representativeEntry: null
  };
}

function getStreakConfig(typeOrGroupKey) {
  const group = typeof typeOrGroupKey === 'object' && typeOrGroupKey?.key
    ? typeOrGroupKey
    : resolveStreakGroup(typeOrGroupKey);

  let saved = state.streakPrefs?.[group.key];
  // Only whole-type streaks inherit the old internal-type preference keys.
  if (!saved && group.scope === 'type') {
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
      : [],
    scope: saved.scope || group.scope || 'type',
    baseKey: saved.baseKey || group.baseKey || group.key,
    subcategories: [...new Set((saved.subcategories || group.subcategories || []).map(value => cleanTypeLabel(value)).filter(Boolean))],
    label: cleanTypeLabel(saved.label || '') || group.label
  };
}

function streakTargetMatchesEntry(targetOrKey, entry) {
  const target = typeof targetOrKey === 'object' && targetOrKey?.key ? targetOrKey : resolveStreakGroup(targetOrKey);
  if (!entry || getStreakTypeGroupKey(entry) !== target.baseKey) return false;
  if (target.scope === 'type') return true;
  const subcategory = cleanTypeLabel(entry.subcategory || '').toLowerCase();
  if (!subcategory) return false;
  return (target.subcategories || []).some(value => cleanTypeLabel(value).toLowerCase() === subcategory);
}

function getTypeActivityDates(typeOrGroupKey) {
  const target = typeof typeOrGroupKey === 'object' && typeOrGroupKey?.key ? typeOrGroupKey : resolveStreakGroup(typeOrGroupKey);
  return new Set(
    getCalendarEntries({ respectVisibility: false })
      .filter(entry => streakTargetMatchesEntry(target, entry) && entry.date && entry.showOnCalendar !== false)
      .map(entry => entry.date)
  );
}

function calculateTypeStreak(typeOrGroupKey, overrideConfig = null) {
  let target = typeof typeOrGroupKey === 'object' && typeOrGroupKey?.key ? typeOrGroupKey : resolveStreakGroup(typeOrGroupKey);
  const config = overrideConfig || getStreakConfig(target);
  if (overrideConfig?.scope && overrideConfig?.baseKey) {
    target = {
      ...target,
      key: typeof typeOrGroupKey === 'string' ? typeOrGroupKey : target.key,
      scope: overrideConfig.scope,
      baseKey: overrideConfig.baseKey,
      subcategories: [...(overrideConfig.subcategories || target.subcategories || [])]
    };
  }
  if (!config.enabled) return { enabled: false, count: 0, restToday: false };

  const activityDates = getTypeActivityDates(target);
  const restDays = new Set((config.restDays || []).map(Number));
  const now = new Date();
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  let count = 0;
  let firstCalendarDay = true;

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
    if (firstCalendarDay) {
      cursor = addDays(cursor, -1);
      firstCalendarDay = false;
      continue;
    }
    break;
  }

  return { enabled: true, count, restToday: restDays.has(now.getDay()) };
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
    .map(group => ({ ...group, config: getStreakConfig(group) }))
    .filter(group => group.config.enabled)
    .map(group => ({ ...group, text: streakText(group, group.config) }));

  els.trackStreakSummary.hidden = active.length === 0;
  if (!active.length) {
    els.trackStreakSummary.innerHTML = '';
    return;
  }

  els.trackStreakSummary.innerHTML = active.map(group => {
    const representative = group.representativeEntry
      || getCalendarEntries({ respectVisibility: false }).find(entry => streakTargetMatchesEntry(group, entry))
      || { type: group.representativeType, typeLabel: group.label, subcategory: group.subcategories?.[0] || '' };
    return `
      <div class="track-streak-card">
        <span class="track-streak-sticker">${calendarStickerMarkup(representative.type, representative)}</span>
        <span class="track-streak-copy"><strong>${escapeHtml(group.config.label || group.label)}</strong><small>${escapeHtml(group.text)}</small></span>
      </div>`;
  }).join('');
}

function openStreakSettings() {
  if (!els.stickerSettingsModal || !els.streakSettingsRows) return;
  setTrackSettingsTab('streaks');
  showDialogAtTop(els.stickerSettingsModal);
}

function createStreakSettingRow(group, config = getStreakConfig(group)) {
  const row = document.createElement('div');
  row.className = `streak-setting-row${config.enabled ? ' is-enabled' : ''}${group.scope === 'type' ? ' streak-setting-whole-type' : ''}${group.scope === 'group' ? ' streak-setting-grouped' : ''}`;
  row.dataset.streakType = group.key;
  row.dataset.streakScope = group.scope || 'type';
  row.dataset.streakBase = group.baseKey || group.key;
  row.dataset.streakSubcategories = JSON.stringify(config.subcategories || group.subcategories || []);
  const scopeText = group.scope === 'type' ? 'All subtypes' : group.scope === 'group' ? (config.subcategories || []).join(' + ') : (group.subcategories || [])[0] || 'Subtype';
  row.innerHTML = `
    <div class="streak-setting-type">
      <strong>${escapeHtml(config.label || group.label)}</strong>
      <small>${escapeHtml(scopeText)}</small>
      ${group.scope === 'group' ? `<button class="streak-group-remove" type="button" data-streak-remove-group="${escapeAttr(group.key)}" aria-label="Remove grouped streak">×</button>` : ''}
    </div>
    <label class="streak-toggle">
      <input data-streak-field="enabled" type="checkbox" ${config.enabled ? 'checked' : ''} />
      <span>On</span>
    </label>
    <div class="rest-day-picker" aria-label="Rest days for ${escapeAttr(config.label || group.label)}">
      ${WEEKDAY_OPTIONS.map(day => `
        <label class="rest-day-chip" title="${day.label}">
          <input data-streak-rest-day="${day.value}" type="checkbox" ${config.restDays.includes(day.value) ? 'checked' : ''} />
          <span>${day.short}</span>
        </label>`).join('')}
    </div>
    <div class="streak-setting-current">${escapeHtml(streakText(group, config) || 'Off')}</div>`;
  return row;
}

function createStreakGroupBuilder(base, knownSubcategories = null) {
  const subcategories = Array.isArray(knownSubcategories) ? knownSubcategories : getStreakSubcategories(base.key);
  if (subcategories.length < 2) return null;
  const details = document.createElement('details');
  details.className = 'streak-group-builder';
  details.dataset.streakBuilderBase = base.key;
  details.innerHTML = `
    <summary>+ Group subtypes</summary>
    <div class="streak-group-builder-body">
      <label class="streak-group-name"><span>Group name</span><input data-streak-group-name type="text" maxlength="40" placeholder="Optional" /></label>
      <div class="streak-group-subtype-options" aria-label="Choose subtypes to group">
        ${subcategories.map(subcategory => `<label><input type="checkbox" data-streak-group-subcategory value="${escapeAttr(subcategory)}" /><span>${escapeHtml(subcategory)}</span></label>`).join('')}
      </div>
      <button class="secondary-button streak-group-add" type="button" data-streak-add-group>Add group</button>
      <p class="streak-group-builder-message" hidden></p>
    </div>`;
  return details;
}

function renderStreakSettingsRows() {
  if (!els.streakSettingsRows) return;
  els.streakSettingsRows.innerHTML = '';
  const allTargets = getRecognizedStreakGroups();
  const bases = allTargets.filter(group => group.scope === 'type');

  for (const base of bases) {
    const section = document.createElement('section');
    section.className = 'streak-scope-section';
    section.dataset.streakBaseSection = base.key;
    section.innerHTML = `<div class="streak-scope-heading"><strong>${escapeHtml(base.label)}</strong><span>Whole type, subtype, or your own group</span></div>`;

    const targetRows = allTargets.filter(group => group.baseKey === base.key);
    for (const group of targetRows) section.appendChild(createStreakSettingRow(group));
    const builder = createStreakGroupBuilder(base, allTargets.filter(group => group.baseKey === base.key && group.scope === 'subcategory').map(group => group.subcategories[0]).filter(Boolean));
    if (builder) section.appendChild(builder);
    els.streakSettingsRows.appendChild(section);
  }
}

function streakRowTargetFromElement(row) {
  const key = row.dataset.streakType || '';
  const existing = resolveStreakGroup(key);
  let subcategories = [];
  try { subcategories = JSON.parse(row.dataset.streakSubcategories || '[]'); } catch {}
  return {
    ...existing,
    key,
    baseKey: row.dataset.streakBase || existing.baseKey,
    scope: row.dataset.streakScope || existing.scope,
    subcategories
  };
}

function readStreakRowConfig(row) {
  const target = streakRowTargetFromElement(row);
  const existing = state.streakPrefs?.[row.dataset.streakType] || {};
  return {
    ...existing,
    enabled: Boolean(row.querySelector('[data-streak-field="enabled"]')?.checked),
    restDays: [...row.querySelectorAll('[data-streak-rest-day]:checked')].map(input => Number(input.dataset.streakRestDay)),
    scope: target.scope,
    baseKey: target.baseKey,
    subcategories: [...target.subcategories],
    label: cleanTypeLabel(row.querySelector('.streak-setting-type strong')?.textContent || target.label)
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

function handleStreakSettingsClick(event) {
  const add = event.target.closest('[data-streak-add-group]');
  if (add) {
    const builder = add.closest('[data-streak-builder-base]');
    const baseKey = builder?.dataset.streakBuilderBase || '';
    const selected = [...(builder?.querySelectorAll('[data-streak-group-subcategory]:checked') || [])].map(input => cleanTypeLabel(input.value)).filter(Boolean);
    const message = builder?.querySelector('.streak-group-builder-message');
    if (selected.length < 2) {
      if (message) { message.hidden = false; message.textContent = 'Choose at least two subtypes.'; }
      return;
    }
    const base = getRecognizedStreakGroups().find(group => group.scope === 'type' && group.key === baseKey);
    if (!base) return;
    const customLabel = cleanTypeLabel(builder.querySelector('[data-streak-group-name]')?.value || '');
    const label = customLabel || selected.join(' + ');
    const uniquePart = `${slugifyType(label)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const key = `${baseKey}::group::${uniquePart}`;
    const group = {
      key,
      baseKey,
      scope: 'group',
      label,
      subcategories: selected,
      memberTypes: [...base.memberTypes],
      representativeType: base.representativeType,
      representativeEntry: null
    };
    const config = { enabled: true, restDays: [], scope: 'group', baseKey, subcategories: selected, label };
    const row = createStreakSettingRow(group, config);
    builder.before(row);
    builder.querySelectorAll('[data-streak-group-subcategory]').forEach(input => { input.checked = false; });
    const name = builder.querySelector('[data-streak-group-name]');
    if (name) name.value = '';
    if (message) message.hidden = true;
    builder.open = false;
    return;
  }

  const remove = event.target.closest('[data-streak-remove-group]');
  if (remove) {
    remove.closest('.streak-setting-row')?.remove();
  }
}

function saveStreakSettings(event) {
  event.preventDefault();
  const next = {};
  els.streakSettingsRows?.querySelectorAll('.streak-setting-row[data-streak-type]').forEach(row => {
    const config = readStreakRowConfig(row);
    const existing = state.streakPrefs?.[row.dataset.streakType] || {};
    // Keep grouped definitions and any existing custom identity even while off.
    if (config.enabled || config.scope === 'group' || existing.label || existing.sticker) next[row.dataset.streakType] = config;
  });
  state.streakPrefs = next;
  localStorage.setItem(STREAK_PREFS_KEY, JSON.stringify(state.streakPrefs));
  scheduleCloudSync();
  els.stickerSettingsModal?.close();
  renderAll();
}

function resetStreakSettings() {
  if (!confirm('Turn off all streaks and remove grouped subtype streaks?')) return;
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

function parseItemPeople(value) {
  return [...new Set(String(value || '')
    .split(',')
    .map(name => cleanTypeLabel(name))
    .filter(Boolean))];
}

function getItemPeople(item) {
  if (!item || getSourceType(item) === 'book') return [];
  const direct = Array.isArray(item.people) ? item.people : [];
  const legacyActivity = getSourceType(item) === 'activity' && Array.isArray(item.activityMeta?.people)
    ? item.activityMeta.people
    : [];
  return [...new Set([...direct, ...legacyActivity].map(name => cleanTypeLabel(name)).filter(Boolean))];
}

function socialPeopleTagValue(profile) {
  const username = String(profile?.username || '').trim();
  return username ? `@${username}` : cleanTypeLabel(profile?.display_name || '');
}

function renderItemPeopleSuggestions() {
  const host = els.itemPeopleSuggestions;
  if (!host || !els.itemPeople || els.itemPeopleBlock?.hidden) return;
  const profiles = Array.isArray(socialState.acceptedConnections) ? socialState.acceptedConnections : [];
  if (!profiles.length) {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }
  const selected = new Set(parseItemPeople(els.itemPeople.value).map(value => value.toLowerCase()));
  host.innerHTML = profiles
    .slice()
    .sort((a,b) => String(a.display_name || a.username || '').localeCompare(String(b.display_name || b.username || '')))
    .map(profile => {
      const tag = socialPeopleTagValue(profile);
      const active = selected.has(tag.toLowerCase());
      const label = profile.display_name || profile.username || 'Omni user';
      return `<button class="people-tag-suggestion${active ? ' is-selected' : ''}" type="button" data-item-people-tag="${escapeAttr(tag)}" aria-pressed="${active}"><span class="people-tag-avatar">${escapeHtml(socialProfileInitial(profile))}</span><span><strong>${escapeHtml(label)}</strong><small>@${escapeHtml(profile.username || '')}</small></span></button>`;
    }).join('');
  host.hidden = false;
}

async function refreshItemPeopleSuggestions() {
  const host = els.itemPeopleSuggestions;
  if (!host || els.itemPeopleBlock?.hidden) return;
  if (!currentUser || !socialState.schemaReady || !supabase) {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }
  if (!socialState.acceptedConnections.length) await loadAcceptedSocialConnections();
  renderItemPeopleSuggestions();
}

function handleItemPeopleSuggestionClick(event) {
  const button = event.target.closest('[data-item-people-tag]');
  if (!button || !els.itemPeople) return;
  const tag = cleanTypeLabel(button.dataset.itemPeopleTag || '');
  if (!tag) return;
  const values = parseItemPeople(els.itemPeople.value);
  const index = values.findIndex(value => value.toLowerCase() === tag.toLowerCase());
  if (index >= 0) values.splice(index, 1);
  else values.push(tag);
  els.itemPeople.value = values.join(', ');
  renderItemPeopleSuggestions();
  syncItemPeopleDisclosure();
}

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

  if (sourceType === 'activity') {
    const start = String(item.activityMeta?.startDate || item.date || '').slice(0, 10);
    const end = String(item.activityMeta?.endDate || start).slice(0, 10);
    if (start) dates.push(end && end >= start ? end : start);
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

function libraryFooterDate(item) {
  if (!item || getSourceType(item) === 'book') return '';
  const sourceType = getSourceType(item);
  if (sourceType === 'activity') {
    const start = String(item.activityMeta?.startDate || item.date || '').slice(0,10);
    const end = String(item.activityMeta?.endDate || start).slice(0,10);
    return end || start;
  }
  const historyDates = state.history
    .filter(entry => entry.sourceItemId === item.id && entry.date)
    .map(entry => String(entry.date).slice(0,10))
    .filter(Boolean);
  const dates = [...new Set([item.date ? String(item.date).slice(0,10) : '', ...historyDates].filter(Boolean))]
    .sort((a,b) => String(b).localeCompare(String(a)));
  return dates[0] || '';
}

function itemLastTrackedDate(item) {
  if (!item) return '';
  const dates = state.history
    .filter(entry => entry.sourceItemId === item.id && entry.date)
    .map(entry => String(entry.date).slice(0,10))
    .filter(Boolean);

  if (item.date) dates.push(String(item.date).slice(0,10));
  if (item.completedAt) dates.push(String(item.completedAt).slice(0,10));

  if (getSourceType(item) === 'activity') {
    const end = item.activityMeta?.endDate || item.activityMeta?.startDate || '';
    if (end) dates.push(String(end).slice(0,10));
  }
  if (getSourceType(item) === 'book') {
    for (const period of getBookReadingPeriods(item)) {
      const start = String(period?.startDate || '').slice(0,10);
      if (!start) continue;
      const end = String(period?.endDate || start).slice(0,10);
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
  const options = groups.map(([key,label]) => `
    <label class="library-type-option">
      <input type="checkbox" value="${escapeAttr(key)}" ${selected.has(key) ? 'checked' : ''}>
      <span>${escapeHtml(label)}</span>
    </label>`).join('');
  els.typeFilterOptions.innerHTML = `${options}
    <div class="library-type-filter-actions" aria-label="Filter defaults">
      <button type="button" data-library-filter-action="save-default">Make current default</button>
      <button type="button" data-library-filter-action="reset-default">Reset default</button>
      <small class="library-type-filter-status" aria-live="polite"></small>
    </div>`;
  if (els.typeFilterSummary) els.typeFilterSummary.textContent = libraryTypeFilterSummary();
}

function handleLibraryTypeFilterChange() {
  state.libraryVisibleTypes = new Set(
    [...(els.typeFilterOptions?.querySelectorAll('input[type="checkbox"]:checked') || [])].map(input => input.value)
  );
  if (els.typeFilterSummary) els.typeFilterSummary.textContent = libraryTypeFilterSummary();
  renderLibrary();
}

function libraryFilterStatus(message = '') {
  const status = els.typeFilterOptions?.querySelector('.library-type-filter-status');
  if (!status) return;
  status.textContent = message;
  if (message) setTimeout(() => { if (status.textContent === message) status.textContent = ''; }, 1800);
}

function saveCurrentLibraryFilterAsDefault() {
  const selected = [...ensureLibraryVisibleTypes()];
  state.libraryPrefs = { ...normalizeLibraryPrefs(state.libraryPrefs), defaultTypeKeys: [...new Set(selected)] };
  safeLocalSet(LIBRARY_PREFS_KEY, state.libraryPrefs);
  scheduleCloudSync();
  libraryFilterStatus('Default saved');
}

function resetLibraryFilterDefault() {
  const core = libraryAvailableTypeGroups().map(([key]) => key).filter(isCoreLibraryGroupKey);
  state.libraryPrefs = { ...normalizeLibraryPrefs(state.libraryPrefs), defaultTypeKeys: core };
  state.libraryVisibleTypes = new Set(core);
  safeLocalSet(LIBRARY_PREFS_KEY, state.libraryPrefs);
  scheduleCloudSync();
  refreshTypeFilter();
  renderLibrary();
  libraryFilterStatus('Default reset');
}

function handleLibraryTypeFilterAction(event) {
  const button = event.target.closest?.('[data-library-filter-action]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  if (button.dataset.libraryFilterAction === 'save-default') saveCurrentLibraryFilterAsDefault();
  if (button.dataset.libraryFilterAction === 'reset-default') resetLibraryFilterDefault();
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

function libraryTextCardWidth(itemOrTitle) {
  const item = itemOrTitle && typeof itemOrTitle === 'object' ? itemOrTitle : null;
  const title = String(item?.title || itemOrTitle || 'Untitled').trim() || 'Untitled';
  const notes = String(item?.notes || '').trim();
  try {
    const canvas = libraryTextCardWidth.canvas || (libraryTextCardWidth.canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    if (context) {
      context.font = '700 14.4px "DM Sans", system-ui, sans-serif';
      const titleWidth = context.measureText(title).width + 34;
      let noteWidth = 0;
      if (notes) {
        context.font = '500 11.5px "DM Sans", system-ui, sans-serif';
        // Aim to fit the note in roughly three lines so the fixed-height text
        // card can show the full note instead of truncating it.
        noteWidth = context.measureText(notes.replace(/\s+/g, ' ')).width / 3 + 34;
      }
      return Math.max(132, Math.min(680, Math.ceil(Math.max(titleWidth, noteWidth))));
    }
  } catch {}
  const fallback = Math.max(title.length * 8, notes.length * 2.2) + 34;
  return Math.max(132, Math.min(680, Math.ceil(fallback)));
}

function makeLibraryPoster(item) {
  const shell = document.createElement('div');
  shell.className = 'library-card-shell';
  shell.dataset.libraryItemId = item.id;
  const poster = document.createElement('button');
  poster.type = 'button';
  poster.className = 'library-poster-button';
  poster.dataset.detailsId = item.id;
  poster.setAttribute('aria-label', `Open ${item.title}`);
  poster.title = [item.title, item.rating ? `${item.rating}/5` : '', item.genres?.[0] || ''].filter(Boolean).join(' · ');
  const personalRating = Math.max(0, Math.min(5, Number(item.rating || 0)));
  const directImage = String(item.image || '').trim();
  const coverAttachmentId = directImage ? '' : attachmentCoverIdForItem(item);
  const cachedCover = coverAttachmentId ? (attachmentCoverObjectUrls.get(coverAttachmentId) || '') : '';
  const hasThumbnail = Boolean(directImage || coverAttachmentId);
  if (!hasThumbnail) {
    poster.classList.add('library-text-card-button');
    const textCardWidth = libraryTextCardWidth(item);
    shell.classList.add('is-text-card');
    shell.style.setProperty('--library-text-card-width', `${textCardWidth}px`);
    poster.style.setProperty('--library-text-card-width', `${textCardWidth}px`);
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
    ? `<img class="library-poster-image${coverAttachmentId && !cachedCover ? ' is-attachment-cover-loading' : ''}" ${directImage || cachedCover ? `src="${escapeAttr(directImage || cachedCover)}"` : ''} ${coverAttachmentId ? `data-cover-attachment-id="${escapeAttr(coverAttachmentId)}"` : ''} alt="${escapeAttr(item.title)}" loading="lazy" />
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
  const albumButton = document.createElement('button');
  albumButton.type = 'button';
  albumButton.className = 'library-card-album-button';
  albumButton.dataset.libraryAddAlbum = item.id;
  albumButton.textContent = '+ Collection';
  albumButton.setAttribute('aria-label', `Add ${item.title} to album`);
  albumButton.title = 'Add to collection';
  shell.append(poster, albumButton);
  const trackedDate = libraryFooterDate(item);
  if (trackedDate) {
    const tracked = document.createElement('span');
    tracked.className = 'library-card-tracked-date';
    tracked.textContent = formatShortCalendarDate(trackedDate);
    shell.appendChild(tracked);
  }
  return shell;
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
    .filter(item => !libraryQuery || normalizeSearchText([item.title, item.subtitle, item.notes, item.subcategory, getItemTypeLabel(item), item.artistName, ...getItemPeople(item), ...(getSourceType(item) === 'class' ? classHistoryEntries(item).flatMap(entry => [entry.title, entry.notes, entry.date]) : [])].filter(Boolean).join(' ')).includes(libraryQuery));

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

  const preferredLabels = ['TV','Movie','Book','Music','Food','Activity','Classes','Event','Workout','Other'];
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
          ${libraryGroupMapButtonMarkup(groupKey, groupLabel, items)}
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
            ${subItems.some(isPlaceBackedItem) ? `<button class="library-category-map-button" type="button" data-library-map-group="${escapeAttr(groupKey)}" data-library-map-label="${escapeAttr(label)}" data-library-map-subcategory="${escapeAttr(label)}">View on map</button>` : ''}
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
  hydrateAttachmentCoverImages(els.libraryGroups);
}

function handleLibraryClick(event) {
  const addAlbum = event.target.closest('[data-library-add-album]');
  if (addAlbum) {
    event.preventDefault();
    event.stopPropagation();
    openLibraryAddToAlbum(addAlbum.dataset.libraryAddAlbum);
    return;
  }
  const mapButton = event.target.closest('[data-library-map-group]');
  if (mapButton) {
    openLibraryMap(mapButton.dataset.libraryMapGroup || '', mapButton.dataset.libraryMapLabel || '', mapButton.dataset.libraryMapSubcategory || '').catch(error => alert(error?.message || 'Could not load map.'));
    return;
  }
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
  if (sourceType === 'youtube') return isYouTubePlaylistItem(item) ? `Video ${(item.progress?.currentIndex || 0) + 1}` : (item.completedAt ? 'Watched' : (item.subtitle || 'YouTube'));
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
  if (['tv', 'movie', 'book', 'game', 'video-game', 'board-game', 'music', 'artist', 'song', 'concert', 'event', 'activity', 'class'].includes(item.type)) return item.type;
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

function registerCustomType(type, label, actionCategory = '') {
  if (!type || isBuiltInType(type)) return;
  const cleanLabel = cleanTypeLabel(label) || getTypeLabel(type);
  const existing = state.customTypes.find(entry => entry.type === type);
  const nextAction = actionCategory ? normalizeAddActionCategory(actionCategory) : (existing ? inferCustomTypeActionCategory(existing) : 'other');
  if (existing) {
    existing.label = cleanLabel;
    existing.actionCategory = nextAction;
  } else {
    state.customTypes.push({ type, label: cleanLabel, actionCategory: nextAction });
  }
  state.customTypes.sort((a,b) => a.label.localeCompare(b.label));
  localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(state.customTypes));
  refreshItemTypeOptions?.();
  refreshItemKindChoices?.('', els.itemActionChoice?.value || nextAction);
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
    albums: state.albums,
    typeUsage: state.typeUsage,
    photoUploadLog: state.photoUploadLog,
    discoverPrefs: state.discoverPrefs,
    stickerPrefs: state.stickerPrefs,
    streakPrefs: state.streakPrefs,
    libraryPrefs: normalizeLibraryPrefs(state.libraryPrefs),
    logTypePrefs: [...enabledLogTypeKeys()]
  };
}

function hasMeaningfulLocalState(snapshot = buildCloudState()) {
  return Boolean(
    snapshot.items?.length ||
    snapshot.history?.length ||
    snapshot.customTypes?.length ||
    snapshot.albums?.length ||
    Object.keys(snapshot.typeUsage || {}).length ||
    snapshot.photoUploadLog?.length ||
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
  state.albums = Array.isArray(snapshot?.albums) ? snapshot.albums : [];
  state.typeUsage = snapshot?.typeUsage && typeof snapshot.typeUsage === 'object' ? snapshot.typeUsage : {};
  state.photoUploadLog = Array.isArray(snapshot?.photoUploadLog) ? snapshot.photoUploadLog : [];
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
  if (Array.isArray(snapshot?.logTypePrefs)) {
    const validLogTypes = snapshot.logTypePrefs.filter(value => DEFAULT_LOG_TYPE_KEYS.includes(value));
    safeLocalSet(logTypePrefsStorageKey(), validLogTypes.length ? validLogTypes : [...DEFAULT_LOG_TYPE_KEYS]);
  }
  state.libraryVisibleTypes = null;

  safeLocalSet(ITEMS_KEY, state.items);
  safeLocalSet(CUSTOM_TYPES_KEY, state.customTypes);
  safeLocalSet(ALBUMS_KEY, state.albums);
  safeLocalSet(TYPE_USAGE_KEY, state.typeUsage);
  safeLocalSet(PHOTO_UPLOAD_LOG_KEY, state.photoUploadLog);
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
  scheduleSocialSnapshotPublish();
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
  [ITEMS_KEY, HISTORY_KEY, CUSTOM_TYPES_KEY, ALBUMS_KEY, TYPE_USAGE_KEY, PHOTO_UPLOAD_LOG_KEY, DISCOVER_PREFS_KEY, STICKER_PREFS_KEY, STREAK_PREFS_KEY, LIBRARY_PREFS_KEY].forEach(key => {
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

function resumeTbrItemAfterLog(item) {
  if (!item || getQueueStatus(item) !== 'tbr' || item.completedAt) return;
  const sourceType = getSourceType(item);
  if (['event','concert','restaurant','place'].includes(sourceType)) return;
  if (sourceType === 'tv') item.watchDisposition = 'following';
  if (sourceType === 'book') item.bookDisposition = '';
  if (sourceType === 'movie') item.mediaDisposition = '';
  setItemQueueStatus(item, 'upnext');
  item.updatedAt = new Date().toISOString();
}

function addHistoryRecord(record) {
  const source = record?.sourceItemId ? findItem(record.sourceItemId) : null;
  if (source && record?.date && record?.showOnCalendar !== false) resumeTbrItemAfterLog(source);
  const repeatKey = historyRepeatIdentity(record);
  const priorRepeats = repeatKey ? state.history.filter(entry => historyRepeatIdentity(entry) === repeatKey).length : 0;
  const isRepeat = record?.rewatch == null ? priorRepeats > 0 : Boolean(record.rewatch);
  const repeatIndex = repeatKey ? priorRepeats + 1 : 0;
  let subtitle = record?.subtitle || '';
  if (isRepeat) {
    const label = repeatConsumptionLabel(record);
    if (!subtitle.startsWith(`${label} ·`) && subtitle !== label) subtitle = subtitle ? `${label} · ${subtitle}` : label;
  }
  state.history.push({
    id: makeId(),
    createdAt: new Date().toISOString(),
    subcategory: source?.subcategory || '',
    ...record,
    ...(repeatKey ? { rewatch: isRepeat, repeatIndex } : {}),
    subtitle
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
  if (sourceType === 'youtube') return isYouTubePlaylistItem(item) ? `Video ${(item.progress?.currentIndex || 0) + 1}` : (item.completedAt ? 'Watched' : (item.subtitle || 'YouTube'));
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
// =========================================================
// SOCIAL — profiles, sharing snapshots, following, Buddy Watch
// =========================================================
const SOCIAL_SNAPSHOT_VERSION = 9;
const SOCIAL_SHARE_SECTION_META = Object.freeze({
  activity: { label: 'Activity', description: 'Recent tracking and ratings.', items: true, contextOnly: true },
  notes: { label: 'Comments', description: 'Public comments.', items: true, contextOnly: true },
  recommended: { label: 'Recommended', description: 'Recommended items.', items: true },
  upnext: { label: 'Up Next', description: 'Your current queue.', items: true },
  ratings: { label: 'Ratings', description: 'Rated items.', items: true },
  streaks: { label: 'Streaks', description: 'Active streaks.', items: false, streaks: true },
  library: { label: 'Library', description: 'Shared Library items.', items: true }
});

const SOCIAL_PROFILE_THEME_IDS = new Set(CALENDAR_THEMES.map(theme => theme.id));

const socialState = {
  schemaReady: null,
  profile: null,
  shareSettings: null,
  snapshot: null,
  activeTab: 'feed',
  publishTimer: null,
  publishing: false,
  publishQueued: false,
  initializedPage: false,
  peopleResults: [],
  followingProfiles: [],
  followerProfiles: [],
  followRequestProfiles: [],
  followingSnapshots: new Map(),
  acceptedConnections: [],
  buddyWatches: [],
  viewedProfile: null,
  activeSharedItem: null,
  profileViewModes: new Map(),
  profileExpandedGroups: new Map(),
  profileSearchQueries: new Map(),
  followingContextLoaded: false,
  followingContextPromise: null,
  followingContextProfiles: [],
  followingContextSnapshots: new Map(),
  followingContextLoadedAt: 0,
  buddyOverlapPrompted: new Set()
};

function emptySocialShareSettings() {
  return {
    profileTheme: savedCalendarThemeId(),
    shareWithPeople: false,
    activity: { enabled: true, excludedTypes: [], hiddenItemIds: [] },
    notes: { enabled: true, excludedTypes: [], hiddenItemIds: [] },
    recommended: { enabled: false, excludedTypes: [], hiddenItemIds: [] },
    upnext: { enabled: false, excludedTypes: [], hiddenItemIds: [] },
    ratings: { enabled: false, excludedTypes: [], hiddenItemIds: [] },
    streaks: { enabled: false, excludedTypes: [] },
    library: { enabled: false, excludedTypes: [], hiddenItemIds: [], includeTbr: false }
  };
}

function normalizeSocialShareSettings(raw = {}) {
  const base = emptySocialShareSettings();
  // Profile colour follows the owner's Track calendar colour. The persisted
  // field remains for backward compatibility with existing snapshots/settings.
  base.profileTheme = savedCalendarThemeId();
  base.shareWithPeople = Boolean(raw?.shareWithPeople);
  for (const key of Object.keys(SOCIAL_SHARE_SECTION_META)) {
    const incoming = raw?.[key] && typeof raw[key] === 'object' ? raw[key] : {};
    const enabled = incoming.enabled === undefined ? Boolean(base[key]?.enabled) : Boolean(incoming.enabled);
    let excludedTypes = [];
    if (Array.isArray(incoming.excludedTypes)) {
      excludedTypes = incoming.excludedTypes;
    } else if (enabled && Array.isArray(incoming.types)) {
      // One-time compatibility with the original opt-in model: preserve anything
      // that was already private, then save future edits as exclusions.
      const legacySelected = new Set(incoming.types.map(value => String(value || '').trim()).filter(Boolean));
      excludedTypes = socialSectionTypeKeys(key).filter(type => !legacySelected.has(type));
    }
    base[key] = {
      ...base[key],
      enabled,
      excludedTypes: [...new Set(excludedTypes.map(value => String(value || '').trim()).filter(Boolean))]
    };
    if ('hiddenItemIds' in base[key]) {
      base[key].hiddenItemIds = [...new Set((Array.isArray(incoming.hiddenItemIds) ? incoming.hiddenItemIds : []).map(value => String(value || '').trim()).filter(Boolean))];
    }
    if (key === 'library') base.library.includeTbr = Boolean(incoming.includeTbr);
  }
  return base;
}

function socialSchemaMissing(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01' || code === 'PGRST205' || /relation .* does not exist/i.test(message) || /could not find the table/i.test(message);
}

function setSocialSchemaReady(ready, error = null) {
  socialState.schemaReady = Boolean(ready);
  const notice = $('#socialSetupNotice');
  if (notice) notice.hidden = Boolean(ready);
  if (!ready && error && !socialSchemaMissing(error)) console.warn('[Social] unavailable:', error);
}

function socialDefaultUsername(user = currentUser) {
  const emailBase = String(user?.email || 'omni').split('@')[0].toLowerCase().replace(/[^a-z0-9._-]+/g, '').replace(/^[^a-z0-9]+/, '').slice(0, 20) || 'omni';
  const suffix = String(user?.id || makeId()).replaceAll('-', '').slice(0, 6).toLowerCase();
  let base = emailBase.length >= 3 ? emailBase : `${emailBase}user`;
  base = base.slice(0, Math.max(3, 23 - suffix.length));
  return `${base}-${suffix}`.slice(0, 30);
}

async function ensureSocialProfile() {
  if (!supabase || !currentUser || localOnlyMode) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, bio, avatar_url, is_private, updated_at')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) {
    setSocialSchemaReady(false, error);
    if (socialSchemaMissing(error)) return null;
    throw error;
  }
  setSocialSchemaReady(true);
  if (data) {
    const prefsResult = await supabase.from('social_preferences').select('share_settings').eq('user_id', currentUser.id).maybeSingle();
    if (prefsResult.error) throw prefsResult.error;
    return { ...data, share_settings: prefsResult.data?.share_settings || emptySocialShareSettings() };
  }
  // Create the social profile in the background on any Omni page. Sharing remains
  // opt-in/off by default, but Buddy Watch shortcuts can then work from Add,
  // Up Next, and Library without requiring a prior visit to Social.
  const candidate = socialDefaultUsername(currentUser);
  const display = String(currentUser.email || '').split('@')[0] || 'Omni user';
  const insert = {
    user_id: currentUser.id,
    username: candidate,
    display_name: display,
    bio: '',
    avatar_url: '',
    is_private: false,
    updated_at: new Date().toISOString()
  };
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert(insert)
    .select('user_id, username, display_name, bio, avatar_url, is_private, updated_at')
    .single();
  if (createError) {
    setSocialSchemaReady(false, createError);
    throw createError;
  }
  const defaultPrefs = emptySocialShareSettings();
  const prefsCreate = await supabase.from('social_preferences').upsert({ user_id: currentUser.id, share_settings: defaultPrefs, updated_at: new Date().toISOString() });
  if (prefsCreate.error) throw prefsCreate.error;
  return { ...created, share_settings: defaultPrefs };
}

async function initializeSocialForUser() {
  if (!supabase || !currentUser || localOnlyMode) {
    if ($('#socialRoot')) {
      setSocialSchemaReady(false);
      $('#socialSetupNotice')?.querySelector('span')?.replaceChildren(document.createTextNode('Social requires a signed-in Supabase account; local-only mode keeps all social features disabled.'));
    }
    return;
  }
  try {
    const profile = await ensureSocialProfile();
    if (!profile) return;
    socialState.profile = profile;
    socialState.shareSettings = normalizeSocialShareSettings(profile.share_settings);
    scheduleSocialSnapshotPublish(80);
    loadFollowingSocialContext().catch(error => console.warn('[Social] follower context failed to load:', error));
    loadBuddyWatches().then(() => { if (els.upNextList) renderUpNext({ skipReconcile: true }); }).catch(error => console.warn('[Buddy Watch] background load failed:', error));
    if ($('#socialRoot')) await loadSocialPage();
    else {
      renderUpNext().catch(() => {});
      if (els.itemModal?.open) updateItemFormForType();
    }
  } catch (error) {
    if (socialSchemaMissing(error)) setSocialSchemaReady(false, error);
    else console.warn('[Social] initialization failed:', error);
  }
}

function scheduleSocialSnapshotPublish(delay = 900) {
  if (!socialState.profile || !socialState.schemaReady || !supabase || !currentUser || localOnlyMode) return;
  clearTimeout(socialState.publishTimer);
  socialState.publishTimer = setTimeout(() => publishSocialSnapshot().catch(error => console.warn('[Social] snapshot publish failed:', error)), delay);
}

function socialTypeLabel(type) {
  return getRecognizedTypes().find(entry => entry.type === type)?.label || getTypeLabel(type) || type;
}

function socialIsTbrOnlyItem(item) {
  if (!item || getQueueStatus(item) !== 'tbr') return false;
  // Paused/in-progress titles and not-yet-released titles are already treated as
  // part of Library elsewhere in Omni. Only pure watch/read-later entries need
  // the extra social TBR permission.
  return libraryDnfState(item) !== 'paused' && !isItemNotReleased(item);
}

function socialTrackedLibraryItems() {
  return state.items.filter(item => !socialIsTbrOnlyItem(item));
}

function socialItemWasLogged(item) {
  if (!item) return false;
  if (socialLatestLoggedDate(item)) return true;
  return state.history.some(entry => entry.sourceItemId === item.id && entry.date);
}

function socialShareCandidates(section) {
  if (section === 'activity') return state.items.filter(item => socialItemWasLogged(item) || Number(item.rating || 0) > 0);
  if (section === 'notes') return state.items.filter(item => String(item.comment || '').trim());
  if (section === 'recommended') return state.items.filter(item => Boolean(item.recommended));
  if (section === 'upnext') return state.items.filter(item => getQueueStatus(item) === 'upnext');
  if (section === 'ratings') return state.items.filter(item => Number(item.rating || 0) > 0);
  if (section === 'library') return [...state.items];
  return [];
}

function socialLatestLoggedDate(item) {
  if (!item) return '';
  const sourceType = getSourceType(item);
  const watchedKinds = sourceType === 'tv'
    ? new Set(['episode-watched', 'series-watched'])
    : sourceType === 'movie'
      ? new Set(['movie-watched'])
      : sourceType === 'book'
        ? new Set(['book-finished'])
        : new Set(['item-completed']);
  const dates = state.history
    .filter(entry => entry.sourceItemId === item.id && watchedKinds.has(entry.kind) && entry.date)
    .map(entry => String(entry.date).slice(0, 10))
    .filter(Boolean);
  if (dates.length) return dates.sort().at(-1) || '';
  const fallback = String(item.completedAt || (sourceType === 'movie' ? item.date || '' : '')).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(fallback) ? fallback : '';
}

function socialSectionTypeKeys(section) {
  if (section === 'streaks') return socialShareableStreakGroups().map(group => group.key);
  return [...new Set(socialShareCandidates(section).map(item => item.type).filter(Boolean))]
    .sort((a, b) => socialTypeLabel(a).localeCompare(socialTypeLabel(b)));
}

function socialTypeIsAllowed(section, type, settings = socialState.shareSettings) {
  const prefs = settings?.[section];
  return Boolean(prefs?.enabled && type && !prefs.excludedTypes?.includes(type));
}

function socialItemIsAllowed(section, item, settings = socialState.shareSettings) {
  const prefs = settings?.[section];
  if (!prefs?.enabled || !item) return false;
  // Pure TBR entries never leak through Recommended/Ratings/Library unless the
  // profile owner has explicitly opted into sharing TBR.
  if (['recommended','ratings','library'].includes(section) && socialIsTbrOnlyItem(item) && !settings?.library?.includeTbr) return false;
  if (!socialTypeIsAllowed(section, item.type, settings)) return false;
  if (prefs.hiddenItemIds?.includes(item.id)) return false;
  return true;
}

function socialTVIsActivelyWatching(item) {
  if (!item || getSourceType(item) !== 'tv') return false;
  return getTVWatchDisposition(item) === 'following'
    && !item.completedAt
    && !isTerminalSeriesStatus(item.tvMeta?.seriesStatus || '')
    && Boolean(item.tvMeta?.hasUnwatched);
}

function socialItemSummary(item, settings = null, section = '') {
  const sourceType = getSourceType(item);
  const shareWithPeople = Boolean(settings?.shareWithPeople);
  const activityAllowed = socialItemIsAllowed('activity', item, settings);
  const libraryAllowed = socialItemIsAllowed('library', item, settings);
  const recommendedAllowed = Boolean(item.recommended && socialItemIsAllowed('recommended', item, settings));
  const ratingAllowed = Boolean(Number(item.rating || 0) > 0 && socialItemIsAllowed('ratings', item, settings));
  const upNextAllowed = Boolean(getQueueStatus(item) === 'upnext' && socialItemIsAllowed('upnext', item, settings));
  const commentAllowed = Boolean(String(item.comment || '').trim() && (activityAllowed || ratingAllowed || libraryAllowed || recommendedAllowed || upNextAllowed || socialItemIsAllowed('notes', item, settings)));
  let statusKey = '';
  let statusLabel = '';
  if (section === 'tbr') {
    statusKey = 'not-started';
    statusLabel = 'Not started yet';
  } else if ((libraryAllowed || upNextAllowed) && sourceType === 'tv') {
    statusKey = tvLibraryStatusKey(item);
    statusLabel = tvLibraryStatusLabel(statusKey);
  } else if (libraryAllowed && sourceType === 'book') {
    statusKey = bookLibraryStatusKey(item);
    statusLabel = bookLibraryStatusLabel(statusKey);
  } else if (libraryAllowed && libraryDnfState(item)) {
    statusKey = libraryDnfState(item);
    statusLabel = statusKey === 'paused' ? 'Paused' : 'Stopped';
  } else if (libraryAllowed && isItemNotReleased(item)) {
    statusKey = 'not-released';
    statusLabel = 'Not Released';
  }

  // TV episode position is meaningful socially only while the person is actively
  // watching: not paused, not caught up, and not finished. Other Up Next types
  // can keep their ordinary progress text.
  const activelyWatching = sourceType === 'tv' ? socialTVIsActivelyWatching(item) : false;
  const progress = upNextAllowed
    ? (sourceType === 'tv' ? (activelyWatching ? (progressFallback(item) || '') : '') : (progressFallback(item) || ''))
    : '';
  const bookCurrent = Number(item.progress?.currentPage || 0);
  const bookTotal = Number(item.progress?.totalPages || 0);
  const progressBadge = sourceType === 'book' && bookTotal > 0
    ? `${Math.min(100, Math.round(bookCurrent / bookTotal * 100))}%`
    : sourceType === 'tv'
      ? `S${Number(item.progress?.nextSeason || 1)} E${Number(item.progress?.nextEpisode || 1)}`
      : (progressFallback(item) || '');

  return {
    key: `${item.provider || 'manual'}:${item.providerId || item.id}`,
    title: item.title || 'Untitled',
    subtitle: item.subtitle || '',
    image: item.image || '',
    description: item.description || '',
    notes: '',
    comment: commentAllowed ? String(item.comment || '') : '',
    sourceType,
    type: item.type,
    typeLabel: getItemTypeLabel(item),
    libraryGroup: libraryTypeGroupKey(item),
    libraryGroupLabel: libraryTypeGroupLabel([item], libraryTypeGroupKey(item)),
    subcategory: libraryAllowed ? cleanTypeLabel(item.subcategory || '') : '',
    provider: item.provider || '',
    providerId: item.providerId || '',
    releaseDate: libraryAllowed ? String(item.releaseDate || '') : '',
    pageCount: sourceType === 'book' ? Number(item.progress?.totalPages || 0) : 0,
    artistName: sourceType === 'artist' ? item.title || '' : String(item.artistName || ''),
    rating: ratingAllowed ? Number(item.rating || 0) : 0,
    progress,
    progressBadge,
    recommended: recommendedAllowed,
    queueStatus: libraryAllowed ? getQueueStatus(item) : '',
    statusKey,
    statusLabel,
    activelyWatching,
    trackedDate: section === 'activity' ? (activityAllowed ? socialLatestLoggedDate(item) : '') : (libraryAllowed ? socialLatestLoggedDate(item) : ''),
    logged: section === 'activity' ? Boolean(activityAllowed && socialItemWasLogged(item)) : undefined,
    people: shareWithPeople ? getItemPeople(item) : [],
    sharedVia: section || ''
  };
}

function buildSocialSnapshotPayload(settings = socialState.shareSettings || emptySocialShareSettings()) {
  const normalized = normalizeSocialShareSettings(settings);
  const trackedItems = socialTrackedLibraryItems();
  const libraryTypes = normalized.library.enabled ? socialSectionTypeKeys('library').filter(type => !normalized.library.excludedTypes.includes(type)) : [];
  const totals = libraryTypes.map(type => ({
    type,
    label: socialTypeLabel(type),
    count: trackedItems.filter(item => item.type === type).length
  })).filter(total => total.count > 0).sort((a,b) => a.label.localeCompare(b.label));

  const sections = {};
  const contextItems = new Map();
  for (const item of socialShareCandidates('activity')) contextItems.set(item.id, item);
  for (const item of socialShareCandidates('notes')) contextItems.set(item.id, item);
  sections.activity = [...contextItems.values()]
    .filter(item => socialItemIsAllowed('activity', item, normalized) || socialItemIsAllowed('notes', item, normalized))
    .map(item => socialItemSummary(item, normalized, 'activity'))
    .filter(item => item.logged || Number(item.rating || 0) > 0 || String(item.comment || '').trim());
  for (const section of ['recommended','upnext','ratings']) {
    sections[section] = socialShareCandidates(section)
      .filter(item => socialItemIsAllowed(section, item, normalized))
      .map(item => socialItemSummary(item, normalized, section));
  }
  sections.library = socialShareCandidates('library')
    .filter(item => !socialIsTbrOnlyItem(item))
    .filter(item => socialItemIsAllowed('library', item, normalized))
    .map(item => socialItemSummary(item, normalized, 'library'));
  sections.tbr = normalized.library.enabled && normalized.library.includeTbr
    ? state.items
        .filter(item => socialIsTbrOnlyItem(item))
        .filter(item => socialItemIsAllowed('library', item, normalized))
        .map(item => socialItemSummary(item, normalized, 'tbr'))
    : [];

  const streakPrefs = normalized.streaks;
  sections.streaks = streakPrefs.enabled
    ? socialShareableStreakGroups()
        .filter(group => !streakPrefs.excludedTypes.includes(group.key))
        .map(group => {
          const result = calculateTypeStreak(group.key);
          return { key: group.key, label: group.label, type: group.representativeType || group.key, count: result.count, restToday: Boolean(result.restToday), enabled: Boolean(result.enabled) };
        })
    : [];

  return {
    version: SOCIAL_SNAPSHOT_VERSION,
    theme: normalized.profileTheme,
    totals,
    sharing: {
      activity: Boolean(normalized.activity.enabled),
      notes: Boolean(normalized.notes.enabled),
      recommended: Boolean(normalized.recommended.enabled),
      upnext: Boolean(normalized.upnext.enabled),
      ratings: Boolean(normalized.ratings.enabled),
      streaks: Boolean(normalized.streaks.enabled),
      library: Boolean(normalized.library.enabled),
      tbr: Boolean(normalized.library.enabled && normalized.library.includeTbr),
      withPeople: Boolean(normalized.shareWithPeople)
    },
    sections,
    publishedAt: new Date().toISOString()
  };
}

async function publishSocialSnapshot() {
  if (!socialState.profile || !socialState.schemaReady || !currentUser || !supabase || localOnlyMode) return;
  if (socialState.publishing) {
    socialState.publishQueued = true;
    return;
  }
  socialState.publishing = true;
  try {
    const payload = buildSocialSnapshotPayload();
    const { error } = await supabase.from('social_snapshots').upsert({
      user_id: currentUser.id,
      payload,
      updated_at: new Date().toISOString()
    });
    if (error) {
      if (socialSchemaMissing(error)) setSocialSchemaReady(false, error);
      throw error;
    }
    socialState.snapshot = payload;
    if ($('#socialMyProfile')) renderSocialMyProfile();
  } finally {
    socialState.publishing = false;
    if (socialState.publishQueued) {
      socialState.publishQueued = false;
      scheduleSocialSnapshotPublish(150);
    }
  }
}

function initSocialPage() {
  if (socialState.initializedPage || !$('#socialRoot')) return;
  socialState.initializedPage = true;

  $$('.social-tab[data-social-tab]').forEach(tab => tab.addEventListener('click', () => setSocialTab(tab.dataset.socialTab)));
  $('#socialEditProfile')?.addEventListener('click', openSocialProfileSettings);
  $('#socialProfileSettingsForm')?.addEventListener('submit', saveSocialProfileSettings);
  $('#rewatchOnboardingButton')?.addEventListener('click', restartOnboardingTour);
  $('#socialShareSettings')?.addEventListener('change', handleSocialShareFormChange);
  $('#socialPeopleSearchForm')?.addEventListener('submit', handleSocialPeopleSearch);
  $('#socialPeopleResults')?.addEventListener('click', handleSocialActionClick);
  $('#socialFeed')?.addEventListener('click', handleSocialActionClick);
  $('#socialFollowingList')?.addEventListener('click', handleSocialActionClick);
  $('#socialFollowRequests')?.addEventListener('click', handleSocialActionClick);
  $('#socialViewProfileBody')?.addEventListener('click', handleSocialActionClick);
  $('#socialViewProfileBody')?.addEventListener('input', handleSocialProfileSearchInput);
  $('#socialMyProfile')?.addEventListener('click', handleSocialActionClick);
  $('#socialItemDetailBody')?.addEventListener('click', handleSocialItemDetailClick);
  $('#socialCreateBuddyWatch')?.addEventListener('click', openBuddyWatchCreate);
  $('#buddyWatchCreateForm')?.addEventListener('submit', createBuddyWatch);
  $('#socialBuddyList')?.addEventListener('click', handleBuddyWatchClick);
  $('#buddyWatchProgressForm')?.addEventListener('submit', saveBuddyWatchProgress);
}

function setSocialTab(tabName) {
  socialState.activeTab = ['feed','following','people','me'].includes(tabName) ? tabName : 'feed';
  $$('.social-tab[data-social-tab]').forEach(tab => {
    const active = tab.dataset.socialTab === socialState.activeTab;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  $$('[data-social-panel]').forEach(panel => { panel.hidden = panel.dataset.socialPanel !== socialState.activeTab; });
  if (!socialState.schemaReady) return;
  if (socialState.activeTab === 'feed') loadSocialFeed().catch(handleSocialLoadError);
  if (socialState.activeTab === 'following') loadSocialFollowing().catch(handleSocialLoadError);
  if (socialState.activeTab === 'me') renderSocialMyProfile();
}

async function loadSocialPage() {
  initSocialPage();
  if (!socialState.schemaReady) return;
  await Promise.allSettled([loadSocialFollowing(), loadBuddyWatches()]);
  renderSocialFeed();
  renderSocialMyProfile();
}

function handleSocialLoadError(error) {
  if (socialSchemaMissing(error)) setSocialSchemaReady(false, error);
  else console.warn('[Social] load failed:', error);
}

function openSocialProfileSettings() {
  if (!socialState.profile || !socialState.schemaReady) return;
  $('#socialUsername').value = socialState.profile.username || '';
  $('#socialDisplayName').value = socialState.profile.display_name || '';
  $('#socialBio').value = socialState.profile.bio || '';
  $('#socialPrivateProfile').checked = Boolean(socialState.profile.is_private);
  renderSocialLogTypeSettings();
  renderSocialShareSettingsEditor();
  setSocialProfileSettingsMessage('');
  showDialogAtTop($('#socialProfileSettingsModal'));
}

function socialShareableStreakGroups() {
  return getRecognizedStreakGroups().filter(group => getStreakConfig(group).enabled);
}

function socialTypeCheckboxes(section, prefs) {
  if (section === 'streaks') {
    const groups = socialShareableStreakGroups();
    if (!groups.length) return '<p class="social-sharing-empty">No streak types are currently enabled in Track.</p>';
    return groups.map(group => `
      <label class="social-type-choice"><input type="checkbox" data-social-share-type="${escapeAttr(group.key)}" ${prefs.excludedTypes?.includes(group.key) ? '' : 'checked'} /><span>${escapeHtml(group.label)}</span></label>`).join('');
  }
  const available = socialSectionTypeKeys(section);
  if (!available.length) return '<p class="social-sharing-empty">No matching types yet. New types will be shared automatically unless you exclude them later.</p>';
  return available.map(type => `
    <label class="social-type-choice"><input type="checkbox" data-social-share-type="${escapeAttr(type)}" ${prefs.excludedTypes?.includes(type) ? '' : 'checked'} /><span>${escapeHtml(socialTypeLabel(type))}</span></label>`).join('');
}

function socialItemChoiceMarkup(item, prefs, section = '') {
  const hidden = prefs.hiddenItemIds?.includes(item.id);
  const typeSelected = !prefs.excludedTypes?.includes(item.type);
  const tbrOnly = section === 'library' && socialIsTbrOnlyItem(item);
  const tbrAllowed = !tbrOnly || Boolean(prefs.includeTbr);
  const enabled = typeSelected && tbrAllowed;
  const visible = enabled && !hidden;
  return `<label class="social-item-choice${enabled ? '' : ' is-type-disabled'}" data-social-item-type="${escapeAttr(item.type)}" ${tbrOnly ? 'data-social-item-tbr="true"' : ''}>
    <input type="checkbox" data-social-share-item="${escapeAttr(item.id)}" ${visible ? 'checked' : ''} ${enabled ? '' : 'disabled'} />
    ${item.image ? `<img src="${escapeAttr(item.image)}" alt="" />` : '<span class="social-item-choice-placeholder"></span>'}
    <span><strong>${escapeHtml(item.title || 'Untitled')}</strong><small>${escapeHtml(getItemTypeLabel(item))}${tbrOnly ? ' · TBR' : ''}</small></span>
  </label>`;
}

function socialProfileThemePickerMarkup() {
  const selected = savedCalendarThemeId();
  const label = CALENDAR_THEMES.find(theme => theme.id === selected)?.label || 'Track colour';
  return `<article class="social-share-card social-profile-theme-card social-profile-theme-linked">
    <div class="social-share-card-head social-profile-theme-head"><span><strong>Profile colour</strong></span><span class="social-profile-theme-linked-value"><span class="social-profile-theme-dot" data-social-profile-theme-dot="${escapeAttr(selected)}" aria-hidden="true"></span>${escapeHtml(label)}</span></div>
  </article>`;
}

function renderSocialShareSettingsEditor() {
  const host = $('#socialShareSettings');
  if (!host) return;
  const settings = normalizeSocialShareSettings(socialState.shareSettings);
  const themeCard = socialProfileThemePickerMarkup();
  const withPeopleCard = `<article class="social-share-card social-with-people-share-card">
    <div class="social-share-card-head">
      <label class="social-share-enable"><input type="checkbox" data-social-share-with-people ${settings.shareWithPeople ? 'checked' : ''} /><span><strong>With people</strong><small>Show the “with” names attached to an item whenever that item is shared elsewhere on your profile.</small></span></label>
    </div>
  </article>`;
  host.innerHTML = themeCard + withPeopleCard + Object.entries(SOCIAL_SHARE_SECTION_META).map(([section, meta]) => {
    const prefs = settings[section];
    const candidates = meta.items ? socialShareCandidates(section) : [];
    const noStreaks = section === 'streaks' && socialShareableStreakGroups().length === 0;
    return `<article class="social-share-card" data-social-share-section="${escapeAttr(section)}">
      <div class="social-share-card-head">
        <label class="social-share-enable"><input type="checkbox" data-social-share-enabled ${prefs.enabled && !noStreaks ? 'checked' : ''} ${noStreaks ? 'disabled' : ''} /><span><strong>${escapeHtml(meta.label)}</strong><small>${escapeHtml(meta.description)}</small></span></label>
      </div>
      <div class="social-share-card-body" ${prefs.enabled && !noStreaks ? '' : 'hidden'}>
        ${section === 'library' ? `<label class="social-library-tbr-share"><input type="checkbox" data-social-share-tbr ${prefs.includeTbr ? 'checked' : ''} /><span><strong>Include TBR items</strong><small>Off by default. If shared, TBR stays in its own profile subsection and does not count toward tracked totals.</small></span></label>` : ''}
        <div class="social-type-choices">${socialTypeCheckboxes(section, prefs)}</div>
        ${meta.items ? `<details class="social-item-picker"><summary>Individual items <span>${candidates.length}</span></summary><div class="social-item-choice-list">${candidates.length ? candidates.map(item => socialItemChoiceMarkup(item, prefs, section)).join('') : '<p class="social-sharing-empty">No matching items yet.</p>'}</div></details>` : ''}
      </div>
    </article>`;
  }).join('');
}

function handleSocialShareFormChange(event) {
  const card = event.target.closest('[data-social-share-section]');
  if (!card) return;
  if (event.target.matches('[data-social-share-enabled]')) {
    const body = card.querySelector('.social-share-card-body');
    if (body) body.hidden = !event.target.checked;
    if (event.target.checked) {
      const choices = [...card.querySelectorAll('[data-social-share-type]')];
      // First opt-in shares everything. Existing exclusions stay intact unless
      // every currently available type had been excluded.
      if (choices.length && !choices.some(input => input.checked)) choices.forEach(input => { input.checked = true; });
    }
    return;
  }
  if (event.target.matches('[data-social-share-tbr]')) {
    const allowTbr = event.target.checked;
    card.querySelectorAll('[data-social-item-tbr="true"]').forEach(label => {
      const type = label.dataset.socialItemType;
      const typeChoice = card.querySelector(`[data-social-share-type="${CSS.escape(type)}"]`);
      const input = label.querySelector('[data-social-share-item]');
      const enabled = allowTbr && Boolean(typeChoice?.checked);
      label.classList.toggle('is-type-disabled', !enabled);
      if (input) {
        input.disabled = !enabled;
        if (enabled && !input.checked) input.checked = true;
      }
    });
    return;
  }
  if (event.target.matches('[data-social-share-type]')) {
    const type = event.target.dataset.socialShareType;
    const tbrAllowed = Boolean(card.querySelector('[data-social-share-tbr]')?.checked);
    card.querySelectorAll(`[data-social-item-type="${CSS.escape(type)}"]`).forEach(label => {
      const input = label.querySelector('[data-social-share-item]');
      const enabled = event.target.checked && (!label.hasAttribute('data-social-item-tbr') || tbrAllowed);
      label.classList.toggle('is-type-disabled', !enabled);
      if (input) {
        input.disabled = !enabled;
        if (enabled && !input.checked) input.checked = true;
      }
    });
  }
}

function readSocialShareSettingsEditor() {
  const next = emptySocialShareSettings();
  next.profileTheme = savedCalendarThemeId();
  next.shareWithPeople = Boolean($('#socialShareSettings [data-social-share-with-people]')?.checked);
  $$('#socialShareSettings [data-social-share-section]').forEach(card => {
    const section = card.dataset.socialShareSection;
    if (!next[section]) return;
    next[section].enabled = Boolean(card.querySelector('[data-social-share-enabled]')?.checked);
    next[section].excludedTypes = [...card.querySelectorAll('[data-social-share-type]:not(:checked)')].map(input => input.dataset.socialShareType).filter(Boolean);
    if (section === 'library') next.library.includeTbr = Boolean(card.querySelector('[data-social-share-tbr]')?.checked);
    if ('hiddenItemIds' in next[section]) {
      const candidates = socialShareCandidates(section);
      const candidateIds = new Set(candidates.map(item => item.id));
      const visibleIds = new Set([...card.querySelectorAll('[data-social-share-item]:checked')].map(input => input.dataset.socialShareItem));
      const preservedHidden = (socialState.shareSettings?.[section]?.hiddenItemIds || []).filter(id => !candidateIds.has(id));
      next[section].hiddenItemIds = [...new Set([
        ...preservedHidden,
        ...candidates.filter(item => {
          if (section === 'library' && socialIsTbrOnlyItem(item) && !next.library.includeTbr) return false;
          return !next[section].excludedTypes.includes(item.type) && !visibleIds.has(item.id);
        }).map(item => item.id)
      ])];
    }
  });
  return next;
}

function setSocialProfileSettingsMessage(message, error = false) {
  const node = $('#socialProfileSettingsMessage');
  if (!node) return;
  node.textContent = message || '';
  node.hidden = !message;
  node.classList.toggle('is-error', Boolean(error));
}

async function saveSocialProfileSettings(event) {
  event.preventDefault();
  if (!supabase || !currentUser || !socialState.schemaReady) return;
  const username = String($('#socialUsername')?.value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
    setSocialProfileSettingsMessage('Username must be 3–30 characters and use only letters, numbers, periods, underscores, or hyphens.', true);
    return;
  }
  const shareSettings = readSocialShareSettingsEditor();
  saveSocialLogTypeSettings();
  setSocialProfileSettingsMessage('Saving…');
  const update = {
    user_id: currentUser.id,
    username,
    display_name: String($('#socialDisplayName')?.value || '').trim(),
    bio: String($('#socialBio')?.value || '').trim(),
    is_private: Boolean($('#socialPrivateProfile')?.checked),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('profiles').upsert(update).select('user_id, username, display_name, bio, avatar_url, is_private, updated_at').single();
  if (error) {
    const message = error.code === '23505' ? 'That username is already taken.' : error.message;
    setSocialProfileSettingsMessage(message, true);
    return;
  }
  const prefsResult = await supabase.from('social_preferences').upsert({ user_id: currentUser.id, share_settings: shareSettings, updated_at: new Date().toISOString() });
  if (prefsResult.error) { setSocialProfileSettingsMessage(prefsResult.error.message, true); return; }
  socialState.profile = { ...data, share_settings: shareSettings };
  socialState.shareSettings = normalizeSocialShareSettings(shareSettings);
  await publishSocialSnapshot();
  $('#socialProfileSettingsModal')?.close();
  renderSocialMyProfile();
  loadSocialFollowing().catch(handleSocialLoadError);
}

function restartOnboardingTour() {
  if (!currentUser?.id) return;
  localStorage.setItem(onboardingStatusKey(currentUser.id), 'pending');
  localStorage.setItem(onboardingStepKey(currentUser.id), '0');
  clearOnboardingGuide();
  $('#socialProfileSettingsModal')?.close();
  window.location.assign('index.html');
}

function socialProfileInitial(profile) {
  return String(profile?.display_name || profile?.username || '?').trim().slice(0,1).toUpperCase() || '?';
}

function socialProfileWindowPosterMarkup(item) {
  const rating = Number(item?.rating || 0);
  return `<span class="social-window-poster">
    ${item?.image ? `<img src="${escapeAttr(item.image)}" alt="" loading="lazy" />` : `<span class="social-window-poster-text">${escapeHtml(item?.title || 'Untitled')}</span>`}
    ${item?.recommended ? '<span class="social-window-heart" aria-hidden="true">♥</span>' : ''}
    ${rating > 0 ? `<span class="social-window-rating">★ ${escapeHtml(formatPersonalRating(rating))}</span>` : ''}
  </span>`;
}

function socialProfileCardMarkup(profile, snapshot = null, relation = null) {
  const payload = snapshot?.payload || snapshot || {};
  const totals = payload.totals || [];
  const sections = payload.sections || {};
  const previewEntries = (sections.recommended?.length ? sections.recommended : sections.library || []).slice(0, 7);
  const previewLabel = sections.recommended?.length ? 'Recommended' : 'Library';
  const totalText = totals.slice(0,4).map(entry => `${entry.count} ${String(entry.label || '').toLowerCase()}`).join(' · ');
  const relationButton = profile.user_id === currentUser?.id ? '' : socialFollowButtonMarkup(profile, relation);
  const hasSnapshot = Boolean(snapshot);
  const profileTheme = SOCIAL_PROFILE_THEME_IDS.has(String(payload.theme || '')) ? String(payload.theme) : 'blue';
  return `<article class="social-profile-card${hasSnapshot ? ' social-profile-library-window' : ''}" data-social-profile-id="${escapeAttr(profile.user_id)}" data-social-profile-theme="${escapeAttr(profileTheme)}">
    <div class="social-profile-card-head">
      <button class="social-profile-card-main" type="button" data-social-view-profile="${escapeAttr(profile.user_id)}">
        <span class="social-avatar">${escapeHtml(socialProfileInitial(profile))}</span>
        <span><strong>${escapeHtml(profile.display_name || profile.username)}</strong><small>@${escapeHtml(profile.username)}${profile.is_private ? ' · private' : ''}</small>${totalText ? `<em>${escapeHtml(totalText)}</em>` : ''}</span>
      </button>
      ${relationButton}
    </div>
    ${hasSnapshot ? `<button class="social-library-window-preview" type="button" data-social-view-profile="${escapeAttr(profile.user_id)}"><span class="social-library-window-label">${escapeHtml(previewLabel)}</span><span class="social-library-window-posters">${previewEntries.length ? previewEntries.map(socialProfileWindowPosterMarkup).join('') : '<span class="social-library-window-empty">No shared items yet</span>'}</span><span class="social-library-window-open">Open profile →</span></button>` : ''}
  </article>`;
}

function socialFollowButtonMarkup(profile, relation = null) {
  if (!profile || profile.user_id === currentUser?.id) return '';
  const status = relation?.status || '';
  const label = status === 'accepted' ? 'Following' : status === 'pending' ? 'Requested' : 'Follow';
  const cls = status ? ' is-active' : '';
  return `<button class="social-follow-button${cls}" type="button" data-social-follow="${escapeAttr(profile.user_id)}" data-follow-status="${escapeAttr(status)}" data-profile-private="${profile.is_private ? 'true' : 'false'}">${label}</button>`;
}

async function loadSocialFollowing() {
  if (!socialState.schemaReady || !supabase || !currentUser) return;
  const [outgoingResult, incomingResult] = await Promise.all([
    supabase.from('follows').select('follower_id, following_id, status, created_at').eq('follower_id', currentUser.id),
    supabase.from('follows').select('follower_id, following_id, status, created_at').eq('following_id', currentUser.id)
  ]);
  if (outgoingResult.error) throw outgoingResult.error;
  if (incomingResult.error) throw incomingResult.error;

  const accepted = (outgoingResult.data || []).filter(row => row.status === 'accepted');
  const ids = accepted.map(row => row.following_id);
  let profiles = [];
  let snapshots = [];
  if (ids.length) {
    const [profileResult, snapshotResult] = await Promise.all([
      supabase.from('profiles').select('user_id, username, display_name, bio, avatar_url, is_private').in('user_id', ids),
      supabase.from('social_snapshots').select('user_id, payload, updated_at').in('user_id', ids)
    ]);
    if (profileResult.error) throw profileResult.error;
    if (snapshotResult.error && !socialSchemaMissing(snapshotResult.error)) throw snapshotResult.error;
    profiles = profileResult.data || [];
    snapshots = snapshotResult.data || [];
  }
  socialState.followingProfiles = profiles;
  const snapshotMap = new Map(snapshots.map(row => [row.user_id, row]));
  socialState.followingSnapshots = snapshotMap;
  const relationMap = new Map(accepted.map(row => [row.following_id, row]));
  const host = $('#socialFollowingList');
  if (host) host.innerHTML = profiles.map(profile => socialProfileCardMarkup(profile, snapshotMap.get(profile.user_id), relationMap.get(profile.user_id))).join('');
  if ($('#socialFollowingEmpty')) $('#socialFollowingEmpty').hidden = profiles.length > 0;

  const incoming = incomingResult.data || [];
  const requests = incoming.filter(row => row.status === 'pending');
  const followers = incoming.filter(row => row.status === 'accepted');
  const incomingIds = [...new Set(incoming.map(row => row.follower_id).filter(Boolean))];
  let incomingProfiles = [];
  if (incomingIds.length) {
    const { data, error } = await supabase.from('profiles').select('user_id, username, display_name, avatar_url, is_private').in('user_id', incomingIds);
    if (error) throw error;
    incomingProfiles = data || [];
  }
  const incomingProfileMap = new Map(incomingProfiles.map(profile => [profile.user_id, profile]));
  socialState.followRequestProfiles = requests.map(row => incomingProfileMap.get(row.follower_id)).filter(Boolean);
  socialState.followerProfiles = followers.map(row => incomingProfileMap.get(row.follower_id)).filter(Boolean);
  const requestHost = $('#socialFollowRequests');
  if (requestHost) {
    requestHost.innerHTML = socialState.followRequestProfiles.length
      ? `<div class="social-request-heading">Follow requests</div>${socialState.followRequestProfiles.map(profile => `<article class="social-request-row"><span class="social-avatar">${escapeHtml(socialProfileInitial(profile))}</span><button class="social-request-person" type="button" data-social-view-profile="${escapeAttr(profile.user_id)}"><span><strong>${escapeHtml(profile.display_name || profile.username)}</strong><small>@${escapeHtml(profile.username)}</small></span></button><div><button class="primary-button social-small-button" type="button" data-social-accept-follow="${escapeAttr(profile.user_id)}">Accept</button><button class="quiet-button social-small-button" type="button" data-social-decline-follow="${escapeAttr(profile.user_id)}">Decline</button></div></article>`).join('')}`
      : '';
  }
  await loadAcceptedSocialConnections();
  renderSocialFeed();
}

async function loadSocialFeed() {
  if (!socialState.schemaReady) return;
  if (!socialState.followingProfiles.length) await loadSocialFollowing();
  renderSocialFeed();
}

function socialFeedProgressBadge(item) {
  if (!item) return '';
  if (item.progressBadge) return item.progressBadge;
  return item.progress || '';
}

function socialFeedCardMarkup(entry) {
  const { profile, item } = entry;
  const badge = socialFeedProgressBadge(item);
  const rating = Number(item.rating || 0);
  const meta = [item.typeLabel || getTypeLabel(item.type), badge].filter(Boolean).join(' · ');
  return `<article class="social-feed-card"><button class="social-feed-content" type="button" data-social-open-item="${escapeAttr(item.key)}" data-social-profile-id="${escapeAttr(profile.user_id)}">${item.image ? `<img class="social-feed-image" src="${escapeAttr(item.image)}" alt=""/>` : ''}<span class="social-feed-copy"><strong>${escapeHtml(item.title || 'Untitled')}</strong>${meta ? `<small>${escapeHtml(meta)}</small>` : ''}<span class="social-feed-badges">${rating ? `<b>${escapeHtml(String(rating))}★</b>` : ''}${item.recommended ? '<b>♥</b>' : ''}</span>${item.comment ? `<span class="social-feed-comment">${escapeHtml(item.comment)}</span>` : ''}</span></button><button class="social-feed-person" type="button" data-social-view-profile="${escapeAttr(profile.user_id)}"><span class="social-avatar">${escapeHtml(socialProfileInitial(profile))}</span><span>${escapeHtml(profile.display_name || profile.username)}</span></button></article>`;
}

function socialBuddyInviteMarkup(watch) {
  const item = watch?.item || {};
  const other = (watch?.members || []).find(member => String(member.user_id) !== String(currentUser?.id || ''));
  const person = other?.profile?.display_name || other?.profile?.username || 'Someone';
  return `<article class="social-buddy-invite"><div class="social-buddy-invite-main">${item.image ? `<img src="${escapeAttr(item.image)}" alt="" />` : ''}<span><small>Buddy Watch · ${escapeHtml(person)}</small><strong>${escapeHtml(item.title || watch.title || 'Buddy Watch')}</strong></span></div><div class="social-buddy-invite-actions"><button class="primary-button social-small-button" type="button" data-buddy-accept="${escapeAttr(watch.id)}">Accept</button><button class="quiet-button social-small-button" type="button" data-buddy-decline="${escapeAttr(watch.id)}">Decline</button></div></article>`;
}

function renderSocialFeed() {
  const host = $('#socialFeed');
  if (!host) return;
  const entries = [];
  for (const profile of socialState.followingProfiles || []) {
    const row = socialState.followingSnapshots.get(profile.user_id);
    const items = row?.payload?.sections?.activity || [];
    for (const item of items) {
      if (!item?.trackedDate) continue;
      entries.push({ profile, item, date: item.trackedDate });
    }
  }
  entries.sort((a,b) => String(b.date).localeCompare(String(a.date)));
  const invites = (socialState.buddyWatches || []).filter(watch => watch.myMembership?.status === 'pending');
  const requests = socialState.followRequestProfiles || [];
  const followers = socialState.followerProfiles || [];
  const requestsMarkup = requests.length ? `<section class="social-feed-network"><div class="social-feed-network-heading"><strong>Follow requests</strong></div><div class="social-feed-network-list">${requests.map(profile => `<article class="social-feed-network-person"><button type="button" data-social-view-profile="${escapeAttr(profile.user_id)}"><span class="social-avatar">${escapeHtml(socialProfileInitial(profile))}</span><span><strong>${escapeHtml(profile.display_name || profile.username)}</strong><small>@${escapeHtml(profile.username)}</small></span></button><div><button class="primary-button social-small-button" type="button" data-social-accept-follow="${escapeAttr(profile.user_id)}">Accept</button><button class="quiet-button social-small-button" type="button" data-social-decline-follow="${escapeAttr(profile.user_id)}">Decline</button></div></article>`).join('')}</div></section>` : '';
  const followersMarkup = followers.length ? `<section class="social-feed-network"><div class="social-feed-network-heading"><strong>Followers</strong><small>${followers.length}</small></div><div class="social-feed-follower-strip">${followers.map(profile => `<button class="social-feed-follower" type="button" data-social-view-profile="${escapeAttr(profile.user_id)}"><span class="social-avatar">${escapeHtml(socialProfileInitial(profile))}</span><span>${escapeHtml(profile.display_name || profile.username)}</span></button>`).join('')}</div></section>` : '';
  host.innerHTML = requestsMarkup + followersMarkup + invites.map(socialBuddyInviteMarkup).join('') + entries.slice(0,120).map(socialFeedCardMarkup).join('');
  if ($('#socialFeedEmpty')) $('#socialFeedEmpty').hidden = requests.length > 0 || followers.length > 0 || invites.length > 0 || entries.length > 0;
}

async function handleSocialPeopleSearch(event) {
  event.preventDefault();
  const query = String($('#socialPeopleSearchInput')?.value || '').trim().toLowerCase();
  const host = $('#socialPeopleResults');
  if (!host || !socialState.schemaReady || !query) return;
  host.innerHTML = '<p class="loading-detail">Searching…</p>';
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, bio, avatar_url, is_private')
    .ilike('username', `%${query.replace(/[%_]/g, '')}%`)
    .neq('user_id', currentUser.id)
    .limit(30);
  if (error) { host.innerHTML = `<p class="api-error">${escapeHtml(error.message)}</p>`; return; }
  const ids = (profiles || []).map(profile => profile.user_id);
  let relations = [];
  if (ids.length) {
    const result = await supabase.from('follows').select('following_id, status').eq('follower_id', currentUser.id).in('following_id', ids);
    if (!result.error) relations = result.data || [];
  }
  const relationMap = new Map(relations.map(row => [row.following_id, row]));
  socialState.peopleResults = profiles || [];
  host.innerHTML = profiles?.length ? profiles.map(profile => socialProfileCardMarkup(profile, null, relationMap.get(profile.user_id))).join('') : '<p class="empty-state">No matching usernames.</p>';
}

async function handleSocialActionClick(event) {
  const buddyAccept = event.target.closest('[data-buddy-accept]');
  if (buddyAccept) { await respondBuddyInvite(buddyAccept.dataset.buddyAccept, true); renderSocialFeed(); return; }
  const buddyDecline = event.target.closest('[data-buddy-decline]');
  if (buddyDecline) { await respondBuddyInvite(buddyDecline.dataset.buddyDecline, false); renderSocialFeed(); return; }
  const openItem = event.target.closest('[data-social-open-item]');
  if (openItem) {
    await openSocialSharedItemDetail(openItem.dataset.socialProfileId || currentUser?.id || '', openItem.dataset.socialOpenItem || '');
    return;
  }
  const viewMode = event.target.closest('[data-social-profile-view-mode]');
  if (viewMode) {
    const userId = viewMode.dataset.socialProfileId || currentUser?.id || '';
    socialState.profileViewModes.set(userId, viewMode.dataset.socialProfileViewMode === 'recommended' ? 'recommended' : 'all');
    rerenderSocialProfileView(userId);
    return;
  }
  const expand = event.target.closest('[data-social-library-expand]');
  if (expand) {
    const userId = expand.dataset.socialProfileId || currentUser?.id || '';
    const key = expand.dataset.socialLibraryExpand || '';
    const expanded = socialProfileExpandedSet(userId);
    if (expanded.has(key)) expanded.delete(key); else expanded.add(key);
    rerenderSocialProfileView(userId);
    return;
  }
  const carousel = event.target.closest('[data-social-library-carousel]');
  if (carousel) {
    const shelf = carousel.closest('.social-library-shelf, .social-profile-secondary-shelf');
    const grid = shelf?.querySelector('.library-poster-grid:not(.is-expanded)');
    if (grid) grid.scrollBy({ left: (carousel.dataset.socialLibraryCarousel === 'prev' ? -1 : 1) * Math.max(260, grid.clientWidth * .75), behavior: 'smooth' });
    return;
  }
  const view = event.target.closest('[data-social-view-profile]');
  if (view) { await openSocialProfileView(view.dataset.socialViewProfile); return; }
  const follow = event.target.closest('[data-social-follow]');
  if (follow) { await toggleSocialFollow(follow); return; }
  const accept = event.target.closest('[data-social-accept-follow]');
  if (accept) { await respondToFollowRequest(accept.dataset.socialAcceptFollow, true); return; }
  const decline = event.target.closest('[data-social-decline-follow]');
  if (decline) { await respondToFollowRequest(decline.dataset.socialDeclineFollow, false); return; }
}

async function toggleSocialFollow(button) {
  const targetId = button.dataset.socialFollow;
  const status = button.dataset.followStatus || '';
  if (!targetId || !currentUser) return;
  button.disabled = true;
  try {
    if (status) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
      if (error) throw error;
    } else {
      const nextStatus = button.dataset.profilePrivate === 'true' ? 'pending' : 'accepted';
      const { error } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetId, status: nextStatus, updated_at: new Date().toISOString() });
      if (error) throw error;
    }
    resetFollowingSocialContext();
    loadFollowingSocialContext().catch(() => {});
    await loadSocialFollowing();
    if ($('#socialPeopleSearchInput')?.value) await handleSocialPeopleSearch(new Event('submit'));
    const modal = $('#socialViewProfileModal');
    if (modal?.open) await openSocialProfileView(targetId, false);
  } catch (error) {
    console.warn('[Social] follow failed:', error);
  } finally {
    button.disabled = false;
  }
}

async function respondToFollowRequest(followerId, accept) {
  if (!followerId || !currentUser) return;
  const query = supabase.from('follows');
  const result = accept
    ? await query.update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('follower_id', followerId).eq('following_id', currentUser.id)
    : await query.delete().eq('follower_id', followerId).eq('following_id', currentUser.id);
  if (result.error) throw result.error;
  await loadSocialFollowing();
}

async function getSocialFollowRelation(targetId) {
  if (!targetId || !currentUser) return null;
  const { data, error } = await supabase.from('follows').select('follower_id, following_id, status').eq('follower_id', currentUser.id).eq('following_id', targetId).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function openSocialProfileView(userId, openModal = true) {
  if (!userId || !socialState.schemaReady) return;
  const [profileResult, snapshotResult, relation] = await Promise.all([
    supabase.from('profiles').select('user_id, username, display_name, bio, avatar_url, is_private').eq('user_id', userId).single(),
    supabase.from('social_snapshots').select('user_id, payload, updated_at').eq('user_id', userId).maybeSingle(),
    getSocialFollowRelation(userId)
  ]);
  if (profileResult.error) throw profileResult.error;
  const profile = profileResult.data;
  const snapshot = snapshotResult.error ? null : snapshotResult.data;
  socialState.viewedProfile = { profile, snapshot: snapshot?.payload || null, relation };
  const body = $('#socialViewProfileBody');
  if (body) body.innerHTML = socialProfileViewMarkup(profile, snapshot?.payload || null, relation, false);
  if (openModal) showDialogAtTop($('#socialViewProfileModal'));
}

function socialProfileSearchQuery(userId) {
  return String(socialState.profileSearchQueries.get(String(userId || '')) || '').trim();
}

function socialSharedItemMatchesSearch(item, query) {
  const needle = normalizeSearchText(query || '');
  if (!needle) return true;
  const people = Array.isArray(item?.people) ? item.people : [];
  const haystack = normalizeSearchText([
    item?.title,
    item?.subtitle,
    item?.notes,
    item?.subcategory,
    item?.typeLabel,
    item?.libraryGroupLabel,
    item?.statusLabel,
    item?.progress,
    item?.artistName,
    ...people
  ].filter(Boolean).join(' '));
  return haystack.includes(needle);
}

function handleSocialProfileSearchInput(event) {
  const input = event.target.closest('[data-social-profile-search]');
  if (!input) return;
  const userId = String(input.dataset.socialProfileId || '');
  if (!userId) return;
  socialState.profileSearchQueries.set(userId, input.value || '');
  const caret = Number.isFinite(input.selectionStart) ? input.selectionStart : input.value.length;
  const modal = $('#socialViewProfileModal');
  const scrollTop = modal?.scrollTop || 0;
  rerenderSocialProfileView(userId);
  const next = $('#socialViewProfileBody')?.querySelector(`[data-social-profile-search][data-social-profile-id="${CSS.escape(userId)}"]`);
  if (next) {
    next.focus({ preventScroll: true });
    try { next.setSelectionRange(caret, caret); } catch {}
  }
  if (modal) modal.scrollTop = scrollTop;
}

function socialProfileExpandedSet(userId) {
  const key = String(userId || 'self');
  if (!socialState.profileExpandedGroups.has(key)) socialState.profileExpandedGroups.set(key, new Set());
  return socialState.profileExpandedGroups.get(key);
}

function socialProfileViewMode(userId, payload) {
  const available = payload?.sections || {};
  const sharing = payload?.sharing || {};
  const recommendedAvailable = sharing.recommended ?? Boolean(available.recommended?.length);
  const libraryAvailable = sharing.library ?? Boolean(available.library?.length);
  const saved = socialState.profileViewModes.get(String(userId || 'self'));
  if (saved === 'recommended' && recommendedAvailable) return 'recommended';
  if (saved === 'all' && libraryAvailable) return 'all';
  if (libraryAvailable) return 'all';
  if (recommendedAvailable) return 'recommended';
  return 'all';
}

function socialProfileItemGroupKey(item) {
  return item?.libraryGroup || slugifyType(item?.typeLabel || item?.type || 'Other');
}

function socialProfileItemGroupLabel(items, key) {
  return items?.find(item => item.libraryGroupLabel)?.libraryGroupLabel || items?.find(item => item.typeLabel)?.typeLabel || socialTypeLabel(key);
}

function socialLibraryPosterMarkup(item, profileId = '') {
  const rating = Math.max(0, Math.min(5, Number(item?.rating || 0)));
  const subcategory = cleanTypeLabel(item?.subcategory || '');
  const statusKey = cleanTypeLabel(item?.statusKey || '');
  const statusLabel = cleanTypeLabel(item?.statusLabel || '');
  const sourceType = item?.sourceType || item?.type || '';
  const hasImage = Boolean(String(item?.image || '').trim());
  const people = Array.isArray(item?.people) ? item.people.filter(Boolean) : [];
  // A TV episode position appears only while actively watching. Old snapshots are
  // also guarded here so caught-up/paused/finished shows cannot keep stale progress.
  const progress = sourceType === 'tv' ? (item?.activelyWatching === true ? String(item?.progress || '') : '') : String(item?.progress || '');
  const recommendedBadge = item?.recommended ? '<span class="library-recommended-badge" aria-label="Recommended" title="Recommended">♥</span>' : '';
  const subcategoryBadge = subcategory ? `<span class="library-subcategory-badge" title="${escapeAttr(subcategory)}">${escapeHtml(subcategory)}</span>` : '';
  // Match the user's own Library cards: state badges are reserved for exceptional
  // dispositions, not ordinary In progress / Up to date / Finished states.
  const dispositionBadge = ['paused','stopped','not-released'].includes(statusKey)
    ? `<span class="library-disposition-badge social-library-status-badge ${escapeAttr(statusKey)}">${escapeHtml(statusKey === 'not-released' && item?.releaseDate ? `Not Released · ${formatShortCalendarDate(String(item.releaseDate).slice(0,10))}` : (statusLabel || (statusKey === 'paused' ? 'Paused' : statusKey === 'stopped' ? 'Stopped' : 'Not Released')))}</span>`
    : '';
  const ratingBadge = rating > 0 ? `<span class="library-rating-badge">★ ${escapeHtml(formatPersonalRating(rating))}</span>` : '';
  const progressBadge = progress ? `<span class="social-library-progress-badge">${escapeHtml(progress)}</span>` : '';
  const peopleBadge = people.length ? `<span class="social-library-people-badge">with ${escapeHtml(people.join(', '))}</span>` : '';
  const common = `type="button" data-social-open-item="${escapeAttr(item?.key || '')}" data-social-profile-id="${escapeAttr(profileId)}" aria-label="Open ${escapeAttr(item?.title || 'item')}"`;
  if (hasImage) {
    return `<button class="library-poster-button social-library-poster" ${common} title="${escapeAttr([item.title, item.subtitle, rating ? `${formatPersonalRating(rating)}/5` : '', progress, people.length ? `with ${people.join(', ')}` : ''].filter(Boolean).join(' · '))}"><img class="library-poster-image" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title || '')}" loading="lazy" />${recommendedBadge}${subcategoryBadge}${dispositionBadge}${ratingBadge}${progressBadge}${peopleBadge}</button>`;
  }
  return `<button class="library-poster-button library-text-card-button social-library-poster" ${common}><span class="library-text-card">${recommendedBadge}${subcategoryBadge}${dispositionBadge}<strong class="library-text-card-title">${escapeHtml(item?.title || 'Untitled')}</strong>${item?.subtitle ? `<span class="social-library-text-subtitle">${escapeHtml(item.subtitle)}</span>` : ''}${rating > 0 ? `<span class="library-text-card-rating">★ ${escapeHtml(formatPersonalRating(rating))} / 5</span>` : ''}${progress ? `<span class="social-library-text-meta">${escapeHtml(progress)}</span>` : ''}${people.length ? `<span class="social-library-text-meta">with ${escapeHtml(people.join(', '))}</span>` : ''}</span></button>`;
}

function socialLibrarySubgroups(items) {
  const sourceType = items?.[0]?.sourceType || '';
  const hasSharedTbr = items.some(item => item.sharedVia === 'tbr' || item.statusKey === 'not-started' && item.statusLabel === 'Not started yet');
  if (((sourceType === 'tv' || sourceType === 'book') && items.some(item => item.statusLabel)) || hasSharedTbr) {
    const map = new Map();
    for (const item of items) {
      const label = item.sharedVia === 'tbr' ? 'Not started yet' : (item.statusLabel || (hasSharedTbr ? 'Tracked' : 'Other'));
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(item);
    }
    const preferred = ['In progress','Currently watching','Currently reading','Up to date','Finished','Tracked','Not started yet','Paused','Stopped','Not Released'];
    return [...map.entries()].sort(([a],[b]) => {
      const ai = preferred.indexOf(a), bi = preferred.indexOf(b);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b);
    });
  }
  if (items.some(item => cleanTypeLabel(item.subcategory || ''))) {
    const map = new Map();
    for (const item of items) {
      const label = cleanTypeLabel(item.subcategory || '') || 'General';
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(item);
    }
    const preferred = ['Album','Artist','Song','Concert','General'];
    return [...map.entries()].sort(([a],[b]) => {
      const ai = preferred.indexOf(a), bi = preferred.indexOf(b);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b);
      return a.localeCompare(b);
    });
  }
  return [];
}

function socialLibraryShelfMarkup(groupKey, items, profileId, scope = 'library') {
  const expansionKey = `${scope}:${groupKey}`;
  const expanded = socialProfileExpandedSet(profileId).has(expansionKey);
  const label = socialProfileItemGroupLabel(items, groupKey);
  const subgroups = expanded && scope !== 'tbr' ? socialLibrarySubgroups(items) : [];
  const controls = `<div class="library-shelf-controls">${expanded ? '' : `<button class="library-carousel-button" type="button" data-social-library-carousel="prev" aria-label="Scroll ${escapeAttr(label)} left">‹</button><button class="library-carousel-button" type="button" data-social-library-carousel="next" aria-label="Scroll ${escapeAttr(label)} right">›</button>`}<button class="library-expand-button" type="button" data-social-library-expand="${escapeAttr(expansionKey)}" data-social-profile-id="${escapeAttr(profileId)}">${expanded ? 'Collapse' : 'View all'}</button></div>`;
  let content = '';
  if (expanded && subgroups.length) {
    content = `<div class="tv-library-status-groups library-subcategory-groups">${subgroups.map(([subLabel, subItems]) => `<section class="tv-library-status-group library-subcategory-group is-expanded"><div class="tv-library-status-heading library-subcategory-heading"><div><h3 class="tv-library-status-title">${escapeHtml(subLabel)}</h3><span class="library-group-count">${subItems.length}</span></div></div><div class="library-poster-grid is-expanded">${subItems.map(item => socialLibraryPosterMarkup(item, profileId)).join('')}</div></section>`).join('')}</div>`;
  } else {
    content = `<div class="library-poster-grid${expanded ? ' is-expanded' : ''}">${items.map(item => socialLibraryPosterMarkup(item, profileId)).join('')}</div>`;
  }
  return `<section class="library-group library-shelf social-library-shelf${expanded ? ' is-expanded' : ' is-collapsed'}" data-social-library-group="${escapeAttr(groupKey)}"><div class="library-group-heading-row"><div class="library-group-title-wrap"><h2 class="library-group-title">${escapeHtml(label)}</h2><span class="library-group-count">${items.length}</span></div>${controls}</div>${content}</section>`;
}

function socialLibraryBrowserMarkup(profileId, payload) {
  const sections = payload?.sections || {};
  const query = socialProfileSearchQuery(profileId);
  const recommendedRaw = sections.recommended || [];
  const allRaw = sections.library || [];
  const tbrRaw = sections.tbr || [];
  const sharing = payload?.sharing || {};
  const recommendedAvailable = sharing.recommended ?? Boolean(recommendedRaw.length);
  const libraryAvailable = sharing.library ?? Boolean(allRaw.length || tbrRaw.length);
  if (!recommendedAvailable && !libraryAvailable) return '';
  const mode = socialProfileViewMode(profileId, payload);
  const recommended = query ? recommendedRaw.filter(item => socialSharedItemMatchesSearch(item, query)) : recommendedRaw;
  const all = query ? allRaw.filter(item => socialSharedItemMatchesSearch(item, query)) : allRaw;
  const tbr = query ? tbrRaw.filter(item => socialSharedItemMatchesSearch(item, query)) : tbrRaw;
  // Shared TBR belongs inside the appropriate Library type. It is visually
  // distinguished only when expanded, where it becomes "Not started yet".
  const entries = mode === 'recommended' ? recommended : [...all, ...tbr];
  if (query && !entries.length) return '';
  const tabs = recommendedAvailable && libraryAvailable ? `<div class="library-folder-tabs social-library-folder-tabs" role="tablist" aria-label="Shared library"><button class="library-folder-tab${mode === 'all' ? ' is-active' : ''}" type="button" data-social-profile-view-mode="all" data-social-profile-id="${escapeAttr(profileId)}" aria-selected="${mode === 'all'}">All</button><button class="library-folder-tab${mode === 'recommended' ? ' is-active' : ''}" type="button" data-social-profile-view-mode="recommended" data-social-profile-id="${escapeAttr(profileId)}" aria-selected="${mode === 'recommended'}">Recommended</button></div>` : '';
  const grouped = new Map();
  for (const item of entries) {
    const key = socialProfileItemGroupKey(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  const shelves = [...grouped.entries()].sort((a,b) => socialProfileItemGroupLabel(a[1],a[0]).localeCompare(socialProfileItemGroupLabel(b[1],b[0]))).map(([key,items]) => socialLibraryShelfMarkup(key, items, profileId, mode)).join('');
  const empty = entries.length ? '' : `<p class="empty-state">Nothing shared in ${mode === 'recommended' ? 'Recommended' : 'Library'}.</p>`;
  return `<section class="social-profile-library-browser"><div class="social-profile-library-heading"><h3>Library</h3>${tabs}</div><div class="social-profile-library-groups">${shelves || empty}</div></section>`;
}

function socialSecondaryShelfMarkup(title, entries, profileId, scope) {
  const query = socialProfileSearchQuery(profileId);
  const visibleEntries = query ? (entries || []).filter(item => socialSharedItemMatchesSearch(item, query)) : (entries || []);
  if (!visibleEntries.length) return '';
  const key = `${scope}:root`;
  const expanded = socialProfileExpandedSet(profileId).has(key);
  return `<section class="social-profile-secondary-shelf library-shelf${expanded ? ' is-expanded' : ''}"><div class="library-group-heading-row"><div class="library-group-title-wrap"><h2 class="library-group-title">${escapeHtml(title)}</h2><span class="library-group-count">${visibleEntries.length}</span></div><div class="library-shelf-controls">${expanded ? '' : `<button class="library-carousel-button" type="button" data-social-library-carousel="prev">‹</button><button class="library-carousel-button" type="button" data-social-library-carousel="next">›</button>`}<button class="library-expand-button" type="button" data-social-library-expand="${escapeAttr(key)}" data-social-profile-id="${escapeAttr(profileId)}">${expanded ? 'Collapse' : 'View all'}</button></div></div><div class="library-poster-grid${expanded ? ' is-expanded' : ''}">${visibleEntries.map(item => socialLibraryPosterMarkup(item, profileId)).join('')}</div></section>`;
}

function socialProfileViewMarkup(profile, snapshot, relation = null, isSelf = false) {
  if (!profile) return '<p class="api-error">Profile unavailable.</p>';
  const payload = snapshot || { totals: [], sections: {}, theme: 'blue' };
  const sections = payload.sections || {};
  const canSee = Boolean(snapshot) || isSelf;
  const profileId = profile.user_id || currentUser?.id || 'self';
  const profileTheme = SOCIAL_PROFILE_THEME_IDS.has(String(payload.theme || '')) ? String(payload.theme) : 'blue';
  const followButton = isSelf ? '<button class="secondary-button" type="button" data-social-open-settings>Profile & sharing</button>' : socialFollowButtonMarkup(profile, relation);
  const totals = payload.totals || [];
  const totalMarkup = totals.length ? `<div class="social-total-summary" aria-label="Shared tracked totals">${totals.map(total => `<span class="social-total-pill"><strong>${Number(total.count || 0)}</strong><span>${escapeHtml(total.label || total.type)}</span></span>`).join('')}</div>` : '';
  const privateMessage = !canSee && profile.is_private ? '<p class="social-private-message">This profile is private. Follow to see the sections they choose to share.</p>' : '';
  const searchQuery = !isSelf ? socialProfileSearchQuery(profileId) : '';
  const searchMarkup = canSee && !isSelf ? `<div class="social-profile-search-row"><label class="library-search-control social-profile-search-control"><input type="search" data-social-profile-search data-social-profile-id="${escapeAttr(profileId)}" value="${escapeAttr(searchQuery)}" placeholder="Search @${escapeAttr(profile.username || 'profile')}" autocomplete="off" aria-label="Search ${escapeAttr(profile.display_name || profile.username || 'profile')}'s shared items" /></label></div>` : '';
  const streakMarkup = canSee ? socialSharedSectionMarkup('streaks', sections.streaks || []) : '';
  const upNextMarkup = canSee ? socialSecondaryShelfMarkup('Up Next', sections.upnext || [], profileId, 'upnext') : '';
  const ratingOnly = canSee ? (sections.ratings || []).filter(item => !(sections.library || []).some(lib => lib.key === item.key) && !(sections.recommended || []).some(rec => rec.key === item.key)) : [];
  const ratingMarkup = canSee ? socialSecondaryShelfMarkup('Ratings', ratingOnly, profileId, 'ratings') : '';
  const libraryMarkup = canSee ? socialLibraryBrowserMarkup(profileId, payload) : '';
  const noSearchMatches = canSee && !isSelf && searchQuery && !upNextMarkup && !ratingMarkup && !libraryMarkup
    ? `<p class="empty-state social-profile-search-empty">No shared items match “${escapeHtml(searchQuery)}”.</p>`
    : '';
  return `<div class="social-profile-surface" data-social-profile-theme="${escapeAttr(profileTheme)}"><div class="social-profile-hero"><span class="social-avatar social-avatar-large">${escapeHtml(socialProfileInitial(profile))}</span><div><h2>${escapeHtml(profile.display_name || profile.username)}</h2><p>@${escapeHtml(profile.username)}${profile.is_private ? ' · private' : ''}</p>${profile.bio ? `<div class="social-profile-bio">${escapeHtml(profile.bio)}</div>` : ''}</div><div class="social-profile-hero-action">${followButton}</div></div>${privateMessage}${searchMarkup}${totalMarkup}${streakMarkup}${noSearchMatches}${upNextMarkup}${ratingMarkup}${libraryMarkup}</div>`;
}

function socialSharedSectionMarkup(section, entries) {
  const meta = SOCIAL_SHARE_SECTION_META[section];
  if (!meta || !entries?.length) return '';
  if (section === 'streaks') {
    return `<section class="social-shared-section social-shared-streaks"><div class="social-shared-section-heading"><h3>${escapeHtml(meta.label)}</h3></div><div class="social-track-streak-summary">${entries.map(entry => `<div class="social-streak-pill"><strong>${Number(entry.count || 0)}</strong><span>${escapeHtml(entry.label || 'Streak')}</span>${entry.restToday ? '<small>rest day</small>' : ''}</div>`).join('')}</div></section>`;
  }
  return `<section class="social-shared-section"><h3>${escapeHtml(meta.label)}</h3><div class="social-item-grid">${entries.map(entry => socialSharedItemMarkup(entry, section)).join('')}</div></section>`;
}

function socialSharedItemMarkup(item, section) {
  const meta = [];
  if (Number(item.rating || 0)) meta.push(`${Number(item.rating).toFixed(Number(item.rating) % 1 ? 1 : 0)}★`);
  if (item.progress) meta.push(item.progress);
  if (item.typeLabel) meta.push(item.typeLabel);
  const people = Array.isArray(item.people) ? item.people.filter(Boolean) : [];
  const withMarkup = people.length ? `<span class="social-item-with">with ${escapeHtml(people.join(', '))}</span>` : '';
  return `<article class="social-item-card">${item.image ? `<img src="${escapeAttr(item.image)}" alt="" />` : '<div class="social-item-card-placeholder"></div>'}<div><strong>${escapeHtml(item.title || 'Untitled')}</strong>${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ''}${withMarkup}${meta.length ? `<em>${escapeHtml(meta.join(' · '))}</em>` : ''}</div></article>`;
}

function socialPayloadForOwner(ownerId) {
  const id = String(ownerId || '');
  if (id === String(currentUser?.id || '')) return socialState.snapshot || buildSocialSnapshotPayload();
  if (socialState.viewedProfile?.profile?.user_id === id) return socialState.viewedProfile.snapshot || null;
  return null;
}

function socialProfileForOwner(ownerId) {
  const id = String(ownerId || '');
  if (id === String(currentUser?.id || '')) return socialState.profile;
  if (socialState.viewedProfile?.profile?.user_id === id) return socialState.viewedProfile.profile;
  return null;
}

function socialFindSnapshotItem(payload, itemKey) {
  if (!payload || !itemKey) return null;
  const matches = [];
  for (const section of ['activity','notes','library','tbr','recommended','upnext','ratings']) {
    for (const item of payload.sections?.[section] || []) if (item?.key === itemKey) matches.push(item);
  }
  if (!matches.length) return null;
  const merged = matches.reduce((acc, item) => ({
    ...acc,
    ...item,
    recommended: Boolean(acc.recommended || item.recommended),
    rating: Number(item.rating || acc.rating || 0),
    progress: item.progress || acc.progress || '',
    notes: '',
    comment: item.comment || acc.comment || '',
    description: item.description || acc.description || '',
    people: (item.people?.length ? item.people : acc.people) || []
  }), {});
  return merged;
}

function socialSharedItemToDiscoverResult(item) {
  return {
    sourceType: item.sourceType || item.type || 'other',
    provider: item.provider || '',
    providerId: item.providerId || '',
    title: item.title || 'Untitled',
    subtitle: item.subtitle || '',
    image: item.image || '',
    description: item.description || '',
    pageCount: Number(item.pageCount || 0),
    artistName: item.artistName || '',
    raw: {}
  };
}

function socialOwnItemForShared(item) {
  if (!item) return null;
  return findCanonicalLibraryItem(item) || null;
}

function createOwnManualItemFromShared(item, queueStatus) {
  const existing = socialOwnItemForShared(item);
  if (existing) return existing;
  const sourceType = item.sourceType || item.type || 'other';
  const isMusicFamily = ['music','artist','song','concert'].includes(sourceType);
  const isFoodFamily = ['food','restaurant','recipe'].includes(sourceType);
  const own = {
    id: makeId(),
    sourceType,
    type: isMusicFamily ? 'music' : isFoodFamily ? 'food' : (item.type || sourceType),
    typeLabel: isMusicFamily ? 'Music' : isFoodFamily ? 'Food' : (item.typeLabel || getTypeLabel(sourceType)),
    subcategory: item.subcategory || '',
    title: item.title || 'Untitled',
    provider: item.provider || 'manual',
    providerId: String(item.providerId || ''),
    image: item.image || '',
    subtitle: item.subtitle || '',
    description: item.description || '',
    rating: 0,
    notes: '',
    recommended: false,
    attachments: [],
    links: [],
    releaseDate: item.releaseDate || '',
    queueStatus,
    active: queueStatus === 'upnext',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: {},
    artistName: item.artistName || ''
  };
  if (sourceType === 'tv') own.progress = { nextSeason: 1, nextEpisode: 1 };
  if (sourceType === 'book') own.progress = { currentPage: 0, totalPages: Number(item.pageCount || 0), readingPeriods: [] };
  applyReleaseQueueAutomation(own);
  state.items.push(own);
  saveItems();
  renderAll();
  return own;
}

function socialSharedItemOwnActionsMarkup(item) {
  const own = socialOwnItemForShared(item);
  const current = own ? getQueueStatus(own) : '';
  const completed = Boolean(own?.completedAt);
  const sourceType = own ? getSourceType(own) : (item?.sourceType || item?.type || '');
  let trackLabel = 'Track';
  if (own) {
    if (sourceType === 'tv') {
      const progress = libraryProgressText(own);
      trackLabel = progress ? `Your status · ${progress}` : (completed ? 'Your status · Watched' : 'Your status');
    } else if (sourceType === 'book') {
      trackLabel = completed ? 'Your status · Finished' : `Your status · ${libraryProgressText(own) || 'Saved'}`;
    } else if (sourceType === 'movie') {
      trackLabel = completed ? 'Your status · Watched' : 'Your status';
    } else {
      trackLabel = completed ? 'Your status · Completed' : (current === 'upnext' ? 'Your status · Tracking' : 'Your status');
    }
  }
  const tbrLabel = current === 'tbr' ? 'In TBR' : 'TBR';
  return `<div class="detail-actions library-detail-actions social-item-own-actions"><div class="queue-toggle-buttons" aria-label="Add to your Omni"><button class="secondary-button queue-toggle-button${own ? ' is-selected' : ''}" type="button" data-social-own-queue="upnext">${escapeHtml(trackLabel)}</button><button class="secondary-button queue-toggle-button${current === 'tbr' ? ' is-selected' : ''}" type="button" data-social-own-queue="tbr" ${completed ? 'disabled' : ''}>${tbrLabel}</button></div></div>`;
}

function socialSharedItemDetailMarkup(item, ownerProfile) {
  const rating = Math.max(0, Math.min(5, Number(item?.rating || 0)));
  const ownerName = ownerProfile?.display_name || ownerProfile?.username || 'Their';
  const people = Array.isArray(item?.people) ? item.people.filter(Boolean) : [];
  const sourceType = item?.sourceType || item?.type || '';
  const activeProgress = sourceType === 'tv' ? (item?.activelyWatching === true ? item?.progress : '') : item?.progress;
  const dispositionLabel = ['paused','stopped','not-released'].includes(item?.statusKey) ? item?.statusLabel : '';
  const badges = [
    item?.recommended ? '<span class="social-detail-badge is-recommended">♥ Recommended</span>' : '',
    activeProgress ? `<span class="social-detail-badge">${escapeHtml(activeProgress)}</span>` : '',
    dispositionLabel ? `<span class="social-detail-badge">${escapeHtml(dispositionLabel)}</span>` : ''
  ].filter(Boolean).join('');
  const trackedDate = String(item?.trackedDate || '').slice(0, 10);
  const dateLabel = ['tv','movie','youtube'].includes(sourceType) ? 'Watched' : sourceType === 'book' ? 'Finished' : 'Tracked';
  const trackedDateMarkup = trackedDate ? `<div class="library-detail-date-strip social-shared-watch-date"><span>${escapeHtml(dateLabel)}</span><strong>${escapeHtml(formatLongDate(trackedDate))}</strong></div>` : '';
  const personal = (rating || item?.notes || people.length)
    ? `<section class="detail-section social-shared-personal-detail"><h3>${escapeHtml(ownerName)}'s details</h3>${rating ? `<div class="social-detail-rating"><span>Rating</span><strong>★ ${escapeHtml(formatPersonalRating(rating))} / 5</strong></div>` : ''}${people.length ? `<div class="library-detail-date-strip library-people-strip"><span>With</span><strong>${escapeHtml(people.join(', '))}</strong></div>` : ''}${item?.comment ? `<div class="social-detail-notes"><span>Comment</span><p>${escapeHtml(item.comment)}</p></div>` : ''}</section>`
    : '';
  return `${libraryDetailHero({ type: item?.typeLabel || socialTypeLabel(item?.type || item?.sourceType || 'Other'), title: item?.title || 'Untitled', image: item?.image || '', subtitle: item?.subtitle || '', overview: item?.description || '' })}${badges ? `<div class="social-detail-badges">${badges}</div>` : ''}${trackedDateMarkup}${personal}${socialSharedItemOwnActionsMarkup(item)}`;
}

async function socialFetchSynopsis(item) {
  if (!item?.providerId) return '';
  try {
    const sourceType = item.sourceType || item.type || '';
    if (sourceType === 'tv') {
      const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
      return details?.overview || '';
    }
    if (sourceType === 'movie') {
      const details = await getCached(`movie:${item.providerId}`, () => TrackerAPI.getMovieDetails(item.providerId, state.settings));
      return details?.overview || '';
    }
    if (sourceType === 'book') {
      const details = await getCached(`book:${item.providerId}`, () => TrackerAPI.getBookDetails(item.providerId, state.settings));
      return details?.volumeInfo?.description || '';
    }
    if (sourceType === 'youtube' && !isYouTubePlaylistItem(item)) {
      const details = await getCached(`youtube:video:${item.providerId}`, () => TrackerAPI.getYouTubeVideo(item.providerId, state.settings));
      return details?.snippet?.description || details?.description || '';
    }
  } catch (error) {
    console.warn('[Social] synopsis lookup failed:', error);
  }
  return '';
}

async function openSocialSharedItemDetail(ownerId, itemKey) {
  const payload = socialPayloadForOwner(ownerId);
  const ownerProfile = socialProfileForOwner(ownerId);
  const item = socialFindSnapshotItem(payload, itemKey);
  const modal = $('#socialItemDetailModal');
  const body = $('#socialItemDetailBody');
  if (!item || !modal || !body) return;
  socialState.activeSharedItem = { ownerId: String(ownerId || ''), itemKey, item, ownerProfile, payload };
  modal.dataset.socialProfileTheme = SOCIAL_PROFILE_THEME_IDS.has(String(payload?.theme || '')) ? String(payload.theme) : 'blue';
  body.innerHTML = socialSharedItemDetailMarkup(item, ownerProfile);
  showDialogAtTop(modal);
  if (!item.description) {
    const synopsis = await socialFetchSynopsis(item);
    if (synopsis && modal.open && socialState.activeSharedItem?.itemKey === itemKey) {
      socialState.activeSharedItem.item = { ...item, description: synopsis };
      body.innerHTML = socialSharedItemDetailMarkup(socialState.activeSharedItem.item, ownerProfile);
    }
  }
}

async function handleSocialItemDetailClick(event) {
  const action = event.target.closest('[data-social-own-queue]');
  if (!action || !socialState.activeSharedItem?.item) return;
  const targetStatus = action.dataset.socialOwnQueue === 'tbr' ? 'tbr' : 'upnext';
  const shared = socialState.activeSharedItem.item;
  action.disabled = true;
  try {
    let own = socialOwnItemForShared(shared);
    if (targetStatus === 'upnext') {
      if (!own) {
        if (shared.providerId) own = ensureDiscoverItem(socialSharedItemToDiscoverResult(shared), 'upnext');
        else own = createOwnManualItemFromShared(shared, 'upnext');
      }
      // If this title already belongs to the user, never reset or overwrite its
      // queue/progress from somebody else's profile. Open the user's canonical
      // Library item so watched/completed/current-episode state is the source of truth.
      $('#socialItemDetailModal')?.close();
      if (own) await openDetails(own.id);
      return;
    }

    if (!own) {
      if (shared.providerId) own = ensureDiscoverItem(socialSharedItemToDiscoverResult(shared), 'tbr');
      else own = createOwnManualItemFromShared(shared, 'tbr');
    } else if (!own.completedAt) {
      await moveItemToQueue(own, getQueueStatus(own) === 'tbr' ? 'library' : 'tbr');
    }
    const body = $('#socialItemDetailBody');
    if (body) body.innerHTML = socialSharedItemDetailMarkup(shared, socialState.activeSharedItem.ownerProfile);
  } catch (error) {
    console.warn('[Social] could not add shared item:', error);
    alert(error?.message || String(error));
  } finally {
    if (action.isConnected) action.disabled = false;
  }
}

function rerenderSocialProfileView(userId) {
  const id = String(userId || '');
  if (socialState.viewedProfile?.profile?.user_id === id && $('#socialViewProfileModal')?.open) {
    $('#socialViewProfileBody').innerHTML = socialProfileViewMarkup(socialState.viewedProfile.profile, socialState.viewedProfile.snapshot, socialState.viewedProfile.relation, false);
  }
  if (id === currentUser?.id) renderSocialMyProfile();
}

function renderSocialMyProfile() {
  const host = $('#socialMyProfile');
  if (!host || !socialState.profile) return;
  const snapshot = socialState.snapshot || buildSocialSnapshotPayload();
  host.innerHTML = socialProfileViewMarkup(socialState.profile, snapshot, null, true);
  host.querySelector('[data-social-open-settings]')?.addEventListener('click', openSocialProfileSettings);
}

function resetFollowingSocialContext() {
  socialState.followingContextLoaded = false;
  socialState.followingContextPromise = null;
  socialState.followingContextProfiles = [];
  socialState.followingContextSnapshots = new Map();
  socialState.followingContextLoadedAt = 0;
}

async function loadFollowingSocialContext(force = false) {
  if (!supabase || !currentUser || !socialState.schemaReady || localOnlyMode) return [];
  if (force) resetFollowingSocialContext();
  if (socialState.followingContextLoaded && Date.now() - Number(socialState.followingContextLoadedAt || 0) < 60000) return socialState.followingContextProfiles;
  if (socialState.followingContextPromise) return socialState.followingContextPromise;

  socialState.followingContextPromise = (async () => {
    const followsResult = await supabase
      .from('follows')
      .select('following_id, status')
      .eq('follower_id', currentUser.id)
      .eq('status', 'accepted');
    if (followsResult.error) throw followsResult.error;
    const ids = [...new Set((followsResult.data || []).map(row => row.following_id).filter(Boolean))];
    if (!ids.length) {
      socialState.followingContextProfiles = [];
      socialState.followingContextSnapshots = new Map();
      socialState.followingContextLoaded = true;
      socialState.followingContextLoadedAt = Date.now();
      return [];
    }

    const [profilesResult, snapshotsResult] = await Promise.all([
      supabase.from('profiles').select('user_id, username, display_name, avatar_url').in('user_id', ids),
      supabase.from('social_snapshots').select('user_id, payload, updated_at').in('user_id', ids)
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (snapshotsResult.error && !socialSchemaMissing(snapshotsResult.error)) throw snapshotsResult.error;

    socialState.followingContextProfiles = profilesResult.data || [];
    socialState.followingContextSnapshots = new Map((snapshotsResult.data || []).map(row => [String(row.user_id), row.payload || null]));
    socialState.followingContextLoaded = true;
    socialState.followingContextLoadedAt = Date.now();
    return socialState.followingContextProfiles;
  })();

  try {
    return await socialState.followingContextPromise;
  } finally {
    socialState.followingContextPromise = null;
  }
}

function socialComparableSourceType(item) {
  return String(item?.sourceType || (item?.id ? getSourceType(item) : '') || item?.type || '').trim();
}

function socialItemsRepresentSameTitle(shared, target) {
  if (!shared || !target) return false;
  const sharedType = socialComparableSourceType(shared);
  const targetType = socialComparableSourceType(target);
  if (sharedType && targetType && sharedType !== targetType) return false;
  const sharedProvider = String(shared.provider || '').trim();
  const targetProvider = String(target.provider || '').trim();
  const sharedProviderId = String(shared.providerId || '').trim();
  const targetProviderId = String(target.providerId || '').trim();
  if (sharedProviderId && targetProviderId) {
    return sharedProviderId === targetProviderId && (!sharedProvider || !targetProvider || sharedProvider === targetProvider);
  }
  return Boolean(normalizeSearchText(shared.title || '') && normalizeSearchText(shared.title || '') === normalizeSearchText(target.title || ''));
}

async function socialOverlappingWatchersForItem(target) {
  if (!target || getSourceType(target) !== 'tv' || !currentUser || !supabase || !socialState.schemaReady || !socialState.profile) return [];
  const connections = await loadAcceptedSocialConnections();
  if (!connections.length) return [];
  const ids = connections.map(profile => profile.user_id).filter(Boolean);
  if (!ids.length) return [];

  const snapshotsResult = await supabase
    .from('social_snapshots')
    .select('user_id, payload, updated_at')
    .in('user_id', ids);
  if (snapshotsResult.error) {
    if (socialSchemaMissing(snapshotsResult.error)) return [];
    throw snapshotsResult.error;
  }

  const profileMap = new Map(connections.map(profile => [String(profile.user_id), profile]));
  const rows = [];
  for (const snapshot of (snapshotsResult.data || [])) {
    const shared = (snapshot.payload?.sections?.upnext || []).find(entry =>
      entry?.activelyWatching === true && socialItemsRepresentSameTitle(entry, target)
    );
    if (!shared) continue;
    const profile = profileMap.get(String(snapshot.user_id));
    if (profile) rows.push({ profile, item: shared });
  }
  return rows;
}

async function maybePromptBuddyWatchForTVOverlap(item) {
  if (!item || getSourceType(item) !== 'tv') return;
  try {
    const overlaps = await socialOverlappingWatchersForItem(item);
    if (!overlaps.length) return;
    const friendIds = overlaps.map(row => String(row.profile.user_id));
    const promptKey = `${item.provider || 'manual'}:${item.providerId || item.id}:${friendIds.slice().sort().join(',')}`;
    if (socialState.buddyOverlapPrompted.has(promptKey)) return;
    socialState.buddyOverlapPrompted.add(promptKey);
    const firstName = overlaps[0]?.profile?.display_name || overlaps[0]?.profile?.username || 'Someone you know';
    const promptTitle = overlaps.length === 1
      ? `${firstName} is also watching ${item.title} — Buddy Watch?`
      : `${overlaps.length} people are also watching ${item.title} — Buddy Watch?`;
    await openQuickBuddyWatchForItem(item, {
      title: promptTitle,
      friendIds,
      preferredFriendId: friendIds[0]
    });
  } catch (error) {
    console.warn('[Buddy Watch] overlap prompt could not load:', error);
  }
}

async function socialFollowerContextForItem(target) {
  if (!target || !currentUser || !socialState.schemaReady) return [];
  try {
    const profiles = await loadFollowingSocialContext();
    const rows = [];
    for (const profile of profiles) {
      const payload = socialState.followingContextSnapshots.get(String(profile.user_id)) || null;
      const activity = payload?.sections?.activity || [];
      const match = activity.find(entry => socialItemsRepresentSameTitle(entry, target));
      if (!match) continue;
      if (!match.logged && !Number(match.rating || 0) && !String(match.notes || '').trim()) continue;
      rows.push({ profile, item: match });
    }
    return rows.sort((a, b) => {
      const aLogged = a.item.logged ? 1 : 0;
      const bLogged = b.item.logged ? 1 : 0;
      if (aLogged !== bLogged) return bLogged - aLogged;
      return Number(b.item.rating || 0) - Number(a.item.rating || 0);
    });
  } catch (error) {
    console.warn('[Social] could not load follower item context:', error);
    return [];
  }
}

function socialFollowerContextMarkup(rows) {
  if (!rows?.length) return '';
  const watchedCount = rows.filter(row => row.item.logged).length;
  const ratedCount = rows.filter(row => Number(row.item.rating || 0) > 0).length;
  const summaryBits = [];
  if (watchedCount) summaryBits.push(`${watchedCount} logged`);
  if (ratedCount) summaryBits.push(`${ratedCount} rated`);
  return `<details class="detail-section social-follower-item-context">
    <summary><span>People you follow</span>${summaryBits.length ? `<small>${escapeHtml(summaryBits.join(' · '))}</small>` : ''}</summary>
    <div class="social-follower-item-list">${rows.map(({ profile, item }) => {
      const rating = Number(item.rating || 0);
      const sourceType = socialComparableSourceType(item);
      const loggedLabel = ['tv','movie','youtube'].includes(sourceType) ? 'Watched' : sourceType === 'book' ? 'Finished' : 'Logged';
      const status = item.logged ? loggedLabel : rating ? 'Rated' : 'Shared';
      return `<article class="social-follower-item-row">
        <span class="social-avatar social-avatar-small">${escapeHtml(socialProfileInitial(profile))}</span>
        <div class="social-follower-item-copy">
          <div class="social-follower-item-head"><strong>${escapeHtml(profile.display_name || profile.username || 'Omni user')}</strong><span>${escapeHtml(status)}${rating ? ` · ★ ${escapeHtml(formatPersonalRating(rating))}` : ''}</span></div>
          ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
        </div>
      </article>`;
    }).join('')}</div>
  </details>`;
}

async function appendSocialFollowerContext(target, guard = null) {
  if (!els.detailBody || !target || els.detailBody.querySelector('[data-social-follower-context]')) return;
  const rows = await socialFollowerContextForItem(target);
  if (!rows.length || (typeof guard === 'function' && !guard())) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = socialFollowerContextMarkup(rows);
  const section = wrapper.firstElementChild;
  if (!section) return;
  section.dataset.socialFollowerContext = 'true';
  const personal = els.detailBody.querySelector('.library-personal-meta, .discover-personal-meta');
  if (personal) personal.insertAdjacentElement('afterend', section);
  else {
    const hero = els.detailBody.querySelector('.detail-hero');
    if (hero) hero.insertAdjacentElement('afterend', section);
    else els.detailBody.appendChild(section);
  }
}

function socialFollowerLoggedCount(target) {
  if (!target || !socialState.followingContextLoaded) return 0;
  let count = 0;
  for (const profile of socialState.followingContextProfiles) {
    const payload = socialState.followingContextSnapshots.get(String(profile.user_id));
    const match = (payload?.sections?.activity || []).find(entry => entry.logged && socialItemsRepresentSameTitle(entry, target));
    if (match) count += 1;
  }
  return count;
}

async function loadAcceptedSocialConnections() {
  if (!currentUser || !socialState.schemaReady) return [];
  const { data, error } = await supabase.from('follows').select('follower_id, following_id, status').or(`follower_id.eq.${currentUser.id},following_id.eq.${currentUser.id}`).eq('status','accepted');
  if (error) throw error;
  const otherIds = [...new Set((data || []).map(row => row.follower_id === currentUser.id ? row.following_id : row.follower_id).filter(id => id && id !== currentUser.id))];
  if (!otherIds.length) { socialState.acceptedConnections = []; return []; }
  const profiles = await supabase.from('profiles').select('user_id, username, display_name, avatar_url, is_private').in('user_id', otherIds);
  if (profiles.error) throw profiles.error;
  socialState.acceptedConnections = profiles.data || [];
  return socialState.acceptedConnections;
}

function ensureQuickBuddyWatchModal() {
  let modal = $('#buddyWatchQuickModal');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'buddyWatchQuickModal';
  modal.className = 'modal small-modal buddy-watch-create-modal buddy-watch-quick-modal';
  modal.innerHTML = `<button class="modal-x" type="button" data-close="buddyWatchQuickModal" aria-label="Close">×</button>
    <div class="modal-heading"><p class="modal-eyebrow">BUDDY WATCH</p><h2 id="buddyWatchQuickTitle">Watch together</h2></div>
    <form id="buddyWatchQuickForm" class="item-form">
      <input id="buddyWatchQuickItemId" type="hidden" />
      <div id="buddyWatchQuickItem" class="buddy-watch-quick-item"></div>
      <label class="field"><span>Watch with</span><select id="buddyWatchQuickFriend" required></select></label>
      <p id="buddyWatchQuickMessage" class="form-message" hidden></p>
      <div class="modal-actions end-only"><div class="actions-right"><button class="quiet-button" type="button" data-close="buddyWatchQuickModal">Cancel</button><button id="buddyWatchQuickSubmit" class="primary-button" type="submit">Send invite</button></div></div>
    </form>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close="buddyWatchQuickModal"]')?.addEventListener('click', () => modal.close());
  modal.querySelector('#buddyWatchQuickForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const item = findItem($('#buddyWatchQuickItemId')?.value || '');
    const friendId = $('#buddyWatchQuickFriend')?.value || '';
    const message = $('#buddyWatchQuickMessage');
    const submit = $('#buddyWatchQuickSubmit');
    if (!item || !friendId) return;
    if (submit) submit.disabled = true;
    if (message) { message.textContent = 'Creating…'; message.hidden = false; message.classList.remove('is-error'); }
    try {
      await createBuddyWatchForItem(item, friendId);
      modal.close();
    } catch (error) {
      if (message) { message.textContent = error?.message || 'Could not create Buddy Watch.'; message.hidden = false; message.classList.add('is-error'); }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
  return modal;
}

async function openQuickBuddyWatchForItem(item, options = {}) {
  if (!item || !['tv','movie','youtube'].includes(getSourceType(item))) return;
  const modal = ensureQuickBuddyWatchModal();
  const title = modal.querySelector('#buddyWatchQuickTitle');
  const itemNode = modal.querySelector('#buddyWatchQuickItem');
  const itemId = modal.querySelector('#buddyWatchQuickItemId');
  const friendSelect = modal.querySelector('#buddyWatchQuickFriend');
  const message = modal.querySelector('#buddyWatchQuickMessage');
  const submit = modal.querySelector('#buddyWatchQuickSubmit');
  if (title) title.textContent = options.title || 'Start Buddy Watch';
  if (itemId) itemId.value = item.id;
  if (itemNode) itemNode.innerHTML = `${item.image ? `<img src="${escapeAttr(item.image)}" alt="" />` : '<span class="buddy-watch-quick-placeholder"></span>'}<span><strong>${escapeHtml(item.title || 'Untitled')}</strong><small>${escapeHtml(getItemTypeLabel(item))}</small></span>`;
  if (message) { message.textContent = ''; message.hidden = true; message.classList.remove('is-error'); }
  if (!socialState.schemaReady || !socialState.profile) {
    if (friendSelect) { friendSelect.innerHTML = '<option value="">Social profile unavailable</option>'; friendSelect.disabled = true; }
    if (submit) submit.disabled = true;
    if (message) { message.textContent = 'Open Social once to finish setting up your profile.'; message.hidden = false; message.classList.add('is-error'); }
    showDialogAtTop(modal);
    return;
  }
  const allConnections = await loadAcceptedSocialConnections();
  const allowedFriendIds = Array.isArray(options.friendIds) && options.friendIds.length
    ? new Set(options.friendIds.map(String))
    : null;
  const connections = allowedFriendIds
    ? allConnections.filter(profile => allowedFriendIds.has(String(profile.user_id)))
    : allConnections;
  if (friendSelect) {
    friendSelect.innerHTML = connections.length
      ? connections.map(profile => `<option value="${escapeAttr(profile.user_id)}">${escapeHtml(profile.display_name || profile.username)} (@${escapeHtml(profile.username)})</option>`).join('')
      : '<option value="">Follow someone first</option>';
    friendSelect.disabled = !connections.length;
    if (options.preferredFriendId && connections.some(profile => String(profile.user_id) === String(options.preferredFriendId))) {
      friendSelect.value = String(options.preferredFriendId);
    }
  }
  if (submit) submit.disabled = !connections.length;
  if (!connections.length && message) {
    message.textContent = 'You need an accepted connection before starting a Buddy Watch.';
    message.hidden = false;
  }
  showDialogAtTop(modal);
}

function buddyWatchSharedItemSummary(item) {
  return {
    key: `${item.provider || 'manual'}:${item.providerId || item.id}`,
    localItemId: item.id,
    title: item.title || 'Untitled',
    subtitle: item.subtitle || '',
    image: item.image || '',
    description: item.description || '',
    sourceType: getSourceType(item),
    type: item.type,
    typeLabel: getItemTypeLabel(item),
    provider: item.provider || '',
    providerId: item.providerId || '',
    pageCount: getSourceType(item) === 'book' ? Number(item.progress?.totalPages || 0) : 0
  };
}

async function createBuddyWatchForItem(item, friendId) {
  if (!item || !friendId || !currentUser || !supabase) throw new Error('Choose a person to start the Buddy Watch with.');
  if (!['tv','movie','youtube'].includes(getSourceType(item))) throw new Error('Buddy Watch currently supports TV, movies, and YouTube items.');
  const itemSummary = buddyWatchSharedItemSummary(item);
  const watchResult = await supabase.from('buddy_watches').insert({ created_by: currentUser.id, title: item.title || 'Buddy Watch', item: itemSummary, status: 'active', updated_at: new Date().toISOString() }).select('id, created_by, title, item, status, created_at, updated_at').single();
  if (watchResult.error) throw watchResult.error;
  const watch = watchResult.data;
  const membersResult = await supabase.from('buddy_watch_members').insert([
    { buddy_watch_id: watch.id, user_id: currentUser.id, status: 'accepted', joined_at: new Date().toISOString() },
    { buddy_watch_id: watch.id, user_id: friendId, status: 'pending' }
  ]);
  if (membersResult.error) {
    await supabase.from('buddy_watches').delete().eq('id', watch.id).eq('created_by', currentUser.id);
    throw membersResult.error;
  }
  const initialProgress = progressFallback(item);
  if (initialProgress) {
    const progressResult = await supabase.from('buddy_watch_progress').upsert({ buddy_watch_id: watch.id, user_id: currentUser.id, progress_text: initialProgress, note: '', completed: Boolean(item.completedAt), updated_at: new Date().toISOString() }, { onConflict: 'buddy_watch_id,user_id' });
    if (progressResult.error) console.warn('[Buddy Watch] initial progress could not be saved:', progressResult.error);
  }
  if ($('#socialBuddyList')) await loadBuddyWatches();
  return watch;
}

function buddyWatchableItems() {
  return state.items.filter(item => ['tv','movie','youtube'].includes(getSourceType(item))).sort((a,b) => String(a.title || '').localeCompare(String(b.title || '')));
}

async function openBuddyWatchCreate() {
  if (!socialState.schemaReady) return;
  const connections = await loadAcceptedSocialConnections();
  const items = buddyWatchableItems();
  const friendSelect = $('#buddyWatchFriend');
  const itemSelect = $('#buddyWatchItem');
  if (friendSelect) friendSelect.innerHTML = connections.length ? connections.map(profile => `<option value="${escapeAttr(profile.user_id)}">${escapeHtml(profile.display_name || profile.username)} (@${escapeHtml(profile.username)})</option>`).join('') : '<option value="">Follow someone first</option>';
  if (itemSelect) itemSelect.innerHTML = items.length ? items.map(item => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.title)} · ${escapeHtml(getItemTypeLabel(item))}</option>`).join('') : '<option value="">No TV, movies, or YouTube items in Library</option>';
  if (friendSelect) friendSelect.disabled = !connections.length;
  if (itemSelect) itemSelect.disabled = !items.length;
  setBuddyCreateMessage('');
  showDialogAtTop($('#buddyWatchCreateModal'));
}

function setBuddyCreateMessage(message, error = false) {
  const node = $('#buddyWatchCreateMessage');
  if (!node) return;
  node.textContent = message || '';
  node.hidden = !message;
  node.classList.toggle('is-error', Boolean(error));
}

async function createBuddyWatch(event) {
  event.preventDefault();
  const friendId = $('#buddyWatchFriend')?.value || '';
  const item = findItem($('#buddyWatchItem')?.value || '');
  if (!friendId || !item || !currentUser) return;
  setBuddyCreateMessage('Creating…');
  try {
    await createBuddyWatchForItem(item, friendId);
    $('#buddyWatchCreateModal')?.close();
  } catch (error) {
    setBuddyCreateMessage(error?.message || 'Could not create Buddy Watch.', true);
  }
}

async function loadBuddyWatches() {
  if (!socialState.schemaReady || !currentUser) return;
  const memberResult = await supabase.from('buddy_watch_members').select('buddy_watch_id, user_id, status, joined_at').eq('user_id', currentUser.id);
  if (memberResult.error) throw memberResult.error;
  const mine = memberResult.data || [];
  const watchIds = mine.map(row => row.buddy_watch_id);
  if (!watchIds.length) {
    socialState.buddyWatches = [];
    if ($('#socialBuddyList')) $('#socialBuddyList').innerHTML = '';
    if ($('#socialBuddyEmpty')) $('#socialBuddyEmpty').hidden = false;
    return;
  }
  const [watchResult, membersResult, progressResult, updatesResult] = await Promise.all([
    supabase.from('buddy_watches').select('id, created_by, title, item, status, created_at, updated_at').in('id', watchIds).order('updated_at', { ascending: false }),
    supabase.from('buddy_watch_members').select('buddy_watch_id, user_id, status, joined_at').in('buddy_watch_id', watchIds),
    supabase.from('buddy_watch_progress').select('buddy_watch_id, user_id, progress_text, note, completed, updated_at').in('buddy_watch_id', watchIds),
    supabase.from('buddy_watch_updates').select('id, buddy_watch_id, user_id, progress_text, note, completed, created_at').in('buddy_watch_id', watchIds).order('created_at', { ascending: false }).limit(100)
  ]);
  for (const result of [watchResult,membersResult,progressResult,updatesResult]) if (result.error) throw result.error;
  const memberIds = [...new Set((membersResult.data || []).map(row => row.user_id))];
  let profiles = [];
  if (memberIds.length) {
    const profileResult = await supabase.from('profiles').select('user_id, username, display_name, avatar_url').in('user_id', memberIds);
    if (profileResult.error) throw profileResult.error;
    profiles = profileResult.data || [];
  }
  const profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));
  const mineMap = new Map(mine.map(row => [row.buddy_watch_id, row]));
  socialState.buddyWatches = (watchResult.data || []).map(watch => ({
    ...watch,
    myMembership: mineMap.get(watch.id),
    members: (membersResult.data || []).filter(row => row.buddy_watch_id === watch.id).map(row => ({ ...row, profile: profileMap.get(row.user_id) })),
    progress: (progressResult.data || []).filter(row => row.buddy_watch_id === watch.id).map(row => ({ ...row, profile: profileMap.get(row.user_id) })),
    updates: (updatesResult.data || []).filter(row => row.buddy_watch_id === watch.id).slice(0,8).map(row => ({ ...row, profile: profileMap.get(row.user_id) }))
  }));
  renderBuddyWatches();
  if (els.upNextList && !$('#socialRoot')) renderUpNext({ skipReconcile: true }).catch(() => {});
}

function renderBuddyWatches() {
  const host = $('#socialBuddyList');
  if (!host) return;
  host.innerHTML = socialState.buddyWatches.map(buddyWatchMarkup).join('');
  if ($('#socialBuddyEmpty')) $('#socialBuddyEmpty').hidden = socialState.buddyWatches.length > 0;
}

function buddyWatchMarkup(watch) {
  const item = watch.item || {};
  const pending = watch.myMembership?.status === 'pending';
  const memberText = watch.members.map(member => member.profile?.display_name || member.profile?.username || 'Omni user').join(' + ');
  const progressRows = watch.progress.length ? watch.progress.map(row => `<div class="buddy-progress-row"><span class="social-avatar">${escapeHtml(socialProfileInitial(row.profile || {}))}</span><div><strong>${escapeHtml(row.profile?.display_name || row.profile?.username || 'Omni user')}</strong><span>${escapeHtml(row.progress_text || 'No update yet')}${row.completed ? ' · finished' : ''}</span>${row.note ? `<small>${escapeHtml(row.note)}</small>` : ''}</div></div>`).join('') : '<p class="buddy-no-progress">No progress updates yet.</p>';
  const history = watch.updates.length ? `<details class="buddy-update-history"><summary>Recent updates</summary>${watch.updates.map(update => `<div class="buddy-update-row"><strong>${escapeHtml(update.profile?.display_name || update.profile?.username || 'Omni user')}</strong><span>${escapeHtml(update.progress_text)}${update.completed ? ' · finished' : ''}</span>${update.note ? `<small>${escapeHtml(update.note)}</small>` : ''}</div>`).join('')}</details>` : '';
  return `<article class="buddy-watch-card" data-buddy-watch-id="${escapeAttr(watch.id)}">
    <div class="buddy-watch-head">${item.image ? `<img src="${escapeAttr(item.image)}" alt="" />` : '<div class="buddy-watch-placeholder"></div>'}<div><h3>${escapeHtml(watch.title)}</h3><p>${escapeHtml(memberText)}</p></div>${pending ? '<span class="buddy-invite-badge">Invite</span>' : ''}</div>
    ${pending ? `<div class="buddy-invite-actions"><button class="primary-button" type="button" data-buddy-accept="${escapeAttr(watch.id)}">Accept Buddy Watch</button><button class="quiet-button" type="button" data-buddy-decline="${escapeAttr(watch.id)}">Decline</button></div>` : `<div class="buddy-progress-list">${progressRows}</div><div class="buddy-watch-actions"><button class="secondary-button" type="button" data-buddy-update="${escapeAttr(watch.id)}">Update my progress</button></div>${history}`}
  </article>`;
}

async function handleBuddyWatchClick(event) {
  const accept = event.target.closest('[data-buddy-accept]');
  if (accept) { await respondBuddyInvite(accept.dataset.buddyAccept, true); return; }
  const decline = event.target.closest('[data-buddy-decline]');
  if (decline) { await respondBuddyInvite(decline.dataset.buddyDecline, false); return; }
  const update = event.target.closest('[data-buddy-update]');
  if (update) { openBuddyProgress(update.dataset.buddyUpdate); }
}

async function respondBuddyInvite(watchId, accept) {
  if (!watchId || !currentUser) return;
  const watch = (socialState.buddyWatches || []).find(entry => String(entry.id) === String(watchId)) || null;
  const result = accept
    ? await supabase.from('buddy_watch_members').update({ status:'accepted', joined_at:new Date().toISOString() }).eq('buddy_watch_id', watchId).eq('user_id', currentUser.id)
    : await supabase.from('buddy_watch_members').delete().eq('buddy_watch_id', watchId).eq('user_id', currentUser.id);
  if (result.error) throw result.error;
  if (accept && watch) {
    const linked = ensureLocalItemForBuddyWatch(watch);
    if (linked) { recordTypeUse(linked); saveItems(); renderAll(); }
  }
  await loadBuddyWatches();
}

function findLocalItemForBuddy(watch) {
  const shared = watch?.item || {};
  return state.items.find(item => shared.provider && shared.providerId && item.provider === shared.provider && String(item.providerId || '') === String(shared.providerId || ''))
    || state.items.find(item => String(item.title || '').toLowerCase() === String(watch?.title || '').toLowerCase() && getSourceType(item) === shared.sourceType)
    || null;
}

function ensureLocalItemForBuddyWatch(watch) {
  const existing = findLocalItemForBuddy(watch);
  if (existing) return existing;
  const shared = watch?.item || {};
  const sourceType = shared.sourceType || shared.type || '';
  if (!sourceType) return null;
  const type = shared.type || sourceType;
  const now = new Date().toISOString();
  const item = {
    id: makeId(),
    type,
    typeLabel: shared.typeLabel || socialTypeLabel(type),
    sourceType,
    provider: shared.provider || '',
    providerId: shared.providerId || '',
    title: shared.title || watch?.title || 'Buddy Watch',
    subtitle: shared.subtitle || '',
    image: shared.image || '',
    notes: '',
    people: [],
    rating: 0,
    recommended: false,
    createdAt: now,
    updatedAt: now
  };
  if (sourceType === 'tv') {
    item.progress = { nextSeason: 1, nextEpisode: 1 };
    item.watchDisposition = 'following';
    setItemQueueStatus(item, 'upnext');
  } else {
    setItemQueueStatus(item, 'library');
  }
  state.items.push(item);
  return item;
}

function parseBuddyTVProgress(value) {
  const text = String(value || '');
  const compact = text.match(/\bS(?:eason)?\s*(\d+)\D+E(?:pisode)?\s*(\d+)\b/i);
  if (compact) return { seasonNumber: Number(compact[1]), episodeNumber: Number(compact[2]) };
  const long = text.match(/\bSeason\s*(\d+)\D+Episode\s*(\d+)\b/i);
  if (long) return { seasonNumber: Number(long[1]), episodeNumber: Number(long[2]) };
  return null;
}

async function markBuddyTVEpisodeWatched(watch, seasonNumber, episodeNumber) {
  const item = ensureLocalItemForBuddyWatch(watch);
  if (!item || getSourceType(item) !== 'tv') throw new Error('This Buddy Watch is not linked to a TV show in Omni.');
  const season = Math.max(1, Number(seasonNumber || 0));
  const episodeNo = Math.max(1, Number(episodeNumber || 0));
  if (!season || !episodeNo) throw new Error('Choose a valid season and episode.');

  if (!isTVEpisodeLogged(item, season, episodeNo)) {
    let episode = null;
    if (item.providerId) {
      try { episode = await getTVEpisodeFromSeason(item, season, episodeNo); } catch {}
    }
    episode ||= { name: 'Episode', still_path: '' };
    addHistoryRecord(tvHistoryRecord(item, episode, season, episodeNo));
  }

  if (getTVWatchDisposition(item) === 'watch-later') item.watchDisposition = 'following';

  if (item.providerId) {
    try {
      await recalculateTVProgress(item);
    } catch {
      item.progress = { ...(item.progress || {}), nextSeason: season, nextEpisode: episodeNo + 1 };
      item.completedAt = '';
      setItemQueueStatus(item, 'upnext');
    }
  } else {
    item.progress = { ...(item.progress || {}), nextSeason: season, nextEpisode: episodeNo + 1 };
    item.completedAt = '';
    setItemQueueStatus(item, 'upnext');
  }

  item.updatedAt = new Date().toISOString();
  saveItems();
  saveHistory();
  renderAll();
  return item;
}

function openBuddyProgress(watchId) {
  const watch = socialState.buddyWatches.find(entry => entry.id === watchId);
  if (!watch) return;
  const existing = watch.progress.find(row => row.user_id === currentUser.id);
  const localItem = findLocalItemForBuddy(watch);
  const sourceType = watch?.item?.sourceType || getSourceType(localItem);
  const isTV = sourceType === 'tv';
  const parsedExisting = parseBuddyTVProgress(existing?.progress_text || '');
  const nextSeason = Number(localItem?.progress?.nextSeason || parsedExisting?.seasonNumber || 1);
  const nextEpisode = Number(localItem?.progress?.nextEpisode || parsedExisting?.episodeNumber || 1);

  $('#buddyWatchProgressId').value = watchId;
  $('#buddyWatchProgressTitle').textContent = watch.title;
  $('#buddyWatchProgressText').value = existing?.progress_text || (localItem ? progressFallback(localItem) : '') || '';
  $('#buddyWatchProgressNote').value = existing?.note || '';
  $('#buddyWatchProgressComplete').checked = Boolean(existing?.completed || localItem?.completedAt);
  if ($('#buddyWatchTextProgressField')) $('#buddyWatchTextProgressField').hidden = isTV;
  if ($('#buddyWatchEpisodeFields')) $('#buddyWatchEpisodeFields').hidden = !isTV;
  if ($('#buddyWatchTVSyncNote')) $('#buddyWatchTVSyncNote').hidden = !isTV;
  if ($('#buddyWatchSeasonNumber')) $('#buddyWatchSeasonNumber').value = String(Math.max(1, nextSeason));
  if ($('#buddyWatchEpisodeNumber')) $('#buddyWatchEpisodeNumber').value = String(Math.max(1, nextEpisode));
  if ($('#buddyWatchProgressSubmit')) $('#buddyWatchProgressSubmit').textContent = isTV ? 'Mark watched & post' : 'Post update';
  setBuddyProgressMessage('');
  showDialogAtTop($('#buddyWatchProgressModal'));
}

function setBuddyProgressMessage(message, error = false) {
  const node = $('#buddyWatchProgressMessage');
  if (!node) return;
  node.textContent = message || '';
  node.hidden = !message;
  node.classList.toggle('is-error', Boolean(error));
}

async function saveBuddyWatchProgress(event) {
  event.preventDefault();
  const watchId = $('#buddyWatchProgressId')?.value || '';
  const watch = socialState.buddyWatches.find(entry => entry.id === watchId);
  if (!watchId || !watch || !currentUser) return;

  const note = String($('#buddyWatchProgressNote')?.value || '').trim();
  const sourceType = watch?.item?.sourceType || getSourceType(findLocalItemForBuddy(watch));
  let progressText = String($('#buddyWatchProgressText')?.value || '').trim();
  let completed = Boolean($('#buddyWatchProgressComplete')?.checked);

  setBuddyProgressMessage(sourceType === 'tv' ? 'Marking watched…' : 'Posting…');

  if (sourceType === 'tv') {
    const seasonNumber = Number($('#buddyWatchSeasonNumber')?.value || 0);
    const episodeNumber = Number($('#buddyWatchEpisodeNumber')?.value || 0);
    if (!Number.isInteger(seasonNumber) || seasonNumber < 1 || !Number.isInteger(episodeNumber) || episodeNumber < 1) {
      setBuddyProgressMessage('Choose a valid season and episode.', true);
      return;
    }
    try {
      const localItem = await markBuddyTVEpisodeWatched(watch, seasonNumber, episodeNumber);
      progressText = `Watched S${seasonNumber} E${episodeNumber}`;
      completed = Boolean(completed || localItem?.completedAt);
    } catch (error) {
      setBuddyProgressMessage(error.message || 'Could not mark that episode watched.', true);
      return;
    }
  }

  if (!progressText) {
    setBuddyProgressMessage('Add a progress update.', true);
    return;
  }

  const now = new Date().toISOString();
  const progressResult = await supabase.from('buddy_watch_progress').upsert({ buddy_watch_id: watchId, user_id: currentUser.id, progress_text: progressText, note, completed, updated_at: now }, { onConflict:'buddy_watch_id,user_id' });
  if (progressResult.error) { setBuddyProgressMessage(progressResult.error.message, true); return; }
  const updateResult = await supabase.from('buddy_watch_updates').insert({ buddy_watch_id: watchId, user_id: currentUser.id, progress_text: progressText, note, completed, created_at: now });
  if (updateResult.error) { setBuddyProgressMessage(updateResult.error.message, true); return; }
  $('#buddyWatchProgressModal')?.close();
  await loadBuddyWatches();
}

