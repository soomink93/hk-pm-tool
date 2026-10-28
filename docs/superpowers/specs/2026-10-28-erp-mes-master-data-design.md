# ERP/MES 기반 — 기준정보(마스터 데이터) 설계

작성일: 2026-10-28
레퍼런스: SAP(Business Partner · Material Master · BOM) · 더존(거래처등록 · 품목등록 · BOM등록) · 사내 Frame8(기준정보 · BOM관리)

## 1. 목적 (why)

지금 PM툴은 수주(Order)에서 고객사·모델·발진기·헤드를 **자유 입력 + datalist**로 받는다. PM 단계에선 충분하지만, 여기에 ERP(구매·재고·출하)와 MES(작업지시·공정·실적)를 얹으려면 모든 거래/생산 데이터가 가리키는 **기준정보(마스터)가 먼저 있어야** 한다. 거래처·품목이 코드로 고정돼야 수주→구매→재고→출하, 품목→BOM→작업지시가 서로 연결되고 집계·추적이 된다.

SAP·더존·Frame8 모두 이 토대를 **거래처 / 품목 / BOM** 3개 마스터로 잡는다. 이번 설계는 그 3개를 HK(레이저 절단기 제조) 현실에 맞춰 세우고, 기존 수주(Order)를 여기에 **선택적으로 연결**하는 것까지다. 거래 모듈(구매·재고·출하·작업지시)은 다음 설계 문서로 분리한다.

## 2. 범위

### 2.1 포함 (이번 설계)
- **거래처 마스터** (BusinessPartner) + 담당자(복수)
- **품목/모델 마스터** (Material)
- **BOM** (상위-하위 소요량, 다단계)
- 기존 **수주(Order) 연동**: `businessPartnerId`·`materialId`(둘 다 nullable FK) 추가. 기존 자유입력 컬럼은 보존.
- **네비게이션 반영**: 기준정보·BOM이 상단 탭 어디로 들어가는지(§8).

### 2.2 비포함 (다음 문서)
- 구매(발주)·재고·입출고·출하 등 **거래(transaction) 모듈**
- 작업지시·공정실행·설비·실적·품질 등 **MES 실행 모듈**
- 원가 계산(제조원가), 회계 연동
- 기존 수주의 자유입력 데이터를 마스터로 **일괄 치환(backfill)** — §7에서 전략만 정하고 실행은 분리

### 2.3 안티목표 (이렇게 되면 실패)
- 마스터가 복잡해 영업/생산이 신규 거래처·품목 하나 등록하는 데 포기할 만큼 입력칸이 많음 → **필수 최소 + 나머지 선택**.
- 기존 잘 돌던 수주 등록 흐름이 마스터 때문에 깨짐 → 연동은 **선택(nullable)**, 기존 자유입력 유지.
- SAP를 그대로 흉내 내 variant configuration 같은 과설계 → HK 규모에 맞는 평면 스키마.

## 3. 레퍼런스 매핑

| 개념 | SAP | 더존 | Frame8 | 본 설계 모델 |
|---|---|---|---|---|
| 거래처 | Business Partner | 거래처등록 | 기준정보 | `BusinessPartner` (+ `BusinessPartnerContact`) |
| 품목/모델 | Material Master | 품목등록 | 기준정보 | `Material` |
| BOM | Bill of Materials | BOM등록 | BOM관리 | `Bom` |

공통 규칙(세 마스터 모두): **코드 기반 유니크 키** · **사용여부(active) 소프트삭제** · 생성/수정 **이력은 기존 `AuditLog` 재사용**.

## 4. 데이터 모델 (Prisma)

> 모든 날짜·금액 민감정보 정책은 기존 Order와 동일: 날짜는 `YYYY-MM-DD` 문자열, 금액/단가는 별도 보관(§6).

### 4.1 거래처 — BusinessPartner

