import { lazy, Suspense, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Match, Source, SportKey } from './lib/types'
import { usePlaylist } from './hooks/usePlaylist'
import { useDebouncedValue, useNow } from './hooks/useNow'
import { currentStatus } from './lib/matches'
import { buildM3U, matchFilename, playlistFilename } from './lib/export'
import { downloadTextFile } from './lib/download'
import { loadPersisted, updatePrefs as persistPrefs } from './lib/storage'
import type { Prefs } from './lib/storage'
import {
  calendarDayDiff,
  fmtDateTime,
  isStale,
  machineIsVietnam,
  normalizeText,
} from './lib/time'
import type { DisplayZone } from './lib/time'
import { TopBar } from './components/TopBar'
import { FilterBar } from './components/FilterBar'
import { FilterSheet } from './components/FilterSheet'
import { MatchCard } from './components/MatchCard'
import { LinkModal } from './components/LinkModal'
import { LoadingScreen } from './components/LoadingScreen'
import { SPORT_ORDER } from './components/SportIcon'
import type { CommentatorCount, DateFilter, GroupCount, StatusFilter } from './components/FilterSheet.types'
import { commentatorKey, commentatorsOf, matchesCommentator } from './lib/commentators'

const PlayerModal = lazy(() =>
  import('./components/PlayerModal').then((module) => ({ default: module.PlayerModal })),
)

interface VisibleMatch {
  match: Match
  sources: Source[]
}

const STATUS_RANK = { live: 0, upcoming: 1, ended: 2, unknown: 3 } as const

