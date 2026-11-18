import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useNoteDrag, type NoteDragOptions } from '@/composables/useNoteDrag'
import { MELODIC_PITCH_RANGE } from '@/domain/instruments'
import type { Note } from '@/domain/types'

const STEPS = 16
const CELL = { width: 20, height: 10 }
const C4 = 60
const NOTE: Note = { id: 'a', step: 4, pitch: C4, duration: 2 }

function pointer(type: string, x: number, y: number, button = 0): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, button })
}

function setup(overrides: Partial<NoteDragOptions> = {}) {
  const onMove = vi.fn<NoteDragOptions['onMove']>()
  const onResize = vi.fn<NoteDragOptions['onResize']>()
  const scope = effectScope()
  const drag = scope.run(() =>
    useNoteDrag({
      bounds: () => ({ steps: STEPS, range: MELODIC_PITCH_RANGE }),
      cellSize: () => CELL,
      scrollContainer: () => null,
      onMove,
      onResize,
      ...overrides,
    }),
  )
  if (!drag) {
    throw new Error('composable was not created')
  }
  return { drag, onMove, onResize, scope }
}

describe('useNoteDrag', () => {
  let stopScope: (() => void) | null = null

  afterEach(() => {
    stopScope?.()
    stopScope = null
  })

  function start(overrides?: Partial<NoteDragOptions>) {
    const context = setup(overrides)
    stopScope = () => context.scope.stop()
    return context
  }

  it('moves the note by whole cells and pitches up when dragged up', () => {
    const { drag, onMove } = start()

    drag.startMove(pointer('pointerdown', 100, 100), NOTE)
    window.dispatchEvent(pointer('pointermove', 100 + CELL.width * 3, 100 - CELL.height * 2))

    expect(drag.preview.value).toMatchObject({ step: 7, pitch: C4 + 2 })
    expect(onMove).not.toHaveBeenCalled()

    window.dispatchEvent(pointer('pointerup', 100 + CELL.width * 3, 100 - CELL.height * 2))

    expect(drag.preview.value).toBeNull()
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a', { step: 7, pitch: C4 + 2 })
  })

  it('keeps the moved note inside the grid and the pitch range', () => {
    const { drag, onMove } = start()

    drag.startMove(pointer('pointerdown', 0, 0), NOTE)
    window.dispatchEvent(pointer('pointerup', CELL.width * 100, CELL.height * 100))

    expect(onMove).toHaveBeenCalledWith('a', {
      step: STEPS - NOTE.duration,
      pitch: MELODIC_PITCH_RANGE.min,
    })
  })

  it('resizes the note without letting it leave the grid or shrink below one step', () => {
    const { drag, onResize } = start()

    drag.startResize(pointer('pointerdown', 0, 0), NOTE)
    window.dispatchEvent(pointer('pointerup', CELL.width * 3, 0))
    drag.startResize(pointer('pointerdown', 0, 0), NOTE)
    window.dispatchEvent(pointer('pointerup', CELL.width * 100, 0))
    drag.startResize(pointer('pointerdown', 0, 0), NOTE)
    window.dispatchEvent(pointer('pointerup', -CELL.width * 100, 0))

    expect(onResize.mock.calls).toEqual([
      ['a', 5],
      ['a', STEPS - NOTE.step],
      ['a', 1],
    ])
  })

  it('reports nothing when the pointer returns to the same cell', () => {
    const { drag, onMove } = start()

    drag.startMove(pointer('pointerdown', 0, 0), NOTE)
    window.dispatchEvent(pointer('pointerup', CELL.width / 3, CELL.height / 3))

    expect(onMove).not.toHaveBeenCalled()
  })

  it('drops the preview on cancel and ignores non-primary buttons', () => {
    const { drag, onMove } = start()

    expect(drag.startMove(pointer('pointerdown', 0, 0, 2), NOTE)).toBe(false)

    drag.startMove(pointer('pointerdown', 0, 0), NOTE)
    window.dispatchEvent(pointer('pointermove', CELL.width * 2, 0))
    window.dispatchEvent(pointer('pointercancel', 0, 0))
    window.dispatchEvent(pointer('pointerup', CELL.width * 2, 0))

    expect(drag.preview.value).toBeNull()
    expect(onMove).not.toHaveBeenCalled()
  })

  it('does not start without a measurable cell', () => {
    const { drag } = start({ cellSize: () => null })

    expect(drag.startMove(pointer('pointerdown', 0, 0), NOTE)).toBe(false)
    expect(drag.preview.value).toBeNull()
  })
})
