import { t } from '@/i18n'

import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import {
  downloadSample,
  saveProject,
  uploadSample,
  type SavedProject,
  type SharedProject,
} from '@/api/projects'
import { getAudioEngine } from '@/audio/engine'
import { createProject } from '@/domain/factories'
import { parseProject, ProjectFormatError, serializeProject } from '@/domain/serialization'
import type { Project } from '@/domain/types'

import { useEditorStore } from './editor'
import { useProjectStore } from './project'

// собирает уникальные айдишники сэмплов, на которые ссылаются треки
function sampleIds(project: Project): Set<string> {
  return new Set(
    project.tracks.flatMap(({ instrument }) =>
      instrument.kind === 'sample' && instrument.sampleId !== null ? [instrument.sampleId] : [],
    ),
  )
}

// создаёт копию проекта с серверными айдишниками сэмплов для отправки в апи
function remapSamples(project: Project, resolve: (id: string) => string | null): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => {
      const { instrument } = track
      if (instrument.kind !== 'sample' || instrument.sampleId === null) {
        return track
      }
      return { ...track, instrument: { ...instrument, sampleId: resolve(instrument.sampleId) } }
    }),
  }
}

// проверяет данные проекта и загружает в аудиодвижок недостающие сэмплы
export async function prepareProject(remote: SharedProject, signal: AbortSignal): Promise<Project> {
  let project: Project
  try {
    project = parseProject(remote.data)
  } catch (error) {
    if (error instanceof ProjectFormatError) {
      throw new Error(t('projects.unsupportedFormat'))
    }
    throw error
  }
  const samples = new Map(remote.samples.map((sample) => [sample.id, sample]))
  const engine = getAudioEngine()
  await Promise.all(
    [...sampleIds(project)].map(async (id) => {
      const sample = samples.get(id)
      if (!sample) {
        throw new Error(t('projects.missingSample'))
      }
      if (!engine.getSampleFile(id)) {
        const file = await downloadSample(sample, signal)
        await engine.restoreSample(id, file, signal)
      }
    }),
  )
  signal.throwIfAborted()
  return project
}

export const useProjectPersistenceStore = defineStore('projectPersistence', {
  state() {
    return {
      saved: shallowRef<SavedProject | null>(null), // запись проекта от сервера
      shareToken: null as string | null, // токен для шаринга проекта
      lastSaved: shallowRef<Project | null>(useProjectStore().project), // локальный снимок проекта
      isSaving: false,
      uploadedIds: new Map<string, string>(), // локальный айдишник сэмпла -> серверный айдишник
    }
  },

  getters: {
    isDirty: (state) => useProjectStore().project !== state.lastSaved,
  },

  actions: {
    // загружает проект в редактор, сбрасывает историю и выбирает первый трек.
    replaceProject(project: Project, remote: SavedProject | null): void {
      this.uploadedIds.clear()
      this.saved = remote
      this.shareToken = remote?.share_token ?? null
      useProjectStore().load(project)
      this.lastSaved = project
      useEditorStore().selectTrack(project.tracks[0]?.id ?? null)
    },

    // подготавливает сохранённый проект и открывает его в редакторе
    async open(remote: SavedProject, signal: AbortSignal): Promise<void> {
      const project = await prepareProject(remote, signal)
      this.replaceProject(project, remote)
    },

    // создаем открываем новый проект в редакторе
    startNew(): void {
      this.replaceProject(createProject(), null)
    },

    // оставляет проект в редакторе и убирает привязку к сохранённой записи. чтобы при входе проект не исчез
    detachSavedProject(): void {
      if (this.saved) {
        this.lastSaved = null
      }
      this.uploadedIds.clear()
      this.saved = null
      this.shareToken = null
    },

    // загружает новые сэмплы и отправляет снимок проекта в апи
    async save(): Promise<void> {
      if (this.isSaving) {
        return
      }
      const project = useProjectStore().project
      if (!project.title.trim()) {
        throw new Error(t('projects.titleRequired'))
      }
      const engine = getAudioEngine()
      const resolved = new Map(this.saved?.samples.map(({ id }) => [id, id]))
      this.uploadedIds.forEach((remoteId, localId) => resolved.set(localId, remoteId))
      const pending = [...sampleIds(project)]
        .filter((id) => !resolved.has(id))
        .map((id) => {
          const file = engine.getSampleFile(id)
          if (!file) {
            throw new Error(t('projects.missingLocalSample'))
          }
          return { id, file }
        })

      this.isSaving = true
      try {
        if (!this.saved && pending.length) {
          this.saved = await saveProject(
            serializeProject(remapSamples(project, (id) => resolved.get(id) ?? null)),
          )
        }
        for (const { id, file } of pending) {
          const sample = await uploadSample(this.saved!.id, file)
          resolved.set(id, sample.id)
          this.uploadedIds.set(id, sample.id)
        }
        this.saved = await saveProject(
          serializeProject(remapSamples(project, (id) => resolved.get(id) ?? null)),
          this.saved?.id,
        )
        this.lastSaved = project
        this.shareToken = this.saved.share_token
      } finally {
        this.isSaving = false
      }
    },
  },
})
