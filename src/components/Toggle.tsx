import { cn } from '../lib/cn'

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  className,
  id,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
  className?: string
  id?: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      title={hint}
      onClick={() => onChange(!checked)}
      className={cn(
        'group inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded text-left text-[11px] leading-4 text-muted transition-colors hover:text-zinc-200',
        className,
      )}
    >
      <span
        className={cn(
          'relative inline-block h-4 w-7 shrink-0 rounded-full border transition-colors',
          checked ? 'border-live/50 bg-live/70' : 'border-line-strong bg-ink-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-ink-950 transition-transform',
            checked ? 'translate-x-[13px]' : 'translate-x-[3px]',
          )}
        />
      </span>
      <span className={cn('whitespace-nowrap', checked && 'text-zinc-300')}>{label}</span>
    </button>
  )
}