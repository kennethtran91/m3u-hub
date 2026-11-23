import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Info,
  MonitorPlay,
  Play,
  ShieldCheck,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react'
import type { Match, Source } from '../lib/types'
import { currentStatus } from '../lib/matches'
import type { DisplayZone } from '../lib/time'
import { dayLabel, fmtDate, fmtTime } from '../lib/time'
import { buildSourceM3U, matchFilename, sourceFilename } from '../lib/export'
import { copyText, downloadTextFile } from '../lib/download'
import { openInVlc, takeVlcHint, VLC_INSTALLER_URL } from '../lib/vlc'
import { canPlayInBrowser, playabilityTitle } from '../lib/playability'
import { commentatorDisplay, commentatorsOf, matchesCommentator } from '../lib/commentators'
import { cn } from '../lib/cn'
import { SportIcon, SPORT_LABEL } from './SportIcon'

function FormatBadge({ source }: { source: Source }) {
  const label =
    source.format === 'unknown' ? 'LINK' : source.format === 'rtmp' ? 'RTMP' : source.format.toUpperCase()
  return (
    <span
      className={cn(
        'rounded border px-1 py-[1px] font-mono text-[9px] uppercase leading-4 tracking-wide',
        source.isNoSignal
          ? 'border-line text-muted'
          : source.format === 'hls'
            ? 'border-live/25 bg-live/5 text-live-text/90'
            : source.format === 'rtmp'
              ? 'border-warn/25 bg-warn/5 text-warn'
              : 'border-line-strong text-zinc-400',
      )}
    >
      {label}
    </span>
  )
}

