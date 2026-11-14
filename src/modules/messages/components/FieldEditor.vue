<script setup lang="ts">
import { computed, ref } from 'vue'
import { extractVariables, fieldHint, fieldLabel, fieldMessage, isShortField } from '../logic'
import type { FieldDetail, Locale } from '../types'

/**
 * One text of a message: the box with its counter, the chips of the variables that must stay (not editable, red when the
 * text lost one), the error under it and "Restaurar original". The text is plain: the preview is rendered by the API.
 */
const props = defineProps<{
  name: string
  field: FieldDetail
  modelValue: string
  locale: Locale
  /** Error code to show (local rules, the server's 422 or the preview's). */
  code?: string
  disabled?: boolean
  /** Read access only: the text stays readable (not greyed out) but cannot change. */
  readonly?: boolean
  canRestore?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [string]; restore: []; revert: [] }>()

const label = computed(() => fieldLabel(props.name))
const dirty = computed(() => props.modelValue !== props.field.current)
const present = computed(() => new Set(extractVariables(props.modelValue)))
const message = computed(() => (props.code ? fieldMessage(props.code, { text: props.modelValue, field: props.field }) : ''))
const showOriginal = ref(false)
const id = computed(() => `msg-field-${props.name}`)
const hint = computed(() => fieldHint(props.name))
</script>

<template>
  <section class="field" :data-field="name" :class="{ 'is-dirty': dirty }">
    <div class="field__head">
      <label :for="id" class="field__label">{{ label }}</label>
      <v-chip v-if="field.overridden" size="x-small" color="primary" variant="tonal" prepend-icon="mdi-pencil-outline" data-edited>Editado</v-chip>
      <v-chip v-if="dirty" size="x-small" color="warning" variant="tonal" prepend-icon="mdi-circle-edit-outline" data-unsaved>Sin guardar</v-chip>
    </div>

    <v-textarea
      v-if="!isShortField(name)"
      :id="id" :model-value="modelValue" :rows="3" auto-grow :counter="field.maxLength" :disabled="disabled" :readonly="readonly" :lang="locale"
      :error-messages="message" :aria-invalid="!!message" :hint="hint" variant="outlined" density="comfortable"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <v-text-field
      v-else
      :id="id" :model-value="modelValue" :counter="field.maxLength" :disabled="disabled" :readonly="readonly" :lang="locale" autocomplete="off"
      :error-messages="message" :aria-invalid="!!message" :hint="hint" variant="outlined" density="comfortable"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <ul v-if="field.variables.length" class="vars" :aria-label="`Datos que debe conservar ${label}`">
      <li v-for="v in field.variables" :key="v">
        <v-chip
          size="small" label :color="present.has(v) ? undefined : 'error'" :variant="present.has(v) ? 'outlined' : 'flat'"
          :prepend-icon="present.has(v) ? 'mdi-check' : 'mdi-alert-circle-outline'" :data-var="v" :data-missing="!present.has(v) || undefined"
          :aria-label="present.has(v) ? `:${v}, incluido` : `:${v}, falta en el texto`"
        >:{{ v }}</v-chip>
      </li>
      <li class="vars__note">Se rellenan solos al enviar el correo; deben quedar en el texto.</li>
    </ul>

    <div class="field__actions">
      <v-btn v-if="dirty && !readonly" variant="text" size="small" prepend-icon="mdi-undo" class="touch" data-revert @click="emit('revert')">Deshacer cambios</v-btn>
      <v-btn v-if="field.overridden && canRestore" variant="text" size="small" prepend-icon="mdi-restore" class="touch" data-restore @click="emit('restore')">Restaurar original</v-btn>
      <v-btn v-if="field.overridden" variant="text" size="small" :prepend-icon="showOriginal ? 'mdi-chevron-up' : 'mdi-chevron-down'" class="touch" :aria-expanded="showOriginal" @click="showOriginal = !showOriginal">{{ showOriginal ? 'Ocultar el original' : 'Ver el original' }}</v-btn>
    </div>
    <p v-if="field.overridden && showOriginal" class="original" :lang="locale" data-original>{{ field.default }}</p>
  </section>
</template>

<style scoped>
.field { padding: 14px 0 6px; border-bottom: 1px solid rgb(var(--v-theme-on-surface), 0.1); }
.field__head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
.field__label { font-weight: 600; }
.field :deep(.v-input__details) { align-items: flex-start; }
.field :deep(.v-messages) { height: auto; min-height: 14px; overflow: visible; }
.field :deep(.v-messages__message) { line-height: 1.35; padding-bottom: 4px; }
.vars { list-style: none; padding: 0; margin: 0 0 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.vars__note { font-size: 0.75rem; color: var(--ink-500); flex-basis: 100%; }
.field__actions { display: flex; flex-wrap: wrap; gap: 4px 8px; }
.touch { min-height: 44px; }
.original { margin: 4px 0 10px; padding: 10px 12px; border-radius: 8px; background: rgb(var(--v-theme-on-surface), 0.05); font-size: 0.875rem; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
