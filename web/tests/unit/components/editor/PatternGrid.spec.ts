import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef } from 'vue'

import PatternGrid from '@/components/editor/PatternGrid.vue'
import { providePlaybackCursor } from '@/composables/usePlaybackCursor'
import { MELODIC_PITCH_RANGE, type Instrument } from '@/domain/instruments'
import type { Note, Pattern } from '@/domain/types'

const STEPS = 16
const C4 = 60
const CELL = { width: 20, height: 10 }
const LEAD: Instrument = { kind: 'synth', preset: 'lead' }

function pattern(...notes: Note[]): Pattern {
  return { id: 'pattern', steps: STEPS, notes }
}

async function shiftPress(
  element: { readonly element: Element } | undefined,
  init: PointerEventInit = {},
) {
  element?.element.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, shiftKey: true, ...init }),
  )
  await nextTick()
}

function mountGrid(props: {
  pattern: Pattern
  instrument: Instrument
  selectedNoteIds?: readonly string[]
}) {
  return mount(PatternGrid, { props: { selectedNoteIds: [], ...props } })
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

  it('places notes on the grid, selects on press and toggles with Shift', async () => {
    const first: Note = { id: 'a', step: 2, pitch: C4, duration: 3 }
    const second: Note = { id: 'b', step: 8, pitch: C4, duration: 1 }
    const wrapper = mountGrid({
      pattern: pattern(first, second),
      instrument: LEAD,
      selectedNoteIds: ['a'],
    })
    const [selected, other] = wrapper.findAll('.pattern-grid__note')

    expect(selected?.classes()).toContain('pattern-grid__note--selected')
    expect(selected?.attributes('style')).toContain('grid-column: 4 / span 3')

    await other?.trigger('pointerdown')
    await shiftPress(selected)

    expect(wrapper.emitted('select')).toEqual([['b']])
    expect(wrapper.emitted('toggle')).toEqual([['a']])
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
      expect(wrapper.emitted('move')).toEqual([[['a'], { steps: 3, pitches: 0 }]])
    })

    it('drags every selected note together', async () => {
      const first: Note = { id: 'a', step: 0, pitch: C4, duration: 1 }
      const second: Note = { id: 'b', step: 4, pitch: C4 + 2, duration: 1 }
      const wrapper = mountGrid({
        pattern: pattern(first, second),
        instrument: LEAD,
        selectedNoteIds: ['a', 'b'],
      })

      await wrapper.get('[aria-label="C4, шаг 1"]').trigger('pointerdown')
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: CELL.width }))

      expect(wrapper.emitted('select')).toBeUndefined()
      expect(wrapper.emitted('move')).toEqual([[['a', 'b'], { steps: 1, pitches: 0 }]])
    })

    it('selects the notes inside a Shift-drawn area instead of adding a note', async () => {
      const inside: Note = { id: 'a', step: 3, pitch: C4, duration: 1 }
      const outside: Note = { id: 'b', step: 3, pitch: C4 + 1, duration: 1 }
      const wrapper = mountGrid({ pattern: pattern(inside, outside), instrument: LEAD })
      const cell = wrapper.get(`[data-step="2"][data-pitch="${C4}"]`)

      await shiftPress(cell, { clientX: 5, clientY: 5 })
      window.dispatchEvent(
        new PointerEvent('pointermove', { clientX: 5 + CELL.width * 3, clientY: 5 + CELL.height }),
      )
      await nextTick()

      expect(wrapper.find('[data-testid="selection-area"]').exists()).toBe(true)
      expect(wrapper.get('[aria-label="C4, шаг 4"]').classes()).toContain(
        'pattern-grid__note--selected',
      )

      window.dispatchEvent(
        new PointerEvent('pointerup', { clientX: 5 + CELL.width * 3, clientY: 5 + CELL.height }),
      )
      cell.element.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))
      await nextTick()

      expect(wrapper.find('[data-testid="selection-area"]').exists()).toBe(false)
      expect(wrapper.emitted('selectArea')).toEqual([[['a']]])
      expect(wrapper.emitted('add')).toBeUndefined()
    })

    it('emits resize from the right edge handle without starting a move', async () => {
      const note: Note = { id: 'a', step: 0, pitch: C4, duration: 1 }
      const wrapper = mountGrid({ pattern: pattern(note), instrument: LEAD })

      await wrapper.get('.pattern-grid__resize').trigger('pointerdown')
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: CELL.width * 3 }))

      expect(wrapper.emitted('select')).toEqual([['a']])
      expect(wrapper.emitted('resize')).toEqual([[['a'], 3]])
      expect(wrapper.emitted('move')).toBeUndefined()
    })
  })

  it('lights up the playing notes', () => {
    const first: Note = { id: 'a', step: 0, pitch: C4, duration: 1 }
    const second: Note = { id: 'b', step: 4, pitch: C4, duration: 1 }
    const wrapper = mount(PatternGrid, {
      props: {
        pattern: pattern(first, second),
        instrument: LEAD,
        selectedNoteIds: [],
        playingNoteIds: new Set(['b']),
      },
    })

    const notes = wrapper.findAll('.pattern-grid__note')
    expect(notes[0]?.classes()).not.toContain('pattern-grid__note--playing')
    expect(notes[1]?.classes()).toContain('pattern-grid__note--playing')
  })

  it('shows the playhead at the provided playback position', async () => {
    const position = shallowRef<number | null>(null)
    const Host = defineComponent({
      setup() {
        providePlaybackCursor({
          position,
          bar: shallowRef(null),
          patterns: shallowRef(new Map()),
          playingNoteIds: shallowRef(new Set()),
        })
        return () => h(PatternGrid, { pattern: pattern(), instrument: LEAD, selectedNoteIds: [] })
      },
    })
    const wrapper = mount(Host)

    expect(wrapper.find('[data-testid="playhead"]').exists()).toBe(false)

    position.value = 4
    await nextTick()

    const line = wrapper.get('.playhead__line').element as HTMLElement
    expect(line.style.getPropertyValue('--playhead-progress')).toBe(String(4 / STEPS))
  })
})
