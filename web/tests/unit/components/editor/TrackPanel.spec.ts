import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import TrackPanel from '@/components/editor/TrackPanel.vue'
import { TRACK_INSTRUMENTS } from '@/domain/instruments'
import { createTrack } from '@/domain/factories'

const tracks = [createTrack({ kind: 'synth', preset: 'lead' }), createTrack({ kind: 'drums' })]

function mountPanel(selectedTrackId: string | null = null) {
  return mount(TrackPanel, { props: { tracks, selectedTrackId } })
}

function findButton(wrapper: ReturnType<typeof mountPanel>, text: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === text)
  if (!button) {
    throw new Error(`Button "${text}" not found`)
  }
  return button
}

describe('TrackPanel', () => {
  it('lists tracks and marks the selected one', () => {
    const wrapper = mountPanel(tracks[1]?.id)
    const items = wrapper.findAll('.tracks__item')

    expect(items.map((item) => item.text())).toEqual(['Lead', 'Drums'])
    expect(items[1]?.classes()).toContain('tracks__item--active')
    expect(items[1]?.attributes('aria-pressed')).toBe('true')
    expect(items[0]?.classes()).not.toContain('tracks__item--active')
  })

  it('emits select with the clicked track id', async () => {
    const wrapper = mountPanel()

    await wrapper.findAll('.tracks__item')[1]?.trigger('click')

    expect(wrapper.emitted('select')).toEqual([[tracks[1]?.id]])
  })

  it('offers instruments for a new track, closes on cancel and emits the chosen one', async () => {
    const wrapper = mountPanel()

    await findButton(wrapper, '+ Дорожка').trigger('click')
    await findButton(wrapper, 'Отмена').trigger('click')
    expect(wrapper.find('.tracks__instruments').exists()).toBe(false)

    await findButton(wrapper, '+ Дорожка').trigger('click')
    expect(wrapper.findAll('.tracks__instruments button')).toHaveLength(TRACK_INSTRUMENTS.length)

    await findButton(wrapper, 'Pad').trigger('click')

    expect(wrapper.emitted('add')).toEqual([[{ kind: 'synth', preset: 'pad' }]])
    expect(wrapper.find('.tracks__instruments').exists()).toBe(false)
  })
})
