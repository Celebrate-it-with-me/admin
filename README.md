# default

## Project setup

```
# yarn
yarn

# npm
npm install

# pnpm
pnpm install

# bun
bun install
```

### Compiles and hot-reloads for development

```
# yarn
yarn dev

# npm
npm run dev

# pnpm
pnpm dev

# bun
bun run dev
```

### Compiles and minifies for production

```
# yarn
yarn build

# npm
npm run build

# pnpm
pnpm build

# bun
bun run build
```

### Customize configuration

See [Configuration Reference](https://vitejs.dev/config/).

### Unit tests (Vitest)

```
npm run test:unit          # one run, same as CI
npm run test:unit:watch    # re-runs on save
docker exec cwm_admin npm run test:unit
```

- Vitest 5 + @vue/test-utils + jsdom, configured in the `test` key of `vite.config.ts`. Same stack as `cwm_app`.
- Tests live next to the code: `src/**/*.test.ts`. Pure logic (`logic.ts`, composables, stores) first; mount components only when they have behaviour.
- `src/test/setup.ts` registers Vuetify and the jsdom stubs it needs; `src/test/mount.ts` has `mountUi` (dialogs teleport to `document.body`, so assert on the body).
- No network: mock `@/services/axios` with `vi.hoisted` + `vi.mock`. A `vi.mock` factory cannot use outer variables unless they come from `vi.hoisted`.
- Avoid snapshots; assert on text, classes, emitted events and calls.
- Needs Node 26 (the container has it). After pulling a change that adds dependencies: `docker restart cwm_admin`.
