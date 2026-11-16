<script setup lang="ts">
import type { AssetCredit } from '../types'
import { safeExternalUrl } from '../logic'

/** Credit and license of every file in assets/ (spec §1.1 `assetsCredits`). */
defineProps<{ credits: AssetCredit[] }>()
</script>

<template>
  <p v-if="credits.length === 0" class="text-medium-emphasis">El paquete no trae assets.</p>
  <div v-else class="scroll">
    <table class="tbl" data-testid="credits">
      <caption class="visually-hidden">Créditos de los assets</caption>
      <thead><tr><th scope="col">Archivo</th><th scope="col">Título</th><th scope="col">Autor</th><th scope="col">Licencia</th><th scope="col">Origen</th></tr></thead>
      <tbody>
        <tr v-for="c in credits" :key="c.path">
          <th scope="row"><code>{{ c.path }}</code></th><td data-label="Título">{{ c.title }}</td><td data-label="Autor">{{ c.author }}</td><td data-label="Licencia">{{ c.license }}</td>
          <td data-label="Origen"><a v-if="safeExternalUrl(c.url)" :href="safeExternalUrl(c.url) ?? undefined" target="_blank" rel="noopener noreferrer">{{ c.source }}</a><template v-else>{{ c.source }}</template></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.scroll { overflow-x: auto; }
.tbl { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
.tbl th, .tbl td { text-align: left; vertical-align: top; padding: 6px 12px 6px 0; border-bottom: 1px solid var(--line); }
.tbl thead th { font-weight: 600; white-space: nowrap; }
.tbl tbody th { font-weight: 400; }
.tbl code { white-space: nowrap; }
.tbl td { min-width: 90px; }
.tbl a { color: var(--rose-700); }
/* Phones: each credit is a stacked card (file on top, then label: value) so nothing needs horizontal scrolling. */
@media (max-width: 700px) {
  .scroll { overflow-x: visible; }
  .tbl thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .tbl, .tbl tbody, .tbl tr, .tbl th, .tbl td { display: block; width: 100%; }
  .tbl tr { padding: 10px 0; border-bottom: 1px solid var(--line); }
  .tbl th, .tbl td { border-bottom: 0; padding: 2px 0; }
  .tbl tbody th { margin-bottom: 4px; }
  .tbl code { white-space: normal; overflow-wrap: anywhere; }
  .tbl td { min-width: 0; display: grid; grid-template-columns: 6.5rem 1fr; gap: 8px; overflow-wrap: anywhere; }
  .tbl td::before { content: attr(data-label); font-weight: 600; }
}
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
