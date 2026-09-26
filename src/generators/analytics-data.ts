import type { Level } from '../types.ts'
import type { Rng } from './rng.ts'
import { big, choice, dec, numeric } from './kit.ts'
import { plural, type Draft, type ModuleGenerator } from './util.ts'

/** Анализ данных: тренды, темп роста, пропорции, круговые диаграммы, сводные таблицы, временные ряды, прикидки. */

const T = { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 } as const

// ——— Тренды ———

const SERIES = [
  ['Число подписчиков канала', 'подписчиков', 'тыс.'],
  ['Продажи велосипедов', 'велосипедов', 'шт.'],
  ['Выручка кафе', 'выручка', 'тыс. ₽'],
  ['Число посетителей музея', 'посетителей', 'тыс.'],
  ['Урожай яблок в саду', 'урожай', 'ц'],
] as const

function trends(level: Level, rng: Rng, index: number): Draft | null {
  const [title, , unit] = rng.pick(SERIES)
  const start = rng.int(10, 60) * (level >= 3 ? 5 : 1)
  const step = rng.int(2, 9) * (level >= 3 ? 5 : 1) * (rng.chance(level >= 4 ? 0.3 : 0) ? -1 : 1)
  const years = Array.from({ length: 4 }, (_, i) => 2020 + i)
  const values = years.map((_, i) => start + step * i)
  if (values.some((v) => v <= 0)) return null
  const display = { type: 'table' as const, head: ['Год', `${title}, ${unit}`], rows: years.map((y, i) => [String(y), String(values[i])]) }
  const t = level === 1 ? 0 : level === 2 ? index % 2 : level === 3 ? 1 + (index % 2) : level === 4 ? 2 + (index % 2) : 3
  const trend = `Каждый год показатель ${step > 0 ? 'растёт' : 'падает'} на ${Math.abs(step)} ${unit}: ${values.join(' → ')}.`
  if (t === 0)
    return numeric(`${title} каждый год меняется на одно и то же число. Каким будет значение в 2024 году, если тенденция сохранится?`, values[3] + step, 'Найдите, на сколько меняется значение за год.', [trend, `2024: ${values[3]} ${step > 0 ? '+' : '−'} ${Math.abs(step)} = ${values[3] + step}.`], `n:${values.join(',')}`, { display, ref: 0 })
  if (t === 1) {
    const y = rng.int(2026, 2030)
    const v = start + step * (y - 2020)
    if (v <= 0) return null
    return numeric(`${title} меняется равномерно. Каким будет значение в ${y} году, если тенденция сохранится?`, v, 'Значение = начальное + шаг × число лет.', [trend, `С 2020 по ${y} прошло ${y - 2020} лет: ${start} ${step > 0 ? '+' : '−'} ${Math.abs(step)} · ${y - 2020} = ${v}.`], `y:${values.join(',')}:${y}`, { display, ref: 0 })
  }
  if (t === 2) {
    if (step <= 0) return null
    const target = values[3] + step * rng.int(2, 6) - rng.int(0, step - 1)
    let y = 2023
    let v = values[3]
    while (v < target) {
      y++
      v += step
    }
    return numeric(`${title} растёт равномерно. В каком году значение впервые достигнет ${target} ${unit}?`, y, 'Посчитайте, сколько шагов нужно до цели, и округлите вверх.', [trend, `Не хватает ${target} − ${values[3]} = ${target - values[3]}. Шагов по ${step}: ${dec((target - values[3]) / step, 2)} → округляем вверх до ${y - 2023}.`, `2023 + ${y - 2023} = ${y}.`], `t:${values.join(',')}:${target}`, { display, ref: 0 })
  }
  // Два равномерных ряда: когда второй догонит первый.
  const a0 = rng.int(60, 150)
  const a1 = rng.int(2, 8)
  const b0 = rng.int(10, a0 - 20)
  const b1 = a1 + rng.int(3, 12)
  const years2 = Math.ceil((a0 - b0) / (b1 - a1))
  if ((a0 - b0) % (b1 - a1) === 0) return null
  const d2 = { type: 'table' as const, head: ['Год', 'Магазин А', 'Магазин Б'], rows: [0, 1, 2].map((i) => [String(2020 + i), String(a0 + a1 * i), String(b0 + b1 * i)]) }
  return numeric('Продажи двух магазинов растут равномерно (в тыс. ₽). В каком году продажи магазина Б впервые превысят продажи магазина А, если тенденции сохранятся?', 2020 + years2, 'Каждый год разница сокращается на разность приростов.', [`А растёт на ${a1} в год, Б — на ${b1}: разница сокращается на ${b1 - a1} в год.`, `В 2020 году разница ${a0 - b0}. Нужно ${a0 - b0} : ${b1 - a1} ≈ ${dec((a0 - b0) / (b1 - a1), 2)} года → через ${years2} ${plural(years2, 'год', 'года', 'лет')}.`, `Ответ: ${2020 + years2}.`], `c:${a0}:${a1}:${b0}:${b1}`, { display: d2, ref: 1 })
}

