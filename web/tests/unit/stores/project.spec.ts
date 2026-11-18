import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { DEFAULT_BPM, HISTORY_LIMIT } from '@/domain/constants'
import { createProject } from '@/domain/factories'
import { useProjectStore } from '@/stores/project'

describe('project store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('records only real changes and restores the previous project on undo', () => {
    const store = useProjectStore()
    const initial = store.project

    expect(store.setBpm(DEFAULT_BPM)).toBe(false)
    expect(store.canUndo).toBe(false)
    expect(store.setBpm(140)).toBe(true)
    expect(store.project.bpm).toBe(140)
    expect(store.canUndo).toBe(true)

    store.undo()
    expect(store.project).toBe(initial)
    expect(store.canUndo).toBe(false)
  })

  it('keeps at most the history limit', () => {
    const store = useProjectStore()

    for (let step = 0; step <= HISTORY_LIMIT; step += 1) {
      store.rename(`Версия ${step}`)
    }

    expect(store.past).toHaveLength(HISTORY_LIMIT)
  })

  it('clears history when a project is loaded', () => {
    const store = useProjectStore()
    store.setBpm(140)
    const loaded = createProject()

    store.load(loaded)

    expect(store.project).toBe(loaded)
    expect(store.canUndo).toBe(false)
  })
})
