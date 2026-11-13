<script setup lang="ts">
import { useCurrentUserStore } from "@/store/currentUser";

const currentUser = useCurrentUserStore()

const shortcuts = [
  { title: 'Usuarios', text: 'Busca cuentas y revisa sus accesos.', icon: 'mdi-account-multiple-outline', to: { name: 'Users' } },
  { title: 'Confirmaciones', text: 'Invitados y respuestas de los eventos heredados.', icon: 'mdi-email-check-outline', to: { name: 'RSVP' } },
  { title: 'Recordatorios SMS', text: 'Envíos manuales a los invitados.', icon: 'mdi-message-text-outline', to: { name: 'SMSReminder' } },
  { title: 'Imágenes', text: 'Carpetas y archivos subidos.', icon: 'mdi-image-multiple-outline', to: { name: 'ImagesManager' } },
]
</script>

<template>
  <section>
    <h2 class="greeting">Hola{{ currentUser.user.name ? `, ${currentUser.user.name}` : '' }}</h2>
    <p class="text-medium-emphasis mb-8">¿Qué necesitas hacer hoy?</p>

    <v-row>
      <v-col v-for="item in shortcuts" :key="item.title" cols="12" sm="6" lg="3">
        <v-card :to="item.to" class="pa-5 h-100" hover>
          <v-avatar color="rose-lighten-5" size="44" class="mb-4">
            <v-icon :icon="item.icon" color="primary" />
          </v-avatar>
          <h3 class="card-title mb-1">{{ item.title }}</h3>
          <p class="text-body-2 text-medium-emphasis">{{ item.text }}</p>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<style scoped>
.greeting { font-size: 2rem; margin-bottom: 4px; }
.card-title { font-size: 1.125rem; overflow-wrap: anywhere; hyphens: auto; }
</style>
