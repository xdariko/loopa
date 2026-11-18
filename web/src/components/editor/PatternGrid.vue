<template>
  <div ref="viewport" class="pattern-grid">
    <div class="pattern-grid__body" :style="{ '--pattern-steps': pattern.steps }">
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
          ref="cells"
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
        :class="{
          'pattern-grid__note--selected': note.id === selectedNoteId,
          'pattern-grid__note--dragging': isDragging(note),
          'pattern-grid__note--blocked': isDragging(note) && !previewFits,
        }"
        :style="notePlacement(displayed(note))"
        :aria-label="noteLabel(note)"
        :aria-pressed="note.id === selectedNoteId"
        @pointerdown="handleNotePointerDown($event, note)"
      >
        <span
          class="pattern-grid__resize"
          aria-hidden="true"
          @pointerdown.stop="handleResizePointerDown($event, note)"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

import { useNoteDrag, type GridCellSize } from '@/composables/useNoteDrag'
import { STEPS_PER_BEAT } from '@/domain/constants'
import {
  isSharpPitch,
  pitchLabel,
  pitchRangeFor,
  pitchesFor,
  type Instrument,
} from '@/domain/instruments'
import { canPlaceNote } from '@/domain/notes'
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
  move: [noteId: string, position: NotePosition]
  resize: [noteId: string, duration: number]
}>()

const viewport = useTemplateRef<HTMLElement>('viewport')
const cells = useTemplateRef<HTMLElement[]>('cells')

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

const pitchRange = computed(() => pitchRangeFor(props.instrument))

const drag = useNoteDrag({
  bounds: () => ({ steps: props.pattern.steps, range: pitchRange.value }),
  cellSize: measureCell,
  scrollContainer: () => viewport.value,
  onMove: (noteId, position) => emit('move', noteId, position),
  onResize: (noteId, duration) => emit('resize', noteId, duration),
})

const previewFits = computed(() => {
  const preview = drag.preview.value
  return preview ? canPlaceNote(props.pattern, preview, pitchRange.value) : true
})

function measureCell(): GridCellSize | null {
  const cell = cells.value?.[0]
  if (!cell) {
    return null
  }
  const { width, height } = cell.getBoundingClientRect()
  return width > 0 && height > 0 ? { width, height } : null
}

function isDragging(note: Note): boolean {
  return drag.preview.value?.id === note.id
}

function displayed(note: Note): Note {
  const preview = drag.preview.value
  return preview?.id === note.id ? preview : note
}

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

function handleNotePointerDown(event: PointerEvent, note: Note): void {
  emit('select', note.id)
  drag.startMove(event, note)
}

function handleResizePointerDown(event: PointerEvent, note: Note): void {
  emit('select', note.id)
  drag.startResize(event, note)
}
</script>
