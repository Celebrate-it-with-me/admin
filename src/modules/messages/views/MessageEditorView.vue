<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { useCurrentUserStore } from '@/store/currentUser'
import FieldEditor from '../components/FieldEditor.vue'
import MailPreview from '../components/MailPreview.vue'
import { useLivePreview } from '../composables'
import { LOCALES, changedFields, fieldLabel, formatDateTime, formFrom, localeTitle, parseError, serverFieldErrors, validateForm } from '../logic'
import { getMessage, restoreMessage, saveMessage, sendTest } from '../services/messagesApi'
import type { FieldDetail, FieldErrors, Locale, MessageDetail } from '../types'

type Pending = { kind: 'save' } | { kind: 'restore-field'; field: string } | { kind: 'restore-locale' } | { kind: 'test' }

const route = useRoute()
const me = useCurrentUserStore()
const canView = computed(() => me.can('admin.events.view'))
const canManage = computed(() => me.can('admin.messages.manage'))
const key = computed(() => String(route.params.key ?? ''))

const details = ref<Record<Locale, MessageDetail | null>>({ es: null, en: null })
const forms = ref<Record<Locale, Record<string, string>>>({ es: {}, en: {} })
const serverErrors = ref<Record<Locale, FieldErrors>>({ es: {}, en: {} })
const tab = ref<Locale>('es')
const loading = ref(true)
const failed = ref<'none' | 'error' | 'gone'>('none')
const notice = ref<{ type: 'success' | 'error'; text: string } | null>(null)

let latestLoad = 0
const load = async () => {
  const request = ++latestLoad
  loading.value = true
  failed.value = 'none'
  try {
    const [es, en] = await Promise.all([getMessage(key.value, 'es'), getMessage(key.value, 'en')])
    if (request !== latestLoad) return
    details.value = { es, en }
    forms.value = { es: formFrom(es.fields), en: formFrom(en.fields) }
    serverErrors.value = { es: {}, en: {} }
  } catch (e) {
    if (request !== latestLoad) return
    failed.value = parseError(e).code === 'message_not_found' ? 'gone' : 'error'
  } finally {
    if (request === latestLoad) loading.value = false
  }
}
onMounted(() => { if (canView.value) void load(); else loading.value = false })
onBeforeUnmount(() => { latestLoad++ })

const detail = computed(() => details.value[tab.value])
const fields = computed<Record<string, FieldDetail>>(() => detail.value?.fields ?? {})
const form = computed(() => forms.value[tab.value])
const localErrors = computed(() => validateForm(form.value, fields.value))
const edits = computed(() => changedFields(form.value, fields.value))
const dirty = computed(() => Object.keys(edits.value).length > 0)
const canSave = computed(() => canManage.value && dirty.value && Object.keys(localErrors.value).length === 0)
const dirtyIn = (locale: Locale) => {
  const d = details.value[locale]
  return d ? Object.keys(changedFields(forms.value[locale], d.fields)).length > 0 : false
}
const editedIn = (locale: Locale) => Object.values(details.value[locale]?.fields ?? {}).some(f => f.overridden)
const anyOverridden = computed(() => editedIn(tab.value))

// ── preview ──
const previewFields = computed(() => edits.value)
const { preview, state: previewState, errors: previewErrors, retry: retryPreview } = useLivePreview(key, tab, previewFields, toRef(() => detail.value !== null && canView.value))

const codeFor = (field: string): string | undefined => serverErrors.value[tab.value][field] ?? localErrors.value[field] ?? previewErrors.value[field]
const setText = (field: string, text: string) => {
  forms.value[tab.value][field] = text
  const rest = { ...serverErrors.value[tab.value] }
  delete rest[field]
  serverErrors.value[tab.value] = rest
  notice.value = null
}
const revert = (field: string) => setText(field, fields.value[field].current)

// ── writes ──
const pending = ref<Pending | null>(null)
const working = ref(false)
const reasonError = ref('')
const open = computed(() => pending.value !== null)
const ask = (p: Pending) => { notice.value = null; reasonError.value = ''; pending.value = p }

