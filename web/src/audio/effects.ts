const DELAY_FEEDBACK = 0.35
const MAX_DELAY_SECONDS = 2
const REVERB_SECONDS = 2
const REVERB_DECAY_POWER = 3
const STEREO_CHANNELS = 2

function createImpulse(context: BaseAudioContext): AudioBuffer {
  const length = Math.round(context.sampleRate * REVERB_SECONDS)
  const impulse = context.createBuffer(STEREO_CHANNELS, length, context.sampleRate)
  for (let channel = 0; channel < STEREO_CHANNELS; channel += 1) {
    const samples = impulse.getChannelData(channel)
    for (let index = 0; index < length; index += 1) {
      samples[index] = (Math.random() * 2 - 1) * (1 - index / length) ** REVERB_DECAY_POWER
    }
  }
  return impulse
}

export class EffectsBus {
  readonly delayInput: GainNode
  readonly reverbInput: GainNode
  private readonly delay: DelayNode

  constructor(context: BaseAudioContext, output: AudioNode) {
    this.delayInput = context.createGain()
    this.delay = context.createDelay(MAX_DELAY_SECONDS)
    const feedback = context.createGain()
    feedback.gain.value = DELAY_FEEDBACK
    this.delayInput.connect(this.delay)
    this.delay.connect(feedback).connect(this.delay)
    this.delay.connect(output)

    this.reverbInput = context.createGain()
    const reverb = context.createConvolver()
    reverb.buffer = createImpulse(context)
    this.reverbInput.connect(reverb).connect(output)
  }

  setDelayTime(seconds: number): void {
    this.delay.delayTime.value = Math.min(seconds, MAX_DELAY_SECONDS)
  }
}
