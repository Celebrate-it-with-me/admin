<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import MessageStatusChip from './MessageStatusChip.vue'
import { listTemplates, sendTest, submitTemplate, syncTemplates, updateTemplate } from '../services/whatsappApi'
import {
  BODY_MAX, canSubmit, CATEGORY_NAMES, dateTimeLabel, isSendable, LOCALE_NAMES, LOCALES, missingPlaceholders, parseWaError,
  placeholder, sortTemplates, TEMPLATE_KEYS, TEMPLATE_NAMES, variableHelp,
} from '../logic'
import type { Locale, TemplateCategory, TemplateKey, WaTemplate } from '../types'

defineProps<{ canManage: boolean }>()
const emit = defineEmits<{ sent: [] }>()

const templates = ref<WaTemplate[]>([])
const loading = ref(true)
const failed = ref(false)
const notice = ref<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const list = await listTemplates()
    if (request === latest) templates.value = sortTemplates(list)
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}
onMounted(load)
defineExpose({ load })

const replace = (list: WaTemplate[]) => { templates.value = sortTemplates(list) }
const swap = (t: WaTemplate) => { templates.value = sortTemplates(templates.value.map(x => (x.id === t.id ? t : x))) }
const nameOf = (t: WaTemplate) => `${TEMPLATE_NAMES[t.key]} (${LOCALE_NAMES[t.locale]})`

// ── dialogs: edit / submit / sync / test ──
type Mode = 'edit' | 'submit' | 'sync' | 'test'
const mode = ref<Mode | null>(null)
const target = ref<WaTemplate | null>(null)
const dialogError = ref('')
const fieldError = ref<{ field: string; message: string } | null>(null)
const busy = ref(false)

const body = ref('')
const category = ref<TemplateCategory>('utility')
const testTo = ref('')
const testKey = ref<TemplateKey>('invitation')
const testLocale = ref<Locale>('es')

const reset = () => { dialogError.value = ''; fieldError.value = null }
const closeDialog = () => { mode.value = null }

const openEdit = (t: WaTemplate) => { reset(); notice.value = null; target.value = t; body.value = t.body; category.value = t.category; mode.value = 'edit' }
const openSubmit = (t: WaTemplate) => { reset(); notice.value = null; target.value = t; mode.value = 'submit' }
const openSync = () => { reset(); notice.value = null; target.value = null; mode.value = 'sync' }
const openTest = (t?: WaTemplate) => {
  reset(); notice.value = null; target.value = null
  testKey.value = t?.key ?? 'invitation'
  testLocale.value = t?.locale ?? 'es'
  mode.value = 'test'
}

const missing = computed(() => (target.value && mode.value === 'edit' ? missingPlaceholders(body.value, target.value.variables.length) : []))
const editChanged = computed(() => !!target.value && (body.value !== target.value.body || category.value !== target.value.category))
const editDisabled = computed(() => !body.value.trim() || !editChanged.value || body.value.length > BODY_MAX)
const testDisabled = computed(() => !testTo.value.trim())

const TITLES: Record<Mode, string> = { edit: 'Editar el texto', submit: 'Enviar a aprobación', sync: 'Sincronizar estados', test: 'Enviar una prueba' }
const CONFIRM: Record<Mode, string> = { edit: 'Guardar texto', submit: 'Enviar a aprobación', sync: 'Sincronizar', test: 'Enviar prueba' }
const message = computed(() => {
  const t = target.value
  switch (mode.value) {
    case 'edit': return t ? `Cambiar el texto de «${nameOf(t)}». ${t.status === 'approved' || t.status === 'rejected' ? 'Al guardar vuelve a borrador y habrá que enviarla de nuevo a aprobación.' : ''}` : ''
    case 'submit': return t ? `Enviamos «${nameOf(t)}» a Meta para que la revise. Mientras no esté aprobada no se puede usar para enviar.` : ''
    case 'sync': return 'Preguntamos a Meta por el estado de todas las plantillas y actualizamos la lista.'
    case 'test': return 'Enviamos un mensaje real de esta plantilla, sin evento ni invitado, a un teléfono. Solo funciona con plantillas aprobadas.'
    default: return ''
  }
})

