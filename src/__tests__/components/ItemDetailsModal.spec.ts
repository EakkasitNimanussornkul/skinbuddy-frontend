import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  removeFromShelf: vi.fn(),
  // Called from onMounted for the safety panel. Not the subject of the delete
  // cases, but it has to resolve or every one of them would start with an
  // unhandled rejection.
  analyzeProduct: vi.fn(),
}))

import { removeFromShelf, analyzeProduct } from '../../api/shelfapi'
import ItemDetailsModal from '../../components/Shelf/ItemDetailsModal.vue'
import ProductLifecycleController from '../../components/Shelf/ProductLifecycleController.vue'
import KeyActivesGrid from '../../components/Shelf/KeyActivesGrid.vue'
import { useToast } from '../../composables/useToast'
import type { ShelfItem, ShelfProduct } from '../../stores/shelfStore'

const { toasts } = useToast()

const CONFLICT = {
  alert_type: 'Interaction',
  severity: 'High',
  message: 'Retinol and AHA together may increase irritation.',
}

/**
 * A joined catalogue row with every displayed field populated.
 *
 * Everything the left pane and the description block render comes from here and
 * not from the shelf row, so a fixture with these fields null - which is what
 * the delete cases used - cannot show whether any of them is wired at all.
 */
const shelfProduct = (overrides: Partial<ShelfProduct> = {}): ShelfProduct => ({
  id: 'p-1',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleanser',
  slug: 'cerave-hydrating-facial-cleanser',
  ingredients: null,
  image_url: 'https://cdn.example.com/cerave-cleanser.png',
  description: 'A gentle non-foaming cleanser with ceramides and hyaluronic acid.',
  pao: null,
  price_thb: null,
  price_usd: null,
  product_ingredients: [
    {
      ingredients: {
        id: 'i-1',
        name: 'Hyaluronic Acid',
        benefits: 'Binds water into the upper layers of the skin.',
        functional_group: 'Humectant',
      },
    },
    {
      ingredients: {
        id: 'i-2',
        name: 'Ceramide NP',
        benefits: 'Supports the skin barrier.',
        functional_group: 'Barrier Lipid',
      },
    },
  ],
  ...overrides,
})

const shelfItem = (overrides: Partial<ShelfItem> = {}): ShelfItem => ({
  id: 'item-1',
  user_id: 'user-1',
  product_id: 'p-1',
  usage_state: 'active',
  opened_date: '2026-01-01',
  expiration_date: null,
  pao: null,
  archive_outcome: null,
  archive_notes: null,
  archived_at: null,
  products: shelfProduct(),
  ...overrides,
})

const mountModal = async (item: ShelfItem = shelfItem()) => {
  const wrapper = mount(ItemDetailsModal, { props: { item } })
  await flushPromises()
  return wrapper
}

const buttonWith = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

/** Exact match, because 'Cancel' is a substring of nothing else here but the
 *  confirmation panel's own refusal, and the delete cases turn on which of the
 *  two buttons in that panel was pressed. */
const buttonLabelled = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === text)

/** The dialogue itself, which `isVisible` mounts and unmounts. */
const dialogue = (wrapper: VueWrapper) => wrapper.find('.fixed.inset-0')

/**
 * The two figures in the left pane, in order: Active Lifespan then PAO Window.
 *
 * Narrower than `span.font-mono`, which also matches the counters in the actives
 * grid and the warning header. The cards that read these assert the pair's
 * length, so the positional assumption is checked rather than trusted.
 */
const tiles = (wrapper: VueWrapper) =>
  wrapper.findAll('span.text-lg.font-mono').map((s) => s.text())

const lifespan = (wrapper: VueWrapper) => tiles(wrapper)[0]

/**
 * Walk the two-step confirmation the way a user does. The destructive action is
 * behind a confirm step, so a test that reached it any other way would not be
 * exercising the path that actually exists.
 */
const confirmDelete = async (wrapper: VueWrapper) => {
  await buttonWith(wrapper, 'Permanently Delete').trigger('click')
  await buttonWith(wrapper, 'Yes, Delete').trigger('click')
  await flushPromises()
}

