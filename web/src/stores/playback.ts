import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { getAudioEngine } from '@/audio/engine'
import { createScheduler, stepDuration, type ScheduledStep } from '@/audio/scheduler'
import type { SpectrumSource } from '@/audio/spectrum'
import { playbackNoteKey, PlaybackTimeline, type TimelineSnapshot } from '@/audio/timeline'
import { STEPS_PER_BAR } from '@/domain/constants'
import { notesStartingAt } from '@/domain/notes'
import type { Pattern } from '@/domain/types'

import { useEditorStore } from './editor'
import { useProjectStore } from './project'

const DELAY_STEPS = 3
export type PlaybackMode = 'composition' | 'pattern'

export const usePlaybackStore = defineStore('playback', () => {
  const projectStore = useProjectStore()
  const editor = useEditorStore()
  const engine = getAudioEngine()

  const isPlaying = ref(false)
  const mode = ref<PlaybackMode>('composition')
  const timeline = new PlaybackTimeline()
  let playRequest = 0

  const scheduler = createScheduler({
    now: () => engine.currentTime,
    tempo: () => ({ bpm: projectStore.project.bpm, swing: projectStore.project.swing }),
    loopLength: () =>
      mode.value === 'composition'
        ? projectStore.project.arrangement.barCount * STEPS_PER_BAR
        : (editor.selectedPattern?.steps ?? STEPS_PER_BAR),
    onStep: playStep,
  })

  function playStep(scheduled: ScheduledStep): void {
    const playingPatterns = new Map<string, string>()
    if (mode.value === 'pattern') {
      const track = editor.selectedTrack
      const pattern = editor.selectedPattern
      if (track && pattern) {
        playingPatterns.set(track.id, pattern.id)
        if (!track.muted && track.volume > 0) {
          playPatternStep(track.id, pattern, scheduled)
        }
      }
      timeline.addStep(scheduled, null, playingPatterns)
    } else {
      const bar = Math.floor(scheduled.step / STEPS_PER_BAR)
      const step = { ...scheduled, step: scheduled.step % STEPS_PER_BAR }
      const { tracks, arrangement } = projectStore.project
      for (const track of tracks) {
        const patternId = arrangement.lanes[track.id]?.[bar]
        const pattern = track.patterns.find((pattern) => pattern.id === patternId)
        if (pattern) {
          playingPatterns.set(track.id, pattern.id)
          if (!track.muted && track.volume > 0) {
            playPatternStep(track.id, pattern, step, STEPS_PER_BAR - step.step)
          }
        }
      }
      timeline.addStep(step, bar, playingPatterns)
    }
  }

  function playPatternStep(
    trackId: string,
    pattern: Pattern,
    scheduled: ScheduledStep,
    stepsRemaining = pattern.steps - scheduled.step,
  ): void {
    const { step, time, stepDuration: duration } = scheduled
    notesStartingAt(pattern, step).forEach((note) => {
      const noteDuration = Math.min(note.duration, stepsRemaining) * duration
      engine.playNote(trackId, { pitch: note.pitch, time, duration: noteDuration })
      timeline.addNote({
        id: playbackNoteKey(trackId, pattern.id, note.id),
        start: time,
        end: time + noteDuration,
      })
    })
  }

  const spectrum: SpectrumSource = { read: (target) => engine.readSpectrum(target) }

  function sample(): TimelineSnapshot {
    return timeline.advanceTo(engine.audibleTime)
  }

  watch(
    () => projectStore.project.tracks,
    (tracks) => engine.syncTracks(tracks),
    { immediate: true },
  )

  watch(
    () => projectStore.project.bpm,
    (bpm) => engine.setDelayTime(stepDuration(bpm) * DELAY_STEPS),
    { immediate: true },
  )

  async function play(): Promise<void> {
    if (isPlaying.value) {
      return
    }
    const request = ++playRequest
    isPlaying.value = true
    try {
      await engine.resume()
      if (request === playRequest) {
        scheduler.start()
      }
    } catch (error) {
      if (request === playRequest) {
        pause()
      }
      throw error
    }
  }

  function pause(): void {
    playRequest += 1
    isPlaying.value = false
    scheduler.stop()
    engine.stopAll()
    timeline.clear()
  }

  function setMode(nextMode: PlaybackMode): void {
    if (!isPlaying.value && mode.value !== nextMode) {
      mode.value = nextMode
      scheduler.reset()
    }
  }

  async function toggle(): Promise<void> {
    if (isPlaying.value) {
      pause()
    } else {
      await play()
    }
  }

  return { isPlaying, mode, setMode, play, pause, toggle, sample, spectrum }
})
