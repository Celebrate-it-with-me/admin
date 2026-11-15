<script setup lang="ts">
import { computed } from 'vue'
import { CHECKLIST, checklistDone, checklistProgress, formatDateTime, type ChecklistState } from '../logic'

/** The quality review the team does with the preview before activating. Each tick records who and when. */
const props = defineProps<{ modelValue: ChecklistState; reviewer: string; readonly?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [ChecklistState] }>()

const done = computed(() => checklistDone(props.modelValue))
const progress = computed(() => checklistProgress(props.modelValue))

const toggle = (id: string, on: boolean | null) => {
  const next = { ...props.modelValue }
  if (on) next[id] = { by: props.reviewer, at: new Date().toISOString() }
  else delete next[id]
  emit('update:modelValue', next)
}
</script>

<template>
  <section aria-labelledby="qc-title" class="qc">
    <div class="head">
      <h3 id="qc-title" class="h">Lista de comprobación de calidad</h3>
      <v-chip size="small" variant="tonal" :color="done ? 'success' : undefined">{{ progress }} de {{ CHECKLIST.length }}</v-chip>
    </div>
    <p class="text-medium-emphasis small">Revisa el paquete en la vista previa, en móvil y escritorio, y marca cada punto. Queda anotado quién lo marcó y cuándo.</p>
    <ul class="list">
      <li v-for="item in CHECKLIST" :key="item.id" :data-item="item.id">
        <v-checkbox
          :model-value="Boolean(modelValue[item.id])" :disabled="readonly" hide-details density="compact" color="primary"
          @update:model-value="toggle(item.id, $event)"
        >
          <template #label>
            <span class="lbl"><strong>{{ item.label }}</strong><span class="hint">{{ item.hint }}</span></span>
          </template>
        </v-checkbox>
        <p v-if="modelValue[item.id]" class="who">Revisado por {{ modelValue[item.id].by }} · {{ formatDateTime(modelValue[item.id].at) }}</p>
      </li>
    </ul>
    <v-alert v-if="!done" type="info" variant="tonal" density="compact" class="mt-3">Faltan puntos por revisar. No se puede activar hasta completar la lista.</v-alert>
    <v-alert v-else type="success" variant="tonal" density="compact" class="mt-3">Lista completa: el paquete puede activarse.</v-alert>
  </section>
</template>

<style scoped>
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.h { font-size: 1.15rem; margin: 0; }
.small { font-size: 0.9rem; margin: 4px 0 8px; }
.list { list-style: none; margin: 0; padding: 0; }
.list li { padding: 4px 0; border-bottom: 1px solid var(--line); }
.lbl { display: flex; flex-direction: column; gap: 2px; white-space: normal; padding: 4px 0; }
.hint { color: var(--ink-500); font-size: 0.88rem; font-weight: 400; }
.who { margin: 0 0 6px 40px; font-size: 0.82rem; color: var(--ink-500); }
</style>