const dialog = computed(() => {
  const p = pending.value
  const lang = localeTitle(tab.value)
  if (p?.kind === 'restore-field') return { title: 'Restaurar el texto original', message: `«${fieldLabel(p.field)}» volverá al texto original en ${lang}. Los cambios guardados de ese campo se pierden.`, label: 'Restaurar', danger: true }
  if (p?.kind === 'restore-locale') return { title: `Restaurar todo ${lang}`, message: `Todos los textos de este mensaje en ${lang} vuelven al original, y los cambios sin guardar de ese idioma se descartan.`, label: 'Restaurar todo', danger: true }
  if (p?.kind === 'test') return { title: 'Enviar una prueba', message: `Enviaremos la versión guardada en ${lang} a tu correo (${me.user?.email ?? 'el tuyo'}), con datos de ejemplo.`, label: 'Enviar prueba', danger: false }
  return { title: 'Guardar los textos', message: `Los correos de «${detail.value?.name ?? key.value}» en ${lang} saldrán con estos textos desde ahora.`, label: 'Guardar', danger: false }
})

/** Takes the answer in: fields restored (or saved) show the server's text; the other edits stay as typed. */
const apply = (locale: Locale, next: MessageDetail, keep: string[] = []) => {
  const old = details.value[locale]
  const form = { ...formFrom(next.fields) }
  for (const f of keep) if (old && forms.value[locale][f] !== old.fields[f]?.current) form[f] = forms.value[locale][f]
  details.value[locale] = next
  forms.value[locale] = form
}

const confirm = async (reason: string) => {
  const p = pending.value
  if (!p) return
  const locale = tab.value
  working.value = true
  reasonError.value = ''
  try {
    if (p.kind === 'save') {
      apply(locale, await saveMessage(key.value, locale, edits.value, reason))
      serverErrors.value[locale] = {}
      notice.value = { type: 'success', text: `Guardamos los textos en ${localeTitle(locale)}.` }
    } else if (p.kind === 'restore-field') {
      const others = Object.keys(fields.value).filter(f => f !== p.field)
      apply(locale, await restoreMessage(key.value, locale, [p.field], reason), others)
      notice.value = { type: 'success', text: 'Restauramos el texto original de ese campo.' }
    } else if (p.kind === 'restore-locale') {
      apply(locale, await restoreMessage(key.value, locale, null, reason))
      serverErrors.value[locale] = {}
      notice.value = { type: 'success', text: `Restauramos todos los textos originales en ${localeTitle(locale)}.` }
    } else {
      await sendTest(key.value, locale, reason)
      notice.value = { type: 'success', text: `Enviamos la prueba a ${me.user?.email ?? 'tu correo'}. Revisa tu bandeja en un minuto.` }
    }
    pending.value = null
  } catch (e) {
    const parsed = parseError(e)
    const found = serverFieldErrors(e)
    const { reason: reasonCode, to, ...own } = found
    delete own.locale
    if (parsed.code === 'message_not_found') { pending.value = null; failed.value = 'gone' }
    else if (Object.keys(own).length && p.kind === 'save') {
      serverErrors.value[locale] = own
      notice.value = { type: 'error', text: 'Revisa los campos marcados: no pudimos guardar.' }
      pending.value = null
    } else if (reasonCode) reasonError.value = parseError({ response: { status: 422, data: { errors: { reason: [reasonCode] } } } }).message
    else if (to) reasonError.value = parseError({ response: { status: 422, data: { errors: { to: [to] } } } }).message
    else reasonError.value = parsed.message
  } finally { working.value = false }
}

// Leaving with unsaved text asks first.
const anyDirty = computed(() => dirtyIn('es') || dirtyIn('en'))
onBeforeRouteLeave(() => (anyDirty.value ? window.confirm('Tienes cambios sin guardar. ¿Salir sin guardarlos?') : true))
const beforeUnload = (e: BeforeUnloadEvent) => { if (anyDirty.value) e.preventDefault() }
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
watch(key, () => { if (canView.value) void load() })
</script>

