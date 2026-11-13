<script setup lang="ts">
import TheLogo from "@/components/TheLogo.vue";
import { useAppStore } from "@/store/app";
import { useRoute, useRouter } from "vue-router";
import { useCurrentUserStore } from "@/store/currentUser";
import { useDisplay } from "vuetify";
import { watch } from "vue";

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const currentUser = useCurrentUserStore()
const { mdAndUp } = useDisplay()

// Open on desktop, closed on a phone (and closes after choosing a section there).
store.navigationDrawer = mdAndUp.value
watch(() => route.path, () => { if (!mdAndUp.value) store.navigationDrawer = false })

const sections = [
  { title: 'Inicio', icon: 'mdi-view-dashboard-outline', to: { name: 'MainDashboard' } },
  { title: 'Usuarios', icon: 'mdi-account-multiple-outline', to: { name: 'Users' } },
  { title: 'Confirmaciones', icon: 'mdi-email-check-outline', to: { name: 'RSVP' } },
  { title: 'Recordatorios SMS', icon: 'mdi-message-text-outline', to: { name: 'SMSReminder' } },
  { title: 'Imágenes', icon: 'mdi-image-multiple-outline', to: { name: 'ImagesManager' } },
]

const logout = () => {
  currentUser.logout()
  router.push({ name: 'Home' })
}
</script>

<template>
  <v-navigation-drawer v-model="store.navigationDrawer" color="surface" border="e" :permanent="mdAndUp">
    <div class="px-5 pt-5 pb-6">
      <the-logo />
    </div>

    <v-list nav class="px-3" aria-label="Secciones">
      <v-list-item
        v-for="item in sections"
        :key="item.title"
        :prepend-icon="item.icon"
        :title="item.title"
        :to="item.to"
        color="primary"
        rounded="lg"
      />
    </v-list>

    <template #append>
      <div class="px-5 pb-4 text-caption text-medium-emphasis">{{ store.appVersion }}</div>
    </template>
  </v-navigation-drawer>

  <v-app-bar>
    <v-app-bar-nav-icon v-if="!mdAndUp" aria-label="Abrir el menú" @click="store.navigationDrawer = !store.navigationDrawer" />
    <h1 class="page-title">{{ route.meta?.pageTitle ?? '' }}</h1>
    <v-spacer />
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" append-icon="mdi-chevron-down" class="mr-2">
          <v-avatar color="rose-lighten-4" size="32" class="mr-2">
            <span class="text-caption font-weight-bold">{{ (currentUser.user.email ?? '?').slice(0, 1).toUpperCase() }}</span>
          </v-avatar>
          <span class="d-none d-sm-inline">{{ currentUser.user.email }}</span>
        </v-btn>
      </template>
      <v-list>
        <v-list-item class="text-medium-emphasis" :title="currentUser.user.email" />
        <v-divider />
        <v-list-item prepend-icon="mdi-logout" title="Cerrar sesión" @click="logout()" />
      </v-list>
    </v-menu>
  </v-app-bar>

  <v-main>
    <div class="content">
      <router-view />
    </div>
  </v-main>
</template>

<style scoped>
.page-title { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 500; margin-left: 16px; }
.content { max-width: 1200px; margin: 0 auto; padding: 24px 16px 48px; }
@media (min-width: 960px) { .content { padding: 32px 32px 64px; } }
</style>
