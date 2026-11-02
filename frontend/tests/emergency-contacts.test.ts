import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  CONSULAR_CONTACTS,
  EMERGENCY_CONTACTS,
  lookupConsularContacts,
  telephoneHref,
} from '../src/features/life/data/emergency-contacts.ts'

test('Korean emergency categories keep separate cards with the correct dial numbers', () => {
  assert.deepEqual(
    EMERGENCY_CONTACTS.map(({ id, phone }) => [id, telephoneHref(phone)]),
    [
      ['fire', 'tel:119'],
      ['police', 'tel:112'],
      ['ambulance', 'tel:119'],
    ],
  )
})

test('a nationality selects only its own missions and tolerates code casing/spacing', () => {
  const china = lookupConsularContacts(' cn ')
  const vietnam = lookupConsularContacts('VN')
  assert.equal(china.status, 'available')
  assert.equal(china.countryCode, 'CN')
  assert.equal(vietnam.status, 'available')
  assert.deepEqual(china.contacts, CONSULAR_CONTACTS.CN)
  assert.deepEqual(vietnam.contacts, CONSULAR_CONTACTS.VN)
  assert.ok(
    china.contacts.every((contact) => !vietnam.contacts.includes(contact)),
  )
})

test('missing and legacy free-text nationalities do not silently choose a country', () => {
  for (const value of [undefined, null, '', '   ']) {
    assert.deepEqual(lookupConsularContacts(value), {
      status: 'missing',
      countryCode: null,
      contacts: [],
    })
  }
  for (const value of [
    '중국',
    'Vietnam',
    'USA',
    'ZZ',
    '__proto__',
    'constructor',
  ]) {
    assert.deepEqual(lookupConsularContacts(value), {
      status: 'invalid',
      countryCode: null,
      contacts: [],
    })
  }
})

test('valid countries without registered contacts and Korea have distinct empty states', () => {
  assert.deepEqual(lookupConsularContacts('AQ'), {
    status: 'unavailable',
    countryCode: 'AQ',
    contacts: [],
  })
  assert.deepEqual(lookupConsularContacts('KR'), {
    status: 'domestic',
    countryCode: 'KR',
    contacts: [],
  })
})

test('switching countries never reuses the previous country contact list', () => {
  const cases = ['CN', '', 'US', 'AQ', 'KR', '베트남', 'VN']
  for (const nationality of cases) {
    const result = lookupConsularContacts(nationality)
    if (result.status === 'available') {
      assert.deepEqual(result.contacts, CONSULAR_CONTACTS[result.countryCode!])
    } else {
      assert.deepEqual(result.contacts, [])
    }
  }
})

test('directory includes countries beyond the initial seven and their regional missions', () => {
  for (const code of [
    'CA',
    'FR',
    'DE',
    'AU',
    'RU',
    'MN',
    'KH',
    'BD',
    'ZA',
    'CD',
    'TR',
  ]) {
    assert.equal(lookupConsularContacts(code).status, 'available', code)
  }
  assert.ok(
    lookupConsularContacts('JP').contacts.some(
      ({ city, phone }) => city === '부산' && phone === '051-465-5104',
    ),
  )
  assert.ok(
    lookupConsularContacts('CN').contacts.some(
      ({ city, phone }) => city === '제주' && phone === '064-900-8830',
    ),
  )
  const philippines = lookupConsularContacts('PH').contacts
  assert.equal(philippines[0].city, '서울')
  assert.equal(philippines.find(({ city }) => city === '부산')?.phone, null)
  assert.equal(lookupConsularContacts('TW').status, 'unavailable')
})

test('registered phone links and source metadata are complete and safe to render', () => {
  const ids = new Set<string>()
  for (const [country, contacts] of Object.entries(CONSULAR_CONTACTS)) {
    assert.equal(lookupConsularContacts(country).status, 'available')
    for (const contact of contacts ?? []) {
      assert.ok(!ids.has(contact.id), `Duplicate contact id: ${contact.id}`)
      ids.add(contact.id)
      assert.ok(contact.name && contact.city && contact.phoneLabel)
      assert.equal(new URL(contact.officialUrl).protocol, 'https:')
      assert.match(contact.verifiedAt, /^\d{4}-\d{2}-\d{2}$/)
      for (const phone of [contact.phone, contact.emergencyPhone].filter(
        Boolean,
      )) {
        assert.match(telephoneHref(phone!), /^tel:\+?\d+$/)
      }
      if (contact.phone) assert.match(contact.phone, /^0\d{1,2}-\d{3,4}-\d{4}$/)
      else assert.ok(contact.phoneOriginal && contact.sourceUpdatedAt)
      if (contact.sourceUpdatedAt)
        assert.match(contact.sourceUpdatedAt, /^\d{4}-\d{2}-\d{2}$/)
      if (contact.emergencyPhone) assert.ok(contact.emergencyNote)
    }
  }
})
