import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

// The only network call on this screen. Mocked so both outcomes - the save
// succeeding and the save rejecting - can be driven deliberately.
vi.mock('../../api/authApi', () => ({
  updateUserSkinType: vi.fn(),
}))

import { updateUserSkinType } from '../../api/authApi'
import SkinTypeLanding from '../../views/SkinTypeLanding.vue'
import ExpressSkinSelectorModal from '../../components/Quiz/ExpressSkinSelectorModal.vue'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const SAVE_FAILED_TOAST = 'Failed to save your skin profile. Please try again.'

// The composable holds module-level state shared by every caller, so the real
// one is used and read back rather than mocked. It has to be emptied between
// cases for the same reason.
const { toasts } = useToast()

interface Harness {
  wrapper: VueWrapper
  router: Router
  push: ReturnType<typeof vi.spyOn>
  auth: ReturnType<typeof useAuthStore>
}

/**
 * Mount the landing page on a real memory router at `path`, with a fresh Pinia.
 *
 * The router is real rather than mocked because both units under test read
 * route.query.redirect, which is the whole point of the cases below - a stubbed
 * $route would let a test pass while the param was being read from the wrong
 * place. push is spied after the initial navigation so the setup push is not
 * counted, and the spy leaves the real implementation in place.
 */
const mountLanding = async (path = '/skin-type'): Promise<Harness> => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/skin-type', component: SkinTypeLanding },
      { path: '/quiz', component: { template: '<div />' } },
      { path: '/shelf', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })

  await router.push(path)
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()

  const push = vi.spyOn(router, 'push')

  const wrapper = mount(SkinTypeLanding, {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
  })

  return { wrapper, router, push, auth }
}

const buttonWith = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

const confirmType = async (wrapper: VueWrapper, type: string) => {
  wrapper.findComponent(ExpressSkinSelectorModal).vm.$emit('confirm', type)
  await flushPromises()
}

const modalIsOpen = (wrapper: VueWrapper) =>
  wrapper.findComponent(ExpressSkinSelectorModal).props('isOpen')

describe('src/views/SkinTypeLanding.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Cleared before any store is built: useAuthStore seeds its token and user
    // from localStorage at construction, so a leftover token from an earlier
    // case would silently authenticate the signed-out one.
    localStorage.clear()
    toasts.value.splice(0)
  })

  describe('handleExpressConfirm()', () => {
    it('saves the type, updates the session and returns the user to the carried redirect', async () => {
      vi.mocked(updateUserSkinType).mockResolvedValue({ skin_type: 'OSPW' })
      const { wrapper, push, auth } = await mountLanding('/skin-type?redirect=/profile')
      auth.setAuth('token-1', { id: 'u-1', display_name: 'Tee' })

      // Opened first so that closing it is an observable change rather than the
      // state it already had.
      await buttonWith(wrapper, 'I already know').trigger('click')
      expect(modalIsOpen(wrapper)).toBe(true)

      await confirmType(wrapper, 'OSPW')

      expect(updateUserSkinType).toHaveBeenCalledWith('OSPW')
      expect(auth.user.skin_type).toBe('OSPW')
      expect(modalIsOpen(wrapper)).toBe(false)
      expect(push).toHaveBeenCalledWith('/profile')
    })

    it('sends the user to the shelf when no redirect was carried', async () => {
      // The first-login flow from AuthCallbackView arrives with no redirect, so
      // the default is the destination that flow was always meant to reach.
      vi.mocked(updateUserSkinType).mockResolvedValue({ skin_type: 'DRNT' })
      const { wrapper, push, auth } = await mountLanding('/skin-type')
      auth.setAuth('token-1', { id: 'u-1' })

      await confirmType(wrapper, 'DRNT')

      expect(push).toHaveBeenCalledWith('/shelf')
    })

    it('reports the failure and calls nothing when no user is authenticated locally', async () => {
      const { wrapper, push } = await mountLanding('/skin-type?redirect=/profile')

      await buttonWith(wrapper, 'I already know').trigger('click')
      await confirmType(wrapper, 'OSPW')

      // The guard runs before the request, so an unauthenticated confirm must
      // not reach the network at all.
      expect(updateUserSkinType).not.toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0]!.message).toBe(SAVE_FAILED_TOAST)
      expect(toasts.value[0]!.type).toBe('error')
      // Left open: the handler only closes on success, so the user keeps their
      // selection and can retry.
      expect(modalIsOpen(wrapper)).toBe(true)
    })

    it('reports the failure and leaves the session untouched when the save is rejected', async () => {
      vi.mocked(updateUserSkinType).mockRejectedValue(
        Object.assign(new Error('Request failed with status code 422'), {
          response: { status: 422, data: { detail: 'Invalid skin type code.' } },
        }),
      )
      const { wrapper, push, auth } = await mountLanding('/skin-type?redirect=/profile')
      auth.setAuth('token-1', { id: 'u-1' })

      await buttonWith(wrapper, 'I already know').trigger('click')
      await confirmType(wrapper, 'OSPW')

      expect(updateUserSkinType).toHaveBeenCalledWith('OSPW')
      // The local session must not record a type the server refused to store,
      // or the app would show a profile the backend disagrees with.
      expect(auth.user.skin_type).toBeUndefined()
      expect(push).not.toHaveBeenCalled()
      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0]!.message).toBe(SAVE_FAILED_TOAST)
      expect(toasts.value[0]!.type).toBe('error')
      expect(modalIsOpen(wrapper)).toBe(true)
    })
  })

  describe('goToQuiz()', () => {
    it('carries the redirect through to the quiz as a query param', async () => {
      // Without this a user sent here from /profile finishes the quiz and lands
      // on home instead of the page the guard pulled them away from.
      const { wrapper, push } = await mountLanding('/skin-type?redirect=/profile')

      await buttonWith(wrapper, 'Find my skin type').trigger('click')

      expect(push).toHaveBeenCalledWith({ path: '/quiz', query: { redirect: '/profile' } })
    })

    it('navigates to the plain quiz route when no redirect was carried', async () => {
      const { wrapper, push } = await mountLanding('/skin-type')

      await buttonWith(wrapper, 'Find my skin type').trigger('click')

      expect(push).toHaveBeenCalledWith('/quiz')
    })
  })
})
