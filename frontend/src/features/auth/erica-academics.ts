interface College {
  id: string
  name: string
  departments: string[]
}

export const ERICA_SCHOOL = {
  id: 'hanyang-erica',
  name: '한양대학교 ERICA',
}

export const ERICA_COLLEGES: College[] = [
  {
    id: 'engineering',
    name: '공학대학',
    departments: [
      '건축학부',
      '건설환경공학과',
      '교통·물류공학과',
      '전자공학부',
      '재료화학공학과',
      '배터리소재화학공학과',
      '기계공학과',
      '산업경영공학과',
      '로봇공학과',
      '에너지바이오학과',
      '해양융합공학과',
      '융합시스템공학과',
      '스마트융합공학부',
    ],
  },
  {
    id: 'computing',
    name: '소프트웨어융합대학',
    departments: [
      '컴퓨터학부',
      'ICT융합학부',
      '인공지능학과',
      '수리데이터사이언스학과',
    ],
  },
  {
    id: 'advanced-convergence',
    name: '첨단융합대학',
    departments: [
      '차세대반도체융합공학부',
      '바이오신약융합학부',
      '국방지능정보융합공학부',
    ],
  },
  {
    id: 'pharmacy',
    name: '약학대학',
    departments: ['약학과'],
  },
  {
    id: 'global-culture-commerce',
    name: '글로벌문화통상대학',
    departments: [
      '글로벌문화통상학부',
      '한국언어문학과',
      '중국학과',
      '일본학과',
      '영미언어문화학과',
      '프랑스학과',
    ],
  },
  {
    id: 'communication-culture',
    name: '커뮤니케이션&컬처대학',
    departments: [
      '광고홍보학과',
      '미디어학과',
      '문화인류학과',
      '문화콘텐츠학과',
    ],
  },
  {
    id: 'business-economics',
    name: '경상대학',
    departments: ['경제학부', '경영학부', '보험계리학과', '회계세무학과'],
  },
  {
    id: 'design',
    name: '디자인대학',
    departments: [
      '주얼리·패션디자인학과',
      '산업디자인학과',
      '커뮤니케이션디자인학과',
      '영상디자인학과',
      '융합디자인학부',
    ],
  },
  {
    id: 'sports-arts',
    name: '예체능대학',
    departments: ['스포츠과학부', '무용예술학과', '실용음악학과'],
  },
  {
    id: 'lions',
    name: 'LIONS칼리지',
    departments: [
      'LIONS자율전공학부(전계열)',
      'LIONS자율전공학부(자연계열)',
      'LIONS자율전공학부(인문사회계열)',
    ],
  },
]
