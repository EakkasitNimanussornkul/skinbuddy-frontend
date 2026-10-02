import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createApp } from 'vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useQuizStore } from '../../stores/quizStore'
import type { Sex } from '../../data/quizQuestions'
import { P, coreIds } from '../fixtures/quizAnswers'

// Feature #2 - Take skinquiz. The "About you" answer stays in memory even with
// the Pinia set up the way the app sets it up. src/main.ts installs
// pinia-plugin-persistedstate, which writes a store to localStorage (or to a
// storage of its choosing) the moment it is given a `persist` option. The
// privacy card in quizScoring.spec.ts uses a plain Pinia with no plugin, so it
// could not see that happen; these cards can.
//
// Every it() string is phrased as the expected result, because the Test Record
// generator lifts it verbatim into the "Expected Unit Output" field.

/**
 * A Pinia set up as src/main.ts sets it up. It is installed on an app because
 * Pinia only applies its plugins once it is; a Pinia that is never installed
 * would leave the plugin unused and every card here passing for nothing.
 */
const appPinia = () => {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  setActivePinia(pinia)
  return pinia
}

/** A store that does ask to be persisted: proof the plugin is live in this test. */
const useControlStore = defineStore('quiz-persistence-control', {
  state: () => ({ value: '' }),
  persist: true,
})

/** Every key and value in localStorage and sessionStorage, as one string. */
const everythingStored = () => {
  const out: string[] = []
  for (const storage of [localStorage, sessionStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)!
      out.push(key, storage.getItem(key) ?? '')
    }
  }
  return out.join('\n')
}

describe('useQuizStore (with the app\'s persisted-state plugin)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('"About you" with the persisted-state plugin installed', () => {
    it('keeps each "About you" answer out of localStorage and sessionStorage, while a store that asks to be persisted is written', async () => {
      for (const sex of ['female', 'male', 'unspecified'] as Sex[]) {
        localStorage.clear()
        sessionStorage.clear()
        appPinia()
        const control = useControlStore()
        const store = useQuizStore()

        control.value = 'written'
        store.start()
        store.chooseSex(sex)
        store.answerQuestion(coreIds('hydration', sex)[0]!, P(3))
        await flushPromises()

        expect(localStorage.getItem('quiz-persistence-control')).toContain('written')
        expect(store.sex).toBe(sex)
        const stored = everythingStored()
        expect(stored).not.toContain(sex)
        expect(stored).not.toContain('"sex"')
        expect(stored).not.toContain('hyd-1')
      }
    })

    it('is not set up to be persisted: the plugin gives the quiz store no $persist or $hydrate', () => {
      appPinia()
      const control = useControlStore()
      const store = useQuizStore()

      // The plugin adds these only to a store with a `persist` option, of any
      // shape (true, a storage, a pick list), so this fails for all of them.
      expect(typeof control.$persist).toBe('function')
      expect('$persist' in store).toBe(false)
      expect('$hydrate' in store).toBe(false)
    })

    it('does not read back a quiz state found in localStorage, so a stored "About you" answer never returns', () => {
      localStorage.setItem('quiz', JSON.stringify({ sex: 'female', answers: { 'hyd-1': P(4) }, step: { kind: 'result' } }))
      appPinia()

      const store = useQuizStore()

      expect(store.sex).toBeNull()
      expect(store.answers).toEqual({})
      expect(store.step).toEqual({ kind: 'start' })
    })
  })
})
