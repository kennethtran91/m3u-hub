import { describe, expect, it } from 'vitest'
import { snapshot } from './snapshot'
import { parsePlaylist } from '../playlist'
import {
  acronymMatches,
  buildMatches,
  sortMatches,
  teamSimilarity,
  teamsMatch,
  tokenize,
} from '../matches'
import { buildMatchM3U, buildSourceM3U } from '../export'
import { fmtTime } from '../time'

const NOW = new Date(2026, 10, 21, 20, 0, 0)
const parsed = parsePlaylist(snapshot(), NOW)
const matches = buildMatches(parsed.sources, NOW)

/** Synthetic playlist entry in the exact shape the live playlist uses. */
function entry(fixture: string, index: number, sport = '⚽', kickoff = '22:00'): string {
  return (
    `#EXTINF:-1 tvg-logo="https://example.test/${index}.png" group-title="Test TV" , ` +
    `${kickoff} 21/11 ${sport} ${fixture} (BLV Test) [hls]\nhttps://example.test/${index}/stream.m3u8\n`
  )
}

function build(fixtures: string[], sport = '⚽', kickoff = '22:00') {
  const text = ['#EXTM3U', ...fixtures.map((fixture, index) => entry(fixture, index, sport, kickoff))].join('\n')
  return buildMatches(parsePlaylist(text, NOW).sources, NOW)
}

describe('buildMatches', () => {
  it('keeps every source exactly once', () => {
    const seen = matches.flatMap((match) => match.sources.map((source) => source.id))
    expect(seen).toHaveLength(parsed.sources.length)
    expect(new Set(seen).size).toBe(parsed.sources.length)
  })

  it('collapses entries into far fewer matches than sources', () => {
    expect(matches.length).toBeGreaterThan(50)
    expect(matches.length).toBeLessThan(parsed.sources.length)
  })

  it('sorts live first, then upcoming by kickoff', () => {
    const sorted = sortMatches(matches)
    const ranks = sorted.map((match) => (match.status === 'live' ? 0 : match.status === 'upcoming' ? 1 : 2))
    for (let i = 1; i < ranks.length; i += 1) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1])
    }
    const live = sorted.filter((match) => match.status === 'live')
    for (let i = 1; i < live.length; i += 1) {
      expect(live[i].kickoff!.getTime()).toBeGreaterThanOrEqual(live[i - 1].kickoff!.getTime())
    }
  })

  it('merges AFC Bournemouth with Bournemouth (prefix, no "afc" token dropping)', () => {
    expect(teamsMatch('AFC Bournemouth', 'Bournemouth')).toBe(true)
    expect(teamsMatch("Nott'm Forest", 'Nottingham Forest')).toBe(true)
    expect(teamSimilarity('AFC Bournemouth', 'Bournemouth')).toBeGreaterThanOrEqual(0.5)
  })

  it('keeps unrelated fixtures apart on the same kickoff', () => {
    const at2230 = matches.filter((match) => match.kickoff && fmtTime(match.kickoff) === '23:30')
    const titles = at2230.map((match) => `${match.teamA}|${match.teamB}`)
    expect(new Set(titles).size).toBe(titles.length)
    expect(at2230.length).toBeGreaterThan(1)
  })

  it('puts unparseable titles in a synthetic Khác match, never drops them', () => {
    const weird =
      '#EXTM3U\n#EXTINF:-1 tvg-logo="x" group-title="Test TV" , Sự kiện đặc biệt không có giờ\nhttps://example.test/a.m3u8\n'
    const sources = parsePlaylist(weird, NOW).sources
    expect(sources).toHaveLength(1)
    const built = buildMatches(sources, NOW)
    expect(built).toHaveLength(1)
    expect(built[0].isUnparsed).toBe(true)
    expect(built[0].title).toBe('Sự kiện đặc biệt không có giờ')
    expect(built[0].kickoff).toBeNull()
  })

  it('tokenizes Vietnamese team names without diacritics', () => {
    expect(tokenize('1. FC Nürnberg')).toEqual(['nurnberg'])
    expect(tokenize('AFC Bournemouth')).toEqual(['bournemouth'])
    expect(tokenize('S.S. Lazio')).toEqual(['lazio'])
    // "city" is deliberately NOT a generic token.
    expect(tokenize('Manchester City')).toEqual(['manchester', 'city'])
  })
})

