import type { DashboardProfile } from './api.ts'

// 회원가입 선택 목록(SignupProfilePage)의 한글 값을 대시보드 판별 코드로 바꾼다.
// 석박사통합은 대응 코드가 없어 대학원 공지 판별에 가장 가까운 박사과정으로 본다.
const DEGREE_CODES: Record<string, string> = {
  학사: 'BACHELOR',
  석사: 'MASTER',
  박사: 'DOCTORAL',
  석박사통합: 'DOCTORAL',
}

interface SignupValues {
  nationality: string
  degree: string
  year: string
}

// "2학년" → "2", "5학년 이상" → "5". 읽을 수 없으면 null로 보내 서버가 값 없음으로 판별한다.
function yearCode(value: string) {
  const match = /^([1-6])학년/.exec(value)
  return match ? match[1] : null
}

// 비자는 프로필에서 입력받지 않으므로 항상 null이다. 국적은 이미 ISO 국가 코드로 저장된다.
export function toDashboardProfile(
  profile: SignupValues | null,
): DashboardProfile {
  return {
    nationality: profile?.nationality || null,
    visaType: null,
    degree: (profile && DEGREE_CODES[profile.degree]) ?? null,
    year: profile ? yearCode(profile.year) : null,
  }
}
