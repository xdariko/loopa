import { describe, expect, it } from 'vitest'

import { DRUM_PITCH_RANGE, MELODIC_PITCH_RANGE } from '@/domain/instruments'
import {
  addNote,
  canPlaceNote,
  moveNotes,
  notesInArea,
  removeNotes,
  resizeNotes,
} from '@/domain/notes'
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

  it('moves a group together, even onto spots its own notes leave free', () => {
    const original = pattern(note('a', 0), note('b', 1), note('c', 8))
    const moved = moveNotes(original, ['a', 'b'], { steps: 1, pitches: 2 }, MELODIC_PITCH_RANGE)

    expect(moved.notes).toEqual([note('a', 1, D4), note('b', 2, D4), note('c', 8)])
    expect(
      moveNotes(original, ['a', 'b'], { steps: 1, pitches: 0 }, MELODIC_PITCH_RANGE).notes,
    ).toEqual([note('a', 1), note('b', 2), note('c', 8)])
  })

  it('keeps the pattern when any note of the group cannot move', () => {
    const original = pattern(note('a', 0), note('b', 6), note('c', 8))

    expect(moveNotes(original, ['a', 'b'], { steps: 2, pitches: 0 }, MELODIC_PITCH_RANGE)).toBe(
      original,
    )
    expect(moveNotes(original, ['a', 'c'], { steps: 8, pitches: 0 }, MELODIC_PITCH_RANGE)).toBe(
      original,
    )
    expect(moveNotes(original, ['a'], { steps: 0, pitches: 0 }, MELODIC_PITCH_RANGE)).toBe(original)
    expect(moveNotes(original, ['missing'], { steps: 1, pitches: 0 }, MELODIC_PITCH_RANGE)).toBe(
      original,
    )
  })

  it('resizes a group by the same amount unless one of the notes is blocked', () => {
    const original = pattern(note('a', 0), note('b', 0, D4), note('c', 4))

    expect(resizeNotes(original, ['a', 'b'], 3, MELODIC_PITCH_RANGE).notes).toEqual([
      note('a', 0, C4, 4),
      note('b', 0, D4, 4),
      note('c', 4),
    ])
    expect(resizeNotes(original, ['a', 'b'], 4, MELODIC_PITCH_RANGE)).toBe(original)
  })

  it('removes the given notes and keeps the pattern when none of them exist', () => {
    const original = pattern(note('a', 0), note('b', 4), note('c', 8))

    expect(removeNotes(original, ['a', 'c']).notes).toEqual([note('b', 4)])
    expect(removeNotes(original, ['missing'])).toBe(original)
  })
})

describe('notesInArea', () => {
  it('finds notes that start or end inside the area', () => {
    const existing = pattern(
      note('a', 0, C4, 4),
      note('b', 5, D4),
      note('c', 6, C4 - 1),
      note('d', 9),
    )

    const found = notesInArea(existing, { fromStep: 3, toStep: 6, lowPitch: C4, highPitch: D4 })

    expect(found.map(({ id }) => id)).toEqual(['a', 'b'])
  })
})
