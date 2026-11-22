<template>
  <div class="editor">
    <TrackPanel
      class="editor__tracks"
      :tracks="projectStore.project.tracks"
      :selected-track-id="editor.selectedTrack?.id ?? null"
      :importing-sample="importingSample"
      :sample-error="sampleError"
      @select="editor.selectTrack"
      @add="editor.addTrack"
      @remove="editor.removeTrack"
      @rename="editor.renameTrack"
      @import-sample="importSample"
    >
      <TrackSettings
        :track="editor.selectedTrack"
        :swing="projectStore.project.swing"
        @muted-change="projectStore.setTrackMuted"
        @mix-change="projectStore.setTrackMixLevel"
        @swing-change="projectStore.setSwing"
      />
    </TrackPanel>

    <section class="editor__workspace">
      <TransportBar
        :is-playing="playback.isPlaying"
        :bpm="projectStore.project.bpm"
        :mode="playback.mode"
        :patterns="editor.selectedTrack?.patterns"
        :selected-pattern-id="editor.selectedPattern?.id"
        @toggle="playback.toggle"
        @bpm-change="projectStore.setBpm"
        @mode-change="playback.setMode"
        @select-pattern="editor.selectPattern"
        @create-pattern="editor.createSelectedTrackPattern"
        @duplicate-pattern="editor.duplicateSelectedPattern"
      >
        <SpectrumView :playing="playback.isPlaying" :source="playback.spectrum" />
      </TransportBar>

      <div class="editor__grid" data-testid="grid-area">
        <PatternGrid
          v-if="editor.selectedTrack && editor.selectedPattern"
          :key="editor.selectedPattern.id"
          class="editor__pattern"
          :pattern="editor.selectedPattern"
          :instrument="editor.selectedTrack.instrument"
          :track-color="selectedTrackColor"
          :selected-note-ids="editor.selectedNoteIds"
          :ghost-notes="ghostNotes"
          :playing-note-ids="playingNoteIds"
          :hide-playhead="!isSelectedPatternPlaying"
          @add="editor.addNote"
          @select="editor.selectNote"
          @toggle="editor.toggleNoteSelection"
          @select-area="editor.addToSelection"
          @move="editor.moveNotes"
          @resize="editor.resizeNotes"
        />
        <p v-else class="editor__placeholder">Добавьте дорожку, чтобы расставлять ноты</p>
      </div>

      <ArrangementPanel
        class="editor__arrangement"
        :tracks="projectStore.project.tracks"
        :arrangement="projectStore.project.arrangement"
        :selected-track-id="editor.selectedTrack?.id ?? null"
        @append-bar="projectStore.appendArrangementBar"
        @open="openArrangementPattern"
        @assign="projectStore.setArrangementPattern"
        @create="createArrangementPattern"
      />
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { getAudioEngine } from '@/audio/engine'
import { SampleFileError } from '@/audio/sampleFile'
import { playbackNoteKey } from '@/audio/timeline'
import TrackPanel from '@/components/editor/TrackPanel.vue'
import TrackSettings from '@/components/editor/TrackSettings.vue'
import TransportBar from '@/components/editor/TransportBar.vue'
import PatternGrid from '@/components/editor/PatternGrid.vue'
import ArrangementPanel from '@/components/editor/ArrangementPanel.vue'
import SpectrumView from '@/components/editor/SpectrumView.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { providePlaybackCursor, usePlaybackCursor } from '@/composables/usePlaybackCursor'
import { trackColor } from '@/domain/trackColor'
import { useEditorStore } from '@/stores/editor'
import { usePlaybackStore } from '@/stores/playback'
import { useProjectStore } from '@/stores/project'

