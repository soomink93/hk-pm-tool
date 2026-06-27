# HK PM Tool — 설계 문서

- 작성일: 2026-06-27
- 상태: 승인됨 (브레인스토밍 완료)
- 저장소: https://github.com/soomink93/hk-pm-tool.git

## 1. 배경

기존 `company_dashboard.html`은 단일 HTML 파일로 만든 PoC다. 모든 데이터를
브라우저 `localStorage`에 저장하고, 비밀번호를 평문으로 비교하며, 사용자 간
데이터 공유가 불가능하다. 이를 실제 사내 운영 도구로 끌어올리기 위해
서버 DB·실제 인증·역할 기반 권한을 갖춘 Next.js 애플리케이션으로 재구성한다.

## 2. 목표 / 비목표

### 목표 (v1)
- PoC의 6개 화면을 그대로 이식: 전체현황 · 주간보고 · KPI · 결정로그 · 에스컬레이션 · 설정
- 역할 3종(chairman/executive/teamlead)과 PoC의 권한 규칙 유지
- 서버 DB(Supabase Postgres)에 데이터 저장 — 다중 사용자 공유
- 회사 이메일 + 비밀번호 로그인, 비밀번호 bcrypt 해시
- 관리자(회장/임원)가 설정 화면에서 사용자 직접 등록
- Vercel 배포
- 소폭 개선: created/updated 타임스탬프, 로딩·빈 상태 처리, 오버뷰 요약 차트

### 비목표 (v1 제외)
- 이메일 발송(초대/비밀번호 재설정 SMTP) — 관리자 직접 등록으로 대체
- 소셜 로그인 / SSO
- 자유 회원가입
- 실시간 협업, 알림, 파일 업로드
- 감사 로그(변경 이력) — 향후 단계

## 3. 기술 스택

| 항목 | 선택 | 버전(설치 시점) |
|---|---|---|
| 프레임워크 | Next.js (App Router, TypeScript) | 16.2.9 |
| 런타임 | React | 19.2.4 |
| 스타일 | Tailwind CSS v4 | 4.x |
| 폰트 | Pretendard (한글 가독성) | 웹폰트 |
| 아이콘 | lucide-react | 1.21.0 |
| DB | Supabase (Postgres) | — |
| ORM | Prisma (Query Compiler) | 7.8.0 |
| 인증 | Auth.js (next-auth) Credentials + bcryptjs | next-auth 5.0.0-beta, bcryptjs 3.x |
| 패키지 매니저 | pnpm | 11.9.0 |
| 배포 | Vercel | — |

> 비고: 브레인스토밍 당시 Next 15를 가정했으나 `create-next-app` 최신이
> Next 16.2.9를 설치하여 16으로 확정. Auth.js는 App Router/React 19를 지원하는
> v5(beta)를 사용한다.

## 4. 디자인 방향 ("AI스럽지 않게")

- 배제: 보라색 그라데이션, 글래스모피즘, 네온, 과도한 이모지
- 채택: 브랜드 네이비(`#1F3864`) + 슬레이트 그레이 + 단일 액센트 블루(`#2E75B6`)
- 차분한 시맨틱 상태색(green/amber/red), 1px 보더, 작은 라운드(6–8px), 절제된 그림자
- UI 이모지(🏢📊✅) → lucide 아이콘으로 교체
- 데이터 밀도 높은 테이블 중심의 실무형 레이아웃

## 5. 데이터 모델 (Prisma 스키마)

PoC의 데이터 구조를 옮기고 각 모델에 `id`(cuid) · `createdAt` · `updatedAt`를 추가한다.

- **User**: `email`(unique) · `name` · `passwordHash` · `role`(enum) · `team`
- **Team**: `name`(unique) · `lead` · `status`(enum) · `submitted` · `risk` · `escalation`
- **Kpi**: `team` · `metric` · `target` · `current` · `unit`
- **Decision**: `date` · `content` · `tier` · `decider` · `priority` · `status`
- **Escalation**: `item` · `tier` · `dept` · `needed` · `deadline` · `status`
- **Brief**: `team` · `week` · `completed` · `nextGoal` · `risk` · `escalation` · `status` · `submittedAt`

