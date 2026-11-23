import { describe, expect, it } from 'vitest'
import type { Source } from '../types'
import { parsePlaylist } from '../playlist'
import { buildMatches } from '../matches'
import {
  commentatorDisplay,
  commentatorKey,
  commentatorsOf,
  matchesCommentator,
} from '../commentators'

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 's0',
    group: 'S8 TV',
    title: 'Napoli vs Torino',
    url: 'https://hls.example.com/live/napoli/index.m3u8',
    logo: null,
    referrer: null,
    userAgent: null,
    tags: ['hls'],
    isNoSignal: false,
    kickoff: null,
    statusEmoji: null,
    sport: 'football',
    sportEmoji: null,
    teamA: 'Napoli',
    teamB: 'Torino',
    commentator: null,
    format: 'hls',
    index: 0,
    ...overrides,
  }
}

function sourcesWith(labels: Array<string | null>): Source[] {
  return labels.map((commentator, index) =>
    makeSource({ id: `s${index}`, index, commentator, group: `TV ${index}` }),
  )
}

describe('commentatorKey', () => {
  it('strips the BLV label and folds case/diacritics', () => {
    expect(commentatorKey('BLV Khô Cóc')).toBe('KHO COC')
    expect(commentatorKey('BLV Khô Cóc')).toBe(commentatorKey('Khô Cóc'))
    expect(commentatorKey('BLV. Khô Cóc')).toBe('KHO COC')
  })

  it('merges HD MAX with MAX', () => {
    expect(commentatorKey('HD MAX')).toBe('MAX')
    expect(commentatorKey('HD MAX')).toBe(commentatorKey('MAX'))
    expect(commentatorKey('MAX HD')).toBe('MAX')
    expect(commentatorKey('MAX FHD')).toBe('MAX')
  })

  it('handles the Fan MC and Trung lập prefixes', () => {
    expect(commentatorKey('Fan MC: Ben')).toBe('BEN')
    expect(commentatorKey('Trung lập: Chồn')).toBe('CHON')
    expect(commentatorKey('Trung lập: Chồn')).toBe(commentatorKey('Chồn'))
  })

  it('repeats prefix stripping and collapses whitespace', () => {
    expect(commentatorKey('  BLV   HD   MAX ')).toBe('MAX')
    expect(commentatorKey('MC   Ben')).toBe('BEN')
  })

  it('never eats a name that merely starts with the label letters', () => {
    expect(commentatorKey('McGregor')).toBe('MCGREGOR')
    expect(commentatorKey('Hải')).toBe('HAI')
  })
})

describe('commentatorDisplay', () => {
  it('drops provider labels but keeps casing and diacritics', () => {
    expect(commentatorDisplay('BLV Khô Cóc')).toBe('Khô Cóc')
    expect(commentatorDisplay('HD MAX')).toBe('MAX')
    expect(commentatorDisplay('Fan MC: Ben')).toBe('Ben')
    expect(commentatorDisplay('Trung lập: Chồn')).toBe('Chồn')
  })
})

describe('commentatorsOf', () => {
  it('merges spellings by key and counts sources', () => {
    const groups = commentatorsOf(
      sourcesWith(['BLV Khô Cóc', 'Khô Cóc', 'HD MAX', 'MAX', 'MAX', null]),
    )
    expect(groups).toHaveLength(2)

    const khoCoc = groups.find((group) => group.key === 'KHO COC')
    expect(khoCoc?.count).toBe(2)
    expect(khoCoc?.display).toBe('Khô Cóc')
    expect(khoCoc?.sources).toHaveLength(2)

    const max = groups.find((group) => group.key === 'MAX')
    expect(max?.count).toBe(3)
    expect(max?.display).toBe('MAX')
  })

  it('picks the most frequent raw spelling for display', () => {
    const groups = commentatorsOf(sourcesWith(['Le Loi', 'Lê Lợi', 'Lê Lợi']))
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('LE LOI')
    expect(groups[0].display).toBe('Lê Lợi')
    expect(groups[0].count).toBe(3)
  })

  it('sorts by count desc, then display asc', () => {
    const groups = commentatorsOf(sourcesWith(['Ben', 'Ben', 'An', 'Cường']))
    expect(groups.map((group) => group.display)).toEqual(['Ben', 'An', 'Cường'])
  })

  it('skips sources without a commentator', () => {
    expect(commentatorsOf(sourcesWith([null, '', '  ']))).toHaveLength(0)
  })
})

describe('matchesCommentator', () => {
  it('narrows an 11-commentator match to one person', () => {
    const labels = Array.from({ length: 11 }, (_, index) => `BLV Caster ${index}`)
    const entries = labels
      .map(
        (label, index) =>
          `#EXTINF:-1 tvg-logo="x" group-title="Test TV" , 22:00 21/11 ⚽ Napoli vs Torino (${label}) [hls]\nhttps://example.test/${index}/stream.m3u8\n`,
      )
      .join('')
    const now = new Date(2026, 10, 21, 20, 0, 0)
    const matches = buildMatches(parsePlaylist(`#EXTM3U\n${entries}`, now).sources, now)

    expect(matches).toHaveLength(1)
    const groups = commentatorsOf(matches[0].sources)
    expect(groups).toHaveLength(11)
    expect(matches[0].sources).toHaveLength(11)

    const target = groups[4]
    const narrowed = matches[0].sources.filter((source) => matchesCommentator(source, target.key))
    expect(narrowed).toHaveLength(1)
    expect(commentatorKey(narrowed[0].commentator as string)).toBe(target.key)
    expect(target.count).toBe(1)
  })
})