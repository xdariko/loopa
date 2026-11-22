import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import { getAudioEngine } from '@/audio/engine'
import { SampleFileError } from '@/audio/sampleFile'
import EditorView from '@/views/EditorView.vue'
import { useEditorStore } from '@/stores/editor'
import { useProjectStore } from '@/stores/project'

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

  it('reports an invalid import and creates a selected sample track on retry', async () => {
    const importSample = vi.spyOn(getAudioEngine(), 'importSample')
    importSample.mockRejectedValueOnce(new SampleFileError('Выберите WAV или MP3.'))
    importSample.mockResolvedValueOnce('sample-id')
    const wrapper = mount(EditorView, {
      global: { stubs: { RouterLink: true, SpectrumView: true } },
    })
    try {
      const picker = wrapper.get('input[type="file"]')
      const file = new File(['sound'], 'Layer.wav')
      Object.defineProperty(picker.element, 'files', { value: [file] })

      await picker.trigger('change')
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toContain('WAV или MP3')
      expect(useProjectStore().project.tracks).toHaveLength(3)

      await picker.trigger('change')
      await flushPromises()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(useEditorStore().selectedTrack).toMatchObject({
        name: 'Layer',
        instrument: { kind: 'sample', sampleId: 'sample-id' },
      })
      expect(useProjectStore().project.tracks).toHaveLength(4)
    } finally {
      importSample.mockRestore()
      wrapper.unmount()
    }
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

  it('applies settings to the selected track and keeps swing at project level', async () => {
    const wrapper = mount(EditorView, {
      global: { stubs: { RouterLink: true, SpectrumView: true } },
    })
    const project = useProjectStore()
    const original = project.project.tracks[0]
    const settings = wrapper.get('.track-settings')
    settings.element.setAttribute('open', '')
    await wrapper.findAll('.tracks__item')[1]!.trigger('click')

    const [volume, delay, reverb, swing] = settings.findAll('input[type="range"]')
    await volume!.setValue('25')
    await delay!.setValue('30')
    await reverb!.setValue('40')
    await settings.get('input[type="checkbox"]').setValue(true)
    await swing!.setValue('50')

    expect(project.project.tracks[0]).toBe(original)
    expect(project.project.tracks[1]).toMatchObject({
      volume: 0.25,
      muted: true,
      effects: { delay: 0.3, reverb: 0.4 },
    })
    expect(project.project.swing).toBe(0.5)
    press('KeyZ', { ctrlKey: true })
    await wrapper.vm.$nextTick()
    expect(project.project.swing).toBe(0)
    expect((swing!.element as HTMLInputElement).value).toBe('0')
    expect(project.project.tracks[1]?.muted).toBe(true)
    wrapper.unmount()
  })
})

describe('EditorView patterns', () => {
  it('shows notes from other tracks only in the selected arrangement bar', async () => {
    setActivePinia(createPinia())
    const wrapper = mount(EditorView, {
      global: { stubs: { RouterLink: true, SpectrumView: true } },
    })
    const editor = useEditorStore()
    const project = useProjectStore()
    const [lead, bass] = project.project.tracks
    editor.selectTrack(bass!.id)
    editor.addNote({ step: 1, pitch: C4 })
    project.setArrangementPattern(bass!.id, 1, null)
    editor.selectTrack(lead!.id)
    await wrapper.vm.$nextTick()

    const ghosts = '.pattern-grid__ghost-note'
    expect(wrapper.get(ghosts).attributes('aria-hidden')).toBe('true')
    expect(wrapper.findAll('.pattern-grid__note')).toHaveLength(0)
    await wrapper.findAll('.arrangement__block')[1]!.trigger('click')
    expect(wrapper.find(ghosts).exists()).toBe(false)
    await wrapper.findAll('.arrangement__block')[0]!.trigger('click')
    expect(wrapper.findAll(ghosts)).toHaveLength(1)
    wrapper.unmount()
  })

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

describe('EditorView arrangement', () => {
  it('opens a track from the map, renders its notes, and assigns or clears a slot', async () => {
    setActivePinia(createPinia())
    const wrapper = mount(EditorView, {
      global: { stubs: { RouterLink: true, SpectrumView: true, Teleport: true } },
    })
    const editor = useEditorStore()
    const drumRow = wrapper.findAll('.arrangement__row')[3]!
    const secondBar = drumRow.findAll('.arrangement__block')[1]!
    const secondCell = drumRow.findAll('.arrangement__cell')[1]!

    await secondBar.trigger('click')
    expect(editor.selectedTrack?.instrument.kind).toBe('drums')
    expect(secondBar.attributes('aria-pressed')).toBe('true')
    editor.addNote({ step: 2, pitch: 1 }, 3)
    await wrapper.vm.$nextTick()

    const note = secondBar.get('svg rect')
    expect(note.attributes()).toMatchObject({ x: '2', y: '1', width: '3', height: '1' })
    expect(drumRow.findAll('rect')).toHaveLength(4)

    editor.duplicateSelectedPattern()
    await wrapper.vm.$nextTick()
    const copyId = editor.selectedPattern?.id
    await secondCell.get('.arrangement__cell-action').trigger('click')
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('Такт 2')
    await wrapper.findAll('.arrangement__choice')[1]!.trigger('click')
    expect(secondBar.attributes('title')).toContain('Паттерн 2')
    expect(editor.selectedPattern?.id).toBe(copyId)

    await secondCell.get('.arrangement__cell-action').trigger('click')
    await wrapper.findAll('.arrangement__picker-action')[1]!.trigger('click')
    expect(secondCell.find('.arrangement__block--empty').exists()).toBe(true)
    expect(secondCell.find('svg').exists()).toBe(false)

    await secondCell.get('.arrangement__block--empty').trigger('click')
    await wrapper.get('.arrangement__picker-action').trigger('click')
    expect(secondCell.get('.arrangement__block').attributes('title')).toContain('Паттерн 3')
    expect(editor.selectedTrack?.patterns).toHaveLength(3)

    press('KeyZ', { ctrlKey: true })
    await wrapper.vm.$nextTick()
    expect(editor.selectedTrack?.patterns).toHaveLength(2)
    expect(secondCell.find('.arrangement__block--empty').exists()).toBe(true)
    press('KeyZ', { ctrlKey: true })
    await wrapper.vm.$nextTick()
    expect(secondCell.get('.arrangement__block').attributes('title')).toContain('Паттерн 2')
    await secondCell.get('.arrangement__block').trigger('click')
    expect(editor.selectedPattern?.id).toBe(copyId)

    await wrapper.get('.arrangement__toggle').trigger('click')
    expect(wrapper.get('.arrangement').classes()).toContain('arrangement--expanded')
    await wrapper.get('.arrangement__toggle').trigger('click')
    expect(wrapper.get('.arrangement').classes()).not.toContain('arrangement--expanded')

    wrapper.unmount()
  })
})
