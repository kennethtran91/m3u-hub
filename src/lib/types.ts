export type StreamFormat = 'hls' | 'flv' | 'rtmp' | 'unknown'

export type SportKey =
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'volleyball'
  | 'esports'
  | 'combat'
  | 'other'
  | 'unknown'

export type MatchStatus = 'live' | 'upcoming' | 'ended' | 'unknown'

/** One parsed #EXTINF block (one stream source). */
export interface Source {
  id: string
  /** group-title attribute = source channel brand. */
  group: string
  /** Raw display title after the comma. */
  title: string
  url: string
  logo: string | null
  /** #EXTVLCOPT:http-referrer */
  referrer: string | null
  /** #EXTVLCOPT:http-user-agent */
  userAgent: string | null
  tags: string[]
  isNoSignal: boolean
  kickoff: Date | null
  statusEmoji: string | null
  sport: SportKey
  sportEmoji: string | null
  teamA: string | null
  teamB: string | null
  commentator: string | null
  format: StreamFormat
  /** Position of the entry in the raw file (stable within a load). */
  index: number
}

export interface ParsedPlaylist {
  sources: Source[]
  /** From the `Updated DD/MM HH:MM` marker entry, if present. */
  playlistUpdatedAt: Date | null
  updatedLabel: string | null
  stats: {
    extinfCount: number
    noSignalCount: number
    usableCount: number
    /** Distinct channel brands (the "Updated" marker excluded). */
    groupCount: number
  }
}

export interface Match {
  id: string
  kickoff: Date | null
  teamA: string
  teamB: string
  /** Display title; raw title for unparsed entries. */
  title: string
  sport: SportKey
  sportEmoji: string | null
  statusEmoji: string | null
  /** Snapshot computed when the playlist was grouped. */
  status: MatchStatus
  sources: Source[]
  commentators: string[]
  groups: string[]
  formats: StreamFormat[]
  usableCount: number
  /** True when the title could not be parsed as a fixture (`Khác`). */
  isUnparsed: boolean
}

export type HealthStatus = 'OK' | 'EMPTY' | 'HTTP_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT'

export interface HealthResult {
  status: HealthStatus
  url: string
  httpStatus: number | null
  /** Vietnamese, user facing. */
  message: string
  checkedAt: Date
  elapsedMs: number
  parsed: ParsedPlaylist | null
  text: string | null
}