/** Детерминированный генератор случайных чисел: одни и те же задания при каждой сборке. */

export interface Rng {
  next(): number
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
  sample<T>(items: readonly T[], count: number): T[]
  chance(p: number): boolean
}

export function hashString(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function createRng(seed: string): Rng {
  let state = hashString(seed) || 1
  const next = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = items.slice()
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  return {
    next,
    int,
    pick: (items) => items[Math.floor(next() * items.length)],
    shuffle,
    sample: (items, count) => shuffle(items).slice(0, count),
    chance: (p) => next() < p,
  }
}
