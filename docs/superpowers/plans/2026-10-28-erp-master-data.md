# ERP 기준정보(마스터 데이터) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 거래처·품목/모델·BOM 마스터 테이블과 '기준정보' 탭을 추가하고, 기존 수주(Order)를 선택적으로 연결한다.

**Architecture:** 신규 테이블 3종(+담당자 자식)과 Order의 nullable FK 2개를 가산적으로 얹는다. 권한·채번·자동연결·BOM전개는 `src/lib/erp/`의 순수함수(단위테스트)로, 화면은 `src/app/(dashboard)/master/`의 서버컴포넌트+서버액션+클라이언트 컴포넌트로. 기존 수주 폼은 재편하지 않고, 저장 시 입력값이 마스터와 일치하면 FK만 자동 연결한다.

**Tech Stack:** Next.js 16(App Router, RSC, Server Actions) · Prisma 7 + @prisma/adapter-pg · Supabase Postgres · Auth.js v5 · Tailwind · vitest

**Spec:** `docs/superpowers/specs/2026-10-28-erp-mes-master-data-design.md`

## Global Constraints

- 가산적·격리적: 기존 코드 재작성 금지, 새 파일·prop·nullable 컬럼으로 얹기. (CLAUDE.md)
- DB 변경은 수기 마이그레이션 `prisma/migrations/<ts>_<name>/migration.sql` + `pnpm exec prisma migrate deploy` + `pnpm exec prisma generate`. 컬럼 추가는 `DEFAULT`로 안전하게.
- 공유 규칙은 단일 지점(`src/lib/erp/*`)에서만 수정.
- 날짜는 `YYYY-MM-DD` 문자열. **단가·원가 컬럼 없음**(기존 정책).
- 비자명 로직(권한·채번·매칭·BOM전개)엔 vitest `*.test.ts` 하나씩, 노드 환경 순수함수.
- 푸시 전 `pnpm exec tsc --noEmit` + `pnpm build` 통과. UI 문자열은 한국어, sentence 스타일 유지.
- Prisma 접근은 `import { prisma } from '@/lib/prisma'`, 세션은 `import { auth } from '@/lib/auth'`, 이력은 `logAudit(session, action, entity, entityId, summary)`.

## Review Focus

- **거래처 중복**: 같은 사업자등록번호로 2건 등록 시도 → 부분 유니크로 DB 차단, 등록 전 동일 이름 경고. (Task 2 `match` 테스트 + Task 6 액션)
- **자동연결 오매칭**: 동명 거래처/모델이 2건 이상이면 FK를 추측하지 말고 `null`(문자열만). (Task 4 테스트)
- **BOM 순환**: A→B→A 같은 순환 참조에서 전개가 무한루프 안 됨. (Task 5 테스트)
- **참조 중 마스터 삭제**: 수주가 가리키는 거래처/품목은 하드삭제 UI 없음 → 소프트삭제(active=false)만, 링크 유지. (Task 6·7 액션에 하드삭제 미노출)
- **채번 동시성**: 같은 접두로 동시 등록 시 코드 충돌 → `@unique` + 충돌 시 재조회·재시도. (Task 3 테스트 + Task 6 액션)

---

## File Structure

- `prisma/schema.prisma` — enums(`PartnerRole`,`MaterialType`) + models(`BusinessPartner`,`BusinessPartnerContact`,`Material`,`Bom`) + `Order`에 FK 2개
- `prisma/migrations/<ts>_erp_master_data/migration.sql` — 신규 테이블 + Order 컬럼
- `src/lib/erp/perm.ts` (+`perm.test.ts`) — 편집 권한 판정(거래처/품목/BOM)
- `src/lib/erp/code.ts` (+`code.test.ts`) — 코드 채번(임시 포맷, Frame8 샘플 확보 후 조정)
- `src/lib/erp/match.ts` (+`match.test.ts`) — 수주 자동연결 매칭
- `src/lib/erp/bom.ts` (+`bom.test.ts`) — BOM 다단계 전개(순수)
- `src/app/(dashboard)/master/page.tsx` — '기준정보' 탭(서버), 세그먼트 `거래처|품목|BOM`
- `src/app/(dashboard)/master/actions.ts` — 서버 액션(생성/수정/비활성)
- `src/components/dashboard/MasterPartners.tsx` · `MasterMaterials.tsx` · `MasterBom.tsx` — 클라이언트 UI
- `src/lib/constants.ts` — `TABS`에 `master` 추가
- `src/components/dashboard/TabNav.tsx` — `master` 아이콘
- `src/app/(dashboard)/orders/actions.ts` — `createOrder`에 자동연결 1줄(수정)

