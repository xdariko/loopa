import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import {
  createNote,
  createPattern,
  createTrack,
  createTrackLane,
  duplicatePattern,
} from '@/domain/factories'
import {
  instrumentLabel,
  pitchRangeFor,
  type Instrument,
  type PitchRange,
} from '@/domain/instruments'
import * as notes from '@/domain/notes'
import * as projects from '@/domain/project'
import type { Note, NoteOffset, NotePosition, Pattern, Track } from '@/domain/types'

import { useProjectStore } from './project'

type PatternEdit = (pattern: Pattern, range: PitchRange) => Pattern

export const useEditorStore = defineStore('editor', {
  state() {
    return {
      selectedTrackId: null as string | null,
      selectedPatternId: null as string | null,
      selectedNoteIds: shallowRef<readonly string[]>([]),
    }
  },
  getters: {
    selectedTrack(): Track | null {
      const { project } = useProjectStore()
      const chosen = this.selectedTrackId
        ? projects.findTrack(project, this.selectedTrackId)
        : undefined
      return chosen ?? project.tracks[0] ?? null
    },
    selectedPattern(): Pattern | null {
      const patterns = this.selectedTrack?.patterns ?? []
      const chosen = patterns.find((pattern) => pattern.id === this.selectedPatternId)
      return chosen ?? patterns[0] ?? null
    },
    selectedNotes(): readonly Note[] {
      const ids = new Set(this.selectedNoteIds)
      return this.selectedPattern?.notes.filter((note) => ids.has(note.id)) ?? []
    },
  },
  actions: {
    editSelectedPattern(edit: PatternEdit): boolean {
      const track = this.selectedTrack
      const pattern = this.selectedPattern
      if (!track || !pattern) {
        return false
      }
      const range = pitchRangeFor(track.instrument)
      return useProjectStore().change((project) =>
        projects.updatePattern(project, track.id, pattern.id, (current) => edit(current, range)),
      )
    },
    selectTrack(trackId: string | null): void {
      this.selectedTrackId = trackId
      this.selectedPatternId = null
      this.clearSelection()
    },
    selectPattern(patternId: string): void {
      this.selectedPatternId = patternId
      this.clearSelection()
    },
    addPattern(pattern: Pattern): boolean {
      const track = this.selectedTrack
      if (!track) {
        return false
      }
      const added = useProjectStore().change((project) =>
        projects.addPattern(project, track.id, pattern),
      )
      if (added) {
        this.selectPattern(pattern.id)
      }
      return added
    },
    createSelectedTrackPattern(): boolean {
      return this.addPattern(createPattern())
    },
    createPatternInBar(trackId: string, bar: number): boolean {
      const pattern = createPattern()
      const created = useProjectStore().change((project) => {
        const withPattern = projects.addPattern(project, trackId, pattern)
        const withAssignment = projects.setArrangementPattern(withPattern, trackId, bar, pattern.id)
        return withAssignment === withPattern ? project : withAssignment
      })
      if (created) {
        this.selectTrack(trackId)
        this.selectPattern(pattern.id)
      }
      return created
    },
    duplicateSelectedPattern(): boolean {
      const pattern = this.selectedPattern
      return pattern ? this.addPattern(duplicatePattern(pattern)) : false
    },
    selectNote(noteId: string): void {
      this.selectedNoteIds = [noteId]
    },
    toggleNoteSelection(noteId: string): void {
      const ids = this.selectedNoteIds
      this.selectedNoteIds = ids.includes(noteId)
        ? ids.filter((id) => id !== noteId)
        : [...ids, noteId]
    },
    addToSelection(noteIds: readonly string[]): void {
      this.selectedNoteIds = [...new Set([...this.selectedNoteIds, ...noteIds])]
    },
    clearSelection(): void {
      this.selectedNoteIds = []
    },
    addNote(position: NotePosition, duration?: number): boolean {
      const note = createNote(position, duration)
      const added = this.editSelectedPattern((pattern, range) =>
        notes.addNote(pattern, note, range),
      )
      if (added) {
        this.selectNote(note.id)
      }
      return added
    },
    moveNotes(noteIds: readonly string[], offset: NoteOffset): boolean {
      return this.editSelectedPattern((pattern, range) =>
        notes.moveNotes(pattern, noteIds, offset, range),
      )
    },
    resizeNotes(noteIds: readonly string[], durationChange: number): boolean {
      return this.editSelectedPattern((pattern, range) =>
        notes.resizeNotes(pattern, noteIds, durationChange, range),
      )
    },
    deleteSelectedNotes(): boolean {
      const noteIds = this.selectedNoteIds
      this.clearSelection()
      return this.editSelectedPattern((pattern) => notes.removeNotes(pattern, noteIds))
    },
    addTrack(instrument: Instrument, name = instrumentLabel(instrument)): boolean {
      const { project } = useProjectStore()
      const track = createTrack(instrument, projects.nextTrackName(project, name))
      const lane = createTrackLane(track, project.arrangement.barCount)
      const added = useProjectStore().change((project) => projects.addTrack(project, track, lane))
      if (added) {
        this.selectTrack(track.id)
      }
      return added
    },
    removeTrack(trackId: string): boolean {
      const wasSelected = this.selectedTrack?.id === trackId
      const index = useProjectStore().project.tracks.findIndex((track) => track.id === trackId)
      const removed = useProjectStore().change((project) => projects.removeTrack(project, trackId))
      if (removed && wasSelected) {
        const { tracks } = useProjectStore().project
        const neighbour = tracks[index] ?? tracks[index - 1]
        if (neighbour) {
          this.selectTrack(neighbour.id)
        } else {
          this.selectedTrackId = null
          this.selectedPatternId = null
          this.clearSelection()
        }
      }
      return removed
    },
    renameTrack(trackId: string, name: string): boolean {
      return useProjectStore().change((project) => projects.renameTrack(project, trackId, name))
    },
  },
})
