import { describe, expect, it } from 'vitest'

import { DRUM_PITCH_RANGE, MELODIC_PITCH_RANGE } from '@/domain/instruments'
import { addNote, canPlaceNote, moveNote, removeNote, resizeNote } from '@/domain/notes'
import type { Note, Pattern } from '@/domain/types'

const STEPS = 16
const C4 = 60
const D4 = 62

function note(id: string, step: number, pitch = C4, duration = 1): Note {
  return { id, step, pitch, duration }
}

function pattern(...notes: Note[]): Pattern {
  return { id: 'pattern', steps: STEPS, notes }
}

describe('canPlaceNote', () => {
  it('accepts a note inside the grid and pitch range', () => {
    expect(canPlaceNote(pattern(), note('a', 0, C4, 4), MELODIC_PITCH_RANGE)).toBe(true)
    expect(canPlaceNote(pattern(), note('a', STEPS - 1), MELODIC_PITCH_RANGE)).toBe(true)
  })

  it('rejects notes outside the grid', () => {
    expect(canPlaceNote(pattern(), note('a', -1), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(pattern(), note('a', STEPS), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(pattern(), note('a', STEPS - 1, C4, 2), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(pattern(), note('a', 0, C4, 0), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(pattern(), note('a', 0.5), MELODIC_PITCH_RANGE)).toBe(false)
  })

  it('rejects pitches outside the instrument range', () => {
    expect(canPlaceNote(pattern(), note('a', 0, C4), DRUM_PITCH_RANGE)).toBe(false)
    expect(
      canPlaceNote(pattern(), note('a', 0, MELODIC_PITCH_RANGE.max + 1), MELODIC_PITCH_RANGE),
    ).toBe(false)
  })

  it('rejects overlap on the same pitch but allows other pitches and touching notes', () => {
    const existing = pattern(note('a', 2, C4, 3))

    expect(canPlaceNote(existing, note('b', 4), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(existing, note('b', 0, C4, 3), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(existing, note('b', 4, D4), MELODIC_PITCH_RANGE)).toBe(true)
    expect(canPlaceNote(existing, note('b', 5), MELODIC_PITCH_RANGE)).toBe(true)
    expect(canPlaceNote(existing, note('b', 0, C4, 2), MELODIC_PITCH_RANGE)).toBe(true)
  })

  it('ignores the note itself when checking overlap', () => {
    const existing = pattern(note('a', 2, C4, 3))

    expect(canPlaceNote(existing, note('a', 3, C4, 3), MELODIC_PITCH_RANGE)).toBe(true)
  })
})

describe('addNote', () => {
  it('returns a new pattern with the note and keeps the original untouched', () => {
    const original = pattern()
    const result = addNote(original, note('a', 0), MELODIC_PITCH_RANGE)

    expect(result.notes).toEqual([note('a', 0)])
    expect(original.notes).toEqual([])
  })

  it('returns the same pattern when the note cannot be placed', () => {
    const original = pattern(note('a', 0))

    expect(addNote(original, note('b', 0), MELODIC_PITCH_RANGE)).toBe(original)
    expect(addNote(original, note('a', 5), MELODIC_PITCH_RANGE)).toBe(original)
  })
})

describe('moveNote', () => {
  it('moves a note to a free position', () => {
    const result = moveNote(pattern(note('a', 0)), 'a', { step: 3, pitch: D4 }, MELODIC_PITCH_RANGE)

    expect(result.notes).toEqual([note('a', 3, D4)])
  })

  it('keeps the pattern when the target is occupied, outside the grid or unchanged', () => {
    const original = pattern(note('a', 0), note('b', 4))

    expect(moveNote(original, 'a', { step: 4, pitch: C4 }, MELODIC_PITCH_RANGE)).toBe(original)
    expect(moveNote(original, 'a', { step: STEPS, pitch: C4 }, MELODIC_PITCH_RANGE)).toBe(original)
    expect(moveNote(original, 'a', { step: 0, pitch: C4 }, MELODIC_PITCH_RANGE)).toBe(original)
    expect(moveNote(original, 'missing', { step: 8, pitch: C4 }, MELODIC_PITCH_RANGE)).toBe(
      original,
    )
  })
})

describe('resizeNote', () => {
  it('changes the duration', () => {
    const result = resizeNote(pattern(note('a', 0)), 'a', 4, MELODIC_PITCH_RANGE)

    expect(result.notes).toEqual([note('a', 0, C4, 4)])
  })

  it('keeps the pattern when the new length overlaps, leaves the grid or is too short', () => {
    const original = pattern(note('a', 0), note('b', 4))

    expect(resizeNote(original, 'a', 5, MELODIC_PITCH_RANGE)).toBe(original)
    expect(resizeNote(original, 'b', STEPS, MELODIC_PITCH_RANGE)).toBe(original)
    expect(resizeNote(original, 'a', 0, MELODIC_PITCH_RANGE)).toBe(original)
  })
})

describe('removeNote', () => {
  it('removes the note by id', () => {
    expect(removeNote(pattern(note('a', 0), note('b', 4)), 'a').notes).toEqual([note('b', 4)])
  })

  it('returns the same pattern when the note is missing', () => {
    const original = pattern(note('a', 0))

    expect(removeNote(original, 'missing')).toBe(original)
  })
})
