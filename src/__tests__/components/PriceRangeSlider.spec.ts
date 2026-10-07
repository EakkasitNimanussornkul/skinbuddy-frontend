import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import PriceRangeSlider from '../../components/Catalog/PriceRangeSlider.vue'

const mounted: VueWrapper[] = []
const mountSlider = (props: Record<string, unknown> = {}) => {
  const w = mount(PriceRangeSlider, { props: { minPrice: 0, maxCap: null, ...props }, attachTo: document.body })
  mounted.push(w)
  return w
}

const lowBox = (w: VueWrapper) => w.get<HTMLInputElement>('.price-input-low')
const highBox = (w: VueWrapper) => w.get<HTMLInputElement>('.price-input-high')
const lowHandle = (w: VueWrapper) => w.get<HTMLInputElement>('input[aria-label="Lowest price"]')
const highHandle = (w: VueWrapper) => w.get<HTMLInputElement>('input[aria-label="Highest price"]')

/** Types into a box and leaves it, which is when the number is kept. */
const typeAndLeave = async (box: ReturnType<typeof lowBox>, text: string) => {
  await box.setValue(text)
  await box.trigger('blur')
}
const lastUpdate = (w: VueWrapper) => {
  const all = w.emitted('update:range')!
  return all[all.length - 1]![0]
}

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
  document.body.innerHTML = ''
})

