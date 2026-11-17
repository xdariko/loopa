import { describe, expect, it } from 'vitest'

import {
  DRUM_PITCH_RANGE,
  MELODIC_PITCH_RANGE,
  isSharpPitch,
  pitchLabel,
  pitchesFor,
  type Instrument,
} from '@/domain/instruments'

const LEAD: Instrument = { kind: 'synth', preset: 'lead' }
const DRUMS: Instrument = { kind: 'drums' }
const C4 = 60

describe('pitchLabel', () => {
  it('names melodic pitches with scientific pitch notation', () => {
    expect(pitchLabel(LEAD, C4)).toBe('C4')
    expect(pitchLabel(LEAD, C4 + 1)).toBe('C#4')
    expect(pitchLabel(LEAD, MELODIC_PITCH_RANGE.min)).toBe('C3')
    expect(pitchLabel(LEAD, MELODIC_PITCH_RANGE.max)).toBe('B5')
  })

  it('names drum pitches by voice', () => {
    expect(pitchLabel(DRUMS, 0)).toBe('Kick')
    expect(pitchLabel(DRUMS, 2)).toBe('Hat')
  })
})

describe('isSharpPitch', () => {
  it('marks sharps for melodic instruments only', () => {
    expect(isSharpPitch(LEAD, C4)).toBe(false)
    expect(isSharpPitch(LEAD, C4 + 1)).toBe(true)
    expect(isSharpPitch(DRUMS, 1)).toBe(false)
  })
})

describe('pitchesFor', () => {
  it('lists the whole range from the highest pitch down', () => {
    const melodic = pitchesFor(LEAD)
    expect(melodic).toHaveLength(MELODIC_PITCH_RANGE.max - MELODIC_PITCH_RANGE.min + 1)
    expect(melodic[0]).toBe(MELODIC_PITCH_RANGE.max)
    expect(melodic[melodic.length - 1]).toBe(MELODIC_PITCH_RANGE.min)

    expect(pitchesFor(DRUMS)).toEqual([DRUM_PITCH_RANGE.max, 1, DRUM_PITCH_RANGE.min])
  })
})
