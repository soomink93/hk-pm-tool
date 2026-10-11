// 댓글 본문에서 @이름 멘션 추출 (한글/영문 이름, 2~10자). 줄머리/공백 뒤의 @만 — 이메일 오탐 방지. 중복 제거.
export function parseMentionNames(body: string): string[] {
  const names = [...body.matchAll(/(?<!\S)@([가-힣A-Za-z][가-힣A-Za-z0-9]{1,9})/g)].map((m) => m[1])
  return [...new Set(names)]
}
