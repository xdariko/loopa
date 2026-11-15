import { MAX_BPM, MAX_SWING, MIN_BPM, MIN_SWING } from './constants'
import type { ArrangementLane, Pattern, Project, Track } from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

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

export function setBpm(project: Project, bpm: number): Project {
  const next = clamp(Math.round(bpm), MIN_BPM, MAX_BPM)
  return next === project.bpm ? project : { ...project, bpm: next }
}

export function setSwing(project: Project, swing: number): Project {
  const next = clamp(swing, MIN_SWING, MAX_SWING)
  return next === project.swing ? project : { ...project, swing: next }
}

export function renameProject(project: Project, title: string): Project {
  return title === project.title ? project : { ...project, title }
}
