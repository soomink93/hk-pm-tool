# HK PM Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PoC `company_dashboard.html`을 Next.js 16 + Prisma(Supabase) + Auth.js 기반의 실제 사내 운영 도구로 재구성한다.

**Architecture:** App Router 서버 컴포넌트에서 Prisma로 데이터를 읽고, 클라이언트 컴포넌트가 폼/모달을 담당한다. 모든 쓰기는 리소스별 Route Handler를 거치며 세션 역할로 권한을 강제한다. 인증은 Auth.js Credentials(JWT) + bcrypt.

**Tech Stack:** Next.js 16.2.9 (App Router, TS), React 19, Tailwind v4, Prisma 7.8 (Supabase Postgres), Auth.js 5(beta) + bcryptjs, lucide-react, Pretendard, pnpm 11.9, Vitest(순수 로직 테스트).

## Global Constraints

- 패키지 매니저는 **pnpm** 고정. node/pnpm 작업은 **Bash 툴**로 실행(PATH shim 구성됨). 절대경로 `C:\Users\c\Desktop\hk-pm-tool`.
- 역할 enum: `chairman` | `executive` | `teamlead`. 팀 상태 enum: `green` | `yellow` | `red` | `gray`.
- 권한 매트릭스(스펙 6장) 그대로: KPI 추가/수정/삭제=executive만, 결정 추가/수정=executive(회장 읽기전용), 에스컬레이션 추가=executive+teamlead, 사용자/팀 관리=chairman+executive, teamlead는 KPI/주간보고에서 본인 팀만.
- 모든 권한은 **서버(Route Handler/서버액션)** 에서 강제. UI 노출 제어는 보조 수단.
- 디자인: 네이비 `#1F3864` + 액센트 `#2E75B6` + 슬레이트 그레이, 차분한 상태색, 1px 보더, 라운드 6–8px, 절제된 그림자. 보라 그라데이션/글래스/네온/UI 이모지 금지(이모지→lucide 아이콘).
- 비밀번호는 항상 bcrypt 해시로 저장. 평문 저장/로그 금지.
- UI 동작 명세의 출처: `company_dashboard.html`(라인 참조). 동일 라벨/상태/뱃지 규칙 유지.
- 한국어 UI. `.env`는 커밋 금지.

---

## File Structure

```
src/
  lib/
    prisma.ts            # PrismaClient 싱글톤
    rbac.ts              # 역할/권한 순수 함수 (테스트 대상)
    auth.ts              # Auth.js 설정(공유 config + handlers)
    constants.ts         # statusLabel/badge, prioLabel, 탭 정의 등 PoC 상수 이식
  types/
    next-auth.d.ts       # 세션에 role/team 타입 확장
  middleware.ts          # (dashboard) 보호
  app/
    layout.tsx           # 루트(폰트/메타)
    globals.css          # Tailwind v4 + 디자인 토큰
    (auth)/login/page.tsx
    (dashboard)/
      layout.tsx         # 헤더 + 역할별 탭 내비
      overview/page.tsx
      brief/page.tsx
      kpi/page.tsx
      decisions/page.tsx
      escalation/page.tsx
      settings/page.tsx
    api/
      auth/[...nextauth]/route.ts
      kpis/route.ts            kpis/[id]/route.ts
      decisions/route.ts       decisions/[id]/route.ts
      escalations/route.ts     escalations/[id]/route.ts
      teams/route.ts           teams/[id]/route.ts
      briefs/route.ts
      users/route.ts           users/[id]/route.ts
      account/password/route.ts
  components/
    ui/                  # Badge, Card, Button, Modal, StatusBadge 등 공용
    dashboard/           # 화면별 클라이언트 컴포넌트(폼/모달/차트)
prisma/
  schema.prisma
  seed.ts
```

---

## Phase 0 — 설정 & 디자인 토큰

### Task 0.1: Vitest + 기본 lib 설정

**Files:**
- Create: `vitest.config.ts`, `src/lib/prisma.ts`, `src/lib/constants.ts`
- Modify: `package.json`(scripts)

