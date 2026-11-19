import type { Instrument } from '@/domain/instruments'

import type { AudioInstrument } from '../types'
import { SILENT_VOICE } from '../voice'
import { DrumKit } from './drums'
import { SynthInstrument } from './synth'
import { SYNTH_VOICINGS } from './synthPresets'

type InstrumentKind = Instrument['kind']

type InstrumentOfKind<Kind extends InstrumentKind> = Extract<Instrument, { kind: Kind }>

type InstrumentFactories = {
  readonly [Kind in InstrumentKind]: (
    context: BaseAudioContext,
    instrument: InstrumentOfKind<Kind>,
  ) => AudioInstrument
}

const silentInstrument: AudioInstrument = { play: () => SILENT_VOICE }

const INSTRUMENT_FACTORIES: InstrumentFactories = {
  synth: (context, instrument) => new SynthInstrument(context, SYNTH_VOICINGS[instrument.preset]),
  drums: (context) => new DrumKit(context),
  sample: () => silentInstrument,
}

export function createAudioInstrument<Kind extends InstrumentKind>(
  context: BaseAudioContext,
  instrument: InstrumentOfKind<Kind>,
): AudioInstrument {
  const factory: InstrumentFactories[Kind] = INSTRUMENT_FACTORIES[instrument.kind]
  return factory(context, instrument)
}
