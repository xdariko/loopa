import { afterEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { createProject } from '@/domain/factories'
import { serializeProject } from '@/domain/serialization'
import router from '@/router'

async function mountAt(path: string) {
  await router.push(path)
  return mount(App, {
    global: { plugins: [createPinia(), router], stubs: { SpectrumView: true } },
  })
}

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('renders the editor layout on /', async () => {
    const wrapper = await mountAt('/')

    expect(wrapper.find('header').text()).toContain('loopa')
    expect(wrapper.text()).toContain('Дорожки')
    expect(wrapper.find('[data-testid="grid-area"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Композиция"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('loads a shared project and opens an editable copy', async () => {
    const data = serializeProject({ ...createProject(), title: 'Shared loop' })
    const shared = { title: data.title, data, samples: [] }
    const copy = { ...shared, id: 2, share_token: 'new-token', updated_at: '' }
    const fetchProject = vi
      .fn()
      .mockResolvedValueOnce(Response.json(shared))
      .mockResolvedValueOnce(Response.json(copy, { status: 201 }))
    vi.stubGlobal('fetch', fetchProject)
    const wrapper = await mountAt('/s/abc123')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Shared loop')
    expect(wrapper.find('.header__title').exists()).toBe(false)
    expect(fetchProject.mock.calls[0]?.[0]).toMatch(/\/api\/shared\/abc123$/)

    await wrapper.findAll('.page__button')[1]!.trigger('click')
    await flushPromises()
    expect(fetchProject.mock.calls[1]).toEqual([
      expect.stringMatching(/\/api\/shared\/abc123\/copy$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    ])
    expect(fetchProject.mock.calls[1]?.[1].headers.get('X-Loopa-Request')).toBe('1')
    expect(wrapper.get<HTMLInputElement>('.header__title').element.value).toBe('Shared loop')
    expect(wrapper.text()).toContain('Скопировать ссылку')
    wrapper.unmount()
  })

  it('registers an account and signs out through the account page', async () => {
    const fetchAccount = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ email: null }))
      .mockResolvedValueOnce(Response.json({ email: 'author@example.com' }, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchAccount)
    const wrapper = await mountAt('/account')
    await flushPromises()

    await wrapper.get('form button[type="button"]').trigger('click')
    await wrapper.get('input[type="email"]').setValue('author@example.com')
    const [password, confirmation] = wrapper.findAll('input[type="password"]')
    await password!.setValue('test-password')
    await confirmation!.setValue('test-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetchAccount.mock.calls[1]?.[0]).toMatch(/\/api\/registration$/)
    expect(wrapper.text()).toContain('author@example.com')
    await wrapper.get('button.page__button').trigger('click')
    await flushPromises()

    expect(fetchAccount.mock.calls[2]?.[1]).toMatchObject({ method: 'DELETE' })
    expect(wrapper.get('h1').text()).toBe('Вход')
    wrapper.unmount()
  })
})
