<template>
  <div ref="viewport" class="pattern-grid" :style="trackStyle">
    <div class="pattern-grid__body" :style="gridStyle">
      <template v-for="row in rows" :key="row.pitch">
        <span class="pattern-grid__label" :class="{ 'pattern-grid__label--sharp': row.sharp }" :style="row.labelStyle">
          {{ row.label }}
        </span>
        <div
          v-for="step in steps"
          ref="cells"
          :key="step"
          class="pattern-grid__cell"
          :class="{'pattern-grid__cell--sharp': row.sharp, 'pattern-grid__cell--beat': step % STEPS_PER_BEAT === 0}"
          :style="cellPlacement(row.line, step)"
          :data-step="step"
          :data-pitch="row.pitch"
          @pointerdown="handleCellPointerDown($event, { step, pitch: row.pitch })"
          @click="handleCellClick($event, { step, pitch: row.pitch })"
        />
      </template>

      <span
        v-for="(note, index) in visibleGhostNotes"
        :key="index"
        class="pattern-grid__ghost-note"
        :style="ghostNoteStyle(note)"
        aria-hidden="true"
      />

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
        @contextmenu="handleNoteContextMenu($event, note)"
      >
        <span class="pattern-grid__resize"  aria-hidden="true"  @pointerdown.stop="handleNotePointerDown($event, note, 'resize')"/>
      </button>

      <PatternPlayhead v-if="!hidePlayhead" :steps="pattern.steps" :style="playheadPlacement" />

      <div v-if="selectionArea" class="pattern-grid__area" :style="areaPlacement(selectionArea)" data-testid="selection-area"/>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, useTemplateRef, type PropType } from 'vue'

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

