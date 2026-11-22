import { onScopeDispose, shallowRef, type Ref } from 'vue'

export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const matches = shallowRef(false)
  if (typeof window.matchMedia !== 'function') {
    return matches
  }
  const list = window.matchMedia(query)
  matches.value = list.matches

  function update(event: MediaQueryListEvent): void {
    matches.value = event.matches
  }

  list.addEventListener('change', update)
  onScopeDispose(() => list.removeEventListener('change', update))
  return matches
}