// ——— Темп роста ———

function growth(level: Level, rng: Rng, index: number): Draft | null {
  const t = level === 1 ? 0 : level === 2 ? index % 2 : level === 3 ? 1 + (index % 2) : level === 4 ? 2 + (index % 2) : 3 + (index % 2)
  if (t === 0) {
    // Цена кратна 20 — тогда при любом проценте из списка новая цена целая.
    const a = rng.int(2, 40) * 20
    const p = rng.pick([10, 20, 25, 50, 5, 15, 30, 40])
    const b = (a * (100 + p)) / 100
    return numeric(`Цена выросла с ${a} до ${b} ₽. На сколько процентов она выросла?`, p, 'Изменение делите на старое значение.', [`Изменение: ${b} − ${a} = ${b - a}.`, `${b - a} : ${a} · 100% = ${p}%.`], `u:${a}:${p}`, { ref: 0 })
  }
  if (t === 1) {
    const a = rng.int(2, 40) * 20
    const p = rng.pick([10, 20, 25, 40, 50, 5, 15, 30])
    const b = (a * (100 - p)) / 100
    return numeric(`Число посетителей сайта упало с ${a} до ${b} в день. На сколько процентов оно уменьшилось?`, p, 'Проценты всегда считают от того, с чем сравнивают — от старого значения.', [`Уменьшение: ${a} − ${b} = ${a - b}.`, `${a - b} : ${a} · 100% = ${p}%.`], `d:${a}:${p}`, { ref: 0 })
  }
  if (t === 2) {
    const p = rng.pick([10, 20, 30, 40, 50])
    const up = rng.chance(0.5)
    const res = up ? ((100 + p) * (100 - p)) / 100 - 100 : ((100 - p) * (100 + p)) / 100 - 100
    return numeric(`Цена сначала ${up ? 'выросла' : 'упала'} на ${p}%, а потом ${up ? 'упала' : 'выросла'} на ${p}%. На сколько процентов итоговая цена меньше начальной?`, -res, 'Второй процент считается уже от новой цены.', [`Пусть цена была 100. После первого изменения: ${up ? 100 + p : 100 - p}.`, `Второе изменение на ${p}% от ${up ? 100 + p : 100 - p}: ${up ? 100 + p : 100 - p} · ${dec((up ? 100 - p : 100 + p) / 100)} = ${100 + res}.`, `Итог: ${100 + res} — на ${-res}% меньше начальной. Проценты не «гасят» друг друга, потому что берутся от разных чисел.`], `m:${p}:${up}`, { ref: 1 })
  }
  if (t === 3) {
    const r1 = rng.int(4, 15)
    const r2 = r1 + rng.pick([1, 2, 3, 4, 5]) * (rng.chance(0.5) ? 1 : -1)
    if (r2 <= 0) return null
    const pp = r2 - r1
    const rel = (pp / r1) * 100
    const askRel = rng.chance(0.5) && Number.isInteger(rel)
    if (askRel)
      return numeric(`Ставка по вкладу изменилась с ${r1}% до ${r2}% годовых. На сколько процентов (не процентных пунктов!) изменилась ставка?`, Math.abs(rel), 'Относительное изменение: разница делится на старую ставку.', [`Разница — ${Math.abs(pp)} процентных ${plural(Math.abs(pp), 'пункт', 'пункта', 'пунктов')}.`, `Относительно старой ставки: ${Math.abs(pp)} : ${r1} · 100% = ${Math.abs(rel)}%.`, 'Процентный пункт — разница двух процентов; процент — доля от исходного значения.'], `r:${r1}:${r2}`, { ref: 2 })
    return numeric(`Доля безработных изменилась с ${r1}% до ${r2}%. На сколько процентных пунктов она изменилась? (Если уменьшилась — введите положительное число.)`, Math.abs(pp), 'Процентные пункты — это просто разность процентов.', [`${r2}% − ${r1}% = ${pp > 0 ? '+' : '−'}${Math.abs(pp)} п. п.`, `Не путайте с процентами: относительно старого значения это ${dec(Math.abs(rel), 1)}%.`], `p:${r1}:${r2}`, { ref: 2 })
  }
  const p = rng.pick([10, 20, 5, 30])
  const n = rng.int(2, 3)
  const factor = (1 + p / 100) ** n
  const res = Math.round((factor - 1) * 1000) / 10
  return numeric(`Население посёлка растёт на ${p}% в год. На сколько процентов оно вырастет за ${n} ${plural(n, 'год', 'года', 'лет')}? Ответ округлите до десятых.`, res, 'Каждый год рост считается от нового, уже увеличенного значения.', [`Каждый год население умножается на ${dec(1 + p / 100)}.`, `За ${n} ${plural(n, 'год', 'года', 'лет')}: ${dec(1 + p / 100)}${n === 2 ? '²' : '³'} = ${dec(factor, 4)}.`, `Рост: ${dec(factor, 4)} − 1 = ${dec(factor - 1, 4)} ≈ ${dec(res, 1)}% — больше, чем ${p} · ${n} = ${p * n}%: проценты «накапливаются».`], `c:${p}:${n}`, { ref: 1 })
}

