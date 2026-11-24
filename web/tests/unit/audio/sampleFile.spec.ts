import { describe, expect, it, vi } from 'vitest'

import { readSampleFile } from '@/audio/sampleFile'

function fileFor(bytes: Uint8Array<ArrayBuffer>, name: string): File {
  const file = new File([bytes], name)
  file.arrayBuffer = vi.fn<File['arrayBuffer']>(async () => bytes.buffer)
  return file
}

describe('readSampleFile', () => {
  it('recognizes WAV and MP3 contents independently of the filename', async () => {
    const wav = Uint8Array.from('RIFF0000WAVE', (character) => character.charCodeAt(0))
    const mp3 = new Uint8Array([0xff, 0xfb, 0x90, 0])
    const taggedMp3 = new Uint8Array([73, 68, 51, 4, 0, 0, 0, 0, 0, 2, 0, 0, ...mp3])

    await expect(readSampleFile(fileFor(wav, 'sound'))).resolves.toBe(wav.buffer)
    await expect(readSampleFile(fileFor(mp3, 'sound.mp3'))).resolves.toBe(mp3.buffer)
    await expect(readSampleFile(fileFor(taggedMp3, 'tagged.mp3'))).resolves.toBe(taggedMp3.buffer)
  })

  it('rejects other formats and metadata without an MP3 frame', async () => {
    const ogg = Uint8Array.from('OggS', (character) => character.charCodeAt(0))
    const taggedAac = new Uint8Array([73, 68, 51, 4, 0, 0, 0, 0, 0, 0, 0xff, 0xf1, 0x50, 0])
    await expect(readSampleFile(fileFor(ogg, 'renamed.mp3'))).rejects.toThrow(/WAV или MP3/)
    await expect(readSampleFile(fileFor(taggedAac, 'tagged.mp3'))).rejects.toThrow(/WAV или MP3/)
  })

  it('rejects empty and oversized files before reading them', async () => {
    const empty = fileFor(new Uint8Array(), 'empty.wav')
    const large = fileFor(new Uint8Array(5 * 1024 * 1024 + 1), 'large.wav')

    await expect(readSampleFile(empty)).rejects.toThrow(/пуст/)
    await expect(readSampleFile(large)).rejects.toThrow(/5 МБ/)
    expect(empty.arrayBuffer).not.toHaveBeenCalled()
    expect(large.arrayBuffer).not.toHaveBeenCalled()
  })
})
