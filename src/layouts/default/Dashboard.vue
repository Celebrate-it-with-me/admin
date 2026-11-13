<script setup lang="ts">
import TheLogo from "@/components/TheLogo.vue";
import { useAppStore } from "@/store/app";
import { useRoute, useRouter } from "vue-router";
import { useCurrentUserStore } from "@/store/currentUser";
import { useDisplay } from "vuetify";
import { watch } from "vue";
import { NAV } from "@/config/navigation";

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const currentUser = useCurrentUserStore()
const { mdAndUp } = useDisplay()

// Open on desktop, closed on a phone (and closes after choosing a section there).
store.navigationDrawer = mdAndUp.value
watch(() => route.path, () => { if (!mdAndUp.value) store.navigationDrawer = false })

// Menu groups; items not built yet are marked and open the "en construcción" page.
const groups = NAV.map(g => ({ ...g, items: g.items.map(i => ({ ...i, to: { name: i.key } })) }))

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

    <nav class="menu" aria-label="Secciones">
      <v-list v-for="g in groups" :key="g.key" nav density="compact" class="px-3 group" :aria-label="g.title || 'Principal'">
        <v-list-subheader v-if="g.title" class="group__title">{{ g.title }}</v-list-subheader>
        <v-list-item
          v-for="item in g.items"
          :key="item.key"
          :prepend-icon="item.icon"
          :to="item.to"
          color="primary"
          rounded="lg"
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
          <template v-if="item.soon" #append>
            <span class="soon-tag" title="En construcción">Pronto</span>
          </template>
        </v-list-item>
      </v-list>
    </nav>

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
.menu { padding-bottom: 16px; }
.group + .group { margin-top: 4px; }
.group__title { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-500); min-height: 32px; }
.soon-tag { font-size: 0.6875rem; font-weight: 700; color: #7a5c1e; background: #f6ecd4; border-radius: 6px; padding: 1px 6px; }
.page-title { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 500; margin-left: 16px; }
.content { max-width: 1200px; margin: 0 auto; padding: 24px 16px 48px; }
@media (min-width: 960px) { .content { padding: 32px 32px 64px; } }
</style>
