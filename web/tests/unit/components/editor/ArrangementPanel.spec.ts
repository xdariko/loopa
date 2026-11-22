import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, shallowRef } from 'vue'

import { playbackNoteKey } from '@/audio/timeline'
import ArrangementPanel from '@/components/editor/ArrangementPanel.vue'
import { providePlaybackCursor } from '@/composables/usePlaybackCursor'
import { createNote, createProject } from '@/domain/factories'
import { updatePattern } from '@/domain/project'

describe('ArrangementPanel playback', () => {
  it('highlights only the playing occurrence of a pattern used in multiple bars', async () => {
    const initial = createProject()
    const track = initial.tracks[0]!
    const patternId = track.patterns[0]!.id
    const note = createNote({ step: 4, pitch: 60 })
    const project = updatePattern(initial, track.id, patternId, (pattern) => ({
      ...pattern,
      notes: [note],
    }))
    const position = shallowRef<number | null>(null)
    const bar = shallowRef<number | null>(null)
    const patterns = shallowRef(new Map([[track.id, patternId]]))
    const playingNoteIds = shallowRef<ReadonlySet<string>>(new Set())
    const wrapper = mount(
      defineComponent({
        setup() {
          providePlaybackCursor({ position, bar, patterns, playingNoteIds })
          return () =>
            h(ArrangementPanel, {
              tracks: project.tracks,
              arrangement: project.arrangement,
              selectedTrackId: track.id,
            })
        },
      }),
    )
    const blocks = wrapper.findAll('.arrangement__block')
    await blocks[0]!.trigger('click')
    bar.value = 1
    position.value = 4
    playingNoteIds.value = new Set([playbackNoteKey(track.id, patternId, note.id)])
    await nextTick()

    expect(wrapper.get('.arrangement__playback').attributes('style')).toContain(
      '--arrangement-playback-bar: 1',
    )
    expect(wrapper.get('.playhead__line').attributes('style')).toContain(
      '--playhead-progress: 0.25',
    )
    expect(blocks[1]!.find('.pattern-preview__note--playing').exists()).toBe(true)
    expect(wrapper.findAll('.pattern-preview__note--playing')).toHaveLength(1)

    position.value = null
    bar.value = null
    playingNoteIds.value = new Set()
    await nextTick()
    expect(wrapper.find('.playhead').exists()).toBe(false)
    expect(wrapper.find('.pattern-preview__note--playing').exists()).toBe(false)
    wrapper.unmount()
  })
})