export default function App() {
  const playlist = usePlaylist()
  const now = useNow(30_000)
  const [prefs, setPrefs] = useState<Prefs>(() => loadPersisted().prefs)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 150)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sport, setSport] = useState<SportKey | 'all'>('all')
  const [date, setDate] = useState<DateFilter>('all')
  const [commentator, setCommentator] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [playerSource, setPlayerSource] = useState<Source | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Kickoffs are parsed as Vietnam time; the UI renders in Vietnam time by
  // default, or the machine clock when the user picks it (hidden if identical).
  const machineOnVnTime = machineIsVietnam(now)
  const zone: DisplayZone = machineOnVnTime ? 'vn' : prefs.timezone

  const setPrefsAndPersist = (patch: Partial<Prefs>) => {
    setPrefs(persistPrefs(patch).prefs)
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  const groupCounts = useMemo<GroupCount[]>(() => {
    if (!playlist.parsed) return []
    const map = new Map<string, GroupCount>()
    for (const source of playlist.parsed.sources) {
      const row = map.get(source.group) ?? { name: source.group, usable: 0, total: 0 }
      row.total += 1
      if (!source.isNoSignal) row.usable += 1
      map.set(source.group, row)
    }
    return Array.from(map.values()).sort(
      (a, b) => b.usable - a.usable || a.name.localeCompare(b.name, 'vi'),
    )
  }, [playlist.parsed])

  /**
   * Commentators broadcast in at least two distinct matches. Counts come from
   * usable (non no-signal) sources only and ignore the provider-group filter,
   * so the list is a stable index of who is calling what.
   */
  const commentatorCounts = useMemo<CommentatorCount[]>(() => {
    const parsed = playlist.parsed
    if (!parsed) return []
    const usable = parsed.sources.filter((source) => !source.isNoSignal)
    const groups = commentatorsOf(usable)

    const matchesByKey = new Map<string, Set<string>>()
    for (const match of playlist.matches) {
      const keys = new Set<string>()
      for (const source of match.sources) {
        if (!source.commentator) continue
        const key = commentatorKey(source.commentator)
        if (key) keys.add(key)
      }
      for (const key of keys) {
        const bucket = matchesByKey.get(key) ?? new Set<string>()
        bucket.add(match.id)
        matchesByKey.set(key, bucket)
      }
    }

    return groups
      .map((group) => ({
        key: group.key,
        display: group.display,
        count: group.count,
        matchCount: matchesByKey.get(group.key)?.size ?? 0,
      }))
      .filter((row) => row.matchCount >= 2)
  }, [playlist.parsed, playlist.matches])

  const activeGroup =
    prefs.lastGroup === 'all' || groupCounts.some((group) => group.name === prefs.lastGroup)
      ? prefs.lastGroup
      : 'all'

  const sports = useMemo<SportKey[]>(() => {
    const present = new Set<SportKey>()
    for (const match of playlist.matches) {
      if (match.sport !== 'unknown') present.add(match.sport)
    }
    return SPORT_ORDER.filter((key) => present.has(key))
  }, [playlist.matches])

  const visibleMatches = useMemo<VisibleMatch[]>(() => {
    const needle = normalizeText(debouncedQuery)
    const rows: VisibleMatch[] = []

    for (const match of playlist.matches) {
      if (activeGroup !== 'all' && !match.groups.includes(activeGroup)) continue
      if (prefs.onlyAlive && match.usableCount === 0) continue
      if (commentator && !match.sources.some((source) => matchesCommentator(source, commentator))) {
        continue
      }

      const matchStatus = currentStatus(match, now)
      if (status !== 'all' && matchStatus !== status) continue
      if (sport !== 'all' && match.sport !== sport) continue

      if (date !== 'all') {
        if (!match.kickoff) continue
        const dayDiff = calendarDayDiff(match.kickoff, now, zone)
        if (date === 'today' && dayDiff !== 0) continue
        if (date === 'tomorrow' && dayDiff !== 1) continue
      }

      if (needle) {
        const haystack = normalizeText(
          [
            match.title,
            match.teamA,
            match.teamB,
            ...match.commentators,
            ...match.groups,
            ...match.sources.map((source) => source.title),
          ].join(' '),
        )
        if (!haystack.includes(needle)) continue
      }

      const sources = prefs.hideNoSignal
        ? match.sources.filter((source) => !source.isNoSignal)
        : match.sources
      if (sources.length === 0) continue
      rows.push({ match, sources })
    }

    return rows.sort((a, b) => {
      const rank = STATUS_RANK[currentStatus(a.match, now)] - STATUS_RANK[currentStatus(b.match, now)]
      if (rank !== 0) return rank
      const aTime = a.match.kickoff?.getTime() ?? Number.POSITIVE_INFINITY
      const bTime = b.match.kickoff?.getTime() ?? Number.POSITIVE_INFINITY
      if (aTime !== bTime) return aTime - bTime
      return a.match.title.localeCompare(b.match.title, 'vi')
    })
  }, [
    playlist.matches,
    activeGroup,
    commentator,
    prefs.onlyAlive,
    prefs.hideNoSignal,
    status,
    sport,
    date,
    now,
    zone,
    debouncedQuery,
  ])

  const liveCount = useMemo(
    () => visibleMatches.filter((row) => currentStatus(row.match, now) === 'live').length,
    [visibleMatches, now],
  )

  const exportSources = useMemo(
    () => visibleMatches.flatMap((row) => row.sources),
    [visibleMatches],
  )

  const persisted = loadPersisted()

  const activeFilterCount =
    (activeGroup !== 'all' ? 1 : 0) +
    (status !== 'all' ? 1 : 0) +
    (date !== 'all' ? 1 : 0) +
    (sport !== 'all' ? 1 : 0) +
    (commentator ? 1 : 0) +
    (prefs.onlyAlive ? 1 : 0) +
    (prefs.hideNoSignal ? 0 : 1)

  const notice = useMemo(() => {
    if (playlist.servedFromCache && playlist.cacheFetchedAt) {
      return `Đang dùng dữ liệu đã lưu lúc ${fmtDateTime(new Date(playlist.cacheFetchedAt), zone)} — link hiện tại không tải được, bấm Link để kiểm tra.`
    }
    if (playlist.health && playlist.health.status !== 'OK') {
      return `Không lấy được playlist: ${playlist.health.message}`
    }
    const updatedAt = playlist.parsed?.playlistUpdatedAt
    if (updatedAt && isStale(updatedAt.getTime())) {
      return `Playlist tự cập nhật lần cuối ${fmtDateTime(updatedAt, zone)} — có thể đã cũ.`
    }
    return null
  }, [playlist.servedFromCache, playlist.cacheFetchedAt, playlist.health, playlist.parsed, zone])

  const handleExportAll = () => {
    if (!exportSources.length) return
    downloadTextFile(playlistFilename(now), buildM3U(exportSources), 'application/x-mpegurl')
    showToast(`Đã xuất ${exportSources.length} nguồn`)
  }

  const handleExportMatch = (match: Match, sources: Source[]) => {
    if (!sources.length) return
    downloadTextFile(matchFilename(match, now), buildM3U(sources), 'application/x-mpegurl')
    showToast(`Đã xuất ${sources.length} nguồn của trận`)
  }

  const resetFilters = () => {
    setQuery('')
    setStatus('all')
    setSport('all')
    setDate('all')
    setCommentator(null)
    setPrefsAndPersist({ lastGroup: 'all', onlyAlive: false, hideNoSignal: true })
  }

  if (playlist.phase === 'loading' && !playlist.parsed) {
    return <LoadingScreen url={playlist.url} />
  }

  return (
    <div className="min-h-screen bg-ink-950 text-zinc-200">
      <TopBar
        matchCount={visibleMatches.length}
        liveCount={liveCount}
        loading={playlist.loading}
        onRefresh={playlist.refresh}
        onOpenLink={() => setLinkOpen(true)}
        notice={notice}
      />

      <main className="mx-auto max-w-[820px] pb-20">
        <FilterBar
          query={query}
          onQuery={setQuery}
          activeCount={activeFilterCount}
          onOpenSheet={() => setSheetOpen(true)}
          exportCount={exportSources.length}
          onExport={handleExportAll}
        />

        {visibleMatches.length === 0 ? (
          <div className="mx-3 rounded-lg border border-line bg-ink-850/50 px-4 py-12 text-center sm:mx-4">
            <Search className="mx-auto h-5 w-5 text-muted" aria-hidden />
            <p className="mt-3 text-[12.5px] text-zinc-300">Không có trận nào khớp bộ lọc.</p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex h-8 items-center rounded-md border border-line bg-ink-900 px-3 text-[11.5px] text-zinc-200 hover:border-line-strong"
              >
                Xoá bộ lọc
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mx-3 overflow-hidden rounded-lg border border-line bg-ink-850/40 sm:mx-4">
            {visibleMatches.map(({ match, sources }) => (
              <MatchCard
                key={match.id}
                match={match}
                sources={sources}
                now={now}
                zone={zone}
                onPlay={setPlayerSource}
                onExportMatch={handleExportMatch}
              />
            ))}
          </div>
        )}

        <p className="mx-3 mt-4 text-[10.5px] leading-4 text-muted/70 sm:mx-4">
          App không kèm playlist nào — bạn tự dán link M3U của mình, dữ liệu chỉ nằm trong
          localStorage của trình duyệt này.
        </p>
      </main>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        status={status}
        onStatus={setStatus}
        date={date}
        onDate={setDate}
        sport={sport}
        onSport={setSport}
        sports={sports}
        groups={groupCounts}
        totalUsable={playlist.parsed?.stats.usableCount ?? 0}
        activeGroup={activeGroup}
        onGroup={(group) => setPrefsAndPersist({ lastGroup: group })}
        commentators={commentatorCounts}
        activeCommentator={commentator}
        onCommentator={setCommentator}
        onlyAlive={prefs.onlyAlive}
        onOnlyAlive={(next) => setPrefsAndPersist({ onlyAlive: next })}
        hideNoSignal={prefs.hideNoSignal}
        onHideNoSignal={(next) => setPrefsAndPersist({ hideNoSignal: next })}
        zone={zone}
        onZone={(next) => setPrefsAndPersist({ timezone: next })}
        showZoneToggle={!machineOnVnTime}
        onReset={resetFilters}
        activeCount={activeFilterCount}
      />

      {playerSource ? (
        <Suspense fallback={null}>
          <PlayerModal source={playerSource} onClose={() => setPlayerSource(null)} />
        </Suspense>
      ) : null}

      {playlist.phase === 'blocked' || playlist.phase === 'empty' ? (
        <LinkModal
          mode="blocked"
          health={playlist.health}
          currentUrl={playlist.url}
          hasCache={Boolean(persisted.cache)}
          cacheFetchedAt={persisted.cache?.fetchedAt ?? null}
          saving={playlist.loading}
          onTest={playlist.testUrl}
          onSave={playlist.saveUrl}
          onUseCache={playlist.useCache}
          onClose={() => setLinkOpen(false)}
        />
      ) : linkOpen ? (
        <LinkModal
          mode="manage"
          health={playlist.health}
          currentUrl={playlist.url}
          hasCache={Boolean(persisted.cache)}
          cacheFetchedAt={persisted.cache?.fetchedAt ?? null}
          saving={playlist.loading}
          onTest={playlist.testUrl}
          onSave={async (url) => {
            await playlist.saveUrl(url)
            setLinkOpen(false)
          }}
          onUseCache={playlist.useCache}
          onClose={() => setLinkOpen(false)}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 animate-fade-up rounded-md border border-line-strong bg-ink-800 px-3 py-2 text-[11px] text-zinc-100 shadow-pop">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
