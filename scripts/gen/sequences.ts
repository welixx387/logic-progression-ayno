import type { Level, Task } from '../../src/types.ts'
import type { Rng } from '../lib/rng.ts'
import { collect, digitSum, isPrime } from '../lib/util.ts'

interface Seq {
  full: number[]
  /** Индекс скрытого числа; по умолчанию — последнее. */
  missing?: number
  rule: string
  hint: string
}

type Rule = (rng: Rng) => Seq | null

const PRIMES = Array.from({ length: 200 }, (_, i) => i).filter(isPrime)

const build = (start: number, count: number, step: (prev: number, i: number, all: number[]) => number) => {
  const out = [start]
  for (let i = 1; i < count; i++) out.push(step(out[i - 1], i, out))
  return out
}

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`)
const list = (xs: number[]) => xs.join(', ')

const HINT_DIFF = 'Выпишите разницу между соседними числами — часто закономерность прячется там.'

const L1: Rule[] = [
  (rng) => {
    const a = rng.int(1, 20)
    const d = rng.int(2, 9)
    const full = build(a, 6, (p) => p + d)
    return { full, rule: `Каждое следующее число больше предыдущего на ${d}: ${full[4]} + ${d} = ${full[5]}.`, hint: 'На сколько меняется число от шага к шагу?' }
  },
  (rng) => {
    const a = rng.int(45, 99)
    const d = rng.int(2, 9)
    const full = build(a, 6, (p) => p - d)
    if (full[5] <= 0) return null
    return { full, rule: `Каждое следующее число меньше предыдущего на ${d}: ${full[4]} − ${d} = ${full[5]}.`, hint: 'Числа уменьшаются. На сколько?' }
  },
  (rng) => {
    const a = rng.int(1, 6)
    const full = build(a, 6, (p) => p * 2)
    return { full, rule: `Каждое следующее число вдвое больше предыдущего: ${full[4]} × 2 = ${full[5]}.`, hint: 'Числа растут всё быстрее. Во сколько раз?' }
  },
  (rng) => {
    const d = rng.pick([5, 10, 11, 15, 20, 25])
    const a = rng.int(1, 12) * (d % 5 === 0 ? 5 : 1)
    const full = build(a, 6, (p) => p + d)
    return { full, rule: `Шаг ряда — ${d}: ${full[4]} + ${d} = ${full[5]}.`, hint: 'Посмотрите на разницу между соседними числами.' }
  },
]

const L2: Rule[] = [
  (rng) => {
    if (rng.chance(0.5)) {
      const a = rng.int(1, 4)
      const full = build(a, 6, (p) => p * 3)
      return { full, rule: `Каждое число втрое больше предыдущего: ${full[4]} × 3 = ${full[5]}.`, hint: 'Разделите каждое число на предыдущее.' }
    }
    const a = rng.int(1, 9)
    const full = build(a * 32, 6, (p) => p / 2)
    return { full, rule: `Каждое следующее число вдвое меньше предыдущего: ${full[4]} : 2 = ${full[5]}.`, hint: 'Сравните соседние числа: во сколько раз они отличаются?' }
  },
  (rng) => {
    const k = rng.int(1, 7)
    const full = build(k * k, 6, (_p, i) => (k + i) * (k + i))
    const n = k + 5
    return { full, rule: `Это квадраты чисел подряд: ${k}², ${k + 1}², ${k + 2}², … Следующее — ${n}² = ${n * n}.`, hint: 'Каждое число можно получить, умножив некоторое число само на себя.' }
  },
  (rng) => {
    const a = rng.int(1, 9)
    const d1 = rng.int(2, 5)
    const b = rng.int(12, 30)
    const d2 = rng.pick([-3, -2, -1, 1, 3, 4, 6].filter((x) => x !== d1))
    const full: number[] = []
    for (let i = 0; i < 4; i++) full.push(a + i * d1, b + i * d2)
    const first = [0, 2, 4, 6].map((i) => full[i])
    const second = [1, 3, 5, 7].map((i) => full[i])
    return {
      full,
      rule: `Это два ряда, записанные через одно число. Первый: ${list(first)} (шаг ${sign(d1)}). Второй: ${list(second.slice(0, 3))}, … (шаг ${sign(d2)}). Следующее число продолжает второй ряд: ${second[2]} ${d2 >= 0 ? '+' : '−'} ${Math.abs(d2)} = ${second[3]}.`,
      hint: 'Попробуйте смотреть на числа через одно.',
    }
  },
  (rng) => {
    const a = rng.int(1, 20)
    const d0 = rng.int(1, 3)
    const full = build(a, 6, (p, i) => p + d0 + i - 1)
    return {
      full,
      rule: `Разница между соседними числами каждый раз растёт на 1: +${d0}, +${d0 + 1}, +${d0 + 2}, +${d0 + 3}. Следующая разница +${d0 + 4}: ${full[4]} + ${d0 + 4} = ${full[5]}.`,
      hint: HINT_DIFF,
    }
  },
  (rng) => {
    const a = rng.int(5, 20)
    const p = rng.int(3, 9)
    const q = rng.int(1, p - 1)
    const full = build(a, 7, (prev, i) => (i % 2 === 1 ? prev + p : prev - q))
    return { full, rule: `Действия чередуются: +${p}, −${q}, +${p}, −${q}, … Следующее действие −${q}: ${full[5]} − ${q} = ${full[6]}.`, hint: 'Числа то растут, то уменьшаются — найдите два чередующихся действия.' }
  },
]

const L3: Rule[] = [
  (rng) => {
    const a = rng.int(1, 10)
    const d0 = rng.int(1, 5)
    const s = rng.int(2, 4)
    const full = build(a, 6, (p, i) => p + d0 + (i - 1) * s)
    const diffs = [0, 1, 2, 3].map((i) => d0 + i * s)
    return {
      full,
      rule: `Разницы между соседними числами: ${diffs.map((d) => `+${d}`).join(', ')} — они растут на ${s}. Следующая разница +${d0 + 4 * s}: ${full[4]} + ${d0 + 4 * s} = ${full[5]}.`,
      hint: `${HINT_DIFF} Потом посмотрите на разницы разниц.`,
    }
  },
  (rng) => {
    const a = rng.int(1, 5)
    const b = rng.int(1, 7)
    const full = build(a, 7, (p, i, all) => (i === 1 ? b : p + all[i - 2]))
    return { full, rule: `Каждое число равно сумме двух предыдущих: ${full[4]} + ${full[5]} = ${full[6]}.`, hint: 'Сравните каждое число с двумя числами перед ним.' }
  },
  (rng) => {
    const k = rng.pick([2, 3])
    const c = rng.pick([-1, 1, 2, 3])
    const x0 = rng.int(k === 3 && c === -1 ? 1 : 1, 5)
    const full = build(x0, 6, (p) => p * k + c)
    if (full.some((x, i) => i > 0 && x <= full[i - 1]) || full[5] > 2500) return null
    const op = c > 0 ? `+ ${c}` : `− ${-c}`
    return { full, rule: `Каждое следующее число получается так: умножить предыдущее на ${k} и ${c > 0 ? 'прибавить' : 'вычесть'} ${Math.abs(c)}. ${full[4]} × ${k} ${op} = ${full[5]}.`, hint: 'Числа растут примерно в одно и то же число раз, но не точно. Что добавляется?' }
  },
  (rng) => {
    const k = rng.int(1, 4)
    const full = build(k ** 3, 6, (_p, i) => (k + i) ** 3)
    return { full, rule: `Это кубы чисел подряд: ${k}³, ${k + 1}³, ${k + 2}³, … Следующее — ${k + 5}³ = ${(k + 5) ** 3}.`, hint: 'Попробуйте представить числа как n × n × n.' }
  },
  (rng) => {
    const i = rng.int(0, 9)
    const full = PRIMES.slice(i, i + 6)
    return { full, rule: `Это простые числа подряд — они делятся только на 1 и на себя. После ${full[4]} следующее простое — ${full[5]}.`, hint: 'У этих чисел нет делителей, кроме 1 и самого числа.' }
  },
  (rng) => {
    const a = rng.int(1, 5)
    const m = rng.pick([2, 3])
    const c = rng.int(1, 5)
    const full = build(a, 7, (p, i) => (i % 2 === 1 ? p * m : p + c))
    if (full[6] > 2000) return null
    return { full, rule: `Действия чередуются: ×${m}, +${c}, ×${m}, +${c}, … Следующее — +${c}: ${full[5]} + ${c} = ${full[6]}.`, hint: 'Числа растут неравномерно — возможно, чередуются два разных действия.' }
  },
]

const L4: Rule[] = [
  (rng) => {
    const a = rng.int(1, 20)
    const d = rng.int(1, 3)
    const full = build(a, 6, (p, i) => p + d * 2 ** (i - 1))
    const diffs = [0, 1, 2, 3].map((i) => d * 2 ** i)
    return { full, rule: `Разницы между соседними числами: ${diffs.map((x) => `+${x}`).join(', ')} — каждая вдвое больше предыдущей. Следующая +${d * 16}: ${full[4]} + ${d * 16} = ${full[5]}.`, hint: HINT_DIFF }
  },
  (rng) => {
    const k = rng.int(1, 5)
    const full = build(k * (k + 1), 6, (_p, i) => (k + i) * (k + i + 1))
    const n = k + 5
    return { full, rule: `Каждое число — произведение двух соседних натуральных чисел: ${k}·${k + 1}, ${k + 1}·${k + 2}, … Следующее — ${n}·${n + 1} = ${n * (n + 1)}.`, hint: 'Разложите числа на множители.' }
  },
  (rng) => {
    const k = rng.int(1, 4)
    const f = (n: number) => n * n + (n % 2 === 1 ? 1 : -1)
    const full = build(f(k), 6, (_p, i) => f(k + i))
    const n = k + 5
    return { full, rule: `Это квадраты чисел подряд, к которым по очереди прибавляют и вычитают 1: ${k}²${k % 2 ? '+' : '−'}1, ${k + 1}²${(k + 1) % 2 ? '+' : '−'}1, … Следующее: ${n}² ${n % 2 ? '+' : '−'} 1 = ${f(n)}.`, hint: 'Числа близки к квадратам. На сколько они от них отличаются?' }
  },
  (rng) => {
    const a = rng.int(0, 3)
    const b = rng.int(1, 4)
    const c = rng.int(1, 5)
    const full = build(a, 7, (_p, i, all) => (i === 1 ? b : i === 2 ? c : all[i - 1] + all[i - 2] + all[i - 3]))
    return { full, rule: `Каждое число равно сумме трёх предыдущих: ${full[3]} + ${full[4]} + ${full[5]} = ${full[6]}.`, hint: 'Сложите несколько чисел перед каждым членом ряда.' }
  },
  (rng) => {
    const a = rng.int(1, 3)
    const k0 = rng.int(1, 3)
    const full = build(a, 6, (p, i) => p * (k0 + i - 1))
    if (full[5] > 3000) return null
    const mults = [0, 1, 2, 3, 4].map((i) => k0 + i)
    return { full, rule: `Множитель каждый раз растёт на 1: ${mults.slice(0, 4).map((m) => `×${m}`).join(', ')}. Следующий ×${mults[4]}: ${full[4]} × ${mults[4]} = ${full[5]}.`, hint: 'Разделите каждое число на предыдущее.' }
  },
  (rng) => {
    const a = rng.int(1, 20)
    const k = rng.int(1, 2)
    const full = build(a, 6, (p, i) => p + (k + i - 1) ** 2)
    const sq = [0, 1, 2, 3, 4].map((i) => (k + i) ** 2)
    return { full, rule: `Разницы между соседними числами — квадраты подряд: ${sq.slice(0, 4).map((x) => `+${x}`).join(', ')}. Следующая +${sq[4]}: ${full[4]} + ${sq[4]} = ${full[5]}.`, hint: HINT_DIFF }
  },
  (rng) => {
    const a = rng.int(2, 10)
    const d0 = rng.int(1, 4)
    const s = rng.int(2, 5)
    const full = build(a, 6, (p, i) => p + d0 + (i - 1) * s)
    const missing = rng.int(2, 3)
    const diffs = [0, 1, 2, 3, 4].map((i) => d0 + i * s)
    return {
      full,
      missing,
      rule: `Разницы между соседними числами растут на ${s}: ${diffs.map((d) => `+${d}`).join(', ')}. Значит, пропущено ${full[missing - 1]} + ${diffs[missing - 1]} = ${full[missing]} (проверка: ${full[missing]} + ${diffs[missing]} = ${full[missing + 1]}).`,
      hint: 'Пропуск — не в конце. Используйте числа с обеих сторон от него.',
    }
  },
]

const L5: Rule[] = [
  (rng) => {
    const a = rng.int(1, 30)
    const j = rng.int(0, 3)
    const ps = PRIMES.slice(j, j + 6)
    const full = build(a, 7, (p, i) => p + ps[i - 1])
    return { full, rule: `Разницы между соседними числами — простые числа подряд: ${ps.slice(0, 5).map((x) => `+${x}`).join(', ')}. Следующая +${ps[5]}: ${full[5]} + ${ps[5]} = ${full[6]}.`, hint: HINT_DIFF }
  },
  (rng) => {
    const a = rng.int(1, 20)
    const fib = [1, 1, 2, 3, 5, 8, 13, 21]
    const j = rng.int(0, 2)
    const ds = fib.slice(j, j + 6)
    const full = build(a, 7, (p, i) => p + ds[i - 1])
    return { full, rule: `Разницы между соседними числами: ${ds.slice(0, 5).map((x) => `+${x}`).join(', ')} — каждая равна сумме двух предыдущих разниц (числа Фибоначчи). Следующая +${ds[5]}: ${full[5]} + ${ds[5]} = ${full[6]}.`, hint: `${HINT_DIFF} Как связаны сами разницы?` }
  },
  (rng) => {
    const k = rng.int(1, 3)
    const s = rng.pick([1, -1])
    const f = (n: number) => n ** 3 + s * n
    const full = build(f(k), 6, (_p, i) => f(k + i))
    const n = k + 5
    return { full, rule: `Каждое число — куб своего номера ${s > 0 ? 'плюс' : 'минус'} сам номер: n³ ${s > 0 ? '+' : '−'} n. Для n = ${k}…${k + 4} получаем данные числа, а для n = ${n}: ${n ** 3} ${s > 0 ? '+' : '−'} ${n} = ${f(n)}.`, hint: 'Сравните числа с кубами 1, 8, 27, 64, 125, 216…' }
  },
  (rng) => {
    const a = rng.int(1, 3)
    const b = rng.int(1, 9)
    const d = rng.int(2, 5)
    const full: number[] = []
    for (let i = 0; i < 5; i++) full.push(a * 2 ** i, b + i * d)
    const trimTo = rng.chance(0.5) ? 8 : 9
    const seq = full.slice(0, trimTo)
    const geo = seq.filter((_, i) => i % 2 === 0)
    const ari = seq.filter((_, i) => i % 2 === 1)
    const nextIsGeo = trimTo % 2 === 1
    return {
      full: seq,
      rule: `Через одно записаны два ряда: ${list(nextIsGeo ? geo.slice(0, -1) : geo)} (каждое вдвое больше) и ${list(nextIsGeo ? ari : ari.slice(0, -1))} (шаг +${d}). Пропущенное число продолжает ${nextIsGeo ? `первый ряд: ${geo[geo.length - 2]} × 2 = ${geo[geo.length - 1]}` : `второй ряд: ${ari[ari.length - 2]} + ${d} = ${ari[ari.length - 1]}`}.`,
      hint: 'Смотрите на числа через одно: здесь спрятаны два разных правила.',
    }
  },
  (rng) => {
    const x0 = rng.int(1, 4)
    const full = build(x0, 6, (p, i) => 2 * p + i)
    return { full, rule: `Каждое следующее число — удвоенное предыдущее плюс номер шага: ${x0}·2+1 = ${full[1]}, ${full[1]}·2+2 = ${full[2]}, ${full[2]}·2+3 = ${full[3]}, … ${full[4]}·2+5 = ${full[5]}.`, hint: 'Числа растут примерно вдвое. Посмотрите, что добавляется сверх удвоения.' }
  },
  (rng) => {
    const x0 = rng.int(10, 60)
    const full = build(x0, 7, (p) => p + digitSum(p))
    // Если прибавки не меняются, это обычная арифметическая прогрессия — слишком просто.
    if (new Set(full.slice(0, 6).map(digitSum)).size < 3) return null
    return { full, rule: `К каждому числу прибавляют сумму его цифр: ${full[0]} + ${digitSum(full[0])} = ${full[1]}, … ${full[5]} + ${digitSum(full[5])} = ${full[6]}.`, hint: 'Разницы кажутся случайными. С какими свойствами самих чисел они связаны?' }
  },
  (rng) => {
    const j = rng.int(0, 4)
    const full = [0, 1, 2, 3, 4, 5].map((i) => PRIMES[j + i] * PRIMES[j + i + 1])
    const [p, q] = [PRIMES[j + 5], PRIMES[j + 6]]
    return { full, rule: `Каждое число — произведение двух соседних простых чисел: ${PRIMES[j]}·${PRIMES[j + 1]}, ${PRIMES[j + 1]}·${PRIMES[j + 2]}, … Следующее — ${p}·${q} = ${p * q}.`, hint: 'Разложите числа на простые множители.' }
  },
  (rng) => {
    const j = rng.int(0, 3)
    const full = PRIMES.slice(j, j + 6).map((p) => p * p)
    const p = PRIMES[j + 5]
    return { full, rule: `Это квадраты простых чисел подряд: ${PRIMES.slice(j, j + 3).map((x) => `${x}²`).join(', ')}, … Следующее — ${p}² = ${p * p}.`, hint: 'Все числа — точные квадраты. Каких именно чисел?' }
  },
]

const RULES: Record<Level, Rule[]> = { 1: L1, 2: L2, 3: L3, 4: L4, 5: L5 }

export function sequences(): Task[] {
  return collect('sequences', { 1: 12, 2: 12, 3: 12, 4: 12, 5: 12 }, (level, rng, index) => {
    const rules = RULES[level]
    const seq = rules[index % rules.length](rng)
    if (!seq) return null
    const missing = seq.missing ?? seq.full.length - 1
    const answer = seq.full[missing]
    const items = seq.full.map((n, i) => (i === missing ? '?' : String(n)))
    return {
      kind: 'number',
      prompt: missing === seq.full.length - 1 ? 'Какое число должно стоять на месте знака вопроса?' : 'Какое число пропущено?',
      display: { type: 'sequence', items },
      answer: String(answer),
      hint: seq.hint,
      solution: seq.rule,
      key: items.join(','),
    }
  })
}
