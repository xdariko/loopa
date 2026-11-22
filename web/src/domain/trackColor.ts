export function trackColor(index: number): string {
  return `hsl(${(225 + index * 137.508) % 360} 58% 73%)`
}