// ——— Пропорции ———

function proportion(level: Level, rng: Rng, index: number): Draft | null {
  const t = level === 1 ? 0 : level === 2 ? index % 2 : level === 3 ? 1 + (index % 2) : level === 4 ? 2 + (index % 2) : 3
  if (t === 0) {
    const people = rng.pick([2, 3, 4, 5, 6])
    const target = rng.pick([6, 8, 9, 10, 12, 15]).valueOf()
    const flour = rng.int(1, 6) * 50
    if (target === people) return null
    const need = (flour * target) / people
    if (!Number.isInteger(need)) return null
    return numeric(`На ${people} ${plural(people, 'порцию', 'порции', 'порций')} блинов нужно ${flour} г муки. Сколько граммов муки нужно на ${target} ${plural(target, 'порцию', 'порции', 'порций')}?`, need, 'Найдите, сколько муки на одну порцию.', [`На одну порцию: ${flour} : ${people} = ${dec(flour / people)} г.`, `На ${target}: ${dec(flour / people)} · ${target} = ${need} г.`], `r:${people}:${target}:${flour}`, { ref: 0 })
  }
  if (t === 1) {
    const scale = rng.pick([10000, 25000, 50000, 100000, 200000])
    const cm = rng.int(2, 12)
    const km = (cm * scale) / 100000
    return numeric(`Масштаб карты 1 : ${big(scale)}. Расстояние на карте — ${cm} см. Каково расстояние на местности в километрах?`, km, '1 : 100 000 означает: 1 см на карте — 100 000 см = 1 км на местности.', [`1 см на карте = ${big(scale)} см = ${dec(scale / 100000, 2)} км.`, `${cm} см → ${cm} · ${dec(scale / 100000, 2)} = ${dec(km, 2)} км.`], `m:${scale}:${cm}`, { ref: 1 })
  }
  if (t === 2) {
    const w1 = rng.int(2, 6)
    const d1 = rng.int(2, 12)
    const work = w1 * d1
    const w2 = rng.pick([2, 3, 4, 6, 8, 12].filter((x) => x !== w1 && work % x === 0))
    if (!w2) return null
    return numeric(`${w1} ${plural(w1, 'маляр', 'маляра', 'маляров')} красят забор за ${d1} ${plural(d1, 'день', 'дня', 'дней')}. За сколько дней покрасят такой же забор ${w2} ${plural(w2, 'маляр', 'маляра', 'маляров')}, если все работают одинаково?`, work / w2, 'Больше работников — меньше дней: это обратная пропорциональность.', [`Вся работа — ${w1} · ${d1} = ${work} «маляро-дней».`, `${work} : ${w2} = ${work / w2} ${plural(work / w2, 'день', 'дня', 'дней')}.`], `w:${w1}:${d1}:${w2}`, { ref: 2 })
  }
  // Составная пропорция: насосы, часы, объём.
  const p1 = rng.int(2, 5)
  const h1 = rng.int(2, 6)
  const v1 = p1 * h1 * rng.int(2, 5) * 10
  const p2 = rng.int(2, 6)
  const h2 = rng.int(2, 8)
  const v2 = (v1 / (p1 * h1)) * p2 * h2
  return numeric(`${p1} одинаковых ${plural(p1, 'насос', 'насоса', 'насосов')} за ${h1} ч перекачивают ${v1} м³ воды. Сколько кубометров перекачают ${p2} таких ${plural(p2, 'насос', 'насоса', 'насосов')} за ${h2} ч?`, v2, 'Найдите производительность одного насоса за один час.', [`Один насос за час: ${v1} : (${p1} · ${h1}) = ${v1 / (p1 * h1)} м³.`, `${p2} насоса за ${h2} ч: ${v1 / (p1 * h1)} · ${p2} · ${h2} = ${v2} м³.`], `p:${p1}:${h1}:${v1}:${p2}:${h2}`, { ref: 3 })
}

