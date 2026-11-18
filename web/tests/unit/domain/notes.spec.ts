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
  it('accepts notes inside the grid and range, on other pitches or touching others', () => {
    const existing = pattern(note('a', 2, C4, 3))

    expect(canPlaceNote(existing, note('b', STEPS - 1), MELODIC_PITCH_RANGE)).toBe(true)
    expect(canPlaceNote(existing, note('b', 4, D4), MELODIC_PITCH_RANGE)).toBe(true)
    expect(canPlaceNote(existing, note('b', 5), MELODIC_PITCH_RANGE)).toBe(true)
    expect(canPlaceNote(existing, note('b', 0, C4, 2), MELODIC_PITCH_RANGE)).toBe(true)
    expect(canPlaceNote(existing, note('a', 3, C4, 3), MELODIC_PITCH_RANGE)).toBe(true)
  })

  it('rejects notes outside the grid or range and overlapping notes', () => {
    const existing = pattern(note('a', 2, C4, 3))

    expect(canPlaceNote(existing, note('b', -1), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(existing, note('b', STEPS - 1, D4, 2), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(existing, note('b', 0, D4, 0), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(existing, note('b', 0.5, D4), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(existing, note('b', 0, C4), DRUM_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(existing, note('b', 4), MELODIC_PITCH_RANGE)).toBe(false)
    expect(canPlaceNote(existing, note('b', 0, C4, 3), MELODIC_PITCH_RANGE)).toBe(false)
  })
})

describe('pattern edits', () => {
  it('adds a note without touching the original and refuses a blocked spot', () => {
    const original = pattern()
    const result = addNote(original, note('a', 0), MELODIC_PITCH_RANGE)

    expect(result.notes).toEqual([note('a', 0)])
    expect(original.notes).toEqual([])
    expect(addNote(result, note('b', 0), MELODIC_PITCH_RANGE)).toBe(result)
  })

  it('moves a note and keeps the pattern when the move is blocked, unchanged or unknown', () => {
    const original = pattern(note('a', 0), note('b', 4))
    const moved = moveNote(original, 'a', { step: 3, pitch: D4 }, MELODIC_PITCH_RANGE)

    expect(moved.notes[0]).toEqual(note('a', 3, D4))
    expect(moveNote(original, 'a', { step: 4, pitch: C4 }, MELODIC_PITCH_RANGE)).toBe(original)
    expect(moveNote(original, 'a', { step: 0, pitch: C4 }, MELODIC_PITCH_RANGE)).toBe(original)
    expect(moveNote(original, 'missing', { step: 8, pitch: C4 }, MELODIC_PITCH_RANGE)).toBe(
      original,
    )
  })

  it('resizes a note and keeps the pattern when the new length is blocked', () => {
    const original = pattern(note('a', 0), note('b', 4))

    expect(resizeNote(original, 'a', 4, MELODIC_PITCH_RANGE).notes[0]).toEqual(note('a', 0, C4, 4))
    expect(resizeNote(original, 'a', 5, MELODIC_PITCH_RANGE)).toBe(original)
  })

  it('removes a note by id and keeps the pattern when it is missing', () => {
    const original = pattern(note('a', 0), note('b', 4))

    expect(removeNote(original, 'a').notes).toEqual([note('b', 4)])
    expect(removeNote(original, 'missing')).toBe(original)
  })
})