---

### Task 1: Prisma 스키마 + 마이그레이션

**Files:**
- Modify: `prisma/schema.prisma` (enums + 4 models + Order FK)
- Create: `prisma/migrations/<ts>_erp_master_data/migration.sql`

**Interfaces:**
- Produces: Prisma 모델 `BusinessPartner`,`BusinessPartnerContact`,`Material`,`Bom`; `Order.businessPartnerId?`,`Order.materialId?`. enum `PartnerRole`(customer/supplier/both), `MaterialType`(FG/SEMI/RAW/PART/MERCH). (정의는 스펙 §4 그대로.)

- [ ] **Step 1: 스펙 §4.1~4.4의 enum·model·Order FK를 `schema.prisma`에 추가** (기존 모델·필드 유지). 인덱스: `BusinessPartner @@index([role, active])`, `BusinessPartnerContact @@index([partnerId])`, `Material @@index([type, active])`, `Bom @@unique([parentId, childId]) @@index([parentId])`, `Order` 측 `@@index([businessPartnerId])`,`@@index([materialId])`.
- [ ] **Step 2: 마이그레이션 SQL 작성** — `CREATE TABLE`(partners→contacts→materials→bom 순), `ALTER TABLE "Order" ADD COLUMN "businessPartnerId" TEXT`, `ADD COLUMN "materialId" TEXT`(둘 다 nullable, DEFAULT 불필요), FK 제약(`ON DELETE SET NULL` for Order FK, `CASCADE` contacts, bom.parent `CASCADE`/bom.child `RESTRICT`), `bizRegNo` 부분 유니크: `CREATE UNIQUE INDEX "BusinessPartner_bizRegNo_key" ON "BusinessPartner"("bizRegNo") WHERE "bizRegNo" <> ''`.
- [ ] **Step 3: 적용** — `pnpm exec prisma migrate deploy` 후 `pnpm exec prisma generate`.
- [ ] **Step 4: 검증** — `pnpm exec tsc --noEmit` 통과(Expected: PASS, 신규 모델 타입 생성됨).
- [ ] **Step 5: Commit** — `git commit -m "feat(erp): 거래처·품목·BOM 마스터 테이블 + Order FK"`

---

### Task 2: 편집 권한 — `src/lib/erp/perm.ts`

**Files:**
- Create: `src/lib/erp/perm.ts`, `src/lib/erp/perm.test.ts`

**Interfaces:**
- Consumes: `deptOf`,`isSales`,`type OrderUser`,`type TeamDepts` from `../orders/perm`.
- Produces: `canEditPartner(u, depts): boolean`, `canEditMaterial(u, depts): boolean`, `canEditBom(u, depts): boolean`.

- [ ] **Step 1: 실패 테스트 작성** (`perm.test.ts`, `perm.test.ts`의 `u`/`depts` 헬퍼 패턴 재사용)

```ts
// 거래처=영업+admin, 품목=생산·연구+admin, BOM=연구+admin, 조회는 별도(탭 노출로 처리)
test('canEditPartner: 영업·full editor만', () => {
  expect(canEditPartner(u('teamlead','국내영업팀'), depts)).toBe(true)
  expect(canEditPartner(u('admin',null), depts)).toBe(true)
  expect(canEditPartner(u('teamlead','제품개발팀'), depts)).toBe(false)
})
test('canEditMaterial: 생산·연구·full editor', () => {
  expect(canEditMaterial(u('teamlead','제품개발팀'), depts)).toBe(true) // 기술연구소
  expect(canEditMaterial(u('teamlead','국내영업팀'), depts)).toBe(false)
})
test('canEditBom: 연구·full editor', () => {
  expect(canEditBom(u('executive',null,'기술연구소'), depts)).toBe(true)
  expect(canEditBom(u('teamlead','국내영업팀'), depts)).toBe(false)
})
```

- [ ] **Step 2: 실패 확인** — `pnpm exec vitest run src/lib/erp/perm.test.ts` → FAIL(모듈 없음).
- [ ] **Step 3: 구현** — `canEditPartner = isSales(u,depts) || isFullEditor`. `canEditMaterial`/`canEditBom`는 `deptOf(u,depts) ∈ {생산 부문, RESEARCH_DEPT='기술연구소'}` 또는 full editor. **생산 부문 문자열은 실제 `Team.department` 값으로 확인해 상수로 정의**(미확인 시 '생산기술'·'생산' 후보를 코드 주석으로 남기고 기술연구소만으로 시작). `isFullEditor`는 `../rbac`에서.
- [ ] **Step 4: 통과 확인** — `pnpm exec vitest run src/lib/erp/perm.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(erp): 마스터 편집 권한 로직"`

