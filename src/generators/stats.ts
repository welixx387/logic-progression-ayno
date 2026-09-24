import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, plural, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/** Средние и выводы из данных: среднее, медиана, мода, взвешенное среднее, выбросы. */

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
const num = (n: number) => n.toLocaleString('ru-RU')

const SERIES = [
  { what: 'Температура воздуха по дням, °C', min: 12, max: 28, unit: '°C' },
  { what: 'Баллы за контрольные', min: 55, max: 98, unit: 'баллов' },
  { what: 'Время на дорогу до школы, мин', min: 12, max: 35, unit: 'мин' },
  { what: 'Число покупателей в час', min: 20, max: 60, unit: 'чел.' },
  { what: 'Рост игроков команды, см', min: 160, max: 195, unit: 'см' },
]

/** Набор из n чисел с целым средним: последнее число подгоняем. */
function withIntMean(rng: Rng, n: number, min: number, max: number): number[] | null {
  const xs = Array.from({ length: n - 1 }, () => rng.int(min, max))
  const mean = rng.int(min + 2, max - 2)
  const last = mean * n - sum(xs)
  if (last < min || last > max) return null
  return rng.shuffle([...xs, last])
}

function median(xs: number[]) {
  const s = xs.slice().sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function level1(rng: Rng, index: number): Draft | null {
  const s = rng.pick(SERIES)
  const n = rng.int(4, 6)
  const xs = withIntMean(rng, n, s.min, s.max)
  if (!xs) return null
  if (index % 2 === 0) {
    const mean = sum(xs) / n
    return {
      kind: 'number',
      prompt: `${s.what}: ${xs.join('; ')}. Найдите среднее значение.`,
      answer: String(mean),
      hint: 'Среднее арифметическое = сумма всех значений : их количество.',
      solution: `Сумма: ${xs.join(' + ')} = ${sum(xs)}. Значений ${n}. Среднее: ${sum(xs)} : ${n} = ${mean}.`,
      key: `mean:${s.what}:${xs.join(',')}`,
    }
  }
  const range = Math.max(...xs) - Math.min(...xs)
  return {
    kind: 'number',
    prompt: `${s.what}: ${xs.join('; ')}. Найдите размах — разницу между самым большим и самым маленьким значением.`,
    answer: String(range),
    hint: 'Найдите максимум и минимум.',
    solution: `Максимум ${Math.max(...xs)}, минимум ${Math.min(...xs)}. Размах: ${Math.max(...xs)} − ${Math.min(...xs)} = ${range}.`,
    key: `range:${s.what}:${xs.join(',')}`,
  }
}

function level2(rng: Rng, index: number): Draft | null {
  const s = rng.pick(SERIES)
  const t = index % 3
  if (t === 2) {
    // Мода: одно значение повторяется чаще других.
    const base = rng.sample(Array.from({ length: s.max - s.min + 1 }, (_, i) => s.min + i), 4)
    const mode = base[0]
    const xs = rng.shuffle([mode, mode, mode, base[1], base[1], base[2], base[3]])
    return {
      kind: 'number',
      prompt: `${s.what}: ${xs.join('; ')}. Найдите моду — значение, которое встречается чаще всего.`,
      answer: String(mode),
      hint: 'Посчитайте, сколько раз встречается каждое значение.',
      solution: `${mode} встречается 3 раза, ${base[1]} — 2 раза, остальные — по одному. Мода — ${mode}.`,
      key: `mode:${s.what}:${xs.join(',')}`,
    }
  }
  const n = t === 0 ? rng.pick([5, 7]) : rng.pick([4, 6])
  const xs = Array.from({ length: n }, () => rng.int(s.min, s.max))
  if (new Set(xs).size < n) return null
  const med = median(xs)
  if (!Number.isInteger(med)) return null
  const sorted = xs.slice().sort((a, b) => a - b)
  const m = n >> 1
  return {
    kind: 'number',
    prompt: `${s.what}: ${xs.join('; ')}. Найдите медиану.`,
    answer: String(med),
    hint: 'Сначала расставьте значения по возрастанию. Медиана — число в середине ряда (при чётном количестве — среднее двух средних).',
    solution: `По возрастанию: ${sorted.join('; ')}. ${n % 2 ? `В середине — ${n >> 1 === 2 ? 'третье' : 'четвёртое'} число: ${med}.` : `В середине два числа: ${sorted[m - 1]} и ${sorted[m]}. Медиана — их среднее: (${sorted[m - 1]} + ${sorted[m]}) : 2 = ${med}.`} Частая ошибка — искать середину, не отсортировав ряд.`,
    key: `median:${s.what}:${xs.join(',')}`,
  }
}

function level3(rng: Rng, index: number): Draft | null {
  const s = rng.pick(SERIES)
  const n = rng.int(4, 6)
  const xs = withIntMean(rng, n, s.min, s.max)
  if (!xs) return null
  const mean = sum(xs) / n
  if (index % 2 === 0) {
    const known = xs.slice(0, -1)
    const missing = xs[n - 1]
    return {
      kind: 'number',
      prompt: `${s.what}. Среднее ${n} значений равно ${mean}. Известны ${n - 1} из них: ${known.join('; ')}. Найдите недостающее значение.`,
      answer: String(missing),
      hint: 'Если среднее известно, то известна и сумма: среднее × количество.',
      solution: `Сумма всех ${n} значений: ${mean} × ${n} = ${mean * n}. Сумма известных: ${sum(known)}. Недостающее: ${mean * n} − ${sum(known)} = ${missing}.`,
      key: `missing:${s.what}:${xs.join(',')}`,
    }
  }
  const add = rng.int(s.min, s.max + 15)
  const newMean = (sum(xs) + add) / (n + 1)
  if (!Number.isInteger(newMean)) return null
  return {
    kind: 'number',
    prompt: `${s.what}. Среднее ${n} значений равно ${mean}. Добавили ещё одно значение — ${add}. Каким стало среднее?`,
    answer: String(newMean),
    hint: 'Найдите сумму старых значений, прибавьте новое и разделите на новое количество.',
    solution: `Старая сумма: ${mean} × ${n} = ${mean * n}. Новая сумма: ${mean * n} + ${add} = ${mean * n + add}. Значений стало ${n + 1}. Новое среднее: ${mean * n + add} : ${n + 1} = ${newMean}.`,
    key: `addmean:${s.what}:${mean}:${n}:${add}`,
  }
}

function level4(rng: Rng, index: number): Draft | null {
  if (index % 2 === 0) {
    const a = rng.pick([10, 15, 20, 25, 30])
    const b = rng.pick([10, 15, 20, 25, 30, 40])
    const ma = rng.int(60, 90)
    const mb = rng.int(60, 90)
    if (a === b || ma === mb) return null
    const all = (a * ma + b * mb) / (a + b)
    if (!Number.isInteger(all)) return null
    const naive = (ma + mb) / 2
    return {
      kind: 'number',
      prompt: `В классе А ${a} ${plural(a, 'ученик', 'ученика', 'учеников')}, их средний балл за тест — ${ma}. В классе Б ${b} ${plural(b, 'ученик', 'ученика', 'учеников')}, средний балл — ${mb}. Каков средний балл всех учеников двух классов?`,
      answer: String(all),
      hint: 'Классы разного размера, поэтому просто сложить два средних и поделить пополам нельзя. Найдите общую сумму баллов.',
      solution: `Сумма баллов: ${a} × ${ma} + ${b} × ${mb} = ${a * ma} + ${b * mb} = ${a * ma + b * mb}. Учеников: ${a + b}. Средний балл: ${a * ma + b * mb} : ${a + b} = ${all}. Среднее двух средних (${num(naive)}) было бы ошибкой: больший класс весит больше.`,
      key: `weighted:${a}:${ma}:${b}:${mb}`,
    }
  }
  // Выброс: зарплаты в небольшой фирме.
  const n = rng.pick([5, 7])
  const base = Array.from({ length: n - 1 }, () => rng.int(40, 70))
  const boss = rng.int(30, 60) * 10
  const xs = [...base, boss]
  const mean = sum(xs) / n
  const med = median(xs)
  if (!Number.isInteger(mean) || !Number.isInteger(med)) return null
  return {
    kind: 'choice',
    prompt: `Зарплаты в небольшой фирме (тыс. ₽ в месяц): ${rng.shuffle(xs).join('; ')}. Какое число лучше описывает зарплату типичного сотрудника?`,
    ...withOptions(`Медиана: ${med} тыс. ₽`, [`Среднее: ${mean} тыс. ₽`, `Максимум: ${boss} тыс. ₽`, `Размах: ${boss - Math.min(...base)} тыс. ₽`], rng),
    hint: 'Одна зарплата сильно отличается от остальных. Как она влияет на среднее, а как — на медиану?',
    solution: `Среднее: ${sum(xs)} : ${n} = ${mean} — но почти все получают меньше, потому что одна зарплата (${boss}) «тянет» среднее вверх. Медиана (${med}) — середина упорядоченного ряда, на неё выброс почти не влияет. Для типичного значения при выбросах лучше медиана.`,
    key: `outlier:${xs.slice().sort((p, q) => p - q).join(',')}`,
  }
}

function level5(rng: Rng, index: number): Draft | null {
  const t = index % 3
  if (t === 0) {
    const n = rng.int(5, 9)
    const m1 = rng.int(25, 45)
    const m2 = m1 - rng.int(1, 4)
    const left = m1 * n - m2 * (n - 1)
    if (left < 18 || left > 80) return null
    return {
      kind: 'number',
      prompt: `Средний возраст ${n} участников похода — ${m1} ${plural(m1, 'год', 'года', 'лет')}. Когда один участник ушёл, средний возраст оставшихся стал ${m2} ${plural(m2, 'год', 'года', 'лет')}. Сколько лет ушедшему?`,
      answer: String(left),
      hint: 'Найдите сумму возрастов до и после.',
      solution: `Сумма возрастов всех: ${m1} × ${n} = ${m1 * n}. Сумма оставшихся: ${m2} × ${n - 1} = ${m2 * (n - 1)}. Ушедшему: ${m1 * n} − ${m2 * (n - 1)} = ${left}.`,
      key: `left:${n}:${m1}:${m2}`,
    }
  }
  if (t === 1) {
    const n = rng.pick([5, 8, 10, 20])
    const mean = rng.int(30, 80)
    const right = rng.int(20, 99)
    const wrong = Number(String(right).split('').reverse().join(''))
    if (wrong === right || Math.abs(right - wrong) % n !== 0) return null
    const fixed = mean + (right - wrong) / n
    return {
      kind: 'number',
      prompt: `Среднее ${n} чисел посчитали и получили ${mean}. Потом выяснилось, что одно число записали с ошибкой: ${wrong} вместо ${right}. Каково правильное среднее?`,
      answer: String(fixed),
      hint: 'Ошибка изменила сумму на разницу между правильным и неправильным числом.',
      solution: `Сумма с ошибкой: ${mean} × ${n} = ${mean * n}. Правильная сумма: ${mean * n} ${right > wrong ? '+' : '−'} ${Math.abs(right - wrong)} = ${mean * n + right - wrong}. Правильное среднее: ${mean * n + right - wrong} : ${n} = ${fixed}.`,
      key: `typo:${n}:${mean}:${right}`,
    }
  }
  const k = rng.int(2, 10)
  const op = rng.pick(['plus', 'times'] as const)
  const correct = op === 'plus' ? `Среднее и медиана увеличатся на ${k}` : `Среднее и медиана увеличатся в ${k} раз${k >= 2 && k <= 4 ? 'а' : ''}`
  return {
    kind: 'choice',
    prompt: `Дан набор чисел. Каждое число ${op === 'plus' ? `увеличили на ${k}` : `умножили на ${k}`}. Что произойдёт со средним и медианой?`,
    ...withOptions(
      correct,
      op === 'plus'
        ? [`Среднее увеличится на ${k}, медиана не изменится`, `Среднее и медиана увеличатся в ${k} раз${k >= 2 && k <= 4 ? 'а' : ''}`, 'Ничего не изменится', `Медиана увеличится на ${k}, среднее — на ${k * 2}`]
        : [`Среднее и медиана увеличатся на ${k}`, `Среднее увеличится в ${k} раз${k >= 2 && k <= 4 ? 'а' : ''}, медиана не изменится`, 'Ничего не изменится'],
      rng,
    ),
    hint: 'Проверьте на маленьком примере: 1, 2, 6.',
    solution: `Пример: 1, 2, 6 — среднее 3, медиана 2. После ${op === 'plus' ? `прибавления ${k}: ${1 + k}, ${2 + k}, ${6 + k} — среднее ${3 + k}, медиана ${2 + k}` : `умножения на ${k}: ${k}, ${2 * k}, ${6 * k} — среднее ${3 * k}, медиана ${2 * k}`}. Порядок значений не меняется, поэтому медиана меняется так же, как каждое число; среднее — тоже. ${correct}.`,
    key: `shift:${op}:${k}`,
  }
}

const MAKERS = [level1, level2, level3, level4, level5]

function generate(level: Level, rng: Rng, index: number): Draft | null {
  return MAKERS[level - 1](rng, index)
}

export const statsGenerator: ModuleGenerator = {
  module: 'stats',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function stats(): Task[] {
  return collect(statsGenerator)
}
