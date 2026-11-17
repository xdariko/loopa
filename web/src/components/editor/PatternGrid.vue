<template>
  <div class="pattern-grid" :style="{ '--pattern-steps': pattern.steps }">
    <template v-for="row in rows" :key="row.pitch">
      <span
        class="pattern-grid__label"
        :class="{ 'pattern-grid__label--sharp': row.sharp }"
        :style="{ gridRow: row.line }"
      >
        {{ row.label }}
      </span>
      <div
        v-for="step in steps"
        :key="step"
        class="pattern-grid__cell"
        :class="{
          'pattern-grid__cell--sharp': row.sharp,
          'pattern-grid__cell--beat': step % STEPS_PER_BEAT === 0,
        }"
        :style="{ gridRow: row.line, gridColumn: stepColumn(step) }"
        :data-step="step"
        :data-pitch="row.pitch"
        @click="emit('add', { step, pitch: row.pitch })"
      />
    </template>

    <button
      v-for="note in pattern.notes"
      :key="note.id"
      type="button"
      class="pattern-grid__note"
      :class="{ 'pattern-grid__note--selected': note.id === selectedNoteId }"
      :style="notePlacement(note)"
      :aria-label="noteLabel(note)"
      :aria-pressed="note.id === selectedNoteId"
      @click="emit('select', note.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { STEPS_PER_BEAT } from '@/domain/constants'
import { isSharpPitch, pitchLabel, pitchesFor, type Instrument } from '@/domain/instruments'
import type { Note, NotePosition, Pattern } from '@/domain/types'

const LABEL_COLUMNS = 1

const props = defineProps<{
  pattern: Pattern
  instrument: Instrument
  selectedNoteId: string | null
}>()

const emit = defineEmits<{
  add: [position: NotePosition]
  select: [noteId: string]
}>()

const rows = computed(() =>
  pitchesFor(props.instrument).map((pitch, index) => ({
    pitch,
    line: index + 1,
    label: pitchLabel(props.instrument, pitch),
    sharp: isSharpPitch(props.instrument, pitch),
  })),
)

const steps = computed(() => Array.from({ length: props.pattern.steps }, (_, step) => step))

const rowLineByPitch = computed(() => new Map(rows.value.map((row) => [row.pitch, row.line])))

function stepColumn(step: number): number {
  return LABEL_COLUMNS + step + 1
}

function notePlacement(note: Note) {
  return {
    gridRow: rowLineByPitch.value.get(note.pitch),
    gridColumn: `${stepColumn(note.step)} / span ${note.duration}`,
  }
}

function noteLabel(note: Note): string {
  return `${pitchLabel(props.instrument, note.pitch)}, шаг ${note.step + 1}`
}
</script>
