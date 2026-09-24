import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, gcd, plural, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/** Вероятность: ответ — несократимая дробь; неверные варианты — типичные ошибки. */

const f = (p: number, q: number) => {
  if (p === 0) return '0'
  const g = gcd(p, q)
  return p === q ? '1' : `${p / g}/${q / g}`
}

const eq = (a: string, b: string) => a === b

/** Собирает варианты, отбрасывая совпадающие с ответом и некорректные (больше 1). */
function fracOptions(correct: string, wrong: [number, number][], rng: Rng) {
  const list = wrong.filter(([p, q]) => q > 0 && p > 0 && p <= q).map(([p, q]) => f(p, q))
  const pad = [
    [1, 2],
    [1, 3],
    [1, 4],
    [1, 6],
    [2, 3],
    [3, 4],
    [5, 6],
    [1, 12],
    [1, 36],
  ].map(([p, q]) => f(p, q))
  return withOptions(correct, [...rng.shuffle(list), ...rng.shuffle(pad)].filter((x) => !eq(x, correct)), rng)
}

const COLORS = [
  { nom: 'красных', one: 'красный' },
  { nom: 'синих', one: 'синий' },
  { nom: 'зелёных', one: 'зелёный' },
  { nom: 'жёлтых', one: 'жёлтый' },
  { nom: 'белых', one: 'белый' },
]

/** «1 красный», но «3 красных». */
const adj = (n: number, c: (typeof COLORS)[number]) => (n % 10 === 1 && n % 100 !== 11 ? c.one : c.nom)
const genitive = (one: string) => one.replace(/ый$/, 'ого').replace(/ий$/, 'его')

const balls = (n: number) => `${n} ${plural(n, 'шар', 'шара', 'шаров')}`

function dieEvent(rng: Rng): { text: string; count: number; list: number[] } {
  const k = rng.int(2, 5)
  const events = [
    { text: 'чётное число', list: [2, 4, 6] },
    { text: 'нечётное число', list: [1, 3, 5] },
    { text: `число больше ${k}`, list: [1, 2, 3, 4, 5, 6].filter((x) => x > k) },
    { text: `число меньше ${k}`, list: [1, 2, 3, 4, 5, 6].filter((x) => x < k) },
    { text: 'число, кратное 3', list: [3, 6] },
    { text: 'простое число', list: [2, 3, 5] },
    { text: 'шестёрка', list: [6] },
  ]
  const e = rng.pick(events)
  return { ...e, count: e.list.length }
}

function level1(rng: Rng, index: number): Draft | null {
  if (index % 2 === 0) {
    const e = dieEvent(rng)
    return {
      kind: 'choice',
      prompt: `Бросают обычный игральный кубик. Какова вероятность, что выпадет ${e.text}?`,
      ...fracOptions(f(e.count, 6), [[1, 6], [e.count, 5], [6 - e.count, 6], [1, e.count]], rng),
      hint: 'Вероятность = число подходящих исходов : число всех равновозможных исходов.',
      solution: `Всего исходов 6. Подходят: ${e.list.join(', ')} — это ${e.count}. Вероятность ${e.count}/6${f(e.count, 6) !== `${e.count}/6` ? ` = ${f(e.count, 6)}` : ''}.`,
      key: `die:${e.text}`,
    }
  }
  const cs = rng.sample(COLORS, 3)
  const n = cs.map(() => rng.int(1, 9))
  const total = n[0] + n[1] + n[2]
  const i = rng.int(0, 2)
  return {
    kind: 'choice',
    prompt: `В коробке ${n.map((x, j) => `${x} ${adj(x, cs[j])}`).join(', ').replace(/, ([^,]*)$/, ' и $1')} ${plural(n[2], 'шар', 'шара', 'шаров')}. Наугад достают один шар. Какова вероятность, что он ${cs[i].one}?`,
    ...fracOptions(f(n[i], total), [[n[i], total - n[i]], [1, 3], [total - n[i], total], [n[i], total + 1]], rng),
    hint: 'Все шары равновозможны. Сколько всего шаров и сколько из них подходят?',
    solution: `Всего шаров ${total}, ${cs[i].nom} — ${n[i]}. Вероятность ${n[i]}/${total}${f(n[i], total) !== `${n[i]}/${total}` ? ` = ${f(n[i], total)}` : ''}. Частая ошибка — делить на число шаров других цветов (${n[i]}/${total - n[i]}), а не на число всех шаров.`,
    key: `box:${cs.map((c) => c.one).join(',')}:${n.join(',')}:${i}`,
  }
}