**Interfaces:**
- Produces: `prisma` (PrismaClient 싱글톤), `STATUS_LABEL`/`STATUS_BADGE`/`PRIO_LABEL`/`PRIO_CLASS`/`TABS` 상수.

- [ ] **Step 1: Vitest 설치**

Bash: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm add -D vitest`

- [ ] **Step 2: `vitest.config.ts` 작성**

```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

- [ ] **Step 3: `package.json`에 test 스크립트 추가**

`"test": "vitest run"`, `"test:watch": "vitest"`, `"db:seed": "prisma db seed"` 추가.

- [ ] **Step 4: Prisma 클라이언트 싱글톤 (`src/lib/prisma.ts`)**

```ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: 상수 이식 (`src/lib/constants.ts`)**

PoC `company_dashboard.html:370-373`의 `statusLabel/statusBadge/prioLabel/prioClass`와 `:343-350`의 탭 정의를 TS 상수로 옮긴다(라벨/색 동일).

```ts
export const STATUS_LABEL = { green:'정상 진행', yellow:'지연 위험', red:'지연 중', gray:'미제출' } as const
export const STATUS_BADGE = { green:'badge-green', yellow:'badge-yellow', red:'badge-red', gray:'badge-gray' } as const
export const PRIO_LABEL = { high:'높음', mid:'중간', low:'낮음' } as const
export const TABS = [
  { id:'overview',   label:'전체 현황',    roles:['chairman','executive','teamlead'] },
  { id:'brief',      label:'주간 보고',    roles:['chairman','executive','teamlead'] },
  { id:'kpi',        label:'KPI',          roles:['chairman','executive','teamlead'] },
  { id:'decisions',  label:'결정 로그',     roles:['chairman','executive'] },
  { id:'escalation', label:'에스컬레이션', roles:['chairman','executive','teamlead'] },
  { id:'settings',   label:'설정',         roles:['chairman','executive','teamlead'] },
] as const
```

- [ ] **Step 6: Commit**

Bash: `git add -A && git commit -m "chore: add vitest, prisma client, shared constants"`

### Task 0.2: 디자인 토큰 & 전역 스타일

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1: Pretendard 웹폰트 + CSS 변수**

`globals.css`에 Pretendard `@import`(jsdelivr dynamic-subset) 추가하고 디자인 토큰을 `@theme`/`:root`로 정의: `--navy:#1F3864; --accent:#2E75B6; --slate:#…` 및 badge 유틸(`.badge-green` 등 PoC `:57-61` 색 그대로).

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
@import "tailwindcss";
@theme {
  --color-navy: #1F3864;
  --color-accent: #2E75B6;
}
:root { --background:#F0F2F5; --foreground:#1a1a2e; }
body { font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif; background:var(--background); color:var(--foreground); }
/* badge 유틸: PoC :57-61 색 그대로 */
.badge { @apply inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold; }
.badge-green{background:#E2EFDA;color:#375623}.badge-yellow{background:#FFF2CC;color:#7F6000}
.badge-red{background:#FCE4D6;color:#C00000}.badge-blue{background:#DDEEFF;color:#1F3864}.badge-gray{background:#F2F2F2;color:#666}
```

- [ ] **Step 2: 루트 레이아웃 lang/메타**

`layout.tsx`의 `<html lang="ko">`, `metadata.title='HK 운영 대시보드'`로 수정.

- [ ] **Step 3: 빌드 확인 & Commit**

Bash: `pnpm exec tsc --noEmit` (에러 없음) → `git add -A && git commit -m "style: design tokens, Pretendard, ko locale"`

---

## Phase 1 — 데이터 계층 (Prisma)

### Task 1.1: Prisma 스키마 & 마이그레이션

**Files:**
- Create: `prisma/schema.prisma`

**Interfaces:**
- Produces: 모델 `User Team Kpi Decision Escalation Brief`, enum `Role TeamStatus`.

- [ ] **Step 1: `schema.prisma` 작성**

```prisma
generator client { provider = "prisma-client-js" }
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role { chairman executive teamlead }
enum TeamStatus { green yellow red gray }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         Role
  team         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
model Team {
  id         String     @id @default(cuid())
  name       String     @unique
  lead       String
  status     TeamStatus @default(gray)
  submitted  Boolean    @default(false)
  risk       String     @default("없음")
  escalation String     @default("없음")
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}
model Kpi {
  id        String   @id @default(cuid())
  team      String
  metric    String
  target    Float
  current   Float
  unit      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model Decision {
  id        String   @id @default(cuid())
  date      String
  content   String
  tier      String
  decider   String
  priority  String
  status    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model Escalation {
  id        String   @id @default(cuid())
  item      String
  tier      String
  dept      String
  needed    String
  deadline  String
  status    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model Brief {
  id          String   @id @default(cuid())
  team        String
  week        String
  completed   String
  nextGoal    String
  risk        String
  escalation  String
  status      String
  submittedAt String
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: `.env` 존재 확인**

`DATABASE_URL`/`DIRECT_URL`이 `.env`에 있어야 함(사용자 제공). 없으면 중단하고 사용자에게 요청.

- [ ] **Step 3: 첫 마이그레이션**

Bash: `pnpm exec prisma migrate dev --name init`
Expected: `prisma/migrations/*/migration.sql` 생성, 테이블 6개 + enum 생성, `@prisma/client` 재생성.

- [ ] **Step 4: Commit**

Bash: `git add prisma/schema.prisma prisma/migrations && git commit -m "feat(db): prisma schema and initial migration"`

### Task 1.2: 시드 스크립트

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`(prisma.seed 설정)

- [ ] **Step 1: tsx 설치 + seed 등록**

Bash: `pnpm add -D tsx`
`package.json`에 추가: `"prisma": { "seed": "tsx prisma/seed.ts" }`

- [ ] **Step 2: `prisma/seed.ts` 작성**

PoC `DEFAULT_STATE`(`company_dashboard.html:259-296`)를 그대로 시드. 사용자 비번은 bcrypt 해시. 이메일은 PoC에 없으므로 규칙 생성: `{roman}@hk.test` 또는 임시 — 실제 회사 이메일은 시드 후 설정에서 교체 가능하게. 초기 매핑은 아래.

```ts
import { PrismaClient, Role, TeamStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()
const hash = (pw: string) => bcrypt.hashSync(pw, 10)

async function main() {
  const users = [
    { email:'chairman@hk.test', name:'회장님',    role:Role.chairman,  team:null,        pw:'chairman123' },
    { email:'sales.exec@hk.test', name:'영업임원', role:Role.executive, team:'영업부문',   pw:'exec123' },
    { email:'mkt.exec@hk.test', name:'마케팅임원', role:Role.executive, team:'마케팅부문', pw:'exec123' },
    { email:'minjun.kim@hk.test', name:'김민준',   role:Role.teamlead,  team:'영업팀',     pw:'lead123' },
    { email:'seoyeon.lee@hk.test', name:'이서연',  role:Role.teamlead,  team:'마케팅팀',   pw:'lead123' },
    { email:'jiho.park@hk.test', name:'박지호',    role:Role.teamlead,  team:'인사팀',     pw:'lead123' },
    { email:'sua.choi@hk.test', name:'최수아',     role:Role.teamlead,  team:'재무팀',     pw:'lead123' },
    { email:'taeyang.jung@hk.test', name:'정태양', role:Role.teamlead,  team:'운영팀',     pw:'lead123' },
  ]
  for (const u of users)
    await prisma.user.upsert({ where:{ email:u.email }, update:{},
      create:{ email:u.email, name:u.name, role:u.role, team:u.team, passwordHash:hash(u.pw) } })

  const teams = [
    { name:'영업팀',  lead:'김민준', status:TeamStatus.green,  submitted:true,  risk:'없음', escalation:'없음' },
    { name:'마케팅팀',lead:'이서연', status:TeamStatus.yellow, submitted:true,  risk:'Q2 캠페인 일정 지연 위험', escalation:'없음' },
    { name:'인사팀',  lead:'박지호', status:TeamStatus.gray,   submitted:false, risk:'—', escalation:'—' },
    { name:'재무팀',  lead:'최수아', status:TeamStatus.red,    submitted:true,  risk:'Q2 예산 초과 가능성', escalation:'하반기 예산 재편성 승인 필요' },
    { name:'운영팀',  lead:'정태양', status:TeamStatus.green,  submitted:true,  risk:'없음', escalation:'없음' },
  ]
  for (const t of teams)
    await prisma.team.upsert({ where:{ name:t.name }, update:{}, create:t })

  // kpis / decisions / escalations: PoC :277-294 값 그대로 createMany (중복 방지 위해 count 0일 때만)
  if (await prisma.kpi.count() === 0) await prisma.kpi.createMany({ data:[
    { team:'영업팀', metric:'월 매출 목표', target:100, current:92, unit:'%' },
    { team:'마케팅팀', metric:'리드 획득 수', target:200, current:134, unit:'건' },
    { team:'인사팀', metric:'채용 목표', target:10, current:7, unit:'명' },
    { team:'재무팀', metric:'비용 절감률', target:15, current:8, unit:'%' },
    { team:'운영팀', metric:'프로세스 개선', target:5, current:5, unit:'건' },
  ]})
  if (await prisma.decision.count() === 0) await prisma.decision.createMany({ data:[
    { date:'2026-05-30', content:'하반기 채용 계획 확정', tier:'2단계', decider:'인사 임원', priority:'high', status:'완료' },
    { date:'2026-05-28', content:'신규 마케팅 채널 예산 배정', tier:'2단계', decider:'마케팅 임원', priority:'mid', status:'완료' },
    { date:'2026-05-26', content:'Q2 영업 목표 하향 조정', tier:'3단계', decider:'회장님', priority:'high', status:'완료' },
    { date:'2026-06-02', content:'파트너사 계약 갱신 조건 결정', tier:'2단계', decider:'영업 임원', priority:'mid', status:'진행중' },
  ]})
  if (await prisma.escalation.count() === 0) await prisma.escalation.createMany({ data:[
    { item:'하반기 예산 재편성', tier:'3단계', dept:'재무팀', needed:'전체 하반기 예산 15% 재배분 승인', deadline:'2026-06-20', status:'대기중' },
    { item:'신규 사업 파트너십 체결', tier:'3단계', dept:'영업팀', needed:'전략적 파트너십 계약 최종 승인', deadline:'2026-06-25', status:'대기중' },
    { item:'조직 구조 개편안', tier:'3단계', dept:'인사팀', needed:'팀 신설 및 인원 재배치 승인', deadline:'2026-07-01', status:'검토중' },
  ]})
}
main().finally(() => prisma.$disconnect())
```

- [ ] **Step 3: 시드 실행 & 검증**

Bash: `pnpm db:seed` → `pnpm exec prisma studio`(브라우저에서 데이터 확인) 또는 `pnpm exec prisma db execute`로 count 확인.
Expected: users 8, teams 5, kpis 5, decisions 4, escalations 3.

- [ ] **Step 4: Commit**

Bash: `git add prisma/seed.ts package.json && git commit -m "feat(db): seed initial data with bcrypt-hashed passwords"`

---

## Phase 2 — RBAC 순수 로직 (TDD)

### Task 2.1: 권한 함수

**Files:**
- Create: `src/lib/rbac.ts`, `src/lib/rbac.test.ts`

**Interfaces:**
- Produces:
  - `type Role = 'chairman'|'executive'|'teamlead'`
  - `can(role: Role, action: Action): boolean` — Action 유니온: `'kpi:write'|'decision:write'|'escalation:write'|'user:manage'|'decision:view'`
  - `visibleTabs(role: Role): string[]`

- [ ] **Step 1: 실패 테스트 작성 (`src/lib/rbac.test.ts`)**

```ts
import { describe, it, expect } from 'vitest'
import { can, visibleTabs } from './rbac'

describe('can', () => {
  it('executive can write kpi, others cannot', () => {
    expect(can('executive','kpi:write')).toBe(true)
    expect(can('chairman','kpi:write')).toBe(false)
    expect(can('teamlead','kpi:write')).toBe(false)
  })
  it('decision:write executive only; chairman read-only', () => {
    expect(can('executive','decision:write')).toBe(true)
    expect(can('chairman','decision:write')).toBe(false)
  })
  it('escalation:write executive and teamlead', () => {
    expect(can('executive','escalation:write')).toBe(true)
    expect(can('teamlead','escalation:write')).toBe(true)
    expect(can('chairman','escalation:write')).toBe(false)
  })
  it('user:manage chairman and executive', () => {
    expect(can('chairman','user:manage')).toBe(true)
    expect(can('executive','user:manage')).toBe(true)
    expect(can('teamlead','user:manage')).toBe(false)
  })
})
describe('visibleTabs', () => {
  it('teamlead has no decisions tab', () => {
    expect(visibleTabs('teamlead')).not.toContain('decisions')
    expect(visibleTabs('chairman')).toContain('decisions')
  })
})
```

- [ ] **Step 2: 실패 확인** — Bash: `pnpm test` → FAIL (모듈 없음)

- [ ] **Step 3: 구현 (`src/lib/rbac.ts`)**

```ts
import { TABS } from './constants'
export type Role = 'chairman'|'executive'|'teamlead'
export type Action = 'kpi:write'|'decision:write'|'escalation:write'|'user:manage'|'decision:view'
const MATRIX: Record<Action, Role[]> = {
  'kpi:write':        ['executive'],
  'decision:write':   ['executive'],
  'decision:view':    ['chairman','executive'],
  'escalation:write': ['executive','teamlead'],
  'user:manage':      ['chairman','executive'],
}
export const can = (role: Role, action: Action) => MATRIX[action].includes(role)
export const visibleTabs = (role: Role) =>
  TABS.filter(t => (t.roles as readonly string[]).includes(role)).map(t => t.id)
```

- [ ] **Step 4: 통과 확인** — Bash: `pnpm test` → PASS

- [ ] **Step 5: Commit** — `git add src/lib/rbac.* && git commit -m "feat(rbac): role permission matrix with tests"`

---

## Phase 3 — 인증 (Auth.js)

### Task 3.1: Auth.js 설정 + 세션 타입

**Files:**
- Create: `src/lib/auth.ts`, `src/types/next-auth.d.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`
- Create: `.env`에 `AUTH_SECRET`(생성)

**Interfaces:**
- Produces: `auth`, `signIn`, `signOut`, `handlers` (from `src/lib/auth.ts`). 세션 `user.id/role/team`.

- [ ] **Step 1: AUTH_SECRET 생성** — Bash: `pnpm dlx auth secret` (또는 `.env`에 `AUTH_SECRET=$(openssl rand -base64 32)` 추가)

- [ ] **Step 2: Auth 설정 (`src/lib/auth.ts`)**

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (c) => {
        const email = String(c.email ?? '').trim().toLowerCase()
        const password = String(c.password ?? '')
        if (!email || !password) return null
        const u = await prisma.user.findUnique({ where: { email } })
        if (!u || !bcrypt.compareSync(password, u.passwordHash)) return null
        return { id: u.id, name: u.name, email: u.email, role: u.role, team: u.team ?? '' }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.role = (user as any).role; token.team = (user as any).team; token.uid = user.id }
      return token
    },
    session({ session, token }) {
      session.user.id = token.uid as string
      ;(session.user as any).role = token.role
      ;(session.user as any).team = token.team
      return session
    },
  },
})
```

- [ ] **Step 3: 세션 타입 확장 (`src/types/next-auth.d.ts`)**

```ts
import { Role } from '@/lib/rbac'
declare module 'next-auth' {
  interface Session { user: { id: string; name?: string|null; email?: string|null; role: Role; team: string } }
}
declare module 'next-auth/jwt' {
  interface JWT { uid?: string; role?: Role; team?: string }
}
```

- [ ] **Step 4: Route handler (`src/app/api/auth/[...nextauth]/route.ts`)**

```ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 5: 미들웨어 (`src/middleware.ts`)**

```ts
import { auth } from '@/lib/auth'
export default auth((req) => {
  const isAuthed = !!req.auth
  const onLogin = req.nextUrl.pathname.startsWith('/login')
  if (!isAuthed && !onLogin) return Response.redirect(new URL('/login', req.nextUrl))
  if (isAuthed && onLogin) return Response.redirect(new URL('/overview', req.nextUrl))
})
export const config = { matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'] }
```

- [ ] **Step 6: 타입체크 & Commit** — `pnpm exec tsc --noEmit` → `git add -A && git commit -m "feat(auth): credentials auth, jwt session, route guard"`

### Task 3.2: 로그인 화면

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/components/dashboard/LoginForm.tsx`

- [ ] **Step 1: LoginForm 클라이언트 컴포넌트**

PoC 로그인 박스(`:136-162`) 디자인을 Tailwind로 재현. `signIn('credentials',{ email, password, redirect:false })` 호출, 실패 시 "이메일 또는 비밀번호가 올바르지 않습니다." 표시, 성공 시 `/overview`로 push. 초기 계정 힌트는 개발 중에만 표시(주석 처리 토글).

- [ ] **Step 2: 로그인 페이지에서 LoginForm 렌더**

- [ ] **Step 3: 실제 로그인 검증 (수동)**

Bash: `pnpm dev`(백그라운드) → 브라우저에서 `chairman@hk.test`/`chairman123` 로그인 → `/overview` 진입 확인, 오답 시 에러 확인. (DB·.env 필요)

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(auth): login screen"`

---

## Phase 4 — 앱 셸 (레이아웃/헤더/탭)

### Task 4.1: 공용 UI 컴포넌트

**Files:**
- Create: `src/components/ui/{Card,Badge,StatusBadge,Button,Modal}.tsx`

- [ ] **Step 1:** PoC의 `.card/.badge/.btn/.modal` 스타일을 Tailwind 컴포넌트로 작성. `StatusBadge`는 `STATUS_LABEL/STATUS_BADGE` 사용. `Modal`은 overlay 클릭 닫기 + ESC 지원.
- [ ] **Step 2:** 타입체크 → Commit `feat(ui): shared card/badge/button/modal`

### Task 4.2: 대시보드 레이아웃 + 역할별 탭

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`, `src/components/dashboard/{Header,TabNav,LogoutButton}.tsx`

**Interfaces:**
- Consumes: `auth()` 세션, `visibleTabs(role)`.

- [ ] **Step 1:** `layout.tsx`(서버)에서 `const session = await auth()`로 사용자/역할을 얻어 Header + TabNav 렌더. 헤더: 회사명, 역할 칩(PoC `:32-35` 색), 이름 뱃지, 로그아웃. TabNav는 `visibleTabs`로 필터, 현재 경로 active 표시(`usePathname`).
- [ ] **Step 2:** LogoutButton: `signOut({ redirectTo:'/login' })`.
- [ ] **Step 3:** 수동 확인 — 역할별 로그인 시 탭 노출 차이(예: teamlead는 결정 로그 탭 없음).
- [ ] **Step 4:** Commit `feat(shell): dashboard layout, header, role-based tabs`

---

## Phase 5 — 읽기 화면 + GET API

> 각 화면은 서버 컴포넌트에서 Prisma로 직접 조회(읽기). GET API는 추후 클라이언트 갱신/외부용으로 함께 만든다. 권한 범위(예: teamlead 본인 팀만)는 서버 컴포넌트와 API 양쪽에서 적용.

### Task 5.1: 전체 현황(overview)

**Files:**
- Create: `src/app/(dashboard)/overview/page.tsx`, `src/components/dashboard/OverviewChart.tsx`

- [ ] **Step 1:** PoC `renderOverview()`(`:392-412`) 로직 이식 — 카드 4개(보고 제출률, 정상 팀 수, 오픈 에스컬레이션, 이번 주 결정 완료), 팀별 상태 테이블, 오픈 에스컬레이션 테이블. 데이터는 `prisma.team/escalation/decision` 조회. `isUrgent` 헬퍼는 `lib`로.
- [ ] **Step 2(개선):** 오버뷰 요약 차트 추가 — 팀 상태 분포 도넛 또는 KPI 달성률 막대(클라이언트 컴포넌트, 경량). 데이터 없으면 빈 상태 문구.
- [ ] **Step 3:** 수동 확인 후 Commit `feat(overview): summary cards, tables, chart`

### Task 5.2: KPI 화면 + GET

**Files:**
- Create: `src/app/(dashboard)/kpi/page.tsx`, `src/components/dashboard/KpiChart.tsx`, `src/app/api/kpis/route.ts`

- [ ] **Step 1:** `GET /api/kpis` — 세션 확인. teamlead면 본인 팀 KPI만, 그 외 전체. 정렬 후 JSON.
- [ ] **Step 2:** 화면: PoC `renderKPI()`(`:495-519`) 이식 — 달성률 바 목록, 팀별 달성률 막대 차트, 테이블. `pct=min(100,round(current/target*100))`, 색 기준 `>=90 green / >=60 yellow / else red` 그대로. teamlead는 본인 팀만.
- [ ] **Step 3:** 수동 확인 후 Commit `feat(kpi): list, chart, table, GET api`

### Task 5.3: 결정 로그(decisions) + GET

**Files:**
- Create: `src/app/(dashboard)/decisions/page.tsx`, `src/app/api/decisions/route.ts`

- [ ] **Step 1:** 라우트 가드 — teamlead 접근 차단(탭 없음 + 페이지에서 세션 역할 검사해 `notFound()`/리다이렉트).
- [ ] **Step 2:** `GET /api/decisions`(chairman/executive). 화면: PoC `renderDecisions()`(`:522-533`) 이식 — 최신순, tier 뱃지, 우선순위 색(`PRIO_CLASS`), 상태 뱃지.
- [ ] **Step 3:** Commit `feat(decisions): table view, GET api, teamlead guard`

### Task 5.4: 에스컬레이션(escalation) + GET

**Files:**
- Create: `src/app/(dashboard)/escalation/page.tsx`, `src/app/api/escalations/route.ts`

- [ ] **Step 1:** `GET /api/escalations`(전체 역할). 화면: PoC `renderEscalation()`(`:536-555`) 이식 — 카드 3개(오픈/긴급7일/완료), 테이블, 기한 임박 강조(`isUrgent`).
- [ ] **Step 2:** Commit `feat(escalation): cards, table, GET api`

---

## Phase 6 — 쓰기 기능 (폼/모달 + POST/PATCH/DELETE + 권한)

> 공통 패턴: 클라이언트 모달 폼 → `fetch('/api/<res>', {method})` → 성공 시 `router.refresh()`. 각 핸들러는 `auth()` + `can()`로 권한 강제. 권한 없으면 403.

### Task 6.1: KPI 쓰기 (executive)

**Files:**
- Create: `src/app/api/kpis/[id]/route.ts`, `src/components/dashboard/KpiModal.tsx`
- Modify: `src/app/api/kpis/route.ts`(POST), `kpi/page.tsx`(버튼/모달 연결)

- [ ] **Step 1:** `POST /api/kpis`(executive만, 아니면 403). body: `{team,metric,target,current,unit}`. `PATCH/DELETE /api/kpis/[id]` 동일 권한.
- [ ] **Step 2:** KpiModal — PoC `openModal('kpi')` 폼(`:605-611`) 재현. 추가/수정 공용. 삭제는 확인 후 DELETE.
- [ ] **Step 3:** UI 노출은 executive만(`can('executive','kpi:write')`), 서버에서도 재검증.
- [ ] **Step 4:** 수동 확인(executive 추가/수정/삭제 OK, teamlead 버튼 없음 & API 403) → Commit `feat(kpi): create/update/delete with RBAC`

### Task 6.2: 결정 쓰기 (executive)

**Files:**
- Create: `src/app/api/decisions/[id]/route.ts`, `src/components/dashboard/DecisionModal.tsx`
- Modify: `decisions/route.ts`(POST), `decisions/page.tsx`

- [ ] **Step 1:** POST/PATCH/DELETE — executive만(회장 읽기전용 → 403). 폼: PoC `:612-619` 재현.
- [ ] **Step 2:** 수동 확인 → Commit `feat(decisions): CRUD with RBAC (chairman read-only)`

### Task 6.3: 에스컬레이션 쓰기 (executive + teamlead)

**Files:**
- Create: `src/app/api/escalations/[id]/route.ts`, `src/components/dashboard/EscalationModal.tsx`
- Modify: `escalations/route.ts`(POST), `escalation/page.tsx`

- [ ] **Step 1:** POST/PATCH/DELETE — `can(role,'escalation:write')`. 폼: PoC `:620-627`.
- [ ] **Step 2:** 수동 확인 → Commit `feat(escalation): CRUD with RBAC`

### Task 6.4: 주간 보고(brief)

**Files:**
- Create: `src/app/(dashboard)/brief/page.tsx`, `src/components/dashboard/BriefForm.tsx`, `src/components/dashboard/TeamEditModal.tsx`, `src/app/api/briefs/route.ts`
- Modify: `src/app/api/teams/route.ts`(POST), `src/app/api/teams/[id]/route.ts`

- [ ] **Step 1:** teamlead 화면: PoC `renderBrief()` teamlead 분기(`:420-448`) 이식 — 입력 폼 + 이전 제출 기록. `POST /api/briefs`가 brief 생성 + 해당 팀 status/risk/escalation/submitted 갱신(PoC `submitBrief()` `:474-492`). 본인 팀만.
- [ ] **Step 2:** chairman/executive 화면: PoC `:449-471` 이식 — 회장은 읽기전용 배너, 임원은 팀 카드 편집(TeamEditModal → `PATCH /api/teams/[id]`).
- [ ] **Step 3:** 수동 확인(팀장 제출 → 임원/회장 화면 반영) → Commit `feat(brief): teamlead submit + exec/chairman views`

### Task 6.5: 설정(settings) — 사용자/팀 관리 + 비번 변경

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`, `src/components/dashboard/{UserModal,TeamModal,PasswordForm}.tsx`, `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts`, `src/app/api/account/password/route.ts`

- [ ] **Step 1:** 사용자 관리(chairman/executive): 목록 + 추가(이메일/이름/역할/팀/초기비번 → 서버에서 bcrypt 해시) + 삭제(본인 제외). `POST/DELETE /api/users`. 이메일 중복 검사.
- [ ] **Step 2:** 팀 관리(chairman/executive): 추가/수정/삭제. `POST/PATCH/DELETE /api/teams`.
- [ ] **Step 3:** 비번 변경(전 역할 본인): `POST /api/account/password` — 현재 비번 bcrypt 검증 후 새 해시 저장. PoC `changePassword()`(`:580-592`) 규칙.
- [ ] **Step 4:** 수동 확인(권한별 노출/403, 비번 변경 후 재로그인) → Commit `feat(settings): user/team management, password change`

---

## Phase 7 — 마무리 & 배포

### Task 7.1: 빌드/배포 설정

- [ ] **Step 1:** `package.json` build에 prisma generate 포함: `"build": "prisma generate && next build"`, `"postinstall": "prisma generate"`.
- [ ] **Step 2:** 전체 검증 — Bash: `pnpm test && pnpm exec tsc --noEmit && pnpm build` 모두 통과.
- [ ] **Step 3:** README에 환경변수(`DATABASE_URL/DIRECT_URL/AUTH_SECRET/AUTH_URL`)와 셋업/시드 절차 정리.
- [ ] **Step 4:** Commit `chore: build config + deploy docs` → push → Vercel 자동 배포 확인(환경변수는 사용자가 Vercel에 입력). 배포 후 프로덕션 마이그레이션: `prisma migrate deploy`(Vercel 빌드 또는 수동).

---

## Self-Review 메모

- 스펙 6장 권한 매트릭스 → Phase 2(rbac) + Phase 6 각 핸들러에서 강제. ✓
- 스펙 5장 6모델 → Task 1.1. ✓
- 스펙 8장 6화면 → Phase 4–6. ✓
- 개선 5종(서버공유/bcrypt/타임스탬프/로딩·빈상태/오버뷰차트) → 모델 createdAt·updatedAt(1.1), bcrypt(1.2/3.1/6.5), 빈상태(5.x), 차트(5.1). ✓
- 비목표(이메일발송/SSO/자유가입/감사로그) → 미포함. ✓
- 선행 의존: Phase 1/3은 `.env`(Supabase) 필요. 없으면 Task 1.1 Step2에서 중단·사용자 요청.
