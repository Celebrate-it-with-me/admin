import type { RouteRecordRaw } from 'vue-router'
import events from './events/routes'
import users from './users/routes'
import support from './support/routes'
import moderation from './moderation/routes'
import revenue from './revenue/routes'
import health from './health/routes'

/**
 * The Operation modules, one folder each (src/modules/<name>/): routes.ts, views/, components/, services/.
 * A module owns its folder; shared things (layout, navigation, types) are edited only when the module really needs it.
 */
export const moduleRoutes: RouteRecordRaw[] = [...events, ...users, ...support, ...moderation, ...revenue, ...health]

/** Names of the routes that already have a real screen: the menu stops calling them "en construcción". */
export const builtKeys = new Set(moduleRoutes.map(route => route.name).filter((name): name is string => typeof name === 'string'))
