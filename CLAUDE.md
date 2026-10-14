# hk-pm-tool — 작업 지침

HK(에이치케이) 사내 운영 대시보드. Next.js 16(App Router, RSC) · Prisma 7 + Supabase Postgres · Auth.js v5 · Tailwind. `main` push → Vercel 자동 배포.

## 유지보수 원칙 (필수) — "문제 생기면 그 부분만 떼어낼 수 있게"

앞으로 모든 세션에서 코드를 수정할 때, 나중에 문제가 생기면 **그 변경만 부분적으로(partial) 되돌리거나 고칠 수 있도록** 격리해서 작업한다.

- **가산적·격리적으로 얹기.** 잘 돌아가는 기존 코드를 재작성하지 말고, 새 prop·옵션·플래그·컴포넌트·함수로 **얹는다**. 그래야 문제 시 그 한 부분만 끄거나 되돌려도 나머지가 멀쩡하다.
  - 예: 작업 보드에 지연 필터를 넣을 때 기존 필터 로직을 고치지 않고 `initialOverdue` prop + `overdueOnly` 상태만 추가.
- **한 커밋 = 한 기능/수정.** 되돌리기 단위가 곧 커밋 단위. 서로 무관한 변경을 한 커밋에 섞지 않는다. 커밋 메시지에 무엇을·왜를 남긴다.
- **공유 로직은 단일 지점에서만 수정.** 같은 규칙을 호출부마다 복붙하지 말고 함수·상수 한 곳(`src/lib/*`)에서 고쳐 모든 호출부에 반영되게 한다. (예: `canDecideTier` 한 곳 수정 → API·UI 동시 적용)
- **DB 변경은 분리된 마이그레이션으로.** 손으로 쓴 `prisma/migrations/<ts>_<name>/migration.sql` + `prisma migrate deploy`. 컬럼 추가는 `DEFAULT`로 안전하게, 되돌릴 수 있는 단위로.
- **비자명한 로직엔 런타임 체크 하나.** 분기·루프·날짜/금액/권한 로직은 작은 `*.test.ts`(vitest) 하나를 남긴다.

## 검증 (푸시 전)

- `pnpm exec tsc --noEmit` 와 `pnpm build` 통과 확인.
- 로직 테스트가 있으면 `pnpm exec vitest run <path>`.
- DB 점검 스크립트는 `.superpowers/sdd/`(gitignore)에서 `pnpm exec tsx --env-file=.env <path>`로 돌리고, 끝나면 지운다.

## 커밋/배포

- 사용자가 요청할 때만 커밋·푸시. 배포는 `main` 푸시로 이뤄지므로, 라이브에 올리는 변경은 반드시 빌드 통과 후 푸시.
