// 주요 시설 15곳의 이름·주소 번역. 카카오 장소 ID로 찾는다.
// 고정 데이터라 네트워크·기계번역 호출 없이 쓴다. 한국어는 원본 필드를 쓴다.
// 도로명은 택시·길찾기에 그대로 쓸 수 있게 로마자(영어), 행정구역은 한자(중국어)로 적었다.
// "주변 전체" 실시간 검색 결과에는 이 표가 없어 원문(한국어)으로 보인다.
import type { Language } from '../../../shared/types/language'

interface FacilityText {
  name: string
  address: string
}

type Translated = Record<'en' | 'zh', FacilityText>

const FACILITY_TEXT: Record<string, Translated> = {
  // 병원
  '2136499907': {
    en: {
      name: 'Ansan Top Internal Medicine Clinic',
      address:
        '#201–204, 2F, Xi Center Plaza, 26 Haeyang 4-ro, Sangnok-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: '安山塔内科诊所',
      address:
        '京畿道安山市常绿区 Haeyang 4-ro 26号 Xi Center Plaza 2层201~204室',
    },
  },
  '9529282': {
    en: {
      name: 'The Best Internal Medicine Clinic',
      address:
        '2F, Building A, Rodeo Town, 154 Gwangdeok-daero, Danwon-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'The Best内科诊所',
      address: '京畿道安山市檀园区 Gwangdeok-daero 154号 Rodeo Town A栋2层',
    },
  },
  '10587528': {
    en: {
      name: 'Uridul Family Clinic',
      address:
        '2F, Jaeyeon Building, 81 Minsokgongwon-ro, Danwon-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'Uridul家庭诊所',
      address: '京畿道安山市檀园区 Minsokgongwon-ro 81号 Jaeyeon大厦2层',
    },
  },
  '11269833': {
    en: {
      name: 'Danwon Hospital',
      address: '20 Wonpogongwon 1-ro, Danwon-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: '檀园医院',
      address: '京畿道安山市檀园区 Wonpogongwon 1-ro 20号',
    },
  },
  '8650979': {
    en: {
      name: 'Korea University Ansan Hospital',
      address: '123 Jeokgeum-ro, Danwon-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: '高丽大学安山医院',
      address: '京畿道安山市檀园区 Jeokgeum-ro 123号',
    },
  },
  // 마트
  '330651576': {
    en: {
      name: 'GS The Fresh Hanyang Univ. ERICA Branch',
      address: '1F, 44 Hanyangdaehak-ro, Sangnok-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'GS The Fresh 汉阳大学ERICA店',
      address: '京畿道安山市常绿区 Hanyangdaehak-ro 44号 1层',
    },
  },
  '1473543266': {
    en: {
      name: 'GS The Fresh Ansan Grand City Xi Branch',
      address:
        '#113–114, Life Building, Grand City Xi Avenue, 776 Haean-ro, Sangnok-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'GS The Fresh 安山Grand City Xi店',
      address:
        '京畿道安山市常绿区 Haean-ro 776号 Grand City Xi Avenue Life栋113~114室',
    },
  },
  '1173619358': {
    en: {
      name: 'GS The Fresh Ansan Lake Park Branch',
      address:
        '#102–105, 1F, Neighborhood Facility, 44 Gwangdeokseo-ro, Danwon-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'GS The Fresh 安山湖水公园店',
      address:
        '京畿道安山市檀园区 Gwangdeokseo-ro 44号 近邻生活设施1层102~105室',
    },
  },
  '1455497367': {
    en: {
      name: 'No Brand Ansan Gojan Branch',
      address: '1F, 156 Gwangdeok 2-ro, Danwon-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'No Brand 安山Gojan店',
      address: '京畿道安山市檀园区 Gwangdeok 2-ro 156号 1层',
    },
  },
  '152529382': {
    en: {
      name: 'No Brand Ansan Idong Branch',
      address: '#101, 1F, 23 Jungbo-ro, Sangnok-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'No Brand 安山Idong店',
      address: '京畿道安山市常绿区 Jungbo-ro 23号 1层101室',
    },
  },
  // 약국
  '351590598': {
    en: {
      name: 'Hanyang Bom Pharmacy',
      address: '1F, 51 Hanyangdaehak-ro, Sangnok-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: '汉阳Bom药局',
      address: '京畿道安山市常绿区 Hanyangdaehak-ro 51号 1层',
    },
  },
  '1569231578': {
    en: {
      name: 'Ildeung Onnuri Pharmacy',
      address: '1F, 162 Seokho-ro, Sangnok-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: '一等Onnuri药局',
      address: '京畿道安山市常绿区 Seokho-ro 162号 1层',
    },
  },
  '310989385': {
    en: {
      name: 'Gukhui Pharmacy',
      address: '164 Seokho-ro, Sangnok-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'Gukhui药局',
      address: '京畿道安山市常绿区 Seokho-ro 164号',
    },
  },
  '11295166': {
    en: {
      name: 'Hana Pharmacy',
      address:
        '#211, 2F, Commercial Building 1, 15 Haeyang 1-ro, Sangnok-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'Hana药局',
      address: '京畿道安山市常绿区 Haeyang 1-ro 15号 商铺1栋2层211室',
    },
  },
  '1757810191': {
    en: {
      name: 'Gojan Aneun Pharmacy',
      address:
        '#112–113, 1F, Golden Ace Plaza, 138 Gwangdeok-daero, Danwon-gu, Ansan-si, Gyeonggi-do',
    },
    zh: {
      name: 'Gojan Aneun药局',
      address:
        '京畿道安山市檀园区 Gwangdeok-daero 138号 Golden Ace Plaza 1层112~113室',
    },
  },
}

// 번역이 없으면(주변 전체의 실시간 결과 등) 한국어 원문을 그대로 돌려준다.
export function facilityName(
  facility: { id: string; name: string },
  language: Language,
): string {
  if (language === 'ko') return facility.name
  return FACILITY_TEXT[facility.id]?.[language]?.name ?? facility.name
}

export function facilityAddress(
  facility: { id: string; roadAddress: string },
  language: Language,
): string {
  if (language === 'ko') return facility.roadAddress
  return FACILITY_TEXT[facility.id]?.[language]?.address ?? facility.roadAddress
}

export const TRANSLATED_FACILITY_IDS = Object.keys(FACILITY_TEXT)
