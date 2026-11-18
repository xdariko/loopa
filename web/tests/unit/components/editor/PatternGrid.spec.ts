import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import PatternGrid from '@/components/editor/PatternGrid.vue'
import { MELODIC_PITCH_RANGE, type Instrument } from '@/domain/instruments'
import type { Note, Pattern } from '@/domain/types'

const STEPS = 16
const C4 = 60
const CELL = { width: 20, height: 10 }
const LEAD: Instrument = { kind: 'synth', preset: 'lead' }

function pattern(...notes: Note[]): Pattern {
  return { id: 'pattern', steps: STEPS, notes }
}

function mountGrid(props: { pattern: Pattern; instrument: Instrument; selectedNoteId?: string }) {
  return mount(PatternGrid, { props: { selectedNoteId: null, ...props } })
}

describe('PatternGrid', () => {
  it('renders a row per pitch and a cell per step', () => {
    const wrapper = mountGrid({ pattern: pattern(), instrument: LEAD })
    const rowCount = MELODIC_PITCH_RANGE.max - MELODIC_PITCH_RANGE.min + 1

    expect(wrapper.findAll('.pattern-grid__label')).toHaveLength(rowCount)
    expect(wrapper.findAll('.pattern-grid__cell')).toHaveLength(rowCount * STEPS)
    expect(wrapper.find('.pattern-grid__label').text()).toBe('B5')
  })

  it('emits add with the clicked cell position', async () => {
    const wrapper = mountGrid({ pattern: pattern(), instrument: LEAD })

    await wrapper.find(`[data-step="3"][data-pitch="${C4}"]`).trigger('click')

    expect(wrapper.emitted('add')).toEqual([[{ step: 3, pitch: C4 }]])
  })

  it('places notes on the grid and selects a note on press', async () => {
    const note: Note = { id: 'a', step: 2, pitch: C4, duration: 3 }
    const wrapper = mountGrid({ pattern: pattern(note), instrument: LEAD, selectedNoteId: 'a' })
    const element = wrapper.get('.pattern-grid__note')

    expect(element.classes()).toContain('pattern-grid__note--selected')
    expect(element.attributes('style')).toContain('grid-column: 4 / span 3')

    await element.trigger('pointerdown')

    expect(wrapper.emitted('select')).toEqual([['a']])
  })

  describe('dragging', () => {
    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect(CELL),
      )
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('previews the move, marks a blocked spot and emits move on release', async () => {
      const dragged: Note = { id: 'a', step: 0, pitch: C4, duration: 1 }
      const other: Note = { id: 'b', step: 2, pitch: C4, duration: 1 }
      const wrapper = mountGrid({ pattern: pattern(dragged, other), instrument: LEAD })
      const element = wrapper.get('[aria-label="C4, шаг 1"]')

      await element.trigger('pointerdown')
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: CELL.width * 2 }))
      await nextTick()

      expect(element.attributes('style')).toContain('grid-column: 4 / span 1')
      expect(element.classes()).toContain('pattern-grid__note--blocked')

      window.dispatchEvent(new PointerEvent('pointerup', { clientX: CELL.width * 3 }))
      await nextTick()

      expect(element.classes()).not.toContain('pattern-grid__note--dragging')
      expect(wrapper.emitted('move')).toEqual([['a', { step: 3, pitch: C4 }]])
    })

    it('emits resize from the right edge handle without starting a move', async () => {
      const note: Note = { id: 'a', step: 0, pitch: C4, duration: 1 }
      const wrapper = mountGrid({ pattern: pattern(note), instrument: LEAD })

      await wrapper.get('.pattern-grid__resize').trigger('pointerdown')
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: CELL.width * 3 }))

      expect(wrapper.emitted('select')).toEqual([['a']])
      expect(wrapper.emitted('resize')).toEqual([['a', 4]])
      expect(wrapper.emitted('move')).toBeUndefined()
    })
  })
})
