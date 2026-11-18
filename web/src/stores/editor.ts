import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import { createNote, createTrack, createTrackLane } from '@/domain/factories'
import {
  instrumentLabel,
  pitchRangeFor,
  type Instrument,
  type PitchRange,
} from '@/domain/instruments'
import * as notes from '@/domain/notes'
import * as projects from '@/domain/project'
import type { NoteOffset, NotePosition, Pattern } from '@/domain/types'

import { useProjectStore } from './project'

type PatternEdit = (pattern: Pattern, range: PitchRange) => Pattern

export const useEditorStore = defineStore('editor', () => {
  const projectStore = useProjectStore()

  const selectedTrackId = ref<string | null>(null)
  const selectedPatternId = ref<string | null>(null)
  const selectedNoteIds = shallowRef<readonly string[]>([])

  const selectedTrack = computed(() => {
    const { project } = projectStore
    const chosen = selectedTrackId.value
      ? projects.findTrack(project, selectedTrackId.value)
      : undefined
    return chosen ?? project.tracks[0] ?? null
  })

  const selectedPattern = computed(() => {
    const patterns = selectedTrack.value?.patterns ?? []
    const chosen = patterns.find((pattern) => pattern.id === selectedPatternId.value)
    return chosen ?? patterns[0] ?? null
  })

  const selectedNotes = computed(() => {
    const ids = new Set(selectedNoteIds.value)
    return selectedPattern.value?.notes.filter((note) => ids.has(note.id)) ?? []
  })

  function editSelectedPattern(edit: PatternEdit): boolean {
    const track = selectedTrack.value
    const pattern = selectedPattern.value
    if (!track || !pattern) {
      return false
    }
    const range = pitchRangeFor(track.instrument)
    return projectStore.change((project) =>
      projects.updatePattern(project, track.id, pattern.id, (current) => edit(current, range)),
    )
  }

  function selectTrack(trackId: string): void {
    selectedTrackId.value = trackId
    selectedPatternId.value = null
    clearSelection()
  }

  function selectPattern(patternId: string): void {
    selectedPatternId.value = patternId
    clearSelection()
  }

  function selectNote(noteId: string): void {
    selectedNoteIds.value = [noteId]
  }

  function toggleNoteSelection(noteId: string): void {
    const ids = selectedNoteIds.value
    selectedNoteIds.value = ids.includes(noteId)
      ? ids.filter((id) => id !== noteId)
      : [...ids, noteId]
  }

  function addToSelection(noteIds: readonly string[]): void {
    selectedNoteIds.value = [...new Set([...selectedNoteIds.value, ...noteIds])]
  }

  function clearSelection(): void {
    selectedNoteIds.value = []
  }

  function addNote(position: NotePosition, duration?: number): boolean {
    const note = createNote(position, duration)
    const added = editSelectedPattern((pattern, range) => notes.addNote(pattern, note, range))
    if (added) {
      selectNote(note.id)
    }
    return added
  }

  function moveNotes(noteIds: readonly string[], offset: NoteOffset): boolean {
    return editSelectedPattern((pattern, range) => notes.moveNotes(pattern, noteIds, offset, range))
  }

  function resizeNotes(noteIds: readonly string[], durationChange: number): boolean {
    return editSelectedPattern((pattern, range) =>
      notes.resizeNotes(pattern, noteIds, durationChange, range),
    )
  }

  function deleteSelectedNotes(): boolean {
    const noteIds = selectedNoteIds.value
    clearSelection()
    return editSelectedPattern((pattern) => notes.removeNotes(pattern, noteIds))
  }

  function addTrack(instrument: Instrument): boolean {
    const { project } = projectStore
    const track = createTrack(
      instrument,
      projects.nextTrackName(project, instrumentLabel(instrument)),
    )
    const lane = createTrackLane(track, project.arrangement.barCount)
    const added = projectStore.change((project) => projects.addTrack(project, track, lane))
    if (added) {
      selectTrack(track.id)
    }
    return added
  }

  function removeTrack(trackId: string): boolean {
    const wasSelected = selectedTrack.value?.id === trackId
    const index = projectStore.project.tracks.findIndex((track) => track.id === trackId)
    const removed = projectStore.change((project) => projects.removeTrack(project, trackId))
    if (removed && wasSelected) {
      const { tracks } = projectStore.project
      const neighbour = tracks[index] ?? tracks[index - 1]
      if (neighbour) {
        selectTrack(neighbour.id)
      } else {
        selectedTrackId.value = null
        selectedPatternId.value = null
        clearSelection()
      }
    }
    return removed
  }

  function renameTrack(trackId: string, name: string): boolean {
    return projectStore.change((project) => projects.renameTrack(project, trackId, name))
  }

  return {
    selectedTrackId,
    selectedPatternId,
    selectedNoteIds,
    selectedTrack,
    selectedPattern,
    selectedNotes,
    selectTrack,
    selectPattern,
    selectNote,
    toggleNoteSelection,
    addToSelection,
    clearSelection,
    addNote,
    moveNotes,
    resizeNotes,
    deleteSelectedNotes,
    addTrack,
    removeTrack,
    renameTrack,
  }
})
