import { describe, expect, it } from 'vitest'

import { SPECTRUM_BIN_COUNT, SpectrumMeter, spectrumBands } from '@/audio/spectrum'

const BANDS = 8
const LOUD = 255

function silentLevels(count: number): number[] {
  return Array.from({ length: count }, () => 0)
}

describe('spectrumBands', () => {
  it('returns silent bands for silent bins', () => {
    const bands = spectrumBands(new Uint8Array(SPECTRUM_BIN_COUNT), BANDS)

    expect([...bands]).toEqual(silentLevels(BANDS))
  })

  it('takes the loudest bin of each band on a logarithmic scale', () => {
    const bins = new Uint8Array(SPECTRUM_BIN_COUNT)
    bins[SPECTRUM_BIN_COUNT - 1] = LOUD
    bins[4] = LOUD / 5

    const bands = spectrumBands(bins, BANDS)

    expect(bands[0]).toBeCloseTo(0.2)
    expect(bands[BANDS - 1]).toBe(1)
    expect(Array.from(bands.slice(1, BANDS - 1))).toEqual(silentLevels(BANDS - 2))
  })

  it('ignores the lowest bins below the audible range', () => {
    const bins = new Uint8Array(SPECTRUM_BIN_COUNT)
    bins[0] = LOUD

    expect(spectrumBands(bins, BANDS)[0]).toBe(0)
  })
})

describe('SpectrumMeter', () => {
  it('rises at once and falls at the given rate', () => {
    const meter = new SpectrumMeter(2)

    meter.fallTowards(new Float32Array([1, 0.5]), 0, 2)
    expect([...meter.levels]).toEqual([1, 0.5])

    meter.fallTowards(new Float32Array([0, 0]), 0.25, 2)
    expect([...meter.levels]).toEqual([0.5, 0])
    expect(meter.isSilent()).toBe(false)

    meter.fallTowards(new Float32Array([0, 0]), 1, 2)
    expect(meter.isSilent()).toBe(true)
  })

  it('jumps straight to the target without falling', () => {
    const meter = new SpectrumMeter(2)
    meter.jumpTo(new Float32Array([1, 1]))

    meter.jumpTo(new Float32Array([0, 0.5]))

    expect([...meter.levels]).toEqual([0, 0.5])
  })
})
