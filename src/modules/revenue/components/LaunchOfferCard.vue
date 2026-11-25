<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { fetchLaunchOffer, updateLaunchOffer } from '../services/revenueApi'
import type { LaunchOffer } from '../types'
import { money, offerChanges, offerError, offerErrors, offerForm, offerHasErrors, offerMinCents, offerNotice, offerState, totalBelowUsed } from '../logic'

const props = defineProps<{ listPriceCents: number; currency: string }>()
const emit = defineEmits<{ notice: [string] }>()

const offer = ref<LaunchOffer | null>(null)
const loading = ref(true)
const loadError = ref('')
const denied = ref(false)

const load = async () => {
  loading.value = true
  loadError.value = ''
  denied.value = false
  try {
    offer.value = await fetchLaunchOffer()
  } catch (e) {
    denied.value = (e as { response?: { status?: number } })?.response?.status === 403
    loadError.value = offerError(e, 'No pudimos cargar la oferta de lanzamiento.')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const state = computed(() => (offer.value ? offerState(offer.value) : null))
const cur = computed(() => offer.value?.currency ?? props.currency)
const usedPct = computed(() => (offer.value && offer.value.totalSlots > 0 ? Math.min(100, Math.round(((offer.value.slotsUsed + offer.value.slotsHeld) / offer.value.totalSlots) * 100)) : 0))

// ---- Switch on / off
const toggleOpen = ref(false)
const toggleBusy = ref(false)
const toggleError = ref('')
const turningOff = computed(() => !!offer.value?.isActive)
const askToggle = () => { toggleError.value = ''; toggleOpen.value = true }
const saveToggle = async (reason: string) => {
  if (!offer.value) return
  const next = !offer.value.isActive
  toggleBusy.value = true
  toggleError.value = ''
  try {
    const r = await updateLaunchOffer({ isActive: next }, reason)
    toggleOpen.value = false
    emit('notice', offerNotice(r, next ? 'activate' : 'deactivate'))
    await load()
  } catch (e) {
    toggleError.value = offerError(e, 'No pudimos cambiar el estado de la oferta.')
  } finally {
    toggleBusy.value = false
  }
}

// ---- Create / adjust
const editOpen = ref(false)
const editBusy = ref(false)
const editError = ref('')
const touched = ref(false)
const form = reactive(offerForm(null))
const errors = computed(() => offerErrors(form, offer.value, props.listPriceCents, cur.value))
const belowUsed = computed(() => totalBelowUsed(form, offer.value))
const openEdit = () => {
  Object.assign(form, offerForm(offer.value))
  touched.value = false
  editError.value = ''
  editOpen.value = true
}
const saveEdit = async (reason: string) => {
  touched.value = true
  if (offerHasErrors(errors.value)) return
  const changes = offerChanges(form, offer.value)
  if (!Object.keys(changes).length) { editError.value = 'No hay cambios: modifica el precio o los cupos.'; return }
  editBusy.value = true
  editError.value = ''
  try {
    const creating = !offer.value
    const r = await updateLaunchOffer(changes, reason)
    editOpen.value = false
    emit('notice', offerNotice(r, creating ? 'create' : 'update'))
    await load()
  } catch (e) {
    editError.value = offerError(e, 'No pudimos guardar la oferta.')
  } finally {
    editBusy.value = false
  }
}
const priceHint = computed(() => `Entre ${money(offerMinCents(props.listPriceCents), cur.value)} y menos que ${money(props.listPriceCents, cur.value)}.`)
const toggleMessage = computed(() => {
  const o = offer.value
  if (!o) return ''
  return o.isActive
    ? `Las compras nuevas dejan de recibir ${money(o.priceCents, cur.value)}. Los pagos que ahora están abiertos con ese precio se cierran.`
    : `Vas a activar un precio real: desde ahora, cualquier persona que compre un evento pagará ${money(o.priceCents, cur.value)} en lugar de ${money(o.listPriceCents, cur.value)}, hasta agotar ${o.slotsLeft} ${o.slotsLeft === 1 ? 'cupo' : 'cupos'}. El tope se comparte con el código LANZAMIENTO79.`
})
</script>

<template>
  <v-card class="pa-5 mb-6 offer" :class="{ 'is-loading': loading && offer }" data-testid="launch-offer" :aria-busy="loading">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-1">
      <h3 class="subtitle">Oferta de lanzamiento</h3>
      <v-chip v-if="state" :color="state.color" variant="tonal" size="small" :prepend-icon="state.icon" :class="`offer-chip offer-chip--${state.key}`" data-testid="offer-state">{{ state.label }}</v-chip>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">Los primeros eventos pagan un precio especial. Cada cambio queda en la auditoría con su motivo.</p>
    <v-alert v-if="offer" type="info" variant="tonal" density="compact" class="mb-4" data-testid="offer-shared">
      Los cupos se comparten entre la oferta pública y el código LANZAMIENTO79: las ventas con el código también cuentan en «Usados» de aquí. El contador «Usos» de ese código, en la lista de abajo, solo cuenta sus propios usos y puede mostrar menos.
    </v-alert>

    <v-skeleton-loader v-if="loading && !offer && !loadError" type="heading, text" />

    <v-alert v-else-if="loadError" :type="denied ? 'warning' : 'error'" variant="tonal" density="compact" :text="loadError" data-testid="offer-error">
      <template v-if="!denied" #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <div v-else-if="!offer" class="offer__empty" data-testid="offer-empty">
      <p class="text-medium-emphasis">Todavía no hay una oferta de lanzamiento. Al crearla queda inactiva: actívala cuando quieras abrirla.</p>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" class="touch" @click="openEdit">Crear oferta</v-btn>
    </div>

    <template v-else>
      <div class="offer__top">
        <div>
          <p class="offer__label">Precio de la oferta</p>
          <p class="offer__price">{{ money(offer.priceCents, cur) }}</p>
          <p class="text-body-2 text-medium-emphasis">Precio normal: {{ money(offer.listPriceCents, cur) }}</p>
        </div>
        <div class="offer__actions">
          <v-btn variant="tonal" prepend-icon="mdi-pencil-outline" class="touch" @click="openEdit">Ajustar</v-btn>
          <v-btn :variant="offer.isActive ? 'flat' : 'tonal'" :color="offer.isActive ? 'error' : 'success'" :prepend-icon="offer.isActive ? 'mdi-pause' : 'mdi-play'" class="touch" @click="askToggle">{{ offer.isActive ? 'Desactivar' : 'Activar' }}</v-btn>
        </div>
      </div>

      <v-progress-linear :model-value="usedPct" height="8" rounded color="primary" bg-color="surface-variant" class="my-4" :aria-label="`Cupos ocupados: ${usedPct} %`" />

      <dl class="offer__stats">
        <div><dt>Tope</dt><dd data-testid="slots-total">{{ offer.totalSlots }}</dd></div>
        <div>
          <dt>Usados</dt><dd data-testid="slots-used">{{ offer.slotsUsed }}</dd>
          <small class="text-medium-emphasis">{{ offer.slotsPaid }} pagados<template v-if="offer.slotsAdjustment"> · {{ offer.slotsAdjustment > 0 ? '+' : '' }}{{ offer.slotsAdjustment }} ajuste</template></small>
        </div>
        <div><dt>Retenidos</dt><dd data-testid="slots-held">{{ offer.slotsHeld }}</dd><small class="text-medium-emphasis">pagos abiertos, 60 min</small></div>
        <div><dt>Restantes</dt><dd data-testid="slots-left">{{ offer.slotsLeft }}</dd></div>
      </dl>
      <p v-if="state?.key === 'soldout'" class="text-body-2 mt-3 soldout" role="status">Se agotaron los cupos: nadie más recibe la oferta aunque esté encendida.</p>
    </template>

    <ReasonDialog
      v-model="toggleOpen"
      :title="turningOff ? 'Desactivar la oferta' : 'Activar la oferta'"
      :message="toggleMessage"
      :confirm-label="turningOff ? 'Desactivar' : 'Activar'"
      :danger="turningOff"
      :loading="toggleBusy"
      :error="toggleError"
      @confirm="saveToggle"
    />

    <ReasonDialog
      v-model="editOpen"
      :title="offer ? 'Ajustar la oferta' : 'Crear la oferta'"
      :message="offer ? 'Cambiar el precio cierra los pagos abiertos con el precio anterior. Los cupos usados solo se pueden subir (ventas hechas fuera de la plataforma), nunca bajar de las compras pagadas.' : 'Define el precio y cuántos eventos lo recibirán.'"
      confirm-label="Guardar"
      :loading="editBusy"
      :error="editError"
      @confirm="saveEdit"
    >
      <v-text-field v-model="form.price" label="Precio de la oferta" prefix="$" inputmode="decimal" :hint="priceHint" persistent-hint :error-messages="touched ? errors.price : ''" class="mb-2" />
      <v-text-field v-model="form.totalSlots" label="Tope de cupos" inputmode="numeric" :error-messages="touched ? errors.totalSlots : ''" class="mb-2" />
      <v-text-field v-if="offer" v-model="form.slotsUsed" label="Cupos usados" inputmode="numeric" :hint="`Pagados: ${offer.slotsPaid}. Súbelo para contar una venta hecha fuera de la plataforma.`" persistent-hint :error-messages="touched ? errors.slotsUsed : ''" class="mb-2" />
      <v-switch v-if="belowUsed" v-model="form.allowBelowUsed" color="primary" hide-details density="compact" label="Permitir un tope menor que los cupos usados" />
    </ReasonDialog>
  </v-card>
</template>

<style scoped>
.subtitle { font-size: 1.375rem; }
.offer__top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.offer__label { font-size: 0.875rem; font-weight: 600; color: var(--ink-500); }
.offer__price { font-family: var(--font-heading); font-size: 3rem; line-height: 1.1; margin: 4px 0; }
.offer__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.offer__empty { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.offer__stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; }
.offer__stats dt { font-size: 0.875rem; font-weight: 600; color: var(--ink-500); }
.offer__stats dd { font-family: var(--font-heading); font-size: 1.75rem; line-height: 1.2; margin: 0; }
.offer-chip :deep(.v-chip__underlay) { display: none; }
.offer-chip--inactive { background: #ece6df !important; color: #4a413c !important; }
.offer-chip--soldout { background: #fbecd0 !important; color: #7a4a00 !important; }
.soldout { color: color-mix(in srgb, rgb(var(--v-theme-warning)) 65%, black); }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.touch { min-height: 44px; }
@media (min-width: 960px) { .offer__stats { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 599px) { .offer__actions { width: 100%; } .offer__actions .v-btn { flex: 1 1 0; } }
</style>
