import { describe, expect, it } from 'vitest'

import {
  DEFAULT_BAR_COUNT,
  MAX_BPM,
  MAX_SWING,
  MAX_TRACK_NAME_LENGTH,
  MIN_BPM,
} from '@/domain/constants'
import { createPattern, createProject, createTrack, createTrackLane } from '@/domain/factories'
import {
  addPattern,
  addTrack,
  nextTrackName,
  removeArrangementBar,
  removePattern,
  removeTrack,
  renameProject,
  renameTrack,
  setArrangementPattern,
  setBpm,
  setSwing,
  setTrackMixLevel,
  setTrackMuted,
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

describe('track mix', () => {
  it('clamps levels and preserves unrelated state', () => {
    const project = createProject()
    const track = firstTrack(project)
    const louder = setTrackMixLevel(project, track.id, 'volume', 2)
    const withDelay = setTrackMixLevel(louder, track.id, 'delay', 0.5)
    const muted = setTrackMuted(withDelay, track.id, true)

    expect(firstTrack(muted)).toMatchObject({
      volume: 1,
      muted: true,
      effects: { delay: 0.5, reverb: track.effects.reverb },
    })
    expect(muted.tracks[1]).toBe(project.tracks[1])
    expect(muted.arrangement).toBe(project.arrangement)
    expect(setTrackMixLevel(muted, track.id, 'delay', Number.NaN)).toBe(muted)
    expect(setTrackMixLevel(muted, track.id, 'reverb', -1)).toBe(muted)
    expect(setTrackMuted(muted, track.id, true)).toBe(muted)
    expect(setSwing(muted, Number.NaN)).toBe(muted)
  })
})

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

describe('addPattern', () => {
  it('appends only to the target track and keeps the arrangement intact', () => {
    const project = createProject()
    const track = firstTrack(project)
    const pattern = createPattern()

    const updated = addPattern(project, track.id, pattern)

    expect(firstTrack(updated).patterns).toEqual([...track.patterns, pattern])
    expect(updated.tracks[1]).toBe(project.tracks[1])
    expect(updated.arrangement).toBe(project.arrangement)
    expect(addPattern(project, 'missing', pattern)).toBe(project)
  })
})

describe('arrangement deletion', () => {
  it('clears all slots for a deleted pattern on its own track', () => {
    const project = createProject()
    const track = firstTrack(project)
    const added = createPattern()
    const withPattern = addPattern(project, track.id, added)
    const assigned = setArrangementPattern(withPattern, track.id, 1, added.id)
    const updated = removePattern(assigned, track.id, track.patterns[0]!.id)

    expect(firstTrack(updated).patterns).toEqual([added])
    expect(updated.arrangement.lanes[track.id]).toEqual([null, added.id, null, null])
    const otherTrack = project.tracks[1]!
    expect(updated.arrangement.lanes[otherTrack.id]).toBe(project.arrangement.lanes[otherTrack.id])
  })

  it('removes the same bar from every lane and preserves the final bar', () => {
    const project = createProject()
    const track = firstTrack(project)
    const cleared = setArrangementPattern(project, track.id, 2, null)
    const updated = removeArrangementBar(cleared, 1)

    expect(updated.arrangement.barCount).toBe(3)
    expect(updated.arrangement.lanes[track.id]?.[1]).toBeNull()
    expect(Object.values(updated.arrangement.lanes).map((lane) => lane.length)).toEqual([3, 3, 3])
    expect(updated.tracks).toBe(cleared.tracks)
    const finalBar = removeArrangementBar(removeArrangementBar(updated, 0), 0)
    expect(removeArrangementBar(finalBar, 0)).toBe(finalBar)
  })
})

describe('setArrangementPattern', () => {
  it('updates and clears a single slot without changing other lanes', () => {
    const project = createProject()
    const track = firstTrack(project)
    const secondPattern = createPattern()
    const withPattern = addPattern(project, track.id, secondPattern)
    const updated = setArrangementPattern(withPattern, track.id, 1, secondPattern.id)

    expect(updated.arrangement.lanes[track.id]?.[1]).toBe(secondPattern.id)
    expect(updated.arrangement.lanes[track.id]?.[0]).toBe(track.patterns[0]?.id)
    expect(updated.tracks).toBe(withPattern.tracks)
    const cleared = setArrangementPattern(updated, track.id, 1, null)
    expect(cleared.arrangement.lanes[track.id]?.[1]).toBeNull()
    expect(setArrangementPattern(cleared, track.id, 1, null)).toBe(cleared)
  })

  it('rejects an invalid bar and references to another track’s pattern', () => {
    const project = createProject()
    const track = firstTrack(project)
    const otherPatternId = project.tracks[1]!.patterns[0]!.id

    expect(setArrangementPattern(project, track.id, 0, otherPatternId)).toBe(project)
    expect(setArrangementPattern(project, track.id, -1, null)).toBe(project)
    expect(setArrangementPattern(project, track.id, DEFAULT_BAR_COUNT, null)).toBe(project)
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

describe('renameTrack', () => {
  it('trims and limits the name and ignores blank or unchanged names', () => {
    const project = createProject()
    const { id, name } = firstTrack(project)

    expect(renameTrack(project, id, '  Melody  ').tracks[0]?.name).toBe('Melody')
    expect(renameTrack(project, id, 'x'.repeat(100)).tracks[0]?.name).toHaveLength(
      MAX_TRACK_NAME_LENGTH,
    )
    expect(renameTrack(project, id, '   ')).toBe(project)
    expect(renameTrack(project, id, name)).toBe(project)
  })
})

describe('nextTrackName', () => {
  it('keeps a free name and numbers taken ones from 2', () => {
    const project = createProject()
    const withSecondLead = addTrack(
      project,
      createTrack({ kind: 'synth', preset: 'lead' }, 'Lead 2'),
      [],
    )

    expect(nextTrackName(project, 'Pad')).toBe('Pad')
    expect(nextTrackName(project, 'Lead')).toBe('Lead 2')
    expect(nextTrackName(withSecondLead, 'Lead')).toBe('Lead 3')
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
