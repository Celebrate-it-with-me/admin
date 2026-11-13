<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useDisplay } from 'vuetify'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { createCoupon, fetchCoupons, fetchPricing, updateCoupon, updatePrice } from '../services/revenueApi'
import type { Coupon, Pricing } from '../types'
import { centsToInput, couponState, couponValue, dateLabel, dollarsToCents, firstError, money, usesLabel } from '../logic'

const { smAndDown } = useDisplay()

const pricing = ref<Pricing | null>(null)
const coupons = ref<Coupon[]>([])
const loading = ref(true)
const failed = ref(false)
const notice = ref('')

const load = async () => {
  loading.value = true
  failed.value = false
  try {
    const [p, c] = await Promise.all([fetchPricing(), fetchCoupons()])
    pricing.value = p
    coupons.value = c
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ---- Price
const priceOpen = ref(false)
const priceInput = ref('')
const priceTouched = ref(false)
const priceBusy = ref(false)
const priceError = ref('')
const newPriceCents = computed(() => dollarsToCents(priceInput.value))
const priceFieldError = computed(() => {
  if (!priceTouched.value) return ''
  if (newPriceCents.value === null) return 'Escribe un importe en dólares, por ejemplo 99 o 79.50 (máximo 10,000).'
  return ''
})
const openPrice = () => {
  priceInput.value = pricing.value ? centsToInput(pricing.value.plan.priceCents) : ''
  priceTouched.value = false
  priceError.value = ''
  priceOpen.value = true
}
const savePrice = async (reason: string) => {
  priceTouched.value = true
  if (newPriceCents.value === null) return
  priceBusy.value = true
  priceError.value = ''
  try {
    await updatePrice(newPriceCents.value, reason)
    priceOpen.value = false
    notice.value = `Precio actualizado a ${money(newPriceCents.value, pricing.value?.plan.currency)}. Aplica a las compras nuevas.`
    await load()
  } catch (e) {
    priceError.value = firstError(e, 'No pudimos cambiar el precio.')
  } finally {
    priceBusy.value = false
  }
}

// ---- New code
const blank = () => ({ code: '', kind: 'fixed_price' as 'fixed_price' | 'percent_off', value: '', isFounder: false, maxUses: '', expiresAt: '', notes: '' })
const createOpen = ref(false)
const form = reactive(blank())
const createTouched = ref(false)
const createBusy = ref(false)
const createError = ref('')

const valueCents = computed(() => dollarsToCents(form.value))
const percent = computed(() => (/^\d+$/.test(form.value.trim()) ? Number(form.value.trim()) : null))
const fieldErrors = computed(() => ({
  code: !/^[A-Za-z0-9_-]{3,32}$/.test(form.code.trim()) ? 'Entre 3 y 32 caracteres: letras, números, guion.' : '',
  value: form.kind === 'fixed_price'
    ? (valueCents.value === null ? 'Escribe el precio final en dólares, por ejemplo 79.' : '')
    : (percent.value === null || percent.value < 1 || percent.value > 100 ? 'Un porcentaje entre 1 y 100.' : ''),
  maxUses: form.maxUses.trim() && !/^[1-9]\d*$/.test(form.maxUses.trim()) ? 'Un número entero mayor que 0, o déjalo vacío.' : '',
}))
const createValid = computed(() => !Object.values(fieldErrors.value).some(Boolean))
const openCreate = () => { Object.assign(form, blank()); createTouched.value = false; createError.value = ''; createOpen.value = true }
const saveCreate = async (reason: string) => {
  createTouched.value = true
  if (!createValid.value) return
  createBusy.value = true
  createError.value = ''
  try {
    const c = await createCoupon({
      code: form.code.trim(), kind: form.kind,
      value: form.kind === 'fixed_price' ? (valueCents.value as number) : (percent.value as number),
      isFounder: form.isFounder, maxUses: form.maxUses.trim() ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt ? `${form.expiresAt} 23:59:59` : null, notes: form.notes.trim() || null,
    }, reason)
    createOpen.value = false
    notice.value = `Código ${c.code} creado.`
    await load()
  } catch (e) {
    createError.value = firstError(e, 'No pudimos crear el código.')
  } finally {
    createBusy.value = false
  }
}

// ---- Edit limits / activate
const editing = ref<Coupon | null>(null)
const editOpen = ref(false)
const edit = reactive({ maxUses: '', expiresAt: '', noCap: false, noExpiry: false })
const editBusy = ref(false)
const editError = ref('')
const editMaxError = computed(() => (!edit.noCap && edit.maxUses.trim() && !/^[1-9]\d*$/.test(edit.maxUses.trim()) ? 'Un número entero mayor que 0.' : ''))
const openEdit = (c: Coupon) => {
  editing.value = c
  edit.maxUses = c.max_uses === null ? '' : String(c.max_uses)
  edit.expiresAt = c.expires_at ? c.expires_at.slice(0, 10) : ''
  edit.noCap = false
  edit.noExpiry = false
  editError.value = ''
  editOpen.value = true
}
const saveEdit = async (reason: string) => {
  if (!editing.value || editMaxError.value) return
  // Absent = unchanged; null = remove the cap / the expiry.
  const changes: { maxUses?: number | null; expiresAt?: string | null } = {}
  if (edit.noCap) { if (editing.value.max_uses !== null) changes.maxUses = null }
  else if (edit.maxUses.trim() && Number(edit.maxUses) !== editing.value.max_uses) changes.maxUses = Number(edit.maxUses)
  if (edit.noExpiry) { if (editing.value.expires_at !== null) changes.expiresAt = null }
  else if (edit.expiresAt && edit.expiresAt !== editing.value.expires_at?.slice(0, 10)) changes.expiresAt = `${edit.expiresAt} 23:59:59`
  if (!Object.keys(changes).length) { editError.value = 'No hay cambios: modifica el tope o el vencimiento, o márcalos como "Sin tope" / "Sin vencimiento".'; return }
  editBusy.value = true
  editError.value = ''
  try {
    await updateCoupon(editing.value.id, changes, reason)
    editOpen.value = false
    notice.value = `Código ${editing.value.code} actualizado.`
    await load()
  } catch (e) {
    editError.value = firstError(e, 'No pudimos guardar los cambios.')
  } finally {
    editBusy.value = false
  }
}

const toggling = ref<Coupon | null>(null)
const toggleOpen = ref(false)
const toggleBusy = ref(false)
const toggleError = ref('')
const askToggle = (c: Coupon) => { toggling.value = c; toggleError.value = ''; toggleOpen.value = true }
const saveToggle = async (reason: string) => {
  if (!toggling.value) return
  const next = !toggling.value.is_active
  toggleBusy.value = true
  toggleError.value = ''
  try {
    await updateCoupon(toggling.value.id, { isActive: next }, reason)
    toggleOpen.value = false
    notice.value = `Código ${toggling.value.code} ${next ? 'activado' : 'desactivado'}.`
    await load()
  } catch (e) {
    toggleError.value = firstError(e, 'No pudimos cambiar el estado.')
  } finally {
    toggleBusy.value = false
  }
}

const currency = computed(() => pricing.value?.plan.currency ?? 'USD')
const headers = [
  { title: 'Código', key: 'code', sortable: false },
  { title: 'Descuento', key: 'value', sortable: false },
  { title: 'Usos', key: 'uses', sortable: false },
  { title: 'Vence', key: 'expires', sortable: false },
  { title: 'Estado', key: 'state', sortable: false },
  { title: 'Notas', key: 'notes', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]
</script>

<template>
  <section>
    <header class="mb-6">
      <h2 class="title">Precio y códigos</h2>
      <p class="text-medium-emphasis">El precio del evento completo y los códigos de fundador y de descuento. Cada cambio queda en la auditoría con su motivo.</p>
    </header>

    <v-alert v-if="notice" type="success" variant="tonal" closable class="mb-4" :text="notice" role="status" @click:close="notice = ''" />
    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar el precio y los códigos.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <v-card class="pa-5 mb-6 price" :class="{ 'is-loading': loading && pricing }">
      <div class="price__main">
        <p class="price__label">Evento completo, pago único</p>
        <v-skeleton-loader v-if="!pricing" type="heading" class="price__skeleton" />
        <p v-else class="price__value">{{ money(pricing.plan.priceCents, pricing.plan.currency) }}</p>
        <p v-if="pricing" class="text-body-2 text-medium-emphasis">
          {{ pricing.plan.currency }} · hasta {{ pricing.plan.maxGuests }} invitados ·
          {{ pricing.purchases.paid }} {{ pricing.purchases.paid === 1 ? 'compra pagada' : 'compras pagadas' }} de {{ pricing.purchases.total }} ·
          {{ pricing.coupons.active }} {{ pricing.coupons.active === 1 ? 'código activo' : 'códigos activos' }} de {{ pricing.coupons.total }}
        </p>
      </div>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-pencil-outline" class="touch" :disabled="!pricing" @click="openPrice">Cambiar precio</v-btn>
    </v-card>

    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-3">
      <h3 class="subtitle">Códigos</h3>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" class="touch" @click="openCreate">Crear código</v-btn>
    </div>

    <!-- Phone: cards -->
    <div v-if="smAndDown" class="cards" :class="{ 'is-loading': loading && coupons.length }" :aria-busy="loading">
      <template v-if="loading && !coupons.length">
        <v-card v-for="n in 3" :key="n" class="pa-4"><v-skeleton-loader type="heading, text" /></v-card>
      </template>
      <v-card v-else-if="!coupons.length && !failed" class="pa-6 text-center text-medium-emphasis">Todavía no hay códigos. Crea el primero con "Crear código".</v-card>
      <v-card v-for="c in coupons" :key="c.id" class="pa-4">
        <div class="d-flex justify-space-between align-start ga-3">
          <strong class="code">{{ c.code }}</strong>
          <v-chip :color="couponState(c).color" variant="tonal" size="small">{{ couponState(c).label }}</v-chip>
        </div>
        <p class="mt-1">{{ couponValue(c, currency) }}<v-chip v-if="c.is_founder" color="primary" variant="tonal" size="x-small" class="ml-2">Fundador</v-chip></p>
        <p class="text-body-2 text-medium-emphasis">Usos: {{ usesLabel(c) }} · Vence: {{ c.expires_at ? dateLabel(c.expires_at) : 'no vence' }}</p>
        <p v-if="c.notes" class="text-body-2 mt-1 note">{{ c.notes }}</p>
        <div class="d-flex ga-2 mt-3">
          <v-btn variant="tonal" class="touch flex-1-1" @click="openEdit(c)">Editar</v-btn>
          <v-btn variant="tonal" :color="c.is_active ? 'error' : 'success'" class="touch flex-1-1" @click="askToggle(c)">{{ c.is_active ? 'Desactivar' : 'Activar' }}</v-btn>
        </div>
      </v-card>
    </div>

    <v-card v-else class="table-card" :class="{ 'is-loading': loading && coupons.length }">
      <v-data-table
        :headers="headers"
        :items="coupons"
        :loading="loading && !coupons.length"
        item-value="id"
        :items-per-page="25"
        items-per-page-text="Por página"
        no-data-text="Todavía no hay códigos. Crea el primero con «Crear código»."
        loading-text="Cargando…"
      >
        <template #item.code="{ item }">
          <strong class="code">{{ item.code }}</strong>
          <v-chip v-if="item.is_founder" color="primary" variant="tonal" size="x-small" class="ml-2">Fundador</v-chip>
        </template>
        <template #item.value="{ item }">{{ couponValue(item, currency) }}</template>
        <template #item.uses="{ item }">{{ usesLabel(item) }}</template>
        <template #item.expires="{ item }">{{ item.expires_at ? dateLabel(item.expires_at) : 'No vence' }}</template>
        <template #item.state="{ item }"><v-chip :color="couponState(item).color" variant="tonal" size="small">{{ couponState(item).label }}</v-chip></template>
        <template #item.notes="{ item }"><span class="note-cell" :title="item.notes ?? ''">{{ item.notes ?? '—' }}</span></template>
        <template #item.actions="{ item }">
          <v-btn variant="text" size="small" :aria-label="`Editar ${item.code}`" @click="openEdit(item)">Editar</v-btn>
          <v-btn variant="text" size="small" :color="item.is_active ? 'error' : 'success'" :aria-label="`${item.is_active ? 'Desactivar' : 'Activar'} ${item.code}`" @click="askToggle(item)">{{ item.is_active ? 'Desactivar' : 'Activar' }}</v-btn>
        </template>
      </v-data-table>
    </v-card>

    <ReasonDialog
      v-model="priceOpen"
      title="Cambiar el precio"
      message="El nuevo precio aplica a las compras nuevas. Las compras ya hechas conservan lo que pagaron."
      confirm-label="Guardar precio"
      :loading="priceBusy"
      :error="priceError"
      @confirm="savePrice"
    >
      <v-text-field
        v-model="priceInput"
        label="Precio en dólares"
        prefix="$"
        inputmode="decimal"
        :error-messages="priceFieldError"
        class="mb-2"
        @blur="priceTouched = true"
      />
    </ReasonDialog>

    <ReasonDialog
      v-model="createOpen"
      title="Crear código"
      confirm-label="Crear código"
      :loading="createBusy"
      :error="createError"
      @confirm="saveCreate"
    >
      <v-text-field v-model="form.code" label="Código" autocomplete="off" :error-messages="createTouched ? fieldErrors.code : ''" hint="Se guarda en mayúsculas." />
      <v-radio-group v-model="form.kind" inline label="Tipo" hide-details class="mb-2">
        <v-radio label="Precio fijo" value="fixed_price" />
        <v-radio label="Porcentaje menos" value="percent_off" />
      </v-radio-group>
      <v-text-field
        v-model="form.value"
        :label="form.kind === 'fixed_price' ? 'Precio final con el código' : 'Porcentaje de descuento'"
        :prefix="form.kind === 'fixed_price' ? '$' : undefined"
        :suffix="form.kind === 'percent_off' ? '%' : undefined"
        inputmode="decimal"
        :error-messages="createTouched ? fieldErrors.value : ''"
      />
      <v-switch v-model="form.isFounder" label="Código de fundadora" color="primary" hide-details density="compact" />
      <v-text-field v-model="form.maxUses" label="Tope de usos (opcional)" inputmode="numeric" :error-messages="createTouched ? fieldErrors.maxUses : ''" class="mt-2" />
      <v-text-field v-model="form.expiresAt" label="Vence el (opcional)" type="date" />
      <v-text-field v-model="form.notes" label="Notas (opcional)" maxlength="255" />
    </ReasonDialog>

    <ReasonDialog
      v-model="editOpen"
      :title="`Editar ${editing?.code ?? ''}`"
      message="Cambia el tope de usos o el vencimiento, o quítalos con «Sin tope» y «Sin vencimiento»."
      confirm-label="Guardar cambios"
      :loading="editBusy"
      :error="editError"
      @confirm="saveEdit"
    >
      <v-text-field v-model="edit.maxUses" label="Tope de usos" inputmode="numeric" :disabled="edit.noCap" :error-messages="editMaxError" />
      <v-switch v-model="edit.noCap" label="Sin tope (usos ilimitados)" color="primary" hide-details density="compact" class="mb-3" />
      <v-text-field v-model="edit.expiresAt" label="Vence el" type="date" :disabled="edit.noExpiry" />
      <v-switch v-model="edit.noExpiry" label="Sin vencimiento" color="primary" hide-details density="compact" />
    </ReasonDialog>

    <ReasonDialog
      v-model="toggleOpen"
      :title="toggling?.is_active ? `Desactivar ${toggling?.code}` : `Activar ${toggling?.code}`"
      :message="toggling?.is_active ? 'Nadie podrá usar este código en compras nuevas.' : 'El código vuelve a poder usarse (si no está vencido ni agotado).'"
      :confirm-label="toggling?.is_active ? 'Desactivar' : 'Activar'"
      :danger="!!toggling?.is_active"
      :loading="toggleBusy"
      :error="toggleError"
      @confirm="saveToggle"
    />
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
.subtitle { font-size: 1.375rem; }
.price { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.price__label { font-size: 0.875rem; font-weight: 600; color: var(--ink-500); }
.price__value { font-family: var(--font-heading); font-size: 3rem; line-height: 1.1; margin: 4px 0; }
.price__skeleton { background: transparent; margin-left: -16px; }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.cards { display: flex; flex-direction: column; gap: 12px; }
.code { font-family: var(--font-body); letter-spacing: 0.04em; overflow-wrap: anywhere; }
.note, .note-cell { overflow-wrap: anywhere; }
.note-cell { display: inline-block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
.touch { min-height: 44px; }
</style>
