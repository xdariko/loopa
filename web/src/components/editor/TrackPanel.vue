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
