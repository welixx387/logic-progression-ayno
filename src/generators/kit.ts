import type { Level, TaskDisplay } from '../types.ts'
import type { Rng } from './rng.ts'
import { withOptions, type Draft, type Maker } from './util.ts'

/**
 * Общие заготовки для тем: вопросы «к какому типу относится»,
 * задания на память и числовые задачи с разбором по шагам.
 */

/** Раскрывает варианты вида [утро|вечер|ночь]: выбирает один случайно. Возвращает текст и выбор (для ключа). */
export function vary(rng: Rng, text: string): { text: string; pick: string } {
  const picks: number[] = []
  const out = text.replace(/\[([^\[\]]+)\]/g, (_, body: string) => {
    const parts = body.split('|')
    const i = rng.int(0, parts.length - 1)
    picks.push(i)
    return parts[i]
  })
  return { text: out, pick: picks.join('.') }
}

export interface Kind {
  /** Название типа — оно же вариант ответа. */
  name: string
  /** Определение: показывается в разборе вариантов и в словаре темы. */
  def: string
}

export interface Example {
  /** Пример; может содержать варианты [a|b]. */
  text: string
  /** Название типа из списка kinds. */
  kind: string
  /** Почему это именно этот тип. */
  why: string
  /** Сложность примера: 1 — очевидный, 3 — тонкий. */
  d?: 1 | 2 | 3
}

export interface ClassifyConfig {
  kinds: Kind[]
  examples: Example[]
  /** Вопрос о примере: «Какое искажение мышления в этой фразе?» */
  ask: string
  /** Обратный вопрос: «Какая фраза — пример катастрофизации?» (по названию типа). */
  askReverse: (kind: string) => string
  /** Как показывать пример: как цитату в условии или в диалоге. */
  quote?: (text: string) => { prompt?: string; display?: TaskDisplay }
  hint?: string
  /** Номер раздела теории для задач темы. */
  ref?: number
}

/** Словарь темы из списка типов. */
export const glossaryOf = (kinds: Kind[]) => Object.fromEntries(kinds.map((k) => [k.name, k.def]))

