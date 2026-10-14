const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(
  /\/$/,
  '',
)

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message = `API 요청 실패 (${status})`) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function requestJson(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
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
    throw new ApiError(response.status, message)
  }
  return response.json() as Promise<unknown>
}
