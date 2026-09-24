import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, digitSum, type Draft, type ModuleGenerator } from './util.ts'

/** Словесные аналогии: A относится к B так же, как C к ?. */
const WORDS: { level: Level; a: string; b: string; c: string; answer: string; wrong: string[]; why: string }[] = [
  { level: 1, a: 'птица', b: 'гнездо', c: 'пчела', answer: 'улей', wrong: ['мёд', 'цветок', 'крыло'], why: 'Птица живёт в гнезде, а пчела — в улье.' },
  { level: 1, a: 'врач', b: 'больница', c: 'учитель', answer: 'школа', wrong: ['урок', 'ученик', 'доска'], why: 'Врач работает в больнице, учитель — в школе.' },
  { level: 1, a: 'глаз', b: 'видеть', c: 'ухо', answer: 'слышать', wrong: ['говорить', 'нюхать', 'звук'], why: 'Глазами видят, ушами слышат.' },
  { level: 1, a: 'горячий', b: 'холодный', c: 'высокий', answer: 'низкий', wrong: ['длинный', 'широкий', 'большой'], why: '«Горячий» и «холодный» — противоположности, значит, ищем противоположность слову «высокий».' },
  { level: 1, a: 'щенок', b: 'собака', c: 'котёнок', answer: 'кошка', wrong: ['мышь', 'молоко', 'хвост'], why: 'Щенок вырастает в собаку, котёнок — в кошку.' },
  { level: 1, a: 'снег', b: 'зима', c: 'листопад', answer: 'осень', wrong: ['дерево', 'дождь', 'лес'], why: 'Снег бывает зимой, листопад — осенью.' },
  { level: 2, a: 'книга', b: 'библиотека', c: 'картина', answer: 'музей', wrong: ['рамка', 'художник', 'краски'], why: 'Книги хранят в библиотеке, картины — в музее.' },
  { level: 2, a: 'Москва', b: 'Россия', c: 'Париж', answer: 'Франция', wrong: ['Европа', 'Лондон', 'Эйфелева башня'], why: 'Москва — столица России, Париж — столица Франции.' },
  { level: 2, a: 'секунда', b: 'минута', c: 'минута', answer: 'час', wrong: ['время', 'сутки', 'часы'], why: 'Из 60 секунд складывается минута, из 60 минут — час.' },
  { level: 2, a: 'вода', b: 'жажда', c: 'еда', answer: 'голод', wrong: ['обед', 'вкус', 'тарелка'], why: 'Вода утоляет жажду, еда — голод.' },
  { level: 2, a: 'художник', b: 'кисть', c: 'писатель', answer: 'ручка', wrong: ['книга', 'читатель', 'роман'], why: 'Кисть — инструмент художника, ручка — инструмент писателя.' },
  { level: 2, a: 'корова', b: 'телёнок', c: 'лошадь', answer: 'жеребёнок', wrong: ['конь', 'седло', 'овёс'], why: 'У коровы детёныш — телёнок, у лошади — жеребёнок.' },
  { level: 2, a: 'пианино', b: 'клавиша', c: 'гитара', answer: 'струна', wrong: ['музыка', 'песня', 'гитарист'], why: 'На пианино нажимают клавиши, на гитаре — зажимают и перебирают струны.' },
  { level: 2, a: 'мало', b: 'много', c: 'редко', answer: 'часто', wrong: ['иногда', 'медленно', 'поздно'], why: '«Мало» и «много» — противоположности; противоположность слову «редко» — «часто».' },
  { level: 3, a: 'термометр', b: 'температура', c: 'весы', answer: 'вес', wrong: ['длина', 'время', 'объём'], why: 'Термометр измеряет температуру, весы — вес.' },
  { level: 3, a: 'волк', b: 'стая', c: 'пчела', answer: 'рой', wrong: ['мёд', 'цветок', 'жало'], why: 'Волки собираются в стаю, пчёлы — в рой. Отношение «одиночка — группа».' },
  { level: 3, a: 'слово', b: 'буква', c: 'число', answer: 'цифра', wrong: ['сумма', 'ответ', 'пример'], why: 'Слово записывают буквами, число — цифрами. Отношение «целое — из чего составлено».' },
  { level: 3, a: 'хлеб', b: 'пекарь', c: 'дом', answer: 'строитель', wrong: ['кирпич', 'крыша', 'улица'], why: 'Хлеб делает пекарь, дом — строитель. Отношение «результат — кто делает».' },
  { level: 3, a: 'карандаш', b: 'грифель', c: 'ручка', answer: 'стержень', wrong: ['бумага', 'колпачок', 'тетрадь'], why: 'Пишущая часть карандаша — грифель, у ручки — стержень.' },
  { level: 3, a: 'лёд', b: 'таять', c: 'вода', answer: 'замерзать', wrong: ['течь', 'литься', 'мокнуть'], why: 'Лёд тает — становится водой; вода замерзает — становится льдом. Противоположные превращения.' },
]

interface UnaryRule {
  id: string
  f: (x: number) => number | null
  text: string
}

interface BinaryRule {
  id: string
  f: (a: number, b: number) => number | null
  text: string
}

