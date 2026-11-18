import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { createProject } from '@/domain/factories'
import { useEditorStore } from '@/stores/editor'
import { useProjectStore } from '@/stores/project'

const C4 = 60

describe('editor store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('selects the first track and pattern by default', () => {
    const editor = useEditorStore()
    const { project } = useProjectStore()

    expect(editor.selectedTrack).toBe(project.tracks[0])
    expect(editor.selectedPattern).toBe(project.tracks[0]?.patterns[0])
  })

  it('adds a note to the selected pattern and selects it', () => {
    const editor = useEditorStore()

    expect(editor.addNote({ step: 0, pitch: C4 })).toBe(true)
    expect(editor.selectedPattern?.notes).toHaveLength(1)
    expect(editor.selectedNotes.map(({ pitch }) => pitch)).toEqual([C4])
    expect(editor.addNote({ step: 0, pitch: C4 })).toBe(false)
  })

  it('builds a selection with toggle and area and clears it', () => {
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 })
    editor.addNote({ step: 2, pitch: C4 })
    const [first, second] = editor.selectedPattern?.notes.map(({ id }) => id) ?? []

    editor.toggleNoteSelection(first ?? '')
    expect(editor.selectedNoteIds).toEqual([second, first])
    editor.toggleNoteSelection(second ?? '')
    expect(editor.selectedNoteIds).toEqual([first])
    editor.addToSelection([first ?? '', second ?? ''])
    expect(editor.selectedNoteIds).toEqual([first, second])

    editor.clearSelection()
    expect(editor.selectedNotes).toEqual([])
  })

  it('edits a group with one history entry per change', () => {
    const editor = useEditorStore()
    const projectStore = useProjectStore()
    editor.addNote({ step: 0, pitch: C4 })
    editor.addNote({ step: 2, pitch: C4 })
    const ids = editor.selectedPattern?.notes.map(({ id }) => id) ?? []
    editor.addToSelection(ids)

    editor.moveNotes(ids, { steps: 4, pitches: 1 })
    editor.resizeNotes(ids, 1)
    expect(editor.selectedNotes).toMatchObject([
      { step: 4, pitch: C4 + 1, duration: 2 },
      { step: 6, pitch: C4 + 1, duration: 2 },
    ])

    editor.deleteSelectedNotes()
    expect(editor.selectedPattern?.notes).toHaveLength(0)

    projectStore.undo()
    projectStore.undo()
    expect(editor.selectedPattern?.notes).toMatchObject([
      { step: 4, duration: 1 },
      { step: 6, duration: 1 },
    ])
  })

  it('adds a uniquely named track, selects it and falls back to the first track on undo', () => {
    const editor = useEditorStore()
    const projectStore = useProjectStore()
    const initialCount = projectStore.project.tracks.length

    editor.addTrack({ kind: 'synth', preset: 'lead' })
    expect(projectStore.project.tracks).toHaveLength(initialCount + 1)
    expect(editor.selectedTrack?.name).toBe('Lead 2')

    projectStore.undo()
    expect(projectStore.project.tracks).toHaveLength(initialCount)
    expect(editor.selectedTrack).toBe(projectStore.project.tracks[0])
  })

  it('moves the selection to a neighbour when the selected track is removed', () => {
    const editor = useEditorStore()
    const projectStore = useProjectStore()
    const [lead, bass, drums] = projectStore.project.tracks.map(({ id }) => id)

    editor.selectTrack(bass ?? '')
    editor.removeTrack(bass ?? '')
    expect(editor.selectedTrack?.id).toBe(drums)

    editor.removeTrack(drums ?? '')
    expect(editor.selectedTrack?.id).toBe(lead)

    editor.removeTrack(lead ?? '')
    expect(editor.selectedTrack).toBeNull()

    projectStore.undo()
    expect(editor.selectedTrack?.id).toBe(lead)
  })

  it('renames a track with an undoable change', () => {
    const editor = useEditorStore()
    const projectStore = useProjectStore()
    const trackId = editor.selectedTrack?.id ?? ''

    expect(editor.renameTrack(trackId, 'Melody')).toBe(true)
    expect(editor.selectedTrack?.name).toBe('Melody')

    projectStore.undo()
    expect(editor.selectedTrack?.name).toBe('Lead')
  })

  it('drops a stale note selection after another project is loaded', () => {
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 })

    useProjectStore().load(createProject())

    expect(editor.selectedNotes).toEqual([])
    expect(editor.deleteSelectedNotes()).toBe(false)
  })
})
