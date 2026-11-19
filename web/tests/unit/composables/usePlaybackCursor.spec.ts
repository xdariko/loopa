import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

import type { TimelineSnapshot } from '@/audio/timeline'
import { usePlaybackCursor } from '@/composables/usePlaybackCursor'

const FRAME_MS = 16

describe('usePlaybackCursor', () => {
  let scope = effectScope()

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    scope.stop()
    scope = effectScope()
    vi.useRealTimers()
  })

  function create(snapshot: () => TimelineSnapshot) {
    const active = ref(false)
    const sample = vi.fn<() => TimelineSnapshot>(snapshot)
    const cursor = scope.run(() => usePlaybackCursor({ active: () => active.value, sample }))
    if (!cursor) {
      throw new Error('composable was not created')
    }
    return { active, sample, cursor }
  }

  it('samples the timeline on every frame only while active', async () => {
    const { active, sample, cursor } = create(() => ({
      position: 2.5,
      soundingNoteIds: new Set(['a']),
    }))

    vi.advanceTimersByTime(FRAME_MS * 3)
    expect(sample).not.toHaveBeenCalled()

    active.value = true
    await nextTick()
    vi.advanceTimersByTime(FRAME_MS * 3)

    expect(sample).toHaveBeenCalled()
    expect(cursor.position.value).toBe(2.5)
    expect([...cursor.playingNoteIds.value]).toEqual(['a'])

    active.value = false
    await nextTick()
    const calls = sample.mock.calls.length
    vi.advanceTimersByTime(FRAME_MS * 3)

    expect(sample).toHaveBeenCalledTimes(calls)
    expect(cursor.position.value).toBeNull()
    expect(cursor.playingNoteIds.value.size).toBe(0)
  })

  it('keeps the same set while the sounding notes do not change', async () => {
    const { active, cursor } = create(() => ({
      position: 0,
      soundingNoteIds: new Set(['a']),
    }))

    active.value = true
    await nextTick()
    vi.advanceTimersByTime(FRAME_MS)
    const first = cursor.playingNoteIds.value
    vi.advanceTimersByTime(FRAME_MS * 3)

    expect(cursor.playingNoteIds.value).toBe(first)
  })
})
