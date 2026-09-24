import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, gcd, joinAnd, plural, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/**
 * Выгодные решения: сравнение предложений, точка окупаемости, средняя
 * (ожидаемая) выгода, выбор лучшего набора при ограниченном бюджете и цена
 * точного прогноза. Все ответы получаются точным расчётом или полным перебором.
 */

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

// ——— Уровень 1: сравнить два предложения ———

function tariffs(rng: Rng): Draft | null {
  const perMin = rng.pick([2, 3, 4, 5])
  const flat = rng.pick([300, 350, 400, 450, 500, 600])
  const minutes = rng.int(5, 25) * 10
  const a = perMin * minutes
  if (Math.abs(a - flat) < flat * 0.08) return null
  const better = a < flat ? '«Поминутный»' : '«Безлимит»'
  return {
    kind: 'choice',
    prompt: `Мобильный оператор предлагает два тарифа:\n• «Поминутный» — ${rub(perMin)} за каждую минуту разговора;\n• «Безлимит» — ${rub(flat)} в месяц, сколько ни говори.\n\nВы разговариваете около ${minutes} минут в месяц. Какой тариф выгоднее?`,
    ...withOptions(better, [better === '«Поминутный»' ? '«Безлимит»' : '«Поминутный»', 'Они обходятся одинаково'], rng, 3),
    hint: 'Посчитайте, сколько вы заплатите за месяц по каждому тарифу.',
    solution: `«Поминутный»: ${minutes} × ${perMin} = ${rub(a)} в месяц. «Безлимит»: ${rub(flat)}. Выгоднее ${better} — разница ${rub(Math.abs(a - flat))}.`,
    key: `tariff:${perMin}:${flat}:${minutes}`,
  }
}

const PACKS = [
  { one: 'бутылка воды', many: 'бутылок', pack: 'упаковка', price: [40, 70] },
  { one: 'тетрадь', many: 'тетрадей', pack: 'набор', price: [30, 60] },
  { one: 'йогурт', many: 'йогуртов', pack: 'коробка', price: [50, 90] },
  { one: 'батарейка', many: 'батареек', pack: 'блистер', price: [60, 120] },
] as const

function bulk(rng: Rng): Draft {
  const item = rng.pick(PACKS)
  const price = rng.int(item.price[0], item.price[1])
  const k = rng.pick([4, 5, 6, 10, 12])
  const packPrice = Math.round((price * k * rng.pick([0.7, 0.75, 0.8, 0.85])) / 10) * 10
  const packs = rng.int(2, 4)
  const need = packs * k
  const save = need * price - packs * packPrice
  const firstWord = item.one.split(' ')[0]
  const cap = firstWord.charAt(0).toUpperCase() + firstWord.slice(1)
  const rest = item.one.split(' ').slice(1).join(' ')
  return {
    kind: 'number',
    prompt: `${cap}${rest ? ' ' + rest : ''} стоит ${rub(price)}, а ${item.pack} из ${k} — ${rub(packPrice)}. Нужно купить ${need} ${item.many}. Сколько рублей вы сэкономите, если возьмёте ${packs} ${plural(packs, 'упаковку', 'упаковки', 'упаковок')} вместо того, чтобы покупать по одной?`,
    answer: String(save),
    hint: 'Сравните стоимость одного и того же количества при двух способах покупки.',
    solution: `По одной: ${need} × ${price} = ${rub(need * price)}. Упаковками: ${packs} × ${packPrice} = ${rub(packs * packPrice)}. Экономия: ${rub(need * price)} − ${rub(packs * packPrice)} = ${rub(save)}.`,
    key: `bulk:${item.one}:${price}:${k}:${packPrice}:${packs}`,
  }
}

// ——— Уровень 2: точка окупаемости ———

