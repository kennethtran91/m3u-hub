import type { Source } from './types'

/**
 * Per-user Windows protocol registered either by the downloadable installer
 * (`public/downloads/install-m3uhub-vlc.cmd`) or, when running from a clone,
 * by `protocol/register.cmd`. Both copy `protocol/handler.ps1` to
 * `%LOCALAPPDATA%\m3u-hub\handler.ps1` and point the registry at that copy,
 * so the UI never needs to know where this repo (if any) lives on disk.
 * The handler mirrors the parsing/validation rules implemented here, so keep
 * the two in sync when editing.
 */
export const VLC_SCHEME = 'm3uhub'
/** Relative path shown to users running the app from a cloned repo. */
export const VLC_REGISTER_SCRIPT = 'protocol\\register.cmd'
/**
 * Join a root-relative path onto a Vite base (`'/'` in dev, `'/m3u-hub/'` on
 * GitHub Pages) without ever producing `//`. `path` must not start with '/'.
 */
export function withBaseUrl(path: string, base: string): string {
  const normalizedBase = base ? (base.endsWith('/') ? base : `${base}/`) : '/'
  return normalizedBase + path.replace(/^\/+/, '')
}

/**
 * Static download served by Vite from public/downloads/. Built from
 * `BASE_URL` so it resolves under the Pages subpath (`/m3u-hub/downloads/…`)
 * as well as at the dev-server root (`/downloads/…`).
 */
export const VLC_INSTALLER_URL = withBaseUrl('downloads/install-m3uhub-vlc.cmd', import.meta.env.BASE_URL)

/** sessionStorage flag so the "VLC did not open?" hint shows once per session. */
export const VLC_HINT_KEY = 'm3u-hub.vlc-hint.v1'

export interface VlcRequest {
  url: string
  referrer: string | null
  userAgent: string | null
  title: string | null
}

const ALLOWED_SCHEMES = new Set(['http', 'https', 'rtmp'])

/**
 * encodeURIComponent leaves ! ' ( ) * untouched; percent-encode them as well so
 * the URI survives Windows' URI->command-line round trip and PowerShell's
 * UnescapeDataString without any quoting surprises. Spaces become %20, never +.
 */
function encodeComponent(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

/** Same rules as the handler: absolute http/https/rtmp URL with a host, no option injection. */
export function isSafeStreamUrl(value: string): boolean {
  const url = value.trim()
  if (!url || url.length > 2048) return false
  if (url.startsWith('-')) return false
  if (/[\u0000-\u001F\u007F"]/.test(url)) return false
  if (/\s/.test(url)) return false
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]+)/i.exec(url)
  if (!match) return false
  return ALLOWED_SCHEMES.has(match[1].toLowerCase())
}

/** Encoded `m3uhub://play?...` URI that launches the desktop VLC app. */
export function buildVlcUri(source: Source): string {
  const params = [`u=${encodeComponent(source.url)}`]
  if (source.referrer) params.push(`r=${encodeComponent(source.referrer)}`)
  if (source.userAgent) params.push(`a=${encodeComponent(source.userAgent)}`)
  const title = (source.title ?? '').trim()
  if (title) params.push(`t=${encodeComponent(title)}`)
  return `${VLC_SCHEME}://play?${params.join('&')}`
}

/**
 * Decode + validate an m3uhub:// URI. Returns null for anything the handler
 * would refuse (bad scheme, missing host, option-injection, control chars).
 */
export function parseVlcUri(uri: string): VlcRequest | null {
  if (typeof uri !== 'string') return null
  const raw = uri.trim()
  if (!/^m3uhub:\/\//i.test(raw)) return null
  const questionMark = raw.indexOf('?')
  if (questionMark < 0) return null

  let query = raw.slice(questionMark + 1)
  const hash = query.indexOf('#')
  if (hash >= 0) query = query.slice(0, hash)
  if (!query) return null

  const values = new Map<string, string>()
  for (const pair of query.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    if (eq <= 0) continue
    const key = pair.slice(0, eq)
    if (!['u', 'r', 'a', 't'].includes(key)) continue
    try {
      values.set(key, decodeURIComponent(pair.slice(eq + 1)))
    } catch {
      return null
    }
  }

  const url = (values.get('u') ?? '').trim()
  if (!isSafeStreamUrl(url)) return null

  const referrer = (values.get('r') ?? '').trim()
  if (referrer && !/^https?:\/\/[^/?#]+/i.test(referrer)) return null

  const userAgent = (values.get('a') ?? '').trim()
  const title = (values.get('t') ?? '').trim()

  return {
    url,
    referrer: referrer || null,
    userAgent: userAgent || null,
    title: title || null,
  }
}

/** Hand the URI to Windows; the shell resolves the registered protocol handler. */
export function openInVlc(source: Source): string {
  const uri = buildVlcUri(source)
  window.location.href = uri
  return uri
}

/** True only the first time it is called in this browser session. */
export function takeVlcHint(): boolean {
  try {
    if (window.sessionStorage.getItem(VLC_HINT_KEY)) return false
    window.sessionStorage.setItem(VLC_HINT_KEY, '1')
    return true
  } catch {
    return true
  }
}