export default defineComponent({
  components: {
    TrackPanel,
    TrackSettings,
    TransportBar,
    PatternGrid,
    ArrangementPanel,
    SpectrumView,
  },

  setup() {
    const editor = useEditorStore()
    const projectStore = useProjectStore()
    const playback = usePlaybackStore()
    const cursor = usePlaybackCursor({ active: () => playback.isPlaying, sample: playback.sample })
    providePlaybackCursor(cursor)
    useKeyboardShortcuts([
      { codes: ['Delete', 'Backspace'], handler: editor.deleteSelectedNotes },
      { codes: ['KeyZ'], mod: true, repeat: true, handler: projectStore.undo },
      { codes: ['Escape'], handler: editor.clearSelection },
      { codes: ['Space'], handler: playback.toggle },
    ])
    return { editor, projectStore, playback, cursor }
  },

  data() {
    return {
      importingSample: false,
      sampleError: '',
      sampleImport: new AbortController(),
      arrangementCell: null as { trackId: string; bar: number } | null,
    }
  },

  computed: {
    selectedTrackColor() {
      const index = this.projectStore.project.tracks.findIndex(
        (track) => track.id === this.editor.selectedTrack?.id,
      )
      return index >= 0 ? trackColor(index) : undefined
    },

    ghostNotes() {
      const { selectedTrack, selectedPattern } = this.editor
      if (!selectedTrack || !selectedPattern) {
        return []
      }
      const { tracks, arrangement } = this.projectStore.project
      const lane = arrangement.lanes[selectedTrack.id]
      const cell = this.arrangementCell
      const bar =
        cell?.trackId === selectedTrack.id && lane?.[cell.bar] === selectedPattern.id
          ? cell.bar
          : (lane?.indexOf(selectedPattern.id) ?? -1)
      if (bar < 0) {
        return []
      }
      return tracks.flatMap((track, index) => {
        if (track.id === selectedTrack.id) {
          return []
        }
        const id = arrangement.lanes[track.id]?.[bar]
        const notes = track.patterns.find((pattern) => pattern.id === id)?.notes ?? []
        const color = trackColor(index)
        return notes.map((note) => ({ ...note, color }))
      })
    },

    isSelectedPatternPlaying() {
      const { selectedTrack, selectedPattern } = this.editor
      return (
        selectedTrack !== null &&
        selectedPattern !== null &&
        this.cursor.patterns.value.get(selectedTrack.id) === selectedPattern.id
      )
    },

    playingNoteIds() {
      const { selectedTrack, selectedPattern } = this.editor
      const ids = new Set<string>()
      if (this.isSelectedPatternPlaying && selectedTrack && selectedPattern) {
        for (const note of selectedPattern.notes) {
          if (
            this.cursor.playingNoteIds.value.has(
              playbackNoteKey(selectedTrack.id, selectedPattern.id, note.id),
            )
          ) {
            ids.add(note.id)
          }
        }
      }
      return ids
    },
  },

  beforeUnmount() {
    this.sampleImport.abort()
    this.playback.pause()
  },

  methods: {
    async importSample(file: File): Promise<void> {
      if (this.importingSample) {
        return
      }
      this.importingSample = true
      this.sampleError = ''
      try {
        const sampleId = await getAudioEngine().importSample(file, this.sampleImport.signal)
        const name = file.name.replace(/\.[^.]+$/, '').trim() || 'Сэмпл'
        this.editor.addTrack({ kind: 'sample', sampleId }, name)
      } catch (error) {
        if (!this.sampleImport.signal.aborted) {
          this.sampleError =
            error instanceof SampleFileError ? error.message : 'Не удалось загрузить звук.'
        }
      } finally {
        this.importingSample = false
      }
    },

    openArrangementPattern(trackId: string, patternId: string | null, bar: number): void {
      this.arrangementCell = { trackId, bar }
      if (this.editor.selectedTrack?.id !== trackId) {
        this.editor.selectTrack(trackId)
      }
      if (patternId !== null) {
        this.editor.selectPattern(patternId)
      }
    },

    createArrangementPattern(trackId: string, bar: number): void {
      this.arrangementCell = { trackId, bar }
      this.editor.createPatternInBar(trackId, bar)
    },
  },
})
</script>
