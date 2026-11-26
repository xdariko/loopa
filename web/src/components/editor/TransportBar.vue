<template>
  <div class="transport">
    <button
      type="button"
      class="transport__play"
      :class="{ 'transport__play--active': isPlaying }"
      :aria-label="isPlaying ? $t('common.pause') : $t('common.play')"
      @click="$emit('toggle')"
    >
      {{ isPlaying ? '❚❚' : '▶' }}
    </button>

    <div v-if="mode" class="transport__modes" role="group" :aria-label="$t('transport.playbackMode')">
      <button
        v-for="option in playbackModes"
        :key="option.value"
        type="button"
        class="transport__mode"
        :aria-pressed="mode === option.value"
        :disabled="isPlaying"
        @keydown.space.stop
        @click="$emit('modeChange', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <label class="transport__field">
      <span class="transport__label">{{ $t('transport.bpm') }}</span>
      <input
        class="transport__input"
        type="number"
        :value="bpm"
        :min="MIN_BPM"
        :max="MAX_BPM"
        @change="handleBpmChange"
      />
    </label>

    <label v-if="patterns" class="transport__field">
      <span class="transport__label">{{ $t('transport.pattern') }}</span>
      <select
        class="transport__input"
        :value="selectedPatternId"
        :disabled="!patterns.length"
        @change="$emit('selectPattern', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="(pattern, index) in patterns" :key="pattern.id" :value="pattern.id">
          {{ index + 1 }}
        </option>
      </select>
    </label>

    <div v-if="patterns" class="transport__actions">
      <button type="button" class="transport__action" @keydown.space.stop @click="$emit('createPattern')">
        {{ $t('common.new') }}
      </button>

      <button
        type="button"
        class="transport__action"
        :disabled="!selectedPatternId"
        @keydown.space.stop
        @click="$emit('duplicatePattern')"
      >
        {{ $t('transport.duplicate') }}
      </button>

      <button
        type="button"
        class="transport__action"
        :disabled="!selectedPatternId"
        @keydown.space.stop
        @click="$emit('removePattern')"
      >
        {{ $t('transport.removePattern') }}
      </button>
    </div>

    <div class="transport__display">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick, type PropType } from 'vue'

import { MAX_BPM, MIN_BPM } from '@/domain/constants'
import type { Pattern } from '@/domain/types'
import type { PlaybackMode } from '@/stores/playback'

export default defineComponent({
  props: {
    isPlaying: { type: Boolean, required: true },
    bpm: { type: Number, required: true },
    mode: String as PropType<PlaybackMode>,
    patterns: Array as PropType<readonly Pattern[]>,
    selectedPatternId: String,
  },

  emits: {
    toggle: () => true,
    bpmChange: (...args: [bpm: number]) => args.length === 1,
    modeChange: (...args: [mode: PlaybackMode]) => args.length === 1,
    selectPattern: (...args: [patternId: string]) => args.length === 1,
    createPattern: () => true,
    duplicatePattern: () => true,
    removePattern: () => true,
  },

  data() {
    return {
      MAX_BPM,
      MIN_BPM,
    }
  },

  computed: {
    playbackModes(): readonly { value: PlaybackMode; label: string }[] {
      return [
        { value: 'composition', label: this.$t('arrangement.title') },
        { value: 'pattern', label: this.$t('transport.pattern') },
      ]
    },
  },

  methods: {
    async handleBpmChange(event: Event): Promise<void> {
      if (!(event.target instanceof HTMLInputElement)) {
        return
      }
      const input = event.target
      if (Number.isFinite(input.valueAsNumber)) {
        this.$emit('bpmChange', input.valueAsNumber)
      }
      await nextTick()
      input.value = String(this.bpm)
    },
  },
})
</script>