describe('acronym & alias matching', () => {
  const merges: Array<[string, string]> = [
    ['Millwall vs QPR', 'Millwall vs Queens Park Rangers'],
    ['Spurs vs Ipswich', 'Tottenham Hotspur vs Ipswich Town'],
    ['Nice vs PSG', 'OGC Nice vs Paris Saint Germain'],
    ['Lille OSC vs Olympique Lyonnais', 'LOSC Lille vs Lyon'],
    ['Alaves vs Dep. La Coruna', 'Deportivo Alavés vs RC Deportivo'],
  ]

  for (const [left, right] of merges) {
    it(`merges "${left}" with "${right}" into one card`, () => {
      const built = build([left, right])
      expect(built).toHaveLength(1)
      expect(built[0].sources).toHaveLength(2)
      expect(built[0].isUnparsed).toBe(false)
    })
  }

  it('spells initials: QPR, PSG, LOSC (L + OSC)', () => {
    expect(acronymMatches('QPR', 'Queens Park Rangers')).toBe(true)
    expect(acronymMatches('PSG', 'Paris Saint Germain')).toBe(true)
    expect(acronymMatches('LOSC', 'Lille OSC')).toBe(true)
    expect(acronymMatches('Bologna', 'Bolton')).toBe(false)
  })

  it('keeps distinct clubs apart, even on the same kickoff', () => {
    const distinct: Array<[string, string]> = [
      ['Manchester United', 'Manchester City'],
      ['Galatasaray', 'Ziraat Bankasi'],
      ['Power Rangers', 'Arsenal'],
      ['Real Madrid', 'Real Betis'],
      ['Santos Laguna', 'Santos'],
      ['Bayer Leverkusen', 'Bayern Munich'],
      ['Bologna', 'Bolton'],
      ['Inter Miami', 'Internazionale'],
      ['Borussia Mönchengladbach', 'Borussia Dortmund'],
    ]
    for (const [left, right] of distinct) expect(teamsMatch(left, right)).toBe(false)

    const built = build(['Manchester United vs Arsenal', 'Manchester City vs Arsenal'])
    expect(built).toHaveLength(2)
  })

  it('merges Manchester City / Man City and Man Utd / Manchester United, not each other', () => {
    expect(teamsMatch('Manchester City', 'Man City')).toBe(true)
    expect(teamsMatch('Manchester United', 'Man Utd')).toBe(true)
    expect(teamsMatch('Manchester United', 'Man City')).toBe(false)
    const built = build(['Manchester City vs Fulham', 'Man City vs Fulham'])
    expect(built).toHaveLength(1)
    expect(built[0].sources).toHaveLength(2)
  })

  it('never merges across sports at the same instant', () => {
    const text = [
      '#EXTM3U',
      entry('Millwall vs QPR', 0, '⚽'),
      entry('Millwall vs QPR', 1, '🎾'),
    ].join('\n')
    const built = buildMatches(parsePlaylist(text, NOW).sources, NOW)
    expect(built).toHaveLength(2)
    expect(new Set(built.map((match) => match.sport))).toEqual(new Set(['football', 'tennis']))
  })

  it('drops club-affix noise before Jaccard', () => {
    expect(tokenize('AS Roma')).toEqual(['roma'])
    expect(tokenize('AJ Auxerre')).toEqual(['auxerre'])
    expect(tokenize('Lille OSC')).toEqual(['lille'])
    expect(tokenize('Deportivo Alavés')).toEqual(['deportivo', 'alaves'])
    expect(teamSimilarity('Bournemouth', 'AFC Bournemouth')).toBe(1)
  })
})

describe('per-match export', () => {
  it('exports only usable sources', () => {
    const match = matches.find((candidate) => candidate.usableCount > 0 && candidate.sources.some((s) => s.isNoSignal))
    expect(match).toBeDefined()
    const text = buildMatchM3U(match!)
    const reparsed = parsePlaylist(text, NOW)
    expect(reparsed.sources.every((source) => !source.isNoSignal)).toBe(true)
    expect(reparsed.sources.length).toBe(match!.usableCount)
  })

  it('builds a valid single-entry playlist for VLC', () => {
    const source = parsed.sources.find((candidate) => candidate.referrer)!
    const text = buildSourceM3U(source)
    expect(text.startsWith('#EXTM3U\n#EXTINF:-1')).toBe(true)
    expect(text).toContain(`group-title="${source.group}"`)
    expect(text).toContain(`#EXTVLCOPT:http-referrer=${source.referrer}`)
    expect(text.trim().endsWith(source.url)).toBe(true)
    expect(parsePlaylist(text, NOW).sources).toHaveLength(1)
  })
})