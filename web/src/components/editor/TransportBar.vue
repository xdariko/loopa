<template>
  <div class="transport">
    <button
      type="button"
      class="transport__play"
      :class="{ 'transport__play--active': isPlaying }"
      :aria-label="isPlaying ? 'Пауза' : 'Воспроизвести'"
      @click="isPlaying = !isPlaying"
    >
      {{ isPlaying ? '❚❚' : '▶' }}
    </button>

    <label class="transport__field">
      <span class="transport__label">BPM</span>
      <input v-model.number="bpm" class="transport__input" type="number" min="40" max="240" />
    </label>

    <label class="transport__field">
      <span class="transport__label">Паттерн</span>
      <select class="transport__input">
        <option>1</option>
      </select>
    </label>

    <button type="button" class="transport__menu" aria-label="Действия с паттерном">⋯</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isPlaying = ref(false)
const bpm = ref(120)
</script>
