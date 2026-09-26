import type { Level } from '../types.ts'
import type { Rng } from './rng.ts'
import { choice, numeric } from './kit.ts'
import { plural, type Draft, type ModuleGenerator } from './util.ts'

/** Логика: переливания, шифры, числовые ребусы, магические квадраты, кубики, графы. */

const T = { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 } as const

// ——— Переливания ———

type State = [number, number]

/** Кратчайшая последовательность действий, чтобы в одном из сосудов оказалось target литров. */
function pour(a: number, b: number, target: number): string[] | null {
  const key = (s: State) => `${s[0]},${s[1]}`
  const prev = new Map<string, [string, string] | null>([[key([0, 0]), null]])
  const queue: State[] = [[0, 0]]
  while (queue.length) {
    const [x, y] = queue.shift()!
    if (x === target || y === target) {
      const steps: string[] = []
      let k = key([x, y])
      while (prev.get(k)) {
        const [from, what] = prev.get(k)!
        steps.push(`${what} → (${k.replace(',', '; ')})`)
        k = from
      }
      return steps.reverse()
    }
    const t1 = Math.min(x, b - y)
    const t2 = Math.min(y, a - x)
    const next: [State, string][] = [
      [[a, y], `наполнить ${a}-литровый`],
      [[x, b], `наполнить ${b}-литровый`],
      [[0, y], `вылить ${a}-литровый`],
      [[x, 0], `вылить ${b}-литровый`],
      [[x - t1, y + t1], `перелить из ${a}-литрового в ${b}-литровый`],
      [[x + t2, y - t2], `перелить из ${b}-литрового в ${a}-литровый`],
    ]
    for (const [s, what] of next) {
      const k = key(s)
      if (prev.has(k)) continue
      prev.set(k, [key([x, y]), what])
      queue.push(s)
    }
  }
  return null
}

function pouring(level: Level, rng: Rng): Draft | null {
  const ranges: [number, number][] = [
    [2, 5],
    [3, 7],
    [3, 9],
    [4, 11],
    [5, 13],
  ]
  const [lo, hi] = ranges[level - 1]
  const a = rng.int(lo, hi - 1)
  const b = rng.int(a + 1, hi)
  const target = rng.int(1, b - 1)
  if (target === a) return null
  const steps = pour(a, b, target)
  if (!steps) return null
  const min = [2, 3, 4, 6, 7][level - 1]
  const max = [4, 5, 7, 9, 12][level - 1]
  if (steps.length < min || steps.length > max) return null
  return numeric(
    `Есть два пустых сосуда: на ${a} и на ${b} ${plural(b, 'литр', 'литра', 'литров')} — и сколько угодно воды из крана. Можно наполнить сосуд доверху, вылить его целиком или переливать из одного в другой, пока один не опустеет или другой не наполнится. За какое наименьшее число действий можно получить ровно ${target} л в одном из сосудов?`,
    steps.length,
    'Попробуйте оба направления: начинать с большого сосуда и с маленького. Записывайте состояние как (литры в первом; литры во втором).',
    [`Состояние записываем так: (${a}-литровый; ${b}-литровый). Кратчайший путь найден перебором всех состояний:`, ...steps.map((s, i) => `${i + 1}. ${s}`), `Итого ${steps.length} ${plural(steps.length, 'действие', 'действия', 'действий')}.`],
    `p:${a}:${b}:${target}`,
    { ref: 0 },
  )
}

// ——— Шифры ———

const ABC = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
const WORDS = ['ЛОГИКА', 'ПАМЯТЬ', 'ЗАДАЧА', 'КНИГА', 'ШКОЛА', 'МОРЕ', 'ЗАМОК', 'СИГНАЛ', 'КОМПАС', 'ПЛАНЕТА', 'РАКЕТА', 'ОСТРОВ', 'СЕКРЕТ', 'ТАЙНА', 'ШИФР', 'ОТВЕТ', 'ВЕСНА', 'УЛИЦА', 'ДОРОГА', 'ЛАМПА', 'ПОЕЗД', 'ГОРОД', 'РЕКА', 'СОЛНЦЕ', 'ОБЛАКО', 'ЯБЛОКО', 'КАРТА', 'МЕЧТА', 'ПОБЕДА', 'ЗАГАДКА', 'ФОНАРЬ', 'ТРОПА', 'КЛАД', 'КОРАБЛЬ', 'МАЯК']

