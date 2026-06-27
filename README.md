# HK 운영 대시보드 (hk-pm-tool)

사내 운영 현황을 역할별로 공유하는 대시보드. 전체현황 · 주간보고 · KPI · 결정로그 · 에스컬레이션 · 설정 6개 화면을 제공한다.

## 기술 스택

- **Next.js 16** (App Router, TypeScript) / React 19
- **Tailwind CSS v4** + Pretendard + lucide-react
- **Prisma 7** (driver adapter `@prisma/adapter-pg`) → **Supabase (Postgres)**
- **Auth.js v5** (Credentials) + bcryptjs
- **pnpm** / 배포: **Vercel**

## 역할 & 권한

| 기능 | 회장(chairman) | 임원(executive) | 팀장(teamlead) |
|---|---|---|---|
| 전체현황 / 에스컬레이션 보기 | ✓ | ✓ | ✓ |
| 주간보고 | 읽기전용 | 팀 현황 편집 | 본인 팀 작성 |
| KPI 보기 | ✓ | ✓ | 본인 팀만 |
| KPI 추가/수정/삭제 | ✗ | ✓ | ✗ |
| 결정로그 | 보기 | 보기+편집 | 접근 불가 |
| 에스컬레이션 작성 | ✗ | ✓ | ✓ |
| 사용자/팀 관리 | ✓ | ✓ | ✗ |

권한은 모든 API 라우트 핸들러에서 서버 측으로 강제된다(`src/lib/api-guard.ts` + `src/lib/rbac.ts`).

## 환경 변수 (`.env`)

| 키 | 설명 |
|---|---|
| `DATABASE_URL` | Supabase **Transaction pooler**(6543, `?pgbouncer=true`) — 런타임 |
| `DIRECT_URL` | Supabase **Session pooler**(5432) — 마이그레이션 |
| `AUTH_SECRET` | Auth.js 세션 서명 키 (`pnpm dlx auth secret`로 생성) |
| `AUTH_URL` | 프로덕션 도메인 (Vercel, 예: `https://hk-pm-tool.vercel.app`) |

`.env.example` 참고. Supabase **Connect → ORMs → Prisma** 에서 `DATABASE_URL`/`DIRECT_URL`을 복사한다.

## 로컬 실행

```bash
pnpm install
pnpm exec prisma migrate dev   # 스키마 → DB 반영
pnpm db:seed                   # 초기 데이터 + 계정 시드
pnpm dev                       # http://localhost:3000
```

### 시드 계정 (초기 비밀번호)

| 이메일 | 역할 | 비밀번호 |
|---|---|---|
| chairman@hk.test | 회장 | chairman123 |
| sales.exec@hk.test | 임원 | exec123 |
| minjun.kim@hk.test | 팀장(영업팀) | lead123 |

> 운영 전환 시 설정 화면에서 실제 회사 이메일 계정을 등록하고 시드 계정은 삭제할 것.

## 배포 (Vercel)

1. GitHub 저장소를 Vercel 프로젝트에 연결.
2. 환경 변수 `DATABASE_URL` `DIRECT_URL` `AUTH_SECRET` `AUTH_URL` 등록(Production/Preview/Development).
3. 빌드는 `prisma generate && next build`(package.json에 포함). 마이그레이션은 최초 1회 로컬에서 `prisma migrate deploy` 또는 빌드 단계에 추가.

## 검증

```bash
pnpm test            # RBAC 단위 테스트 (vitest)
pnpm exec tsc --noEmit
pnpm build
```

## 구조

- `src/app/(auth)/login` — 로그인
- `src/app/(dashboard)/*` — 6개 화면 (서버 컴포넌트 조회 → 클라이언트 Manager가 폼/모달)
- `src/app/api/*` — 리소스별 Route Handler (세션+권한 검사 후 Prisma)
- `src/lib/` — `prisma` / `auth` / `auth.config`(엣지) / `rbac` / `api-guard` / `constants` / `helpers`
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma.config.ts`

설계·구현 문서: `docs/superpowers/specs/`, `docs/superpowers/plans/`.
