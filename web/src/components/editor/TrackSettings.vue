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

<script setup lang="ts">
import { computed } from 'vue'

import type { TrackMixControl } from '@/domain/project'
import type { Track } from '@/domain/types'

const PERCENT_SCALE = 100

const props = defineProps<{
  track: Track | null
  swing: number
}>()

const emit = defineEmits<{
  mutedChange: [trackId: string, muted: boolean]
  mixChange: [trackId: string, control: TrackMixControl, level: number]
  swingChange: [level: number]
}>()

const controlLabels: Record<TrackMixControl, string> = {
  volume: 'Громкость',
  delay: 'Delay',
  reverb: 'Reverb',
}

const mixControls = computed(() => {
  const { track } = props
  if (!track) {
    return []
  }
  const levels = { volume: track.volume, ...track.effects }
  return (Object.keys(controlLabels) as TrackMixControl[]).map((id) => ({
    id,
    label: controlLabels[id],
    percent: toPercent(levels[id]),
  }))
})

const swingPercent = computed(() => toPercent(props.swing))

function toPercent(level: number): number {
  return Math.round(level * PERCENT_SCALE)
}

function changeMuted(event: Event): void {
  if (props.track && event.target instanceof HTMLInputElement) {
    emit('mutedChange', props.track.id, event.target.checked)
  }
}

function changeMixLevel(control: TrackMixControl, event: Event): void {
  if (props.track && event.target instanceof HTMLInputElement) {
    emit('mixChange', props.track.id, control, event.target.valueAsNumber / PERCENT_SCALE)
  }
}

function changeSwing(event: Event): void {
  if (event.target instanceof HTMLInputElement) {
    emit('swingChange', event.target.valueAsNumber / PERCENT_SCALE)
  }
}
</script>
