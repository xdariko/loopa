<template>
  <div v-if="playheadStyle" class="playhead" aria-hidden="true" data-testid="playhead">
    <div class="playhead__line" :style="playheadStyle" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { injectPlaybackCursor } from '@/composables/usePlaybackCursor'

export default defineComponent({
  props: {
    steps: { type: Number, required: true },
  },

  setup() {
    const playbackCursor = injectPlaybackCursor()
    return { playbackCursor }
  },

  computed: {
    playheadStyle() {
      const position = this.playbackCursor.position.value
      return position !== null && position <= this.steps
        ? { '--playhead-progress': position / this.steps }
        : null
    },
  },
})
</script>
