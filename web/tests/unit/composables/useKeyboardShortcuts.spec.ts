import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useKeyboardShortcuts, type KeyboardShortcut } from '@/composables/useKeyboardShortcuts'

function dispatchKey(
  type: 'keydown' | 'keyup',
  code: string,
  init: KeyboardEventInit = {},
  target: EventTarget = window,
) {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

function press(code: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
  return dispatchKey('keydown', code, init, target)
}

function release(code: string, target: EventTarget = window) {
  return dispatchKey('keyup', code, {}, target)
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

  it('consumes the keyup of a handled key so a focused button is not clicked', () => {
    const handler = vi.fn<() => void>()
    register([{ codes: ['Space'], handler }])
    const button = document.createElement('button')
    document.body.append(button)

    press('Space', {}, button)
    const handledRelease = release('Space', button)
    const strayRelease = release('Space', button)

    expect(handler).toHaveBeenCalledOnce()
    expect(handledRelease.defaultPrevented).toBe(true)
    expect(strayRelease.defaultPrevented).toBe(false)
  })

  it('leaves the keyup alone when the keydown was not a shortcut', () => {
    register([{ codes: ['Space'], handler: vi.fn<() => void>() }])
    const input = document.createElement('input')
    document.body.append(input)

    press('Space', {}, input)
    const event = release('Space', input)

    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores auto-repeat unless the shortcut allows it', () => {
    const toggle = vi.fn<() => void>()
    const undo = vi.fn<() => void>()
    register([
      { codes: ['Space'], handler: toggle },
      { codes: ['KeyZ'], mod: true, repeat: true, handler: undo },
    ])

    press('Space')
    const repeated = press('Space', { repeat: true })
    press('KeyZ', { ctrlKey: true })
    press('KeyZ', { ctrlKey: true, repeat: true })

    expect(toggle).toHaveBeenCalledOnce()
    expect(repeated.defaultPrevented).toBe(true)
    expect(undo).toHaveBeenCalledTimes(2)
  })

  it('stops listening when its scope is disposed', () => {
    const handler = vi.fn<() => void>()
    register([{ codes: ['Escape'], handler }])

    scope.stop()
    press('Escape')
    const event = release('Escape')

    expect(handler).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })
})
