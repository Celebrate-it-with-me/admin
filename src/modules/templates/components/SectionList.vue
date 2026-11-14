<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { isRequired, moveItem, rowErrorCount, sectionLabel } from '../logic'
import type { EditorSection, FieldErrors } from '../types'

/**
 * Ordered list of sections. Reordering works three ways: dragging the handle (mouse, native drag and drop, no library),
 * the up/down buttons (keyboard and touch) and nothing else is needed: the buttons are the accessible alternative.
 */
const props = defineProps<{ errors: FieldErrors; readonly: boolean }>()
const sections = defineModel<EditorSection[]>({ required: true })

const open = ref<Set<string>>(new Set())
const live = ref('')
const armed = ref(false)
const dragFrom = ref<number | null>(null)
const dragOver = ref<number | null>(null)
const rowsEl = ref<HTMLElement | null>(null)

const isOpen = (key: string) => open.value.has(key)
const toggle = (key: string) => {
  const next = new Set(open.value)
  if (next.has(key)) next.delete(key); else next.add(key)
  open.value = next
}
// A section with a server error opens by itself so the message is seen next to the field.
const forceOpen = (i: number, key: string) => rowErrorCount(props.errors, i) > 0 || isOpen(key)

const err = (i: number, field: 'title' | 'text', lang: 'es' | 'en') => props.errors[`sections.${i}.${field}.${lang}`] ?? ''

const move = async (from: number, to: number, button: 'up' | 'down') => {
  if (props.readonly || to < 0 || to >= sections.value.length) return
  const label = sectionLabel(sections.value[from].type)
  const key = sections.value[from].key
  sections.value = moveItem(sections.value, from, to)
  live.value = `${label} movida a la posición ${to + 1} de ${sections.value.length}.`
  await nextTick()
  // Keep the focus on the same button of the same row (at the ends, that button is disabled: go to the other).
  const row = rowsEl.value?.querySelector<HTMLElement>(`[data-key="${key}"]`)
  const wanted = row?.querySelector<HTMLButtonElement>(`[data-move="${button}"]:not([disabled])`) ?? row?.querySelector<HTMLButtonElement>('[data-move]:not([disabled])')
  wanted?.focus()
}

