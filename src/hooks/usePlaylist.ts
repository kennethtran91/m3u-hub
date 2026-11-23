import { useCallback, useEffect, useRef, useState } from 'react'
import { checkPlaylist, parsePlaylist } from '../lib/playlist'
import { buildMatches } from '../lib/matches'
import { loadPersisted, saveCache, savePersisted } from '../lib/storage'
import type { HealthResult, Match, ParsedPlaylist } from '../lib/types'

export type Phase = 'empty' | 'loading' | 'ready' | 'blocked'

export interface PlaylistState {
  phase: Phase
  loading: boolean
  url: string
  parsed: ParsedPlaylist | null
  matches: Match[]
  health: HealthResult | null
  servedFromCache: boolean
  cacheFetchedAt: number | null
  lastCheckedAt: number | null
  statusText: string
}

export interface PlaylistController extends PlaylistState {
  refresh: () => void
  saveUrl: (url: string) => Promise<void>
  testUrl: (url: string) => Promise<HealthResult>
  useCache: () => boolean
}

const initialState = (url: string): PlaylistState => ({
  phase: url ? 'loading' : 'empty',
  loading: Boolean(url),
  url,
  parsed: null,
  matches: [],
  health: null,
  servedFromCache: false,
  cacheFetchedAt: null,
  lastCheckedAt: null,
  statusText: url ? 'Đang tải playlist…' : 'Chưa có link playlist.',
})

/**
 * There is no bundled playlist: the app ships no stream URLs of its own, so
 * the first run starts empty and waits for the user to paste a link.
 */
export function usePlaylist(): PlaylistController {
  const stored = useRef(loadPersisted())
  const [state, setState] = useState<PlaylistState>(() => initialState(stored.current.playlistUrl))
  const mounted = useRef(true)

  const runCheck = useCallback(async (url: string) => {
    if (!url.trim()) {
      setState((prev) => ({
        ...prev,
        phase: 'empty',
        loading: false,
        url: '',
        health: null,
        statusText: 'Chưa có link playlist.',
      }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, statusText: 'Đang kiểm tra link…' }))
    const result = await checkPlaylist(url)
    if (!mounted.current) return
    const checkedAt = Date.now()

    if (result.status === 'OK' && result.parsed && result.text) {
      const parsed = result.parsed
      saveCache(result.text, checkedAt)
      const current = loadPersisted()
      savePersisted({ ...current, playlistUrl: url })
      setState({
        phase: 'ready',
        loading: false,
        url,
        parsed,
        matches: buildMatches(parsed.sources, new Date()),
        health: result,
        servedFromCache: false,
        cacheFetchedAt: checkedAt,
        lastCheckedAt: checkedAt,
        statusText: result.message,
      })
      return
    }

    setState((prev) => ({
      ...prev,
      phase: 'blocked',
      loading: false,
      health: result,
      lastCheckedAt: checkedAt,
      statusText: result.message,
    }))
  }, [])

  useEffect(() => {
    mounted.current = true
    void runCheck(stored.current.playlistUrl)
    return () => {
      mounted.current = false
    }
  }, [runCheck])

  // Auto re-check every 15 minutes while the tab is open and healthy.
  useEffect(() => {
    if (state.phase !== 'ready') return
    const id = window.setInterval(() => {
      void runCheck(state.url)
    }, 15 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [state.phase, state.url, runCheck])

  const refresh = useCallback(() => {
    void runCheck(state.url)
  }, [runCheck, state.url])

  const saveUrl = useCallback(
    async (url: string) => {
      const trimmed = url.trim()
      if (!trimmed) return
      const current = loadPersisted()
      savePersisted({ ...current, playlistUrl: trimmed })
      setState((prev) => ({ ...prev, url: trimmed }))
      await runCheck(trimmed)
    },
    [runCheck],
  )

  const testUrl = useCallback((url: string) => checkPlaylist(url.trim()), [])

  const useCache = useCallback((): boolean => {
    const current = loadPersisted()
    if (!current.cache) return false
    const parsed = parsePlaylist(current.cache.text, new Date())
    if (parsed.stats.usableCount === 0) return false
    setState((prev) => ({
      ...prev,
      phase: 'ready',
      loading: false,
      parsed,
      matches: buildMatches(parsed.sources, new Date()),
      servedFromCache: true,
      cacheFetchedAt: current.cache?.fetchedAt ?? null,
      lastCheckedAt: current.cache?.fetchedAt ?? prev.lastCheckedAt,
      url: current.playlistUrl || prev.url,
      statusText: 'Đang dùng dữ liệu đã lưu',
    }))
    return true
  }, [])

  return { ...state, refresh, saveUrl, testUrl, useCache }
}