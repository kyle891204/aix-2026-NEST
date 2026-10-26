import { ApiError } from '../../shared/api/client'

export function authErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  return '로그인 서버에 연결하지 못했습니다. 서버가 깨어나는 데 약 1분이 걸릴 수 있습니다. 잠시 후 다시 시도해 주세요.'
}
