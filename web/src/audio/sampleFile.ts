import { t } from '@/i18n'

export const SAMPLE_FILE_ACCEPT = '.wav,.mp3,audio/wav,audio/mpeg'
const MAX_SAMPLE_BYTES = 5 * 1024 * 1024
const WAV_HEADER_LENGTH = 12
const MIN_MP3_FRAME_HEADER_LENGTH = 4
const ID3_HEADER_LENGTH = 10

export class SampleFileError extends Error {}

function matchesTag(bytes: Uint8Array, offset: number, tag: string): boolean {
  return Array.from(tag).every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  )
}

function isWav(bytes: Uint8Array): boolean {
  return (
    bytes.length >= WAV_HEADER_LENGTH &&
    (matchesTag(bytes, 0, 'RIFF') || matchesTag(bytes, 0, 'RF64')) &&
    matchesTag(bytes, 8, 'WAVE')
  )
}

function isMp3(bytes: Uint8Array): boolean {
  let offset = 0
  while (matchesTag(bytes, offset, 'ID3')) {
    const header = bytes.subarray(offset, offset + ID3_HEADER_LENGTH)
    const size = header.subarray(6)
    if (header.length < ID3_HEADER_LENGTH || size.some((byte) => byte >= 0x80)) {
      return false
    }
    const hasFooter = header[3] === 4 && (header[5]! & 0x10) !== 0
    offset += ID3_HEADER_LENGTH + size.reduce((length, byte) => length * 128 + byte, 0)
    if (hasFooter) {
      offset += ID3_HEADER_LENGTH
    }
  }
  const [sync, layer, bitrate] = bytes.subarray(offset, offset + MIN_MP3_FRAME_HEADER_LENGTH)
  return (
    bytes.length - offset >= MIN_MP3_FRAME_HEADER_LENGTH &&
    sync === 0xff &&
    layer !== undefined &&
    bitrate !== undefined &&
    (layer & 0xe6) === 0xe2 &&
    (layer & 0x18) !== 0x08 &&
    (bitrate & 0xf0) !== 0xf0 &&
    (bitrate & 0x0c) !== 0x0c
  )
}

export async function readSampleFile(file: File): Promise<ArrayBuffer> {
  if (file.size === 0) {
    throw new SampleFileError(t('samples.empty'))
  }
  if (file.size > MAX_SAMPLE_BYTES) {
    throw new SampleFileError(t('samples.tooLarge'))
  }

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new SampleFileError(t('samples.readFailed'))
  }
  const bytes = new Uint8Array(buffer)
  if (!isWav(bytes) && !isMp3(bytes)) {
    throw new SampleFileError(t('samples.unsupportedFormat'))
  }
  return buffer
}
