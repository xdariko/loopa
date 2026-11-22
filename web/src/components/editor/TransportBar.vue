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

    <label v-if="patterns" class="transport__field">
      <span class="transport__label">Паттерн</span>
      <select
        class="transport__input"
        :value="selectedPatternId"
        :disabled="!patterns.length"
        @change="emit('selectPattern', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="(pattern, index) in patterns" :key="pattern.id" :value="pattern.id">
          {{ index + 1 }}
        </option>
      </select>
    </label>

    <div v-if="patterns" class="transport__actions">
      <button
        type="button"
        class="transport__action"
        @keydown.space.stop
        @click="emit('createPattern')"
      >
        Новый
      </button>
      <button
        type="button"
        class="transport__action"
        :disabled="!selectedPatternId"
        @keydown.space.stop
        @click="emit('duplicatePattern')"
      >
        Дублировать
      </button>
    </div>

    <div class="transport__display">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'

import { MAX_BPM, MIN_BPM } from '@/domain/constants'
import type { Pattern } from '@/domain/types'

const props = defineProps<{
  isPlaying: boolean
  bpm: number
  patterns?: readonly Pattern[]
  selectedPatternId?: string
}>()

const emit = defineEmits<{
  toggle: []
  bpmChange: [bpm: number]
  selectPattern: [patternId: string]
  createPattern: []
  duplicatePattern: []
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
