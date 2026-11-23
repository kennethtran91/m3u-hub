import type { Source } from './types'
import { stripDiacritics } from './time'

/**
 * Leading labels providers put in front of a commentator's name. Matched only
 * at a word boundary (`MC` never eats `McGregor`), longest-first so
 * `Fan MC:` / `Trung lập:` are consumed before the bare `MC`.
 */
const LEADING_PREFIX =
  /^(?:fan\s+mc\s*:|trung\s+l(?:ậ|â|a)p\s*:|blv\s*\.?|hd|mc)(?=\s|:|$)\s*/iu

/** Trailing audio-quality suffix (`MAX HD`, `Khô Cóc FHD`). */
const TRAILING_QUALITY = /\s+(?:fhd|hd)$/iu

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Drop leading provider labels and a trailing HD/FHD suffix. */
function stripLabels(raw: string): string {
  let value = collapse(raw)
  for (;;) {
    const next = value.replace(LEADING_PREFIX, '')
    if (next === value) break
    value = next
  }
  value = collapse(value.replace(TRAILING_QUALITY, ''))
  return value
}

/** Normalised identity of a commentator label, used to merge spellings. */
export function commentatorKey(raw: string): string {
  const display = stripLabels(raw)
  return stripDiacritics(display).toUpperCase().replace(/\s+/g, ' ').trim()
}

/** Human form: provider labels dropped, original casing and diacritics kept. */
export function commentatorDisplay(raw: string): string {
  const display = stripLabels(raw)
  return display || collapse(raw)
}

export interface CommentatorGroup {
  key: string
  display: string
  /** Number of sources attributed to this person. */
  count: number
  sources: Source[]
}

/**
 * Merge sources by commentator identity. The display form is the one derived
 * from the most frequent raw spelling (first spelling wins a tie), so
 * `HD MAX`/`MAX` reads as `MAX` and `BLV Khô Cóc`/`Khô Cóc` as `Khô Cóc`.
 */
export function commentatorsOf(sources: Source[]): CommentatorGroup[] {
  interface Bucket {
    key: string
    sources: Source[]
    spellings: Map<string, number>
  }
  const buckets = new Map<string, Bucket>()

  for (const source of sources) {
    if (!source.commentator) continue
    const key = commentatorKey(source.commentator)
    if (!key) continue
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.sources.push(source)
      bucket.spellings.set(source.commentator, (bucket.spellings.get(source.commentator) ?? 0) + 1)
    } else {
      buckets.set(key, {
        key,
        sources: [source],
        spellings: new Map([[source.commentator, 1]]),
      })
    }
  }

  const groups: CommentatorGroup[] = []
  for (const bucket of buckets.values()) {
    let best = ''
    let bestCount = -1
    for (const [spelling, count] of bucket.spellings) {
      if (count > bestCount) {
        best = spelling
        bestCount = count
      }
    }
    groups.push({
      key: bucket.key,
      display: commentatorDisplay(best),
      count: bucket.sources.length,
      sources: bucket.sources,
    })
  }

  return groups.sort(
    (a, b) => b.count - a.count || a.display.localeCompare(b.display, 'vi'),
  )
}

/** Does this source belong to the commentator identity `key`? */
export function matchesCommentator(source: Source, key: string): boolean {
  return Boolean(source.commentator) && commentatorKey(source.commentator as string) === key
}