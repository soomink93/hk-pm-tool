# 프로젝트 계층(2단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작업·협업·결정을 하나의 목표 아래 묶는 상위 "프로젝트" 계층(2단계)을 추가한다.

**Architecture:** 새 `Project` 모델 + 기존 4개 엔터티(Task/Collaboration/Escalation/Decision)에 nullable `projectId` 관계(onDelete SetNull). 신규 프로젝트 탭(목록+필터, 상세=기존 매니저를 projectId로 필터링해 재사용). 권한은 기존 부문·팀 규칙 재사용, 프로젝트 수정·삭제만 전체편집자+담당자로 제한.

**Tech Stack:** Next.js 16 (App Router, RSC), Prisma 7 (+@prisma/adapter-pg), Auth.js v5, Tailwind v4, lucide-react, vitest.

## Global Constraints
- 패키지 매니저: **pnpm**. node/pnpm/git은 Bash 툴로 실행(PATH shim).
- 검증: 각 태스크 끝에 `pnpm exec tsc --noEmit` + `pnpm build` 통과. 로직 검증은 `pnpm exec tsx --env-file=.env <script>` DB 스크립트 사용(스크립트는 scratchpad에 두고 실행 후 삭제). rbac 단위테스트는 `pnpm exec vitest run`.
- Prisma: 런타임은 PrismaPg(DATABASE_URL), 마이그레이션/DIRECT_URL. 마이그레이션 후 **반드시 `pnpm exec prisma generate`** 실행(캐시 문제 방지).
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- 역할: `admin chairman president executive teamlead`. 전체편집자 = admin/chairman/president (`isFullEditor`).
- 기존 데이터는 projectId=null 유지(미분류). 데이터 마이그레이션 없음.
- UI 문구는 한국어. 기존 톤(간결) 유지.

---

## File Structure

**신규**
- `prisma/migrations/<ts>_project_layer/migration.sql` — 스키마 변경
- `src/app/api/projects/route.ts` — 목록/생성
- `src/app/api/projects/[id]/route.ts` — 수정/삭제
- `src/components/dashboard/ProjectsManager.tsx` — 목록 카드 + 필터 + 생성/수정 모달(client)
- `src/app/(dashboard)/projects/page.tsx` — 목록 페이지(server)
- `src/app/(dashboard)/projects/[id]/page.tsx` — 상세 페이지(server)

**수정**
- `prisma/schema.prisma`
- `src/lib/rbac.ts` (+ `src/lib/rbac.test.ts`)
- `src/lib/constants.ts` (TABS)
- `src/components/dashboard/TabNav.tsx` (아이콘)
- `src/app/api/tasks/route.ts`, `src/app/api/collaborations/route.ts`, `src/app/api/escalations/route.ts` (projectId 수용)
- `src/app/(dashboard)/audit/page.tsx` (project 라벨)
- `src/components/dashboard/TaskBoard.tsx`, `CollaborationManager.tsx`, `EscalationManager.tsx`, `DecisionsManager.tsx` (projectId 필터/주입/뱃지/선택)
- `src/app/(dashboard)/tasks/page.tsx`, `collaboration/page.tsx`, `escalation/page.tsx`, `decisions/page.tsx` (projects 전달)
- `src/app/(dashboard)/overview/page.tsx` (진행 중 프로젝트 요약)

---

## Task 1: 스키마 + 마이그레이션

**Files:**
- Modify: `prisma/schema.prisma`
- Create (generated): `prisma/migrations/<ts>_project_layer/migration.sql`

**Interfaces:**
- Produces: Prisma 모델 `Project`(필드: id, name, description, status(ProjectStatus), ownerId?, ownerName, dueDate, createdById, createdByName, createdAt, updatedAt), 관계 `tasks/collaborations/escalations/decisions`. `Task/Collaboration/Escalation/Decision`에 `projectId String?` + `project Project? @relation(onDelete SetNull)`.

- [ ] **Step 1: Project 모델 + enum 추가** — `prisma/schema.prisma` 끝 enum 블록 근처에 추가:

