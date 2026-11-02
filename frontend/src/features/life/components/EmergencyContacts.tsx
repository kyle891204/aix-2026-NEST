import { useState } from 'react'
import { COUNTRIES, getCountryName } from '../../../shared/data/countries'
import { useDemoProfile } from '../../profile/demo-profile-context'
import {
  EMERGENCY_CONTACTS,
  EMERGENCY_CONTACTS_SOURCE,
  FOREIGN_MISSIONS_DIRECTORY_URL,
  lookupConsularContacts,
  telephoneHref,
} from '../data/emergency-contacts'
import '../emergency-contacts.css'

export function EmergencyContacts() {
  const { savedProfile, storageError } = useDemoProfile()
  const [selectedCountry, setSelectedCountry] = useState('')
  const savedNationality = savedProfile?.personalizedConsent
    ? savedProfile.profile.nationality
    : ''
  const savedLookup = lookupConsularContacts(savedNationality)
  const needsCountry =
    savedLookup.status === 'missing' || savedLookup.status === 'invalid'
  const lookup = needsCountry
    ? lookupConsularContacts(selectedCountry)
    : savedLookup

  return (
    <div className="emergency-contacts">
      <p className="emergency-contacts-intro">
        한국에서 도움이 필요할 때 연락할 수 있는 번호입니다.
      </p>

      <section aria-labelledby="korea-emergency-title">
        <h3 id="korea-emergency-title">한국 긴급전화</h3>
        <ul className="emergency-phone-list">
          {EMERGENCY_CONTACTS.map((contact) => (
            <li key={contact.id}>
              <a
                className="emergency-phone-card"
                href={telephoneHref(contact.phone)}
                aria-label={`${contact.name} ${contact.phone} 전화 앱 열기`}
              >
                <span>
                  <strong>{contact.name}</strong>
                  <span className="emergency-phone-description">
                    {contact.description}
                  </span>
                </span>
                <span className="emergency-phone-number">{contact.phone}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="emergency-contact-meta">
          소방과 구급은 같은 119를 사용합니다. 번호를 누르면 기기의 전화
          기능으로 연결됩니다.
        </p>
        <a
          className="emergency-source-link"
          href={EMERGENCY_CONTACTS_SOURCE.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          행정안전부 공식 안내 (새 창)
        </a>
      </section>

      <section
        className="emergency-consular-section"
        aria-labelledby="consular-title"
      >
        <h3 id="consular-title">내 국적의 주한 대사관·영사관</h3>

        {storageError && <p role="status">{storageError}</p>}

        {needsCountry ? (
          <div className="emergency-country-picker">
            <p>
              {savedLookup.status === 'invalid'
                ? '저장된 국적을 국가 코드로 확인할 수 없습니다. 아래에서 국가를 선택해 주세요.'
                : '저장된 국적이 없습니다. 아래에서 국가를 선택하면 공관 연락처를 볼 수 있어요.'}
            </p>
            <label>
              <span>연락처를 확인할 국가</span>
              <select
                value={selectedCountry}
                onChange={(event) => setSelectedCountry(event.target.value)}
              >
                <option value="">국가 선택</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="emergency-contact-meta">
              이 화면에서만 사용하며 회원정보에는 저장하지 않습니다.
            </p>
          </div>
        ) : (
          <p className="emergency-saved-country">
            회원가입 국적:{' '}
            <strong>{getCountryName(savedLookup.countryCode ?? '')}</strong>
          </p>
        )}

        <div aria-live="polite" aria-atomic="true">
          {lookup.countryCode && (
            <p className="emergency-country-heading">
              {getCountryName(lookup.countryCode)} 공관 안내
            </p>
          )}

          {lookup.status === 'available' && (
            <ul className="emergency-consular-list">
              {lookup.contacts.map((contact) => (
                <li key={contact.id} className="emergency-consular-card">
                  <h4>{contact.name}</h4>
                  <p className="emergency-contact-meta">
                    소재지: {contact.city}
                  </p>
                  <dl className="emergency-consular-phones">
                    <div>
                      <dt>{contact.phoneLabel}</dt>
                      <dd>
                        {contact.phone ? (
                          <a href={telephoneHref(contact.phone)}>
                            {contact.phone}
                          </a>
                        ) : (
                          <span>
                            주소록에 전화번호가 없어 확인이 필요합니다.
                          </span>
                        )}
                      </dd>
                    </div>
                    {contact.emergencyPhone && (
                      <div>
                        <dt>
                          {contact.emergencyPhone === contact.phone
                            ? '업무시간 외 긴급 지원 · 같은 번호'
                            : '긴급 지원·핫라인'}
                        </dt>
                        <dd>
                          <a href={telephoneHref(contact.emergencyPhone)}>
                            {contact.emergencyPhone}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                  {contact.emergencyNote && (
                    <p className="emergency-contact-note">
                      {contact.emergencyNote}
                    </p>
                  )}
                  {contact.note && (
                    <p className="emergency-contact-meta">{contact.note}</p>
                  )}
                  <a
                    className="emergency-source-link"
                    href={contact.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    공식 연락처 출처 (새 창)
                  </a>
                  <p className="emergency-contact-meta">
                    자료 확인일: {contact.verifiedAt}
                    {contact.sourceUpdatedAt &&
                      ` · 외교부 수정일: ${contact.sourceUpdatedAt}`}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {lookup.status === 'domestic' && (
            <p>
              대한민국 국적자는 한국 내 긴급상황에서 위의 112·119를 이용해
              주세요. 이 화면의 주한 외국공관 안내 대상은 아닙니다.
            </p>
          )}

          {lookup.status === 'unavailable' && (
            <p>
              현재 등록한 외교부 주한공관 주소록에서 이 국가·지역의 연락처를
              찾지 못했습니다. 비상주 공관이나 대표부가 담당할 수 있으니 해당
              국가 외교부의 대한민국 담당 공관 안내를 확인해 주세요.
            </p>
          )}
        </div>

        <p className="emergency-contact-meta">
          대표·상담 번호와 긴급 지원 번호는 용도가 다릅니다. 관할지역과
          업무시간은 공관의 공식 안내를 확인해 주세요.
        </p>
        <a
          className="emergency-source-link"
          href={FOREIGN_MISSIONS_DIRECTORY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          외교부 주한공관주소록 (새 창)
        </a>
      </section>
    </div>
  )
}
