import { defineStore } from 'pinia'
import { markRaw, onScopeDispose, shallowRef, watch } from 'vue'

import { patternInBar, toNoteEvent } from '@/audio/arrangement'
import { getAudioEngine } from '@/audio/engine'
import { createScheduler, DELAY_STEPS, stepDuration, type ScheduledStep } from '@/audio/scheduler'
import type { SpectrumSource } from '@/audio/spectrum'
import { playbackNoteKey, PlaybackTimeline, type TimelineSnapshot } from '@/audio/timeline'
import { STEPS_PER_BAR } from '@/domain/constants'
import { notesStartingAt } from '@/domain/notes'
import type { Pattern, Project } from '@/domain/types'

import { useEditorStore } from './editor'
import { useProjectStore } from './project'

// скрипт для управления воспроизведением проекта и паттернов, синхронизации с аудио движком и отслеживания состояния воспроизведения

export type PlaybackMode = 'composition' | 'pattern'

export const usePlaybackStore = defineStore('playback', {
  state() {
    const preview = shallowRef<Project | null>(null) // проект для предпрослушивания
    const scheduler = shallowRef<ReturnType<typeof createScheduler> | null>(null) // планировщик шагов
    const projectStore = useProjectStore()
    const engine = getAudioEngine()
    const activeProject = () => preview.value ?? projectStore.project

    // следим за списком треков
    watch(
      () => activeProject().tracks,
      (tracks) => engine.syncTracks(tracks),
      { immediate: true },
    )

    // следим за темпом и задержкой
    watch(
      () => activeProject().bpm,
      (bpm) => engine.setDelayTime(stepDuration(bpm) * DELAY_STEPS),
      { immediate: true },
    )

    // при уничтожении стора останавливаем планировщик
    onScopeDispose(() => scheduler.value?.stop())

    return {
      isPlaying: false,
      mode: 'composition' as PlaybackMode,
      preview,
      scheduler,
      timeline: markRaw(new PlaybackTimeline()),
      playRequest: 0,
    }
  },

  getters: {
    engine() {
      return getAudioEngine()
    },

    activeProject(): Project {
      return this.preview ?? useProjectStore().project
    },

    activeMode(): PlaybackMode {
      return this.preview ? 'composition' : this.mode
    },

    spectrum(): SpectrumSource {
      return { read: (target) => this.engine.readSpectrum(target) }
    },
  },

  actions: {
    // возвращает планировщик или создаёт и сохраняет его при первом вызове
    getScheduler(): ReturnType<typeof createScheduler> {
      if (this.scheduler) {
        return this.scheduler
      }
      const editor = useEditorStore()
      this.scheduler = createScheduler({
        now: () => this.engine.currentTime,
        tempo: () => ({ bpm: this.activeProject.bpm, swing: this.activeProject.swing }),
        loopLength: () =>
          this.activeMode === 'composition'
            ? this.activeProject.arrangement.barCount * STEPS_PER_BAR
            : (editor.selectedPattern?.steps ?? STEPS_PER_BAR),
        onStep: this.playStep,
      })
      return this.scheduler
    },

    // выбирает паттерны для текущего шага и отмечает шаг для подсветки
    playStep(scheduled: ScheduledStep): void {
      const playingPatterns = new Map<string, string>()
      if (this.activeMode === 'pattern') {
        const { selectedTrack: track, selectedPattern: pattern } = useEditorStore()
        if (track && pattern) {
          playingPatterns.set(track.id, pattern.id)
          if (!track.muted && track.volume > 0) {
            this.playPatternStep(track.id, pattern, scheduled)
          }
        }
        this.timeline.addStep(scheduled, null, playingPatterns)
      } else {
        const bar = Math.floor(scheduled.step / STEPS_PER_BAR)
        const step = { ...scheduled, step: scheduled.step % STEPS_PER_BAR }
        const { tracks, arrangement } = this.activeProject
        for (const track of tracks) {
          const pattern = patternInBar(track, arrangement, bar)
          if (pattern) {
            playingPatterns.set(track.id, pattern.id)
            if (!track.muted && track.volume > 0) {
              this.playPatternStep(track.id, pattern, step, STEPS_PER_BAR - step.step)
            }
          }
        }
        this.timeline.addStep(step, bar, playingPatterns)
      }
    },

    // запускает ноты, которые начинаются на этом шаге, и записывает время их звучания
    playPatternStep(trackId: string, pattern: Pattern, scheduled: ScheduledStep, stepsRemaining = pattern.steps - scheduled.step): void {
      const { step, time } = scheduled
      notesStartingAt(pattern, step).forEach((note) => {
        const event = toNoteEvent(note, scheduled, stepsRemaining)
        const voice = this.engine.playNote(trackId, event)
        if (voice.endTime > time) {
          this.timeline.addNote({
            id: playbackNoteKey(trackId, pattern.id, note.id),
            start: time,
            end: Math.min(time + event.duration, voice.endTime),
          })
        }
      })
    },

    // возвращает позицию и звучащие ноты по слышимому времени для подсветки
    sample(): TimelineSnapshot {
      return this.timeline.advanceTo(this.engine.audibleTime)
    },

    // включает аудиодвижок и запускает планировщик
    async play(): Promise<void> {
      if (this.isPlaying) {
        return
      }
      const request = ++this.playRequest
      this.isPlaying = true
      try {
        await this.engine.resume()
        if (request === this.playRequest) {
          this.getScheduler().start()
        }
      } catch (error) {
        if (request === this.playRequest) {
          this.pause()
        }
        throw error
      }
    },

    pause(): void {
      this.playRequest += 1
      this.isPlaying = false
      this.scheduler?.stop()
      this.engine.stopAll()
      this.timeline.clear()
    },

    setMode(nextMode: PlaybackMode): void {
      if (!this.isPlaying && this.mode !== nextMode) {
        this.mode = nextMode
        this.scheduler?.reset()
      }
    },

    setPreview(project: Project | null): void {
      if (this.preview !== project) {
        this.reset()
        this.preview = project
      }
    },

    reset(): void {
      this.pause()
      this.scheduler?.reset()
    },

    async toggle(): Promise<void> {
      if (this.isPlaying) {
        this.pause()
      } else {
        await this.play()
      }
    },
  },
})
