import { TrackerAPI } from './api.js';
import { API_CONFIG } from './config.js';
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
  event: 'Events',
  workout: 'Workouts',
  other: 'Other'
};

const SOURCE_ITEM_LABELS = {
  tv: 'TV',
  movie: 'Movie',
  book: 'Book',
  music: 'Music',
  event: 'Event'
};

const RESERVED_DISPLAY_TYPES = new Set(['tv', 'movie', 'book', 'music', 'event', 'other']);
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
  contentType: 'all',
  genre: 'all',
  eventCity: API_CONFIG.homeCity || '',
  eventCountry: API_CONFIG.homeCountry || API_CONFIG.tmdbWatchRegion || 'CA',
  eventEverything: true,
  eventCategoryKeys: [],
  eventExcludedCategoryKeys: [],
  eventPriorityTerms: []
};
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
  tvDraftProviderId: '',
  tvDraftWatched: new Set(),
  tvDraftInitialWatched: new Set(),
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
  discoverMode: 'discover',
  discoverCalendarMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
  discoverCalendarLoading: false,
  discoverCalendarEntries: [],
  discoverCalendarExpandedDays: new Set(),
  discoverSearchQuery: '',
  discoverGenreCatalog: { tv: [], movie: [] },
  discoverKeywordCatalog: {},
  libraryView: 'all',
  libraryVisibleTypes: null,
  libraryExpandedGroups: new Set()
};

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
  openStickerSettings: $('#openStickerSettings'),
  stickerSettingsModal: $('#stickerSettingsModal'),
  stickerSettingsForm: $('#stickerSettingsForm'),
  stickerSettingsRows: $('#stickerSettingsRows'),
  resetStickerSettings: $('#resetStickerSettings'),
  openStreakSettings: $('#openStreakSettings'),
  streakSettingsModal: $('#streakSettingsModal'),
  streakSettingsForm: $('#streakSettingsForm'),
  streakSettingsRows: $('#streakSettingsRows'),
  resetStreakSettings: $('#resetStreakSettings'),
  monthPicker: $('#monthPicker'),
  monthLabel: $('#monthLabel'),
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
  discoverGenreFilter: $('#discoverGenreFilter'),
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
  itemRecommended: $('#itemRecommended'),
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
    setAuthMessage('Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env, then rebuild the site.', true);
    if (els.continueLocalButton) els.continueLocalButton.hidden = false;
    return;
  }

  setAuthMessage('Checking your session…', false);
  const { data, error } = await supabase.auth.getSession();
  if (error) {
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
  document.body.classList.add('auth-locked');
  if (els.authScreen) els.authScreen.hidden = false;
}

