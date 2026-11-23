import type { Match, MatchStatus, Source, SportKey } from './types'
import { matchStatusAt, normalizeText } from './time'

/** Club-affix tokens that carry no club identity; dropped before comparison. */
const CORE_NOISE = new Set([
  'fc',
  'afc',
  'cf',
  'sc',
  'rc',
  'sv',
  'club',
  'clb',
  'de',
  'as',
  'aj',
  'ac',
  'us',
  'cd',
  'ca',
])

/**
 * Filler words (Vietnamese included) plus short club abbreviations. Dropped for
 * fuzzy comparison, but kept in the initials pass so `Lille OSC` still spells `LOSC`.
 */
const FILLER_NOISE = new Set(['cau', 'lac', 'bo', 'bong', 'da', 'osc', 'ogc'])

const DROP_TOKENS = new Set([...CORE_NOISE, ...FILLER_NOISE])

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

/** Lower-case, diacritics stripped, punctuation removed, noise words dropped. */
function splitTokens(name: string, drop: Set<string>): string[] {
  return normalizeText(name)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 1 && !/^\d+$/.test(token) && !drop.has(token))
}

/** Tokens used for fuzzy comparison: club affixes and filler words removed. */
export function tokenize(name: string): string[] {
  return unique(splitTokens(name, DROP_TOKENS))
}

/** Tokens used to spell initials: only the club-affix noise is removed. */
function acronymTokens(name: string): string[] {
  return splitTokens(name, CORE_NOISE)
}

/**
 * Curated Vietnamese-broadcast club naming. Keyed by the full normalised token
 * sequence (so `Deportivo Alavés` never inherits the bare `Deportivo` alias);
 * the value is the canonical spelling compared against. `requires` makes an
 * alias conditional on the other side of the fixture, e.g. `Inter` only expands
 * to `Internazionale` when the opponent's name already says so.
 */
interface TeamAlias {
  to: string
  requires?: string
}

const TEAM_ALIASES: Record<string, TeamAlias> = {
  spurs: { to: 'tottenham hotspur' },
  tottenham: { to: 'tottenham hotspur' },
  psg: { to: 'paris saint germain' },
  lyon: { to: 'olympique lyonnais' },
  lyonnais: { to: 'olympique lyonnais' },
  'olympique lyon': { to: 'olympique lyonnais' },
  losc: { to: 'lille' },
  'losc lille': { to: 'lille' },
  'dep la coruna': { to: 'deportivo la coruna' },
  deportivo: { to: 'deportivo la coruna' },
  'man utd': { to: 'manchester united' },
  'man united': { to: 'manchester united' },
  'man city': { to: 'manchester city' },
  inter: { to: 'internazionale', requires: 'internazionale' },
  juve: { to: 'juventus' },
  barca: { to: 'barcelona' },
  bayern: { to: 'bayern munchen' },
  'bayern munich': { to: 'bayern munchen' },
  dortmund: { to: 'borussia dortmund' },
  monchengladbach: { to: 'borussia monchengladbach' },
  mgladbach: { to: 'borussia monchengladbach' },
}

/** Tokens of `name`, expanded through the alias map when `other` allows it. */
function comparisonTokens(name: string, other: string): string[] {
  const tokens = tokenize(name)
  const alias = TEAM_ALIASES[tokens.join(' ')]
  if (!alias) return tokens
  if (alias.requires && !tokenize(other).includes(alias.requires)) return tokens
  return tokenize(alias.to)
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const rows = a.length + 1
  const cols = b.length + 1
  let prev = new Array<number>(cols)
  let curr = new Array<number>(cols)
  for (let j = 0; j < cols; j += 1) prev[j] = j
  for (let i = 1; i < rows; i += 1) {
    curr[0] = i
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const swap = prev
    prev = curr
    curr = swap
  }
  return prev[cols - 1]
}

/**
 * Bare club names shared by several distinct clubs (`Santos` BR vs `Santos
 * Laguna`, `Inter` vs `Inter Miami`): never treated as an alias of a longer
 * name that merely starts with them, and never matched by prefix alone.
 */
const BARE_AMBIGUOUS = new Set(['santos', 'inter', 'united', 'city', 'dynamo', 'sporting', 'atletico'])

/**
 * Tokens match when equal, when one is a prefix of the other (both >= 3 chars),
 * or when they are within edit distance 2 (both >= 6 chars).
 */
