import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import router from '@/router'

async function mountAt(path: string) {
  await router.push(path)
  return mount(App, { global: { plugins: [createPinia(), router] } })
}

describe('App', () => {
  it('renders the editor layout on /', async () => {
    const wrapper = await mountAt('/')

    expect(wrapper.find('header').text()).toContain('loopa')
    expect(wrapper.text()).toContain('Дорожки')
    expect(wrapper.find('[data-testid="grid-area"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Композиция"]').exists()).toBe(true)
  })

  it('renders the shared view with the token from the URL', async () => {
    const wrapper = await mountAt('/s/abc123')

    expect(wrapper.text()).toContain('abc123')
  })
})