```prisma
enum PartnerRole {
  customer   // 고객
  supplier   // 공급사
  both       // 고객 겸 공급사
}

model BusinessPartner {
  id          String      @id @default(cuid())
  code        String      @unique            // 거래처코드 (§5)
  name        String                         // 거래처명(국문)
  nameEn      String      @default("")        // 영문명
  role        PartnerRole @default(customer)  // 구분
  bizRegNo    String      @default("")        // 사업자등록번호 (해외=빈값 허용)
  ceo         String      @default("")        // 대표자
  bizType     String      @default("")        // 업태
  bizItem     String      @default("")        // 종목
  country     String      @default("KR")
  currency    String      @default("KRW")
  address     String      @default("")
  paymentTerms String     @default("")        // 결제조건 (예: 월말 결제)
  active      Boolean     @default(true)      // 사용여부
  notes       String      @default("")
  contacts    BusinessPartnerContact[]
  orders      Order[]
  createdBy   String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([role, active])
}

model BusinessPartnerContact {
  id        String          @id @default(cuid())
  partnerId String
  partner   BusinessPartner @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  name      String                               // 담당자명
  title     String          @default("")          // 직책
  phone     String          @default("")
  email     String          @default("")
  isPrimary Boolean         @default(false)       // 주 담당자
  createdAt DateTime        @default(now())

  @@index([partnerId])
}
```

【설계 판단】담당자를 JSON이 아니라 **자식 테이블**로 — 복수 담당자/주담당자 표시·검색이 깔끔하고, 추후 구매발주 시 "발주 연락처" 참조가 쉬움.

【무결성 — 확정】중복 방지: `bizRegNo`가 빈값이 아니면 **부분 유니크 인덱스**(국내 거래처 중복 차단). 등록 시 같은 `name`이 있으면 **경고(차단은 안 함)**. 삭제: `active=false` 소프트삭제만, **하드삭제 UI 없음**(수주가 참조 중인 거래처가 사라져 링크 끊기는 사고 방지). Order FK의 `SetNull`은 DB 백스톱일 뿐 UI 경로로는 발생 안 함.

### 4.2 품목/모델 — Material

```prisma
enum MaterialType {
  FG      // 완제품 (레이저 절단기 모델)
  SEMI    // 반제품
  RAW     // 원자재
  PART    // 부품
  MERCH   // 상품(사입)
}

model Material {
  id          String       @id @default(cuid())
  code        String       @unique            // 품목코드 (§5)
  name        String                          // 품목명
  type        MaterialType @default(PART)     // 품목구분
  uom         String       @default("EA")     // 단위
  manageStock Boolean      @default(true)      // 재고관리여부
  manageLot   Boolean      @default(false)     // LOT관리여부

  // 완제품(FG) 모델 사양 — FG가 아니면 빈값. 수주폼 옵션(options.ts)과 동일 축.
  modelBase   String       @default("")        // FC / HD / FS / RS / K315
  size        String       @default("")        // 3015 / 4020 …

  active      Boolean      @default(true)
  notes       String       @default("")
  // BOM 관계
  bomParents  Bom[]        @relation("BomParent")   // 이 품목을 상위로 하는 BOM 라인
  bomChildren Bom[]        @relation("BomChild")    // 이 품목이 하위로 쓰이는 라인
  orders      Order[]
  createdBy   String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([type, active])
}
```

【확정】**Material = 모델 카탈로그(모델베이스+사이즈 수준, 예: FC3015)** 까지만 담고, **발진기 타입/출력·헤드 등 "주문별 구성(configuration)"은 지금처럼 Order에 둔다.** 레이저 절단기는 수주마다 발진기·헤드가 달라지는 커스텀이라, 구성 조합을 전부 별도 품목으로 만들면 품목이 폭증한다(SAP의 variant configuration 영역 = 과설계). → 마스터는 모델까지, 구성은 수주에.

【무결성 — 확정】삭제는 `active=false` 소프트삭제만, 하드삭제 UI 없음. BOM에서 하위로 쓰이는 품목은 `onDelete: Restrict`로 DB 차단.

### 4.3 BOM

```prisma
model Bom {
  id        String   @id @default(cuid())
  parentId  String                              // 상위품목 (FG/SEMI)
  parent    Material @relation("BomParent", fields: [parentId], references: [id], onDelete: Cascade)
  childId   String                              // 하위품목
  child     Material @relation("BomChild", fields: [childId], references: [id], onDelete: Restrict)
  qty       Float    @default(1)                // 소요량
  uom       String   @default("EA")
  seq       Int      @default(0)                // 표시 순서
  notes     String   @default("")
  createdBy String
  createdAt DateTime @default(now())

  @@unique([parentId, childId])                 // 한 상위에 같은 하위 중복 금지
  @@index([parentId])
}
```

