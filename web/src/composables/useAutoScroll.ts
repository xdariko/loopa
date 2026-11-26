import { onScopeDispose } from 'vue'

import { clamp } from '@/domain/numbers'

const EDGE_ZONE = 32
const MAX_SPEED = 16

function edgeSpeed(position: number, start: number, end: number): number {
  if (position < start + EDGE_ZONE) {
    return -MAX_SPEED * clamp((start + EDGE_ZONE - position) / EDGE_ZONE, 0, 1)
  }

  if (position > end - EDGE_ZONE) {
    return MAX_SPEED * clamp((position - (end - EDGE_ZONE)) / EDGE_ZONE, 0, 1)
  }
  return 0
}

export function useAutoScroll() {
  let frame: number | null = null
  let target: HTMLElement | null = null
  let pointerX = 0
  let pointerY = 0

  function tick(): void {
    frame = null
    if (!target) {
      return
    }
  
    const rect = target.getBoundingClientRect()
    const speedX = edgeSpeed(pointerX, rect.left, rect.right)
    const speedY = edgeSpeed(pointerY, rect.top, rect.bottom)
    if (speedX === 0 && speedY === 0) {
      return
    }

    target.scrollLeft += speedX
    target.scrollTop += speedY
    frame = requestAnimationFrame(tick)
  }

  function follow(container: HTMLElement, clientX: number, clientY: number): void {
    target = container
    pointerX = clientX
    pointerY = clientY
    if (frame === null) {
      frame = requestAnimationFrame(tick)
    }
  }

  function stop(): void {
    if (frame !== null) {
      cancelAnimationFrame(frame)
    }
    frame = null
    target = null
  }

  onScopeDispose(stop)

  return { follow, stop }
}
