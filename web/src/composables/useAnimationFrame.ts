import { onScopeDispose, watch } from 'vue'

export function useAnimationFrame(onFrame: (time: number) => void, active: () => boolean): void {
  let frame: number | null = null

  function loop(time: number): void {
    frame = requestAnimationFrame(loop)
    onFrame(time)
  }

  function start(): void {
    frame ??= requestAnimationFrame(loop)
  }

  function stop(): void {
    if (frame !== null) {
      cancelAnimationFrame(frame)
      frame = null
    }
  }

  watch(active, (isActive) => (isActive ? start() : stop()), { immediate: true })
  onScopeDispose(stop)
}
