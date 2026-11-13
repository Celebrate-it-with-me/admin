<script setup lang="ts">
import TheLogo from "@/components/TheLogo.vue";
import { useAppStore } from "@/store/app";
import { useRoute, useRouter } from "vue-router";
import { useCurrentUserStore } from "@/store/currentUser";
import { useDisplay } from "vuetify";
import { computed, ref, watch } from "vue";
import { visibleNav } from "@/config/navigation";

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const currentUser = useCurrentUserStore()
const { mdAndUp } = useDisplay()

// Open on desktop, closed on a phone (and closes after choosing a section there).
store.navigationDrawer = mdAndUp.value
watch(() => route.path, () => { if (!mdAndUp.value) store.navigationDrawer = false })

// Menu groups; items not built yet are marked and open the "en construcción" page.
const groups = computed(() => visibleNav(currentUser.can).map(g => ({ ...g, items: g.items.map(i => ({ ...i, to: { name: i.key } })) })))

// Only the group of the page you are on is open (it opens by itself when you navigate); you can open another, which folds this one.
const groupOf = (name: unknown) => groups.value.find(g => g.title && g.items.some(i => i.key === name))?.key
const activeGroup = computed(() => groupOf(route.name))
const opened = ref<string[]>(activeGroup.value ? [activeGroup.value] : [])
watch(activeGroup, key => { opened.value = key ? [key] : [] })

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
      <v-list v-model:opened="opened" nav density="compact" class="px-3" open-strategy="single">
        <template v-for="g in groups" :key="g.key">
          <!-- A group without a title (Inicio) is just an item. -->
          <v-list-item
            v-for="item in g.title ? [] : g.items"
            :key="item.key"
            :prepend-icon="item.icon"
            :title="item.title"
            :to="item.to"
            exact
            color="primary"
            rounded="lg"
          />

          <v-list-group v-if="g.title" :value="g.key">
            <template #activator="{ props }">
              <v-list-item v-bind="props" :prepend-icon="g.icon" :title="g.title" rounded="lg" class="group-head" :class="{ 'group-head--active': g.key === activeGroup }" />
            </template>
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
          </v-list-group>
        </template>
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
.group-head { font-weight: 600; }
/* Sub-items: a small step in, so long names and the "Pronto" tag still fit. */
:deep(.v-list-group) { --list-indent-size: 8px; }
:deep(.v-list-group__items .v-list-item) { padding-inline-start: 16px !important; }
:deep(.v-list-item__spacer) { width: 12px; }
.group-head--active :deep(.v-list-item-title), .group-head--active :deep(.v-icon) { color: var(--rose-700); }
.soon-tag { font-size: 0.6875rem; font-weight: 700; color: #7a5c1e; background: #f6ecd4; border-radius: 6px; padding: 1px 6px; }
.page-title { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 500; margin-left: 16px; }
.content { max-width: 1200px; margin: 0 auto; padding: 24px 16px 48px; }
@media (min-width: 960px) { .content { padding: 32px 32px 64px; } }
</style>
