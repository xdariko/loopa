import type { Instrument } from '@/domain/instruments'
import type { Track } from '@/domain/types'

import type { EffectsBus } from './effects'
import { createAudioInstrument } from './instruments/registry'
import type { SampleLookup } from './instruments/sample'
import type { AudioInstrument, NoteEvent, Voice } from './types'

// класс отвечающий за проигрывание дорожки
export class TrackChannel {
  private readonly volume: GainNode
  private readonly delaySend: GainNode
  private readonly reverbSend: GainNode
  private instrument: AudioInstrument
  private instrumentSource: Instrument

  constructor(private readonly context: BaseAudioContext, track: Track, output: AudioNode, effects: EffectsBus, private readonly lookupSample: SampleLookup) {
    this.volume = context.createGain()
    this.volume.connect(output)

    this.delaySend = context.createGain()
    this.volume.connect(this.delaySend).connect(effects.delayInput)

    this.reverbSend = context.createGain()
    this.volume.connect(this.reverbSend).connect(effects.reverbInput)

    this.instrumentSource = track.instrument
    this.instrument = createAudioInstrument(context, track.instrument, this.lookupSample)

    this.update(track)
  }

  update(track: Track): void {
    this.volume.gain.value = track.muted ? 0 : track.volume
    this.delaySend.gain.value = track.effects.delay
    this.reverbSend.gain.value = track.effects.reverb
    if (track.instrument !== this.instrumentSource) {
      this.instrumentSource = track.instrument
      this.instrument = createAudioInstrument(this.context, track.instrument, this.lookupSample)
    }
  }

  play(note: NoteEvent): Voice {
    return this.instrument.play(note, this.volume)
  }

  disconnect(): void {
    this.volume.disconnect()
    this.delaySend.disconnect()
    this.reverbSend.disconnect()
  }
}
