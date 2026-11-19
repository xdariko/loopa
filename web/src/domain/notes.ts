import { MIN_NOTE_DURATION } from './constants'
import type { PitchRange } from './instruments'
import type { Note, NoteArea, NoteOffset, Pattern } from './types'

export function findNote(pattern: Pattern, noteId: string): Note | undefined {
  return pattern.notes.find((note) => note.id === noteId)
}

export function noteEnd(note: Note): number {
  return note.step + note.duration
}

function notesOverlap(first: Note, second: Note): boolean {
  return (
    first.pitch === second.pitch && first.step < noteEnd(second) && second.step < noteEnd(first)
  )
}

function fitsGrid(pattern: Pattern, note: Note): boolean {
  return (
    Number.isInteger(note.step) &&
    Number.isInteger(note.duration) &&
    note.step >= 0 &&
    note.duration >= MIN_NOTE_DURATION &&
    noteEnd(note) <= pattern.steps
  )
}

function fitsPitchRange(note: Note, range: PitchRange): boolean {
  return Number.isInteger(note.pitch) && note.pitch >= range.min && note.pitch <= range.max
}

export function canPlaceNotes(
  pattern: Pattern,
  placed: readonly Note[],
  range: PitchRange,
): boolean {
  const placedIds = new Set(placed.map((note) => note.id))
  const result = [...pattern.notes.filter((note) => !placedIds.has(note.id)), ...placed]
  return placed.every(
    (note) =>
      fitsGrid(pattern, note) &&
      fitsPitchRange(note, range) &&
      !result.some((other) => other !== note && notesOverlap(other, note)),
  )
}

export function canPlaceNote(pattern: Pattern, note: Note, range: PitchRange): boolean {
  return canPlaceNotes(pattern, [note], range)
}

function selectNotes(pattern: Pattern, noteIds: readonly string[]): readonly Note[] {
  const ids = new Set(noteIds)
  return pattern.notes.filter((note) => ids.has(note.id))
}

function replaceNotes(pattern: Pattern, updated: readonly Note[], range: PitchRange): Pattern {
  if (updated.length === 0 || !canPlaceNotes(pattern, updated, range)) {
    return pattern
  }
  const byId = new Map(updated.map((note) => [note.id, note]))
  return { ...pattern, notes: pattern.notes.map((note) => byId.get(note.id) ?? note) }
}

export function addNote(pattern: Pattern, note: Note, range: PitchRange): Pattern {
  if (findNote(pattern, note.id) || !canPlaceNote(pattern, note, range)) {
    return pattern
  }
  return { ...pattern, notes: [...pattern.notes, note] }
}

export function moveNotes(
  pattern: Pattern,
  noteIds: readonly string[],
  offset: NoteOffset,
  range: PitchRange,
): Pattern {
  if (offset.steps === 0 && offset.pitches === 0) {
    return pattern
  }
  const moved = selectNotes(pattern, noteIds).map((note) => ({
    ...note,
    step: note.step + offset.steps,
    pitch: note.pitch + offset.pitches,
  }))
  return replaceNotes(pattern, moved, range)
}

export function resizeNotes(
  pattern: Pattern,
  noteIds: readonly string[],
  durationChange: number,
  range: PitchRange,
): Pattern {
  if (durationChange === 0) {
    return pattern
  }
  const resized = selectNotes(pattern, noteIds).map((note) => ({
    ...note,
    duration: note.duration + durationChange,
  }))
  return replaceNotes(pattern, resized, range)
}

export function removeNotes(pattern: Pattern, noteIds: readonly string[]): Pattern {
  const ids = new Set(noteIds)
  const notes = pattern.notes.filter((note) => !ids.has(note.id))
  return notes.length === pattern.notes.length ? pattern : { ...pattern, notes }
}

export function notesStartingAt(pattern: Pattern, step: number): readonly Note[] {
  return pattern.notes.filter((note) => note.step === step)
}

export function notesInArea(pattern: Pattern, area: NoteArea): readonly Note[] {
  return pattern.notes.filter(
    (note) =>
      note.pitch >= area.lowPitch &&
      note.pitch <= area.highPitch &&
      note.step <= area.toStep &&
      noteEnd(note) > area.fromStep,
  )
}