const shift = (w: string, k: number) =>
  w
    .split('')
    .map((c) => ABC[(ABC.indexOf(c) + k + 33 * 10) % 33])
    .join('')
const atbash = (w: string) =>
  w
    .split('')
    .map((c) => ABC[32 - ABC.indexOf(c)])
    .join('')

function ciphers(level: Level, rng: Rng, index: number): Draft | null {
  const w = rng.pick(WORDS)
  if (level === 1) {
    const nums = w.split('').map((c) => ABC.indexOf(c) + 1)
    return {
      kind: 'text',
      prompt: `Каждая буква заменена своим номером в алфавите (А = 1, Б = 2, …, Ё = 7, …, Я = 33). Расшифруйте слово: ${nums.join(' ')}.`,
      answer: w.toLowerCase(),
      hint: 'Таблицу номеров букв можно посмотреть в теории темы «Буквенные ряды».',
      solution: [`${w.split('').map((c, i) => `${nums[i]} — ${c}`).join(', ')}.`, `Слово: ${w}.`].join('\n'),
      ref: 0,
      key: `n:${w}`,
    }
  }
  if (level === 2 || (level === 3 && index % 2 === 0)) {
    const k = rng.int(1, level === 2 ? 3 : 7)
    const c = shift(w, k)
    return {
      kind: 'text',
      prompt: `Слово зашифровано шифром Цезаря: каждая буква заменена на букву, стоящую на ${k} ${plural(k, 'позицию', 'позиции', 'позиций')} дальше по алфавиту (с Ё, после Я снова идёт А). Расшифруйте: ${c}.`,
      answer: w.toLowerCase(),
      hint: `Сдвиньте каждую букву на ${k} назад по алфавиту.`,
      solution: [`Сдвигаем каждую букву на ${k} назад: ${c.split('').map((x, i) => `${x}→${w[i]}`).join(', ')}.`, `Слово: ${w}.`].join('\n'),
      ref: 1,
      key: `c:${w}:${k}`,
    }
  }
  if (level === 3 || (level === 4 && index % 2 === 0)) {
    const k = rng.int(1, 12)
    const c = shift(w, k)
    return numeric(`Слово ${w} зашифровали шифром Цезаря и получили ${c}. На сколько позиций вперёд по алфавиту (с Ё) сдвинута каждая буква?`, k, 'Сравните первую букву слова и первую букву шифровки.', [`${w[0]} — ${ABC.indexOf(w[0]) + 1}-я буква, ${c[0]} — ${ABC.indexOf(c[0]) + 1}-я.`, `Сдвиг: ${(ABC.indexOf(c[0]) - ABC.indexOf(w[0]) + 33) % 33}. Проверка на второй букве: ${w[1]} → ${c[1]}.`], `k:${w}:${k}`, { ref: 1 })
  }
  if (level === 4) {
    const c = atbash(w)
    return {
      kind: 'text',
      prompt: `Слово зашифровано шифром «Атбаш»: первая буква алфавита заменяется последней, вторая — предпоследней и так далее (А ↔ Я, Б ↔ Ю, В ↔ Э…; алфавит с Ё). Расшифруйте: ${c}.`,
      answer: w.toLowerCase(),
      hint: 'Номер буквы и номер её пары в сумме дают 34.',
      solution: [`Атбаш — зеркальный шифр: буква с номером n заменяется буквой с номером 34 − n.`, `${c.split('').map((x, i) => `${x}→${w[i]}`).join(', ')}.`, `Слово: ${w}.`].join('\n'),
      ref: 2,
      key: `a:${w}`,
    }
  }
  // Уровень 5: сдвиг неизвестен, но известна одна буква исходного слова.
  const k = rng.int(2, 20)
  const c = shift(w, k)
  return {
    kind: 'text',
    prompt: `Слово зашифровано шифром Цезаря с неизвестным сдвигом (алфавит с Ё). Известно, что первая буква исходного слова — «${w[0]}». Расшифруйте: ${c}.`,
    answer: w.toLowerCase(),
    hint: 'По первой букве найдите сдвиг, затем примените его ко всем буквам.',
    solution: [`${w[0]} зашифрована как ${c[0]}: сдвиг ${k}.`, `Сдвигаем каждую букву на ${k} назад: ${c.split('').map((x, i) => `${x}→${w[i]}`).join(', ')}.`, `Слово: ${w}.`].join('\n'),
    ref: 1,
    key: `u:${w}:${k}`,
  }
}

