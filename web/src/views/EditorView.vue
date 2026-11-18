<template>
  <div class="editor">
    <TrackPanel class="editor__tracks" />

    <section class="editor__workspace">
      <TransportBar />
      <div class="editor__grid" data-testid="grid-area">
        <PatternGrid
          v-if="editor.selectedTrack && editor.selectedPattern"
          class="editor__pattern"
          :pattern="editor.selectedPattern"
          :instrument="editor.selectedTrack.instrument"
          :selected-note-id="editor.selectedNoteId"
          @add="editor.addNote"
          @select="editor.selectNote"
          @move="editor.moveNote"
          @resize="editor.resizeNote"
        />
        <p v-else class="editor__placeholder">Добавьте дорожку, чтобы расставлять ноты</p>
      </div>
      <ArrangementPanel class="editor__arrangement" />
    </section>
  </div>
</template>

<script setup lang="ts">
import TrackPanel from '@/components/editor/TrackPanel.vue'
import TransportBar from '@/components/editor/TransportBar.vue'
import PatternGrid from '@/components/editor/PatternGrid.vue'
import ArrangementPanel from '@/components/editor/ArrangementPanel.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useEditorStore } from '@/stores/editor'
import { useProjectStore } from '@/stores/project'

const editor = useEditorStore()
const projectStore = useProjectStore()

useKeyboardShortcuts([
  { codes: ['Delete', 'Backspace'], handler: editor.deleteSelectedNote },
  { codes: ['KeyZ'], mod: true, handler: projectStore.undo },
  { codes: ['Escape'], handler: () => editor.selectNote(null) },
])
</script>
