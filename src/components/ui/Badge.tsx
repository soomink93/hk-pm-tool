type Tone = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
