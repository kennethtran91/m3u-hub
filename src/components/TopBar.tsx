import { AlertTriangle, Clock, Link2, Radio, RefreshCw } from 'lucide-react'
import type { DisplayZone } from '../lib/time'
import { fmtDate, fmtTime, HOUR, displayZoneLabel } from '../lib/time'
import { cn } from '../lib/cn'
import { StatusStrip } from './StatusStrip'
import type { HealthResult } from '../lib/types'

interface TopBarProps {
  matchCount: number
  totalMatches: number
  liveCount: number
  updatedAt: Date | null
  updatedLabel: string | null
  loading: boolean
  onRefresh: () => void
  onOpenLink: () => void
  health: HealthResult | null
  lastCheckedAt: number | null
  servedFromCache: boolean
  cacheFetchedAt: number | null
  zone?: DisplayZone
}

export function TopBar({
  matchCount,
  totalMatches,
  liveCount,
  updatedAt,
  updatedLabel,
  loading,
  onRefresh,
  onOpenLink,
  health,
  lastCheckedAt,
  servedFromCache,
  cacheFetchedAt,
  zone = 'vn',
}: TopBarProps) {
  const stale = updatedAt ? Date.now() - updatedAt.getTime() > 48 * HOUR : false
  const filtered = matchCount !== totalMatches

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink-950/95 backdrop-blur supports-[backdrop-filter]:bg-ink-950/80">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-5">
        <div className="flex h-14 items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-live/25 bg-live-dim text-live-text">
              <Radio className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold leading-tight tracking-tight text-zinc-100">
                M3U Hub
              </div>
              <div className="hidden text-[10px] uppercase tracking-[0.16em] text-muted sm:block">
                Tìm trận · Mở VLC
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div
              className="flex items-baseline gap-1.5 rounded-md border border-line bg-ink-900 px-2.5 py-1"
              title={`${matchCount} / ${totalMatches} trận sau bộ lọc`}
            >
              <span className="text-[15px] font-semibold leading-none tabular-nums text-zinc-100">
                {matchCount}
              </span>
              <span className="hidden text-[11px] leading-none text-muted sm:inline">
                {filtered ? `/ ${totalMatches} trận` : 'trận'}
              </span>
            </div>

            <div
              className={cn(
                'flex items-baseline gap-1.5 rounded-md border px-2.5 py-1',
                liveCount > 0
                  ? 'border-live/30 bg-live-dim'
                  : 'border-line bg-ink-900',
              )}
              title={`${liveCount} trận đang diễn ra`}
            >
              <span
                className={cn(
                  'mt-0.5 h-1.5 w-1.5 shrink-0 self-center rounded-full',
                  liveCount > 0 ? 'animate-live-pulse bg-live' : 'bg-zinc-600',
                )}
              />
              <span
                className={cn(
                  'text-[15px] font-semibold leading-none tabular-nums',
                  liveCount > 0 ? 'text-live-text' : 'text-zinc-300',
                )}
              >
                {liveCount}
              </span>
              <span
                className={cn(
                  'hidden text-[11px] leading-none sm:inline',
                  liveCount > 0 ? 'text-live-text/70' : 'text-muted',
                )}
              >
                live
              </span>
            </div>

            {updatedAt ? (
              <div
                className={cn(
                  'hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] md:flex',
                  stale
                    ? 'border-warn/30 bg-warn/5 text-warn'
                    : 'border-line bg-ink-900 text-muted',
                )}
                title={`Playlist tự cập nhật: ${updatedLabel ?? 'không rõ'}${
                  stale ? ' — đã cũ hơn 48 giờ' : ''
                }`}
              >
                {stale ? (
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                ) : (
                  <Clock className="h-3 w-3" aria-hidden />
                )}
                <span className="tabular-nums">
                  {fmtTime(updatedAt, zone)} {fmtDate(updatedAt, zone)}
                </span>
                <span className="text-[10px] text-muted/80">giờ {displayZoneLabel(zone)}</span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Tải lại playlist"
              title="Tải lại playlist từ link"
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

        <StatusStrip
          health={health}
          lastCheckedAt={lastCheckedAt}
          servedFromCache={servedFromCache}
          cacheFetchedAt={cacheFetchedAt}
          updatedAt={updatedAt}
          updatedLabel={updatedLabel}
          zone={zone}
        />
      </div>
    </header>
  )
}