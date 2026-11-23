export interface Prefs {
  /** Hide individual no-signal source rows. */
  hideNoSignal: boolean
  /** Only show matches that still have at least one usable source. */
  onlyAlive: boolean
  lastGroup: string
  /** Display clock: Vietnam (default) or the machine's own timezone. */
  timezone: 'vn' | 'local'
}

export interface CacheEntry {
  text: string
  fetchedAt: number
}

export interface PersistedState {
  version: 1
  playlistUrl: string
  cache: CacheEntry | null
  prefs: Prefs
}

export const STORAGE_KEY = 'm3u-hub.v1'

export function defaultState(): PersistedState {
  return {
    version: 1,
    playlistUrl: '',
    cache: null,
    prefs: { hideNoSignal: true, onlyAlive: false, lastGroup: 'all', timezone: 'vn' },
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Read and validate the single versioned key; never throws. */
export function loadPersisted(): PersistedState {
  const base = defaultState()
  if (typeof localStorage === 'undefined') return base
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (!isObject(parsed)) return base

    const state = defaultState()
    if (typeof parsed.playlistUrl === 'string') state.playlistUrl = parsed.playlistUrl

    if (isObject(parsed.cache)) {
      const text = parsed.cache.text
      const fetchedAt = parsed.cache.fetchedAt
      if (typeof text === 'string' && text.length > 0 && typeof fetchedAt === 'number') {
        state.cache = { text, fetchedAt }
      }
    }

    if (isObject(parsed.prefs)) {
      const prefs = parsed.prefs
      if (typeof prefs.hideNoSignal === 'boolean') state.prefs.hideNoSignal = prefs.hideNoSignal
      if (typeof prefs.onlyAlive === 'boolean') state.prefs.onlyAlive = prefs.onlyAlive
      if (typeof prefs.lastGroup === 'string') state.prefs.lastGroup = prefs.lastGroup
      if (prefs.timezone === 'vn' || prefs.timezone === 'local') state.prefs.timezone = prefs.timezone
    }
    return state
  } catch {
    return base
  }
}

export function savePersisted(state: PersistedState): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    // Quota exceeded (a playlist is ~200KB) — drop the cache and retry once.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, cache: null }))
      return false
    } catch {
      return false
    }
  }
}

export function updatePersisted(patch: Partial<PersistedState>): PersistedState {
  const next = { ...loadPersisted(), ...patch }
  savePersisted(next)
  return next
}

export function updatePrefs(patch: Partial<Prefs>): PersistedState {
  const current = loadPersisted()
  return updatePersisted({ prefs: { ...current.prefs, ...patch } })
}

export function saveCache(text: string, fetchedAt: number = Date.now()): PersistedState {
  return updatePersisted({ cache: { text, fetchedAt } })
}

export function clearCache(): PersistedState {
  return updatePersisted({ cache: null })
}

export function cacheAgeMs(cache: CacheEntry | null, now: Date = new Date()): number | null {
  if (!cache) return null
  return Math.max(0, now.getTime() - cache.fetchedAt)
}