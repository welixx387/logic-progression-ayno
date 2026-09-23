import type { Level, Task } from '../../src/types.ts'
import type { Rng } from '../lib/rng.ts'
import { capitalize, collect, digitSum, isPrime, joinAnd, type Draft } from '../lib/util.ts'

interface Category {
  /** Как назвать группу во множественном числе: «фрукты». */
  plural: string
  /** Как назвать один предмет группы: «фрукт». */
  single: string
  domain: string
  items: string[]
}

const CATS: Record<string, Category> = {
  fruits: { plural: 'фрукты', single: 'фрукт', domain: 'еда', items: ['яблоко', 'груша', 'слива', 'персик', 'абрикос', 'банан', 'апельсин', 'манго', 'киви', 'лимон'] },
  vegetables: { plural: 'овощи', single: 'овощ', domain: 'еда', items: ['морковь', 'капуста', 'огурец', 'свёкла', 'картофель', 'лук', 'редис', 'кабачок', 'баклажан', 'репа'] },
  birds: { plural: 'птицы', single: 'птица', domain: 'животные', items: ['воробей', 'ворона', 'голубь', 'синица', 'сорока', 'орёл', 'сова', 'ласточка', 'дятел', 'снегирь'] },
  insects: { plural: 'насекомые', single: 'насекомое', domain: 'животные', items: ['муравей', 'пчела', 'бабочка', 'жук', 'стрекоза', 'комар', 'муха', 'кузнечик'] },
  fish: { plural: 'рыбы', single: 'рыба', domain: 'животные', items: ['щука', 'окунь', 'карась', 'сом', 'судак', 'карп', 'лещ', 'треска'] },
  beasts: { plural: 'дикие звери', single: 'зверь', domain: 'животные', items: ['волк', 'лиса', 'медведь', 'заяц', 'барсук', 'лось', 'рысь', 'бобр'] },
  furniture: { plural: 'мебель', single: 'мебель', domain: 'дом', items: ['стол', 'стул', 'шкаф', 'диван', 'кресло', 'комод', 'табурет', 'кровать'] },
  dishes: { plural: 'посуда', single: 'посуда', domain: 'дом', items: ['тарелка', 'чашка', 'кастрюля', 'сковорода', 'миска', 'кружка', 'блюдце', 'чайник'] },
  tools: { plural: 'инструменты для работы', single: 'рабочий инструмент', domain: 'дом', items: ['молоток', 'пила', 'отвёртка', 'рубанок', 'дрель', 'топор', 'напильник', 'стамеска'] },
  music: { plural: 'музыкальные инструменты', single: 'музыкальный инструмент', domain: 'культура', items: ['скрипка', 'гитара', 'флейта', 'барабан', 'пианино', 'арфа', 'балалайка', 'виолончель'] },
  transport: { plural: 'транспорт', single: 'транспорт', domain: 'транспорт', items: ['автобус', 'трамвай', 'самолёт', 'поезд', 'велосипед', 'корабль', 'троллейбус', 'вертолёт'] },
  clothes: { plural: 'одежда', single: 'одежда', domain: 'одежда', items: ['рубашка', 'брюки', 'куртка', 'свитер', 'платье', 'юбка', 'пальто', 'футболка'] },
  shoes: { plural: 'обувь', single: 'обувь', domain: 'одежда', items: ['ботинки', 'сапоги', 'кроссовки', 'туфли', 'тапочки', 'сандалии', 'валенки', 'кеды'] },
  countries: { plural: 'страны', single: 'страна', domain: 'география', items: ['Франция', 'Германия', 'Италия', 'Испания', 'Япония', 'Бразилия', 'Канада', 'Египет', 'Индия', 'Китай'] },
  cities: { plural: 'города', single: 'город', domain: 'география', items: ['Париж', 'Лондон', 'Рим', 'Мадрид', 'Токио', 'Берлин', 'Каир', 'Пекин', 'Казань', 'Самара'] },
  weekdays: { plural: 'дни недели', single: 'день недели', domain: 'время', items: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'] },
  months: { plural: 'месяцы', single: 'месяц', domain: 'время', items: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'] },
}

/** Пары близких групп для уровня 2: слово-чужак похоже на остальные, но из другой группы. */
const CLOSE_PAIRS: [string, string][] = [
  ['fruits', 'vegetables'],
  ['vegetables', 'fruits'],
  ['birds', 'insects'],
  ['insects', 'birds'],
  ['fish', 'beasts'],
  ['beasts', 'birds'],
  ['furniture', 'dishes'],
  ['dishes', 'furniture'],
  ['clothes', 'shoes'],
  ['shoes', 'clothes'],
  ['countries', 'cities'],
  ['cities', 'countries'],
  ['weekdays', 'months'],
  ['months', 'weekdays'],
  ['music', 'tools'],
]

/** Группы-ловушки для уровня 3: лишнее слово легко принять за «своё». */
const TRICKY: { items: string[]; intruders: { word: string; why: string }[]; common: string }[] = [
  {
    common: 'млекопитающие, которые живут в море',
    items: ['кит', 'дельфин', 'тюлень', 'морж', 'косатка'],
    intruders: [
      { word: 'акула', why: 'акула — рыба' },
      { word: 'скат', why: 'скат — рыба' },
    ],
  },
  {
    common: 'насекомые (у них шесть ног)',
    items: ['муравей', 'пчела', 'бабочка', 'жук', 'стрекоза', 'комар'],
    intruders: [
      { word: 'паук', why: 'паук — не насекомое: у него восемь ног' },
      { word: 'клещ', why: 'клещ — не насекомое: у него восемь ног, как у паука' },
    ],
  },
  {
    common: 'планеты Солнечной системы',
    items: ['Марс', 'Венера', 'Юпитер', 'Сатурн', 'Меркурий', 'Нептун'],
    intruders: [
      { word: 'Луна', why: 'Луна — спутник Земли, а не планета' },
      { word: 'Солнце', why: 'Солнце — звезда, а не планета' },
    ],
  },
  {
    common: 'столицы государств',
    items: ['Париж', 'Берлин', 'Рим', 'Мадрид', 'Токио', 'Лондон', 'Варшава', 'Прага', 'Вена', 'Пекин'],
    intruders: [
      { word: 'Милан', why: 'Милан — не столица: столица Италии — Рим' },
      { word: 'Барселона', why: 'Барселона — не столица: столица Испании — Мадрид' },
      { word: 'Нью-Йорк', why: 'Нью-Йорк — не столица: столица США — Вашингтон' },
      { word: 'Сидней', why: 'Сидней — не столица: столица Австралии — Канберра' },
      { word: 'Стамбул', why: 'Стамбул — не столица: столица Турции — Анкара' },
      { word: 'Торонто', why: 'Торонто — не столица: столица Канады — Оттава' },
    ],
  },
  {
    common: 'четырёхугольники',
    items: ['квадрат', 'ромб', 'прямоугольник', 'трапеция', 'параллелограмм'],
    intruders: [
      { word: 'треугольник', why: 'у треугольника три угла, а не четыре' },
      { word: 'пятиугольник', why: 'у пятиугольника пять углов, а не четыре' },
    ],
  },
  {
    common: 'птицы (даже те, что не летают)',
    items: ['воробей', 'орёл', 'сова', 'ласточка', 'страус', 'пингвин', 'курица'],
    intruders: [{ word: 'летучая мышь', why: 'летучая мышь умеет летать, но это млекопитающее, а не птица' }],
  },
  {
    common: 'металлы',
    items: ['железо', 'медь', 'алюминий', 'золото', 'серебро', 'олово', 'ртуть'],
    intruders: [
      { word: 'стекло', why: 'стекло — не металл' },
      { word: 'гранит', why: 'гранит — горная порода, а не металл' },
    ],
  },
  {
    common: 'единицы длины',
    items: ['метр', 'сантиметр', 'километр', 'миллиметр', 'дециметр'],
    intruders: [
      { word: 'килограмм', why: 'килограмм — единица массы, а не длины' },
      { word: 'литр', why: 'литр — единица объёма, а не длины' },
    ],
  },
]

// ——— Числовые свойства ———

interface Prop {
  id: string
  test: (n: number) => boolean
  /** Описание группы: «чётные», «кратны 7». */
  yes: string
  /** Почему число-чужак не подходит. */
  no: (n: number) => string
}

const SQUARES = new Set(Array.from({ length: 40 }, (_, i) => i * i))
const CUBES = new Set(Array.from({ length: 12 }, (_, i) => i ** 3))
const POW2 = new Set(Array.from({ length: 12 }, (_, i) => 2 ** i))
const FIB = new Set([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987])
const TRI = new Set(Array.from({ length: 45 }, (_, i) => (i * (i + 1)) / 2))
const isPal = (n: number) => n >= 10 && String(n) === String(n).split('').reverse().join('')

function smallestFactor(n: number) {
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d
  return n
}

const mult = (k: number): Prop => ({
  id: `mul${k}`,
  test: (n) => n % k === 0,
  yes: `делятся на ${k}`,
  no: (n) => `${n} на ${k} не делится (${n} = ${k} × ${Math.floor(n / k)} + ${n % k})`,
})

const PROPS: Record<string, Prop> = {
  even: { id: 'even', test: (n) => n % 2 === 0, yes: 'чётные', no: (n) => `${n} — нечётное` },
  odd: { id: 'odd', test: (n) => n % 2 === 1, yes: 'нечётные', no: (n) => `${n} — чётное` },
  mul3: mult(3),
  mul4: mult(4),
  mul5: mult(5),
  mul7: mult(7),
  mul9: mult(9),
  mul11: mult(11),
  square: {
    id: 'square',
    test: (n) => SQUARES.has(n),
    yes: 'точные квадраты',
    no: (n) => `${n} — не квадрат: ${Math.floor(Math.sqrt(n))}² = ${Math.floor(Math.sqrt(n)) ** 2}, а ${Math.floor(Math.sqrt(n)) + 1}² = ${(Math.floor(Math.sqrt(n)) + 1) ** 2}`,
  },
  prime: {
    id: 'prime',
    test: isPrime,
    yes: 'простые (делятся только на 1 и на себя)',
    no: (n) => `${n} — составное: ${n} = ${smallestFactor(n)} × ${n / smallestFactor(n)}`,
  },
  cube: { id: 'cube', test: (n) => CUBES.has(n), yes: 'кубы целых чисел', no: (n) => `${n} — не куб целого числа` },
  pow2: { id: 'pow2', test: (n) => POW2.has(n), yes: 'степени двойки', no: (n) => `${n} — не степень двойки` },
  fib: { id: 'fib', test: (n) => FIB.has(n), yes: 'числа Фибоначчи (1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144…)', no: (n) => `${n} в ряду Фибоначчи нет` },
  tri: { id: 'tri', test: (n) => TRI.has(n), yes: 'треугольные числа (1, 3, 6, 10, 15, 21, 28, 36, 45, 55…)', no: (n) => `${n} — не треугольное число` },
  pal: { id: 'pal', test: isPal, yes: 'палиндромы (читаются одинаково слева направо и справа налево)', no: (n) => `${n} наоборот — ${String(n).split('').reverse().join('')}` },
  ds9: { id: 'ds9', test: (n) => digitSum(n) === 9, yes: 'числа с суммой цифр 9', no: (n) => `у ${n} сумма цифр ${digitSum(n)}` },
  ds10: { id: 'ds10', test: (n) => digitSum(n) === 10, yes: 'числа с суммой цифр 10', no: (n) => `у ${n} сумма цифр ${digitSum(n)}` },
}

/**
 * «Бросающиеся в глаза» свойства: если одно из них выделяет другое число,
 * у задачи два ответа, и такой набор отбрасываем.
 */
const CHECK = [
  PROPS.even,
  PROPS.mul3,
  PROPS.mul5,
  PROPS.prime,
  PROPS.square,
  PROPS.pal,
  { id: 'mul10', test: (n: number) => n % 10 === 0 },
  { id: 'twoDigit', test: (n: number) => n >= 10 && n < 100 },
  { id: 'threeDigit', test: (n: number) => n >= 100 && n < 1000 },
]

const NUMBER_PROPS: Record<Level, { prop: string; range: [number, number] }[]> = {
  1: [],
  2: [],
  3: [
    { prop: 'even', range: [11, 99] },
    { prop: 'odd', range: [11, 99] },
    { prop: 'mul3', range: [11, 99] },
    { prop: 'mul5', range: [11, 99] },
  ],
  4: [
    { prop: 'square', range: [10, 99] },
    { prop: 'prime', range: [11, 99] },
    { prop: 'mul7', range: [11, 99] },
    { prop: 'mul9', range: [100, 400] },
    { prop: 'mul4', range: [11, 99] },
    { prop: 'ds10', range: [11, 99] },
  ],
  5: [
    { prop: 'pow2', range: [10, 999] },
    { prop: 'cube', range: [100, 999] },
    { prop: 'fib', range: [10, 99] },
    { prop: 'tri', range: [10, 99] },
    { prop: 'pal', range: [100, 999] },
    { prop: 'mul11', range: [100, 999] },
    { prop: 'ds9', range: [100, 999] },
    { prop: 'prime', range: [100, 199] },
  ],
}

const sup = (n: number) =>
  String(n)
    .split('')
    .map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])
    .join('')

