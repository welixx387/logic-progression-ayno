import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/** Проценты и доли: от «15% от 240» до сушёных ягод и процентных пунктов. */

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
const num = (n: number) => n.toLocaleString('ru-RU')

interface Good {
  name: string
  /** «стоит» / «стоят» */
  costs: string
  /** «стоил» / «стоила» / «стоили» */
  cost: string
}
const g = (name: string, form: 'm' | 'f' | 'pl'): Good => ({
  name,
  costs: form === 'pl' ? 'стоят' : 'стоит',
  cost: form === 'pl' ? 'стоили' : form === 'f' ? 'стоила' : 'стоил',
})
const GOODS: Good[] = [
  g('Куртка', 'f'),
  g('Велосипед', 'm'),
  g('Телефон', 'm'),
  g('Рюкзак', 'm'),
  g('Наушники', 'pl'),
  g('Кроссовки', 'pl'),
  g('Настольная игра', 'f'),
  g('Самокат', 'm'),
]

function level1(rng: Rng, index: number): Draft | null {
  const t = index % 3
  if (t === 0) {
    const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75])
    const n = rng.int(2, 40) * (100 / gcd100(p))
    const ans = (n * p) / 100
    return {
      kind: 'number',
      prompt: `Найдите ${p}% от ${num(n)}.`,
      answer: String(ans),
      hint: `1% — это сотая часть числа. Найдите 1% от ${num(n)} и умножьте на ${p}.`,
      solution: `1% от ${num(n)} — это ${num(n)} : 100 = ${num(n / 100)}. Тогда ${p}% — это ${num(n / 100)} × ${p} = ${num(ans)}.`,
      key: `of:${p}:${n}`,
    }
  }
  const item = rng.pick(GOODS)
  const price = rng.int(8, 60) * 100
  const p = rng.pick([10, 20, 25, 30, 40, 50])
  const up = t === 2
  const res = up ? price + (price * p) / 100 : price - (price * p) / 100
  return {
    kind: 'number',
    prompt: up
      ? `${item.name} ${item.cost} ${rub(price)}. Цену повысили на ${p}%. Какой стала цена (в рублях)?`
      : `${item.name} ${item.costs} ${rub(price)}. В магазине скидка ${p}%. Сколько придётся заплатить (в рублях)?`,
    answer: String(res),
    hint: `Найдите ${p}% от ${rub(price)} и ${up ? 'прибавьте' : 'вычтите'}.`,
    solution: `${p}% от ${num(price)} = ${num((price * p) / 100)}. ${up ? `${num(price)} + ${num((price * p) / 100)}` : `${num(price)} − ${num((price * p) / 100)}`} = ${rub(res)}.`,
    key: `${up ? 'up' : 'down'}:${item.name}:${price}:${p}`,
  }
}

/** Наименьший знаменатель, при котором p% от числа — целое. */
function gcd100(p: number) {
  let a = p
  let b = 100
  while (b) [a, b] = [b, a % b]
  return a
}

function level2(rng: Rng, index: number): Draft | null {
  const t = index % 3
  if (t === 0) {
    const from = rng.int(2, 20) * 20
    const p = rng.pick([10, 20, 25, 40, 50, 75])
    const up = rng.chance(0.5)
    const to = up ? from + (from * p) / 100 : from - (from * p) / 100
    if (!Number.isInteger(to)) return null
    return {
      kind: 'number',
      prompt: `Цена ${up ? 'выросла' : 'снизилась'} с ${rub(from)} до ${rub(to)}. На сколько процентов она ${up ? 'выросла' : 'снизилась'}?`,
      answer: String(p),
      hint: 'Проценты считаются от того значения, которое было сначала.',
      solution: `Изменение: ${num(Math.abs(to - from))} ₽. Делим на начальную цену: ${num(Math.abs(to - from))} : ${num(from)} = ${p / 100} = ${p}%.`,
      key: `chg:${from}:${to}`,
    }
  }
  if (t === 1) {
    const whole = rng.pick([20, 25, 40, 50, 60, 80, 120, 150, 200])
    const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 60, 75])
    const part = (whole * p) / 100
    if (!Number.isInteger(part)) return null
    return {
      kind: 'number',
      prompt: `Какой процент составляет ${part} от ${whole}?`,
      answer: String(p),
      hint: 'Разделите часть на целое и умножьте на 100.',
      solution: `${part} : ${whole} × 100 = ${p}%.`,
      key: `pct:${part}:${whole}`,
    }
  }
  const n = rng.pick([20, 25, 30, 40, 50])
  const p = rng.pick([20, 30, 40, 60, 70, 80])
  const boys = (n * p) / 100
  if (!Number.isInteger(boys)) return null
  return {
    kind: 'number',
    prompt: `В летнем лагере ${n} детей, ${p}% из них — мальчики. Сколько в лагере девочек?`,
    answer: String(n - boys),
    hint: `Можно сначала найти, сколько процентов составляют девочки.`,
    solution: `Девочек ${100 - p}%. ${100 - p}% от ${n} = ${n} × ${100 - p} : 100 = ${n - boys}.`,
    key: `camp:${n}:${p}`,
  }
}

