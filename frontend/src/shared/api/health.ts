import { requestJson } from './client'

export interface HealthResponse {
  status: 'UP'
  service: string
  timestamp: string
}

export async function getHealth(signal: AbortSignal): Promise<HealthResponse> {
  const result = await requestJson('/health', { signal })
  if (
    typeof result !== 'object' ||
    result === null ||
    !('status' in result) ||
    result.status !== 'UP' ||
    !('service' in result) ||
    typeof result.service !== 'string' ||
    !('timestamp' in result) ||
    typeof result.timestamp !== 'string'
  )
    throw new Error('백엔드 응답 형식이 올바르지 않습니다.')
  return result as HealthResponse
}
