# Módulos de Operación

Una carpeta por módulo: `routes.ts`, `views/`, `components/`, `services/` (llamadas a la API) y `types.ts` si hace falta.

- Un módulo edita **solo su carpeta**. Lo compartido (`layouts/`, `config/navigation.ts`, `types/`, `store/`) solo se toca si el módulo de verdad lo necesita, y con el cambio más pequeño posible.
- Cada ruta lleva `meta.permission` (ver `App\Support\AdminPermissions` en la API) y sus textos van en español.
- Mientras un módulo no registre la ruta con el nombre de su ítem del menú, se muestra "En construcción". Al registrarla, la etiqueta "Pronto" desaparece sola.
- Componentes de marca y gráficas: `src/components/dashboard/`, `src/styles/brand.css`, `ReasonDialog` para pedir motivo en acciones sensibles.
