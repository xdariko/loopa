import { t } from '@/i18n'

export const SYNTH_PRESETS = ['lead', 'bass', 'keys', 'pad'] as const
export type SynthPreset = (typeof SYNTH_PRESETS)[number]

export const DRUM_VOICES = ['kick', 'snare', 'hat'] as const
export type DrumVoice = (typeof DRUM_VOICES)[number]

export type Instrument =
  | { readonly kind: 'synth'; readonly preset: SynthPreset }
  | { readonly kind: 'drums' }
  | { readonly kind: 'sample'; readonly sampleId: string | null }

export const TRACK_INSTRUMENTS: readonly Instrument[] = [
  ...SYNTH_PRESETS.map((preset): Instrument => ({ kind: 'synth', preset })),
  { kind: 'drums' },
]

export interface PitchRange {
  readonly min: number
  readonly max: number
}

const MIDI_C3 = 48
const MIDI_B5 = 83

export const MELODIC_PITCH_RANGE: PitchRange = { min: MIDI_C3, max: MIDI_B5 }
export const DRUM_PITCH_RANGE: PitchRange = { min: 0, max: DRUM_VOICES.length - 1 }

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const SEMITONES_PER_OCTAVE = NOTE_NAMES.length
const MIDI_OCTAVE_OFFSET = 1

function noteName(pitch: number): string {
  return NOTE_NAMES[pitch % SEMITONES_PER_OCTAVE] ?? ''
}

export function isSharpPitch(instrument: Instrument, pitch: number): boolean {
  return instrument.kind !== 'drums' && noteName(pitch).endsWith('#')
}

export function pitchLabel(instrument: Instrument, pitch: number): string {
  if (instrument.kind === 'drums') {
    const voice = DRUM_VOICES[pitch]
    return voice ? t(`instruments.${voice}`) : ''
  }
  const octave = Math.floor(pitch / SEMITONES_PER_OCTAVE) - MIDI_OCTAVE_OFFSET
  return `${noteName(pitch)}${octave}`
}

export function pitchesFor(instrument: Instrument): readonly number[] {
  const { min, max } = pitchRangeFor(instrument)
  return Array.from({ length: max - min + 1 }, (_, index) => max - index)
}

export function pitchRangeFor(instrument: Instrument): PitchRange {
  return instrument.kind === 'drums' ? DRUM_PITCH_RANGE : MELODIC_PITCH_RANGE
}

export function instrumentLabel(instrument: Instrument): string {
  switch (instrument.kind) {
    case 'synth':
      return t(`instruments.${instrument.preset}`)
    case 'drums':
      return t('instruments.drums')
    case 'sample':
      return t('instruments.sample')
  }
}