const onDragStart = (e: DragEvent, i: number) => {
  if (!armed.value || props.readonly) { e.preventDefault(); return }
  dragFrom.value = i
  e.dataTransfer?.setData('text/plain', String(i))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
const onDragOver = (e: DragEvent, i: number) => {
  if (dragFrom.value == null) return
  e.preventDefault()
  dragOver.value = i
}
const onDrop = (e: DragEvent, i: number) => {
  if (dragFrom.value == null) return
  e.preventDefault()
  const from = dragFrom.value
  if (from !== i) {
    const label = sectionLabel(sections.value[from].type)
    sections.value = moveItem(sections.value, from, i)
    live.value = `${label} movida a la posición ${i + 1} de ${sections.value.length}.`
  }
  onDragEnd()
}
const onDragEnd = () => { dragFrom.value = null; dragOver.value = null; armed.value = false }
</script>

<template>
  <div>
    <p class="visually-hidden" aria-live="polite">{{ live }}</p>
    <ol ref="rowsEl" class="rows" aria-label="Secciones de la invitación, en orden">
      <li
        v-for="(s, i) in sections"
        :key="s.key"
        :data-key="s.key"
        class="row"
        :class="{ off: !s.enabled, over: dragOver === i && dragFrom !== i, dragging: dragFrom === i }"
        :draggable="armed && !readonly"
        @dragstart="onDragStart($event, i)"
        @dragover="onDragOver($event, i)"
        @drop="onDrop($event, i)"
        @dragend="onDragEnd"
      >
        <div class="head">
          <span
            v-if="!readonly"
            class="handle"
            aria-hidden="true"
            title="Arrastra para ordenar"
            @pointerdown="armed = true"
            @pointerup="armed = false"
          ><v-icon icon="mdi-drag" /></span>

          <div class="arrows">
            <v-btn
              icon="mdi-chevron-up" size="small" variant="text" density="comfortable" data-move="up"
              :disabled="readonly || i === 0" :aria-label="`Subir ${sectionLabel(s.type)}`" @click="move(i, i - 1, 'up')"
            />
            <v-btn
              icon="mdi-chevron-down" size="small" variant="text" density="comfortable" data-move="down"
              :disabled="readonly || i === sections.length - 1" :aria-label="`Bajar ${sectionLabel(s.type)}`" @click="move(i, i + 1, 'down')"
            />
          </div>

          <button type="button" class="title" :aria-expanded="forceOpen(i, s.key)" :aria-controls="`sec-${s.key}`" @click="toggle(s.key)">
            <span class="pos">{{ i + 1 }}</span>
            <span class="name">{{ sectionLabel(s.type) }}</span>
            <v-chip v-if="rowErrorCount(errors, i)" size="x-small" color="error" variant="tonal" class="ml-2">
              {{ rowErrorCount(errors, i) === 1 ? '1 error' : `${rowErrorCount(errors, i)} errores` }}
            </v-chip>
            <v-icon :icon="forceOpen(i, s.key) ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="small" class="ml-auto" />
          </button>

          <v-tooltip v-if="isRequired(s.type)" text="Esta sección es obligatoria" location="top">
            <template #activator="{ props: tip }">
              <span v-bind="tip" class="lock" tabindex="0" role="group" :aria-label="`${sectionLabel(s.type)}: esta sección es obligatoria`">
                <v-switch :model-value="true" disabled hide-details density="compact" color="primary" :aria-label="`${sectionLabel(s.type)} activa (obligatoria)`" />
              </span>
            </template>
          </v-tooltip>
          <v-switch
            v-else v-model="s.enabled" hide-details density="compact" color="primary" :disabled="readonly" class="sw"
            :aria-label="`${sectionLabel(s.type)}: ${s.enabled ? 'activa' : 'desactivada'}`"
          />
        </div>

        <div v-show="forceOpen(i, s.key)" :id="`sec-${s.key}`" class="body">
          <div class="langs">
            <div v-for="lang in (['es', 'en'] as const)" :key="lang" class="lang">
              <v-text-field
                v-model="s.title[lang]" :label="`Título (${lang === 'es' ? 'español' : 'inglés'})`" density="comfortable" :readonly="readonly"
                counter="1000" maxlength="1200" :error-messages="err(i, 'title', lang)" autocomplete="off"
              />
              <v-textarea
                v-model="s.text[lang]" :label="`Texto (${lang === 'es' ? 'español' : 'inglés'})`" density="comfortable" rows="2" auto-grow :readonly="readonly"
                counter="1000" maxlength="1200" :error-messages="err(i, 'text', lang)"
              />
            </div>
          </div>
          <p v-if="errors[`sections.${i}.enabled`]" class="text-error text-caption">{{ errors[`sections.${i}.enabled`] }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.row { border: 1px solid var(--line); border-radius: 12px; background: #fff; transition: opacity 0.15s ease-out, border-color 0.15s ease-out; }
.row.off { opacity: 0.7; }
.row.dragging { opacity: 0.45; }
.row.over { border-color: var(--rose-600); box-shadow: 0 -2px 0 var(--rose-600); }
.head { display: flex; align-items: center; gap: 2px; padding: 4px 8px 4px 4px; min-height: 52px; }
.handle { display: none; cursor: grab; padding: 8px 4px; touch-action: none; color: var(--ink-500); }
.arrows { display: flex; }
.title {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 8px; text-align: left;
  background: none; border: 0; border-radius: 8px; cursor: pointer; font: inherit; color: inherit;
}
.title:focus-visible { outline: 2px solid var(--rose-600); outline-offset: 2px; }
.pos { color: var(--ink-500); font-size: 0.8rem; min-width: 1.2em; }
.name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lock { display: inline-flex; border-radius: 8px; }
.lock:focus-visible { outline: 2px solid var(--rose-600); outline-offset: 2px; }
.body { padding: 4px 16px 12px; border-top: 1px solid var(--line); }
.langs { display: grid; gap: 4px 16px; padding-top: 12px; }
@media (min-width: 1280px) { .langs { grid-template-columns: 1fr 1fr; } }
@media (hover: hover) and (pointer: fine) { .handle { display: inline-flex; } }
</style>