const act = async (reason: string) => {
  if (!mode.value) return
  busy.value = true
  reset()
  try {
    switch (mode.value) {
      case 'edit': {
        const t = target.value!
        swap(await updateTemplate(t.id, {
          reason,
          ...(body.value !== t.body ? { body: body.value } : {}),
          ...(category.value !== t.category ? { category: category.value } : {}),
        }))
        notice.value = { type: 'success', text: `Guardamos el texto de «${nameOf(t)}».` }
        break
      }
      case 'submit': {
        const t = target.value!
        const updated = await submitTemplate(t.id, reason)
        swap(updated)
        notice.value = updated.status === 'approved'
          ? { type: 'success', text: `«${nameOf(t)}» quedó aprobada al instante (modo de prueba).` }
          : { type: 'success', text: `Enviamos «${nameOf(t)}» a Meta. Cuando la revise, pulsa «Sincronizar estados».` }
        break
      }
      case 'sync':
        replace(await syncTemplates(reason))
        notice.value = { type: 'success', text: 'Actualizamos el estado de las plantillas con lo que dice Meta.' }
        break
      case 'test': {
        const sent = await sendTest({ to: testTo.value.trim(), templateKey: testKey.value, locale: testLocale.value, reason })
        notice.value = { type: 'success', text: `Pusimos en cola la prueba a ${sent.to}. La verás en la pestaña Mensajes.` }
        emit('sent')
        break
      }
    }
    mode.value = null
  } catch (e) {
    const err = parseWaError(e)
    if (err.field === 'body' || err.field === 'to') fieldError.value = { field: err.field, message: err.message }
    else dialogError.value = err.message
  } finally { busy.value = false }
}

const keyItems = TEMPLATE_KEYS.map(value => ({ value, title: TEMPLATE_NAMES[value] }))
const localeItems = LOCALES.map(value => ({ value, title: LOCALE_NAMES[value] }))
const categoryItems = (Object.keys(CATEGORY_NAMES) as TemplateCategory[]).map(value => ({ value, title: CATEGORY_NAMES[value] }))
const bodyError = computed(() => (fieldError.value?.field === 'body' ? fieldError.value.message : ''))
const toError = computed(() => (fieldError.value?.field === 'to' ? fieldError.value.message : ''))
</script>

