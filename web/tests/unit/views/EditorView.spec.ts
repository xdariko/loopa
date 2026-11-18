import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import EditorView from '@/views/EditorView.vue'
import { useEditorStore } from '@/stores/editor'

const C4 = 60

function press(code: string, init: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true, ...init }))
}

describe('EditorView shortcuts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountEditor() {
    return mount(EditorView, { global: { stubs: { RouterLink: true } } })
  }

  it('deletes the selected note and brings it back with Ctrl+Z', () => {
    const wrapper = mountEditor()
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 })

    press('Delete')
    expect(editor.selectedPattern?.notes).toHaveLength(0)

    press('KeyZ', { ctrlKey: true })
    expect(editor.selectedPattern?.notes).toHaveLength(1)

    wrapper.unmount()
  })

  it('clears the selection with Escape', () => {
    const wrapper = mountEditor()
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 })

    press('Escape')
    press('Delete')

    expect(editor.selectedNoteId).toBeNull()
    expect(editor.selectedPattern?.notes).toHaveLength(1)

    wrapper.unmount()
  })
})