export function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true
  // An ambiguous bare name must match exactly, or `Inter Miami` would
  // prefix-match `Internazionale` and `Santos` would match `Santos Laguna`.
  if (BARE_AMBIGUOUS.has(a) || BARE_AMBIGUOUS.has(b)) return false
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return true
  if (a.length >= 6 && b.length >= 6 && levenshtein(a, b) <= 2) return true
  return false
}

/** matched-token Jaccard between two team names. */
export function teamSimilarity(teamA: string, teamB: string): number {
  const left = comparisonTokens(teamA, teamB)
  const right = comparisonTokens(teamB, teamA)
  if (!left.length || !right.length) return 0
  const used = new Array<boolean>(right.length).fill(false)
  let matched = 0
  for (const token of left) {
    let hit = -1
    for (let j = 0; j < right.length; j += 1) {
      if (!used[j] && tokensMatch(token, right[j])) {
        hit = j
        break
      }
    }
    if (hit >= 0) {
      used[hit] = true
      matched += 1
    }
  }
  return matched / (left.length + right.length - matched)
}

export const TEAM_MATCH_THRESHOLD = 0.5

const MAX_ACRONYM_TOKENS = 4
const MAX_ACRONYM_LETTERS = 8

/**
 * Can `word` be spelled by consuming every token of `tokens`, in order, where
 * each token contributes either its initial or — when it is itself a short
 * abbreviation — its whole spelling? `LOSC` = L + OSC over {Lille, OSC}.
 */
function spellsInitials(word: string, tokens: string[]): boolean {
  const width = word.length + 1
  const memo = new Map<number, boolean>()
  const walk = (tokenIndex: number, cursor: number): boolean => {
    if (tokenIndex === tokens.length) return cursor === word.length
    const key = tokenIndex * width + cursor
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    const token = tokens[tokenIndex]
    const options = token.length <= 4 ? [token, token[0]] : [token[0]]
    let ok = false
    for (const option of options) {
      if (word.startsWith(option, cursor) && walk(tokenIndex + 1, cursor + option.length)) {
        ok = true
        break
      }
    }
    memo.set(key, ok)
    return ok
  }
  return walk(0, 0)
}

/**
 * Acronym/initials: a short token cluster (`QPR`, `PSG`, `LOSC`) matches a
 * longer name when its letters spell the initials of every significant token.
 */
export function acronymMatches(shortSide: string, longSide: string): boolean {
  const short = acronymTokens(shortSide)
  if (short.length < 1 || short.length > MAX_ACRONYM_TOKENS) return false
  if (short.some((token) => token.length > 4)) return false
  const letters = short.join('')
  if (letters.length < 2 || letters.length > MAX_ACRONYM_LETTERS) return false
  const long = acronymTokens(longSide)
  if (long.length < 2) return false
  return spellsInitials(letters, long)
}

/**
 * Bare club names shared by several distinct clubs (`Santos` BR vs `Santos
 * Laguna`, `Inter` vs `Inter Miami`): never treated as an alias of a longer
 * name that merely starts with them.
 */
function bareNameConflict(a: string, b: string): boolean {
  const left = tokenize(a)
  const right = tokenize(b)
  const smaller = left.length <= right.length ? left : right
  const larger = left.length <= right.length ? right : left
  if (smaller.length !== 1 || larger.length < 2) return false
  return BARE_AMBIGUOUS.has(smaller[0]) && larger.includes(smaller[0])
}

export function teamsMatch(a: string, b: string): boolean {
  if (acronymMatches(a, b) || acronymMatches(b, a)) return true
  if (teamSimilarity(a, b) < TEAM_MATCH_THRESHOLD) return false
  return !bareNameConflict(a, b)
}

/** Never mix sports inside one card; an unknown sport may join a known one. */
export function sportsCompatible(a: SportKey, b: SportKey): boolean {
  return a === b || a === 'unknown' || b === 'unknown'
}

export function fixtureMatches(a: Source, b: Source): boolean {
  if (!a.teamA || !a.teamB || !b.teamA || !b.teamB) return false
  if (!sportsCompatible(a.sport, b.sport)) return false
  return teamsMatch(a.teamA, b.teamA) && teamsMatch(a.teamB, b.teamB)
}