// ——— Числовые ребусы ———

const LETTERS = 'АБВГДЕЖЗИК'

/**
 * Сколько решений у ребуса a + b = c (не больше limit): перебор по разрядам
 * справа налево с учётом переноса — неподходящие цифры отсекаются сразу.
 */
function countSolutions(a: string, b: string, c: string, limit = 2): number {
  const len = Math.max(a.length, b.length, c.length)
  const at = (w: string, i: number) => (i < w.length ? w[w.length - 1 - i] : undefined)
  const first = new Set([a[0], b[0], c[0]])
  const val = new Map<string, number>()
  const used = new Array(10).fill(false)
  let count = 0
  const assign = (letters: (string | undefined)[], k: number, then: () => void) => {
    if (k === letters.length) return then()
    const l = letters[k]
    if (l === undefined || val.has(l)) return assign(letters, k + 1, then)
    for (let d = 0; d <= 9 && count < limit; d++) {
      if (used[d] || (d === 0 && first.has(l))) continue
      used[d] = true
      val.set(l, d)
      assign(letters, k + 1, then)
      val.delete(l)
      used[d] = false
    }
  }
  const column = (i: number, carry: number) => {
    if (count >= limit) return
    if (i === len) {
      if (carry === 0) count++
      return
    }
    const x = at(a, i)
    const y = at(b, i)
    const z = at(c, i)
    if (z === undefined) return
    assign([x, y, z], 0, () => {
      const s = (x ? val.get(x)! : 0) + (y ? val.get(y)! : 0) + carry
      if (s % 10 === val.get(z)) column(i + 1, Math.floor(s / 10))
    })
  }
  column(0, 0)
  return count
}

function rebus(level: Level, rng: Rng): Draft | null {
  const digits = [[2, 2], [2, 2], [3, 2], [3, 3], [3, 3]][level - 1]
  const lo = (n: number) => 10 ** (n - 1)
  const x = rng.int(lo(digits[0]), lo(digits[0]) * 10 - 1)
  const y = rng.int(lo(digits[1]), lo(digits[1]) * 10 - 1)
  const op: '+' | '−' = level >= 4 && rng.chance(0.4) && x > y ? '−' : '+'
  const z = op === '+' ? x + y : x - y
  if (z < 10) return null
  const all = `${x}${y}${z}`
  const ds = [...new Set(all.split(''))]
  if (ds.length > (level <= 2 ? 5 : 6)) return null
  const letters = rng.sample(LETTERS.split(''), ds.length)
  const map = new Map(ds.map((d, i) => [d, letters[i]]))
  const enc = (n: number) =>
    String(n)
      .split('')
      .map((d) => map.get(d)!)
      .join('')
  const [wx, wy, wz] = [enc(x), enc(y), enc(z)]
  // Вычитание x − y = z проверяем как сложение z + y = x.
  if ((op === '+' ? countSolutions(wx, wy, wz) : countSolutions(wz, wy, wx)) !== 1) return null
  const ask = level <= 2 ? wz : rng.pick([wx, wy, wz])
  const answer = ask === wx ? x : ask === wy ? y : z
  return numeric(
    `Решите числовой ребус: одинаковые буквы — одинаковые цифры, разные — разные, числа не начинаются с нуля.\n${wx} ${op} ${wy} = ${wz}\nКакое число зашифровано словом ${ask}?`,
    answer,
    'Начните со старших разрядов и переносов: сумма двух цифр не больше 18, поэтому перенос — не больше 1.',
    [`Решение единственное: ${[...map].map(([d, l]) => `${l} = ${d}`).join(', ')}.`, `${x} ${op} ${y} = ${z}.`, `${ask} = ${answer}.`, 'Единственность проверена перебором всех вариантов.'],
    `r:${wx}${op}${wy}=${wz}:${ask}`,
    { ref: 0 },
  )
}

// ——— Магические квадраты ———

const LO_SHU = [
  [2, 7, 6],
  [9, 5, 1],
  [4, 3, 8],
]
const DURER = [
  [16, 3, 2, 13],
  [5, 10, 11, 8],
  [9, 6, 7, 12],
  [4, 15, 14, 1],
]