```prisma
enum ProjectStatus {
  active
  onhold
  done
}

model Project {
  id            String        @id @default(cuid())
  name          String
  description   String        @default("")
  status        ProjectStatus @default(active)
  ownerId       String?
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

- [ ] **Step 2: 4개 모델에 projectId 추가** — 각 모델 본문에 아래 2줄 + 인덱스 추가.

`model Task { ... }` 안(기존 `comments TaskComment[]` 아래 등 관계 영역):
```prisma
  projectId     String?
  project       Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
```
그리고 Task의 `@@index` 묶음에 `@@index([projectId])` 추가.

`model Collaboration { ... }` 안(관계 영역, `tasks Task[]` 근처):
```prisma
  projectId     String?
  project       Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
```
+ `@@index([projectId])`.

`model Escalation { ... }` 안(`decision Decision?` 근처):
```prisma
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
```
+ `@@index([projectId])`.

`model Decision { ... }` 안(`escalation Escalation?` 근처):
```prisma
  projectId     String?
  project       Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
```
+ `@@index([projectId])`.

- [ ] **Step 3: 마이그레이션 생성/적용 + generate**

Run:
```bash
cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec prisma migrate dev --name project_layer 2>&1 | tail -12 && pnpm exec prisma generate 2>&1 | tail -2
```
Expected: "migration ... applied" + "Generated Prisma Client". (nullable 컬럼·새 테이블이라 데이터손실 경고 없음 → 비대화형 통과.)

- [ ] **Step 4: 타입 확인**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec tsc --noEmit 2>&1 | tail -5`
Expected: 출력 없음(통과).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/c/Desktop/hk-pm-tool && git add -A && git commit -m "feat(project): Project 모델 + projectId 관계 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: rbac — canEditProject + 테스트

**Files:**
- Modify: `src/lib/rbac.ts`
- Modify: `src/lib/rbac.test.ts`

**Interfaces:**
- Consumes: `isFullEditor(role)`, `Role`.
- Produces: `canEditProject(role: Role, ownerId: string | null, userId: string): boolean` — 전체편집자이거나 본인이 owner면 true.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/rbac.test.ts`에 추가:

```typescript
import { can, visibleTabs, canEditProject } from './rbac'

describe('canEditProject', () => {
  it('full editors can edit any project', () => {
    expect(canEditProject('admin', 'u1', 'u2')).toBe(true)
    expect(canEditProject('chairman', null, 'u2')).toBe(true)
  })
  it('owner can edit own project', () => {
    expect(canEditProject('teamlead', 'u2', 'u2')).toBe(true)
  })
  it('non-owner non-full cannot edit', () => {
    expect(canEditProject('teamlead', 'u1', 'u2')).toBe(false)
    expect(canEditProject('executive', 'u1', 'u2')).toBe(false)
  })
})
```
(파일 상단 import 줄을 위와 같이 `canEditProject` 포함으로 교체.)

- [ ] **Step 2: 실패 확인**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec vitest run src/lib/rbac.test.ts 2>&1 | tail -15`
Expected: FAIL — `canEditProject is not a function` / export 없음.

- [ ] **Step 3: 구현** — `src/lib/rbac.ts` 끝에 추가:

```typescript
// 프로젝트 수정·삭제 권한: 전체 편집자이거나 본인이 담당자(owner)
export const canEditProject = (role: Role, ownerId: string | null, userId: string): boolean =>
  isFullEditor(role) || (!!ownerId && ownerId === userId)
```

- [ ] **Step 4: 통과 확인**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec vitest run src/lib/rbac.test.ts 2>&1 | tail -10`
Expected: PASS (전체 테스트 green).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/c/Desktop/hk-pm-tool && git add -A && git commit -m "feat(project): canEditProject 권한 헬퍼 + 테스트

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 프로젝트 API (목록/생성/수정/삭제) + 감사 라벨

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/route.ts`
- Modify: `src/app/(dashboard)/audit/page.tsx`