function level3(rng: Rng, index: number): Draft | null {
  const t = index % 3
  if (t === 0) {
    const a = rng.pick([10, 20, 25, 30, 40, 50])
    const b = rng.chance(0.5) ? a : rng.pick([10, 20, 25, 30, 40, 50])
    const upFirst = rng.chance(0.5)
    const k = upFirst ? (100 + a) * (100 - b) : (100 - a) * (100 + b)
    const change = (k - 10000) / 100
    if (!Number.isInteger(change) || change === 0) return null
    const correct = change > 0 ? `Выше исходной на ${change}%` : `Ниже исходной на ${-change}%`
    const naive = upFirst ? a - b : b - a
    const naiveText = naive === 0 ? 'Не изменилась' : naive > 0 ? `Выше исходной на ${naive}%` : `Ниже исходной на ${-naive}%`
    return {
      kind: 'choice',
      prompt: `Цену товара сначала ${upFirst ? `повысили на ${a}%` : `снизили на ${a}%`}, а потом ${upFirst ? `снизили на ${b}%` : `повысили на ${b}%`}. Как итоговая цена соотносится с исходной?`,
      ...withOptions(correct, [naiveText, 'Не изменилась', change > 0 ? `Ниже исходной на ${change}%` : `Выше исходной на ${-change}%`, `Ниже исходной на ${Math.abs(change) * 2}%`], rng),
      hint: 'Второе изменение считается уже от новой цены, а не от исходной. Возьмите цену 100 и проследите по шагам.',
      solution: `Пусть цена была 100. После первого изменения: ${upFirst ? 100 + a : 100 - a}. Второе изменение считается от этого числа: ${upFirst ? 100 + a : 100 - a} × ${upFirst ? (100 - b) / 100 : (100 + b) / 100} = ${k / 100}. Итог: ${correct.toLowerCase()}. Проценты нельзя просто складывать и вычитать — у них разная база.`,
      key: `seq:${upFirst}:${a}:${b}`,
    }
  }
  if (t === 1) {
    const from = rng.pick([4, 5, 8, 10, 12, 16, 20])
    const to = from + rng.pick([1, 2, 3, 4, 5])
    const pct = ((to - from) * 100) / from
    if (!Number.isInteger(pct)) return null
    const what = rng.pick(['Ставка по вкладу', 'Доля отличников в школе', 'Уровень безработицы в городе', 'Доля покупок онлайн'])
    return {
      kind: 'choice',
      prompt: `${what} выросла с ${from}% до ${to}%. На сколько процентов она выросла?`,
      ...withOptions(`На ${pct}%`, [`На ${to - from}%`, `На ${to}%`, `На ${pct * 2}%`, `На ${Math.round(pct / 2)}%`], rng),
      hint: 'Разница между 8% и 10% — это 2 процентных пункта. А на сколько процентов выросло само число?',
      solution: `Разница ${to}% − ${from}% = ${to - from} процентных ${to - from === 1 ? 'пункт' : to - from < 5 ? 'пункта' : 'пунктов'}. Но в процентах рост считается от начального значения: ${to - from} : ${from} × 100 = ${pct}%. Путаница «процентов» и «процентных пунктов» — частая ловушка в новостях.`,
      key: `pp:${what}:${from}:${to}`,
    }
  }
  const p = rng.pick([10, 20, 25, 40, 50])
  const orig = rng.int(4, 50) * 100
  const after = orig - (orig * p) / 100
  const item = rng.pick(GOODS)
  return {
    kind: 'number',
    prompt: `После скидки ${p}% ${item.name.toLowerCase()} ${item.costs} ${rub(after)}. Какой была цена до скидки (в рублях)?`,
    answer: String(orig),
    hint: `${rub(after)} — это не ${100 - p}% от новой цены, а ${100 - p}% от старой.`,
    solution: `После скидки осталось ${100 - p}% исходной цены. Значит, 1% — это ${num(after)} : ${100 - p} = ${num(after / (100 - p))}, а 100% — ${rub(orig)}. Частая ошибка — прибавить ${p}% к новой цене: ${num(after)} + ${p}% = ${num(after * (1 + p / 100))} — не то.`,
    key: `back:${p}:${orig}`,
  }
}

