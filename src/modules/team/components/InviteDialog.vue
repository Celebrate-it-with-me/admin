<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { StaffRole } from '@/types'
import ReasonDialog from '@/components/ReasonDialog.vue'
import RoleField from './RoleField.vue'
import { inviteMember } from '../services/teamApi'
import { emailLooksValid, parseTeamError } from '../logic'
import type { InviteResult } from '../types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; invited: [InviteResult] }>()

const form = ref({ email: '', name: '', role: 'support' as StaffRole })
const error = ref('')
const nameError = ref('')
const emailError = ref('')
const loading = ref(false)

watch(() => props.modelValue, open => {
  if (open) { form.value = { email: '', name: '', role: 'support' }; error.value = ''; nameError.value = ''; emailError.value = '' }
})

const emailOk = computed(() => emailLooksValid(form.value.email))
const emailHint = computed(() => emailError.value || (form.value.email && !emailOk.value ? 'Escribe un correo válido.' : ''))

const confirm = async (reason: string) => {
  if (!emailOk.value) { error.value = 'Escribe un correo válido.'; return }
  loading.value = true
  error.value = ''
  nameError.value = ''
  emailError.value = ''
  try {
    const result = await inviteMember({ email: form.value.email.trim(), name: form.value.name.trim() || undefined, role: form.value.role, reason })
    emit('invited', result)
    emit('update:modelValue', false)
  } catch (e) {
    const err = parseTeamError(e)
    if (err.field === 'name') nameError.value = err.message
    else if (err.field === 'email') emailError.value = err.message
    else error.value = err.message
  } finally { loading.value = false }
}
</script>

<template>
  <ReasonDialog
    :model-value="modelValue"
    title="Invitar a una persona"
    message="Le enviamos un correo con un enlace para crear su contraseña y activar los dos pasos. El enlace vence en unos días."
    confirm-label="Enviar invitación"
    :loading="loading"
    :error="error"
    :confirm-disabled="!emailOk"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="confirm"
  >
    <v-text-field v-model="form.email" label="Correo" type="email" autocomplete="off" inputmode="email" :error-messages="emailHint" @update:model-value="error = ''; emailError = ''" />
    <v-text-field
      v-model="form.name" label="Nombre (opcional)" autocomplete="off"
      hint="Si ya tiene una cuenta en Quinvite, se usa la suya." persistent-hint :error-messages="nameError" class="mb-3"
      @update:model-value="nameError = ''"
    />
    <RoleField v-model="form.role" />
  </ReasonDialog>
</template>