function symmetries(m: number[][]): number[][][] {
  const rot = (a: number[][]) => a.map((_, i) => a.map((row) => row[i]).reverse())
  const flip = (a: number[][]) => a.map((row) => [...row].reverse())
  const out: number[][][] = []
  let cur = m
  for (let i = 0; i < 4; i++) {
    out.push(cur, flip(cur))
    cur = rot(cur)
  }
  return out
}

/** Какие клетки можно найти по очереди, зная сумму строки, столбца и диагонали. */
function solvable(m: (number | null)[][], sum: number, target: [number, number]): boolean {
  const n = m.length
  const g = m.map((r) => [...r])
  const lines: [number, number][][] = []
  for (let i = 0; i < n; i++) {
    lines.push(Array.from({ length: n }, (_, j) => [i, j]))
    lines.push(Array.from({ length: n }, (_, j) => [j, i]))
  }
  lines.push(Array.from({ length: n }, (_, j) => [j, j]))
  lines.push(Array.from({ length: n }, (_, j) => [j, n - 1 - j]))
  let progress = true
  while (progress) {
    progress = false
    for (const line of lines) {
      const unknown = line.filter(([r, c]) => g[r][c] === null)
      if (unknown.length === 1) {
        const [r, c] = unknown[0]
        g[r][c] = sum - line.reduce((s, [rr, cc]) => s + (g[rr][cc] ?? 0), 0)
        progress = true
      }
    }
  }
  return g[target[0]][target[1]] !== null
}

function magic(level: Level, rng: Rng): Draft | null {
  const big = level === 5
  const base = rng.pick(symmetries(big ? DURER : LO_SHU))
  const k = big ? 1 : rng.int(1, level >= 3 ? 3 : 1)
  const add = rng.int(0, level >= 2 ? 20 : 5)
  const sq = base.map((r) => r.map((x) => x * k + add))
  const n = sq.length
  const sum = sq[0].reduce((s, x) => s + x, 0)
  const holes = [1, 2, 3, 4, 5][level - 1]
  const cells = rng.sample(Array.from({ length: n * n }, (_, i) => i), holes)
  const target = cells[0]
  const tr: [number, number] = [Math.floor(target / n), target % n]
  const grid: (number | null)[][] = sq.map((r) => [...r])
  for (const c of cells) grid[Math.floor(c / n)][c % n] = null
  // Сумму знает только тот, у кого есть полная линия — иначе задача не решается.
  const complete = [...grid, ...grid.map((_, j) => grid.map((r) => r[j]))].some((line) => line.every((x) => x !== null))
  if (!complete || !solvable(grid, sum, tr)) return null
  const rows = grid.map((r, i) => r.map((x, j) => (i === tr[0] && j === tr[1] ? '?' : x === null ? '·' : String(x))))
  const fullRow = grid.findIndex((r) => r.every((x) => x !== null))
  const fullCol = grid[0].findIndex((_, j) => grid.every((r) => r[j] !== null))
  const shown = fullRow >= 0 ? `строка ${fullRow + 1}: ${sq[fullRow].join(' + ')}` : `столбец ${fullCol + 1}: ${sq.map((r) => r[fullCol]).join(' + ')}`
  return numeric(
    `Это магический квадрат: суммы чисел в каждой строке, каждом столбце и на обеих диагоналях равны. Какое число должно стоять на месте вопросительного знака${holes > 1 ? ' (точками отмечены другие пропущенные числа)' : ''}?`,
    sq[tr[0]][tr[1]],
    'Сначала найдите «магическую сумму» по заполненной строке, столбцу или диагонали.',
    [`Магическая сумма — по полностью заполненной линии (${shown}) = ${sum}.`, `Ищем линию, где неизвестно только одно число, находим его, и так по цепочке.`, `Итоговый квадрат:\n${sq.map((r) => r.join('  ')).join('\n')}`, `На месте «?» — ${sq[tr[0]][tr[1]]}.`],
    `m:${rows.map((r) => r.join(',')).join('/')}`,
    { display: { type: 'grid', rows }, ref: 0 },
  )
}

// ——— Кубики ———

