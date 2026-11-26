import { createPinia } from 'pinia'
import { expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { getAccount } from '@/api/account'
import type { getAudioEngine } from '@/audio/engine'
import AppHeader from '@/components/layout/AppHeader.vue'
import { i18n } from '@/i18n'
import { useProjectPersistenceStore } from '@/stores/projectPersistence'

type AudioEngine = ReturnType<typeof getAudioEngine>

vi.mock('@/api/account', () => ({ getAccount: vi.fn<typeof getAccount>() }))
vi.mock('@/audio/engine', () => ({
  getAudioEngine: () => ({
    syncTracks: vi.fn<AudioEngine['syncTracks']>(),
    setDelayTime: vi.fn<AudioEngine['setDelayTime']>(),
  }),
}))

it('prompts guests to sign in without sending a save request', async () => {
  vi.mocked(getAccount).mockResolvedValue({ email: null })
  const pinia = createPinia()
  const save = vi.spyOn(useProjectPersistenceStore(pinia), 'save')
  const page = { render: () => null }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: page },
      { path: '/editor', name: 'editor', component: page },
      { path: '/account', name: 'account', component: page },
    ],
  })
  await router.push('/editor')
  const root = document.createElement('div')
  const app = createApp(AppHeader).use(pinia).use(router).use(i18n)
  app.mount(root)
  try {
    const saveButton = root.querySelector<HTMLButtonElement>('.header__actions button')!
    saveButton.click()
    await nextTick()

    expect(save).not.toHaveBeenCalled()
    const link = root.querySelector('.header__feedback a')
    expect(link?.getAttribute('href')).toBe('/account')
    expect(link?.textContent).toBe('Войти или зарегистрироваться')
  } finally {
    app.unmount()
  }
})
