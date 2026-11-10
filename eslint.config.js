import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      // New in eslint-plugin-vue 10 / typescript-eslint 8; keep them non-blocking
      // (typescript-eslint rules were warnings with the previous config).
      'vue/block-lang': 'off',
      // Vuetify slots use modifiers, e.g. v-slot:item.name
      'vue/valid-v-slot': ['error', { allowModifiers: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
)
