import { MAX_BPM, MAX_SWING, MAX_TRACK_NAME_LENGTH, MIN_BPM, MIN_SWING } from './constants'
import { clamp } from './numbers'
import type { ArrangementLane, Pattern, Project, Track } from './types'

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
  let name = baseName
  for (let suffix = FIRST_NAME_SUFFIX; taken.has(name); suffix += 1) {
    name = `${baseName} ${suffix}`
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
