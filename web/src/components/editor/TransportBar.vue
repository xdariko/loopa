<script setup lang="ts">
import { ref } from 'vue'

const isPlaying = ref(false)
const bpm = ref(120)
</script>

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

<style scoped>
.transport {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
}

.transport__play {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-surface-muted);
  font-size: var(--font-size-sm);
}

.transport__play--active {
  background: var(--color-accent);
  color: #fff;
}

.transport__field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.transport__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.transport__input {
  width: 64px;
  padding: var(--space-1) var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.transport__menu {
  width: 32px;
  height: 32px;
  margin-left: auto;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
}

.transport__menu:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}
</style>
