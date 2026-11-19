import { clamp } from '@/domain/numbers'

import type { ScheduledStep } from './scheduler'

export interface TimedNote {
  readonly id: string
  readonly start: number
  readonly end: number
}

export interface TimelineSnapshot {
  readonly position: number | null
  readonly soundingNoteIds: ReadonlySet<string>
}

export const IDLE_SNAPSHOT: TimelineSnapshot = { position: null, soundingNoteIds: new Set() }

export class PlaybackTimeline {
  private steps: ScheduledStep[] = []
  private notes: TimedNote[] = []

  addStep(step: ScheduledStep): void {
    this.steps.push(step)
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
    this.notes = this.notes.filter((note) => note.end > time)
    const sounding = this.notes.filter((note) => note.start <= time).map((note) => note.id)
    return { position: this.positionAt(time), soundingNoteIds: new Set(sounding) }
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

  private positionAt(time: number): number | null {
    const current = this.steps[0]
    if (!current || current.time > time) {
      return null
    }
    return current.step + clamp((time - current.time) / current.stepDuration, 0, 1)
  }
}
