<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import { useDisplay } from 'vuetify'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { useAudienceCount } from '../composables'
import { createAnnouncement, updateAnnouncement } from '../services/announcementsApi'
import {
  AUDIENCES, LEVELS, LIMITS, countLabel, emptyForm, fieldMessages, formFrom, hasErrors, parseError, previewFor, serverFieldErrors, tabsWithErrors, toBody, validate,
} from '../logic'
import type { Announcement, AnnouncementForm, FieldErrors, Lang } from '../types'
import BannerPreview from './BannerPreview.vue'

const props = defineProps<{ modelValue: boolean; announcement: Announcement | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [Announcement, 'created' | 'updated']; gone: [] }>()

const { smAndDown } = useDisplay()
const editing = computed(() => props.announcement !== null)
const form = ref<AnnouncementForm>(emptyForm())
const tab = ref<Lang>('es')
const previewLang = ref<Lang>('es')
const submitted = ref(false)
const serverErrors = ref<FieldErrors>({})
const formError = ref('')

const reasonOpen = ref(false)
const reasonError = ref('')
const saving = ref(false)

watch(() => props.modelValue, open => {
  if (!open) return
  form.value = props.announcement ? formFrom(props.announcement) : emptyForm()
  tab.value = 'es'
  previewLang.value = 'es'
  submitted.value = false
  serverErrors.value = {}
  formError.value = ''
  reasonError.value = ''
  reasonOpen.value = false
})

// ── errors: the live ones show once she tried to save (a text over its limit shows at once) ──
const live = computed(() => validate(form.value))
const errors = computed<FieldErrors>(() => {
  const shown: FieldErrors = {}
  for (const [field, code] of Object.entries(live.value)) if (submitted.value || code === 'too_long') (shown as Record<string, string>)[field] = code
  return { ...shown, ...serverErrors.value }
})
const messages = computed(() => fieldMessages(errors.value))
const err = (field: string) => messages.value[field] ?? ''
const tabErrors = computed(() => tabsWithErrors(errors.value))
const clearServer = () => { serverErrors.value = {}; formError.value = '' }

// ── audience count ──
const { count, state: countState, retry: retryCount } = useAudienceCount(
  toRef(() => form.value.audience), toRef(() => form.value.upcomingDays), toRef(() => props.modelValue),
)
const countText = computed(() => {
  if (form.value.audience === 'upcoming_event' && live.value.upcoming_days) return 'Indica los días (1 a 365) para ver cuántas organizadoras lo verían.'
  if (countState.value === 'loading') return 'Contando…'
  if (countState.value === 'error') return 'No pudimos calcular cuántas lo verían.'
  if (count.value === null) return ''
  return `Hoy lo verían ${countLabel(count.value)}.`
})

// ── preview ──
const banner = computed(() => previewFor(form.value, previewLang.value))
const bannerOpen = computed(() => form.value.isActive)

// ── save ──
const firstErrorTab = (e: FieldErrors): Lang | null => (tabsWithErrors(e).es ? 'es' : tabsWithErrors(e).en ? 'en' : null)

const submit = async () => {
  submitted.value = true
  clearServer()
  const e = validate(form.value)
  if (hasErrors(e)) {
    const t = firstErrorTab(e)
    if (t) tab.value = t
    await nextTick()
    document.querySelector<HTMLElement>('.announcement-form [aria-invalid="true"]')?.focus()
    return
  }
  reasonError.value = ''
  reasonOpen.value = true
}

const confirm = async (reason: string) => {
  saving.value = true
  reasonError.value = ''
  try {
    const body = toBody(form.value)
    const saved = props.announcement ? await updateAnnouncement(props.announcement.id, body, reason) : await createAnnouncement(body, reason)
    reasonOpen.value = false
    emit('saved', saved, props.announcement ? 'updated' : 'created')
    emit('update:modelValue', false)
  } catch (e) {
    const parsed = parseError(e)
    if (parsed.code === 'announcement_not_found') {
      reasonOpen.value = false
      emit('gone')
      emit('update:modelValue', false)
      return
    }
    const fields = serverFieldErrors(e)
    const { reason: reasonCode, ...own } = fields
    if (Object.keys(own).length) {
      serverErrors.value = own
      submitted.value = true
      const t = firstErrorTab(own)
      if (t) tab.value = t
      formError.value = 'Revisa los campos marcados.'
      reasonOpen.value = false
    } else {
      reasonError.value = reasonCode ? parseError({ response: { status: 422, data: { errors: { reason: [reasonCode] } } } }).message : parsed.message
    }
  } finally { saving.value = false }
}

const close = () => { if (!saving.value) emit('update:modelValue', false) }

