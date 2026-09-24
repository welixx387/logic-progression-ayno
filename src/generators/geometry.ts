import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, type Draft, type ModuleGenerator } from './util.ts'

/** Геометрия 7–11 классов: уровень 1 = 7 класс. Все ответы вычисляются. */

const TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [6, 8, 10],
  [8, 15, 17],
  [9, 12, 15],
  [7, 24, 25],
  [12, 16, 20],
  [20, 21, 29],
  [9, 40, 41],
  [15, 20, 25],
]

function grade7(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const a = rng.int(20, 160)
    const vertical = rng.chance(0.4)
    return {
      kind: 'number',
      prompt: vertical
        ? `Две прямые пересекаются. Один из образовавшихся углов равен ${a}°. Найдите угол, вертикальный ему.`
        : `Один из смежных углов равен ${a}°. Найдите второй угол (в градусах).`,
      answer: String(vertical ? a : 180 - a),
      hint: vertical ? 'Вертикальные углы равны.' : 'Сумма смежных углов равна 180°.',
      solution: vertical ? `Вертикальные углы равны: ${a}°.` : `Сумма смежных углов 180°: 180° − ${a}° = ${180 - a}°.`,
      key: `adj:${vertical}:${a}`,
    }
  }
  if (t === 1) {
    const a = rng.int(25, 100)
    const b = rng.int(20, 150 - a)
    return {
      kind: 'number',
      prompt: `Два угла треугольника равны ${a}° и ${b}°. Найдите третий угол.`,
      answer: String(180 - a - b),
      hint: 'Сумма углов треугольника равна 180°.',
      solution: `180° − ${a}° − ${b}° = ${180 - a - b}°.`,
      key: `tri:${Math.min(a, b)}:${Math.max(a, b)}`,
    }
  }
  if (t === 2) {
    const top = rng.int(10, 85) * 2
    return {
      kind: 'number',
      prompt: `В равнобедренном треугольнике угол при вершине (между боковыми сторонами) равен ${top}°. Найдите угол при основании.`,
      answer: String((180 - top) / 2),
      hint: 'Углы при основании равнобедренного треугольника равны.',
      solution: `Углы при основании равны, их сумма 180° − ${top}° = ${180 - top}°. Каждый: ${180 - top}° : 2 = ${(180 - top) / 2}°.`,
      key: `iso:${top}`,
    }
  }
  const a = rng.int(25, 155)
  const kind = rng.pick(['накрест лежащий', 'соответственный', 'односторонний'])
  const ans = kind === 'односторонний' ? 180 - a : a
  return {
    kind: 'number',
    prompt: `Две параллельные прямые пересечены секущей. Один из углов равен ${a}°. Найдите ${kind} с ним угол.`,
    answer: String(ans),
    hint: 'Накрест лежащие и соответственные углы при параллельных прямых равны, а сумма односторонних равна 180°.',
    solution: kind === 'односторонний' ? `Сумма односторонних углов 180°: 180° − ${a}° = ${ans}°.` : `${kind[0].toUpperCase()}${kind.slice(1)} углы при параллельных прямых равны: ${a}°.`,
    key: `par:${kind}:${a}`,
  }
}