function cubes(level: Level, rng: Rng, index: number): Draft | null {
  const [r, c, h] = [
    [2, 2, 2],
    [2, 3, 3],
    [3, 3, 3],
    [3, 3, 4],
    [3, 4, 4],
  ][level - 1]
  const hs = Array.from({ length: r }, () => Array.from({ length: c }, () => rng.int(level <= 2 ? 1 : 0, h)))
  const sum = hs.flat().reduce((s, x) => s + x, 0)
  if (sum < 3) return null
  const rows = hs.map((row) => row.map(String))
  const display = { type: 'grid' as const, rows }
  const intro = 'Из одинаковых кубиков сложили фигуру. На рисунке — вид сверху: в каждой клетке написано, сколько кубиков стоит столбиком на этом месте (0 — пусто).'
  const front = Array.from({ length: c }, (_, j) => Math.max(...hs.map((row) => row[j])))
  const side = hs.map((row) => Math.max(...row))
  const types = level === 1 ? [0] : level === 2 ? [0, 1] : level === 3 ? [0, 1, 2] : [1, 2, 3]
  const t = types[index % types.length]
  if (t === 0) return numeric(`${intro} Сколько всего кубиков в фигуре?`, sum, 'Сложите числа во всех клетках.', [`${hs.flat().join(' + ')} = ${sum}.`], `s:${rows.flat().join('')}`, { display, ref: 0 })
  if (t === 1)
    return numeric(`${intro} Сколько квадратиков будет видно, если смотреть на фигуру спереди (снизу рисунка)?`, front.reduce((s, x) => s + x, 0), 'Спереди в каждом столбце видна только самая высокая башня.', [`Смотрим спереди: в каждом столбце видна высота самой высокой башни: ${front.join(', ')}.`, `Всего: ${front.join(' + ')} = ${front.reduce((s, x) => s + x, 0)}.`], `f:${rows.flat().join('')}`, { display, ref: 1 })
  if (t === 2)
    return numeric(`${intro} Сколько квадратиков будет видно, если смотреть на фигуру сбоку (справа)?`, side.reduce((s, x) => s + x, 0), 'Сбоку в каждой строке видна только самая высокая башня.', [`Смотрим справа: в каждой строке видна самая высокая башня: ${side.join(', ')}.`, `Всего: ${side.join(' + ')} = ${side.reduce((s, x) => s + x, 0)}.`], `d:${rows.flat().join('')}`, { display, ref: 1 })
  const max = Math.max(...hs.flat())
  const need = r * c * max - sum
  return numeric(`${intro} Какое наименьшее число кубиков нужно добавить, чтобы получился сплошной прямоугольный параллелепипед?`, need, 'Высота параллелепипеда — не меньше самой высокой башни.', [`Самая высокая башня — ${max}, поэтому параллелепипед ${r} × ${c} × ${max} = ${r * c * max} кубиков.`, `Уже есть ${sum}, добавить: ${r * c * max} − ${sum} = ${need}.`], `b:${rows.flat().join('')}`, { display, ref: 2 })
}

// ——— Графы ———

const TOWNS = 'АБВГДЕЖ'

