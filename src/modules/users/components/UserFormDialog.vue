<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { API } from '@/services/axios'

/** Create an account (superadmin, `admin.users.manage`). The API no longer edits accounts: only creation remains. */
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const MIN_PASSWORD = 12
const form = ref({ name: '', email: '', password: '' })
const loading = ref(false)
const error = ref('')
const touched = ref(false)
/** Messages the server sent per field (422), shown under that field. */
const fieldErrors = ref<Record<string, string>>({})

watch(() => props.modelValue, open => {
  if (!open) return
  form.value = { name: '', email: '', password: '' }
  error.value = ''
  fieldErrors.value = {}
  touched.value = false
})

const nameOk = computed(() => form.value.name.trim().length > 0)
const emailOk = computed(() => /^\S+@\S+\.\S+$/.test(form.value.email.trim()))
const passOk = computed(() => form.value.password.length >= MIN_PASSWORD)
const valid = computed(() => nameOk.value && emailOk.value && passOk.value)

const nameMsg = computed(() => fieldErrors.value.name || (touched.value && !nameOk.value ? 'Escribe un nombre.' : ''))
const emailMsg = computed(() => fieldErrors.value.email || (touched.value && !emailOk.value ? 'Escribe un correo válido.' : ''))
const passMsg = computed(() => fieldErrors.value.password || (touched.value && !passOk.value ? `Mínimo ${MIN_PASSWORD} caracteres.` : ''))

const close = () => emit('update:modelValue', false)
const submit = async () => {
  touched.value = true
  if (!valid.value || loading.value) return
  loading.value = true
  error.value = ''
  fieldErrors.value = {}
  const body = { name: form.value.name.trim(), email: form.value.email.trim(), password: form.value.password }
  try {
    await API.post('users', body)
    emit('saved')
  } catch (e) {
    const res = (e as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } })?.response
    const errors = res?.data?.errors ?? {}
    if (res?.status === 422 && Object.keys(errors).length) {
      // Per-field messages (taken email, short password...) go under their field.
      fieldErrors.value = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v?.[0] ?? '']))
    } else {
      error.value = 'No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.'
    }
  } finally { loading.value = false }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close" @keydown.esc="close">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">Nuevo usuario</v-card-title>
      <v-card-text>
        <form id="user-form" novalidate @submit.prevent="submit">
          <v-text-field v-model="form.name" label="Nombre" autocomplete="off" :error-messages="nameMsg" @update:model-value="delete fieldErrors.name" />
          <v-text-field v-model="form.email" label="Correo" type="email" inputmode="email" autocomplete="off" :error-messages="emailMsg" @update:model-value="delete fieldErrors.email" />
          <v-text-field
            v-model="form.password" label="Contraseña" type="password" autocomplete="new-password"
            :hint="`Mínimo ${MIN_PASSWORD} caracteres.`" persistent-hint
            :error-messages="passMsg" @update:model-value="delete fieldErrors.password"
          />
        </form>
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4" :text="error" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="close">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" type="submit" form="user-form" :loading="loading">Crear</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
</style>
