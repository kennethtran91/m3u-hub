import { describe, expect, it } from 'vitest'
import { SNAPSHOT, snapshot } from './snapshot'
import {
  checkPlaylist,
  detectFormat,
  parsePlaylist,
  parseTitle,
  parseUpdatedMarker,
  splitExtinf,
} from '../playlist'
import { buildM3U } from '../export'
import { buildMatches, teamSimilarity, teamsMatch } from '../matches'
import { fmtTime } from '../time'

/** The snapshot is dated 21/11 and 22/11; pin "now" so tests never depend on the clock. */
const NOW = new Date(2026, 10, 21, 20, 0, 0)

const sample = snapshot()
const parsed = parsePlaylist(sample, NOW)
const matches = buildMatches(parsed.sources, NOW)

describe('parsePlaylist — synthetic snapshot', () => {
  it('counts every #EXTINF block: the sources plus the Updated marker', () => {
    expect(parsed.stats.extinfCount).toBe(SNAPSHOT.extinfCount)
    expect(parsed.sources).toHaveLength(SNAPSHOT.sourceCount)
  })

  it('finds the channel brands and keeps the marker out of them', () => {
    const groups = new Set(parsed.sources.map((source) => source.group))
    expect(groups.size).toBe(SNAPSHOT.groupCount)
    expect(parsed.stats.groupCount).toBe(SNAPSHOT.groupCount)
    expect(parsed.sources.some((source) => source.group.startsWith('Updated'))).toBe(false)
    const totalGroupTitles = groups.size + (parsed.playlistUpdatedAt ? 1 : 0)
    expect(totalGroupTitles).toBe(SNAPSHOT.groupTitlesIncludingMarker)
    expect(groups.has(SNAPSHOT.deadBrand)).toBe(true)
  })

  it('flags the dead channel entries (the marker URL is not one of them)', () => {
    expect(sample.match(/no-signal/g)).toHaveLength(SNAPSHOT.noSignalUrlCount)
    expect(parsed.sources.filter((source) => source.isNoSignal)).toHaveLength(
      SNAPSHOT.noSignalSourceCount,
    )
    expect(parsed.stats.noSignalCount).toBe(SNAPSHOT.noSignalSourceCount)
    expect(parsed.stats.usableCount).toBe(SNAPSHOT.usableCount)
    const deadBrand = parsed.sources.filter((source) => source.group === SNAPSHOT.deadBrand)
    expect(deadBrand.length).toBe(SNAPSHOT.deadBrandSourceCount)
    expect(deadBrand.every((source) => source.isNoSignal)).toBe(true)
  })

  it('extracts the Updated marker and keeps it out of the source list', () => {
    expect(parsed.playlistUpdatedAt).not.toBeNull()
    // Stored as the absolute instant of 20:23 Vietnam time (UTC+7).
    expect(parsed.playlistUpdatedAt?.getTime()).toBe(SNAPSHOT.markerUtcMs)
    expect(parsed.playlistUpdatedAt?.toISOString()).toBe('2026-11-21T13:23:00.000Z')
    expect(fmtTime(parsed.playlistUpdatedAt!)).toBe('20:23')
    expect(parsed.updatedLabel).toBe(SNAPSHOT.markerLabel)
    expect(parsed.sources.every((source) => source.title !== SNAPSHOT.markerLabel)).toBe(true)
  })

  it('never produces an "Updated" match', () => {
    expect(matches.some((match) => /updated/i.test(match.title))).toBe(false)
    expect(matches.some((match) => /updated/i.test(match.teamA))).toBe(false)
  })

  it('parses referrer, user agent, logo and format', () => {
    const withReferrer = parsed.sources.find((source) => source.referrer)
    expect(withReferrer?.referrer).toMatch(/^https?:\/\//)
    expect(parsed.sources.filter((source) => source.referrer)).toHaveLength(SNAPSHOT.referrerCount)
    expect(parsed.sources.some((source) => source.userAgent?.startsWith('Mozilla/'))).toBe(true)
    expect(parsed.sources.filter((source) => source.logo).length).toBe(SNAPSHOT.sourceCount)
    expect(parsed.sources.filter((source) => source.format === 'rtmp')).toHaveLength(
      SNAPSHOT.rtmpCount,
    )
    expect(parsed.sources.filter((source) => source.format === 'flv')).toHaveLength(
      SNAPSHOT.flvCount,
    )
    expect(parsed.sources.filter((source) => source.format === 'hls').length).toBeGreaterThan(300)
  })

  it('groups the pinned 19:30 fixture across many brands', () => {
    const match = matches.find(
      (candidate) =>
        candidate.kickoff &&
        fmtTime(candidate.kickoff) === SNAPSHOT.pinnedKickoff &&
        /manchester city|man city/i.test(candidate.title) &&
        /fulham/i.test(candidate.title),
    )
    expect(match).toBeDefined()
    expect(match?.groups.length).toBeGreaterThanOrEqual(3)
    expect(match?.sources.length).toBeGreaterThanOrEqual(3)
  })

  it('groups "Man City" with "Manchester City" but never with Manchester United', () => {
    expect(teamsMatch('Man City', 'Manchester City')).toBe(true)
    expect(teamsMatch('Manchester City', 'Manchester United')).toBe(false)
    expect(teamsMatch('Manchester United', 'Manchester City')).toBe(false)
    expect(teamSimilarity('Man City', 'Manchester City')).toBeGreaterThanOrEqual(0.5)
    expect(teamSimilarity('Manchester City', 'Manchester United')).toBeLessThan(0.5)

    const cityFulham = matches.find(
      (match) =>
        /manchester city|man city/i.test(match.teamA) && /fulham/i.test(match.teamB),
    )
    expect(cityFulham).toBeDefined()
    expect(cityFulham?.sources.some((source) => source.teamA === SNAPSHOT.pinnedHomeShort)).toBe(true)
    expect(cityFulham?.sources.some((source) => source.teamA === SNAPSHOT.pinnedHome)).toBe(true)
  })
})

describe('parseTitle', () => {
  it('parses status, kickoff, sport, teams, commentator and tags', () => {
    const title = parseTitle('🟢 19:30 21/11 ⚽ Manchester City vs Fulham (BLV C2) [flv]', NOW)
    expect(title?.teamA).toBe('Manchester City')
    expect(title?.teamB).toBe('Fulham')
    expect(title?.commentator).toBe('BLV C2')
    expect(title?.tags).toEqual(['flv'])
    expect(title?.statusEmoji).toBe('🟢')
    expect(title?.sport).toBe('football')
    expect(title?.kickoff.getTime()).toBe(Date.UTC(2026, 10, 21, 12, 30))
  })

  it('handles tennis, missing status emoji and multiple tags', () => {
    const tennis = parseTitle(
      '🟢 20:30 21/11 🥎 Carlos Alcaraz Garfia vs Ben Shelton (VIC)',
      NOW,
    )
    expect(tennis?.sport).toBe('tennis')
    expect(tennis?.commentator).toBe('VIC')

    const plain = parseTitle('02:45 22/11 ⚽ LOSC Lille vs Lyon (MP3)', NOW)
    expect(plain?.statusEmoji).toBeNull()
    expect(plain?.sport).toBe('football')
    expect(plain?.teamA).toBe('LOSC Lille')

    const tagged = parseTitle(
      '🟢 19:30 21/11 ⚽ Manchester City vs Fulham (Chuối Chao) [FHD] [hls]',
      NOW,
    )
    expect(tagged?.tags).toEqual(['FHD', 'hls'])
    expect(tagged?.commentator).toBe('Chuối Chao')
  })

  it('returns null for the freshness marker', () => {
    expect(parseTitle('Updated 21/11 20:23', NOW)).toBeNull()
    expect(parseUpdatedMarker('Updated 21/11 20:23', NOW)?.date.getTime()).toBe(
      Date.UTC(2026, 10, 21, 13, 23),
    )
  })
})

describe('detectFormat', () => {
  it('reads the URL first, then the tags', () => {
    expect(detectFormat('https://x/live/a.m3u8', [])).toBe('hls')
    expect(detectFormat('https://x/live/a.flv', [])).toBe('flv')
    expect(detectFormat('rtmp://x/live/abc', [])).toBe('rtmp')
    expect(detectFormat('https://x/live/stream', ['flv'])).toBe('flv')
    expect(detectFormat('https://x/live/stream', [])).toBe('unknown')
  })

  it('lets the URL extension override a wrong playlist tag', () => {
    // Real inventory: `.m3u8` entries labelled [flv] and vice versa.
    expect(detectFormat('https://live.example.com/a/index.m3u8?token=1', ['flv'])).toBe('hls')
    expect(detectFormat('https://live.example.com/a.flv', ['hls'])).toBe('flv')
    expect(detectFormat('https://live.example.com/a.flv', ['flv', 'hls'])).toBe('flv')
    expect(detectFormat('https://live.example.com/a/index.M3U8#frag', ['flv'])).toBe('hls')
    // An `.flv` fragment inside the query string must not leak in.
    expect(detectFormat('https://live.example.com/a/index.m3u8?fallback=b.flv', ['flv'])).toBe('hls')
  })

  it('never returns hls for an flv or rtmp URL', () => {
    expect(detectFormat('rtmp://live.example.com/a.m3u8', [])).toBe('rtmp')
    expect(detectFormat('http://live.example.com/a.flv?x=1', ['hls'])).toBe('flv')
  })
})

describe('splitExtinf', () => {
  it('keeps commas inside attributes out of the title split', () => {
    const { attrs, title } = splitExtinf(
      '#EXTINF:-1 tvg-logo="https://x/a,b.png" group-title="Test TV", 🟢 19:30 21/11 ⚽ A vs B (X)',
    )
    expect(attrs['group-title']).toBe('Test TV')
    expect(attrs['tvg-logo']).toBe('https://x/a,b.png')
    expect(title).toBe('🟢 19:30 21/11 ⚽ A vs B (X)')
  })
})

describe('checkPlaylist', () => {
  it('returns OK with parsed data for a usable playlist', async () => {
    const fetchImpl = (async () =>
      new Response(sample.slice(0, 4000), {
        status: 200,
        headers: { 'content-type': 'audio/x-mpegurl' },
      })) as unknown as typeof fetch
    const result = await checkPlaylist('https://example.test/a.m3u', { fetchImpl, now: NOW })
    expect(result.status).toBe('OK')
    expect(result.parsed?.sources.length).toBeGreaterThan(0)
  })

  it('returns EMPTY for 200 + only no-signal entries and the marker', async () => {
    const dead = [
      '#EXTM3U',
      '#EXTINF:-1 group-title="Updated 21/11 20:23", Updated 21/11 20:23',
      'https://static.example.test/no-signal/low.m3u8',
      `#EXTINF:-1 tvg-logo="x" group-title="${SNAPSHOT.deadBrand}" , 🟢 19:30 21/11 ⚽ A vs B (X)`,
      'https://static.example.test/no-signal/channel-1.m3u8',
      `#EXTINF:-1 tvg-logo="x" group-title="${SNAPSHOT.deadBrand}" , 🟢 20:00 21/11 ⚽ C vs D (Y)`,
      'https://static.example.test/no-signal/channel-2.m3u8',
      '',
    ].join('\n')
    const fetchImpl = (async () =>
      new Response(dead, { status: 200 })) as unknown as typeof fetch
    const result = await checkPlaylist('https://example.test/dead.m3u', { fetchImpl, now: NOW })
    expect(result.status).toBe('EMPTY')
    expect(result.parsed?.stats.usableCount).toBe(0)
    expect(result.parsed?.stats.noSignalCount).toBe(2)
    expect(result.httpStatus).toBe(200)
  })

  it('returns EMPTY when the body is not M3U at all', async () => {
    const fetchImpl = (async () =>
      new Response('<html>no signal</html>', { status: 200 })) as unknown as typeof fetch
    const result = await checkPlaylist('https://example.test/html', { fetchImpl, now: NOW })
    expect(result.status).toBe('EMPTY')
  })

  it('maps HTTP failures and network errors', async () => {
    const notFound = (async () =>
      new Response('gone', { status: 404, statusText: 'Not Found' })) as unknown as typeof fetch
    expect((await checkPlaylist('https://example.test/x', { fetchImpl: notFound })).status).toBe(
      'HTTP_ERROR',
    )

    const broken = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    expect((await checkPlaylist('https://example.test/x', { fetchImpl: broken })).status).toBe(
      'NETWORK_ERROR',
    )
  })

  it('returns TIMEOUT when the request never resolves', async () => {
    const hanging = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })) as unknown as typeof fetch
    const result = await checkPlaylist('https://example.test/slow', {
      fetchImpl: hanging,
      timeoutMs: 30,
    })
    expect(result.status).toBe('TIMEOUT')
  })
})

