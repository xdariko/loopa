import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import type { AudioEngine } from '@/audio/engine'
import { START_DELAY_SECONDS, stepDuration, TICK_INTERVAL_MS } from '@/audio/scheduler'
import { playbackNoteKey } from '@/audio/timeline'
import { DEFAULT_BPM, STEPS_PER_BAR } from '@/domain/constants'
import { useEditorStore } from '@/stores/editor'
import { usePlaybackStore } from '@/stores/playback'
import { useProjectStore } from '@/stores/project'

const engine = vi.hoisted(() => ({
  currentTime: 0,
  audibleTime: 0,
  resume: vi.fn<AudioEngine['resume']>(() => Promise.resolve()),
  syncTracks: vi.fn<AudioEngine['syncTracks']>(),
  setDelayTime: vi.fn<AudioEngine['setDelayTime']>(),
  playNote: vi.fn<AudioEngine['playNote']>((_, note) => ({
    endTime: note.time + note.duration,
    stop: () => {},
  })),
  stopAll: vi.fn<AudioEngine['stopAll']>(),
}))

vi.mock('@/audio/engine', () => ({ getAudioEngine: () => engine }))

const C4 = 60

describe('playback store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.clearAllMocks()
    engine.currentTime = 0
    engine.audibleTime = 0
  })

  afterEach(() => {
    usePlaybackStore().pause()
    vi.useRealTimers()
  })

  it('plays the notes of the selected pattern through the selected track', async () => {
    const editor = useEditorStore()
    editor.createSelectedTrackPattern()
    editor.addNote({ step: 0, pitch: C4 }, 2)
    const playback = usePlaybackStore()
    playback.setMode('pattern')

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
    expect(snapshot.bar).toBe(0)
    expect([...snapshot.soundingNoteIds]).toEqual([
      playbackNoteKey(editor.selectedTrack!.id, editor.selectedPattern!.id, noteId!),
    ])

    playback.pause()
    expect(playback.sample().position).toBeNull()
    engine.audibleTime = 0
  })

  it('plays concurrent tracks, respects empty bars and wraps the composition', async () => {
    const editor = useEditorStore()
    const project = useProjectStore()
    const [lead, bass, drums] = project.project.tracks
    editor.addNote({ step: 0, pitch: C4 })
    editor.selectTrack(bass!.id)
    editor.addNote({ step: 0, pitch: C4 - 12 })
    editor.createPatternInBar(bass!.id, 1)
    editor.addNote({ step: 0, pitch: C4 - 7 })
    project.setArrangementPattern(lead!.id, 1, null)
    editor.selectTrack(drums!.id)
    const playback = usePlaybackStore()

    await playback.play()
    expect(engine.playNote.mock.calls.map(([id, note]) => [id, note.pitch])).toEqual([
      [lead!.id, C4],
      [bass!.id, C4 - 12],
    ])

    const barDuration = stepDuration(DEFAULT_BPM) * STEPS_PER_BAR
    function advanceToBar(bar: number) {
      engine.currentTime = START_DELAY_SECONDS + barDuration * bar
      engine.audibleTime = engine.currentTime
      vi.advanceTimersByTime(TICK_INTERVAL_MS)
      return playback.sample()
    }

    engine.playNote.mockClear()
    expect(advanceToBar(1)).toMatchObject({ bar: 1, position: 0 })
    expect(engine.playNote.mock.calls.map(([id, note]) => [id, note.pitch])).toEqual([
      [bass!.id, C4 - 7],
    ])

    expect(advanceToBar(project.project.arrangement.barCount)).toMatchObject({
      bar: 0,
      position: 0,
    })
    expect(engine.playNote.mock.calls.slice(-2).map(([id]) => id)).toEqual([lead!.id, bass!.id])
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
