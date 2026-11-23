import { Loader2 } from 'lucide-react'

export function LoadingScreen({ url }: { url: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4">
      <div className="w-full max-w-sm text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-live" aria-hidden />
        <p className="mt-4 text-sm text-zinc-200">Đang tải playlist…</p>
        <p className="mt-3 break-all font-mono text-[11px] text-muted/80">{url}</p>
      </div>
    </div>
  )
}
