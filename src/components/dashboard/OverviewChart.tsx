'use client'

export function OverviewChart({
  data,
}: {
  data: { label: string; value: number; color: string }[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return <p className="py-8 text-center text-[13px] text-slate-400">표시할 데이터가 없습니다.</p>
  }

  let acc = 0
  const stops = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const start = (acc / total) * 360
      acc += d.value
      const end = (acc / total) * 360
      return `${d.color} ${start}deg ${end}deg`
    })
    .join(', ')

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative h-32 w-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
      >
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-extrabold text-navy">{total}</span>
          <span className="text-[10px] text-slate-400">전체 팀</span>
        </div>
      </div>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-[13px]">
            <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
            <span className="text-slate-600">{d.label}</span>
            <span className="font-bold text-navy">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
