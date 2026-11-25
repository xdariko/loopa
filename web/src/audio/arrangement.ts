import type { Arrangement, Note, Track } from '@/domain/types'

import type { ScheduledStep } from './scheduler'
import type { NoteEvent } from './types'

// для поиска паттерна в дорожке по номеру бара
export function patternInBar(track: Track, arrangement: Arrangement, bar: number) {
  const patternId = arrangement.lanes[track.id]?.[bar]
  return track.patterns.find((pattern) => pattern.id === patternId)
}

// переводит ноту в аудиовремя
export function toNoteEvent(note: Note, step: ScheduledStep, stepsRemaining: number): NoteEvent {
  return {
    pitch: note.pitch,
    time: step.time,
    duration: Math.min(note.duration, stepsRemaining) * step.stepDuration,
  }
}
