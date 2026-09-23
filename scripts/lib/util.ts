import type { Level, ModuleId, Task, TaskDisplay, TaskKind } from '../../src/types.ts'
import { createRng, type Rng } from './rng.ts'

/** Черновик задания, который возвращает генератор; id и уровень добавляет collect(). */
export interface Draft {
  kind: TaskKind
  prompt: string
  display?: TaskDisplay
  options?: string[]
  answer: string
  accept?: string[]
  hint?: string
  solution: string
  /** Ключ для отсева повторов внутри модуля. */
  key: string
}

export type Maker = (level: Level, rng: Rng, index: number) => Draft | null

export const LEVELS: Level[] = [1, 2, 3, 4, 5]

/**
 * Собирает задания модуля: для каждого уровня вызывает генератор, пока не
 * наберётся нужное количество уникальных заданий. index — номер следующего
 * задания уровня, по нему генераторы чередуют шаблоны.
 */
export function collect(module: ModuleId, targets: Record<Level, number>, make: Maker): Task[] {
  const tasks: Task[] = []
  const keys = new Set<string>()
  for (const level of LEVELS) {
    const rng = createRng(`${module}:${level}`)
    let made = 0
    let attempts = 0
    let misses = 0
    while (made < targets[level]) {
      if (++attempts > 50000) {
        throw new Error(`${module}: не удалось набрать ${targets[level]} заданий уровня ${level} (есть ${made})`)
      }
      // После неудачи сдвигаем индекс, чтобы исчерпанный шаблон не зацикливал генерацию.
      const draft = make(level, rng, made + Math.floor(misses / 5))
      if (!draft || keys.has(draft.key)) {
        misses++
        continue
      }
      misses = 0
      keys.add(draft.key)
      made++
      const { key, ...rest } = draft
      tasks.push({ id: `${module}-${level}-${String(made).padStart(2, '0')}`, module, level, ...rest })
    }
  }
  return tasks
}

/** Собирает варианты ответа: правильный + первые подходящие отвлекающие, перемешанные. */
export function withOptions(
  correct: string,
  distractors: readonly string[],
  rng: Rng,
  count = 4,
): { options: string[]; answer: string } {
  const picked: string[] = []
  for (const d of distractors) {
    if (d === correct || picked.includes(d)) continue
    picked.push(d)
    if (picked.length === count - 1) break
  }
  if (picked.length < count - 1) throw new Error(`Мало вариантов для ответа «${correct}»`)
  return { options: rng.shuffle([correct, ...picked]), answer: correct }
}

/** Отвлекающие числа рядом с правильным ответом (сначала — переданные «типичные ошибки»). */
export function numberDistractors(correct: number, rng: Rng, typical: number[] = []): string[] {
  const near = rng.shuffle([1, -1, 2, -2, 3, -3, 4, -4, 5, 6, -5, 10, -10]).map((d) => correct + d)
  return [...typical, ...near]
    .filter((n) => Number.isInteger(n) && n !== correct && (correct < 0 || n >= 0))
    .map(String)
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(n) % 10
  const mod100 = Math.abs(n) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} и ${items[items.length - 1]}`
}

export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b)
}

export function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1)
}

export function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}

export function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}

export function digitSum(n: number): number {
  return String(Math.abs(n))
    .split('')
    .reduce((s, d) => s + Number(d), 0)
}

export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()]
  const out: T[][] = []
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)]
    for (const p of permutations(rest)) out.push([item, ...p])
  })
  return out
}

/** «14:05» из минут от полуночи (по модулю суток). */
export function clock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}
