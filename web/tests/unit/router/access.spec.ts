import { createPinia } from 'pinia'
import { expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import { getAccount } from '@/api/account'
import router from '@/router'
import { useAccountStore } from '@/stores/account'

vi.mock('@/api/account', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/account')>()),
  getAccount: vi.fn(),
}))

it('checks the session for projects and keeps the editor accessible to guests', async () => {
  const pinia = createPinia()
  const app = createApp({ render: () => null })
  app.use(pinia).use(router).mount(document.createElement('div'))
  try {
    await router.isReady()
    const session = vi.mocked(getAccount)
    session.mockResolvedValue({ email: null })

    await router.push('/editor')
    expect(router.currentRoute.value.name).toBe('editor')
    expect(session).not.toHaveBeenCalled()

    await router.push('/projects')
    expect(router.currentRoute.value.name).toBe('account')
    expect(useAccountStore(pinia).email).toBeNull()

    session.mockResolvedValue({ email: 'demo@example.com' })
    await router.push('/projects')
    expect(router.currentRoute.value.name).toBe('projects')
    expect(useAccountStore(pinia).email).toBe('demo@example.com')
  } finally {
    app.unmount()
  }
})