describe('feat/27 the shared price slider: typed boxes and a bar, in a popover and in the sheet', () => {
  describe('the boxes and the bar', () => {
    it.each(['popover', 'sheet'] as const)('has a labelled Lowest and Highest box with a baht sign and a numeric keyboard in the %s', (variant) => {
      const w = mountSlider({ variant })

      expect(w.findAll('label').map((l) => l.text().replace('฿', '').trim())).toEqual(['Lowest', 'Highest'])
      for (const box of [lowBox(w), highBox(w)]) {
        expect(box.attributes('inputmode')).toBe('numeric')
        expect(box.attributes('type')).toBe('text')
      }
      expect(w.findAll('label').every((l) => l.text().includes('฿'))).toBe(true)
      expect(w.findAll('label [aria-hidden="true"]').every((el) => el.text() === '฿')).toBe(true)
    })

    it('shows 0 and "1,500+" in the boxes by default, with "฿1,500+" at the end of the bar', () => {
      const w = mountSlider()

      expect([lowBox(w).element.value, highBox(w).element.value]).toEqual(['0', '1,500+'])
      expect(w.get('.price-scale').text()).toBe('฿0฿1,500+')
      expect(w.get('.price-scale-end').text()).toBe('฿1,500+')
      expect(highHandle(w).element.value).toBe('1500')
    })

    it('says "฿1,500+ means no upper limit" and how to set your own, until the bar has grown', () => {
      const w = mountSlider()

      expect(w.get('.price-hint').text()).toBe('฿1,500+ means no upper limit. Type a higher number in Highest to set your own.')
    })

    it('describes the grown bar once a higher cap is set: "The bar now runs to ฿3,000 to fit your highest price."', () => {
      const w = mountSlider({ maxCap: 3000 })

      expect(w.get('.price-hint').text()).toBe('The bar now runs to ฿3,000 to fit your highest price.')
      expect(w.get('.price-scale-end').text()).toBe('฿3,000')
      expect(highBox(w).element.value).toBe('3,000')
      expect(highHandle(w).attributes('max')).toBe('3000')
    })

    it('ties the hint to the Highest box for a screen reader', () => {
      const w = mountSlider()

      expect(highBox(w).attributes('aria-describedby')).toBe(w.get('.price-hint').attributes('id'))
    })

    it('names the handles and reads the highest as "no upper limit" at the end of the default bar, and in baht elsewhere', async () => {
      const w = mountSlider({ minPrice: 200, maxCap: 800 })

      expect(highHandle(w).attributes('aria-valuetext')).toBe('800 baht')
      expect(lowHandle(w).attributes('aria-valuetext')).toBe('200 baht')
      await w.setProps({ maxCap: null })
      expect(highHandle(w).attributes('aria-valuetext')).toBe('no upper limit')
    })

    it('keeps the track from scrolling a sheet sideways and pans only along it', () => {
      const w = mountSlider()

      expect(w.get('.price-track').classes()).toContain('touch-pan-x')
    })
  })

  describe('typing a number', () => {
    it('moves the handle while the number is typed, and keeps it only on blur', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await highBox(w).setValue('750')
      expect(highHandle(w).element.value).toBe('750')
      expect(w.emitted('update:range')).toBeUndefined()

      await highBox(w).trigger('blur')
      expect(lastUpdate(w)).toEqual({ min: 0, maxCap: 750 })
    })

    it('keeps a typed number on Enter as well as on blur', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await lowBox(w).setValue('300')
      await lowBox(w).trigger('keydown', { key: 'Enter' })

      expect(lastUpdate(w)).toEqual({ min: 300, maxCap: null })
      expect(lowHandle(w).element.value).toBe('300')
    })

    it('puts the previous value back when what was typed is not a number', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 200, maxCap: 800 })

      await typeAndLeave(lowBox(w), 'abc')
      await typeAndLeave(highBox(w), '12.5')

      expect([lowBox(w).element.value, highBox(w).element.value]).toEqual(['200', '800'])
      expect(w.emitted('update:range')).toBeUndefined()
    })

    it('reads an empty Highest as no limit, and an empty Lowest as 0', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 200, maxCap: 800 })

      await typeAndLeave(highBox(w), '')
      expect(lastUpdate(w)).toEqual({ min: 200, maxCap: null })
      expect(highBox(w).element.value).toBe('1,500+')

      await typeAndLeave(lowBox(w), '')
      expect(lastUpdate(w)).toEqual({ min: 0, maxCap: null })
      expect(lowBox(w).element.value).toBe('0')
    })

    it('leaves "1,500+" read back as it is, not as a cap of 1,500', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await highBox(w).trigger('blur')

      expect(w.emitted('update:range')).toBeUndefined()
      expect(highBox(w).element.value).toBe('1,500+')
    })

    it('sets a cap and grows the bar to fit a Highest above 1,500, rounded up to the next 500', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await typeAndLeave(highBox(w), '3,000')
      expect(lastUpdate(w)).toEqual({ min: 0, maxCap: 3000 })
      expect(w.get('.price-scale-end').text()).toBe('฿3,000')
      expect(highHandle(w).attributes('max')).toBe('3000')
      expect(highHandle(w).element.value).toBe('3000')
      expect(w.get('.price-hint').text()).toBe('The bar now runs to ฿3,000 to fit your highest price.')

      await typeAndLeave(highBox(w), '3100')
      expect(w.get('.price-scale-end').text()).toBe('฿3,500')
      expect(highHandle(w).attributes('max')).toBe('3500')
    })

    it('never grows the bar past 20,000, and cuts a larger Highest back to 20,000', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await typeAndLeave(highBox(w), '25000')

      expect(lastUpdate(w)).toEqual({ min: 0, maxCap: 20000 })
      expect(highBox(w).element.value).toBe('20,000')
      expect(w.get('.price-scale-end').text()).toBe('฿20,000')
    })

    it('treats a typed 1,500 as a real cap of 1,500, on a bar that runs a little past it', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await typeAndLeave(highBox(w), '1500')

      expect(lastUpdate(w)).toEqual({ min: 0, maxCap: 1500 })
      expect(highBox(w).element.value).toBe('1,500')
      expect(w.get('.price-scale-end').text()).toBe('฿2,000')
    })

    it('shrinks the bar back to the default when the cap is typed back below 1,500', async () => {
      const w = mountSlider({ variant: 'sheet', maxCap: 3000 })

      await typeAndLeave(highBox(w), '800')

      expect(w.get('.price-scale-end').text()).toBe('฿1,500+')
      expect(w.get('.price-hint').text()).toContain('means no upper limit')
    })

    it('keeps the two prices 20 baht apart when a Highest at or below the Lowest is typed', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 400, maxCap: 900 })

      await typeAndLeave(highBox(w), '410')
      expect(lastUpdate(w)).toEqual({ min: 400, maxCap: 420 })
      expect(highBox(w).element.value).toBe('420')

      await typeAndLeave(highBox(w), '100')
      expect(lastUpdate(w)).toEqual({ min: 400, maxCap: 420 })
    })

    it('keeps the two prices 20 baht apart when a Lowest at or above the Highest is typed', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 100, maxCap: 800 })

      await typeAndLeave(lowBox(w), '790')

      expect(lastUpdate(w)).toEqual({ min: 780, maxCap: 800 })
      expect(lowBox(w).element.value).toBe('780')
    })

    it('stops a Lowest above the end of the default bar 20 baht short of it, with no limit set', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await typeAndLeave(lowBox(w), '5000')

      expect(lastUpdate(w)).toEqual({ min: 1480, maxCap: null })
    })

    it('keeps a typed number on Enter in Highest as well as in Lowest', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await highBox(w).setValue('900')
      await highBox(w).trigger('keydown', { key: 'Enter' })

      expect(lastUpdate(w)).toEqual({ min: 0, maxCap: 900 })
    })

    it('leaves a bar that grew alone when Highest is entered and left again without a change', async () => {
      const w = mountSlider({ variant: 'sheet', maxCap: 3000 })
      highHandle(w).element.value = '2000'
      await highHandle(w).trigger('input')
      expect(highBox(w).element.value).toBe('2,000')

      await highBox(w).trigger('blur')

      // Read back as typed, 2,000 would have shrunk the bar to 2,000.
      expect(highHandle(w).attributes('max')).toBe('3000')
      expect(w.get('.price-scale-end').text()).toBe('฿3,000')
    })

    it('keeps the Lowest below the bar when the cap is cleared from a grown bar', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 2500, maxCap: 3000 })

      await typeAndLeave(highBox(w), '')

      expect(lastUpdate(w)).toEqual({ min: 1480, maxCap: null })
      expect(lowBox(w).element.value).toBe('1,480')
    })
  })

  describe('moving a handle', () => {
    const move = async (handle: ReturnType<typeof lowHandle>, value: number) => {
      handle.element.value = String(value)
      await handle.trigger('input')
    }

    it('means no limit when the highest handle is at the very end of the default bar', async () => {
      const w = mountSlider({ variant: 'sheet', maxCap: 800 })

      await move(highHandle(w), 1500)

      expect(lastUpdate(w)).toEqual({ min: 0, maxCap: null })
      expect(highBox(w).element.value).toBe('1,500+')
    })

    it('means that number, shown without a plus, at the end of a bar that grew from a typed cap', async () => {
      const w = mountSlider({ variant: 'sheet', maxCap: 3000 })

      await move(highHandle(w), 2000)
      expect(lastUpdate(w)).toEqual({ min: 0, maxCap: 2000 })
      await move(highHandle(w), 3000)

      expect(lastUpdate(w)).toEqual({ min: 0, maxCap: 3000 })
      expect(highBox(w).element.value).toBe('3,000')
      expect(w.get('.price-scale-end').text()).toBe('฿3,000')
    })

    it('keeps the bar where it is while the highest handle is moved on it', async () => {
      const w = mountSlider({ variant: 'sheet', maxCap: 3000 })

      await move(highHandle(w), 1000)

      expect(highHandle(w).attributes('max')).toBe('3000')
    })

    it('updates the boxes as a handle moves', async () => {
      const w = mountSlider({ variant: 'sheet' })

      await move(lowHandle(w), 400)

      expect(lowBox(w).element.value).toBe('400')
    })
  })

  describe('the popover buttons and the sheet', () => {
    it('keeps the changes in the popover until Apply, then reports the lowest and the cap', async () => {
      const w = mountSlider({ variant: 'popover' })

      await typeAndLeave(lowBox(w), '200')
      await typeAndLeave(highBox(w), '3000')
      expect(w.emitted('update:range')).toBeUndefined()
      expect(w.emitted('apply')).toBeUndefined()

      await w.get('button.price-apply').trigger('click')

      expect(w.emitted('apply')).toEqual([[{ min: 200, maxCap: 3000 }]])
    })

    it('reports no limit as a null cap from Apply when the highest was left alone', async () => {
      const w = mountSlider({ variant: 'popover', minPrice: 200 })

      await w.get('button.price-apply').trigger('click')

      expect(w.emitted('apply')).toEqual([[{ min: 200, maxCap: null }]])
    })

    it('sets the boxes and the bar back to 0 and the default bar on Clear, and says so', async () => {
      const w = mountSlider({ variant: 'popover', minPrice: 200, maxCap: 3000 })

      await w.get('button.price-clear').trigger('click')

      expect(w.emitted('clear')).toHaveLength(1)
      expect([lowBox(w).element.value, highBox(w).element.value]).toEqual(['0', '1,500+'])
      expect(w.get('.price-scale-end').text()).toBe('฿1,500+')
    })

    it('has no buttons in the sheet, which reports every change as it happens', async () => {
      const w = mountSlider({ variant: 'sheet' })

      expect(w.findAll('button')).toHaveLength(0)
      await typeAndLeave(lowBox(w), '300')
      expect(w.emitted('update:range')).toHaveLength(1)
      expect(w.emitted('apply')).toBeUndefined()
    })

    it('takes a new range from outside, such as "Clear all" in the sheet, and sets the bar to match', async () => {
      const w = mountSlider({ variant: 'sheet', minPrice: 200, maxCap: 3000 })
      await flushPromises()

      await w.setProps({ minPrice: 0, maxCap: null })

      expect([lowBox(w).element.value, highBox(w).element.value]).toEqual(['0', '1,500+'])
      expect(w.get('.price-scale-end').text()).toBe('฿1,500+')
    })

    it('does not redraw the bar when the sheet only echoes back the cap it was just given', async () => {
      const w = mountSlider({ variant: 'sheet', maxCap: 3000 })
      highHandle(w).element.value = '2000'
      await highHandle(w).trigger('input')

      await w.setProps({ maxCap: 2000 })

      expect(highHandle(w).attributes('max')).toBe('3000')
    })
  })
})