<template>
  <section>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="{ name: 'Messages' }" class="back touch">Textos de mensajes</v-btn>

    <v-alert v-if="!canView" type="warning" variant="tonal" class="mb-4" text="No tienes permiso para ver los textos de los mensajes." />

    <template v-else>
      <v-alert v-if="failed === 'gone'" type="warning" variant="tonal" class="mb-4" text="Este mensaje no existe o ya no se puede editar.">
        <template #append><v-btn variant="text" :to="{ name: 'Messages' }">Ver la lista</v-btn></template>
      </v-alert>
      <v-alert v-else-if="failed === 'error'" type="error" variant="tonal" class="mb-4" text="No pudimos cargar este mensaje.">
        <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>

      <v-card v-else-if="loading && !detail" class="pa-2" aria-busy="true"><v-skeleton-loader type="heading, list-item-three-line@3" /></v-card>

      <template v-else-if="detail">
        <header class="head">
          <h2 class="title">{{ detail.name }}</h2>
          <p class="text-medium-emphasis">
            Edita lo que dice este correo. Cada cambio pide un motivo y queda en la auditoría; los botones, enlaces y datos los pone la plantilla.
            <template v-if="detail.updatedAt">Último cambio en {{ localeTitle(tab) }}: {{ formatDateTime(detail.updatedAt) }}<template v-if="detail.updatedBy"> por {{ detail.updatedBy.name }}</template>.</template>
          </p>
          <p v-if="!canManage" class="text-medium-emphasis" data-readonly>Tienes acceso de lectura: los cambios los hace la persona superadmin.</p>
        </header>

        <div aria-live="polite">
          <v-alert v-if="notice" :type="notice.type" variant="tonal" class="mb-4" closable :text="notice.text" @click:close="notice = null" />
        </div>

        <v-tabs v-model="tab" color="primary" density="comfortable" class="mb-2" aria-label="Idioma">
          <v-tab v-for="l in LOCALES" :key="l.value" :value="l.value" :data-tab="l.value">
            {{ l.title }}
            <v-chip v-if="editedIn(l.value)" size="x-small" color="primary" variant="tonal" class="ml-2">Editado</v-chip>
            <v-icon v-if="dirtyIn(l.value)" icon="mdi-circle-edit-outline" color="warning" size="16" class="ml-2" aria-label="Con cambios sin guardar" />
          </v-tab>
        </v-tabs>

        <div class="editor">
          <div class="editor__fields">
            <FieldEditor
              v-for="(f, name) in fields" :key="`${tab}-${name}`" :name="String(name)" :field="f" :locale="tab"
              :model-value="form[name] ?? f.current" :code="codeFor(String(name))" :disabled="working" :readonly="!canManage" :can-restore="canManage"
              @update:model-value="setText(String(name), $event)" @revert="revert(String(name))" @restore="ask({ kind: 'restore-field', field: String(name) })"
            />

            <div v-if="canManage" class="bar">
              <v-btn color="primary" variant="flat" class="touch" :disabled="!canSave || working" data-save @click="ask({ kind: 'save' })">Guardar cambios</v-btn>
              <v-btn variant="tonal" prepend-icon="mdi-email-fast-outline" class="touch" :disabled="dirty || working" data-test @click="ask({ kind: 'test' })">Enviar prueba</v-btn>
              <v-btn v-if="anyOverridden" variant="text" color="error" prepend-icon="mdi-restore" class="touch" data-restore-all @click="ask({ kind: 'restore-locale' })">Restaurar todo en {{ localeTitle(tab) }}</v-btn>
              <p v-if="dirty" class="bar__hint">Para enviar una prueba, guarda primero: se envía la versión guardada.</p>
            </div>
          </div>

          <aside class="editor__preview" aria-label="Vista previa">
            <h3>Vista previa</h3>
            <p class="hint">Así llegará el correo en {{ localeTitle(tab) }}, con datos de ejemplo.</p>
            <MailPreview :preview="preview" :state="previewState" @retry="retryPreview" />
          </aside>
        </div>
      </template>
    </template>

    <ReasonDialog
      :model-value="open" :title="dialog.title" :message="dialog.message" :confirm-label="dialog.label" :danger="dialog.danger"
      :loading="working" :error="reasonError" @update:model-value="pending = null" @confirm="confirm"
    />
  </section>
</template>

<style scoped>
.back { margin-left: -12px; }
.head { margin-bottom: 12px; }
.title { font-size: 2rem; margin-bottom: 4px; overflow-wrap: anywhere; }
.touch { min-height: 44px; }
.hint { font-size: 0.8125rem; color: var(--ink-500); margin: 0 0 8px; }
.editor { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); }
.editor__preview h3 { font-family: var(--font-heading); font-size: 1.25rem; }
.bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 16px 0; }
.bar__hint { flex-basis: 100%; margin: 0; font-size: 0.8125rem; color: var(--ink-500); }
@media (min-width: 1100px) {
  .editor { grid-template-columns: minmax(0, 1fr) minmax(0, 560px); align-items: start; }
  .editor__preview { position: sticky; top: 72px; }
}
</style>
