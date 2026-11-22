export const SPECTRUM_FFT_SIZE = 4096
export const SPECTRUM_BIN_COUNT = SPECTRUM_FFT_SIZE / 2

const LOWEST_BIN = 4
const MAX_BIN_VALUE = 255
const SILENT_LEVEL = 0.001

export interface SpectrumSource {
  read(target: Uint8Array<ArrayBuffer>): void
}

function bandEdge(band: number, bandCount: number, binCount: number): number {
  return Math.floor(LOWEST_BIN * (binCount / LOWEST_BIN) ** (band / bandCount))
}

export function spectrumBands(bins: Uint8Array, bandCount: number): Float32Array {
  const bands = new Float32Array(bandCount)
  for (let band = 0; band < bandCount; band += 1) {
    const from = bandEdge(band, bandCount, bins.length)
    const to = Math.max(from + 1, bandEdge(band + 1, bandCount, bins.length))
    bands[band] = Math.max(...bins.subarray(from, to)) / MAX_BIN_VALUE
  }
  return bands
}

export class SpectrumMeter {
  readonly levels: Float32Array

  constructor(bandCount: number) {
    this.levels = new Float32Array(bandCount)
  }

  fallTowards(target: Float32Array, elapsedSeconds: number, fallPerSecond: number): void {
    const fall = fallPerSecond * elapsedSeconds
    this.levels.forEach((level, band) => {
      this.levels[band] = Math.max(target[band] ?? 0, level - fall, 0)
    })
  }

  jumpTo(target: Float32Array): void {
    this.levels.forEach((_, band) => {
      this.levels[band] = target[band] ?? 0
    })
  }

  isSilent(): boolean {
    return this.levels.every((level) => level < SILENT_LEVEL)
  }
}