- **다단계 전개**는 parent→child 재귀로 파생(저장 안 함). 완제품 아래 반제품, 반제품 아래 부품.
- `onDelete`: 상위 삭제 시 그 BOM 라인 Cascade 삭제 / 하위로 **쓰이는 중인 품목은 삭제 Restrict**(무결성).
- 유효일자(effectivity)·리비전은 이번 범위 밖 → 향후 `validFrom/validTo` 추가 여지만.

### 4.4 기존 Order 연동 (가산적, 비파괴)

기존 `Order`에 **nullable FK 2개만 추가**. 자유입력 컬럼(`customer`, `product`, `laserSource`…)은 **그대로 둔다**.

```prisma
model Order {
  // ... 기존 필드 유지 ...
  businessPartnerId String?
  businessPartner   BusinessPartner? @relation(fields: [businessPartnerId], references: [id], onDelete: SetNull)
  materialId        String?
  material          Material?        @relation(fields: [materialId], references: [id], onDelete: SetNull)
  // @@index([businessPartnerId]) / @@index([materialId])
}
```

【확정 — 수주 입력 방식】신규 수주도 **지금의 자유입력 + datalist 흐름을 그대로 유지**한다. 수주 폼은 재편하지 않음. 대신:
- 저장 시 입력한 고객사명/모델이 마스터와 **일치하면 FK를 자동 연결**(passive auto-link, `src/lib/erp/match.ts` 공유 로직). 일치 안 하면 FK=null(문자열만) — 기존처럼 동작.
- 마스터 자체는 **별도 "기준정보" 탭**에서 영업/생산·연구가 채운다(수주 폼이 아니라). 그래서 "영업이 수주 중 품목을 못 만든다"는 권한 충돌이 **발생하지 않음**(품목은 애초에 수주 폼에서 안 만듦).
- 기존 수주: FK = null로 그대로. 깨지지 않음. backfill은 §7.

## 5. 코드 체계 (번호 채번)

【확정 — Frame8 규칙 미러링】사내 Frame8의 기존 거래처코드·품목코드 체계를 **그대로 따른다**(기존 시스템과 대조 가능). 스키마(`code String @unique`)는 포맷과 무관하므로 영향 없음. **구체 포맷은 Frame8 거래처/품목 샘플 코드 몇 개를 확보한 뒤** 채번 로직(`src/lib/erp/code.ts`)에 반영 — 이 입력은 채번 **구현 직전**에 필요(문서 승인·스키마·기준정보 화면 빌드에는 불필요).

- 미러링 전 임시 기본값(샘플 확보 전까지): 거래처 `C/S/B + 6자리`, 품목 유형접두 + 6자리, 완제품은 모델명 허용. **수동 덮어쓰기 항상 허용.**
- 채번은 공유 로직 1곳(`src/lib/erp/code.ts`)에서만(동시 등록 유니크 충돌은 `@unique` + 재시도). 런타임 체크 1개 남김.

## 6. 민감정보(원가·단가) 처리

기존 정책("수주에 금액 미보관")과 **일관**되게:
- 이번 마스터 3종에는 **단가·표준원가 컬럼을 넣지 않는다.**
- 가격/원가가 필요해지는 시점(구매·견적 모듈, 다음 문서)에 **별도 테이블 + 전용 권한**으로 분리해 붙인다. 마스터 본체는 누구나 조회해도 안전하게 유지.

## 7. 데이터 이관(backfill) 전략 — 실행은 분리

- 기존 수주의 자유입력 `customer`·`product`를 집계 → 고유값 목록을 뽑아 **거래처/품목 마스터 초안 생성**, 그 뒤 수주의 FK를 매칭해 채우는 1회성 스크립트.
- `.superpowers/sdd/`(gitignore)에서 `tsx`로 돌리고, 검수 후 실행. **이번 구현엔 포함하지 않고** 마스터·연동이 안정화된 뒤 별도 작업.
- 그 전까지 기존 수주는 FK=null(문자열만)로 공존.