const levelHint = computed(() => LEVELS.find(l => l.value === form.value.level)?.hint ?? '')
const reasonTitle = computed(() => (editing.value ? 'Guardar los cambios' : 'Crear el anuncio'))
const reasonMessage = computed(() => (form.value.isActive
  ? 'Las organizadoras de la audiencia lo verán en cuanto empiece su fecha.'
  : 'Se guarda apagado: nadie lo verá hasta que lo actives.'))
</script>

<template>
  <v-dialog :model-value="modelValue" :fullscreen="smAndDown" max-width="1120" scrollable persistent @update:model-value="close" @keydown.esc="close">
    <v-card class="announcement-form" :aria-label="editing ? 'Editar anuncio' : 'Nuevo anuncio'">
      <v-card-title class="dlg-title">
        <span>{{ editing ? 'Editar anuncio' : 'Nuevo anuncio' }}</span>
        <v-btn icon="mdi-close" variant="text" aria-label="Cerrar" :disabled="saving" @click="close" />
      </v-card-title>

      <v-card-text class="dlg-body">
        <div class="layout">
          <form class="fields" novalidate @submit.prevent="submit">
            <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mb-4" :text="formError" />

            <v-tabs v-model="tab" density="comfortable" color="primary" class="mb-4">
              <v-tab value="es" data-tab="es">Español<v-icon v-if="tabErrors.es" icon="mdi-alert-circle" color="error" size="16" class="ml-2" aria-label="Tiene errores" /></v-tab>
              <v-tab value="en" data-tab="en">English<v-icon v-if="tabErrors.en" icon="mdi-alert-circle" color="error" size="16" class="ml-2" aria-label="Tiene errores" /></v-tab>
            </v-tabs>

            <div v-show="tab === 'es'" class="pane" data-pane="es">
              <v-text-field v-model="form.titleEs" label="Título (español)" :counter="LIMITS.title" :error-messages="err('title_es')" :aria-invalid="!!err('title_es')" autocomplete="off" @update:model-value="clearServer" />
              <v-textarea v-model="form.bodyEs" label="Texto (español)" rows="4" auto-grow :counter="LIMITS.body" :error-messages="err('body_es')" :aria-invalid="!!err('body_es')" hint="Texto plano. Los saltos de línea se respetan; no se interpreta HTML." @update:model-value="clearServer" />
              <v-text-field v-model="form.ctaLabelEs" label="Etiqueta del botón (español)" :counter="LIMITS.cta" :error-messages="err('cta_label_es')" :aria-invalid="!!err('cta_label_es')" autocomplete="off" @update:model-value="clearServer" />
            </div>
            <div v-show="tab === 'en'" class="pane" data-pane="en">
              <v-text-field v-model="form.titleEn" label="Título (inglés)" :counter="LIMITS.title" :error-messages="err('title_en')" :aria-invalid="!!err('title_en')" autocomplete="off" lang="en" @update:model-value="clearServer" />
              <v-textarea v-model="form.bodyEn" label="Texto (inglés)" rows="4" auto-grow :counter="LIMITS.body" :error-messages="err('body_en')" :aria-invalid="!!err('body_en')" hint="Texto plano. Los saltos de línea se respetan; no se interpreta HTML." lang="en" @update:model-value="clearServer" />
              <v-text-field v-model="form.ctaLabelEn" label="Etiqueta del botón (inglés)" :counter="LIMITS.cta" :error-messages="err('cta_label_en')" :aria-invalid="!!err('cta_label_en')" autocomplete="off" lang="en" @update:model-value="clearServer" />
            </div>

            <v-text-field v-model="form.ctaUrl" label="Dirección del botón (opcional)" placeholder="https://… o /dashboard/…" :error-messages="err('cta_url')" :aria-invalid="!!err('cta_url')" hint="Solo https:// o una ruta interna que empiece por /. Si la pones, el botón necesita etiqueta en español y en inglés." autocomplete="off" inputmode="url" @update:model-value="clearServer" />

            <fieldset class="group">
              <legend>Nivel</legend>
              <v-btn-toggle v-model="form.level" mandatory divided color="primary" variant="outlined" class="levels" aria-label="Nivel">
                <v-btn v-for="l in LEVELS" :key="l.value" :value="l.value" :prepend-icon="l.icon" class="touch" :data-level="l.value">{{ l.title }}</v-btn>
              </v-btn-toggle>
              <p class="hint">{{ levelHint }}</p>
              <p v-if="err('level')" class="field-error">{{ err('level') }}</p>
            </fieldset>

            <fieldset class="group">
              <legend>Quién lo ve</legend>
              <v-radio-group v-model="form.audience" hide-details="auto" :error-messages="err('audience')" aria-label="Audiencia">
                <v-radio v-for="a in AUDIENCES" :key="a.value" :value="a.value" :data-audience="a.value">
                  <template #label><span class="radio"><strong>{{ a.title }}</strong><small>{{ a.hint }}</small></span></template>
                </v-radio>
              </v-radio-group>
              <v-text-field v-if="form.audience === 'upcoming_event'" v-model="form.upcomingDays" label="Días hasta el evento" type="number" min="1" max="365" suffix="días" class="days" :error-messages="err('upcoming_days')" :aria-invalid="!!err('upcoming_days')" inputmode="numeric" @update:model-value="clearServer" />
              <p class="count" role="status" aria-live="polite" data-count>
                <v-icon icon="mdi-account-group-outline" size="18" />
                <span>{{ countText }}</span>
                <v-btn v-if="countState === 'error'" variant="text" size="small" @click="retryCount">Reintentar</v-btn>
              </p>
            </fieldset>

            <fieldset class="group">
              <legend>Cuándo</legend>
              <v-row density="compact">
                <v-col cols="12" sm="6"><v-text-field v-model="form.startsAt" label="Empieza" type="datetime-local" :error-messages="err('starts_at')" :aria-invalid="!!err('starts_at')" @update:model-value="clearServer" /></v-col>
                <v-col cols="12" sm="6"><v-text-field v-model="form.endsAt" label="Termina (opcional)" type="datetime-local" clearable :error-messages="err('ends_at')" :aria-invalid="!!err('ends_at')" hint="Vacío: sin fin." @update:model-value="clearServer" /></v-col>
              </v-row>
            </fieldset>

            <div class="switches">
              <v-switch v-model="form.dismissible" color="primary" label="La organizadora puede cerrarlo" hide-details inset />
              <v-switch v-model="form.isActive" color="primary" label="Activo" hide-details inset />
            </div>
            <p v-if="!form.isActive" class="hint">Apagado: se guarda pero nadie lo ve hasta que lo actives.</p>
            <button type="submit" class="sr-only" tabindex="-1">Enviar</button>
          </form>

          <aside class="preview" aria-label="Vista previa">
            <div class="preview__head">
              <h3>Vista previa</h3>
              <v-btn-toggle v-model="previewLang" mandatory density="compact" variant="outlined" divided color="primary" aria-label="Idioma de la vista previa">
                <v-btn value="es" size="small" data-preview-lang="es">ES</v-btn>
                <v-btn value="en" size="small" data-preview-lang="en">EN</v-btn>
              </v-btn-toggle>
            </div>
            <p class="hint">Así lo verá la organizadora, en la parte de arriba de su panel.</p>
            <BannerPreview :banner="banner" />
            <p v-if="!bannerOpen" class="hint">Ahora está apagado: se muestra solo para que lo revises.</p>
          </aside>
        </div>
      </v-card-text>

      <v-card-actions class="dlg-actions">
        <v-spacer />
        <v-btn variant="text" class="touch" :disabled="saving" @click="close">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" class="touch" data-save @click="submit">{{ editing ? 'Guardar cambios' : 'Crear anuncio' }}</v-btn>
      </v-card-actions>
    </v-card>

  </v-dialog>
  <ReasonDialog
    v-model="reasonOpen"
    :title="reasonTitle"
    :message="reasonMessage"
    :confirm-label="editing ? 'Guardar' : 'Crear'"
    :loading="saving"
    :error="reasonError"
    @confirm="confirm"
  />
