import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { createNote, createTrack, createTrackLane } from '@/domain/factories'
import { pitchRangeFor, type Instrument, type PitchRange } from '@/domain/instruments'
import * as notes from '@/domain/notes'
import * as projects from '@/domain/project'
import type { NotePosition, Pattern } from '@/domain/types'

import { useProjectStore } from './project'

type PatternEdit = (pattern: Pattern, range: PitchRange) => Pattern

export const useEditorStore = defineStore('editor', () => {
  const projectStore = useProjectStore()

  const selectedTrackId = ref<string | null>(null)
  const selectedPatternId = ref<string | null>(null)
  const selectedNoteId = ref<string | null>(null)

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

  const selectedNote = computed(() => {
    if (!selectedPattern.value || !selectedNoteId.value) {
      return null
    }
    return notes.findNote(selectedPattern.value, selectedNoteId.value) ?? null
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
    selectedNoteId.value = null
  }

  function selectPattern(patternId: string): void {
    selectedPatternId.value = patternId
    selectedNoteId.value = null
  }

  function selectNote(noteId: string | null): void {
    selectedNoteId.value = noteId
  }

  function addNote(position: NotePosition, duration?: number): boolean {
    const note = createNote(position, duration)
    const added = editSelectedPattern((pattern, range) => notes.addNote(pattern, note, range))
    if (added) {
      selectedNoteId.value = note.id
    }
    return added
  }

  function moveNote(noteId: string, position: NotePosition): boolean {
    return editSelectedPattern((pattern, range) => notes.moveNote(pattern, noteId, position, range))
  }

  function resizeNote(noteId: string, duration: number): boolean {
    return editSelectedPattern((pattern, range) =>
      notes.resizeNote(pattern, noteId, duration, range),
    )
  }

  function deleteSelectedNote(): boolean {
    const noteId = selectedNoteId.value
    if (!noteId) {
      return false
    }
    selectedNoteId.value = null
    return editSelectedPattern((pattern) => notes.removeNote(pattern, noteId))
  }

  function addTrack(instrument: Instrument): boolean {
    const track = createTrack(instrument)
    const lane = createTrackLane(track, projectStore.project.arrangement.barCount)
    const added = projectStore.change((project) => projects.addTrack(project, track, lane))
    if (added) {
      selectTrack(track.id)
    }
    return added
  }

  function removeTrack(trackId: string): boolean {
    return projectStore.change((project) => projects.removeTrack(project, trackId))
  }

  return {
    selectedTrackId,
    selectedPatternId,
    selectedNoteId,
    selectedTrack,
    selectedPattern,
    selectedNote,
    selectTrack,
    selectPattern,
    selectNote,
    addNote,
    moveNote,
    resizeNote,
    deleteSelectedNote,
    addTrack,
    removeTrack,
  }
})
