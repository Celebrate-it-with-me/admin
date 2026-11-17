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
    restoreMocks: true,
    // Vuetify ships ESM that imports CSS; let Vite process it.
    server: { deps: { inline: ['vuetify'] } },
  },
})
