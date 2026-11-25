const MIDI_A4 = 69
const FREQUENCY_A4 = 440
const SEMITONES_PER_OCTAVE = 12

// переводит MIDI-номер ноты в частоту в герцах
export function midiToFrequency(pitch: number): number {
  return FREQUENCY_A4 * 2 ** ((pitch - MIDI_A4) / SEMITONES_PER_OCTAVE)
}
