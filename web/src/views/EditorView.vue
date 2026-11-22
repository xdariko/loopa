<template>
  <div class="editor">
    <TrackPanel
      class="editor__tracks"
      :tracks="projectStore.project.tracks"
      :selected-track-id="editor.selectedTrack?.id ?? null"
      @select="editor.selectTrack"
      @add="editor.addTrack"
      @remove="editor.removeTrack"
      @rename="editor.renameTrack"
    />

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
          :selected-note-ids="editor.selectedNoteIds"
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
        @open="openArrangementPattern"
        @assign="projectStore.setArrangementPattern"
        @create="editor.createPatternInBar"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'

import { playbackNoteKey } from '@/audio/timeline'
import TrackPanel from '@/components/editor/TrackPanel.vue'
import TransportBar from '@/components/editor/TransportBar.vue'
import PatternGrid from '@/components/editor/PatternGrid.vue'
import ArrangementPanel from '@/components/editor/ArrangementPanel.vue'
import SpectrumView from '@/components/editor/SpectrumView.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { providePlaybackCursor, usePlaybackCursor } from '@/composables/usePlaybackCursor'
import { useEditorStore } from '@/stores/editor'
import { usePlaybackStore } from '@/stores/playback'
import { useProjectStore } from '@/stores/project'

const editor = useEditorStore()
const projectStore = useProjectStore()
const playback = usePlaybackStore()

const cursor = usePlaybackCursor({ active: () => playback.isPlaying, sample: playback.sample })
const isSelectedPatternPlaying = computed(() => {
  const { selectedTrack, selectedPattern } = editor
  return (
    selectedTrack !== null &&
    selectedPattern !== null &&
    cursor.patterns.value.get(selectedTrack.id) === selectedPattern.id
  )
})
const playingNoteIds = computed(() => {
  const { selectedTrack, selectedPattern } = editor
  const ids = new Set<string>()
  if (isSelectedPatternPlaying.value && selectedTrack && selectedPattern) {
    for (const note of selectedPattern.notes) {
      if (
        cursor.playingNoteIds.value.has(
          playbackNoteKey(selectedTrack.id, selectedPattern.id, note.id),
        )
      ) {
        ids.add(note.id)
      }
    }
  }
  return ids
})
providePlaybackCursor(cursor)

onBeforeUnmount(playback.pause)

function openArrangementPattern(trackId: string, patternId: string | null): void {
  if (editor.selectedTrack?.id !== trackId) {
    editor.selectTrack(trackId)
  }
  if (patternId !== null) {
    editor.selectPattern(patternId)
  }
}

useKeyboardShortcuts([
  { codes: ['Delete', 'Backspace'], handler: editor.deleteSelectedNotes },
  { codes: ['KeyZ'], mod: true, repeat: true, handler: projectStore.undo },
  { codes: ['Escape'], handler: editor.clearSelection },
  { codes: ['Space'], handler: playback.toggle },
])
</script>
