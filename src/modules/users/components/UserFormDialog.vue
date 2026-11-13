<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { API } from '@/services/axios'

/** Simple create/edit of an account (superadmin, `admin.users.manage`), on the legacy endpoints. */
const props = defineProps<{ modelValue: boolean; user?: { id: number; name: string; email: string } | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const editing = computed(() => !!props.user)
const form = ref({ name: '', email: '', password: '' })
const loading = ref(false)
const error = ref('')
const touched = ref(false)

watch(() => props.modelValue, open => {
  if (!open) return
  form.value = { name: props.user?.name ?? '', email: props.user?.email ?? '', password: '' }
  error.value = ''
  touched.value = false
})

const nameOk = computed(() => form.value.name.trim().length > 0)
const emailOk = computed(() => /^\S+@\S+\.\S+$/.test(form.value.email.trim()))
const passOk = computed(() => (editing.value && !form.value.password) || form.value.password.length >= 8)
const valid = computed(() => nameOk.value && emailOk.value && passOk.value)

const close = () => emit('update:modelValue', false)
const submit = async () => {
  touched.value = true
  if (!valid.value || loading.value) return
  loading.value = true
  error.value = ''
  const body: Record<string, string> = { name: form.value.name.trim(), email: form.value.email.trim() }
  if (form.value.password) body.password = form.value.password
  try {
    if (editing.value) await API.put(`users/${props.user!.id}`, body)
    else await API.post('users', body)
    emit('saved')
  } catch (e) {
    const data = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
    error.value = Object.values(data?.errors ?? {})[0]?.[0] ?? 'No pudimos guardar la cuenta. Revisa los datos e inténtalo de nuevo.'
  } finally { loading.value = false }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close" @keydown.esc="close">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">{{ editing ? 'Editar usuario' : 'Nuevo usuario' }}</v-card-title>
      <v-card-text>
        <form id="user-form" novalidate @submit.prevent="submit">
          <v-text-field v-model="form.name" label="Nombre" autocomplete="off" :error="touched && !nameOk" :error-messages="touched && !nameOk ? 'Escribe un nombre.' : ''" />
          <v-text-field v-model="form.email" label="Correo" type="email" inputmode="email" autocomplete="off" :error-messages="touched && !emailOk ? 'Escribe un correo válido.' : ''" />
          <v-text-field
            v-model="form.password" label="Contraseña" type="password" autocomplete="new-password"
            :hint="editing ? 'Déjala vacía para no cambiarla.' : 'Mínimo 8 caracteres.'" persistent-hint
            :error-messages="touched && !passOk ? 'Mínimo 8 caracteres.' : ''"
          />
        </form>
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4" :text="error" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="close">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" type="submit" form="user-form" :loading="loading">{{ editing ? 'Guardar' : 'Crear' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
</style>
