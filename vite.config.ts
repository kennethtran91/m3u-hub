import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages project site: the deployed app lives at
 * https://kennethtran91.github.io/m3u-hub/ , so every built asset URL must be
 * prefixed with `/m3u-hub/`. Dev server + unit tests stay at the root so
 * `http://localhost:5173/` and `import.meta.env.BASE_URL === '/'` keep working.
 *
 * Override without editing this file: `BASE_PATH=/some-repo/ npm run build`.
 */
const DEFAULT_BASE_PATH = '/m3u-hub/'

/** Always a leading and exactly one trailing slash, so `${BASE_URL}x` never doubles up. */
function normalizeBase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return '/'
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}/`
}

export default defineConfig(({ command, mode }) => {
  // `command` is 'build' for `vite build` but 'serve' for BOTH `vite dev` and
  // `vite preview`; `mode` tells them apart ('development' vs 'production',
  // 'test' under vitest). Keying off `mode` keeps `vite preview` serving the
  // production build under the same subpath it was built for.
  const isProductionBuild = command === 'build' || mode === 'production'
  const base = isProductionBuild ? normalizeBase(process.env.BASE_PATH ?? DEFAULT_BASE_PATH) : '/'

  return {
    base,
    plugins: [react()],
    server: { port: 5173, strictPort: false },
    build: { chunkSizeWarningLimit: 700 },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      reporters: 'default',
    },
  }
})