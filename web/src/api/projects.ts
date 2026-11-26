import { t } from '@/i18n'

import type { ProjectDocument } from '@/domain/serialization'

const API_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:3000' : '')
).replace(/\/$/, '')

export interface ProjectSummary {
  readonly id: number
  readonly title: string
  readonly updated_at: string
}

export interface SavedSample {
  readonly id: string
  readonly url: string
}

export interface SharedProject {
  readonly title: string
  readonly data: unknown
  readonly samples: readonly SavedSample[]
}

export interface SavedProject extends ProjectSummary, SharedProject {
  readonly share_token: string
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    const headers = new Headers(init?.headers)
    if (init?.method && init.method !== 'GET') {
      headers.set('X-Loopa-Request', '1')
    }
    return await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' })
  } catch (error) {
    if (init?.signal?.aborted) {
      throw error
    }
    throw new Error(t('common.offline'))
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await apiFetch(path, init)
  if (response.status === 401) {
    throw new AccountRequiredError(t('projects.accountRequired'))
  }
  if (response.status === 404) {
    throw new Error(t('projects.notFound'))
  }
  if (response.status === 422) {
    throw new Error(t('projects.rejected'))
  }
  if (!response.ok) {
    throw new Error(t('common.serverError'))
  }
  return response
}

export class AccountRequiredError extends Error {}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  return (await request(path, init)).json() as Promise<T>
}

export function listProjects(signal: AbortSignal): Promise<ProjectSummary[]> {
  return json('/api/projects', { signal })
}

export function getProject(id: number, signal: AbortSignal): Promise<SavedProject> {
  return json(`/api/projects/${id}`, { signal })
}

export async function deleteProject(id: number): Promise<void> {
  await request(`/api/projects/${id}`, { method: 'DELETE' })
}

export function saveProject(data: ProjectDocument, id?: number): Promise<SavedProject> {
  return json(id === undefined ? '/api/projects' : `/api/projects/${id}`, {
    method: id === undefined ? 'POST' : 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: { title: data.title, data } }),
  })
}

export function uploadSample(projectId: number, file: File): Promise<SavedSample> {
  const body = new FormData()
  body.append('file', file)
  return json(`/api/projects/${projectId}/samples`, { method: 'POST', body })
}

export async function downloadSample(sample: SavedSample, signal: AbortSignal): Promise<File> {
  const url = new URL(sample.url, new URL(API_URL || '/', window.location.origin))
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(t('projects.downloadFailed'))
  }
  const blob = await response.blob()
  return new File([blob], decodeURIComponent(url.pathname.split('/').pop() || 'sample'), {
    type: blob.type,
  })
}

export function getSharedProject(token: string, signal: AbortSignal): Promise<SharedProject> {
  return json(`/api/shared/${encodeURIComponent(token)}`, { signal })
}

export function copySharedProject(token: string): Promise<SavedProject> {
  return json(`/api/shared/${encodeURIComponent(token)}/copy`, { method: 'POST' })
}
