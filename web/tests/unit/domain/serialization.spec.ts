import { describe, expect, it } from 'vitest'

import { PROJECT_FORMAT_VERSION } from '@/domain/constants'
import { createProject } from '@/domain/factories'
import { updatePattern } from '@/domain/project'
import { parseProject, ProjectFormatError, serializeProject } from '@/domain/serialization'
import type { Project } from '@/domain/types'

const C4 = 60

function projectWithNote(): Project {
  const project = createProject()
  const track = project.tracks[0]
  const pattern = track?.patterns[0]
  if (!track || !pattern) {
    throw new Error('project has no tracks')
  }
  const note = { id: 'note', step: 2, pitch: C4, duration: 3 }
  return updatePattern(project, track.id, pattern.id, (current) => ({
    ...current,
    notes: [note],
  }))
}

function roundTrip(project: Project): unknown {
  return JSON.parse(JSON.stringify(serializeProject(project)))
}

function withChange(change: (document: Record<string, unknown>) => void): unknown {
  const document = roundTrip(projectWithNote()) as Record<string, unknown>
  change(document)
  return document
}

describe('serializeProject', () => {
  it('adds the format version', () => {
    expect(serializeProject(createProject()).version).toBe(PROJECT_FORMAT_VERSION)
  })

  it('survives a JSON round trip unchanged', () => {
    const project = projectWithNote()

    expect(parseProject(roundTrip(project))).toEqual(project)
  })
})

describe('parseProject', () => {
  it('rejects non-objects and unknown versions', () => {
    expect(() => parseProject(null)).toThrow(ProjectFormatError)
    expect(() => parseProject([])).toThrow(ProjectFormatError)
    expect(() => parseProject(withChange((document) => (document.version = 99)))).toThrow(
      /at version/,
    )
  })

  it('reports the path of the invalid field', () => {
    const invalid = withChange((document) => {
      const tracks = document.tracks as Record<string, unknown>[]
      const firstTrack = tracks[0] as { instrument: Record<string, unknown> }
      firstTrack.instrument.preset = 'theremin'
    })

    expect(() => parseProject(invalid)).toThrow(/at tracks\.0\.instrument\.preset/)
  })

  it('rejects out-of-range settings', () => {
    expect(() => parseProject(withChange((document) => (document.bpm = 1000)))).toThrow(/at bpm/)
    expect(() => parseProject(withChange((document) => (document.swing = -1)))).toThrow(/at swing/)
  })

  it('rejects notes that do not fit the pattern', () => {
    const invalid = withChange((document) => {
      const tracks = document.tracks as { patterns: { notes: { step: number }[] }[] }[]
      const firstNote = tracks[0]?.patterns[0]?.notes[0]
      if (firstNote) {
        firstNote.step = 15
      }
    })

    expect(() => parseProject(invalid)).toThrow(/Notes must be unique, fit the grid/)
  })

  it('rejects arrangement lanes that reference unknown patterns or tracks', () => {
    const unknownPattern = withChange((document) => {
      const arrangement = document.arrangement as { lanes: Record<string, unknown[]> }
      const firstLane = Object.values(arrangement.lanes)[0]
      if (firstLane) {
        firstLane[0] = 'missing-pattern'
      }
    })
    const unknownTrack = withChange((document) => {
      const arrangement = document.arrangement as { lanes: Record<string, unknown[]> }
      arrangement.lanes['missing-track'] = []
    })

    expect(() => parseProject(unknownPattern)).toThrow(/arrangement lane/)
    expect(() => parseProject(unknownTrack)).toThrow(/arrangement lane/)
  })
})
