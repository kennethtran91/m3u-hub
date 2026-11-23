import { useEffect, useState } from 'react'
import {
  Check,
  Clock,
  Copy,
  Database,
  Download,
  Loader2,
  MonitorPlay,
  RefreshCw,
  ServerCrash,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { HealthResult } from '../lib/types'
import { fmtAge, fmtDateTime } from '../lib/time'
import { copyText } from '../lib/download'
import { VLC_INSTALLER_URL, VLC_REGISTER_SCRIPT } from '../lib/vlc'
import { cn } from '../lib/cn'

const REASON_LABEL: Record<HealthResult['status'], string> = {
  OK: 'Link hoạt động',
  EMPTY: 'Tải được nhưng không có nguồn nào dùng được',
  HTTP_ERROR: 'Máy chủ trả về lỗi HTTP',
  NETWORK_ERROR: 'Không kết nối được (mạng hoặc CORS)',
  TIMEOUT: 'Hết thời gian chờ (20 giây)',
}

interface LinkModalProps {
  mode: 'blocked' | 'manage'
  health: HealthResult | null
  currentUrl: string
  hasCache: boolean
  cacheFetchedAt: number | null
  saving: boolean
  onTest: (url: string) => Promise<HealthResult>
  onSave: (url: string) => Promise<void>
  onUseCache: () => boolean
  onClose: () => void
}

export function LinkModal({
  mode,
  health,
  currentUrl,
  hasCache,
  cacheFetchedAt,
  saving,
  onTest,
  onSave,
  onUseCache,
  onClose,
}: LinkModalProps) {
  const [url, setUrl] = useState(currentUrl)
  const [dirty, setDirty] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<HealthResult | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [commandCopied, setCommandCopied] = useState(false)

  useEffect(() => {
    if (!dirty) setUrl(currentUrl)
  }, [currentUrl, dirty])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mode === 'manage') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [mode, onClose])

  const handleTest = async () => {
    const target = url.trim()
    if (!target || testing) return
    setTesting(true)
    setResult(null)
    setResultUrl(null)
    try {
      const next = await onTest(target)
      setResult(next)
      setResultUrl(target)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!checkedOk || saving) return
    setResult(null)
    setResultUrl(null)
    await onSave(url)
  }

  const handleCopyCommand = async () => {
    const ok = await copyText(VLC_REGISTER_SCRIPT)
    if (!ok) return
    setCommandCopied(true)
    window.setTimeout(() => setCommandCopied(false), 1600)
  }

  const failed = health && health.status !== 'OK'
  // First run: nothing was ever loaded, so there is no failure to explain —
  // only a link to ask for.
  const firstRun = mode === 'blocked' && health === null
  // The entry reason only describes the URL the app originally tried. As soon as
  // the user edits the field or runs a re-check, that block must yield to the
  // single status describing the current input.
  const showEntryReason =
    Boolean(failed) && !testing && !result && url.trim() === currentUrl.trim()
  const checkedOk = result?.status === 'OK' && resultUrl === url.trim()

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
      onClick={(event) => {
        if (mode === 'manage' && event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-ink-900 shadow-pop">
        <div className="flex items-start gap-3 border-b border-line px-4 py-3.5">
          <div
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg border',
              mode === 'blocked'
                ? 'border-warn/30 bg-warn/5 text-warn'
                : 'border-line bg-ink-850 text-zinc-300',
            )}
          >
            {mode === 'blocked' ? (
              <ServerCrash className="h-4 w-4" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="link-modal-title" className="text-sm font-semibold text-zinc-100">
              {firstRun
                ? 'Dán link playlist của bạn'
                : mode === 'blocked'
                  ? 'Link playlist không còn hoạt động'
                  : 'Playlist & link'}
            </h2>
            <p className="mt-0.5 text-[11px] leading-4 text-muted">
              {firstRun
                ? 'App không kèm sẵn playlist nào. Dán link M3U bạn có quyền dùng — kiểm tra rồi lưu, link nằm trong trình duyệt này.'
                : mode === 'blocked'
                  ? 'Không thể lấy danh sách trận mới. Kiểm tra link khác hoặc dùng dữ liệu đã lưu.'
                  : 'Đổi link playlist, kiểm tra trước khi lưu. Link được lưu trong trình duyệt này.'}
            </p>
          </div>
          {mode === 'manage' ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted hover:bg-ink-800 hover:text-zinc-100"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="space-y-3 px-4 py-3.5">
          {showEntryReason ? (
            <div
              data-testid="entry-reason"
              className="rounded-md border border-red-400/25 bg-red-400/5 px-3 py-2"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-300">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                {REASON_LABEL[health!.status]}
                {health!.httpStatus ? (
                  <span className="rounded border border-red-400/30 px-1 font-mono text-[10px]">
                    HTTP {health!.httpStatus}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 break-words text-[11px] leading-4 text-zinc-400">{health!.message}</p>
            </div>
          ) : null}

          <div>
            <label htmlFor="playlist-url" className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
              Link playlist (M3U)
            </label>
            <input
              id="playlist-url"
              type="url"
              value={url}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => {
                setUrl(event.target.value)
                setDirty(true)
                setResult(null)
                setResultUrl(null)
              }}
              placeholder="https://…/playlist.m3u"
              className="h-9 w-full rounded-md border border-line bg-ink-950 px-2.5 font-mono text-[11px] text-zinc-200 placeholder:text-muted/60 focus:border-line-strong focus:outline-none focus:ring-1 focus:ring-live/30"
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted/70">
                Link do bạn tự cung cấp — app không kèm playlist nào.
              </span>
              <span className="text-[10px] text-muted/70">Quyền truy cập công khai, CORS mở</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !url.trim()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-ink-850 px-2.5 text-[11px] text-zinc-200 transition-colors hover:border-line-strong disabled:opacity-50"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
              {testing ? 'Đang kiểm tra…' : 'Kiểm tra'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !checkedOk}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-live/40 bg-live/15 px-2.5 text-[11px] font-medium text-live-text transition-colors hover:border-live/60 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden />
              )}
              Lưu link mới
            </button>
            <span className="text-[10px] text-muted/70">
              {checkedOk ? 'Link ổn — có thể lưu.' : 'Kiểm tra link này trước, lưu sau.'}
            </span>
          </div>

          {result ? (
            <div
              data-testid="check-result"
              className={cn(
                'rounded-md border px-3 py-2 text-[11px] leading-4',
                result.status === 'OK'
                  ? 'border-live/30 bg-live/5 text-live-text'
                  : 'border-warn/30 bg-warn/5 text-warn',
              )}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {result.status === 'OK' ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                )}
                {result.status === 'OK' ? 'OK' : REASON_LABEL[result.status]}
              </div>
              <div className="mt-0.5 text-zinc-400">{result.message}</div>
              {result.status === 'OK' && result.parsed ? (
                <div className="mt-1 text-zinc-400">
                  <span className="tabular-nums">{result.parsed.stats.usableCount}</span> nguồn dùng
                  được · <span className="tabular-nums">{result.parsed.stats.groupCount}</span> nhóm ·{' '}
                  <span className="tabular-nums">{result.parsed.stats.extinfCount}</span> mục
                  {result.parsed.playlistUpdatedAt ? (
                    <> · cập nhật {fmtDateTime(result.parsed.playlistUpdatedAt)}</>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            data-testid="vlc-install-block"
            className="rounded-md border border-line-soft bg-ink-850/60 px-3 py-2"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
              <MonitorPlay className="h-3.5 w-3.5 text-live-text/80" aria-hidden />
              Mở bằng VLC
            </div>
            <p className="mt-1 text-[10px] leading-4 text-muted">
              Nút “Mở VLC” gọi protocol <code className="font-mono text-zinc-400">m3uhub://</code> để
              mở app VLC trên máy — cần cài một lần cho mỗi máy/user Windows.
            </p>

            <a
              href={VLC_INSTALLER_URL}
              download
              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-live/40 bg-live/15 px-2.5 text-[11px] font-medium text-live-text transition-colors hover:border-live/60"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Tải bộ cài cho máy này
            </a>
            <p className="mt-1 text-[10px] leading-4 text-muted/80">
              Tải về → double-click → đồng ý, không cần quyền admin; chạy lại khi chuyển máy.
            </p>

            <p className="mt-2 text-[10px] leading-4 text-muted">
              Đang chạy từ bản clone của dự án? Có thể chạy trực tiếp:
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <code
                data-testid="vlc-register-command"
                className="min-w-0 flex-1 truncate rounded border border-line bg-ink-950 px-2 py-1 font-mono text-[10px] text-zinc-300"
                title={VLC_REGISTER_SCRIPT}
              >
                {VLC_REGISTER_SCRIPT}
              </code>
              <button
                type="button"
                onClick={handleCopyCommand}
                title="Sao chép đường dẫn register.cmd"
                aria-label="Sao chép đường dẫn register.cmd"
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-line bg-ink-850 px-1.5 text-[10px] text-zinc-300 transition-colors hover:border-line-strong hover:text-zinc-100"
              >
                {commandCopied ? (
                  <Check className="h-3 w-3 text-live-text" aria-hidden />
                ) : (
                  <Copy className="h-3 w-3" aria-hidden />
                )}
                {commandCopied ? 'Đã copy' : 'Copy'}
              </button>
            </div>

            <p className="mt-1 text-[10px] leading-4 text-muted/80">
              Cả hai cách chỉ đăng ký cho user hiện tại (HKCU), không cần quyền admin, không phụ
              thuộc đường dẫn cài dự án; gỡ bằng{' '}
              <code className="font-mono text-zinc-400">unregister.cmd</code> (bản clone) hoặc xoá
              key registry + thư mục <code className="font-mono text-zinc-400">%LOCALAPPDATA%\m3u-hub</code>.
            </p>
          </div>

          <div className="border-t border-line-soft pt-3">
            <button
              type="button"
              onClick={() => {
                if (onUseCache()) onClose()
              }}
              disabled={!hasCache}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-line bg-ink-850 px-2.5 text-[11px] text-zinc-200 transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Database className="h-3.5 w-3.5" aria-hidden />
              Dùng dữ liệu đã lưu
            </button>
            <p className="mt-1.5 text-center text-[10px] leading-4 text-muted">
              {hasCache && cacheFetchedAt ? (
                <>
                  <Clock className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
                  Bản lưu lúc {fmtDateTime(new Date(cacheFetchedAt))} · {fmtAge(cacheFetchedAt)}
                </>
              ) : (
                'Chưa có dữ liệu lưu — cần một link hoạt động cho lần tải đầu.'
              )}
            </p>
          </div>
        </div>

        <div className="border-t border-line bg-ink-950/50 px-4 py-2">
          <p className="text-[10px] leading-4 text-muted/80">
            Playlist đổi nội dung hàng ngày và link có thể chết. App không tự ý dùng dữ liệu cũ khi
            link lỗi — bạn chọn rõ ràng ở trên.
          </p>
        </div>
      </div>
    </div>
  )
}