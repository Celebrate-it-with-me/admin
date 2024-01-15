<script setup lang="ts">
import TheLoginForm from "@/components/login/TheLoginForm.vue";

</script>

<template>
  <v-container class="align-center text-center fill-height page" fluid>
    <v-responsive class="align-center text-center fill-height">
      <div class="text-body-2 font-weight-light mb-n1">Welcome to</div>

      <h1 class="text-h2 font-weight-bold">Celebrate it </h1>

      <div class="text-body-2 font-weight-light mb-n1">with me</div>

      <div class="py-6"></div>

      <v-row class="d-flex align-center justify-center">
        <v-col cols="12" sm="8" md="4">
          <the-login-form />
        </v-col>
      </v-row>
    </v-responsive>
  </v-container>
</template>

<style scoped>
.page {
  background: #09203f;
  background: -webkit-linear-gradient(45deg, #09203f 0%, #537895 100%);
  background-image: linear-gradient(45deg, #09203f 0%, #537895 100%);
  color: #051A36FF;
}
</style>