---

### Task 3: 코드 채번 — `src/lib/erp/code.ts`

**Files:**
- Create: `src/lib/erp/code.ts`, `src/lib/erp/code.test.ts`

**Interfaces:**
- Produces: `nextPartnerCode(role: PartnerRole, existing: string[]): string`, `nextMaterialCode(type: MaterialType, existing: string[]): string`. (순수 — 기존 코드 목록을 인자로 받음. DB 조회·충돌 재시도는 호출부 액션에서.)

- [ ] **Step 1: 실패 테스트 작성**

```ts
test('nextPartnerCode: 접두 C/S/B + 기존 최대 일련번호+1(6자리)', () => {
  expect(nextPartnerCode('customer', ['C000001','C000003','S000009'])).toBe('C000004')
  expect(nextPartnerCode('supplier', [])).toBe('S000001')
  expect(nextPartnerCode('both', ['B000010'])).toBe('B000011')
})
test('nextMaterialCode: 유형접두 + 일련번호', () => {
  expect(nextMaterialCode('FG', ['FG000002'])).toBe('FG000003')
  expect(nextMaterialCode('PART', [])).toBe('PT000001')
})
```

- [ ] **Step 2: 실패 확인** — `pnpm exec vitest run src/lib/erp/code.test.ts` → FAIL.
- [ ] **Step 3: 구현** — 접두 맵(`customer→C,supplier→S,both→B`; `FG→FG,SEMI→SM,RAW→RM,PART→PT,MERCH→MC`), 같은 접두의 기존 코드에서 숫자부 최대값+1을 6자리 zero-pad. 파일 상단에 `// ponytail: 임시 포맷 — Frame8 거래처/품목 샘플 코드 확보 후 이 접두·자릿수만 조정` 주석.
- [ ] **Step 4: 통과 확인** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(erp): 코드 채번(임시 포맷)"`

---

### Task 4: 자동연결 매칭 — `src/lib/erp/match.ts`

**Files:**
- Create: `src/lib/erp/match.ts`, `src/lib/erp/match.test.ts`

**Interfaces:**
- Produces: `matchPartnerId(input: {name: string; bizRegNo?: string}, partners: {id:string; name:string; nameEn:string; bizRegNo:string}[]): string | null`, `matchMaterialId(product: string, materials: {id:string; name:string; code:string; modelBase:string; size:string}[]): string | null`.

- [ ] **Step 1: 실패 테스트 작성**

```ts
const P = [{id:'a',name:'대성산업',nameEn:'Daesung',bizRegNo:'1234567890'},
           {id:'b',name:'대성산업',nameEn:'',bizRegNo:'9999999999'}]
test('사업자번호 일치 우선', () => {
  expect(matchPartnerId({name:'무관', bizRegNo:'9999999999'}, P)).toBe('b')
})
test('동명이 2건 이상이면 null(추측 금지)', () => {
  expect(matchPartnerId({name:'대성산업'}, P)).toBeNull()
})
test('공백·대소문자 무시 유일 일치', () => {
  expect(matchMaterialId(' fc3015 ', [{id:'m',name:'FC3015',code:'FC3015',modelBase:'FC',size:'3015'}])).toBe('m')
})
```

- [ ] **Step 2: 실패 확인** → FAIL.
- [ ] **Step 3: 구현** — 정규화(trim+소문자+공백제거). partner: bizRegNo 비어있지 않고 유일 일치→그 id; 아니면 정규화 name 일치가 **정확히 1건**이면 그 id, 그 외 null. material: 정규화 product가 `code` 또는 `modelBase+size` 와 일치하는 게 정확히 1건이면 그 id, 그 외 null.
- [ ] **Step 4: 통과 확인** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(erp): 수주 자동연결 매칭"`

---

### Task 5: BOM 다단계 전개 — `src/lib/erp/bom.ts`

**Files:**
- Create: `src/lib/erp/bom.ts`, `src/lib/erp/bom.test.ts`

