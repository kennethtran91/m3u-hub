import { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import {
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCw,
  TriangleAlert,
  Tv,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import type { Source } from '../lib/types'
import { openInVlc } from '../lib/vlc'
import { cn } from '../lib/cn'

type Rotation = 0 | 90 | 180 | 270
const ROTATIONS: Rotation[] = [0, 90, 180, 270]
const CONTROLS_TIMEOUT_MS = 3000

const CONTROL =
  'grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/15 bg-black/55 text-white transition-colors hover:border-white/35 hover:bg-black/75'
const CONTROL_WIDE =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] transition-colors'

/**
 * Full-screen player. Rotating the video (not just the device) is the point:
 * 90°/270° swap the element's box to the viewport's short/long side so the
 * picture still fills the screen after the rotation.
 */
export function PlayerModal({ source, onClose }: { source: Source; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [rotation, setRotation] = useState<Rotation>(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [fsSupported, setFsSupported] = useState(false)
  const [fsNotice, setFsNotice] = useState<string | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)

  const rotated = rotation % 180 !== 0

  const nudgeControls = useCallback(() => {
    setControlsVisible(true)
  }, [])

  useEffect(() => {
    if (!controlsVisible || !playing) return
    const id = window.setTimeout(() => setControlsVisible(false), CONTROLS_TIMEOUT_MS)
    return () => window.clearTimeout(id)
  }, [controlsVisible, playing, rotation])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().catch(() => {})
    else video.pause()
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }, [])

  const cycleRotation = useCallback(() => {
    setRotation((value) => ROTATIONS[(ROTATIONS.indexOf(value) + 1) % ROTATIONS.length])
    nudgeControls()
  }, [nudgeControls])

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitDisplayingFullscreen?: boolean })
      | null
    if (!container) return

    const doc = document as Document & {
      webkitFullscreenElement?: Element
      webkitExitFullscreen?: () => void
    }
    const active =
      doc.fullscreenElement ??
      doc.webkitFullscreenElement ??
      (video?.webkitDisplayingFullscreen ? video : null)

    if (active) {
      try {
        if (doc.exitFullscreen) await doc.exitFullscreen()
        else doc.webkitExitFullscreen?.()
      } catch {
        // Already out of fullscreen.
      }
      return
    }

    const element = container as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
      msRequestFullscreen?: () => Promise<void> | void
    }
    const request = (element.requestFullscreen ??
      element.webkitRequestFullscreen ??
      element.msRequestFullscreen) as
      | ((options?: FullscreenOptions) => Promise<void> | void)
      | undefined

    try {
      if (request) {
        await Promise.resolve(request.call(element, { navigationUI: 'hide' }))
      } else if (video?.webkitEnterFullscreen) {
        // iPhone Safari only offers fullscreen on the video element itself.
        video.webkitEnterFullscreen()
        return
      } else {
        setFsNotice('Trình duyệt này không hỗ trợ toàn màn hình. Dùng nút Xoay hoặc xoay ngang máy.')
        return
      }
      // Phones that refuse landscape can still use the rotate button.
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>
      }
      try {
        await orientation.lock?.('landscape')
      } catch {
        // Orientation lock is optional; rotation handles the rest.
      }
    } catch {
      setFsNotice('Không vào được toàn màn hình — trình duyệt chặn. Thử bấm lại hoặc xoay ngang máy.')
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current as
      | (HTMLDivElement & { webkitRequestFullscreen?: () => void })
      | null
    const video = videoRef.current as
      | (HTMLVideoElement & {
          webkitDisplayingFullscreen?: boolean
          webkitEnterFullscreen?: () => void
        })
      | null

    setFsSupported(
      Boolean(container?.requestFullscreen ?? container?.webkitRequestFullscreen ?? video?.webkitEnterFullscreen),
    )

    const sync = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element }
      setFullscreen(Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement ?? video?.webkitDisplayingFullscreen))
    }
    const onError = () =>
      setFsNotice('Không vào được toàn màn hình — trình duyệt chặn. Thử bấm lại hoặc xoay ngang máy.')

    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync as EventListener)
    document.addEventListener('fullscreenerror', onError as EventListener)
    video?.addEventListener('webkitbeginfullscreen', sync as EventListener)
    video?.addEventListener('webkitendfullscreen', sync as EventListener)

    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync as EventListener)
      document.removeEventListener('fullscreenerror', onError as EventListener)
      video?.removeEventListener('webkitbeginfullscreen', sync as EventListener)
      video?.removeEventListener('webkitendfullscreen', sync as EventListener)
    }
  }, [])

  // Leaving the player should also drop OS-level fullscreen.
  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    },
    [],
  )

  useEffect(() => {
    if (!fsNotice) return
    const id = window.setTimeout(() => setFsNotice(null), 4000)
    return () => window.clearTimeout(id)
  }, [fsNotice])

  const togglePip = useCallback(async () => {
    const video = videoRef.current
    if (!video || !document.pictureInPictureEnabled) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch {
      // Not available for this stream.
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (event.key === 'Escape') {
        if (document.fullscreenElement) return
        onClose()
        return
      }
      if (event.key === ' ' || event.key === 'k') {
        event.preventDefault()
        togglePlay()
        nudgeControls()
      } else if (event.key === 'f') {
        void toggleFullscreen()
      } else if (event.key === 'r') {
        cycleRotation()
      } else if (event.key === 'm') {
        toggleMute()
      }
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose, togglePlay, toggleFullscreen, cycleRotation, toggleMute, nudgeControls])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null
    let cancelled = false
    setError(null)
    setLoading(true)
    setPlaying(false)

    const fail = (message: string) => {
      if (cancelled) return
      setError(message)
      setLoading(false)
    }
    const onPlaying = () => {
      if (!cancelled) setLoading(false)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolume = () => {
      setVolume(video.volume)
      setMuted(video.muted)
    }

    video.addEventListener('playing', onPlaying)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('volumechange', onVolume)

    const timer = window.setTimeout(() => {
      if (!cancelled && video.currentTime === 0) {
        fail('Không nhận được hình sau 15 giây. Nguồn có thể đang chết, chặn theo vùng hoặc cần header referrer — hãy mở bằng VLC.')
      }
    }, 15_000)

    if (source.format === 'rtmp') {
      fail('Nguồn RTMP không phát được trong trình duyệt. Hãy mở bằng VLC.')
    } else if (source.format === 'flv') {
      fail('Nguồn .flv (HTTP-FLV) không phát được bằng thẻ video của trình duyệt. Hãy mở bằng VLC.')
    } else if (source.format === 'hls' && Hls.isSupported()) {
      // The worker build of hls.js 1.7.x reproduces `bufferAppendError`
      // ("SourceBuffer does not exist") on these live TS streams; the main
      // thread path plays them on the first try.
      hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        maxBufferLength: 30,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        manifestLoadingTimeOut: 12_000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 12_000,
        fragLoadingTimeOut: 20_000,
      })
      hls.loadSource(source.url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => {
          // Autoplay can be blocked; the play button still works.
        })
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        const kind =
          data.type === 'networkError' ? 'lỗi mạng' : data.type === 'mediaError' ? 'lỗi media' : 'lỗi tải'
        const detail = data.details ? String(data.details) : kind
        fail(`Không phát được nguồn này trong trình duyệt (${kind}: ${detail}). Hãy mở bằng VLC.`)
        hls?.destroy()
        hls = null
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source.url
      void video.play().catch(() => {})
    } else {
      fail('Trình duyệt này không hỗ trợ HLS. Hãy dùng VLC.')
    }

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('volumechange', onVolume)
      if (hls) hls.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [source])

  useEffect(() => {
    if (!error) return
    setControlsVisible(true)
  }, [error])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={source.title}
      onPointerMove={nudgeControls}
      onPointerDown={nudgeControls}
    >
      <div className="absolute inset-0 grid place-items-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          onClick={togglePlay}
          className="object-contain"
          style={{
            width: rotated ? '100dvh' : '100%',
            height: rotated ? '100dvw' : '100%',
            maxWidth: 'none',
            maxHeight: 'none',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform .18s ease-out',
          }}
        />
      </div>

      {loading && !error ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-white/80" aria-hidden />
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-5 text-center">
          <div className="max-w-sm">
            <TriangleAlert className="mx-auto h-6 w-6 text-warn" aria-hidden />
            <p className="mt-3 text-[12.5px] leading-5 text-zinc-300">{error}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openInVlc(source)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-live/45 bg-live/20 px-3 text-[12.5px] font-semibold text-live-text hover:border-live/70"
              >
                <Tv className="h-4 w-4" aria-hidden />
                Mở bằng VLC
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/15 bg-black/55 px-3 text-[12.5px] text-zinc-200 hover:border-white/35"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {fsNotice ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-3">
          <p className="rounded-md border border-warn/30 bg-black/80 px-3 py-1.5 text-center text-[11px] leading-4 text-warn">
            {fsNotice}
          </p>
        </div>
      ) : null}

      {controlsVisible && !error ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-3 bg-gradient-to-b from-black/75 to-transparent p-3">
            <button type="button" onClick={onClose} aria-label="Đóng" className={cn(CONTROL, 'pointer-events-auto')}>
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="pointer-events-none min-w-0 flex-1 pt-1">
              <div className="truncate text-[13px] font-semibold text-white">{source.title}</div>
              <div className="truncate text-[10.5px] text-white/70">
                {source.group}
                {source.format === 'unknown' ? '' : ` · ${source.format.toUpperCase()}`}
                {source.referrer ? ' · có referrer' : ''}
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Tạm dừng' : 'Phát'}
              className={CONTROL}
            >
              {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
              className={CONTROL}
            >
              {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => {
                const video = videoRef.current
                if (!video) return
                const next = Number(event.target.value)
                video.volume = next
                video.muted = next === 0
                nudgeControls()
              }}
              aria-label="Âm lượng"
              className="hidden h-1 w-24 shrink-0 accent-live sm:block"
            />

            <span className="ml-auto hidden shrink-0 rounded border border-live/45 bg-live/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-live-text sm:inline">
              Live
            </span>

            <button
              type="button"
              onClick={cycleRotation}
              aria-label="Xoay màn hình"
              title="Xoay (R)"
              className={cn(CONTROL_WIDE, 'border-white/15 bg-black/55 text-white hover:border-white/35')}
            >
              <RotateCw className="h-4 w-4" aria-hidden />
              <span className="tabular-nums">{rotation}°</span>
            </button>

            {document.pictureInPictureEnabled ? (
              <button
                type="button"
                onClick={() => void togglePip()}
                aria-label="Cửa sổ nổi"
                title="Cửa sổ nổi"
                className={CONTROL}
              >
                <PictureInPicture2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}

            {fsSupported ? (
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                title="Toàn màn hình (F)"
                className={CONTROL}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
