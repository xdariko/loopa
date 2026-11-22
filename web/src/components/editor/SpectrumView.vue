<template>
  <canvas ref="canvas" class="spectrum" aria-hidden="true" data-testid="spectrum" />
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'

import {
  SPECTRUM_BIN_COUNT,
  SpectrumMeter,
  spectrumBands,
  type SpectrumSource,
} from '@/audio/spectrum'
import { useAnimationFrame } from '@/composables/useAnimationFrame'
import { useCanvasResolution } from '@/composables/useCanvasResolution'
import { useMediaQuery } from '@/composables/useMediaQuery'

const BAND_COUNT = 32
const BAR_GAP_RATIO = 0.3
const MIN_BAR_HEIGHT_CSS_PX = 2
const MIN_BAR_ALPHA = 0.35
const FALL_PER_SECOND = 1.2
const REDUCED_MOTION_FRAME_SECONDS = 0.1
const MS_PER_SECOND = 1000
const COLOR_PROPERTY = '--color-spectrum'

const props = defineProps<{
  playing: boolean
  source: SpectrumSource
}>()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const darkScheme = useMediaQuery('(prefers-color-scheme: dark)')

const bins = new Uint8Array(SPECTRUM_BIN_COUNT)
const silence = new Float32Array(BAND_COUNT)
const meter = new SpectrumMeter(BAND_COUNT)
const visible = shallowRef(false)
let lastFrameTime: number | null = null
let barColor = ''

function readTarget(): Float32Array {
  if (!props.playing) {
    return silence
  }
  props.source.read(bins)
  return spectrumBands(bins, BAND_COUNT)
}

function advance(time: number): void {
  const elapsedSeconds = lastFrameTime === null ? 0 : (time - lastFrameTime) / MS_PER_SECOND
  if (
    reducedMotion.value &&
    lastFrameTime !== null &&
    elapsedSeconds < REDUCED_MOTION_FRAME_SECONDS
  ) {
    return
  }
  lastFrameTime = time
  const target = readTarget()
  if (reducedMotion.value) {
    meter.jumpTo(target)
  } else {
    meter.fallTowards(target, elapsedSeconds, FALL_PER_SECOND)
  }
  draw()
  visible.value = !meter.isSilent()
  if (!props.playing && !visible.value) {
    lastFrameTime = null
  }
}

function readColor(): void {
  if (canvas.value) {
    barColor = getComputedStyle(canvas.value).getPropertyValue(COLOR_PROPERTY).trim()
  }
}

function draw(): void {
  const element = canvas.value
  const context = element?.getContext('2d')
  if (!element || !context) {
    return
  }
  const { width, height } = element
  const slot = width / BAND_COUNT
  const barWidth = slot * (1 - BAR_GAP_RATIO)
  const minBarHeight = MIN_BAR_HEIGHT_CSS_PX * window.devicePixelRatio
  context.clearRect(0, 0, width, height)
  context.fillStyle = barColor
  meter.levels.forEach((level, band) => {
    const barHeight = Math.max(level * height, minBarHeight)
    context.globalAlpha = MIN_BAR_ALPHA + (1 - MIN_BAR_ALPHA) * level
    context.fillRect(band * slot, height - barHeight, barWidth, barHeight)
  })
  context.globalAlpha = 1
}

useCanvasResolution(canvas, () => {
  readColor()
  draw()
})

watch(darkScheme, () => {
  readColor()
  draw()
})

useAnimationFrame(advance, () => props.playing || visible.value)
</script>