function grade8(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const [a, b, c] = rng.pick(TRIPLES)
    const k = rng.pick([1, 1, 2, 3])
    const findHyp = rng.chance(0.5)
    return {
      kind: 'number',
      prompt: findHyp
        ? `Катеты прямоугольного треугольника равны ${a * k} и ${b * k}. Найдите гипотенузу.`
        : `Гипотенуза прямоугольного треугольника равна ${c * k}, один из катетов — ${a * k}. Найдите другой катет.`,
      answer: String(findHyp ? c * k : b * k),
      hint: 'Теорема Пифагора: c² = a² + b².',
      solution: findHyp
        ? `c² = ${a * k}² + ${b * k}² = ${(a * k) ** 2} + ${(b * k) ** 2} = ${(c * k) ** 2}, c = ${c * k}.`
        : `b² = ${c * k}² − ${a * k}² = ${(c * k) ** 2} − ${(a * k) ** 2} = ${(b * k) ** 2}, b = ${b * k}.`,
      key: `pyth:${findHyp}:${a * k}:${b * k}`,
    }
  }
  if (t === 1) {
    const shape = rng.int(0, 3)
    const a = rng.int(3, 20)
    const h = rng.int(2, 15)
    if (shape === 0) {
      const b = rng.int(2, 20)
      return { kind: 'number', prompt: `Найдите площадь прямоугольника со сторонами ${a} и ${b}.`, answer: String(a * b), hint: 'S = ab.', solution: `S = ${a} · ${b} = ${a * b}.`, key: `rect:${a}:${b}` }
    }
    if (shape === 1) {
      return {
        kind: 'number',
        prompt: `Сторона параллелограмма равна ${a}, а высота, проведённая к ней, — ${h}. Найдите площадь.`,
        answer: String(a * h),
        hint: 'Площадь параллелограмма равна произведению стороны на высоту, проведённую к ней.',
        solution: `S = ${a} · ${h} = ${a * h}.`,
        key: `para:${a}:${h}`,
      }
    }
    if (shape === 2) {
      if ((a * h) % 2) return null
      return {
        kind: 'number',
        prompt: `Сторона треугольника равна ${a}, а высота, проведённая к ней, — ${h}. Найдите площадь треугольника.`,
        answer: String((a * h) / 2),
        hint: 'S = ½ · a · h.',
        solution: `S = ${a} · ${h} / 2 = ${(a * h) / 2}.`,
        key: `trs:${a}:${h}`,
      }
    }
    const b = rng.int(a + 1, a + 14)
    if (((a + b) * h) % 2) return null
    return {
      kind: 'number',
      prompt: `Основания трапеции равны ${a} и ${b}, высота — ${h}. Найдите площадь трапеции.`,
      answer: String(((a + b) * h) / 2),
      hint: 'Площадь трапеции равна полусумме оснований, умноженной на высоту.',
      solution: `S = (${a} + ${b}) / 2 · ${h} = ${(a + b) / 2} · ${h} = ${((a + b) * h) / 2}.`,
      key: `trap:${a}:${b}:${h}`,
    }
  }
  if (t === 2) {
    const n = rng.int(4, 12)
    return {
      kind: 'number',
      prompt: `Найдите сумму внутренних углов выпуклого ${n}-угольника (в градусах).`,
      answer: String((n - 2) * 180),
      hint: 'Сумма углов выпуклого n-угольника равна (n − 2) · 180°.',
      solution: `(${n} − 2) · 180° = ${(n - 2) * 180}°.`,
      key: `poly:${n}`,
    }
  }
  const a = rng.int(3, 15)
  const d = rng.int(2, 12)
  return {
    kind: 'number',
    prompt: `Диагонали ромба равны ${2 * a} и ${2 * d}. Найдите площадь ромба.`,
    answer: String(2 * a * d),
    hint: 'Площадь ромба равна половине произведения диагоналей.',
    solution: `S = ${2 * a} · ${2 * d} / 2 = ${2 * a * d}.`,
    key: `rhomb:${a}:${d}`,
  }
}