function breakEven(rng: Rng, index: number): Draft | null {
  const t = index % 3
  if (t === 0) {
    const single = rng.pick([250, 300, 350, 400, 450, 500])
    const pass = rng.int(8, 30) * 100
    if (pass % single === 0) return null
    const n = Math.floor(pass / single) + 1
    return {
      kind: 'number',
      prompt: `Разовое посещение бассейна стоит ${rub(single)}, а абонемент на месяц с неограниченными посещениями — ${rub(pass)}. При каком наименьшем числе посещений в месяц абонемент выгоднее разовых билетов?`,
      answer: String(n),
      hint: 'Найдите, сколько разовых посещений стоят столько же, сколько абонемент.',
      solution: `Абонемент окупается, когда разовые билеты обошлись бы дороже: ${single} × n > ${pass}, то есть n > ${pass} : ${single} ≈ ${(pass / single).toFixed(1).replace('.', ',')}. Наименьшее целое — ${n}. Проверка: ${n - 1} ${plural(n - 1, 'посещение стоит', 'посещения стоят', 'посещений стоят')} ${rub((n - 1) * single)} (не дороже абонемента), а ${n} — ${rub(n * single)} (дороже).`,
      key: `pool:${single}:${pass}`,
    }
  }
  if (t === 1) {
    const fee = rng.pick([100, 150, 200, 250, 300])
    const a = rng.pick([1, 2, 3])
    const b = a + rng.pick([1, 2, 3, 4])
    const d = b - a
    if (fee % d === 0) return null
    const n = Math.floor(fee / d) + 1
    return {
      kind: 'number',
      prompt: `Тариф А: абонентская плата ${rub(fee)} в месяц и ${rub(a)} за минуту. Тариф Б: без абонентской платы, ${rub(b)} за минуту. При каком наименьшем числе минут в месяц тариф А станет дешевле тарифа Б?`,
      answer: String(n),
      hint: 'Каждая минута на тарифе А дешевле на одну и ту же сумму. Сколько минут нужно, чтобы эта экономия покрыла абонентскую плату?',
      solution: `Каждая минута на тарифе А дешевле на ${b} − ${a} = ${rub(d)}. Экономия должна превысить абонентскую плату: ${d} × n > ${fee}, n > ${(fee / d).toFixed(1).replace('.', ',')}. Наименьшее целое — ${n}. Проверка: при ${n} мин А стоит ${rub(fee + a * n)}, Б — ${rub(b * n)}.`,
      key: `fee:${fee}:${a}:${b}`,
    }
  }
  const card = rng.pick([300, 500, 600, 800, 1000, 1200, 1500])
  const pct = rng.pick([2, 3, 4, 5, 10])
  const total = (card * 100) / pct
  if (!Number.isInteger(total)) return null
  return {
    kind: 'number',
    prompt: `Карта постоянного покупателя стоит ${rub(card)} и даёт скидку ${pct}% на все покупки. На какую сумму (в рублях, до скидки) нужно сделать покупок, чтобы карта полностью окупилась?`,
    answer: String(total),
    hint: `Скидка ${pct}% — это ${pct} ₽ с каждых 100 ₽ покупок.`,
    solution: `С каждых 100 ₽ покупок карта экономит ${rub(pct)}. Чтобы сэкономить ${rub(card)}, нужно купить на ${card} : ${pct} × 100 = ${rub(total)}.`,
    key: `card:${card}:${pct}`,
  }
}

// ——— Уровень 3: средняя (ожидаемая) выгода ———

function frac(p: number, q: number) {
  const g = gcd(p, q)
  return `${p / g}/${q / g}`
}

