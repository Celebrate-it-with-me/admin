// Plugins
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import ViteFonts from 'unplugin-fonts/vite'

// Utilities
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    vuetify({
      autoImport: true,
    }),
    ViteFonts({
      google: {
        families: [
          { name: 'Figtree', styles: 'wght@300..900' },
          { name: 'Fraunces', styles: 'opsz,wght@9..144,300..700' },
        ],
      },
    }),
  ],
  define: { 'process.env': {} },
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
