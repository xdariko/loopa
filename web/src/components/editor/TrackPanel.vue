<template>
  <aside class="tracks">
    <h2 class="tracks__heading">Дорожки</h2>

    <slot />

    <ul class="tracks__list">
      <li v-for="track in tracks" :key="track.id" class="tracks__row">
        <input
          v-if="renamingTrackId === track.id"
          :ref="focusNameInput"
          class="tracks__name-input"
          :value="track.name"
          :maxlength="MAX_TRACK_NAME_LENGTH"
          aria-label="Название дорожки"
          @keydown.enter="finishRename"
          @keydown.esc="cancelRename"
          @blur="finishRename"
        />
        <button
          v-else
          type="button"
          class="tracks__item"
          :class="{ 'tracks__item--active': track.id === selectedTrackId }"
          :aria-pressed="track.id === selectedTrackId"
          title="Двойной клик или F2 — переименовать"
          @click="emit('select', track.id)"
          @dblclick="startRename(track.id)"
          @keydown.f2="startRename(track.id)"
        >
          <span class="tracks__dot" />
          <span class="tracks__name">{{ track.name }}</span>
        </button>
        <button
          type="button"
          class="tracks__remove"
          :aria-label="`Удалить дорожку ${track.name}`"
          @click="emit('remove', track.id)"
        >
          ×
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
import { ref, type ComponentPublicInstance } from 'vue'

import { MAX_TRACK_NAME_LENGTH } from '@/domain/constants'
import { TRACK_INSTRUMENTS, instrumentLabel, type Instrument } from '@/domain/instruments'
import type { Track } from '@/domain/types'

defineProps<{
  tracks: readonly Track[]
  selectedTrackId: string | null
}>()

const emit = defineEmits<{
  select: [trackId: string]
  add: [instrument: Instrument]
  remove: [trackId: string]
  rename: [trackId: string, name: string]
}>()

const renamingTrackId = ref<string | null>(null)

function focusNameInput(element: Element | ComponentPublicInstance | null): void {
  if (element instanceof HTMLInputElement) {
    element.focus()
    element.select()
  }
}

function startRename(trackId: string): void {
  renamingTrackId.value = trackId
}

function finishRename(event: Event): void {
  const trackId = renamingTrackId.value
  if (!trackId || !(event.target instanceof HTMLInputElement)) {
    return
  }
  renamingTrackId.value = null
  emit('rename', trackId, event.target.value)
}

function cancelRename(): void {
  renamingTrackId.value = null
}

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
