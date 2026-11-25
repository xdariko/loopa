import { applyEnvelope, type Envelope } from '../envelope'
import { midiToFrequency } from '../pitch'
import type { AudioInstrument, NoteEvent, Voice } from '../types'
import { createVoice } from '../voice'

// синтез звука одной нотой с помощью осцилляторов и фильтров
// осцилляторы генерируют волны, фильтр меняет тембр, а усилитель задаёт, как звук набирает громкость и затухает

const SEMITONES_PER_OCTAVE = 12

// настройки синтеза звука для одного инструмента
export interface SynthVoicing {
  readonly waveform: OscillatorType // тип волны, которую генерируют осцилляторы
  readonly detuneCents: readonly number[] // отклонения частоты
  readonly octaveShift: number // смещение октавы
  readonly cutoff: number // частота среза фильтра
  readonly resonance: number // резонанс фильтра. влияет на тембр, чем выше, тем более звонкий звук
  readonly envelope: Envelope // ADSR определяют, как усиление меняется в ходе ноты
  readonly level: number
}

// класс синтещатора
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

    const frequency = midiToFrequency(note.pitch + voicing.octaveShift * SEMITONES_PER_OCTAVE) // вычисляем частоту ноты с учётом смещения октавы
    // создаём осцилляторы для каждого отклонения частоты и подключаем их к фильтру
    const oscillators = voicing.detuneCents.map((cents) => {
      const oscillator = context.createOscillator() // создаём генератор звуковой волны

      // передаем настройки, направляем сигнал в фильтр и планируем запуск
      oscillator.type = voicing.waveform
      oscillator.frequency.value = frequency
      oscillator.detune.value = cents
      oscillator.connect(filter)
      oscillator.start(note.time)
      return oscillator
    })

    // вычисляем пиковую громкость для каждого осциллятора и применяем ADSR к усилителю
    const peak = voicing.level / oscillators.length
    const endTime = applyEnvelope(amplifier.gain, voicing.envelope, peak, note.time, note.time + note.duration)
    return createVoice(oscillators, amplifier, endTime)
  }
}
