import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ArchiveLogSummary from '../../components/Shelf/ArchiveLogSummary.vue'
import type { ArchiveOutcome, ShelfItem } from '../../stores/shelfStore'

const archivedItem = (overrides: Partial<ShelfItem> = {}): ShelfItem => ({
  id: 'item-1',
  user_id: 'user-1',
  product_id: 'p-1',
  usage_state: 'archived',
  opened_date: '2026-01-01',
  expiration_date: null,
  pao: null,
  archive_outcome: 'empty',
  archive_notes: null,
  archived_at: '2026-04-01',
  products: null,
  ...overrides,
})

const mountSummary = (item: ShelfItem, usageLifespan: number | null = 90) =>
  mount(ArchiveLogSummary, { props: { item, usageLifespan } })

/** The outcome word, which is the first word of the stored outcome's label. */
const outcome = (wrapper: VueWrapper) => wrapper.findAll('span.text-xs.font-bold')[0]!.text()

const lifespan = (wrapper: VueWrapper) => wrapper.get('span.font-mono').text()

describe('src/components/Shelf/ArchiveLogSummary.vue', () => {
  describe('archiveOutcomeDetails (computed)', () => {
    it('reads a finished product back as finished', () => {
      // The stored value is `empty`, which is not a word to show anybody - the
      // form that writes it offers "Finished". This is the reverse of the
      // mapping ArchiveLogForm covers, and the two have to agree or a product
      // archived under one label reads back under another.
      const wrapper = mountSummary(archivedItem({ archive_outcome: 'empty' }))

      expect(outcome(wrapper)).toBe('Finished')
    })

    it('reads a discarded product back as abandoned', () => {
      // The one pair whose two halves differ in wording: stored `discarded`,
      // shown "Abandoned". Nothing else in the codebase states that those are
      // the same thing, which is why both directions are pinned.
      const wrapper = mountSummary(archivedItem({ archive_outcome: 'discarded' }))

      expect(outcome(wrapper)).toBe('Abandoned')
    })

    it('reads an expired product back as expired', () => {
      const wrapper = mountSummary(archivedItem({ archive_outcome: 'expired' }))

      expect(outcome(wrapper)).toBe('Expired')
    })

    it('falls back to finished when no outcome was recorded', () => {
      const wrapper = mountSummary(archivedItem({ archive_outcome: null }))

      expect(outcome(wrapper)).toBe('Finished')
    })

    it('falls back to finished for a value it does not recognise', () => {
      // The lookup is indexed by the stored string, so an outcome the backend
      // added without this component knowing would otherwise render undefined
      // and take the colour class with it.
      const wrapper = mountSummary(
        archivedItem({ archive_outcome: 'donated' as unknown as ArchiveOutcome }),
      )

      expect(outcome(wrapper)).toBe('Finished')
    })
  })

  describe('lifespan and notes (render)', () => {
    it('shows the total lifespan it was handed', () => {
      // Passed in rather than computed here, because the count has to be frozen
      // at the archive date - measuring it against today would grow the figure
      // in a historical log every time the log was reopened. The parent owns
      // that calculation and is tested on it.
      const wrapper = mountSummary(archivedItem(), 90)

      expect(lifespan(wrapper)).toBe('90 Days')
    })

    it('says the product was never opened rather than showing zero days', () => {
      const wrapper = mountSummary(archivedItem({ opened_date: null }), null)

      // Not "0 Days". A product archived unopened has no lifespan, and zero is
      // a measurement.
      expect(lifespan(wrapper)).toBe('Not Opened')
    })

    it('shows the diary note the user wrote, as a quotation', () => {
      const wrapper = mountSummary(
        archivedItem({ archive_notes: 'Broke me out around the jawline after three weeks.' }),
      )

      expect(wrapper.text()).toContain('Skin Diary Note')
      expect(wrapper.text()).toContain('Broke me out around the jawline after three weeks.')
    })

    it('omits the note block entirely when nothing was written', () => {
      const wrapper = mountSummary(archivedItem({ archive_notes: null }))

      // Rather than a heading over an empty pair of quotation marks.
      expect(wrapper.text()).not.toContain('Skin Diary Note')
    })

    it('omits it for a note that is present but empty', () => {
      const wrapper = mountSummary(archivedItem({ archive_notes: '' }))

      expect(wrapper.text()).not.toContain('Skin Diary Note')
    })
  })
})
