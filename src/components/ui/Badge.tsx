import { STATUS_BADGE, STATUS_LABEL } from '@/lib/constants'

type Tone = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function StatusBadge({ status }: { status: keyof typeof STATUS_LABEL }) {
  return <span className={`badge ${STATUS_BADGE[status] ?? 'badge-gray'}`}>{STATUS_LABEL[status] ?? status}</span>
}