**Interfaces:**
- Consumes: `guard()` from `@/lib/api-guard` (returns `{res?, session}`), `prisma`, `logAudit(session, action, entity, id, summary)`, `canEditProject`.
- Produces: REST 엔드포인트. 생성 바디 `{name, description?, ownerId?, dueDate?, status?}`. ProjectStatus 유효값 `active|onhold|done`.

- [ ] **Step 1: 목록/생성 라우트 작성** — `src/app/api/projects/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { ProjectStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { logAudit } from '@/lib/audit'

const STATUSES: ProjectStatus[] = ['active', 'onhold', 'done']

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const items = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const { id: userId, name } = g.session.user
  const b = await req.json()
  const projName = String(b.name ?? '').trim()
  if (!projName) return NextResponse.json({ error: '프로젝트 이름을 입력하세요.' }, { status: 400 })

  let ownerId: string | null = null
  let ownerName = ''
  if (b.ownerId) {
    const u = await prisma.user.findUnique({ where: { id: String(b.ownerId) }, select: { id: true, name: true } })
    if (u) { ownerId = u.id; ownerName = u.name }
  }
  const status = STATUSES.includes(b.status) ? (b.status as ProjectStatus) : 'active'

  const project = await prisma.project.create({
    data: {
      name: projName,
      description: String(b.description ?? ''),
      status,
      ownerId,
      ownerName,
      dueDate: b.dueDate ? String(b.dueDate) : '',
      createdById: userId,
      createdByName: name ?? '',
    },
  })
  await logAudit(g.session, 'create', 'project', project.id, `프로젝트 생성: ${project.name}`)
  return NextResponse.json(project, { status: 201 })
}
```

- [ ] **Step 2: 수정/삭제 라우트 작성** — `src/app/api/projects/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { Prisma, ProjectStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { canEditProject, type Role } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

const STATUSES: ProjectStatus[] = ['active', 'onhold', 'done']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  if (!canEditProject(g.session.user.role as Role, project.ownerId, g.session.user.id))
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 })

  const b = await req.json()
  const data: Prisma.ProjectUpdateInput = {}
  if (b.name !== undefined) data.name = String(b.name)
  if (b.description !== undefined) data.description = String(b.description)
  if (b.dueDate !== undefined) data.dueDate = String(b.dueDate)
  if (b.status !== undefined && STATUSES.includes(b.status)) data.status = b.status as ProjectStatus
  if (b.ownerId !== undefined) {
    if (b.ownerId) {
      const u = await prisma.user.findUnique({ where: { id: String(b.ownerId) }, select: { id: true, name: true } })
      if (u) { data.ownerId = u.id; data.ownerName = u.name }
    } else { data.ownerId = null; data.ownerName = '' }
  }
  const updated = await prisma.project.update({ where: { id }, data })
  await logAudit(g.session, 'update', 'project', id, `프로젝트 수정: ${updated.name}`)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  if (!canEditProject(g.session.user.role as Role, project.ownerId, g.session.user.id))
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  await prisma.project.delete({ where: { id } }) // 연결 항목은 onDelete: SetNull
  await logAudit(g.session, 'delete', 'project', id, `프로젝트 삭제: ${project.name}`)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: 감사 라벨에 project 추가** — `src/app/(dashboard)/audit/page.tsx`의 `ENTITY_LABEL`에 `project: '프로젝트',` 추가.

- [ ] **Step 4: 타입체크**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec tsc --noEmit 2>&1 | tail -8`
Expected: 통과(출력 없음). (api-guard의 반환 형태가 `{res, session}`인지 먼저 `src/lib/api-guard.ts`를 읽어 확인하고 시그니처를 맞출 것.)

- [ ] **Step 5: Commit**

