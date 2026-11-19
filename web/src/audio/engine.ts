import type { Track } from '@/domain/types'

import { TrackChannel } from './channel'
import { EffectsBus } from './effects'
import type { NoteEvent, Voice } from './types'

const MASTER_LEVEL = 0.8

interface AudioGraph {
  readonly context: AudioContext
  readonly master: GainNode
  readonly effects: EffectsBus
}

export class AudioEngine {
  private graph: AudioGraph | null = null
  private tracks: readonly Track[] = []
  private delaySeconds = 0
  private readonly channels = new Map<string, TrackChannel>()
  private readonly voices = new Set<Voice>()

  constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}

  get currentTime(): number {
    return this.graph?.context.currentTime ?? 0
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

  playNote(trackId: string, note: NoteEvent): void {
    const channel = this.channels.get(trackId)
    if (!channel) {
      return
    }
    this.forgetFinishedVoices()
    this.voices.add(channel.play(note))
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
    const effects = new EffectsBus(context, master)
    effects.setDelayTime(this.delaySeconds)
    this.graph = { context, master, effects }
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
          new TrackChannel(graph.context, track, graph.master, graph.effects),
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
