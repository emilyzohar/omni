import { TrackerAPI } from './api.js';
import { API_CONFIG } from './config.js';

const ITEMS_KEY = 'zoharTracker.items.v4';
const CACHE_KEY = 'zoharTracker.apiCache.v1';
const CUSTOM_TYPES_KEY = 'zoharTracker.customTypes.v1';
const HISTORY_KEY = 'zoharTracker.history.v1';
const DISCOVER_PREFS_KEY = 'zoharTracker.discoverPrefs.v1';
const STICKER_PREFS_KEY = 'zoharTracker.stickerPrefs.v1';
const ATTACHMENT_DB_NAME = 'zoharTracker.attachments.v1';
const ATTACHMENT_STORE_NAME = 'files';
const CACHE_TTL = 60 * 60 * 1000;
const mobileCalendarQuery = window.matchMedia('(max-width: 620px)');

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
const STICKER_COLORS = ['rust', 'yellow', 'cream', 'lavender', 'navy', 'green', 'pink'];

const state = {
  items: loadJSON(ITEMS_KEY, []),
  settings: API_CONFIG,
  cache: loadJSON(CACHE_KEY, {}),
  customTypes: loadJSON(CUSTOM_TYPES_KEY, []),
  history: loadJSON(HISTORY_KEY, []),
  discoverPrefs: loadJSON(DISCOVER_PREFS_KEY, { streamingProviderIds: [], streamingProviderNames: [], prioritizeAuthors: true }),
  stickerPrefs: loadJSON(STICKER_PREFS_KEY, {}),
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
  openDiscoverKey: null
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const els = {
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
  monthPicker: $('#monthPicker'),
  monthLabel: $('#monthLabel'),
  trackerGrid: $('#trackerGrid'),
  weekControls: $('#weekControls'),
  previousWeek: $('#previousWeek'),
  currentWeek: $('#currentWeek'),
  nextWeek: $('#nextWeek'),
  typeFilter: $('#typeFilter'),
  libraryGroups: $('#libraryGroups'),
  libraryEmpty: $('#libraryEmpty'),
  refreshDiscover: $('#refreshDiscover'),
  discoverStatus: $('#discoverStatus'),
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
  clearStreamingProviders: $('#clearStreamingProviders'),
  itemModal: $('#itemModal'),
  detailModal: $('#detailModal'),
  detailBody: $('#detailBody'),
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
  playlistInput: $('#playlistInput'),
  playlistLoadButton: $('#playlistLoadButton'),
  playlistPreview: $('#playlistPreview'),
  manualTitleBlock: $('#manualTitleBlock'),
  manualTitle: $('#manualTitle'),
  tvProgressFields: $('#tvProgressFields'),
  nextSeason: $('#nextSeason'),
  nextEpisode: $('#nextEpisode'),
  bookProgressFields: $('#bookProgressFields'),
  bookCurrentPage: $('#bookCurrentPage'),
  bookTotalPages: $('#bookTotalPages'),
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
  progressTotalPages: $('#progressTotalPages')
};

init();

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
  els.itemForm?.addEventListener('submit', saveItemFromForm);
  els.deleteItem?.addEventListener('click', deleteEditingItem);
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
  els.typeFilter?.addEventListener('change', renderLibrary);
  els.upNextList?.addEventListener('click', handleUpNextClick);
  els.trackerGrid?.addEventListener('click', handleTrackerClick);
  els.libraryGroups?.addEventListener('click', handleLibraryClick);
  els.refreshDiscover?.addEventListener('click', () => renderDiscover(true));
  els.openDiscoverSettings?.addEventListener('click', openDiscoverSettings);
  els.discoverSettingsForm?.addEventListener('submit', saveDiscoverSettings);
  els.streamingProviderSearch?.addEventListener('input', () => renderStreamingProviderOptions(els.streamingProviderSearch.value));
  els.streamingProviderOptions?.addEventListener('change', handleStreamingProviderToggle);
  els.clearStreamingProviders?.addEventListener('click', clearStreamingProviderSelection);
  document.querySelector('#discover')?.addEventListener('click', handleDiscoverClick);
  els.discoverQueueModal?.addEventListener('click', handleDiscoverQueueChoice);
  els.bookProgressForm?.addEventListener('submit', saveBookProgress);

  document.addEventListener('click', async event => {
    const close = event.target.closest('[data-close]');
    if (close) document.getElementById(close.dataset.close)?.close();

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
      if (item) await logSpecificTVEpisode(item, Number(tvEpisodeCheck.dataset.tvSeasonNumber), Number(tvEpisodeCheck.dataset.checkTvEpisode));
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
  if (els.libraryGroups) renderLibrary();
  if (els.discoverStatus) renderDiscover();
}

// ---------------------------
// UP NEXT
// ---------------------------
async function renderUpNext() {
  const view = state.queueView === 'tbr' ? 'tbr' : 'upnext';
  const items = state.items
    .filter(item => getQueueStatus(item) === view)
    .sort((a,b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

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
      else completed = genericCompletionRecord(item, true);
      if (completed) addHistoryRecord(completed);
      if (!['tv','youtube'].includes(getSourceType(item))) {
        item.completedAt = todayString();
        setItemQueueStatus(item, 'library');
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
    notes: episode.overview || '',
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

async function findNextUnwatchedTVEpisode(item, afterSeason, afterEpisode) {
  const show = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
  const seasons = (show.seasons || [])
    .filter(season => season.season_number > 0 && season.episode_count > 0)
    .sort((a,b) => a.season_number - b.season_number);

  for (const seasonInfo of seasons) {
    if (seasonInfo.season_number < afterSeason) continue;
    const season = await getCached(`season:${item.providerId}:${seasonInfo.season_number}`, () => TrackerAPI.getTVSeason(item.providerId, seasonInfo.season_number, state.settings));
    const episodes = (season.episodes || []).filter(ep => ep.episode_number > 0).sort((a,b) => a.episode_number - b.episode_number);
    for (const episode of episodes) {
      if (seasonInfo.season_number === afterSeason && episode.episode_number <= afterEpisode) continue;
      if (!isTVEpisodeLogged(item, seasonInfo.season_number, episode.episode_number)) {
        return { seasonNumber: seasonInfo.season_number, episodeNumber: episode.episode_number };
      }
    }
  }
  return null;
}

async function syncTVProgressToFirstUnwatched(item) {
  const currentSeason = Number(item.progress?.nextSeason || 1);
  const currentEpisode = Number(item.progress?.nextEpisode || 1);
  if (!isTVEpisodeLogged(item, currentSeason, currentEpisode)) return;
  const next = await findNextUnwatchedTVEpisode(item, currentSeason, currentEpisode);
  if (next) {
    item.progress = { ...item.progress, nextSeason: next.seasonNumber, nextEpisode: next.episodeNumber };
  } else {
    setItemQueueStatus(item, 'library');
    item.completedAt = item.completedAt || todayString();
  }
  saveItems();
}

async function logSpecificTVEpisode(item, seasonNumber, episodeNumber) {
  if (isTVEpisodeLogged(item, seasonNumber, episodeNumber)) return;

  const currentSeason = Number(item.progress?.nextSeason || 1);
  const currentEpisode = Number(item.progress?.nextEpisode || 1);
  let record;

  if (seasonNumber === currentSeason && episodeNumber === currentEpisode) {
    record = await advanceTV(item);
  } else {
    const episode = await getTVEpisodeFromSeason(item, seasonNumber, episodeNumber);
    if (!episode) throw new Error(`Could not find S${seasonNumber} E${episodeNumber}.`);
    record = tvHistoryRecord(item, episode, seasonNumber, episodeNumber);
  }

  addHistoryRecord(record);
  saveItems();
  saveHistory();
  renderAll();
  await renderTVSeasonDetail(item, seasonNumber);
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
    if (sourceType === 'youtube' || sourceType === 'other') els.itemDisplayType.value = getItemTypeLabel(item);
    els.provider.value = item.provider || 'manual';
    els.providerId.value = item.providerId || '';
    els.providerImage.value = item.image || '';
    els.providerSubtitle.value = item.subtitle || '';
    els.manualTitle.value = item.title || '';
    els.itemNote.value = item.notes || '';
    els.itemDate.value = item.date || '';
    els.itemQueueStatus.value = getQueueStatus(item);
    setRating(Number(item.rating || 0));

    if (sourceType === 'tv') {
      els.nextSeason.value = item.progress?.nextSeason || 1;
      els.nextEpisode.value = item.progress?.nextEpisode || 1;
    }
    if (sourceType === 'book') {
      els.bookCurrentPage.value = item.progress?.currentPage || 0;
      els.bookTotalPages.value = item.progress?.totalPages || '';
    }
    if (sourceType === 'youtube') {
      els.playlistInput.value = item.providerId || '';
      state.loadedPlaylist = null;
      showSelectedSource({ title: item.title, subtitle: item.subtitle, image: item.image }, true);
    } else if (item.provider && item.provider !== 'manual') {
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
  els.provider.value = '';
  els.providerId.value = '';
  els.providerImage.value = '';
  els.providerSubtitle.value = '';
  els.itemModalEyebrow.textContent = 'ADD';
  els.itemModalTitle.textContent = 'Add something';
  els.deleteItem.hidden = true;
  els.searchResults.hidden = true;
  els.searchResults.innerHTML = '';
  els.selectedSource.hidden = true;
  els.playlistPreview.hidden = true;
  els.formMessage.hidden = true;
  state.selectedSource = null;
  state.loadedPlaylist = null;
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
  const isManual = sourceType === 'other';

  els.catalogueSearchBlock.hidden = !isCatalogue;
  els.workoutBlock.hidden = !isYouTube;
  els.displayTypeBlock.hidden = !(isYouTube || isManual);
  els.manualTitleBlock.hidden = false;
  els.tvProgressFields.hidden = sourceType !== 'tv';
  els.bookProgressFields.hidden = sourceType !== 'book';
  if (els.queueStatusField) els.queueStatusField.hidden = false;

  if (isYouTube) {
    els.displayTypeLabel.textContent = 'Display as';
    els.displayTypeHint.textContent = 'Name this kind of YouTube content. For example: Workout, Pilates, Yoga, Tutorials.';
    if (!els.itemDisplayType.value.trim()) els.itemDisplayType.value = 'Workout';
  } else if (isManual) {
    els.displayTypeLabel.textContent = 'New type name';
    els.displayTypeHint.textContent = 'This creates a reusable type for the tracker and library.';
    if (!els.editingId.value) els.itemDisplayType.value = '';
  }

  if (!els.editingId.value) {
    state.selectedSource = null;
    state.loadedPlaylist = null;
    els.provider.value = isYouTube ? 'youtube' : isManual ? 'manual' : '';
    els.providerId.value = '';
    els.providerImage.value = '';
    els.providerSubtitle.value = '';
    els.searchResults.hidden = true;
    els.selectedSource.hidden = true;
    els.playlistPreview.hidden = true;
  }

  const placeholders = {
    tv: 'Search TV shows',
    movie: 'Search movies',
    book: 'Search books',
    music: 'Search albums'
  };
  els.catalogueQuery.placeholder = placeholders[sourceType] || 'Search title';
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
    attachments: attachmentFiles,
    links: state.attachmentDraft.links.map(link => ({ ...link })),
    date: els.itemDate.value || '',
    queueStatus: els.itemQueueStatus.value || 'library',
    active: (els.itemQueueStatus.value || 'library') === 'upnext',
    createdAt: editing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: { ...(editing?.progress || {}) }
  };

  if (sourceType === 'tv') {
    item.progress.nextSeason = Math.max(1, Number(els.nextSeason.value || 1));
    item.progress.nextEpisode = Math.max(1, Number(els.nextEpisode.value || 1));
  }
  if (sourceType === 'book') {
    item.progress.currentPage = Math.max(0, Number(els.bookCurrentPage.value || 0));
    item.progress.totalPages = Math.max(0, Number(els.bookTotalPages.value || 0));
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
    else renderManualDetails(item);
    appendItemResources(item);
  } catch (error) {
    els.detailBody.innerHTML = `${basicDetailHero(item)}<div class="api-error">${escapeHtml(error.message)}</div>${detailEditButton(item)}`;
    appendItemResources(item);
  }
}

async function renderTVDetails(item) {
  const details = await getCached(`tv:${item.providerId}`, () => TrackerAPI.getTVDetails(item.providerId, state.settings));
  const seasonNumber = Number(item.progress?.nextSeason || 1);
  const episodeNumber = Number(item.progress?.nextEpisode || 1);
  const season = await getCached(`season:${item.providerId}:${seasonNumber}`, () => TrackerAPI.getTVSeason(item.providerId, seasonNumber, state.settings));
  const next = (season.episodes || []).find(ep => ep.episode_number === episodeNumber);

  const seasons = (details.seasons || [])
    .filter(season => season.season_number > 0)
    .map(season => `
      <div class="season-row">
        <div>
          <div class="list-title">Season ${season.season_number}</div>
          <div class="list-meta">${season.episode_count || 0} episodes${season.air_date ? ` · ${escapeHtml(season.air_date.slice(0,4))}` : ''}</div>
        </div>
        <button class="detail-arrow-button" type="button" data-tv-season="${season.season_number}" data-item-id="${item.id}" aria-label="Open season ${season.season_number}">→</button>
      </div>`)
    .join('');

  const episodes = (season.episodes || []).map(ep => {
    const isPast = ep.episode_number < episodeNumber;
    const isLogged = isTVEpisodeLogged(item, seasonNumber, ep.episode_number);
    const image = TrackerAPI.tmdbImage(ep.still_path);
    return `<div class="episode-row">
      ${image ? `<img src="${escapeAttr(image)}" alt="" />` : '<div class="episode-image-placeholder"></div>'}
      <div><div class="list-title">E${ep.episode_number} · ${escapeHtml(ep.name || 'Episode')}</div><div class="list-meta">${escapeHtml(shorten(ep.overview || '', 120))}</div></div>
      <div class="episode-row-actions">
        <span class="watched-label">${isLogged || isPast ? 'WATCHED' : ep.episode_number === episodeNumber ? 'NEXT' : ''}</span>
        <button class="episode-check-button${isLogged ? ' is-checked' : ''}" type="button" data-check-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}" ${isLogged ? 'disabled' : ''} aria-label="${isLogged ? 'Episode logged' : `Mark episode ${ep.episode_number} watched`}">✓</button>
        <button class="detail-arrow-button" type="button" data-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}" aria-label="Open episode ${ep.episode_number}">→</button>
      </div>
    </div>`;
  }).join('');

  els.detailBody.innerHTML = `
    ${detailHero({ type:'TV', title:details.name || item.title, image:TrackerAPI.tmdbImage(details.poster_path) || item.image, subtitle:[details.first_air_date?.slice(0,4), details.genres?.map(g=>g.name).join(' · ')].filter(Boolean).join(' · '), overview:details.overview || '' })}
    <div class="detail-progress"><strong>Up next</strong>${next ? `S${seasonNumber} E${episodeNumber} · ${escapeHtml(next.name || 'Episode')}` : `S${seasonNumber} E${episodeNumber}`}</div>
    ${detailEditButton(item)}
    <section class="detail-section"><h3>Seasons</h3><div class="season-list season-list-rows">${seasons || '—'}</div></section>
    <section class="detail-section"><h3>Season ${seasonNumber}</h3><div class="episode-list">${episodes || 'No episodes found.'}</div></section>
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
      const watched = seasonNumber < nextSeason || (seasonNumber === nextSeason && ep.episode_number < nextEpisode);
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
          <span class="watched-label">${isLogged || watched ? 'WATCHED' : isNext ? 'NEXT' : ''}</span>
          <button class="episode-check-button${isLogged ? ' is-checked' : ''}" type="button" data-check-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}" ${isLogged ? 'disabled' : ''} aria-label="${isLogged ? 'Episode logged' : `Mark episode ${ep.episode_number} watched`}">✓</button>
          <button class="detail-arrow-button" type="button" data-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}" aria-label="Open episode ${ep.episode_number}">→</button>
        </div>
      </div>`;
    }).join('');

    els.detailBody.innerHTML = `
      <button class="detail-back-button" type="button" data-tv-series="true" data-item-id="${item.id}">← Series</button>
      ${detailHero({
        type: `TV · SEASON ${seasonNumber}`,
        title: season.name || `${series.name || item.title} · Season ${seasonNumber}`,
        image,
        subtitle: [season.air_date?.slice(0,4), `${(season.episodes || []).length} episodes`].filter(Boolean).join(' · '),
        overview: season.overview || series.overview || ''
      })}
      <section class="detail-section"><h3>Episodes</h3><div class="episode-list">${episodes || 'No episodes found.'}</div></section>
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
        <button class="primary-button" type="button" data-check-tv-episode="${episodeNumber}" data-tv-season-number="${seasonNumber}" data-item-id="${item.id}" ${isTVEpisodeLogged(item, seasonNumber, episodeNumber) ? 'disabled' : ''}>${isTVEpisodeLogged(item, seasonNumber, episodeNumber) ? '✓ Logged' : '✓ Mark watched'}</button>
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
  const image = info.imageLinks?.large?.replace('http://','https://') || info.imageLinks?.thumbnail?.replace('http://','https://') || item.image;
  const current = Number(item.progress?.currentPage || 0);
  const total = Number(item.progress?.totalPages || info.pageCount || 0);

  els.detailBody.innerHTML = `
    ${detailHero({ type:'BOOK', title:info.title || item.title, image, subtitle:(info.authors || []).join(', '), overview:stripHtml(info.description || '') })}
    <div class="detail-progress"><strong>Reading progress</strong>${total ? `Page ${current} of ${total} · ${Math.min(100, Math.round(current/total*100))}%` : `Page ${current}`}</div>
    <div class="detail-actions"><button class="primary-button" type="button" id="detailUpdatePages">Update pages</button><button class="secondary-button" type="button" data-edit-id="${item.id}">Edit</button></div>
    <section class="detail-section"><h3>Book info</h3><p>${escapeHtml([info.publisher, info.publishedDate, info.pageCount ? `${info.pageCount} pages` : ''].filter(Boolean).join(' · '))}</p></section>
  `;
  $('#detailUpdatePages')?.addEventListener('click', () => { els.detailModal.close(); openBookProgress(item); });
}

async function renderMovieDetails(item) {
  const details = await getCached(`movie:${item.providerId}`, () => TrackerAPI.getMovieDetails(item.providerId, state.settings));
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
  return `<div class="detail-actions"><button class="secondary-button" type="button" data-edit-id="${item.id}">Edit</button></div>`;
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
// BOOK PROGRESS
// ---------------------------
function openBookProgress(item) {
  els.bookProgressId.value = item.id;
  els.bookProgressTitle.textContent = item.title;
  els.progressCurrentPage.value = item.progress?.currentPage || 0;
  els.progressTotalPages.value = item.progress?.totalPages || '';
  els.bookProgressModal.showModal();
}

function saveBookProgress(event) {
  event.preventDefault();
  const item = findItem(els.bookProgressId.value);
  if (!item) return;
  const wasFinished = Boolean(item.completedAt) && Number(item.progress?.totalPages || 0) > 0 && Number(item.progress?.currentPage || 0) >= Number(item.progress?.totalPages || 0);
  const current = Math.max(0, Number(els.progressCurrentPage.value || 0));
  const total = Math.max(0, Number(els.progressTotalPages.value || 0));
  item.progress = { ...item.progress, currentPage: current, totalPages: total };
  if (total && current >= total) {
    setItemQueueStatus(item, 'library');
    item.completedAt = todayString();
    if (!wasFinished && !state.history.some(entry => entry.sourceItemId === item.id && entry.kind === 'book-finished')) {
      addHistoryRecord({
        sourceItemId: item.id,
        type: item.type,
        typeLabel: getItemTypeLabel(item),
        date: todayString(),
        kind: 'book-finished',
        title: item.title,
        subtitle: `Finished · ${total} pages`,
        notes: item.notes || '',
        image: item.image || '',
        provider: item.provider,
        providerId: item.providerId
      });
    }
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
    .filter(item => item.date)
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
      image: item.image || '',
      provider: item.provider || getSourceType(item),
      createdAt: item.createdAt || item.updatedAt || ''
    }));

  return [...savedItems, ...state.history.filter(entry => entry.showOnCalendar !== false)];
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
  const categories = [...new Set(dated.map(entry => entry.type))];
  const displayCategories = categories.length ? categories : ['workout', 'tv', 'book', 'movie'];

  els.trackerGrid.appendChild(cell('tracker-cell tracker-corner', ''));
  for (let day=1; day<=days; day++) els.trackerGrid.appendChild(cell('tracker-cell tracker-day', String(day)));

  for (const type of displayCategories) {
    els.trackerGrid.appendChild(cell('tracker-cell tracker-category', getTypeLabel(type).toLowerCase()));
    for (let day=1; day<=days; day++) {
      const container = cell('tracker-cell', '');
      const date = `${yearText}-${monthText}-${String(day).padStart(2, '0')}`;
      const matches = dated.filter(entry => entry.type === type && entry.date === date);

      if (matches.length) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sticker-button sticker-group-button';
        button.dataset.type = type;
        button.dataset.date = date;
        button.title = matches.length === 1 ? matches[0].title : `${matches.length} ${getTypeLabel(type)} entries`;
        button.innerHTML = `${calendarStickerMarkup(type, matches[0])}${matches.length > 1 ? `<span class="sticker-count">${matches.length}</span>` : ''}`;
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
      if (!groups.has(entry.type)) groups.set(entry.type, []);
      groups.get(entry.type).push(entry);
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

    if (!groups.size) {
      body.innerHTML = '<span class="week-empty">Nothing tracked</span>';
    } else {
      for (const [type, typeEntries] of groups) {
        const first = typeEntries[0];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'week-entry sticker-group-button';
        button.dataset.type = type;
        button.dataset.date = date;

        const summary = typeEntries.length === 1
          ? [first.title, first.subtitle].filter(Boolean).join(' · ')
          : `${typeEntries[0].title}${typeEntries.length > 1 ? ` +${typeEntries.length - 1} more` : ''}`;

        button.innerHTML = `
          <span class="week-entry-sticker">${calendarStickerMarkup(type, first)}</span>
          <span class="week-entry-copy">
            <strong>${escapeHtml(first.typeLabel || getTypeLabel(type))}</strong>
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
  const text = config.shape === 'star' ? '★' : escapeHtml(config.label || '');
  const aria = escapeAttr(`${getTypeLabel(type)} sticker`);
  return `<span class="sticker ${shapeClass} ${paletteClass} ${tiltClass}" aria-label="${aria}">${text}</span>`;
}

function getStickerConfig(type, entry = {}) {
  const defaults = getDefaultStickerConfig(type, entry);
  const saved = state.stickerPrefs?.[type] || {};
  const shape = ['square', 'circle', 'star'].includes(saved.shape) ? saved.shape : defaults.shape;
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

function handleTrackerClick(event) {
  const button = event.target.closest('.sticker-group-button[data-date][data-type]');
  if (!button) return;
  openCalendarGroup(button.dataset.type, button.dataset.date);
}

function openCalendarGroup(type, date) {
  const entries = getCalendarEntries()
    .filter(entry => entry.type === type && entry.date === date)
    .sort((a,b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  if (!entries.length) return;

  const formattedDate = new Intl.DateTimeFormat('en-CA', { weekday:'long', month:'long', day:'numeric', year:'numeric' }).format(new Date(`${date}T12:00:00`));
  const rows = entries.map(entry => `
    <article class="calendar-event-row">
      ${entry.image ? `<img class="calendar-event-image" src="${escapeAttr(entry.image)}" alt="" />` : `<div class="calendar-event-image placeholder"></div>`}
      <div class="calendar-event-copy">
        <div class="list-title">${escapeHtml(entry.title)}</div>
        ${entry.subtitle ? `<div class="list-meta">${escapeHtml(entry.subtitle)}</div>` : ''}
        ${entry.notes ? `<p class="calendar-event-notes">${escapeHtml(shorten(entry.notes, 240))}</p>` : ''}
      </div>
      ${entry.sourceItemId ? `<button class="secondary-button calendar-open-source" type="button" data-open-source-id="${escapeAttr(entry.sourceItemId)}">Open</button>` : ''}
    </article>`).join('');

  els.detailBody.innerHTML = `
    <div class="calendar-group-heading">
      <p class="detail-type">${escapeHtml(getTypeLabel(type))}</p>
      <h2>${escapeHtml(formattedDate)}</h2>
      <p class="detail-meta">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</p>
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
}

// ---------------------------
// DISCOVER
// ---------------------------
async function renderDiscover(force = false) {
  if (!els.discoverStatus) return;
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

function renderDiscoverGrid(container, results, fallbackType) {
  if (!container) return;
  container.innerHTML = '';
  for (const result of (results || []).slice(0, 8)) {
    const key = rememberDiscoverResult(result, fallbackType);
    container.insertAdjacentHTML('beforeend', discoverCardMarkup(result, key, fallbackType));
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
  return (results || []).filter(result => !blocked.has(String(result.providerId)));
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
    prioritizeAuthors: els.prioritizeAuthors.checked
  };
  localStorage.setItem(DISCOVER_PREFS_KEY, JSON.stringify(state.discoverPrefs));
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
        <button class="discover-complete-button${completed ? ' is-complete' : ''}" type="button" data-discover-complete="${escapeAttr(key)}" ${completed ? 'disabled' : ''} aria-label="${completed ? 'Already completed' : 'Mark completed'}" title="${completed ? 'Completed' : 'Mark watched / read'}">✓</button>
        <button class="discover-add-button" type="button" data-discover-add="${escapeAttr(key)}">${escapeHtml(plusLabel)}</button>
      </div>
    </div>
  </article>`;
}

async function handleDiscoverClick(event) {
  const complete = event.target.closest('[data-discover-complete]');
  if (complete) {
    await markDiscoverCompleted(complete.dataset.discoverComplete);
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

async function renderDiscoverTVDetail(key, requestedSeason = null) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  state.openDiscoverKey = key;
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

  const seasonRows = seasons.map(info => `
    <button class="season-row discover-season-row${info.season_number === seasonNumber ? ' is-current' : ''}" type="button" data-discover-season="${info.season_number}" data-discover-key="${escapeAttr(key)}">
      <span><span class="list-title">Season ${info.season_number}</span><span class="list-meta">${info.episode_count || 0} episodes${info.air_date ? ` · ${escapeHtml(info.air_date.slice(0,4))}` : ''}</span></span>
      <span class="detail-arrow-button visual-arrow">→</span>
    </button>`).join('');

  const episodeRows = (season.episodes || []).map(ep => {
    const watched = seriesCompleted || Boolean(existing && isTVEpisodeLogged(existing, seasonNumber, ep.episode_number));
    const still = TrackerAPI.tmdbImage(ep.still_path);
    return `<div class="episode-row discover-episode-row">
      ${still ? `<img src="${escapeAttr(still)}" alt="" />` : '<div class="episode-image-placeholder"></div>'}
      <div>
        <div class="list-title">E${ep.episode_number} · ${escapeHtml(ep.name || 'Episode')}</div>
        <div class="list-meta">${escapeHtml(shorten(ep.overview || '', 140))}</div>
      </div>
      <div class="episode-row-actions">
        <span class="watched-label">${watched ? 'WATCHED' : ''}</span>
        <button class="episode-check-button${watched ? ' is-checked' : ''}" type="button" data-discover-check-tv-episode="${ep.episode_number}" data-tv-season-number="${seasonNumber}" data-discover-key="${escapeAttr(key)}" ${watched ? 'disabled' : ''} aria-label="${watched ? 'Already watched' : `Mark episode ${ep.episode_number} watched`}">✓</button>
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
      <button class="secondary-button" type="button" data-discover-mark-all-tv="${escapeAttr(key)}" ${seriesCompleted ? 'disabled' : ''}>${seriesCompleted ? '✓ Series watched' : '✓ Mark all watched'}</button>
    </div>
    <section class="detail-section streaming-detail"><h3>Streaming</h3><p>${escapeHtml(providerText)}</p>${availability.link ? `<a href="${escapeAttr(availability.link)}" target="_blank" rel="noopener">See availability ↗</a>` : ''}</section>
    <section class="detail-section"><h3>Seasons</h3><div class="season-list season-list-rows">${seasonRows || 'No seasons found.'}</div></section>
    <section class="detail-section">
      <div class="detail-section-heading"><h3>Season ${seasonNumber}</h3><button class="quiet-button" type="button" data-discover-mark-season="${seasonNumber}" data-discover-key="${escapeAttr(key)}">✓ Mark season watched</button></div>
      <p class="discover-history-note">Checks here update your Library history only — they do not add calendar stickers.</p>
      <div class="episode-list">${episodeRows || 'No episodes found.'}</div>
    </section>`;
}

async function logDiscoverTVEpisode(key, seasonNumber, episodeNumber) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');
  if (isTVEpisodeLogged(item, seasonNumber, episodeNumber)) return;
  const episode = await getTVEpisodeFromSeason(item, seasonNumber, episodeNumber);
  if (!episode) throw new Error(`Could not find S${seasonNumber} E${episodeNumber}.`);
  const record = tvHistoryRecord(item, episode, seasonNumber, episodeNumber);
  addHistoryRecord({ ...record, date: '', showOnCalendar: false });
  await syncDiscoverTVProgress(item);
  saveItems();
  saveHistory();
  renderAll();
  await renderDiscoverTVDetail(key, seasonNumber);
}

async function markDiscoverSeasonWatched(key, seasonNumber) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const item = ensureDiscoverItem(result, 'library');
  const season = await getCached(`season:${result.providerId}:${seasonNumber}`, () => TrackerAPI.getTVSeason(result.providerId, seasonNumber, state.settings));
  for (const episode of season.episodes || []) {
    if (isTVEpisodeLogged(item, seasonNumber, episode.episode_number)) continue;
    const record = tvHistoryRecord(item, episode, seasonNumber, episode.episode_number);
    addHistoryRecord({ ...record, date: '', showOnCalendar: false });
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
  const okay = confirm(`Mark all available episodes of “${result.title}” as watched?`);
  if (!okay) return;
  const item = ensureDiscoverItem(result, 'library');
  const details = await getCached(`tv:${result.providerId}`, () => TrackerAPI.getTVDetails(result.providerId, state.settings));
  const seasons = (details.seasons || []).filter(season => season.season_number > 0 && season.episode_count > 0);
  for (const info of seasons) {
    const season = await getCached(`season:${result.providerId}:${info.season_number}`, () => TrackerAPI.getTVSeason(result.providerId, info.season_number, state.settings));
    for (const episode of season.episodes || []) {
      if (isTVEpisodeLogged(item, info.season_number, episode.episode_number)) continue;
      const record = tvHistoryRecord(item, episode, info.season_number, episode.episode_number);
      addHistoryRecord({ ...record, date: '', showOnCalendar: false });
    }
  }
  setItemQueueStatus(item, 'library');
  item.completedAt = todayString();
  if (!state.history.some(entry => entry.kind === 'series-watched' && entry.sourceItemId === item.id)) {
    addHistoryRecord({
      sourceItemId: item.id, type: item.type, typeLabel: getItemTypeLabel(item), date: '', showOnCalendar: false,
      kind: 'series-watched', title: item.title, subtitle: item.subtitle || '', image: item.image || '', provider: item.provider, providerId: item.providerId
    });
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
    <section class="detail-section streaming-detail"><h3>Streaming</h3><p>${escapeHtml(providerText)}</p>${availability.link ? `<a href="${escapeAttr(availability.link)}" target="_blank" rel="noopener">See availability ↗</a>` : ''}</section>
    ${details.genres?.length ? `<section class="detail-section"><h3>Genres</h3><p>${escapeHtml(details.genres.map(genre => genre.name).join(' · '))}</p></section>` : ''}`;
}

async function renderDiscoverBookDetail(key) {
  const result = state.discoverResults.get(key);
  if (!result) return;
  const data = await getCached(`book:${result.providerId}`, () => TrackerAPI.getBookDetails(result.providerId, state.settings));
  const info = data.volumeInfo || {};
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
        </select>
      </label>
      <label class="sticker-setting-field">
        <span class="sticker-setting-mobile-label">Text</span>
        <input data-sticker-field="label" type="text" maxlength="3" value="${escapeAttr(config.shape === 'star' ? '' : config.label)}" placeholder="${escapeAttr(defaultStickerLabel(type))}" ${config.shape === 'star' ? 'disabled' : ''} />
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
  if (labelInput) labelInput.disabled = shape === 'star';
  const label = shape === 'star' ? '★' : cleanStickerLabel(labelInput?.value || defaultStickerLabel(row.dataset.stickerType));
  const defaults = getDefaultStickerConfig(row.dataset.stickerType, state.history.find(entry => entry.type === row.dataset.stickerType) || {});
  const preview = row.querySelector('.sticker-setting-preview');
  if (preview) {
    preview.innerHTML = `<span class="sticker sticker-${shape} sticker-palette-${color} sticker-tilt-${defaults.tilt}">${shape === 'star' ? '★' : escapeHtml(label)}</span>`;
  }
}

function saveStickerSettings(event) {
  event.preventDefault();
  const next = { ...state.stickerPrefs };

  els.stickerSettingsRows.querySelectorAll('.sticker-setting-row[data-sticker-type]').forEach(row => {
    const type = row.dataset.stickerType;
    const shape = row.querySelector('[data-sticker-field="shape"]')?.value || 'square';
    const color = row.querySelector('[data-sticker-field="color"]')?.value || 'cream';
    const label = shape === 'star' ? '★' : cleanStickerLabel(row.querySelector('[data-sticker-field="label"]')?.value || defaultStickerLabel(type));
    next[type] = { shape, color, label };
  });

  state.stickerPrefs = next;
  localStorage.setItem(STICKER_PREFS_KEY, JSON.stringify(state.stickerPrefs));
  els.stickerSettingsModal.close();
  renderTracker();
}

function resetStickerSettings() {
  if (!confirm('Reset every sticker to its default style?')) return;
  state.stickerPrefs = {};
  localStorage.removeItem(STICKER_PREFS_KEY);
  renderStickerSettingsRows();
  renderTracker();
}

function getRecognizedTypes() {
  const types = new Map();
  Object.keys(TYPE_LABELS).forEach(type => types.set(type, getTypeLabel(type)));
  state.customTypes.forEach(entry => types.set(entry.type, entry.label));
  state.items.forEach(item => types.set(item.type, getItemTypeLabel(item)));
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
// LIBRARY
// ---------------------------
function renderLibrary() {
  refreshTypeFilter();
  const filter = els.typeFilter.value;
  const filtered = state.items.filter(item => filter === 'all' || item.type === filter);
  const preferredOrder = ['tv','movie','book','music','workout','other'];
  const grouped = new Map();

  for (const item of filtered) {
    if (!grouped.has(item.type)) grouped.set(item.type, []);
    grouped.get(item.type).push(item);
  }
  for (const values of grouped.values()) {
    values.sort((a,b) => Number(b.rating || 0) - Number(a.rating || 0) || a.title.localeCompare(b.title));
  }

  const customOrder = [...grouped.keys()]
    .filter(type => !preferredOrder.includes(type))
    .sort((a,b) => getTypeLabel(a).localeCompare(getTypeLabel(b)));
  const order = [...preferredOrder, ...customOrder];

  els.libraryGroups.innerHTML = '';
  els.libraryEmpty.hidden = filtered.length > 0;

  for (const type of order) {
    const items = grouped.get(type);
    if (!items?.length) continue;
    const section = document.createElement('section');
    section.className = 'library-group';
    section.innerHTML = `<h2 class="library-group-title">${escapeHtml(getTypeLabel(type))}</h2><div class="library-items"></div>`;
    const list = section.querySelector('.library-items');

    for (const item of items) {
      const row = document.createElement('article');
      row.className = 'library-row';
      row.innerHTML = `
        <div class="library-title-cell" data-details-id="${item.id}" role="button" tabindex="0">
          ${item.image ? `<img class="library-thumb" src="${escapeAttr(item.image)}" alt="" />` : '<div class="library-thumb"></div>'}
          <div class="library-title-text">${escapeHtml(item.title)}<div class="library-subtext">${escapeHtml([libraryProgressText(item), resourceSummary(item)].filter(Boolean).join(' · '))}</div></div>
        </div>
        <div class="library-type">${escapeHtml(getItemTypeLabel(item))}</div>
        <div class="library-rating">${ratingStars(item.rating)}</div>
        <div class="library-note">${escapeHtml(item.notes || '—')}</div>
        <button class="edit-link" type="button" data-edit-id="${item.id}">Edit</button>`;
      list.appendChild(row);
    }
    els.libraryGroups.appendChild(section);
  }
}
function handleLibraryClick(event) {
  const title = event.target.closest('[data-details-id]');
  if (!title || event.target.closest('button, a')) return;
  openDetails(title.dataset.detailsId);
}

function libraryProgressText(item) {
  const sourceType = getSourceType(item);
  if (sourceType === 'tv') return `Next: S${item.progress?.nextSeason || 1} E${item.progress?.nextEpisode || 1}`;
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
  if (item.active !== false && ['tv', 'youtube', 'book'].includes(getSourceType(item))) return 'upnext';
  return 'library';
}

function setItemQueueStatus(item, status) {
  const next = ['upnext', 'tbr', 'library'].includes(status) ? status : 'library';
  item.queueStatus = next;
  item.active = next === 'upnext';
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
}

function refreshTypeFilter() {
  const current = els.typeFilter.value || 'all';
  const types = new Map();
  Object.keys(TYPE_LABELS).forEach(type => types.set(type, getTypeLabel(type)));
  state.customTypes.forEach(entry => types.set(entry.type, entry.label));
  state.items.forEach(item => types.set(item.type, getItemTypeLabel(item)));

  els.typeFilter.innerHTML = '<option value="all">All</option>';
  const ordered = [...types.entries()].sort(([aType,aLabel],[bType,bLabel]) => {
    const preferred = ['tv','movie','book','music','workout','other'];
    const ai = preferred.indexOf(aType);
    const bi = preferred.indexOf(bType);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return aLabel.localeCompare(bLabel);
  });

  for (const [type, label] of ordered) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = label;
    els.typeFilter.appendChild(option);
  }
  els.typeFilter.value = types.has(current) || current === 'all' ? current : 'all';
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
  localStorage.setItem(ITEMS_KEY, JSON.stringify(state.items));
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
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
