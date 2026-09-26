import type { Level, TaskDisplay } from '../types.ts'
import type { Rng } from './rng.ts'
import { choice, memorize, numeric } from './kit.ts'
import { EVENTS, NAMES } from './memory-data.ts'
import { plural, type Draft, type ModuleGenerator } from './util.ts'

/** Задания на память с числами. Уровень задаёт объём материала и время показа. */

const T = { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 } as const

/** Время показа: не меньше 4 секунд, на уровне выше — меньше времени на единицу материала. */
export const secs = (level: Level, units: number, per = 1.2) => Math.max(4, Math.round(units * per * [1.35, 1.2, 1.05, 0.95, 0.85][level - 1]))

const digitsOf = (rng: Rng, n: number) => {
  // Без одинаковых цифр подряд — иначе ряд запоминается слишком легко.
  const out: number[] = []
  while (out.length < n) {
    const d = rng.int(0, 9)
    if (out.length >= 1 && out[out.length - 1] === d) continue
    out.push(d)
  }
  return out
}

const spaced = (s: string) => s.split('').join(' ')

function digits(level: Level, rng: Rng): Draft {
  const n = level + 4
  const d = digitsOf(rng, n)
  const s = d.join('')
  return {
    kind: 'text',
    prompt: 'Введите цифры в том же порядке, в каком они были показаны (без пробелов).',
    display: memorize(secs(level, n, 1.1), `Запомните ряд из ${n} цифр.`, { type: 'sequence', items: d.map(String) }),
    answer: s,
    accept: [spaced(s)],
    hint: 'Проговаривайте цифры группами по 2–3: так их легче удержать.',
    solution: [`Ряд был таким: ${spaced(s)}.`, `Удобно разбить его на группы: ${s.match(/.{1,3}/g)!.join(' — ')}.`, 'Кратковременная память удерживает около 7 ± 2 элементов, а группы превращают несколько цифр в один элемент.'].join('\n'),
    key: `d:${s}`,
  }
}

function backward(level: Level, rng: Rng): Draft {
  const n = level + 2
  const d = digitsOf(rng, n)
  const s = d.join('')
  const r = [...d].reverse().join('')
  return {
    kind: 'text',
    prompt: 'Введите показанные цифры в обратном порядке — от последней к первой (без пробелов).',
    display: memorize(secs(level, n, 1.3), `Запомните ряд из ${n} цифр. Потом его нужно будет назвать задом наперёд.`, { type: 'sequence', items: d.map(String) }),
    answer: r,
    accept: [spaced(r)],
    hint: 'Представьте ряд перед глазами и «читайте» его справа налево.',
    solution: [`Показанный ряд: ${spaced(s)}.`, `Задом наперёд: ${spaced(r)}.`, 'Обратный порядок сложнее прямого: цифры нужно не только удержать, но и переставить в уме — это тренирует рабочую память.'].join('\n'),
    key: `b:${s}`,
  }
}

function chunking(level: Level, rng: Rng): Draft {
  const groups = level + 1
  const size = level >= 4 ? 4 : 3
  const parts = Array.from({ length: groups }, () => digitsOf(rng, size).join(''))
  const k = rng.int(1, groups)
  // Всё число целиком просим только на первых уровнях: 6–9 цифр ещё помещаются в память.
  const ask = level > 2 || rng.chance(0.5)
  const answer = ask ? parts[k - 1] : parts.join('')
  return {
    kind: 'text',
    prompt: ask ? `Введите цифры из ${k}-й группы.` : 'Введите всё число целиком (без пробелов).',
    display: memorize(secs(level, groups, 2.6), `Запомните число. Оно уже разбито на группы по ${size} цифры.`, { type: 'sequence', items: parts }),
    answer,
    ...(ask ? {} : { accept: [parts.join(' ')] }),
    hint: 'Запоминайте не отдельные цифры, а группы — как номер телефона.',
    solution: [`Число: ${parts.join(' ')}.`, ask ? `${k}-я группа — ${parts[k - 1]}.` : `Целиком: ${parts.join('')}.`, `Всего ${groups * size} ${plural(groups * size, 'цифра', 'цифры', 'цифр')}, но групп лишь ${groups} — поэтому число помещается в память. Группы можно превращать в даты, время или знакомые номера.`].join('\n'),
    key: `c:${parts.join('.')}:${ask ? k : 0}`,
  }
}

