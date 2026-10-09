import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import LoadMoreStrip from '../../components/Catalog/LoadMoreStrip.vue'

type Props = InstanceType<typeof LoadMoreStrip>['$props']

const mounted: VueWrapper[] = []
const strip = (props: Partial<Props> = {}, attach = false) => {
  const wrapper = mount(LoadMoreStrip, {
    props: { status: 'ready', shown: 12, total: 34, pageSize: 12, ...props },
    attachTo: attach ? document.body : undefined,
  })
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

describe('feat/30 the Explore load-more strip', () => {
  describe('LoadMoreStrip ready', () => {
    it('says how far through the list you are, in a polite live region', () => {
      const w = strip()

      expect(w.get('.strip-text').text()).toBe('Showing 12 of 34 products')
      expect(w.get('.strip-text').attributes('aria-live')).toBe('polite')
    })

    it('names how many one press adds on the button', () => {
      expect(strip().get('.strip-button').text()).toBe('Show 12 more')
    })

    it('words the last batch as "Show the last N" when fewer than a page remain', () => {
      expect(strip({ shown: 24, total: 34 }).get('.strip-button').text()).toBe('Show the last 10')
    })

    it('keeps "Show 12 more" when exactly a page remains', () => {
      expect(strip({ shown: 24, total: 36 }).get('.strip-button').text()).toBe('Show 12 more')
    })

    it('draws a progress bar from 0 to the total at the number shown', () => {
      const bar = strip().get('[role="progressbar"]')

      expect(bar.attributes('aria-valuemin')).toBe('0')
      expect(bar.attributes('aria-valuemax')).toBe('34')
      expect(bar.attributes('aria-valuenow')).toBe('12')
      expect(bar.attributes('aria-label')).toBe('Products shown')
    })

    it('fills the bar to the share shown, and gives the phone the same share as a percentage', () => {
      const w = strip()

      expect(w.get('.strip-fill').attributes('style')).toContain('width: 35%')
      expect(w.get('.strip-percent').text()).toBe('35%')
      expect(w.get('.strip-percent').classes()).toContain('sm:hidden')
    })

    it('puts the word "products" in a part that only the wider layout shows', () => {
      expect(strip().get('.strip-text span').classes()).toEqual(expect.arrayContaining(['hidden', 'sm:inline']))
    })

    it('asks the page for more when the button is pressed', async () => {
      const w = strip()

      await w.get('.strip-button').trigger('click')

      expect(w.emitted('load-more')).toHaveLength(1)
      expect(w.emitted('retry')).toBeUndefined()
    })

    it('is a stacked card with a full-width 52px button on a phone and one row from sm up', () => {
      const w = strip()

      expect(w.get('[role="group"]').classes()).toEqual(expect.arrayContaining(['flex-col', 'sm:flex-row']))
      expect(w.get('.strip-button').classes()).toEqual(expect.arrayContaining(['w-full', 'min-h-[52px]', 'sm:w-auto']))
    })

    it('is a real button of type button, with its arrow hidden from screen readers', () => {
      const button = strip().get('.strip-button')

      expect(button.element.tagName).toBe('BUTTON')
      expect(button.attributes('type')).toBe('button')
      expect(button.get('svg').attributes('aria-hidden')).toBe('true')
    })

    it('shows no placeholder cards and is not busy', () => {
      const w = strip()

      expect(w.find('.load-more-skeleton').exists()).toBe(false)
      expect(w.get('[role="group"]').attributes('aria-busy')).toBeUndefined()
    })
  })

  describe('LoadMoreStrip loading', () => {
    it('says which products are on their way', () => {
      expect(strip({ status: 'loading' }).get('.strip-text').text()).toBe('Loading products 13 to 24')
    })

    it('stops the range at the total on the last batch', () => {
      expect(strip({ status: 'loading', shown: 24 }).get('.strip-text').text()).toBe('Loading products 25 to 34')
    })

    it('marks the strip busy and the button unavailable, reading "Loading"', () => {
      const w = strip({ status: 'loading' })

      expect(w.get('[role="group"]').attributes('aria-busy')).toBe('true')
      expect(w.get('.strip-button').attributes('aria-disabled')).toBe('true')
      expect(w.get('.strip-button').text()).toBe('Loading')
    })

    it('ignores a press while busy, so a page cannot be asked for twice', async () => {
      const w = strip({ status: 'loading' })

      await w.get('.strip-button').trigger('click')

      expect(w.emitted()).not.toHaveProperty('load-more')
      expect(w.emitted()).not.toHaveProperty('retry')
    })

    it('puts placeholder cards under the strip, two that the wider layout shows side by side and one on a phone', () => {
      const cards = strip({ status: 'loading' }).findAll('.skeleton-card')

      expect(cards).toHaveLength(2)
      expect(cards[0]!.classes()).not.toContain('hidden')
      expect(cards[1]!.classes()).toEqual(expect.arrayContaining(['hidden', 'xl:flex']))
      expect(strip({ status: 'loading' }).get('.load-more-skeleton').attributes('aria-hidden')).toBe('true')
    })

    it('pulses the placeholders, the bar and the spinner only when motion is allowed', () => {
      const w = strip({ status: 'loading' })

      for (const el of [...w.findAll('.skeleton-card'), w.get('.strip-fill'), w.get('.strip-button svg')]) {
        const classes = el.classes()
        expect(classes.some((c) => c === 'motion-safe:animate-pulse' || c === 'motion-safe:animate-spin')).toBe(true)
        expect(classes).not.toContain('animate-pulse')
        expect(classes).not.toContain('animate-spin')
      }
    })

    it('keeps the same button, and the focus on it, from ready through loading and back', async () => {
      const w = strip({}, true)
      const button = w.get('.strip-button').element as HTMLButtonElement
      button.focus()

      await w.setProps({ status: 'loading' })
      expect(w.get('.strip-button').element).toBe(button)
      expect(document.activeElement).toBe(button)

      await w.setProps({ status: 'ready', shown: 24 })
      expect(w.get('.strip-button').element).toBe(button)
      expect(document.activeElement).toBe(button)
      expect(button.textContent).toContain('Show the last 10')
    })

    it('announces the new count once the page has loaded, in the same live region', async () => {
      const w = strip({ status: 'loading' })
      const region = w.get('.strip-text').element

      await w.setProps({ status: 'ready', shown: 24 })

      expect(w.get('.strip-text').element).toBe(region)
      expect(w.get('.strip-text').text()).toBe('Showing 24 of 34 products')
    })
  })

  describe('LoadMoreStrip failed', () => {
    it('is an alert that says the next products did not load and the first ones stay', () => {
      const alert = strip({ status: 'failed' }).get('[role="alert"]')

      expect(alert.text()).toContain('Could not load the next products.')
      expect(alert.text()).toContain('Your first 12 are still here. Check your connection and try again.')
    })

    it('counts the products still on the page in that message', () => {
      expect(strip({ status: 'failed', shown: 24 }).get('[role="alert"]').text()).toContain('Your first 24 are still here.')
    })

    it('offers "Try again", which asks for the same page again and not a new one', async () => {
      const w = strip({ status: 'failed' })

      expect(w.get('.strip-button').text()).toBe('Try again')
      await w.get('.strip-button').trigger('click')

      expect(w.emitted('retry')).toHaveLength(1)
      expect(w.emitted()).not.toHaveProperty('load-more')
    })

    it('uses the error colours in light and dark and drops the count and the bar', () => {
      const w = strip({ status: 'failed' })

      expect(w.get('[role="group"]').classes()).toEqual(expect.arrayContaining(['bg-red-50', 'dark:bg-red-900/30']))
      expect(w.get('.strip-button').classes()).toEqual(expect.arrayContaining(['text-red-800', 'dark:text-red-300']))
      expect(w.find('[role="progressbar"]').exists()).toBe(false)
      expect(w.find('.strip-text').exists()).toBe(false)
    })

    it('has the alert icon hidden from screen readers and no placeholder cards', () => {
      const w = strip({ status: 'failed' })

      expect(w.get('[role="alert"] svg').attributes('aria-hidden')).toBe('true')
      expect(w.find('.load-more-skeleton').exists()).toBe(false)
    })
  })

  describe('LoadMoreStrip all shown', () => {
    it('says that is all of them, with a tick, and fills the bar', () => {
      const w = strip({ status: 'done', shown: 34 })

      expect(w.get('.strip-text').text()).toBe('That is all 34 products')
      expect(w.get('.strip-text svg').attributes('aria-hidden')).toBe('true')
      expect(w.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('34')
      expect(w.get('.strip-fill').attributes('style')).toContain('width: 100%')
      expect(w.get('[role="group"]').attributes('aria-label')).toBe('End of list')
    })

    it('says "product" for a single one', () => {
      expect(strip({ status: 'done', shown: 1, total: 1 }).get('.strip-text').text()).toBe('That is all 1 product')
    })

    it('says "matching" when a search or filter is on', () => {
      expect(strip({ status: 'done', shown: 4, total: 4, matching: true }).get('.strip-text').text()).toBe('That is all 4 matching products')
    })

    it('offers Back to top, and no way to load more', () => {
      const w = strip({ status: 'done', shown: 34 })

      expect(w.get('.strip-button').text()).toBe('Back to top')
      expect(w.text()).not.toContain('Show ')
    })

    it('scrolls to the top at once under reduced motion, which the test setup reports', async () => {
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      const w = strip({ status: 'done', shown: 34 })

      await w.get('.strip-button').trigger('click')

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
      expect(w.emitted()).not.toHaveProperty('load-more')
    })

    it('scrolls smoothly when motion is allowed', async () => {
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      const original = window.matchMedia
      window.matchMedia = ((query: string) => ({ ...original(query), matches: false })) as typeof window.matchMedia
      try {
        const w = strip({ status: 'done', shown: 34 })
        await w.get('.strip-button').trigger('click')

        expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      } finally {
        window.matchMedia = original
      }
    })

    it('offers Clear filters only when a filter can be cleared, and asks the page to clear them', async () => {
      const without = strip({ status: 'done', shown: 4, total: 4, matching: true })
      expect(without.find('.clear-filters-button').exists()).toBe(false)

      const w = strip({ status: 'done', shown: 4, total: 4, matching: true, clearable: true })
      expect(w.get('.clear-filters-button').text()).toBe('Clear filters')
      await w.get('.clear-filters-button').trigger('click')

      expect(w.emitted('clear-filters')).toHaveLength(1)
    })

    it('does not offer Clear filters before the end of the list', () => {
      expect(strip({ clearable: true }).find('.clear-filters-button').exists()).toBe(false)
    })
  })
})
