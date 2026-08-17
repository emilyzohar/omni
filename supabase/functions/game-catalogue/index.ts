const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

let igdbToken = '';
let igdbTokenExpiresAt = 0;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' }
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function secretConfigured(name) {
  return Boolean(String(Deno.env.get(name) || '').trim());
}

function requiredSecret(name) {
  const value = String(Deno.env.get(name) || '').trim();
  if (!value) throw new Error(`${name} is not configured for the game-catalogue function.`);
  return value;
}

function cleanQuery(value, max = 160) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function escapeApicalypse(value) {
  return cleanQuery(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function getIGDBToken() {
  if (igdbToken && Date.now() < igdbTokenExpiresAt - 60_000) return igdbToken;

  const clientId = requiredSecret('IGDB_CLIENT_ID');
  const clientSecret = requiredSecret('IGDB_CLIENT_SECRET');
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  });
  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params.toString()}`, { method: 'POST' });
  if (!response.ok) throw new Error(`Twitch OAuth failed (${response.status}).`);
  const data = await response.json();
  igdbToken = String(data.access_token || '');
  igdbTokenExpiresAt = Date.now() + Math.max(60, Number(data.expires_in || 0)) * 1000;
  if (!igdbToken) throw new Error('Twitch OAuth did not return an IGDB access token.');
  return igdbToken;
}

async function igdbRequest(body) {
  const clientId = requiredSecret('IGDB_CLIENT_ID');
  const token = await getIGDBToken();
  const response = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'text/plain'
    },
    body
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`IGDB request failed (${response.status})${text ? `: ${text.slice(0, 220)}` : ''}`);
  }
  return response.json();
}

async function handleIGDB(payload) {
  const action = String(payload.action || 'search');
  const fields = 'id,name,summary,storyline,url,first_release_date,total_rating,total_rating_count,rating,rating_count,hypes,cover.image_id,genres.name,platforms.name';
  if (action === 'search') {
    const query = escapeApicalypse(payload.query);
    if (!query) return { results: [] };
    const limit = Math.max(1, Math.min(30, Number(payload.limit || 20)));
    const body = `search "${query}"; fields ${fields}; where version_parent = null; limit ${limit};`;
    return { results: await igdbRequest(body) };
  }
  if (action === 'discover') {
    const mode = ['new','popular','for-you'].includes(String(payload.mode || '')) ? String(payload.mode) : 'for-you';
    const limit = Math.max(1, Math.min(30, Number(payload.limit || 24)));
    const offset = Math.max(0, Math.min(1500, Number(payload.offset || 0)));
    const now = Math.floor(Date.now() / 1000);
    const sixMonths = 183 * 24 * 60 * 60;
    let where = 'version_parent = null & first_release_date > 0';
    let sort = 'sort total_rating_count desc;';
    if (mode === 'new') {
      where += ` & first_release_date >= ${now - sixMonths} & first_release_date <= ${now + sixMonths}`;
      sort = 'sort first_release_date desc;';
    } else if (mode === 'popular') {
      where += ' & total_rating_count > 20';
      sort = 'sort total_rating_count desc;';
    } else {
      where += ' & total_rating_count > 5';
      sort = 'sort total_rating_count desc;';
    }
    const rows = await igdbRequest(`fields ${fields}; where ${where}; ${sort} offset ${offset}; limit ${limit};`);
    return { results: rows || [] };
  }

  if (action === 'details') {
    const id = String(payload.id || '').replace(/\D/g, '');
    if (!id) throw new Error('A numeric IGDB game id is required.');
    const rows = await igdbRequest(`fields ${fields}; where id = ${id}; limit 1;`);
    return { result: rows?.[0] || null };
  }
  throw new Error(`Unsupported IGDB action: ${action}`);
}

async function fetchBGG(url) {
  const token = requiredSecret('BGG_APPLICATION_TOKEN');
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Omni/1.0'
      }
    });
    if (response.ok) return response.text();
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 1) break;
    await sleep(5200);
  }
  const text = await response?.text().catch(() => '');
  throw new Error(`BoardGameGeek request failed (${response?.status || 'unknown'})${text ? `: ${text.slice(0, 220)}` : ''}`);
}

async function handleBGG(payload) {
  const action = String(payload.action || 'search');
  if (action === 'search') {
    const query = cleanQuery(payload.query);
    if (!query) return { xml: '<items total="0" termsofuse=""></items>' };
    const url = new URL('https://boardgamegeek.com/xmlapi2/search');
    url.searchParams.set('query', query);
    url.searchParams.set('type', 'boardgame');
    return { xml: await fetchBGG(url.toString()) };
  }
  if (action === 'hot') {
    const url = new URL('https://boardgamegeek.com/xmlapi2/hot');
    url.searchParams.set('type', 'boardgame');
    return { xml: await fetchBGG(url.toString()) };
  }

  if (action === 'details') {
    const id = String(payload.id || '').replace(/\D/g, '');
    if (!id) throw new Error('A numeric BoardGameGeek id is required.');
    const url = new URL('https://boardgamegeek.com/xmlapi2/thing');
    url.searchParams.set('id', id);
    url.searchParams.set('type', 'boardgame');
    url.searchParams.set('stats', '1');
    return { xml: await fetchBGG(url.toString()) };
  }
  throw new Error(`Unsupported BoardGameGeek action: ${action}`);
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405);

  try {
    const payload = await request.json();
    const provider = String(payload?.provider || '').toLowerCase();
    const action = String(payload?.action || '').toLowerCase();

    // Let the browser verify deployment/runtime configuration without making a
    // provider request. This prevents Discover from repeatedly hitting a broken
    // provider and producing a wall of 500s when a secret was not synced yet.
    if (action === 'health' || provider === 'health') {
      return json({
        ok: true,
        providers: {
          igdb: { configured: secretConfigured('IGDB_CLIENT_ID') && secretConfigured('IGDB_CLIENT_SECRET') },
          bgg: { configured: secretConfigured('BGG_APPLICATION_TOKEN') }
        }
      });
    }

    const body = provider === 'igdb'
      ? await handleIGDB(payload)
      : provider === 'bgg'
        ? await handleBGG(payload)
        : (() => { throw new Error('provider must be igdb or bgg.'); })();
    return json(body);
  } catch (error) {
    console.error('[game-catalogue]', error);
    const message = error?.message || String(error);
    const status = /is not configured/i.test(message) ? 503
      : /required|unsupported|provider must/i.test(message) ? 400
        : /Twitch OAuth|IGDB request|BoardGameGeek request/i.test(message) ? 502
          : 500;
    return json({ error: { message } }, status);
  }
});