```bash
cd /c/Users/c/Desktop/hk-pm-tool && git add -A && git commit -m "feat(project): 프로젝트 CRUD API + 감사 라벨

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 프로젝트 탭 + 목록 페이지 + ProjectsManager(필터·생성/수정)

**Files:**
- Modify: `src/lib/constants.ts`
- Modify: `src/components/dashboard/TabNav.tsx`
- Create: `src/components/dashboard/ProjectsManager.tsx`
- Create: `src/app/(dashboard)/projects/page.tsx`

**Interfaces:**
- Consumes: Project 레코드, 작업 집계(진행률/참여팀/작업수).
- Produces: `ProjectRow` 타입 `{id,name,status,ownerName,dueDate,taskTotal,taskDone,teams:string[]}`; `ProjectsManager` props `{projects: ProjectRow[], users: {id,name}[], canEdit(ownerId): boolean}`.

- [ ] **Step 1: TABS에 projects 추가** — `src/lib/constants.ts` TABS 배열에서 overview 다음에:
```typescript
  { id: 'projects', label: '프로젝트', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
```

- [ ] **Step 2: TabNav 아이콘** — `src/components/dashboard/TabNav.tsx` import에 `FolderKanban` 추가, ICONS에 `projects: FolderKanban,` 추가.

- [ ] **Step 3: ProjectsManager 작성** — `src/components/dashboard/ProjectsManager.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, X, FolderKanban } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'

export type ProjectRow = {
  id: string; name: string; status: string; ownerId: string | null; ownerName: string
  dueDate: string; taskTotal: number; taskDone: number; teams: string[]
}
export type UserOpt = { id: string; name: string }

const STATUS_META: Record<string, { label: string; tone: 'green' | 'yellow' | 'gray' }> = {
  active: { label: '진행', tone: 'green' },
  onhold: { label: '보류', tone: 'yellow' },
  done: { label: '완료', tone: 'gray' },
}
const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0)
const emptyForm = () => ({ name: '', description: '', ownerId: '', dueDate: '', status: 'active' })

