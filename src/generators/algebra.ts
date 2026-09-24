import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, gcd, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/** Алгебра 7–11 классов: уровень 1 = 7 класс. Все ответы вычисляются. */

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' }
export const sup = (n: number) => String(n).split('').map((c) => SUP[c]).join('')
const sgn = (n: number) => (n < 0 ? `− ${-n}` : `+ ${n}`)
const neg = (n: number) => (n < 0 ? `−${-n}` : String(n))
/** Одночлен с коэффициентом: 3x, −x, x. */
const term = (k: number, x: string) => (k === 1 ? x : k === -1 ? `−${x}` : `${neg(k)}${x}`)

/** Нижний индекс: a₁₂. */
const sub = (n: number) => String(n).split('').map((c) => '₀₁₂₃₄₅₆₇₈₉'[Number(c)]).join('')
/** Отрицательное число в скобках: (−4). */
const par = (n: number) => (n < 0 ? `(${neg(n)})` : String(n))

/** Многочлен по коэффициентам от старшей степени: «6x² − 4x + 1». */
function poly(coefs: number[]): string {
  const parts: string[] = []
  coefs.forEach((k, i) => {
    const deg = coefs.length - 1 - i
    if (k === 0) return
    const abs = Math.abs(k)
    const body = deg === 0 ? String(abs) : `${abs === 1 ? '' : abs}x${deg > 1 ? sup(deg) : ''}`
    parts.push(parts.length === 0 ? (k < 0 ? `−${body}` : body) : `${k < 0 ? '−' : '+'} ${body}`)
  })
  return parts.join(' ') || '0'
}

function grade7(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const a = rng.int(2, 9)
    const x = rng.int(-9, 12)
    const b = rng.int(-20, 20)
    if (b === 0) return null
    const c = a * x + b
    return {
      kind: 'number',
      prompt: `Решите уравнение ${a}x ${sgn(b)} = ${neg(c)}.`,
      answer: String(x),
      hint: 'Перенесите число в правую часть, поменяв знак, и разделите на коэффициент при x.',
      solution: `${a}x = ${neg(c)} ${b > 0 ? '−' : '+'} ${Math.abs(b)} = ${neg(a * x)}, x = ${neg(a * x)} : ${a} = ${neg(x)}. Проверка: ${a} · ${par(x)} ${sgn(b)} = ${neg(c)}.`,
      key: `lin:${a}:${b}:${c}`,
    }
  }
  if (t === 1) {
    const m = rng.int(2, 9)
    const n = rng.int(2, 9)
    const op = rng.int(0, 2)
    const [expr, res, rule] =
      op === 0
        ? [`a${sup(m)} · a${sup(n)}`, m + n, `при умножении степеней с одинаковым основанием показатели складываются: ${m} + ${n} = ${m + n}`]
        : op === 1
          ? [`(a${sup(m)})${sup(n)}`, m * n, `при возведении степени в степень показатели перемножаются: ${m} · ${n} = ${m * n}`]
          : [`a${sup(m + n)} : a${sup(n)}`, m, `при делении степеней с одинаковым основанием показатели вычитаются: ${m + n} − ${n} = ${m}`]
    return {
      kind: 'number',
      prompt: `Упростите выражение ${expr}. В ответ запишите показатель степени.`,
      answer: String(res),
      hint: 'Вспомните свойства степеней с одинаковым основанием.',
      solution: `${rule[0].toUpperCase()}${rule.slice(1)}. Получается a${sup(res)}.`,
      key: `pow:${op}:${m}:${n}`,
    }
  }
  if (t === 2) {
    const k = rng.int(2, 12)
    const minus = rng.chance(0.5)
    return {
      kind: 'number',
      prompt: `Раскройте скобки: (x ${minus ? '−' : '+'} ${k})² = x² ${minus ? '−' : '+'} ?·x + ${k * k}. Какое число стоит вместо знака вопроса?`,
      answer: String(2 * k),
      hint: 'Квадрат суммы: (a + b)² = a² + 2ab + b².',
      solution: `По формуле (a ${minus ? '−' : '+'} b)² = a² ${minus ? '−' : '+'} 2ab + b²: средний член равен 2 · x · ${k} = ${2 * k}x.`,
      key: `sq:${minus}:${k}`,
    }
  }
  const a = rng.int(21, 99)
  const b = rng.int(11, a - 2)
  if ((a + b) % 10 !== 0 && (a - b) % 10 !== 0) return null
  return {
    kind: 'number',
    prompt: `Вычислите удобным способом: ${a}² − ${b}².`,
    answer: String(a * a - b * b),
    hint: 'Разность квадратов: a² − b² = (a − b)(a + b).',
    solution: `${a}² − ${b}² = (${a} − ${b})(${a} + ${b}) = ${a - b} · ${a + b} = ${a * a - b * b}.`,
    key: `dsq:${a}:${b}`,
  }
}