function level2(rng: Rng, index: number): Draft | null {
  const t = index % 3
  if (t === 0) {
    const s = rng.int(3, 11)
    const pairs: string[] = []
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === s) pairs.push(`${a}+${b}`)
    return {
      kind: 'choice',
      prompt: `Бросают два игральных кубика. Какова вероятность, что сумма очков будет равна ${s}?`,
      ...fracOptions(f(pairs.length, 36), [[1, 11], [1, 36], [pairs.length, 11], [Math.ceil(pairs.length / 2), 21]], rng),
      hint: 'У двух кубиков 6 × 6 = 36 равновозможных исходов. Важно, какой кубик что показал: 1+2 и 2+1 — разные исходы.',
      solution: `Всего исходов 36. Сумму ${s} дают: ${pairs.join(', ')} — ${pairs.length} ${plural(pairs.length, 'исход', 'исхода', 'исходов')}. Вероятность ${pairs.length}/36${f(pairs.length, 36) !== `${pairs.length}/36` ? ` = ${f(pairs.length, 36)}` : ''}. Ошибка — считать, что сумм всего 11 и они равновероятны.`,
      key: `sum:${s}`,
    }
  }
  if (t === 1) {
    const n = rng.int(2, 3)
    const total = 2 ** n
    return {
      kind: 'choice',
      prompt: `Монету подбрасывают ${n} раза. Какова вероятность, что хотя бы один раз выпадет орёл?`,
      ...fracOptions(f(total - 1, total), [[1, 2], [n, total], [1, total], [n, n + 1]], rng),
      hint: '«Хотя бы один» удобно считать через противоположное событие: ни одного орла.',
      solution: `Противоположное событие — ${n === 2 ? 'оба раза' : `все ${n} раза`} решка: вероятность ${f(1, total)}. Значит, хотя бы один орёл: 1 − ${f(1, total)} = ${f(total - 1, total)}.`,
      key: `coin-any:${n}`,
    }
  }
  const cs = rng.sample(COLORS, 2)
  const a = rng.int(2, 9)
  const b = rng.int(2, 9)
  return {
    kind: 'choice',
    prompt: `В мешке ${a} ${adj(a, cs[0])} и ${b} ${adj(b, cs[1])} ${plural(b, 'шар', 'шара', 'шаров')}. Достают один шар. Какова вероятность, что он не ${cs[0].one}?`,
    ...fracOptions(f(b, a + b), [[a, a + b], [b, a], [1, 2], [b, a + b + 1]], rng),
    hint: `Не ${cs[0].one} — значит, какого-то другого цвета.`,
    solution: `Всего ${balls(a + b)}, «не ${cs[0].one}» — это ${b}. Вероятность ${b}/${a + b}${f(b, a + b) !== `${b}/${a + b}` ? ` = ${f(b, a + b)}` : ''}. Или через дополнение: 1 − ${f(a, a + b)} = ${f(b, a + b)}.`,
    key: `not:${cs[0].one}:${a}:${b}`,
  }
}

