import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'

/** Mounts with the Vuetify plugin from setup.ts and overlays attached to the body (dialogs teleport there). */
export function mountUi<T extends Component>(component: T, options: ComponentMountingOptions<T> = {} as ComponentMountingOptions<T>) {
  return mount(component, { attachTo: document.body, ...options } as ComponentMountingOptions<T>)
}

/** Overlay content lives in the body, not in the wrapper. */
export const bodyText = () => document.body.textContent ?? ''
