<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { downloadPdf, fetchInvoice, resendInvoice } from '../services/invoicesApi'
import type { InvoiceDetail } from '../types'
import { METHOD, STATUS, dateTimeLabel, firstError, money, validOptionalEmail } from '../logic'

const props = defineProps<{ invoiceId: number | null }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const { smAndDown, width } = useDisplay()

const detail = ref<InvoiceDetail | null>(null)
const loading = ref(false)
const failed = ref(false)
const downloading = ref('')
const downloadError = ref('')
const resendOpen = ref(false)
const resendEmail = ref('')
const resending = ref(false)
const resendFailure = ref('')
const done = ref('')

const open = computed(() => props.invoiceId !== null)
const drawerWidth = computed(() => (smAndDown.value ? width.value : 460))
const emailOk = computed(() => validOptionalEmail(resendEmail.value))

let latest = 0
const load = async () => {
  if (props.invoiceId === null) return
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await fetchInvoice(props.invoiceId)
    if (request === latest) detail.value = res
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

watch(() => props.invoiceId, id => {
  detail.value = null
  done.value = ''
  downloadError.value = ''
  if (id !== null) load()
}, { immediate: true })

const download = async (kind: 'invoice' | 'credit-note', id: number, number: string) => {
  downloading.value = `${kind}-${id}`
  downloadError.value = ''
  try {
    await downloadPdf(kind, id, `${number}.pdf`)
  } catch {
    downloadError.value = 'No pudimos descargar el PDF. Intenta de nuevo.'
  } finally {
    downloading.value = ''
  }
}

const startResend = () => { resendEmail.value = ''; resendFailure.value = ''; resendOpen.value = true }
const confirmResend = async (reason: string) => {
  if (!detail.value || !emailOk.value) return
  resending.value = true
  resendFailure.value = ''
  try {
    detail.value = await resendInvoice(detail.value.id, reason, resendEmail.value.trim())
    resendOpen.value = false
    done.value = resendEmail.value.trim() ? `Factura enviada a ${resendEmail.value.trim()}.` : 'Factura reenviada a la compradora.'
    emit('changed')
  } catch (e) {
    resendFailure.value = firstError(e, 'No pudimos enviar el correo. Intenta de nuevo.')
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <v-navigation-drawer
    :model-value="open"
    location="right"
    temporary
    tag="aside"
    :width="drawerWidth"
    aria-label="Detalle de la factura"
    @update:model-value="(v: boolean) => { if (!v) emit('close') }"
  >
    <div class="detail">
      <header class="detail__head">
        <h3 class="detail__title">{{ detail?.number ?? 'Factura' }}</h3>
        <v-btn icon="mdi-close" variant="text" aria-label="Cerrar el detalle" @click="emit('close')" />
      </header>

      <div v-if="loading && !detail" class="pa-6" aria-busy="true">
        <v-skeleton-loader type="heading, paragraph, paragraph, list-item-two-line@3" />
      </div>

      <v-alert v-else-if="failed && !detail" type="error" variant="tonal" class="ma-4" text="No pudimos cargar la factura.">
        <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>

      <div v-else-if="detail" class="detail__body" :class="{ 'is-loading': loading }">
        <v-chip :color="STATUS[detail.status].color" variant="tonal" :prepend-icon="STATUS[detail.status].icon">{{ STATUS[detail.status].label }}</v-chip>
        <p class="amount">{{ money(detail.totalCents, detail.currency) }}</p>
        <p class="text-body-2 text-medium-emphasis">
          Subtotal {{ money(detail.subtotalCents, detail.currency) }}
          <template v-if="detail.discountCents > 0"> · descuento {{ money(detail.discountCents, detail.currency) }}</template>
          · impuesto incluido {{ money(detail.taxCents, detail.currency) }} ({{ detail.taxRate }} %)
        </p>

        <v-alert v-if="done" type="success" variant="tonal" density="compact" class="mt-4" :text="done" role="status" />
        <v-alert v-if="downloadError" type="error" variant="tonal" density="compact" class="mt-4" :text="downloadError" role="alert" />

        <div class="actions mt-4">
          <v-btn color="primary" variant="flat" prepend-icon="mdi-file-pdf-box" class="touch" :loading="downloading === `invoice-${detail.id}`" @click="download('invoice', detail.id, detail.number)">Descargar PDF</v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-email-fast-outline" class="touch" @click="startResend">Reenviar por correo</v-btn>
        </div>

        <dl class="kv mt-5">
          <dt>Emitida</dt><dd>{{ dateTimeLabel(detail.issuedAt) }}</dd>
          <dt>Compra</dt><dd>#{{ detail.purchaseId }}</dd>
          <dt>Evento</dt>
          <dd>
            <router-link v-if="detail.event" :to="`/dashboard/events/${detail.event.id}`">{{ detail.event.name }}</router-link>
            <span v-else>—</span>
          </dd>
          <dt>Facturada a</dt>
          <dd>{{ detail.recipient.name ?? '—' }}<br><span class="text-body-2 text-medium-emphasis">{{ detail.recipient.email }}</span></dd>
          <dt>Emisor</dt><dd>{{ detail.issuer.name }}<br><span class="text-body-2 text-medium-emphasis">{{ detail.issuer.tax_id }}</span></dd>
          <dt>Pago</dt><dd>{{ METHOD[detail.paymentMethod] ?? detail.paymentMethod }}<span v-if="detail.paymentReference" class="text-medium-emphasis"> · ref. {{ detail.paymentReference }}</span></dd>
          <dt>Idioma</dt><dd>{{ detail.locale === 'en' ? 'Inglés' : 'Español' }}</dd>
          <dt>Correo</dt><dd>{{ detail.emailedAt ? `Enviada el ${dateTimeLabel(detail.emailedAt)}` : 'Aún no enviada' }}</dd>
        </dl>

        <template v-if="detail.status === 'void'">
          <h4 class="detail__h mt-6">Anulación</h4>
          <p class="mb-1">{{ dateTimeLabel(detail.voidedAt) }}</p>
          <p class="text-body-2 text-medium-emphasis">{{ detail.voidReason }}</p>
        </template>

        <h4 class="detail__h mt-6">Notas de crédito</h4>
        <p v-if="!detail.creditNotes.length" class="text-body-2 text-medium-emphasis">Esta factura no tiene notas de crédito.</p>
        <ul v-else class="notes">
          <li v-for="n in detail.creditNotes" :key="n.id" class="note">
            <div class="d-flex justify-space-between ga-3">
              <strong>{{ n.number }}</strong>
              <strong class="nowrap">−{{ money(n.amountCents, n.currency) }}</strong>
            </div>
            <p class="text-body-2 text-medium-emphasis">{{ dateTimeLabel(n.issuedAt) }} · {{ n.reason }}</p>
            <v-btn size="small" variant="text" prepend-icon="mdi-file-pdf-box" :loading="downloading === `credit-note-${n.id}`" class="ml-n2" @click="download('credit-note', n.id, n.number)">Descargar PDF</v-btn>
          </li>
        </ul>
      </div>
    </div>

    <ReasonDialog
      v-model="resendOpen"
      title="Reenviar la factura"
      message="Se envía el correo con el PDF adjunto. Déjalo vacío para usar el correo de la compradora."
      confirm-label="Reenviar"
      :loading="resending"
      :error="resendFailure"
      :confirm-disabled="!emailOk"
      @confirm="confirmResend"
    >
      <v-text-field v-model="resendEmail" label="Otro correo (opcional)" type="email" autocomplete="off" class="mb-2" :error="!emailOk" :error-messages="emailOk ? [] : ['Escribe un correo válido.']" />
    </ReasonDialog>
  </v-navigation-drawer>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; min-height: 100%; }
.detail__head { display: flex; align-items: center; justify-content: space-between; padding: 12px 8px 12px 24px; border-bottom: 1px solid var(--line); }
.detail__title { font-size: 1.375rem; overflow-wrap: anywhere; }
.detail__body { padding: 20px 24px 32px; transition: opacity 0.15s ease-out; }
.is-loading { opacity: 0.55; }
.amount { font-family: var(--font-heading); font-size: 2.5rem; line-height: 1.1; margin: 8px 0 4px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 12px 16px; margin: 24px 0 0; }
.kv dt { color: var(--ink-500); font-size: 0.875rem; }
.kv dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.kv dd .text-medium-emphasis { font-weight: 400; }
.kv a { color: var(--rose-700); text-underline-offset: 2px; }
.kv a:hover { color: var(--wine-800); }
.detail__h { font-size: 0.75rem; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
.notes { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.note { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
.note p { margin: 2px 0 4px; overflow-wrap: anywhere; }
.nowrap { white-space: nowrap; }
.touch { min-height: 44px; }
</style>
