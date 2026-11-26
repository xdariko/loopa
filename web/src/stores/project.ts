import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import { HISTORY_LIMIT } from '@/domain/constants'
import { createProject } from '@/domain/factories'
import * as projects from '@/domain/project'
import type { Project } from '@/domain/types'

export const useProjectStore = defineStore('project', {
  state() {
    return {
      // текущий проект, заменяем целиком при изменениях
      project: shallowRef<Project>(createProject()),
      // прошлые снимки, история для отмены
      past: shallowRef<readonly Project[]>([]),
    }
  },

  getters: {
    canUndo: (state) => state.past.length > 0,
  },

  actions: {
    // применяет правки к проекту. принимает функцию, которая получает проект и возвращает проект
    change(update: (current: Project) => Project): boolean {
      const next = update(this.project)
      if (next === this.project) {
        return false
      }
      this.past = [...this.past, this.project].slice(-HISTORY_LIMIT)
      this.project = next
      return true
    },

    // контрл зет
    undo(): void {
      const previous = this.past[this.past.length - 1]
      if (!previous) {
        return
      }
      this.past = this.past.slice(0, -1)
      this.project = previous
    },

    load(next: Project): void {
      this.project = next
      this.past = []
    },

    setBpm(bpm: number): boolean {
      return this.change((current) => projects.setBpm(current, bpm))
    },

    setSwing(swing: number): boolean {
      return this.change((current) => projects.setSwing(current, swing))
    },

    setTrackMuted(trackId: string, muted: boolean): boolean {
      return this.change((current) => projects.setTrackMuted(current, trackId, muted))
    },

    setTrackMixLevel(trackId: string, control: projects.TrackMixControl, level: number): boolean {
      return this.change((current) => projects.setTrackMixLevel(current, trackId, control, level))
    },

    rename(title: string): boolean {
      return this.change((current) => projects.renameProject(current, title))
    },

    appendArrangementBar(): void {
      this.change(projects.appendArrangementBar)
    },

    removeArrangementBar(bar: number): boolean {
      return this.change((current) => projects.removeArrangementBar(current, bar))
    },

    setArrangementPattern(trackId: string, bar: number, patternId: string | null): boolean {
      return this.change((current) =>
        projects.setArrangementPattern(current, trackId, bar, patternId),
      )
    },
  },
})
