<template>
  <aside class="tracks">
    <h2 class="tracks__heading">{{ $t('tracks.title') }}</h2>

    <slot />

    <ul class="tracks__list">
      <li
        v-for="(track, index) in tracks"
        :key="track.id"
        class="tracks__row"
        :style="trackStyle(index)"
      >
        <input
          v-if="renamingTrackId === track.id"
          :ref="focusNameInput"
          class="tracks__name-input"
          :value="track.name"
          :maxlength="MAX_TRACK_NAME_LENGTH"
          :aria-label="$t('tracks.name')"
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
          :title="$t('tracks.renameHint')"
          @click="$emit('select', track.id)"
          @dblclick="startRename(track.id)"
          @keydown.f2="startRename(track.id)"
        >
          <span class="tracks__dot" />
          <span class="tracks__name">{{ track.name }}</span>
        </button>
        <button
          type="button"
          class="tracks__remove"
          :aria-label="$t('tracks.remove', { name: track.name })"
          @click="$emit('remove', track.id)"
        >
          ×
        </button>
      </li>
    </ul>

    <div class="tracks__footer">
      <ul
        v-if="choosingInstrument"
        class="tracks__instruments"
        :aria-label="$t('tracks.newInstrument')"
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
        {{ choosingInstrument ? $t('tracks.cancel') : $t('tracks.add') }}
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
        @click="($refs.sampleInput as HTMLInputElement | undefined)?.click()"
      >
        {{ importingSample ? $t('tracks.loadingSample') : $t('tracks.loadSample') }}
      </button>
      <p v-if="sampleError" class="tracks__error" role="alert">{{ sampleError }}</p>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent, type ComponentPublicInstance, type PropType } from 'vue'

import { SAMPLE_FILE_ACCEPT } from '@/audio/sampleFile'
import { MAX_TRACK_NAME_LENGTH } from '@/domain/constants'
import { TRACK_INSTRUMENTS, instrumentLabel, type Instrument } from '@/domain/instruments'
import { trackColor } from '@/domain/trackColor'
import type { Track } from '@/domain/types'

export default defineComponent({
  props: {
    tracks: { type: Array as PropType<readonly Track[]>, required: true },
    selectedTrackId: { type: [String, null] as PropType<string | null>, required: true },
    importingSample: Boolean,
    sampleError: String,
  },

  emits: {
    select: (...args: [trackId: string]) => args.length === 1,
    add: (...args: [instrument: Instrument]) => args.length === 1,
    remove: (...args: [trackId: string]) => args.length === 1,
    rename: (...args: [trackId: string, name: string]) => args.length === 2,
    importSample: (...args: [file: File]) => args.length === 1,
  },

  data() {
    return {
      SAMPLE_FILE_ACCEPT,
      MAX_TRACK_NAME_LENGTH,
      renamingTrackId: null as string | null,
      instrumentOptions: TRACK_INSTRUMENTS.map((instrument) => ({
        instrument,
        label: instrumentLabel(instrument),
      })),
      choosingInstrument: false,
    }
  },

  methods: {
    trackStyle(index: number) {
      return { '--track-color': trackColor(index) }
    },

    chooseSample(event: Event): void {
      if (!(event.target instanceof HTMLInputElement)) {
        return
      }
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file) {
        this.$emit('importSample', file)
      }
    },

    focusNameInput(element: Element | ComponentPublicInstance | null): void {
      if (element instanceof HTMLInputElement) {
        element.focus()
        element.select()
      }
    },

    startRename(trackId: string): void {
      this.renamingTrackId = trackId
    },

    finishRename(event: Event): void {
      const trackId = this.renamingTrackId
      if (!trackId || !(event.target instanceof HTMLInputElement)) {
        return
      }
      this.renamingTrackId = null
      this.$emit('rename', trackId, event.target.value)
    },

    cancelRename(): void {
      this.renamingTrackId = null
    },

    add(instrument: Instrument): void {
      this.choosingInstrument = false
      this.$emit('add', instrument)
    },
  },
})
</script>
