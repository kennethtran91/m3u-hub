import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Copy, Download, Info, MoreHorizontal, Play, Tv, X } from 'lucide-react'
import type { Match, Source } from '../lib/types'
import { currentStatus } from '../lib/matches'
import type { DisplayZone } from '../lib/time'
import { dayLabel, fmtTime } from '../lib/time'
import { buildSourceM3U, sourceFilename } from '../lib/export'
import { copyText, downloadTextFile } from '../lib/download'
import { openInVlc, takeVlcHint, VLC_INSTALLER_URL } from '../lib/vlc'
import { canPlayInBrowser } from '../lib/playability'
import { commentatorDisplay, commentatorsOf, matchesCommentator } from '../lib/commentators'
import { cn } from '../lib/cn'
import { SportIcon } from './SportIcon'

const STATUS_TEXT = {
  live: 'LIVE',
  upcoming: 'Sắp tới',
  ended: 'Đã xong',
  unknown: '',
} as const

const ACTION =
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[11.5px] transition-colors'

function SourceRow({
  source,
  menuOpen,
  onToggleMenu,
  onPlay,
  onVlc,
}: {
  source: Source
  menuOpen: boolean
  onToggleMenu: () => void
  onPlay: (source: Source) => void
  onVlc: (source: Source) => void
}) {
  const [copied, setCopied] = useState(false)
  const canPlay = canPlayInBrowser(source)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(id)
  }, [copied])

  return (
    <div className={cn(source.isNoSignal && 'opacity-55')}>
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-300">
          {source.group}
          {source.commentator ? (
            <em className="ml-2 not-italic text-[10.5px] text-muted">
              {commentatorDisplay(source.commentator)}
            </em>
          ) : null}
        </span>

        {canPlay ? (
          <button
            type="button"
            onClick={() => onPlay(source)}
            className={cn(ACTION, 'border-live/45 bg-live-dim font-semibold text-live-text hover:border-live/70')}
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Xem
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => onVlc(source)}
          title="Mở stream này bằng app VLC trên máy (protocol m3uhub://)"
          className={cn(ACTION, 'border-line bg-ink-900 text-zinc-300 hover:border-line-strong')}
        >
          <Tv className="h-3.5 w-3.5" aria-hidden />
          VLC
        </button>

        <button
          type="button"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-label="Thêm"
          className={cn(
            ACTION,
            'px-1.5',
            menuOpen ? 'border-line-strong bg-ink-800 text-zinc-100' : 'border-transparent text-muted hover:text-zinc-200',
          )}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {menuOpen ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-line-soft bg-ink-900/60 px-3 py-2 text-[11px] sm:px-4">
          <button
            type="button"
            onClick={async () => {
              if (await copyText(source.url)) setCopied(true)
            }}
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-zinc-100"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-live-text" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? 'Đã copy link' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(sourceFilename(source), buildSourceM3U(source), 'application/x-mpegurl')
            }
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-zinc-100"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Tải .m3u
          </button>
          <span className="ml-auto text-muted/70">
            {source.format === 'unknown' ? 'không rõ định dạng' : source.format.toUpperCase()}
            {source.referrer ? ' · có referrer' : ''}
            {!canPlay ? ' · chỉ VLC' : ''}
          </span>
        </div>
      ) : null}
    </div>
  )
}

interface MatchCardProps {
  match: Match
  sources: Source[]
  now: Date
  zone?: DisplayZone
  onPlay: (source: Source) => void
  onExportMatch: (match: Match, sources: Source[]) => void
}