describe('M3U export round-trip', () => {
  it('re-parses to the same entries, groups, referrers and URLs', () => {
    const subset = [
      ...parsed.sources.filter((source) => source.referrer).slice(0, 30),
      ...parsed.sources.filter((source) => !source.referrer).slice(0, 30),
    ]
    const text = buildM3U(subset)
    expect(text.startsWith('#EXTM3U\n')).toBe(true)
    expect(text).toContain('#EXTVLCOPT:http-referrer=')
    expect(text).toContain('group-title="')

    const reparsed = parsePlaylist(text, NOW)
    expect(reparsed.sources).toHaveLength(subset.length)
    reparsed.sources.forEach((source, index) => {
      expect(source.url).toBe(subset[index].url)
      expect(source.group).toBe(subset[index].group)
      expect(source.title).toBe(subset[index].title)
      expect(source.referrer).toBe(subset[index].referrer)
      expect(source.userAgent).toBe(subset[index].userAgent)
      expect(source.isNoSignal).toBe(subset[index].isNoSignal)
      expect(source.kickoff?.getTime()).toBe(subset[index].kickoff?.getTime())
    })
  })

  it('round-trips the whole playlist', () => {
    const reparsed = parsePlaylist(buildM3U(parsed.sources), NOW)
    expect(reparsed.sources).toHaveLength(parsed.sources.length)
    expect(reparsed.stats.noSignalCount).toBe(parsed.stats.noSignalCount)
    expect(reparsed.stats.usableCount).toBe(parsed.stats.usableCount)
  })
})