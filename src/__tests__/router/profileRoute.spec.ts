import { describe, it, expect, beforeAll } from 'vitest'
import type { RouteRecordNormalized, Router } from 'vue-router'

// The route table itself, read through the router it builds. Imported by a
// path held in a variable, so vue-tsc does not follow it: router/index pulls in
// every view, and through ChatbotView the chat store, which does not type-check
// under tsconfig.vitest.json's narrowed `types` (see router/guard.ts). Vitest
// still loads the real module at run time.
const ROUTER_MODULE = '../../router/index'
const loadRoutes = async (): Promise<RouteRecordNormalized[]> => {
  const { default: router } = (await import(/* @vite-ignore */ ROUTER_MODULE)) as { default: Router }
  return router.getRoutes()
}

// Loading the router pulls in every view, which can take longer than the 5 s
// test timeout when the whole suite runs in parallel. Warm the import once,
// with room to spare, so each case reads the cached module.
beforeAll(async () => {
  await loadRoutes()
}, 60_000)

const metaOf = (routes: RouteRecordNormalized[], path: string) => routes.find((r) => r.path === path)?.meta

describe('src/router/index.ts', () => {
  describe('/profile route meta', () => {
    it('still requires sign-in for the skin profile page', async () => {
      const routes = await loadRoutes()

      expect(metaOf(routes, '/profile')?.requiresAuth).toBe(true)
    })

    it('no longer requires a skin type, so a user without one reaches the page and its empty state', async () => {
      const routes = await loadRoutes()

      expect(metaOf(routes, '/profile')?.requiresSkinType).toBeUndefined()
      expect(metaOf(routes, '/profile')).toEqual({ requiresAuth: true })
    })

    it('leaves every other route with the meta it had before', async () => {
      // The change is for /profile only. Pinned as the whole table, so a stray
      // edit to any other route's meta fails here.
      const routes = await loadRoutes()
      const table = Object.fromEntries(
        routes.filter((r) => r.path !== '/profile').map((r) => [r.path, r.meta]),
      )

      expect(table).toEqual({
        '/': {},
        '/quiz': { requiresAuth: true },
        '/setup-profile': { requiresAuth: true },
        '/auth/callback': {},
        '/error': {},
        '/shelf': { requiresAuth: true },
        '/settings': { requiresAuth: true },
        '/explore': { keepScrollOnQueryChange: true },
        '/routine': { requiresAuth: true },
        '/routine/history': { requiresAuth: true },
        '/chat': { requiresAuth: true },
        '/product/:slug': {},
        '/how-match-works': {},
        '/compare': { requiresAuth: true },
        '/checkin': { requiresAuth: true },
        '/analysis': { requiresAuth: true },
        // Product submissions (feat/22): signed-in pages, and the admin pages -
        // the queue with an optional review id, and the full-screen product edit.
        '/submissions/new': { requiresAuth: true },
        '/submissions': { requiresAuth: true },
        '/admin/submissions/:id?': { requiresAuth: true, requiresAdmin: true },
        '/products/:slug/edit': { requiresAuth: true, requiresAdmin: true, fullScreen: true },
        '/:pathMatch(.*)*': {},
      })
    })

    it('leaves no route requiring a skin type', async () => {
      // The guard keeps its requiresSkinType branch, but /profile was its only
      // user. Recorded so the next route to set it is a deliberate choice.
      const routes = await loadRoutes()

      expect(routes.filter((r) => r.meta.requiresSkinType)).toEqual([])
    })
  })
})
