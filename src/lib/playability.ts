import type { Source } from './types'

/**
 * Why a source cannot be played by the in-page player. `null` means it can.
 * The strings are user-facing Vietnamese and are reused verbatim as the
 * tooltip/title on the disabled "Xem" action, so keep them short.
 */
export type PlayabilityReason = 'no-signal' | 'rtmp' | 'flv' | 'unknown' | 'referrer' | 'insecure' | null

export const PLAYABILITY_REASON_TEXT: Record<Exclude<PlayabilityReason, null>, string> = {
  'no-signal': 'nguồn no-signal, không phát được',
  rtmp: 'rtmp chỉ phát bằng VLC',
  flv: '.flv chỉ phát bằng VLC',
  unknown: 'không rõ định dạng stream — chỉ phát bằng VLC',
  referrer: 'nguồn gắn referrer — trình duyệt không gửi được',
  insecure: 'nguồn http:// — trang https không tải được stream không mã hoá',
}

/** Human-readable reason a source is not web-playable, or null when it is. */
export function playabilityReason(source: Source): PlayabilityReason {
  if (source.isNoSignal) return 'no-signal'
  if (source.format === 'rtmp') return 'rtmp'
  if (source.format === 'flv') return 'flv'
  if (source.format !== 'hls') return 'unknown'
  if (source.referrer) return 'referrer'
  if (!/^https:\/\//i.test(source.url.trim())) return 'insecure'
  return null
}

/**
 * The single rule the UI uses to decide whether "Xem" (in-browser playback)
 * may be offered: HLS over https with no referrer header. A browser cannot
 * set a custom `Referer`, and `<video>` cannot demux HTTP-FLV or RTMP.
 */
export function canPlayInBrowser(source: Source): boolean {
  return playabilityReason(source) === null
}

/** Tooltip for a source: the blocking reason, or the success hint. */
export function playabilityTitle(source: Source): string {
  const reason = playabilityReason(source)
  return reason ? PLAYABILITY_REASON_TEXT[reason] : 'Xem thử trong trình duyệt bằng hls.js'
}