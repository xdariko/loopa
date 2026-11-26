<template>
  <section class="arrangement" :class="{ 'arrangement--expanded': expanded }" :aria-label="$t('arrangement.title')">
    <div class="arrangement__header">
      <h2 class="arrangement__heading">{{ $t('arrangement.title') }}</h2>
      <slot name="actions" />
      <button
        v-if="rows.length"
        type="button"
        class="arrangement__toggle"
        :aria-expanded="expanded"
        @keydown.space.stop
        @click="toggleExpanded"
      >
        {{ expanded ? $t('arrangement.collapse') : $t('arrangement.expand') }}
      </button>
    </div>
    <p v-if="!rows.length" class="arrangement__empty">{{ $t('arrangement.empty') }}</p>
    <div
      ref="viewport"
      class="arrangement__viewport"
      role="region"
      :aria-label="$t('arrangement.timeline')"
      tabindex="0"
      @scroll="closePicker()"
    >
      <div class="arrangement__map">
        <div class="arrangement__ruler arrangement__row">
          <span class="arrangement__track"></span>
          <div class="arrangement__bars">
            <span v-for="bar in arrangement.barCount" :key="bar" class="arrangement__tick">
              {{ bar }}
              <button
                v-if="arrangement.barCount > 1"
                type="button"
                class="arrangement__remove-bar"
                :aria-label="$t('arrangement.removeBar', { bar })"
                :title="$t('arrangement.removeBar', { bar })"
                @keydown.space.stop
                @click="removeBar(bar - 1)"
              >
                ×
              </button>
            </span>
          </div>
        </div>

        <div v-for="row in rows" :key="row.track.id" class="arrangement__row" :style="row.style">
          <span class="arrangement__track" :title="row.track.name">
            <span class="arrangement__track-dot" aria-hidden="true" />{{ row.track.name }}
          </span>
          <div class="arrangement__bars">
            <div v-for="({ pattern, number }, bar) in row.slots" :key="bar" class="arrangement__cell">
              <button
                v-if="pattern"
                type="button"
                class="arrangement__block"
                :title="slotLabel(row.track, bar, number)"
                :aria-label="slotLabel(row.track, bar, number)"
                :aria-pressed="selectedCell?.track.id === row.track.id && selectedCell.bar === bar"
                @keydown.space.stop
                @click="openCell(row.track.id, bar, pattern.id)"
              >
                <span v-if="number !== null" class="arrangement__number">{{ number }}</span>
                <PatternPreview
                  :pattern="pattern"
                  :range="row.range"
                  :playing-track-id="
                    bar === playbackBar && playingPatterns.get(row.track.id) === pattern.id
                      ? row.track.id
                      : undefined
                  "
                />
              </button>
              <button
                v-if="pattern"
                type="button"
                class="arrangement__cell-action"
                :aria-label="$t('arrangement.actions', { slot: slotLabel(row.track, bar, number) })"
                :aria-expanded="isPickerFor(row.track.id, bar)"
                aria-haspopup="dialog"
                @keydown.space.stop
                @click="openPicker($event, row.track.id, bar)"
              >
                ⋯
              </button>
              <button
                v-else
                type="button"
                class="arrangement__block arrangement__block--empty"
                :aria-label="$t('arrangement.addPattern', { slot: slotLabel(row.track, bar, null) })"
                :aria-expanded="isPickerFor(row.track.id, bar)"
                aria-haspopup="dialog"
                @keydown.space.stop
                @click="openPicker($event, row.track.id, bar)"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="arrangement__append"
          :aria-label="$t('arrangement.addBar')"
          :title="$t('arrangement.addBar')"
          @keydown.space.stop
          @click="appendBar"
        >
          +
        </button>
        <div v-if="playbackBar !== null" class="arrangement__playback" :style="playbackStyle">
          <PatternPlayhead :steps="STEPS_PER_BAR" />
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="picker && pickerRow"
        ref="pickerElement"
        class="arrangement__picker"
        role="dialog"
        :aria-label="pickerLabel"
        :style="pickerStyle"
        tabindex="-1"
        @focusout="dismissOnFocusOut"
        @keydown.stop
        @keydown.esc.prevent="closePicker(true)"
      >
        <p class="arrangement__picker-title">
          <span class="arrangement__track-dot" aria-hidden="true" />{{ pickerLabel }}
        </p>
        <div v-if="pickerRow.track.patterns.length" class="arrangement__choices">
          <button
            v-for="(pattern, index) in pickerRow.track.patterns"
            :key="pattern.id"
            type="button"
            class="arrangement__choice"
            :aria-pressed="pickerPatternId === pattern.id"
            @click="assignPattern(pattern.id)"
          >
            <span class="arrangement__thumbnail">
              <PatternPreview :pattern="pattern" :range="pickerRow.range" />
            </span>
            {{ $t('arrangement.patternNumber', { number: index + 1 }) }}
          </button>
        </div>

        <div class="arrangement__picker-actions">
          <button type="button" class="arrangement__picker-action" @click="createPattern">
            {{ $t('arrangement.newPattern') }}
          </button>
          <button v-if="pickerPatternId !== null" type="button" class="arrangement__picker-action" @click="assignPattern(null)" >
            {{ $t('arrangement.clearBar') }}
          </button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script lang="ts">
