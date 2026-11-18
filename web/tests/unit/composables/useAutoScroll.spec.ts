import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useAutoScroll } from '@/composables/useAutoScroll'

const VIEWPORT = { x: 0, y: 0, width: 300, height: 200 }
const FRAME_MS = 16

function viewport(): HTMLElement {
  const element = document.createElement('div')
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect(VIEWPORT))
  return element
}

describe('useAutoScroll', () => {
  let scope = effectScope()

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    scope.stop()
    scope = effectScope()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function create() {
    const autoScroll = scope.run(() => useAutoScroll())
    if (!autoScroll) {
      throw new Error('composable was not created')
    }
    return autoScroll
  }

  it('scrolls down while the pointer is at the bottom edge and stops on request', () => {
    const autoScroll = create()
    const element = viewport()

    autoScroll.follow(element, VIEWPORT.width / 2, VIEWPORT.height)
    vi.advanceTimersByTime(FRAME_MS * 3)
    const scrolled = element.scrollTop

    expect(scrolled).toBeGreaterThan(0)
    expect(element.scrollLeft).toBe(0)

    autoScroll.stop()
    vi.advanceTimersByTime(FRAME_MS * 3)

    expect(element.scrollTop).toBe(scrolled)
  })

  it('scrolls up near the top edge', () => {
    const autoScroll = create()
    const element = viewport()
    element.scrollTop = 100

    autoScroll.follow(element, VIEWPORT.width / 2, 0)
    vi.advanceTimersByTime(FRAME_MS * 3)

    expect(element.scrollTop).toBeLessThan(100)
  })

  it('does nothing while the pointer is away from the edges', () => {
    const autoScroll = create()
    const element = viewport()

    autoScroll.follow(element, VIEWPORT.width / 2, VIEWPORT.height / 2)
    vi.advanceTimersByTime(FRAME_MS * 3)

    expect(element.scrollTop).toBe(0)
  })
})
