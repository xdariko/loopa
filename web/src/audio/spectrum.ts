export const SPECTRUM_FFT_SIZE = 4096 // размер буфера для анализа спектра
export const SPECTRUM_BIN_COUNT = SPECTRUM_FFT_SIZE / 2 // количество отсчётов спектра, которые выдаёт анализатор

// пропускаем первые четыре отсчёта, включая нулевую частоту
const LOWEST_BIN = 4
const MAX_BIN_VALUE = 255
const SILENT_LEVEL = 0.001

export interface SpectrumSource {
  // заполняет переданный буфер значениями спектра от 0 до 255
  read(target: Uint8Array<ArrayBuffer>): void
}

function bandEdge(band: number, bandCount: number, binCount: number): number {
  // логарифмическая шкала даёт низким частотам более узкие группы отсчётов
  return Math.floor(LOWEST_BIN * (binCount / LOWEST_BIN) ** (band / bandCount))
}

// каждая полоса даёт высоту одного столбика от 0 до 1.
export function spectrumBands(bins: Uint8Array, bandCount: number): Float32Array {
  const bands = new Float32Array(bandCount)
  for (let band = 0; band < bandCount; band += 1) {
    const from = bandEdge(band, bandCount, bins.length)
    const to = Math.max(from + 1, bandEdge(band + 1, bandCount, bins.length))

    // высоту определяет самый сильный отсчёт внутри полосы
    bands[band] = Math.max(...bins.subarray(from, to)) / MAX_BIN_VALUE
  }
  return bands
}

// хранит высоты, которые интерфейс рисует в текущем кадре
export class SpectrumMeter {
  readonly levels: Float32Array

  constructor(bandCount: number) {
    this.levels = new Float32Array(bandCount)
  }

  fallTowards(target: Float32Array, elapsedSeconds: number, fallPerSecond: number): void {
    // на рост сигнала реагируем сразу, а падение ограничиваем по времени
    const fall = fallPerSecond * elapsedSeconds
    this.levels.forEach((level, band) => {
      this.levels[band] = Math.max(target[band] ?? 0, level - fall, 0)
    })
  }

  jumpTo(target: Float32Array): void {
    // при настройке уменьшенного движения сразу применяем новые высоты
    this.levels.forEach((_, band) => {
      this.levels[band] = target[band] ?? 0
    })
  }

  isSilent(): boolean {
    return this.levels.every((level) => level < SILENT_LEVEL)
  }
}
