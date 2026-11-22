<template>
  <section
    class="arrangement"
    :class="{ 'arrangement--expanded': expanded }"
    aria-label="Композиция"
  >
    <div class="arrangement__header">
      <h2 class="arrangement__heading">Композиция</h2>
      <button
        v-if="rows.length"
        type="button"
        class="arrangement__toggle"
        :aria-expanded="expanded"
        @keydown.space.stop
        @click="toggleExpanded"
      >
        {{ expanded ? 'Свернуть' : 'Развернуть' }}
      </button>
    </div>
    <div
      v-if="rows.length"
      class="arrangement__viewport"
      role="region"
      aria-label="Таймлайн композиции"
      tabindex="0"
      @scroll="closePicker()"
    >
      <div class="arrangement__map">
        <div class="arrangement__ruler arrangement__row" aria-hidden="true">
          <span class="arrangement__track"></span>
          <div class="arrangement__bars">
            <span v-for="bar in arrangement.barCount" :key="bar" class="arrangement__tick">{{
              bar
            }}</span>
          </div>
        </div>
        <div v-for="row in rows" :key="row.track.id" class="arrangement__row">
          <span class="arrangement__track" :title="row.track.name">{{ row.track.name }}</span>
          <div class="arrangement__bars">
            <div
              v-for="({ pattern, number }, bar) in row.slots"
              :key="bar"
              class="arrangement__cell"
            >
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
                :aria-label="`Действия: ${slotLabel(row.track, bar, number)}`"
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
                :aria-label="`Добавить паттерн: ${slotLabel(row.track, bar, null)}`"
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
        <div
          v-if="playbackBar !== null"
          class="arrangement__playback"
          :style="{ '--arrangement-playback-bar': playbackBar }"
        >
          <PatternPlayhead :steps="STEPS_PER_BAR" />
        </div>
      </div>
    </div>
    <p v-else class="arrangement__empty">Добавьте дорожку, чтобы собрать композицию</p>

    <Teleport to="body">
      <div
        v-if="picker && pickerTrack"
        ref="pickerElement"
        class="arrangement__picker"
        role="dialog"
        :aria-label="pickerLabel"
        :style="picker.style"
        tabindex="-1"
        @focusout="dismissOnFocusOut"
        @keydown.stop
        @keydown.esc.prevent="closePicker(true)"
      >
        <p class="arrangement__picker-title">{{ pickerLabel }}</p>
        <div v-if="pickerTrack.patterns.length" class="arrangement__choices">
          <button
            v-for="(pattern, index) in pickerTrack.patterns"
            :key="pattern.id"
            type="button"
            class="arrangement__choice"
            :aria-pressed="pickerPatternId === pattern.id"
            @click="assignPattern(pattern.id)"
          >
            <span class="arrangement__thumbnail">
              <PatternPreview :pattern="pattern" :range="pitchRangeFor(pickerTrack.instrument)" />
            </span>
            Паттерн {{ index + 1 }}
          </button>
        </div>
        <div class="arrangement__picker-actions">
          <button type="button" class="arrangement__picker-action" @click="createPattern">
            + Новый паттерн
          </button>
          <button
            v-if="pickerPatternId !== null"
            type="button"
            class="arrangement__picker-action"
            @click="assignPattern(null)"
          >
            Очистить такт
          </button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useTemplateRef,
  type CSSProperties,
} from 'vue'

import PatternPlayhead from '@/components/editor/PatternPlayhead.vue'
import PatternPreview from '@/components/editor/PatternPreview.vue'
import { injectPlaybackCursor } from '@/composables/usePlaybackCursor'
import { STEPS_PER_BAR } from '@/domain/constants'
import { pitchRangeFor } from '@/domain/instruments'
import type { Arrangement, Track } from '@/domain/types'

const props = defineProps<{
  tracks: readonly Track[]
  arrangement: Arrangement
  selectedTrackId: string | null
}>()

const emit = defineEmits<{
  open: [trackId: string, patternId: string | null, bar: number]
  assign: [trackId: string, bar: number, patternId: string | null]
  create: [trackId: string, bar: number]
}>()

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

const expanded = ref(false)
const { bar: playbackBar, patterns: playingPatterns } = injectPlaybackCursor()
const activeCell = shallowRef<Cell | null>(null)
const picker = shallowRef<Picker | null>(null)
const pickerElement = useTemplateRef<HTMLElement>('pickerElement')
const pickerTrack = computed(() => props.tracks.find((track) => track.id === picker.value?.trackId))
const pickerLabel = computed(
  () => `${pickerTrack.value?.name} · Такт ${(picker.value?.bar ?? 0) + 1}`,
)
const pickerPatternId = computed(() =>
  picker.value ? (props.arrangement.lanes[picker.value.trackId]?.[picker.value.bar] ?? null) : null,
)

