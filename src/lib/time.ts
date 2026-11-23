import type { MatchStatus } from './types'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/**
 * Vietnam has had no DST since 1975, so a fixed +07:00 offset is exact.
 * Playlist kickoff times are published as Vietnam wall-clock times.
 */
export const VN_OFFSET_MS = 7 * HOUR
const VN_OFFSET_HOURS = 7

/** Which wall clock the UI renders in. Parsing is always Vietnam-based. */
export type DisplayZone = 'vn' | 'local'

/** Live window: from 5 minutes before kickoff to 135 minutes after. */
export const LIVE_BEFORE_MS = 5 * MINUTE
export const LIVE_AFTER_MS = 135 * MINUTE

/** Remove Vietnamese tone marks and fold to lower case. */
export function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

export function normalizeText(input: string): string {
  return stripDiacritics(input).toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Build the absolute instant for a Vietnam wall-clock day/month/hour/minute.
 * Year defaults to the current Vietnam year; if that lands more than ~6
 * months in the future we roll back a year (daily playlists never advertise
 * fixtures half a year ahead).
 */
export function dateWithYearRollback(
  day: number,
  month: number,
  hour = 0,
  minute = 0,
  now: Date = new Date(),
): Date | null {
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return null
  }
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null

  const build = (year: number) =>
    new Date(Date.UTC(year, month - 1, day, hour - VN_OFFSET_HOURS, minute, 0, 0))

  const nowYear = zonedParts(now, 'vn').year
  let date = build(nowYear)
  // Guard against invalid dates like 31/02 -> 03/03. Check the calendar part
  // only, so an early-morning kickoff that crosses a month boundary validates.
  if (new Date(Date.UTC(nowYear, month - 1, day)).getUTCDate() !== day) return null
  if (date.getTime() - now.getTime() > 183 * DAY) {
    date = build(nowYear - 1)
  }
  return date
}

export interface ZoneParts {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
}

/** Wall-clock components of an instant in the requested display zone. */
export function zonedParts(date: Date, zone: DisplayZone = 'vn'): ZoneParts {
  if (zone === 'local') {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    }
  }
  const shifted = new Date(date.getTime() + VN_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  }
}

/** Machine UTC offset in minutes, computed at runtime (never hardcoded). */
export function machineOffsetMinutes(date: Date = new Date()): number {
  return -date.getTimezoneOffset()
}

/** True when the machine already runs on Vietnam time, so the toggle is noise. */
export function machineIsVietnam(date: Date = new Date()): boolean {
  return machineOffsetMinutes(date) === VN_OFFSET_HOURS * 60
}

/** First instant of the calendar day containing `date`, in the given zone. */
export function startOfDay(date: Date, zone: DisplayZone = 'vn'): Date {
  const parts = zonedParts(date, zone)
  if (zone === 'local') return new Date(parts.year, parts.month - 1, parts.day)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - VN_OFFSET_MS)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY)
}

export function isSameDay(a: Date, b: Date, zone: DisplayZone = 'vn'): boolean {
  const left = zonedParts(a, zone)
  const right = zonedParts(b, zone)
  return left.year === right.year && left.month === right.month && left.day === right.day
}

/** Calendar-day index in a zone; DST-safe because it never divides instants. */
function dayIndex(date: Date, zone: DisplayZone): number {
  const parts = zonedParts(date, zone)
  return Date.UTC(parts.year, parts.month - 1, parts.day) / DAY
}

/** Whole calendar days from `now`'s day to `date`'s day in the given zone. */
export function calendarDayDiff(date: Date, now: Date, zone: DisplayZone = 'vn'): number {
  return Math.round(dayIndex(date, zone) - dayIndex(now, zone))
}

export function matchStatusAt(
  kickoff: Date | null,
  now: Date,
  emoji: string | null = null,
): MatchStatus {
  if (!kickoff || Number.isNaN(kickoff.getTime())) {
    // No clock information: lean on the playlist status emoji.
    if (emoji === '🟢') return 'live'
    if (emoji === '🟡') return 'upcoming'
    return 'unknown'
  }
  const delta = kickoff.getTime() - now.getTime()
  if (delta > LIVE_BEFORE_MS) return 'upcoming'
  if (delta >= -LIVE_AFTER_MS) return 'live'
  // Tie-break at the edges: a stream still flagged green a little after the
  // window closed is usually just running long.
  if (emoji === '🟢' && delta >= -LIVE_AFTER_MS - 30 * MINUTE) return 'live'
  return 'ended'
}

const pad = (n: number) => String(n).padStart(2, '0')

export function fmtTime(date: Date, zone: DisplayZone = 'vn'): string {
  const parts = zonedParts(date, zone)
  return `${pad(parts.hours)}:${pad(parts.minutes)}`
}

export function fmtDate(date: Date, zone: DisplayZone = 'vn'): string {
  const parts = zonedParts(date, zone)
  return `${pad(parts.day)}/${pad(parts.month)}`
}

export function fmtDateTime(date: Date, zone: DisplayZone = 'vn'): string {
  return `${fmtTime(date, zone)} ${fmtDate(date, zone)}`
}

export function fmtClock(date: Date, zone: DisplayZone = 'vn'): string {
  const parts = zonedParts(date, zone)
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`
}

/** "Hôm nay" / "Ngày mai" / "Hôm qua" / "21/11" */
export function dayLabel(date: Date, now: Date = new Date(), zone: DisplayZone = 'vn'): string {
  const diff = calendarDayDiff(date, now, zone)
  if (diff === 0) return 'Hôm nay'
  if (diff === 1) return 'Ngày mai'
  if (diff === -1) return 'Hôm qua'
  return fmtDate(date, zone)
}

/** Short zone word for UI copy: "giờ VN" / "giờ máy". */
export function displayZoneLabel(zone: DisplayZone): string {
  return zone === 'local' ? 'máy' : 'VN'
}

export function ageMs(timestamp: number, now: Date = new Date()): number {
  return Math.max(0, now.getTime() - timestamp)
}

/** "3 giờ trước" style, kept short for the header strip. */
export function fmtAge(timestamp: number, now: Date = new Date()): string {
  const diff = ageMs(timestamp, now)
  const mins = Math.floor(diff / MINUTE)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

export function isStale(timestamp: number, thresholdMs = 48 * HOUR, now = new Date()): boolean {
  return ageMs(timestamp, now) > thresholdMs
}