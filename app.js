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
  workout: 'Workouts',
  other: 'Other'
};

const SOURCE_ITEM_LABELS = {
  tv: 'TV',
  movie: 'Movie',
  book: 'Book',
  music: 'Music'
};

const RESERVED_DISPLAY_TYPES = new Set(['tv', 'movie', 'book', 'music', 'other']);
const STICKER_COLORS = ['rust', 'red', 'coral', 'orange', 'yellow', 'cream', 'peach', 'pink', 'lavender', 'purple', 'navy', 'blue', 'sky', 'teal', 'green', 'mint', 'brown', 'black', 'white'];

const CLOUD_STATE_VERSION = 2;
const DEFAULT_DISCOVER_PREFS = { streamingProviderIds: [], streamingProviderNames: [], prioritizeAuthors: true, englishTVOnly: false, contentType: 'all', genre: 'all' };
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
  pendingDiscoverKey: null,
  openDiscoverKey: null,
  openDiscoverEpisode: null,
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
  discoverSearchQuery: '',
  discoverGenreCatalog: { tv: [], movie: [] },
  discoverKeywordCatalog: {},
  libraryView: 'all',
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
  libraryGenreFilter: $('#libraryGenreFilter'),
  librarySort: $('#librarySort'),
  libraryViewTabs: $$('.library-folder-tab[data-library-view]'),
  libraryGroups: $('#libraryGroups'),
  libraryEmpty: $('#libraryEmpty'),
  refreshDiscover: $('#refreshDiscover'),
  discoverStatus: $('#discoverStatus'),
  discoverFeed: $('#discoverFeed'),
  discoverFeedSentinel: $('#discoverFeedSentinel'),
  discoverFeedMessage: $('#discoverFeedMessage'),
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
  openDiscoverSettings: $('#openDiscoverSettings'),
  discoverSettingsModal: $('#discoverSettingsModal'),
  discoverSettingsForm: $('#discoverSettingsForm'),
  streamingProviderSearch: $('#streamingProviderSearch'),
  streamingProviderOptions: $('#streamingProviderOptions'),
  streamingRegionNote: $('#streamingRegionNote'),
  prioritizeAuthors: $('#prioritizeAuthors'),
  englishTVOnly: $('#englishTVOnly'),
  clearStreamingProviders: $('#clearStreamingProviders'),
  itemModal: $('#itemModal'),
  detailModal: $('#detailModal'),
  detailBody: $('#detailBody'),
  historyEditModal: $('#historyEditModal'),
  historyEditForm: $('#historyEditForm'),
  historyEditId: $('#historyEditId'),
  historyEditTitle: $('#historyEditTitle'),
  historyEditType: $('#historyEditType'),
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

