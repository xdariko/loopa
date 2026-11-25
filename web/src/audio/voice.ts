import { fadeOut } from './envelope'
import type { Voice } from './types'

export const SILENT_VOICE: Voice = { endTime: 0, stop: () => {} }

export function createVoice(sources: readonly AudioScheduledSourceNode[], amplifier: GainNode, endTime: number): Voice {
  sources.forEach((source) => source.stop(endTime))
  return {
    endTime,
    stop(time) {
      if (time >= endTime) {
        return
      }
      const silentAt = fadeOut(amplifier.gain, time)
      sources.forEach((source) => source.stop(silentAt))
    },
  }
}
