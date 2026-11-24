import * as v from 'valibot'

import {
  MAX_BPM,
  MAX_EFFECT_AMOUNT,
  MAX_SWING,
  MAX_TRACK_NAME_LENGTH,
  MAX_VOLUME,
  MIN_BPM,
  MIN_EFFECT_AMOUNT,
  MIN_SWING,
  MIN_VOLUME,
  PROJECT_FORMAT_VERSION,
} from './constants'
import { pitchRangeFor, SYNTH_PRESETS } from './instruments'
import { canPlaceNote } from './notes'
import type { Project, Track } from './types'

// скрипт для проверки формата проекта и сериализации/десериализации с помощью ВАЛИБОТА
// создаются схемы для проверки структуры проекта, треков, паттернов и нот, а также функции для сериализации и парсинга проекта

export interface ProjectDocument extends Project {
  readonly version: typeof PROJECT_FORMAT_VERSION
}

type ProjectIssues = [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]

export class ProjectFormatError extends Error {
  constructor(readonly issues: ProjectIssues) {
    super(v.summarize(issues))
    this.name = 'ProjectFormatError'
  }
}

function numberBetween(min: number, max: number) {
  return v.pipe(v.number(), v.minValue(min), v.maxValue(max))
}

const integer = v.pipe(v.number(), v.integer())
const positiveInteger = v.pipe(integer, v.minValue(1))

function hasUniqueIds(items: readonly { readonly id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length
}

// Проверяет ID, положение на сетке, высоту и пересечения нот одной высоты в паттерне.
function notesFitTrack(track: Track): boolean {
  const range = pitchRangeFor(track.instrument)
  return track.patterns.every(
    (pattern) =>
      hasUniqueIds(pattern.notes) &&
      pattern.notes.every((note) => canPlaceNote(pattern, note, range)),
  )
}

// Проверяет, что у каждого трека одна дорожка нужной длины со ссылками на свои паттерны.
function lanesMatchTracks(project: Project): boolean {
  const { barCount, lanes } = project.arrangement
  return (
    Object.keys(lanes).length === project.tracks.length &&
    project.tracks.every((track) => {
      const lane = lanes[track.id]
      const patternIds = new Set(track.patterns.map((pattern) => pattern.id))
      return (
        lane?.length === barCount &&
        lane.every((patternId) => patternId === null || patternIds.has(patternId))
      )
    })
  )
}

const NoteSchema = v.object({
  id: v.string(),
  step: integer,
  pitch: integer,
  duration: integer,
})

const PatternSchema = v.object({
  id: v.string(),
  steps: positiveInteger,
  notes: v.array(NoteSchema),
})

const InstrumentSchema = v.variant('kind', [
  v.object({ kind: v.literal('synth'), preset: v.picklist(SYNTH_PRESETS) }),
  v.object({ kind: v.literal('drums') }),
  v.object({ kind: v.literal('sample'), sampleId: v.nullable(v.string()) }),
])

const TrackSchema = v.pipe(
  v.object({
    id: v.string(),
    name: v.pipe(v.string(), v.minLength(1), v.maxLength(MAX_TRACK_NAME_LENGTH)),
    instrument: InstrumentSchema,
    volume: numberBetween(MIN_VOLUME, MAX_VOLUME),
    muted: v.boolean(),
    effects: v.object({
      delay: numberBetween(MIN_EFFECT_AMOUNT, MAX_EFFECT_AMOUNT),
      reverb: numberBetween(MIN_EFFECT_AMOUNT, MAX_EFFECT_AMOUNT),
    }),
    patterns: v.array(PatternSchema),
  }),
  v.check((track) => hasUniqueIds(track.patterns), 'Pattern ids must be unique within a track'),
  v.check(
    (track) => notesFitTrack(track),
    'Notes must be unique, fit the grid and pitch range, and not overlap',
  ),
)

const ProjectDocumentSchema = v.pipe(
  v.object({
    version: v.literal(PROJECT_FORMAT_VERSION),
    title: v.string(),
    bpm: v.pipe(integer, v.minValue(MIN_BPM), v.maxValue(MAX_BPM)),
    swing: numberBetween(MIN_SWING, MAX_SWING),
    tracks: v.array(TrackSchema),
    arrangement: v.object({
      barCount: positiveInteger,
      lanes: v.record(v.string(), v.array(v.nullable(v.string()))),
    }),
  }),
  v.check((document) => hasUniqueIds(document.tracks), 'Track ids must be unique'),
  v.check(
    (document) => lanesMatchTracks(document),
    'Every track needs one arrangement lane of barCount slots referencing its own patterns',
  ),
)

export function serializeProject(project: Project): ProjectDocument {
  return { version: PROJECT_FORMAT_VERSION, ...project }
}

export function parseProject(input: unknown): Project {
  const result = v.safeParse(ProjectDocumentSchema, input)
  if (!result.success) {
    throw new ProjectFormatError(result.issues)
  }
  const { title, bpm, swing, tracks, arrangement } = result.output
  return { title, bpm, swing, tracks, arrangement }
}
