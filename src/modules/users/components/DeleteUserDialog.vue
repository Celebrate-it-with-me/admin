<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { API } from '@/services/axios'
import { explainError } from '../helpers'

/** Delete = anonymize, with a reason and the account's email typed back (double confirmation). */
const props = defineProps<{ modelValue: boolean; user: { id: number; name: string; email: string } }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; deleted: [archivedEvents: number[]] }>()

const reason = ref('')
const confirmEmail = ref('')
const loading = ref(false)
const error = ref('')
const touched = ref(false)

watch(() => props.modelValue, open => { if (open) { reason.value = ''; confirmEmail.value = ''; error.value = ''; touched.value = false } })

const reasonOk = computed(() => reason.value.trim().length >= 5)
const emailOk = computed(() => confirmEmail.value.trim().toLowerCase() === props.user.email.toLowerCase())

const close = () => { if (!loading.value) emit('update:modelValue', false) }
const submit = async () => {
  touched.value = true
  if (!reasonOk.value || !emailOk.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await API.delete(`users/${props.user.id}`, { data: { reason: reason.value.trim(), confirmEmail: confirmEmail.value.trim() } })
    emit('deleted', res.data.archivedEvents ?? [])
  } catch (e) { error.value = explainError(e, 'No pudimos borrar la cuenta. Inténtalo de nuevo.') } finally { loading.value = false }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520" persistent @update:model-value="close" @keydown.esc="close">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">Borrar la cuenta de {{ user.name }}</v-card-title>
      <v-card-text>
        <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
          <p class="mb-2"><strong>No se puede deshacer.</strong> La cuenta se anonimiza: se borran su nombre, correo, teléfono y foto, y ya no podrá entrar.</p>
          <p class="mb-0">Se conservan las compras (por contabilidad). Los eventos de los que es la única dueña pasan a archivados.</p>
        </v-alert>
        <v-textarea v-model="reason" label="Motivo" rows="2" auto-grow counter="500" maxlength="500" :error="touched && !reasonOk"
          :hint="touched && !reasonOk ? 'Escribe al menos 5 caracteres.' : 'Queda registrado en la auditoría.'" persistent-hint />
        <v-text-field v-model="confirmEmail" class="mt-2" :label="`Escribe ${user.email} para confirmar`" autocomplete="off" inputmode="email"
          :error="touched && !emailOk" :error-messages="touched && !emailOk ? 'El correo no coincide.' : ''" @keydown.enter.prevent="submit" />
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2" :text="error" role="alert" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="close">Cancelar</v-btn>
        <v-btn color="error" variant="flat" :loading="loading" :disabled="!emailOk" @click="submit">Borrar cuenta</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
</style>
