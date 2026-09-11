import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

// Partial mock on purpose. Only the write is replaced; paoPeriodHasElapsed and
// the date helpers stay real, because the arithmetic they perform is the thing
// these cases are checking.
vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  markItemOpened: vi.fn(),
}))

import { markItemOpened } from '../../api/shelfapi'
import { addMonthsAsDateString, toLocalDateString } from '../../api/dates'
import ProductLifecycleController from '../../components/Shelf/ProductLifecycleController.vue'
import { useToast } from '../../composables/useToast'
import type { ShelfItem } from '../../stores/shelfStore'

const { toasts } = useToast()

const shelfItem = (overrides: Partial<ShelfItem> = {}): ShelfItem => ({
  id: 'item-1',
  user_id: 'user-1',
  product_id: 'p-1',
  usage_state: 'unopened',
  opened_date: null,
  expiration_date: null,
  pao: null,
  archive_outcome: null,
  archive_notes: null,
  archived_at: null,
  products: null,
  ...overrides,
})

const mountController = (item: ShelfItem) =>
  mount(ProductLifecycleController, { props: { item } })

const buttonWith = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

const lastToast = () => toasts.value[toasts.value.length - 1]

describe('src/components/Shelf/ProductLifecycleController.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toasts.value.splice(0)
    vi.mocked(markItemOpened).mockResolvedValue({})
  })

  describe('handleStartPAO()', () => {
    it('opens the item today and derives the expiry from its stored PAO', async () => {
      // Expected dates are computed with the same local-calendar helpers the
      // component uses rather than written as fixed strings. api/dates.ts exists
      // because toISOString() reads the calendar day in UTC and returns
      // yesterday for the whole local morning east of it (FE-DEF-21); a test
      // hardcoding a date would fail for that reason and look like a bug here.
      const today = toLocalDateString()
      const wrapper = mountController(shelfItem({ pao: 6 }))

      await buttonWith(wrapper, 'Start Product Life').trigger('click')
      await flushPromises()

      expect(markItemOpened).toHaveBeenCalledWith(
        'item-1',
        today,
        addMonthsAsDateString(new Date(), 6),
        'active',
        6,
      )
    })

    it('sends a null expiry when the item has no PAO to derive one from', async () => {
      const wrapper = mountController(shelfItem({ pao: null }))

      await buttonWith(wrapper, 'Start Product Life').trigger('click')
      await flushPromises()

      expect(markItemOpened).toHaveBeenCalledWith(
        'item-1',
        toLocalDateString(),
        null,
        'active',
        null,
      )
    })

    it('emits the opened item as a fresh object rather than mutating the prop', async () => {
      const item = shelfItem({ pao: 6 })
      const wrapper = mountController(item)

      await buttonWith(wrapper, 'Start Product Life').trigger('click')
      await flushPromises()

      const [emitted] = wrapper.emitted('updated')![0] as [ShelfItem]
      expect(emitted.usage_state).toBe('active')
      expect(emitted.opened_date).toBe(toLocalDateString())
      expect(emitted.pao).toBe(6)
      // The prop object itself is untouched: the parent owns it, and mutating
      // it here is what the clone in the component exists to avoid.
      expect(item.opened_date).toBeNull()
      expect(item.usage_state).toBe('unopened')
      expect(lastToast()!.type).toBe('success')
    })

    it('reports the failure and emits nothing when the write is rejected', async () => {
      vi.mocked(markItemOpened).mockRejectedValue(new Error('network down'))
      const wrapper = mountController(shelfItem({ pao: 6 }))

      await buttonWith(wrapper, 'Start Product Life').trigger('click')
      await flushPromises()

      // No 'updated': the screen must not show the product as opened when the
      // write that opens it did not land. FE-DEF-20 is the same class of bug
      // from the other direction.
      expect(wrapper.emitted('updated')).toBeUndefined()
      expect(lastToast()!.message).toBe('Could not update product status')
      expect(lastToast()!.type).toBe('error')
    })
  })

  describe('handleUpdateExpiration()', () => {
    const openedToday = () =>
      shelfItem({
        usage_state: 'active',
        opened_date: toLocalDateString(),
        expiration_date: addMonthsAsDateString(new Date(), 6),
        pao: 6,
      })

    const openEditor = async (wrapper: VueWrapper) => {
      // The pencil button, which is the only control in the opened panel with
      // no text of its own.
      await wrapper.findAll('button').find((b) => b.text() === '')!.trigger('click')
    }

    /** Every period button in the editor, as label -> whether it is offered. */
    const periodButtons = (wrapper: VueWrapper) =>
      Object.fromEntries(
        wrapper
          .findAll('.horizontal-pao-track button')
          .map((b) => [b.text(), b.attributes('disabled') === undefined]),
      )

    const NOTE = 'Periods that would already have ended are unavailable.'

    it('disables the periods that would land on a past date and offers the rest', async () => {
      // Opened ten months ago, so 1, 3, 6 and 9 months after opening are all
      // behind us and 12 onwards are not. FE-DEF-19: the calendar beside these
      // buttons greys out past days, and before this the buttons would happily
      // compute one - the same panel enforcing a rule with one control and
      // breaking it with another.
      const wrapper = mountController(
        shelfItem({
          usage_state: 'active',
          opened_date: addMonthsAsDateString(new Date(), -10),
          pao: 12,
        }),
      )
      await openEditor(wrapper)

      expect(periodButtons(wrapper)).toEqual({
        '1M': false,
        '3M': false,
        '6M': false,
        '9M': false,
        '12M': true,
        '18M': true,
        '24M': true,
        '36M': true,
      })
    })

    it('explains why those periods are unavailable rather than greying them silently', async () => {
      const wrapper = mountController(
        shelfItem({
          usage_state: 'active',
          opened_date: addMonthsAsDateString(new Date(), -10),
          pao: 12,
        }),
      )
      await openEditor(wrapper)

      expect(wrapper.text()).toContain(NOTE)
      expect(wrapper.text()).toContain('its shelf card already shows it as expired')
    })

    it('offers every period and shows no note for a product opened today', async () => {
      // The other side of the note's condition. Without this case the note
      // could be rendered unconditionally and the assertion above would not
      // notice.
      const wrapper = mountController(openedToday())
      await openEditor(wrapper)

      expect(Object.values(periodButtons(wrapper)).every(Boolean)).toBe(true)
      expect(wrapper.text()).not.toContain(NOTE)
    })

    it('still offers a period that ends exactly today', async () => {
      // The comparison is strictly before today, so a period running out today
      // has not elapsed. This matches the calendar next to it, whose min-date is
      // today and which therefore still allows today to be picked - the two
      // controls agree on the boundary, which is the whole point of the shared
      // predicate.
      const wrapper = mountController(
        shelfItem({
          usage_state: 'active',
          opened_date: addMonthsAsDateString(new Date(), -12),
          pao: 12,
        }),
      )
      await openEditor(wrapper)

      expect(periodButtons(wrapper)['12M']).toBe(true)
      expect(periodButtons(wrapper)['9M']).toBe(false)
    })

    it('saves the date derived from a newly chosen period, with that period as the PAO', async () => {
      const item = openedToday()
      const wrapper = mountController(item)
      await openEditor(wrapper)

      await buttonWith(wrapper, '12M').trigger('click')
      await buttonWith(wrapper, 'Save Date').trigger('click')
      await flushPromises()

      // Counted from the OPENED date, not from today. For an item opened today
      // those coincide, which is why the item is built that way - a fixture
      // opened earlier would not distinguish a correct implementation from one
      // counting from today, and ProductConfigurator legitimately does the
      // latter in its own context.
      expect(markItemOpened).toHaveBeenCalledWith(
        'item-1',
        item.opened_date,
        addMonthsAsDateString(new Date(), 12),
        'active',
        12,
      )
      expect(lastToast()!.type).toBe('success')
    })

    it('keeps the stored PAO when the date is saved without choosing a new period', async () => {
      const item = openedToday()
      const wrapper = mountController(item)
      await openEditor(wrapper)

      await buttonWith(wrapper, 'Save Date').trigger('click')
      await flushPromises()

      expect(markItemOpened).toHaveBeenCalledWith(
        'item-1',
        item.opened_date,
        item.expiration_date,
        'active',
        6,
      )
    })

    it('emits the updated item and leaves the editor open only on failure', async () => {
      const wrapper = mountController(openedToday())
      await openEditor(wrapper)
      await buttonWith(wrapper, '12M').trigger('click')
      await buttonWith(wrapper, 'Save Date').trigger('click')
      await flushPromises()

      const [emitted] = wrapper.emitted('updated')![0] as [ShelfItem]
      expect(emitted.pao).toBe(12)
      expect(emitted.expiration_date).toBe(addMonthsAsDateString(new Date(), 12))
      // Editor closed: Save Date is gone from the panel.
      expect(wrapper.findAll('button').some((b) => b.text().includes('Save Date'))).toBe(false)
    })

    it('reports the failure, emits nothing and keeps the editor open when the write is rejected', async () => {
      vi.mocked(markItemOpened).mockRejectedValue(new Error('network down'))
      const wrapper = mountController(openedToday())
      await openEditor(wrapper)

      await buttonWith(wrapper, 'Save Date').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('updated')).toBeUndefined()
      expect(lastToast()!.message).toBe('Could not update date')
      // Still in edit mode, so the user's unsaved date is still in front of
      // them to retry rather than silently discarded.
      expect(wrapper.findAll('button').some((b) => b.text().includes('Save Date'))).toBe(true)
    })
  })
})
