import { shallowRef } from 'vue'

import { MIN_NOTE_DURATION } from '@/domain/constants'
import type { PitchRange } from '@/domain/instruments'
import { clamp } from '@/domain/numbers'
import type { Note, NotePosition } from '@/domain/types'

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
  readonly onMove: (noteId: string, position: NotePosition) => void
  readonly onResize: (noteId: string, duration: number) => void
}

type DragMode = 'move' | 'resize'

export function useNoteDrag(options: NoteDragOptions) {
  const preview = shallowRef<Note | null>(null)
  const pointer = usePointerDrag()

  function draggedNote(note: Note, mode: DragMode, delta: PointerDelta, size: GridCellSize): Note {
    const { steps, range } = options.bounds()
    const stepShift = Math.round(delta.x / size.width)
    if (mode === 'resize') {
      return {
        ...note,
        duration: clamp(note.duration + stepShift, MIN_NOTE_DURATION, steps - note.step),
      }
    }
    const rowShift = Math.round(delta.y / size.height)
    return {
      ...note,
      step: clamp(note.step + stepShift, 0, steps - note.duration),
      pitch: clamp(note.pitch - rowShift, range.min, range.max),
    }
  }

  function commit(original: Note, dragged: Note, mode: DragMode): void {
    if (mode === 'resize') {
      if (dragged.duration !== original.duration) {
        options.onResize(original.id, dragged.duration)
      }
      return
    }
    if (dragged.step !== original.step || dragged.pitch !== original.pitch) {
      options.onMove(original.id, { step: dragged.step, pitch: dragged.pitch })
    }
  }

  function start(event: PointerEvent, note: Note, mode: DragMode): boolean {
    const size = options.cellSize()
    if (!size) {
      return false
    }
    const started = pointer.start(event, {
      scrollContainer: options.scrollContainer(),
      onMove: (delta) => {
        preview.value = draggedNote(note, mode, delta, size)
      },
      onEnd: (delta) => {
        preview.value = null
        commit(note, draggedNote(note, mode, delta, size), mode)
      },
      onCancel: () => {
        preview.value = null
      },
    })
    if (started) {
      preview.value = note
    }
    return started
  }

  return {
    preview,
    startMove: (event: PointerEvent, note: Note) => start(event, note, 'move'),
    startResize: (event: PointerEvent, note: Note) => start(event, note, 'resize'),
  }
}
