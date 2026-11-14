<script setup lang="ts">
import { computed } from 'vue'
import { COLOR_FIELDS, FONTS_SCRIPT, FONTS_TEXT, colorErrors } from '../logic'
import type { FieldErrors, Theme, ThemeColors } from '../types'

const props = defineProps<{ errors: FieldErrors; readonly: boolean }>()
const theme = defineModel<Theme>({ required: true })

const presetIds = computed(() => Object.keys(theme.value.presets))
const current = computed(() => theme.value.presets[theme.value.preset])
const local = computed(() => (current.value ? colorErrors(current.value.colors) : {}))

const swatches = (id: string) => {
  const c = theme.value.presets[id].colors
  return [c.surface, c.accent, c.primary, c.ink]
}
const colorError = (key: keyof ThemeColors) =>
  local.value[key] ?? props.errors[`theme.presets.${theme.value.preset}.colors.${key}`] ?? ''
const presetHasError = (id: string) => Object.keys(props.errors).some(k => k.startsWith(`theme.presets.${id}.`))
const validHex = (value: string) => (value && !colorErrors({ surface: value } as ThemeColors).surface ? value : 'transparent')
</script>

<template>
  <div class="theme">
    <fieldset class="group">
      <legend>Paleta de colores</legend>
      <v-radio-group v-model="theme.preset" hide-details :readonly="readonly" :disabled="readonly" aria-label="Paleta de colores">
        <v-radio v-for="id in presetIds" :key="id" :value="id" class="preset">
          <template #label>
            <span class="swatches" aria-hidden="true"><i v-for="(c, n) in swatches(id)" :key="n" :style="{ background: validHex(c) }" /></span>
            <span class="plabel">{{ theme.presets[id].label.es }}</span>
            <v-chip v-if="presetHasError(id)" size="x-small" color="error" variant="tonal" class="ml-2">Con errores</v-chip>
          </template>
        </v-radio>
      </v-radio-group>
    </fieldset>

    <fieldset v-if="current" class="group">
      <legend>Colores de «{{ current.label.es }}»</legend>
      <div class="colors">
        <v-text-field
          v-for="f in COLOR_FIELDS" :key="f.key" v-model="current.colors[f.key]" :label="f.label" density="comfortable" maxlength="9"
          autocomplete="off" spellcheck="false" :readonly="readonly" :error-messages="colorError(f.key)"
        >
          <template #prepend-inner>
            <span class="chip" :style="{ background: validHex(current.colors[f.key]) }" aria-hidden="true" />
          </template>
        </v-text-field>
      </div>
    </fieldset>

    <fieldset class="group">
      <legend>Tipografías</legend>
      <div class="fonts">
        <v-select v-model="theme.fonts.heading" :items="FONTS_TEXT" label="Títulos" density="comfortable" :readonly="readonly" :error-messages="errors['theme.fonts.heading']" />
        <v-select v-model="theme.fonts.body" :items="FONTS_TEXT" label="Cuerpo" density="comfortable" :readonly="readonly" :error-messages="errors['theme.fonts.body']" />
        <v-select v-model="theme.fonts.script" :items="FONTS_SCRIPT" label="Manuscrita" density="comfortable" :readonly="readonly" :error-messages="errors['theme.fonts.script']" />
      </div>
      <p class="text-caption text-medium-emphasis mb-0">Solo las tipografías de la lista: cualquier otra se rechaza.</p>
    </fieldset>
  </div>
</template>

<style scoped>
.group { border: 0; padding: 0; margin: 0 0 20px; min-width: 0; }
legend { font-weight: 600; margin-bottom: 8px; padding: 0; }
.preset :deep(.v-label) { opacity: 1; display: flex; align-items: center; gap: 10px; }
.swatches { display: inline-flex; }
.swatches i { width: 18px; height: 18px; border-radius: 50%; border: 1px solid rgba(43, 36, 32, 0.25); margin-left: -4px; }
.swatches i:first-child { margin-left: 0; }
.colors, .fonts { display: grid; gap: 4px 16px; }
@media (min-width: 640px) { .colors { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1280px) { .fonts { grid-template-columns: 1fr 1fr 1fr; } }
.chip { width: 18px; height: 18px; border-radius: 50%; border: 1px solid rgba(43, 36, 32, 0.3); margin-right: 6px; flex: none; }
</style>
