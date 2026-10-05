import { describe, it, expect } from 'vitest'

// A guard on the code itself: the submission and admin screens show text a
// user typed (names, notes, benefits, links, review notes), so none of them
// may render HTML from a string. Vue's {{ }} and :attr escape; v-html and
// innerHTML do not. The teammate's chat markdown (ChatMarkdown.vue, sanitised)
// is not in this list and is not touched.
const submissions = import.meta.glob('../../components/Submissions/*.{vue,ts}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const views = import.meta.glob(
  [
    '../../views/SubmitProductView.vue',
    '../../views/MySubmissionsView.vue',
    '../../views/AdminSubmissionsView.vue',
    '../../views/ProductEditView.vue',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>
const others = import.meta.glob(
  ['../../components/Catalog/ProductPackClaims.vue', '../../components/Shared/ExternalLink.vue', '../../components/Shared/SourceList.vue'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

const guarded = { ...submissions, ...views, ...others }
const RAW_HTML = /v-html|innerHTML|outerHTML|insertAdjacentHTML/

describe('raw HTML guard (submission and admin screens)', () => {
  describe('files that show user-submitted text', () => {
    it('covers every Submissions component and the four submission views, ProductPackClaims, ExternalLink and SourceList', () => {
      const names = Object.keys(guarded)
      expect(Object.keys(submissions).length).toBeGreaterThanOrEqual(20)
      expect(names).toContain('../../components/Submissions/AdminReviewPanel.vue')
      expect(names).toContain('../../components/Submissions/AdminIngredientDecision.vue')
      expect(names).toContain('../../components/Submissions/RevealedText.vue')
      expect(Object.keys(views)).toHaveLength(4)
      expect(Object.keys(others)).toHaveLength(3)
    })

    it('uses no v-html, innerHTML, outerHTML or insertAdjacentHTML in any of them', () => {
      const offenders = Object.entries(guarded)
        .filter(([, source]) => RAW_HTML.test(source))
        .map(([name]) => name)
      expect(offenders).toEqual([])
    })

    it('binds no :href or :src straight to a value in them: links go through ExternalLink and photos through safeImageSrc', () => {
      const offenders = Object.entries(guarded).flatMap(([name, source]) =>
        [...source.matchAll(/(?::|v-bind:)(href|src)="([^"]*)"/g)]
          // ExternalLink's own checked href, safeImageSrc(...), and ProductEditView's photoUrl (built with it).
          .filter(([, , value]) => !/^(href$|safeImageSrc\(|photoUrl$)/.test(value!))
          .map(([match]) => `${name}: ${match}`),
      )
      expect(offenders).toEqual([])
    })
  })
})