</template>

<style scoped>
.dlg-title { display: flex; align-items: center; justify-content: space-between; font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
.dlg-body { padding-top: 8px; }
.dlg-actions { padding: 12px 16px; border-top: 1px solid var(--ink-100, rgba(0, 0, 0, 0.08)); }
.layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
@media (min-width: 960px) { .layout { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); } .preview { position: sticky; top: 0; align-self: start; } }
.fields { min-width: 0; }
.group { border: 0; padding: 0; margin: 8px 0 16px; min-width: 0; }
.group legend { font-weight: 600; margin-bottom: 8px; }
.levels { flex-wrap: wrap; height: auto; max-width: 100%; }
.touch { min-height: 44px; }
.hint { margin: 6px 0 0; font-size: 0.8125rem; color: var(--ink-500); }
.field-error { margin: 6px 0 0; font-size: 0.8125rem; color: rgb(var(--v-theme-error)); }
.radio { display: flex; flex-direction: column; padding: 4px 0; }
.radio small { color: var(--ink-500); font-size: 0.8125rem; white-space: normal; }
.days { max-width: 220px; margin-left: 32px; }
.count { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0 0; padding: 8px 12px; border-radius: 10px; background: rgba(var(--v-theme-primary), 0.08); font-size: 0.9375rem; min-height: 40px; }
.switches { display: flex; flex-wrap: wrap; gap: 8px 32px; }
.preview { display: grid; gap: 8px; padding: 16px; border-radius: 14px; background: rgba(var(--v-theme-primary), 0.04); border: 1px dashed rgba(var(--v-theme-primary), 0.3); min-width: 0; }
.preview__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.preview__head h3 { font-family: var(--font-heading); font-size: 1.125rem; margin: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