function numberTask(level: Level, rng: Rng, index: number): Draft | null {
  const spec = NUMBER_PROPS[level][index % NUMBER_PROPS[level].length]
  // Однозначные наборы попадаются не сразу — даём каждому свойству много попыток.
  for (let attempt = 0; attempt < 400; attempt++) {
    const draft = numberAttempt(spec, rng)
    if (draft) return draft
  }
  return null
}

function numberAttempt(spec: { prop: string; range: [number, number] }, rng: Rng): Draft | null {
  const prop = PROPS[spec.prop]
  const [lo, hi] = spec.range
  const pool: number[] = []
  const others: number[] = []
  for (let n = lo; n <= hi; n++) (prop.test(n) ? pool : others).push(n)
  if (pool.length < 4) return null
  const members = rng.sample(pool, 4).sort((a, b) => a - b)
  // Чужак — число «похожее» на остальные: рядом с одним из них.
  const anchor = rng.pick(members)
  const near = others.filter((n) => Math.abs(n - anchor) <= Math.max(6, anchor * 0.15))
  if (!near.length) return null
  const intruder = rng.pick(near)
  const all = rng.shuffle([...members, intruder])
  // Отказываемся от набора, если другое свойство выделяет другое число.
  for (const q of [...CHECK, prop]) {
    const yes = all.filter(q.test)
    const no = all.filter((n) => !q.test(n))
    const single = yes.length === 1 ? yes[0] : no.length === 1 ? no[0] : null
    if (single !== null && single !== intruder) return null
  }
  const answer = String(intruder)
  const extra =
    spec.prop === 'square'
      ? ` (${members.map((n) => `${n} = ${Math.sqrt(n)}²`).join(', ')})`
      : spec.prop === 'cube'
        ? ` (${members.map((n) => `${n} = ${Math.round(Math.cbrt(n))}³`).join(', ')})`
        : spec.prop === 'pow2'
          ? ` (${members.map((n) => `${n} = 2${sup(Math.log2(n))}`).join(', ')})`
          : ''
  return {
    kind: 'choice',
    prompt: 'Какое число лишнее?',
    display: { type: 'sequence', items: all.map(String) },
    options: all.map(String),
    answer,
    hint: 'Проверьте делимость, квадраты, простые числа, сумму цифр…',
    solution: `Числа ${joinAnd(members.map(String))} — ${prop.yes}${extra}. А ${prop.no(intruder)}. Лишнее — ${intruder}.`,
    key: all.slice().sort((a, b) => a - b).join(','),
  }
}