export function ProjectsManager({
  projects, users, canEditProjectRow, allTeams,
}: {
  projects: ProjectRow[]; users: UserOpt[]
  canEditProjectRow: (ownerId: string | null) => boolean
  allTeams: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm())
  const [busy, setBusy] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('recent')

  const STATUS_FILTERS = [
    { id: 'all', label: '전체' }, { id: 'active', label: '진행' },
    { id: 'onhold', label: '보류' }, { id: 'done', label: '완료' },
  ]

  let shown = projects.filter((p) =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (teamFilter === 'all' || p.teams.includes(teamFilter)) &&
    (q.trim() === '' || p.name.toLowerCase().includes(q.trim().toLowerCase())),
  )
  shown = [...shown].sort((a, b) => {
    if (sort === 'progress') return pct(b.taskDone, b.taskTotal) - pct(a.taskDone, a.taskTotal)
    if (sort === 'due') {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate < b.dueDate ? -1 : 1
    }
    return 0 // recent: 서버가 createdAt desc로 이미 정렬
  })

  function openAdd() { setEditId(null); setForm(emptyForm()); setOpen(true) }
  function openEdit(p: ProjectRow) {
    setEditId(p.id)
    setForm({ name: p.name, description: '', ownerId: p.ownerId ?? '', dueDate: p.dueDate, status: p.status })
    setOpen(true)
  }
  async function save() {
    if (!form.name.trim()) return
    setBusy(true)
    const res = await fetch(editId ? `/api/projects/${editId}` : '/api/projects', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (res.ok) { setOpen(false); router.refresh() }
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? '저장에 실패했습니다.') }
  }
  async function remove(id: string) {
    if (!confirm('프로젝트를 삭제하시겠습니까? (연결된 작업·협업·결정은 보존되고 연결만 해제됩니다)')) return
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? '삭제에 실패했습니다.') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-navy">프로젝트</h1>
        <Button onClick={openAdd}><Plus size={14} /> 새 프로젝트</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${f.id === statusFilter ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select className={`${inputClass} w-auto py-1.5`} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
          <option value="all">전체 팀</option>
          {allTeams.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className={`${inputClass} w-auto py-1.5`} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">최신순</option>
          <option value="due">마감임박</option>
          <option value="progress">진행률</option>
        </select>
        <input className={`${inputClass} w-auto py-1.5`} placeholder="이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="ml-auto text-[11px] text-slate-400">{shown.length}개</span>
      </div>

      {shown.length === 0 ? (
        <Card><p className="py-10 text-center text-[13px] text-slate-400">조건에 맞는 프로젝트가 없습니다.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.active
            const progress = pct(p.taskDone, p.taskTotal)
            return (
              <Card key={p.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-1.5 text-[14px] font-bold text-navy hover:underline">
                    <FolderKanban size={15} className="shrink-0 text-navy-light" />{p.name}
                  </Link>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">담당 {p.ownerName || '미지정'}{p.dueDate ? ` · 마감 ${p.dueDate}` : ''}</div>
                {p.teams.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.teams.slice(0, 4).map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{t}</span>)}
                  </div>
                )}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-navy-light" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>작업 {p.taskDone}/{p.taskTotal}</span><span>{progress}%</span>
                </div>
                {canEditProjectRow(p.ownerId) && (
                  <div className="mt-2.5 flex justify-end gap-1 border-t border-slate-50 pt-2">
                    <button onClick={() => openEdit(p)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-light" aria-label="수정"><Pencil size={14} /></button>
                    <button onClick={() => remove(p.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제"><X size={15} /></button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? '프로젝트 수정' : '새 프로젝트'}>
        <Field label="이름"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="설명"><textarea className={`${inputClass} min-h-16`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="담당자">
            <select className={inputClass} value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
              <option value="">미지정</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="마감일"><input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
        </div>
        <Field label="상태">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">진행</option><option value="onhold">보류</option><option value="done">완료</option>
          </select>
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 4: 목록 페이지 작성** — `src/app/(dashboard)/projects/page.tsx`:

```tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditProject, type Role } from '@/lib/rbac'
import { ProjectsManager } from '@/components/dashboard/ProjectsManager'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const session = await auth()
  const role = session!.user.role as Role
  const userId = session!.user.id

  const [projects, tasks, users, teams] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({ where: { projectId: { not: null } }, select: { projectId: true, team: true, status: true } }),
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
  ])

  const rows = projects.map((p) => {
    const pt = tasks.filter((t) => t.projectId === p.id)
    const teamSet = [...new Set(pt.map((t) => t.team))]
    return {
      id: p.id, name: p.name, status: p.status, ownerId: p.ownerId, ownerName: p.ownerName,
      dueDate: p.dueDate, taskTotal: pt.length, taskDone: pt.filter((t) => t.status === 'done').length, teams: teamSet,
    }
  })

  return (
    <ProjectsManager
      projects={rows}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
      allTeams={teams.map((t) => t.name)}
      canEditProjectRow={(ownerId) => canEditProject(role, ownerId, userId)}
    />
  )
}
```

- [ ] **Step 5: 타입체크 + 빌드**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec tsc --noEmit 2>&1 | tail -8 && pnpm build 2>&1 | tail -4`
Expected: 통과, `/projects` 라우트 등장.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/c/Desktop/hk-pm-tool && git add -A && git commit -m "feat(project): 프로젝트 탭·목록·필터·생성/수정 UI

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 기존 생성 API에 projectId 수용

**Files:**
- Modify: `src/app/api/tasks/route.ts` (POST)
- Modify: `src/app/api/collaborations/route.ts` (POST)
- Modify: `src/app/api/escalations/route.ts` (POST)

**Interfaces:**
- Produces: 세 생성 엔드포인트가 바디의 `projectId`(선택)를 받아 유효하면 저장.

- [ ] **Step 1: 공통 헬퍼 로직** — 각 POST에서 레코드 생성 `data`에 아래를 추가(생성 직전):

```typescript
  const projectId = b.projectId
    ? (await prisma.project.findUnique({ where: { id: String(b.projectId) }, select: { id: true } }))?.id ?? null
    : null
```
그리고 `prisma.X.create({ data: { ...기존..., projectId } })`에 `projectId` 포함.
- tasks POST: `task.create` data에 `projectId` 추가.
- collaborations POST: `collaboration.create` data에 `projectId` 추가.
- escalations POST: `escalation.create` data에 `projectId` 추가.

- [ ] **Step 2: 타입체크**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec tsc --noEmit 2>&1 | tail -6`
Expected: 통과.

- [ ] **Step 3: 동작 검증 스크립트** — scratchpad에 작성 후 실행:

```typescript
import { prisma } from '../src/lib/prisma'
async function main() {
  const u = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true, name: true } })
  const p = await prisma.project.create({ data: { name: '__검증 프로젝트', createdById: u!.id, createdByName: u!.name } })
  const t = await prisma.task.create({ data: { title: '__pt작업', team: '__T', status: 'todo', priority: 'mid', createdById: u!.id, createdByName: u!.name, projectId: p.id } })
  const back = await prisma.project.findUnique({ where: { id: p.id }, include: { tasks: true } })
  console.log('연결 작업 수:', back?.tasks.length, back?.tasks.length === 1 ? 'OK' : 'FAIL')
  await prisma.project.delete({ where: { id: p.id } })
  const orphan = await prisma.task.findUnique({ where: { id: t.id }, select: { projectId: true } })
  console.log('삭제 후 작업 projectId:', orphan?.projectId, orphan?.projectId === null ? 'OK(SetNull)' : 'FAIL')
  await prisma.task.delete({ where: { id: t.id } })
  console.log('정리 완료')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```
Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec tsx --env-file=.env scratchpad/verify.ts` → 기대: 연결 OK + SetNull OK. 실행 후 스크립트 삭제.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/c/Desktop/hk-pm-tool && git add -A && git commit -m "feat(project): 작업·협업·결정요청 생성 시 projectId 연결

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 매니저에 projectId 필터·주입·뱃지·선택 추가

**Files:**
- Modify: `src/components/dashboard/TaskBoard.tsx`
- Modify: `src/components/dashboard/CollaborationManager.tsx`
- Modify: `src/components/dashboard/EscalationManager.tsx`
- Modify: `src/components/dashboard/DecisionsManager.tsx`

**Interfaces:**
- Consumes: 각 항목에 `projectId: string | null` 포함된 데이터, `projects: {id,name}[]`(선택 목록).
- Produces: 공통 prop `projects?: {id,name}[]`(생성 폼 드롭다운용), `lockProjectId?: string`(프로젝트 상세에서 고정 주입), `projectFilter`는 각 매니저 내부 상태. 각 item 타입에 `projectName?: string | null` 추가(뱃지 표시).

- [ ] **Step 1: TaskBoard** — `Task` 타입에 `projectId: string | null; projectName?: string | null` 추가. props에 `projects?: {id:string;name:string}[]`와 `lockProjectId?: string` 추가. 생성 폼(`emptyForm`)에 `projectId: lockProjectId ?? ''` 포함, 저장 바디에 `projectId` 포함. 상단에 프로젝트 필터 select(값: all/각 project/none=미분류) 추가하되 `lockProjectId`가 있으면 숨김. 카드에 `t.projectName && <Badge tone="blue">{t.projectName}</Badge>` 표시. 모달에 `lockProjectId`가 없을 때만 "프로젝트" select(미지정 포함) 노출.

표시 필터 로직 예:
```typescript
const shownByProject = projectFilter === 'all' ? tasks
  : projectFilter === 'none' ? tasks.filter((t) => !t.projectId)
  : tasks.filter((t) => t.projectId === projectFilter)
```
(`lockProjectId`가 있으면 서버에서 이미 필터링되므로 projectFilter 미노출·기본 all.)

- [ ] **Step 2: CollaborationManager** — `Collab` 타입에 `projectId: string | null; projectName?: string | null` 추가. props에 `projects?`, `lockProjectId?` 추가. 새 협업 요청 생성 폼에 `projectId`(기본 `lockProjectId ?? ''`) 포함·저장 바디에 포함. 상단 필터 묶음(기존 상태·팀 필터 옆)에 프로젝트 필터 추가(`lockProjectId` 없을 때만). 카드 헤더 뱃지 영역에 `c.projectName && <Badge tone="blue">{c.projectName}</Badge>`.

- [ ] **Step 3: EscalationManager** — `Escalation` 타입에 `projectId: string | null; projectName?: string | null` 추가. props에 `projects?`, `lockProjectId?`. 추가 모달 폼에 `projectId`(기본 `lockProjectId ?? ''`) + 저장 바디 포함. 표(상단)에 프로젝트 필터 select(`lockProjectId` 없을 때). 각 행 항목명 옆에 projectName 뱃지.

- [ ] **Step 4: DecisionsManager** — `Decision` 타입에 `projectName?: string | null` 추가(표시만; 결정은 생성 시 프로젝트 자동연결은 범위 밖, 상세에서 lock만). props에 `lockProjectId?` 추가하면 표시 필터만. 결정 로그는 생성 폼에 프로젝트 선택 미추가(YAGNI). 각 행 내용 옆 projectName 뱃지 표시.

- [ ] **Step 5: 타입체크 + 빌드**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec tsc --noEmit 2>&1 | tail -10 && pnpm build 2>&1 | tail -4`
Expected: 통과. (이 태스크는 타입 시그니처 변경이 커서 다음 Task 7·8에서 호출부를 맞추기 전까지 **임시로 기존 페이지 호출이 깨질 수 있음** → Step 5에서 에러가 나면 호출부에 신규 prop을 optional로 두었는지 확인하고, 깨지는 필수 필드(`projectId`)는 각 페이지 매핑에 추가. 아래 Task 8이 호출부를 완성하므로, Task 6·8을 한 커밋 범위로 보고 Task 8까지 끝낸 뒤 빌드가 최종 통과하면 됨.)

- [ ] **Step 6: Commit**

```bash
cd /c/Users/c/Desktop/hk-pm-tool && git add -A && git commit -m "feat(project): 매니저에 projectId 필터·주입·뱃지 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: 프로젝트 상세 페이지

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: 매니저들의 `lockProjectId`·필터링된 데이터.
- Produces: `/projects/[id]` 상세(헤더 + 작업보드/협업/결정요청/결정로그 섹션, 모두 projectId로 필터).

- [ ] **Step 1: 상세 페이지 작성** — `src/app/(dashboard)/projects/[id]/page.tsx`. `notFound()` 처리, 프로젝트 조회, 그 projectId로 tasks/collabs/escalations/decisions·teams·users 조회해 각 매니저에 `lockProjectId={id}`로 전달. 헤더에 이름·담당자·상태·마감·진행률 바 표시. (데이터 매핑은 기존 `tasks/page.tsx`, `collaboration/page.tsx`, `escalation/page.tsx`, `decisions/page.tsx`의 매핑을 그대로 참고하되 `where`에 `projectId: id` 추가, 각 item에 `projectName` 생략 가능(상세에선 동일 프로젝트).) `editableTeams`/`scopeToArray` 등 기존 scope 로직 재사용.

- [ ] **Step 2: 타입체크 + 빌드**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec tsc --noEmit 2>&1 | tail -8 && pnpm build 2>&1 | tail -4`
Expected: 통과, `/projects/[id]` 등장.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/c/Desktop/hk-pm-tool && git add -A && git commit -m "feat(project): 프로젝트 상세(작업·협업·결정요청·결정로그 통합)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: 전사 탭 페이지에 projects 전달 + 프로젝트명 매핑

**Files:**
- Modify: `src/app/(dashboard)/tasks/page.tsx`
- Modify: `src/app/(dashboard)/collaboration/page.tsx`
- Modify: `src/app/(dashboard)/escalation/page.tsx`
- Modify: `src/app/(dashboard)/decisions/page.tsx`

**Interfaces:**
- Consumes: `prisma.project.findMany` (id,name) 맵.
- Produces: 각 매니저에 `projects` prop 전달, 각 item에 `projectId`·`projectName`(맵 조회) 채움.

- [ ] **Step 1: 각 페이지 수정** — 각 페이지에서:
  - `include`/조회에 `project: { select: { name: true } }` 추가(또는 projectId로 맵 조회).
  - 매핑에 `projectId: x.projectId, projectName: x.project?.name ?? null` 추가.
  - `prisma.project.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })` 추가해 매니저 `projects` prop으로 전달.
  - 예(tasks): `include: { collaboration: {...}, comments: {...}, project: { select: { name: true } } }`.

- [ ] **Step 2: 타입체크 + 빌드(최종 통합)**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec tsc --noEmit 2>&1 | tail -10 && pnpm build 2>&1 | tail -6`
Expected: 통과(Task 6의 매니저 prop과 완전히 정합).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/c/Desktop/hk-pm-tool && git add -A && git commit -m "feat(project): 전사 탭에 프로젝트 필터·뱃지 연결

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: 전체현황 — 진행 중 프로젝트 요약

**Files:**
- Modify: `src/app/(dashboard)/overview/page.tsx`
- Modify: `src/components/dashboard/OverviewVisuals.tsx` (요약 컴포넌트 추가)

**Interfaces:**
- Consumes: active 프로젝트 + 작업 집계.
- Produces: `ProjectsSummary` 컴포넌트(상위 N개 진행률 바).

- [ ] **Step 1: ProjectsSummary 컴포넌트** — `OverviewVisuals.tsx`에 추가:

```tsx
export function ProjectsSummary({ projects }: { projects: { id: string; name: string; done: number; total: number }[] }) {
  if (projects.length === 0) return <p className="py-4 text-center text-[13px] text-slate-400">진행 중 프로젝트 없음</p>
  return (
    <div className="space-y-2.5">
      {projects.map((p) => {
        const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
        return (
          <a key={p.id} href={`/projects/${p.id}`} className="block rounded-lg border border-line px-3 py-2 transition hover:bg-slate-50">
            <div className="flex items-center justify-between text-[13px]"><span className="font-semibold text-navy">{p.name}</span><span className="text-[11px] text-slate-400">{p.done}/{p.total} · {pct}%</span></div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-navy-light" style={{ width: `${pct}%` }} /></div>
          </a>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: overview 페이지에 섹션 추가** — active 프로젝트 조회 + 작업 집계 후 카드로 렌더:

```typescript
const activeProjects = await prisma.project.findMany({ where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 5 })
const projTasks = await prisma.task.findMany({ where: { projectId: { in: activeProjects.map((p) => p.id) } }, select: { projectId: true, status: true } })
const projSummary = activeProjects.map((p) => {
  const pt = projTasks.filter((t) => t.projectId === p.id)
  return { id: p.id, name: p.name, done: pt.filter((t) => t.status === 'done').length, total: pt.length }
})
```
렌더(결정요청 카드 위 적당한 위치):
```tsx
<Card>
  <h2 className="mb-3 text-base font-bold text-navy">진행 중 프로젝트</h2>
  <ProjectsSummary projects={projSummary} />
</Card>
```
import에 `ProjectsSummary` 추가.

- [ ] **Step 3: 타입체크 + 빌드**

Run: `cd /c/Users/c/Desktop/hk-pm-tool && pnpm exec tsc --noEmit 2>&1 | tail -6 && pnpm build 2>&1 | tail -4`
Expected: 통과.

- [ ] **Step 4: Commit + push**

```bash
cd /c/Users/c/Desktop/hk-pm-tool && git add -A && git commit -m "feat(project): 전체현황에 진행 중 프로젝트 요약

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" && git push origin main
```

---

## Self-Review 메모
- 수용 기준 대비: 생성/수정/삭제 권한(Task 2·3), SetNull 보존(Task 1·5검증), 상세 통합(Task 7), 자동연결(Task 5), 전사 필터·뱃지(Task 6·8), 목록 필터(Task 4), 미분류 유지(Task 1), 전체현황 요약(Task 9) — 모두 커버.
- Task 6은 타입 시그니처가 커서 Task 8 호출부와 함께 최종 빌드가 통과해야 함(Task 6 Step5 주석 참조). 실행 시 Task 6→7→8을 연속 진행 권장.
- api-guard 반환형은 구현 전 `src/lib/api-guard.ts`를 읽어 `g.res`/`g.session` 접근이 맞는지 확인.
