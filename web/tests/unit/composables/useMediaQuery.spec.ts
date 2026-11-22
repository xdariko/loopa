import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useMediaQuery } from '@/composables/useMediaQuery'

function fakeMediaList(initial: boolean) {
  const target = new EventTarget()
  const list = Object.assign(target, { matches: initial })
  vi.stubGlobal(
    'matchMedia',
    vi.fn<(query: string) => MediaQueryList>(() => list as unknown as MediaQueryList),
  )
  return {
    change(matches: boolean) {
      target.dispatchEvent(Object.assign(new Event('change'), { matches }))
    },
  }
}

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows the media query until the scope is disposed', () => {
    const media = fakeMediaList(true)
    const scope = effectScope()
    const matches = scope.run(() => useMediaQuery('(prefers-reduced-motion: reduce)'))

    expect(matches?.value).toBe(true)
    media.change(false)
    expect(matches?.value).toBe(false)

    scope.stop()
    media.change(true)
    expect(matches?.value).toBe(false)
  })

  it('stays false where media queries are not supported', () => {
    vi.stubGlobal('matchMedia', undefined)
    const scope = effectScope()

    expect(scope.run(() => useMediaQuery('(prefers-color-scheme: dark)'))?.value).toBe(false)
    scope.stop()
  })
})