function wordTask(level: Level, rng: Rng, index: number): Draft | null {
  if (level === 3) {
    const group = TRICKY[index % TRICKY.length]
    const items = rng.sample(group.items, 4)
    const intruder = rng.pick(group.intruders)
    const all = rng.shuffle([...items, intruder.word])
    return {
      kind: 'choice',
      prompt: 'Какое слово лишнее?',
      options: all,
      answer: intruder.word,
      hint: 'Не спешите: одно слово только кажется «своим».',
      solution: `${capitalize(joinAnd(items))} — ${group.common}. А ${intruder.why}.`,
      key: all.slice().sort().join(','),
    }
  }
  let mainKey: string
  let otherKey: string
  if (level === 1) {
    const keys = Object.keys(CATS)
    mainKey = keys[index % keys.length]
    otherKey = rng.pick(keys.filter((k) => CATS[k].domain !== CATS[mainKey].domain))
  } else {
    ;[mainKey, otherKey] = CLOSE_PAIRS[index % CLOSE_PAIRS.length]
  }
  const main = CATS[mainKey]
  const other = CATS[otherKey]
  const items = rng.sample(main.items, 4)
  const intruder = rng.pick(other.items)
  const all = rng.shuffle([...items, intruder])
  return {
    kind: 'choice',
    prompt: 'Какое слово лишнее?',
    options: all,
    answer: intruder,
    hint: 'Найдите, что объединяет большинство слов.',
    solution: `${capitalize(joinAnd(items))} — ${main.plural}, а ${intruder} — ${other.single}. Лишнее слово — «${intruder}».`,
    key: all.slice().sort().join(','),
  }
}

export function odd(): Task[] {
  return collect('odd', { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10 }, (level, rng, index) => {
    if (level <= 2) return wordTask(level, rng, index)
    if (level === 3) return index % 2 === 0 ? wordTask(level, rng, index / 2) : numberTask(level, rng, index)
    return numberTask(level, rng, index)
  })
}
