import { MIN_NOTE_DURATION } from './constants'
import type { PitchRange } from './instruments'
import type { Note, NotePosition, Pattern } from './types'

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

export function canPlaceNote(pattern: Pattern, note: Note, range: PitchRange): boolean {
  return (
    fitsGrid(pattern, note) &&
    fitsPitchRange(note, range) &&
    !pattern.notes.some((other) => other.id !== note.id && notesOverlap(other, note))
  )
}

function isSameNote(first: Note, second: Note): boolean {
  return (
    first.step === second.step && first.pitch === second.pitch && first.duration === second.duration
  )
}

function replaceNote(pattern: Pattern, updated: Note, range: PitchRange): Pattern {
  const current = findNote(pattern, updated.id)
  if (!current || isSameNote(current, updated) || !canPlaceNote(pattern, updated, range)) {
    return pattern
  }
  return {
    ...pattern,
    notes: pattern.notes.map((note) => (note.id === updated.id ? updated : note)),
  }
}

export function addNote(pattern: Pattern, note: Note, range: PitchRange): Pattern {
  if (findNote(pattern, note.id) || !canPlaceNote(pattern, note, range)) {
    return pattern
  }
  return { ...pattern, notes: [...pattern.notes, note] }
}

export function moveNote(
  pattern: Pattern,
  noteId: string,
  position: NotePosition,
  range: PitchRange,
): Pattern {
  const note = findNote(pattern, noteId)
  if (!note) {
    return pattern
  }
  return replaceNote(pattern, { ...note, step: position.step, pitch: position.pitch }, range)
}

export function resizeNote(
  pattern: Pattern,
  noteId: string,
  duration: number,
  range: PitchRange,
): Pattern {
  const note = findNote(pattern, noteId)
  if (!note) {
    return pattern
  }
  return replaceNote(pattern, { ...note, duration }, range)
}

export function removeNote(pattern: Pattern, noteId: string): Pattern {
  if (!findNote(pattern, noteId)) {
    return pattern
  }
  return { ...pattern, notes: pattern.notes.filter((note) => note.id !== noteId) }
}