<template>
  <div>
    <div class="bar">
      <p class="text-medium-emphasis bar__text">Cinco mensajes en español e inglés. Solo las aprobadas por Meta se pueden enviar.</p>
      <div v-if="canManage" class="bar__actions">
        <v-btn variant="tonal" prepend-icon="mdi-sync" class="touch" @click="openSync">Sincronizar estados</v-btn>
        <v-btn variant="tonal" prepend-icon="mdi-send-outline" class="touch" @click="openTest()">Enviar prueba</v-btn>
      </div>
    </div>

    <div aria-live="polite">
      <v-alert v-if="notice" :type="notice.type" variant="tonal" closable class="mb-4" :text="notice.text" @click:close="notice = null" />
    </div>
    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar las plantillas.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <div v-if="loading && !templates.length && !failed" class="grid" aria-busy="true">
      <v-card v-for="n in 4" :key="n" class="pa-4"><v-skeleton-loader type="heading, paragraph" /></v-card>
    </div>

    <v-card v-else-if="!templates.length && !failed" class="pa-8 empty" data-testid="empty">
      <v-icon size="40" icon="mdi-file-document-outline" color="primary" class="mb-3" />
      <p class="empty__title">Todavía no hay plantillas.</p>
      <p class="text-medium-emphasis">Aparecen cuando la API crea las cinco plantillas base.</p>
    </v-card>

    <div v-else class="grid" :class="{ 'is-loading': loading }">
      <v-card v-for="t in templates" :key="t.id" class="tcard" :data-template="t.id">
        <div class="tcard__top">
          <div class="tcard__who">
            <strong>{{ TEMPLATE_NAMES[t.key] }}</strong>
            <v-chip size="x-small" variant="outlined" class="ml-2">{{ t.locale.toUpperCase() }}</v-chip>
            <p class="tcard__meta">{{ t.metaName }} · {{ CATEGORY_NAMES[t.category] }}</p>
          </div>
          <MessageStatusChip kind="template" :status="t.status" />
        </div>

        <p class="tcard__body">{{ t.body }}</p>

        <div class="chips" :aria-label="`Variables de ${nameOf(t)}`">
          <v-chip v-for="(v, i) in t.variables" :key="v" size="small" variant="tonal" label :title="variableHelp(v)" class="var">
            <code>{{ placeholder(i) }}</code>&nbsp;{{ v }}
          </v-chip>
        </div>
        <div v-if="t.buttons.length" class="chips">
          <v-chip v-for="b in t.buttons" :key="b.id" size="small" variant="outlined" prepend-icon="mdi-reply-outline">{{ b.text }}</v-chip>
        </div>

        <v-alert v-if="t.status === 'rejected' && t.rejectionReason" type="error" variant="tonal" density="compact" class="mt-3" data-testid="rejection">
          <strong>Motivo del rechazo:</strong> {{ t.rejectionReason }}
        </v-alert>
        <p v-else-if="t.key === 'padrino_reminder'" class="tcard__note">Todavía no se envía: espera al módulo de Padrinos.</p>

        <p class="tcard__dates">
          <template v-if="t.approvedAt">Aprobada {{ dateTimeLabel(t.approvedAt) }}</template>
          <template v-else-if="t.submittedAt">Enviada {{ dateTimeLabel(t.submittedAt) }}</template>
          <template v-else>Sin enviar a Meta</template>
        </p>

        <div v-if="canManage" class="tcard__actions">
          <v-btn variant="text" prepend-icon="mdi-pencil-outline" class="touch" :aria-label="`Editar ${nameOf(t)}`" @click="openEdit(t)">Editar</v-btn>
          <v-btn v-if="canSubmit(t)" variant="tonal" color="primary" prepend-icon="mdi-send-check-outline" class="touch" :aria-label="`Enviar a aprobación ${nameOf(t)}`" @click="openSubmit(t)">Enviar a aprobación</v-btn>
          <v-btn v-if="isSendable(t)" variant="text" prepend-icon="mdi-send-outline" class="touch" :aria-label="`Enviar prueba de ${nameOf(t)}`" @click="openTest(t)">Probar</v-btn>
        </div>
      </v-card>
    </div>

    <ReasonDialog
      :model-value="mode !== null"
      :title="mode ? TITLES[mode] : ''"
      :message="message"
      :confirm-label="mode ? CONFIRM[mode] : undefined"
      :loading="busy"
      :error="dialogError"
      :confirm-disabled="(mode === 'edit' && editDisabled) || (mode === 'test' && testDisabled)"
      @update:model-value="closeDialog"
      @confirm="act"
    >
      <template v-if="mode === 'edit' && target">
        <p class="label">Variables (no se pueden quitar ni cambiar)</p>
        <div class="chips mb-3">
          <v-chip v-for="(v, i) in target.variables" :key="v" size="small" variant="tonal" label :color="missing.includes(placeholder(i)) ? 'error' : undefined" class="var">
            <code>{{ placeholder(i) }}</code>&nbsp;{{ v }}
          </v-chip>
        </div>
        <v-textarea
          v-model="body"
          label="Texto del mensaje"
          rows="5"
          auto-grow
          :counter="BODY_MAX"
          :error-messages="bodyError || (missing.length ? `Falta ${missing.join(', ')}.` : '')"
          class="mb-4"
        />
        <v-select v-model="category" :items="categoryItems" label="Categoría en Meta" hide-details class="mb-4" />
      </template>
      <template v-else-if="mode === 'test'">
        <v-text-field v-model="testTo" label="Teléfono (con código de país)" placeholder="+13055550123" type="tel" autocomplete="off" inputmode="tel" :error-messages="toError" class="mb-2" />
        <v-select v-model="testKey" :items="keyItems" label="Plantilla" hide-details class="mb-3" />
        <v-select v-model="testLocale" :items="localeItems" label="Idioma" hide-details class="mb-4" />
      </template>
    </ReasonDialog>
  </div>
</template>

<style scoped>
.bar { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.bar__text { margin: 0; flex: 1 1 260px; }
.bar__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.touch { min-height: 44px; }
.grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 960px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.tcard { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.tcard__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.tcard__who { min-width: 0; }
.tcard__meta { margin: 2px 0 0; font-size: 0.8125rem; color: var(--ink-500); overflow-wrap: anywhere; }
.tcard__body { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; background: rgba(0, 0, 0, 0.03); border-radius: 8px; padding: 10px 12px; }
.tcard__note, .tcard__dates { margin: 0; font-size: 0.8125rem; color: var(--ink-500); }
.tcard__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.var code { font-family: ui-monospace, monospace; font-weight: 600; }
.label { font-size: 0.8125rem; color: var(--ink-500); margin: 0 0 6px; }
.empty { text-align: center; }
.empty__title { font-family: var(--font-heading); font-size: 1.25rem; }
</style>
