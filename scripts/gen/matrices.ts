import type { Level, Task } from '../../src/types.ts'
import type { Rng } from '../lib/rng.ts'
import { collect, type Draft } from '../lib/util.ts'

/** Правило «третье число из первых двух»: c = f(a, b). */
interface Rule {
  id: string
  f: (a: number, b: number) => number | null
  /** Запись вычисления: «3 + 4 = 7». */
  show: (a: number, b: number) => string
  text: string
}

const int = (x: number) => (Number.isInteger(x) && x >= 0 ? x : null)

const R: Record<string, Rule> = {
  sum: { id: 'sum', f: (a, b) => a + b, show: (a, b) => `${a} + ${b} = ${a + b}`, text: 'третье число — сумма первых двух' },
  diff: { id: 'diff', f: (a, b) => (a > b ? a - b : null), show: (a, b) => `${a} − ${b} = ${a - b}`, text: 'третье число — разность первых двух' },
  rdiff: { id: 'rdiff', f: (a, b) => int(b - a), show: (a, b) => `${b} − ${a} = ${b - a}`, text: 'третье число — разность второго и первого' },
  prod: { id: 'prod', f: (a, b) => a * b, show: (a, b) => `${a} × ${b} = ${a * b}`, text: 'третье число — произведение первых двух' },
  sum1: { id: 'sum1', f: (a, b) => a + b + 1, show: (a, b) => `${a} + ${b} + 1 = ${a + b + 1}`, text: 'третье число на 1 больше суммы первых двух' },
  sumM1: { id: 'sumM1', f: (a, b) => int(a + b - 1), show: (a, b) => `${a} + ${b} − 1 = ${a + b - 1}`, text: 'третье число на 1 меньше суммы первых двух' },
  sum2: { id: 'sum2', f: (a, b) => a + b + 2, show: (a, b) => `${a} + ${b} + 2 = ${a + b + 2}`, text: 'третье число на 2 больше суммы первых двух' },
  dsum: { id: 'dsum', f: (a, b) => 2 * (a + b), show: (a, b) => `(${a} + ${b}) × 2 = ${2 * (a + b)}`, text: 'третье число — удвоенная сумма первых двух' },
  prod1: { id: 'prod1', f: (a, b) => a * b + 1, show: (a, b) => `${a} × ${b} + 1 = ${a * b + 1}`, text: 'третье число на 1 больше произведения первых двух' },
  prodM1: { id: 'prodM1', f: (a, b) => int(a * b - 1), show: (a, b) => `${a} × ${b} − 1 = ${a * b - 1}`, text: 'третье число на 1 меньше произведения первых двух' },
  prodA: { id: 'prodA', f: (a, b) => a * b + a, show: (a, b) => `${a} × ${b} + ${a} = ${a * b + a}`, text: 'третье = первое × второе + первое' },
  prodB: { id: 'prodB', f: (a, b) => int(a * b - b), show: (a, b) => `${a} × ${b} − ${b} = ${a * b - b}`, text: 'третье = первое × второе − второе' },
  avg: { id: 'avg', f: (a, b) => int((a + b) / 2), show: (a, b) => `(${a} + ${b}) : 2 = ${(a + b) / 2}`, text: 'третье число — среднее арифметическое первых двух' },
  div: { id: 'div', f: (a, b) => (b ? int(a / b) : null), show: (a, b) => `${a} : ${b} = ${a / b}`, text: 'третье число — частное первых двух' },
  twoAB: { id: 'twoAB', f: (a, b) => 2 * a + b, show: (a, b) => `${a} × 2 + ${b} = ${2 * a + b}`, text: 'третье = удвоенное первое + второе' },
  aTwoB: { id: 'aTwoB', f: (a, b) => a + 2 * b, show: (a, b) => `${a} + ${b} × 2 = ${a + 2 * b}`, text: 'третье = первое + удвоенное второе' },
  arith: {
    id: 'arith',
    f: (a, b) => (a === b ? null : int(2 * b - a)),
    show: (a, b) => `${a} → ${b} → ${2 * b - a} (шаг ${b > a ? '+' : '−'}${Math.abs(b - a)})`,
    text: 'числа идут с одинаковым шагом',
  },
  sqPlus: { id: 'sqPlus', f: (a, b) => a * a + b, show: (a, b) => `${a}² + ${b} = ${a * a + b}`, text: 'третье = квадрат первого + второе' },
  sqMinus: { id: 'sqMinus', f: (a, b) => int(a * a - b), show: (a, b) => `${a}² − ${b} = ${a * a - b}`, text: 'третье = квадрат первого − второе' },
  sqSum: { id: 'sqSum', f: (a, b) => a * a + b * b, show: (a, b) => `${a}² + ${b}² = ${a * a + b * b}`, text: 'третье — сумма квадратов первых двух' },
  sqDiff: { id: 'sqDiff', f: (a, b) => (a > b ? a * a - b * b : null), show: (a, b) => `${a}² − ${b}² = ${a * a - b * b}`, text: 'третье — разность квадратов первых двух' },
  prodSum: { id: 'prodSum', f: (a, b) => a * b + a + b, show: (a, b) => `${a} × ${b} + ${a} + ${b} = ${a * b + a + b}`, text: 'третье = произведение + сумма первых двух' },
  prodMinusSum: { id: 'prodMinusSum', f: (a, b) => int(a * b - a - b), show: (a, b) => `${a} × ${b} − ${a} − ${b} = ${a * b - a - b}`, text: 'третье = произведение − сумма первых двух' },
  concat: { id: 'concat', f: (a, b) => (a < 10 && b < 10 ? 10 * a + b : null), show: (a, b) => `«${a}» и «${b}» → ${10 * a + b}`, text: 'третье число записано цифрами первых двух' },
}

