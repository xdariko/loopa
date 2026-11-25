// ADSR описывает, как меняется усиление синтезатора за время одной ноты
// Attack, decay и release задаются в секундах, sustain доля от пика
export interface Envelope {
  readonly attack: number // подъём от почти полной тишины до пика
  readonly decay: number  // спад от пика к уровню удержания
  readonly sustain: number // целевой уровень, пока нота удерживается
  readonly release: number // затухание после окончания ноты
}

// практически неслышное усиление. положительное значение подходит и для экспоненциальных спадов, которые используют ударные
export const SILENCE = 0.0001
const TIME_CONSTANTS_TO_SETTLE = 4
export const FADE_OUT_SECONDS = 0.02

// планируем изменение усиления по часам AudioContext
export function applyEnvelope(param: AudioParam, envelope: Envelope, peak: number, start: number, end: number): number {
  // вычисляем когда закончится подъем громкости
  const attackEnd = Math.min(start + envelope.attack, end)
  param.setValueAtTime(SILENCE, start) // начинаем с почти полной тишины
  param.linearRampToValueAtTime(peak, attackEnd) // подъем до пика
  param.setTargetAtTime(peak * envelope.sustain, attackEnd, envelope.decay / TIME_CONSTANTS_TO_SETTLE) // плавно переходим к уровню удержания
  param.setTargetAtTime(SILENCE, end, envelope.release / TIME_CONSTANTS_TO_SETTLE) // после окончания ноты усиление приближается к почти полной тишине
  return end + envelope.release // возвращаем время, когда усиление почти достигнет нуля, чтобы остановить источник
}

// ари досрочной остановке заменяем будущие события усиления спадом на 20 мс. возвращаем время, когда можно остановить источник
export function fadeOut(param: AudioParam, time: number): number {
  param.cancelScheduledValues(time)
  param.setValueAtTime(param.value, time)
  param.linearRampToValueAtTime(SILENCE, time + FADE_OUT_SECONDS)
  return time + FADE_OUT_SECONDS
}
