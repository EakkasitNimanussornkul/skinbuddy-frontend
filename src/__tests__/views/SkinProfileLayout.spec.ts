import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// The requests are mocked; pickTopRecommendations and the rest of the products
// module stay real.
vi.mock('../../api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/products')>()),
  searchProducts: vi.fn(),
}))
vi.mock('../../api/authApi', () => ({
  updateUserSkinType: vi.fn(),
}))

import { searchProducts } from '../../api/products'
import SkinProfileView from '../../views/SkinProfileView.vue'
import { useAuthStore } from '../../stores/auth'

// Feature #2 - Take skinquiz. Where the profile page's actions ("Doesn't sound
// like you? Retake the quiz", "Ask SkinBuddy AI about it" and the "not a
// diagnosis" line) sit at each width. The approved phone design puts them at
// the very end, after the recommendations; the desktop design keeps them in
// the left column under the type.
//
// jsdom applies no CSS, so these cards read two things it can see: the
// document order, which is the order a phone shows because nothing on the page
// is moved with a CSS `order` class (pinned below), and the Tailwind display
// classes (`hidden`, `lg:hidden`, `lg:flex`) that decide which copy each width
// shows. What is actually on screen at each width is for a browser check.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field.

const mounted: VueWrapper[] = []

const mountProfile = async (skinType = 'OSNT') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', component: SkinProfileView },
      { path: '/chat', component: { template: '<div />' } },
      { path: '/quiz', component: { template: '<div />' } },
    ],
  })
  await router.push('/profile')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: skinType })

  const wrapper = mount(SkinProfileView, {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
  })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

const LG_DISPLAY = /^lg:(block|flex|grid|inline|inline-block|inline-flex|contents)$/

/**
 * Whether an element is displayed at a width, read off the Tailwind display
 * classes on it and its ancestors: below lg `hidden` hides it; from lg
 * `lg:hidden` hides it, and `hidden` does too unless an lg display class
 * brings it back.
 */
const shownAt = (el: Element, width: 'phone' | 'lg') => {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const classes = [...node.classList]
    if (width === 'phone' && classes.includes('hidden')) return false
    if (width === 'lg') {
      if (classes.includes('lg:hidden')) return false
      if (classes.includes('hidden') && !classes.some((c) => LG_DISPLAY.test(c))) return false
    }
  }
  return true
}

const report = (wrapper: VueWrapper) => wrapper.get('[data-testid="profile-report"]')

/** The links and buttons a keyboard meets at a width, in document order, by their text. */
const controlsAt = (wrapper: VueWrapper, width: 'phone' | 'lg') =>
  report(wrapper)
    .findAll('a, button')
    .filter((c: DOMWrapper<Element>) => shownAt(c.element, width))
    .map((c) => c.text().trim())

const RETAKE = "Doesn't sound like you? Retake the quiz"
const ASK = 'Ask SkinBuddy AI about it'
const NOT_DIAGNOSIS = 'A starting point for your routine, not a diagnosis. For a skin condition, see a dermatologist.'

const follows = (earlier: Element, later: Element) =>
  (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

describe('src/views/SkinProfileView.vue (layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(searchProducts).mockResolvedValue([])
  })

  afterEach(() => {
    mounted.splice(0).forEach((w) => w.unmount())
  })

  describe('where the actions sit at each width', () => {
    it('puts the actions at the very end on a phone, after the recommendations, as the last two controls', async () => {
      const { wrapper } = await mountProfile()
      const phone = wrapper.get('[data-testid="profile-actions-phone"]')

      expect(shownAt(phone.element, 'phone')).toBe(true)
      expect(follows(wrapper.get('[data-testid="profile-recommendations"]').element, phone.element)).toBe(true)
      expect(controlsAt(wrapper, 'phone').slice(-2)).toEqual([RETAKE, ASK])
      // Nothing shown on a phone comes after it.
      const after = report(wrapper)
        .findAll('*')
        .filter((el) => follows(phone.element, el.element) && !phone.element.contains(el.element))
      expect(after.filter((el) => shownAt(el.element, 'phone'))).toEqual([])
    })

    it('shows the phone sections in the approved order: type, traits, needs, routine, common concerns, recommendations, actions', async () => {
      const { wrapper } = await mountProfile()
      const blocks = [
        '[aria-label="Your skin type"]',
        '[aria-labelledby="profile-traits-heading"]',
        '[aria-labelledby="profile-needs-heading"]',
        '[aria-labelledby="profile-routine-heading"]',
        '[aria-labelledby="profile-concerns-heading"]',
        '[data-testid="profile-recommendations"]',
        '[data-testid="profile-actions-phone"]',
      ].map((selector) => wrapper.get(selector).element)

      blocks.forEach((el) => expect(shownAt(el, 'phone')).toBe(true))
      for (let i = 1; i < blocks.length; i += 1) expect(follows(blocks[i - 1]!, blocks[i]!)).toBe(true)
    })

    it('moves nothing with a CSS order class, so the phone order is the document order a keyboard and screen reader follow', async () => {
      const { wrapper } = await mountProfile()

      const reordered = report(wrapper)
        .findAll('*')
        .filter((el) => [...el.element.classList].some((c) => /^(\w+:)*-?order-/.test(c)))

      expect(reordered).toEqual([])
    })

    it('keeps the actions in the left column from lg, straight after the type card', async () => {
      const { wrapper } = await mountProfile()
      const desktop = wrapper.get('[data-testid="profile-actions-desktop"]')
      const typeCard = wrapper.get('[aria-label="Your skin type"]')

      expect(shownAt(desktop.element, 'lg')).toBe(true)
      expect(typeCard.element.nextElementSibling).toBe(desktop.element)
      expect(controlsAt(wrapper, 'lg').slice(0, 2)).toEqual([RETAKE, ASK])
    })

    it('shows one set of the actions per width: the phone set is hidden from lg and the desktop set below it', async () => {
      const { wrapper } = await mountProfile()
      const phone = wrapper.get('[data-testid="profile-actions-phone"]').element
      const desktop = wrapper.get('[data-testid="profile-actions-desktop"]').element

      expect(shownAt(phone, 'lg')).toBe(false)
      expect(shownAt(desktop, 'phone')).toBe(false)
      for (const width of ['phone', 'lg'] as const) {
        const controls = controlsAt(wrapper, width)
        expect(controls.filter((t) => t === RETAKE)).toHaveLength(1)
        expect(controls.filter((t) => t === ASK)).toHaveLength(1)
        const lines = report(wrapper).findAll('p').filter((p) => p.text() === NOT_DIAGNOSIS && shownAt(p.element, width))
        expect(lines).toHaveLength(1)
      }
    })

    it('makes both copies work the same: each retake link goes to the quiz and each ask button opens the chat', async () => {
      for (const id of ['profile-actions-phone', 'profile-actions-desktop']) {
        const { wrapper, router } = await mountProfile()
        const block = wrapper.get(`[data-testid="${id}"]`)

        expect(block.get('a').attributes('href')).toBe('/quiz')
        expect(block.get('a').text()).toBe(RETAKE)
        await block.get('button').trigger('click')
        await flushPromises()

        expect(router.currentRoute.value.path).toBe('/chat')
      }
    })
  })
})
