<script setup lang="ts">
import TheLoginForm from "@/components/login/TheLoginForm.vue";
import TheLogo from "@/components/TheLogo.vue";
</script>

<template>
  <div class="login">
    <aside class="login__brand" aria-hidden="true">
      <div class="login__brand-inner">
        <p class="login__kicker">Panel de administración</p>
        <h2 class="login__claim">Cada quince y cada boda, bien acompañados.</h2>
        <p class="login__sub">Soporte, planes, pagos y plantillas de Quinvite en un solo lugar.</p>
      </div>
    </aside>

    <main class="login__main">
      <div class="login__panel">
        <the-logo class="mb-10" />
        <h1 class="login__title">Entrar</h1>
        <p class="login__lead">Solo para el equipo de Quinvite.</p>
        <the-login-form />
        <p class="login__foot">© {{ new Date().getFullYear() }} Celebrateitwithme LLC</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login { min-height: 100vh; display: grid; grid-template-columns: 1fr; background: var(--cream-100); }
.login__brand { display: none; background: var(--wine-900); color: #fff; padding: 64px; align-items: flex-end; }
.login__brand-inner { max-width: 440px; }
.login__kicker { font-size: 0.875rem; font-weight: 600; color: var(--gold-300); margin-bottom: 16px; }
.login__claim { font-size: 2.5rem; line-height: 1.15; text-wrap: balance; margin-bottom: 16px; }
.login__sub { font-size: 1.0625rem; line-height: 1.6; color: #f0c6d0; }
.login__main { display: flex; align-items: center; justify-content: center; padding: 32px 16px; }
.login__panel { width: 100%; max-width: 400px; }
.login__title { font-size: 2.25rem; line-height: 1.1; margin-bottom: 8px; }
.login__lead { color: var(--ink-500); margin-bottom: 28px; }
.login__foot { margin-top: 40px; font-size: 0.8125rem; color: var(--ink-500); }
@media (min-width: 960px) {
  .login { grid-template-columns: 1.05fr 1fr; }
  .login__brand { display: flex; }
}
</style>