const LIBRARY = Object.values(R)

interface Spec {
  rule: string
  /** Диапазоны для a и b. */
  a: [number, number]
  b: [number, number]
  /** Правило по столбцам (сверху вниз), а не по строкам. */
  columns?: boolean
  /** Можно ли прятать не последнее число строки. */
  anyCell?: boolean
}

const SPECS: Record<Level, (Spec | 'rowSum')[]> = {
  1: [
    { rule: 'arith', a: [1, 20], b: [2, 30] },
    { rule: 'sum', a: [1, 9], b: [1, 9] },
  ],
  2: [
    { rule: 'sum', a: [5, 30], b: [5, 30] },
    { rule: 'prod', a: [2, 9], b: [2, 9] },
    'rowSum',
    { rule: 'diff', a: [10, 40], b: [1, 9] },
  ],
  3: [
    { rule: 'sum1', a: [2, 20], b: [2, 20], anyCell: true },
    { rule: 'dsum', a: [1, 12], b: [1, 12] },
    { rule: 'prodM1', a: [2, 9], b: [2, 9] },
    { rule: 'avg', a: [2, 30], b: [2, 30] },
    { rule: 'twoAB', a: [1, 12], b: [1, 12], anyCell: true },
  ],
  4: [
    { rule: 'prodA', a: [2, 9], b: [2, 9] },
    { rule: 'sqPlus', a: [2, 9], b: [1, 9] },
    { rule: 'sqMinus', a: [3, 9], b: [1, 9] },
    { rule: 'sum', a: [2, 30], b: [2, 30], columns: true },
    { rule: 'prodB', a: [2, 9], b: [2, 9], anyCell: true },
  ],
  5: [
    { rule: 'sqSum', a: [1, 9], b: [1, 9], anyCell: true },
    { rule: 'sqDiff', a: [3, 12], b: [1, 9] },
    { rule: 'prodSum', a: [2, 9], b: [2, 9], anyCell: true },
    { rule: 'prod', a: [2, 9], b: [2, 9], columns: true },
    { rule: 'prodMinusSum', a: [3, 9], b: [3, 9] },
  ],
}

/** Все значения x, при которых правило даёт тройку с пропуском в позиции pos. */
function solveFor(rule: Rule, row: (number | null)[], pos: number): number[] {
  const out: number[] = []
  for (let x = 0; x <= 999; x++) {
    const [a, b, c] = row.map((v, i) => (i === pos ? x : v)) as number[]
    if (rule.f(a, b) === c) out.push(x)
  }
  return out
}

/**
 * Проверяет, что никакое другое простое правило (по строкам, по столбцам,
 * «равные суммы») не даёт другой ответ.
 */