const lowerFirst = (s: string) => (/^[А-ЯЁA-Z][а-яёa-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s)

/**
 * Задачи на распознавание типа по примеру. Уровни:
 * 1 — очевидные примеры и 3 варианта, 2 — 4 варианта, 3 — обратный вопрос
 * (найти пример нужного типа), 4 — тонкие примеры и 4 варианта, 5 — тонкие
 * примеры и все типы (до 5 вариантов) или обратный вопрос с тонкими примерами.
 */
export function classifyMaker(c: ClassifyConfig): Maker {
  const byName = new Map(c.kinds.map((k) => [k.name, k]))
  for (const e of c.examples) if (!byName.has(e.kind)) throw new Error(`Нет типа «${e.kind}»`)
  const pool = (level: Level) => {
    const d = (e: Example) => e.d ?? 2
    if (level === 1) return c.examples.filter((e) => d(e) === 1)
    if (level === 2) return c.examples.filter((e) => d(e) <= 2)
    if (level === 3) return c.examples.filter((e) => d(e) <= 2)
    return c.examples.filter((e) => d(e) >= 2)
  }
  const kindNote = (name: string) => byName.get(name)!.def

  const direct = (level: Level, rng: Rng, count: number): Draft => {
    const list = pool(level)
    const ei = rng.int(0, list.length - 1)
    const e = list[ei]
    const v = vary(rng, e.text)
    const others = rng.shuffle(c.kinds.map((k) => k.name).filter((n) => n !== e.kind))
    const shown = c.quote ? c.quote(v.text) : { prompt: `«${v.text}»` }
    const opts = withOptions(e.kind, others, rng, Math.min(count, c.kinds.length))
    return {
      kind: 'choice',
      prompt: shown.prompt ? `${c.ask}\n\n${shown.prompt}` : c.ask,
      ...(shown.display ? { display: shown.display } : {}),
      ...opts,
      hint: c.hint ?? 'Сравните пример с определением каждого варианта.',
      solution: `Это ${lowerFirst(e.kind)}. ${e.why}\n${e.kind}: ${lowerFirst(kindNote(e.kind))}`,
      notes: Object.fromEntries(opts.options.map((o) => [o, kindNote(o)])),
      ...(c.ref !== undefined ? { ref: c.ref } : {}),
      key: `d:${level}:${c.examples.indexOf(e)}:${v.pick}`,
    }
  }

  const reverse = (level: Level, rng: Rng): Draft | null => {
    const list = pool(level)
    const target = rng.pick(list)
    const others = rng.shuffle(list.filter((e) => e.kind !== target.kind))
    const picked: Example[] = []
    for (const e of others) {
      if (picked.length === 3) break
      if (picked.some((p) => p.kind === e.kind)) continue
      picked.push(e)
    }
    if (picked.length < 3) return null
    const all = [target, ...picked].map((e) => ({ e, text: vary(rng, e.text).text }))
    const right = all[0].text
    const opts = withOptions(right, all.slice(1).map((x) => x.text), rng)
    return {
      kind: 'choice',
      prompt: c.askReverse(target.kind),
      ...opts,
      hint: `Вспомните определение: ${lowerFirst(kindNote(target.kind))}`,
      solution: `Верный ответ: «${right}». ${target.why}\nОстальные фразы — примеры других типов: ${all
        .slice(1)
        .map((x) => `«${x.text}» — ${lowerFirst(x.e.kind)}`)
        .join('; ')}.`,
      notes: Object.fromEntries(all.map((x) => [x.text, `${x.e.kind}. ${x.e.why}`])),
      ...(c.ref !== undefined ? { ref: c.ref } : {}),
      key: `r:${level}:${[target, ...picked].map((e) => c.examples.indexOf(e)).join('.')}`,
    }
  }

  return (level, rng, index) => {
    switch (level) {
      case 1:
        return direct(1, rng, 3)
      case 2:
        return direct(2, rng, 4)
      case 3:
        return index % 2 === 0 ? reverse(3, rng) : direct(3, rng, 4)
      case 4:
        return index % 3 === 2 ? reverse(4, rng) : direct(4, rng, 4)
      default:
        return index % 2 === 0 ? direct(5, rng, 5) : reverse(5, rng)
    }
  }
}

/** Числовая задача с разбором по шагам (каждый шаг — с новой строки). */
export function numeric(prompt: string, answer: number, hint: string, steps: string[], key: string, extra: Partial<Draft> = {}): Draft {
  return { kind: 'number', prompt, answer: String(answer), hint, solution: steps.join('\n'), key, ...extra }
}

/** Выбор варианта с пояснениями к каждому варианту. */
export function choice(
  prompt: string,
  answer: string,
  wrong: string[],
  rng: Rng,
  hint: string,
  steps: string[],
  key: string,
  extra: Partial<Draft> = {},
  count = 4,
): Draft {
  const opts = withOptions(answer, wrong, rng, count)
  return { kind: 'choice', prompt, ...opts, hint, solution: steps.join('\n'), key, ...extra }
}

/** Число с запятой: 2.5 → «2,5». */
export const dec = (x: number, digits = 2) => {
  const r = Math.round(x * 10 ** digits) / 10 ** digits
  return String(r).replace('.', ',').replace('-', '−')
}

/** Число с разделением разрядов: 12500 → «12 500». */
export const big = (x: number) => (Math.abs(x) >= 10000 ? x.toLocaleString('ru-RU').replace(/ /g, ' ') : String(x)).replace('-', '−')

/** Задание на память: материал на seconds секунд, затем вопрос. */
export function memorize(seconds: number, title: string, content: TaskDisplay): TaskDisplay {
  return { type: 'memorize', seconds, title, content }
}
