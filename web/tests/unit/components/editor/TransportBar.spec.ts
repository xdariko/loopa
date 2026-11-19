import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import TransportBar from '@/components/editor/TransportBar.vue'

describe('TransportBar', () => {
  it('toggles playback and reports a typed bpm, then shows the stored value', async () => {
    const wrapper = mount(TransportBar, { props: { isPlaying: true, bpm: 120 } })
    const input = wrapper.get<HTMLInputElement>('input[type="number"]')

    await wrapper.get('[aria-label="Пауза"]').trigger('click')
    input.element.value = '999'
    await input.trigger('change')
    await nextTick()

    expect(wrapper.emitted('toggle')).toHaveLength(1)
    expect(wrapper.emitted('bpmChange')).toEqual([[999]])
    expect(input.element.value).toBe('120')
  })
})
