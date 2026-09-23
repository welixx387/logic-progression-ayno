import type { Level, Task } from '../../src/types.ts'
import type { Rng } from '../lib/rng.ts'
import { collect, type Draft } from '../lib/util.ts'

const ICONS = ['🍎', '🍌', '🍒', '🍇', '🍋', '🍓', '🍐', '🍑', '🥝', '🍊']

interface Puzzle {
  lines: string[]
  answer: number
  steps: string[]
}

type Template = (rng: Rng, A: string, B: string, C: string) => Puzzle | null

const L1: Template[] = [
  (rng, A) => {
    const a = rng.int(2, 15)
    return { lines: [`${A} + ${A} = ${2 * a}`, `${A} = ?`], answer: a, steps: [`Два одинаковых ${A} дают ${2 * a}, значит, один ${A} = ${2 * a} : 2 = ${a}.`] }
  },
  (rng, A, B) => {
    const a = rng.int(2, 10)
    const b = rng.int(1, 12)
    if (a === b) return null
    return {
      lines: [`${A} + ${A} = ${2 * a}`, `${A} + ${B} = ${a + b}`, `${B} = ?`],
      answer: b,
      steps: [`Из первой строки ${A} = ${2 * a} : 2 = ${a}.`, `Из второй: ${B} = ${a + b} − ${a} = ${b}.`],
    }
  },
  (rng, A) => {
    const a = rng.int(2, 12)
    return { lines: [`${A} + ${A} + ${A} = ${3 * a}`, `${A} = ?`], answer: a, steps: [`Три одинаковых ${A} дают ${3 * a}, значит, ${A} = ${3 * a} : 3 = ${a}.`] }
  },
  (rng, A, B) => {
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    if (a === b) return null
    return {
      lines: [`${A} + ${A} = ${2 * a}`, `${B} + ${B} = ${2 * b}`, `${A} + ${B} = ?`],
      answer: a + b,
      steps: [`${A} = ${2 * a} : 2 = ${a}.`, `${B} = ${2 * b} : 2 = ${b}.`, `${A} + ${B} = ${a} + ${b} = ${a + b}.`],
    }
  },
]

const L2: Template[] = [
  (rng, A, B, C) => {
    const a = rng.int(2, 8)
    const b = rng.int(1, 9)
    const c = rng.int(1, 9)
    return {
      lines: [`${A} + ${A} + ${A} = ${3 * a}`, `${A} + ${B} + ${B} = ${a + 2 * b}`, `${B} + ${C} = ${b + c}`, `${C} = ?`],
      answer: c,
      steps: [`${A} = ${3 * a} : 3 = ${a}.`, `${B} + ${B} = ${a + 2 * b} − ${a} = ${2 * b}, значит, ${B} = ${b}.`, `${C} = ${b + c} − ${b} = ${c}.`],
    }
  },
  (rng, A, B) => {
    const a = rng.int(3, 9)
    const b = rng.int(1, 15)
    return {
      lines: [`${A} × ${A} = ${a * a}`, `${A} + ${B} = ${a + b}`, `${B} = ?`],
      answer: b,
      steps: [`${A} × ${A} = ${a * a}, значит, ${A} = ${a} (${a} × ${a} = ${a * a}).`, `${B} = ${a + b} − ${a} = ${b}.`],
    }
  },
  (rng, A, B) => {
    const a = rng.int(2, 10)
    const b = rng.int(2, 10)
    if (a === b) return null
    return {
      lines: [`${A} + ${A} = ${2 * a}`, `${B} + ${B} + ${A} = ${2 * b + a}`, `${A} + ${B} = ?`],
      answer: a + b,
      steps: [`${A} = ${a}.`, `${B} + ${B} = ${2 * b + a} − ${a} = ${2 * b}, значит, ${B} = ${b}.`, `${A} + ${B} = ${a + b}.`],
    }
  },
  (rng, A, B) => {
    const b = rng.int(2, 9)
    const d = rng.int(1, 6)
    const a = b + d
    return {
      lines: [`${A} + ${B} = ${a + b}`, `${A} − ${B} = ${d}`, `${A} = ?`],
      answer: a,
      steps: [`Сложим строки: (${A} + ${B}) + (${A} − ${B}) = ${A} + ${A} = ${a + b} + ${d} = ${2 * a}.`, `Значит, ${A} = ${a}.`],
    }
  },
]

