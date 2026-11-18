<template>
  <aside class="tracks">
    <h2 class="tracks__heading">Дорожки</h2>

    <ul class="tracks__list">
      <li v-for="track in tracks" :key="track.id">
        <button
          type="button"
          class="tracks__item"
          :class="{ 'tracks__item--active': track.id === selectedTrackId }"
          :aria-pressed="track.id === selectedTrackId"
          @click="emit('select', track.id)"
        >
          <span class="tracks__dot" />
          {{ track.name }}
        </button>
      </li>
    </ul>

    <div class="tracks__footer">
      <ul
        v-if="choosingInstrument"
        class="tracks__instruments"
        aria-label="Инструмент новой дорожки"
      >
        <li v-for="option in instrumentOptions" :key="option.label">
          <button type="button" class="tracks__action" @click="add(option.instrument)">
            {{ option.label }}
          </button>
        </li>
      </ul>
      <button
        type="button"
        class="tracks__action"
        :aria-expanded="choosingInstrument"
        @click="choosingInstrument = !choosingInstrument"
      >
        {{ choosingInstrument ? 'Отмена' : '+ Дорожка' }}
      </button>
      <button type="button" class="tracks__action">Загрузить звук</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { TRACK_INSTRUMENTS, instrumentLabel, type Instrument } from '@/domain/instruments'
import type { Track } from '@/domain/types'

defineProps<{
  tracks: readonly Track[]
  selectedTrackId: string | null
}>()

const emit = defineEmits<{
  select: [trackId: string]
  add: [instrument: Instrument]
}>()

const instrumentOptions = TRACK_INSTRUMENTS.map((instrument) => ({
  instrument,
  label: instrumentLabel(instrument),
}))

const choosingInstrument = ref(false)

function add(instrument: Instrument): void {
  choosingInstrument.value = false
  emit('add', instrument)
}
</script>