// ——— Круговые диаграммы ———

/** Набор: заголовок, категории, возможные итоги и как назвать итог. */
const PIE_SETS: [string, string[], number[], (n: string) => string, string][] = [
  ['Расходы семьи за месяц', ['Еда', 'Жильё', 'Транспорт', 'Отдых', 'Одежда', 'Прочее'], [40000, 60000, 80000, 100000], (n) => `всего потрачено ${n} ₽`, '₽'],
  ['Любимые фрукты школьников', ['Яблоки', 'Бананы', 'Апельсины', 'Груши', 'Виноград'], [200, 400, 500, 800], (n) => `опрошено ${n} школьников`, 'школьников'],
  ['Как сотрудники добираются до работы', ['Метро', 'Автобус', 'Машина', 'Пешком', 'Велосипед'], [200, 500, 1000, 2000], (n) => `всего ${n} сотрудников`, 'сотрудников'],
  ['Продажи по отделам магазина', ['Одежда', 'Обувь', 'Спорт', 'Игрушки', 'Книги'], [100000, 200000, 500000], (n) => `выручка ${n} ₽`, '₽'],
]

function pie(level: Level, rng: Rng, index: number): Draft | null {
  const [title, labels, totals, totalText, unitWord] = rng.pick(PIE_SETS)
  const k = Math.min(labels.length, level + 2)
  // Доли в процентах, кратные 5, в сумме 100.
  const parts = Array.from({ length: k }, () => 1)
  for (let i = 0; i < 20 - k; i++) parts[rng.int(0, k - 1)]++
  const pct = parts.map((p) => p * 5)
  const names = rng.sample(labels, k)
  const items = names.map((l, i) => ({ label: l, value: pct[i] }))
  const display = { type: 'pie' as const, items, unit: '%' }
  const i = rng.int(0, k - 1)
  const total = rng.pick(totals)
  const t = level === 1 ? 0 : level === 2 ? index % 2 : level === 3 ? index % 3 : 1 + (index % 3)
  if (t === 0) return numeric(`${title}. Какой угол (в градусах) занимает сектор «${names[i]}»?`, pct[i] * 3.6, 'Весь круг — 360°, это 100%. 1% — это 3,6°.', [`${pct[i]}% от 360° = ${pct[i]} · 3,6 = ${dec(pct[i] * 3.6, 1)}°.`], `a:${title}:${pct.join(',')}:${i}`, { display, ref: 0 })
  if (t === 1) return numeric(`${title}: ${totalText(big(total))}. Сколько приходится на «${names[i]}»?`, (total * pct[i]) / 100, 'Найдите нужный процент от целого.', [`${pct[i]}% от ${big(total)} = ${big(total)} · ${pct[i]} : 100 = ${big((total * pct[i]) / 100)}.`], `c:${title}:${pct.join(',')}:${i}:${total}`, { display, ref: 1 })
  if (t === 2) {
    const [a, b] = rng.sample(Array.from({ length: k }, (_, j) => j), 2)
    if (pct[a] === pct[b]) return null
    const diff = Math.abs(pct[a] - pct[b])
    return numeric(`${title}: ${totalText(big(total))}. На сколько «${names[a]}» ${pct[a] > pct[b] ? 'больше' : 'меньше'}, чем «${names[b]}»?`, (total * diff) / 100, 'Сначала найдите разницу в процентах, потом переведите её в количество.', [`Разница долей: ${Math.max(pct[a], pct[b])}% − ${Math.min(pct[a], pct[b])}% = ${diff} п. п.`, `${diff}% от ${big(total)} = ${big((total * diff) / 100)}.`], `d:${title}:${pct.join(',')}:${a}:${b}:${total}`, { display, ref: 1 })
  }
  const known = (total * pct[i]) / 100
  return numeric(`${title}: на сектор «${names[i]}» приходится ${big(known)} ${unitWord}. Сколько всего (100%)?`, total, 'Если X — это p%, то всё — X : p · 100.', [`${big(known)} — это ${pct[i]}%.`, `Всё: ${big(known)} : ${pct[i]} · 100 = ${big(total)}.`], `t:${title}:${pct.join(',')}:${i}:${total}`, { display, ref: 1 })
}