function grade9(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const r = rng.int(2, 15)
    const area = rng.chance(0.5)
    return {
      kind: 'number',
      prompt: area ? `Площадь круга радиуса ${r} равна S·π. Найдите S.` : `Длина окружности радиуса ${r} равна L·π. Найдите L.`,
      answer: String(area ? r * r : 2 * r),
      hint: area ? 'S = πr².' : 'C = 2πr.',
      solution: area ? `S = π · ${r}² = ${r * r}π, значит, S = ${r * r}.` : `C = 2π · ${r} = ${2 * r}π, значит, L = ${2 * r}.`,
      key: `circle:${area}:${r}`,
    }
  }
  if (t === 1) {
    const k = rng.int(2, 5)
    const s = rng.int(2, 12)
    return {
      kind: 'number',
      prompt: `Треугольники подобны с коэффициентом ${k}: стороны большего в ${k} ${k === 5 ? 'раз' : 'раза'} длиннее. Площадь меньшего треугольника равна ${s}. Найдите площадь большего.`,
      answer: String(s * k * k),
      hint: 'Отношение площадей подобных фигур равно квадрату коэффициента подобия.',
      solution: `Площади относятся как k² = ${k * k}. ${s} · ${k * k} = ${s * k * k}.`,
      key: `sim:${k}:${s}`,
    }
  }
  if (t === 2) {
    const [a, b, c] = rng.pick(TRIPLES.slice(0, 6))
    const x1 = rng.int(-5, 5)
    const y1 = rng.int(-5, 5)
    const sx = rng.chance(0.5) ? 1 : -1
    const sy = rng.chance(0.5) ? 1 : -1
    const x2 = x1 + sx * a
    const y2 = y1 + sy * b
    const n = (v: number) => (v < 0 ? `−${-v}` : String(v))
    return {
      kind: 'number',
      prompt: `Найдите расстояние между точками A(${n(x1)}; ${n(y1)}) и B(${n(x2)}; ${n(y2)}).`,
      answer: String(c),
      hint: 'AB = √((x₂ − x₁)² + (y₂ − y₁)²).',
      solution: `AB = √(${a}² + ${b}²) = √${a * a + b * b} = ${c}.`,
      key: `dist:${x1}:${y1}:${x2}:${y2}`,
    }
  }
  const n = rng.pick([3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20])
  return {
    kind: 'number',
    prompt: `Найдите внутренний угол правильного ${n}-угольника (в градусах).`,
    answer: String((180 * (n - 2)) / n),
    hint: 'Сумма углов (n − 2) · 180° делится поровну между n равными углами.',
    solution: `(${n} − 2) · 180° / ${n} = ${(n - 2) * 180}° / ${n} = ${(180 * (n - 2)) / n}°.`,
    key: `regular:${n}`,
  }
}

const BOXES = [
  [2, 3, 6, 7],
  [1, 4, 8, 9],
  [2, 6, 9, 11],
  [4, 4, 7, 9],
  [6, 6, 7, 11],
  [2, 10, 11, 15],
  [4, 8, 8, 12],
  [1, 2, 2, 3],
  [2, 4, 4, 6],
  [3, 4, 12, 13],
  [6, 9, 18, 21],
]

function grade10(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const [a, b, c, d] = rng.pick(BOXES)
    return {
      kind: 'number',
      prompt: `Рёбра прямоугольного параллелепипеда равны ${a}, ${b} и ${c}. Найдите его диагональ.`,
      answer: String(d),
      hint: 'Квадрат диагонали параллелепипеда равен сумме квадратов трёх его измерений.',
      solution: `d² = ${a}² + ${b}² + ${c}² = ${a * a + b * b + c * c}, d = ${d}.`,
      key: `boxd:${a}:${b}:${c}`,
    }
  }
  if (t === 1) {
    const n = rng.int(3, 12)
    const prism = rng.chance(0.5)
    const what = rng.pick(['вершин', 'рёбер', 'граней'] as const)
    const val = prism ? { вершин: 2 * n, рёбер: 3 * n, граней: n + 2 }[what] : { вершин: n + 1, рёбер: 2 * n, граней: n + 1 }[what]
    return {
      kind: 'number',
      prompt: `Сколько ${what} у ${n}-угольной ${prism ? 'призмы' : 'пирамиды'}?`,
      answer: String(val),
      hint: prism ? 'У призмы два одинаковых основания и боковые грани-параллелограммы.' : 'У пирамиды одно основание и вершина, из которой выходят боковые рёбра.',
      solution: prism
        ? `У n-угольной призмы 2n вершин, 3n рёбер и n + 2 граней. При n = ${n}: ${what} — ${val}.`
        : `У n-угольной пирамиды n + 1 вершин, 2n рёбер и n + 1 граней. При n = ${n}: ${what} — ${val}.`,
      key: `poly3:${prism}:${n}:${what}`,
    }
  }
  if (t === 2) {
    const a = rng.int(2, 10)
    const b = rng.int(2, 10)
    const c = rng.int(2, 10)
    return {
      kind: 'number',
      prompt: `Найдите площадь полной поверхности прямоугольного параллелепипеда с рёбрами ${a}, ${b} и ${c}.`,
      answer: String(2 * (a * b + b * c + a * c)),
      hint: 'У параллелепипеда три пары одинаковых граней.',
      solution: `S = 2(ab + bc + ac) = 2(${a * b} + ${b * c} + ${a * c}) = ${2 * (a * b + b * c + a * c)}.`,
      key: `boxs:${[a, b, c].sort((x, y) => x - y).join(':')}`,
    }
  }
  const a = rng.int(2, 12)
  return {
    kind: 'number',
    prompt: `Найдите площадь полной поверхности куба с ребром ${a}.`,
    answer: String(6 * a * a),
    hint: 'У куба 6 одинаковых квадратных граней.',
    solution: `S = 6a² = 6 · ${a * a} = ${6 * a * a}.`,
    key: `cube:${a}`,
  }
}

