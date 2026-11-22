<template>
  <details class="track-settings">
    <summary class="track-settings__summary" @keydown.space.stop>Настройки звука</summary>
    <fieldset v-if="track" :key="track.id" class="track-settings__group">
      <legend class="track-settings__name" :title="track.name">{{ track.name }}</legend>
      <label class="track-settings__mute">
        <input
          class="track-settings__checkbox"
          type="checkbox"
          :checked="track.muted"
          @change="changeMuted"
        />
        Без звука
      </label>

      <label v-for="control in mixControls" :key="control.id" class="track-settings__slider">
        <span class="track-settings__label">{{ control.label }}</span>
        <span class="track-settings__value" aria-hidden="true">{{ control.percent }}%</span>
        <input
          class="track-settings__range"
          type="range"
          :min="0"
          :max="PERCENT_SCALE"
          :value="control.percent"
          :aria-valuetext="`${control.percent}%`"
          @change="changeMixLevel(control.id, $event)"
        />
      </label>
    </fieldset>

    <fieldset class="track-settings__group">
      <legend class="track-settings__name">Проект</legend>
      <label class="track-settings__slider">
        <span class="track-settings__label">Свинг</span>
        <span class="track-settings__value" aria-hidden="true">{{ swingPercent }}%</span>
        <input
          class="track-settings__range"
          type="range"
          :min="0"
          :max="PERCENT_SCALE"
          :value="swingPercent"
          :aria-valuetext="`${swingPercent}%`"
          @change="changeSwing"
        />
      </label>
    </fieldset>
  </details>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import type { TrackMixControl } from '@/domain/project'
import type { Track } from '@/domain/types'

const PERCENT_SCALE = 100

const controlLabels: Record<TrackMixControl, string> = {
  volume: 'Громкость',
  delay: 'Delay',
  reverb: 'Reverb',
}

export default defineComponent({
  props: {
    track: { type: [Object, null] as PropType<Track | null>, required: true },
    swing: { type: Number, required: true },
  },

  emits: {
    mutedChange: (...args: [trackId: string, muted: boolean]) => args.length === 2,
    mixChange: (...args: [trackId: string, control: TrackMixControl, level: number]) =>
      args.length === 3,
    swingChange: (...args: [level: number]) => args.length === 1,
  },

  data() {
    return { PERCENT_SCALE }
  },

  computed: {
    mixControls() {
      const { track } = this
      if (!track) {
        return []
      }
      const levels = { volume: track.volume, ...track.effects }
      return (Object.keys(controlLabels) as TrackMixControl[]).map((id) => ({
        id,
        label: controlLabels[id],
        percent: this.toPercent(levels[id]),
      }))
    },

    swingPercent() {
      return this.toPercent(this.swing)
    },
  },

  methods: {
    toPercent(level: number): number {
      return Math.round(level * PERCENT_SCALE)
    },

    changeMuted(event: Event): void {
      if (this.track && event.target instanceof HTMLInputElement) {
        this.$emit('mutedChange', this.track.id, event.target.checked)
      }
    },

    changeMixLevel(control: TrackMixControl, event: Event): void {
      if (this.track && event.target instanceof HTMLInputElement) {
        this.$emit('mixChange', this.track.id, control, event.target.valueAsNumber / PERCENT_SCALE)
      }
    },

    changeSwing(event: Event): void {
      if (event.target instanceof HTMLInputElement) {
        this.$emit('swingChange', event.target.valueAsNumber / PERCENT_SCALE)
      }
    },
  },
})
</script>
