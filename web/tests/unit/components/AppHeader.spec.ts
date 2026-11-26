import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { expect, it, vi } from 'vitest'
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
  const header = mount(AppHeader, { global: { plugins: [pinia, router, i18n] } })
  try {
    await flushPromises()
    await header.get('.header__actions button').trigger('click')

    expect(save).not.toHaveBeenCalled()
    const link = header.get('.header__feedback a')
    expect(link.attributes('href')).toBe('/account')
    expect(link.text()).toBe('Войти или зарегистрироваться')
  } finally {
    header.unmount()
  }
})