// ——— Сводные таблицы ———

const REGIONS = ['Север', 'Юг', 'Запад', 'Восток', 'Центр']
const MONTHS3 = ['Янв', 'Фев', 'Мар', 'Апр']

function pivot(level: Level, rng: Rng, index: number): Draft | null {
  const r = level <= 2 ? 3 : 4
  const c = level <= 3 ? 3 : 4
  const rows = rng.sample(REGIONS, r)
  const vals = rows.map(() => Array.from({ length: c }, () => rng.int(level <= 2 ? 2 : 10, level <= 2 ? 20 : 90)))
  const rowSum = vals.map((v) => v.reduce((s, x) => s + x, 0))
  const colSum = Array.from({ length: c }, (_, j) => vals.reduce((s, v) => s + v[j], 0))
  const grand = rowSum.reduce((s, x) => s + x, 0)
  const head = ['Регион', ...MONTHS3.slice(0, c), 'Итого']
  const t = level === 1 ? 0 : level === 2 ? index % 2 : level === 3 ? index % 3 : 1 + (index % 3)
  const tableRows = (hide?: [number, number]) => [
    ...rows.map((name, i) => [name, ...vals[i].map((x, j) => (hide && hide[0] === i && hide[1] === j ? '?' : String(x))), String(rowSum[i])]),
    ['Итого', ...colSum.map(String), String(grand)],
  ]
  if (t === 0) {
    const i = rng.int(0, r - 1)
    const rs = tableRows().slice(0, -1).map((row) => row.slice(0, -1))
    return numeric(`Продажи по регионам и месяцам (шт.). Сколько всего продано в регионе «${rows[i]}»?`, rowSum[i], 'Сложите числа в строке.', [`${vals[i].join(' + ')} = ${rowSum[i]}.`], `r:${vals.flat().join(',')}:${i}`, { display: { type: 'table', head: head.slice(0, -1), rows: rs }, ref: 0 })
  }
  if (t === 1) {
    const i = rng.int(0, r - 1)
    const j = rng.int(0, c - 1)
    return numeric(`В сводной таблице продаж (шт.) одно число стёрто. Восстановите его.`, vals[i][j], 'Используйте итог по строке или по столбцу.', [`Итог строки «${rows[i]}» — ${rowSum[i]}. Остальные числа строки: ${vals[i].filter((_, k) => k !== j).join(' + ')} = ${rowSum[i] - vals[i][j]}.`, `Стёртое число: ${rowSum[i]} − ${rowSum[i] - vals[i][j]} = ${vals[i][j]}. Проверка по столбцу даёт то же.`], `h:${vals.flat().join(',')}:${i}:${j}`, { display: { type: 'table', head, rows: tableRows([i, j]) }, ref: 1 })
  }
  if (t === 2) {
    const i = rng.int(0, r - 1)
    const share = (rowSum[i] / grand) * 100
    return numeric(`Какую долю всех продаж (в %) дал регион «${rows[i]}»? Ответ округлите до целых.`, Math.round(share), 'Доля = итог строки : общий итог · 100%.', [`${rowSum[i]} : ${grand} · 100% ≈ ${dec(share, 1)}% ≈ ${Math.round(share)}%.`], `s:${vals.flat().join(',')}:${i}`, { display: { type: 'table', head, rows: tableRows() }, ref: 2 })
  }
  const maxCol = colSum.indexOf(Math.max(...colSum))
  if (colSum.filter((x) => x === colSum[maxCol]).length > 1) return null
  return choice('В каком месяце общие продажи были наибольшими?', MONTHS3[maxCol], MONTHS3.slice(0, c).filter((_, j) => j !== maxCol), rng, 'Смотрите на строку «Итого».', [`Итоги по месяцам: ${MONTHS3.slice(0, c).map((m, j) => `${m} — ${colSum[j]}`).join(', ')}.`, `Наибольший — ${MONTHS3[maxCol]}.`], `m:${vals.flat().join(',')}`, { display: { type: 'table', head, rows: tableRows() }, ref: 0 }, Math.min(4, c))
}

