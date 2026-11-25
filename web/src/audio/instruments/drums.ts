import { DRUM_VOICES, type DrumVoice } from '@/domain/instruments'

import { SILENCE } from '../envelope'
import type { AudioInstrument, NoteEvent, Voice } from '../types'
import { createVoice, SILENT_VOICE } from '../voice'

// синтез трех ударных (кик, снейр и хет) через webaudio

const NOISE_SECONDS = 1

// общие данные для синтеза одного удара
interface DrumHit {
  readonly context: BaseAudioContext
  readonly noise: AudioBuffer
  readonly time: number
  readonly output: AudioNode
}

type DrumSynthesis = (hit: DrumHit) => Voice

// регулятор громкости, который экспоненциально затухает за заданное время
function decayingGain(context: BaseAudioContext, peak: number, start: number, length: number) {
  const gain = context.createGain()
  // удар сразу начинается с пика и экспоненциально затухает
  gain.gain.setValueAtTime(peak, start)
  gain.gain.exponentialRampToValueAtTime(SILENCE, start + length)
  return gain
}

// источник шума для снейра и хета. фильтруем шум и направляем в усилитель своей ветки
function noiseSource(hit: DrumHit, filterType: BiquadFilterType, cutoff: number, gain: GainNode) {
  const source = hit.context.createBufferSource() // создаем проигрыватель
  source.buffer = hit.noise // используем заранее сгенерированный шум

  // фильтруем шум, чтобы получить нужный тембр
  const filter = hit.context.createBiquadFilter() 
  filter.type = filterType
  filter.frequency.value = cutoff

  // направляем шум через фильтр
  source.connect(filter).connect(gain)

  // планируем запуск источника
  source.start(hit.time)
  return source
}

// частоты в герцах, времена в секундах, level коэфф усиления
const KICK = { startFrequency: 150, endFrequency: 45, sweep: 0.12, length: 0.4, level: 1 }
const SNARE = { cutoff: 1000, noiseLevel: 0.7, length: 0.2, tone: 180, toneLevel: 0.4 }
const HAT = { cutoff: 7000, level: 0.35, length: 0.05 }
export const MAX_DRUM_DURATION = Math.max(KICK.length, SNARE.length, HAT.length)

// таблица из функций синтеза ударов, возвращают Voice
const DRUM_SYNTHESIS: Readonly<Record<DrumVoice, DrumSynthesis>> = {
  kick: ({ context, time, output }) => {
    const amplifier = decayingGain(context, KICK.level, time, KICK.length)
    const oscillator = context.createOscillator()
    oscillator.frequency.setValueAtTime(KICK.startFrequency, time)
    oscillator.frequency.exponentialRampToValueAtTime(KICK.endFrequency, time + KICK.sweep)
    oscillator.connect(amplifier).connect(output)
    oscillator.start(time)
    return createVoice([oscillator], amplifier, time + KICK.length)
  },

  snare: (hit) => {
    const { context, time, output } = hit
    const amplifier = context.createGain()
    amplifier.connect(output)
    const noiseGain = decayingGain(context, SNARE.noiseLevel, time, SNARE.length)
    noiseGain.connect(amplifier)
    const toneGain = decayingGain(context, SNARE.toneLevel, time, SNARE.length / 2)
    toneGain.connect(amplifier)
    const tone = context.createOscillator()
    tone.type = 'triangle'
    tone.frequency.value = SNARE.tone
    tone.connect(toneGain)
    tone.start(time)
    const noise = noiseSource(hit, 'highpass', SNARE.cutoff, noiseGain)
    return createVoice([noise, tone], amplifier, time + SNARE.length)
  },
  
  hat: (hit) => {
    const amplifier = decayingGain(hit.context, HAT.level, hit.time, HAT.length)
    amplifier.connect(hit.output)
    const noise = noiseSource(hit, 'highpass', HAT.cutoff, amplifier)
    return createVoice([noise], amplifier, hit.time + HAT.length)
  },
}

// генерация секунды белого шума
function createNoise(context: BaseAudioContext): AudioBuffer {
  const length = Math.round(context.sampleRate * NOISE_SECONDS)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) {
    samples[index] = Math.random() * 2 - 1
  }
  return buffer
}

// инструмент ударных, принимает ноту с сетки и определяет какой удар играть
export class DrumKit implements AudioInstrument {
  private readonly noise: AudioBuffer

  constructor(private readonly context: BaseAudioContext) {
    this.noise = createNoise(context)
  }

  play(note: NoteEvent, output: AudioNode): Voice {
    // pitch здесь индекс ряда ударных: 0 — кик 1 — снеир 2 — хет
    // из ноты берём время начала, а длительность звука задаёт рецепт удара
    const voice = DRUM_VOICES[note.pitch]
    if (!voice) {
      return SILENT_VOICE
    }
    return DRUM_SYNTHESIS[voice]({
      context: this.context,
      noise: this.noise,
      time: note.time,
      output,
    })
  }
}
