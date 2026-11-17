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

<script setup lang="ts">
const rows = [
  { track: 'Lead', patterns: [1, 1, 2, 1] },
  { track: 'Bass', patterns: [1, 1, 1, 2] },
  { track: 'Drums', patterns: [1, 2, 1, 2] },
]
</script>