/**
 * The property STC-07 is built to certify: the safety panel is advisory, and
 * nothing else in the modal is gated on it.
 *
 * This modal never imports blocksAction - unlike AddProductModal and
 * ProductHeroSection, which both gate a write on it - and that is deliberate,
 * because there is no write here to gate. The user is looking at a product they
 * already own. Asserted as five separate things rather than a snapshot so a
 * regression names which control disappeared.
 */
const expectNothingGated = (wrapper: VueWrapper) => {
  const archive = buttonLabelled(wrapper, 'Archive Product')
  const remove = buttonLabelled(wrapper, 'Permanently Delete')

  expect(archive).toBeTruthy()
  expect(archive!.attributes('disabled')).toBeUndefined()
  expect(remove).toBeTruthy()
  expect(remove!.attributes('disabled')).toBeUndefined()

  // Description, actives and the lifecycle controller all still render: a
  // conflict warning is a thing to read, not a reason to withhold the rest of
  // the record.
  expect(wrapper.text()).toContain('A gentle non-foaming cleanser')
  expect(wrapper.text()).toContain('Hyaluronic Acid')
  expect(wrapper.text()).toContain('Expiration Date')
}

describe('src/components/Shelf/ItemDetailsModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toasts.value.splice(0)
    vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [], duplicates: [] })
    vi.mocked(removeFromShelf).mockResolvedValue({})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('product metadata (render)', () => {
    it('renders the brand, name and category off the joined catalogue row', async () => {
      const wrapper = await mountModal()

      expect(wrapper.text()).toContain('CeraVe')
      expect(wrapper.get('h2').text()).toBe('Hydrating Facial Cleanser')
      // Read off the badge rather than out of wrapper.text(): "Cleanser" is also
      // a word in the product name, so a text-level assertion here passed with
      // the category binding replaced by its fallback.
      expect(wrapper.get('h2 ~ span').text()).toBe('Cleanser')
    })

    it('renders the product image when the catalogue has one', async () => {
      const wrapper = await mountModal()

      expect(wrapper.get('img').attributes('src')).toBe(
        'https://cdn.example.com/cerave-cleanser.png',
      )
    })

    it('draws a placeholder rather than a broken image when there is no photo', async () => {
      const wrapper = await mountModal(
        shelfItem({ products: shelfProduct({ image_url: null }) }),
      )

      // An <img> with no src renders as a broken-image icon in every browser,
      // which reads as a failure rather than as an absent photo.
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('renders the description and the active ingredients', async () => {
      const wrapper = await mountModal()

      expect(wrapper.text()).toContain(
        'A gentle non-foaming cleanser with ceramides and hyaluronic acid.',
      )
      expect(wrapper.text()).toContain('Hyaluronic Acid')
      expect(wrapper.text()).toContain('Ceramide NP')
    })

    it('omits the description block entirely when the catalogue has none', async () => {
      const wrapper = await mountModal(
        shelfItem({ products: shelfProduct({ description: null }) }),
      )

      // Rather than a heading over empty space.
      expect(wrapper.text()).not.toContain('Description')
    })

    it('falls back to placeholder labels when the product join came back empty', async () => {
      // `products` is optional and nullable on ShelfItem: GET /shelf/ selects the
      // join, but a shelf row whose product was removed from the catalogue still
      // returns. The modal has to render something for it rather than blank
      // headings or "undefined".
      const wrapper = await mountModal(shelfItem({ products: null }))

      expect(wrapper.text()).toContain('Unknown Brand')
      expect(wrapper.get('h2').text()).toBe('Unknown Product')
      expect(wrapper.get('h2 ~ span').text()).toBe('Formulation')
    })
  })

  describe('runAutomaticSafetyCheck() (render states)', () => {
    it('shows the scan as running while the check is in flight', async () => {
      let release: (value: unknown) => void = () => {}
      vi.mocked(analyzeProduct).mockReturnValue(
        new Promise((resolve) => {
          release = resolve
        }),
      )
      const wrapper = mount(ItemDetailsModal, { props: { item: shelfItem() } })
      await nextTick()

      // Deliberately not flushed: this is the only state that exists solely
      // between the request and its answer, so a flushed mount can never see it.
      expect(wrapper.text()).toContain('Routine Safety Scan')
      expect(wrapper.text()).toContain('Analyzing formula interactions against your active shelf')

      release({ is_safe: true, warnings: [], duplicates: [] })
      await flushPromises()

      // And it is transient. A scanning panel that never resolves is the shape
      // FE-DEF-03 left behind: an animation standing in for a verdict.
      expect(wrapper.text()).not.toContain('Analyzing formula interactions')
    })

    it('reports a clean result as no conflicts found', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({ is_safe: true, warnings: [], duplicates: [] })
      const wrapper = await mountModal()

      expect(wrapper.text()).toContain('No Conflicts Found')
      // The wording is scoped to what the check established - no interaction
      // against the active shelf - and does not claim the product is safe for
      // this user. FE-DEF-36 added this branch; before it, the most common
      // outcome rendered nothing at all.
      expect(wrapper.text()).toContain('found no interactions to flag')
      expect(wrapper.text()).not.toContain('Safety Scan Unavailable')
      expect(wrapper.text()).not.toContain('Not Assessed')
    })

    it('renders the reported conflicts without gating anything else', async () => {
      vi.mocked(analyzeProduct).mockResolvedValue({
        is_safe: false,
        warnings: [CONFLICT, { ...CONFLICT, alert_type: 'Skin Type Conflict', message: 'Second.' }],
        duplicates: [],
      })
      const wrapper = await mountModal()

      expect(wrapper.text()).toContain('Biochemical Safety & Conflict Warning')
      expect(wrapper.text()).toContain('Retinol and AHA together may increase irritation.')
      expect(wrapper.text()).toContain('Second.')
      expect(wrapper.text()).toContain('2 Warnings')
      expectNothingGated(wrapper)
    })

    it('reports a check that could not run, without gating anything else', async () => {
      vi.mocked(analyzeProduct).mockRejectedValue(new Error('network down'))
      const wrapper = await mountModal()

      expect(wrapper.text()).toContain('Safety Scan Unavailable')
      expect(wrapper.text()).toContain('This is not a clean result.')
      // The panel the user gets for a clean scan must not be what a failed scan
      // shows: an empty warnings list is the shape of both, which is FE-DEF-03.
      expect(wrapper.text()).not.toContain('No Conflicts Found')
      expectNothingGated(wrapper)
    })

    it('reports a check that returned no verdict in its own words', async () => {
      // Completed, no conflicts, and no is_safe either.
      vi.mocked(analyzeProduct).mockResolvedValue({ warnings: [], duplicates: [] })
      const wrapper = await mountModal()

      expect(wrapper.text()).toContain('Not Assessed')
      expect(wrapper.text()).toContain('returned no verdict for this product')
      // FE-DEF-29. Both are "we cannot say this product is safe", but retrying
      // fixes one and will never fix the other, so the copy cannot be shared -
      // and this is the assertion that keeps them from collapsing back together.
      expect(wrapper.text()).not.toContain('Safety Scan Unavailable')
      expect(wrapper.text()).not.toContain("couldn't complete the compatibility check")
      expect(wrapper.text()).not.toContain('No Conflicts Found')
      expectNothingGated(wrapper)
    })
  })

  describe('usageLifespan', () => {
    it('reads Unopened when no opened date has been recorded', async () => {
      const wrapper = await mountModal(shelfItem({ opened_date: null }))

      // Not "0 Days". A sealed product has no lifespan yet, and zero is a
      // measurement.
      expect(lifespan(wrapper)).toBe('Unopened')
    })

    it('counts the days from the opened date to today for an item in use', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-01-11T06:00:00Z'))

      const wrapper = await mountModal(shelfItem({ opened_date: '2026-01-01T00:00:00Z' }))

      // 10 days and 6 hours, rounded up. Ceil rather than round or floor, so a
      // product opened this morning reads as day 1 rather than day 0 - and 11
      // is the value that separates ceil from both of the others here.
      expect(lifespan(wrapper)).toBe('11 Days')
    })

    it('freezes the count at the archive date rather than running on to today', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-02-01T00:00:00Z'))

      const wrapper = await mountModal(
        shelfItem({
          usage_state: 'archived',
          opened_date: '2026-01-01T00:00:00Z',
          archived_at: '2026-01-06T00:00:00Z',
        }),
      )

      // The lifespan of an archived product is a historical fact. Measuring it
      // against `new Date()` would keep growing it forever, so the figure in the
      // archive log would depend on when the log was opened.
      // 31 is what the same item reads if the end point is `new Date()`, so the
      // exact figure is the whole assertion - a `not.toBe('31 Days')` alongside
      // it could not fail independently of this line.
      expect(lifespan(wrapper)).toBe('5 Days')
    })

    it('reads zero rather than a negative count when the end point precedes the opening', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-02-01T00:00:00Z'))

      const wrapper = await mountModal(
        shelfItem({
          usage_state: 'archived',
          opened_date: '2026-01-10T00:00:00Z',
          archived_at: '2026-01-06T00:00:00Z',
        }),
      )

      // Reachable: archived_at is written by the server at the moment of
      // archiving, while opened_date is a date the user picks and can backdate
      // or mistype. "-4 Days" is not a thing to show anybody.
      expect(lifespan(wrapper)).toBe('0 Days')
    })
  })

  describe('handleExecuteDelete()', () => {
    it('deletes the item the modal is showing', async () => {
      const wrapper = await mountModal()

      await confirmDelete(wrapper)

      expect(removeFromShelf).toHaveBeenCalledWith('item-1')
    })

    it('keeps the delete behind its confirmation step', async () => {
      const wrapper = await mountModal()

      await buttonWith(wrapper, 'Permanently Delete').trigger('click')

      // Reaching the confirm step is not the same as confirming. A single
      // mis-click must not be able to destroy a shelf record.
      expect(removeFromShelf).not.toHaveBeenCalled()
      expect(buttonWith(wrapper, 'Yes, Delete')).toBeTruthy()
    })

    it('returns to the two-button footer when the confirmation is refused', async () => {
      const wrapper = await mountModal()
      await buttonWith(wrapper, 'Permanently Delete').trigger('click')

      await buttonLabelled(wrapper, 'Cancel')!.trigger('click')

      // The case above shows only that not confirming deletes nothing. This one
      // presses the refusal, which is the control the user actually reaches for -
      // and it has to put the footer back rather than leaving the item stranded
      // in a confirm state with no way out but closing the modal.
      expect(removeFromShelf).not.toHaveBeenCalled()
      expect(buttonLabelled(wrapper, 'Yes, Delete')).toBeUndefined()
      expect(buttonLabelled(wrapper, 'Permanently Delete')).toBeTruthy()
      expect(buttonLabelled(wrapper, 'Archive Product')).toBeTruthy()
      expect(dialogue(wrapper).exists()).toBe(true)
    })

    it('tells the parent to refresh and reports the removal', async () => {
      const wrapper = await mountModal()

      await confirmDelete(wrapper)

      expect(wrapper.emitted('refresh')).toHaveLength(1)
      expect(toasts.value[0]!.message).toBe('Product removed from active routine check.')
      // Wording pinned, not just presence. ShelfView's own delete path emits the
      // identical sentence, and UC-07 and UC-35 quote it verbatim - the
      // documents copy interface strings, so a drift here becomes a drift in the
      // SRS. FE-DEF-17.
      expect(toasts.value[0]!.type).toBe('info')
    })

    it('closes itself once the item is gone', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] })
      const wrapper = await mountModal()

      await confirmDelete(wrapper)

      // Two separate things, and only the first is immediate: the dialogue is
      // hidden as soon as the delete lands, and `close` follows after the exit
      // transition so the parent unmounts nothing mid-animation.
      expect(dialogue(wrapper).exists()).toBe(false)
      expect(wrapper.emitted('close')).toBeUndefined()

      vi.advanceTimersByTime(250)

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('reports the failure and does not tell the parent anything changed', async () => {
      vi.mocked(removeFromShelf).mockRejectedValue(new Error('network down'))
      const wrapper = await mountModal()

      await confirmDelete(wrapper)

      // No 'refresh': the shelf behind the modal still holds the item, and
      // re-fetching would only redraw what is already correct while suggesting
      // the delete had gone through.
      expect(wrapper.emitted('refresh')).toBeUndefined()
      expect(toasts.value[0]!.message).toBe('Failed to delete shelf item.')
      expect(toasts.value[0]!.type).toBe('error')
    })

    it('stays open on the same item when the delete fails', async () => {
      vi.mocked(removeFromShelf).mockRejectedValue(new Error('network down'))
      const wrapper = await mountModal()

      await confirmDelete(wrapper)

      // The catch branch calls no handleClose, which is the whole of its
      // correctness here: closing over a failed delete would leave the user
      // looking at a shelf that still contains the product they were told
      // nothing about.
      expect(dialogue(wrapper).exists()).toBe(true)
      expect(wrapper.emitted('close')).toBeUndefined()
      expect(wrapper.get('h2').text()).toBe('Hydrating Facial Cleanser')
    })
  })

  /**
   * What makes the tiles move when the user presses "Start Product Life"
   * without the modal being torn down and rebuilt.
   *
   * The write, the date arithmetic and the emit-on-success are covered at the
   * ProductLifecycleController level; what is only observable here is that the
   * parent takes the emitted row into its own copy, so the left pane updates
   * before any refetch lands.
   *
   * Two branches of handleChildUpdate are deliberately not covered, because
   * neither has a caller: the optional payload (`updated` is the only binding
   * and always carries one) and the merge being a merge rather than an
   * assignment (the single emitter sends a full clone, so `{ ...local,
   * ...update }` and `update` cannot be told apart from outside). Asserting
   * either would be describing a contract nothing exercises.
   */
  describe('handleChildUpdate()', () => {
    /**
     * The shape ProductLifecycleController emits on a successful open: the whole
     * row, with the four fields the write changed.
     *
     * The opened date is a fixed UTC instant rather than today's local date.
     * The component's own opened date is genuinely local (FE-DEF-21), but that
     * is the child's concern and is asserted there - pinning an instant here
     * keeps the day count in this file identical in every timezone.
     */
    const openedClone = (item: ShelfItem) => ({
      ...item,
      opened_date: '2026-01-01T00:00:00Z',
      expiration_date: '2026-07-01',
      usage_state: 'active' as const,
      pao: 6,
    })

    it('moves the lifespan and PAO tiles onto the newly opened item', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-01-11T06:00:00Z'))
      const item = shelfItem({ usage_state: 'unopened', opened_date: null, pao: null })
      const wrapper = await mountModal(item)

      expect(tiles(wrapper)).toEqual(['Unopened', 'Not Set'])
      expect(wrapper.text()).toContain('Start Product Life')

      wrapper.findComponent(ProductLifecycleController).vm.$emit('updated', openedClone(item))
      await nextTick()

      expect(tiles(wrapper)).toEqual(['11 Days', '6M'])
      // And the child has swapped panels off the same merged copy: the control
      // that starts the clock is gone, because the clock is running.
      expect(wrapper.text()).not.toContain('Start Product Life')
      expect(wrapper.text()).toContain('Expiration Date')
    })

    it('tells the parent to refresh without writing through to the prop', async () => {
      const item = shelfItem({ usage_state: 'unopened', opened_date: null, pao: null })
      const wrapper = await mountModal(item)

      wrapper.findComponent(ProductLifecycleController).vm.$emit('updated', openedClone(item))
      await nextTick()

      expect(wrapper.emitted('refresh')).toHaveLength(1)
      // The shelf row belongs to the parent. The modal keeps its own copy so the
      // tiles can move immediately, and the refresh is what reconciles the list
      // behind it - mutating the prop instead would update the list silently and
      // leave the two disagreeing about who owns the row.
      expect(item.opened_date).toBeNull()
      expect(item.pao).toBeNull()
      expect(item.usage_state).toBe('unopened')
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('key actives (fold)', () => {
    it('asks the actives grid to be foldable here, and leaves it open', async () => {
      // Owner request: the actives sit among several other sections in this
      // modal, so the user can fold them away.
      const wrapper = await mountModal()
      const grid = wrapper.findComponent(KeyActivesGrid)

      expect(grid.props('collapsible')).toBe(true)
      expect(grid.get('h3 button').attributes('aria-expanded')).toBe('true')
      expect(wrapper.text()).toContain('Hyaluronic Acid')
    })
  })
})
