import type {
  HealthResult,
  HealthStatus,
  ParsedPlaylist,
  Source,
  SportKey,
  StreamFormat,
} from './types'
import { dateWithYearRollback } from './time'

export const DEFAULT_TIMEOUT_MS = 20_000
export const NO_SIGNAL_MARKER = 'no-signal'

const SPORT_BY_EMOJI: Record<string, SportKey> = {
  '⚽': 'football',
  '🥎': 'tennis',
  '🎾': 'tennis',
  '🏀': 'basketball',
  '🏐': 'volleyball',
  '🎮': 'esports',
  '🥊': 'combat',
  '🥋': 'combat',
}

export interface TitleParse {
  kickoff: Date
  statusEmoji: string | null
  sport: SportKey
  sportEmoji: string | null
  teamA: string
  teamB: string
  commentator: string | null
  tags: string[]
}

function pickSport(emoji: string | null): SportKey {
  if (!emoji) return 'unknown'
  for (const char of emoji) {
    const sport = SPORT_BY_EMOJI[char]
    if (sport) return sport
  }
  return 'other'
}

/** Decode `#EXTINF:-1 attr="..." group-title="..." , Title`. */
export function splitExtinf(line: string): { attrs: Record<string, string>; title: string } {
  const body = line.replace(/^#EXTINF:/i, '')
  let inQuote = false
  let comma = -1
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i]
    if (char === '"') inQuote = !inQuote
    else if (char === ',' && !inQuote) {
      comma = i
      break
    }
  }
  if (comma === -1) return { attrs: {}, title: body.trim() }

  const attrPart = body.slice(0, comma)
  const title = body.slice(comma + 1).trim()
  const attrs: Record<string, string> = {}
  const attrRe = /([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = attrRe.exec(attrPart)) !== null) {
    attrs[match[1].toLowerCase()] = match[2].trim()
  }
  return { attrs, title }
}

const TITLE_HEAD =
  /^(?:(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*)\s*)?(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.*)$/u
const SPORT_PREFIX = /^((?:\p{Extended_Pictographic}|\uFE0F|\u200D)+)\s*/u
const TRAILING_TAGS = /\s*\[([^\]]*)\]\s*/g
const TRAILING_PARENS = /\(([^()]*)\)\s*$/

/**
 * Parse a display title like
 * `🟢 19:30 21/11 ⚽ Manchester City vs Fulham (BLV C2) [flv]`.
 * Returns null when it is not a fixture (e.g. the `Updated ...` marker).
 */
export function parseTitle(rawTitle: string, now: Date = new Date()): TitleParse | null {
  const title = rawTitle.replace(/\s+/g, ' ').trim()
  const head = TITLE_HEAD.exec(title)
  if (!head) return null

  const [, statusEmoji, hh, mm, dd, mo, , restRaw] = head
  const kickoff = dateWithYearRollback(
    Number(dd),
    Number(mo),
    Number(hh),
    Number(mm),
    now,
  )
  if (!kickoff) return null

  let rest = restRaw.trim()
  const sportMatch = SPORT_PREFIX.exec(rest)
  const sportEmoji = sportMatch ? sportMatch[1] : null
  if (sportMatch) rest = rest.slice(sportMatch[0].length)

  const tags: string[] = []
  rest = rest.replace(TRAILING_TAGS, (_all, tag: string) => {
    const clean = tag.trim()
    if (clean) tags.push(clean)
    return ' '
  })
  rest = rest.replace(/\s+/g, ' ').trim()

  let commentator: string | null = null
  const parens = TRAILING_PARENS.exec(rest)
  if (parens) {
    commentator = parens[1].trim() || null
    rest = rest.slice(0, parens.index).trim()
  }

  const parts = /^(.*?)\s+vs\.?\s+(.*)$/i.exec(rest)
  if (!parts) return null
  const teamA = parts[1].trim()
  const teamB = parts[2].trim()
  if (!teamA || !teamB) return null

  return {
    kickoff,
    statusEmoji: statusEmoji ? statusEmoji : null,
    sport: pickSport(sportEmoji),
    sportEmoji,
    teamA,
    teamB,
    commentator,
    tags,
  }
}

