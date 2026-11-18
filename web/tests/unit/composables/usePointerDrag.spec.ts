import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { usePointerDrag, type PointerDragOptions } from '@/composables/usePointerDrag'

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0 })
}

describe('usePointerDrag', () => {
  let scope = effectScope()

  afterEach(() => {
    scope.stop()
    scope = effectScope()
  })

  function create() {
    const drag = scope.run(() => usePointerDrag())
    if (!drag) {
      throw new Error('composable was not created')
    }
    return drag
  }

  it('adds the scroll offset of the container to the pointer delta', () => {
    const drag = create()
    const container = document.createElement('div')
    const onMove = vi.fn<PointerDragOptions['onMove']>()
    const onEnd = vi.fn<PointerDragOptions['onEnd']>()

    drag.start(pointer('pointerdown', 10, 10), {
      scrollContainer: container,
      onMove,
      onEnd,
      onCancel: () => {},
    })
    window.dispatchEvent(pointer('pointermove', 15, 30))
    container.scrollTop = 40
    container.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(pointer('pointerup', 15, 30))

    expect(onMove.mock.calls).toEqual([[{ x: 5, y: 20 }], [{ x: 5, y: 60 }]])
    expect(onEnd).toHaveBeenCalledExactlyOnceWith({ x: 5, y: 60 })
  })

  it('stops listening after release', () => {
    const drag = create()
    const container = document.createElement('div')
    const onMove = vi.fn<PointerDragOptions['onMove']>()

    drag.start(pointer('pointerdown', 0, 0), {
      scrollContainer: container,
      onMove,
      onEnd: () => {},
      onCancel: () => {},
    })
    window.dispatchEvent(pointer('pointerup', 0, 0))
    window.dispatchEvent(pointer('pointermove', 50, 50))
    container.dispatchEvent(new Event('scroll'))

    expect(onMove).not.toHaveBeenCalled()
  })
})