function graphs(level: Level, rng: Rng, index: number): Draft | null {
  const t = level <= 2 ? 0 : level === 3 ? index % 2 : index % 3
  if (t === 2) {
    const m = rng.int(2, level === 4 ? 4 : 6)
    const n = rng.int(2, level === 4 ? 4 : 5)
    let binom = 1
    for (let i = 1; i <= n; i++) binom = (binom * (m + i)) / i
    return numeric(`Город — сетка из квадратных кварталов: ${m} ${plural(m, 'квартал', 'квартала', 'кварталов')} с запада на восток и ${n} — с юга на север. Сколько существует кратчайших маршрутов из юго-западного угла в северо-восточный (идти можно только на восток и на север по улицам)?`, binom, 'Каждый кратчайший маршрут — это набор шагов «восток» и «север» в каком-то порядке.', [`Любой кратчайший маршрут состоит из ${m} шагов на восток и ${n} на север — всего ${m + n} шагов.`, `Маршрут определяется тем, какие ${n} из ${m + n} шагов — «на север»: C(${m + n}, ${n}) = ${binom}.`, 'Можно и по-другому: в каждом перекрёстке пишем сумму чисел слева и снизу — так получается треугольник Паскаля.'], `p:${m}:${n}`, { ref: 2 })
  }
  const n = level <= 2 ? 4 : level === 3 ? 5 : 6
  const nodes = TOWNS.slice(0, n).split('')
  const edges = new Map<string, number>()
  const add = (a: number, b: number) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`
    if (!edges.has(k)) edges.set(k, rng.int(1, 9))
  }
  // Связный каркас, затем случайные дороги.
  for (let i = 1; i < n; i++) add(i, rng.int(0, i - 1))
  const extra = [1, 2, 3, 4, 5][level - 1]
  for (let i = 0; i < extra; i++) {
    const a = rng.int(0, n - 1)
    const b = rng.int(0, n - 1)
    if (a !== b) add(a, b)
  }
  const list = [...edges].map(([k, w]) => {
    const [a, b] = k.split('-').map(Number)
    return { a, b, w }
  })
  const lines = list.map((e) => `${nodes[e.a]} — ${nodes[e.b]}: ${e.w} км`)
  if (t === 1) {
    const deg = nodes.map((_, i) => list.filter((e) => e.a === i || e.b === i).length)
    const odd = deg.filter((d) => d % 2 === 1).length
    const can = odd === 0 || odd === 2
    return choice(
      'Между городами проложены дороги (указаны ниже). Можно ли проехать по каждой дороге ровно один раз (начать и закончить можно в любых городах)?',
      can ? 'Да' : 'Нет',
      [can ? 'Нет' : 'Да'],
      rng,
      'Посчитайте, сколько дорог выходит из каждого города. Важно, у скольких городов это число нечётное.',
      [`Число дорог у городов: ${nodes.map((x, i) => `${x} — ${deg[i]}`).join(', ')}.`, `Нечётное число дорог у ${odd} ${plural(odd, 'города', 'городов', 'городов')}.`, `Обойти все дороги по одному разу можно, только если таких городов 0 или 2 (теорема Эйлера): в каждый город, кроме начала и конца, мы въезжаем и выезжаем, расходуя дороги парами. ${can ? 'Условие выполнено — можно.' : 'Здесь их больше двух — нельзя.'}`],
      `e:${lines.join(',')}`,
      { display: { type: 'lines', lines }, ref: 1 },
      2,
    )
  }
  // Кратчайший путь (алгоритм Дейкстры).
  const dist = nodes.map(() => Infinity)
  const from = nodes.map(() => -1)
  const done = nodes.map(() => false)
  dist[0] = 0
  for (let it = 0; it < n; it++) {
    let u = -1
    for (let i = 0; i < n; i++) if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i
    done[u] = true
    for (const e of list) {
      const v = e.a === u ? e.b : e.b === u ? e.a : -1
      if (v >= 0 && dist[u] + e.w < dist[v]) {
        dist[v] = dist[u] + e.w
        from[v] = u
      }
    }
  }
  const end = n - 1
  const path: number[] = []
  for (let v = end; v !== -1; v = from[v]) path.unshift(v)
  if (path.length < 3) return null
  // Прямая дорога не должна быть самым коротким путём — иначе задача слишком проста.
  return numeric(
    `Между городами проложены дороги (указаны ниже). Какова длина самого короткого пути из города ${nodes[0]} в город ${nodes[end]} (в км)?`,
    dist[end],
    'Идите от начала: для каждого города запоминайте самое короткое найденное расстояние и улучшайте его.',
    [`Кратчайшие расстояния от ${nodes[0]}: ${nodes.map((x, i) => `${x} — ${dist[i]}`).join(', ')}.`, `Путь: ${path.map((v) => nodes[v]).join(' → ')} = ${path
      .slice(1)
      .map((v, i) => list.find((e) => (e.a === v && e.b === path[i]) || (e.b === v && e.a === path[i]))!.w)
      .join(' + ')} = ${dist[end]} км.`, 'Так работает алгоритм Дейкстры: каждый раз берём ближайший ещё не обработанный город и пробуем улучшить расстояния до его соседей.'],
    `g:${lines.join(',')}`,
    { display: { type: 'lines', lines }, ref: 0 },
  )
}

const make = (module: ModuleGenerator['module'], fn: (level: Level, rng: Rng, index: number) => Draft | null): ModuleGenerator => ({ module, targets: T, make: fn })

export const LOGIC_PUZZLE_GENERATORS: ModuleGenerator[] = [make('pouring', pouring), make('ciphers', ciphers), make('rebus', rebus), make('magic', magic), make('cubes', cubes), make('graphs', graphs)]
