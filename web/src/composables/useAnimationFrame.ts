import { onScopeDispose, watch } from 'vue'

export function useAnimationFrame(onFrame: () => void, active: () => boolean): void {
  let frame: number | null = null

  function loop(): void {
    frame = requestAnimationFrame(loop)
    onFrame()
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
