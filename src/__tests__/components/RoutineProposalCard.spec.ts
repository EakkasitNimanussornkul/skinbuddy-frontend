import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import RoutineProposalCard from '../../components/Routine/RoutineProposalCard.vue'

// The shape POST /routine/generate returns for each step (routine_service.py).
const step = (overrides: Record<string, unknown>) => ({
  product_id: 'p',
  product_name: 'Product',
  brand: 'Brand',
  category: 'serum',
  image_url: null,
  owned: true,
  step_order: 1,
  time_of_day: 'both',
  frequency: 'daily',
  reason: '',
  caution: '',
  ...overrides,
})

const CLEANSER = step({
  product_id: 'p-cleanser', product_name: 'Foaming Cleanser', brand: 'CeraVe',
  image_url: 'https://cdn.example.com/cleanser.jpg', step_order: 1, time_of_day: 'both',
  reason: 'Gentle daily cleanse',
})
const SPF = step({
  product_id: 'p-spf', product_name: 'Anthelios SPF 50', brand: 'La Roche-Posay',
  image_url: 'https://cdn.example.com/spf.jpg', step_order: 2, time_of_day: 'AM', owned: false,
})
const RETINOL = step({
  product_id: 'p-retinol', product_name: 'Retinol 0.2%', brand: 'The Ordinary',
  image_url: null, step_order: 3, time_of_day: 'PM', frequency: '3x_week', owned: false,
  reason: 'Smooths texture over time', caution: 'Start slow; may irritate',
})

const STEPS = [CLEANSER, SPF, RETINOL]

const mountCard = (props: Record<string, unknown> = {}) =>
  mount(RoutineProposalCard, { props: { steps: STEPS, ...props } })

const stepNames = (wrapper: ReturnType<typeof mountCard>) =>
  wrapper.findAll('li.proposal-step').map((li) => li.get('.step-name').text())

describe('src/components/Routine/RoutineProposalCard.vue', () => {
  describe('render', () => {
    it('shows the morning steps first, each with its product photo', () => {
      const wrapper = mountCard()

      expect(stepNames(wrapper)).toEqual(['Foaming Cleanser', 'Anthelios SPF 50'])
      const photos = wrapper.findAll('img.step-photo')
      expect(photos.map((img) => img.attributes('src'))).toEqual([
        'https://cdn.example.com/cleanser.jpg',
        'https://cdn.example.com/spf.jpg',
      ])
      expect(photos[0]!.attributes('alt')).toBe('Foaming Cleanser')
    })

    it('shows a placeholder, not a broken image, for a product with no photo', async () => {
      const wrapper = mountCard()
      await wrapper.findAll('button.session-tab')[1]!.trigger('click')

      const retinol = wrapper.findAll('li.proposal-step').find((li) => li.text().includes('Retinol 0.2%'))!
      expect(retinol.find('img.step-photo').exists()).toBe(false)
      expect(retinol.find('.step-placeholder').exists()).toBe(true)
    })

    it('falls back to the placeholder when a photo fails to load', async () => {
      const wrapper = mountCard()

      await wrapper.findAll('img.step-photo')[0]!.trigger('error')

      const cleanser = wrapper.findAll('li.proposal-step')[0]!
      expect(cleanser.find('img.step-photo').exists()).toBe(false)
      expect(cleanser.find('.step-placeholder').exists()).toBe(true)
    })

    it('counts each product once in the summary, with how many are new', () => {
      const wrapper = mountCard()

      expect(wrapper.get('.summary').text()).toBe('3 products · 2 new')
      expect(wrapper.findAll('.stack-photo')).toHaveLength(3)
    })

    it('marks only products the user does not own as New', () => {
      const wrapper = mountCard()

      const [cleanser, spf] = wrapper.findAll('li.proposal-step')
      expect(cleanser!.find('.new-chip').exists()).toBe(false)
      expect(spf!.find('.new-chip').exists()).toBe(true)
    })

    it('flags a step with a caution without printing the caution text', async () => {
      const wrapper = mountCard()
      await wrapper.findAll('button.session-tab')[1]!.trigger('click')

      const retinol = wrapper.findAll('li.proposal-step').find((li) => li.text().includes('Retinol 0.2%'))!
      expect(retinol.find('.caution-icon').exists()).toBe(true)
      expect(retinol.text()).not.toContain('Start slow')
    })

    it('drops the session switcher when every step is in one session', () => {
      const wrapper = mountCard({ steps: [SPF] })

      expect(wrapper.find('button.session-tab').exists()).toBe(false)
      expect(stepNames(wrapper)).toEqual(['Anthelios SPF 50'])
    })
  })

  describe('session switcher', () => {
    it('lists the evening steps once Evening is chosen', async () => {
      const wrapper = mountCard()

      await wrapper.findAll('button.session-tab')[1]!.trigger('click')

      expect(stepNames(wrapper)).toEqual(['Foaming Cleanser', 'Retinol 0.2%'])
      expect(wrapper.findAll('button.session-tab')[1]!.attributes('aria-selected')).toBe('true')
    })
  })

  describe('toggle()', () => {
    it('reveals a step’s reason and caution only when the step is tapped', async () => {
      const wrapper = mountCard()
      await wrapper.findAll('button.session-tab')[1]!.trigger('click')
      const retinol = () => wrapper.findAll('li.proposal-step')[1]!

      expect(retinol().find('.step-details').exists()).toBe(false)
      await retinol().get('button').trigger('click')

      expect(retinol().get('.step-details').text()).toContain('Smooths texture over time')
      expect(retinol().get('.step-details').text()).toContain('Start slow; may irritate')
      expect(retinol().get('button').attributes('aria-expanded')).toBe('true')
    })

    it('keeps one step open at a time', async () => {
      const wrapper = mountCard()
      await wrapper.findAll('button.session-tab')[1]!.trigger('click')
      const [cleanser, retinol] = wrapper.findAll('li.proposal-step')

      await cleanser!.get('button').trigger('click')
      await retinol!.get('button').trigger('click')

      expect(wrapper.findAll('.step-details')).toHaveLength(1)
      expect(wrapper.get('.step-details').text()).toContain('Smooths texture over time')
    })
  })

  describe('actions', () => {
    it('emits use and adjust from the two action buttons', async () => {
      const wrapper = mountCard()

      await wrapper.findAll('button').find((b) => b.text() === 'Adjust')!.trigger('click')
      await wrapper.findAll('button').find((b) => b.text() === 'Use this routine')!.trigger('click')

      expect(wrapper.emitted('adjust')).toHaveLength(1)
      expect(wrapper.emitted('use')).toHaveLength(1)
    })

    it('offers View routine instead of the actions once applied', async () => {
      const wrapper = mountCard({ applied: true })

      expect(wrapper.text()).toContain('Applied as your routine')
      expect(wrapper.findAll('button').some((b) => b.text() === 'Use this routine')).toBe(false)
      await wrapper.findAll('button').find((b) => b.text() === 'View routine')!.trigger('click')
      expect(wrapper.emitted('view')).toHaveLength(1)
    })
  })
})