**Interfaces:**
- Produces: `type BomLine = { parentId: string; childId: string; qty: number }`; `expandBom(rootId: string, lines: BomLine[]): { materialId: string; qty: number; level: number }[]` (루트 직하부터 깊이우선, 순환은 방문집합으로 차단).

- [ ] **Step 1: 실패 테스트 작성**

```ts
const L = [{parentId:'A',childId:'B',qty:2},{parentId:'B',childId:'C',qty:3}]
test('2단계 전개 — 소요량 곱', () => {
  expect(expandBom('A', L)).toEqual([
    {materialId:'B', qty:2, level:1},
    {materialId:'C', qty:6, level:2},
  ])
})
test('순환 참조 안전', () => {
  const cyc = [{parentId:'A',childId:'B',qty:1},{parentId:'B',childId:'A',qty:1}]
  expect(() => expandBom('A', cyc)).not.toThrow()
})
```

- [ ] **Step 2: 실패 확인** → FAIL.
- [ ] **Step 3: 구현** — DFS 재귀, 누적 배수(부모 qty × 자식 qty), `seen: Set<string>`로 이미 방문한 materialId 재진입 차단.
- [ ] **Step 4: 통과 확인** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(erp): BOM 다단계 전개"`

---

### Task 6: 거래처 CRUD + '기준정보' 탭

**Files:**
- Create: `src/app/(dashboard)/master/page.tsx`, `src/app/(dashboard)/master/actions.ts`, `src/components/dashboard/MasterPartners.tsx`
- Modify: `src/lib/constants.ts`(TABS), `src/components/dashboard/TabNav.tsx`(ICONS)

**Interfaces:**
- Consumes: Task 2 `canEditPartner`, Task 3 `nextPartnerCode`, `prisma`, `auth`, `logAudit`.
- Produces: 서버액션 `createPartner(_prev, form)`,`updatePartner(_prev, form)`,`deactivatePartner(id)`; 탭 `master`(세그먼트는 `?tab=partners|materials|bom`, 기본 partners).

- [ ] **Step 1: TABS에 추가** — `constants.ts`의 `TABS`에 `{ id: 'master', label: '기준정보', roles: ALL_ROLES }`(수주 탭 앞 적당 위치). `TabNav.tsx` ICONS에 `master: Boxes`(lucide) 추가.
- [ ] **Step 2: `page.tsx`(서버)** — `auth()`로 세션, `searchParams.tab`(기본 partners)로 세그먼트 분기. partners 탭이면 `prisma.businessPartner.findMany({ where:{active:true}, include:{contacts:true}, orderBy:{createdAt:'desc'} })` 조회 + `canEditPartner`(세션+부문맵) 계산해 `MasterPartners`에 전달. 세그먼트 전환 링크(`?tab=`) + `export const dynamic = 'force-dynamic'`. (부문맵은 `prisma.team.findMany`로 팀→부문, 기존 orders 페이지 패턴 참고.)
- [ ] **Step 3: `actions.ts`(서버액션)** — `'use server'`. `createPartner`: 권한 체크(`canEditPartner`, 불가 시 `{error}`), 코드 = form 입력 있으면 그대로, 없으면 `nextPartnerCode(role, 기존코드들)`; `prisma.businessPartner.create`(+contacts nested); 유니크 충돌(P2002) catch 시 코드 재채번 1회 재시도; `logAudit(session,'create','BusinessPartner',id,name)`; `revalidatePath('/master')`. `updatePartner`/`deactivatePartner`(active=false) 동일 패턴. **하드삭제 액션 없음.**
- [ ] **Step 4: `MasterPartners.tsx`(클라이언트)** — 목록 테이블(코드·명·구분·사업자번호·담당자수·사용여부) + `canEdit`일 때만 "새 거래처"/수정/비활성 버튼. 폼은 `useActionState(createPartner,{error:''})`, 담당자 복수 행 입력, 등록 전 동일 이름 존재 시 경고 문구(목록에서 클라이언트 측 확인). 기존 `AdminRequestManager`/`OrderForm` UI 톤 재사용.
- [ ] **Step 5: 검증** — `pnpm exec tsc --noEmit` + `pnpm build` PASS. (Task 2~4 단위테스트 여전히 green.)
- [ ] **Step 6: Commit** — `git commit -m "feat(erp): 기준정보 탭 + 거래처 등록·수정·비활성"`

---

### Task 7: 품목/모델 CRUD

**Files:**
- Modify: `src/app/(dashboard)/master/page.tsx`(materials 세그먼트), `src/app/(dashboard)/master/actions.ts`
- Create: `src/components/dashboard/MasterMaterials.tsx`

