import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import SafetyCheckModal from '../../components/Shared/SafetyCheckModal.vue'
import { explainedNiacinamide, mergedBuffet } from '../fixtures/conflicts'
import type { DuplicateMatch, SafetyStatus } from '../../api/safety'

type Warning = { alert_type: string; severity: string; message: string }

// The three alert types app/core/services/compatibility_service.py emits, and
// the only three: lines 416, 477 and 509. The modal groups by these names.
const CHEMICAL: Warning = {
  alert_type: 'Chemical Interaction Warning',
  severity: 'Medium',
  message: 'Retinol and AHA together may increase irritation.',
}
const ROUTINE_CLASH: Warning = {
  alert_type: 'Active Routine Clash',
  severity: 'Low',
  message: 'Niacinamide with ascorbic acid may cause short-term flushing.',
}
const SKIN_TYPE: Warning = {
  alert_type: 'Skin Type Conflict',
  severity: 'High',
  message: 'Heavy occlusives are a poor fit for oily skin.',
}

const DUPE: DuplicateMatch = {
  product_id: 'p-9',
  name: 'Hydrating Cream Cleanser',
  brand: 'CeraVe',
  slug: 'cerave-hydrating-cream-cleanser',
  similarity: 72,
  shared_actives: ['Ceramide NP', 'Hyaluronic Acid'],
}

const mountModal = (
  props: Partial<{
    isOpen: boolean
    isLoading: boolean
    hasChecked: boolean
    scanStatus: SafetyStatus | null
    warnings: Warning[]
    duplicates: DuplicateMatch[]
  }> = {},
) =>
  mount(SafetyCheckModal, {
    props: {
      isOpen: true,
      product: { id: 'p-1', name: 'Hydrating Facial Cleanser' },
      isLoading: false,
      hasChecked: true,
      scanStatus: 'cleared' as SafetyStatus | null,
      warnings: [],
      duplicates: [],
      ...props,
    },
    global: { stubs: { teleport: true, RouterLink: { template: '<a><slot /></a>' } } },
  })

/** The four mutually exclusive panel headings, so each card can assert the other three are absent. */
const HEADINGS = ['Evaluation Unavailable', 'Not Assessed', 'No Conflict Detected', 'Interaction Risks Found']

const onlyHeading = (wrapper: VueWrapper, expected: string) => {
  for (const heading of HEADINGS) {
    if (heading === expected) expect(wrapper.text()).toContain(heading)
    else expect(wrapper.text()).not.toContain(heading)
  }
}

const statusDot = (wrapper: VueWrapper) => wrapper.find('span.w-2\\.5.h-2\\.5.rounded-full')

