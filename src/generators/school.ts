import type { Level, TaskDisplay } from '../types.ts'
import type { Rng } from './rng.ts'
import { withOptions, type Draft, type Maker } from './util.ts'

/**
 * Вопрос по фактам школьной программы: правильный ответ, неверные варианты
 * и объяснение. Если вместо вариантов задано число n — ответ вводится числом.
 */
export interface Fact {
  q: string
  a?: string
  w?: string[]
  n?: number
  why: string
  hint?: string
  display?: TaskDisplay
}

/** Генератор по банкам фактов для каждого класса (уровень 1 = 7 класс). */
export function factsMaker(banks: Record<Level, Fact[]>, prefix: string, hint = 'Вспомните, что проходили на уроках по этой теме.'): Maker {
  return (level, rng) => {
    const list = banks[level]
    const i = rng.int(0, list.length - 1)
    return factDraft(list[i], rng, `${prefix}:${level}:${i}`, hint)
  }
}

export function factDraft(f: Fact, rng: Rng, key: string, hint: string): Draft {
  const base = { prompt: f.q, hint: f.hint ?? hint, solution: f.why, key, ...(f.display ? { display: f.display } : {}) }
  if (f.n !== undefined) return { kind: 'number', answer: String(f.n), ...base }
  return { kind: 'choice', ...withOptions(f.a!, rng.shuffle(f.w!), rng), ...base }
}

/** Вопрос «что соответствует чему» по таблице пар: берём пару, неверные варианты — из других пар. */
export function pairQuestion<T>(
  rng: Rng,
  items: T[],
  get: (t: T) => string,
  ask: (t: T) => string,
  why: (t: T) => string,
  key: string,
): Draft {
  const t = rng.pick(items)
  const answer = get(t)
  const others = [...new Set(items.map(get).filter((x) => x !== answer))]
  return {
    kind: 'choice',
    prompt: ask(t),
    // Если категорий меньше четырёх (например, три типа связи), вариантов столько, сколько категорий.
    ...withOptions(answer, rng.shuffle(others), rng, Math.min(4, others.length + 1)),
    solution: why(t),
    hint: 'Вспомните, что проходили на уроках по этой теме.',
    key: `${key}:${ask(t)}`,
  }
}