function grade11(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const r = rng.int(1, 8)
    const h = rng.int(1, 12)
    const cone = rng.chance(0.5)
    if (cone && (r * r * h) % 3) return null
    const v = cone ? (r * r * h) / 3 : r * r * h
    return {
      kind: 'number',
      prompt: `Объём ${cone ? 'конуса' : 'цилиндра'} с радиусом основания ${r} и высотой ${h} равен V·π. Найдите V.`,
      answer: String(v),
      hint: cone ? 'V = ⅓ · πr²h.' : 'V = πr²h.',
      solution: `V = ${cone ? '⅓ · ' : ''}π · ${r}² · ${h} = ${v}π.`,
      key: `rot:${cone}:${r}:${h}`,
    }
  }
  if (t === 1) {
    const r = rng.pick([3, 6, 9, 12, 3, 6])
    const surface = rng.chance(0.4)
    const v = surface ? 4 * r * r : (4 * r ** 3) / 3
    return {
      kind: 'number',
      prompt: surface ? `Площадь поверхности шара радиуса ${r} равна S·π. Найдите S.` : `Объём шара радиуса ${r} равен V·π. Найдите V.`,
      answer: String(v),
      hint: surface ? 'S = 4πr².' : 'V = 4/3 · πr³.',
      solution: surface ? `S = 4π · ${r}² = ${v}π.` : `V = 4/3 · π · ${r}³ = 4/3 · ${r ** 3}π = ${v}π.`,
      key: `ball:${surface}:${r}`,
    }
  }
  if (t === 2) {
    const s = rng.int(2, 15) * 3
    const h = rng.int(2, 12)
    return {
      kind: 'number',
      prompt: `Площадь основания пирамиды равна ${s}, высота — ${h}. Найдите объём пирамиды.`,
      answer: String((s * h) / 3),
      hint: 'V = ⅓ · S · h.',
      solution: `V = ⅓ · ${s} · ${h} = ${(s * h) / 3}.`,
      key: `pyr:${s}:${h}`,
    }
  }
  const k = rng.int(2, 4)
  return {
    kind: 'number',
    prompt: `Все рёбра куба увеличили в ${k} раза. Во сколько раз увеличился его объём?`,
    answer: String(k ** 3),
    hint: 'Объём куба — это ребро в кубе.',
    solution: `V = a³. Если ребро стало ${k}a, объём станет (${k}a)³ = ${k ** 3}a³ — в ${k ** 3} раз больше.`,
    key: `scale:${k}`,
  }
}

const GRADES = [grade7, grade8, grade9, grade10, grade11]

function generate(level: Level, rng: Rng, index: number): Draft | null {
  const d = GRADES[level - 1](rng, index % 4)
  // Десятичные дроби — через запятую: 12,5.
  return d && { ...d, solution: d.solution.replace(/(\d)\.(\d)/g, '$1,$2') }
}

export const geometryGenerator: ModuleGenerator = {
  module: 'geometry',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function geometry(): Task[] {
  return collect(geometryGenerator)
}
