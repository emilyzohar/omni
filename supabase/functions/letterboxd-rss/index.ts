const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

type LetterboxdRequestBody = {
  username?: unknown
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return 'Letterboxd RSS proxy failed.'
}

function cleanUsername(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/^@/, '').toLowerCase()
    : ''
}

async function requestUsername(req: Request): Promise<string> {
  const url = new URL(req.url)
  if (req.method === 'GET') return cleanUsername(url.searchParams.get('username'))

  if (req.method === 'POST') {
    let body: LetterboxdRequestBody = {}
    try {
      body = (await req.json()) as LetterboxdRequestBody
    } catch {
      return ''
    }
    return cleanUsername(body.username)
  }

  return ''
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const username = await requestUsername(req)
    if (!/^[a-z0-9][a-z0-9_-]{0,29}$/i.test(username)) {
      return jsonResponse({ error: 'Invalid Letterboxd username.' }, 400)
    }

    const feedUrl = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`
    const response = await fetch(feedUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'Omni-Letterboxd-Sync/1.0',
      },
    })

    if (!response.ok) {
      return jsonResponse(
        { error: `Letterboxd returned ${response.status}.` },
        response.status,
      )
    }

    const xml = await response.text()
    if (!xml.trim()) {
      return jsonResponse({ error: 'Letterboxd returned an empty RSS feed.' }, 502)
    }

    return new Response(JSON.stringify({ xml }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error: unknown) {
    console.error('[letterboxd-rss]', error)
    return jsonResponse({ error: errorMessage(error) }, 500)
  }
}

// Supabase Edge Functions accept the standard fetch-handler export. Using this
// form avoids editor errors for the Deno global while remaining deployable by
// the Supabase CLI/runtime.
export default { fetch: handler }
