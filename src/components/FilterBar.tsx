import { ChevronDown, Download, Search, X } from 'lucide-react'
import type { SportKey } from '../lib/types'
import type { DisplayZone } from '../lib/time'
import { SPORT_LABEL } from './SportIcon'
import { Toggle } from './Toggle'
import { cn } from '../lib/cn'

export type StatusFilter = 'all' | 'live' | 'upcoming' | 'ended'
export type DateFilter = 'all' | 'today' | 'tomorrow'

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'live', label: 'Đang diễn ra' },
  { value: 'upcoming', label: 'Sắp tới' },
  { value: 'ended', label: 'Đã xong' },
]

const DATE_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'all', label: 'Mọi ngày' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'tomorrow', label: 'Ngày mai' },
]

const ZONE_OPTIONS: Array<{ value: DisplayZone; label: string }> = [
  { value: 'vn', label: 'Giờ VN' },
  { value: 'local', label: 'Giờ máy' },
]

function Segment<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (next: T) => void
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 items-center rounded-md border border-line bg-ink-900 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'rounded px-2 py-1 text-[11px] leading-4 transition-colors',
            value === option.value
              ? 'bg-ink-750 text-zinc-100 shadow-sm'
              : 'text-muted hover:text-zinc-200',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface FilterBarProps {
  query: string
  onQuery: (value: string) => void
  status: StatusFilter
  onStatus: (value: StatusFilter) => void
  sport: SportKey | 'all'
  onSport: (value: SportKey | 'all') => void
  sports: SportKey[]
  date: DateFilter
  onDate: (value: DateFilter) => void
  zone: DisplayZone
  onZone: (value: DisplayZone) => void
  showZoneToggle: boolean
  hideNoSignal: boolean
  onHideNoSignal: (value: boolean) => void
  exportCount: number
  onExport: () => void
  activeCommentator?: { display: string } | null
  onClearCommentator?: () => void
}

export function FilterBar({
  query,
  onQuery,
  status,
  onStatus,
  sport,
  onSport,
  sports,
  date,
  onDate,
  zone,
  onZone,
  showZoneToggle,
  hideNoSignal,
  onHideNoSignal,
  exportCount,
  onExport,
  activeCommentator,
  onClearCommentator,
}: FilterBarProps) {
  return (
    <div className="mb-3 min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-40">
          <span className="sr-only">Tìm trận</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Tìm đội bóng, BLV, nguồn… (không cần dấu)"
            autoComplete="off"
            spellCheck={false}
            className="h-8 w-full rounded-md border border-line bg-ink-900 pl-8 pr-8 text-xs text-zinc-200 placeholder:text-muted/70 focus:border-line-strong focus:outline-none focus:ring-1 focus:ring-live/30 [&::-webkit-search-cancel-button]:appearance-none"
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
          onClick={onExport}
          disabled={exportCount === 0}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-live/30 bg-live-dim px-2.5 text-[11px] font-medium text-live-text transition-colors hover:border-live/50 hover:bg-live/15 disabled:cursor-not-allowed disabled:border-line disabled:bg-ink-900 disabled:text-muted"
          title="Tải file .m3u gồm đúng các nguồn đang hiển thị"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Xuất playlist</span>
          <span className="tabular-nums opacity-80">{exportCount}</span>
        </button>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 gap-y-1.5">
        <Segment value={status} options={STATUS_OPTIONS} onChange={onStatus} label="Trạng thái trận" />
        <Segment value={date} options={DATE_OPTIONS} onChange={onDate} label="Lọc theo ngày" />
        {showZoneToggle ? (
          <Segment
            value={zone}
            options={ZONE_OPTIONS}
            onChange={onZone}
            label="Múi giờ hiển thị"
          />
        ) : null}

        <div className="relative shrink-0">
          <select
            value={sport}
            onChange={(event) => onSport(event.target.value as SportKey | 'all')}
            aria-label="Lọc theo môn thể thao"
            className="h-[30px] appearance-none rounded-md border border-line bg-ink-900 pl-2.5 pr-7 text-[11px] text-zinc-300 focus:border-line-strong focus:outline-none"
          >
            <option value="all">Mọi môn</option>
            {sports.map((key) => (
              <option key={key} value={key}>
                {SPORT_LABEL[key]}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted"
            aria-hidden
          />
        </div>

        {activeCommentator ? (
          <span className="inline-flex h-[30px] shrink-0 items-center gap-1 rounded-full border border-live/35 bg-live-dim pl-2.5 pr-1 text-[11px] text-live-text">
            <span className="max-w-[160px] truncate">
              BLV: {activeCommentator.display}
            </span>
            <button
              type="button"
              onClick={() => onClearCommentator?.()}
              aria-label="Bỏ lọc bình luận viên"
              className="grid h-5 w-5 place-items-center rounded-full text-live-text/80 transition-colors hover:bg-live/15 hover:text-live-text"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ) : null}

        <Toggle
          checked={hideNoSignal}
          onChange={onHideNoSignal}
          label="Ẩn nguồn no-signal"
          hint="Mặc định bật: nguồn no-signal (URL chứa “no-signal”) bị ẩn"
          className="ml-1 shrink-0"
        />
      </div>
    </div>
  )
}