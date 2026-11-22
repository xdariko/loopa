<template>
  <div class="transport">
    <button
      type="button"
      class="transport__play"
      :class="{ 'transport__play--active': isPlaying }"
      :aria-label="isPlaying ? 'Пауза' : 'Воспроизвести'"
      @click="emit('toggle')"
    >
      {{ isPlaying ? '❚❚' : '▶' }}
    </button>

    <label class="transport__field">
      <span class="transport__label">BPM</span>
      <input
        class="transport__input"
        type="number"
        :value="bpm"
        :min="MIN_BPM"
        :max="MAX_BPM"
        @change="handleBpmChange"
      />
    </label>

    <label class="transport__field">
      <span class="transport__label">Паттерн</span>
      <select class="transport__input">
        <option>1</option>
      </select>
    </label>

    <div class="transport__display">
      <slot />
    </div>

    <button type="button" class="transport__menu" aria-label="Действия с паттерном">⋯</button>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'

import { MAX_BPM, MIN_BPM } from '@/domain/constants'

const props = defineProps<{
  isPlaying: boolean
  bpm: number
}>()

const emit = defineEmits<{
  toggle: []
  bpmChange: [bpm: number]
}>()

async function handleBpmChange(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  if (Number.isFinite(input.valueAsNumber)) {
    emit('bpmChange', input.valueAsNumber)
  }
  await nextTick()
  input.value = String(props.bpm)
}
</script>
