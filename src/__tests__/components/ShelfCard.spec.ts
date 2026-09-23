import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ShelfCard from '../../components/Shelf/ShelfCard.vue'
import ItemBadge from '../../components/Shelf/ItemBadge.vue'
import { toLocalDateString } from '../../api/dates'
import type { ShelfItem } from '../../stores/shelfStore'

const shelfItem = (overrides: Partial<ShelfItem> = {}): ShelfItem => ({
  id: 'item-1',
  user_id: 'user-1',
  product_id: 'p-1',
  usage_state: 'active',
  opened_date: null,
  expiration_date: null,
  pao: null,
  archive_outcome: null,
  archive_notes: null,
  archived_at: null,
  products: {
    id: 'p-1',
    brand: 'CeraVe',
    name: 'Hydrating Facial Cleanser',
    category: 'Cleanser',
    slug: 'cerave',
    ingredients: null,
    image_url: null,
    description: null,
    pao: null,
    price_thb: null,
    price_usd: null,
  },
  ...overrides,
})

/**
 * A calendar day `n` days from today, as the string the backend stores.
 *
 * Computed rather than written as a literal, and no clock is faked. Both the
 * card and daysUntilExpiry read these as local calendar days, so a run at any
 * hour in any zone puts the boundary in the same place: local midnight of
 * today+n is between n-1 and n days away, and the ceiling of that is n.
 */
const inDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toLocalDateString(d)
}

/** The same date, formatted the way the card's own date line formats it. */
const formatted = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const mountCard = (item: ShelfItem) => mount(ShelfCard, { props: { item } })

/** Read off the badge's own props rather than its palette. */
const badge = (wrapper: VueWrapper) => ({
  type: wrapper.findComponent(ItemBadge).props('type'),
  text: wrapper.findComponent(ItemBadge).props('text'),
})

const dateLine = (wrapper: VueWrapper) => wrapper.get('p.text-\\[10px\\].lg\\:text-\\[11px\\].font-semibold').text()

