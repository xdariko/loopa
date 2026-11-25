
// что и когда сыграть
export interface NoteEvent {
  readonly pitch: number // MIDI нота, 0-127
  readonly time: number // время начала ноты в секундах
  readonly duration: number // длительность ноты в секундах
}

// как управлять отдельнвм звуком
export interface Voice {
  readonly endTime: number // когда нота закончится
  stop(time: number): void // метод досрочной остановки ноты
}

// у кого просить сыграть
export interface AudioInstrument {
  play(note: NoteEvent, output: AudioNode): Voice // общий метод для проигрывания ноты. output - куда подать звук
}
