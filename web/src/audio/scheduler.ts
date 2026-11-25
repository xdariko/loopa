import { STEPS_PER_BEAT } from '@/domain/constants'

// тут все для планировщика шагов муз сетки

const SECONDS_PER_MINUTE = 60
const SWING_TRIPLET_DELAY = 1 / 3

// планируем примерно на 100 мс вперёд и пополняем расписание каждые 25 мс
export const LOOKAHEAD_SECONDS = 0.1
export const TICK_INTERVAL_MS = 25

// запас между запуском планировщика и первым шагом после Play.
export const START_DELAY_SECONDS = 0.05

// интервал между повторами эха в шагах
export const DELAY_STEPS = 3

export interface Tempo {
  readonly bpm: number
  readonly swing: number
}

export interface ScheduledStep {
  readonly step: number
  readonly time: number
  readonly stepDuration: number
}

export interface SchedulerOptions {
  // текущее время по часам AudioContext
  readonly now: () => number
  // читаем темп и длину цикла при планировании очередных шагов
  readonly tempo: () => Tempo
  readonly loopLength: () => number
  // передаём шаг сразу. получатель заранее ставит ноты в расписание Web Audio
  readonly onStep: (step: ScheduledStep) => void
}

export function stepDuration(bpm: number): number {
  return SECONDS_PER_MINUTE / bpm / STEPS_PER_BEAT
}

export function swingDelay(step: number, swing: number, duration: number): number {
  // сдвигаем нечётный шаг максимум на треть его базовой длительности
  const isOffbeat = step % 2 === 1
  return isOffbeat ? swing * SWING_TRIPLET_DELAY * duration : 0
}

// каждый вызов создаёт планировщик со своим таймером и позицией в цикле
export function createScheduler(options: SchedulerOptions) {
  let timer: ReturnType<typeof setInterval> | null = null
  // индекс следующего шага и его время на ровной сетке, до поправки на swing
  let nextStep = 0
  let nextStepTime = 0

  function tick(): void {
    // сравниваем с горизонтом базовое время шага, до сдвига swing
    const horizon = options.now() + LOOKAHEAD_SECONDS
    while (nextStepTime < horizon) {
      const { bpm, swing } = options.tempo()
      const duration = stepDuration(bpm)
      const step = nextStep % options.loopLength()
      options.onStep({ step, time: nextStepTime + swingDelay(step, swing, duration), stepDuration: duration})
      // после последнего шага начинаем цикл заново
      nextStep = (step + 1) % options.loopLength()
      nextStepTime += duration
    }
  }

  function start(): void {
    if (timer !== null) {
      return
    }
    nextStepTime = options.now() + START_DELAY_SECONDS
    // сразу заполняем первое окно, затем продолжаем по таймеру
    tick()
    timer = setInterval(tick, TICK_INTERVAL_MS)
  }

  function stop(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function reset(): void {
    nextStep = 0
  }

  return { start, stop, reset }
}
