<script setup lang="ts">
import { ref } from 'vue'
import { recoveryCodesText } from '../logic'

/** The recovery codes, shown once: copy, download, and a reminder that each works a single time. */
const props = defineProps<{ codes: string[]; email?: string }>()

const copied = ref(false)
const announce = ref('')

const copy = async () => {
  try {
    await navigator.clipboard.writeText(recoveryCodesText(props.codes, props.email))
    copied.value = true
    announce.value = 'Códigos copiados.'
    setTimeout(() => { copied.value = false }, 2500)
  } catch {
    announce.value = 'No pudimos copiar. Selecciona los códigos y cópialos a mano, o descárgalos.'
  }
}

const download = () => {
  const blob = new Blob([recoveryCodesText(props.codes, props.email)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'quinvite-codigos-de-recuperacion.txt'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  announce.value = 'Archivo descargado.'
}
</script>

<template>
  <div>
    <ul class="codes" aria-label="Códigos de recuperación">
      <li v-for="code in codes" :key="code"><code>{{ code }}</code></li>
    </ul>
    <div class="actions">
      <v-btn variant="tonal" class="touch" :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'" @click="copy">{{ copied ? 'Copiados' : 'Copiar' }}</v-btn>
      <v-btn variant="tonal" class="touch" prepend-icon="mdi-download-outline" @click="download">Descargar</v-btn>
    </div>
    <p class="sr-only" aria-live="polite">{{ announce }}</p>
    <p v-if="announce && !copied && announce.startsWith('No pudimos')" class="text-caption text-error mt-2">{{ announce }}</p>
  </div>
</template>

<style scoped>
.codes { list-style: none; padding: 0; margin: 0 0 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.codes li { background: var(--cream-200); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; text-align: center; }
.codes code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9375rem; letter-spacing: 0.02em; white-space: nowrap; user-select: all; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.touch { min-height: 44px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
