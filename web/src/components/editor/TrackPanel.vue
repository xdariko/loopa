<script setup lang="ts">
const tracks = [
  { id: 'lead', name: 'Lead' },
  { id: 'bass', name: 'Bass' },
  { id: 'drums', name: 'Drums' },
]
</script>

<template>
  <aside class="tracks">
    <h2 class="tracks__heading">Дорожки</h2>

    <ul class="tracks__list">
      <li v-for="(track, index) in tracks" :key="track.id">
        <button type="button" class="tracks__item" :class="{ 'tracks__item--active': index === 0 }">
          <span class="tracks__dot" />
          {{ track.name }}
        </button>
      </li>
    </ul>

    <div class="tracks__footer">
      <button type="button" class="tracks__action">+ Дорожка</button>
      <button type="button" class="tracks__action">Загрузить звук</button>
    </div>
  </aside>
</template>

<style scoped>
.tracks {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-3);
  background: var(--color-surface);
}

.tracks__heading {
  padding: 0 var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tracks__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
}

.tracks__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  text-align: left;
}

.tracks__item:hover {
  background: var(--color-surface-muted);
}

.tracks__item--active {
  background: var(--color-accent-soft);
}

.tracks__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
}

.tracks__item--active .tracks__dot {
  background: var(--color-accent);
}

.tracks__footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: auto;
}

.tracks__action {
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  text-align: left;
}

.tracks__action:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}
</style>