function gamble(rng: Rng, index: number): Draft | null {
  if (index % 2 === 0) {
    // Платная игра с кубиком или рулеткой: средний результат одной игры.
    const sides = rng.pick([6, 6, 10])
    const win = rng.int(2, 9) * sides * 5
    const fee = rng.int(2, 12) * 10
    const ev = win / sides - fee
    if (ev === 0) return null
    const device = sides === 6 ? 'бросаете кубик; если выпадет шестёрка' : 'крутите колесо с 10 равными секторами; если выпадет сектор «Приз»'
    const correct = ev > 0 ? `В среднем выигрыш ${rub(ev)} за игру` : `В среднем проигрыш ${rub(-ev)} за игру`
    const noFee = win / sides
    return {
      kind: 'choice',
      prompt: `Участие в игре стоит ${rub(fee)}. Вы ${device}, получаете ${rub(win)}, иначе — ничего.\n\nЧто вас ждёт в среднем, если играть много раз?`,
      ...withOptions(
        correct,
        [
          ev > 0 ? `В среднем проигрыш ${rub(ev)} за игру` : `В среднем выигрыш ${rub(-ev)} за игру`,
          `В среднем выигрыш ${rub(noFee)} за игру`,
          'В среднем ни выигрыша, ни проигрыша',
          `В среднем выигрыш ${rub(win - fee)} за игру`,
        ],
        rng,
      ),
      hint: `Из ${sides} игр в среднем выигрышная только одна. Сравните, сколько вы получите и сколько заплатите за ${sides} игр.`,
      solution: `За ${sides} игр вы заплатите ${sides} × ${fee} = ${rub(sides * fee)}, а выиграете в среднем один раз — ${rub(win)}. В среднем за одну игру: ${win} : ${sides} − ${fee} = ${ev > 0 ? '+' : '−'}${rub(Math.abs(ev))}. ${ev > 0 ? 'Игра в среднем выгодна.' : 'Игра в среднем убыточна — так устроены почти все азартные игры.'}`,
      key: `game:${sides}:${win}:${fee}`,
    }
  }
  // Гарантированная сумма против риска.
  const q = rng.pick([4, 5, 10])
  const p = rng.int(1, q - 1)
  const big = rng.int(4, 20) * q * 10
  const small = rng.chance(0.5) ? 0 : rng.int(1, 5) * q * 10
  if (small >= big) return null
  const ev = (p * big + (q - p) * small) / q
  const sure = ev + rng.pick([-3, -2, -1, 1, 2, 3]) * 10 * (q === 10 ? 1 : 2)
  if (sure <= 0 || sure === ev) return null
  const pText = q === 10 ? `${p * 10}%` : frac(p, q)
  const correct = ev > sure ? 'Рискнуть: в среднем это выгоднее' : 'Взять гарантированную сумму'
  return {
    kind: 'choice',
    prompt: `Вам предлагают выбор:\n• гарантированно получить ${rub(sure)};\n• или рискнуть: с вероятностью ${pText} получить ${rub(big)}, иначе — ${small ? rub(small) : 'ничего'}.\n\nКакой вариант выгоднее в среднем, если такие решения приходится принимать много раз?`,
    ...withOptions(correct, [ev > sure ? 'Взять гарантированную сумму' : 'Рискнуть: в среднем это выгоднее', 'Варианты в среднем равны'], rng, 3),
    hint: 'Посчитайте средний результат риска: каждый исход умножьте на его вероятность и сложите.',
    solution: `Средний результат риска: ${pText} × ${big}${small ? ` + ${q === 10 ? `${100 - p * 10}%` : frac(q - p, q)} × ${small}` : ''} = ${rub(ev)}. Гарантированно — ${rub(sure)}. ${ev > sure ? `Риск в среднем выгоднее на ${rub(ev - sure)}.` : `Гарантированная сумма больше на ${rub(sure - ev)}.`} В одном отдельном случае можно рассуждать и иначе (например, если проигрыш недопустим), но при многократных решениях выигрывает тот, кто выбирает бо́льшее среднее.`,
    key: `risk:${sure}:${p}/${q}:${big}:${small}`,
  }
}

// ——— Уровни 4–5: лучший набор при ограниченном бюджете ———

interface Item {
  name: string
  cost: number
  value: number
}

const SETS = [
  {
    intro: (b: number) => `Команда выбирает проекты на квартал. Бюджет — ${b} млн ₽. Каждый проект можно взять только целиком.`,
    cost: 'млн ₽',
    value: (v: number) => `польза ${v}`,
    names: ['Мобильное приложение', 'Новый сайт', 'Реклама', 'Обучение сотрудников', 'Склад', 'Чат-бот', 'Выставка'],
    ask: 'Какую наибольшую суммарную пользу (в баллах) можно получить?',
  },
  {
    intro: (b: number) => `До экзамена осталось ${b} часов. Для каждой темы известно, сколько часов нужно на подготовку и сколько баллов она может принести.`,
    cost: 'ч',
    value: (v: number) => `${v} ${plural(v, 'балл', 'балла', 'баллов')}`,
    names: ['Алгебра', 'Геометрия', 'Вероятность', 'Функции', 'Текстовые задачи', 'Логарифмы', 'Уравнения'],
    ask: 'Какое наибольшее число баллов можно подготовить?',
  },
  {
    intro: (b: number) => `В рюкзак помещается не больше ${b} кг. Для каждой вещи известны вес и полезность в походе.`,
    cost: 'кг',
    value: (v: number) => `полезность ${v}`,
    names: ['Палатка', 'Котелок', 'Фотоаппарат', 'Книга', 'Запас еды', 'Тёплая куртка', 'Удочка'],
    ask: 'Какую наибольшую суммарную полезность можно унести?',
  },
]

