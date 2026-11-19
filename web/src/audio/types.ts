export interface NoteEvent {
  readonly pitch: number
  readonly time: number
  readonly duration: number
}

export interface Voice {
  readonly endTime: number
  stop(time: number): void
}

export interface AudioInstrument {
  play(note: NoteEvent, output: AudioNode): Voice
}
