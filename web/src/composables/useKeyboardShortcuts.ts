import { onScopeDispose } from 'vue'

export interface KeyboardShortcut {
  readonly codes: readonly string[]
  readonly mod?: boolean
  readonly shift?: boolean
  readonly handler: () => void
}

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

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
  function handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing || isEditableTarget(event.target)) {
      return
    }
    const shortcut = shortcuts.find((candidate) => matches(candidate, event))
    if (!shortcut) {
      return
    }
    event.preventDefault()
    shortcut.handler()
  }

  window.addEventListener('keydown', handleKeydown)
  onScopeDispose(() => window.removeEventListener('keydown', handleKeydown))
}
