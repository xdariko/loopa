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
    return mount(EditorView, { global: { stubs: { RouterLink: true, SpectrumView: true } } })
  }

  it('deletes, restores and deselects notes from the keyboard', () => {
    const wrapper = mountEditor()
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 })

    press('Delete')
    expect(editor.selectedPattern?.notes).toHaveLength(0)

    press('KeyZ', { ctrlKey: true })
    expect(editor.selectedPattern?.notes).toHaveLength(1)

    editor.selectNote(editor.selectedPattern?.notes[0]?.id ?? '')
    press('Escape')
    expect(editor.selectedNoteIds).toEqual([])

    wrapper.unmount()
  })
})

describe('EditorView tracks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('opens the clicked track in the grid', async () => {
    const wrapper = mount(EditorView, {
      global: { stubs: { RouterLink: true, SpectrumView: true } },
    })
    const editor = useEditorStore()

    await wrapper.findAll('.tracks__item')[2]?.trigger('click')

    expect(editor.selectedTrack?.instrument).toEqual({ kind: 'drums' })
    expect(wrapper.find('.pattern-grid__label').text()).toBe('Hat')

    wrapper.unmount()
  })
})

describe('EditorView patterns', () => {
  it('creates, duplicates, opens and undoes patterns through the editor', async () => {
    setActivePinia(createPinia())
    const wrapper = mount(EditorView, {
      global: { stubs: { RouterLink: true, SpectrumView: true } },
    })
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 })
    const original = editor.selectedPattern!
    const picker = wrapper.get('select')
    const [create, duplicate] = wrapper.findAll('.transport__action')

    await create!.trigger('click')
    const empty = editor.selectedPattern!
    expect(empty.id).not.toBe(original.id)
    expect(empty.notes).toEqual([])
    expect((picker.element as HTMLSelectElement).value).toBe(empty.id)

    await picker.setValue(original.id)
    expect(editor.selectedPattern).toBe(original)
    expect(editor.selectedNoteIds).toEqual([])

    await duplicate!.trigger('click')
    const copy = editor.selectedPattern!
    expect(copy.id).not.toBe(original.id)
    expect(copy.steps).toBe(original.steps)
    expect(copy.notes[0]).toEqual({ ...original.notes[0], id: expect.any(String) })
    expect(copy.notes[0]?.id).not.toBe(original.notes[0]?.id)
    expect((picker.element as HTMLSelectElement).value).toBe(copy.id)

    press('KeyZ', { ctrlKey: true })
    expect(editor.selectedTrack?.patterns).toEqual([original, empty])
    expect(editor.selectedPattern).toBe(original)

    wrapper.unmount()
  })
})
