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
    expect(editor.selectedNote?.pitch).toBe(C4)
    expect(editor.addNote({ step: 0, pitch: C4 })).toBe(false)
  })

  it('moves, resizes and deletes notes with undo for each step', () => {
    const editor = useEditorStore()
    const projectStore = useProjectStore()
    editor.addNote({ step: 0, pitch: C4 })
    const noteId = editor.selectedNoteId ?? ''

    editor.moveNote(noteId, { step: 4, pitch: C4 + 1 })
    editor.resizeNote(noteId, 3)
    expect(editor.selectedNote).toMatchObject({ step: 4, pitch: C4 + 1, duration: 3 })

    editor.deleteSelectedNote()
    expect(editor.selectedPattern?.notes).toHaveLength(0)

    projectStore.undo()
    expect(editor.selectedPattern?.notes[0]).toMatchObject({ step: 4, duration: 3 })
    projectStore.undo()
    expect(editor.selectedPattern?.notes[0]).toMatchObject({ step: 4, duration: 1 })
    projectStore.undo()
    expect(editor.selectedPattern?.notes[0]).toMatchObject({ step: 0, pitch: C4 })
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

  it('drops a stale note selection after another project is loaded', () => {
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 })

    useProjectStore().load(createProject())

    expect(editor.selectedNote).toBeNull()
    expect(editor.deleteSelectedNote()).toBe(false)
  })
})
