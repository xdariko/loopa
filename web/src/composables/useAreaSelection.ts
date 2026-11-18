import { shallowRef } from 'vue'

import { clamp } from '@/domain/numbers'
import type { NoteArea, NotePosition } from '@/domain/types'

import type { GridCellSize, NoteDragBounds } from './useNoteDrag'
import { usePointerDrag, type PointerDelta } from './usePointerDrag'

export interface AreaSelectionOptions {
  readonly bounds: () => NoteDragBounds
  readonly scrollContainer: () => HTMLElement | null
  readonly onSelect: (area: NoteArea) => void
}

interface AreaOrigin {
  readonly cell: NotePosition
  readonly pointerInCell: PointerDelta
  readonly cellSize: GridCellSize
}

const NO_DELTA: PointerDelta = { x: 0, y: 0 }

export function useAreaSelection(options: AreaSelectionOptions) {
  const area = shallowRef<NoteArea | null>(null)
  const pointer = usePointerDrag()

  function areaFrom(origin: AreaOrigin, delta: PointerDelta): NoteArea {
    const { steps, range } = options.bounds()
    const { cell, pointerInCell, cellSize } = origin
    const columns = Math.floor((pointerInCell.x + delta.x) / cellSize.width)
    const rows = Math.floor((pointerInCell.y + delta.y) / cellSize.height)
    const step = clamp(cell.step + columns, 0, steps - 1)
    const pitch = clamp(cell.pitch - rows, range.min, range.max)
    return {
      fromStep: Math.min(cell.step, step),
      toStep: Math.max(cell.step, step),
      lowPitch: Math.min(cell.pitch, pitch),
      highPitch: Math.max(cell.pitch, pitch),
    }
  }

  function start(event: PointerEvent, cell: NotePosition, cellRect: DOMRect): boolean {
    const origin: AreaOrigin = {
      cell,
      pointerInCell: { x: event.clientX - cellRect.left, y: event.clientY - cellRect.top },
      cellSize: cellRect,
    }
    const started = pointer.start(event, {
      scrollContainer: options.scrollContainer(),
      onMove: (delta) => {
        area.value = areaFrom(origin, delta)
      },
      onEnd: (delta) => {
        area.value = null
        options.onSelect(areaFrom(origin, delta))
      },
      onCancel: () => {
        area.value = null
      },
    })
    if (started) {
      area.value = areaFrom(origin, NO_DELTA)
    }
    return started
  }

  return { area, start }
}
