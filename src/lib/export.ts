import type { Match, Source } from './types'
import { fmtDate, fmtTime } from './time'

/** Attribute values are quoted; strip anything that would break the format. */
function escapeAttr(value: string): string {
  return value.replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim()
}

function entryLines(source: Source): string[] {
  const attrs = ['#EXTINF:-1']
  if (source.logo) attrs.push(`tvg-logo="${escapeAttr(source.logo)}"`)
  attrs.push(`group-title="${escapeAttr(source.group)}"`)
  const lines = [`${attrs.join(' ')} , ${source.title.replace(/[\r\n]+/g, ' ').trim()}`]
  if (source.referrer) lines.push(`#EXTVLCOPT:http-referrer=${source.referrer}`)
  if (source.userAgent) lines.push(`#EXTVLCOPT:http-user-agent=${source.userAgent}`)
  lines.push(source.url)
  return lines
}

/**
 * Build a VLC-compatible playlist for the given sources, preserving
 * group-title and the #EXTVLCOPT referrer / user-agent each stream needs.
 */
export function buildM3U(sources: Source[]): string {
  const lines = ['#EXTM3U']
  for (const source of sources) {
    lines.push(...entryLines(source), '')
  }
  return lines.join('\n')
}

/** Single-entry playlist used by the "Mở VLC" action. */
export function buildSourceM3U(source: Source): string {
  return buildM3U([source])
}

export function buildMatchM3U(match: Match): string {
  const usable = match.sources.filter((source) => !source.isNoSignal)
  const pool = usable.length ? usable : match.sources
  return buildM3U(pool)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function playlistFilename(now: Date = new Date()): string {
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}`
  return `m3u-hub-${stamp}.m3u`
}

function slug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export function matchFilename(match: Match, now: Date = new Date()): string {
  const teams = slug(`${match.teamA}-vs-${match.teamB}`) || 'tran-dau'
  return `${teams}-${fmtDate(now).split('/').reverse().join('')}.m3u`
}

export function sourceFilename(source: Source): string {
  const base = slug(`${source.group}-${source.title}`) || 'nguon'
  return `${base}-${source.id}.m3u`
}

export function exportLabel(sources: Source[]): string {
  const withHeaders = sources.filter((source) => source.referrer || source.userAgent).length
  return `${sources.length} nguồn · ${withHeaders} có header`
}

export { fmtTime, fmtDate }