function numgrid(level: Level, rng: Rng): Draft {
  const size = level <= 2 ? 3 : 4
  const cells = level === 1 ? 6 : level === 2 ? 9 : level === 3 ? 10 : level === 4 ? 13 : 16
  const all = Array.from({ length: size * size }, (_, i) => i)
  const filled = new Set(rng.sample(all, cells))
  const values = rng.sample(Array.from({ length: 89 }, (_, i) => i + 10), cells)
  const grid: string[][] = []
  let v = 0
  const at = new Map<number, number>()
  for (let r = 0; r < size; r++) {
    const row: string[] = []
    for (let c = 0; c < size; c++) {
      const idx = r * size + c
      if (filled.has(idx)) {
        at.set(idx, values[v])
        row.push(String(values[v++]))
      } else row.push('')
    }
    grid.push(row)
  }
  const pickIdx = rng.pick([...filled])
  const r = Math.floor(pickIdx / size) + 1
  const c = (pickIdx % size) + 1
  const display = memorize(secs(level, cells, 1.6), `Запомните таблицу ${size}×${size}: какие числа и где стоят.`, { type: 'grid', rows: grid.map((row) => row.map((x) => x || '·')) })
  return numeric(
    `Какое число стояло в строке ${r}, столбце ${c}? (Строки считаются сверху, столбцы — слева.)`,
    at.get(pickIdx)!,
    'Запоминайте таблицу по строкам и связывайте соседние числа: «в углу 47, рядом 12».',
    [`В строке ${r}, столбце ${c} стояло число ${at.get(pickIdx)}.`, 'Помогает «маршрут» по таблице: проходите её глазами по строкам и проговаривайте числа вслух.'],
    `g:${grid.map((row) => row.join(',')).join('/')}:${pickIdx}`,
    { display },
  )
}

function workmem(level: Level, rng: Rng): Draft {
  const n = level + 3
  const nums = Array.from({ length: n }, () => rng.int(level <= 2 ? 1 : 10, level <= 2 ? 9 : 49))
  const display: TaskDisplay = memorize(secs(level, n, 1.4), `Запомните ${n} ${plural(n, 'число', 'числа', 'чисел')} по порядку.`, { type: 'sequence', items: nums.map(String) })
  const t = rng.int(0, level >= 3 ? 3 : 1)
  const shown = `Числа: ${nums.join(', ')}.`
  if (t === 0) {
    const a = nums[0] + nums[n - 1]
    return numeric('Чему равна сумма первого и последнего числа?', a, 'Удерживайте в памяти края ряда: первое и последнее числа.', [shown, `${nums[0]} + ${nums[n - 1]} = ${a}.`], `w0:${nums.join(',')}`, { display })
  }
  if (t === 1) {
    const even = nums.filter((x) => x % 2 === 0).length
    return numeric('Сколько среди них было чётных чисел?', even, 'Считайте чётные прямо во время показа.', [shown, `Чётные: ${nums.filter((x) => x % 2 === 0).join(', ') || 'нет'} — всего ${even}.`], `w1:${nums.join(',')}`, { display })
  }
  if (t === 2) {
    const d = Math.max(...nums) - Math.min(...nums)
    return numeric('Чему равна разность наибольшего и наименьшего числа?', d, 'Запомните два «рекорда» — самое большое и самое маленькое число.', [shown, `Наибольшее ${Math.max(...nums)}, наименьшее ${Math.min(...nums)}; ${Math.max(...nums)} − ${Math.min(...nums)} = ${d}.`], `w2:${nums.join(',')}`, { display })
  }
  const k = rng.int(2, n - 1)
  const s = nums[k - 2] + nums[k - 1] + nums[k]
  return numeric(`Чему равна сумма ${k - 1}-го, ${k}-го и ${k + 1}-го чисел?`, s, 'Держите в памяти порядок, а не только сами числа.', [shown, `${nums[k - 2]} + ${nums[k - 1]} + ${nums[k]} = ${s}.`], `w3:${nums.join(',')}:${k}`, { display })
}