function level4(rng: Rng, index: number): Draft | null {
  const t = index % 3
  if (t === 0) {
    const r = rng.pick([10, 20, 5])
    const years = r === 5 ? 2 : rng.pick([2, 3])
    const start = rng.pick([10000, 20000, 50000, 100000, 200000])
    let v = start
    const steps: string[] = []
    for (let y = 1; y <= years; y++) {
      const nv = (v * (100 + r)) / 100
      steps.push(`через ${y} ${y === 1 ? 'год' : 'года'}: ${num(v)} × ${1 + r / 100} = ${num(nv)}`)
      v = nv
    }
    if (!Number.isInteger(v)) return null
    return {
      kind: 'number',
      prompt: `На вклад положили ${rub(start)} под ${r}% годовых. Каждый год проценты начисляются на всю сумму, включая уже начисленные проценты. Сколько рублей будет на вкладе через ${years} ${years === 2 ? 'года' : 'года'}?`,
      answer: String(v),
      hint: `Каждый год сумма умножается на ${1 + r / 100}. Не прибавляйте ${r}% от начальной суммы каждый год — проценты начисляются и на проценты.`,
      solution: `${steps.join('\n')}\n\nИтого ${rub(v)}. Если бы проценты начислялись только на начальную сумму, было бы ${rub(start + (start * r * years) / 100)} — «сложные проценты» дают больше.`,
      key: `compound:${start}:${r}:${years}`,
    }
  }
  if (t === 1) {
    const mass = rng.pick([200, 300, 400, 500])
    const c = rng.pick([10, 15, 20, 25, 30])
    const salt = (mass * c) / 100
    const water = rng.pick([50, 100, 200, 300])
    const res = (salt * 100) / (mass + water)
    if (!Number.isInteger(res)) return null
    return {
      kind: 'number',
      prompt: `В ${mass} г раствора содержится ${c}% соли. В раствор долили ${water} г чистой воды. Сколько процентов соли теперь в растворе?`,
      answer: String(res),
      hint: 'Количество соли не изменилось — изменилась только общая масса.',
      solution: `Соли было ${c}% от ${mass} г = ${salt} г. Теперь масса раствора ${mass} + ${water} = ${mass + water} г. Доля соли: ${salt} : ${mass + water} × 100 = ${res}%.`,
      key: `mix:${mass}:${c}:${water}`,
    }
  }
  const down = rng.pick([20, 50, 60, 75, 80])
  const need = (down * 100) / (100 - down)
  return {
    kind: 'number',
    prompt: `Цену снизили на ${down}%. На сколько процентов теперь нужно её повысить, чтобы вернуть исходную цену?`,
    answer: String(need),
    hint: `Возьмите исходную цену 100. Какой она стала и сколько процентов от новой цены нужно добавить?`,
    solution: `Пусть цена была 100. После снижения — ${100 - down}. Чтобы вернуться к 100, нужно добавить ${down}, а это ${down} : ${100 - down} × 100 = ${need}% от новой цены. Не ${down}% — потому что база стала меньше.`,
    key: `restore:${down}`,
  }
}

