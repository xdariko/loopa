import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { saveProject, uploadSample } from '@/api/projects'
import { useEditorStore } from '@/stores/editor'
import { useProjectStore } from '@/stores/project'
import { useProjectPersistenceStore } from '@/stores/projectPersistence'

const engine = vi.hoisted(() => ({ getSampleFile: vi.fn() }))
vi.mock('@/audio/engine', () => ({ getAudioEngine: () => engine }))
vi.mock('@/api/projects', () => ({
  downloadSample: vi.fn(),
  saveProject: vi.fn(),
  uploadSample: vi.fn(),
}))

describe('project persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('retries a failed save without recreating the project or reuploading its sound', async () => {
    const persistence = useProjectPersistenceStore()
    const project = useProjectStore()
    useEditorStore().addTrack({ kind: 'sample', sampleId: 'local' })
    const file = new File(['sample'], 'kick.wav')
    const sample = { id: 'stored', url: '/sound' }
    const remote = {
      id: 5,
      title: 'Loop',
      updated_at: '',
      share_token: 'token',
      samples: [],
      data: {},
    }
    engine.getSampleFile.mockReturnValue(file)
    vi.mocked(uploadSample).mockResolvedValue(sample)
    vi.mocked(saveProject)
      .mockResolvedValueOnce(remote)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ...remote, samples: [sample] })

    await expect(persistence.save()).rejects.toThrow('offline')
    expect(persistence.isDirty).toBe(true)
    expect(persistence.shareToken).toBeNull()
    expect(vi.mocked(saveProject).mock.calls[0]?.[0].tracks[3]?.instrument).toEqual({
      kind: 'sample',
      sampleId: null,
    })

    await persistence.save()
    expect(uploadSample).toHaveBeenCalledExactlyOnceWith(5, file)
    expect(vi.mocked(saveProject).mock.calls[2]?.[1]).toBe(5)
    expect(vi.mocked(saveProject).mock.calls[2]?.[0].tracks[3]?.instrument).toEqual({
      kind: 'sample',
      sampleId: 'stored',
    })
    expect(project.project.tracks[3]?.instrument).toEqual({ kind: 'sample', sampleId: 'local' })
    expect(persistence.shareToken).toBe('token')
    expect(persistence.isDirty).toBe(false)
  })
})
