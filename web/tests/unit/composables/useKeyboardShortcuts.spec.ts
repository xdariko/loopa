import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useKeyboardShortcuts, type KeyboardShortcut } from '@/composables/useKeyboardShortcuts'

function press(code: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('useKeyboardShortcuts', () => {
  let scope = effectScope()

  afterEach(() => {
    scope.stop()
    scope = effectScope()
    document.body.replaceChildren()
  })

  function register(shortcuts: readonly KeyboardShortcut[]) {
    scope.run(() => useKeyboardShortcuts(shortcuts))
  }

  it('runs the matching shortcut and prevents the default action', () => {
    const handler = vi.fn<() => void>()
    register([{ codes: ['Delete', 'Backspace'], handler }])

    const event = press('Backspace')

    expect(handler).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
  })

  it('matches by physical key so shortcuts work in any keyboard layout', () => {
    const handler = vi.fn<() => void>()
    register([{ codes: ['KeyZ'], mod: true, handler }])

    press('KeyZ', { key: 'я', ctrlKey: true })
    press('KeyZ', { key: 'z', metaKey: true })

    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('requires the exact set of modifiers', () => {
    const handler = vi.fn<() => void>()
    register([{ codes: ['KeyZ'], mod: true, handler }])

    press('KeyZ')
    press('KeyZ', { ctrlKey: true, shiftKey: true })
    press('KeyZ', { ctrlKey: true, altKey: true })

    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores keys typed into text fields', () => {
    const handler = vi.fn<() => void>()
    register([{ codes: ['Backspace'], handler }])
    const input = document.createElement('input')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.append(input, editable)

    const event = press('Backspace', {}, input)
    press('Backspace', {}, editable)

    expect(handler).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('stops listening when its scope is disposed', () => {
    const handler = vi.fn<() => void>()
    register([{ codes: ['Escape'], handler }])

    scope.stop()
    press('Escape')

    expect(handler).not.toHaveBeenCalled()
  })
})
