import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

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

function sampleIds(project: Project): Set<string> {
  return new Set(
    project.tracks.flatMap(({ instrument }) =>
      instrument.kind === 'sample' && instrument.sampleId !== null ? [instrument.sampleId] : [],
    ),
  )
}

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

export async function prepareProject(remote: SharedProject, signal: AbortSignal): Promise<Project> {
  let project: Project
  try {
    project = parseProject(remote.data)
  } catch (error) {
    if (error instanceof ProjectFormatError) {
      throw new Error('Формат сохранённого проекта не поддерживается.')
    }
    throw error
  }
  const samples = new Map(remote.samples.map((sample) => [sample.id, sample]))
  const engine = getAudioEngine()
  await Promise.all(
    [...sampleIds(project)].map(async (id) => {
      const sample = samples.get(id)
      if (!sample) {
        throw new Error('В сохранённом проекте отсутствует звуковой файл.')
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

export const useProjectPersistenceStore = defineStore('projectPersistence', () => {
  const projectStore = useProjectStore()
  const editor = useEditorStore()
  const saved = shallowRef<SavedProject | null>(null)
  const shareToken = ref<string | null>(null)
  const lastSaved = shallowRef<Project | null>(projectStore.project)
  const isSaving = ref(false)
  const uploadedIds = new Map<string, string>()

  const isDirty = computed(() => projectStore.project !== lastSaved.value)
  function replaceProject(project: Project, remote: SavedProject | null): void {
    uploadedIds.clear()
    saved.value = remote
    shareToken.value = remote?.share_token ?? null
    projectStore.load(project)
    lastSaved.value = project
    editor.selectTrack(project.tracks[0]?.id ?? null)
  }

  async function open(remote: SavedProject, signal: AbortSignal): Promise<void> {
    const project = await prepareProject(remote, signal)
    replaceProject(project, remote)
  }

  function startNew(): void {
    replaceProject(createProject(), null)
  }

  function detachSavedProject(): void {
    if (saved.value) {
      lastSaved.value = null
    }
    uploadedIds.clear()
    saved.value = null
    shareToken.value = null
  }

  async function save(): Promise<void> {
    if (isSaving.value) {
      return
    }
    const project = projectStore.project
    if (!project.title.trim()) {
      throw new Error('Введите название проекта.')
    }
    const engine = getAudioEngine()
    const resolved = new Map(saved.value?.samples.map(({ id }) => [id, id]))
    uploadedIds.forEach((remoteId, localId) => resolved.set(localId, remoteId))
    const pending = [...sampleIds(project)]
      .filter((id) => !resolved.has(id))
      .map((id) => {
        const file = engine.getSampleFile(id)
        if (!file) {
          throw new Error('Не найден исходный файл одного из звуков.')
        }
        return { id, file }
      })

    isSaving.value = true
    try {
      if (!saved.value && pending.length) {
        saved.value = await saveProject(
          serializeProject(remapSamples(project, (id) => resolved.get(id) ?? null)),
        )
      }
      for (const { id, file } of pending) {
        const sample = await uploadSample(saved.value!.id, file)
        resolved.set(id, sample.id)
        uploadedIds.set(id, sample.id)
      }
      saved.value = await saveProject(
        serializeProject(remapSamples(project, (id) => resolved.get(id) ?? null)),
        saved.value?.id,
      )
      lastSaved.value = project
      shareToken.value = saved.value.share_token
    } finally {
      isSaving.value = false
    }
  }

  return { isDirty, isSaving, shareToken, save, open, startNew, detachSavedProject }
})
