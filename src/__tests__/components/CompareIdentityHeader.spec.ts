import { describe, it, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import CompareIdentityHeader from '../../components/Compare/CompareIdentityHeader.vue'
import { MATCH_SCORE_BASIS, type CompareResponse } from '../../api/products'
import { useAuthStore } from '../../stores/auth'

const product = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-a',
  brand: 'CeraVe',
  name: 'Hydrating Facial Cleanser',
  category: 'Cleanser',
  image_url: null,
  description: 'A gentle non-foaming cleanser.',
  skin_match_score: 82,
  match_reasons: [],
  product_ingredients: [],
  ...overrides,
})

const compareData = (
  a: Record<string, unknown> = {},
  b: Record<string, unknown> = {},
): CompareResponse => ({
  product_a: product(a),
  product_b: product({ id: 'p-b', name: 'Foaming Facial Cleanser', ...b }),
  shared_ingredients: [],
  similarity_score: 40,
  conflicts: [],
})

/**
 * `skinType: undefined` signs the viewer in with no Baumann type on file, which
 * is distinct from not signing in at all - and is the state FE-DEF-31 was about.
 */
const mountHeader = (
  data: CompareResponse,
  session: { authenticated?: boolean; skinType?: string | null } = {},
) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  const { authenticated = true, skinType = 'OSPW' } = session
  if (authenticated) auth.setAuth('token-1', { id: 'u-1', skin_type: skinType })

  return mount(CompareIdentityHeader, {
    props: { data },
    global: { plugins: [pinia], stubs: { RouterLink: true } },
  })
}

/** The two match badges, in column order. */
const badges = (wrapper: VueWrapper) =>
  wrapper.findAll('span.font-mono').map((s) => s.text())

/** The single explanation line beneath the pair. */
const explanation = (wrapper: VueWrapper) =>
  wrapper.findAll('p').map((p) => p.text()).find((t) => t.startsWith('Skin Match')) ?? ''

describe('src/components/Compare/CompareIdentityHeader.vue', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('matchExplanation', () => {
    it('explains what the number means when both products are scored', () => {
      const wrapper = mountHeader(compareData({ skin_match_score: 82 }, { skin_match_score: 60 }))

      expect(explanation(wrapper)).toContain(MATCH_SCORE_BASIS)
      expect(explanation(wrapper)).not.toContain('could not be scored')
    })

    it('accounts for the unscored product when only one of the pair is scored', () => {
      // The reported defect. The line read product_a alone, on the argument that
      // a missing score is a property of the viewer's profile and therefore the
      // same for both columns - true for signed-out and no-profile, and one case
      // short. 'scored' and 'not-scored' belong to the individual product, so a
      // pair can split between them, and B's empty badge had nothing on the page
      // accounting for it.
      const wrapper = mountHeader(compareData({ skin_match_score: 82 }, { skin_match_score: null }))

      expect(badges(wrapper)[0]).toBe('82% Match')
      expect(badges(wrapper)[1]).toBe('Not scored')
      expect(explanation(wrapper)).toContain(MATCH_SCORE_BASIS)
      expect(explanation(wrapper)).toContain(
        'One of these formulas could not be scored against your profile.',
      )
    })

    it('accounts for it in the same words when the unscored product is the first one', () => {
      // The worse half of the same bug, and the reason reading either column
      // alone is not a fix: with A unscored the line announced a scoring
      // failure directly above B's own percentage.
      const wrapper = mountHeader(compareData({ skin_match_score: null }, { skin_match_score: 60 }))

      expect(badges(wrapper)[0]).toBe('Not scored')
      expect(badges(wrapper)[1]).toBe('60% Match')
      expect(explanation(wrapper)).toContain(MATCH_SCORE_BASIS)
      expect(explanation(wrapper)).toContain('One of these formulas could not be scored')
    })

    it('says neither could be scored, once, when both came back empty', () => {
      const wrapper = mountHeader(
        compareData({ skin_match_score: null }, { skin_match_score: null }),
      )

      expect(explanation(wrapper)).toContain('This formula could not be scored against your profile.')
      // Not the pair sentence: nothing here is scored, so there is no "one of
      // these" to distinguish, and no basis to explain.
      expect(explanation(wrapper)).not.toContain('One of these formulas')
      expect(explanation(wrapper)).not.toContain(MATCH_SCORE_BASIS)
    })

    it('asks a signed-out visitor to sign in rather than reporting two failures', () => {
      // FE-DEF-31 itself. Both columns are necessarily in this state, because
      // the reason is the session rather than either product - which is what
      // makes one sentence correct for both here.
      const wrapper = mountHeader(
        compareData({ skin_match_score: null }, { skin_match_score: null }),
        { authenticated: false },
      )

      expect(badges(wrapper)[0]).toBe('Sign in to score')
      expect(badges(wrapper)[1]).toBe('Sign in to score')
      expect(explanation(wrapper)).toContain('Sign in to see how this suits your skin.')
      expect(explanation(wrapper)).not.toContain('could not be scored')
    })

    it('points a signed-in visitor with no profile at the quiz', () => {
      const wrapper = mountHeader(
        compareData({ skin_match_score: null }, { skin_match_score: null }),
        { skinType: null },
      )

      expect(badges(wrapper)[0]).toBe('Take the skin quiz')
      expect(explanation(wrapper)).toContain('Take the skin quiz to see how this suits your skin.')
      expect(explanation(wrapper)).not.toContain('could not be scored')
    })
  })
})