const rev = (x: number) => (x >= 10 && x < 100 && x % 10 !== 0 ? Number(String(x).split('').reverse().join('')) : null)
const dprod = (x: number) => String(x).split('').reduce((p, d) => p * Number(d), 1)

/** Все правила, с которыми сверяем пример на однозначность. */
const UNARY: UnaryRule[] = [
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20].map((k) => ({ id: `+${k}`, f: (x: number) => x + k, text: `прибавить ${k}` })),
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => ({ id: `-${k}`, f: (x: number) => (x - k >= 0 ? x - k : null), text: `вычесть ${k}` })),
  ...[2, 3, 4, 5, 10].map((k) => ({ id: `*${k}`, f: (x: number) => x * k, text: `умножить на ${k}` })),
  { id: 'sq', f: (x) => x * x, text: 'возвести в квадрат (x · x)' },
  { id: 'cube', f: (x) => x ** 3, text: 'возвести в куб (x · x · x)' },
  { id: 'sq+1', f: (x) => x * x + 1, text: 'возвести в квадрат и прибавить 1' },
  { id: 'sq-1', f: (x) => x * x - 1, text: 'возвести в квадрат и вычесть 1' },
  { id: '2x+1', f: (x) => 2 * x + 1, text: 'умножить на 2 и прибавить 1' },
  { id: '2x-1', f: (x) => 2 * x - 1, text: 'умножить на 2 и вычесть 1' },
  { id: '3x+1', f: (x) => 3 * x + 1, text: 'умножить на 3 и прибавить 1' },
  { id: '3x-2', f: (x) => 3 * x - 2, text: 'умножить на 3 и вычесть 2' },
  { id: 'x(x+1)', f: (x) => x * (x + 1), text: 'умножить на следующее за ним число: x · (x + 1)' },
  { id: 'x2-x', f: (x) => x * x - x, text: 'умножить на предыдущее число: x · (x − 1)' },
  { id: '(x+1)2', f: (x) => (x + 1) ** 2, text: 'прибавить 1 и возвести в квадрат' },
  { id: 'rev', f: rev, text: 'записать цифры в обратном порядке' },
  { id: 'dsum', f: (x) => (x >= 10 ? digitSum(x) : null), text: 'сложить цифры числа' },
  { id: 'dprod', f: (x) => (x >= 10 && !String(x).includes('0') ? dprod(x) : null), text: 'перемножить цифры числа' },
  { id: 'pow2', f: (x) => (x <= 12 ? 2 ** x : null), text: 'возвести 2 в эту степень (2ˣ)' },
  { id: 'half', f: (x) => (x % 2 === 0 ? x / 2 : null), text: 'разделить пополам' },
]

const BINARY: BinaryRule[] = [
  { id: 'a+b', f: (a, b) => a + b, text: 'a + b' },
  { id: 'a*b', f: (a, b) => a * b, text: 'a × b' },
  { id: 'a-b', f: (a, b) => (a > b ? a - b : null), text: 'a − b' },
  { id: 'a*b+1', f: (a, b) => a * b + 1, text: 'a × b + 1' },
  { id: 'a*b-1', f: (a, b) => a * b - 1, text: 'a × b − 1' },
  { id: 'a*b+a', f: (a, b) => a * b + a, text: 'a × b + a' },
  { id: 'a*b+b', f: (a, b) => a * b + b, text: 'a × b + b' },
  { id: 'a2+b2', f: (a, b) => a * a + b * b, text: 'a² + b²' },
  { id: '(a+b)2', f: (a, b) => (a + b) ** 2, text: '(a + b)²' },
  { id: 'a2-b', f: (a, b) => (a * a > b ? a * a - b : null), text: 'a² − b' },
  { id: 'a2+b', f: (a, b) => a * a + b, text: 'a² + b' },
  { id: '2a+b', f: (a, b) => 2 * a + b, text: '2a + b' },
  { id: 'a+2b', f: (a, b) => a + 2 * b, text: 'a + 2b' },
  { id: '(a+b)*2', f: (a, b) => (a + b) * 2, text: '(a + b) × 2' },
  { id: 'a*b+a+b', f: (a, b) => a * b + a + b, text: 'a × b + a + b' },
  { id: 'a2-b2', f: (a, b) => (a > b ? a * a - b * b : null), text: 'a² − b²' },
  { id: 'ab', f: (a, b) => Number(`${a}${b}`), text: 'приписать b к a' },
  { id: 'ba', f: (a, b) => Number(`${b}${a}`), text: 'приписать a к b' },
]

const LEVEL_UNARY: Record<Level, string[]> = {
  1: ['+3', '+5', '+10', '*2', '*3', '-4'],
  2: ['+7', '*5', '+12', '-6', '*10', '+15'],
  3: ['sq', '2x+1', '*4', 'rev', 'cube', '3x-2'],
  4: ['sq+1', 'x(x+1)', 'dsum', '(x+1)2', 'dprod', 'sq-1', 'pow2', '3x+1'],
  5: [],
}

const LEVEL_BINARY = ['a2+b2', 'a*b+1', '(a+b)2', 'a2-b', 'a*b+a+b', '2a+b', 'a2-b2', 'a*b-1']

