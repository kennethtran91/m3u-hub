import { Link2, RefreshCw } from 'lucide-react'
import { cn } from '../lib/cn'

/**
 * One 52px row: brand, at-a-glance counts, refresh, Link. Health, cache age and
 * the playlist update marker only surface as a single notice line — and only
 * when something is actually off.
 */
export function TopBar({
  matchCount,
  liveCount,
  loading,
  onRefresh,
  onOpenLink,
  notice,
}: {
  matchCount: number
  liveCount: number
  loading: boolean
  onRefresh: () => void
  onOpenLink: () => void
  notice: string | null
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink-950/95 backdrop-blur">
      <div className="mx-auto flex h-[52px] max-w-[820px] items-center gap-3 px-3 sm:px-4">
        <span className="shrink-0 text-[15px] font-semibold tracking-tight text-zinc-100">M3U Hub</span>

        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[12px] tabular-nums text-muted">
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              liveCount > 0 ? 'animate-live-pulse bg-live' : 'bg-zinc-600',
            )}
          />
          {matchCount} trận
          {liveCount > 0 ? <span className="text-live-text">· {liveCount} live</span> : null}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Tải lại playlist"
            title="Tải lại playlist"
            className="grid h-8 w-8 place-items-center rounded-md border border-line bg-ink-900 text-zinc-300 transition-colors hover:border-line-strong hover:text-zinc-100 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onOpenLink}
            aria-label="Quản lý link playlist"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-ink-900 px-2.5 text-xs text-zinc-300 transition-colors hover:border-line-strong hover:text-zinc-100"
          >
            <Link2 className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Link</span>
          </button>
        </div>
      </div>

      {notice ? (
        <div className="border-t border-line-soft bg-warn/5 px-3 py-1.5 text-[11px] leading-4 text-warn sm:px-4">
          <div className="mx-auto max-w-[820px]">{notice}</div>
        </div>
      ) : null}
    </header>
  )
}