function flats(level: Level, rng: Rng): Draft {
  const n = level + 2
  const people = rng.sample(NAMES, n)
  const nums = rng.sample(Array.from({ length: level <= 2 ? 90 : 900 }, (_, i) => i + 10), n)
  const i = rng.int(0, n - 1)
  const display = memorize(secs(level, n, 2.4), 'Запомните, кто в какой квартире живёт.', {
    type: 'table',
    head: ['Жилец', 'Квартира'],
    rows: people.map((p, j) => [p.n, String(nums[j])]),
  })
  return numeric(
    `В какой квартире живёт ${people[i].n}?`,
    nums[i],
    'Свяжите число с именем образом: «Ольга — 47 — сорок семь ступенек к Ольге».',
    [`${people[i].n} — квартира ${nums[i]}.`, `Все жильцы: ${people.map((p, j) => `${p.n} — ${nums[j]}`).join(', ')}.`, 'Числа запоминаются лучше, если привязать их к чему-то знакомому: возрасту, году, номеру автобуса.'],
    `f:${people.map((p, j) => p.n + nums[j]).join(',')}:${i}`,
    { display },
  )
}

const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ23456789'
const SIMILAR: Record<string, string> = { '8': 'B', B: '8', '5': 'S', S: '5', '2': 'Z', Z: '2', '6': 'G', G: '6', E: 'F', F: 'E', M: 'N', N: 'M', V: 'U', U: 'V', P: 'R', R: 'P', C: 'G', '7': 'T', T: '7', '4': 'A', A: '4' }

function codes(level: Level, rng: Rng): Draft {
  const n = level + 3
  const code = Array.from({ length: n }, () => rng.pick(CODE_CHARS.split(''))).join('')
  const variants = new Set<string>()
  let guard = 0
  while (variants.size < 3 && guard++ < 50) {
    const t = rng.int(0, 2)
    const arr = code.split('')
    const i = rng.int(0, n - 2)
    if (t === 0) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    else if (t === 1 && SIMILAR[arr[i]]) arr[i] = SIMILAR[arr[i]]
    else arr[rng.int(0, n - 1)] = rng.pick(CODE_CHARS.split(''))
    const v = arr.join('')
    if (v !== code) variants.add(v)
  }
  const display = memorize(secs(level, n, 1.2), 'Запомните код доступа.', { type: 'sequence', items: code.split('') })
  return choice(
    'Какой код был показан?',
    code,
    [...variants],
    rng,
    'Проговорите код по слогам и запомните «опасные» места: похожие символы и соседние цифры.',
    [`Код: ${code}.`, 'Неверные варианты отличаются одним символом или перестановкой двух соседних — это самые частые ошибки памяти.'],
    `k:${code}`,
    { display },
  )
}

function years(level: Level, rng: Rng): Draft {
  const n = level + 2
  const events = rng.sample(EVENTS, n)
  const ys = rng.sample(Array.from({ length: 150 }, (_, i) => 1850 + i), n).sort((a, b) => a - b)
  const i = rng.int(0, n - 1)
  const display = memorize(secs(level, n, 3), 'Запомните даты из истории одного вымышленного города.', {
    type: 'table',
    head: ['Событие', 'Год'],
    rows: events.map((e, j) => [e, String(ys[j])]),
  })
  return numeric(
    `В каком году: ${events[i].toLowerCase()}?`,
    ys[i],
    'Запоминайте не четыре цифры, а «век + две цифры» и связывайте даты между собой: «через 12 лет после моста».',
    [`${events[i]} — ${ys[i]} год.`, `Вся хронология: ${events.map((e, j) => `${ys[j]} — ${e.toLowerCase()}`).join('; ')}.`, 'Даты легче держать в памяти как цепочку: каждое событие привязано к предыдущему разницей в годах.'],
    `y:${events.map((e, j) => e.slice(0, 6) + ys[j]).join(',')}:${i}`,
    { display },
  )
}

const make = (module: ModuleGenerator['module'], fn: (level: Level, rng: Rng) => Draft | null): ModuleGenerator => ({ module, targets: T, make: (level, rng) => fn(level, rng) })

export const MEMORY_NUMBER_GENERATORS: ModuleGenerator[] = [
  make('digits', digits),
  make('backward', backward),
  make('chunking', chunking),
  make('numgrid', numgrid),
  make('workmem', workmem),
  make('flats', flats),
  make('codes', codes),
  make('years', years),
]
