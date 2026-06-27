type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition disabled:opacity-60'
  const styles =
    variant === 'primary'
      ? 'bg-navy-light text-white hover:bg-navy'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  return <button className={`${base} ${styles} ${className}`} {...props} />
}