describe('feat/27 the note about products with no listed price', () => {
  const NOTE = 'Products with no listed price are hidden while a price filter is on.'

  it.each(['popover', 'sheet'] as const)('is absent from the %s while no price filter is on', (variant) => {
    const w = mountSlider({ variant })

    expect(w.find('.price-unpriced-note').exists()).toBe(false)
    expect(w.text()).not.toContain('no listed price')
  })

  it.each(['popover', 'sheet'] as const)('shows under the hint in the %s once the lowest price is above 0', (variant) => {
    const w = mountSlider({ variant, minPrice: 200 })

    expect(w.get('.price-unpriced-note').text()).toBe(NOTE)
    expect(w.get('.price-hint').element.nextElementSibling).toBe(w.get('.price-unpriced-note').element)
  })

  it.each(['popover', 'sheet'] as const)('shows in the %s once there is a cap', (variant) => {
    const w = mountSlider({ variant, maxCap: 800 })

    expect(w.get('.price-unpriced-note').text()).toBe(NOTE)
  })

  it('comes and goes as a number is typed and cleared, and goes on Clear', async () => {
    const w = mountSlider({ variant: 'popover' })

    await typeAndLeave(highBox(w), '800')
    expect(w.find('.price-unpriced-note').exists()).toBe(true)

    await typeAndLeave(highBox(w), '')
    expect(w.find('.price-unpriced-note').exists()).toBe(false)

    await typeAndLeave(lowBox(w), '100')
    expect(w.find('.price-unpriced-note').exists()).toBe(true)
    await w.get('button.price-clear').trigger('click')
    expect(w.find('.price-unpriced-note').exists()).toBe(false)
  })
})
