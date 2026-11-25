import { clamp } from '@/domain/numbers'

import type { ScheduledStep } from './scheduler'

// интервал подсветки одной ноты в секундах по часам AudioContext
export interface TimedNote {
  readonly id: string
  readonly start: number
  readonly end: number
}

export interface TimelineSnapshot {
  // позиция внутри такта или паттерна для плавного движения курсора
  readonly position: number | null
  // номер такта с нуля в режиме композиции
  readonly bar: number | null
  // ID дорожки -> ID паттерна который сейчас проигрывается на ней
  readonly patterns: ReadonlyMap<string, string>
  readonly soundingNoteIds: ReadonlySet<string>
}

// пустое состояние курсора и подсветки до начала воспроизведения
export const IDLE_SNAPSHOT: TimelineSnapshot = {
  position: null,
  bar: null,
  patterns: new Map(),
  soundingNoteIds: new Set(),
}

// к запланированному шагу добавляем контекст который нужен интерфейсу
interface TimelineStep extends ScheduledStep {
  readonly bar: number | null
  readonly patterns: ReadonlyMap<string, string>
}

export function playbackNoteKey(trackId: string, patternId: string, noteId: string): string {
  return JSON.stringify([trackId, patternId, noteId])
}

// храним расписание для интерфейса. стор запрашивает снимок по времени слышимого звука
export class PlaybackTimeline {
  private steps: TimelineStep[] = []
  private notes: TimedNote[] = []

  addStep(step: ScheduledStep, bar: number | null = null, patterns = IDLE_SNAPSHOT.patterns): void {
    // шаги добавляются заранее в порядке воспроизведения
    this.steps.push({ ...step, bar, patterns })
  }

  addNote(note: TimedNote): void {
    this.notes.push(note)
  }

  clear(): void {
    this.steps = []
    this.notes = []
  }

  advanceTo(time: number): TimelineSnapshot {
    this.forgetPassedSteps(time)
    // убираем закончившиеся ноты. из оставшихся подсвечиваем те что уже начались
    this.notes = this.notes.filter((note) => note.end > time)
    const current = this.startsBy(0, time) ? this.steps[0] : undefined
    const sounding = this.notes.filter((note) => note.start <= time).map((note) => note.id)
    return {
      position: current ? current.step + clamp((time - current.time) / current.stepDuration, 0, 1) : null,
      bar: current?.bar ?? null,
      patterns: current?.patterns ?? IDLE_SNAPSHOT.patterns,
      soundingNoteIds: new Set(sounding),
    }
  }

  private forgetPassedSteps(time: number): void {
    let current = 0
    while (this.startsBy(current + 1, time)) {
      current += 1
    }
    this.steps = this.steps.slice(current)
  }

  private startsBy(index: number, time: number): boolean {
    const step = this.steps[index]
    return step !== undefined && step.time <= time
  }
}
