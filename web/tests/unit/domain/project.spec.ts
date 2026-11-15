import { describe, expect, it } from 'vitest'

import { DEFAULT_BAR_COUNT, MAX_BPM, MAX_SWING, MIN_BPM } from '@/domain/constants'
import { createProject, createTrack, createTrackLane } from '@/domain/factories'
import {
  addTrack,
  removeTrack,
  renameProject,
  setBpm,
  setSwing,
  updatePattern,
} from '@/domain/project'
import type { Project, Track } from '@/domain/types'

function firstTrack(project: Project): Track {
  const track = project.tracks[0]
  if (!track) {
    throw new Error('project has no tracks')
  }
  return track
}

describe('createProject', () => {
  it('starts with lead, bass and drums, each playing its first pattern in every bar', () => {
    const project = createProject()

    expect(project.tracks.map((track) => track.name)).toEqual(['Lead', 'Bass', 'Drums'])
    project.tracks.forEach((track) => {
      const lane = project.arrangement.lanes[track.id]
      expect(lane).toHaveLength(DEFAULT_BAR_COUNT)
      expect(new Set(lane)).toEqual(new Set([track.patterns[0]?.id]))
    })
  })
})

describe('updatePattern', () => {
  it('replaces only the changed branch of the project', () => {
    const project = createProject()
    const track = firstTrack(project)
    const pattern = track.patterns[0]
    if (!pattern) {
      throw new Error('track has no patterns')
    }

    const updated = updatePattern(project, track.id, pattern.id, (current) => ({
      ...current,
      steps: 32,
    }))

    expect(updated.tracks[0]?.patterns[0]?.steps).toBe(32)
    expect(updated.tracks[1]).toBe(project.tracks[1])
    expect(project.tracks[0]?.patterns[0]?.steps).toBe(16)
  })

  it('returns the same project when nothing changes or the target is missing', () => {
    const project = createProject()
    const track = firstTrack(project)
    const patternId = track.patterns[0]?.id ?? ''

    expect(updatePattern(project, track.id, patternId, (pattern) => pattern)).toBe(project)
    expect(updatePattern(project, 'missing', patternId, (pattern) => ({ ...pattern }))).toBe(
      project,
    )
  })
})

describe('tracks', () => {
  it('adds a track with its arrangement lane', () => {
    const project = createProject()
    const track = createTrack({ kind: 'synth', preset: 'pad' })
    const lane = createTrackLane(track, project.arrangement.barCount)

    const updated = addTrack(project, track, lane)

    expect(updated.tracks[updated.tracks.length - 1]).toBe(track)
    expect(updated.arrangement.lanes[track.id]).toBe(lane)
  })

  it('removes a track together with its lane', () => {
    const project = createProject()
    const track = firstTrack(project)

    const updated = removeTrack(project, track.id)

    expect(updated.tracks).not.toContain(track)
    expect(updated.arrangement.lanes[track.id]).toBeUndefined()
    expect(removeTrack(project, 'missing')).toBe(project)
  })
})

describe('project settings', () => {
  it('rounds and clamps bpm', () => {
    const project = createProject()

    expect(setBpm(project, 133.6).bpm).toBe(134)
    expect(setBpm(project, MAX_BPM + 100).bpm).toBe(MAX_BPM)
    expect(setBpm(project, 0).bpm).toBe(MIN_BPM)
    expect(setBpm(project, project.bpm)).toBe(project)
  })

  it('clamps swing and keeps the project when the title is unchanged', () => {
    const project = createProject()

    expect(setSwing(project, MAX_SWING + 1).swing).toBe(MAX_SWING)
    expect(renameProject(project, 'Тема уровня').title).toBe('Тема уровня')
    expect(renameProject(project, project.title)).toBe(project)
  })
})
