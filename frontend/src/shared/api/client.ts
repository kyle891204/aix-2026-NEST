const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(
  /\/$/,
  '',
)

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
  baseUrl = API_BASE_URL,
): Promise<unknown> {
  const headers = new Headers(options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const response = await fetch(`${baseUrl}${path}`, {
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
