import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

vi.mock('../../api/shelfapi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/shelfapi')>()),
  updateShelfStatus: vi.fn(),
}))

import { updateShelfStatus } from '../../api/shelfapi'
import ArchiveLogForm from '../../components/Shelf/ArchiveLogForm.vue'
import { useToast } from '../../composables/useToast'
import type { ShelfItem } from '../../stores/shelfStore'

const { toasts } = useToast()

const shelfItem = (): ShelfItem => ({
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
  products: null,
})

const mountForm = (item: ShelfItem = shelfItem()) =>
  mount(ArchiveLogForm, { props: { item, usageLifespan: 42 } })

/** The outcome currently chosen, by its highlight. */
const chosenOutcome = (wrapper: VueWrapper) =>
  wrapper
    .findAll('button')
    .find((b) => b.classes().includes('bg-brand-primary'))
    ?.text()

const buttonWith = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

/** The metadata object handed to updateShelfStatus by the most recent call. */
const savedMetadata = () => vi.mocked(updateShelfStatus).mock.calls[0]![2]

describe('src/components/Shelf/ArchiveLogForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toasts.value.splice(0)
    vi.mocked(updateShelfStatus).mockResolvedValue({})
  })

  describe('executeArchive()', () => {
    it('archives as empty by default, which is the Finished option', async () => {
      // The form opens with an outcome already selected, so a user who writes
      // notes and submits without touching the three buttons still stores a
      // defined outcome rather than null.
      const wrapper = mountForm()

      await buttonWith(wrapper, 'Complete Archive Entry').trigger('click')
      await flushPromises()

      expect(updateShelfStatus).toHaveBeenCalledWith(
        'item-1',
        'archived',
        expect.objectContaining({ outcome: 'empty' }),
      )
    })

    it('stores Abandoned as discarded', async () => {
      const wrapper = mountForm()

      await buttonWith(wrapper, 'Abandoned').trigger('click')
      await buttonWith(wrapper, 'Complete Archive Entry').trigger('click')
      await flushPromises()

      // The label and the stored value differ on this one outcome, which is the
      // reason this group exists: nothing else in the codebase states that
      // "Abandoned" and 'discarded' are the same thing.
      expect(savedMetadata()!.outcome).toBe('discarded')
    })

    it('stores Expired as expired', async () => {
      const wrapper = mountForm()

      await buttonWith(wrapper, 'Expired').trigger('click')
      await buttonWith(wrapper, 'Complete Archive Entry').trigger('click')
      await flushPromises()

      expect(savedMetadata()!.outcome).toBe('expired')
    })

    it('carries the notes the user typed and stamps the archive time', async () => {
      const wrapper = mountForm()

      await wrapper.find('textarea').setValue('Broke me out around week three.')
      await buttonWith(wrapper, 'Complete Archive Entry').trigger('click')
      await flushPromises()

      expect(savedMetadata()!.notes).toBe('Broke me out around week three.')
      // Asserted as a parseable instant rather than a fixed string: the value is
      // new Date() at submit time, so pinning it exactly would only pin the
      // clock.
      expect(Number.isNaN(Date.parse(savedMetadata()!.archived_at as string))).toBe(false)
    })

    it('signals success to the parent only when the write lands', async () => {
      const wrapper = mountForm()

      await buttonWith(wrapper, 'Complete Archive Entry').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('success')).toHaveLength(1)
    })

    it('reports the failure without claiming the entry was saved', async () => {
      vi.mocked(updateShelfStatus).mockRejectedValue(new Error('network down'))
      const wrapper = mountForm()
      await wrapper.find('textarea').setValue('Notes worth keeping.')

      await buttonWith(wrapper, 'Complete Archive Entry').trigger('click')
      await flushPromises()

      // No 'success': the parent closes the modal on it, which would discard
      // what the user just typed at the end of the one flow where they typed
      // anything. FE-DEF-17 is the copy; this is the control flow behind it.
      expect(wrapper.emitted('success')).toBeUndefined()
      expect(toasts.value[0]!.message).toBe("Couldn't save this archive entry. Please try again.")
      expect(toasts.value[0]!.type).toBe('error')
    })

    it('re-enables the submit button after a failure so the entry can be retried', async () => {
      vi.mocked(updateShelfStatus).mockRejectedValue(new Error('network down'))
      const wrapper = mountForm()

      await buttonWith(wrapper, 'Complete Archive Entry').trigger('click')
      await flushPromises()

      // Guards the finally block. Without it the only way to resubmit is to
      // reopen the form, which loses the notes.
      expect(buttonWith(wrapper, 'Complete Archive Entry').attributes('disabled')).toBeUndefined()
    })

    it('still holds the notes and the chosen outcome after a failure', async () => {
      // The two cards above establish that a retry is possible and that the
      // parent is not told to close. Neither reads the fields back, so neither
      // shows there is anything left to retry with - a form that cleared itself
      // in the catch would satisfy both of them while losing the one piece of
      // writing in this whole flow.
      vi.mocked(updateShelfStatus).mockRejectedValue(new Error('network down'))
      const wrapper = mountForm()
      await buttonWith(wrapper, 'Abandoned').trigger('click')
      await wrapper.find('textarea').setValue('Notes worth keeping.')

      await buttonWith(wrapper, 'Complete Archive Entry').trigger('click')
      await flushPromises()

      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
        'Notes worth keeping.',
      )
      expect(chosenOutcome(wrapper)).toBe('Abandoned')
    })

    it('leaves the item itself active rather than marking it archived optimistically', async () => {
      // Asserted on the prop object directly rather than inferred from the
      // absence of 'success'. The form does not own this row - the parent does,
      // and it re-reads it from the server - so a component that moved
      // usage_state forward before the write landed would leave the shelf
      // showing a product as archived that the backend still has in the
      // routine.
      vi.mocked(updateShelfStatus).mockRejectedValue(new Error('network down'))
      const item = shelfItem()
      const wrapper = mountForm(item)

      await buttonWith(wrapper, 'Complete Archive Entry').trigger('click')
      await flushPromises()

      expect(item.usage_state).toBe('active')
      expect(item.archive_outcome).toBeNull()
      expect(item.archived_at).toBeNull()
      expect(wrapper.emitted('success')).toBeUndefined()
    })
  })
})
