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
          @pointerdown="handleCellPointerDown($event, { step, pitch: row.pitch })"
          @click="handleCellClick($event, { step, pitch: row.pitch })"
        />
      </template>

      <button
        v-for="note in pattern.notes"
        :key="note.id"
        type="button"
        class="pattern-grid__note"
        :class="{
          'pattern-grid__note--selected': isHighlighted(note),
          'pattern-grid__note--playing': isPlaying(note),
          'pattern-grid__note--dragging': isDragging(note),
          'pattern-grid__note--blocked': isDragging(note) && !previewFits,
        }"
        :style="notePlacement(displayed(note))"
        :aria-label="noteLabel(note)"
        :aria-pressed="isSelected(note)"
        @pointerdown="handleNotePointerDown($event, note, 'move')"
      >
        <span
          class="pattern-grid__resize"
          aria-hidden="true"
          @pointerdown.stop="handleNotePointerDown($event, note, 'resize')"
        />
      </button>

      <PatternPlayhead :steps="pattern.steps" :style="playheadPlacement" />

      <div
        v-if="selectionArea"
        class="pattern-grid__area"
        :style="areaPlacement(selectionArea)"
        data-testid="selection-area"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

import PatternPlayhead from '@/components/editor/PatternPlayhead.vue'
import { useAreaSelection } from '@/composables/useAreaSelection'
import { useNoteDrag, type GridCellSize, type NoteDragBounds } from '@/composables/useNoteDrag'
import { STEPS_PER_BEAT } from '@/domain/constants'
import {
  isSharpPitch,
  pitchLabel,
  pitchRangeFor,
  pitchesFor,
  type Instrument,
} from '@/domain/instruments'
import { canPlaceNotes, notesInArea } from '@/domain/notes'
import type { Note, NoteArea, NoteOffset, NotePosition, Pattern } from '@/domain/types'

const LABEL_COLUMNS = 1

type NoteGesture = 'move' | 'resize'

const props = defineProps<{
  pattern: Pattern
  instrument: Instrument
  selectedNoteIds: readonly string[]
  playingNoteIds?: ReadonlySet<string>
}>()

const emit = defineEmits<{
  add: [position: NotePosition]
  select: [noteId: string]
  toggle: [noteId: string]
  selectArea: [noteIds: readonly string[]]
  move: [noteIds: readonly string[], offset: NoteOffset]
  resize: [noteIds: readonly string[], durationChange: number]
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

const selectedIds = computed(() => new Set(props.selectedNoteIds))

function bounds(): NoteDragBounds {
  return { steps: props.pattern.steps, range: pitchRange.value }
}

const drag = useNoteDrag({
  bounds,
  cellSize: measureCell,
  scrollContainer: () => viewport.value,
  onMove: (noteIds, offset) => emit('move', noteIds, offset),
  onResize: (noteIds, durationChange) => emit('resize', noteIds, durationChange),
})

const selection = useAreaSelection({
  bounds,
  scrollContainer: () => viewport.value,
  onSelect: (area) => {
    const noteIds = notesInArea(props.pattern, area).map((note) => note.id)
    if (noteIds.length > 0) {
      emit('selectArea', noteIds)
    }
  },
})

const selectionArea = selection.area

const previewById = computed(
  () => new Map((drag.preview.value ?? []).map((note) => [note.id, note])),
)

const previewFits = computed(() => {
  const preview = drag.preview.value
  return preview ? canPlaceNotes(props.pattern, preview, pitchRange.value) : true
})

const areaNoteIds = computed(() => {
  const area = selectionArea.value
  return new Set(area ? notesInArea(props.pattern, area).map((note) => note.id) : [])
})

function measureCell(): GridCellSize | null {
  const cell = cells.value?.[0]
  if (!cell) {
    return null
  }
  const { width, height } = cell.getBoundingClientRect()
  return width > 0 && height > 0 ? { width, height } : null
}

function isSelected(note: Note): boolean {
  return selectedIds.value.has(note.id)
}

function isHighlighted(note: Note): boolean {
  return isSelected(note) || areaNoteIds.value.has(note.id)
}

function isPlaying(note: Note): boolean {
  return props.playingNoteIds?.has(note.id) ?? false
}

function isDragging(note: Note): boolean {
  return previewById.value.has(note.id)
}

function displayed(note: Note): Note {
  return previewById.value.get(note.id) ?? note
}

function stepColumn(step: number): number {
  return LABEL_COLUMNS + step + 1
}

function span(start: number | undefined, length: number): string {
  return `${start} / span ${length}`
}

function notePlacement(note: Note) {
  return {
    gridRow: rowLineByPitch.value.get(note.pitch),
    gridColumn: span(stepColumn(note.step), note.duration),
  }
}

const playheadPlacement = computed(() => ({
  gridRow: span(1, rows.value.length),
  gridColumn: span(stepColumn(0), props.pattern.steps),
}))

function areaPlacement(area: NoteArea) {
  return {
    gridRow: span(rowLineByPitch.value.get(area.highPitch), area.highPitch - area.lowPitch + 1),
    gridColumn: span(stepColumn(area.fromStep), area.toStep - area.fromStep + 1),
  }
}

function noteLabel(note: Note): string {
  return `${pitchLabel(props.instrument, note.pitch)}, шаг ${note.step + 1}`
}

function draggedGroup(note: Note): readonly Note[] {
  if (!isSelected(note)) {
    emit('select', note.id)
    return [note]
  }
  return props.pattern.notes.filter(isSelected)
}

function handleNotePointerDown(event: PointerEvent, note: Note, gesture: NoteGesture): void {
  if (event.shiftKey) {
    emit('toggle', note.id)
    return
  }
  const group = draggedGroup(note)
  if (gesture === 'resize') {
    drag.startResize(event, group)
  } else {
    drag.startMove(event, group)
  }
}

function handleCellPointerDown(event: PointerEvent, cell: NotePosition): void {
  if (!event.shiftKey || !(event.currentTarget instanceof HTMLElement)) {
    return
  }
  selection.start(event, cell, event.currentTarget.getBoundingClientRect())
}

function handleCellClick(event: MouseEvent, cell: NotePosition): void {
  if (!event.shiftKey) {
    emit('add', cell)
  }
}
</script>
