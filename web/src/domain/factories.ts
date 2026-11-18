import {
  DEFAULT_BAR_COUNT,
  DEFAULT_BPM,
  DEFAULT_PROJECT_TITLE,
  DEFAULT_SWING,
  DEFAULT_TRACK_VOLUME,
  MIN_EFFECT_AMOUNT,
  MIN_NOTE_DURATION,
  STEPS_PER_BAR,
} from './constants'
import { instrumentLabel, type Instrument } from './instruments'
import type { ArrangementLane, Note, NotePosition, Pattern, Project, Track } from './types'

const STARTER_INSTRUMENTS: readonly Instrument[] = [
  { kind: 'synth', preset: 'lead' },
  { kind: 'synth', preset: 'bass' },
  { kind: 'drums' },
]

export function createNote(position: NotePosition, duration = MIN_NOTE_DURATION): Note {
  return { id: crypto.randomUUID(), step: position.step, pitch: position.pitch, duration }
}

export function createPattern(): Pattern {
  return { id: crypto.randomUUID(), steps: STEPS_PER_BAR, notes: [] }
}

export function createTrack(instrument: Instrument, name = instrumentLabel(instrument)): Track {
  return {
    id: crypto.randomUUID(),
    name,
    instrument,
    volume: DEFAULT_TRACK_VOLUME,
    muted: false,
    effects: { delay: MIN_EFFECT_AMOUNT, reverb: MIN_EFFECT_AMOUNT },
    patterns: [createPattern()],
  }
}

export function createTrackLane(track: Track, barCount: number): ArrangementLane {
  const patternId = track.patterns[0]?.id ?? null
  return Array.from({ length: barCount }, () => patternId)
}

export function createProject(): Project {
  const tracks = STARTER_INSTRUMENTS.map((instrument) => createTrack(instrument))
  return {
    title: DEFAULT_PROJECT_TITLE,
    bpm: DEFAULT_BPM,
    swing: DEFAULT_SWING,
    tracks,
    arrangement: {
      barCount: DEFAULT_BAR_COUNT,
      lanes: Object.fromEntries(
        tracks.map((track) => [track.id, createTrackLane(track, DEFAULT_BAR_COUNT)]),
      ),
    },
  }
}
