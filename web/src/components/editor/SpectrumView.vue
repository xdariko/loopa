<template>
  <canvas ref="canvas" class="spectrum" aria-hidden="true" data-testid="spectrum" />
</template>

<script lang="ts">
import { defineComponent, type PropType, markRaw, toRef, useTemplateRef } from 'vue'
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

export default defineComponent({
  props: {
    playing: { type: Boolean, required: true },
    source: { type: Object as PropType<SpectrumSource>, required: true },
  },

  setup() {
    const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
    const darkScheme = useMediaQuery('(prefers-color-scheme: dark)')
    return { canvas, reducedMotion, darkScheme }
  },

  data() {
    return {
      bins: new Uint8Array(SPECTRUM_BIN_COUNT),
      silence: new Float32Array(BAND_COUNT),
      meter: markRaw(new SpectrumMeter(BAND_COUNT)),
      visible: false,
      lastFrameTime: null as number | null,
      barColor: '',
    }
  },

  watch: {
    darkScheme() {
      this.readColor()
      this.draw()
    },
  },

  created() {
    const canvas = toRef(() => this.canvas)
    useCanvasResolution(canvas, () => {
      this.readColor()
      this.draw()
    })
    useAnimationFrame(this.advance, () => this.playing || this.visible)
  },

  methods: {
    readTarget(): Float32Array {
      if (!this.playing) {
        return this.silence
      }
      this.source.read(this.bins)
      return spectrumBands(this.bins, BAND_COUNT)
    },

    advance(time: number): void {
      const elapsedSeconds = this.lastFrameTime === null ? 0 : (time - this.lastFrameTime) / MS_PER_SECOND
      if (this.reducedMotion && this.lastFrameTime !== null && elapsedSeconds < REDUCED_MOTION_FRAME_SECONDS) {
        return
      }
      this.lastFrameTime = time
      const target = this.readTarget()

      if (this.reducedMotion) {
        this.meter.jumpTo(target)
      } else {
        this.meter.fallTowards(target, elapsedSeconds, FALL_PER_SECOND)
      }

      this.draw()
      this.visible = !this.meter.isSilent()
      if (!this.playing && !this.visible) {
        this.lastFrameTime = null
      }
    },

    readColor(): void {
      if (this.canvas) {
        this.barColor = getComputedStyle(this.canvas).getPropertyValue(COLOR_PROPERTY).trim()
      }
    },

    draw(): void {
      const element = this.canvas
      const context = element?.getContext('2d')
      if (!element || !context) {
        return
      }
      const { width, height } = element
      const slot = width / BAND_COUNT
      const barWidth = slot * (1 - BAR_GAP_RATIO)
      const minBarHeight = MIN_BAR_HEIGHT_CSS_PX * window.devicePixelRatio

      context.clearRect(0, 0, width, height)
      context.fillStyle = this.barColor
      this.meter.levels.forEach((level, band) => {
        const barHeight = Math.max(level * height, minBarHeight)
        context.globalAlpha = MIN_BAR_ALPHA + (1 - MIN_BAR_ALPHA) * level
        context.fillRect(band * slot, height - barHeight, barWidth, barHeight)
      })
      context.globalAlpha = 1
    },
  },
})
</script>
