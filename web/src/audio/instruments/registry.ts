import type { Instrument } from '@/domain/instruments'

import type { AudioInstrument } from '../types'
import { DrumKit } from './drums'
import { SampleInstrument, type SampleLookup } from './sample'
import { SynthInstrument } from './synth'
import { SYNTH_VOICINGS } from './synthPresets'

type InstrumentKind = Instrument['kind']

type InstrumentOfKind<Kind extends InstrumentKind> = Extract<Instrument, { kind: Kind }>

type InstrumentFactories = {
  readonly [Kind in InstrumentKind]: (
    context: BaseAudioContext,
    instrument: InstrumentOfKind<Kind>,
    lookup: SampleLookup,
  ) => AudioInstrument
}

const INSTRUMENT_FACTORIES: InstrumentFactories = {
  synth: (context, instrument) => new SynthInstrument(context, SYNTH_VOICINGS[instrument.preset]),
  drums: (context) => new DrumKit(context),
  sample: (context, instrument, lookup) =>
    new SampleInstrument(context, () =>
      instrument.sampleId !== null ? lookup(instrument.sampleId) : undefined,
    ),
}

export function createAudioInstrument<Kind extends InstrumentKind>(
  context: BaseAudioContext,
  instrument: InstrumentOfKind<Kind>,
  lookup: SampleLookup,
): AudioInstrument {
  const factory: InstrumentFactories[Kind] = INSTRUMENT_FACTORIES[instrument.kind]
  return factory(context, instrument, lookup)
}