describe('src/components/Shared/SafetyCheckModal.vue', () => {
  describe('render states', () => {
    it('shows only the progress state while the check is running', () => {
      const wrapper = mountModal({ isLoading: true, hasChecked: false, scanStatus: null })

      expect(wrapper.text()).toContain('Running Compatibility Evaluation...')
      // Nothing is claimed yet, in either direction - no verdict panel and no
      // coloured status dot in the header.
      for (const heading of HEADINGS) expect(wrapper.text()).not.toContain(heading)
      expect(statusDot(wrapper).exists()).toBe(false)
    })

    it('reports a check that could not run, and says it is worth retrying', () => {
      const wrapper = mountModal({ scanStatus: 'unavailable' })

      onlyHeading(wrapper, 'Evaluation Unavailable')
      expect(wrapper.text()).toContain('Please try again shortly.')
    })

    it('reports a check that returned no verdict without suggesting a retry', () => {
      // FE-DEF-29. Both statuses mean "not cleared", and they are separated
      // only because the advice differs: retrying fixes one and will never fix
      // the other, so this panel must not borrow the sentence above.
      const wrapper = mountModal({ scanStatus: 'unassessed' })

      onlyHeading(wrapper, 'Not Assessed')
      expect(wrapper.text()).toContain('returned no verdict for this formula')
      expect(wrapper.text()).not.toContain('try again')
    })

    it('fails into the panel that claims least when it has checked but holds no status', () => {
      // hasChecked set with a null status is not a verdict. It is folded into
      // the unavailable panel rather than given its own, which is the same
      // choice blocksAction makes: the state that claims least wins.
      const wrapper = mountModal({ scanStatus: null })

      onlyHeading(wrapper, 'Evaluation Unavailable')
    })

    it('reports a clean result only for an explicit clear', () => {
      const wrapper = mountModal({ scanStatus: 'cleared' })

      onlyHeading(wrapper, 'No Conflict Detected')
      expect(statusDot(wrapper).classes()).toContain('bg-brand-primary')
    })

    it('does not report a clean result from an empty warnings list alone', () => {
      // FE-DEF-03, at the component. `warnings: []` is the shape of a clean
      // result and of a check that never ran, so isSafe reads the status rather
      // than the length - and here the status says the check did not run.
      const wrapper = mountModal({ scanStatus: 'unavailable', warnings: [] })

      expect(wrapper.text()).not.toContain('No Conflict Detected')
      expect(statusDot(wrapper).classes()).toContain('bg-semantic-error')
    })
  })

  describe('conflict grouping', () => {
    it('reports conflicts under a risk header and marks the header as not safe', () => {
      const wrapper = mountModal({ scanStatus: 'warned', warnings: [CHEMICAL] })

      onlyHeading(wrapper, 'Interaction Risks Found')
      expect(statusDot(wrapper).classes()).toContain('bg-semantic-error')
    })

    it('groups both ingredient-interaction types under chemical risks', () => {
      const wrapper = mountModal({ scanStatus: 'warned', warnings: [CHEMICAL, ROUTINE_CLASH] })

      expect(wrapper.text()).toContain('Chemical Interaction Risks')
      expect(wrapper.text()).toContain(CHEMICAL.message)
      expect(wrapper.text()).toContain(ROUTINE_CLASH.message)
      expect(wrapper.text()).not.toContain('Skin Type Contraindications')
    })

    it('groups skin-type conflicts separately from ingredient interactions', () => {
      const wrapper = mountModal({ scanStatus: 'warned', warnings: [SKIN_TYPE] })

      expect(wrapper.text()).toContain('Skin Type Contraindications')
      expect(wrapper.text()).toContain(SKIN_TYPE.message)
      expect(wrapper.text()).not.toContain('Chemical Interaction Risks')
    })

    it('bands each interaction severity by the shared rule rather than two ways', () => {
      // FE-DEF-25: this line was `high ? error : warning`, so Low drew in the
      // same amber as Medium. The band is shared; the colours are this
      // component's own.
      const wrapper = mountModal({ scanStatus: 'warned', warnings: [CHEMICAL, ROUTINE_CLASH] })
      const lines = wrapper.findAll('span.text-\\[10px\\].font-bold.tracking-wide')

      expect(lines.map((l) => l.text())).toEqual(['Severity: Medium', 'Severity: Low'])
      expect(lines[0]!.classes()).toContain('text-semantic-warning')
      expect(lines[1]!.classes()).toContain('text-brand-primary')
    })

    it('omits the severity line for a value it does not recognise', () => {
      const wrapper = mountModal({
        scanStatus: 'warned',
        warnings: [{ ...CHEMICAL, severity: 'catastrophic' }],
      })

      expect(wrapper.text()).not.toContain('Severity:')
      expect(wrapper.text()).toContain(CHEMICAL.message)
    })

    // Recorded rather than covered, because it is a fact about the contract
    // rather than a behaviour: the skin-type line prints "Severity: High"
    // without reading warn.severity. That is accurate today - the backend
    // hardcodes severity="High" for this alert type at line 417 - but it is the
    // same shape FE-DEF-25 removed from the chemical line, a value printed
    // rather than read, and it would go on saying High if the backend ever
    // graded these. Similarly, a warning whose alert_type is none of the three
    // above falls into neither group and renders the risk header over no body.
    // No such type exists today.
  })

  describe('duplicates (advisory)', () => {
    it('lists similar shelf products alongside a clean verdict without changing it', () => {
      const wrapper = mountModal({ scanStatus: 'cleared', duplicates: [DUPE] })

      onlyHeading(wrapper, 'No Conflict Detected')
      expect(wrapper.text()).toContain('You already own something similar')
      expect(wrapper.text()).toContain('Hydrating Cream Cleanser')
      expect(wrapper.text()).toContain('72% of its active ingredients match, including Ceramide NP and Hyaluronic Acid.')
    })

    it('lists them alongside a conflict verdict too, neutrally', () => {
      const wrapper = mountModal({ scanStatus: 'warned', warnings: [CHEMICAL], duplicates: [DUPE] })

      onlyHeading(wrapper, 'Interaction Risks Found')
      expect(wrapper.text()).toContain('Not a conflict')
    })

    it('shows no duplicate section when there are none', () => {
      const wrapper = mountModal({ scanStatus: 'cleared', duplicates: [] })

      expect(wrapper.text()).not.toContain('You already own something similar')
    })

    it('renders a duplicate with no brand or slug as plain text rather than a broken link', () => {
      // Both are nullable in the backend schema, so neither the prefix nor the
      // link can be assumed.
      const wrapper = mountModal({
        scanStatus: 'cleared',
        duplicates: [{ ...DUPE, brand: null, slug: null }],
      })

      expect(wrapper.find('a').exists()).toBe(false)
      expect(wrapper.text()).toContain('Hydrating Cream Cleanser')
      expect(wrapper.text()).not.toContain('CeraVe')
    })
  })

  describe('close', () => {
    it('renders nothing while closed', () => {
      const wrapper = mountModal({ isOpen: false })

      expect(wrapper.text()).toBe('')
    })

    it('closes from the header Dismiss control', async () => {
      const wrapper = mountModal()

      await wrapper.findAll('button').find((b) => b.text() === 'Dismiss')!.trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('closes from the footer control', async () => {
      const wrapper = mountModal()

      await wrapper.findAll('button').find((b) => b.text() === 'Close Safety Report')!.trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('closes from the backdrop but not from a click inside the report', async () => {
      const wrapper = mountModal()

      await wrapper.get('.max-w-md').trigger('click')
      expect(wrapper.emitted('close')).toBeUndefined()

      await wrapper.get('.fixed.inset-0').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('stepping (most severe first)', () => {
    const chem = (severity: string, message: string) => ({ ...CHEMICAL, severity, message })

    it('orders chemical risks most severe first and shows two', () => {
      const wrapper = mountModal({
        scanStatus: 'warned',
        warnings: [chem('Low', 'low one'), chem('Medium', 'medium one'), chem('High', 'high one')],
      })

      expect(wrapper.text()).toContain('high one')
      expect(wrapper.text()).toContain('medium one')
      expect(wrapper.text()).not.toContain('low one')
      expect(wrapper.get('button.show-more').text()).toContain('Show 1 more conflict')
    })

    it('reveals the rest of the group on request', async () => {
      const wrapper = mountModal({
        scanStatus: 'warned',
        warnings: [chem('Low', 'low one'), chem('Medium', 'medium one'), chem('High', 'high one')],
      })

      await wrapper.get('button.show-more').trigger('click')

      expect(wrapper.text()).toContain('low one')
      expect(wrapper.find('button.show-more').exists()).toBe(false)
    })

    it('steps each group on its own, so one long group cannot bury the other', () => {
      const wrapper = mountModal({
        scanStatus: 'warned',
        warnings: [
          chem('High', 'c1'), chem('High', 'c2'), chem('High', 'c3'),
          { ...SKIN_TYPE, message: 's1' }, { ...SKIN_TYPE, message: 's2' }, { ...SKIN_TYPE, message: 's3' },
        ],
      })

      expect(wrapper.text()).toContain('s1')
      expect(wrapper.text()).not.toContain('s3')
      expect(wrapper.findAll('button.show-more')).toHaveLength(2)
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('grouped conflicts and similar products', () => {
    it('lists a merged product conflict pair by pair, two at a time', () => {
      const wrapper = mountModal({ scanStatus: 'warned', warnings: [mergedBuffet() as never] })

      expect(wrapper.text()).toContain('7 ingredient clashes')
      expect(wrapper.findAll('li.conflict-detail')).toHaveLength(2)
      expect(wrapper.get('button.show-more').text()).toContain('Show 1 more clash')
    })

    it('merges several skin-type alerts into one card', () => {
      const wrapper = mountModal({
        scanStatus: 'warned',
        warnings: [{ ...SKIN_TYPE, message: 's1' }, { ...SKIN_TYPE, message: 's2' }, { ...SKIN_TYPE, message: 's3' }],
      })

      expect(wrapper.text()).toContain('Poorly suited to your skin type · 3 ingredients')
      expect(wrapper.findAll('li.conflict-detail')).toHaveLength(2)
    })

    it('shows two similar products, then the rest on request', async () => {
      // Owner request: the dupe list on one product was too long.
      const dupes = Array.from({ length: 5 }, (_, i) => ({ ...DUPE, product_id: 'd-' + i, name: 'Similar ' + (i + 1) }))
      const wrapper = mountModal({ scanStatus: 'cleared', duplicates: dupes })
      const names = () => dupes.map((d) => d.name).filter((n) => wrapper.text().includes(n))

      expect(names()).toEqual(['Similar 1', 'Similar 2'])
      const more = wrapper.findAll('button.show-more').find((b) => b.text().includes('similar products'))!
      expect(more.text()).toContain('Show 2 more similar products')

      await more.trigger('click')
      expect(names()).toHaveLength(4)
    })
  })

  // Appended last, so adding it moves no group ID already cited in this file.
  describe('skin-type grade and explanations', () => {
    it('prints the alert real grade rather than High for every skin-type alert', () => {
      // This line was hardcoded "Severity: High". Accurate while the backend
      // graded every skin-type alert High; it now grades by the concern.
      const wrapper = mountModal({ scanStatus: 'warned', warnings: [explainedNiacinamide() as never] })

      expect(wrapper.get('.skin-grade').text()).toBe('Severity: Medium • Skin Type Conflict')
      expect(wrapper.get('.skin-grade').classes()).toContain('text-semantic-warning')
    })

    it('omits the grade it cannot band instead of defaulting to High', () => {
      const wrapper = mountModal({ scanStatus: 'warned', warnings: [{ ...explainedNiacinamide(), severity: 'Critical' } as never] })

      expect(wrapper.get('.skin-grade').text()).toBe('Skin Type Conflict')
    })

    it('explains the alert beneath its message', () => {
      const wrapper = mountModal({ scanStatus: 'warned', warnings: [explainedNiacinamide() as never] })

      expect(wrapper.text()).toContain('Flush & Stinging Flare')
      expect(wrapper.text()).toContain('Flagged for: Highly Sensitive Skin (S)')
    })
  })
})
