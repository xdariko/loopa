import { describe, expect, it } from 'vitest'

import { midiToFrequency } from '@/audio/pitch'

describe('midiToFrequency', () => {
  it('tunes A4 to 440 Hz and doubles per octave', () => {
    expect(midiToFrequency(69)).toBe(440)
    expect(midiToFrequency(81)).toBe(880)
  })
})