function level3(rng: Rng, index: number): Draft | null {
  const t = index % 3
  if (t === 0) {
    const e1 = dieEvent(rng)
    const coin = rng.pick(['орёл', 'решка'])
    return {
      kind: 'choice',
      prompt: `Бросают игральный кубик и монету. Какова вероятность, что на кубике выпадет ${e1.text}, а на монете — ${coin}?`,
      ...fracOptions(f(e1.count, 12), [[e1.count + 3, 12], [e1.count, 6], [1, 2], [e1.count, 8]], rng),
      hint: 'События независимы: вероятность того, что произойдут оба, равна произведению вероятностей.',
      solution: `P(кубик) = ${f(e1.count, 6)}, P(${coin}) = 1/2. События независимы, поэтому перемножаем: ${f(e1.count, 6)} × 1/2 = ${f(e1.count, 12)}. Складывать вероятности здесь нельзя — сложение нужно для «или», а не для «и».`,
      key: `die-coin:${e1.text}:${coin}`,
    }
  }
  if (t === 1) {
    const n = 3
    const k = rng.int(1, 2)
    const ways = k === 1 ? 3 : 3
    return {
      kind: 'choice',
      prompt: `Монету подбрасывают ${n} раза. Какова вероятность, что орёл выпадет ровно ${k === 1 ? 'один раз' : 'два раза'}?`,
      ...fracOptions(f(ways, 8), [[1, 8], [1, 3], [1, 2], [2, 3]], rng),
      hint: 'Выпишите все 8 исходов (ООО, ООР, …) и посчитайте подходящие.',
      solution: `Всего исходов 2 × 2 × 2 = 8. Ровно ${k === 1 ? 'один орёл' : 'два орла'}: ${k === 1 ? 'ОРР, РОР, РРО' : 'ООР, ОРО, РОО'} — 3 исхода. Вероятность 3/8.`,
      key: `coin3:${k}`,
    }
  }
  const cs = rng.sample(COLORS, 2)
  const a = rng.int(1, 6)
  const b = rng.int(2, 8)
  const n = a + b
  return {
    kind: 'choice',
    prompt: `В коробке ${a} ${adj(a, cs[0])} и ${b} ${adj(b, cs[1])} ${plural(b, 'шар', 'шара', 'шаров')}. Достают шар, смотрят цвет и возвращают обратно, затем достают ещё раз. Какова вероятность, что оба раза попадётся ${cs[0].one} шар?`,
    ...fracOptions(f(a * a, n * n), [[a, n], [2 * a, n], [a * (a - 1), n * (n - 1)], [a * a, n * (n - 1)]], rng),
    hint: 'Шар возвращают, поэтому второй раз всё как в первый. События независимы.',
    solution: `Вероятность ${genitive(cs[0].one)} шара в каждой попытке ${f(a, n)}. Попытки независимы: ${f(a, n)} × ${f(a, n)} = ${f(a * a, n * n)}.`,
    key: `with-repl:${cs[0].one}:${a}:${b}`,
  }
}

function level4(rng: Rng, index: number): Draft | null {
  const items = rng.pick([
    { what: ['носок', 'носка', 'носков'], a: 'чёрных', b: 'белых', aOne: 'чёрными', aSing: 'чёрный носок', where: 'В ящике' },
    { what: ['карандаш', 'карандаша', 'карандашей'], a: 'красных', b: 'синих', aOne: 'красными', aSing: 'красный карандаш', where: 'В пенале' },
    { what: ['билет', 'билета', 'билетов'], a: 'выигрышных', b: 'пустых', aOne: 'выигрышными', aSing: 'выигрышный билет', where: 'В шляпе' },
  ])
  const a = rng.int(2, 6)
  const b = rng.int(2, 8)
  const n = a + b
  if (index % 2 === 0) {
    return {
      kind: 'choice',
      prompt: `${items.where} ${a} ${items.a} и ${b} ${items.b} ${plural(b, items.what[0], items.what[1], items.what[2])}. Наугад вынимают два (не возвращая). Какова вероятность, что оба окажутся ${items.aOne}?`,
      ...fracOptions(f(a * (a - 1), n * (n - 1)), [[a * a, n * n], [a, n], [a - 1, n - 1], [2 * a, n]], rng),
      hint: 'После первого вынутого предмета их стало меньше — вероятность для второго меняется.',
      solution: `Первый: ${a}/${n}. Если он подошёл, осталось ${a - 1} нужных из ${n - 1}: ${a - 1}/${n - 1}. Вместе: ${a}/${n} × ${a - 1}/${n - 1} = ${a * (a - 1)}/${n * (n - 1)} = ${f(a * (a - 1), n * (n - 1))}. Ошибка — возводить ${f(a, n)} в квадрат, как будто первый вернули.`,
      key: `no-repl:${items.what[2]}:${a}:${b}`,
    }
  }
  const none = b * (b - 1)
  const all = n * (n - 1)
  return {
    kind: 'choice',
    prompt: `${items.where} ${a} ${items.a} и ${b} ${items.b} ${plural(b, items.what[0], items.what[1], items.what[2])}. Наугад вынимают два (не возвращая). Какова вероятность, что среди них будет хотя бы один ${items.aSing}?`,
    ...fracOptions(f(all - none, all), [[none, all], [a, n], [2 * a, n], [a * (a - 1), all]], rng),
    hint: 'Проще посчитать противоположное событие — что оба окажутся из других — и вычесть из 1.',
    solution: `Оба из ${items.b}: ${b}/${n} × ${b - 1}/${n - 1} = ${f(none, all)}. Значит, хотя бы один ${items.aSing}: 1 − ${f(none, all)} = ${f(all - none, all)}.`,
    key: `atleast:${items.what[2]}:${a}:${b}`,
  }
}

