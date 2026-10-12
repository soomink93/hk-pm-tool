// 탭 이동·데이터 로딩 시 자동 표시되는 스켈레톤 (Next App Router 네이티브)
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-label="불러오는 중">
      <div className="h-7 w-40 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 ring-1 ring-black/5" />
        ))}
      </div>
      <div className="grid gap-3.5 lg:grid-cols-2">
        <div className="h-44 rounded-xl bg-slate-100 ring-1 ring-black/5" />
        <div className="h-44 rounded-xl bg-slate-100 ring-1 ring-black/5" />
      </div>
      <div className="h-56 rounded-xl bg-slate-100 ring-1 ring-black/5" />
    </div>
  )
}