function bindEvents() {
  els.openAddModal?.addEventListener('click', () => openItemModal('', state.queueView === 'tbr' ? 'tbr' : 'upnext'));
  els.queueTabs?.forEach(tab => tab.addEventListener('click', () => setQueueView(tab.dataset.queueTab)));
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
  if (els.trackerGrid) mobileCalendarQuery.addEventListener?.('change', renderTracker);
  els.typeFilter?.addEventListener('change', () => { refreshLibraryGenreFilter(); renderLibrary(); });
  els.libraryGenreFilter?.addEventListener('change', renderLibrary);
  els.librarySort?.addEventListener('change', renderLibrary);
  els.libraryViewTabs?.forEach(tab => tab.addEventListener('click', () => setLibraryView(tab.dataset.libraryView)));
  els.upNextList?.addEventListener('click', handleUpNextClick);
  els.trackerGrid?.addEventListener('click', handleTrackerClick);
  els.libraryGroups?.addEventListener('click', handleLibraryClick);
  els.refreshDiscover?.addEventListener('click', () => renderDiscover(true));
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
  document.querySelector('#discover')?.addEventListener('click', handleDiscoverClick);
  els.discoverQueueModal?.addEventListener('click', handleDiscoverQueueChoice);
  els.bookProgressForm?.addEventListener('submit', saveBookProgress);
  els.bookAddPeriod?.addEventListener('click', () => addBookPeriodEditorRow({ startDate: todayString(), endDate: '' }));
  els.bookPauseResume?.addEventListener('click', toggleBookPauseResume);
  els.bookPeriodsList?.addEventListener('click', handleBookPeriodEditorClick);
  els.bookPeriodsList?.addEventListener('input', updateBookPauseResumeButton);

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

    const libraryRating = event.target.closest('[data-library-rating]');
    if (libraryRating) {
      setLibraryPendingRating(libraryRating.dataset.itemId, Number(libraryRating.dataset.libraryRating));
      return;
    }

    const clearLibraryRating = event.target.closest('[data-clear-library-rating]');
    if (clearLibraryRating) {
      setLibraryPendingRating(clearLibraryRating.dataset.itemId, 0);
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

    const reminderCompleteButton = event.target.closest('[data-reminder-complete]');
    if (reminderCompleteButton) {
      const item = findItem(reminderCompleteButton.dataset.reminderComplete);
      if (!item) return;
      const record = reminderCompletionRecord(item);
      addHistoryRecord(record);
      item.lastCompletedAt = new Date().toISOString();
      setItemQueueStatus(item, 'upnext');
      saveItems();
      saveHistory();
      renderAll();
      renderReminderDetails(item);
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
      await markDiscoverCompleted(discoverCompleteFromDetail.dataset.discoverDetailComplete);
      return;
    }

    const discoverTVRating = event.target.closest('[data-discover-tv-rating]');
    if (discoverTVRating) {
      setDiscoverTVPendingRating(discoverTVRating.dataset.discoverKey, Number(discoverTVRating.dataset.discoverTvRating));
      return;
    }

    const clearDiscoverTVRating = event.target.closest('[data-clear-discover-tv-rating]');
    if (clearDiscoverTVRating) {
      setDiscoverTVPendingRating(clearDiscoverTVRating.dataset.discoverKey, 0);
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
async function renderUpNext() {
  const changed = await reconcileTVQueueStates();
  if (changed && els.libraryGroups) renderLibrary();

  const view = state.queueView === 'tbr' ? 'tbr' : 'upnext';
  const items = state.items
    .filter(item => getQueueStatus(item) === view)
    .sort((a,b) => queueSortKey(a, view).localeCompare(queueSortKey(b, view)));

  if (els.queueHeading) els.queueHeading.textContent = view === 'tbr' ? 'TBR' : 'Up Next';
  els.queueTabs?.forEach(tab => {
    const active = tab.dataset.queueTab === view;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  els.upNextList.innerHTML = '';
  els.upNextEmpty.hidden = items.length > 0;
  els.upNextEmpty.textContent = view === 'tbr'
    ? 'Save something for later from Discover or the + button.'
    : 'Add something to Up Next to start your queue.';

  for (const item of items) {
    const card = document.createElement('article');
    card.className = `upnext-card${view === 'tbr' ? ' tbr-card' : ' queue-loading'}`;
    card.dataset.id = item.id;

    if (view === 'tbr') {
      card.innerHTML = queueCardMarkup(item, {
        title: item.title,
        meta: tbrMeta(item),
        image: item.image || '',
        tbr: true
      });
      els.upNextList.appendChild(card);
      continue;
    }

    card.innerHTML = queueCardMarkup(item, { meta: 'Loading…', image: item.image || '', detailLabel: 'Open' });
    els.upNextList.appendChild(card);

    try {
      const info = await getUpNextInfo(item);
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
  }
}

function setQueueView(view) {
  state.queueView = view === 'tbr' ? 'tbr' : 'upnext';
  renderUpNext();
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
        <p class="upnext-category">${escapeHtml(getItemTypeLabel(item))}${isTBR ? ' · TBR' : ''}</p>
        ${info.error ? `<div class="queue-error">${escapeHtml(info.error)}</div>` : ''}
      </div>
      <button class="upnext-arrow" type="button" data-action="details" data-id="${item.id}" aria-label="Open details">→</button>
    </div>
    <div class="upnext-actions">${action}</div>
  `;
}

function tbrMeta(item) {
  const sourceType = getSourceType(item);
  if (sourceType === 'tv') return [item.subtitle, 'Not started'].filter(Boolean).join(' · ');
  if (sourceType === 'book') return [item.subtitle, 'To be read'].filter(Boolean).join(' · ');
  if (sourceType === 'youtube') return [item.subtitle, 'Playlist'].filter(Boolean).join(' · ');
  if (sourceType === 'reminder') return reminderScheduleLabel(item);
  return item.subtitle || 'Saved for later';
}

async function getUpNextInfo(item) {
  if (getSourceType(item) === 'tv') {
    await syncTVProgressToFirstUnwatched(item);
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
        setItemQueueStatus(item, 'upnext');
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
  return `1:${item.createdAt || ''}`;
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

function getNextReminderDueDate(item) {
  if (getSourceType(item) !== 'reminder') return '';
  const frequency = item.reminder?.frequency === 'daily' ? 'daily' : 'weekly';
  const weekday = Math.max(0, Math.min(6, Number(item.reminder?.weekday ?? 6)));
  const scheduleStart = item.reminder?.scheduleStart || localDateString(new Date(item.createdAt || Date.now()));
  const completed = state.history
    .filter(entry => entry.sourceItemId === item.id && entry.kind === 'reminder-completed')
    .sort((a,b) => String(a.date || '').localeCompare(String(b.date || '')));

  if (!completed.length) {
    if (frequency === 'daily') return scheduleStart <= todayString() ? scheduleStart : scheduleStart;
    return weekdayOnOrAfter(scheduleStart, weekday);
  }

  const latest = completed.at(-1);
  const anchor = latest.date && latest.date > (latest.scheduledDate || '') ? latest.date : (latest.scheduledDate || latest.date || todayString());
  if (frequency === 'daily') return addDaysToDateString(anchor, 1);
  return weekdayStrictlyAfter(anchor, weekday);
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

function parseLocalDateString(value) {
  const [year, month, day] = String(value || todayString()).split('-').map(Number);
  return new Date(year, Math.max(0, month - 1), Math.max(1, day), 12);
}

function reminderScheduleLabel(item) {
  if (item.reminder?.frequency === 'daily') return 'Every day';
  const weekday = Math.max(0, Math.min(6, Number(item.reminder?.weekday ?? 6)));
  return `Every ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][weekday]}`;
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
  let changed = false;
  const tvItems = state.items.filter(item => getSourceType(item) === 'tv' && item.providerId);
  for (const item of tvItems) {
    try {
      if (await reconcileSingleTVItem(item)) changed = true;
    } catch (error) {
      console.warn(`Could not refresh TV status for ${item.title}:`, error);
    }
  }
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
  return `<div class="detail-actions tv-watch-actions">${watchButtons}<button class="secondary-button${item.recommended ? ' is-recommended' : ''}" type="button" data-toggle-recommended="${item.id}">${item.recommended ? '★ Recommended' : '☆ Recommend'}</button><button class="secondary-button" type="button" data-edit-id="${item.id}">Edit</button></div>`;
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
      if (els.reminderFrequency) els.reminderFrequency.value = item.reminder?.frequency === 'daily' ? 'daily' : 'weekly';
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
  els.itemQueueStatus.value = ['upnext','tbr','library'].includes(defaultQueueStatus) ? defaultQueueStatus : 'library';
  els.nextSeason.value = 1;
  els.nextEpisode.value = 1;
  els.bookCurrentPage.value = 0;
  els.bookTotalPages.value = '';
  if (els.bookStartDate) els.bookStartDate.value = '';
  if (els.bookEndDate) els.bookEndDate.value = '';
  if (els.reminderFrequency) els.reminderFrequency.value = 'weekly';
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
  const isCatalogue = ['tv', 'book', 'movie', 'music'].includes(sourceType);
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
    music: 'Search albums'
  };
  els.catalogueQuery.placeholder = placeholders[sourceType] || 'Search title';
}

function updateReminderFormFields() {
  if (!els.reminderWeekdayField || !els.reminderFrequency) return;
  els.reminderWeekdayField.hidden = els.reminderFrequency.value === 'daily';
}

async function searchCatalogue() {
  const type = els.itemSourceType.value;
  const query = els.catalogueQuery.value.trim();
  if (!query) return;
  showFormMessage('Searching…', false);
  els.catalogueSearchButton.disabled = true;

  try {
    const results = await TrackerAPI.searchCatalogue(query, type, state.settings);
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
  const expectedProvider = sourceType === 'book' ? 'googleBooks' : sourceType === 'music' ? 'itunes' : 'tmdb';
  if (['tv','book','movie','music'].includes(sourceType) && (!providerId || provider !== expectedProvider)) {
    showFormMessage('Choose a search result first.', true);
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
    date: sourceType === 'reminder' ? '' : (els.itemDate.value || ''),
    queueStatus: sourceType === 'reminder' ? 'upnext' : (els.itemQueueStatus.value || 'library'),
    active: sourceType === 'reminder' || (els.itemQueueStatus.value || 'library') === 'upnext',
    createdAt: editing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: { ...(editing?.progress || {}) },
    ...(sourceType === 'tv' ? {
      watchDisposition: editing?.watchDisposition || ((els.itemQueueStatus.value || 'library') === 'tbr' ? 'watch-later' : 'following'),
      tvMeta: { ...(editing?.tvMeta || {}) }
    } : {})
  };

  if (sourceType === 'reminder') {
    item.reminder = {
      frequency: els.reminderFrequency?.value === 'daily' ? 'daily' : 'weekly',
      weekday: Math.max(0, Math.min(6, Number(els.reminderWeekday?.value ?? 6))),
      scheduleStart: editing?.reminder?.scheduleStart || todayString()
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
  const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
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
    <div class="detail-actions"><button class="primary-button" type="button" id="detailUpdatePages">Update pages & dates</button><button class="secondary-button" type="button" data-edit-id="${item.id}">Edit</button></div>
    <section class="detail-section"><h3>Reading dates</h3><div class="book-period-summary-list">${periodMarkup}</div></section>
    <section class="detail-section"><h3>Book info</h3><p>${escapeHtml([info.publisher, info.publishedDate, info.pageCount ? `${info.pageCount} pages` : ''].filter(Boolean).join(' · '))}</p></section>
  `;
  $('#detailUpdatePages')?.addEventListener('click', () => { els.detailModal.close(); openBookProgress(item); });
}

async function renderMovieDetails(item) {
  const details = await getCached(`movie:${item.providerId}`, () => TrackerAPI.getMovieDetails(item.providerId, state.settings));
  const detailGenres = (details.genres || []).map(genre => genre.name).filter(Boolean);
  if (detailGenres.length) item.genres = detailGenres;
  if (details.release_date) item.releaseDate = details.release_date;
  saveItems();
  els.detailBody.innerHTML = `
    ${detailHero({ type:'MOVIE', title:details.title || item.title, image:TrackerAPI.tmdbImage(details.poster_path) || item.image, subtitle:[details.release_date?.slice(0,4), details.runtime ? `${details.runtime} min` : '', details.genres?.map(g=>g.name).join(' · ')].filter(Boolean).join(' · '), overview:details.overview || '' })}
    ${detailEditButton(item)}
  `;
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
      <button class="primary-button" type="button" data-save-library-meta="${escapeAttr(item.id)}">Save rating & notes</button>
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
        label: getTypeLabel(type),
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
    const bookRanges = matches.filter(entry => entry.kind === 'book-reading-day');
    const groups = new Map();

    for (const entry of matches.filter(entry => entry.kind !== 'book-reading-day')) {
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
    body.className = 'week-day-events';

    if (!groups.size && !bookRanges.length) {
      body.innerHTML = '<span class="week-empty">Nothing tracked</span>';
    } else {
      for (const rangeEntry of bookRanges) {
        const rangeButton = document.createElement('button');
        rangeButton.type = 'button';
        rangeButton.className = `week-book-range week-book-range-${rangeEntry.rangePosition} ${bookRangeColorClass(rangeEntry)}`;
        rangeButton.dataset.bookRangeSource = rangeEntry.sourceItemId;
        rangeButton.style.setProperty('--book-lane', String(bookRangeLane(rangeEntry.sourceItemId)));
        rangeButton.innerHTML = `<span class="week-book-range-rail"></span><span class="week-book-range-copy"><strong>${escapeHtml(rangeEntry.title)}</strong><small>${escapeHtml(rangeEntry.rangePosition === 'start' || rangeEntry.rangePosition === 'single' ? 'Started reading' : rangeEntry.rangePosition === 'end' ? 'Finished / paused' : rangeEntry.rangePosition === 'open-end' ? 'Currently reading' : 'Reading')}</small></span><span class="week-entry-arrow">→</span>`;
        body.appendChild(rangeButton);
      }

      for (const [groupKey, typeEntries] of groups) {
        const first = typeEntries[0];
        const label = getCalendarTypeGroupLabel(first);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'week-entry sticker-group-button';
        button.dataset.groupKey = groupKey;
        button.dataset.date = date;

        const summary = typeEntries.length === 1
          ? [first.title, first.subtitle].filter(Boolean).join(' · ')
          : `${typeEntries[0].title}${typeEntries.length > 1 ? ` +${typeEntries.length - 1} more` : ''}`;

        button.innerHTML = `
          <span class="week-entry-sticker">${calendarStickerMarkup(first.type, first)}</span>
          <span class="week-entry-copy">
            <strong>${escapeHtml(label)}</strong>
            <small>${escapeHtml(shorten(summary, 62))}</small>
          </span>
          ${typeEntries.length > 1 ? `<span class="week-entry-count">${typeEntries.length}</span>` : '<span class="week-entry-arrow">→</span>'}`;
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
  const aria = escapeAttr(`${getTypeLabel(type)} sticker`);
  return `<span class="sticker ${shapeClass} ${paletteClass} ${tiltClass}" aria-label="${aria}">${text}</span>`;
}

function getStickerConfig(type, entry = {}) {
  const defaults = getDefaultStickerConfig(type, entry);
  const saved = state.stickerPrefs?.[type] || {};
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

function getCalendarTypeGroupLabel(entry) {
  return cleanTypeLabel(entry?.typeLabel || getTypeLabel(entry?.type)) || 'Other';
}

function getCalendarTypeGroupKey(entry) {
  return slugifyType(getCalendarTypeGroupLabel(entry));
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
const DISCOVER_MODES = new Set(['new', 'popular', 'for-you', 'discover']);
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
  if (!genre || result.sourceType === 'book') return discoverResultMatchesGenre(result);
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
  els.discoverFeed.innerHTML = '';
  if (els.discoverStatus) {
    els.discoverStatus.hidden = false;
    els.discoverStatus.textContent = `Searching for “${query}”…`;
  }
  if (els.discoverFeedMessage) els.discoverFeedMessage.textContent = 'Search results';

  try {
    const selectedType = state.discoverPrefs.contentType || 'all';
    const types = selectedType === 'all' ? ['tv', 'movie', 'book'] : [selectedType];
    const settled = await Promise.allSettled(types.map(type => {
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
  if (state.discoverMode === next && state.discoverFeedInitialized) return;
  state.discoverMode = next;
  updateDiscoverModeUI();
  resetDiscoverFeed(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadMoreDiscoverFeed();
}

function updateDiscoverModeUI() {
  const mode = DISCOVER_MODES.has(state.discoverMode) ? state.discoverMode : 'discover';
  const copy = {
    new: 'Recently released and newly published TV, movies, and books. Your streaming services are still prioritized where availability is known.',
    popular: 'What is popular now across TV, movies, and books, with titles on your streaming services moved toward the front.',
    'for-you': 'Recommendations based on what you have watched, finished, rated, and the authors you return to.',
    discover: 'A shuffled, effectively endless mix of TV, movies, and books. Your tastes influence the ranking, but each session deliberately changes.'
  };
  els.discoverModeTabs?.forEach(tab => {
    const active = tab.dataset.discoverMode === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  if (els.discoverFeedIntroText) els.discoverFeedIntroText.textContent = copy[mode];
  if (els.discoverTypeFilter) els.discoverTypeFilter.value = state.discoverPrefs.contentType || 'all';
  if (els.discoverGenreFilter) els.discoverGenreFilter.value = state.discoverPrefs.genre || 'all';
  if (els.refreshDiscover) els.refreshDiscover.textContent = mode === 'discover' ? 'Shuffle' : 'Refresh';
}

async function renderDiscover(force = false) {
  if (!els.discoverStatus) return;
  await ensureDiscoverGenreCatalog();
  updateDiscoverModeUI();
  if (state.discoverSearchQuery) return runDiscoverSearch(state.discoverSearchQuery);

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
  if (state.discoverMode === 'new') return collectNewDiscoverCandidates(batchNumber);
  if (state.discoverMode === 'popular') return collectPopularDiscoverCandidates(batchNumber);
  if (state.discoverMode === 'for-you') return collectForYouDiscoverCandidates(batchNumber);
  return collectShuffledDiscoverCandidates(batchNumber);
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

async function collectNewDiscoverCandidates(batchNumber) {
  const selectedProviders = (state.discoverPrefs.streamingProviderIds || []).map(String).filter(Boolean);
  const today = todayString();
  const tvPage = Math.min(500, batchNumber);
  const moviePage = Math.min(500, batchNumber);
  const bookStart = (batchNumber - 1) * DISCOVER_BOOK_BATCH_SIZE;
  const tasks = [
    TrackerAPI.getTMDBDiscover('tv', tvPage, state.settings, discoverTMDBOptions('tv', { sortBy: 'first_air_date.desc', minVotes: 5, beforeDate: today })),
    TrackerAPI.getTMDBDiscover('movie', moviePage, state.settings, discoverTMDBOptions('movie', { sortBy: 'primary_release_date.desc', minVotes: 10, beforeDate: today })),
    TrackerAPI.getBookFeed(bookStart, state.settings, discoverBookOptions({ query: 'subject:fiction', orderBy: 'newest', maxResults: DISCOVER_BOOK_BATCH_SIZE }))
  ];
  if (selectedProviders.length) {
    tasks.push(TrackerAPI.getTMDBDiscover('tv', tvPage, state.settings, discoverTMDBOptions('tv', { sortBy: 'first_air_date.desc', minVotes: 3, beforeDate: today, providerIds: selectedProviders })));
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
  return dedupeDiscoverCandidatesByBoost(candidates);
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
      const seed = pickDiscoverSeed(sourceType);
      if (!seed?.providerId || used.has(String(seed.providerId))) continue;
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
  if (state.discoverMode === 'discover') return 'Keep scrolling — the mix keeps changing as more loads.';
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

function pickDiscoverSeed(type) {
  const pool = state.items
    .filter(item => getSourceType(item) === type && item.providerId)
    .filter(item => {
      if (type === 'tv') return item.completedAt || Number(item.progress?.nextSeason || 1) > 1 || Number(item.progress?.nextEpisode || 1) > 1 || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'episode-watched');
      if (type === 'book') return item.completedAt || Number(item.progress?.currentPage || 0) > 0;
      if (type === 'movie') return item.completedAt || item.date || state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'movie-watched');
      return false;
    });
  if (!pool.length) return null;
  const recent = [...pool]
    .sort((a,b) => String(b.updatedAt || b.completedAt || '').localeCompare(String(a.updatedAt || a.completedAt || '')))
    .slice(0, 12);

  // Higher-rated things are more likely to become recommendation seeds, but
  // recency still matters because only the recent slice enters this lottery.
  const weighted = recent.map(item => {
    const rating = Number(item.rating || 0);
    const weight = rating > 0 ? Math.max(.5, rating * rating) : 4;
    return { item, weight };
  });
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return weighted.at(-1)?.item || null;
}

async function rankDiscoverFeedCandidates(results, batchSize) {
  const readAuthors = getReadAuthors();
  const authorSet = new Set(readAuthors.map(author => author.toLowerCase()));
  const mode = state.discoverMode || 'discover';
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

    if (mode === 'popular') {
      const popularity = Number(result.raw?.popularity || 0);
      score += Math.log1p(popularity) * 1.8;
    }
    if (mode === 'new') {
      const rawDate = result.sourceType === 'book' ? result.publishedDate : (result.raw?.first_air_date || result.raw?.release_date || '');
      const time = Date.parse(rawDate || '');
      if (Number.isFinite(time)) score += Math.max(0, 8 - ((Date.now() - time) / 86400000) / 60);
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

async function openDiscoverSettings() {
  if (!els.discoverSettingsModal) return;
  els.prioritizeAuthors.checked = state.discoverPrefs.prioritizeAuthors !== false;
  if (els.englishTVOnly) els.englishTVOnly.checked = state.discoverPrefs.englishTVOnly === true;
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
  state.discoverPrefs = {
    streamingProviderIds: selectedEntries.map(([id]) => id),
    streamingProviderNames: selectedEntries.map(([, name]) => name),
    prioritizeAuthors: els.prioritizeAuthors.checked,
    englishTVOnly: Boolean(els.englishTVOnly?.checked),
    contentType: state.discoverPrefs.contentType || 'all'
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
    : String(result.subtitle || '').slice(0, 4);
  const rating = result.rating ? `★ ${Number(result.rating).toFixed(1)}` : '';
  const providers = (result.streamingProviderNames || result.preferredProviderNames || []).slice(0, 2);
  const streaming = providers.length ? providers.join(' + ') : (['tv','movie'].includes(type) ? 'Streaming varies' : '');
  const meta = [year, rating, streaming].filter(Boolean).join(' · ');
  const queueStatus = item ? getQueueStatus(item) : '';
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
      <div class="discover-card-actions">
        <button class="discover-complete-button${completed ? ' is-complete' : ''}" type="button" data-discover-complete="${escapeAttr(key)}" ${completed && type !== 'tv' ? 'disabled' : ''} aria-label="${type === 'tv' ? 'Choose watched seasons or episodes' : completed ? 'Already completed' : 'Mark completed'}" title="${type === 'tv' ? 'Choose watched seasons / episodes' : completed ? 'Completed' : 'Mark watched / read'}">✓</button>
        <button class="discover-add-button" type="button" data-discover-add="${escapeAttr(key)}">${escapeHtml(plusLabel)}</button>
      </div>
    </div>
  </article>`;
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
    } else {
      await markDiscoverCompleted(key);
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
  const status = button.dataset.discoverQueueChoice === 'tbr' ? 'tbr' : 'upnext';
  addDiscoverToQueue(state.pendingDiscoverKey, status);
  els.discoverQueueModal.close();
  state.pendingDiscoverKey = null;
  await renderDiscover();
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
    provider: result.provider || (sourceType === 'book' ? 'googleBooks' : 'tmdb'),
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
    date: '',
    queueStatus,
    active: queueStatus === 'upnext',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: {}
  };

  if (sourceType === 'tv') item.progress = { nextSeason: 1, nextEpisode: 1 };
  if (sourceType === 'book') item.progress = { currentPage: 0, totalPages: Number(result.pageCount || 0) };
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

async function markDiscoverCompleted(key) {
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
  if (els.detailModal?.open && state.openDiscoverKey === key) await openDiscoverDetail(key);
}

async function openDiscoverDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  state.openDiscoverKey = key;
  els.detailModal.showModal();
  els.detailBody.innerHTML = '<p class="loading-detail">Loading details…</p>';
  try {
    if (result.sourceType === 'tv') await renderDiscoverTVDetail(key);
    else if (result.sourceType === 'movie') await renderDiscoverMovieDetail(key);
    else if (result.sourceType === 'book') await renderDiscoverBookDetail(key);
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
  if (!item) return '';
  const rating = Math.max(0, Math.min(5, Number(item.rating || 0)));
  return `<section class="detail-section discover-personal-meta" data-discover-tv-meta="${escapeAttr(key)}" data-pending-rating="${rating}">
    <div class="detail-section-heading">
      <div>
        <h3>Your rating & notes</h3>
        <p class="discover-history-note">Saved to this item in your Library.</p>
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
      <textarea class="discover-tv-notes" rows="3" placeholder="Anything you want to remember">${escapeHtml(item.notes || '')}</textarea>
    </label>
    <div class="detail-actions compact-actions">
      <button class="primary-button" type="button" data-save-discover-tv-meta="${escapeAttr(key)}">Save rating & notes</button>
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

function saveDiscoverTVPersonalMetadata(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');
  const section = els.detailBody?.querySelector(`[data-discover-tv-meta="${CSS.escape(key)}"]`);
  if (!section) return;
  item.rating = Math.max(0, Math.min(5, Number(section.dataset.pendingRating || 0)));
  item.notes = section.querySelector('.discover-tv-notes')?.value.trim() || '';
  item.updatedAt = new Date().toISOString();

  for (const entry of state.history) {
    if (entry.sourceItemId !== item.id) continue;
    if (['series-watched', 'movie-watched', 'book-finished', 'item-completed'].includes(entry.kind)) {
      entry.rating = item.rating;
      entry.notes = item.notes;
    }
  }

  saveItems();
  saveHistory();
  const status = section.querySelector('.discover-tv-meta-status');
  if (status) {
    status.textContent = 'Saved';
    setTimeout(() => { if (status.isConnected) status.textContent = ''; }, 1600);
  }
  renderLibrary();
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
      <button class="secondary-button" type="button" data-discover-mark-all-tv="${escapeAttr(key)}">${seriesCompleted ? '✓ Clear watched series' : '✓ Mark all watched'}</button>
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
      <button class="secondary-button" type="button" data-discover-detail-complete="${escapeAttr(key)}" ${completed ? 'disabled' : ''}>${completed ? '✓ Watched' : '✓ Mark watched'}</button>
    </div>
    ${discoverTVPersonalMetadataMarkup(findDiscoverItem(result), key)}
    <section class="detail-section streaming-detail"><h3>Streaming</h3><p>${escapeHtml(providerText)}</p>${availability.link ? `<a href="${escapeAttr(availability.link)}" target="_blank" rel="noopener">See availability ↗</a>` : ''}</section>
    ${details.genres?.length ? `<section class="detail-section"><h3>Genres</h3><p>${escapeHtml(details.genres.map(genre => genre.name).join(' · '))}</p></section>` : ''}`;
}

async function renderDiscoverBookDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const data = await getCached(`book:${result.providerId}`, () => TrackerAPI.getBookDetails(result.providerId, state.settings));
  const info = data.volumeInfo || {};
  if (info.categories?.length) item.genres = [...new Set(info.categories)];
  if (info.publishedDate) item.releaseDate = info.publishedDate;
  saveItems();
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
      <button class="secondary-button" type="button" data-discover-detail-complete="${escapeAttr(key)}" ${completed ? 'disabled' : ''}>${completed ? '✓ Read' : '✓ Mark read'}</button>
    </div>
    ${discoverTVPersonalMetadataMarkup(findDiscoverItem(result), key)}
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

function renderStickerSettingsRows() {
  const types = getRecognizedTypes();
  els.stickerSettingsRows.innerHTML = '';

  for (const { type, label } of types) {
    const config = getStickerConfig(type, state.history.find(entry => entry.type === type) || {});
    const row = document.createElement('div');
    row.className = 'sticker-setting-row';
    row.dataset.stickerType = type;
    row.innerHTML = `
      <strong class="sticker-setting-type">${escapeHtml(label)}</strong>
      <div class="sticker-setting-preview">${calendarStickerMarkup(type, state.history.find(entry => entry.type === type) || {})}</div>
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
  const defaults = getDefaultStickerConfig(row.dataset.stickerType, state.history.find(entry => entry.type === row.dataset.stickerType) || {});
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
    const type = row.dataset.stickerType;
    const shape = row.querySelector('[data-sticker-field="shape"]')?.value || 'square';
    const color = row.querySelector('[data-sticker-field="color"]')?.value || 'cream';
    const label = ['star','heart'].includes(shape) ? '' : cleanStickerLabel(row.querySelector('[data-sticker-field="label"]')?.value ?? '');
    next[type] = { shape, color, label };
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
  return [...(editing?.genres || [])];
}

function extractItemReleaseDate(sourceType, source, editing) {
  if (sourceType === 'book') return source?.publishedDate || source?.raw?.volumeInfo?.publishedDate || editing?.releaseDate || '';
  if (sourceType === 'tv') return source?.raw?.first_air_date || editing?.releaseDate || '';
  if (sourceType === 'movie') return source?.raw?.release_date || editing?.releaseDate || '';
  if (sourceType === 'music') return source?.raw?.releaseDate || editing?.releaseDate || '';
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
  return datedHistory || item.completedAt || item.date || item.updatedAt || item.createdAt || '';
}

function normalizeGenre(value) {
  return String(value || '').trim().toLowerCase();
}

function refreshLibraryGenreFilter() {
  if (!els.libraryGenreFilter) return;
  const current = els.libraryGenreFilter.value || 'all';
  const type = els.typeFilter?.value || 'all';
  const genres = new Map();
  state.items
    .filter(item => getQueueStatus(item) !== 'tbr')
    .filter(item => type === 'all' || libraryTypeGroupKey(item) === type)
    .forEach(item => (item.genres || []).forEach(genre => {
      const key = normalizeGenre(genre);
      if (key && !genres.has(key)) genres.set(key, genre);
    }));

  els.libraryGenreFilter.innerHTML = '<option value="all">All genres</option>';
  [...genres.entries()].sort((a,b) => a[1].localeCompare(b[1])).forEach(([key,label]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = label;
    els.libraryGenreFilter.appendChild(option);
  });
  els.libraryGenreFilter.value = genres.has(current) || current === 'all' ? current : 'all';
}

function renderLibrary() {
  refreshTypeFilter();
  refreshLibraryGenreFilter();
  const filter = els.typeFilter?.value || 'all';
  const genre = els.libraryGenreFilter?.value || 'all';
  const sort = els.librarySort?.value || 'date';

  let filtered = state.items
    .filter(item => getQueueStatus(item) !== 'tbr')
    .filter(item => state.libraryView !== 'recommended' || item.recommended)
    .filter(item => filter === 'all' || libraryTypeGroupKey(item) === filter)
    .filter(item => genre === 'all' || (item.genres || []).some(value => normalizeGenre(value) === genre));

  const compare = sort === 'rating'
    ? (a,b) => Number(b.rating || 0) - Number(a.rating || 0) || String(itemLibraryDate(b)).localeCompare(String(itemLibraryDate(a))) || a.title.localeCompare(b.title)
    : sort === 'title'
      ? (a,b) => a.title.localeCompare(b.title)
      : (a,b) => String(itemLibraryDate(b)).localeCompare(String(itemLibraryDate(a))) || Number(b.rating || 0) - Number(a.rating || 0) || a.title.localeCompare(b.title);

  // Library grouping is based on the visible type name, not the content/API source.
  // A YouTube item labelled "Workout" and a manual item labelled "Workout" therefore
  // share one shelf while retaining their separate sourceType/provider internally.
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
        <button class="library-expand-button" type="button" data-library-expand="${escapeAttr(groupKey)}">${expanded ? 'Collapse' : `Show all`}</button>
      </div>
      <div class="library-poster-grid${expanded ? ' is-expanded' : ''}"></div>`;
    const grid = section.querySelector('.library-poster-grid');

    for (const item of items) {
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
      grid.appendChild(poster);
    }
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
  if (['tv', 'movie', 'book', 'music'].includes(item.type)) return item.type;
  return 'other';
}

function getQueueStatus(item) {
  if (!item) return 'library';
  if (['upnext', 'tbr', 'library'].includes(item.queueStatus)) return item.queueStatus;
  if (item.active !== false && ['tv', 'youtube', 'book', 'reminder'].includes(getSourceType(item))) return 'upnext';
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

function refreshTypeFilter() {
  if (!els.typeFilter) return;
  const current = els.typeFilter.value || 'all';
  const groups = new Map();

  // Keep the familiar built-in options, but de-duplicate by visible label.
  for (const label of Object.values(TYPE_LABELS)) {
    const key = slugifyType(label);
    if (!groups.has(key)) groups.set(key, label);
  }

  for (const item of state.items.filter(item => getQueueStatus(item) !== 'tbr')) {
    const key = libraryTypeGroupKey(item);
    const existing = groups.get(key);
    if (!existing) groups.set(key, getItemTypeLabel(item));
  }

  const preferred = ['tv','movie','book','music','workout','other'];
  const ordered = [...groups.entries()].sort(([aKey,aLabel],[bKey,bLabel]) => {
    const ai = preferred.indexOf(aKey);
    const bi = preferred.indexOf(bKey);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return aLabel.localeCompare(bLabel);
  });

  els.typeFilter.innerHTML = '<option value="all">All</option>';
  for (const [key, label] of ordered) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = label;
    els.typeFilter.appendChild(option);
  }
  els.typeFilter.value = groups.has(current) || current === 'all' ? current : 'all';
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
    streakPrefs: state.streakPrefs
  };
}

function hasMeaningfulLocalState(snapshot = buildCloudState()) {
  return Boolean(
    snapshot.items?.length ||
    snapshot.history?.length ||
    snapshot.customTypes?.length ||
    Object.keys(snapshot.stickerPrefs || {}).length ||
    Object.keys(snapshot.streakPrefs || {}).length ||
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

  safeLocalSet(ITEMS_KEY, state.items);
  safeLocalSet(CUSTOM_TYPES_KEY, state.customTypes);
  safeLocalSet(DISCOVER_PREFS_KEY, state.discoverPrefs);
  safeLocalSet(STICKER_PREFS_KEY, state.stickerPrefs);
  safeLocalSet(STREAK_PREFS_KEY, state.streakPrefs);
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
  state.history.push({
    id: makeId(),
    createdAt: new Date().toISOString(),
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