// ——— Временные ряды ———

function timeseries(level: Level, rng: Rng, index: number): Draft | null {
  const n = level <= 2 ? 5 : 6
  const base = rng.int(20, 60)
  const vals = Array.from({ length: n }, (_, i) => base + i * rng.int(0, 4) + rng.int(-6, 6))
  if (vals.some((v) => v <= 0)) return null
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'].slice(0, n)
  const display = { type: 'bars' as const, unit: 'заказов в день', items: months.map((m, i) => ({ label: m, value: vals[i] })) }
  const t = level === 1 ? 0 : level === 2 ? index % 2 : level === 3 ? 1 + (index % 2) : 2 + (index % 2)
  if (t === 0) {
    const ups = vals.slice(1).filter((v, i) => v > vals[i]).length
    return numeric('Сколько раз показатель вырос по сравнению с предыдущим месяцем?', ups, 'Сравните каждый месяц с предыдущим.', [`Изменения: ${vals.slice(1).map((v, i) => `${months[i + 1]}: ${v - vals[i] > 0 ? '+' : v - vals[i] < 0 ? '−' : ''}${Math.abs(v - vals[i])}`).join(', ')}.`, `Рост — ${ups} ${plural(ups, 'раз', 'раза', 'раз')}.`], `u:${vals.join(',')}`, { display, ref: 0 })
  }
  if (t === 1) {
    const avg3 = (vals[n - 1] + vals[n - 2] + vals[n - 3]) / 3
    return numeric('Найдите скользящее среднее за последние три месяца (среднее последних трёх значений). Ответ округлите до десятых.', Math.round(avg3 * 10) / 10, 'Сложите три последних значения и разделите на 3.', [`(${vals[n - 3]} + ${vals[n - 2]} + ${vals[n - 1]}) : 3 = ${dec(avg3, 1)}.`, 'Скользящее среднее сглаживает случайные скачки и показывает общую тенденцию.'], `a:${vals.join(',')}`, { display, ref: 1 })
  }
  if (t === 2) {
    const i = rng.int(1, n - 1)
    const pct = ((vals[i] - vals[i - 1]) / vals[i - 1]) * 100
    return numeric(`На сколько процентов изменился показатель в месяце «${months[i]}» по сравнению с предыдущим? Ответ округлите до целых (если уменьшился — со знаком минус).`, Math.round(pct), 'Изменение делите на значение предыдущего месяца.', [`(${vals[i]} − ${vals[i - 1]}) : ${vals[i - 1]} · 100% ≈ ${dec(pct, 1)}% ≈ ${dec(Math.round(pct), 0)}%.`], `p:${vals.join(',')}:${i}`, { display, ref: 2 })
  }
  // Сезонность: прошлогодний месяц и средний рост.
  const last = rng.int(40, 120)
  const growthPct = rng.pick([5, 10, 15, 20, 25])
  const forecast = Math.round(last * (1 + growthPct / 100))
  return numeric(`Спрос на мороженое сезонный. В июне прошлого года продали ${last} тыс. порций. В этом году продажи в каждом месяце на ${growthPct}% выше, чем в тот же месяц прошлого года. Сколько тысяч порций ожидать в июне (округлите до целых)?`, forecast, 'При сезонности сравнивают с тем же месяцем прошлого года, а не с предыдущим месяцем.', [`${last} · ${dec(1 + growthPct / 100)} ≈ ${forecast}.`, 'Сравнивать июнь с маем было бы ошибкой: летом продажи растут из-за сезона, а не из-за общего тренда.'], `s:${last}:${growthPct}`, { ref: 2 })
}

