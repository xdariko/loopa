import { STEPS_PER_BAR } from '@/domain/constants'
import type { Project } from '@/domain/types'

import { patternInBar, toNoteEvent } from './arrangement'
import { TrackChannel } from './channel'
import { EffectsBus, effectTailSeconds } from './effects'
import { MASTER_LEVEL, getAudioEngine } from './engine'
import { MAX_DRUM_DURATION } from './instruments/drums'
import { SYNTH_VOICINGS } from './instruments/synthPresets'
import { DELAY_STEPS, stepDuration, swingDelay } from './scheduler'
import { SILENT_VOICE } from './voice'

const SAMPLE_RATE = 44100
const CHANNELS = 2
const BITS_PER_SAMPLE = 16
const BYTES_PER_FRAME = (CHANNELS * BITS_PER_SAMPLE) / 8
const WAV_HEADER_BYTES = 44
const MAX_VOICE_TAIL = Math.max(
  MAX_DRUM_DURATION,
  ...Object.values(SYNTH_VOICINGS).map(({ envelope }) => envelope.release),
)


export async function renderArrangementWav(project: Project, trackId?: string): Promise<Blob> {
  // выбирает какие дорожки экспортировать и сколько места выделить
  const { arrangement, bpm, swing } = project
  const tracks = project.tracks.filter(
    (track) => (trackId === undefined || track.id === trackId) && !track.muted && track.volume > 0,
  )
  const duration = stepDuration(bpm)
  const delay = duration * DELAY_STEPS
  const arrangementEnd = arrangement.barCount * STEPS_PER_BAR * duration
  const tails = tracks.map(({ effects }) => effectTailSeconds(delay, effects.delay, effects.reverb))
  const maxEnd = arrangementEnd + swingDelay(1, swing, duration) + MAX_VOICE_TAIL + Math.max(0, ...tails)

  const maxFrames = Math.ceil(maxEnd * SAMPLE_RATE)
  if (maxFrames * BYTES_PER_FRAME + WAV_HEADER_BYTES - 8 > 0xffffffff) {
    throw new RangeError('Arrangement exceeds the WAV size limit')
  }

  // создаёт граф и заранее расставляет ноты по времени
  const context = new OfflineAudioContext(CHANNELS, maxFrames, SAMPLE_RATE)

  const master = context.createGain()
  master.gain.value = MASTER_LEVEL
  master.connect(context.destination)

  const effects = new EffectsBus(context, master)
  effects.setDelayTime(delay)

  const engine = getAudioEngine()
  let endTime = arrangementEnd

  tracks.forEach((track, index) => {
    const channel = new TrackChannel(context, track, master, effects, (id) =>
      engine.getSampleBuffer(id),
    )
    const tail = tails[index]!
    for (let bar = 0; bar < arrangement.barCount; bar += 1) {
      const pattern = patternInBar(track, arrangement, bar)
      for (const note of pattern?.notes ?? []) {
        if (note.step >= STEPS_PER_BAR) {
          continue
        }
        const time =
          (bar * STEPS_PER_BAR + note.step) * duration + swingDelay(note.step, swing, duration)
        const event = toNoteEvent(
          note,
          { step: note.step, time, stepDuration: duration },
          STEPS_PER_BAR - note.step,
        )
        const voice = channel.play(event)
        if (voice !== SILENT_VOICE) {
          endTime = Math.max(endTime, voice.endTime + tail)
        }
      }
    }
  })

  // просчитывает звук и записывает WAV
  const rendered = await context.startRendering()
  return encodeWav(rendered, Math.min(rendered.length, Math.ceil(endTime * SAMPLE_RATE)))
}

function encodeWav(buffer: AudioBuffer, frames: number): Blob {
  const dataBytes = frames * BYTES_PER_FRAME
  const bytes = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes)
  const wav = new DataView(bytes)
  wav.setUint32(0, 0x52494646) // RIFF
  wav.setUint32(4, bytes.byteLength - 8, true)
  wav.setUint32(8, 0x57415645) // WAVE
  wav.setUint32(12, 0x666d7420) // fmt
  wav.setUint32(16, 16, true)
  wav.setUint16(20, 1, true) // PCM
  wav.setUint16(22, CHANNELS, true)
  wav.setUint32(24, buffer.sampleRate, true)
  wav.setUint32(28, buffer.sampleRate * BYTES_PER_FRAME, true)
  wav.setUint16(32, BYTES_PER_FRAME, true)
  wav.setUint16(34, BITS_PER_SAMPLE, true)
  wav.setUint32(36, 0x64617461) // data
  wav.setUint32(40, dataBytes, true)

  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  for (let frame = 0; frame < frames; frame += 1) {
    const offset = WAV_HEADER_BYTES + frame * BYTES_PER_FRAME
    wav.setInt16(offset, pcm16(left[frame]!), true)
    wav.setInt16(offset + 2, pcm16(right[frame]!), true)
  }
  return new Blob([bytes], { type: 'audio/wav' })
}

function pcm16(sample: number): number {
  return Math.round(Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767))
}
