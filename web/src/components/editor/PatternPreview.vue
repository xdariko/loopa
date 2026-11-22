<template>
  <svg
    class="pattern-preview"
    :viewBox="`0 0 ${pattern.steps} ${range.max - range.min + 1}`"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <rect
      v-for="note in pattern.notes"
      :key="note.id"
      class="pattern-preview__note"
      :class="{ 'pattern-preview__note--playing': playing && playingNoteIds.has(note.id) }"
      :x="note.step"
      :y="range.max - note.pitch"
      :width="note.duration"
      height="1"
    />
  </svg>
</template>

<script setup lang="ts">
import { injectPlaybackCursor } from '@/composables/usePlaybackCursor'
import type { PitchRange } from '@/domain/instruments'
import type { Pattern } from '@/domain/types'

defineProps<{
  pattern: Pattern
  range: PitchRange
  playing: boolean
}>()

const { playingNoteIds } = injectPlaybackCursor()
</script>