export default defineComponent({
  components: {
    PatternPlayhead,
  },

  props: {
    pattern: { type: Object as PropType<Pattern>, required: true },
    instrument: { type: Object as PropType<Instrument>, required: true },
    trackColor: String,
    selectedNoteIds: { type: Array as PropType<readonly string[]>, required: true },
    ghostNotes: Array as PropType<readonly (Note & { readonly color: string })[]>,
    playingNoteIds: Object as PropType<ReadonlySet<string>>,
    hidePlayhead: Boolean,
  },

  emits: {
    add: (...args: [position: NotePosition]) => args.length === 1,
    remove: (...args: [noteIds: readonly string[]]) => args.length === 1,
    select: (...args: [noteId: string]) => args.length === 1,
    toggle: (...args: [noteId: string]) => args.length === 1,
    selectArea: (...args: [noteIds: readonly string[]]) => args.length === 1,
    move: (...args: [noteIds: readonly string[], offset: NoteOffset]) => args.length === 2,
    resize: (...args: [noteIds: readonly string[], durationChange: number]) => args.length === 2,
  },

  setup(props, { emit }) {
    const viewport = useTemplateRef<HTMLElement>('viewport')
    const cells = useTemplateRef<HTMLElement[]>('cells')
    const bounds = (): NoteDragBounds => ({
      steps: props.pattern.steps,
      range: pitchRangeFor(props.instrument),
    })

    function measureCell(): GridCellSize | null {
      const cell = cells.value?.[0]
      if (!cell) {
        return null
      }
      const { width, height } = cell.getBoundingClientRect()
      return width > 0 && height > 0 ? { width, height } : null
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
    return { drag, selection }
  },

  data() {
    return {
      STEPS_PER_BEAT,
    }
  },

  computed: {
    trackStyle() {
      return { '--track-color': this.trackColor }
    },

    gridStyle() {
      return { '--pattern-steps': this.pattern.steps }
    },

    rows() {
      return pitchesFor(this.instrument).map((pitch, index) => ({
        pitch,
        line: index + 1,
        labelStyle: { gridRow: index + 1 },
        label: pitchLabel(this.instrument, pitch),
        sharp: isSharpPitch(this.instrument, pitch),
      }))
    },

    steps() {
      return Array.from({ length: this.pattern.steps }, (_, step) => step)
    },

    rowLineByPitch() {
      return new Map(this.rows.map((row) => [row.pitch, row.line]))
    },

    pitchRange() {
      return pitchRangeFor(this.instrument)
    },

    selectedIds() {
      return new Set(this.selectedNoteIds)
    },

    visibleGhostNotes() {
      return (this.ghostNotes ?? [])
        .filter((note) => this.rowLineByPitch.has(note.pitch) && note.step < this.pattern.steps)
        .map((note) => ({
          ...note,
          duration: Math.min(note.duration, this.pattern.steps - note.step),
        }))
    },

    selectionArea() {
      return this.selection.area.value
    },

    previewById() {
      return new Map((this.drag.preview.value ?? []).map((note) => [note.id, note]))
    },

    previewFits() {
      const preview = this.drag.preview.value
      return preview ? canPlaceNotes(this.pattern, preview, this.pitchRange) : true
    },

    areaNoteIds() {
      const area = this.selectionArea
      return new Set(area ? notesInArea(this.pattern, area).map((note) => note.id) : [])
    },

    playheadPlacement() {
      return {
        gridRow: this.span(1, this.rows.length),
        gridColumn: this.span(this.stepColumn(0), this.pattern.steps),
      }
    },
  },

  methods: {
    isSelected(note: Note): boolean {
      return this.selectedIds.has(note.id)
    },

    isHighlighted(note: Note): boolean {
      return this.isSelected(note) || this.areaNoteIds.has(note.id)
    },

    isPlaying(note: Note): boolean {
      return this.playingNoteIds?.has(note.id) ?? false
    },

    isDragging(note: Note): boolean {
      return this.previewById.has(note.id)
    },

    displayed(note: Note): Note {
      return this.previewById.get(note.id) ?? note
    },

    stepColumn(step: number): number {
      return LABEL_COLUMNS + step + 1
    },

    span(start: number | undefined, length: number): string {
      return `${start} / span ${length}`
    },

    cellPlacement(line: number, step: number) {
      return { gridRow: line, gridColumn: this.stepColumn(step) }
    },

    ghostNoteStyle(note: Note & { readonly color: string }) {
      return { ...this.notePlacement(note), '--ghost-color': note.color }
    },

    notePlacement(note: Note) {
      return {
        gridRow: this.rowLineByPitch.get(note.pitch),
        gridColumn: this.span(this.stepColumn(note.step), note.duration),
      }
    },

    areaPlacement(area: NoteArea) {
      return {
        gridRow: this.span(
          this.rowLineByPitch.get(area.highPitch),
          area.highPitch - area.lowPitch + 1,
        ),
        gridColumn: this.span(this.stepColumn(area.fromStep), area.toStep - area.fromStep + 1),
      }
    },

    noteLabel(note: Note): string {
      return this.$t('editor.noteLabel', {
        pitch: pitchLabel(this.instrument, note.pitch),
        step: note.step + 1,
      })
    },

    draggedGroup(note: Note): readonly Note[] {
      if (!this.isSelected(note)) {
        this.$emit('select', note.id)
        return [note]
      }
      return this.pattern.notes.filter(this.isSelected)
    },

    handleNotePointerDown(event: PointerEvent, note: Note, gesture: NoteGesture): void {
      if (event.button !== 0) {
        return
      }
      if (event.shiftKey) {
        this.$emit('toggle', note.id)
        return
      }
      const group = this.draggedGroup(note)
      if (gesture === 'resize') {
        this.drag.startResize(event, group)
      } else {
        this.drag.startMove(event, group)
      }
    },

    handleNoteContextMenu(event: MouseEvent, note: Note): void {
      if (event.button === 2) {
        event.preventDefault()
        this.$emit('remove', [note.id])
      }
    },

    handleCellPointerDown(event: PointerEvent, cell: NotePosition): void {
      if (!event.shiftKey || !(event.currentTarget instanceof HTMLElement)) {
        return
      }
      this.selection.start(event, cell, event.currentTarget.getBoundingClientRect())
    },

    handleCellClick(event: MouseEvent, cell: NotePosition): void {
      if (!event.shiftKey) {
        this.$emit('add', cell)
      }
    },
  },
})
</script>
