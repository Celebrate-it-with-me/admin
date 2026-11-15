<script setup lang="ts">
import type { ThirdPartyMark } from '../types'

/** Warning about trademarks of other companies declared in the package (spec §6c). Shown in the report, the detail and the activation. */
defineProps<{ marks: ThirdPartyMark[]; note?: string | null }>()
</script>

<template>
  <v-alert type="warning" variant="tonal" density="comfortable" icon="mdi-shield-alert-outline" class="marks" data-testid="marks-banner">
    <strong>Este paquete usa marcas de terceros.</strong>
    Quinvite no ofrece plantillas con marcas ajenas: solo se acepta en un paquete privado y con permiso de uso por escrito archivado.
    <div v-if="marks.length" class="table-wrap">
      <table class="marks-table">
        <caption class="visually-hidden">Marcas de terceros declaradas</caption>
        <thead><tr><th scope="col">Marca</th><th scope="col">Titular</th><th scope="col">Uso</th></tr></thead>
        <tbody>
          <tr v-for="m in marks" :key="m.name"><th scope="row">{{ m.name }}</th><td>{{ m.owner }}</td><td>{{ m.usage }}</td></tr>
        </tbody>
      </table>
    </div>
    <p v-else-if="note" class="mt-2 mb-0">{{ note }}</p>
  </v-alert>
</template>

<style scoped>
.table-wrap { margin-top: 10px; overflow-x: auto; }
.marks-table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
.marks-table th, .marks-table td { text-align: left; vertical-align: top; padding: 6px 12px 6px 0; overflow-wrap: anywhere; }
.marks-table thead th { font-weight: 600; border-bottom: 1px solid rgba(0, 0, 0, 0.2); }
.marks-table tbody th { font-weight: 600; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
