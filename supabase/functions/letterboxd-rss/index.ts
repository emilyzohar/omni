const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body?.username || '').trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,29}$/i.test(username)) {
      return new Response(JSON.stringify({ error: 'Invalid Letterboxd username.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const response = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`, {
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, */*', 'User-Agent': 'Omni Letterboxd Sync/1.0' }
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Letterboxd returned ${response.status}.` }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const xml = await response.text();
    return new Response(JSON.stringify({ xml }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Letterboxd RSS proxy failed.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
