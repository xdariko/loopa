import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

import { HISTORY_LIMIT } from '@/domain/constants'
import { createProject } from '@/domain/factories'
import * as projects from '@/domain/project'
import type { Project } from '@/domain/types'

export const useProjectStore = defineStore('project', () => {
  const project = shallowRef<Project>(createProject())
  const past = shallowRef<readonly Project[]>([])

  const canUndo = computed(() => past.value.length > 0)

  function change(update: (current: Project) => Project): boolean {
    const next = update(project.value)
    if (next === project.value) {
      return false
    }
    past.value = [...past.value, project.value].slice(-HISTORY_LIMIT)
    project.value = next
    return true
  }

  function undo(): void {
    const previous = past.value[past.value.length - 1]
    if (!previous) {
      return
    }
    past.value = past.value.slice(0, -1)
    project.value = previous
  }

  function load(next: Project): void {
    project.value = next
    past.value = []
  }

  function setBpm(bpm: number): boolean {
    return change((current) => projects.setBpm(current, bpm))
  }

  function setSwing(swing: number): boolean {
    return change((current) => projects.setSwing(current, swing))
  }

  function setTrackMuted(trackId: string, muted: boolean): boolean {
    return change((current) => projects.setTrackMuted(current, trackId, muted))
  }

  function setTrackMixLevel(
    trackId: string,
    control: projects.TrackMixControl,
    level: number,
  ): boolean {
    return change((current) => projects.setTrackMixLevel(current, trackId, control, level))
  }

  function rename(title: string): boolean {
    return change((current) => projects.renameProject(current, title))
  }

  function appendArrangementBar(): void {
    change(projects.appendArrangementBar)
  }

  function setArrangementPattern(trackId: string, bar: number, patternId: string | null): boolean {
    return change((current) => projects.setArrangementPattern(current, trackId, bar, patternId))
  }

  return {
    project,
    past,
    canUndo,
    change,
    undo,
    load,
    setBpm,
    setSwing,
    setTrackMuted,
    setTrackMixLevel,
    rename,
    appendArrangementBar,
    setArrangementPattern,
  }
})
