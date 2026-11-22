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
  it('links from the home page to the account and editor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ email: null })),
    )
    const wrapper = await mountAt('/')

    expect(wrapper.get('h1').text()).toBe('Собери свой луп')
    expect(wrapper.get('footer a').attributes('href')).toBe('https://github.com/xdariko/loopa')
    expect(wrapper.get('a[href="/account"]').text()).toBe('Войти или зарегистрироваться')
    await wrapper.get('a[href="/editor"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('editor')
    expect(wrapper.find('footer').exists()).toBe(false)
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
    vi.stubGlobal('fetch', (url: string, init: RequestInit) =>
      url.endsWith('/api/session')
        ? Promise.resolve(Response.json({ email: 'author@example.com' }))
        : fetchProject(url, init),
    )
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
    expect(
      wrapper
        .findAll('.header__actions .header__link')
        .slice(0, 2)
        .map((link) => link.text()),
    ).toEqual(['Новый', 'Открыть'])
    expect(wrapper.text()).toContain('Скопировать ссылку')
    wrapper.unmount()
  })

  it('keeps the editor available to guests and prompts them to sign in for saved projects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Response(null, { status: 401 })),
    )
    const wrapper = await mountAt('/editor')

    expect(wrapper.find('[data-testid="grid-area"]').exists()).toBe(true)
    expect(wrapper.find('header a[href="/projects"]').exists()).toBe(false)
    expect(wrapper.find('header a[href="/account"]').exists()).toBe(false)
    expect(wrapper.findAll('.header__actions button').map((button) => button.text())).not.toContain(
      'Новый',
    )
    await wrapper.get('.header__button').trigger('click')
    await flushPromises()
    expect(wrapper.get('.header__feedback a').attributes('href')).toBe('/account')

    await router.push('/projects')
    await flushPromises()
    expect(wrapper.find('.page__list').exists()).toBe(false)
    expect(wrapper.get('main a').attributes('href')).toBe('/account')
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
    expect(wrapper.get('header a[href="/projects"]').text()).toBe('Открыть')
    expect(wrapper.get('header a[href="/account"]').text()).toBe('Аккаунт')
    await wrapper.get('button.page__button').trigger('click')
    await flushPromises()

    expect(fetchAccount.mock.calls[2]?.[1]).toMatchObject({ method: 'DELETE' })
    expect(wrapper.get('h1').text()).toBe('Вход')
    expect(wrapper.find('header a[href="/projects"]').exists()).toBe(false)
    expect(wrapper.find('header a[href="/account"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
