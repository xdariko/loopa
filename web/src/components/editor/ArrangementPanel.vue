<script setup lang="ts">
const rows = [
  { track: 'Lead', patterns: [1, 1, 2, 1] },
  { track: 'Bass', patterns: [1, 1, 1, 2] },
  { track: 'Drums', patterns: [1, 2, 1, 2] },
]
</script>

<template>
  <section class="arrangement" aria-label="Композиция">
    <div v-for="row in rows" :key="row.track" class="arrangement__row">
      <span class="arrangement__track">{{ row.track }}</span>
      <div class="arrangement__bars">
        <button
          v-for="(pattern, bar) in row.patterns"
          :key="bar"
          type="button"
          class="arrangement__block"
        >
          {{ pattern }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.arrangement {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  overflow: auto;
}

.arrangement__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.arrangement__track {
  width: 56px;
  flex-shrink: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.arrangement__bars {
  display: flex;
  gap: 2px;
}

.arrangement__block {
  width: 48px;
  height: 28px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.arrangement__block:hover {
  background: var(--color-accent-soft);
}
</style>
