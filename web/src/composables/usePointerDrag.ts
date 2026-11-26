import { onScopeDispose } from 'vue'

import { useAutoScroll } from './useAutoScroll'

const MAIN_BUTTON = 0

export interface PointerDelta {
  readonly x: number
  readonly y: number
}

export interface PointerDragOptions {
  readonly scrollContainer?: HTMLElement | null
  readonly onMove: (delta: PointerDelta) => void
  readonly onEnd: (delta: PointerDelta) => void
  readonly onCancel: () => void
}

function scrollOffset(container: HTMLElement | null): PointerDelta {
  return container ? { x: container.scrollLeft, y: container.scrollTop } : { x: 0, y: 0 }
}

export function usePointerDrag() {
  const autoScroll = useAutoScroll()
  let stopActiveDrag: (() => void) | null = null

  function start(event: PointerEvent, options: PointerDragOptions): boolean {
    if (event.button !== MAIN_BUTTON) {
      return false
    }
    stopActiveDrag?.()

    const container = options.scrollContainer ?? null
    const originX = event.clientX
    const originY = event.clientY
    const originScroll = scrollOffset(container)
    let pointerX = originX
    let pointerY = originY

    const currentDelta = (): PointerDelta => {
      const scroll = scrollOffset(container)
      return {
        x: pointerX - originX + scroll.x - originScroll.x,
        y: pointerY - originY + scroll.y - originScroll.y,
      }
    }

    const trackPointer = (current: PointerEvent) => {
      pointerX = current.clientX
      pointerY = current.clientY
    }

    const handleMove = (current: PointerEvent) => {
      trackPointer(current)
      if (container) {
        autoScroll.follow(container, pointerX, pointerY)
      }
      options.onMove(currentDelta())
    }
  
    const handleScroll = () => options.onMove(currentDelta())
  
    const handleUp = (current: PointerEvent) => {
      trackPointer(current)
      stop()
      options.onEnd(currentDelta())
    }
  
    const handleCancel = () => {
      stop()
      options.onCancel()
    }

    function stop(): void {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      container?.removeEventListener('scroll', handleScroll)
      autoScroll.stop()
      stopActiveDrag = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    container?.addEventListener('scroll', handleScroll)
    stopActiveDrag = stop
    return true
  }

  onScopeDispose(() => stopActiveDrag?.())

  return { start }
}
