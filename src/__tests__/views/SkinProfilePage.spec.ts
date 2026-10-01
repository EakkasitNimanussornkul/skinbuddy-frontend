import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
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
import { updateUserSkinType } from '../../api/authApi'
import SkinProfileView from '../../views/SkinProfileView.vue'
import TypologyComparisonModal from '../../components/Quiz/TypologyComparisonModal.vue'
import ExpressSkinSelectorModal from '../../components/Quiz/ExpressSkinSelectorModal.vue'
import SkinTypeRecommendationsWidget from '../../components/Shared/SkinTypeRecommendationsWidget.vue'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import { skinProfiles } from '../../data/skinprofiles'
import { typologyDetails } from '../../data/typologydata'

const { toasts } = useToast()
const mounted: VueWrapper[] = []

/**
 * Mount /profile for a user whose stored skin_type is `skinType`. Attached to
 * the document so focus can be read off document.activeElement. Teleport is
 * stubbed, so the comparison sheet and the type selector render in place; the
 * recommendations widget renders for real.
 */
const mountProfile = async (skinType: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', component: SkinProfileView },
      { path: '/chat', component: { template: '<div />' } },
      { path: '/quiz', component: { template: '<div />' } },
      { path: '/explore', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  await router.push('/profile')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setAuth('token-1', { id: 'u-1', skin_type: skinType })

  const wrapper = mount(SkinProfileView, {
    attachTo: document.body,
    global: { plugins: [pinia, router], stubs: { teleport: true } },
  })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

const byTestId = (wrapper: VueWrapper, id: string) => wrapper.findAll(`[data-testid="${id}"]`)
const listed = (wrapper: VueWrapper, id: string) =>
  wrapper.get(`[data-testid="${id}"]`).findAll('li').map((li) => li.text())
const traitCards = (wrapper: VueWrapper) => byTestId(wrapper, 'trait-card')
const sheet = (wrapper: VueWrapper) => wrapper.findComponent(TypologyComparisonModal)
const selector = (wrapper: VueWrapper) => wrapper.findComponent(ExpressSkinSelectorModal)
const tabs = (wrapper: VueWrapper) => wrapper.findAll('[role="tab"]')
const pressEscape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

describe('src/views/SkinProfileView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    toasts.value.splice(0)
    vi.mocked(searchProducts).mockResolvedValue([])
  })

  afterEach(() => {
    mounted.splice(0).forEach((w) => w.unmount())
  })

  describe('profile sections (render)', () => {
    const CODE = 'OSNT'
    const profile = skinProfiles[CODE]!

    it('shows the type card: the code, the maintenance level, the subtitle as the page heading, the description and the quote', async () => {
      const { wrapper } = await mountProfile(CODE)

      expect(wrapper.get('[data-testid="profile-code"]').text()).toBe(CODE)
      expect(wrapper.get('[data-testid="maintenance"]').text()).toBe(`${profile.maintenanceLevel} maintenance`)
      expect(wrapper.get('h1').text()).toBe(profile.subtitle)
      expect(wrapper.text()).toContain(profile.desc)
      expect(wrapper.get('[data-testid="profile-quote"]').text()).toBe(profile.quote)
    })

    it('shows one card per trait with its letter, name, first point and opposite, in code order', async () => {
      const { wrapper } = await mountProfile(CODE)

      expect(
        traitCards(wrapper).map((card) => ({
          letter: card.get('[data-testid="trait-letter"]').text(),
          line: card.get('[data-testid="trait-line"]').text(),
          opposite: card.get('[data-testid="trait-opposite"]').text(),
        })),
      ).toEqual([
        { letter: 'O', line: typologyDetails['O']!.points[0], opposite: 'vs Dry' },
        { letter: 'S', line: typologyDetails['S']!.points[0], opposite: 'vs Resistant' },
        { letter: 'N', line: typologyDetails['N']!.points[0], opposite: 'vs Pigmented' },
        { letter: 'T', line: typologyDetails['T']!.points[0], opposite: 'vs Wrinkle-Prone' },
      ])
    })

    it('makes each trait card a real button that announces it opens a dialog', async () => {
      const { wrapper } = await mountProfile(CODE)

      for (const card of traitCards(wrapper)) {
        expect(card.element.tagName).toBe('BUTTON')
        expect(card.attributes('type')).toBe('button')
        expect(card.attributes('aria-haspopup')).toBe('dialog')
      }
    })

    it('shows what the skin needs: the focus title and description, and the dos under "Look for"', async () => {
      const { wrapper } = await mountProfile(CODE)

      expect(wrapper.text()).toContain(profile.focusTitle)
      expect(wrapper.text()).toContain(profile.focusDesc)
      expect(wrapper.text()).toContain('Look for')
      expect(listed(wrapper, 'look-for')).toEqual(profile.dos)
    })

    it('lists the donts under "Best avoided", the heading that replaced "Avoid Inside"', async () => {
      const { wrapper } = await mountProfile(CODE)

      expect(wrapper.text()).toContain('Best avoided')
      expect(wrapper.text()).not.toContain('Avoid Inside')
      expect(listed(wrapper, 'best-avoided')).toEqual(profile.donts)
    })

    it('shows both routines side by side for the desktop layout, morning first', async () => {
      const { wrapper } = await mountProfile(CODE)

      expect(listed(wrapper, 'routine-column-am').map((t) => t.replace(/^\d+/, ''))).toEqual(profile.routineBlueprint.am)
      expect(listed(wrapper, 'routine-column-pm').map((t) => t.replace(/^\d+/, ''))).toEqual(profile.routineBlueprint.pm)
    })

    it('shows the cleanser, moisturiser and sunscreen textures', async () => {
      const { wrapper } = await mountProfile(CODE)
      const textures = wrapper.get('[data-testid="textures"]')

      expect(textures.findAll('dt').map((d) => d.text())).toEqual(['Cleanser', 'Moisturiser', 'Sunscreen'])
      expect(textures.findAll('dd').map((d) => d.text())).toEqual([
        profile.idealTextures.cleanser,
        profile.idealTextures.moisturizer,
        profile.idealTextures.sunscreen,
      ])
    })

    it('lists the common concerns in their own card on a phone and inside the needs card from lg', async () => {
      const { wrapper } = await mountProfile(CODE)

      expect(wrapper.text()).toContain('Common for your type')
      expect(listed(wrapper, 'concerns')).toEqual(profile.commonConcerns)
      expect(listed(wrapper, 'concerns-desktop')).toEqual(profile.commonConcerns)
    })

    it('hands the stored code to the recommendations widget', async () => {
      const { wrapper } = await mountProfile(CODE)

      expect(wrapper.findComponent(SkinTypeRecommendationsWidget).props('userSkinType')).toBe(CODE)
      expect(searchProducts).toHaveBeenCalledTimes(1)
    })

    it('ends with the line saying this is a starting point, not a diagnosis', async () => {
      const { wrapper } = await mountProfile(CODE)

      expect(wrapper.text()).toContain('A starting point for your routine, not a diagnosis. For a skin condition, see a dermatologist.')
    })
  })

  describe('routine tabs', () => {
    const profile = skinProfiles['DSPW']!
    const steps = (wrapper: VueWrapper) => listed(wrapper, 'routine-steps').map((t) => t.replace(/^\d+/, ''))

    it('starts on Morning, selected and in the tab order, with the morning steps showing', async () => {
      const { wrapper } = await mountProfile('DSPW')

      expect(tabs(wrapper).map((t) => t.text())).toEqual(['Morning', 'Evening'])
      expect(tabs(wrapper).map((t) => t.attributes('aria-selected'))).toEqual(['true', 'false'])
      expect(tabs(wrapper).map((t) => t.attributes('tabindex'))).toEqual(['0', '-1'])
      expect(steps(wrapper)).toEqual(profile.routineBlueprint.am)
    })

    it('switches to the evening steps when Evening is clicked, and moves the selection with it', async () => {
      const { wrapper } = await mountProfile('DSPW')

      await tabs(wrapper)[1]!.trigger('click')

      expect(steps(wrapper)).toEqual(profile.routineBlueprint.pm)
      expect(tabs(wrapper).map((t) => t.attributes('aria-selected'))).toEqual(['false', 'true'])
      expect(tabs(wrapper).map((t) => t.attributes('tabindex'))).toEqual(['-1', '0'])
    })

    it('labels the panel with the selected tab, and each tab controls the panel', async () => {
      const { wrapper } = await mountProfile('DSPW')
      const panel = wrapper.get('[role="tabpanel"]')

      expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBe('Time of day')
      expect(tabs(wrapper).map((t) => t.attributes('aria-controls'))).toEqual([panel.attributes('id'), panel.attributes('id')])
      expect(panel.attributes('aria-labelledby')).toBe(tabs(wrapper)[0]!.attributes('id'))

      await tabs(wrapper)[1]!.trigger('click')

      expect(panel.attributes('aria-labelledby')).toBe(tabs(wrapper)[1]!.attributes('id'))
    })

    it('moves to the next tab with the right arrow, selecting and focusing it', async () => {
      const { wrapper } = await mountProfile('DSPW')

      await tabs(wrapper)[0]!.trigger('keydown', { key: 'ArrowRight' })

      expect(steps(wrapper)).toEqual(profile.routineBlueprint.pm)
      expect(document.activeElement).toBe(tabs(wrapper)[1]!.element)
    })

    it('wraps round with the arrows: right from Evening and left from Morning', async () => {
      const { wrapper } = await mountProfile('DSPW')

      await tabs(wrapper)[0]!.trigger('keydown', { key: 'ArrowLeft' })
      expect(tabs(wrapper)[1]!.attributes('aria-selected')).toBe('true')
      expect(document.activeElement).toBe(tabs(wrapper)[1]!.element)

      await tabs(wrapper)[1]!.trigger('keydown', { key: 'ArrowRight' })
      expect(tabs(wrapper)[0]!.attributes('aria-selected')).toBe('true')
      expect(document.activeElement).toBe(tabs(wrapper)[0]!.element)
    })

    it('jumps to the last tab with End and the first with Home', async () => {
      const { wrapper } = await mountProfile('DSPW')

      await tabs(wrapper)[0]!.trigger('keydown', { key: 'End' })
      expect(tabs(wrapper)[1]!.attributes('aria-selected')).toBe('true')

      await tabs(wrapper)[1]!.trigger('keydown', { key: 'Home' })
      expect(tabs(wrapper)[0]!.attributes('aria-selected')).toBe('true')
    })

    it('ignores other keys, leaving the selection where it was', async () => {
      const { wrapper } = await mountProfile('DSPW')

      await tabs(wrapper)[0]!.trigger('keydown', { key: 'ArrowDown' })

      expect(tabs(wrapper)[0]!.attributes('aria-selected')).toBe('true')
    })

    it('cross-fades the steps, keyed by the tab', async () => {
      // VTU stubs <Transition>, so this reads the transition's name and the
      // key it switches on. The fade itself can only be seen in a browser.
      const { wrapper } = await mountProfile('DSPW')
      const fade = wrapper.find('transition-stub[name="routine-fade"]')

      expect(fade.exists()).toBe(true)
      expect(fade.attributes('mode')).toBe('out-in')
    })
  })

  describe('comparison sheet', () => {
    const sheetHeading = (wrapper: VueWrapper) => wrapper.get('#trait-sheet-heading').text()

    it('opens on the pair for the card that was tapped, with the user\'s side marked "You"', async () => {
      const { wrapper } = await mountProfile('ORPW')

      await traitCards(wrapper)[1]!.trigger('click')

      expect(sheet(wrapper).props('isOpen')).toBe(true)
      expect(sheetHeading(wrapper)).toBe('Resistant vs Sensitive')
      const panels = wrapper.findAll('[data-testid="trait-panel"]')
      expect(panels[0]!.text()).toContain('You')
      expect(panels[0]!.text()).toContain(typologyDetails['R']!.desc)
      expect(panels[1]!.text()).toContain(typologyDetails['S']!.desc)
    })

    it('tells the sheet where it is among the four traits and what each pair is called', async () => {
      const { wrapper } = await mountProfile('ORPW')

      await traitCards(wrapper)[2]!.trigger('click')

      expect(sheet(wrapper).props('position')).toBe(2)
      expect(sheet(wrapper).props('steps')).toEqual([
        'Oily vs Dry',
        'Resistant vs Sensitive',
        'Pigmented vs Non-Pigmented',
        'Wrinkle-Prone vs Tight',
      ])
    })

    it('steps to the next trait with the next button', async () => {
      const { wrapper } = await mountProfile('ORPW')
      await traitCards(wrapper)[0]!.trigger('click')

      await wrapper.get('button[aria-label^="Next trait"]').trigger('click')

      expect(sheetHeading(wrapper)).toBe('Resistant vs Sensitive')
      expect(sheet(wrapper).props('activeTrait')).toEqual(typologyDetails['R'])
      expect(sheet(wrapper).props('oppositeTrait')).toEqual(typologyDetails['S'])
    })

    it('wraps from the fourth trait back to the first with next', async () => {
      const { wrapper } = await mountProfile('ORPW')
      await traitCards(wrapper)[3]!.trigger('click')

      await wrapper.get('button[aria-label^="Next trait"]').trigger('click')

      expect(sheetHeading(wrapper)).toBe('Oily vs Dry')
      expect(sheet(wrapper).props('position')).toBe(0)
    })

    it('wraps from the first trait to the fourth with previous', async () => {
      const { wrapper } = await mountProfile('ORPW')
      await traitCards(wrapper)[0]!.trigger('click')

      await wrapper.get('button[aria-label^="Previous trait"]').trigger('click')

      expect(sheetHeading(wrapper)).toBe('Wrinkle-Prone vs Tight')
      expect(sheet(wrapper).props('position')).toBe(3)
    })

    it('moves focus into the sheet as it opens', async () => {
      const { wrapper } = await mountProfile('ORPW')

      await traitCards(wrapper)[1]!.trigger('click')
      await flushPromises()

      expect(document.activeElement).toBe(wrapper.get('button[aria-label="Close"]').element)
    })

    it('closes on Escape and gives focus back to the card that opened it', async () => {
      const { wrapper } = await mountProfile('ORPW')
      await traitCards(wrapper)[1]!.trigger('click')
      await flushPromises()

      pressEscape()
      await flushPromises()

      expect(sheet(wrapper).props('isOpen')).toBe(false)
      expect(document.activeElement).toBe(traitCards(wrapper)[1]!.element)
    })

    it('returns focus to the card that opened it, not the trait it was stepped to', async () => {
      const { wrapper } = await mountProfile('ORPW')
      await traitCards(wrapper)[0]!.trigger('click')
      await wrapper.get('button[aria-label^="Next trait"]').trigger('click')
      await wrapper.get('button[aria-label^="Next trait"]').trigger('click')

      await wrapper.get('button[aria-label="Close"]').trigger('click')
      await flushPromises()

      expect(document.activeElement).toBe(traitCards(wrapper)[0]!.element)
    })

    it('opens on the tapped card again after being stepped elsewhere and closed', async () => {
      const { wrapper } = await mountProfile('ORPW')
      await traitCards(wrapper)[0]!.trigger('click')
      await wrapper.get('button[aria-label^="Next trait"]').trigger('click')
      await wrapper.get('button[aria-label="Close"]').trigger('click')

      await traitCards(wrapper)[3]!.trigger('click')

      expect(sheetHeading(wrapper)).toBe('Wrinkle-Prone vs Tight')
    })
  })

  describe('empty state', () => {
    it('shows "No skin type yet" and what the page will hold, when the account has no type', async () => {
      const { wrapper } = await mountProfile('')

      expect(wrapper.get('h1').text()).toBe('No skin type yet')
      expect(wrapper.text()).toContain('Take the skin quiz and this page fills in with your four-letter type and what it means for you.')
      expect(wrapper.text()).toContain("What you'll see here")
      expect(wrapper.get('[data-testid="profile-empty"]').findAll('ul li').map((li) => li.text())).toEqual([
        'Your four skin traits, and how each compares with its opposite',
        'Ingredients to look for, and ones best avoided',
        'A morning and evening routine to start from',
      ])
    })

    it('says the saved type could not be read when the stored code is not one of the sixteen', async () => {
      const { wrapper } = await mountProfile('XYZQ')

      expect(wrapper.get('h1').text()).toBe("We couldn't read your saved skin type")
      expect(wrapper.text()).not.toContain('No skin type yet')
      expect(wrapper.find('[data-testid="profile-report"]').exists()).toBe(false)
    })

    it('treats a code that only matches a built-in object property as unreadable', async () => {
      // "toString" is not a skin type, but skinProfiles["toString"] would find
      // the object's own method without the own-property check.
      const { wrapper } = await mountProfile('toString')

      expect(wrapper.get('h1').text()).toBe("We couldn't read your saved skin type")
    })

    it('offers the same two ways forward for no type and for an unreadable one', async () => {
      for (const code of ['', 'XYZQ']) {
        const { wrapper } = await mountProfile(code)
        const empty = wrapper.get('[data-testid="profile-empty"]')

        expect(empty.get('a[href="/quiz"]').text()).toBe('Take the skin quiz')
        expect(empty.findAll('button').map((b) => b.text())).toContain('I already know my type')
      }
    })

    it('does not request recommendations, for no type or an unreadable one', async () => {
      await mountProfile('')
      await mountProfile('XYZQ')

      expect(searchProducts).not.toHaveBeenCalled()
    })

    it('takes the user to the quiz from "Take the skin quiz"', async () => {
      const { wrapper, router } = await mountProfile('')

      await wrapper.get('a[href="/quiz"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/quiz')
    })

    it('opens the type selector from "I already know my type"', async () => {
      const { wrapper } = await mountProfile('')
      expect(selector(wrapper).props('isOpen')).toBe(false)

      const knowType = wrapper.findAll('button').find((b) => b.text() === 'I already know my type')!
      await knowType.trigger('click')

      expect(selector(wrapper).props('isOpen')).toBe(true)
    })

    it('saves a chosen type, fills the page in with it, and loads recommendations then', async () => {
      vi.mocked(updateUserSkinType).mockResolvedValue({})
      const { wrapper } = await mountProfile('')
      // Opened first, the way a user reaches it, so the close below is the
      // save's doing rather than the selector never having opened.
      await wrapper.findAll('button').find((b) => b.text() === 'I already know my type')!.trigger('click')
      expect(selector(wrapper).props('isOpen')).toBe(true)

      selector(wrapper).vm.$emit('confirm', 'DSNT')
      await flushPromises()

      expect(updateUserSkinType).toHaveBeenCalledWith('DSNT')
      expect(useAuthStore().user.skin_type).toBe('DSNT')
      expect(selector(wrapper).props('isOpen')).toBe(false)
      expect(wrapper.get('h1').text()).toBe(skinProfiles['DSNT']!.subtitle)
      expect(searchProducts).toHaveBeenCalledTimes(1)
      expect(toasts.value.map((t) => [t.message, t.type])).toEqual([['Profile set to DSNT.', 'success']])
    })

    it('shows the selector as saving while the save is in flight', async () => {
      let finish: (value: unknown) => void = () => {}
      vi.mocked(updateUserSkinType).mockReturnValue(new Promise((resolve) => { finish = resolve }))
      const { wrapper } = await mountProfile('')

      selector(wrapper).vm.$emit('confirm', 'DSNT')
      await flushPromises()
      expect(selector(wrapper).props('isSaving')).toBe(true)

      finish({})
      await flushPromises()
      expect(selector(wrapper).props('isSaving')).toBe(false)
    })

    it('keeps the empty state and says so when saving the chosen type fails', async () => {
      vi.mocked(updateUserSkinType).mockRejectedValue(new Error('Network Error'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { wrapper } = await mountProfile('')
      await wrapper.findAll('button').find((b) => b.text() === 'I already know my type')!.trigger('click')

      selector(wrapper).vm.$emit('confirm', 'DSNT')
      await flushPromises()

      expect(wrapper.get('h1').text()).toBe('No skin type yet')
      expect(useAuthStore().user.skin_type).toBe('')
      expect(selector(wrapper).props('isOpen')).toBe(true)
      expect(selector(wrapper).props('isSaving')).toBe(false)
      expect(searchProducts).not.toHaveBeenCalled()
      expect(toasts.value.map((t) => [t.message, t.type])).toEqual([
        ['Failed to save your skin profile. Please try again.', 'error'],
      ])
    })
  })

  describe('links out', () => {
    it('offers "Doesn\'t sound like you? Retake the quiz" as a link to the quiz', async () => {
      const { wrapper, router } = await mountProfile('OSPW')
      const retake = wrapper.get('a[href="/quiz"]')

      expect(retake.text()).toBe("Doesn't sound like you? Retake the quiz")
      await retake.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/quiz')
    })

    it('opens the chat from "Ask SkinBuddy AI about it"', async () => {
      const { wrapper, router } = await mountProfile('OSPW')
      const ask = wrapper.findAll('button').find((b) => b.text() === 'Ask SkinBuddy AI about it')!

      await ask.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/chat')
    })
  })

  describe('motion', () => {
    // The stagger is read off the classes and inline delays. The movement
    // itself, and its absence under reduced motion, can only be seen in a
    // browser: quizMotion.css turns the animation off for that preference.
    const delays = (els: ReturnType<VueWrapper['findAll']>) =>
      els.map((el) => (el.element as HTMLElement).style.animationDelay)

    it('fades the sections up one after another, 60 ms apart', async () => {
      const { wrapper } = await mountProfile('OSPW')
      const risers = wrapper.get('[data-testid="profile-report"]').findAll('.quiz-rise')

      expect(delays(risers)).toEqual(['0ms', '60ms', '120ms', '180ms', '240ms', '300ms'])
    })

    it('staggers the four "?" tiles of the empty state the same way', async () => {
      const { wrapper } = await mountProfile('')
      const tiles = byTestId(wrapper, 'empty-tile')

      expect(tiles.map((t) => t.text())).toEqual(['?', '?', '?', '?'])
      expect(tiles.every((t) => t.classes('quiz-rise'))).toBe(true)
      expect(delays(tiles)).toEqual(['0ms', '60ms', '120ms', '180ms'])
    })
  })
})