function grade8(rng: Rng, t: number): Draft | null {
  if (t === 0 || t === 1) {
    const r1 = rng.int(-9, 9)
    const r2 = rng.int(-9, 9)
    if (r1 === r2 || r1 === 0 || r2 === 0) return null
    const p = -(r1 + r2)
    const q = r1 * r2
    const eq = `x² ${p === 0 ? '' : p > 0 ? `+ ${p === 1 ? '' : p}x ` : `− ${p === -1 ? '' : -p}x `}${sgn(q)} = 0`
    const ask = t === 0 ? 'Найдите больший корень.' : rng.chance(0.5) ? 'Найдите сумму корней.' : 'Найдите произведение корней.'
    const ans = t === 0 ? Math.max(r1, r2) : ask.includes('сумму') ? r1 + r2 : q
    const D = p * p - 4 * q
    return {
      kind: 'number',
      prompt: `Дано уравнение ${eq}. ${ask}`,
      answer: String(ans),
      hint: t === 0 ? 'Найдите дискриминант D = b² − 4ac и корни x = (−b ± √D) / 2.' : 'Теорема Виета: x₁ + x₂ = −p, x₁ · x₂ = q для x² + px + q = 0.',
      solution:
        t === 0
          ? `D = ${par(p)}² − 4 · ${par(q)} = ${D}, √D = ${Math.sqrt(D)}. Корни: (${neg(-p)} ± ${Math.sqrt(D)}) / 2, то есть ${neg(Math.min(r1, r2))} и ${neg(Math.max(r1, r2))}. Больший — ${neg(Math.max(r1, r2))}.`
          : `По теореме Виета сумма корней равна ${neg(-p)}, а произведение — ${neg(q)} (корни ${neg(r1)} и ${neg(r2)}). Ответ: ${neg(ans)}.`,
      key: `quad:${t}:${ask}:${r1 + r2}:${q}`,
    }
  }
  if (t === 2) {
    const pairs = [
      [2, 18],
      [2, 32],
      [3, 12],
      [3, 27],
      [5, 20],
      [2, 50],
      [3, 48],
      [5, 45],
      [6, 24],
      [7, 28],
      [2, 8],
      [5, 80],
    ]
    const [a, b] = rng.pick(pairs)
    const res = Math.sqrt(a * b)
    return {
      kind: 'number',
      prompt: `Вычислите: √${a} · √${b}.`,
      answer: String(res),
      hint: 'Произведение корней равно корню из произведения: √a · √b = √(ab).',
      solution: `√${a} · √${b} = √${a * b} = ${res}.`,
      key: `root:${a}:${b}`,
    }
  }
  const a = rng.int(2, 7)
  const b = rng.int(1, 15)
  const c = rng.int(-5, 30)
  // ax − b > c  →  x > (c + b) / a
  const bound = (c + b) / a
  const least = Number.isInteger(bound) ? bound + 1 : Math.floor(bound) + 1
  return {
    kind: 'number',
    prompt: `Найдите наименьшее целое решение неравенства ${a}x − ${b} > ${neg(c)}.`,
    answer: String(least),
    hint: 'Решите неравенство как уравнение, но помните: знак строгий.',
    solution: `${a}x > ${neg(c)} + ${b} = ${c + b}, x > ${Number.isInteger(bound) ? bound : `${c + b}/${a}`}${Number.isInteger(bound) ? '' : ` ≈ ${bound.toFixed(2).replace('.', ',')}`}. Наименьшее целое число, которое больше этого, — ${least}.`,
    key: `ineq:${a}:${b}:${c}`,
  }
}

