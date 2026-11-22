import { STEPS_PER_BEAT } from '@/domain/constants'

const SECONDS_PER_MINUTE = 60
const SWING_TRIPLET_DELAY = 1 / 3
export const LOOKAHEAD_SECONDS = 0.1
export const TICK_INTERVAL_MS = 25
export const START_DELAY_SECONDS = 0.05

export interface Tempo {
  readonly bpm: number
  readonly swing: number
}

export interface ScheduledStep {
  readonly step: number
  readonly time: number
  readonly stepDuration: number
}

export interface SchedulerOptions {
  readonly now: () => number
  readonly tempo: () => Tempo
  readonly loopLength: () => number
  readonly onStep: (step: ScheduledStep) => void
}

export function stepDuration(bpm: number): number {
  return SECONDS_PER_MINUTE / bpm / STEPS_PER_BEAT
}

function swingDelay(step: number, swing: number, duration: number): number {
  const isOffbeat = step % 2 === 1
  return isOffbeat ? swing * SWING_TRIPLET_DELAY * duration : 0
}

export function createScheduler(options: SchedulerOptions) {
  let timer: ReturnType<typeof setInterval> | null = null
  let nextStep = 0
  let nextStepTime = 0

  function tick(): void {
    const horizon = options.now() + LOOKAHEAD_SECONDS
    while (nextStepTime < horizon) {
      const { bpm, swing } = options.tempo()
      const duration = stepDuration(bpm)
      const step = nextStep % options.loopLength()
      options.onStep({
        step,
        time: nextStepTime + swingDelay(step, swing, duration),
        stepDuration: duration,
      })
      nextStep = (step + 1) % options.loopLength()
      nextStepTime += duration
    }
  }

  function start(): void {
    if (timer !== null) {
      return
    }
    nextStepTime = options.now() + START_DELAY_SECONDS
    tick()
    timer = setInterval(tick, TICK_INTERVAL_MS)
  }

  function stop(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function reset(): void {
    nextStep = 0
  }

  return { start, stop, reset }
}
