export function Card({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({
  title,
  value,
  sub,
  valueClass = 'text-navy',
}: {
  title: string
  value: React.ReactNode
  sub?: string
  valueClass?: string
}) {
  return (
    <Card>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</div>
      <div className={`mt-1.5 text-3xl font-extrabold leading-none ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1.5 text-xs text-slate-400">{sub}</div>}
    </Card>
  )
}
