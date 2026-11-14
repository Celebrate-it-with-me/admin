import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'

// jsdom lacks these; Vuetify layout and overlays read them.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
globalThis.matchMedia ??= ((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
})) as unknown as typeof matchMedia

// VOverlay (dialogs, menus) positions itself against the visual viewport.
if (!('visualViewport' in globalThis)) {
  Object.defineProperty(globalThis, 'visualViewport', {
    value: { width: 1024, height: 768, offsetLeft: 0, offsetTop: 0, scale: 1, addEventListener() {}, removeEventListener() {} },
  })
}

// Plain Vuetify (components are auto-imported by vite-plugin-vuetify), Spanish like the real plugin.
export const vuetify = createVuetify({ locale: { locale: 'es', fallback: 'es' } })
config.global.plugins = [vuetify]
