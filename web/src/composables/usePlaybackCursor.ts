import { inject, provide, shallowRef, watch, type InjectionKey, type Ref } from 'vue'

import { IDLE_SNAPSHOT, type TimelineSnapshot } from '@/audio/timeline'

import { useAnimationFrame } from './useAnimationFrame'

export interface PlaybackCursor {
  readonly position: Readonly<Ref<number | null>>
  readonly bar: Readonly<Ref<number | null>>
  readonly patterns: Readonly<Ref<ReadonlyMap<string, string>>>
  readonly playingNoteIds: Readonly<Ref<ReadonlySet<string>>>
}

export interface PlaybackCursorOptions {
  readonly active: () => boolean
  readonly sample: () => TimelineSnapshot
}

const playbackCursorKey: InjectionKey<PlaybackCursor> = Symbol('playbackCursor')

const IDLE_CURSOR: PlaybackCursor = {
  position: shallowRef(null),
  bar: shallowRef(null),
  patterns: shallowRef(IDLE_SNAPSHOT.patterns),
  playingNoteIds: shallowRef(IDLE_SNAPSHOT.soundingNoteIds),
}

function haveSameIds(first: ReadonlySet<string>, second: ReadonlySet<string>): boolean {
  return first.size === second.size && [...first].every((id) => second.has(id))
}

export function usePlaybackCursor(options: PlaybackCursorOptions): PlaybackCursor {
  const position = shallowRef<number | null>(null)
  const bar = shallowRef<number | null>(null)
  const patterns = shallowRef(IDLE_SNAPSHOT.patterns)
  const playingNoteIds = shallowRef<ReadonlySet<string>>(IDLE_SNAPSHOT.soundingNoteIds)

  function show(snapshot: TimelineSnapshot): void {
    position.value = snapshot.position
    bar.value = snapshot.bar
    const current = patterns.value
    if (
      current.size !== snapshot.patterns.size ||
      [...snapshot.patterns].some(([track, pattern]) => current.get(track) !== pattern)
    ) {
      patterns.value = snapshot.patterns
    }
    if (!haveSameIds(playingNoteIds.value, snapshot.soundingNoteIds)) {
      playingNoteIds.value = snapshot.soundingNoteIds
    }
  }

  useAnimationFrame(() => show(options.sample()), options.active)

  watch(options.active, (isActive) => {
    if (!isActive) {
      show(IDLE_SNAPSHOT)
    }
  })

  return { position, bar, patterns, playingNoteIds }
}

export function providePlaybackCursor(cursor: PlaybackCursor): void {
  provide(playbackCursorKey, cursor)
}

export function injectPlaybackCursor(): PlaybackCursor {
  return inject(playbackCursorKey, IDLE_CURSOR)
}
