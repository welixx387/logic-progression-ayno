import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, isPrime, withOptions, type ModuleGenerator } from './util.ts'

/** Русский алфавит — 33 буквы, Ё на 7-м месте. */
export const ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
const letter = (pos: number) => ALPHABET[pos - 1]
const tag = (pos: number) => `${letter(pos)}(${pos})`

interface Pattern {
  positions: number[]
  rule: string
  hint?: string
}

type Rule = (rng: Rng) => Pattern | null

const inRange = (ps: number[]) => ps.every((p) => p >= 1 && p <= 33)

const stepped = (start: number, steps: number[]) => {
  const out = [start]
  for (const s of steps) out.push(out[out.length - 1] + s)
  return out
}

const describe = (ps: number[]) => ps.map(tag).join(', ')
const fmtStep = (s: number) => (s > 0 ? `+${s}` : `−${-s}`)

const constantStep =
  (choices: number[]): Rule =>
  (rng) => {
    const step = rng.pick(choices)
    const start = rng.int(1, 33)
    const ps = stepped(start, Array(5).fill(step))
    if (!inRange(ps)) return null
    return {
      positions: ps,
      rule: `Запишем номера букв: ${describe(ps.slice(0, -1))}. Каждый раз номер меняется на ${fmtStep(step)}, поэтому дальше ${tag(ps[5])}.`,
    }
  }

/** Каждая буква повторяется дважды, затем шаг по алфавиту. */
const doubled =
  (step: number): Rule =>
  (rng) => {
    const s = rng.int(1, 33)
    const ps = [s, s, s + step, s + step, s + 2 * step, s + 2 * step, s + 3 * step]
    if (!inRange(ps)) return null
    return {
      positions: ps,
      rule: `Каждая буква повторяется дважды, а следующая пара сдвинута на ${fmtStep(step)}: ${describe([s, s + step, s + 2 * step])}. Значит, дальше ${tag(s + 3 * step)}.`,
      hint: 'Посмотрите на буквы парами.',
    }
  }

const L1: Rule[] = [
  constantStep([1]),
  constantStep([2]),
  constantStep([-1]),
  doubled(1),
  (rng) => {
    // Одна буква повторяется через раз, а между ними идёт алфавит.
    const a = rng.int(1, 33)
    const b = rng.int(1, 30)
    if (Math.abs(a - b) <= 3) return null
    const ps = [a, b, a, b + 1, a, b + 2, a]
    return {
      positions: ps,
      rule: `Через одну повторяется буква ${letter(a)}, а между ними идут буквы подряд: ${describe([b, b + 1, b + 2])}. Сейчас очередь буквы ${letter(a)}.`,
      hint: 'Посмотрите на буквы через одну.',
    }
  },
]

const L2: Rule[] = [
  constantStep([3]),
  constantStep([-2, -3]),
  doubled(2),
  doubled(-1),
  (rng) => {
    const a = rng.int(1, 6)
    const b = rng.int(28, 33)
    const ps = [a, b, a + 1, b - 1, a + 2, b - 2]
    return {
      positions: ps,
      rule: `Через одну идут два ряда: ${describe([a, a + 1, a + 2])} — вперёд по алфавиту, и ${describe([b, b - 1])} — назад от конца алфавита. Следующая буква второго ряда — ${tag(b - 2)}.`,
      hint: 'Смотрите на буквы через одну.',
    }
  },
]

const L3: Rule[] = [
  (rng) => {
    const start = rng.int(1, 8)
    const d0 = rng.pick([1, 2])
    const steps = [0, 1, 2, 3, 4].map((i) => d0 + i)
    const ps = stepped(start, steps)
    if (!inRange(ps)) return null
    return {
      positions: ps,
      rule: `Номера букв: ${describe(ps.slice(0, -1))}. Шаг каждый раз растёт на 1: ${steps.slice(0, 4).map(fmtStep).join(', ')}. Следующий шаг ${fmtStep(steps[4])} — это ${tag(ps[5])}.`,
      hint: 'Посчитайте, сколько букв пропущено между соседними.',
    }
  },
  constantStep([4, -4, 5]),
  (rng) => {
    const a = rng.int(1, 10)
    const b = rng.int(20, 33)
    const s1 = rng.pick([2, 3])
    const s2 = rng.pick([-2, -1])
    const ps = [a, b, a + s1, b + s2, a + 2 * s1, b + 2 * s2, a + 3 * s1]
    if (!inRange(ps)) return null
    return {
      positions: ps,
      rule: `Через одну идут два ряда: ${describe([a, a + s1, a + 2 * s1])} (шаг ${fmtStep(s1)}) и ${describe([b, b + s2, b + 2 * s2])} (шаг ${fmtStep(s2)}). Следующая буква продолжает первый ряд: ${tag(a + 3 * s1)}.`,
      hint: 'Смотрите на буквы через одну.',
    }
  },
]

