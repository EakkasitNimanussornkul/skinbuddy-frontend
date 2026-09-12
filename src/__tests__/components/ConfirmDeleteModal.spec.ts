import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ConfirmDeleteModal from '../../components/Shared/ConfirmDeleteModal.vue'
import type { ShelfItem } from '../../stores/shelfStore'

const shelfItem = (product: Record<string, unknown> | null = {}): ShelfItem =>
  ({
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
    products:
      product === null
        ? null
        : {
            id: 'p-1',
            brand: 'CeraVe',
            name: 'Hydrating Facial Cleanser',
            category: 'Cleanser',
            slug: 'cerave',
            ingredients: null,
            image_url: 'https://cdn.example.com/cerave.png',
            description: null,
            pao: null,
            price_thb: null,
            price_usd: null,
            ...product,
          },
  }) as ShelfItem

const mountModal = (item: ShelfItem | null = shelfItem()) =>
  mount(ConfirmDeleteModal, { props: { item } })

const buttonLabelled = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === text)

describe('src/components/Shared/ConfirmDeleteModal.vue', () => {
  describe('product identification (render)', () => {
    it('names the product being removed rather than asking in the abstract', () => {
      // The whole purpose of this dialogue: a shelf can hold several similar
      // products, and the card that raised it is behind a backdrop by the time
      // the user reads this.
      const wrapper = mountModal()

      expect(wrapper.text()).toContain('Remove Product?')
      expect(wrapper.text()).toContain('CeraVe')
      expect(wrapper.text()).toContain('Hydrating Facial Cleanser')
      expect(wrapper.get('img').attributes('src')).toBe('https://cdn.example.com/cerave.png')
    })

    it('says what removal costs, in the sentence under the heading', () => {
      const wrapper = mountModal()

      expect(wrapper.text()).toContain('This will remove it from your shelf and routine.')
    })

    it('falls back to a neutral phrase when the product join came back empty', () => {
      const wrapper = mountModal(shelfItem(null))

      // "this product" rather than a blank line or "undefined". The dialogue is
      // still answerable: the user chose the card it was raised from.
      expect(wrapper.text()).toContain('this product')
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('renders without a product at all rather than throwing', () => {
      // `item` is typed nullable, and the host renders this behind
      // `v-if="itemToDelete"` - so this is a guard for the prop's type rather
      // than a reachable state, and it must not be the thing that breaks.
      const wrapper = mountModal(null)

      expect(wrapper.text()).toContain('this product')
      expect(buttonLabelled(wrapper, 'Yes, Remove')).toBeTruthy()
    })
  })

  describe('cancel and confirm', () => {
    it('offers both a refusal and the destructive action, labelled as such', () => {
      const wrapper = mountModal()

      expect(buttonLabelled(wrapper, 'Cancel')).toBeTruthy()
      expect(buttonLabelled(wrapper, 'Yes, Remove')).toBeTruthy()
    })

    it('emits cancel and nothing else when the refusal is taken', async () => {
      const wrapper = mountModal()

      await buttonLabelled(wrapper, 'Cancel')!.trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })

    it('emits confirm when the removal is accepted', async () => {
      const wrapper = mountModal()

      await buttonLabelled(wrapper, 'Yes, Remove')!.trigger('click')

      expect(wrapper.emitted('confirm')).toHaveLength(1)
      expect(wrapper.emitted('cancel')).toBeUndefined()
    })

    it('treats a click on the backdrop as a refusal, never as a confirmation', async () => {
      // The safe direction, and the only acceptable one for a destructive
      // dialogue: a backdrop wired to confirm would let a stray tap outside the
      // card delete a shelf record.
      const wrapper = mountModal()

      await wrapper.get('.fixed.inset-0').trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })

    it('emits nothing when the dialogue body itself is clicked', async () => {
      // The handler is @click.self. Without it, reading the product name would
      // bubble to the backdrop and dismiss the decision.
      const wrapper = mountModal()

      await wrapper.get('.max-w-sm').trigger('click')

      expect(wrapper.emitted('cancel')).toBeUndefined()
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })
  })
})
