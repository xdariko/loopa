import { t } from '@/i18n'

import type { Track } from '@/domain/types'

import { TrackChannel } from './channel'
import { EffectsBus } from './effects'
import { readSampleFile, SampleFileError } from './sampleFile'
import { SPECTRUM_FFT_SIZE } from './spectrum'
import type { NoteEvent, Voice } from './types'
import { SILENT_VOICE } from './voice'

const MASTER_LEVEL = 0.8

interface AudioGraph {
  readonly context: AudioContext
  readonly master: GainNode
  readonly effects: EffectsBus
  readonly analyser: AnalyserNode
}

export class AudioEngine {
  private graph: AudioGraph | null = null
  private tracks: readonly Track[] = []
  private delaySeconds = 0
  private readonly channels = new Map<string, TrackChannel>()
  private readonly voices = new Set<Voice>()
  private readonly samples = new Map<string, { file: File; buffer: AudioBuffer }>()

  constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}

  get currentTime(): number {
    return this.graph?.context.currentTime ?? 0
  }

  get audibleTime(): number {
    const context = this.graph?.context
    if (!context) {
      return 0
    }
    const latency = (context.baseLatency ?? 0) + (context.outputLatency ?? 0)
    return context.currentTime - latency
  }

  async resume(): Promise<void> {
    const graph = this.ensureGraph()
    await graph.context.resume()
  }

  syncTracks(tracks: readonly Track[]): void {
    this.tracks = tracks
    if (this.graph) {
      this.applyTracks(this.graph)
    }
  }

  setDelayTime(seconds: number): void {
    this.delaySeconds = seconds
    this.graph?.effects.setDelayTime(seconds)
  }

  playNote(trackId: string, note: NoteEvent): Voice {
    const channel = this.channels.get(trackId)
    if (!channel) {
      return SILENT_VOICE
    }
    this.forgetFinishedVoices()
    const voice = channel.play(note)
    if (voice !== SILENT_VOICE) {
      this.voices.add(voice)
    }
    return voice
  }

  async importSample(file: File, signal: AbortSignal): Promise<string> {
    const id = crypto.randomUUID()
    await this.restoreSample(id, file, signal)
    return id
  }

  async restoreSample(id: string, file: File, signal: AbortSignal): Promise<void> {
    const bytes = await readSampleFile(file)
    signal.throwIfAborted()

    let buffer: AudioBuffer
    try {
      buffer = await this.ensureGraph().context.decodeAudioData(bytes)
    } catch {
      throw new SampleFileError(
        t('samples.decodeFailed'),
      )
    }
    signal.throwIfAborted()
    this.samples.set(id, { file, buffer })
  }

  getSampleFile(sampleId: string): File | undefined {
    return this.samples.get(sampleId)?.file
  }

  readSpectrum(target: Uint8Array<ArrayBuffer>): void {
    if (this.graph) {
      this.graph.analyser.getByteFrequencyData(target)
    } else {
      target.fill(0)
    }
  }

  stopAll(): void {
    const now = this.currentTime
    this.voices.forEach((voice) => voice.stop(now))
    this.voices.clear()
  }

  private ensureGraph(): AudioGraph {
    if (this.graph) {
      return this.graph
    }
    const context = this.createContext()
    const master = context.createGain()
    master.gain.value = MASTER_LEVEL
    master.connect(context.destination)
    const analyser = context.createAnalyser()
    analyser.fftSize = SPECTRUM_FFT_SIZE
    master.connect(analyser)
    const effects = new EffectsBus(context, master)
    effects.setDelayTime(this.delaySeconds)
    this.graph = { context, master, effects, analyser }
    this.applyTracks(this.graph)
    return this.graph
  }

  private applyTracks(graph: AudioGraph): void {
    const trackIds = new Set(this.tracks.map((track) => track.id))
    this.channels.forEach((channel, trackId) => {
      if (!trackIds.has(trackId)) {
        channel.disconnect()
        this.channels.delete(trackId)
      }
    })
    this.tracks.forEach((track) => {
      const channel = this.channels.get(track.id)
      if (channel) {
        channel.update(track)
      } else {
        this.channels.set(
          track.id,
          new TrackChannel(
            graph.context,
            track,
            graph.master,
            graph.effects,
            (id) => this.samples.get(id)?.buffer,
          ),
        )
      }
    })
  }

  private forgetFinishedVoices(): void {
    const now = this.currentTime
    this.voices.forEach((voice) => {
      if (voice.endTime < now) {
        this.voices.delete(voice)
      }
    })
  }
}

let sharedEngine: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  sharedEngine ??= new AudioEngine()
  return sharedEngine
}
