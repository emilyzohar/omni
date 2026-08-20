const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const edgeRuntime = globalThis as typeof globalThis & {
  Deno: {
    serve: (handler: (req: Request) => Response | Promise<Response>) => unknown
  }
}

edgeRuntime.Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    let body: LetterboxdRequestBody = {}
    try {
      body = (await req.json()) as LetterboxdRequestBody
    } catch {
      return jsonResponse({ error: 'Request body must be valid JSON.' }, 400)
    }

    const username = cleanUsername(body.username)
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
})