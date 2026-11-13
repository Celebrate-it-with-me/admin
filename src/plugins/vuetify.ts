/**
 * plugins/vuetify.ts
 *
 * Quinvite theme: the same palette as the organizers' app (cwm_app/src/style.css).
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import '@/styles/brand.css'

// Composable
import { createVuetify } from 'vuetify'
import { es } from 'vuetify/locale'

export default createVuetify({
  locale: { locale: 'es', fallback: 'es', messages: { es } },
  theme: {
    defaultTheme: 'quinvite',
    themes: {
      quinvite: {
        dark: false,
        colors: {
          background: '#fbf7f2',
          surface: '#ffffff',
          'surface-variant': '#f5eee6',
          'on-surface-variant': '#4a413c',
          primary: '#b04a62',
          'on-primary': '#ffffff',
          secondary: '#7a5c1e',
          accent: '#c9a24e',
          error: '#b3362e',
          warning: '#b7791f',
          info: '#3c6e9e',
          success: '#3e7d5a',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg', elevation: 0 },
    VCard: { rounded: 'xl', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VTextarea: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VAppBar: { flat: true, color: 'surface', border: 'b' },
    VDataTable: { hover: true },
    VAlert: { rounded: 'lg' },
  },
})
