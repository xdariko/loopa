import type { SynthPreset } from '@/domain/instruments'

import type { SynthVoicing } from './synth'

export const SYNTH_VOICINGS: Readonly<Record<SynthPreset, SynthVoicing>> = {
  lead: {
    waveform: 'sawtooth',
    detuneCents: [-6, 6],
    octaveShift: 0,
    cutoff: 3200,
    resonance: 2,
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.12 },
    level: 0.25,
  },
  bass: {
    waveform: 'sawtooth',
    detuneCents: [0],
    octaveShift: -1,
    cutoff: 700,
    resonance: 4,
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.08 },
    level: 0.35,
  },
  keys: {
    waveform: 'triangle',
    detuneCents: [0, 4],
    octaveShift: 0,
    cutoff: 5000,
    resonance: 1,
    envelope: { attack: 0.005, decay: 0.4, sustain: 0.3, release: 0.3 },
    level: 0.3,
  },
  pad: {
    waveform: 'sawtooth',
    detuneCents: [-12, 0, 12],
    octaveShift: 0,
    cutoff: 1500,
    resonance: 1,
    envelope: { attack: 0.4, decay: 0.5, sustain: 0.8, release: 0.8 },
    level: 0.18,
  },
}
