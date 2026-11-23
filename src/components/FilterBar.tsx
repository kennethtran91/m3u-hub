import { Download, Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '../lib/cn'

/**
 * One row: search, the Lọc button (badge = number of active filters) and the
 * export button. Everything else lives in FilterSheet.
 */
export function FilterBar({
  query,
  onQuery,
  activeCount,
  onOpenSheet,
  exportCount,
  onExport,
}: {
  query: string
  onQuery: (next: string) => void
  activeCount: number
  onOpenSheet: () => void
  exportCount: number
  onExport: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-3 pb-2 pt-3 sm:px-4">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Tìm trận</span>
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Tìm đội, BLV, nguồn…"
          autoComplete="off"
          spellCheck={false}
          className="h-9 w-full rounded-md border border-line bg-ink-900 pl-8 pr-8 text-[13px] text-zinc-200 placeholder:text-muted/70 focus:border-line-strong focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQuery('')}
            aria-label="Xoá tìm kiếm"
            className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </label>

      <button
        type="button"
        onClick={onOpenSheet}
        aria-label="Bộ lọc"
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] transition-colors',
          activeCount > 0
            ? 'border-live/45 bg-live-dim text-live-text'
            : 'border-line bg-ink-900 text-zinc-300 hover:border-line-strong',
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        Lọc
        {activeCount > 0 ? (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-live px-1 text-[10px] font-bold text-ink-950">
            {activeCount}
          </span>
        ) : null}
      </button>

      <button
        type="button"
        onClick={onExport}
        disabled={exportCount === 0}
        title="Tải file .m3u gồm đúng các nguồn đang hiển thị"
        aria-label="Xuất playlist"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line bg-ink-900 px-2.5 text-[12px] text-zinc-300 transition-colors hover:border-line-strong disabled:opacity-45"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        <span className="tabular-nums">{exportCount}</span>
      </button>
    </div>
  )
}
