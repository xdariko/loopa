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
} from './constants'
import { clamp } from './numbers'
import type { ArrangementLane, Pattern, Project, Track, TrackEffects } from './types'

export type TrackMixControl = 'volume' | keyof TrackEffects

function replaceById<T extends { readonly id: string }>(
  items: readonly T[],
  id: string,
  update: (item: T) => T,
): readonly T[] {
  const item = items.find((current) => current.id === id)
  if (!item) {
    return items
  }
  const updated = update(item)
  return updated === item ? items : items.map((current) => (current === item ? updated : current))
}

export function findTrack(project: Project, trackId: string): Track | undefined {
  return project.tracks.find((track) => track.id === trackId)
}

const FIRST_NAME_SUFFIX = 2

export function nextTrackName(project: Project, baseName: string): string {
  const taken = new Set(project.tracks.map((track) => track.name))
  let name = baseName.slice(0, MAX_TRACK_NAME_LENGTH)
  for (let suffix = FIRST_NAME_SUFFIX; taken.has(name); suffix += 1) {
    const ending = ` ${suffix}`
    name = baseName.slice(0, MAX_TRACK_NAME_LENGTH - ending.length) + ending
  }
  return name
}

export function updateTrack(
  project: Project,
  trackId: string,
  update: (track: Track) => Track,
): Project {
  const tracks = replaceById(project.tracks, trackId, update)
  return tracks === project.tracks ? project : { ...project, tracks }
}

export function updatePattern(
  project: Project,
  trackId: string,
  patternId: string,
  update: (pattern: Pattern) => Pattern,
): Project {
  return updateTrack(project, trackId, (track) => {
    const patterns = replaceById(track.patterns, patternId, update)
    return patterns === track.patterns ? track : { ...track, patterns }
  })
}

export function addPattern(project: Project, trackId: string, pattern: Pattern): Project {
  return updateTrack(project, trackId, (track) => ({
    ...track,
    patterns: [...track.patterns, pattern],
  }))
}

export function appendArrangementBar(project: Project): Project {
  const { barCount, lanes } = project.arrangement
  return {
    ...project,
    arrangement: {
      barCount: barCount + 1,
      lanes: Object.fromEntries(
        Object.entries(lanes).map(([trackId, lane]) => [trackId, [...lane, null]]),
      ),
    },
  }
}

export function setArrangementPattern(
  project: Project,
  trackId: string,
  bar: number,
  patternId: string | null,
): Project {
  const track = findTrack(project, trackId)
  const lane = project.arrangement.lanes[trackId]
  if (!track || !lane || lane[bar] === undefined || lane[bar] === patternId) {
    return project
  }
  if (patternId !== null && !track.patterns.some((pattern) => pattern.id === patternId)) {
    return project
  }
  const nextLane = lane.slice()
  nextLane[bar] = patternId
  return {
    ...project,
    arrangement: {
      ...project.arrangement,
      lanes: { ...project.arrangement.lanes, [trackId]: nextLane },
    },
  }
}

export function addTrack(project: Project, track: Track, lane: ArrangementLane): Project {
  return {
    ...project,
    tracks: [...project.tracks, track],
    arrangement: {
      ...project.arrangement,
      lanes: { ...project.arrangement.lanes, [track.id]: lane },
    },
  }
}

export function removeTrack(project: Project, trackId: string): Project {
  if (!findTrack(project, trackId)) {
    return project
  }
  const lanes = { ...project.arrangement.lanes }
  delete lanes[trackId]
  return {
    ...project,
    tracks: project.tracks.filter((track) => track.id !== trackId),
    arrangement: { ...project.arrangement, lanes },
  }
}

export function renameTrack(project: Project, trackId: string, name: string): Project {
  const next = name.trim().slice(0, MAX_TRACK_NAME_LENGTH)
  if (!next) {
    return project
  }
  return updateTrack(project, trackId, (track) =>
    next === track.name ? track : { ...track, name: next },
  )
}

export function setTrackMuted(project: Project, trackId: string, muted: boolean): Project {
  return updateTrack(project, trackId, (track) =>
    track.muted === muted ? track : { ...track, muted },
  )
}

export function setTrackMixLevel(
  project: Project,
  trackId: string,
  control: TrackMixControl,
  level: number,
): Project {
  if (!Number.isFinite(level)) {
    return project
  }
  return updateTrack(project, trackId, (track) => {
    if (control === 'volume') {
      const volume = clamp(level, MIN_VOLUME, MAX_VOLUME)
      return track.volume === volume ? track : { ...track, volume }
    }
    const amount = clamp(level, MIN_EFFECT_AMOUNT, MAX_EFFECT_AMOUNT)
    return track.effects[control] === amount
      ? track
      : { ...track, effects: { ...track.effects, [control]: amount } }
  })
}

export function setBpm(project: Project, bpm: number): Project {
  const next = clamp(Math.round(bpm), MIN_BPM, MAX_BPM)
  return next === project.bpm ? project : { ...project, bpm: next }
}

export function setSwing(project: Project, swing: number): Project {
  if (!Number.isFinite(swing)) {
    return project
  }
  const next = clamp(swing, MIN_SWING, MAX_SWING)
  return next === project.swing ? project : { ...project, swing: next }
}

export function renameProject(project: Project, title: string): Project {
  return title === project.title ? project : { ...project, title }
}
