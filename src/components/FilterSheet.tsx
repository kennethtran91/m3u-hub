import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'
import type { SportKey } from '../lib/types'
import type { DisplayZone } from '../lib/time'
import { displayZoneLabel } from '../lib/time'
import { SPORT_LABEL } from './SportIcon'
import { Toggle } from './Toggle'
import type {
  CommentatorCount,
  DateFilter,
  GroupCount,
  StatusFilter,
} from './FilterSheet.types'

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <div className="inline-flex w-fit rounded-md border border-line bg-ink-900 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              'rounded px-2.5 py-1.5 text-[12px] transition-colors',
              value === option.value ? 'bg-ink-750 text-zinc-100' : 'text-muted hover:text-zinc-200',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ListRow({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors',
        active ? 'bg-live-dim text-live-text' : 'text-zinc-300 hover:bg-ink-850',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count === undefined ? null : (
        <span className={cn('shrink-0 text-[11px] tabular-nums', active ? 'text-live-text/80' : 'text-muted')}>
          {count}
        </span>
      )}
    </button>
  )
}

export interface FilterSheetProps {
  open: boolean
  onClose: () => void
  status: StatusFilter
  onStatus: (next: StatusFilter) => void
  date: DateFilter
  onDate: (next: DateFilter) => void
  sport: SportKey | 'all'
  onSport: (next: SportKey | 'all') => void
  sports: SportKey[]
  groups: GroupCount[]
  totalUsable: number
  activeGroup: string
  onGroup: (next: string) => void
  commentators: CommentatorCount[]
  activeCommentator: string | null
  onCommentator: (next: string | null) => void
  onlyAlive: boolean
  onOnlyAlive: (next: boolean) => void
  hideNoSignal: boolean
  onHideNoSignal: (next: boolean) => void
  zone: DisplayZone
  onZone: (next: DisplayZone) => void
  showZoneToggle: boolean
  onReset: () => void
  activeCount: number
}

export function FilterSheet({
  open,
  onClose,
  status,
  onStatus,
  date,
  onDate,
  sport,
  onSport,
  sports,
  groups,
  totalUsable,
  activeGroup,
  onGroup,
  commentators,
  activeCommentator,
  onCommentator,
  onlyAlive,
  onOnlyAlive,
  hideNoSignal,
  onHideNoSignal,
  zone,
  onZone,
  showZoneToggle,
  onReset,
  activeCount,
}: FilterSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  const sportOptions: Array<SportKey | 'all'> = ['all', ...sports]

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Đóng bộ lọc"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bộ lọc"
        className="relative flex max-h-[86vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-xl border border-line bg-ink-900 shadow-pop sm:mb-4 sm:rounded-xl"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="text-[13.5px] font-semibold text-zinc-100">Lọc</span>
          {activeCount > 0 ? (
            <span className="rounded-full bg-live-dim px-2 py-0.5 text-[10px] font-semibold text-live-text">
              {activeCount} đang bật
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="ml-auto grid h-7 w-7 place-items-center rounded text-muted hover:bg-ink-800 hover:text-zinc-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
          <Segmented
            label="Trạng thái"
            value={status}
            onChange={onStatus}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'live', label: 'Live' },
              { value: 'upcoming', label: 'Sắp tới' },
              { value: 'ended', label: 'Đã xong' },
            ]}
          />

          <Segmented
            label="Ngày"
            value={date}
            onChange={onDate}
            options={[
              { value: 'all', label: 'Mọi ngày' },
              { value: 'today', label: 'Hôm nay' },
              { value: 'tomorrow', label: 'Ngày mai' },
            ]}
          />

          {sports.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Môn</span>
              <div className="flex flex-wrap gap-1.5">
                {sportOptions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSport(key)}
                    aria-pressed={sport === key}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11.5px] transition-colors',
                      sport === key
                        ? 'border-live/45 bg-live-dim text-live-text'
                        : 'border-line bg-ink-900 text-muted hover:text-zinc-200',
                    )}
                  >
                    {key === 'all' ? 'Mọi môn' : SPORT_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Nhóm kênh</span>
            <div className="max-h-[180px] overflow-y-auto rounded-md border border-line">
              <ListRow
                active={activeGroup === 'all'}
                label="Tất cả"
                count={totalUsable}
                onClick={() => onGroup('all')}
              />
              {groups.map((group) => (
                <ListRow
                  key={group.name}
                  active={activeGroup === group.name}
                  label={group.name}
                  count={group.usable}
                  onClick={() => onGroup(group.name)}
                />
              ))}
            </div>
          </div>

          {commentators.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Bình luận viên
              </span>
              <div className="max-h-[180px] overflow-y-auto rounded-md border border-line">
                <ListRow
                  active={activeCommentator === null}
                  label="Tất cả"
                  onClick={() => onCommentator(null)}
                />
                {commentators.map((row) => (
                  <ListRow
                    key={row.key}
                    active={activeCommentator === row.key}
                    label={row.display}
                    count={row.matchCount}
                    onClick={() => onCommentator(activeCommentator === row.key ? null : row.key)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2.5 border-t border-line-soft pt-3.5">
            <Toggle
              checked={onlyAlive}
              onChange={onOnlyAlive}
              label="Chỉ trận còn nguồn sống"
              hint="Ẩn các trận mà mọi nguồn đều là no-signal"
            />
            <Toggle
              checked={hideNoSignal}
              onChange={onHideNoSignal}
              label="Ẩn nguồn no-signal"
              hint="Nguồn trỏ tới URL chứa “no-signal” sẽ bị ẩn khỏi danh sách nguồn"
            />
            {showZoneToggle ? (
              <Segmented
                label="Giờ hiển thị"
                value={zone}
                onChange={onZone}
                options={[
                  { value: 'vn' as DisplayZone, label: `Giờ ${displayZoneLabel('vn')}` },
                  { value: 'local' as DisplayZone, label: 'Giờ máy' },
                ]}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={activeCount === 0}
            className="h-9 rounded-md border border-line bg-ink-850 text-[12px] text-zinc-300 transition-colors hover:border-line-strong disabled:opacity-45"
          >
            Xoá tất cả bộ lọc
          </button>
        </div>
      </div>
    </div>
  )
}
