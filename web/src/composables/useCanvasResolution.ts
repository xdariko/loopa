import { onMounted, onScopeDispose, type Ref } from 'vue'

export function useCanvasResolution(
  canvas: Readonly<Ref<HTMLCanvasElement | null>>,
  onResize: () => void,
): void {
  let observer: ResizeObserver | null = null

  function fitToDisplay(element: HTMLCanvasElement): void {
    const scale = window.devicePixelRatio
    const { width, height } = element.getBoundingClientRect()
    element.width = Math.round(width * scale)
    element.height = Math.round(height * scale)
    onResize()
  }

  onMounted(() => {
    const element = canvas.value
    if (!element) {
      return
    }
    observer = new ResizeObserver(() => fitToDisplay(element))
    observer.observe(element)
  })

  onScopeDispose(() => observer?.disconnect())
}