function pickDisplayName(names: Array<string | null>): string {
  const counts = new Map<string, number>()
  for (const name of names) {
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  let best = ''
  let bestCount = -1
  for (const [name, count] of counts) {
    if (count > bestCount || (count === bestCount && name.length > best.length)) {
      best = name
      bestCount = count
    }
  }
  return best
}

function slug(input: string): string {
  return normalizeText(input).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'
}

/** Union-find over one kickoff bucket, merging fuzzy-equal fixtures. */
function clusterBucket(bucket: Source[]): Source[][] {
  const parent = bucket.map((_, index) => index)
  const find = (i: number): number => {
    let root = i
    while (parent[root] !== root) root = parent[root]
    let cursor = i
    while (parent[cursor] !== cursor) {
      const next = parent[cursor]
      parent[cursor] = root
      cursor = next
    }
    return root
  }
  const union = (a: number, b: number) => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) parent[rootB] = rootA
  }

  for (let i = 0; i < bucket.length; i += 1) {
    for (let j = i + 1; j < bucket.length; j += 1) {
      if (fixtureMatches(bucket[i], bucket[j])) union(i, j)
    }
  }

  const grouped = new Map<number, Source[]>()
  bucket.forEach((source, index) => {
    const root = find(index)
    const group = grouped.get(root)
    if (group) group.push(source)
    else grouped.set(root, [source])
  })
  return Array.from(grouped.values())
}

function makeMatch(sources: Source[], now: Date): Match {
  const first = sources[0]
  const parsed = sources.filter((source) => source.kickoff && source.teamA && source.teamB)
  const isUnparsed = parsed.length === 0

  const kickoff = sources.reduce<Date | null>((earliest, source) => {
    if (!source.kickoff) return earliest
    if (!earliest) return source.kickoff
    return source.kickoff.getTime() < earliest.getTime() ? source.kickoff : earliest
  }, null)

  const teamA = pickDisplayName(parsed.map((source) => source.teamA)) || first.title
  const teamB = pickDisplayName(parsed.map((source) => source.teamB))
  const statusEmoji = sources.find((source) => source.statusEmoji)?.statusEmoji ?? null
  const sportEmoji = sources.find((source) => source.sportEmoji)?.sportEmoji ?? null

  return {
    id: isUnparsed
      ? `other-${slug(first.title)}-${first.index}`
      : `m-${kickoff ? kickoff.getTime() : 'x'}-${slug(teamA)}-vs-${slug(teamB)}`,
    kickoff,
    teamA,
    teamB,
    title: isUnparsed ? first.title : teamB ? `${teamA} vs ${teamB}` : teamA,
    sport: sources.find((source) => source.sport !== 'unknown')?.sport ?? 'unknown',
    sportEmoji,
    statusEmoji,
    status: matchStatusAt(kickoff, now, statusEmoji),
    sources,
    commentators: unique(
      sources.map((source) => source.commentator).filter((value): value is string => Boolean(value)),
    ),
    groups: unique(sources.map((source) => source.group)),
    formats: unique(sources.map((source) => source.format)),
    usableCount: sources.filter((source) => !source.isNoSignal).length,
    isUnparsed,
  }
}

/**
 * Group sources into matches. Kickoff date+HH:MM is the bucket; inside a
 * bucket, fuzzy team pairs are merged (union-find so chains collapse).
 * Titles that do not parse become a synthetic `Khác` match per raw title.
 */
export function buildMatches(sources: Source[], now: Date = new Date()): Match[] {
  const buckets = new Map<number, Source[]>()
  const unparsed = new Map<string, Source[]>()

  for (const source of sources) {
    if (!source.kickoff || !source.teamA || !source.teamB) {
      const key = source.title.trim() || source.url
      const list = unparsed.get(key)
      if (list) list.push(source)
      else unparsed.set(key, [source])
      continue
    }
    const key = Math.floor(source.kickoff.getTime() / 60_000)
    const list = buckets.get(key)
    if (list) list.push(source)
    else buckets.set(key, [source])
  }

  const matches: Match[] = []
  for (const bucket of buckets.values()) {
    for (const cluster of clusterBucket(bucket)) matches.push(makeMatch(cluster, now))
  }
  for (const group of unparsed.values()) matches.push(makeMatch(group, now))
  return sortMatches(matches)
}

const STATUS_RANK: Record<MatchStatus, number> = {
  live: 0,
  upcoming: 1,
  ended: 2,
  unknown: 3,
}

export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
    if (rank !== 0) return rank
    const aTime = a.kickoff?.getTime() ?? Number.POSITIVE_INFINITY
    const bTime = b.kickoff?.getTime() ?? Number.POSITIVE_INFINITY
    if (aTime !== bTime) return aTime - bTime
    return a.title.localeCompare(b.title, 'vi')
  })
}

/** Live status recomputed against the current clock (emoji as fallback). */
export function currentStatus(match: Match, now: Date): MatchStatus {
  return matchStatusAt(match.kickoff, now, match.statusEmoji)
}