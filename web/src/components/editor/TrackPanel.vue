<template>
  <aside class="tracks">
    <h2 class="tracks__heading">Дорожки</h2>

    <slot />

    <ul class="tracks__list">
      <li
        v-for="(track, index) in tracks"
        :key="track.id"
        class="tracks__row"
        :style="{ '--track-color': trackColor(index) }"
      >
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
      <input
        ref="sampleInput"
        type="file"
        :accept="SAMPLE_FILE_ACCEPT"
        :disabled="importingSample"
        hidden
        @change="chooseSample"
      />
      <button
        type="button"
        class="tracks__action"
        :disabled="importingSample"
        @keydown.space.stop
        @click="sampleInput?.click()"
      >
        {{ importingSample ? 'Загрузка…' : 'Загрузить звук' }}
      </button>
      <p v-if="sampleError" class="tracks__error" role="alert">{{ sampleError }}</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, type ComponentPublicInstance } from 'vue'

import { SAMPLE_FILE_ACCEPT } from '@/audio/sampleFile'
import { MAX_TRACK_NAME_LENGTH } from '@/domain/constants'
import { TRACK_INSTRUMENTS, instrumentLabel, type Instrument } from '@/domain/instruments'
import { trackColor } from '@/domain/trackColor'
import type { Track } from '@/domain/types'

defineProps<{
  tracks: readonly Track[]
  selectedTrackId: string | null
  importingSample?: boolean
  sampleError?: string
}>()

const emit = defineEmits<{
  select: [trackId: string]
  add: [instrument: Instrument]
  remove: [trackId: string]
  rename: [trackId: string, name: string]
  importSample: [file: File]
}>()

const sampleInput = useTemplateRef<HTMLInputElement>('sampleInput')
const renamingTrackId = ref<string | null>(null)

function chooseSample(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) {
    emit('importSample', file)
  }
}

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
