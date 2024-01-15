<script setup>
import TheLogo from "@/components/TheLogo.vue";
import { useAppStore } from "@/store/app";
import { useRoute, useRouter } from "vue-router";
import { useCurrentUserStore } from "@/store/currentUser";

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const currentUser = useCurrentUserStore()

const logout = () => {
  currentUser.logout()
  router.push({ name: 'Home' })
}

</script>
<template>
  <v-navigation-drawer v-model="store.navigationDrawer" theme="dark" color="#09203f">
    <div class="ml-5 mt-3 mb-6" style="font-size: 30px">
      <the-logo />
    </div>

    <v-list nav="">
      <v-list-item
        prepend-icon="mdi-account-group"
        title="Users"
        value="Users"
        :to="{name: 'Users'}"
      >
      </v-list-item>
      <v-list-item
        prepend-icon="mdi-account-group"
        title="Save the Day"
        value="std"
      >
      </v-list-item>
      <v-list-item
        prepend-icon="mdi-account-group"
        title="RSVP"
        value="rsvp"
        :to="{name: 'RSVP'}"
      >
      </v-list-item>
    </v-list>
    <template v-slot:append>
      <div class="px-3 pb-2 text-caption">{{ store.appVersion }}</div>
    </template>
  </v-navigation-drawer>

  <v-app-bar>
    <v-app-bar-nav-icon
      @click="store.navigationDrawer = !store.navigationDrawer"
    >
    </v-app-bar-nav-icon>

    <v-toolbar-title>{{ route.meta?.pageTitle ?? '' }}</v-toolbar-title>
    <v-spacer />
    <v-menu transition="scale-transition">
      <template v-slot:activator="{ props }">
        <v-btn color="#366182" v-bind="props" icon="mdi-account" variant="tonal" />
      </template>
      <v-list class="settings-menu">
        <v-list-item>
          {{ currentUser.user.email }}
        </v-list-item>
        <v-divider />
        <v-list-item>
          <v-list-item-title>
            <router-link :to="{ name: 'MainDashboard'}" disabled>Account Settings</router-link>
          </v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>
            Administration Settings
          </v-list-item-title>
        </v-list-item>
        <v-list-item
          prepend-icon="mdi-power"
          title="Logout"
          value="logout"
          @click="logout()"
        >
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>

  <v-main class="body-background">
    <v-container fluid>
      <main class="content-background">
        <v-container>
          <router-view />
        </v-container>
      </main>
    </v-container>
  </v-main>
</template>
<style scoped>
.v-container {
  min-height: 500px
}

.v-main {
  flex: 1 0 auto;
  max-width: 100%;
  transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0.25rem;
  height: 100%;
  min-height: 500px;
}

.content-background {
  background-color: #fff;
}

.nav-background {
  background: -webkit-linear-gradient(45deg, #09203f 0%, #366182 100%);
  background-image: linear-gradient(45deg, #09203f 0%, #366182 100%);
}

.body-background {
  background-color: #eeeeee;
}

a,
a:visited,
a:hover {
  color: #fff;
  text-decoration: none;
}

.settings-menu .v-list-item-title a,
.settings-menu .v-list-item-title a:visited,
.settings-menu .v-list-item-title a:hover {
  color: #000000;
  text-decoration: none;
}

</style>