// ——— Единицы и прикидки ———

const CONVERSIONS: [string, string, number][] = [
  ['км/ч', 'м/с', 1 / 3.6],
  ['м/с', 'км/ч', 3.6],
  ['га', 'м²', 10000],
  ['м³', 'л', 1000],
  ['т', 'кг', 1000],
  ['ч', 'мин', 60],
  ['сут', 'ч', 24],
  ['км²', 'га', 100],
]

/** Задачи в несколько шагов с переводом единиц. */
function multiStep(rng: Rng): Draft {
  const t = rng.int(0, 2)
  if (t === 0) {
    const v = rng.pick([36, 54, 72, 90, 108])
    const sec = rng.int(5, 30)
    return numeric(`Машина едет со скоростью ${v} км/ч. Сколько метров она проедет за ${sec} с?`, (v / 3.6) * sec, 'Переведите скорость в м/с.', [`${v} км/ч = ${v} : 3,6 = ${v / 3.6} м/с.`, `За ${sec} с: ${v / 3.6} · ${sec} = ${(v / 3.6) * sec} м.`], `m0:${v}:${sec}`, { ref: 0 })
  }
  if (t === 1) {
    const vol = rng.pick([1, 2, 3, 5]) * 1000
    const rate = rng.pick([5, 10, 20, 25, 50])
    return numeric(`Бассейн объёмом ${vol / 1000} м³ наполняют из шланга со скоростью ${rate} л/мин. Сколько часов займёт наполнение? Ответ округлите до десятых.`, Math.round((vol / rate / 60) * 10) / 10, '1 м³ = 1000 л, 1 ч = 60 мин.', [`${vol / 1000} м³ = ${vol} л.`, `${vol} : ${rate} = ${vol / rate} мин = ${dec(vol / rate / 60, 2)} ч ≈ ${dec(Math.round((vol / rate / 60) * 10) / 10, 1)} ч.`], `m1:${vol}:${rate}`, { ref: 0 })
  }
  const ha = rng.int(2, 20)
  const per = rng.pick([4, 5, 8, 10])
  return numeric(`Поле площадью ${ha} га засеяли, на каждый квадратный метр ушло ${per} г семян. Сколько килограммов семян понадобилось?`, (ha * 10000 * per) / 1000, '1 га = 10 000 м², 1 кг = 1000 г.', [`${ha} га = ${big(ha * 10000)} м².`, `${big(ha * 10000)} · ${per} г = ${big(ha * 10000 * per)} г = ${big((ha * 10000 * per) / 1000)} кг.`], `m2:${ha}:${per}`, { ref: 0 })
}

