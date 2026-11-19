import { applyEnvelope, type Envelope } from '../envelope'
import { midiToFrequency } from '../pitch'
import type { AudioInstrument, NoteEvent, Voice } from '../types'
import { createVoice } from '../voice'

const SEMITONES_PER_OCTAVE = 12

export interface SynthVoicing {
  readonly waveform: OscillatorType
  readonly detuneCents: readonly number[]
  readonly octaveShift: number
  readonly cutoff: number
  readonly resonance: number
  readonly envelope: Envelope
  readonly level: number
}

export class SynthInstrument implements AudioInstrument {
  constructor(
    private readonly context: BaseAudioContext,
    private readonly voicing: SynthVoicing,
  ) {}

  play(note: NoteEvent, output: AudioNode): Voice {
    const { context, voicing } = this
    const amplifier = context.createGain()
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = voicing.cutoff
    filter.Q.value = voicing.resonance
    filter.connect(amplifier).connect(output)

    const frequency = midiToFrequency(note.pitch + voicing.octaveShift * SEMITONES_PER_OCTAVE)
    const oscillators = voicing.detuneCents.map((cents) => {
      const oscillator = context.createOscillator()
      oscillator.type = voicing.waveform
      oscillator.frequency.value = frequency
      oscillator.detune.value = cents
      oscillator.connect(filter)
      oscillator.start(note.time)
      return oscillator
    })

    const peak = voicing.level / oscillators.length
    const endTime = applyEnvelope(
      amplifier.gain,
      voicing.envelope,
      peak,
      note.time,
      note.time + note.duration,
    )
    return createVoice(oscillators, amplifier, endTime)
  }
}
