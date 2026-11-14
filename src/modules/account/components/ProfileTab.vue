<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { cancelEmailChange, updateProfile } from '../services/accountApi'
import { formatDateTime, parseApiError } from '../logic'
import type { AccountProfile } from '../types'
import EmailChangeDialog from './EmailChangeDialog.vue'

const props = defineProps<{ profile: AccountProfile }>()
const emit = defineEmits<{ updated: [AccountProfile] }>()

const ROLE_LABELS: Record<string, string> = { superadmin: 'Superadmin', support: 'Soporte' }
const LANGUAGES = [
  { value: 'es', title: 'Español' },
  { value: 'en', title: 'English' },
]

const name = ref(props.profile.name)
const language = ref<string>(props.profile.language)
const saving = ref(false)
const touched = ref(false)
const error = ref('')
const saved = ref('')
const emailOpen = ref(false)
const emailNotice = ref('')
const cancelling = ref(false)

watch(() => props.profile, p => { name.value = p.name; language.value = p.language })

const nameOk = computed(() => name.value.trim().length >= 2)
const dirty = computed(() => name.value.trim() !== props.profile.name || language.value !== props.profile.language)

const save = async () => {
  touched.value = true; saved.value = ''; error.value = ''
  if (!nameOk.value || !dirty.value || saving.value) return
  saving.value = true
  try {
    emit('updated', await updateProfile({ name: name.value.trim(), language: language.value }))
    saved.value = 'Guardamos tus cambios.'
    touched.value = false
  } catch (e) { error.value = parseApiError(e).message } finally { saving.value = false }
}

const onEmailRequested = (profile: AccountProfile) => {
  emailOpen.value = false
  emailNotice.value = `Enviamos un enlace a ${profile.pendingEmail?.email}. Ábrelo en un máximo de 1 hora para confirmar el cambio.`
  emit('updated', profile)
}

const cancelPending = async () => {
  cancelling.value = true
  try {
    emit('updated', await cancelEmailChange())
    emailNotice.value = ''
  } catch (e) { error.value = parseApiError(e).message } finally { cancelling.value = false }
}
</script>

<template>
  <div class="stack">
    <v-card class="pa-2">
      <v-card-title class="card-title">Tus datos</v-card-title>
      <v-card-text>
        <form novalidate class="form" @submit.prevent="save">
          <v-text-field
            v-model="name" label="Nombre" autocomplete="name" maxlength="255"
            :error-messages="touched && !nameOk ? 'Escribe tu nombre (mínimo 2 caracteres).' : ''"
          />
          <v-select
            v-model="language" :items="LANGUAGES" label="Idioma de los correos que recibes" item-title="title" item-value="value"
            hint="Los avisos de seguridad llegan en este idioma. El panel está en español." persistent-hint class="mb-4"
          />
          <div aria-live="polite">
            <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3" :text="error" />
            <v-alert v-if="saved" type="success" variant="tonal" density="compact" class="mb-3" :text="saved" />
          </div>
          <v-btn type="submit" color="primary" variant="flat" class="touch" :loading="saving" :disabled="!dirty">Guardar cambios</v-btn>
        </form>
      </v-card-text>
    </v-card>

    <v-card class="pa-2">
      <v-card-title class="card-title">Acceso</v-card-title>
      <v-card-text>
        <dl class="facts">
          <div><dt>Correo de acceso</dt><dd>{{ profile.email }}</dd></div>
          <div>
            <dt>Rol</dt>
            <dd><v-chip v-for="role in profile.roles" :key="role" size="small" variant="tonal" color="primary" class="mr-1">{{ ROLE_LABELS[role] ?? role }}</v-chip></dd>
          </div>
          <div><dt>Cuenta creada</dt><dd>{{ formatDateTime(profile.createdAt) }}</dd></div>
          <div><dt>Contraseña cambiada</dt><dd>{{ profile.passwordChangedAt ? formatDateTime(profile.passwordChangedAt) : 'Sin registro' }}</dd></div>
        </dl>

        <v-alert v-if="profile.pendingEmail" type="info" variant="tonal" density="compact" class="mt-4">
          Esperando que confirmes <strong>{{ profile.pendingEmail.email }}</strong> con el enlace que te enviamos. Vence {{ formatDateTime(profile.pendingEmail.expiresAt) }}.
          <template #append>
            <v-btn size="small" variant="text" class="touch" :loading="cancelling" @click="cancelPending">Cancelar cambio</v-btn>
          </template>
        </v-alert>
        <div aria-live="polite">
          <v-alert v-if="emailNotice && !profile.pendingEmail" type="success" variant="tonal" density="compact" class="mt-4" :text="emailNotice" />
        </div>

        <v-btn variant="tonal" class="touch mt-4" prepend-icon="mdi-email-edit-outline" @click="emailOpen = true">Cambiar mi correo</v-btn>
        <p class="text-caption text-medium-emphasis mt-2">El rol lo cambia una persona superadmin desde «Equipo y roles».</p>
      </v-card-text>
      <email-change-dialog v-model="emailOpen" :current-email="profile.email" @saved="onEmailRequested" />
    </v-card>
  </div>
</template>

<style scoped>
.stack { display: grid; gap: 16px; max-width: 720px; }
.card-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; }
.form { max-width: 440px; }
.facts { display: grid; gap: 12px; margin: 0; }
.facts div { display: grid; grid-template-columns: minmax(0, 170px) minmax(0, 1fr); gap: 8px; align-items: center; }
.facts dt { color: var(--ink-500); font-size: 0.875rem; }
.facts dd { margin: 0; overflow-wrap: anywhere; }
.touch { min-height: 44px; }
@media (max-width: 600px) { .facts div { grid-template-columns: 1fr; gap: 2px; } }
</style>