const L4: Rule[] = [
  (rng) => {
    const a = rng.int(1, 10)
    const b = rng.int(5, 16)
    const s1 = rng.pick([1, 2])
    const s2 = rng.pick([3, 4])
    const ps = [a, b, a + s1, b + s2, a + 2 * s1, b + 2 * s2, a + 3 * s1]
    if (!inRange(ps) || a === b) return null
    return {
      positions: ps,
      rule: `Через одну идут два ряда, оба вперёд, но с разным шагом: ${describe([a, a + s1, a + 2 * s1])} (шаг ${fmtStep(s1)}) и ${describe([b, b + s2, b + 2 * s2])} (шаг ${fmtStep(s2)}). Следующая буква продолжает первый ряд: ${tag(a + 3 * s1)}.`,
      hint: 'Смотрите на буквы через одну.',
    }
  },
  (rng) => {
    const up = rng.pick([2, 3])
    const down = rng.pick([-1, -2].filter((d) => d + up > 0))
    const start = rng.int(1, 12)
    const steps = [up, down, up, down, up, down]
    const ps = stepped(start, steps)
    if (!inRange(ps)) return null
    return {
      positions: ps,
      rule: `Номера букв: ${describe(ps.slice(0, -1))}. Шаги чередуются: ${fmtStep(up)}, ${fmtStep(down)}, ${fmtStep(up)}, … Последний шаг ${fmtStep(down)} даёт ${tag(ps[6])}.`,
      hint: 'Буквы то идут вперёд, то немного назад.',
    }
  },
  (rng) => {
    const start = rng.int(1, 12)
    const [p, q] = rng.pick([
      [1, 2],
      [1, 3],
      [2, 1],
    ])
    const steps = [p, q, p, q, p]
    const ps = stepped(start, steps)
    if (!inRange(ps)) return null
    return {
      positions: ps,
      rule: `Номера букв: ${describe(ps.slice(0, -1))}. Шаги чередуются: ${fmtStep(p)}, ${fmtStep(q)}, ${fmtStep(p)}, ${fmtStep(q)}. Следующий шаг ${fmtStep(p)} — ${tag(ps[5])}.`,
      hint: 'Посчитайте расстояния между соседними буквами.',
    }
  },
  (rng) => {
    const start = rng.int(1, 10)
    const d0 = rng.pick([5, 6])
    const steps = [0, 1, 2, 3, 4].map((i) => d0 - i)
    const ps = stepped(start, steps)
    if (!inRange(ps)) return null
    return {
      positions: ps,
      rule: `Номера букв: ${describe(ps.slice(0, -1))}. Шаг уменьшается на 1: ${steps.slice(0, 4).map(fmtStep).join(', ')}. Следующий шаг ${fmtStep(steps[4])} — ${tag(ps[5])}.`,
      hint: 'Расстояния между буквами меняются по правилу.',
    }
  },
]

const L5: Rule[] = [
  (rng) => {
    const primes = Array.from({ length: 33 }, (_, i) => i + 1).filter(isPrime)
    const j = rng.int(0, primes.length - 6)
    const ps = primes.slice(j, j + 6)
    return {
      positions: ps,
      rule: `Номера букв — простые числа подряд: ${describe(ps.slice(0, -1))}. Следующее простое число — ${ps[5]}, это буква ${letter(ps[5])}.`,
      hint: 'Выпишите номера букв и присмотритесь к самим числам.',
    }
  },
  (rng) => {
    const start = rng.int(1, 2)
    const steps = [1, 2, 4, 8, 16]
    const ps = stepped(start, steps)
    return {
      positions: ps,
      rule: `Номера букв: ${describe(ps.slice(0, -1))}. Шаг каждый раз удваивается: +1, +2, +4, +8. Следующий шаг +16 — ${tag(ps[5])}.`,
      hint: 'Посчитайте расстояния между буквами.',
    }
  },
  (rng) => {
    const k = rng.int(0, 1)
    const ps = [1, 2, 3, 4, 5].map((n) => (n + k) ** 2 - (k ? 3 : 0)).filter((p) => p >= 1)
    if (ps.length < 5 || !inRange(ps)) return null
    return {
      positions: ps,
      rule: k
        ? `Номера букв: ${describe(ps.slice(0, -1))}. Это квадраты 2², 3², 4², 5² без трёх: 4−3, 9−3, 16−3, 25−3. Дальше 6² − 3 = 33 — ${tag(33)}.`
        : `Номера букв — квадраты чисел: ${describe(ps.slice(0, -1))} (1², 2², 3², 4²). Следующий квадрат 5² = 25 — ${tag(25)}.`,
      hint: 'Выпишите номера букв — это известные числа.',
    }
  },
  (rng) => {
    const a = rng.int(1, 8)
    const b = rng.int(26, 33)
    const s1 = rng.pick([3, 4])
    const s2 = rng.pick([-2, -3])
    const ps = [a, b, a + s1, b + s2, a + 2 * s1, b + 2 * s2, a + 3 * s1, b + 3 * s2]
    if (!inRange(ps)) return null
    return {
      positions: ps,
      rule: `Через одну идут два ряда: ${describe([a, a + s1, a + 2 * s1, a + 3 * s1])} (шаг ${fmtStep(s1)}) и ${describe([b, b + s2, b + 2 * s2])} (шаг ${fmtStep(s2)}). Следующая буква второго ряда — ${tag(b + 3 * s2)}.`,
      hint: 'Смотрите на буквы через одну.',
    }
  },
]