## 8. 네비게이션 반영 (별도 확정 완료)

16개 탭 → 7/8개로 정리(확정). 기준정보·BOM은 **ERP 영역**이라 신규 상위 탭으로 추가하지 않고, 역할 기반으로 묶는다:

- 상단 탭 묶음(확정): 현황 · 캘린더 · 프로젝트(목록·로드맵) · 작업(내작업·협업·팀) · 수주·생산 · 결정(요청·로그) · **관리자 요청**(독립, 배지) · [관리자]관리(리포트·변경이력·구성원·설정)
- **기준정보 = 독립 상위 탭(확정).** `기준정보` 탭 안에 세그먼트로 `거래처 · 품목/모델 · BOM`. 수주·생산 탭과 **분리** — 이유: 수주·생산 탭은 현재 `ORDERS_RELEASED=false`라 **관리자 전용**인데, 기준정보는 영업·생산·연구가 바로 써야 하므로 그 게이트에 묶이면 안 됨.
- **기준정보 탭 노출(확정):** `조회 = 영업·생산·연구·admin`(사실상 전 구성원 조회 가능하게, §9), `ORDERS_RELEASED와 무관한 독립 게이트`. `TABS`에 `{ id: 'master', label: '기준정보', roles: [...] }` 신규 추가.
- 네비게이션 단순화(16→7/8) 실제 구현은 이 마스터 구현과 **같은 작업에서** 하되 커밋은 분리. (기준정보 탭 추가는 이 문서 범위, 나머지 탭 묶음은 별도 커밋)

## 9. 권한 (RBAC) — 기존 scope.ts 재사용

【확정 — 역할별 분담】
- **조회**: 전 구성원.
- **거래처 편집**: 영업 + admin.
- **품목/모델 편집**: 생산·연구 + admin.
- **BOM 편집**: 연구(설계) + admin.
- 판정은 공유 1곳(`src/lib/erp/perm.ts`)에서. 기존 `src/lib/orders/perm.ts`의 `isSales`(국내영업 부문) 패턴을 재사용·확장해 "영업/생산/연구" 판정. 런타임 체크 1개 남김.

## 10. 마이그레이션·롤백 전략 (CLAUDE.md 원칙)

- 손으로 쓴 마이그레이션 분리: 거래처+담당자 / 품목 / BOM / Order FK 추가 — **기능 단위로 커밋 분리**(문제 시 부분 롤백).
- 신규 테이블은 기존에 영향 0. Order 변경은 **nullable 컬럼 추가뿐**(DEFAULT 안전).
- 비자명 로직(채번·BOM 재귀 전개)엔 런타임 체크 1개씩(`*.test.ts`).
- 검증: `pnpm exec tsc --noEmit` + `pnpm build` 통과 후 푸시.

## 11. 결정 요약 / 남은 입력

**확정된 결정(사용자 확인 완료 2026-10-28):**
1. **수주 입력(§4.4)** — 자유입력 + datalist 유지, 저장 시 마스터 일치하면 FK 자동연결. 수주 폼 재편 없음.
2. **품목 경계(§4.2)** — 마스터 = 모델(FC3015)까지, 발진기·헤드 구성은 수주에.
3. **기준정보 탭(§8)** — 별도 '기준정보' 상위 탭, ORDERS_RELEASED와 무관한 독립 노출.
4. **편집 권한(§9)** — 거래처=영업 / 품목=생산·연구 / BOM=연구 (+admin). 조회=전 구성원.
5. **코드 채번(§5)** — Frame8 규칙 미러링.

**빌더가 정한 것(기본값):** 담당자 자식테이블화, 소프트삭제만(하드삭제 UI 없음), bizRegNo 부분유니크 + 동일명 경고, UoM 기본 EA, 인덱스 구성, passive auto-link, backfill 분리.

**남은 입력(빌드 중 필요, 승인에는 불필요):**
- **Frame8 거래처/품목 샘플 코드** — 채번 로직(`code.ts`) 구현 직전에 필요. 그 전까지 임시 포맷으로 스키마·화면 선개발 가능.