function unambiguous(grid: number[][], pos: number, answer: number): boolean {
  const last = grid[2].map((v, i) => (i === pos ? null : v))
  const rows = [grid[0], grid[1]]
  const cols = [0, 1, 2].filter((j) => j !== pos).map((j) => [grid[0][j], grid[1][j], grid[2][j]])
  for (const rule of LIBRARY) {
    if (rows.every(([a, b, c]) => rule.f(a, b) === c)) {
      const sol = solveFor(rule, last, pos)
      if (sol.length !== 1 || sol[0] !== answer) return false
    }
    if (cols.every(([a, b, c]) => rule.f(a, b) === c)) {
      if (rule.f(grid[0][pos], grid[1][pos]) !== answer) return false
    }
  }
  const rowSums = rows.map((r) => r[0] + r[1] + r[2])
  if (rowSums[0] === rowSums[1]) {
    const others = last.reduce<number>((s, v) => s + (v ?? 0), 0)
    if (rowSums[0] - others !== answer) return false
  }
  const colSums = cols.map((c) => c[0] + c[1] + c[2])
  if (colSums[0] === colSums[1] && grid[0][pos] + grid[1][pos] + answer !== colSums[0]) return false
  return true
}

function generate(level: Level, rng: Rng, index: number): Draft | null {
  const list = SPECS[level]
  const spec = list[index % list.length]
  let grid: number[][]
  let pos = 2
  let explain: string

  if (spec === 'rowSum') {
    const S = rng.int(12, 30)
    grid = []
    for (let r = 0; r < 3; r++) {
      const a = rng.int(1, S - 2)
      const b = rng.int(1, S - a - 1)
      grid.push(rng.shuffle([a, b, S - a - b]))
    }
    pos = rng.int(0, 2)
    const others = grid[2].filter((_, i) => i !== pos)
    explain = `Сумма чисел в каждой строке одинакова: ${grid[0].join(' + ')} = ${S}, ${grid[1].join(' + ')} = ${S}.\nЗначит, в третьей строке не хватает ${S} − ${others.join(' − ')} = ${grid[2][pos]}.`
  } else {
    const rule = R[spec.rule]
    const triples: number[][] = []
    for (let r = 0; r < 3; r++) {
      const a = rng.int(...spec.a)
      const b = rng.int(...spec.b)
      const c = rule.f(a, b)
      if (c === null || c > 999) return null
      triples.push([a, b, c])
    }
    if (new Set(triples.map((t) => t.join())).size < 3) return null
    if (spec.columns) {
      grid = [0, 1, 2].map((r) => triples.map((t) => t[r]))
      pos = rng.int(0, 2)
      explain = `Здесь правило работает по столбцам: ${rule.text.replace('третье', 'нижнее').replace('первых двух', 'двух верхних')}.\n${triples
        .map((t, j) => `Столбец ${j + 1}: ${j === pos ? rule.show(t[0], t[1]).replace(/= \d+$/, `= ${t[2]} ← пропуск`) : rule.show(t[0], t[1])}`)
        .join('\n')}`
    } else {
      grid = triples
      pos = spec.anyCell ? rng.int(0, 2) : 2
      const shown = triples.slice(0, 2).map((t, i) => `Строка ${i + 1}: ${rule.show(t[0], t[1])}`)
      const [a, b] = triples[2]
      explain = `В каждой строке ${rule.text}.\n${shown.join('\n')}\nСтрока 3: ${rule.show(a, b)}${pos === 2 ? '' : ` — значит, пропущено число ${triples[2][pos]}`}.`
    }
  }

  const answer = grid[2][pos]
  if (!unambiguous(grid, pos, answer)) return null
  const rows = grid.map((row, r) => row.map((v, c) => (r === 2 && c === pos ? '?' : String(v))))
  return {
    kind: 'number',
    prompt: 'Числа в таблице подчиняются одному правилу. Какое число вместо знака вопроса?',
    display: { type: 'grid', rows },
    answer: String(answer),
    hint: 'Сравните числа в каждой строке. Если не выходит — попробуйте столбцы.',
    solution: explain,
    key: rows.flat().join(','),
  }
}

export function matrices(): Task[] {
  return collect('matrices', { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 }, generate)
}