function estimates(level: Level, rng: Rng, index: number): Draft | null {
  if (level === 5 || (level === 4 && index % 2 === 0)) return multiStep(rng)
  // Переводы — на первых уровнях, факты о единицах — на третьем, оценки порядка — на четвёртом.
  const t = level <= 2 ? 0 : level === 3 ? 1 : 2
  if (t === 0) {
    const [from, to, k] = rng.pick(CONVERSIONS.slice(0, level <= 1 ? 2 : 8))
    const x = from === 'км/ч' ? rng.pick([18, 36, 54, 72, 90, 108]) : from === 'м/с' ? rng.pick([5, 10, 15, 20, 25, 30]) : rng.int(2, 12)
    const y = Math.round(x * k * 1000) / 1000
    return numeric(`Переведите ${x} ${from} в ${to}.`, y, from === 'км/ч' ? '1 км/ч = 1000 м : 3600 с. Делите на 3,6.' : from === 'м/с' ? 'Умножайте на 3,6.' : 'Вспомните, сколько мелких единиц в одной крупной.', from === 'км/ч' ? [`1 км/ч = 1000 м : 3600 с, то есть делим на 3,6.`, `${x} : 3,6 = ${dec(y, 3)} ${to}.`] : [`1 ${from} = ${big(k)} ${to}.`, `${x} · ${big(k)} = ${big(y)} ${to}.`], `u:${from}:${x}`, { ref: 0 })
  }
  if (t === 1) {
    const facts: [string, number, string][] = [
      ['Сколько секунд в сутках?', 86400, '24 · 60 · 60 = 86 400.'],
      ['Сколько минут в неделе?', 10080, '7 · 24 · 60 = 10 080.'],
      ['Сколько часов в невисокосном году?', 8760, '365 · 24 = 8760.'],
      ['Сколько квадратных метров в квадратном километре?', 1000000, '1000 · 1000 = 1 000 000.'],
      ['Сколько литров в кубе воды со стороной 2 м?', 8000, '2 · 2 · 2 = 8 м³ = 8000 л.'],
      ['Сколько секунд в часе?', 3600, '60 · 60 = 3600.'],
      ['Сколько сантиметров в километре?', 100000, '1000 м · 100 см = 100 000 см.'],
      ['Сколько граммов в центнере?', 100000, '1 ц = 100 кг = 100 000 г.'],
    ]
    const i = rng.int(0, facts.length - 1)
    const [q, a, why] = facts[i]
    return numeric(q, a, 'Переводите по шагам через промежуточные единицы.', [why], `f:${i}`, { ref: 0 })
  }
  // Оценки порядка величины: выбрать правдоподобный ответ.
  const fermi: [string, string, string[], string][] = [
    ['Сколько раз примерно бьётся сердце человека за сутки?', 'около 100 тысяч', ['около тысячи', 'около 10 миллионов', 'около миллиарда'], 'Около 70 ударов в минуту · 60 · 24 ≈ 100 000.'],
    ['Сколько примерно часов человек спит за год?', 'около 3 тысяч', ['около 300', 'около 30 тысяч', 'около 300 тысяч'], '8 ч · 365 ≈ 2900 ≈ 3 тысячи.'],
    ['Сколько примерно шагов нужно, чтобы пройти 1 км?', 'около 1,5 тысячи', ['около 150', 'около 15 тысяч', 'около 150 тысяч'], 'Длина шага около 0,7 м: 1000 : 0,7 ≈ 1400.'],
    ['Сколько примерно литров воды в полной ванне?', 'около 200', ['около 20', 'около 2 тысяч', 'около 20 тысяч'], 'Ванна примерно 1,5 × 0,7 × 0,4 м ≈ 0,4 м³ — это сотни литров; обычно наливают около 150–200 л.'],
    ['Сколько примерно минут длится учебный год (только уроки)?', 'около 50 тысяч', ['около 5 тысяч', 'около 500 тысяч', 'около 5 миллионов'], '≈ 170 учебных дней · 6 уроков · 45 минут ≈ 46 000.'],
    ['Сколько примерно секунд в жизни человека длиной 80 лет?', 'около 2,5 миллиарда', ['около 25 миллионов', 'около 250 миллионов', 'около 25 миллиардов'], '80 · 365 · 86 400 ≈ 2,5 · 10⁹.'],
    ['Сколько примерно книг по 300 страниц можно прочитать за год, читая по 20 страниц в день?', 'около 25', ['около 2', 'около 250', 'около 2500'], '20 · 365 = 7300 страниц : 300 ≈ 24.'],
  ]
  const i = rng.int(0, fermi.length - 1)
  const [q, a, w, why] = fermi[i]
  return choice(q, a, w, rng, 'Разбейте вопрос на простые множители и округляйте смело — важен порядок величины.', ['Такие вопросы называют «задачами Ферми»: точный ответ не нужен, нужен правильный порядок.', why], `e:${i}`, { ref: 1 })
}

const make = (module: ModuleGenerator['module'], fn: (level: Level, rng: Rng, index: number) => Draft | null): ModuleGenerator => ({ module, targets: T, make: fn })

export const ANALYTICS_DATA_GENERATORS: ModuleGenerator[] = [
  make('trends', trends),
  make('growth', growth),
  make('proportion', proportion),
  make('pie', pie),
  make('pivot', pivot),
  make('timeseries', timeseries),
  make('estimates', estimates),
]
