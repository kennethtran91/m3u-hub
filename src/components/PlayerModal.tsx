import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Copy, Download, Loader2, MonitorPlay, Play, TriangleAlert, X } from 'lucide-react'
import type { Source } from '../lib/types'
import { buildSourceM3U, sourceFilename } from '../lib/export'
import { copyText, downloadTextFile } from '../lib/download'
import { openInVlc } from '../lib/vlc'

export function PlayerModal({ source, onClose }: { source: Source; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null
    let cancelled = false
    setError(null)
    setLoading(true)

    const fail = (message: string) => {
      if (cancelled) return
      setError(message)
      setLoading(false)
    }
    const onPlaying = () => {
      if (!cancelled) setLoading(false)
    }
    video.addEventListener('playing', onPlaying)

    const timer = window.setTimeout(() => {
      if (!cancelled && video.currentTime === 0) {
        fail(
          'Không nhận được hình sau 15 giây. Nguồn có thể đang chết, chặn theo vùng (geo-block) hoặc cần header referrer — hãy dùng VLC.',
        )
      }
    }, 15_000)

    if (source.format === 'rtmp') {
      fail('Nguồn RTMP không phát được trong trình duyệt. Hãy mở bằng VLC.')
    } else if (source.format === 'flv') {
      fail(
        'Nguồn .flv (HTTP-FLV) không phát được bằng thẻ video của trình duyệt. Hãy mở bằng VLC.',
      )
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
          // Autoplay can be blocked; the native controls still work.
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
      if (hls) hls.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [source])

  const handleCopy = async () => {
    if (await copyText(source.url)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Xem thử nguồn trong trình duyệt"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-line bg-ink-900 shadow-pop">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
          <MonitorPlay className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-zinc-100">{source.title}</div>
            <div className="truncate text-[10px] text-muted">
              {source.group} · {source.format.toUpperCase()} · thử nghiệm trong trình duyệt
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-ink-800 hover:text-zinc-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            controls
            playsInline
            className="h-full w-full"
            poster=""
          />
          {loading && !error ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-300" aria-hidden />
            </div>
          ) : null}
          {error ? (
            <div className="absolute inset-0 grid place-items-center bg-ink-950/90 p-5 text-center">
              <div className="max-w-sm">
                <TriangleAlert className="mx-auto h-6 w-6 text-warn" aria-hidden />
                <p className="mt-3 text-xs leading-5 text-zinc-300">{error}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openInVlc(source)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-live/40 bg-live/20 px-3 py-2 text-xs font-semibold text-live-text shadow-panel hover:border-live/60 hover:bg-live/30"
                  >
                    <Play className="h-4 w-4" aria-hidden />
                    Mở bằng VLC
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadTextFile(sourceFilename(source), buildSourceM3U(source), 'application/x-mpegurl')
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-ink-850 px-3 py-2 text-[11px] text-zinc-300 hover:border-line-strong"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Tải .m3u
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 px-3 py-2.5 sm:px-4">
          <p className="text-[11px] leading-4 text-muted">
            Trình duyệt chỉ phát được nguồn <span className="font-mono">.m3u8</span> qua https và
            không gắn header <span className="font-mono">referrer</span>. Nguồn gắn referrer,
            <span className="font-mono"> .flv</span> hoặc <span className="font-mono">rtmp</span> chỉ
            xem được bằng VLC — nút “Xem” đã bị khoá cho các nguồn đó.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-ink-850 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:border-line-strong"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? 'Đã copy link' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(sourceFilename(source), buildSourceM3U(source), 'application/x-mpegurl')
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-ink-850 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:border-line-strong"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Tải .m3u cho VLC
            </button>
            <span className="ml-auto text-[10px] text-muted">
              {source.referrer ? 'Có referrer header' : 'Không có referrer'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}