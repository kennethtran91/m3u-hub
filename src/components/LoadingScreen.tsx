import { AlertTriangle, Loader2 } from 'lucide-react'

export function LoadingScreen({ url }: { url: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-live/25 bg-live-dim text-live-text">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        </div>
        <h1 className="mt-4 text-sm font-medium text-zinc-200">Đang tải playlist…</h1>
        <p className="mt-1 text-xs text-muted">
          Đang kiểm tra link và bóc tách danh sách trận.
        </p>
        <p className="mt-4 break-all rounded-md border border-line bg-ink-900 px-3 py-2 font-mono text-[11px] text-muted">
          {url}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          Có thể mất tới 20 giây nếu link chậm.
        </p>
      </div>
    </div>
  )
}