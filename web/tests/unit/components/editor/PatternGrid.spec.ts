import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import PatternGrid from '@/components/editor/PatternGrid.vue'
import { MELODIC_PITCH_RANGE, type Instrument } from '@/domain/instruments'
import type { Note, Pattern } from '@/domain/types'

const STEPS = 16
const C4 = 60
const LEAD: Instrument = { kind: 'synth', preset: 'lead' }
const DRUMS: Instrument = { kind: 'drums' }

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

  it('labels drum rows by voice', () => {
    const wrapper = mountGrid({ pattern: pattern(), instrument: DRUMS })

    expect(wrapper.findAll('.pattern-grid__label').map((label) => label.text())).toEqual([
      'Hat',
      'Snare',
      'Kick',
    ])
  })

  it('emits add with the clicked cell position', async () => {
    const wrapper = mountGrid({ pattern: pattern(), instrument: LEAD })

    await wrapper.find(`[data-step="3"][data-pitch="${C4}"]`).trigger('click')

    expect(wrapper.emitted('add')).toEqual([[{ step: 3, pitch: C4 }]])
  })

  it('places notes on the grid and emits select on click', async () => {
    const note: Note = { id: 'a', step: 2, pitch: C4, duration: 3 }
    const wrapper = mountGrid({ pattern: pattern(note), instrument: LEAD, selectedNoteId: 'a' })
    const element = wrapper.get('.pattern-grid__note')

    expect(element.classes()).toContain('pattern-grid__note--selected')
    expect(element.attributes('style')).toContain('grid-column: 4 / span 3')

    await element.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['a']])
  })
})
