import { FADE_OUT_SECONDS, SILENCE } from '../envelope'
import { midiToFrequency } from '../pitch'
import type { AudioInstrument, NoteEvent, Voice } from '../types'
import { createVoice, SILENT_VOICE } from '../voice'

const ROOT_MIDI_PITCH = 60

export type SampleLookup = (sampleId: string) => AudioBuffer | undefined

export class SampleInstrument implements AudioInstrument {
  constructor(
    private readonly context: BaseAudioContext,
    private readonly buffer: () => AudioBuffer | undefined,
  ) {}

  play(note: NoteEvent, output: AudioNode): Voice {
    const buffer = this.buffer()
    if (!buffer) {
      return SILENT_VOICE
    }
    const source = this.context.createBufferSource()
    source.buffer = buffer
    const rate = midiToFrequency(note.pitch) / midiToFrequency(ROOT_MIDI_PITCH)
    source.playbackRate.value = rate
    const amplifier = this.context.createGain()
    source.connect(amplifier).connect(output)

    const duration = Math.min(note.duration, buffer.duration / rate)
    const end = note.time + duration
    const fadeStart = end - Math.min(FADE_OUT_SECONDS, duration / 2)
    amplifier.gain.setValueAtTime(1, fadeStart)
    amplifier.gain.linearRampToValueAtTime(SILENCE, end)
    source.start(note.time)
    return createVoice([source], amplifier, end)
  }
}
