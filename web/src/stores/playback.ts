import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { getAudioEngine } from '@/audio/engine'
import { createScheduler, stepDuration, type ScheduledStep } from '@/audio/scheduler'
import type { SpectrumSource } from '@/audio/spectrum'
import { PlaybackTimeline, type TimelineSnapshot } from '@/audio/timeline'
import { STEPS_PER_BAR } from '@/domain/constants'
import { notesStartingAt } from '@/domain/notes'

import { useEditorStore } from './editor'
import { useProjectStore } from './project'

const DELAY_STEPS = 3

export const usePlaybackStore = defineStore('playback', () => {
  const projectStore = useProjectStore()
  const editor = useEditorStore()
  const engine = getAudioEngine()

  const isPlaying = ref(false)
  const timeline = new PlaybackTimeline()

  const scheduler = createScheduler({
    now: () => engine.currentTime,
    tempo: () => ({ bpm: projectStore.project.bpm, swing: projectStore.project.swing }),
    loopLength: () => editor.selectedPattern?.steps ?? STEPS_PER_BAR,
    onStep: playStep,
  })

  function playStep(scheduled: ScheduledStep): void {
    timeline.addStep(scheduled)
    const track = editor.selectedTrack
    const pattern = editor.selectedPattern
    if (!track || !pattern) {
      return
    }
    const { step, time, stepDuration: duration } = scheduled
    notesStartingAt(pattern, step).forEach((note) => {
      const noteDuration = note.duration * duration
      engine.playNote(track.id, { pitch: note.pitch, time, duration: noteDuration })
      timeline.addNote({ id: note.id, start: time, end: time + noteDuration })
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
    isPlaying.value = true
    await engine.resume()
    if (isPlaying.value) {
      scheduler.start()
    }
  }

  function pause(): void {
    isPlaying.value = false
    scheduler.stop()
    engine.stopAll()
    timeline.clear()
  }

  async function toggle(): Promise<void> {
    if (isPlaying.value) {
      pause()
    } else {
      await play()
    }
  }

  return { isPlaying, play, pause, toggle, sample, spectrum }
})