const L3: Template[] = [
  (rng, A, B) => {
    const b = rng.int(2, 9)
    const a = b + rng.int(1, 7)
    return {
      lines: [`${A} + ${B} = ${a + b}`, `${A} − ${B} = ${a - b}`, `${A} × ${B} = ?`],
      answer: a * b,
      steps: [`Сложим строки: ${A} + ${A} = ${a + b} + ${a - b} = ${2 * a}, значит, ${A} = ${a}.`, `${B} = ${a + b} − ${a} = ${b}.`, `${A} × ${B} = ${a} × ${b} = ${a * b}.`],
    }
  },
  (rng, A, B, C) => {
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    const c = rng.int(1, 12)
    if (a === b) return null
    return {
      lines: [`${A} × ${A} = ${a * a}`, `${A} × ${B} = ${a * b}`, `${B} + ${C} = ${b + c}`, `${C} = ?`],
      answer: c,
      steps: [`${A} = ${a}, потому что ${a} × ${a} = ${a * a}.`, `${B} = ${a * b} : ${a} = ${b}.`, `${C} = ${b + c} − ${b} = ${c}.`],
    }
  },
  (rng, A, B, C) => {
    const [a, b, c] = [rng.int(1, 12), rng.int(1, 12), rng.int(1, 12)]
    return {
      lines: [`${A} + ${B} + ${C} = ${a + b + c}`, `${A} + ${B} = ${a + b}`, `${B} + ${C} = ${b + c}`, `${B} = ?`],
      answer: b,
      steps: [`Из первой и второй строки: ${C} = ${a + b + c} − ${a + b} = ${c}.`, `Из третьей: ${B} = ${b + c} − ${c} = ${b}.`],
    }
  },
]

const L4: Template[] = [
  (rng, A, B) => {
    const a = rng.int(1, 12)
    const b = rng.int(1, 9)
    return {
      lines: [`${A} + ${B} = ${a + b}`, `${A} + ${B} + ${B} = ${a + 2 * b}`, `${A} × ${B} = ?`],
      answer: a * b,
      steps: [`Вторая строка больше первой на один ${B}: ${B} = ${a + 2 * b} − ${a + b} = ${b}.`, `${A} = ${a + b} − ${b} = ${a}.`, `${A} × ${B} = ${a * b}.`],
    }
  },
  (rng, A, B) => {
    const a = rng.int(1, 12)
    const b = rng.int(1, 12)
    if (a === b) return null
    return {
      lines: [`${A} + ${A} + ${B} = ${2 * a + b}`, `${A} + ${B} + ${B} = ${a + 2 * b}`, `${A} + ${B} = ?`],
      answer: a + b,
      steps: [
        `Сложим обе строки: получится три ${A} и три ${B}: ${2 * a + b} + ${a + 2 * b} = ${3 * (a + b)}.`,
        `Значит, ${A} + ${B} = ${3 * (a + b)} : 3 = ${a + b}. Находить каждый фрукт отдельно даже не нужно.`,
      ],
    }
  },
  (rng, A, B, C) => {
    const a = rng.int(2, 6)
    const b = rng.int(1, 6)
    const c = rng.int(2, 6)
    return {
      lines: [`${A} + ${A} + ${A} = ${3 * a}`, `${B} + ${B} + ${A} = ${2 * b + a}`, `${C} + ${C} + ${B} = ${2 * c + b}`, `${A} + ${B} × ${C} = ?`],
      answer: a + b * c,
      steps: [
        `${A} = ${a}; ${B} = (${2 * b + a} − ${a}) : 2 = ${b}; ${C} = (${2 * c + b} − ${b}) : 2 = ${c}.`,
        `Внимание: умножение выполняется раньше сложения. ${A} + ${B} × ${C} = ${a} + ${b} × ${c} = ${a} + ${b * c} = ${a + b * c}.`,
      ],
    }
  },
]