**Interfaces:**
- Consumes: Task 2 `canEditMaterial`, Task 3 `nextMaterialCode`.
- Produces: `createMaterial`,`updateMaterial`,`deactivateMaterial`.

- [ ] **Step 1: page.tsx materials 분기** — `prisma.material.findMany({where:{active:true},orderBy:{createdAt:'desc'}})` + `canEditMaterial` → `MasterMaterials`.
- [ ] **Step 2: actions.ts** — `createMaterial`: `canEditMaterial` 체크, 코드 입력 없으면 `nextMaterialCode(type,기존)`, FG면 modelBase/size 입력(기존 `options.ts` MODEL_BASE_SEED/SIZE_SEED datalist 재사용), 그 외 유형은 숨김. create + 충돌 재시도 + `logAudit` + revalidate. update/deactivate 동일. 하드삭제 없음.
- [ ] **Step 3: MasterMaterials.tsx** — 목록(코드·명·유형·단위·모델·사용여부) + 폼(유형 선택에 따라 모델베이스/사이즈 노출). `canEdit`일 때만 편집 버튼.
- [ ] **Step 4: 검증** — tsc + build PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(erp): 품목/모델 등록·수정·비활성"`

---

### Task 8: BOM CRUD

**Files:**
- Modify: `src/app/(dashboard)/master/page.tsx`(bom 세그먼트), `src/app/(dashboard)/master/actions.ts`
- Create: `src/components/dashboard/MasterBom.tsx`

**Interfaces:**
- Consumes: Task 2 `canEditBom`, Task 5 `expandBom`.
- Produces: `addBomLine`,`deleteBomLine`.

- [ ] **Step 1: page.tsx bom 분기** — 상위품목 선택용 Material(FG/SEMI) 목록 + 선택된 상위의 `prisma.bom.findMany({where:{parentId},include:{child:true}})` + 전체 `bom.findMany`로 `expandBom(parentId, lines)` 전개 표시. `canEditBom` 전달.
- [ ] **Step 2: actions.ts** — `addBomLine(parentId,childId,qty,uom)`: `canEditBom` 체크, 자기참조 금지(parentId≠childId), `prisma.bom.create`(@unique 충돌 시 "이미 등록된 하위" 에러), `logAudit`, revalidate. `deleteBomLine(id)` 동일.
- [ ] **Step 3: MasterBom.tsx** — 상위품목 선택 → 1단계 라인 목록 + 다단계 전개 트리(level 들여쓰기, `expandBom` 결과) + `canEdit`일 때 하위 추가/삭제 폼(하위품목 선택·소요량).
- [ ] **Step 4: 검증** — tsc + build PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(erp): BOM 등록·전개·삭제"`

---

### Task 9: 수주 자동연결

**Files:**
- Modify: `src/app/(dashboard)/orders/actions.ts`(`createOrder`), 선택적으로 `src/app/(dashboard)/orders/[id]/page.tsx`(연결 표시)

**Interfaces:**
- Consumes: Task 4 `matchPartnerId`,`matchMaterialId`.

- [ ] **Step 1: createOrder 수정** — 수주 생성 직전/직후, `prisma.businessPartner.findMany`·`prisma.material.findMany`(active)로 후보를 받아 `matchPartnerId({name:customer}, partners)`·`matchMaterialId(product, materials)`로 FK 산출해 `businessPartnerId`/`materialId`에 세팅(null 허용). **기존 자유입력 저장 로직은 그대로.** 폼·필드 추가 없음.
- [ ] **Step 2: (선택) 상세 표시** — `orders/[id]/page.tsx`에서 `businessPartner`/`material` include 시, 연결된 마스터 코드/명을 작은 뱃지로 표시(미연결이면 생략).
- [ ] **Step 3: 검증** — tsc + build PASS. 자동연결 규칙은 Task 4 단위테스트로 커버됨.
- [ ] **Step 4: Commit** — `git commit -m "feat(erp): 수주 저장 시 마스터 자동연결"`

---

## 참고: 남은 외부 입력
- **Frame8 거래처/품목 샘플 코드** — Task 3의 임시 포맷을 실제 규칙으로 맞출 때 필요. 샘플 확보 후 `code.ts`의 접두·자릿수만 수정(테스트도 함께).
- **생산 부문 정식 명칭** — Task 2에서 실제 `Team.department` 값 확인 후 상수 확정.