/**
 * Stream format is decided by the URL, never by the playlist tag: the
 * inventory labels a lot of `.m3u8` entries `[flv]` and vice versa, and only
 * the actual container can be handed to the right player. Tags are a last
 * resort for extension-less URLs (`https://host/live/channel`).
 */
function urlExtension(url: string): string {
  const withoutOrigin = url.trim().replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')
  const path = withoutOrigin.split(/[?#]/, 1)[0].toLowerCase()
  const base = path.slice(path.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  if (dot < 0) return ''
  const ext = base.slice(dot + 1)
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : ''
}

export function detectFormat(url: string, tags: string[]): StreamFormat {
  if (/^rtmps?:\/\//i.test(url)) return 'rtmp'
  const ext = urlExtension(url)
  if (ext === 'm3u8') return 'hls'
  if (ext === 'flv') return 'flv'
  const joined = tags.join(' ').toLowerCase()
  if (joined.includes('flv')) return 'flv'
  if (joined.includes('hls') || ext === 'm3u') return 'hls'
  return 'unknown'
}

export interface UpdatedMarker {
  date: Date
  label: string
}

/** `Updated 21/11 20:23` — the playlist freshness marker, never a channel. */
export function parseUpdatedMarker(title: string, now: Date = new Date()): UpdatedMarker | null {
  const match = /^Updated\s+(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/i.exec(title.trim())
  if (!match) return null
  const date = dateWithYearRollback(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    now,
  )
  if (!date) return null
  return { date, label: title.trim() }
}

interface PendingEntry {
  extinf: string
  options: string[]
}

function buildSource(
  entry: PendingEntry,
  url: string,
  index: number,
  now: Date,
): Source | null {
  if (!/^(https?|rtmp|rtsp|rtp|udp):\/\//i.test(url)) return null
  const { attrs, title } = splitExtinf(entry.extinf)
  const parsed = parseTitle(title, now)

  let referrer: string | null = null
  let userAgent: string | null = null
  for (const option of entry.options) {
    const value = option.slice(option.indexOf(':') + 1)
    if (/^http-referrer=/i.test(value)) referrer = value.slice('http-referrer='.length).trim()
    else if (/^http-user-agent=/i.test(value)) userAgent = value.slice('http-user-agent='.length).trim()
  }

  const tags = parsed?.tags ?? []
  return {
    id: `s${index}`,
    group: attrs['group-title']?.trim() || 'Khác',
    title,
    url,
    logo: attrs['tvg-logo']?.trim() || null,
    referrer,
    userAgent,
    tags,
    isNoSignal: url.toLowerCase().includes(NO_SIGNAL_MARKER),
    kickoff: parsed?.kickoff ?? null,
    statusEmoji: parsed?.statusEmoji ?? null,
    sport: parsed?.sport ?? 'unknown',
    sportEmoji: parsed?.sportEmoji ?? null,
    teamA: parsed?.teamA ?? null,
    teamB: parsed?.teamB ?? null,
    commentator: parsed?.commentator ?? null,
    format: detectFormat(url, tags),
    index,
  }
}

/**
 * Parse a whole playlist text (one or many concatenated M3U documents).
 * Pure: no DOM, no fetch.
 */
export function parsePlaylist(text: string, now: Date = new Date()): ParsedPlaylist {
  const lines = text.split(/\r?\n/)
  const sources: Source[] = []
  let pending: PendingEntry | null = null
  let extinfCount = 0
  let playlistUpdatedAt: Date | null = null
  let updatedLabel: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      // Blank lines and single-space separators end nothing on their own:
      // a URL always follows its #EXTINF block immediately.
      continue
    }
    if (/^#EXTM3U\b/i.test(line)) continue

    if (/^#EXTINF:/i.test(line)) {
      extinfCount += 1
      pending = { extinf: line, options: [] }
      continue
    }
    if (line.startsWith('#')) {
      if (pending) pending.options.push(line)
      continue
    }

    if (!pending) continue
    const entry = pending
    pending = null

    // The freshness marker is metadata, not a channel.
    const marker = parseUpdatedMarker(splitExtinf(entry.extinf).title, now)
    if (marker) {
      playlistUpdatedAt = marker.date
      updatedLabel = marker.label
      continue
    }

    const source = buildSource(entry, line, sources.length, now)
    if (source) sources.push(source)
  }

  const groups = new Set<string>()
  let noSignalCount = 0
  let usableCount = 0
  for (const source of sources) {
    groups.add(source.group)
    if (source.isNoSignal) noSignalCount += 1
    else usableCount += 1
  }

  return {
    sources,
    playlistUpdatedAt,
    updatedLabel,
    stats: {
      extinfCount,
      noSignalCount,
      usableCount,
      groupCount: groups.size,
    },
  }
}

export interface CheckOptions {
  timeoutMs?: number
  fetchImpl?: typeof fetch
  now?: Date
}

/**
 * Fetch + validate a playlist URL. Never throws: every failure maps onto
 * OK / EMPTY / HTTP_ERROR / NETWORK_ERROR / TIMEOUT.
 */
export async function checkPlaylist(
  url: string,
  options: CheckOptions = {},
): Promise<HealthResult> {
  const started = Date.now()
  const now = options.now ?? new Date()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchImpl = options.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined)

  const base = { url, checkedAt: now, httpStatus: null as number | null }

  if (!fetchImpl) {
    return {
      ...base,
      status: 'NETWORK_ERROR',
      message: 'Trình duyệt không hỗ trợ fetch.',
      elapsedMs: Date.now() - started,
      parsed: null,
      text: null,
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const fail = (status: HealthStatus, message: string, httpStatus: number | null = null): HealthResult => ({
    ...base,
    status,
    httpStatus,
    message,
    elapsedMs: Date.now() - started,
    parsed: null,
    text: null,
  })

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    })

    if (!response.ok) {
      return fail(
        'HTTP_ERROR',
        `Máy chủ trả về HTTP ${response.status}${response.statusText ? ` (${response.statusText})` : ''}.`,
        response.status,
      )
    }

    const text = await response.text()
    if (!text || !text.trim()) {
      return fail('EMPTY', 'Máy chủ trả về nội dung rỗng.', response.status)
    }

    const parsed = parsePlaylist(text, now)
    if (parsed.stats.usableCount === 0) {
      return {
        ...base,
        status: 'EMPTY',
        httpStatus: response.status,
        message:
          parsed.stats.extinfCount > 0
            ? `Tải được ${parsed.stats.extinfCount} mục nhưng tất cả đều là "no-signal" hoặc chỉ có mốc cập nhật.`
            : 'Nội dung tải về không phải playlist M3U (không có #EXTINF nào).',
        elapsedMs: Date.now() - started,
        parsed,
        text,
      }
    }

    return {
      ...base,
      status: 'OK',
      httpStatus: response.status,
      message: `OK · ${parsed.stats.usableCount} nguồn khả dụng`,
      elapsedMs: Date.now() - started,
      parsed,
      text,
    }
  } catch (error) {
    const aborted =
      controller.signal.aborted ||
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError')
    if (aborted) {
      return fail('TIMEOUT', `Không phản hồi sau ${Math.round(timeoutMs / 1000)} giây.`)
    }
    const detail = error instanceof Error ? error.message : String(error)
    return fail(
      'NETWORK_ERROR',
      `Không kết nối được tới link (mạng, DNS hoặc CORS bị chặn). ${detail}`,
    )
  } finally {
    clearTimeout(timer)
  }
}

export function healthIsFatal(status: HealthStatus): boolean {
  return status !== 'OK'
}