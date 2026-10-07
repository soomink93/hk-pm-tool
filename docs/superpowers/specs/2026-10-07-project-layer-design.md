# 프로젝트 계층 도입 (JIRA형 2단계) — 설계

작성일: 2026-10-07

## 1. 목적
현재 작업은 *팀*에만 속하고, 부서 간 일은 "협업"으로 분산되어 "하나의 목표"를 중심으로 일을 모아 보기 어렵다. 상위 계층인 **프로젝트**를 도입해 작업·협업·결정을 하나의 목표 아래 묶고, 진행률·참여 팀을 한눈에 본다.

## 2. 범위 (결정 사항)
- 계층: **프로젝트 → 작업 (2단계)**. 에픽·스프린트·간트는 도입하지 않음(향후 확장 여지만 남김).
- 연결 대상: **작업·협업·결정요청(Escalation)·결정로그(Decision)** 에 `projectId`(nullable) 추가.
- 연결은 **선택(optional)**. 프로젝트 안에서 생성하면 자동 연결, 전사 탭에서 생성하면 미분류(null).
- 권한: 기존 **부문·팀 권한 재사용(A안)**. 프로젝트 전용 멤버/권한 체계는 두지 않음.

## 3. 데이터 모델 (Prisma)

### 새 모델
```prisma
enum ProjectStatus {
  active   // 진행
  onhold   // 보류
  done     // 완료
}

model Project {
  id            String        @id @default(cuid())
  name          String
  description   String        @default("")
  status        ProjectStatus @default(active)
  ownerId       String?       // 담당자(User) — nullable
  ownerName     String        @default("")
  dueDate       String        @default("")
  createdById   String
  createdByName String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  tasks          Task[]
  collaborations Collaboration[]
  escalations    Escalation[]
  decisions      Decision[]

  @@index([status])
}
```

### 기존 모델에 추가 (4곳)
각 모델에 아래를 추가:
```prisma
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  // @@index([projectId])
```
대상: `Task`, `Collaboration`, `Escalation`, `Decision`.
- `onDelete: SetNull` — 프로젝트 삭제 시 작업·협업·결정은 보존하고 연결만 해제.
- 기존 레코드는 전부 `projectId = null` → "미분류"로 그대로 유지. **데이터 마이그레이션 불필요.**

### 파생값(저장 안 함)
- 진행률 = (완료 작업 수 / 전체 작업 수) × 100, 작업 0개면 0%.
- 참여 팀 = 그 프로젝트 작업들의 `team` 집합(중복 제거).

## 4. 권한
- **조회**: 전 역할.
- **프로젝트 생성**: **전 역할**(팀장 포함).
- **프로젝트 수정·삭제**: 전체 편집자(admin/chairman/president) + 해당 프로젝트 `ownerId` 본인.
- **프로젝트 내부의 작업·협업·결정요청·결정로그**: 기존 규칙(`editableTeams`, 단계별 결정권자, 결정 본인작성 제한) **그대로 적용. 변경 없음.**
- API 가드: 프로젝트 쓰기 엔드포인트는 세션 필요 + 위 규칙. `projectId`가 지정되면 존재 검증만 하고, 내부 항목의 팀/부문 권한은 기존 로직으로 판단.

## 5. API
- `GET /api/projects` — 목록(+진행률·참여팀·작업수 계산은 서버 또는 페이지에서).
- `POST /api/projects` — 생성(전 역할). `createdBy`, `ownerId/ownerName` 기록 + 감사로그.
- `PATCH /api/projects/[id]` — 수정(전체 편집자 or owner). + 감사로그.
- `DELETE /api/projects/[id]` — 삭제(전체 편집자 or owner). 연결 항목은 SetNull. + 감사로그.
- 기존 생성 엔드포인트(`tasks`, `collaborations`, `escalations`)에서 `projectId`(선택) 수용 → 유효하면 저장.
- 감사 로그 `entity`에 `project` 추가, 라벨 매핑 추가.

## 6. 화면 / 네비게이션
- 상단 탭 **"프로젝트"**(전 역할) 신설, `overview` 다음 위치.
- **`/projects` 목록**
  - 카드: 이름 · 담당자 · 상태 뱃지 · 참여 팀 · 진행률 바 · 작업 수(완료/전체).
  - 상단 **필터**: 상태(전체/진행/보류/완료) · 팀 · 담당자 + 이름 검색 + 정렬(최신·마감임박·진행률).
  - "새 프로젝트" 버튼(전 역할).
- **`/projects/[id]` 상세**
  - 헤더: 이름 · 담당자 · 상태 · 마감 · 진행률 링/바. (owner/전체편집자에게 수정·삭제)
  - 섹션: **작업 보드 / 협업 / 결정요청 / 결정로그** — 모두 `projectId`로 필터링해 기존 컴포넌트 재사용. 각 생성 폼은 해당 projectId를 자동 주입.
- **전사 탭 유지**(작업·협업·결정요청·결정로그) — 전체를 보여주되:
  - 각 항목에 **프로젝트 뱃지**(연결된 경우) 표시.
  - **프로젝트 필터**(전체 / 특정 프로젝트 / 미분류) 추가.
- 작업·협업·결정요청 **생성 폼에 "프로젝트" 선택 드롭다운(선택)** 추가(전사 탭에서도 수동 지정 가능).
- 전체현황에 **"진행 중 프로젝트" 요약 카드**(상위 N개 + 진행률) 추가.

## 7. 재사용·구조
- `TaskBoard`, `CollaborationManager`, `EscalationManager`, `DecisionsManager`에 **`projectId?` 필터 prop**과 생성 시 주입할 **기본 projectId prop**을 추가(기존 전역 동작은 prop 미지정 시 그대로).
- 프로젝트 목록/카드/필터는 신규 컴포넌트 `ProjectsManager`로 분리.
- RBAC: `rbac.ts`에 `project:write` 또는 헬퍼(`canEditProject(session, project)`) 추가.

## 8. 비범위 (YAGNI)
에픽·스프린트·간트/타임라인·프로젝트 전용 멤버·프로젝트 템플릿·프로젝트 단위 알림 다이제스트.

## 9. 수용 기준
- [ ] 프로젝트 생성/수정/삭제가 권한대로 동작(팀장 생성 가능, 타인 프로젝트 수정·삭제 차단).
- [ ] 프로젝트 삭제 시 연결된 작업·협업·결정이 보존되고 projectId만 해제됨.
- [ ] 프로젝트 상세에서 작업 보드·협업·결정요청·결정로그가 그 프로젝트 것만 표시.
- [ ] 프로젝트 내부에서 생성한 작업·협업·결정요청이 자동으로 해당 프로젝트에 연결.
- [ ] 전사 탭에서 프로젝트 필터로 걸러짐, 항목에 프로젝트 뱃지 표시.
- [ ] 프로젝트 목록 필터(상태·팀·담당자·검색·정렬) 동작.
- [ ] 기존 데이터가 "미분류"로 그대로 보임(마이그레이션으로 유실 없음).
- [ ] 전체현황에 진행 중 프로젝트 요약 표시.
- [ ] 타입체크·빌드 통과.