function unlockApp() {
  document.body.classList.remove('auth-locked');
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

function init() {
  const now = new Date();
  if (els.monthPicker) {
    els.monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  state.calendarWeekStart = startOfWeek(now);

  bindEvents();
  renderAll();
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
  els.openStickerSettings?.addEventListener('click', openStickerSettings);
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
  els.tvMarkAllWatched?.addEventListener('click', () => setAllTVDraftEpisodes(true));
  els.tvClearWatched?.addEventListener('click', () => setAllTVDraftEpisodes(false));
  els.itemForm?.addEventListener('submit', saveItemFromForm);
  els.deleteItem?.addEventListener('click', deleteEditingItem);
  els.historyEditForm?.addEventListener('submit', saveHistoryEdit);
  els.historyEditDelete?.addEventListener('click', deleteHistoryEdit);
  els.historyRatingPicker?.addEventListener('click', chooseHistoryRating);
  els.historyClearRating?.addEventListener('click', () => setHistoryRating(0));
  els.starPicker?.addEventListener('click', chooseRating);
  els.clearRating?.addEventListener('click', () => setRating(0));
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
  els.discoverTypeFilter?.addEventListener('change', async () => {
    state.discoverPrefs = { ...DEFAULT_DISCOVER_PREFS, ...state.discoverPrefs, contentType: els.discoverTypeFilter.value || 'all' };
    safeLocalSet(DISCOVER_PREFS_KEY, JSON.stringify(state.discoverPrefs));
    scheduleCloudSync();
    await refreshDiscoverForFilters();
  });
  els.discoverGenreFilter?.addEventListener('change', async () => {
    state.discoverPrefs = { ...DEFAULT_DISCOVER_PREFS, ...state.discoverPrefs, genre: els.discoverGenreFilter.value || 'all' };
    safeLocalSet(DISCOVER_PREFS_KEY, JSON.stringify(state.discoverPrefs));
    scheduleCloudSync();
    await refreshDiscoverForFilters();
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
  els.streamingProviderSearch?.addEventListener('input', () => renderStreamingProviderOptions(els.streamingProviderSearch.value));
  els.streamingProviderOptions?.addEventListener('change', handleStreamingProviderToggle);
  els.clearStreamingProviders?.addEventListener('click', clearStreamingProviderSelection);
  els.eventEverything?.addEventListener('change', syncTicketmasterPreferenceControls);
  document.querySelector('#discover')?.addEventListener('click', handleDiscoverClick);
  els.discoverQueueModal?.addEventListener('click', handleDiscoverQueueChoice);
  els.discoverRatingModal?.addEventListener('click', handleDiscoverRatingChoice);
  els.discoverRatingModal?.addEventListener('close', () => { state.pendingDiscoverRatingKey = null; state.pendingDiscoverRatingTrackTV = false; });
  els.bookProgressForm?.addEventListener('submit', saveBookProgress);
  els.bookAddPeriod?.addEventListener('click', () => addBookPeriodEditorRow({ startDate: todayString(), endDate: '' }));
  els.bookPauseResume?.addEventListener('click', toggleBookPauseResume);
  els.bookPeriodsList?.addEventListener('click', handleBookPeriodEditorClick);
  els.bookPeriodsList?.addEventListener('input', updateBookPauseResumeButton);
  enableMobileDialogSwipeToClose();

  document.addEventListener('click', async event => {
    const close = event.target.closest('[data-close]');
    if (close) document.getElementById(close.dataset.close)?.close();

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
      toggleDiscoverRecommended(discoverRecommend.dataset.discoverRecommend);
      return;
    }

    const libraryRating = event.target.closest('[data-library-rating]');
    if (libraryRating) {
      saveLibraryRating(libraryRating.dataset.itemId, Number(libraryRating.dataset.libraryRating));
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

    const bookCompleteProgress = event.target.closest('[data-book-mark-complete-progress]');
    if (bookCompleteProgress) {
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
      els.bookCurrentPage.value = String(total);
      if (els.bookEndDate && !els.bookEndDate.value) els.bookEndDate.value = todayString();
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
      await markDiscoverSeriesWatched(discoverAllCheck.dataset.discoverKey);
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
      const rating = Number(discoverTVRating.dataset.discoverTvRating);
      setDiscoverTVPendingRating(discoverTVRating.dataset.discoverKey, rating);
      persistDiscoverRating(discoverTVRating.dataset.discoverKey, rating);
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

  if (view === 'calendar') {
    await renderQueueCalendar();
    return;
  }

  els.upNextList?.classList.remove('queue-calendar-list');
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
  els.upNextList.classList.toggle('tbr-thumbnail-grid', thumbnailTBR);
  els.upNextList.innerHTML = '';
  els.upNextEmpty.hidden = items.length > 0;
  els.upNextEmpty.textContent = items.length === 0 && availableItems.length > 0
    ? 'No items match this type filter.'
    : view === 'tbr'
      ? 'Save something for later from Discover or the + button.'
      : 'Add something to Up Next to start your queue.';

  if (thumbnailTBR) {
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tbr-thumbnail-button';
      button.dataset.action = 'details';
      button.dataset.id = item.id;
      button.setAttribute('aria-label', `Open ${item.title}`);
      button.title = item.title;
      button.innerHTML = item.image
        ? `<img class="tbr-thumbnail-image" src="${escapeAttr(item.image)}" alt="" loading="lazy" />`
        : `<span class="tbr-thumbnail-placeholder">${escapeHtml((item.title || '?').slice(0,1).toUpperCase())}</span>`;
      els.upNextList.appendChild(button);
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
  await Promise.all(tvItems.map(async item => {
    const card = cards.get(item.id);
    if (!card) return;
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
  }));
}

function setQueueView(view) {
  state.queueView = ['tbr', 'calendar'].includes(view) ? view : 'upnext';
  renderUpNext();
}

async function renderQueueCalendar() {
  if (!els.upNextList || !els.upNextEmpty) return;
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
  els.upNextList.classList.add('queue-calendar-list');
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

    if (sourceType === 'event') {
      const date = item.date || item.eventMeta?.eventDate || '';
      add(item, date, item.title, [formatEventClock(item.eventMeta?.eventTime || ''), item.eventMeta?.venueName || '', item.eventMeta?.city || '', getQueueStatus(item) === 'tbr' ? 'TBR' : ''].filter(Boolean).join(' · '), item.image, 'event');
      continue;
    }

    if (item.date && item.date >= today) {
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

  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function queueCalendarEntryMarkup(entry) {
  const label = getItemTypeLabel(entry.item);
  const art = entry.image ? `<img src="${escapeAttr(entry.image)}" alt="" />` : `<div class="queue-calendar-thumb placeholder">${escapeHtml(label?.[0] || '•')}</div>`;
  return `<article class="queue-calendar-entry">
    ${art}
    <div class="queue-calendar-entry-copy"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml([label, entry.meta].filter(Boolean).join(' · '))}</span></div>
    <button class="upnext-arrow" type="button" data-action="details" data-id="${escapeAttr(entry.item.id)}" aria-label="Open details">→</button>
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
    action = `<button class="check-button start-button" type="button" data-action="start" data-id="${item.id}" aria-label="Move to Up Next" title="Move to Up Next">→</button>`;
  } else if (sourceType === 'book') {
    action = `<button class="check-button book-check" type="button" data-action="complete" data-id="${item.id}" aria-label="Update pages" title="Update pages">↗</button>`;
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
  if (sourceType === 'event') return eventQueueMeta(item);
  return item.subtitle || 'Saved for later';
}

async function getUpNextInfo(item) {
  if (getSourceType(item) === 'tv') {
    const checkedAt = Date.parse(item.tvMeta?.checkedAt || '');
    if (!Number.isFinite(checkedAt) || Date.now() - checkedAt > 30000) {
      await syncTVProgressToFirstUnwatched(item);
    }
    const episode = await getCached(`tv:${item.providerId}:s${item.progress?.nextSeason || 1}e${item.progress?.nextEpisode || 1}`, () =>
      TrackerAPI.getTVEpisode(item.providerId, item.progress?.nextSeason || 1, item.progress?.nextEpisode || 1, state.settings)
    );
    return {
      title: item.title,
      meta: `S${episode.season_number} E${episode.episode_number} · ${episode.name || 'Episode'}`,
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

  if (getSourceType(item) === 'event') {
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
  if (getSourceType(item) === 'event') return `0:${item.date || item.eventMeta?.eventDate || '9999-12-31'}:${item.createdAt || ''}`;
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
  state.history = state.history.filter(entry => !(
    entry.kind === 'episode-watched' &&
    entry.sourceItemId === item.id &&
    Number(entry.seasonNumber) === Number(seasonNumber) &&
    Number(entry.episodeNumber) === Number(episodeNumber)
  ));
  // A series-level completion marker is no longer valid after any episode is cleared.
  state.history = state.history.filter(entry => !(
    entry.kind === 'series-watched' && entry.sourceItemId === item.id
  ));
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
  if (['following', 'watch-later', 'stopped'].includes(item.watchDisposition)) return item.watchDisposition;
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

  if (disposition === 'stopped') {
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
  const tvItems = state.items.filter(item => getSourceType(item) === 'tv' && item.providerId);
  const results = await Promise.all(tvItems.map(async item => {
    try {
      return await reconcileSingleTVItem(item);
    } catch (error) {
      console.warn(`Could not refresh TV status for ${item.title}:`, error);
      return false;
    }
  }));
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

  if (disposition === 'stopped') labels.push({ label: 'Stopped watching', tone: 'muted' });
  else if (disposition === 'watch-later') labels.push({ label: 'Watch later', tone: 'later' });
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
  const disposition = getTVWatchDisposition(item);
  let watchButtons = '';
  if (disposition === 'following') {
    watchButtons = `
      <button class="secondary-button" type="button" data-tv-watch-action="watch-later" data-item-id="${item.id}">Watch later</button>
      <button class="quiet-button danger-text" type="button" data-tv-watch-action="stop" data-item-id="${item.id}">Move to Library / Stop watching</button>`;
  } else {
    watchButtons = `<button class="primary-button" type="button" data-tv-watch-action="resume" data-item-id="${item.id}">Resume watching</button>`;
  }
  const wholeComplete = Boolean(item.completedAt);
  return `<div class="detail-actions tv-watch-actions"><button class="primary-button${wholeComplete ? ' is-complete' : ''}" type="button" data-tv-mark-series-complete="${item.id}" ${wholeComplete ? 'disabled' : ''}>${wholeComplete ? '✓ Series complete' : '✓ Mark series complete'}</button>${watchButtons}<button class="secondary-button${item.recommended ? ' is-recommended' : ''}" type="button" data-toggle-recommended="${item.id}">${item.recommended ? '★ Recommended' : '☆ Recommend'}</button><button class="secondary-button" type="button" data-edit-id="${item.id}">Edit</button></div>`;
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
  if (!item || getSourceType(item) !== 'tv' || item.completedAt) return;
  const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
  const seasons = (details.seasons || []).filter(season => season.season_number > 0 && season.episode_count > 0);
  for (const info of seasons) {
    const season = await getCached(`season:${item.providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(item.providerId, info.season_number, state.settings));
    for (const episode of (season.episodes || []).filter(ep => Number(ep.episode_number) > 0 && isEpisodeAvailable(ep))) {
      if (!isTVEpisodeLogged(item, info.season_number, episode.episode_number)) addImportedTVEpisode(item, episode, info.season_number);
    }
  }
  await recalculateTVProgress(item);
  item.completedAt = item.completedAt || todayString();
  setItemQueueStatus(item, 'library');
  item.updatedAt = new Date().toISOString();
  if (!state.history.some(entry => entry.kind === 'series-watched' && entry.sourceItemId === item.id)) {
    addHistoryRecord({
      sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: '', showOnCalendar: false,
      kind: 'series-watched', title: item.title, subtitle: item.subtitle || '', notes: item.notes || '', rating: Number(item.rating || 0),
      image: item.image || '', provider: item.provider, providerId: item.providerId
    });
  }
  saveItems();
  saveHistory();
  renderAll();
  if (els.detailModal?.open && state.openDetailId === item.id) await renderTVDetails(item);
}

async function markWholeBookComplete(item) {
  if (!item || getSourceType(item) !== 'book' || item.completedAt) return;
  let total = Math.max(0, Number(item.progress?.totalPages || 0));
  if (!total && item.providerId) {
    try {
      const data = await getCached(`book:${item.providerId}`, () => TrackerAPI.getBookDetails(item.providerId, state.settings));
      total = Math.max(0, Number(data?.volumeInfo?.pageCount || 0));
    } catch {}
  }
  const periods = getBookReadingPeriods(item);
  if (periods.length) {
    const latest = periods.at(-1);
    if (latest && !latest.endDate) latest.endDate = todayString();
  } else {
    periods.push({ startDate: todayString(), endDate: todayString() });
  }
  item.progress = { ...item.progress, currentPage: total || Number(item.progress?.currentPage || 0), totalPages: total || Number(item.progress?.totalPages || 0), readingPeriods: periods };
  item.completedAt = todayString();
  setItemQueueStatus(item, 'library');
  item.updatedAt = new Date().toISOString();
  if (!state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'book-finished')) {
    addHistoryRecord({
      sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: '', showOnCalendar: false,
      kind: 'book-finished', title: item.title, subtitle: total ? `Finished · ${total} pages` : 'Finished', notes: item.notes || '',
      rating: Number(item.rating || 0), image: item.image || '', provider: item.provider, providerId: item.providerId
    });
  }
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

function addImportedTVEpisode(item, episode, seasonNumber) {
  if (isTVEpisodeLogged(item, seasonNumber, episode.episode_number)) return;
  const record = tvHistoryRecord(item, episode, seasonNumber, episode.episode_number);
  addHistoryRecord({
    ...record,
    date: '',
    showOnCalendar: false,
    imported: true,
    importedAt: new Date().toISOString(),
    notes: ''
  });
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

async function moveItemToQueue(item, status) {
  const next = ['upnext', 'tbr', 'library'].includes(status) ? status : 'library';
  if (getSourceType(item) === 'tv') {
    if (next === 'upnext') {
      item.watchDisposition = 'following';
      setItemQueueStatus(item, 'upnext');
      await reconcileSingleTVItem(item);
    } else if (next === 'tbr') {
      item.watchDisposition = 'watch-later';
      setItemQueueStatus(item, 'tbr');
    } else {
      item.watchDisposition = 'stopped';
      setItemQueueStatus(item, 'library');
    }
  } else {
    setItemQueueStatus(item, next);
  }
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderAll();
  if (els.detailModal?.open && state.openDetailId === item.id) {
    const sourceType = getSourceType(item);
    if (sourceType === 'tv') await renderTVDetails(item);
    else if (sourceType === 'youtube') await renderWorkoutDetails(item);
    else if (sourceType === 'book') await renderBookDetails(item);
    else if (sourceType === 'movie') await renderMovieDetails(item);
    else if (sourceType === 'music') await renderMusicDetails(item);
    else if (sourceType === 'reminder') renderReminderDetails(item);
    else if (sourceType === 'event') await renderEventDetails(item);
    else renderManualDetails(item);
  }
}

function queueMoveControls(item) {
  const current = getQueueStatus(item);
  const buttons = [];
  if (current !== 'upnext') buttons.push(`<button class="secondary-button" type="button" data-move-queue="upnext" data-item-id="${item.id}">Move to Up Next</button>`);
  if (current !== 'tbr') buttons.push(`<button class="secondary-button" type="button" data-move-queue="tbr" data-item-id="${item.id}">Watch later / TBR</button>`);
  if (current !== 'library') buttons.push(`<button class="quiet-button" type="button" data-move-queue="library" data-item-id="${item.id}">Move to Library</button>`);
  return buttons.join('');
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
    if (els.itemRecommended) els.itemRecommended.checked = Boolean(item.recommended);
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
  els.itemModal.showModal();
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
  els.catalogueQuery.value = '';
  els.playlistInput.value = '';
  els.searchResults.hidden = true;
  els.searchResults.innerHTML = '';
  els.selectedSource.hidden = true;
  els.playlistPreview.hidden = true;
}

function updateItemFormForType() {
  const sourceType = els.itemSourceType.value;
  const isCatalogue = ['tv', 'book', 'movie', 'music', 'event'].includes(sourceType);
  const isYouTube = sourceType === 'youtube';
  const isReminder = sourceType === 'reminder';
  const isManual = sourceType === 'other';

  els.catalogueSearchBlock.hidden = !isCatalogue;
  els.workoutBlock.hidden = !isYouTube;
  if (els.reminderBlock) els.reminderBlock.hidden = !isReminder;
  els.displayTypeBlock.hidden = !(isYouTube || isReminder || isManual);
  els.manualTitleBlock.hidden = false;
  els.tvProgressFields.hidden = sourceType !== 'tv';
  els.bookProgressFields.hidden = sourceType !== 'book';
  if (els.itemDateField) els.itemDateField.hidden = sourceType === 'book' || isReminder;
  if (sourceType === 'book' && !els.editingId.value && els.bookStartDate && !els.bookStartDate.value) {
    els.bookStartDate.value = todayString();
  }
  if (els.queueStatusField) els.queueStatusField.hidden = isReminder;

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
    els.provider.value = isYouTube ? 'youtube' : isReminder ? 'reminder' : isManual ? 'manual' : '';
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
    music: 'Search albums',
    event: 'Search concerts, sports, theatre, events'
  };
  els.catalogueQuery.placeholder = placeholders[sourceType] || 'Search title';
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
    const results = type === 'event'
      ? await TrackerAPI.searchTicketmasterEvents(query, state.settings, {
          city: state.discoverPrefs.eventCity || state.settings.homeCity || '',
          countryCode: state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA',
          size: 30
        })
      : await TrackerAPI.searchCatalogue(query, type, state.settings);
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
    els.searchResults.innerHTML = '<div class="search-result-meta" style="padding:14px">No results.</div>';
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
        <div class="search-result-meta">${escapeHtml(result.subtitle || '')}</div>
      </div>`;
    button.addEventListener('click', () => selectCatalogueResult(result));
    els.searchResults.appendChild(button);
  });
  els.searchResults.hidden = false;
}

function selectCatalogueResult(result) {
  state.selectedSource = result;
  els.manualTitle.value = result.title || '';
  els.provider.value = result.provider;
  els.providerId.value = result.providerId;
  els.providerImage.value = result.image || '';
  els.providerSubtitle.value = result.subtitle || '';
  els.searchResults.hidden = true;
  showSelectedSource(result);

  if (els.itemSourceType.value === 'book' && result.pageCount && !els.bookTotalPages.value) {
    els.bookTotalPages.value = result.pageCount;
  }
  if (els.itemSourceType.value === 'event' && result.eventDate && els.itemDate) {
    els.itemDate.value = result.eventDate;
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

  // Add newly checked episodes as undated imported history.
  for (const key of state.tvDraftWatched) {
    const [seasonNumber, episodeNumber] = key.split(':').map(Number);
    if (isTVEpisodeLogged(item, seasonNumber, episodeNumber)) continue;
    const episode = findTVDraftEpisode(seasonNumber, episodeNumber);
    if (!episode || !isEpisodeAvailable(episode)) continue;
    const record = tvHistoryRecord(item, episode, seasonNumber, episodeNumber);
    addHistoryRecord({
      ...record,
      date: '',
      showOnCalendar: false,
      imported: true,
      importedAt: new Date().toISOString()
    });
  }

  await recalculateTVProgress(item);
}


function showSelectedSource(source, playlist = false) {
  const target = playlist ? els.playlistPreview : els.selectedSource;
  target.innerHTML = `
    ${source.image ? `<img src="${escapeAttr(source.image)}" alt="" />` : '<div style="width:64px;height:84px;background:rgba(21,36,58,.08);border-radius:5px"></div>'}
    <div><strong>${escapeHtml(source.title || 'Selected')}</strong><span>${escapeHtml(source.subtitle || '')}</span></div>`;
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

  if (!title) {
    showFormMessage('Add a title.', true);
    return;
  }
  if (sourceType === 'youtube' && (provider !== 'youtube' || !providerId)) {
    showFormMessage('Load a YouTube playlist first.', true);
    return;
  }
  const expectedProvider = sourceType === 'book' ? 'googleBooks' : sourceType === 'music' ? 'itunes' : sourceType === 'event' ? 'ticketmaster' : 'tmdb';
  if (['tv','book','movie','music','event'].includes(sourceType) && (!providerId || provider !== expectedProvider)) {
    showFormMessage('Choose a search result first.', true);
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
    subcategory: cleanTypeLabel(els.itemSubcategory?.value || ''),
    title,
    provider,
    providerId,
    image,
    subtitle,
    rating: Number(els.itemRating.value || 0),
    notes: els.itemNote.value.trim(),
    recommended: Boolean(els.itemRecommended?.checked),
    genres: extractItemGenres(sourceType, state.selectedSource, editing),
    releaseDate: extractItemReleaseDate(sourceType, state.selectedSource, editing),
    attachments: attachmentFiles,
    links: state.attachmentDraft.links.map(link => ({ ...link })),
    date: sourceType === 'reminder' ? '' : (sourceType === 'event' ? (els.itemDate.value || state.selectedSource?.eventDate || editing?.date || '') : (els.itemDate.value || '')),
    queueStatus: sourceType === 'reminder' ? 'upnext' : (els.itemQueueStatus.value || 'library'),
    active: sourceType === 'reminder' || (els.itemQueueStatus.value || 'library') === 'upnext',
    createdAt: editing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: editing?.completedAt || '',
    progress: { ...(editing?.progress || {}) },
    ...(sourceType === 'tv' ? {
      watchDisposition: editing?.watchDisposition || ((els.itemQueueStatus.value || 'library') === 'tbr' ? 'watch-later' : 'following'),
      tvMeta: { ...(editing?.tvMeta || {}) }
    } : {}),
    ...(sourceType === 'event' ? {
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
    } : {})
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
    }
  }
  if (sourceType === 'youtube') {
    item.progress.currentIndex = editing?.progress?.currentIndex || 0;
    if (state.loadedPlaylist && editing?.providerId !== state.loadedPlaylist.providerId) item.progress.currentIndex = 0;
  }

  if (editing) {
    state.items = state.items.map(existing => existing.id === item.id ? item : existing);
  } else {
    state.items.push(item);
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

function chooseRating(event) {
  const button = event.target.closest('[data-rating]');
  if (!button) return;
  setRating(Number(button.dataset.rating));
}

function setRating(value) {
  els.itemRating.value = String(value);
  $$('#starPicker [data-rating]').forEach(button => button.classList.toggle('filled', Number(button.dataset.rating) <= value));
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
  els.detailModal.showModal();

  try {
    const sourceType = getSourceType(item);
    if (sourceType === 'tv') await renderTVDetails(item);
    else if (sourceType === 'youtube') await renderWorkoutDetails(item);
    else if (sourceType === 'book') await renderBookDetails(item);
    else if (sourceType === 'movie') await renderMovieDetails(item);
    else if (sourceType === 'music') await renderMusicDetails(item);
    else if (sourceType === 'reminder') renderReminderDetails(item);
    else if (sourceType === 'event') await renderEventDetails(item);
    else renderManualDetails(item);
    appendLibraryPersonalMetadata(item);
    appendItemResources(item);
  } catch (error) {
    els.detailBody.innerHTML = `${basicDetailHero(item)}<div class="api-error">${escapeHtml(error.message)}</div>${detailEditButton(item)}`;
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
      <div class="detail-actions">
        <button class="primary-button" type="button" data-check-youtube-video="${escapeAttr(videoId)}" data-item-id="${item.id}" ${isYouTubeVideoLogged(item, videoId) ? 'disabled' : ''}>${isYouTubeVideoLogged(item, videoId) ? '✓ Logged' : '✓ Mark complete'}</button>
        <a class="secondary-button detail-link-button" href="https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}" target="_blank" rel="noopener">Open on YouTube ↗</a>
        ${detailEditButton(item).replace('<div class="detail-actions">','').replace('</div>','')}
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
    <div class="detail-progress"><strong>Reading progress</strong>${total ? `Page ${current} of ${total} · ${Math.min(100, Math.round(current/total*100))}%` : `Page ${current}`}<small>${escapeHtml(bookReadingStatusText(item))}</small></div>
    <div class="detail-actions"><button class="primary-button" type="button" data-book-mark-complete-item="${item.id}" ${item.completedAt ? 'disabled' : ''}>${item.completedAt ? '✓ Book complete' : '✓ Mark book complete'}</button><button class="secondary-button" type="button" id="detailUpdatePages">Update pages & dates</button><button class="secondary-button" type="button" data-edit-id="${item.id}">Edit</button></div>
    <section class="detail-section"><h3>Reading dates</h3><div class="book-period-summary-list">${periodMarkup}</div></section>
    <section class="detail-section"><h3>Book info</h3><p>${escapeHtml([info.publisher, info.publishedDate, info.pageCount ? `${info.pageCount} pages` : ''].filter(Boolean).join(' · '))}</p></section>
  `;
  $('#detailUpdatePages')?.addEventListener('click', () => { els.detailModal.close(); openBookProgress(item); });
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
    ${detailEditButton(item)}
    ${streamingDetailMarkup(availability)}
  `;
}


async function renderEventDetails(item) {
  let event = null;
  if (item.providerId) {
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
    ticketUrl: event.ticketUrl || '',
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
    ${detailHero({ type:'EVENT', title:event.title || item.title, image:event.image || item.image, subtitle:dateLine, overview:event.description || item.notes || '' })}
    ${detailEditButton(item)}
    <section class="detail-section event-detail-section"><h3>Event details</h3>
      ${info ? `<p>${escapeHtml(info)}</p>` : ''}
      ${event.address ? `<p class="detail-meta">${escapeHtml(event.address)}</p>` : ''}
      ${event.ticketUrl ? `<a class="secondary-button detail-link-button" href="${escapeAttr(event.ticketUrl)}" target="_blank" rel="noopener">Tickets on Ticketmaster ↗</a>` : ''}
    </section>`;
}

async function renderMusicDetails(item) {
  const data = await getCached(`music:${item.providerId}`, () => TrackerAPI.getMusicDetails(item.providerId, state.settings));
  const collection = (data.results || []).find(r => r.wrapperType === 'collection') || (data.results || [])[0] || {};
  const tracks = (data.results || []).filter(r => r.wrapperType === 'track').map((track, index) => `<div class="track-row"><div>${index+1}</div><div><div class="list-title">${escapeHtml(track.trackName || 'Track')}</div><div class="list-meta">${escapeHtml(track.artistName || '')}</div></div><div>${track.trackTimeMillis ? formatMillis(track.trackTimeMillis) : ''}</div></div>`).join('');
  const image = (collection.artworkUrl100 || item.image || '').replace('100x100bb','600x600bb');
  els.detailBody.innerHTML = `
    ${detailHero({ type:'MUSIC', title:collection.collectionName || item.title, image, subtitle:collection.artistName || item.subtitle || '', overview:collection.primaryGenreName || '' })}
    ${detailEditButton(item)}
    <section class="detail-section"><h3>Tracks</h3><div class="track-list">${tracks || 'No tracks returned.'}</div></section>
  `;
}

function renderReminderDetails(item) {
  const dueDate = getNextReminderDueDate(item);
  const dueNow = !dueDate || dueDate <= todayString();
  els.detailBody.innerHTML = `
    ${detailHero({ type:getItemTypeLabel(item), title:item.title, image:'', subtitle:reminderScheduleLabel(item), overview:item.notes || '' })}
    <div class="detail-progress"><strong>Next reminder</strong>${escapeHtml(reminderDueLabel(dueDate))}</div>
    <div class="detail-actions">
      <button class="primary-button" type="button" data-reminder-complete="${escapeAttr(item.id)}" ${dueNow ? '' : 'disabled'}>✓ ${dueNow ? 'Mark complete' : 'Not due yet'}</button>
      ${detailEditButton(item).replace('<div class="detail-actions">','').replace('</div>','')}
    </div>`;
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

function detailEditButton(item) {
  return `<div class="detail-actions">${queueMoveControls(item)}<button class="secondary-button${item.recommended ? ' is-recommended' : ''}" type="button" data-toggle-recommended="${item.id}">${item.recommended ? '★ Recommended' : '☆ Recommend'}</button><button class="secondary-button" type="button" data-edit-id="${item.id}">Edit</button></div>`;
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
      <div class="star-picker library-detail-rating-picker" aria-label="Your rating out of five stars">
        ${[1,2,3,4,5].map(value => `<button type="button" data-library-rating="${value}" data-item-id="${escapeAttr(item.id)}" class="${value <= rating ? 'filled' : ''}" aria-label="${value} star${value === 1 ? '' : 's'}">★</button>`).join('')}
        <button class="clear-rating" type="button" data-clear-library-rating data-item-id="${escapeAttr(item.id)}">clear</button>
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
  els.attachmentModal.showModal();

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
  els.bookProgressTitle.textContent = item.title;
  els.progressCurrentPage.value = item.progress?.currentPage || 0;
  els.progressTotalPages.value = item.progress?.totalPages || '';
  renderBookPeriodsEditor(item);
  els.bookProgressModal.showModal();
}

function renderBookPeriodsEditor(item) {
  if (!els.bookPeriodsList) return;
  els.bookPeriodsList.innerHTML = '';
  const periods = getBookReadingPeriods(item);
  if (!periods.length) periods.push({ startDate: todayString(), endDate: '' });
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
  if (els.bookPeriodsList && !els.bookPeriodsList.children.length) addBookPeriodEditorRow({ startDate: todayString(), endDate: '' });
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

  if (total && current >= total) {
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
    .filter(item => item.date && getSourceType(item) !== 'book')
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
    .filter(item => getSourceType(item) === 'book')
    .flatMap(item => bookReadingCalendarEntries(item));

  const historyEntries = state.history.filter(entry => {
    if (entry.showOnCalendar === false) return false;
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

  els.trackerGrid.appendChild(cell('tracker-cell tracker-corner', ''));
  for (let day=1; day<=days; day++) els.trackerGrid.appendChild(cell('tracker-cell tracker-day', String(day)));

  for (const group of displayGroups) {
    els.trackerGrid.appendChild(cell('tracker-cell tracker-category', group.label.toLowerCase()));
    for (let day=1; day<=days; day++) {
      const container = cell('tracker-cell', '');
      const date = `${yearText}-${monthText}-${String(day).padStart(2, '0')}`;
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
    header.innerHTML = `
      <span class="week-weekday">${new Intl.DateTimeFormat('en-CA', { weekday: 'long' }).format(day)}</span>
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
  els.detailModal.showModal();

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
  els.historyEditModal.showModal();
}

function chooseHistoryRating(event) {
  const button = event.target.closest('[data-history-rating]');
  if (!button) return;
  setHistoryRating(Number(button.dataset.historyRating));
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
    music: 'music',
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
const DISCOVER_MODES = new Set(['new', 'popular', 'for-you', 'discover', 'calendar']);
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
  if (state.discoverMode === 'calendar') return renderDiscoverCalendar(true);
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
  els.discoverFeed.innerHTML = '';
  if (els.discoverStatus) {
    els.discoverStatus.hidden = false;
    els.discoverStatus.textContent = `Searching for “${query}”…`;
  }
  if (els.discoverFeedMessage) els.discoverFeedMessage.textContent = 'Search results';

  try {
    const selectedType = state.discoverPrefs.contentType || 'all';
    const types = selectedType === 'all' ? ['tv', 'movie', 'book', 'event'] : [selectedType];
    const settled = await Promise.allSettled(types.map(type => {
      if (type === 'event') return fetchTicketmasterEventsForPreferences(query, { size: 30, page: 0 });
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
      const availableResults = filterAlreadyKnown(entry.value || [], sourceType).filter(result => sourceType !== 'event' || ticketmasterMatchesEventPreferences(result));
      for (const result of availableResults) {
        const normalized = { ...result, sourceType, categories: result.raw?.volumeInfo?.categories || result.categories || [] };
        if (state.discoverPrefs.englishTVOnly === true && sourceType === 'tv' && String(normalized.raw?.original_language || '').toLowerCase() !== 'en') continue;
        if (!(await discoverSearchResultMatchesGenre(normalized))) continue;
        results.push(normalized);
      }
    }
    const ranked = await rankDiscoverFeedCandidates(results, 36);
    state.discoverFeedItems = ranked;
    for (const result of ranked) state.discoverFeedSeen.add(discoverResultIdentity(result));
    renderDiscoverFeedItems();
    if (els.discoverStatus) {
      els.discoverStatus.hidden = ranked.length > 0;
      els.discoverStatus.textContent = ranked.length ? '' : `No results for “${query}” with these filters.`;
    }
    if (els.discoverFeedMessage) els.discoverFeedMessage.textContent = ranked.length ? `${ranked.length} result${ranked.length === 1 ? '' : 's'} shown.` : 'Try another search or change the filters.';
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
  const next = DISCOVER_MODES.has(mode) ? mode : 'discover';
  state.discoverSearchQuery = '';
  if (els.discoverSearchInput) els.discoverSearchInput.value = '';
  if (els.clearDiscoverSearch) els.clearDiscoverSearch.hidden = true;
  if (state.discoverMode === next && (next === 'calendar' || state.discoverFeedInitialized)) return;
  state.discoverMode = next;
  updateDiscoverModeUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (next === 'calendar') {
    renderDiscoverCalendar(false);
    return;
  }
  resetDiscoverFeed(false);
  loadMoreDiscoverFeed();
}

function updateDiscoverModeUI() {
  const mode = DISCOVER_MODES.has(state.discoverMode) ? state.discoverMode : 'discover';
  const copy = {
    new: 'Recently released TV, movies, books, plus upcoming events near your configured home location.',
    popular: 'Popular TV, movies, books, and upcoming local events, with titles on your streaming services moved toward the front.',
    'for-you': 'Recommendations based on what you have watched, finished, rated, and the authors you return to, mixed with upcoming events nearby.',
    discover: 'A shuffled, effectively endless mix of TV, movies, books, and upcoming events. Your tastes influence the ranking, but each session deliberately changes.',
    calendar: 'A month-by-month view of upcoming local events, movie releases, TV premieres, and the next episodes of TV shows you already track.'
  };
  els.discoverModeTabs?.forEach(tab => {
    const active = tab.dataset.discoverMode === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  if (els.discoverFeedIntroText) els.discoverFeedIntroText.textContent = copy[mode];
  if (els.discoverTypeFilter) els.discoverTypeFilter.value = state.discoverPrefs.contentType || 'all';
  if (els.discoverGenreFilter) els.discoverGenreFilter.value = state.discoverPrefs.genre || 'all';
  const calendarMode = mode === 'calendar' && !state.discoverSearchQuery;
  if (els.discoverCalendarSection) els.discoverCalendarSection.hidden = !calendarMode;
  if (els.discoverFeedSection) els.discoverFeedSection.hidden = calendarMode;
  if (els.discoverSearchForm) els.discoverSearchForm.hidden = calendarMode;
  if (els.refreshDiscover) els.refreshDiscover.textContent = mode === 'discover' ? 'Shuffle' : 'Refresh';
}

async function renderDiscover(force = false) {
  if (!els.discoverStatus) return;
  await ensureDiscoverGenreCatalog();
  updateDiscoverModeUI();
  if (state.discoverSearchQuery) return runDiscoverSearch(state.discoverSearchQuery);
  if (state.discoverMode === 'calendar') return renderDiscoverCalendar(force);

  // The new Discover page is an endless mixed feed. Keep old section helpers below
  // for compatibility with older saved/deployed HTML, but prefer this path.
  if (!els.discoverFeed) return renderLegacyDiscover(force);

  if (force || !state.discoverFeedInitialized) {
    resetDiscoverFeed(force);
  } else {
    // If something was just added/watched from the feed, remove it without
    // throwing away the user's current discovery session or scroll position.
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
    els.discoverStatus.textContent = 'Loading upcoming events and releases…';
  }
  if (els.discoverCalendarMessage) els.discoverCalendarMessage.textContent = '';
  els.discoverCalendarGrid.innerHTML = '<div class="discover-calendar-loading">Loading calendar…</div>';

  try {
    const entries = await collectDiscoverCalendarEntries();
    state.discoverCalendarEntries = entries;
    renderDiscoverCalendarGrid(entries);
    if (els.discoverStatus) els.discoverStatus.hidden = true;
    if (els.discoverCalendarMessage) {
      const selectedType = state.discoverPrefs.contentType || 'all';
      if (selectedType === 'book') {
        els.discoverCalendarMessage.textContent = 'Books are not shown here because Google Books publication metadata is not a dependable calendar of forthcoming releases.';
      } else if (!entries.length) {
        els.discoverCalendarMessage.textContent = 'Nothing matching your current type, genre, event preferences, and location was found for this month.';
      } else {
        const eventCount = entries.filter(entry => entry.sourceType === 'event').length;
        const movieCount = entries.filter(entry => entry.sourceType === 'movie').length;
        const tvCount = entries.filter(entry => entry.sourceType === 'tv').length;
        els.discoverCalendarMessage.textContent = [
          eventCount ? `${eventCount} event${eventCount === 1 ? '' : 's'}` : '',
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
  const selectedType = state.discoverPrefs.contentType || 'all';
  if (selectedType === 'book') return [];
  const entries = [];
  state.discoverResults.clear();

  if ((selectedType === 'all' || selectedType === 'event') && state.settings.ticketmasterKey) {
    const paddedStart = addDaysToDateString(startDate, -1);
    const paddedEnd = addDaysToDateString(endDate, 1);
    for (let page = 0; page < 3; page += 1) {
      const eventCity = String(state.discoverPrefs.eventCity || state.settings.homeCity || '').toLowerCase();
      const eventCountry = String(state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA').toUpperCase();
      const key = `${discoverCalendarCachePrefix()}events:${eventCity}:${eventCountry}:${ticketmasterPreferenceSignature()}:${page}`;
      const events = await getCached(key, () => fetchTicketmasterEventsForPreferences('', {
        page,
        size: 50,
        startDateTime: ticketmasterMonthBoundary(paddedStart),
        endDateTime: ticketmasterMonthBoundary(paddedEnd, true),
        skipPrioritySearch: true
      }));
      for (const result of events || []) {
        if (!result.eventDate || result.eventDate < startDate || result.eventDate > endDate) continue;
        if (!discoverResultMatchesGenre(result)) continue;
        entries.push({
          ...result,
          sourceType: 'event',
          date: result.eventDate,
          calendarKind: 'Event',
          calendarSecondary: [formatEventClock(result.eventTime || ''), result.venueName || result.city || ''].filter(Boolean).join(' · ')
        });
      }
      if ((events || []).length < 50) break;
    }
  }

  if (selectedType === 'all' || selectedType === 'movie') {
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

  if (selectedType === 'all' || selectedType === 'tv') {
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
  return type === 'event' ? 0 : type === 'movie' ? 1 : 2;
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
  const typeLabel = entry.sourceType === 'event' ? 'Event' : entry.sourceType === 'movie' ? 'Movie' : 'TV';
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
    els.detailModal.showModal();
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
  const shuffled = state.discoverMode === 'discover';
  state.discoverFeedOffsets = {
    tv: shuffled ? 1 + Math.floor(Math.random() * 4) : 1,
    movie: shuffled ? 1 + Math.floor(Math.random() * 4) : 1,
    book: shuffled ? Math.floor(Math.random() * 4) : 0
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
    const fresh = candidates.filter(result => {
      const key = discoverResultIdentity(result);
      if (!key || state.discoverFeedSeen.has(key) || findDiscoverItem(result)) return false;
      const contentType = state.discoverPrefs.contentType || 'all';
      if (contentType !== 'all' && (result.sourceType || '') !== contentType) return false;
      if (state.discoverPrefs.englishTVOnly === true && (result.sourceType || '') === 'tv') {
        if (String(result.raw?.original_language || '').toLowerCase() !== 'en') return false;
      }
      return discoverResultMatchesGenre(result);
    });

    const batchSize = window.matchMedia('(max-width: 760px)').matches ? 12 : 20;
    let ranked = await rankDiscoverFeedCandidates(fresh, batchSize);
    ranked = diversifyDiscoverFeed(ranked).slice(0, batchSize);

    if (!ranked.length) {
      state.discoverFeedEmptyPasses += 1;
      if (state.discoverFeedEmptyPasses >= 3) {
        state.discoverFeedDone = true;
        if (els.discoverFeedMessage) els.discoverFeedMessage.textContent = state.discoverMode === 'discover' ? 'You’ve reached the end of this mix. Shuffle to start a different one.' : 'No more results found in this view right now.';
      }
    } else {
      state.discoverFeedEmptyPasses = 0;
      for (const result of ranked) {
        state.discoverFeedSeen.add(discoverResultIdentity(result));
        state.discoverFeedItems.push(result);
      }
      appendDiscoverFeedItems(ranked);
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

async function collectDiscoverFeedCandidates(batchNumber) {
  const contentType = state.discoverPrefs.contentType || 'all';
  const eventPage = Math.max(0, batchNumber - 1);
  const eventCity = state.discoverPrefs.eventCity || state.settings.homeCity || '';
  const eventCountry = state.discoverPrefs.eventCountry || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA';
  const eventCacheKey = `discover:ticketmaster:${String(eventCity).toLowerCase()}:${String(eventCountry).toUpperCase()}:${ticketmasterPreferenceSignature()}:${eventPage}`;

  if (contentType === 'event') {
    if (!state.settings.ticketmasterKey) return [];
    try {
      return filterAlreadyKnown(await getCached(eventCacheKey, () => fetchTicketmasterEventsForPreferences('', { page: eventPage, size: 24 })), 'event')
        .map(result => ({ ...result, sourceType: 'event', _discoverSource: 'ticketmaster', _discoverBoost: 8 + ticketmasterPreferenceBoost(result) }));
    } catch {
      return [];
    }
  }

  let candidates;
  if (state.discoverMode === 'new') candidates = await collectNewDiscoverCandidates(batchNumber);
  else if (state.discoverMode === 'popular') candidates = await collectPopularDiscoverCandidates(batchNumber);
  else if (state.discoverMode === 'for-you') candidates = await collectForYouDiscoverCandidates(batchNumber);
  else candidates = await collectShuffledDiscoverCandidates(batchNumber);

  if (state.settings.ticketmasterKey) {
    try {
      const events = filterAlreadyKnown(await getCached(eventCacheKey, () => fetchTicketmasterEventsForPreferences('', { page: eventPage, size: 20 })), 'event');
      candidates.push(...events.map(result => ({ ...result, sourceType: 'event', _discoverSource: 'ticketmaster', _discoverBoost: (state.discoverMode === 'discover' ? 5 : 3) + ticketmasterPreferenceBoost(result) })));
    } catch {}
  }
  return dedupeDiscoverCandidatesByBoost(candidates);
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
      return { ...result, latestEpisodeDate, _discoverLatestDate: latestEpisodeDate };
    } catch {
      const fallback = result.raw?.first_air_date || '';
      return { ...result, latestEpisodeDate: fallback, _discoverLatestDate: fallback };
    }
  }));
}

async function collectNewDiscoverCandidates(batchNumber) {
  const selectedProviders = (state.discoverPrefs.streamingProviderIds || []).map(String).filter(Boolean);
  const today = todayString();
  const recentTVStart = addDaysToDateString(today, -120);
  const tvPage = Math.min(500, batchNumber);
  const moviePage = Math.min(500, batchNumber);
  const bookStart = (batchNumber - 1) * DISCOVER_BOOK_BATCH_SIZE;
  const tasks = [
    // "New" TV means a show with a recently aired episode, not a show whose
    // first season happened to premiere recently.
    TrackerAPI.getTMDBDiscover('tv', tvPage, state.settings, discoverTMDBOptions('tv', {
      sortBy: 'popularity.desc', minVotes: 5, afterDate: recentTVStart, beforeDate: today, dateField: 'air'
    })),
    TrackerAPI.getTMDBDiscover('movie', moviePage, state.settings, discoverTMDBOptions('movie', { sortBy: 'primary_release_date.desc', minVotes: 10, beforeDate: today })),
    TrackerAPI.getBookFeed(bookStart, state.settings, discoverBookOptions({ query: 'subject:fiction', orderBy: 'newest', maxResults: DISCOVER_BOOK_BATCH_SIZE }))
  ];
  if (selectedProviders.length) {
    tasks.push(TrackerAPI.getTMDBDiscover('tv', tvPage, state.settings, discoverTMDBOptions('tv', {
      sortBy: 'popularity.desc', minVotes: 3, afterDate: recentTVStart, beforeDate: today, dateField: 'air', providerIds: selectedProviders
    })));
    tasks.push(TrackerAPI.getTMDBDiscover('movie', moviePage, state.settings, discoverTMDBOptions('movie', { sortBy: 'primary_release_date.desc', minVotes: 5, beforeDate: today, providerIds: selectedProviders })));
  }
  const settled = await Promise.allSettled(tasks);
  const candidates = [];
  const add = (results, sourceType, source, boost = 0) => (results || []).forEach(result => candidates.push({ ...result, sourceType, _discoverSource: source, _discoverBoost: boost }));
  add(filterAlreadyKnown(settled[0].status === 'fulfilled' ? settled[0].value.results : [], 'tv'), 'tv', 'new', 2);
  add(filterAlreadyKnown(settled[1].status === 'fulfilled' ? settled[1].value.results : [], 'movie'), 'movie', 'new', 2);
  add(filterAlreadyKnown(settled[2].status === 'fulfilled' ? settled[2].value.results : [], 'book'), 'book', 'new', 2);
  if (selectedProviders.length) {
    add(filterAlreadyKnown(settled[3]?.status === 'fulfilled' ? settled[3].value.results : [], 'tv'), 'tv', 'preferred-streaming', 6);
    add(filterAlreadyKnown(settled[4]?.status === 'fulfilled' ? settled[4].value.results : [], 'movie'), 'movie', 'preferred-streaming', 6);
  }

  const deduped = dedupeDiscoverCandidatesByBoost(candidates);
  const annotated = await annotateLatestTVEpisodeDates(deduped);
  return annotated.sort((a, b) => {
    if (a.sourceType === 'tv' && b.sourceType === 'tv') {
      return String(b.latestEpisodeDate || '').localeCompare(String(a.latestEpisodeDate || ''));
    }
    return 0;
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
  add(filterAlreadyKnown(settled[0].status === 'fulfilled' ? settled[0].value.results : [], 'tv'), 'tv', 'popular', 3);
  add(filterAlreadyKnown(settled[1].status === 'fulfilled' ? settled[1].value.results : [], 'movie'), 'movie', 'popular', 3);
  add(filterAlreadyKnown(settled[2].status === 'fulfilled' ? settled[2].value.results : [], 'book'), 'book', 'popular', 2);
  if (selectedProviders.length) {
    add(filterAlreadyKnown(settled[3]?.status === 'fulfilled' ? settled[3].value.results : [], 'tv'), 'tv', 'preferred-streaming', 6);
    add(filterAlreadyKnown(settled[4]?.status === 'fulfilled' ? settled[4].value.results : [], 'movie'), 'movie', 'preferred-streaming', 6);
  }
  if (batchNumber === 1) {
    const current = await Promise.allSettled([
      getCached('discover:trending:tv', () => TrackerAPI.getTrending('tv', state.settings)),
      getCached('discover:trending:movie', () => TrackerAPI.getTrending('movie', state.settings))
    ]);
    if (current[0].status === 'fulfilled') add(filterAlreadyKnown(current[0].value, 'tv'), 'tv', 'trending', 8);
    if (current[1].status === 'fulfilled') add(filterAlreadyKnown(current[1].value, 'movie'), 'movie', 'trending', 8);
  }
  return dedupeDiscoverCandidatesByBoost(candidates);
}

async function collectForYouDiscoverCandidates(batchNumber) {
  const selectedProviders = (state.discoverPrefs.streamingProviderIds || []).map(String).filter(Boolean);
  const candidates = [];
  const add = (results, sourceType, source, boost = 0) => (results || []).forEach(result => candidates.push({ ...result, sourceType, _discoverSource: source, _discoverBoost: boost }));
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

  // A broad fallback prevents an empty For You page for newer profiles.
  if (candidates.length < 20) {
    const fallback = await Promise.allSettled([
      TrackerAPI.getTMDBDiscover('tv', batchNumber, state.settings, discoverTMDBOptions('tv', { sortBy: 'popularity.desc', minVotes: 50 })),
      TrackerAPI.getTMDBDiscover('movie', batchNumber, state.settings, discoverTMDBOptions('movie', { sortBy: 'popularity.desc', minVotes: 75 })),
      TrackerAPI.getBookFeed((batchNumber - 1) * DISCOVER_BOOK_BATCH_SIZE, state.settings, discoverBookOptions({ query: chooseDiscoverBookPlan(readAuthors, batchNumber).query, orderBy: 'relevance', maxResults: DISCOVER_BOOK_BATCH_SIZE }))
    ]);
    if (fallback[0].status === 'fulfilled') add(filterAlreadyKnown(fallback[0].value.results, 'tv'), 'tv', 'fallback', 0);
    if (fallback[1].status === 'fulfilled') add(filterAlreadyKnown(fallback[1].value.results, 'movie'), 'movie', 'fallback', 0);
    if (fallback[2].status === 'fulfilled') add(filterAlreadyKnown(fallback[2].value.results, 'book'), 'book', 'fallback', 0);
  }

  return dedupeDiscoverCandidatesByBoost(candidates);
}

function discoverLoadingLabel(hasItems) {
  const labels = {
    new: hasItems ? 'Finding more new releases…' : 'Loading what’s new…',
    popular: hasItems ? 'Finding more popular picks…' : 'Loading what’s popular…',
    'for-you': hasItems ? 'Finding more for you…' : 'Building recommendations for you…',
    discover: hasItems ? 'Finding more…' : 'Building a fresh mix for you…'
  };
  return labels[state.discoverMode] || labels.discover;
}

function discoverEndlessLabel() {
  if (state.discoverMode === 'discover') return 'Keep scrolling — TV, movies, books, and events keep changing as more loads.';
  if (state.discoverMode === 'for-you') return 'Keep scrolling — more recommendations will load automatically.';
  if (state.discoverMode === 'new') return 'Keep scrolling — more recent releases will load automatically.';
  return 'Keep scrolling — more popular picks will load automatically.';
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
  for (const item of state.items) {
    if (getSourceType(item) !== type || !item.genres?.length) continue;
    const rating = Number(item.rating || 0);
    const engaged = Boolean(item.completedAt) || item.recommended ||
      (type === 'tv' && state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched')) ||
      (type === 'book' && Number(item.progress?.currentPage || 0) > 0);
    if (!engaged && !rating) continue;

    let signal = 0;
    if (rating >= 4) signal += (rating - 3) * 2.2;
    else if (rating === 3) signal += .5;
    else if (rating > 0) signal -= (3 - rating) * 2.4;
    else if (engaged) signal += .7;
    if (item.recommended) signal += 2.5;
    if (type === 'tv' && getTVWatchDisposition(item) === 'stopped') signal -= 2.5;

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
  const mode = state.discoverMode || 'discover';
  const tasteProfiles = mode === 'for-you' ? {
    tv: discoverTasteProfile('tv'),
    movie: discoverTasteProfile('movie'),
    book: discoverTasteProfile('book')
  } : {};
  const prelim = (results || []).map(result => {
    let score = Number(result._discoverBoost || 0);
    const rating = Number(result.rating || 0);
    if (rating) score += Math.min(3, rating / 3.5);

    if (result.sourceType === 'book' && authorSet.size) {
      const resultAuthors = String(result.subtitle || '').split(',').map(value => value.trim().toLowerCase());
      if (resultAuthors.some(author => authorSet.has(author))) {
        result = { ...result, authorMatch: true };
        score += mode === 'for-you' ? 10 : 4;
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
      const rawDate = result.sourceType === 'book'
        ? result.publishedDate
        : result.sourceType === 'tv'
          ? (result.latestEpisodeDate || result._discoverLatestDate || result.raw?.first_air_date || '')
          : (result.raw?.release_date || '');
      const time = Date.parse(rawDate || '');
      if (Number.isFinite(time)) {
        const ageDays = Math.max(0, (Date.now() - time) / 86400000);
        score += Math.max(0, 20 - ageDays / 8);
      }
    }

    const jitterMax = mode === 'discover' ? 6.5 : mode === 'for-you' ? 2.2 : .6;
    const jitter = Math.random() * jitterMax;
    return { ...result, _discoverScore: score + jitter, _discoverJitter: jitter };
  }).sort((a,b) => b._discoverScore - a._discoverScore);

  // Pick the batch first, then resolve watch-provider names only for TV/movies
  // that will actually be rendered. This matters for an endless feed: it avoids
  // dozens of unnecessary provider calls for cards the user never sees.
  let selected = diversifyDiscoverFeed(prelim).slice(0, batchSize);
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

function diversifyDiscoverFeed(results) {
  const remaining = [...(results || [])];
  const output = [];
  while (remaining.length) {
    const recentTypes = output.slice(-2).map(item => item.sourceType);
    let index = remaining.findIndex((item, candidateIndex) => candidateIndex < 8 && !(recentTypes.length === 2 && recentTypes.every(type => type === item.sourceType)));
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

function renderDiscoverFeedItems() {
  if (!els.discoverFeed) return;
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
  const terms = normalizedTicketmasterPriorityTerms(state.discoverPrefs.eventPriorityTerms);
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
  const priorityTerms = normalizedTicketmasterPriorityTerms(state.discoverPrefs.eventPriorityTerms);
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
  renderTicketmasterPreferenceOptions();
  state.discoverProviderDraft = new Map(
    (state.discoverPrefs.streamingProviderIds || []).map((id, index) => [String(id), (state.discoverPrefs.streamingProviderNames || [])[index] || ''])
  );
  els.streamingProviderSearch.value = '';
  els.streamingRegionNote.textContent = `Streaming region: ${(state.settings.tmdbWatchRegion || 'CA').toUpperCase()}`;
  els.discoverSettingsModal.showModal();

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
  const eventCategoryKeys = [...(els.eventCategoryOptions?.querySelectorAll('input[type="checkbox"]:checked') || [])].map(input => input.value);
  const eventExcludedCategoryKeys = [...(els.eventExclusionOptions?.querySelectorAll('input[type="checkbox"]:checked') || [])].map(input => input.value);
  const eventPriorityTerms = normalizedTicketmasterPriorityTerms(els.eventPriorityTerms?.value || '');
  state.discoverPrefs = {
    ...DEFAULT_DISCOVER_PREFS,
    ...state.discoverPrefs,
    streamingProviderIds: selectedEntries.map(([id]) => id),
    streamingProviderNames: selectedEntries.map(([, name]) => name),
    prioritizeAuthors: els.prioritizeAuthors.checked,
    englishTVOnly: Boolean(els.englishTVOnly?.checked),
    contentType: state.discoverPrefs.contentType || 'all',
    genre: state.discoverPrefs.genre || 'all',
    eventCity: String(els.eventCity?.value || '').trim(),
    eventCountry: String(els.eventCountry?.value || state.settings.homeCountry || state.settings.tmdbWatchRegion || 'CA').trim().toUpperCase(),
    eventEverything: Boolean(els.eventEverything?.checked),
    eventCategoryKeys: normalizedTicketmasterPreferenceKeys(eventCategoryKeys),
    eventExcludedCategoryKeys: normalizedTicketmasterPreferenceKeys(eventExcludedCategoryKeys),
    eventPriorityTerms
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
  const year = type === 'book'
    ? String(result.publishedDate || '').slice(0, 4)
    : type === 'tv' && state.discoverMode === 'new' && result.latestEpisodeDate
      ? `Latest episode ${formatLongDate(result.latestEpisodeDate)}`
      : String(result.subtitle || '').slice(0, 4);
  const rating = result.rating ? `★ ${Number(result.rating).toFixed(1)}` : '';
  const providers = (result.streamingProviderNames || result.preferredProviderNames || []).slice(0, 2);
  const streaming = providers.length ? providers.join(' + ') : (['tv','movie'].includes(type) ? 'Streaming varies' : '');
  const meta = type === 'event'
    ? [result.eventDate ? formatLongDate(result.eventDate) : '', formatEventClock(result.eventTime || ''), result.venueName || '', result.city || ''].filter(Boolean).join(' · ')
    : [year, rating, streaming].filter(Boolean).join(' · ');
  const queueStatus = item ? getQueueStatus(item) : '';
  const recommended = Boolean(item?.recommended);
  const plusLabel = queueStatus === 'upnext' ? '+ Queue' : queueStatus === 'tbr' ? '+ TBR' : '+ Add';

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
      ${result.subtitle && type === 'book' ? `<p class="discover-card-subtitle">${escapeHtml(result.subtitle)}</p>` : ''}
      <div class="discover-card-actions${type === 'event' ? ' no-complete' : ''}">
        ${type === 'event' ? '' : `<button class="discover-complete-button${completed ? ' is-complete' : ''}" type="button" data-discover-complete="${escapeAttr(key)}" ${completed && type !== 'tv' ? 'disabled' : ''} aria-label="${type === 'tv' ? 'Choose watched seasons or episodes' : completed ? 'Already completed' : 'Mark completed'}" title="${type === 'tv' ? 'Choose watched seasons / episodes' : completed ? 'Completed' : 'Mark watched / read'}">✓</button>`}
        <button class="discover-recommend-button${recommended ? ' is-recommended' : ''}" type="button" data-discover-rate-recommend="${escapeAttr(key)}" aria-label="${recommended ? 'Remove from Recommended' : 'Rate and recommend'}" title="${recommended ? 'Remove from Recommended' : type === 'tv' ? 'Rate, recommend & track watched' : ['movie','book'].includes(type) ? 'Rate, recommend & mark complete' : 'Recommend'}">${recommended ? '★' : '☆'}</button>
        <button class="discover-add-button" type="button" data-discover-add="${escapeAttr(key)}">${escapeHtml(plusLabel)}</button>
      </div>
    </div>
  </article>`;
}

async function handleDiscoverClick(event) {
  const rateRecommend = event.target.closest('[data-discover-rate-recommend]');
  if (rateRecommend) {
    await handleDiscoverRateRecommend(rateRecommend.dataset.discoverRateRecommend);
    return;
  }

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
    } else {
      await markDiscoverCompleted(key, { promptForRating: true });
    }
    return;
  }

  const add = event.target.closest('[data-discover-add]');
  if (add) {
    openDiscoverQueueChoice(add.dataset.discoverAdd);
    return;
  }

  const detail = event.target.closest('[data-discover-detail]');
  if (detail) {
    await openDiscoverDetail(detail.dataset.discoverDetail);
  }
}

async function handleDiscoverRateRecommend(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const existing = findDiscoverItem(result);

  // A filled star is deliberately simple: remove Recommended only.
  // Ratings and watched/read history remain intact.
  if (existing?.recommended) {
    existing.recommended = false;
    existing.updatedAt = new Date().toISOString();
    saveItems();
    renderLibrary();
    renderDiscoverCardInPlace(key);
    return;
  }

  const item = ensureDiscoverItem(result, 'library');
  item.recommended = true;
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderLibrary();
  renderDiscoverCardInPlace(key);

  if (result.sourceType === 'tv') {
    state.pendingDiscoverRatingTrackTV = true;
    openDiscoverRatingPrompt(key, { allowTV: true });
    return;
  }

  if (result.sourceType === 'movie' || result.sourceType === 'book') {
    if (!isDiscoverCompleted(result)) {
      await markDiscoverCompleted(key, { promptForRating: true });
    } else {
      openDiscoverRatingPrompt(key);
    }
    return;
  }
}

function toggleDiscoverRecommended(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');
  item.recommended = !item.recommended;
  item.updatedAt = new Date().toISOString();
  saveItems();
  renderLibrary();
  renderDiscoverCardInPlace(key);
  if (els.detailModal?.open && state.openDiscoverKey === key) openDiscoverDetail(key);
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
  els.discoverQueueModal.showModal();
}

async function handleDiscoverQueueChoice(event) {
  const button = event.target.closest('[data-discover-queue-choice]');
  if (!button || !state.pendingDiscoverKey) return;
  const key = state.pendingDiscoverKey;
  const status = button.dataset.discoverQueueChoice === 'tbr' ? 'tbr' : 'upnext';
  addDiscoverToQueue(key, status);
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
  item = {
    id: makeId(),
    sourceType,
    type: sourceType,
    typeLabel: SOURCE_ITEM_LABELS[sourceType] || getTypeLabel(sourceType),
    title: result.title || 'Untitled',
    provider: result.provider || (sourceType === 'book' ? 'googleBooks' : sourceType === 'event' ? 'ticketmaster' : 'tmdb'),
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
    date: sourceType === 'event' ? (result.eventDate || '') : '',
    queueStatus,
    active: queueStatus === 'upnext',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: {}
  };

  if (sourceType === 'tv') item.progress = { nextSeason: 1, nextEpisode: 1 };
  if (sourceType === 'book') item.progress = { currentPage: 0, totalPages: Number(result.pageCount || 0) };
  if (sourceType === 'event') {
    item.eventMeta = {
      eventDate: result.eventDate || '', eventTime: result.eventTime || '', startDateTime: result.startDateTime || '', timezone: result.timezone || '',
      venueName: result.venueName || '', city: result.city || '', region: result.region || '', address: result.address || '',
      ticketUrl: result.ticketUrl || '', status: result.status || '', classifications: result.classifications || [], priceRange: result.priceRange || null
    };
    item.genres = [...(result.classifications || [])];
    item.releaseDate = result.eventDate || '';
  }
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
  if (!result || isDiscoverCompleted(result)) return;
  const item = ensureDiscoverItem(result, 'library');
  setItemQueueStatus(item, 'library');
  item.completedAt = todayString();
  item.updatedAt = new Date().toISOString();

  if (result.sourceType === 'book') {
    const total = Number(item.progress?.totalPages || result.pageCount || 0);
    item.progress = { ...item.progress, currentPage: total || item.progress?.currentPage || 0, totalPages: total };
  }

  const kind = result.sourceType === 'tv' ? 'series-watched' : result.sourceType === 'movie' ? 'movie-watched' : result.sourceType === 'book' ? 'book-finished' : 'item-completed';
  addHistoryRecord({
    sourceItemId: item.id,
    type: item.type,
    typeLabel: getItemTypeLabel(item),
    date: '',
    showOnCalendar: false,
    kind,
    title: item.title,
    subtitle: item.subtitle || '',
    notes: result.description || '',
    rating: Number(item.rating || 0),
    image: item.image || '',
    provider: item.provider,
    providerId: item.providerId
  });
  saveItems();
  saveHistory();
  renderAll();
  if (els.detailModal?.open && state.openDiscoverKey === key) {
    await openDiscoverDetail(key);
    if (promptForRating && ['movie','book'].includes(result.sourceType)) {
      requestAnimationFrame(() => els.detailBody?.querySelector('.discover-personal-meta')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    }
  } else if (promptForRating && ['movie','book'].includes(result.sourceType)) {
    openDiscoverRatingPrompt(key);
  }
}

function openDiscoverRatingPrompt(key, { allowTV = false } = {}) {
  const result = state.discoverResults.get(key);
  const allowed = ['movie','book'].includes(result?.sourceType) || (allowTV && result?.sourceType === 'tv');
  if (!result || !allowed || !els.discoverRatingModal) return;
  state.pendingDiscoverRatingKey = key;
  if (els.discoverRatingTitle) els.discoverRatingTitle.textContent = `Rate ${result.title || (result.sourceType === 'book' ? 'this book' : 'this movie')}`;
  const existing = findDiscoverItem(result);
  const rating = Math.max(0, Math.min(5, Number(existing?.rating || 0)));
  els.discoverRatingPicker?.querySelectorAll('[data-discover-rating-choice]').forEach(button => {
    button.classList.toggle('filled', Number(button.dataset.discoverRatingChoice) <= rating);
  });
  els.discoverRatingModal.showModal();
}

function handleDiscoverRatingChoice(event) {
  const choice = event.target.closest('[data-discover-rating-choice]');
  if (choice && state.pendingDiscoverRatingKey) {
    const key = state.pendingDiscoverRatingKey;
    const trackTV = Boolean(state.pendingDiscoverRatingTrackTV);
    persistDiscoverRating(key, Number(choice.dataset.discoverRatingChoice));
    state.pendingDiscoverRatingKey = null;
    state.pendingDiscoverRatingTrackTV = false;
    els.discoverRatingModal?.close();
    if (trackTV) openDiscoverTVTrackingAfterRating(key);
    return;
  }
  if (event.target.closest('[data-discover-rating-skip]')) {
    const key = state.pendingDiscoverRatingKey;
    const trackTV = Boolean(state.pendingDiscoverRatingTrackTV);
    state.pendingDiscoverRatingKey = null;
    state.pendingDiscoverRatingTrackTV = false;
    els.discoverRatingModal?.close();
    if (trackTV && key) openDiscoverTVTrackingAfterRating(key);
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
  if (!els.detailModal.open) els.detailModal.showModal();
  els.detailBody.innerHTML = '<p class="loading-detail">Loading details…</p>';
  try {
    if (result.sourceType === 'tv') await renderDiscoverTVDetail(key);
    else if (result.sourceType === 'movie') await renderDiscoverMovieDetail(key);
    else if (result.sourceType === 'book') await renderDiscoverBookDetail(key);
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
      <div class="star-picker discover-tv-rating-picker" aria-label="Your rating out of five stars">
        ${[1,2,3,4,5].map(value => `<button type="button" data-discover-tv-rating="${value}" data-discover-key="${escapeAttr(key)}" class="${value <= rating ? 'filled' : ''}" aria-label="${value} star${value === 1 ? '' : 's'}">★</button>`).join('')}
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
  const seriesCompleted = isDiscoverCompleted(result);
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
      <button class="primary-button" type="button" data-discover-detail-add="${escapeAttr(key)}">+ Up Next / TBR</button>
      <button class="secondary-button${existing?.recommended ? ' is-recommended' : ''}" type="button" data-discover-recommend="${escapeAttr(key)}">${existing?.recommended ? '★ Recommended' : '☆ Recommend'}</button>
      <button class="secondary-button${seriesCompleted ? ' is-complete' : ''}" type="button" data-discover-mark-all-tv="${escapeAttr(key)}" ${seriesCompleted ? 'disabled' : ''}>${seriesCompleted ? '✓ Series complete' : '✓ Mark series complete'}</button>
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

async function markDiscoverSeriesWatched(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');
  const details = await getCached(`tv:${result.providerId}`, () => TrackerAPI.getTVDetails(result.providerId, state.settings));
  const seasons = (details.seasons || []).filter(season => season.season_number > 0 && season.episode_count > 0);
  const allEpisodes = [];
  for (const info of seasons) {
    const season = await getCached(`season:${result.providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(result.providerId, info.season_number, state.settings));
    for (const episode of (season.episodes || []).filter(isEpisodeAvailable)) {
      allEpisodes.push({ seasonNumber: info.season_number, episode });
    }
  }

  const allWatched = allEpisodes.length > 0 && allEpisodes.every(({ seasonNumber, episode }) => isTVEpisodeLogged(item, seasonNumber, episode.episode_number));
  const okay = confirm(allWatched
    ? `Clear watched status for all available episodes of “${result.title}”?`
    : `Mark all available episodes of “${result.title}” as watched?`);
  if (!okay) return;

  if (allWatched) {
    for (const { seasonNumber, episode } of allEpisodes) removeTVEpisodeHistory(item, seasonNumber, episode.episode_number);
    item.completedAt = '';
  } else {
    for (const { seasonNumber, episode } of allEpisodes) {
      if (isTVEpisodeLogged(item, seasonNumber, episode.episode_number)) continue;
      const record = tvHistoryRecord(item, episode, seasonNumber, episode.episode_number);
      addHistoryRecord({ ...record, date: '', showOnCalendar: false, imported: true });
    }
  }

  item.watchDisposition = item.watchDisposition === 'stopped' ? 'stopped' : 'following';
  await syncDiscoverTVProgress(item);
  if (!allWatched && !state.history.some(entry => entry.kind === 'series-watched' && entry.sourceItemId === item.id)) {
    addHistoryRecord({
      sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: '', showOnCalendar: false,
      kind: 'series-watched', title: item.title, subtitle: item.subtitle || '', notes: '', image: item.image || '', provider: item.provider, providerId: item.providerId
    });
  }
  if (allWatched) {
    state.history = state.history.filter(entry => !(entry.kind === 'series-watched' && entry.sourceItemId === item.id));
  }
  saveItems();
  saveHistory();
  renderAll();
  await renderDiscoverTVDetail(key);
}

async function syncDiscoverTVProgress(item) {
  const next = await findNextUnwatchedTVEpisode(item, 0, 0);
  if (next) {
    item.progress = { ...item.progress, nextSeason: next.seasonNumber, nextEpisode: next.episodeNumber };
    item.completedAt = '';
    state.history = state.history.filter(entry => !(entry.kind === 'series-watched' && entry.sourceItemId === item.id));
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
      <button class="primary-button" type="button" data-discover-detail-add="${escapeAttr(key)}">+ Up Next / TBR</button>
      <button class="secondary-button${findDiscoverItem(result)?.recommended ? ' is-recommended' : ''}" type="button" data-discover-recommend="${escapeAttr(key)}">${findDiscoverItem(result)?.recommended ? '★ Recommended' : '☆ Recommend'}</button>
      <button class="secondary-button" type="button" data-discover-detail-complete="${escapeAttr(key)}" ${completed ? 'disabled' : ''}>${completed ? '✓ Watched' : '✓ Mark watched'}</button>
    </div>
    ${discoverTVPersonalMetadataMarkup(findDiscoverItem(result), key)}
    <section class="detail-section streaming-detail"><h3>Streaming</h3><p>${escapeHtml(providerText)}</p>${availability.link ? `<a href="${escapeAttr(availability.link)}" target="_blank" rel="noopener">See availability ↗</a>` : ''}</section>
    ${details.genres?.length ? `<section class="detail-section"><h3>Genres</h3><p>${escapeHtml(details.genres.map(genre => genre.name).join(' · '))}</p></section>` : ''}`;
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
      <button class="primary-button" type="button" data-discover-detail-add="${escapeAttr(key)}">${item && getQueueStatus(item) === 'tbr' ? 'In TBR' : item && getQueueStatus(item) === 'upnext' ? 'In Up Next' : '+ Up Next / TBR'}</button>
      <button class="secondary-button${item?.recommended ? ' is-recommended' : ''}" type="button" data-discover-recommend="${escapeAttr(key)}">${item?.recommended ? '★ Recommended' : '☆ Recommend'}</button>
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
      <button class="primary-button" type="button" data-discover-detail-add="${escapeAttr(key)}">+ Up Next / TBR</button>
      <button class="secondary-button${existing?.recommended ? ' is-recommended' : ''}" type="button" data-discover-recommend="${escapeAttr(key)}">${existing?.recommended ? '★ Recommended' : '☆ Recommend'}</button>
      <button class="secondary-button" type="button" data-discover-detail-complete="${escapeAttr(key)}" ${completed ? 'disabled' : ''}>${completed ? '✓ Read' : '✓ Mark read'}</button>
    </div>
    ${discoverTVPersonalMetadataMarkup(existing, key)}
    ${info.categories?.length ? `<section class="detail-section"><h3>Categories</h3><p>${escapeHtml(info.categories.join(' · '))}</p></section>` : ''}`;
}

// ---------------------------
// STICKER SETTINGS
// ---------------------------
function openStickerSettings() {
  if (!els.stickerSettingsModal || !els.stickerSettingsRows) return;
  renderStickerSettingsRows();
  els.stickerSettingsModal.showModal();
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
      <strong class="sticker-setting-type">${escapeHtml(target.label)}</strong>
      ${target.subcategory
        ? `<span class="sticker-setting-calendar-inherit">Uses ${escapeHtml(getCalendarCategoryLabel(target.type, getTypeLabel(target.type)))}</span>`
        : `<label class="sticker-setting-field sticker-setting-calendar-name">
            <span class="sticker-setting-mobile-label">Calendar name</span>
            <input data-sticker-field="calendar-label" type="text" maxlength="30" value="${escapeAttr(parentSaved.calendarLabel || '')}" placeholder="${escapeAttr(target.label)}" />
          </label>`}
      <div class="sticker-setting-preview">${calendarStickerMarkup(target.type, sampleEntry)}</div>
      <label class="sticker-setting-field">
        <span class="sticker-setting-mobile-label">Shape</span>
        <select data-sticker-field="shape">
          <option value="square" ${config.shape === 'square' ? 'selected' : ''}>Square</option>
          <option value="circle" ${config.shape === 'circle' ? 'selected' : ''}>Circle</option>
          <option value="star" ${config.shape === 'star' ? 'selected' : ''}>Star</option>
          <option value="heart" ${config.shape === 'heart' ? 'selected' : ''}>Heart</option>
        </select>
      </label>
      <label class="sticker-setting-field">
        <span class="sticker-setting-mobile-label">Text</span>
        <input data-sticker-field="label" type="text" maxlength="3" value="${escapeAttr(['star','heart'].includes(config.shape) ? '' : config.label)}" placeholder="leave blank for no text" ${['star','heart'].includes(config.shape) ? 'disabled' : ''} />
      </label>
      <label class="sticker-setting-field">
        <span class="sticker-setting-mobile-label">Color</span>
        <select data-sticker-field="color">
          ${STICKER_COLORS.map(color => `<option value="${color}" ${config.color === color ? 'selected' : ''}>${color[0].toUpperCase()+color.slice(1)}</option>`).join('')}
        </select>
      </label>`;
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
  const base = `${streak.count} day${streak.count === 1 ? '' : 's'} streak`;
  return streak.restToday ? `${base} · rest today` : base;
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
  if (!els.streakSettingsModal || !els.streakSettingsRows) return;
  renderStreakSettingsRows();
  els.streakSettingsModal.showModal();
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
  els.streakSettingsModal?.close();
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
  if (sourceType === 'music') {
    const genre = source?.raw?.primaryGenreName || source?.description || editing?.genres?.[0] || '';
    return genre ? [String(genre)] : [];
  }
  if (sourceType === 'event') {
    const classifications = source?.classifications || editing?.eventMeta?.classifications || editing?.genres || [];
    return [...new Set(classifications.map(value => String(value || '').trim()).filter(Boolean))];
  }
  return [...(editing?.genres || [])];
}

function extractItemReleaseDate(sourceType, source, editing) {
  if (sourceType === 'book') return source?.publishedDate || source?.raw?.volumeInfo?.publishedDate || editing?.releaseDate || '';
  if (sourceType === 'tv') return source?.raw?.first_air_date || editing?.releaseDate || '';
  if (sourceType === 'movie') return source?.raw?.release_date || editing?.releaseDate || '';
  if (sourceType === 'music') return source?.raw?.releaseDate || editing?.releaseDate || '';
  if (sourceType === 'event') return source?.eventDate || source?.raw?.dates?.start?.localDate || editing?.date || editing?.releaseDate || '';
  return editing?.releaseDate || '';
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
  const datedHistory = state.history
    .filter(entry => entry.sourceItemId === item.id && entry.date)
    .map(entry => entry.date)
    .sort()
    .at(-1);

  // "Recent" means the latest meaningful activity on the Library item, not
  // only when it was originally watched/read. Rating an older movie today should
  // therefore move it to the front instead of being pinned to its old completedAt.
  return [
    item.updatedAt,
    datedHistory,
    item.completedAt,
    item.date,
    item.createdAt
  ].filter(Boolean).sort().at(-1) || '';
}

function normalizeLibraryPrefs(value) {
  const keys = Array.isArray(value?.defaultTypeKeys)
    ? [...new Set(value.defaultTypeKeys.map(key => slugifyType(key)).filter(Boolean))]
    : null;
  return { defaultTypeKeys: keys };
}

function isCoreLibraryGroupKey(key) {
  const normalized = slugifyType(key).replace(/s$/, '');
  return normalized === 'tv' || normalized === 'movie' || normalized === 'book';
}

function libraryAvailableTypeGroups() {
  const groups = new Map();
  for (const item of state.items.filter(item => getQueueStatus(item) !== 'tbr')) {
    const key = libraryTypeGroupKey(item);
    if (!groups.has(key)) groups.set(key, getItemTypeLabel(item));
  }

  // Keep the three core content types available even before the user has saved
  // something in each category.
  [['tv', 'TV'], ['movie', 'Movie'], ['book', 'Book']].forEach(([key, label]) => {
    if (!groups.has(key) && ![...groups.keys()].some(existing => slugifyType(existing).replace(/s$/, '') === key)) {
      groups.set(key, label);
    }
  });

  return [...groups.entries()].sort(([aKey,aLabel],[bKey,bLabel]) => {
    const preferred = ['tv','movie','movies','book','books'];
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
  els.librarySettingsModal?.showModal();
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
  const disposition = getTVWatchDisposition(item);
  if (disposition === 'stopped') return 'stopped';
  if (Boolean(item.tvMeta?.hasUnwatched) || getQueueStatus(item) === 'upnext') return 'in-progress';
  if (isTerminalSeriesStatus(item.tvMeta?.seriesStatus || '')) return 'finished';
  return 'up-to-date';
}

function tvLibraryStatusLabel(key) {
  return ({
    'in-progress': 'In progress',
    'up-to-date': 'Up to date',
    finished: 'Finished',
    stopped: 'Stopped watching'
  })[key] || key;
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

function makeLibraryPoster(item) {
  const poster = document.createElement('button');
  poster.type = 'button';
  poster.className = 'library-poster-button';
  poster.dataset.detailsId = item.id;
  poster.setAttribute('aria-label', `Open ${item.title}`);
  poster.title = [item.title, item.rating ? `${item.rating}/5` : '', item.genres?.[0] || ''].filter(Boolean).join(' · ');
  const personalRating = Math.max(0, Math.min(5, Number(item.rating || 0)));
  poster.innerHTML = `${item.image
    ? `<img class="library-poster-image" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" loading="lazy" />`
    : `<span class="library-poster-placeholder">${escapeHtml((item.title || '?').slice(0,1).toUpperCase())}</span>`}
    ${personalRating > 0 ? `<span class="library-rating-badge" aria-label="Your rating ${personalRating} out of 5">★ ${escapeHtml(formatPersonalRating(personalRating))}</span>` : ''}`;
  return poster;
}

function renderLibrary() {
  refreshTypeFilter();
  const visibleTypes = ensureLibraryVisibleTypes();
  const sort = els.librarySort?.value || 'date';

  let filtered = state.items
    .filter(item => getQueueStatus(item) !== 'tbr')
    .filter(item => state.libraryView !== 'recommended' || item.recommended)
    .filter(item => visibleTypes.has(libraryTypeGroupKey(item)));

  const compare = sort === 'rating'
    ? (a,b) => Number(b.rating || 0) - Number(a.rating || 0) || String(itemLibraryDate(b)).localeCompare(String(itemLibraryDate(a))) || a.title.localeCompare(b.title)
    : sort === 'title'
      ? (a,b) => a.title.localeCompare(b.title)
      : (a,b) => String(itemLibraryDate(b)).localeCompare(String(itemLibraryDate(a))) || Number(b.rating || 0) - Number(a.rating || 0) || a.title.localeCompare(b.title);

  const preferredLabels = ['TV','Movie','Book','Music','Workout','Other'];
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
  els.libraryEmpty.hidden = filtered.length > 0;
  if (!filtered.length) {
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
          <button class="library-expand-button" type="button" data-library-expand="${rootExpansionKey}">${rootExpanded ? 'Collapse' : 'View all'}</button>
        </div>
        ${rootExpanded
          ? '<div class="tv-library-status-groups"></div>'
          : '<div class="library-poster-grid tv-library-preview"></div>'}`;

      if (rootExpanded) {
        const statusHost = section.querySelector('.tv-library-status-groups');
        for (const statusKey of ['in-progress', 'up-to-date', 'finished', 'stopped']) {
          const statusItems = items.filter(item => tvLibraryStatusKey(item) === statusKey).sort(compareTVLibraryProgress);
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
              <button class="library-expand-button" type="button" data-library-expand="${escapeAttr(expansionKey)}">${expanded ? 'Carousel' : 'View all'}</button>
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

    const expanded = state.libraryExpandedGroups.has(groupKey);
    const section = document.createElement('section');
    section.className = `library-group library-shelf${expanded ? ' is-expanded' : ''}`;
    section.dataset.libraryGroup = groupKey;
    section.innerHTML = `
      <div class="library-group-heading-row">
        <div class="library-group-title-wrap">
          <h2 class="library-group-title">${escapeHtml(groupLabel)}</h2>
          <span class="library-group-count">${items.length}</span>
        </div>
        <button class="library-expand-button" type="button" data-library-expand="${escapeAttr(groupKey)}">${expanded ? 'Carousel' : `View all`}</button>
      </div>
      <div class="library-poster-grid${expanded ? ' is-expanded' : ''}"></div>`;
    const grid = section.querySelector('.library-poster-grid');
    for (const item of items) grid.appendChild(makeLibraryPoster(item));
    els.libraryGroups.appendChild(section);
  }
}

function handleLibraryClick(event) {
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
  if (sourceType === 'event') return eventQueueMeta(item);
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
  if (['tv', 'movie', 'book', 'music', 'event'].includes(item.type)) return item.type;
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
    else if (next === 'upnext' && item.watchDisposition !== 'stopped') item.watchDisposition = 'following';
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
  if (sourceType === 'event') return eventQueueMeta(item);
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