function level5(rng: Rng, index: number): Draft | null {
  if (index % 2 === 0) {
    // Медицинский тест: считаем «в людях», а не в процентах.
    const pop = 1000
    const sick = rng.pick([5, 10, 20, 40, 50])
    const sens = rng.pick([80, 90, 100])
    const fpr = rng.pick([2, 5, 10])
    const tp = (sick * sens) / 100
    const fp = ((pop - sick) * fpr) / 100
    if (!Number.isInteger(tp) || !Number.isInteger(fp)) return null
    const correct = f(tp, tp + fp)
    return {
      kind: 'choice',
      prompt: `Болезнью страдает ${sick} человек из ${pop}. Тест находит болезнь у ${sens}% больных, но у ${fpr}% здоровых тоже ошибочно показывает «болен». Тест у человека оказался положительным. Какова вероятность, что он действительно болен?`,
      ...fracOptions(correct, [[sens, 100], [100 - fpr, 100], [sick, pop], [tp, pop]], rng),
      hint: `Представьте ${pop} человек и посчитайте, сколько из них получат положительный тест — больные и здоровые отдельно.`,
      solution: `Из ${pop} человек больны ${sick}, тест найдёт ${tp} из них. Здоровых ${pop - sick}, ложный «болен» получат ${fpr}% — это ${fp} человек. Всего положительных ${tp} + ${fp} = ${tp + fp}, из них больны ${tp}. Вероятность ${tp}/${tp + fp}${correct !== `${tp}/${tp + fp}` ? ` = ${correct}` : ''}${tp / (tp + fp) < 0.5 ? ' — меньше половины! Когда болезнь редкая, большинство положительных результатов — ложные' : ''}.`,
      key: `bayes:${sick}:${sens}:${fpr}`,
    }
  }
  const n = rng.int(2, 4)
  const all = 6 ** n
  const none = 5 ** n
  return {
    kind: 'choice',
    prompt: `Игральный кубик бросают ${n} ${plural(n, 'раз', 'раза', 'раз')}. Какова вероятность, что шестёрка выпадет хотя бы один раз?`,
    ...fracOptions(f(all - none, all), [[n, 6], [1, 6], [none, all], [n, 6 * n]], rng),
    hint: 'Вероятности «по 1/6 за бросок» нельзя просто сложить — посчитайте, что шестёрка не выпадет ни разу.',
    solution: `Ни одной шестёрки: (5/6)^${n} = ${none}/${all}. Хотя бы одна: 1 − ${none}/${all} = ${f(all - none, all)}. Складывать ${n} × 1/6 = ${f(n, 6)} нельзя: при 6 бросках такое «правило» дало бы вероятность 1, а шестёрка вполне может не выпасть ни разу.`,
    key: `six-any:${n}`,
  }
}

const MAKERS = [level1, level2, level3, level4, level5]

function generate(level: Level, rng: Rng, index: number): Draft | null {
  return MAKERS[level - 1](rng, index)
}

export const probabilityGenerator: ModuleGenerator = {
  module: 'probability',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function probability(): Task[] {
  return collect(probabilityGenerator)
}
