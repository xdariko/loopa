import { describe, expect, it } from 'vitest'

import { IDLE_SNAPSHOT, PlaybackTimeline } from '@/audio/timeline'

const STEP = 0.125

function timelineWithSteps(count: number): PlaybackTimeline {
  const timeline = new PlaybackTimeline()
  Array.from({ length: count }, (_, step) =>
    timeline.addStep({ step, time: 1 + step * STEP, stepDuration: STEP }),
  )
  return timeline
}

describe('PlaybackTimeline', () => {
  it('has no position before the first step sounds', () => {
    const timeline = timelineWithSteps(2)

    expect(timeline.advanceTo(0.5).position).toBeNull()
  })

  it('moves the position smoothly through the current step', () => {
    const timeline = timelineWithSteps(4)

    expect(timeline.advanceTo(1).position).toBe(0)
    expect(timeline.advanceTo(1 + STEP * 1.5).position).toBe(1.5)
    expect(timeline.advanceTo(1 + STEP * 3.25).position).toBe(3.25)
  })

  it('stops at the end of the last known step', () => {
    const timeline = timelineWithSteps(1)

    expect(timeline.advanceTo(10).position).toBe(1)
  })

  it('reports the notes sounding at the given time', () => {
    const timeline = new PlaybackTimeline()
    timeline.addNote({ id: 'a', start: 1, end: 1.5 })
    timeline.addNote({ id: 'b', start: 1.25, end: 2 })

    expect([...timeline.advanceTo(0.9).soundingNoteIds]).toEqual([])
    expect([...timeline.advanceTo(1.3).soundingNoteIds]).toEqual(['a', 'b'])
    expect([...timeline.advanceTo(1.5).soundingNoteIds]).toEqual(['b'])
    expect([...timeline.advanceTo(2).soundingNoteIds]).toEqual([])
  })

  it('forgets everything on clear', () => {
    const timeline = timelineWithSteps(2)
    timeline.addNote({ id: 'a', start: 1, end: 2 })

    timeline.clear()

    expect(timeline.advanceTo(1.1)).toEqual(IDLE_SNAPSHOT)
  })
})
