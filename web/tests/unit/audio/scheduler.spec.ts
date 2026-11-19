import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createScheduler,
  LOOKAHEAD_SECONDS,
  START_DELAY_SECONDS,
  stepDuration,
  TICK_INTERVAL_MS,
  type ScheduledStep,
  type Tempo,
} from '@/audio/scheduler'

const BPM = 120
const STEP = stepDuration(BPM)
const LOOP = 4

describe('createScheduler', () => {
  let now = 0
  let tempo: Tempo = { bpm: BPM, swing: 0 }
  let steps: ScheduledStep[] = []

  beforeEach(() => {
    vi.useFakeTimers()
    now = 0
    tempo = { bpm: BPM, swing: 0 }
    steps = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function create() {
    return createScheduler({
      now: () => now,
      tempo: () => tempo,
      loopLength: () => LOOP,
      onStep: (step) => steps.push(step),
    })
  }

  function advance(seconds: number) {
    now += seconds
    vi.advanceTimersByTime(TICK_INTERVAL_MS)
  }

  it('schedules steps ahead of time and wraps around the loop', () => {
    const scheduler = create()

    scheduler.start()
    expect(steps[steps.length - 1]?.time).toBeLessThan(LOOKAHEAD_SECONDS)

    advance(STEP * LOOP)
    scheduler.stop()

    expect(steps.map(({ step }) => step).slice(0, LOOP + 1)).toEqual([0, 1, 2, 3, 0])
    expect(steps[1]?.time).toBeCloseTo(START_DELAY_SECONDS + STEP)
    expect(steps[1]?.stepDuration).toBeCloseTo(STEP)
  })

  it('picks up tempo changes on the next step and delays offbeats by swing', () => {
    const scheduler = create()
    tempo = { bpm: BPM, swing: 1 }

    scheduler.start()
    advance(STEP)
    expect(steps[1]).toMatchObject({ step: 1 })
    expect(steps[1]?.time).toBeCloseTo(START_DELAY_SECONDS + STEP + STEP / 3)

    tempo = { bpm: BPM * 2, swing: 0 }
    advance(STEP * 2)
    scheduler.stop()

    expect(steps[2]?.stepDuration).toBeCloseTo(STEP / 2)
    expect(steps[3]?.time).toBeCloseTo((steps[2]?.time ?? 0) + STEP / 2)
  })

  it('stays silent while paused and resumes from the next step', () => {
    const scheduler = create()

    scheduler.start()
    scheduler.stop()
    advance(1)
    expect(steps.map(({ step }) => step)).toEqual([0])

    scheduler.start()
    scheduler.stop()

    expect(steps[1]?.step).toBe(1)
    expect(steps[1]?.time).toBeCloseTo(now + START_DELAY_SECONDS)
  })
})