function SourceRow({ source, onPlay }: { source: Source; onPlay: (source: Source) => void }) {
  const [copied, setCopied] = useState(false)
  const [vlcHint, setVlcHint] = useState(false)
  const canPlay = canPlayInBrowser(source)
  const playTitle = playabilityTitle(source)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(id)
  }, [copied])

  const handleCopy = async () => {
    const ok = await copyText(source.url)
    if (ok) setCopied(true)
  }

  // Browsers cannot tell whether m3uhub:// is registered, so the protocol is
  // always tried; the first launch of a session also explains the fallback.
  const handleOpenVlc = () => {
    openInVlc(source)
    if (takeVlcHint()) setVlcHint(true)
  }

  return (
    <div className={cn('px-3 py-2 sm:px-4', source.isNoSignal && 'opacity-60')}>
      <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 max-w-[140px] truncate text-[11px] text-zinc-300 sm:max-w-[200px]">
          {source.group}
        </span>
        {source.commentator ? (
          <span
            className="max-w-[130px] truncate rounded border border-line-strong bg-ink-800/70 px-1 py-[1px] text-[9px] leading-4 text-zinc-300"
            title={source.commentator}
          >
            {commentatorDisplay(source.commentator)}
          </span>
        ) : null}
        <FormatBadge source={source} />
        {source.tags
          .filter((tag) => !/^(hls|flv)$/i.test(tag))
          .slice(0, 2)
          .map((tag) => (
            <span key={tag} className="text-[10px] text-muted/80">
              [{tag}]
            </span>
          ))}
        {source.isNoSignal ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-warn/80">
            <TriangleAlert className="h-3 w-3" aria-hidden />
            no-signal
          </span>
        ) : null}
        {source.referrer ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] text-muted"
            title={`Referrer: ${source.referrer}`}
          >
            <ShieldCheck className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">header</span>
          </span>
        ) : null}
        {!canPlay ? (
          <span
            className="rounded border border-warn/25 bg-warn/5 px-1 py-[1px] text-[9px] font-medium leading-4 text-warn/90"
            title={playTitle}
          >
            cần VLC
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={handleOpenVlc}
          title="Mở stream này bằng app VLC trên máy (qua protocol m3uhub://)"
          className="inline-flex h-7 items-center gap-1 rounded border border-live/35 bg-live/15 px-1.5 text-[11px] font-medium text-live-text transition-colors hover:border-live/55 hover:bg-live/25"
        >
          <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Mở VLC</span>
        </button>

        <button
          type="button"
          onClick={() => onPlay(source)}
          disabled={!canPlay}
          title={playTitle}
          className="inline-flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-zinc-300 transition-colors hover:bg-ink-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent"
        >
          <Play className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Xem</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          title="Sao chép link stream"
          aria-label="Sao chép link stream"
          className="inline-flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-muted transition-colors hover:bg-ink-800 hover:text-zinc-200"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-live-text" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="hidden sm:inline">{copied ? 'Đã copy' : 'Copy'}</span>
        </button>

        <button
          type="button"
          onClick={() =>
            downloadTextFile(sourceFilename(source), buildSourceM3U(source), 'application/x-mpegurl')
          }
          title="Tải file .m3u một nguồn (giữ referrer + user-agent) — dùng khi máy chưa đăng ký handler"
          aria-label="Tải .m3u"
          className="inline-flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-muted transition-colors hover:bg-ink-800 hover:text-zinc-200"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Tải .m3u</span>
        </button>
      </div>
      </div>

      {vlcHint ? (
        <div className="mt-1.5 flex items-start gap-2 rounded border border-live/25 bg-live/5 px-2 py-1.5">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-live-text/80" aria-hidden />
          <p className="min-w-0 flex-1 text-[10px] leading-4 text-zinc-400">
            Không thấy VLC mở? Tải{' '}
            <a
              href={VLC_INSTALLER_URL}
              download
              className="font-medium text-live-text underline underline-offset-2 hover:text-live-text/80"
            >
              bộ cài VLC
            </a>{' '}
            (double-click, không cần quyền admin) hoặc chạy{' '}
            <code className="rounded bg-ink-950 px-1 font-mono text-[10px] text-zinc-300">
              protocol\register.cmd
            </code>{' '}
            nếu đang chạy từ bản clone. Máy chưa có VLC thì dùng “Tải .m3u”.
          </p>
          <button
            type="button"
            onClick={() => setVlcHint(false)}
            aria-label="Đóng gợi ý"
            className="grid h-4 w-4 shrink-0 place-items-center rounded text-muted hover:bg-ink-800 hover:text-zinc-200"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}

const STATUS_TEXT = {
  live: 'LIVE',
  upcoming: 'Sắp tới',
  ended: 'Đã xong',
  unknown: '—',
} as const

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
  const status = currentStatus(match, now)
  const kickoff = match.kickoff

  /** Commentators present in this card's visible source rows. */
  const commentatorGroups = useMemo(() => commentatorsOf(sources), [sources])
  const activeKey =
    pickedKey && commentatorGroups.some((group) => group.key === pickedKey) ? pickedKey : null

  const visibleSources = useMemo(() => {
    const rows = activeKey
      ? sources.filter((source) => matchesCommentator(source, activeKey))
      : sources.slice()
    return rows.sort((a, b) => {
      const aLabel = a.commentator ? commentatorDisplay(a.commentator) : '\uffff'
      const bLabel = b.commentator ? commentatorDisplay(b.commentator) : '\uffff'
      const byCommentator = aLabel.localeCompare(bLabel, 'vi')
      if (byCommentator !== 0) return byCommentator
      return a.group.localeCompare(b.group, 'vi')
    })
  }, [sources, activeKey])

  const webPlayableCount = visibleSources.filter(canPlayInBrowser).length
  const usableVisible = visibleSources.filter((source) => !source.isNoSignal).length

  return (
    <article
      className={cn(
        'overflow-hidden rounded-lg border bg-ink-850/70 transition-colors',
        status === 'live'
          ? 'border-live/30 shadow-[inset_2px_0_0_0_rgba(52,211,153,0.55)]'
          : 'border-line hover:border-line-strong',
        status === 'ended' && 'opacity-85',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left sm:px-4"
      >
        <div className="w-[50px] shrink-0 pt-0.5">
          <div
            className={cn(
              'text-[15px] font-semibold leading-none tabular-nums',
              kickoff ? 'text-zinc-100' : 'text-muted',
            )}
          >
            {kickoff ? fmtTime(kickoff, zone) : '--:--'}
          </div>
          <div className="mt-1 truncate text-[10px] leading-4 text-muted">
            {kickoff ? dayLabel(kickoff, now, zone) : 'Không rõ giờ'}
          </div>
          {kickoff ? (
            <div className="text-[9px] leading-3 text-muted/60">{fmtDate(kickoff, zone)}</div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <SportIcon sport={match.sport} className="text-muted/80" />
            <span className="min-w-0 break-words text-[14px] font-medium leading-5 text-zinc-100">
              {match.isUnparsed || !match.teamB ? (
                match.title
              ) : (
                <>
                  <span>{match.teamA}</span>
                  <span className="whitespace-nowrap px-1.5 font-normal text-muted">vs</span>
                  <span>{match.teamB}</span>
                </>
              )}
            </span>
            {status === 'live' ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded border border-live/40 bg-live/10 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wider text-live-text">
                <span className="h-1 w-1 animate-live-pulse rounded-full bg-live" />
                Live
              </span>
            ) : (
              <span
                className={cn(
                  'shrink-0 text-[10px] uppercase tracking-wide',
                  status === 'upcoming' ? 'text-muted' : 'text-muted/60',
                )}
              >
                {STATUS_TEXT[status]}
              </span>
            )}
          </div>

          <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] leading-4 text-muted">
            <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
              <Users className="h-3 w-3" aria-hidden />
              {SPORT_LABEL[match.sport]}
            </span>
            <span className="hidden text-line-strong sm:inline">·</span>
            <span className="min-w-0 flex-1 truncate">
              {commentatorGroups.length
                ? commentatorGroups.map((group) => group.display).join(' · ')
                : 'Chưa rõ bình luận viên'}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
          <span
            className={cn(
              'text-[11px] tabular-nums',
              match.usableCount > 0 ? 'text-zinc-300' : 'text-warn/80',
            )}
          >
            {visibleSources.length}
            <span className="text-muted"> nguồn</span>
          </span>
          {webPlayableCount > 0 ? (
            <span className="text-[9px] leading-3 text-live-text/70">
              {webPlayableCount}/{visibleSources.length} xem trên web
            </span>
          ) : null}
          <ChevronDown
            className={cn('h-3.5 w-3.5 text-muted transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
        <div className="animate-fade-up border-t border-line-soft bg-ink-900/40">
          {commentatorGroups.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1 border-b border-line-soft px-3 py-1.5 sm:px-4">
              <span className="mr-0.5 text-[10px] uppercase tracking-wide text-muted/70">BLV</span>
              <button
                type="button"
                onClick={() => setPickedKey(null)}
                aria-pressed={activeKey === null}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                  activeKey === null
                    ? 'border-live/40 bg-live-dim text-live-text'
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
                    title={`Chỉ xem nguồn của ${group.display}`}
                    className={cn(
                      'max-w-[180px] truncate rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                      isActive
                        ? 'border-live/40 bg-live-dim text-live-text'
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
              <SourceRow key={source.id} source={source} onPlay={onPlay} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line-soft px-3 py-1.5 sm:px-4">
            <span className="text-[10px] text-muted">
              {visibleSources.length} nguồn · {usableVisible} dùng được
            </span>
            <button
              type="button"
              onClick={() => onExportMatch(match, visibleSources)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-muted transition-colors hover:bg-ink-800 hover:text-zinc-200"
              title={`Tải ${visibleSources.length} nguồn của trận này thành .m3u`}
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

export { matchFilename }