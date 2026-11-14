<script setup lang="ts">
import TheLogo from '@/components/TheLogo.vue'

defineProps<{ title: string; lead?: string }>()
</script>

<template>
  <div class="shell">
    <aside class="shell__brand" aria-hidden="true">
      <div class="shell__brand-inner">
        <p class="shell__kicker">Panel de administración</p>
        <h2 class="shell__claim">Cada quince y cada boda, bien acompañados.</h2>
        <p class="shell__sub">Soporte, planes, pagos y plantillas de Quinvite en un solo lugar.</p>
      </div>
    </aside>

    <main class="shell__main">
      <div class="shell__panel">
        <TheLogo class="mb-10" />
        <h1 class="shell__title" tabindex="-1">{{ title }}</h1>
        <p v-if="lead" class="shell__lead">{{ lead }}</p>
        <slot />
        <p class="shell__foot">© {{ new Date().getFullYear() }} Celebrateitwithme LLC</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; display: grid; grid-template-columns: 1fr; background: var(--cream-100); }
.shell__brand {
  display: none; color: #fff; padding: 64px; align-items: flex-end;
  background: #2f020d url('/login-bg.webp') top center / 100% auto no-repeat;
}
.shell__brand-inner { max-width: 440px; }
.shell__kicker { font-size: 0.875rem; font-weight: 600; color: var(--gold-300); margin-bottom: 16px; }
.shell__claim { font-size: 2.5rem; line-height: 1.15; text-wrap: balance; margin-bottom: 16px; }
.shell__sub { font-size: 1.0625rem; line-height: 1.6; color: #f0c6d0; }
.shell__main { display: flex; align-items: center; justify-content: center; padding: 32px 16px; }
.shell__panel { width: 100%; max-width: 400px; min-width: 0; }
.shell__title { font-size: 2.25rem; line-height: 1.1; margin-bottom: 8px; text-wrap: balance; outline: none; }
.shell__lead { color: var(--ink-500); margin-bottom: 28px; }
.shell__foot { margin-top: 40px; font-size: 0.8125rem; color: var(--ink-500); }
@media (max-width: 480px) { .shell__title { font-size: 1.875rem; } }
@media (min-width: 960px) {
  .shell { grid-template-columns: 1.05fr 1fr; }
  .shell__brand { display: flex; }
}
</style>