interface Best {
  set: number[]
  cost: number
  value: number
}

function bestSubset(items: Item[], budget: number, ok: (set: number[]) => boolean = () => true): Best {
  let best: Best = { set: [], cost: 0, value: 0 }
  for (let mask = 0; mask < 1 << items.length; mask++) {
    const set = items.map((_, i) => i).filter((i) => mask & (1 << i))
    const cost = set.reduce((s, i) => s + items[i].cost, 0)
    if (cost > budget || !ok(set)) continue
    const value = set.reduce((s, i) => s + items[i].value, 0)
    if (value > best.value || (value === best.value && cost < best.cost)) best = { set, cost, value }
  }
  return best
}

/** Жадный выбор: брать по очереди самые ценные (или самые «выгодные на рубль»), пока влезает. */
function greedy(items: Item[], budget: number, by: (i: Item) => number, ok: (set: number[]) => boolean = () => true): Best {
  const order = items.map((_, i) => i).sort((a, b) => by(items[b]) - by(items[a]))
  const set: number[] = []
  let cost = 0
  for (const i of order) {
    if (cost + items[i].cost <= budget && ok([...set, i])) {
      set.push(i)
      cost += items[i].cost
    }
  }
  return { set, cost, value: set.reduce((s, i) => s + items[i].value, 0) }
}

function knapsack(rng: Rng, level: Level): Draft | null {
  const ctx = rng.pick(SETS)
  const n = level === 4 ? 5 : 6
  const names = rng.sample(ctx.names, n)
  const items: Item[] = names.map((name) => ({ name, cost: rng.int(2, 9), value: rng.int(3, 20) }))
  const total = items.reduce((s, i) => s + i.cost, 0)
  const budget = Math.round(total * (0.45 + rng.next() * 0.15))
  // На пятом уровне — дополнительное условие: два варианта несовместимы.
  const [x, y] = level === 5 ? rng.sample([...items.keys()], 2) : [-1, -1]
  const ok = (set: number[]) => !(set.includes(x) && set.includes(y))
  const best = bestSubset(items, budget, ok)
  const byValue = greedy(items, budget, (i) => i.value, ok)
  const byRatio = greedy(items, budget, (i) => i.value / i.cost, ok)
  // Берём только задачи, где простые «жадные» правила ошибаются.
  if (byValue.value >= best.value || (level === 5 && byRatio.value >= best.value)) return null
  if (level === 5 && bestSubset(items, budget).value === best.value) return null
  const letter = (i: number) => 'АБВГДЕЖ'[i]
  const list = items.map((it, i) => `${letter(i)}. ${it.name} — ${it.cost} ${ctx.cost}, ${ctx.value(it.value)}`)
  const pick = (b: Best) => `${joinAnd(b.set.map(letter))} (${b.cost} ${ctx.cost}, итого ${b.value})`
  const extra = level === 5 ? `\n\nОграничение: ${letter(x)} и ${letter(y)} нельзя выбрать вместе.` : ''
  return {
    kind: 'number',
    prompt: `${ctx.intro(budget)}${extra}\n\n${ctx.ask}`,
    display: { type: 'lines', lines: list },
    answer: String(best.value),
    hint: 'Не спешите брать самое ценное: оно может занять место, которого хватило бы на два хороших варианта. Сравните несколько наборов.',
    solution: `Лучший набор: ${pick(best)}.\n\nПростые правила здесь подводят: если брать сначала самое ценное, получится ${pick(byValue)}${byRatio.value < best.value ? `; если брать сначала самое выгодное на единицу затрат — ${pick(byRatio)}` : ''}. Проверка всех наборов, которые укладываются в лимит${level === 5 ? ' и ограничение' : ''}, показывает, что больше ${best.value} получить нельзя.`,
    key: `knap:${level}:${ctx.cost}:${items.map((i) => `${i.name}/${i.cost}/${i.value}`).join(',')}:${budget}:${x}:${y}`,
  }
}

