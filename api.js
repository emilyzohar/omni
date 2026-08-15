export const TrackerAPI = (() => {
  const TMDB_ROOT = 'https://api.themoviedb.org/3';
  const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';
  const GOOGLE_BOOKS_ROOT = 'https://www.googleapis.com/books/v1';
  const YOUTUBE_ROOT = 'https://www.googleapis.com/youtube/v3';
  const ITUNES_ROOT = 'https://itunes.apple.com';

  function required(value, label) {
    if (!value) throw new Error(`${label} is missing from .env.`);
    return value;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const payload = await response.json();
        message = payload?.status_message || payload?.error?.message || payload?.error?.errors?.[0]?.message || message;
        const reason = payload?.error?.errors?.[0]?.reason || payload?.error?.details?.[0]?.reason || '';
        if (url.includes('youtube.googleapis.com') || url.includes('www.googleapis.com/youtube')) {
          if (/blocked/i.test(message) || /API_KEY_.*BLOCKED/i.test(reason)) {
            message += ' Check that EXPO_PUBLIC_YOUTUBE_API_KEY belongs to a project with YouTube Data API v3 enabled and that the key restrictions allow YouTube Data API v3 (including playlists.list and playlistItems.list) from this site.';
          }
        }
      } catch {}
      throw new Error(message);
    }
    return response.json();
  }

  function tmdbHeaders(settings) {
    return {
      accept: 'application/json',
      Authorization: `Bearer ${required(settings.tmdbToken, 'TMDB token')}`
    };
  }

  async function searchTMDB(query, type, settings) {
    const path = type === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_ROOT}/search/${path}?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
    const data = await fetchJson(url, { headers: tmdbHeaders(settings) });
    return (data.results || []).slice(0, 12).map(result => ({
      provider: 'tmdb',
      providerId: String(result.id),
      title: result.name || result.title || 'Untitled',
      subtitle: (result.first_air_date || result.release_date || '').slice(0, 4),
      image: result.poster_path ? `${TMDB_IMAGE}${result.poster_path}` : '',
      description: result.overview || '',
      raw: result
    }));
  }

  async function getTVDetails(id, settings) {
    return fetchJson(`${TMDB_ROOT}/tv/${id}?language=en-US`, { headers: tmdbHeaders(settings) });
  }

  async function getTVSeason(id, seasonNumber, settings) {
    return fetchJson(`${TMDB_ROOT}/tv/${id}/season/${seasonNumber}?language=en-US`, { headers: tmdbHeaders(settings) });
  }

  async function getTVEpisode(id, seasonNumber, episodeNumber, settings) {
    return fetchJson(`${TMDB_ROOT}/tv/${id}/season/${seasonNumber}/episode/${episodeNumber}?language=en-US`, { headers: tmdbHeaders(settings) });
  }

  async function getMovieDetails(id, settings) {
    return fetchJson(`${TMDB_ROOT}/movie/${id}?language=en-US`, { headers: tmdbHeaders(settings) });
  }

  function tmdbImage(path) {
    return path ? `${TMDB_IMAGE}${path}` : '';
  }

  async function searchBooks(query, settings) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    const url = `${GOOGLE_BOOKS_ROOT}/volumes?q=${encodeURIComponent(query)}&maxResults=12&printType=books&key=${encodeURIComponent(key)}`;
    const data = await fetchJson(url);
    return (data.items || []).map(item => {
      const info = item.volumeInfo || {};
      const thumb = info.imageLinks?.thumbnail?.replace('http://', 'https://') || '';
      return {
        provider: 'googleBooks',
        providerId: item.id,
        title: info.title || 'Untitled',
        subtitle: (info.authors || []).join(', '),
        image: thumb,
        description: info.description || '',
        pageCount: info.pageCount || null,
        raw: item
      };
    });
  }

  async function getBookDetails(id, settings) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    return fetchJson(`${GOOGLE_BOOKS_ROOT}/volumes/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`);
  }

  async function searchMusic(query, settings) {
    const country = (settings.itunesCountry || 'CA').toUpperCase();
    const url = `${ITUNES_ROOT}/search?term=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}&media=music&entity=album&limit=12`;
    const data = await fetchJson(url);
    const seen = new Set();
    return (data.results || []).filter(result => {
      if (!result.collectionId || seen.has(result.collectionId)) return false;
      seen.add(result.collectionId);
      return true;
    }).map(result => ({
      provider: 'itunes',
      providerId: String(result.collectionId),
      title: result.collectionName || 'Untitled',
      subtitle: result.artistName || '',
      image: (result.artworkUrl100 || '').replace('100x100bb', '400x400bb'),
      description: result.primaryGenreName || '',
      raw: result
    }));
  }

  async function getMusicDetails(id, settings) {
    const country = (settings.itunesCountry || 'CA').toUpperCase();
    return fetchJson(`${ITUNES_ROOT}/lookup?id=${encodeURIComponent(id)}&country=${encodeURIComponent(country)}&entity=song`);
  }

  function parsePlaylistId(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    try {
      const url = new URL(trimmed);
      return url.searchParams.get('list') || '';
    } catch {
      return trimmed;
    }
  }

  async function getPlaylist(idOrUrl, settings) {
    const key = required(settings.youtubeKey, 'YouTube Data API key');
    const playlistId = parsePlaylistId(idOrUrl);
    if (!playlistId) throw new Error('Could not read a YouTube playlist ID.');

    const playlistData = await fetchJson(`${YOUTUBE_ROOT}/playlists?part=snippet,contentDetails&id=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(key)}`);
    const playlist = playlistData.items?.[0];
    if (!playlist) throw new Error('Playlist not found or not public.');

    const items = [];
    let pageToken = '';
    do {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: '50',
        key
      });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await fetchJson(`${YOUTUBE_ROOT}/playlistItems?${params.toString()}`);
      for (const entry of page.items || []) {
        const snippet = entry.snippet || {};
        const videoId = entry.contentDetails?.videoId || snippet.resourceId?.videoId;
        if (!videoId || snippet.title === 'Deleted video' || snippet.title === 'Private video') continue;
        items.push({
          playlistItemId: entry.id,
          videoId,
          title: snippet.title || 'Untitled workout',
          description: snippet.description || '',
          image: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
          position: snippet.position ?? items.length,
          channelTitle: snippet.videoOwnerChannelTitle || snippet.channelTitle || ''
        });
      }
      pageToken = page.nextPageToken || '';
    } while (pageToken && items.length < 500);

    return {
      provider: 'youtube',
      providerId: playlistId,
      title: playlist.snippet?.title || 'Workout playlist',
      subtitle: playlist.snippet?.channelTitle || '',
      image: playlist.snippet?.thumbnails?.high?.url || playlist.snippet?.thumbnails?.medium?.url || '',
      description: playlist.snippet?.description || '',
      items: items.sort((a,b) => a.position - b.position)
    };
  }

  function mapTMDBDiscoverResult(result, mediaType) {
    return {
      sourceType: mediaType,
      provider: 'tmdb',
      providerId: String(result.id),
      title: result.name || result.title || 'Untitled',
      subtitle: (result.first_air_date || result.release_date || '').slice(0, 4),
      image: result.poster_path ? `${TMDB_IMAGE}${result.poster_path}` : '',
      description: result.overview || '',
      rating: result.vote_average || 0,
      raw: result
    };
  }

  async function getTMDBDiscover(type, page = 1, settings, options = {}) {
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const params = new URLSearchParams({
      language: 'en-US',
      include_adult: 'false',
      page: String(Math.max(1, Number(page) || 1)),
      sort_by: options.sortBy || 'popularity.desc'
    });

    // Keep low-signal catalogue noise down without making the feed only blockbusters.
    params.set('vote_count.gte', String(options.minVotes ?? (mediaType === 'tv' ? 30 : 50)));

    const providerIds = (options.providerIds || []).map(String).filter(Boolean);
    if (providerIds.length) {
      params.set('watch_region', String(settings.tmdbWatchRegion || 'CA').toUpperCase());
      params.set('with_watch_providers', providerIds.join('|'));
      params.set('with_watch_monetization_types', 'flatrate|free|ads');
    }

    const data = await fetchJson(`${TMDB_ROOT}/discover/${mediaType}?${params.toString()}`, { headers: tmdbHeaders(settings) });
    return {
      page: Number(data.page || page),
      totalPages: Number(data.total_pages || 1),
      results: (data.results || []).map(result => mapTMDBDiscoverResult(result, mediaType))
    };
  }

  async function getBookFeed(startIndex = 0, settings, options = {}) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    const query = options.query || 'subject:fiction';
    const params = new URLSearchParams({
      q: query,
      startIndex: String(Math.max(0, Number(startIndex) || 0)),
      maxResults: String(Math.min(40, Math.max(1, Number(options.maxResults) || 40))),
      printType: 'books',
      orderBy: options.orderBy === 'newest' ? 'newest' : 'relevance',
      key
    });
    const data = await fetchJson(`${GOOGLE_BOOKS_ROOT}/volumes?${params.toString()}`);
    return {
      startIndex: Math.max(0, Number(startIndex) || 0),
      totalItems: Number(data.totalItems || 0),
      results: (data.items || []).map(mapBook)
    };
  }

  async function getTrending(type, settings) {
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const data = await fetchJson(`${TMDB_ROOT}/trending/${mediaType}/week?language=en-US`, { headers: tmdbHeaders(settings) });
    return (data.results || []).slice(0, 12).map(result => ({
      sourceType: mediaType,
      provider: 'tmdb',
      providerId: String(result.id),
      title: result.name || result.title || 'Untitled',
      subtitle: (result.first_air_date || result.release_date || '').slice(0, 4),
      image: result.poster_path ? `${TMDB_IMAGE}${result.poster_path}` : '',
      description: result.overview || '',
      rating: result.vote_average || 0,
      raw: result
    }));
  }

  async function getTMDBRecommendations(type, id, settings, page = 1) {
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const data = await fetchJson(`${TMDB_ROOT}/${mediaType}/${encodeURIComponent(id)}/recommendations?language=en-US&page=${Math.max(1, Number(page) || 1)}`, { headers: tmdbHeaders(settings) });
    return (data.results || []).slice(0, 12).map(result => ({
      sourceType: mediaType,
      provider: 'tmdb',
      providerId: String(result.id),
      title: result.name || result.title || 'Untitled',
      subtitle: (result.first_air_date || result.release_date || '').slice(0, 4),
      image: result.poster_path ? `${TMDB_IMAGE}${result.poster_path}` : '',
      description: result.overview || '',
      rating: result.vote_average || 0,
      raw: result
    }));
  }

  async function getWatchProviderCatalog(settings) {
    const region = (settings.tmdbWatchRegion || 'CA').toUpperCase();
    const query = new URLSearchParams({ language: 'en-US', watch_region: region });
    const [tvData, movieData] = await Promise.all([
      fetchJson(`${TMDB_ROOT}/watch/providers/tv?${query.toString()}`, { headers: tmdbHeaders(settings) }),
      fetchJson(`${TMDB_ROOT}/watch/providers/movie?${query.toString()}`, { headers: tmdbHeaders(settings) })
    ]);

    const merged = new Map();
    for (const provider of [...(tvData.results || []), ...(movieData.results || [])]) {
      const id = String(provider.provider_id);
      const existing = merged.get(id);
      const priority = Number(provider.display_priority ?? 9999);
      if (!existing || priority < existing.displayPriority) {
        merged.set(id, {
          providerId: id,
          name: provider.provider_name || 'Streaming service',
          logo: provider.logo_path ? `${TMDB_IMAGE}${provider.logo_path}` : '',
          displayPriority: priority
        });
      }
    }

    return [...merged.values()].sort((a, b) => a.displayPriority - b.displayPriority || a.name.localeCompare(b.name));
  }

  async function getWatchProviders(type, id, settings) {
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const region = (settings.tmdbWatchRegion || 'CA').toUpperCase();
    const data = await fetchJson(`${TMDB_ROOT}/${mediaType}/${encodeURIComponent(id)}/watch/providers`, { headers: tmdbHeaders(settings) });
    const regionData = data.results?.[region] || {};
    const merged = new Map();

    for (const group of ['flatrate', 'free', 'ads']) {
      for (const provider of regionData[group] || []) {
        const providerId = String(provider.provider_id);
        if (!merged.has(providerId)) {
          merged.set(providerId, {
            providerId,
            name: provider.provider_name || 'Streaming service',
            logo: provider.logo_path ? `${TMDB_IMAGE}${provider.logo_path}` : '',
            group
          });
        }
      }
    }

    return {
      region,
      link: regionData.link || '',
      providers: [...merged.values()]
    };
  }

  function mapBook(item) {
    const info = item.volumeInfo || {};
    const thumb = info.imageLinks?.thumbnail?.replace('http://', 'https://') || '';
    return {
      sourceType: 'book',
      provider: 'googleBooks',
      providerId: item.id,
      title: info.title || 'Untitled',
      subtitle: (info.authors || []).join(', '),
      image: thumb,
      description: info.description || '',
      pageCount: info.pageCount || null,
      publishedDate: info.publishedDate || '',
      categories: info.categories || [],
      raw: item
    };
  }

  async function getNewBooks(settings) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    const query = 'subject:fiction';
    const url = `${GOOGLE_BOOKS_ROOT}/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=newest&key=${encodeURIComponent(key)}`;
    const data = await fetchJson(url);
    return (data.items || []).map(mapBook).slice(0, 12);
  }

  async function getBookRecommendations(seedId, settings) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    const seed = await getBookDetails(seedId, settings);
    const info = seed.volumeInfo || {};
    const category = (info.categories || [])[0];
    const author = (info.authors || [])[0];
    let query = category ? `subject:${category}` : author ? `inauthor:${author}` : 'subject:fiction';
    const url = `${GOOGLE_BOOKS_ROOT}/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=relevance&key=${encodeURIComponent(key)}`;
    const data = await fetchJson(url);
    return (data.items || []).map(mapBook).filter(book => String(book.providerId) !== String(seedId)).slice(0, 12);
  }

  async function getBooksByAuthor(author, settings) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    const query = `inauthor:${author}`;
    const url = `${GOOGLE_BOOKS_ROOT}/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=relevance&key=${encodeURIComponent(key)}`;
    const data = await fetchJson(url);
    return (data.items || []).map(mapBook).slice(0, 12);
  }

  async function getYouTubeVideo(videoId, settings) {
    const key = required(settings.youtubeKey, 'YouTube Data API key');
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoId,
      key
    });
    const data = await fetchJson(`${YOUTUBE_ROOT}/videos?${params.toString()}`);
    const video = data.items?.[0];
    if (!video) throw new Error('YouTube video not found or unavailable.');
    return video;
  }

  async function searchCatalogue(query, type, settings) {
    if (!query.trim()) return [];
    if (type === 'tv' || type === 'movie') return searchTMDB(query, type, settings);
    if (type === 'book') return searchBooks(query, settings);
    if (type === 'music') return searchMusic(query, settings);
    return [];
  }

  return {
    searchCatalogue,
    searchTMDB,
    getTVDetails,
    getTVSeason,
    getTVEpisode,
    getMovieDetails,
    tmdbImage,
    searchBooks,
    getBookDetails,
    searchMusic,
    getMusicDetails,
    parsePlaylistId,
    getPlaylist,
    getYouTubeVideo,
    getTrending,
    getTMDBDiscover,
    getBookFeed,
    getTMDBRecommendations,
    getWatchProviderCatalog,
    getWatchProviders,
    getNewBooks,
    getBookRecommendations,
    getBooksByAuthor
  };
})();
