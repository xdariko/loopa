const TRACK_COLORS = [
  '#8995ed',
  '#e88b78',
  '#58bca6',
  '#bd91d6',
  '#d8ac5c',
  '#64add2',
  '#d986a9',
  '#9bb66c',
] as const

export function trackColor(index: number): string {
  return TRACK_COLORS[index % TRACK_COLORS.length] ?? TRACK_COLORS[0]
}