function level5(rng: Rng, index: number): Draft | null {
  const t = index % 3
  if (t === 0) {
    const wet = rng.pick([99, 95, 90, 80])
    const dry = rng.pick([98, 90, 80, 75, 60, 50, 20, 10])
    if (dry >= wet) return null
    const mass = rng.pick([10, 20, 40, 50, 100, 200])
    const solid = (mass * (100 - wet)) / 100
    const res = (solid * 100) / (100 - dry)
    if (!Number.isInteger(res) || !Number.isInteger(solid)) return null
    const what = rng.pick(['Свежие грибы', 'Свежие ягоды', 'Свежие яблоки', 'Арбузы'])
    return {
      kind: 'number',
      prompt: `${what} содержат ${wet}% воды, а после сушки — ${dry}% воды. Сколько килограммов сушёного продукта получится из ${mass} кг свежего?`,
      answer: String(res),
      hint: 'При сушке уходит только вода. Посчитайте, сколько «сухого вещества» было и какую долю оно составит после сушки.',
      solution: `Сухого вещества в свежем продукте ${100 - wet}%: ${mass} × ${(100 - wet) / 100} = ${solid} кг. Эта масса не меняется. После сушки она составляет ${100 - dry}% всей массы, значит масса = ${solid} : ${(100 - dry) / 100} = ${res} кг.${wet === 99 ? ' Ответ часто удивляет: вода ушла «всего» на 1 процентный пункт, а масса изменилась в разы.' : ''}`,
      key: `dry:${wet}:${dry}:${mass}`,
    }
  }
  if (t === 1) {
    const n = rng.int(4, 12) * 5
    const p = rng.pick([40, 50, 60, 70, 80])
    const girls = (n * p) / 100
    const k = rng.int(2, 12)
    const q = (girls * 100) / (n + k)
    if (!Number.isInteger(girls) || !Number.isInteger(q)) return null
    return {
      kind: 'number',
      prompt: `В кружке ${p}% участников — девочки. После того как пришли ещё ${k} мальчиков, девочек стало ${q}%. Сколько участников в кружке теперь?`,
      answer: String(n + k),
      hint: 'Число девочек не изменилось. Обозначьте начальное число участников через n и составьте уравнение.',
      solution: `Пусть было n участников, девочек — ${p / 100}n. Потом участников стало n + ${k}, а девочек по-прежнему ${p / 100}n, и это ${q}%: ${p / 100}n = ${q / 100}(n + ${k}). Отсюда n = ${n}, девочек ${girls}. Теперь участников ${n} + ${k} = ${n + k}. Проверка: ${girls} : ${n + k} = ${q}%.`,
      key: `club:${n}:${p}:${k}`,
    }
  }
  const a = rng.pick([10, 20, 25, 50, 60, 100])
  const b = rng.pick([10, 20, 25, 40, 50, 60])
  const k = (100 + a) * (100 - b)
  const change = (k - 10000) / 100
  if (!Number.isInteger(change)) return null
  const answer = change === 0 ? 'Не изменилась' : change > 0 ? `Выросла на ${change}%` : `Снизилась на ${-change}%`
  const naive = a - b
  return {
    kind: 'choice',
    prompt: `Акции компании за первый месяц подорожали на ${a}%, а за второй — подешевели на ${b}%. Как изменилась их цена за два месяца?`,
    ...withOptions(
      answer,
      [
        naive === 0 ? 'Не изменилась' : naive > 0 ? `Выросла на ${naive}%` : `Снизилась на ${-naive}%`,
        'Не изменилась',
        change > 0 ? `Снизилась на ${change}%` : `Выросла на ${Math.abs(change) || 5}%`,
        `Выросла на ${Math.abs(change) + 10}%`,
        `Снизилась на ${Math.abs(change) + 10}%`,
      ],
      rng,
    ),
    hint: 'Возьмите начальную цену 100 и примените изменения по очереди.',
    solution: `Пусть цена была 100. Через месяц: ${100 + a}. Ещё через месяц: ${100 + a} × ${(100 - b) / 100} = ${k / 100}. ${answer}.`,
    key: `stock:${a}:${b}`,
  }
}

const MAKERS = [level1, level2, level3, level4, level5]

/** Десятичные дроби по-русски: 1,05 вместо 1.05. */
const comma = (text: string) => text.replace(/(\d)\.(\d)/g, '$1,$2')

function generate(level: Level, rng: Rng, index: number): Draft | null {
  const d = MAKERS[level - 1](rng, index)
  if (!d) return null
  return { ...d, prompt: comma(d.prompt), solution: comma(d.solution), hint: d.hint && comma(d.hint) }
}

export const percentGenerator: ModuleGenerator = {
  module: 'percent',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function percent(): Task[] {
  return collect(percentGenerator)
}