function grade9(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const a1 = rng.int(-10, 15)
    const d = rng.pick([-4, -3, -2, 2, 3, 4, 5, 6, 7])
    const n = rng.int(8, 25)
    const sum = rng.chance(0.5)
    if (sum) {
      const S = ((2 * a1 + (n - 1) * d) * n) / 2
      return {
        kind: 'number',
        prompt: `Арифметическая прогрессия: a₁ = ${neg(a1)}, d = ${neg(d)}. Найдите сумму первых ${n} членов.`,
        answer: String(S),
        hint: 'Sₙ = (2a₁ + (n − 1)d) · n / 2.',
        solution: `S${sub(n)} = (2 · ${par(a1)} + ${n - 1} · ${par(d)}) · ${n} / 2 = ${neg(2 * a1 + (n - 1) * d)} · ${n} / 2 = ${neg(S)}.`,
        key: `aps:${a1}:${d}:${n}`,
      }
    }
    return {
      kind: 'number',
      prompt: `Арифметическая прогрессия: a₁ = ${neg(a1)}, d = ${neg(d)}. Найдите a${sub(n)}.`,
      answer: String(a1 + (n - 1) * d),
      hint: 'aₙ = a₁ + (n − 1)d.',
      solution: `a${sub(n)} = ${neg(a1)} + (${n} − 1) · ${par(d)} = ${neg(a1)} ${sgn((n - 1) * d)} = ${neg(a1 + (n - 1) * d)}.`,
      key: `apn:${a1}:${d}:${n}`,
    }
  }
  if (t === 1) {
    const b1 = rng.pick([1, 2, 3, 5, -2, -3])
    const q = rng.pick([2, 3, -2, 4])
    const n = rng.int(4, 7)
    const bn = b1 * q ** (n - 1)
    if (Math.abs(bn) > 5000) return null
    return {
      kind: 'number',
      prompt: `Геометрическая прогрессия: b₁ = ${neg(b1)}, q = ${neg(q)}. Найдите ${n}-й член прогрессии.`,
      answer: String(bn),
      hint: 'bₙ = b₁ · qⁿ⁻¹.',
      solution: `b${sub(n)} = ${neg(b1)} · ${par(q)}${sup(n - 1)} = ${neg(b1)} · ${par(q ** (n - 1))} = ${neg(bn)}.`,
      key: `gp:${b1}:${q}:${n}`,
    }
  }
  if (t === 2) {
    const x = rng.int(-8, 12)
    const y = rng.int(-8, 12)
    const a = rng.int(1, 4)
    const b = rng.int(1, 4)
    const c1 = x + y
    const c2 = a * x - b * y
    return {
      kind: 'number',
      prompt: `Решите систему уравнений:\nx + y = ${neg(c1)}\n${term(a, 'x')} − ${b === 1 ? '' : b}y = ${neg(c2)}\nВ ответ запишите x.`,
      answer: String(x),
      hint: 'Выразите y из первого уравнения и подставьте во второе.',
      solution: `Из первого: y = ${neg(c1)} − x. Подставим: ${a === 1 ? '' : a}x − ${b === 1 ? '' : b}(${neg(c1)} − x) = ${neg(c2)} ⇒ ${a + b}x = ${neg(c2)} ${sgn(b * c1)} = ${neg(c2 + b * c1)} ⇒ x = ${neg(x)}, y = ${neg(y)}.`,
      key: `sys:${c1}:${a}:${b}:${c2}`,
    }
  }
  const x0 = rng.int(-6, 6)
  const c = rng.int(-10, 10)
  const b = -2 * x0
  const y0 = x0 * x0 + b * x0 + c
  const askY = rng.chance(0.5)
  return {
    kind: 'number',
    prompt: `Найдите ${askY ? 'ординату (y)' : 'абсциссу (x)'} вершины параболы y = x² ${b === 0 ? '' : `${sgn(b)}x `}${sgn(c)}.`,
    answer: String(askY ? y0 : x0),
    hint: 'Вершина параболы y = ax² + bx + c: x₀ = −b / (2a).',
    solution: `x₀ = −${par(b)} / 2 = ${neg(x0)}. y₀ = ${par(x0)}² ${b === 0 ? '' : `${sgn(b)} · ${par(x0)} `}${sgn(c)} = ${neg(y0)}.`,
    key: `vertex:${b}:${c}:${askY}`,
  }
}

