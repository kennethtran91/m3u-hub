import { describe, expect, it } from 'vitest'
import type { Source } from '../types'
import {
  VLC_SCHEME,
  buildVlcUri,
  isSafeStreamUrl,
  parseVlcUri,
  type VlcRequest,
} from '../vlc'

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 'src-1',
    group: 'Test TV',
    title: 'Manchester City vs Fulham (BLV Cô Cóc)',
    url: 'https://live.example.com/hls/index.m3u8?token=abc&expires=1764000000',
    logo: null,
    referrer: 'https://khoga1.live/',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    tags: ['hls'],
    isNoSignal: false,
    kickoff: null,
    statusEmoji: null,
    sport: 'football',
    sportEmoji: null,
    teamA: 'Manchester City',
    teamB: 'Fulham',
    commentator: null,
    format: 'hls',
    index: 0,
    ...overrides,
  }
}

/**
 * Independent decoder mirroring protocol/handler.ps1:
 * manual `&`/`=` split, `[System.Uri]::UnescapeDataString` semantics (%XX only,
 * `+` is a literal plus), then the same strict validation.
 */
function pctDecode(value: string): string {
  const bytes: number[] = []
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '%' && /^[0-9a-f]{2}$/i.test(value.slice(i + 1, i + 3))) {
      bytes.push(parseInt(value.slice(i + 1, i + 3), 16))
      i += 2
    } else {
      bytes.push(...new TextEncoder().encode(value[i]))
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

function decodeVlcUri(uri: string): VlcRequest | null {
  if (!/^m3uhub:\/\//i.test(uri)) return null
  const queryStart = uri.indexOf('?')
  if (queryStart < 0) return null
  const params = new Map<string, string>()
  for (const pair of uri.slice(queryStart + 1).split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    if (eq <= 0) continue
    const key = pair.slice(0, eq)
    if (!['u', 'r', 'a', 't'].includes(key)) continue
    params.set(key, pctDecode(pair.slice(eq + 1)))
  }
  const url = params.get('u') ?? ''
  if (!isSafeStreamUrl(url)) return null
  return {
    url,
    referrer: params.get('r') || null,
    userAgent: params.get('a') || null,
    title: params.get('t') || null,
  }
}

describe('vlc URI — round trip through the handler rules', () => {
  it('carries url, referrer, user-agent and title through encode + decode', () => {
    const source = makeSource()
    const uri = buildVlcUri(source)

    expect(uri.startsWith(`${VLC_SCHEME}://play?`)).toBe(true)
    expect(decodeVlcUri(uri)).toEqual({
      url: source.url,
      referrer: source.referrer,
      userAgent: source.userAgent,
      title: source.title,
    })
    // The lib decoder (used by tests/docs) agrees with the independent one.
    expect(parseVlcUri(uri)).toEqual(decodeVlcUri(uri))
  })

  it('survives a url containing its own query string', () => {
    const source = makeSource({
      url: 'https://cdn.example.com/live/stream.m3u8?token=a%2Bb+c&expires=1764000000&sig=Z%3D',
      referrer: 'https://khoga1.live/',
      userAgent: null,
    })
    const uri = buildVlcUri(source)
    const decoded = decodeVlcUri(uri)

    expect(decoded?.url).toBe(source.url)
    expect(decoded?.url).toContain('?token=')
    expect(decoded?.url).toContain('&expires=1764000000')
    expect(decoded?.userAgent).toBeNull()
  })

  it('keeps special characters in the title intact and never emits raw spaces', () => {
    const source = makeSource({ title: 'Manchester City vs Fulham (BLV Cô Cóc) — 19:30' })
    const uri = buildVlcUri(source)

    expect(uri).not.toContain(' ')
    expect(uri).not.toContain('+')
    expect(decodeVlcUri(uri)?.title).toBe(source.title)
    expect(parseVlcUri(uri)?.title).toBe('Manchester City vs Fulham (BLV Cô Cóc) — 19:30')
  })

  it('builds a valid URI for an rtmp source without referrer', () => {
    const source = makeSource({
      url: 'rtmp://live.example.com/live/channel1?key=42',
      referrer: null,
      userAgent: null,
      format: 'rtmp',
      title: 'Kênh 1',
    })
    const uri = buildVlcUri(source)

    expect(uri).toContain('u=rtmp%3A%2F%2Flive.example.com')
    expect(uri).not.toContain('r=')
    expect(uri).not.toContain('a=')
    expect(decodeVlcUri(uri)).toEqual({
      url: source.url,
      referrer: null,
      userAgent: null,
      title: 'Kênh 1',
    })
  })

  it('omits optional params entirely when the source has none', () => {
    const source = makeSource({ referrer: null, userAgent: null, title: '' })
    expect(buildVlcUri(source)).toBe(
      `m3uhub://play?u=${encodeURIComponent(source.url).replace(
        /[!'()*]/g,
        (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
      )}`,
    )
  })
})

describe('vlc URI — rejects what the handler refuses', () => {
  it('rejects a javascript: payload', () => {
    const uri = 'm3uhub://play?u=javascript:alert(1)'
    expect(decodeVlcUri(uri)).toBeNull()
    expect(parseVlcUri(uri)).toBeNull()
    expect(isSafeStreamUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects option-injection style values', () => {
    expect(parseVlcUri('m3uhub://play?u=-vvvv%20file:///c:/windows/system32/calc.exe')).toBeNull()
    expect(parseVlcUri('m3uhub://play?u=https%3A%2F%2Fa.example%2Fx.m3u8&r=-evil.example')).toBeNull()
    expect(isSafeStreamUrl('-vvvv https://a.example/x.m3u8')).toBe(false)
  })

  it('rejects control characters, whitespace, empty hosts and unknown schemes', () => {
    expect(isSafeStreamUrl('https://a.example/\nx.m3u8')).toBe(false)
    expect(isSafeStreamUrl('https://a.example /x.m3u8')).toBe(false)
    // The handler decodes the query first, so an encoded newline is refused too.
    expect(parseVlcUri('m3uhub://play?u=https%3A%2F%2Fa.example%2F%0Ax.m3u8')).toBeNull()
    expect(isSafeStreamUrl('https:///x.m3u8')).toBe(false)
    expect(isSafeStreamUrl('file:///c:/x.m3u8')).toBe(false)
    expect(isSafeStreamUrl('mms://a.example/x')).toBe(false)
  })

  it('accepts http, https and rtmp URLs with a host', () => {
    expect(isSafeStreamUrl('http://a.example/x.m3u8')).toBe(true)
    expect(isSafeStreamUrl('https://a.example:8443/x.m3u8?y=1')).toBe(true)
    expect(isSafeStreamUrl('rtmp://a.example/live/x')).toBe(true)
  })
})