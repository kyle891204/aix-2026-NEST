// Always call the same-origin Vite/Vercel proxy so the HttpOnly session cookie is sent.
const API_BASE_URL = '/api/v1'
const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

let csrfToken: string | null = null

// Kept in memory only. Updated whenever the auth session is read or revoked.
export function setCsrfToken(token: string | null) {
  csrfToken = token
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  readonly upstreamStatus: number | null

  constructor(
    status: number,
    message = `API 요청 실패 (${status})`,
    code: string | null = null,
    upstreamStatus: number | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.upstreamStatus = upstreamStatus
  }
}

export async function requestJson(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const method = (options.method ?? 'GET').toUpperCase()
  if (csrfToken && CSRF_METHODS.has(method) && !headers.has('X-CSRF-Token'))
    headers.set('X-CSRF-Token', csrfToken)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : `API 요청 실패 (${response.status})`
    const code =
      typeof body === 'object' &&
      body !== null &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : null
    const upstreamStatus =
      typeof body === 'object' &&
      body !== null &&
      'upstreamStatus' in body &&
      typeof body.upstreamStatus === 'number'
        ? body.upstreamStatus
        : null
    throw new ApiError(response.status, message, code, upstreamStatus)
  }
  return response.json() as Promise<unknown>
}
