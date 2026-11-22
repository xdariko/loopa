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
      :class="{
        'pattern-preview__note--playing':
          playingTrackId !== undefined &&
          playingNoteIds.has(playbackNoteKey(playingTrackId, pattern.id, note.id)),
      }"
      :x="note.step"
      :y="range.max - note.pitch"
      :width="note.duration"
      height="1"
    />
  </svg>
</template>

<script setup lang="ts">
import { playbackNoteKey } from '@/audio/timeline'
import { injectPlaybackCursor } from '@/composables/usePlaybackCursor'
import type { PitchRange } from '@/domain/instruments'
import type { Pattern } from '@/domain/types'

defineProps<{
  pattern: Pattern
  range: PitchRange
  playingTrackId?: string
}>()

const { playingNoteIds } = injectPlaybackCursor()
</script>