const TRIG: { f: string; deg: number; v: string }[] = [
  { f: 'sin', deg: 30, v: '1/2' },
  { f: 'sin', deg: 45, v: '√2/2' },
  { f: 'sin', deg: 60, v: '√3/2' },
  { f: 'sin', deg: 90, v: '1' },
  { f: 'sin', deg: 0, v: '0' },
  { f: 'cos', deg: 0, v: '1' },
  { f: 'cos', deg: 30, v: '√3/2' },
  { f: 'cos', deg: 45, v: '√2/2' },
  { f: 'cos', deg: 60, v: '1/2' },
  { f: 'cos', deg: 90, v: '0' },
  { f: 'tg', deg: 45, v: '1' },
  { f: 'tg', deg: 60, v: '√3' },
  { f: 'tg', deg: 30, v: '√3/3' },
  { f: 'tg', deg: 0, v: '0' },
  { f: 'cos', deg: 180, v: '−1' },
  { f: 'sin', deg: 270, v: '−1' },
]

function grade10(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const e = rng.pick(TRIG)
    return {
      kind: 'choice',
      prompt: `Чему равен ${e.f} ${e.deg}°?`,
      ...withOptions(e.v, rng.shuffle(['0', '1', '1/2', '√2/2', '√3/2', '√3', '√3/3', '−1', '−1/2'].filter((x) => x !== e.v)), rng),
      hint: 'Вспомните таблицу значений для углов 0°, 30°, 45°, 60°, 90° или единичную окружность.',
      solution: `${e.f} ${e.deg}° = ${e.v}.${e.f === 'tg' ? ' Напомним: tg α = sin α / cos α.' : ''}`,
      key: `trig:${e.f}:${e.deg}`,
    }
  }
  if (t === 1) {
    const m = rng.pick([2, 3, 4, 5, 6, 9, 10, 12, 18])
    const k = rng.int(1, 2 * m - 1)
    if (k % m === 0 || gcd(k, m) !== 1) return null
    const deg = (180 * k) / m
    if (!Number.isInteger(deg)) return null
    return {
      kind: 'number',
      prompt: `Сколько градусов в угле ${k === 1 ? '' : k}π/${m} радиан?`,
      answer: String(deg),
      hint: 'π радиан = 180°.',
      solution: `π = 180°, поэтому ${k === 1 ? '' : k}π/${m} = ${k} · 180° / ${m} = ${deg}°.`,
      key: `rad:${k}:${m}`,
    }
  }
  if (t === 2) {
    const a = rng.int(-3, 4)
    const b = rng.int(-5, 5)
    const c = rng.int(-9, 9)
    const x0 = rng.int(-3, 3)
    if (a === 0) return null
    const f = poly([a, b, c, 7])
    const d = 3 * a * x0 * x0 + 2 * b * x0 + c
    return {
      kind: 'number',
      prompt: `Найдите значение производной функции f(x) = ${f} в точке x₀ = ${neg(x0)}.`,
      answer: String(d),
      hint: '(xⁿ)′ = n · xⁿ⁻¹, производная константы равна нулю.',
      solution: `f′(x) = ${poly([3 * a, 2 * b, c])}. f′(${neg(x0)}) = ${poly([3 * a, 2 * b, c]).replace(/x²/, ` · ${par(x0)}²`).replace(/x(?!²)/, ` · ${par(x0)}`)} = ${neg(d)}.`,
      key: `der:${a}:${b}:${c}:${x0}`,
    }
  }
  const x0 = rng.int(-6, 6)
  const b = -2 * x0
  const c = rng.int(-9, 9)
  return {
    kind: 'number',
    prompt: `Найдите точку минимума функции f(x) = x² ${b === 0 ? '' : `${sgn(b)}x `}${sgn(c)}.`,
    answer: String(x0),
    hint: 'Приравняйте производную к нулю и проверьте, как меняется её знак.',
    solution: `f′(x) = ${poly([2, b])}. f′(x) = 0 при x = ${neg(x0)}. Слева от этой точки производная отрицательна, справа — положительна, значит, это точка минимума.`,
    key: `min:${b}:${c}`,
  }
}