export function MatchCard({ match, sources, now, zone = 'vn', onPlay, onExportMatch }: MatchCardProps) {
  const [open, setOpen] = useState(false)
  const [pickedKey, setPickedKey] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [vlcHint, setVlcHint] = useState(false)

  const status = currentStatus(match, now)
  const kickoff = match.kickoff

  const commentatorGroups = useMemo(() => commentatorsOf(sources), [sources])
  const activeKey = pickedKey && commentatorGroups.some((group) => group.key === pickedKey) ? pickedKey : null

  const visibleSources = useMemo(() => {
    const rows = activeKey ? sources.filter((source) => matchesCommentator(source, activeKey)) : sources.slice()
    return rows.sort((a, b) => {
      const aLabel = a.commentator ? commentatorDisplay(a.commentator) : '\uffff'
      const bLabel = b.commentator ? commentatorDisplay(b.commentator) : '\uffff'
      const byCommentator = aLabel.localeCompare(bLabel, 'vi')
      if (byCommentator !== 0) return byCommentator
      return a.group.localeCompare(b.group, 'vi')
    })
  }, [sources, activeKey])

  const usableVisible = visibleSources.filter((source) => !source.isNoSignal).length

  // Browsers cannot tell whether m3uhub:// is registered, so the protocol is
  // always tried; the first launch of a session also explains the fallback.
  const handleOpenVlc = (source: Source) => {
    openInVlc(source)
    if (takeVlcHint()) setVlcHint(true)
  }

  return (
    <article
      className={cn(
        'border-b border-line-soft last:border-b-0',
        // Live rows get a full amber ring plus a thicker left edge, drawn as an
        // inset shadow so the row height never shifts between states.
        status === 'live' &&
          'border-b-transparent bg-live/[0.05] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.35),inset_3px_0_0_0_#f59e0b]',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-3 text-left sm:px-4"
      >
        <span className="w-[46px] shrink-0">
          <span
            className={cn(
              'block text-[15px] font-semibold leading-none tabular-nums',
              kickoff ? 'text-zinc-100' : 'text-muted',
            )}
          >
            {kickoff ? fmtTime(kickoff, zone) : '--:--'}
          </span>
          <span className="mt-1 block truncate text-[10px] leading-4 text-muted">
            {kickoff ? dayLabel(kickoff, now, zone) : 'Không rõ giờ'}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <SportIcon sport={match.sport} className="shrink-0 text-muted/70" />
            <span className="min-w-0 truncate text-[14.5px] font-medium text-zinc-100">
              {match.isUnparsed || !match.teamB ? (
                match.title
              ) : (
                <>
                  {match.teamA}
                  <span className="px-1.5 font-normal text-muted">vs</span>
                  {match.teamB}
                </>
              )}
            </span>
            {status === 'live' ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded border border-live/40 bg-live/10 px-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-live-text">
                Live
              </span>
            ) : STATUS_TEXT[status] ? (
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">
                {STATUS_TEXT[status]}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] text-muted">
            {commentatorGroups.length
              ? commentatorGroups.map((group) => group.display).join(' · ')
              : 'Chưa rõ bình luận viên'}
          </span>
        </span>

        <span
          className={cn(
            'shrink-0 text-right text-[12px] tabular-nums',
            match.usableCount > 0 ? 'text-zinc-300' : 'text-warn',
          )}
        >
          {visibleSources.length}
          <span className="text-muted"> nguồn</span>
        </span>

        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 text-muted transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="animate-fade-up bg-ink-900/40">
          {vlcHint ? (
            <div className="flex items-start gap-2 border-b border-line-soft px-3 py-1.5 text-[10.5px] leading-4 text-muted sm:px-4">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-live-text/80" aria-hidden />
              <span className="min-w-0 flex-1">
                Không thấy VLC mở? Cài bằng{' '}
                <a
                  href={VLC_INSTALLER_URL}
                  download
                  className="text-live-text underline underline-offset-2"
                >
                  bộ cài này
                </a>{' '}
                (double-click, không cần admin).
              </span>
              <button
                type="button"
                onClick={() => setVlcHint(false)}
                aria-label="Đóng gợi ý"
                className="grid h-4 w-4 shrink-0 place-items-center rounded text-muted hover:text-zinc-200"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </div>
          ) : null}

          {commentatorGroups.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-line-soft px-3 py-2 sm:px-4">
              <button
                type="button"
                onClick={() => setPickedKey(null)}
                aria-pressed={activeKey === null}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10.5px] transition-colors',
                  activeKey === null
                    ? 'border-live/45 bg-live-dim text-live-text'
                    : 'border-line bg-ink-900 text-muted hover:text-zinc-200',
                )}
              >
                Tất cả <span className="tabular-nums opacity-70">{sources.length}</span>
              </button>
              {commentatorGroups.map((group) => {
                const isActive = activeKey === group.key
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setPickedKey(isActive ? null : group.key)}
                    aria-pressed={isActive}
                    className={cn(
                      'max-w-[180px] truncate rounded-full border px-2 py-0.5 text-[10.5px] transition-colors',
                      isActive
                        ? 'border-live/45 bg-live-dim text-live-text'
                        : 'border-line bg-ink-900 text-muted hover:text-zinc-200',
                    )}
                  >
                    {group.display} <span className="tabular-nums opacity-70">{group.count}</span>
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="divide-y divide-line-soft">
            {visibleSources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                menuOpen={menuId === source.id}
                onToggleMenu={() => setMenuId(menuId === source.id ? null : source.id)}
                onPlay={onPlay}
                onVlc={handleOpenVlc}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line-soft px-3 py-2 text-[10.5px] sm:px-4">
            <span className="text-muted">
              {visibleSources.length} nguồn · {usableVisible} dùng được
            </span>
            <button
              type="button"
              onClick={() => onExportMatch(match, visibleSources)}
              className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-zinc-200"
            >
              <Download className="h-3 w-3" aria-hidden />
              Xuất trận này
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
