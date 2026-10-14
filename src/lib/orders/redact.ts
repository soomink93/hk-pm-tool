// AI 전송 전 민감정보 마스킹 (서버에서 실행). 금액은 절대 외부로 나가지 않게 과잉 마스킹 쪽으로 설계.
// ponytail: 정규식 기반 — 양식이 특이하면 놓칠 수 있음. 그래서 전송 전 미리보기로 사람이 확인/수정한다.

const MONEY_WORDS = /금액|단가|합계|총액|공급가|부가세|부가가치세|VAT|계약금|중도금|잔금|대금|견적가|매출|원가|price|amount|total/i
const ACCOUNT_WORDS = /계좌|account/i

const RULES: [RegExp, string][] = [
  // 개인정보
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[이메일]'],
  [/\b\d{6}-?[1-4]\d{6}\b/g, '[주민번호]'],
  [/\b\d{3}-\d{2}-\d{5}\b/g, '[사업자번호]'],
  [/\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, '[전화]'],
  // 금액: 통화기호 / 통화단위 / 한글 금액 / 백만 이상 콤마 숫자
  [/[₩$€¥£]\s?\d[\d,.]*/g, '[금액]'],
  [/\b(?:KRW|USD|EUR|JPY|CNY|RMB)\s?\d[\d,.]*/gi, '[금액]'],
  [/\d[\d,.]*\s?(?:원|천원|만원|백만원|천만원|억원|억|만|KRW|USD|EUR|JPY|CNY|달러|엔|유로|위안)(?![가-힣A-Za-z])/g, '[금액]'],
  [/금?\s?[일이삼사오육칠팔구십백천만억조]+\s?원정?/g, '[금액]'],
  [/\b\d{1,3}(?:,\d{3}){2,}(?:\.\d+)?\b/g, '[금액]'],
]

// "(단위: 천원)" 같은 표 머리가 있으면 행마다 단위가 안 붙으므로 콤마 숫자 전부 금액 취급
const UNIT_HEADER = /단위\s*[:：]?\s*(?:원|천원|만원|백만원|억원|KRW|USD|\$)/i

export function redact(text: string): { text: string; count: number } {
  let count = 0
  const rules: [RegExp, string][] = UNIT_HEADER.test(text) ? [...RULES, [/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, '[금액]']] : RULES
  const out = text
    .split('\n')
    .map((line) => {
      // 금액/계좌 관련 줄은 숫자 전부 마스킹 (표 형태 "공급가액 : 120,000" 대응)
      if (MONEY_WORDS.test(line) || ACCOUNT_WORDS.test(line)) {
        return line.replace(/\d[\d,.\-]*/g, () => (count++, '[금액]'))
      }
      return rules.reduce((l, [re, token]) => l.replace(re, () => (count++, token)), line)
    })
    .join('\n')
  return { text: out, count }
}