function numericUnary(level: Level, rng: Rng, index: number): Draft | null {
  const ids = LEVEL_UNARY[level]
  const rule = UNARY.find((r) => r.id === ids[index % ids.length])!
  const lo = rule.id === 'rev' || rule.id === 'dsum' || rule.id === 'dprod' ? 12 : 2
  const hi = rule.id === 'rev' || rule.id === 'dsum' || rule.id === 'dprod' ? 98 : rule.id === 'cube' || rule.id === 'pow2' ? 9 : 15
  const xs = rng.sample(
    Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((x) => rule.f(x) !== null && rule.f(x) !== x),
    5,
  )
  if (xs.length < 5) return null
  const query = xs[4]
  const answer = rule.f(query)!
  // Добавляем примеры, пока правило не станет единственным среди известных.
  for (let shown = 2; shown <= 4; shown++) {
    const examples = xs.slice(0, shown)
    const rivals = UNARY.filter((r) => examples.every((x) => r.f(x) === rule.f(x)))
    const conflict = rivals.some((r) => r.f(query) !== answer)
    if (conflict) continue
    const lines = [...examples.map((x) => `${x} → ${rule.f(x)}`), `${query} → ?`]
    return {
      kind: 'number',
      prompt: 'Числа слева превращаются в числа справа по одному правилу. Какое число вместо знака вопроса?',
      display: { type: 'lines', lines },
      answer: String(answer),
      hint: 'Проверьте простые действия: сложение, умножение, квадрат, работу с цифрами.',
      solution: `Правило: ${rule.text}. ${examples.map((x) => `${x} → ${rule.f(x)}`).join(', ')}. Значит, ${query} → ${answer}.`,
      key: `u:${rule.id}:${examples.join(',')}:${query}`,
    }
  }
  return null
}

function numericBinary(rng: Rng, index: number): Draft | null {
  const rule = BINARY.find((r) => r.id === LEVEL_BINARY[index % LEVEL_BINARY.length])!
  const pairs: [number, number][] = []
  while (pairs.length < 5) {
    const p: [number, number] = [rng.int(1, 9), rng.int(1, 9)]
    if (rule.f(p[0], p[1]) === null || pairs.some((q) => q[0] === p[0] && q[1] === p[1])) continue
    if (p[0] === p[1]) continue
    pairs.push(p)
  }
  const query = pairs[4]
  const answer = rule.f(...query)!
  for (let shown = 2; shown <= 4; shown++) {
    const examples = pairs.slice(0, shown)
    const rivals = BINARY.filter((r) => examples.every(([a, b]) => r.f(a, b) === rule.f(a, b)))
    if (rivals.some((r) => r.f(...query) !== answer)) continue
    const fmt = ([a, b]: [number, number]) => `(${a}, ${b})`
    return {
      kind: 'number',
      prompt: 'Каждая пара чисел превращается в одно число по одному и тому же правилу. Какое число вместо знака вопроса?',
      display: { type: 'lines', lines: [...examples.map((p) => `${fmt(p)} → ${rule.f(...p)}`), `${fmt(query)} → ?`] },
      answer: String(answer),
      hint: 'Обозначьте числа в паре как a и b и попробуйте сочетания: a × b, a² + b², (a + b)²…',
      solution: `Правило: ${rule.text}, где a — первое число пары, b — второе. Проверка: ${examples
        .map(([a, b]) => `(${a}, ${b}) → ${rule.f(a, b)}`)
        .join(', ')}. Для (${query[0]}, ${query[1]}) получаем ${answer}.`,
      key: `b:${rule.id}:${examples.flat().join(',')}:${query.join(',')}`,
    }
  }
  return null
}

function wordTask(level: Level, rng: Rng, index: number): Draft {
  const items = WORDS.filter((w) => w.level === level)
  const w = items[index % items.length]
  const options = rng.shuffle([w.answer, ...w.wrong])
  return {
    kind: 'choice',
    prompt: `${capitalizeFirst(w.a)} относится к слову «${w.b}» так же, как «${w.c}» — к какому слову?`,
    display: { type: 'lines', lines: [`${w.a} : ${w.b}`, `${w.c} : ?`] },
    options,
    answer: w.answer,
    hint: 'Сформулируйте связь в первой паре одним предложением, а потом примените его ко второй.',
    solution: w.why,
    key: `w:${w.a}:${w.c}`,
  }
}

const capitalizeFirst = (s: string) => `«${s.charAt(0).toUpperCase()}${s.slice(1)}»`

export const analogiesGenerator: ModuleGenerator = {
  module: 'analogies',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: (level, rng, index) => {
    if (level === 1) return index < 6 ? wordTask(1, rng, index) : numericUnary(1, rng, index)
    if (level === 2) return index < 8 ? wordTask(2, rng, index) : numericUnary(2, rng, index)
    if (level === 3) return index < 6 ? wordTask(3, rng, index) : numericUnary(3, rng, index)
    if (level === 4) return numericUnary(4, rng, index)
    return numericBinary(rng, index)
  },
}

export function analogies(): Task[] {
  return collect(analogiesGenerator)
}
