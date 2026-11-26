import { onScopeDispose } from 'vue'

export interface KeyboardShortcut {
  readonly codes: readonly string[]
  readonly mod?: boolean
  readonly shift?: boolean
  readonly repeat?: boolean
  readonly handler: () => void
}

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null
}

function matches(shortcut: KeyboardShortcut, event: KeyboardEvent): boolean {
  const mod = event.ctrlKey || event.metaKey
  return (
    shortcut.codes.includes(event.code) &&
    mod === (shortcut.mod ?? false) &&
    event.shiftKey === (shortcut.shift ?? false) &&
    !event.altKey
  )
}

export function useKeyboardShortcuts(shortcuts: readonly KeyboardShortcut[]): void {
  const consumedCodes = new Set<string>()

  function findShortcut(event: KeyboardEvent): KeyboardShortcut | undefined {
    if (event.defaultPrevented || event.isComposing || isEditableTarget(event.target)) {
      return undefined
    }
    return shortcuts.find((candidate) => matches(candidate, event))
  }

  function handleKeydown(event: KeyboardEvent): void {
    const shortcut = findShortcut(event)
    if (!shortcut) {
      consumedCodes.delete(event.code)
      return
    }

    event.preventDefault()
    consumedCodes.add(event.code)
    if (event.repeat && !shortcut.repeat) {
      return
    }

    shortcut.handler()
  }

  function handleKeyup(event: KeyboardEvent): void {
    if (consumedCodes.delete(event.code)) {
      event.preventDefault()
    }
  }

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
  onScopeDispose(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('keyup', handleKeyup)
  })
}
