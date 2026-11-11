import { ApiError } from '../../shared/api/client.ts'

const authMessages: Record<string, string> = {
  AUTH_NOT_CONFIGURED: 'Google 로그인이 준비중입니다.',
  AUTH_PROVIDER_UNAVAILABLE:
    'Google 인증을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  AUTH_INVALID_CREDENTIAL:
    '인증이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.',
  AUTH_CHALLENGE_EXPIRED: '로그인 시간이 지났습니다. 다시 시도해 주세요.',
  AUTH_CSRF_INVALID: '로그인 화면을 새로 불러온 뒤 다시 시도해 주세요.',
  AUTH_REQUIRED: '로그인이 필요합니다.',
}

export function authErrorMessage(error: unknown) {
  if (error instanceof ApiError)
    return (
      authMessages[error.code ?? ''] ??
      '로그인 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    )
  return '로그인 서버에 연결하지 못했습니다. 서버가 깨어나는 데 약 1분이 걸릴 수 있습니다. 잠시 후 다시 시도해 주세요.'
}