import { defineComponent, useTemplateRef, nextTick, type CSSProperties, type PropType } from 'vue'

import PatternPlayhead from '@/components/editor/PatternPlayhead.vue'
import PatternPreview from '@/components/editor/PatternPreview.vue'
import { injectPlaybackCursor } from '@/composables/usePlaybackCursor'
import { STEPS_PER_BAR } from '@/domain/constants'
import { pitchRangeFor } from '@/domain/instruments'
import { trackColor } from '@/domain/trackColor'
import type { Arrangement, Track } from '@/domain/types'

interface Cell {
  trackId: string
  bar: number
}

interface Picker extends Cell {
  trigger: HTMLButtonElement
  style: CSSProperties
}

const PICKER_WIDTH = 280

const PICKER_GAP = 8

export default defineComponent({
  components: {
    PatternPlayhead,
    PatternPreview,
  },

  props: {
    tracks: { type: Array as PropType<readonly Track[]>, required: true },
    arrangement: { type: Object as PropType<Arrangement>, required: true },
    selectedTrackId: { type: [String, null] as PropType<string | null>, required: true },
  },

  emits: {
    appendBar: () => true,
    removeBar: (...args: [bar: number]) => args.length === 1,
    open: (...args: [trackId: string, patternId: string | null, bar: number]) => args.length === 3,
    assign: (...args: [trackId: string, bar: number, patternId: string | null]) =>
      args.length === 3,
    create: (...args: [trackId: string, bar: number]) => args.length === 2,
  },

  setup() {
    const playbackCursor = injectPlaybackCursor()
    const pickerElement = useTemplateRef<HTMLElement>('pickerElement')
    const viewport = useTemplateRef<HTMLElement>('viewport')
    return { playbackCursor, pickerElement, viewport }
  },

  data() {
    return {
      STEPS_PER_BAR,
      expanded: false,
      activeCell: null as Cell | null,
      picker: null as Picker | null,
    }
  },

  computed: {
    playbackBar() {
      return this.playbackCursor.bar.value
    },

    playbackStyle() {
      return { '--arrangement-playback-bar': this.playbackBar ?? undefined }
    },

    pickerStyle() {
      if (!this.picker || !this.pickerRow) {
        return undefined
      }
      return { ...this.picker.style, ...this.pickerRow.style }
    },

    playingPatterns() {
      return this.playbackCursor.patterns.value
    },

    pickerLabel() {
      return this.$t('arrangement.barLabel', {
        track: this.pickerRow?.track.name ?? '',
        bar: (this.picker?.bar ?? 0) + 1,
      })
    },

    pickerPatternId() {
      return this.picker
        ? (this.arrangement.lanes[this.picker.trackId]?.[this.picker.bar] ?? null)
        : null
    },

    rows() {
      return this.tracks.map((track, index) => {
        const patterns = new Map(
          track.patterns.map((pattern, index) => [pattern.id, { pattern, number: index + 1 }]),
        )
        const lane = this.arrangement.lanes[track.id]
        const slots = Array.from({ length: this.arrangement.barCount }, (_, bar) => {
          const id = lane?.[bar]
          const entry = id == null ? undefined : patterns.get(id)
          return entry ?? { pattern: null, number: null }
        })
        return {
          track,
          range: pitchRangeFor(track.instrument),
          slots,
          style: { '--track-color': trackColor(index) },
        }
      })
    },

    pickerRow() {
      return this.rows.find((row) => row.track.id === this.picker?.trackId)
    },

    selectedCell() {
      const cell = this.activeCell
      if (!cell || cell.trackId !== this.selectedTrackId) {
        return null
      }
      const track = this.tracks.find((track) => track.id === cell.trackId)
      const patternId = this.arrangement.lanes[cell.trackId]?.[cell.bar]
      if (!track || patternId === undefined) {
        return null
      }
      return { track, bar: cell.bar, patternId }
    },
  },

  mounted() {
    window.addEventListener('pointerdown', this.dismissOnOutsideClick)
    window.addEventListener('resize', this.dismissOnResize)
  },

  unmounted() {
    window.removeEventListener('pointerdown', this.dismissOnOutsideClick)
    window.removeEventListener('resize', this.dismissOnResize)
  },

  methods: {
    slotLabel(track: Track, bar: number, number: number | null): string {
      const pattern =
        number === null
          ? this.$t('arrangement.emptySlot')
          : this.$t('arrangement.patternNumber', { number })
      return this.$t('arrangement.slotLabel', { track: track.name, bar: bar + 1, pattern })
    },

    openCell(trackId: string, bar: number, patternId: string | null): void {
      this.closePicker()
      this.activeCell = { trackId, bar }
      this.$emit('open', trackId, patternId, bar)
    },

    toggleExpanded(): void {
      this.expanded = !this.expanded
      this.closePicker()
    },

    async appendBar(): Promise<void> {
      this.closePicker()
      this.$emit('appendBar')
      await nextTick()
      if (this.viewport) {
        this.viewport.scrollLeft = this.viewport.scrollWidth
      }
    },

    removeBar(bar: number): void {
      this.closePicker()
      if (this.activeCell && this.activeCell.bar >= bar) {
        this.activeCell = this.activeCell.bar === bar
          ? null
          : { ...this.activeCell, bar: this.activeCell.bar - 1 }
      }
      this.$emit('removeBar', bar)
      this.viewport?.focus({ preventScroll: true })
    },

    isPickerFor(trackId: string, bar: number): boolean {
      return this.picker?.trackId === trackId && this.picker.bar === bar
    },

    async openPicker(event: MouseEvent, trackId: string, bar: number): Promise<void> {
      const trigger = event.currentTarget
      if (!(trigger instanceof HTMLButtonElement)) {
        return
      }
      if (this.isPickerFor(trackId, bar)) {
        this.closePicker(true)
        return
      }
      const anchor =
        trigger.parentElement?.getBoundingClientRect() ?? trigger.getBoundingClientRect()
      const width = Math.min(PICKER_WIDTH, window.innerWidth - 2 * PICKER_GAP)
      const left = Math.max(
        PICKER_GAP,
        Math.min(anchor.left, window.innerWidth - width - PICKER_GAP),
      )
      const above = anchor.top - PICKER_GAP
      const below = window.innerHeight - anchor.bottom - PICKER_GAP
      const vertical =
        above > below
          ? { bottom: `${window.innerHeight - anchor.top + PICKER_GAP}px` }
          : { top: `${anchor.bottom + PICKER_GAP}px` }
      this.picker = {
        trackId,
        bar,
        trigger,
        style: {
          ...vertical,
          left: `${left}px`,
          width: `${width}px`,
          maxHeight: `${Math.max(0, Math.max(above, below) - PICKER_GAP)}px`,
        },
      }
      await nextTick()
      this.pickerElement?.focus({ preventScroll: true })
    },

    closePicker(restoreFocus = false): void {
      const trigger = this.picker?.trigger
      const cell = trigger?.parentElement
      this.picker = null
      if (restoreFocus && trigger) {
        void nextTick(() => {
          const target = trigger.isConnected ? trigger : cell?.querySelector('button')
          target?.focus({ preventScroll: true })
        })
      }
    },

    assignPattern(patternId: string | null): void {
      const cell = this.picker
      if (!cell) {
        return
      }
      this.closePicker(true)
      this.$emit('assign', cell.trackId, cell.bar, patternId)
      if (patternId !== null) {
        this.openCell(cell.trackId, cell.bar, patternId)
      }
    },

    createPattern(): void {
      const cell = this.picker
      if (cell) {
        this.closePicker(true)
        this.activeCell = { trackId: cell.trackId, bar: cell.bar }
        this.$emit('create', cell.trackId, cell.bar)
      }
    },

    dismissOnOutsideClick(event: PointerEvent): void {
      if (
        event.target instanceof Node &&
        !this.pickerElement?.contains(event.target) &&
        !this.picker?.trigger.contains(event.target)
      ) {
        this.closePicker()
      }
    },

    dismissOnFocusOut(event: FocusEvent): void {
      if (
        event.relatedTarget instanceof Node &&
        !this.pickerElement?.contains(event.relatedTarget)
      ) {
        this.closePicker()
      }
    },

    dismissOnResize(): void {
      this.closePicker()
    },
  },
})
</script>
