// Isolated diagnostic project; this is not part of the frontend's /api proxy.
// The destination is fixed so this endpoint cannot be used as an arbitrary URL proxy.
const schoolUrl = 'https://atc.hanyang.ac.kr/front/community/undergraduate'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).end()
  }

  const started = Date.now()
  const environment = {
    region: process.env.VERCEL_REGION ?? 'unknown',
    nodeVersion: process.version,
  }
  try {
    const upstream = await fetch(schoolUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NEST-ERICA-student-project)',
      },
      signal: AbortSignal.timeout(45_000),
    })
    const html = await upstream.text()
    return response.status(200).json({
      ...environment,
      reached: true,
      ok: upstream.ok,
      status: upstream.status,
      finalUrl: upstream.url,
      contentType: upstream.headers.get('content-type'),
      elapsedMs: Date.now() - started,
      title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim(),
      characters: html.length,
    })
  } catch (error) {
    return response.status(200).json({
      ...environment,
      reached: false,
      elapsedMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
      cause: error?.cause?.code ?? error?.cause?.message,
    })
  }
}