const RULES: Record<Level, Rule[]> = { 1: L1, 2: L2, 3: L3, 4: L4, 5: L5 }

/** Ряды из первых букв знакомых слов — задачи «на смекалку», а не на счёт позиций. */
const WORD_ROWS: { words: string[]; name: string }[] = [
  { name: 'дней недели', words: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'] },
  { name: 'месяцев', words: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'] },
  { name: 'чисел', words: ['один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять'] },
  { name: 'цветов радуги', words: ['красный', 'оранжевый', 'жёлтый', 'зелёный', 'голубой', 'синий', 'фиолетовый'] },
  { name: 'планет Солнечной системы', words: ['Меркурий', 'Венера', 'Земля', 'Марс', 'Юпитер', 'Сатурн', 'Уран', 'Нептун'] },
]

function wordRow(rng: Rng, row: (typeof WORD_ROWS)[number]) {
  const len = rng.int(5, 6)
  const start = row.name === 'месяцев' ? rng.int(0, row.words.length - len - 1) : 0
  const words = row.words.slice(start, start + len + 1)
  if (words.length < len + 1) return null
  const letters = words.map((w) => w[0].toUpperCase())
  const answer = letters[len]
  const others = ALPHABET.split('').filter((l) => l !== answer)
  const near = rng.shuffle([...new Set([...letters.slice(0, len), ...others.slice(0, 8)])])
  return {
    kind: 'choice' as const,
    prompt: 'Какая буква следующая? Подсказка не в алфавите — ищите знакомый порядок.',
    display: { type: 'sequence' as const, items: [...letters.slice(0, len), '?'] },
    ...withOptions(answer, near, rng),
    hint: `Это первые буквы слов, которые обычно перечисляют по порядку.`,
    solution: `Это первые буквы ${row.name}: ${words.map((w) => `${w[0].toUpperCase()} — ${w}`).join(', ')}. Значит, дальше «${answer}».`,
    key: `word:${letters.join('')}`,
  }
}

const WORD_ROWS_BY_LEVEL: Record<Level, Record<number, string>> = {
  1: {},
  2: {},
  3: { 7: 'дней недели' },
  4: { 3: 'чисел', 7: 'месяцев' },
  5: { 3: 'цветов радуги', 7: 'планет Солнечной системы' },
}

export const lettersGenerator: ModuleGenerator = {
  module: 'letters',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: (level, rng, index) => {
    // Несколько заданий на уровнях 3–5 — ряды первых букв знакомых слов.
    const special = WORD_ROWS_BY_LEVEL[level][index]
    if (special) return wordRow(rng, WORD_ROWS.find((r) => r.name === special)!)
    const rules = RULES[level]
    const pattern = rules[index % rules.length](rng)
    if (!pattern) return null
    const ps = pattern.positions
    const answerPos = ps[ps.length - 1]
    const answer = letter(answerPos)
    const near = [1, -1, 2, -2, 3, -3, 4]
      .map((d) => answerPos + d)
      .filter((p) => p >= 1 && p <= 33)
      .map(letter)
    return {
      kind: 'choice',
      prompt: 'Какая буква должна стоять на месте знака вопроса?',
      display: { type: 'sequence', items: [...ps.slice(0, -1).map(letter), '?'] },
      ...withOptions(answer, rng.shuffle(near), rng),
      hint: pattern.hint ?? 'Замените буквы их номерами в алфавите (в нём 33 буквы, Ё — седьмая).',
      solution: pattern.rule,
      key: ps.join(','),
    }
  },
}

export function letters(): Task[] {
  return collect(lettersGenerator)
}
