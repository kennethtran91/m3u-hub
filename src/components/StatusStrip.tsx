import { Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import type { HealthResult } from '../lib/types'
import type { DisplayZone } from '../lib/time'
import { displayZoneLabel, fmtAge, fmtDateTime, isStale } from '../lib/time'
import { cn } from '../lib/cn'

const STATUS_LABEL: Record<HealthResult['status'], string> = {
  OK: 'OK',
  EMPTY: 'Playlist rỗng',
  HTTP_ERROR: 'Lỗi HTTP',
  NETWORK_ERROR: 'Lỗi kết nối',
  TIMEOUT: 'Hết thời gian chờ',
}

export function StatusStrip({
  health,
  lastCheckedAt,
  servedFromCache,
  cacheFetchedAt,
  updatedAt,
  updatedLabel,
  zone = 'vn',
}: {
  health: HealthResult | null
  lastCheckedAt: number | null
  servedFromCache: boolean
  cacheFetchedAt: number | null
  updatedAt?: Date | null
  updatedLabel?: string | null
  zone?: DisplayZone
}) {
  const ok = health?.status === 'OK'
  const stale = updatedAt ? isStale(updatedAt.getTime()) : false
  const dotClass = !health
    ? 'bg-zinc-600'
    : ok
      ? 'bg-live'
      : health.status === 'EMPTY'
        ? 'bg-warn'
        : 'bg-red-400'

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft py-1.5 text-[11px] leading-4 text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
        {lastCheckedAt ? (
          <span className="tabular-nums">Kiểm tra {fmtDateTime(new Date(lastCheckedAt), zone)}</span>
        ) : (
          <span>Chưa kiểm tra</span>
        )}
        <span className="text-line-strong">·</span>
        <span className={ok ? 'text-live-text' : health ? 'text-warn' : ''}>
          {health ? STATUS_LABEL[health.status] : '—'}
        </span>
        {ok && health?.parsed ? (
          <>
            <span className="text-line-strong">·</span>
            <span className="tabular-nums">{health.parsed.stats.usableCount} nguồn</span>
          </>
        ) : null}
      </span>

      {servedFromCache && cacheFetchedAt ? (
        <span className="inline-flex items-center gap-1.5 text-warn">
          <WifiOff className="h-3 w-3" aria-hidden />
          Dữ liệu lưu lúc {fmtDateTime(new Date(cacheFetchedAt), zone)}
        </span>
      ) : cacheFetchedAt ? (
        <span className="inline-flex items-center gap-1.5">
          <Wifi className="h-3 w-3" aria-hidden />
          Bản tải {fmtAge(cacheFetchedAt)}
        </span>
      ) : null}

      {updatedAt ? (
        <span
          className={cn('inline-flex items-center gap-1.5 md:hidden', stale ? 'text-warn' : 'text-muted')}
          title={`Mốc cập nhật trong playlist: ${updatedLabel ?? 'không rõ'}${
            stale ? ' — đã cũ hơn 48 giờ' : ''
          }`}
        >
          <Clock className="h-3 w-3" aria-hidden />
          Cập nhật {fmtDateTime(updatedAt, zone)}
          <span className="text-muted/70">giờ {displayZoneLabel(zone)}</span>
        </span>
      ) : null}

      <span className="ml-auto inline-flex items-center gap-1.5">
        <RefreshCw className="h-3 w-3" aria-hidden />
        Tự kiểm tra mỗi 15 phút
      </span>
    </div>
  )
}