Enum: `Role { chairman, executive, teamlead }`, `TeamStatus { green, yellow, red, gray }`.

시드 스크립트(`prisma db seed`)로 PoC 초기 데이터(팀/사용자/KPI/결정/에스컬레이션)를
넣고, 초기 사용자 비밀번호는 bcrypt 해시로 저장한다.

## 6. 인증 / 권한

- Auth.js Credentials provider: 이메일 + 비밀번호 → Prisma로 사용자 조회 →
  `bcrypt.compare` 검증
- 세션 전략: JWT. 토큰/세션에 `id` · `role` · `team` 포함
- `middleware.ts`로 `(dashboard)` 라우트 보호, 미인증 시 `/login` 리다이렉트
- 권한 매트릭스(PoC 규칙 유지):

| 기능 | chairman | executive | teamlead |
|---|---|---|---|
| 전체현황 보기 | ✓ | ✓ | ✓ |
| 주간보고 작성 | (읽기전용) | (팀 현황 편집) | ✓ 본인 팀 |
| KPI 보기 | ✓ | ✓ | ✓ 본인 팀만 |
| KPI 추가/수정/삭제 | ✗ | ✓ | ✗ |
| 결정로그 보기 | ✓ | ✓ | ✗(탭 없음) |
| 결정 추가/수정 | (읽기전용) | ✓ | ✗ |
| 에스컬레이션 추가 | ✗ | ✓ | ✓ |
| 사용자/팀 관리 | ✓ | ✓ | ✗ |

권한은 서버(Route Handler)에서 세션 역할로 강제한다. UI 노출 제어는 보조 수단.

## 7. API 구조 (Route Handlers)

- `app/api/auth/[...nextauth]/route.ts` — Auth.js
- 리소스별 핸들러: `kpis` · `decisions` · `escalations` · `teams` · `briefs` · `users`
  - `GET` 목록 · `POST` 생성 · `PATCH` 수정 · `DELETE` 삭제
  - 각 핸들러는 세션 확인 → 역할 검사 → Prisma 호출
  - 역할에 따라 조회 범위 제한(예: teamlead는 본인 팀 KPI/보고만)

## 8. 화면 구조 (App Router)

```
src/app/
  (auth)/login/page.tsx
  (dashboard)/
    layout.tsx            # 헤더 + 역할별 탭 내비
    overview/page.tsx
    brief/page.tsx
    kpi/page.tsx
    decisions/page.tsx
    escalation/page.tsx
    settings/page.tsx
  api/...
```

- 서버 컴포넌트에서 데이터 조회, 클라이언트 컴포넌트에서 폼/모달 상호작용
- 차트는 클라이언트 컴포넌트(경량 차트 라이브러리 또는 Chart.js 래퍼)

## 9. 환경 변수

- `DATABASE_URL` — Supabase pgBouncer 풀링 URL(런타임)
- `DIRECT_URL` — Supabase 직결 URL(마이그레이션)
- `AUTH_SECRET` — Auth.js 세션 서명 키
- `AUTH_URL` — 배포 도메인(프로덕션)

`.env`는 git 무시, `.env.example`로 키 목록만 커밋.

## 10. 폴더 / 배포

- 프로젝트 루트: `C:\Users\c\Desktop\hk-pm-tool\`
- git origin: `https://github.com/soomink93/hk-pm-tool.git`
- Vercel: GitHub 연동 후 환경변수 주입, `prisma generate`는 빌드에 포함

## 11. 구현 순서(개요)

1. Prisma 스키마 + 마이그레이션 + 시드
2. Auth.js 설정 + 로그인 화면 + 미들웨어
3. 공통 레이아웃(헤더/탭) + 디자인 토큰(Tailwind 테마)
4. 화면별 구현: overview → brief → kpi → decisions → escalation → settings
5. 각 화면 대응 API 핸들러 + 권한 검사
6. Vercel 배포 + 환경변수

세부 구현 계획은 별도 implementation plan 문서에서 단계별로 정의한다.
