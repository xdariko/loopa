export interface Envelope {
  readonly attack: number
  readonly decay: number
  readonly sustain: number
  readonly release: number
}

export const SILENCE = 0.0001
const TIME_CONSTANTS_TO_SETTLE = 4
export const FADE_OUT_SECONDS = 0.02

export function applyEnvelope(
  param: AudioParam,
  envelope: Envelope,
  peak: number,
  start: number,
  end: number,
): number {
  const attackEnd = Math.min(start + envelope.attack, end)
  param.setValueAtTime(SILENCE, start)
  param.linearRampToValueAtTime(peak, attackEnd)
  param.setTargetAtTime(
    peak * envelope.sustain,
    attackEnd,
    envelope.decay / TIME_CONSTANTS_TO_SETTLE,
  )
  param.setTargetAtTime(SILENCE, end, envelope.release / TIME_CONSTANTS_TO_SETTLE)
  return end + envelope.release
}

export function fadeOut(param: AudioParam, time: number): number {
  param.cancelScheduledValues(time)
  param.setValueAtTime(param.value, time)
  param.linearRampToValueAtTime(SILENCE, time + FADE_OUT_SECONDS)
  return time + FADE_OUT_SECONDS
}
