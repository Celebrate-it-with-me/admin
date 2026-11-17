<script setup lang="ts">
import { computed } from 'vue'
import type { VersionInfo } from '../types'
import { buildDate, envColor, envLabel, shortCommit, versionLabel } from '../logic'

const props = defineProps<{
  title: string
  subtitle: string
  icon: string
  loading: boolean
  failed: boolean
  info: VersionInfo | null
  showRuntime?: boolean
}>()
defineEmits<{ retry: [] }>()

const id = computed(() => `v-${props.title.toLowerCase()}`)
</script>

<template>
  <v-card class="vcard pa-4 pa-sm-5" :aria-busy="loading" :aria-labelledby="id">
    <header class="vcard__head">
      <v-icon :icon="icon" size="22" class="vcard__icon" aria-hidden="true" />
      <div class="vcard__titles">
        <h3 :id="id" class="vcard__title">{{ title }}</h3>
        <p class="vcard__sub">{{ subtitle }}</p>
      </div>
      <v-chip v-if="info?.environment" :color="envColor(info.environment)" variant="tonal" size="small" class="font-weight-bold" data-test="env">{{ envLabel(info.environment) }}</v-chip>
    </header>

    <div v-if="loading && !info" aria-hidden="true"><v-skeleton-loader type="heading, text, text" class="vcard__skeleton" /></div>

    <div v-else-if="failed && !info" class="vcard__down" data-test="down">
      <v-icon icon="mdi-cloud-off-outline" size="20" aria-hidden="true" />
      <span><strong>No disponible</strong><br><small>No pudimos leer la versión de este servicio.</small></span>
      <v-btn variant="text" class="touch" @click="$emit('retry')">Reintentar</v-btn>
    </div>

    <dl v-else-if="info" class="vcard__list" :class="{ 'is-loading': loading }">
      <div><dt>Versión</dt><dd class="vcard__version" data-test="version">{{ versionLabel(info.version) }}</dd></div>
      <div><dt>Commit</dt><dd class="mono" data-test="commit">{{ shortCommit(info.commit) }}</dd></div>
      <div><dt>Build</dt><dd data-test="built">{{ buildDate(info.builtAt) }}</dd></div>
      <template v-if="showRuntime">
        <div><dt>PHP</dt><dd data-test="php">{{ info.php ?? 'Desconocido' }}</dd></div>
        <div><dt>Laravel</dt><dd data-test="laravel">{{ info.laravel ?? 'Desconocido' }}</dd></div>
      </template>
    </dl>
  </v-card>
</template>

<style scoped>
.vcard__head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.vcard__icon { color: var(--rose-600); margin-top: 4px; }
.vcard__titles { flex: 1; min-width: 0; }
.vcard__title { font-family: var(--font-heading); font-size: 1.25rem; line-height: 1.3; margin: 0; }
.vcard__sub { font-size: 0.8125rem; color: var(--ink-500); margin: 2px 0 0; }
.vcard__skeleton { background: transparent; margin: 0 -16px; }
.vcard__list { margin: 0; }
.vcard__list > div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); }
.vcard__list > div:first-child { border-top: 0; padding-top: 0; }
.vcard__list dt { color: var(--ink-500); font-size: 0.875rem; }
.vcard__list dd { margin: 0; text-align: right; font-weight: 600; }
.vcard__version { font-size: 1.125rem; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.vcard__down { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; color: var(--ink-500); }
.vcard__down span { flex: 1; min-width: 160px; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.touch { min-height: 44px; }
</style>
