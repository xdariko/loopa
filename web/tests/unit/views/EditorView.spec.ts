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

  it('deletes, restores and deselects notes from the keyboard', () => {
    const wrapper = mountEditor()
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 })

    press('Delete')
    expect(editor.selectedPattern?.notes).toHaveLength(0)

    press('KeyZ', { ctrlKey: true })
    expect(editor.selectedPattern?.notes).toHaveLength(1)

    editor.selectNote(editor.selectedPattern?.notes[0]?.id ?? null)
    press('Escape')
    expect(editor.selectedNoteId).toBeNull()

    wrapper.unmount()
  })
})

describe('EditorView tracks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('opens the clicked track in the grid', async () => {
    const wrapper = mount(EditorView, { global: { stubs: { RouterLink: true } } })
    const editor = useEditorStore()

    await wrapper.findAll('.tracks__item')[2]?.trigger('click')

    expect(editor.selectedTrack?.instrument).toEqual({ kind: 'drums' })
    expect(wrapper.find('.pattern-grid__label').text()).toBe('Hat')

    wrapper.unmount()
  })
})