const L5: Template[] = [
  (rng, A, B, C) => {
    const [a, b, c] = [rng.int(1, 12), rng.int(1, 12), rng.int(1, 12)]
    if (new Set([a, b, c]).size < 3) return null
    return {
      lines: [`${A} + ${B} = ${a + b}`, `${B} + ${C} = ${b + c}`, `${A} + ${C} = ${a + c}`, `${A} × ${B} − ${C} = ?`],
      answer: a * b - c,
      steps: [
        `Сложим все три строки — каждый фрукт встретится дважды: 2 × (${A} + ${B} + ${C}) = ${2 * (a + b + c)}, значит, ${A} + ${B} + ${C} = ${a + b + c}.`,
        `${C} = ${a + b + c} − ${a + b} = ${c}; ${A} = ${a + b + c} − ${b + c} = ${a}; ${B} = ${a + b + c} − ${a + c} = ${b}.`,
        `${A} × ${B} − ${C} = ${a} × ${b} − ${c} = ${a * b - c}.`,
      ],
    }
  },
  (rng, A, B, C) => {
    const [a, b, c] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)]
    if (new Set([a, b, c]).size < 3) return null
    const abc = a * b * c
    return {
      lines: [`${A} × ${B} = ${a * b}`, `${B} × ${C} = ${b * c}`, `${A} × ${C} = ${a * c}`, `${A} + ${B} + ${C} = ?`],
      answer: a + b + c,
      steps: [
        `Перемножим все три строки: (${A} × ${B} × ${C})² = ${a * b} × ${b * c} × ${a * c} = ${abc * abc}, значит, ${A} × ${B} × ${C} = ${abc}.`,
        `${A} = ${abc} : ${b * c} = ${a}; ${B} = ${abc} : ${a * c} = ${b}; ${C} = ${abc} : ${a * b} = ${c}.`,
        `${A} + ${B} + ${C} = ${a + b + c}.`,
      ],
    }
  },
  (rng, A, B) => {
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    if (a === b) return null
    return {
      lines: [`${A} + ${A} × ${A} = ${a + a * a}`, `${A} × ${B} + ${B} = ${a * b + b}`, `${A} + ${B} × ${A} = ?`],
      answer: a + b * a,
      steps: [
        `В первой строке сначала умножение: ${A} + ${A}² = ${a + a * a}. Подбором: ${a} + ${a * a} = ${a + a * a}, значит, ${A} = ${a}.`,
        `Во второй: ${a} × ${B} + ${B} = ${a + 1} × ${B} = ${a * b + b}, значит, ${B} = ${b}.`,
        `${A} + ${B} × ${A} = ${a} + ${b} × ${a} = ${a} + ${a * b} = ${a + a * b}.`,
      ],
    }
  },
]

const TEMPLATES: Record<Level, Template[]> = { 1: L1, 2: L2, 3: L3, 4: L4, 5: L5 }

export function symbols(): Task[] {
  return collect('symbols', { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10 }, (level, rng, index): Draft | null => {
    const [A, B, C] = rng.sample(ICONS, 3)
    const list = TEMPLATES[level]
    const puzzle = list[index % list.length](rng, A, B, C)
    if (!puzzle || puzzle.answer < 0) return null
    return {
      kind: 'number',
      prompt: 'Одинаковые фрукты обозначают одинаковые числа. Найдите значение последней строки.',
      display: { type: 'lines', lines: puzzle.lines },
      answer: String(puzzle.answer),
      hint: 'Начните со строки, где встречается только один вид фруктов.',
      solution: puzzle.steps.join('\n'),
      key: puzzle.lines.join('|').replace(/\p{Extended_Pictographic}/gu, '#'),
    }
  })
}
