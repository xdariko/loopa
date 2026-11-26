import { shallowRef } from 'vue'

import { MIN_NOTE_DURATION } from '@/domain/constants'
import type { PitchRange } from '@/domain/instruments'
import { noteEnd } from '@/domain/notes'
import { clamp } from '@/domain/numbers'
import type { Note, NoteOffset } from '@/domain/types'

import { usePointerDrag, type PointerDelta } from './usePointerDrag'

export interface GridCellSize {
  readonly width: number
  readonly height: number
}

export interface NoteDragBounds {
  readonly steps: number
  readonly range: PitchRange
}

export interface NoteDragOptions {
  readonly bounds: () => NoteDragBounds
  readonly cellSize: () => GridCellSize | null
  readonly scrollContainer: () => HTMLElement | null
  readonly onMove: (noteIds: readonly string[], offset: NoteOffset) => void
  readonly onResize: (noteIds: readonly string[], durationChange: number) => void
}

type DragMode = 'move' | 'resize'
type DragChange = { readonly mode: 'move'; readonly offset: NoteOffset } | { readonly mode: 'resize'; readonly durationChange: number }

function cellShift(pixels: number, cellSize: number, min: number, max: number): number {
  const shift = clamp(Math.round(pixels / cellSize), min, max)
  return shift === 0 ? 0 : shift
}

function moveOffset(notes: readonly Note[], delta: PointerDelta, size: GridCellSize, bounds: NoteDragBounds): NoteOffset {
  const pitches = notes.map((note) => note.pitch)
  return {
    steps: cellShift(
      delta.x,
      size.width,
      -Math.min(...notes.map((note) => note.step)),
      bounds.steps - Math.max(...notes.map(noteEnd)),
    ),

    pitches: cellShift(
      -delta.y,
      size.height,
      bounds.range.min - Math.min(...pitches),
      bounds.range.max - Math.max(...pitches),
    ),
  }
}

function durationChange( notes: readonly Note[], delta: PointerDelta, size: GridCellSize, bounds: NoteDragBounds,): number {
  return cellShift(
    delta.x,
    size.width,
    MIN_NOTE_DURATION - Math.min(...notes.map((note) => note.duration)),
    bounds.steps - Math.max(...notes.map(noteEnd)),
  )
}

function changeFor( notes: readonly Note[], mode: DragMode, delta: PointerDelta, size: GridCellSize, bounds: NoteDragBounds,): DragChange {
  return mode === 'resize' ? { mode, durationChange: durationChange(notes, delta, size, bounds) } : { mode, offset: moveOffset(notes, delta, size, bounds) }
}

function applyChange(notes: readonly Note[], change: DragChange): readonly Note[] {
  if (change.mode === 'resize') {
    return notes.map((note) => ({ ...note, duration: note.duration + change.durationChange }))
  }

  return notes.map((note) => ({
    ...note,
    step: note.step + change.offset.steps,
    pitch: note.pitch + change.offset.pitches,
  }))
}

export function useNoteDrag(options: NoteDragOptions) {
  const preview = shallowRef<readonly Note[] | null>(null)
  const pointer = usePointerDrag()

  function commit(notes: readonly Note[], change: DragChange): void {
    const noteIds = notes.map((note) => note.id)
    if (change.mode === 'resize') {
      if (change.durationChange !== 0) {
        options.onResize(noteIds, change.durationChange)
      }
      return
    }

    if (change.offset.steps !== 0 || change.offset.pitches !== 0) {
      options.onMove(noteIds, change.offset)
    }
  }

  function start(event: PointerEvent, notes: readonly Note[], mode: DragMode): boolean {
    const size = options.cellSize()
    if (!size || notes.length === 0) {
      return false
    }

    const change = (delta: PointerDelta) => changeFor(notes, mode, delta, size, options.bounds())
    const started = pointer.start(event, {
      scrollContainer: options.scrollContainer(),
      onMove: (delta) => {
        preview.value = applyChange(notes, change(delta))
      },

      onEnd: (delta) => {
        preview.value = null
        commit(notes, change(delta))
      },

      onCancel: () => {
        preview.value = null
      },

    })

    if (started) {
      preview.value = notes
    }
    return started
  }

  return {
    preview,
    startMove: (event: PointerEvent, notes: readonly Note[]) => start(event, notes, 'move'),
    startResize: (event: PointerEvent, notes: readonly Note[]) => start(event, notes, 'resize'),
  }
}