const rows = computed(() =>
  props.tracks.map((track) => {
    const patterns = new Map(
      track.patterns.map((pattern, index) => [pattern.id, { pattern, number: index + 1 }]),
    )
    const lane = props.arrangement.lanes[track.id]
    const slots = Array.from({ length: props.arrangement.barCount }, (_, bar) => {
      const id = lane?.[bar]
      const entry = id == null ? undefined : patterns.get(id)
      return entry ?? { pattern: null, number: null }
    })
    return { track, range: pitchRangeFor(track.instrument), slots }
  }),
)

const selectedCell = computed(() => {
  const cell = activeCell.value
  if (!cell || cell.trackId !== props.selectedTrackId) {
    return null
  }
  const track = props.tracks.find((track) => track.id === cell.trackId)
  const patternId = props.arrangement.lanes[cell.trackId]?.[cell.bar]
  if (!track || patternId === undefined) {
    return null
  }
  return { track, bar: cell.bar, patternId }
})

function slotLabel(track: Track, bar: number, number: number | null): string {
  return `${track.name} · Такт ${bar + 1} · ${number === null ? 'Пусто' : `Паттерн ${number}`}`
}

function openCell(trackId: string, bar: number, patternId: string | null): void {
  closePicker()
  activeCell.value = { trackId, bar }
  emit('open', trackId, patternId, bar)
}

function toggleExpanded(): void {
  expanded.value = !expanded.value
  closePicker()
}

function isPickerFor(trackId: string, bar: number): boolean {
  return picker.value?.trackId === trackId && picker.value.bar === bar
}

async function openPicker(event: MouseEvent, trackId: string, bar: number): Promise<void> {
  const trigger = event.currentTarget
  if (!(trigger instanceof HTMLButtonElement)) {
    return
  }
  if (isPickerFor(trackId, bar)) {
    closePicker(true)
    return
  }
  const anchor = trigger.parentElement?.getBoundingClientRect() ?? trigger.getBoundingClientRect()
  const width = Math.min(PICKER_WIDTH, window.innerWidth - 2 * PICKER_GAP)
  const left = Math.max(PICKER_GAP, Math.min(anchor.left, window.innerWidth - width - PICKER_GAP))
  const above = anchor.top - PICKER_GAP
  const below = window.innerHeight - anchor.bottom - PICKER_GAP
  const vertical =
    above > below
      ? { bottom: `${window.innerHeight - anchor.top + PICKER_GAP}px` }
      : { top: `${anchor.bottom + PICKER_GAP}px` }
  picker.value = {
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
  pickerElement.value?.focus({ preventScroll: true })
}

function closePicker(restoreFocus = false): void {
  const trigger = picker.value?.trigger
  const cell = trigger?.parentElement
  picker.value = null
  if (restoreFocus && trigger) {
    void nextTick(() => {
      const target = trigger.isConnected ? trigger : cell?.querySelector('button')
      target?.focus({ preventScroll: true })
    })
  }
}

function assignPattern(patternId: string | null): void {
  const cell = picker.value
  if (!cell) {
    return
  }
  closePicker(true)
  emit('assign', cell.trackId, cell.bar, patternId)
  if (patternId !== null) {
    openCell(cell.trackId, cell.bar, patternId)
  }
}

function createPattern(): void {
  const cell = picker.value
  if (cell) {
    closePicker(true)
    activeCell.value = { trackId: cell.trackId, bar: cell.bar }
    emit('create', cell.trackId, cell.bar)
  }
}

function dismissOnOutsideClick(event: PointerEvent): void {
  if (
    event.target instanceof Node &&
    !pickerElement.value?.contains(event.target) &&
    !picker.value?.trigger.contains(event.target)
  ) {
    closePicker()
  }
}

function dismissOnFocusOut(event: FocusEvent): void {
  if (event.relatedTarget instanceof Node && !pickerElement.value?.contains(event.relatedTarget)) {
    closePicker()
  }
}

function dismissOnResize(): void {
  closePicker()
}

onMounted(() => {
  window.addEventListener('pointerdown', dismissOnOutsideClick)
  window.addEventListener('resize', dismissOnResize)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', dismissOnOutsideClick)
  window.removeEventListener('resize', dismissOnResize)
})
</script>
