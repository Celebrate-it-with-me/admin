// Plugins
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// Utilities
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

// Build info: version from package.json, short commit (git, or GIT_COMMIT / SOURCE_VERSION when the build has no git), build time.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
const commit = (() => {
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* no git here */ }
  return (process.env.GIT_COMMIT || process.env.SOURCE_VERSION || 'unknown').slice(0, 7)
})()
const versionInfo = { name: 'cwm_admin', version: pkg.version, commit, builtAt: new Date().toISOString() }

/** Serves /version.json in dev and emits it in the build, so the Versiones page (and anyone) can read what is deployed. */
const versionFile = (): Plugin => ({
  name: 'cwm-version-json',
  configureServer(server) {
    server.middlewares.use('/version.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(versionInfo))
    })
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(versionInfo, null, 2) + '\n' })
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    versionFile(),
    vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    vuetify({
      autoImport: true,
    }),
  ],
  define: {
    'process.env': {},
    __APP_VERSION__: JSON.stringify(versionInfo.version),
    __APP_COMMIT__: JSON.stringify(versionInfo.commit),
    __APP_BUILT_AT__: JSON.stringify(versionInfo.builtAt),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
  },
  server: {
    host: true,
    // Vite 6+ blocks unknown Host headers; the dev domain is served via nginx-proxy
    allowedHosts: ['dev.admin.cwm.com'],
    port: 8080,
    strictPort: true,
    hmr: { overlay: false }
  },
  // Unit tests: `npm run test:unit` (see README). No network: axios is mocked in each test.
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // v8 instrumentation slows every test; with the default 5 s a loaded machine times out. Only widened when measuring coverage.
    ...(process.argv.includes('--coverage') ? { testTimeout: 30000, hookTimeout: 30000 } : {}),
    restoreMocks: true,
    // Vuetify ships ESM that imports CSS; let Vite process it.
    server: { deps: { inline: ['vuetify'] } },
    coverage: {
      // `npm run test:coverage`. Report-only by default; COVERAGE_ENFORCE=1 makes thresholds fail the run.
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage', // git-ignored
      reportOnFailure: true, // still write the report if a test fails
      // Count every source file, even those no test imports, so the baseline is honest.
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.{test,spec}.ts', // the tests themselves
        'src/test/**', // test helpers (setup.ts, mount.ts)
        'src/**/__mocks__/**', // manual mocks
        'src/**/*.d.ts', // type declarations, no runtime code
        'src/main.ts', // app entry: bootstraps Vue, nothing to unit-test
        'src/plugins/**', // Vuetify/plugin registration (config only)
        'src/assets/**', // static files (images, svg)
        'src/styles/**', // CSS
      ],
      // Target 95 (owner policy). Override with COVERAGE_THRESHOLD; enforced only with COVERAGE_ENFORCE=1.
      ...(process.env.COVERAGE_ENFORCE === '1'
        ? (() => {
            const t = Number(process.env.COVERAGE_THRESHOLD ?? 95)
            return { thresholds: { lines: t, branches: t, functions: t, statements: t } }
          })()
        : {}),
    },
  },
})
