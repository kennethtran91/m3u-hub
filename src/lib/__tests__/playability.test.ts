import { describe, expect, it } from 'vitest'
import type { Source } from '../types'
import { canPlayInBrowser, playabilityReason, playabilityTitle } from '../playability'

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

describe('canPlayInBrowser', () => {
  it('accepts hls over https without a referrer', () => {
    const source = makeSource()
    expect(canPlayInBrowser(source)).toBe(true)
    expect(playabilityReason(source)).toBeNull()
  })

  it('rejects a source carrying a referrer header', () => {
    const source = makeSource({ referrer: 'https://khoga1.live/' })
    expect(canPlayInBrowser(source)).toBe(false)
    expect(playabilityReason(source)).toBe('referrer')
    expect(playabilityTitle(source)).toBe('nguồn gắn referrer — trình duyệt không gửi được')
  })

  it('rejects .flv (HTTP-FLV)', () => {
    const source = makeSource({ format: 'flv', url: 'https://flv.example.com/live/a.flv', tags: ['flv'] })
    expect(canPlayInBrowser(source)).toBe(false)
    expect(playabilityReason(source)).toBe('flv')
    expect(playabilityTitle(source)).toBe('.flv chỉ phát bằng VLC')
  })

  it('rejects rtmp', () => {
    const source = makeSource({ format: 'rtmp', url: 'rtmp://rtmp.example.com/live/a' })
    expect(canPlayInBrowser(source)).toBe(false)
    expect(playabilityReason(source)).toBe('rtmp')
    expect(playabilityTitle(source)).toBe('rtmp chỉ phát bằng VLC')
  })

  it('rejects an http:// url even when it is hls without a referrer', () => {
    const source = makeSource({ url: 'http://hls.example.com/live/a.m3u8' })
    expect(canPlayInBrowser(source)).toBe(false)
    expect(playabilityReason(source)).toBe('insecure')
  })

  it('rejects unknown formats and no-signal entries', () => {
    expect(playabilityReason(makeSource({ format: 'unknown' }))).toBe('unknown')
    expect(playabilityReason(makeSource({ isNoSignal: true }))).toBe('no-signal')
  })
})