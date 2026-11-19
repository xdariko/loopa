import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { getAudioEngine } from '@/audio/engine'
import { createScheduler, stepDuration, type ScheduledStep } from '@/audio/scheduler'
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

  const scheduler = createScheduler({
    now: () => engine.currentTime,
    tempo: () => ({ bpm: projectStore.project.bpm, swing: projectStore.project.swing }),
    loopLength: () => editor.selectedPattern?.steps ?? STEPS_PER_BAR,
    onStep: playStep,
  })

  function playStep({ step, time, stepDuration: duration }: ScheduledStep): void {
    const track = editor.selectedTrack
    const pattern = editor.selectedPattern
    if (!track || !pattern) {
      return
    }
    notesStartingAt(pattern, step).forEach((note) =>
      engine.playNote(track.id, { pitch: note.pitch, time, duration: note.duration * duration }),
    )
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
  }

  async function toggle(): Promise<void> {
    if (isPlaying.value) {
      pause()
    } else {
      await play()
    }
  }

  return { isPlaying, play, pause, toggle }
})
