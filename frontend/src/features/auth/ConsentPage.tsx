import './auth.css'

  interface ConsentPageProps {
    basicConsent: boolean
    personalizedConsent: boolean
    onBasicConsentChange: (checked: boolean) => void
    onPersonalizedConsentChange: (checked: boolean) => void
    onNext: () => void
  }

  export function ConsentPage({
                                basicConsent,
                                personalizedConsent,
                                onBasicConsentChange,
                                onPersonalizedConsentChange,
                                onNext,
                              }: ConsentPageProps) {

  const canContinue = basicConsent

  return (
    <div className="auth-shell">
      <main className="auth-content">
        <p className="auth-eyebrow">NEST 회원가입</p>
        <h1>이용에 필요한 내용을 확인해 주세요</h1>

        <p>선택 항목에 동의하지 않아도 가입할 수 있어요.</p>

        <section aria-label="개인정보 수집·이용 동의">
          <div className="consent-item">
            <label className="consent-label">
              <input
                type="checkbox"
                checked={basicConsent}
                onChange={(event) => onBasicConsentChange(event.target.checked)}
              />
              <span>[필수] 기본 개인정보 수집·이용 동의</span>
            </label>

            <details className="consent-details">
              <summary>내용 보기</summary>
              <p>
                회원 식별과 기본 서비스 제공을 위해 Google 계정 식별자, 이메일,
                닉네임, 선호 언어를 수집합니다.
              </p>
              <p>개발용 요약입니다. 최종 동의서 내용은 별도로 연결합니다.</p>
            </details>
          </div>

          <div className="consent-item">
            <label className="consent-label">
              <input
                type="checkbox"
                checked={personalizedConsent}
                onChange={(event) =>
                  onPersonalizedConsentChange(event.target.checked)
                }
              />
              <span>[선택] 맞춤정보 수집·이용 동의</span>
            </label>

            <details className="consent-details">
              <summary>내용 보기</summary>
              <p>
                맞춤 안내를 위해 사용자가 직접 인력한 학교, 단과대학, 학과·학부,
                국적, 학위과정, 학년 정보를 사용합니다.
                동의하지 않아도 기본 기능을 이용할 수 있습니다.
              </p>
              <p>개발용 요약입니다. 최종 동의서 내용은 별도로 연결합니다.</p>
            </details>
          </div>
        </section>

        <p aria-live="polite">
          {canContinue
            ? '다음 단계로 진행할 수 있어요.'
            : '필수 동의 내용을 확인하고 체크해 주세요.'}
        </p>

        <button type="button" disabled={!canContinue} onClick={onNext}>
          다음
        </button>
      </main>
    </div>
  )
}