describe('src/components/Shelf/ShelfCard.vue', () => {
  describe('expirationInfo (computed)', () => {
    it('reports an archived item as archived before looking at any date', () => {
      // First branch, and deliberately so: an archived product may still carry
      // an expiry that has since passed, and labelling a finished product
      // "Expired" would describe a problem the user already dealt with.
      const wrapper = mountCard(
        shelfItem({ usage_state: 'archived', expiration_date: inDays(-90), pao: 6 }),
      )

      expect(badge(wrapper)).toEqual({ type: 'archived', text: 'Archived' })
      expect(dateLine(wrapper)).toBe('Archived Item')
    })

    it('reports an unopened item with no derivable expiry as unopened, naming its period', () => {
      const wrapper = mountCard(shelfItem({ usage_state: 'unopened', pao: 6 }))

      // The period is worth showing even with no date: it is what the expiry
      // will be counted from once the product is opened.
      expect(badge(wrapper)).toEqual({ type: 'unopened', text: 'Unopened' })
      expect(dateLine(wrapper)).toBe('PAO: 6M')
    })

    it('says only that it is unopened when there is no period either', () => {
      const wrapper = mountCard(shelfItem({ usage_state: 'unopened' }))

      expect(badge(wrapper).type).toBe('unopened')
      expect(dateLine(wrapper)).toBe('Status: Unopened')
    })

    it('reports an item stored as active but never opened as unopened, naming its period', () => {
      // The defect. This asserted "Active" for exactly this item - usage_state
      // 'active' and no opened date, which is how a product added straight to
      // a routine is stored - while its details panel said Unopened. Opened
      // means an opened date: nothing has started the period-after-opening clock.
      const wrapper = mountCard(shelfItem({ usage_state: 'active', opened_date: null, pao: 12 }))

      expect(badge(wrapper)).toEqual({ type: 'unopened', text: 'Unopened' })
      expect(dateLine(wrapper)).toBe('PAO: 12M')
    })

    it('reports an opened item with no period as active, with the expiration not set', () => {
      // Opened, but with no period and no stored date there is no expiry to
      // count down to. "Active" claims only what is known.
      const wrapper = mountCard(shelfItem({ usage_state: 'active', opened_date: inDays(-5) }))

      expect(badge(wrapper)).toEqual({ type: 'good', text: 'Active' })
      expect(dateLine(wrapper)).toBe('Expiration: Not Set')
    })

    it('reports a date already past as expired', () => {
      const wrapper = mountCard(shelfItem({ expiration_date: inDays(-1) }))

      expect(badge(wrapper)).toEqual({ type: 'error', text: 'Expired' })
      expect(dateLine(wrapper)).toBe(`Expired: ${formatted(-1)}`)
    })

    it('warns for a product expiring within thirty days, and counts the days', () => {
      const wrapper = mountCard(shelfItem({ expiration_date: inDays(10) }))

      expect(badge(wrapper)).toEqual({ type: 'warning', text: 'In 10 days' })
      expect(dateLine(wrapper)).toBe(`Expires: ${formatted(10)}`)
    })

    it('still warns on the thirtieth day and stops on the thirty-first', () => {
      // The boundary is <= 30, so day thirty is inside the warning and day
      // thirty-one is not. Asserted as a pair, because either card alone holds
      // with the comparison moved by one.
      expect(badge(mountCard(shelfItem({ expiration_date: inDays(30) }))).type).toBe('warning')
      expect(badge(mountCard(shelfItem({ expiration_date: inDays(31) }))).type).toBe('good')
    })

    it('is not yet expired on the day it expires', () => {
      // daysUntilExpiry normalises the -0 that an expiry later today produces,
      // so this lands on the warning branch rather than the expired one. The
      // product is still usable today, which is what the card should say.
      const wrapper = mountCard(shelfItem({ expiration_date: inDays(0) }))

      expect(badge(wrapper)).toEqual({ type: 'warning', text: 'In 0 days' })
    })

    it('derives the expiry from the opened date and period when none is stored', () => {
      // FE-DEF-16 and FE-DEF-23: the fallback the status filter used to be
      // missing, and the countdown that used to be written out twice. No
      // expiration_date here, so the date can only come from opened_date plus
      // the period.
      const opened = new Date()
      opened.setMonth(opened.getMonth() - 12)
      const wrapper = mountCard(
        shelfItem({ opened_date: toLocalDateString(opened), pao: 6 }),
      )

      expect(badge(wrapper)).toEqual({ type: 'error', text: 'Expired' })
    })

    it('prefers a stored expiration date over one derived from the period', () => {
      const opened = new Date()
      opened.setMonth(opened.getMonth() - 12)
      const wrapper = mountCard(
        shelfItem({ expiration_date: inDays(60), opened_date: toLocalDateString(opened), pao: 6 }),
      )

      // The derived date is a year in the past and would read Expired. The
      // stored one wins, because someone set it deliberately.
      expect(badge(wrapper).type).toBe('good')
      expect(dateLine(wrapper)).toBe(`Expires: ${formatted(60)}`)
    })
  })

  describe('product metadata and controls (render)', () => {
    it('renders the brand and name off the joined catalogue row', () => {
      const wrapper = mountCard(shelfItem())

      expect(wrapper.text()).toContain('CeraVe')
      expect(wrapper.get('h4').text()).toBe('Hydrating Facial Cleanser')
    })

    it('falls back to placeholder labels when the product join came back empty', () => {
      const wrapper = mountCard(shelfItem({ products: null }))

      expect(wrapper.text()).toContain('Unknown Brand')
      expect(wrapper.get('h4').text()).toBe('Unnamed Product')
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('asks to open the details when the body is clicked', async () => {
      const wrapper = mountCard(shelfItem())

      await wrapper.get('.cursor-pointer.flex-1').trigger('click')

      expect(wrapper.emitted('open-details')).toHaveLength(1)
      expect(wrapper.emitted('delete')).toBeUndefined()
    })

    it('asks to delete without also opening the details', async () => {
      // The two controls are siblings, not nested: the delete button sits in the
      // badge row and the open-details handler is on the body below it. So the
      // `.stop` on the delete handler is defensive rather than load-bearing -
      // removing it changes nothing, which was confirmed by doing so and
      // watching every card here still pass. What this card pins is the
      // separation itself, which would matter if the handler ever moved up to
      // the card root.
      const wrapper = mountCard(shelfItem())

      await wrapper.findAll('button')[0]!.trigger('click')

      expect(wrapper.emitted('delete')).toHaveLength(1)
      expect(wrapper.emitted('open-details')).toBeUndefined()
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('inRoutine (render)', () => {
    it('marks an item the routine uses, separately from its lifecycle badge', () => {
      // An unopened product can be in the routine: the badge says Unopened and
      // the marker says In Routine, rather than one word standing for both.
      const wrapper = mount(ShelfCard, { props: { item: shelfItem({ opened_date: null }), inRoutine: true } })

      expect(wrapper.get('.in-routine').text()).toBe('In Routine')
      expect(badge(wrapper).text).toBe('Unopened')
    })

    it('shows no marker for an item the routine does not use, opened or not', () => {
      const wrapper = mount(ShelfCard, { props: { item: shelfItem({ opened_date: inDays(-5) }), inRoutine: false } })

      expect(wrapper.find('.in-routine').exists()).toBe(false)
      expect(badge(wrapper).text).toBe('Active')
    })
  })
})
