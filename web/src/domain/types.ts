import type { Instrument } from './instruments'

// все все типы из которых состоит проект

export interface NotePosition {
  readonly step: number
  readonly pitch: number
}

export interface Note extends NotePosition {
  readonly id: string
  readonly duration: number
}

export interface NoteOffset {
  readonly steps: number
  readonly pitches: number
}

export interface NoteArea {
  readonly fromStep: number
  readonly toStep: number
  readonly lowPitch: number
  readonly highPitch: number
}

export interface Pattern {
  readonly id: string
  readonly steps: number
  readonly notes: readonly Note[]
}

export interface TrackEffects {
  readonly delay: number
  readonly reverb: number
}

export interface Track {
  readonly id: string
  readonly name: string
  readonly instrument: Instrument
  readonly volume: number
  readonly muted: boolean
  readonly effects: TrackEffects
  readonly patterns: readonly Pattern[]
}

// дорожка композиции, массив айдишников
export type ArrangementLane = readonly (string | null)[]

//композиция, количество тактов и дорожки
export interface Arrangement {
  readonly barCount: number
  readonly lanes: Readonly<Record<string, ArrangementLane>>
}

export interface Project {
  readonly title: string
  readonly bpm: number
  readonly swing: number
  readonly tracks: readonly Track[]
  readonly arrangement: Arrangement
}
