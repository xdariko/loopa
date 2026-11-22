<template>
  <div
    v-if="position !== null && position <= steps"
    class="playhead"
    aria-hidden="true"
    data-testid="playhead"
  >
    <div class="playhead__line" :style="{ '--playhead-progress': position / steps }" />
  </div>
</template>

<script setup lang="ts">
import { injectPlaybackCursor } from '@/composables/usePlaybackCursor'

defineProps<{
  steps: number
}>()

const { position } = injectPlaybackCursor()
</script>
