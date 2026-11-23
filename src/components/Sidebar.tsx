import { useState } from 'react'
import { ChevronDown, Mic, Radio, Search, SignalZero, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { normalizeText } from '../lib/time'
import { Toggle } from './Toggle'

export interface GroupCount {
  name: string
  usable: number
  total: number
}

export interface CommentatorCount {
  key: string
  display: string
  /** Sources carrying this commentator label. */
  count: number
  /** Distinct matches the commentator appears in. */
  matchCount: number
}

interface GroupSidebarProps {
  groups: GroupCount[]
  totalUsable: number
  active: string
  onSelect: (group: string) => void
  onlyAlive: boolean
  onToggleOnlyAlive: (next: boolean) => void
}

interface SidebarProps extends GroupSidebarProps {
  commentators: CommentatorCount[]
  activeCommentator: string | null
  onSelectCommentator: (key: string | null) => void
}

function GroupRow({
  name,
  usable,
  total,
  active,
  onSelect,
}: GroupCount & { active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
        active
          ? 'bg-ink-800 text-zinc-100'
          : 'text-muted hover:bg-ink-850 hover:text-zinc-200',
      )}
    >
      <span
        className={cn(
          'h-3.5 w-[3px] shrink-0 rounded-full',
          active ? 'bg-live' : 'bg-transparent',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span
        className={cn(
          'shrink-0 tabular-nums text-[11px]',
          usable === 0 ? 'text-warn/80' : active ? 'text-live-text' : 'text-muted',
        )}
      >
        {usable}
      </span>
      {usable === 0 ? (
        <SignalZero className="h-3 w-3 shrink-0 text-warn/70" aria-label="Không còn nguồn" />
      ) : null}
      <span className="sr-only">{total} mục</span>
    </button>
  )
}

function CommentatorSection({
  commentators,
  active,
  onSelect,
}: {
  commentators: CommentatorCount[]
  active: string | null
  onSelect: (key: string | null) => void
}) {
  const [open, setOpen] = useState(true)
  const [filter, setFilter] = useState('')
  const [showAll, setShowAll] = useState(false)

  const needle = normalizeText(filter)
  const matched = needle
    ? commentators.filter((row) => normalizeText(row.display).includes(needle))
    : commentators
  const CAP = 25
  const capped = !needle && !showAll && matched.length > CAP
  const rows = capped ? matched.slice(0, CAP) : matched
  const hidden = matched.length - rows.length

  return (
    <div className="mt-4 border-t border-line-soft pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-muted transition-colors hover:text-zinc-200"
      >
        <Mic className="h-3 w-3 shrink-0" aria-hidden />
        <span className="flex-1">Bình luận viên</span>
        <span className="tabular-nums text-[10px] tracking-normal text-muted/70">
          {commentators.length}
        </span>
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="mt-1.5">
          <p className="mb-1.5 px-2 text-[10px] leading-4 text-muted/70">lọc trận có BLV này</p>

          {commentators.length > 8 ? (
            <label className="relative mx-1 mb-1.5 block">
              <span className="sr-only">Tìm bình luận viên</span>
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Tìm BLV…"
                autoComplete="off"
                spellCheck={false}
                className="h-7 w-full rounded-md border border-line bg-ink-900 pl-7 pr-6 text-[11px] text-zinc-200 placeholder:text-muted/70 focus:border-line-strong focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
              />
              {filter ? (
                <button
                  type="button"
                  onClick={() => setFilter('')}
                  aria-label="Xoá tìm BLV"
                  className="absolute right-1 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-muted hover:text-zinc-200"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              ) : null}
            </label>
          ) : null}

          {commentators.length === 0 ? (
            <p className="px-2 py-1 text-[10px] leading-4 text-muted/70">
              Chưa có BLV nào xuất hiện ở từ 2 trận trở lên.
            </p>
          ) : rows.length === 0 ? (
            <p className="px-2 py-1 text-[10px] leading-4 text-muted/70">Không tìm thấy BLV.</p>
          ) : (
            <div className="max-h-[264px] space-y-0.5 overflow-y-auto pr-0.5">
              {rows.map((row) => {
                const isActive = active === row.key
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => onSelect(isActive ? null : row.key)}
                    aria-pressed={isActive}
                    title={`${row.display} · ${row.count} nguồn · ${row.matchCount} trận`}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                      isActive
                        ? 'bg-ink-800 text-zinc-100'
                        : 'text-muted hover:bg-ink-850 hover:text-zinc-200',
                    )}
                  >
                    <span
                      className={cn(
                        'h-3.5 w-[3px] shrink-0 rounded-full',
                        isActive ? 'bg-live' : 'bg-transparent',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{row.display}</span>
                    <span
                      className={cn(
                        'shrink-0 tabular-nums text-[11px]',
                        isActive ? 'text-live-text' : 'text-muted',
                      )}
                    >
                      {row.count}
                    </span>
                  </button>
                )
              })}
              {hidden > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="w-full rounded-md px-2 py-1 text-left text-[10px] text-muted transition-colors hover:bg-ink-850 hover:text-zinc-200"
                >
                  xem thêm {hidden}
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function Sidebar({
  groups,
  totalUsable,
  active,
  onSelect,
  onlyAlive,
  onToggleOnlyAlive,
  commentators,
  activeCommentator,
  onSelectCommentator,
}: SidebarProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[100px] w-[236px] shrink-0">
        <div className="mb-2 flex items-center gap-1.5 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          <Radio className="h-3 w-3" aria-hidden />
          Nguồn phát
        </div>
        <nav className="space-y-0.5">
          <button
            type="button"
            onClick={() => onSelect('all')}
            aria-current={active === 'all' ? 'true' : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
              active === 'all'
                ? 'bg-ink-800 text-zinc-100'
                : 'text-muted hover:bg-ink-850 hover:text-zinc-200',
            )}
          >
            <span
              className={cn(
                'h-3.5 w-[3px] shrink-0 rounded-full',
                active === 'all' ? 'bg-live' : 'bg-transparent',
              )}
            />
            <span className="flex-1 font-medium">Tất cả</span>
            <span className="tabular-nums text-[11px] text-live-text">{totalUsable}</span>
          </button>
          {groups.map((group) => (
            <GroupRow
              key={group.name}
              {...group}
              active={active === group.name}
              onSelect={() => onSelect(group.name)}
            />
          ))}
        </nav>

        <CommentatorSection
          commentators={commentators}
          active={activeCommentator}
          onSelect={onSelectCommentator}
        />

        <div className="mt-4 border-t border-line-soft pt-3">
          <Toggle
            checked={onlyAlive}
            onChange={onToggleOnlyAlive}
            label="Chỉ nguồn còn sống"
            hint="Ẩn các trận mà mọi nguồn đều là no-signal"
          />
        </div>
        <p className="mt-2 px-0.5 text-[10px] leading-4 text-muted/70">
          Số bên cạnh là nguồn dùng được, không tính no-signal.
        </p>
      </div>
    </aside>
  )
}

export function GroupChips({
  groups,
  totalUsable,
  active,
  onSelect,
  onlyAlive,
  onToggleOnlyAlive,
}: GroupSidebarProps) {
  const itemClass = (isActive: boolean) =>
    cn(
      'shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] transition-colors',
      isActive
        ? 'border-live/40 bg-live-dim text-live-text'
        : 'border-line bg-ink-900 text-muted hover:text-zinc-200',
    )

  return (
    <div className="-mx-3 mb-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-1 lg:hidden">
      <button type="button" onClick={() => onSelect('all')} className={itemClass(active === 'all')}>
        Tất cả <span className="tabular-nums opacity-70">{totalUsable}</span>
      </button>
      {groups.map((group) => (
        <button
          key={group.name}
          type="button"
          onClick={() => onSelect(group.name)}
          className={itemClass(active === group.name)}
        >
          {group.name} <span className="tabular-nums opacity-70">{group.usable}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onToggleOnlyAlive(!onlyAlive)}
        aria-pressed={onlyAlive}
        className={cn(itemClass(onlyAlive), 'inline-flex items-center gap-1')}
      >
        Chỉ nguồn sống
      </button>
    </div>
  )
}