// ——— Уровень 5: сколько стоит точный прогноз ———

const FORECASTS = [
  { who: 'Организатор фестиваля', a: 'провести его на открытой площадке', b: 'арендовать крытый зал', bad: 'дождь', good: 'ясно', unit: 'тыс. ₽' },
  { who: 'Фермер', a: 'посадить огурцы', b: 'посадить подсолнечник', bad: 'засушливое лето', good: 'дождливое лето', unit: 'тыс. ₽' },
  { who: 'Магазин', a: 'закупить много солнцезащитных очков', b: 'закупить много зонтов', bad: 'дождливый месяц', good: 'солнечный месяц', unit: 'тыс. ₽' },
]

function forecast(rng: Rng): Draft | null {
  const f = rng.pick(FORECASTS)
  const q = rng.pick([4, 5, 10])
  const p = rng.int(1, q - 1)
  const u = q * 10
  // Прибыль: [при плохой погоде, при хорошей].
  const A = [rng.int(-3, 3) * u, rng.int(4, 12) * u]
  const B = [rng.int(2, 8) * u, rng.int(1, 6) * u]
  if (A[0] >= B[0] || A[1] <= B[1]) return null
  const ev = (x: number[]) => (p * x[0] + (q - p) * x[1]) / q
  const evA = ev(A)
  const evB = ev(B)
  if (evA === evB) return null
  const noInfo = Math.max(evA, evB)
  const withInfo = (p * B[0] + (q - p) * A[1]) / q
  const value = withInfo - noInfo
  if (value <= 0) return null
  const pText = q === 10 ? `${p * 10}%` : frac(p, q)
  const qText = q === 10 ? `${100 - p * 10}%` : frac(q - p, q)
  const money = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n)} ${f.unit}`
  /** Число в выражении: отрицательное — в скобках. */
  const num = (n: number) => (n < 0 ? `(−${Math.abs(n)})` : String(n))
  return {
    kind: 'number',
    prompt: `${f.who} выбирает: ${f.a} или ${f.b}. Вероятность того, что будет ${f.bad}, — ${pText}, иначе — ${f.good}. Прибыль в каждом случае:`,
    display: {
      type: 'table',
      head: ['', `${f.bad}`, `${f.good}`],
      rows: [
        [f.a.charAt(0).toUpperCase() + f.a.slice(1), money(A[0]), money(A[1])],
        [f.b.charAt(0).toUpperCase() + f.b.slice(1), money(B[0]), money(B[1])],
      ],
    },
    answer: String(value),
    hint: 'Посчитайте среднюю прибыль лучшего решения без прогноза и среднюю прибыль, если бы вы всегда заранее знали погоду и выбирали лучшее. Разница — цена прогноза.',
    solution: `Без прогноза: «${f.a}» даёт в среднем ${pText} × ${num(A[0])} + ${qText} × ${num(A[1])} = ${money(evA)}, «${f.b}» — ${pText} × ${num(B[0])} + ${qText} × ${num(B[1])} = ${money(evB)}. Лучшее — ${money(noInfo)}.\n\nС точным прогнозом: если будет ${f.bad}, выбираем «${f.b}» (${money(B[0])}), если ${f.good} — «${f.a}» (${money(A[1])}). В среднем: ${pText} × ${num(B[0])} + ${qText} × ${num(A[1])} = ${money(withInfo)}.\n\nПрогноз увеличивает среднюю прибыль на ${money(withInfo)} − ${money(noInfo)} = ${money(value)} — дороже платить за него невыгодно.`,
    key: `forecast:${f.who}:${p}/${q}:${A.join(',')}:${B.join(',')}`,
  }
}

function generate(level: Level, rng: Rng, index: number): Draft | null {
  switch (level) {
    case 1:
      return index % 2 === 0 ? tariffs(rng) : bulk(rng)
    case 2:
      return breakEven(rng, index)
    case 3:
      return gamble(rng, index)
    case 4:
      return index % 3 === 2 ? gamble(rng, 1) : knapsack(rng, 4)
    case 5:
      return index % 2 === 0 ? knapsack(rng, 5) : forecast(rng)
  }
}

export const decisionsGenerator: ModuleGenerator = {
  module: 'decisions',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function decisions(): Task[] {
  return collect(decisionsGenerator)
}
