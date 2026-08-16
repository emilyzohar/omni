export const TrackerAPI = (() => {
  const TMDB_ROOT = 'https://api.themoviedb.org/3';
  const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';
  const GOOGLE_BOOKS_ROOT = 'https://www.googleapis.com/books/v1';
  const YOUTUBE_ROOT = 'https://www.googleapis.com/youtube/v3';
  const ITUNES_ROOT = 'https://itunes.apple.com';
  const TICKETMASTER_ROOT = 'https://app.ticketmaster.com/discovery/v2';

  function required(value, label) {
    if (!value) throw new Error(`${label} is missing from .env.`);
    return value;
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Google Books is much less tolerant of bursty browser traffic than TMDB.
  // Keep Books requests serialized with a small gap so Discover's parallel TV/movie
  // work cannot accidentally fire several Books calls at the same instant.
  let googleBooksQueue = Promise.resolve();
  function fetchGoogleBooksJson(url) {
    const run = googleBooksQueue.then(async () => {
      await sleep(140);
      return fetchJson(url);
    });
    googleBooksQueue = run.catch(() => undefined);
    return run;
  }

  async function fetchJson(url, options = {}) {
    // Catalogue APIs occasionally return transient 429/5xx responses. Retrying
    // here keeps one flaky upstream request from breaking an entire Discover row.
    const transientStatuses = new Set([429, 500, 502, 503, 504]);
    const maxAttempts = 3;
    let response;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      response = await fetch(url, options);
      if (response.ok) return response.json();

      if (transientStatuses.has(response.status) && attempt < maxAttempts) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 5000)
          : 350 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 180);
        await sleep(delay);
        continue;
      }
      break;
    }

    let message = `${response?.status || ''} ${response?.statusText || 'Request failed'}`.trim();
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
    const url = `${GOOGLE_BOOKS_ROOT}/volumes?q=${encodeURIComponent(query)}&maxResults=40&printType=books&langRestrict=en&key=${encodeURIComponent(key)}`;
    const data = await fetchGoogleBooksJson(url);
    const subjectMatch = String(query || '').match(/subject:(?:\"([^\"]+)\"|([^\s]+))/i);
    const trustedSubject = String(subjectMatch?.[1] || subjectMatch?.[2] || '').trim().toLowerCase();
    return (data.items || []).map(item => {
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
        categories: info.categories || [],
        language: info.language || '',
        _bookGenreSubject: trustedSubject,
        raw: item
      };
    });
  }

  async function getBookDetails(id, settings) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    return fetchGoogleBooksJson(`${GOOGLE_BOOKS_ROOT}/volumes/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`);
  }

  async function searchMusic(query, settings) {
    const country = (settings.itunesCountry || 'CA').toUpperCase();
    const url = `${ITUNES_ROOT}/search?term=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}&media=music&entity=album&limit=50`;
    const data = await fetchJson(url);
    const seen = new Set();
    return (data.results || []).filter(result => {
      if (!result.collectionId || seen.has(result.collectionId)) return false;
      seen.add(result.collectionId);
      return true;
    }).map(result => ({
      sourceType: 'music',
      provider: 'itunes',
      providerId: String(result.collectionId),
      title: result.collectionName || 'Untitled',
      subtitle: result.artistName || '',
      artistName: result.artistName || '',
      artistId: result.artistId ? String(result.artistId) : '',
      image: (result.artworkUrl100 || '').replace('100x100bb', '400x400bb'),
      description: result.primaryGenreName || '',
      releaseDate: String(result.releaseDate || '').slice(0, 10),
      raw: result
    }));
  }

  async function searchArtists(query, settings) {
    const country = (settings.itunesCountry || 'CA').toUpperCase();
    const url = `${ITUNES_ROOT}/search?term=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}&media=music&entity=musicArtist&limit=50`;
    const data = await fetchJson(url);
    const seen = new Set();
    return (data.results || []).filter(result => {
      if (!result.artistId || seen.has(String(result.artistId))) return false;
      seen.add(String(result.artistId));
      return true;
    }).map(result => ({
      sourceType: 'artist',
      provider: 'itunes',
      providerId: String(result.artistId),
      title: result.artistName || 'Unknown artist',
      subtitle: result.primaryGenreName || 'Artist',
      artistName: result.artistName || '',
      artistId: String(result.artistId),
      image: '',
      description: result.primaryGenreName || '',
      raw: result
    }));
  }

  async function searchSongs(query, settings) {
    const country = (settings.itunesCountry || 'CA').toUpperCase();
    const url = `${ITUNES_ROOT}/search?term=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}&media=music&entity=song&limit=50`;
    const data = await fetchJson(url);
    const seen = new Set();
    return (data.results || []).filter(result => {
      if (!result.trackId || seen.has(String(result.trackId))) return false;
      seen.add(String(result.trackId));
      return true;
    }).map(result => ({
      sourceType: 'song',
      provider: 'itunes',
      providerId: String(result.trackId),
      title: result.trackName || 'Untitled song',
      subtitle: result.artistName || '',
      artistName: result.artistName || '',
      artistId: result.artistId ? String(result.artistId) : '',
      albumName: result.collectionName || '',
      image: (result.artworkUrl100 || '').replace('100x100bb', '400x400bb'),
      description: [result.collectionName, result.primaryGenreName].filter(Boolean).join(' · '),
      releaseDate: String(result.releaseDate || '').slice(0, 10),
      raw: result
    }));
  }

  async function getMusicDetails(id, settings) {
    const country = (settings.itunesCountry || 'CA').toUpperCase();
    return fetchJson(`${ITUNES_ROOT}/lookup?id=${encodeURIComponent(id)}&country=${encodeURIComponent(country)}&entity=song`);
  }

  async function getArtistDetails(id, settings) {
    const country = (settings.itunesCountry || 'CA').toUpperCase();
    return fetchJson(`${ITUNES_ROOT}/lookup?id=${encodeURIComponent(id)}&country=${encodeURIComponent(country)}&entity=album&limit=12&sort=recent`);
  }

  async function getSongDetails(id, settings) {
    const country = (settings.itunesCountry || 'CA').toUpperCase();
    return fetchJson(`${ITUNES_ROOT}/lookup?id=${encodeURIComponent(id)}&country=${encodeURIComponent(country)}`);
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

  async function getTMDBGenres(type, settings) {
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const data = await fetchJson(`${TMDB_ROOT}/genre/${mediaType}/list?language=en-US`, { headers: tmdbHeaders(settings) });
    return (data.genres || []).map(genre => ({ id: String(genre.id), name: genre.name || '' })).filter(genre => genre.id && genre.name);
  }

  const tmdbKeywordCache = new Map();

  async function getTMDBKeywordIds(terms, settings) {
    const wanted = [...new Set((terms || []).map(term => String(term || '').trim()).filter(Boolean))];
    const ids = [];
    for (const term of wanted) {
      const key = term.toLowerCase();
      if (tmdbKeywordCache.has(key)) {
        ids.push(...tmdbKeywordCache.get(key));
        continue;
      }
      const data = await fetchJson(`${TMDB_ROOT}/search/keyword?query=${encodeURIComponent(term)}&page=1`, { headers: tmdbHeaders(settings) });
      const results = data.results || [];
      const normalized = key.replace(/[^a-z0-9]+/g, ' ').trim();
      const exact = results.filter(result => String(result.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === normalized);
      const chosen = exact.length ? exact : results.slice(0, 2);
      const found = [...new Set(chosen.map(result => String(result.id)).filter(Boolean))];
      tmdbKeywordCache.set(key, found);
      ids.push(...found);
    }
    return [...new Set(ids)];
  }

  async function getTMDBItemKeywords(type, id, settings) {
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const data = await fetchJson(`${TMDB_ROOT}/${mediaType}/${encodeURIComponent(id)}/keywords`, { headers: tmdbHeaders(settings) });
    const list = mediaType === 'tv' ? (data.results || []) : (data.keywords || []);
    return list.map(keyword => ({ id: String(keyword.id), name: keyword.name || '' })).filter(keyword => keyword.id);
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

    const useAirDate = mediaType === 'tv' && options.dateField === 'air';
    const useRegionalReleaseDate = mediaType === 'movie' && options.dateField === 'release';
    if (options.beforeDate) {
      const key = mediaType === 'tv'
        ? (useAirDate ? 'air_date.lte' : 'first_air_date.lte')
        : (useRegionalReleaseDate ? 'release_date.lte' : 'primary_release_date.lte');
      params.set(key, options.beforeDate);
    }
    if (options.afterDate) {
      const key = mediaType === 'tv'
        ? (useAirDate ? 'air_date.gte' : 'first_air_date.gte')
        : (useRegionalReleaseDate ? 'release_date.gte' : 'primary_release_date.gte');
      params.set(key, options.afterDate);
    }
    if (mediaType === 'movie' && options.region) params.set('region', String(options.region).toUpperCase());
    if (mediaType === 'movie' && options.releaseTypes) params.set('with_release_type', String(options.releaseTypes));

    const genreIds = (options.genreIds || (options.genreId ? [options.genreId] : [])).map(String).filter(Boolean);
    if (genreIds.length) params.set('with_genres', genreIds.join('|'));

    const keywordIds = (options.keywordIds || []).map(String).filter(Boolean);
    if (keywordIds.length) params.set('with_keywords', keywordIds.join('|'));

    if (options.originalLanguage) params.set('with_original_language', String(options.originalLanguage));

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
      results: (data.results || []).map(result => ({
        ...mapTMDBDiscoverResult(result, mediaType),
        _discoverGenreTag: options.genreTag || ''
      }))
    };
  }

  async function getBookFeed(startIndex = 0, settings, options = {}) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    const requestedQuery = String(options.query || 'subject:fiction').trim();
    const requestedMax = Math.min(20, Math.max(1, Number(options.maxResults) || 20));
    const normalizedStart = Math.max(0, Number(startIndex) || 0);
    const orderBy = options.orderBy === 'newest' ? 'newest' : 'relevance';

    async function requestBooks(query, maxResults) {
      const params = new URLSearchParams({
        q: query,
        startIndex: String(normalizedStart),
        maxResults: String(maxResults),
        printType: 'books',
        orderBy,
        langRestrict: 'en',
        key
      });
      const data = await fetchGoogleBooksJson(`${GOOGLE_BOOKS_ROOT}/volumes?${params.toString()}`);
      const subjectMatch = String(query || '').match(/subject:(?:\"([^\"]+)\"|([^\s]+))/i);
      const trustedSubject = String(subjectMatch?.[1] || subjectMatch?.[2] || '').trim().toLowerCase();
      return {
        startIndex: normalizedStart,
        totalItems: Number(data.totalItems || 0),
        results: (data.items || []).map(mapBook).map(book => ({ ...book, _bookGenreSubject: trustedSubject }))
      };
    }

    try {
      return await requestBooks(requestedQuery, requestedMax);
    } catch (error) {
      const transient = /(^|\b)(429|500|502|503|504)(\b|$)|backend|temporar|unavailable/i.test(String(error?.message || ''));
      if (!transient) throw error;

      // Google Books can be flaky on larger subject-filtered pages. A smaller
      // request usually succeeds while preserving the exact subject query.
      try {
        return await requestBooks(requestedQuery, Math.min(12, requestedMax));
      } catch (smallerError) {
        const subjectMatch = requestedQuery.match(/subject:(?:"([^"]+)"|([^\s]+))/i);
        if (!subjectMatch) throw smallerError;

        // Last-resort fallback: search the subject phrase as ordinary text, then
        // keep only results whose categories/metadata still look like that genre.
        const subject = String(subjectMatch[1] || subjectMatch[2] || '').trim();
        if (!subject) throw smallerError;
        const broadQuery = subject.toLowerCase() === 'romance' ? 'romance fiction' : subject;
        const broad = await requestBooks(broadQuery, Math.min(12, requestedMax));
        const terms = subject.toLowerCase().split(/\s+/).filter(Boolean);
        const filtered = broad.results.filter(book => {
          const info = book.raw?.volumeInfo || {};
          const haystack = [
            ...(book.categories || []),
            info.title || '',
            info.subtitle || '',
            info.description || ''
          ].join(' ').toLowerCase();
          return terms.some(term => haystack.includes(term));
        });
        // Google frequently omits volumeInfo.categories even for books returned by
        // its own subject/text search. Do not turn a successful Romance query into
        // an empty shelf just because that optional metadata is absent.
        broad.results = (filtered.length >= 4 ? filtered : broad.results).map(book => ({
          ...book,
          _bookGenreSubject: subject.toLowerCase()
        }));
        return broad;
      }
    }
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
      language: info.language || '',
      raw: item
    };
  }

  async function getNewBooks(settings) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    const query = 'subject:fiction';
    const url = `${GOOGLE_BOOKS_ROOT}/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=newest&langRestrict=en&key=${encodeURIComponent(key)}`;
    const data = await fetchGoogleBooksJson(url);
    return (data.items || []).map(mapBook).slice(0, 12);
  }

  async function getBookRecommendations(seedId, settings) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    const seed = await getBookDetails(seedId, settings);
    const info = seed.volumeInfo || {};
    const category = (info.categories || [])[0];
    const author = (info.authors || [])[0];
    let query = category ? `subject:${category}` : author ? `inauthor:${author}` : 'subject:fiction';
    const url = `${GOOGLE_BOOKS_ROOT}/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=relevance&langRestrict=en&key=${encodeURIComponent(key)}`;
    const data = await fetchGoogleBooksJson(url);
    return (data.items || []).map(mapBook).filter(book => String(book.providerId) !== String(seedId)).slice(0, 12);
  }

  async function getBooksByAuthor(author, settings) {
    const key = required(settings.googleBooksKey, 'Google Books API key');
    const query = `inauthor:${author}`;
    const url = `${GOOGLE_BOOKS_ROOT}/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=relevance&langRestrict=en&key=${encodeURIComponent(key)}`;
    const data = await fetchGoogleBooksJson(url);
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


  // Ticketmaster's default Discovery API limit is 5 requests/second. Serialize
  // requests with a small gap so artist-follow and event-recommendation lookups
  // can safely share the same browser session without bursty 429 responses.
  let ticketmasterQueue = Promise.resolve();
  function fetchTicketmasterJson(url) {
    const run = ticketmasterQueue.then(async () => {
      await sleep(225);
      return fetchJson(url);
    });
    ticketmasterQueue = run.catch(() => undefined);
    return run;
  }

  function ticketmasterDateTime(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  function ticketmasterImage(images = []) {
    if (!Array.isArray(images) || !images.length) return '';
    const ranked = [...images].sort((a, b) => {
      const ar = a.ratio === '16_9' ? 0 : a.ratio === '3_2' ? 1 : 2;
      const br = b.ratio === '16_9' ? 0 : b.ratio === '3_2' ? 1 : 2;
      if (ar !== br) return ar - br;
      return Number(b.width || 0) - Number(a.width || 0);
    });
    return ranked[0]?.url || '';
  }

  function mapTicketmasterEvent(event) {
    const venue = event?._embedded?.venues?.[0] || {};
    const classification = event?.classifications?.[0] || {};
    const localDate = event?.dates?.start?.localDate || '';
    const localTime = event?.dates?.start?.localTime || '';
    const city = venue?.city?.name || '';
    const region = venue?.state?.stateCode || venue?.state?.name || venue?.country?.countryCode || '';
    const venueName = venue?.name || '';
    const segment = classification?.segment?.name || '';
    const genre = classification?.genre?.name || '';
    const subGenre = classification?.subGenre?.name || '';
    const price = event?.priceRanges?.[0] || {};
    const attractionDetails = (event?._embedded?.attractions || []).map(attraction => ({
      id: String(attraction?.id || ''),
      name: attraction?.name || '',
      classifications: (attraction?.classifications || []).flatMap(entry => [entry?.segment?.name, entry?.genre?.name, entry?.subGenre?.name]).filter(Boolean)
    })).filter(attraction => attraction.id || attraction.name);
    const attractions = attractionDetails.map(attraction => attraction.name).filter(Boolean);
    return {
      sourceType: 'event',
      provider: 'ticketmaster',
      providerId: String(event?.id || ''),
      title: event?.name || 'Untitled event',
      subtitle: [localDate, venueName, city].filter(Boolean).join(' · '),
      image: ticketmasterImage(event?.images || []),
      description: event?.info || event?.pleaseNote || '',
      eventDate: localDate,
      eventTime: localTime,
      startDateTime: event?.dates?.start?.dateTime || '',
      timezone: event?.dates?.timezone || venue?.timezone || '',
      venueName,
      city,
      region,
      countryCode: venue?.country?.countryCode || '',
      address: [venue?.address?.line1, city, region].filter(Boolean).join(', '),
      ticketUrl: event?.url || '',
      salesStart: event?.sales?.public?.startDateTime || '',
      salesEnd: event?.sales?.public?.endDateTime || '',
      status: event?.dates?.status?.code || '',
      classifications: [segment, genre, subGenre].filter(value => value && value !== 'Undefined'),
      attractions,
      attractionDetails,
      priceRange: Number.isFinite(Number(price?.min)) || Number.isFinite(Number(price?.max)) ? {
        min: Number(price?.min || 0),
        max: Number(price?.max || 0),
        currency: price?.currency || ''
      } : null,
      raw: event
    };
  }

  function ticketmasterLocationParams(settings, options = {}) {
    const city = String(options.city ?? settings.homeCity ?? '').trim();
    const countryCode = String(options.countryCode ?? settings.homeCountry ?? settings.tmdbWatchRegion ?? 'CA').trim().toUpperCase();
    const geoPoint = String(options.geoPoint || '').trim();
    const params = {};
    if (geoPoint) params.geoPoint = geoPoint;
    else if (city) params.city = city;
    if (countryCode) params.countryCode = countryCode;
    return params;
  }

  async function searchTicketmasterEvents(query, settings, options = {}) {
    const key = required(settings.ticketmasterKey, 'Ticketmaster API key');
    const params = new URLSearchParams({
      apikey: key,
      size: String(Math.min(50, Math.max(1, Number(options.size || 20)))),
      page: String(Math.max(0, Number(options.page || 0))),
      sort: options.sort || 'date,asc',
      startDateTime: options.startDateTime || ticketmasterDateTime()
    });
    if (options.endDateTime) params.set('endDateTime', String(options.endDateTime));
    const keyword = String(query || '').trim();
    if (keyword) params.set('keyword', keyword);
    for (const [name, value] of Object.entries(ticketmasterLocationParams(settings, options))) params.set(name, value);
    const classificationNames = Array.isArray(options.classificationNames)
      ? options.classificationNames
      : (options.classificationName ? [options.classificationName] : []);
    for (const classificationName of classificationNames.map(value => String(value || '').trim()).filter(Boolean)) {
      params.append('classificationName', classificationName);
    }
    if (options.attractionId) params.set('attractionId', String(options.attractionId));
    if (options.venueId) params.set('venueId', String(options.venueId));
    if (options.radius) params.set('radius', String(options.radius));
    if (options.unit) params.set('unit', String(options.unit));
    const data = await fetchTicketmasterJson(`${TICKETMASTER_ROOT}/events.json?${params.toString()}`);
    return (data?._embedded?.events || []).map(mapTicketmasterEvent);
  }

  async function searchTicketmasterAttractions(query, settings, options = {}) {
    const key = required(settings.ticketmasterKey, 'Ticketmaster API key');
    const params = new URLSearchParams({
      apikey: key,
      size: String(Math.min(50, Math.max(1, Number(options.size || 20)))),
      page: String(Math.max(0, Number(options.page || 0))),
      sort: options.sort || 'relevance,desc'
    });
    const keyword = String(query || '').trim();
    if (keyword) params.set('keyword', keyword);
    const classificationNames = Array.isArray(options.classificationNames)
      ? options.classificationNames
      : (options.classificationName ? [options.classificationName] : []);
    for (const classificationName of classificationNames.map(value => String(value || '').trim()).filter(Boolean)) {
      params.append('classificationName', classificationName);
    }
    if (options.preferredCountry) params.set('preferredCountry', String(options.preferredCountry).toLowerCase());
    const data = await fetchTicketmasterJson(`${TICKETMASTER_ROOT}/attractions.json?${params.toString()}`);
    return (data?._embedded?.attractions || []).map(attraction => {
      const classification = attraction?.classifications?.find(entry => entry?.primary) || attraction?.classifications?.[0] || {};
      return {
        provider: 'ticketmaster',
        providerId: String(attraction?.id || ''),
        title: attraction?.name || 'Unknown artist',
        image: ticketmasterImage(attraction?.images || []),
        classifications: [classification?.segment?.name, classification?.genre?.name, classification?.subGenre?.name]
          .filter(value => value && value !== 'Undefined'),
        raw: attraction
      };
    });
  }

  async function getUpcomingEvents(settings, options = {}) {
    return searchTicketmasterEvents('', settings, options);
  }

  async function getTicketmasterEvent(id, settings) {
    const key = required(settings.ticketmasterKey, 'Ticketmaster API key');
    const data = await fetchTicketmasterJson(`${TICKETMASTER_ROOT}/events/${encodeURIComponent(id)}.json?apikey=${encodeURIComponent(key)}`);
    return mapTicketmasterEvent(data);
  }

  async function searchCatalogue(query, type, settings) {
    if (!query.trim()) return [];
    if (type === 'tv' || type === 'movie') return searchTMDB(query, type, settings);
    if (type === 'book') return searchBooks(query, settings);
    if (type === 'music') return searchMusic(query, settings);
    if (type === 'artist') return searchArtists(query, settings);
    if (type === 'song') return searchSongs(query, settings);
    if (type === 'event') return searchTicketmasterEvents(query, settings);
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
    searchArtists,
    searchSongs,
    getMusicDetails,
    getArtistDetails,
    getSongDetails,
    parsePlaylistId,
    getPlaylist,
    getYouTubeVideo,
    searchTicketmasterEvents,
    searchTicketmasterAttractions,
    getUpcomingEvents,
    getTicketmasterEvent,
    getTrending,
    getTMDBDiscover,
    getTMDBGenres,
    getTMDBKeywordIds,
    getTMDBItemKeywords,
    getBookFeed,
    getTMDBRecommendations,
    getWatchProviderCatalog,
    getWatchProviders,
    getNewBooks,
    getBookRecommendations,
    getBooksByAuthor
  };
})();
