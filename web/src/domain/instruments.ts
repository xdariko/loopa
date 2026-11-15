export const SYNTH_PRESETS = ['lead', 'bass', 'keys', 'pad'] as const
export type SynthPreset = (typeof SYNTH_PRESETS)[number]

export const DRUM_VOICES = ['kick', 'snare', 'hat'] as const
export type DrumVoice = (typeof DRUM_VOICES)[number]

export type Instrument =
  | { readonly kind: 'synth'; readonly preset: SynthPreset }
  | { readonly kind: 'drums' }
  | { readonly kind: 'sample'; readonly sampleId: string | null }

export interface PitchRange {
  readonly min: number
  readonly max: number
}

const MIDI_C3 = 48
const MIDI_B5 = 83

export const MELODIC_PITCH_RANGE: PitchRange = { min: MIDI_C3, max: MIDI_B5 }
export const DRUM_PITCH_RANGE: PitchRange = { min: 0, max: DRUM_VOICES.length - 1 }

const SYNTH_PRESET_LABELS: Readonly<Record<SynthPreset, string>> = {
  lead: 'Lead',
  bass: 'Bass',
  keys: 'Keys',
  pad: 'Pad',
}

export function pitchRangeFor(instrument: Instrument): PitchRange {
  return instrument.kind === 'drums' ? DRUM_PITCH_RANGE : MELODIC_PITCH_RANGE
}

export function instrumentLabel(instrument: Instrument): string {
  switch (instrument.kind) {
    case 'synth':
      return SYNTH_PRESET_LABELS[instrument.preset]
    case 'drums':
      return 'Drums'
    case 'sample':
      return 'Sample'
  }
}