function grade11(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const a = rng.pick([2, 3, 5, 10])
    const k = rng.int(-2, a === 2 ? 8 : 4)
    const val = a ** k
    const shown = k >= 0 ? String(val) : `1/${a ** -k}`
    return {
      kind: 'number',
      prompt: `Вычислите: log${sub(a)} ${shown}.`,
      answer: String(k),
      hint: 'logₐ b — это показатель степени, в которую нужно возвести a, чтобы получить b.',
      solution: `${a}${sup(k)} = ${shown}, значит, логарифм равен ${neg(k)}.`,
      key: `log:${a}:${k}`,
    }
  }
  if (t === 1) {
    const a = rng.pick([2, 3, 5])
    const k = rng.int(2, a === 2 ? 7 : 4)
    const m = rng.int(-3, 4)
    if (m === 0) return null
    const x = k - m
    return {
      kind: 'number',
      prompt: `Решите уравнение ${a}^(x ${sgn(m)}) = ${a ** k}.`,
      answer: String(x),
      hint: `Представьте правую часть как степень числа ${a}.`,
      solution: `${a ** k} = ${a}${sup(k)}. Основания равны, значит, x ${sgn(m)} = ${k}, x = ${neg(x)}.`,
      key: `exp:${a}:${k}:${m}`,
    }
  }
  if (t === 2) {
    const a = rng.int(1, 5)
    const b = rng.int(0, 6)
    const k = rng.int(1, 5)
    const res = a * k * k + b * k
    return {
      kind: 'number',
      prompt: `Вычислите интеграл ∫₀^${k} (${2 * a}x${b ? ` + ${b}` : ''}) dx.`,
      answer: String(res),
      hint: 'Найдите первообразную и примените формулу Ньютона — Лейбница: F(b) − F(a).',
      solution: `Первообразная: F(x) = ${a === 1 ? '' : a}x²${b ? ` + ${b}x` : ''}. F(${k}) − F(0) = ${a * k * k}${b ? ` + ${b * k}` : ''} = ${res}.`,
      key: `int:${a}:${b}:${k}`,
    }
  }
  const k = rng.int(1, 6)
  const m = rng.int(-5, 9)
  if (m === 0) return null
  const x = 2 ** k - m
  return {
    kind: 'number',
    prompt: `Решите уравнение log₂(x ${sgn(m)}) = ${k}.`,
    answer: String(x),
    hint: 'По определению логарифма: x + m = 2ᵏ.',
    solution: `x ${sgn(m)} = 2${sup(k)} = ${2 ** k}, x = ${neg(x)}. Проверка: выражение под логарифмом положительно (${2 ** k} > 0).`,
    key: `logeq:${k}:${m}`,
  }
}

const GRADES = [grade7, grade8, grade9, grade10, grade11]

function generate(level: Level, rng: Rng, index: number): Draft | null {
  return GRADES[level - 1](rng, index % 4)
}

export const algebraGenerator: ModuleGenerator = {
  module: 'algebra',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function algebra(): Task[] {
  return collect(algebraGenerator)
}
