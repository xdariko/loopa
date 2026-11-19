import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import type { AudioEngine } from '@/audio/engine'
import { START_DELAY_SECONDS, stepDuration } from '@/audio/scheduler'
import { DEFAULT_BPM } from '@/domain/constants'
import { useEditorStore } from '@/stores/editor'
import { usePlaybackStore } from '@/stores/playback'

const engine = vi.hoisted(() => ({
  currentTime: 0,
  audibleTime: 0,
  resume: vi.fn<AudioEngine['resume']>(() => Promise.resolve()),
  syncTracks: vi.fn<AudioEngine['syncTracks']>(),
  setDelayTime: vi.fn<AudioEngine['setDelayTime']>(),
  playNote: vi.fn<AudioEngine['playNote']>(),
  stopAll: vi.fn<AudioEngine['stopAll']>(),
}))

vi.mock('@/audio/engine', () => ({ getAudioEngine: () => engine }))

const C4 = 60

describe('playback store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    usePlaybackStore().pause()
    vi.useRealTimers()
  })

  it('plays the notes of the selected pattern through the selected track', async () => {
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 }, 2)
    const playback = usePlaybackStore()

    await playback.play()

    expect(engine.resume).toHaveBeenCalledOnce()
    expect(playback.isPlaying).toBe(true)
    expect(engine.playNote).toHaveBeenCalledExactlyOnceWith(editor.selectedTrack?.id, {
      pitch: C4,
      time: START_DELAY_SECONDS,
      duration: stepDuration(DEFAULT_BPM) * 2,
    })
  })

  it('reports the playing note and position at the audible time', async () => {
    const editor = useEditorStore()
    editor.addNote({ step: 0, pitch: C4 }, 2)
    const playback = usePlaybackStore()
    await playback.play()
    const noteId = editor.selectedPattern?.notes[0]?.id

    engine.audibleTime = START_DELAY_SECONDS + stepDuration(DEFAULT_BPM) / 2
    const snapshot = playback.sample()

    expect(snapshot.position).toBeCloseTo(0.5)
    expect([...snapshot.soundingNoteIds]).toEqual([noteId])

    playback.pause()
    expect(playback.sample().position).toBeNull()
    engine.audibleTime = 0
  })

  it('keeps the engine in sync with the project and silences it on pause', async () => {
    const editor = useEditorStore()
    const playback = usePlaybackStore()
    expect(engine.syncTracks).toHaveBeenCalledOnce()

    editor.addTrack({ kind: 'drums' })
    await nextTick()
    await playback.toggle()
    await playback.toggle()

    expect(engine.syncTracks).toHaveBeenCalledTimes(2)
    expect(playback.isPlaying).toBe(false)
    expect(engine.stopAll).toHaveBeenCalled()
  })
})
