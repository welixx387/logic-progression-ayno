import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/**
 * Анализ таблиц и диаграмм: найти нужное значение, посчитать итог, сравнить
 * рост в штуках и в процентах, проверить утверждения о данных.
 */

interface Context {
  /** Подпись над таблицей. */
  title: string
  rowHead: string
  rows: string[]
  cols: string[]
  range: [number, number]
  /** Во что измеряется: «шт.», «чел.». */
  unit: string
  /** «продаж», «посетителей» — для вопросов. */
  what: string
  /** «продали», «пришло» — глагол для утверждений. */
  verb: string
  /** Кратность значений (чтобы числа выглядели естественно). */
  step: number
  /** «напитка», «кружка» — чей это ряд, в родительном падеже. */
  of: string
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь']
const MONTHS_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне']

const CONTEXTS: Context[] = [
  {
    title: 'Продажи кафе по месяцам, штук',
    rowHead: 'Напиток',
    rows: ['Чай', 'Кофе', 'Какао', 'Лимонад', 'Морс'],
    cols: MONTHS,
    range: [20, 95],
    unit: 'шт.',
    what: 'продаж',
    verb: 'продали',
    step: 1,
    of: 'напитка',
  },
  {
    title: 'Число участников кружков по месяцам',
    rowHead: 'Кружок',
    rows: ['Шахматы', 'Робототехника', 'Рисование', 'Танцы', 'Театр'],
    cols: MONTHS,
    range: [8, 40],
    unit: 'чел.',
    what: 'участников',
    verb: 'занималось',
    step: 1,
    of: 'кружка',
  },
  {
    title: 'Выручка магазинов по месяцам, тыс. ₽',
    rowHead: 'Магазин',
    rows: ['Центр', 'Север', 'Юг', 'Запад', 'Восток'],
    cols: MONTHS,
    range: [12, 60],
    unit: 'тыс. ₽',
    what: 'выручки',
    verb: 'заработал',
    step: 10,
    of: 'магазина',
  },
]

const monthIn = (c: Context, j: number) => (c.cols === MONTHS ? `в ${MONTHS_IN[j]}` : `в столбце «${c.cols[j]}»`)
/** «у кружка «Шахматы»» */
const at = (c: Context, name: string) => `у ${c.of} «${name}»`
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

function makeTable(c: Context, rng: Rng, rows: number, cols: number) {
  const names = rng.sample(c.rows, rows)
  const start = rng.int(0, c.cols.length - cols)
  const colNames = c.cols.slice(start, start + cols)
  const values = names.map(() => colNames.map(() => rng.int(c.range[0], c.range[1]) * c.step))
  return { names, colNames, colIndex: colNames.map((_, j) => start + j), values }
}

type Table = ReturnType<typeof makeTable>

const display = (c: Context, t: Table) => ({
  type: 'table' as const,
  head: [c.rowHead, ...t.colNames],
  rows: t.names.map((n, i) => [n, ...t.values[i].map((v) => v.toLocaleString('ru-RU'))]),
})

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)

// ——— Уровень 1: диаграмма ———

const BAR_SETS = [
  { title: 'Посетители музея по дням недели', labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], range: [40, 160], unit: 'чел.', what: 'посетителей' },
  { title: 'Прочитано страниц за день', labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], range: [5, 60], unit: 'стр.', what: 'страниц' },
  { title: 'Осадки по месяцам, мм', labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'], range: [15, 90], unit: 'мм', what: 'осадков' },
  { title: 'Шаги за день, тыс.', labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], range: [3, 15], unit: 'тыс.', what: 'шагов' },
]

function bars(rng: Rng, index: number): Draft | null {
  const b = rng.pick(BAR_SETS)
  const items = b.labels.map((label) => ({ label, value: rng.int(b.range[0], b.range[1]) }))
  const vals = items.map((i) => i.value)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  if (vals.filter((v) => v === max).length > 1 || vals.filter((v) => v === min).length > 1) return null
  const d = { type: 'bars' as const, unit: b.unit, items }
  const key = `bars:${b.title}:${vals.join(',')}`
  const t = index % 3
  if (t === 0) {
    return {
      kind: 'number',
      prompt: `${b.title}. На сколько самое большое значение больше самого маленького?`,
      display: d,
      answer: String(max - min),
      hint: 'Найдите самый длинный и самый короткий столбик и вычтите одно из другого.',
      solution: `Больше всего — ${max} (${items[vals.indexOf(max)].label}), меньше всего — ${min} (${items[vals.indexOf(min)].label}). Разница: ${max} − ${min} = ${max - min}.`,
      key: `${key}:range`,
    }
  }
  if (t === 1) {
    const total = sum(vals)
    return {
      kind: 'number',
      prompt: `${b.title}. Сколько всего ${b.what} за весь период?`,
      display: d,
      answer: String(total),
      hint: 'Сложите все значения. Удобно складывать парами.',
      solution: `${vals.join(' + ')} = ${total}.`,
      key: `${key}:total`,
    }
  }
  const threshold = Math.round((min + max) / 2 / 5) * 5
  const above = items.filter((i) => i.value > threshold)
  if (vals.includes(threshold)) return null
  return {
    kind: 'number',
    prompt: `${b.title}. Сколько раз значение было больше ${threshold}?`,
    display: d,
    answer: String(above.length),
    hint: `Проведите мысленно линию на уровне ${threshold} и посчитайте столбики выше неё.`,
    solution: `Больше ${threshold}: ${above.map((i) => `${i.label} (${i.value})`).join(', ')} — всего ${above.length}.`,
    key: `${key}:above:${threshold}`,
  }
}

// ——— Уровни 2–3: итоги, изменения, средние ———

function totals(rng: Rng, index: number, level: Level): Draft | null {
  const c = rng.pick(CONTEXTS)
  const t = makeTable(c, rng, level === 2 ? 3 : 4, level === 2 ? 3 : 4)
  const d = display(c, t)
  const key = `tot:${c.title}:${t.names.join(',')}:${t.colNames[0]}:${t.values.flat().join(',')}`
  const kind = index % 3
  if (level === 2 && kind === 0) {
    const i = rng.int(0, t.names.length - 1)
    const total = sum(t.values[i])
    return {
      kind: 'number',
      prompt: `${c.title}. Сколько всего ${c.what} ${at(c, t.names[i])} за все месяцы в таблице?`,
      display: d,
      answer: String(total),
      hint: 'Сложите все числа в строке.',
      solution: `${t.values[i].join(' + ')} = ${total} ${c.unit}`,
      key: `${key}:row:${i}`,
    }
  }
  if (level === 2 && kind === 1) {
    const colSums = t.colNames.map((_, j) => sum(t.values.map((r) => r[j])))
    const max = Math.max(...colSums)
    if (colSums.filter((x) => x === max).length > 1) return null
    const j = colSums.indexOf(max)
    return {
      kind: 'choice',
      prompt: `${c.title}. В каком месяце общий результат (сумма по всем строкам) был самым большим?`,
      display: d,
      ...withOptions(t.colNames[j], t.colNames.filter((_, k) => k !== j), rng, t.colNames.length),
      hint: 'Сложите числа в каждом столбце и сравните суммы.',
      solution: `Суммы по столбцам: ${t.colNames.map((n, k) => `${n} — ${colSums[k]}`).join(', ')}. Больше всего — ${t.colNames[j]}.`,
      key: `${key}:col`,
    }
  }
  if (level === 2) {
    const [a, b] = rng.sample([...t.names.keys()], 2)
    const j = rng.int(0, t.colNames.length - 1)
    const diff = t.values[a][j] - t.values[b][j]
    if (diff === 0) return null
    const [hi, lo] = diff > 0 ? [a, b] : [b, a]
    return {
      kind: 'number',
      prompt: `${c.title}. На сколько ${monthIn(c, t.colIndex[j])} значение ${at(c, t.names[hi])} больше, чем ${at(c, t.names[lo])}?`,
      display: d,
      answer: String(Math.abs(diff)),
      hint: 'Найдите нужный столбец и две строки, затем вычтите.',
      solution: `${monthIn(c, t.colIndex[j]).replace(/^в/, 'В')}: «${t.names[hi]}» — ${t.values[hi][j]}, «${t.names[lo]}» — ${t.values[lo][j]}. Разница: ${Math.abs(diff)} ${c.unit}`,
      key: `${key}:diff:${a}:${b}:${j}`,
    }
  }
  // Уровень 3
  if (kind === 2) {
    // Среднее по строке — подбираем строку так, чтобы среднее было целым.
    const i = t.values.findIndex((r) => sum(r) % r.length === 0)
    if (i < 0) return null
    const avg = sum(t.values[i]) / t.colNames.length
    return {
      kind: 'number',
      prompt: `${c.title}. Каково среднее значение ${at(c, t.names[i])} за месяцы в таблице?`,
      display: d,
      answer: String(avg),
      hint: 'Среднее = сумма значений : их количество.',
      solution: `(${t.values[i].join(' + ')}) : ${t.colNames.length} = ${sum(t.values[i])} : ${t.colNames.length} = ${avg}.`,
      key: `${key}:avg:${i}`,
    }
  }
  const [j1, j2] = [0, t.colNames.length - 1]
  const growth = t.values.map((r) => r[j2] - r[j1])
  const best = Math.max(...growth)
  if (best <= 0 || growth.filter((g) => g === best).length > 1) return null
  const i = growth.indexOf(best)
  return {
    kind: 'choice',
    prompt: `${c.title}. У какого ${c.of} значение выросло сильнее всего (в единицах, не в процентах) с месяца «${t.colNames[j1]}» по месяц «${t.colNames[j2]}»?`,
    display: d,
    ...withOptions(t.names[i], t.names.filter((_, k) => k !== i), rng, t.names.length),
    hint: 'Для каждой строки вычтите первое значение из последнего.',
    solution: `Изменения: ${t.names.map((n, k) => `${n}: ${t.values[k][j2]} − ${t.values[k][j1]} = ${signed(growth[k])}`).join('; ')}. Самый большой прирост — у «${t.names[i]}» (+${best}).`,
    key: `${key}:growth`,
  }
}

// ——— Уровень 4: проценты против штук, доли ———

function relative(rng: Rng, index: number): Draft | null {
  const c = rng.pick(CONTEXTS)
  const t = makeTable(c, rng, 4, 3)
  const d = display(c, t)
  const key = `rel:${c.title}:${t.names.join(',')}:${t.colNames[0]}:${t.values.flat().join(',')}`
  if (index % 2 === 0) {
    const j1 = 0
    const j2 = t.colNames.length - 1
    const abs = t.values.map((r) => r[j2] - r[j1])
    const rel = t.values.map((r) => (r[j2] - r[j1]) / r[j1])
    const bestRel = Math.max(...rel)
    const bestAbs = Math.max(...abs)
    const i = rel.indexOf(bestRel)
    if (rel.filter((x) => Math.abs(x - bestRel) < 1e-9).length > 1 || abs.indexOf(bestAbs) === i || bestRel <= 0) return null
    const pct = (x: number) => `${Math.round(x * 100)}%`.replace('-', '−')
    return {
      kind: 'choice',
      prompt: `${c.title}. У какого ${c.of} значение выросло сильнее всего в процентах с месяца «${t.colNames[j1]}» по месяц «${t.colNames[j2]}»?`,
      display: d,
      ...withOptions(t.names[i], [t.names[abs.indexOf(bestAbs)], ...t.names.filter((_, k) => k !== i)], rng, 4),
      hint: 'Рост в процентах — это прирост, делённый на начальное значение. Большой прирост от большой базы может оказаться маленьким в процентах.',
      solution: `Рост в процентах = (конец − начало) : начало:\n${t.names.map((n, k) => `• ${n}: (${t.values[k][j2]} − ${t.values[k][j1]}) : ${t.values[k][j1]} ≈ ${pct(rel[k])}`).join('\n')}\n\nБольше всего в процентах — «${t.names[i]}». Обратите внимание: в единицах самый большой прирост ${at(c, t.names[abs.indexOf(bestAbs)])} (+${bestAbs}), но там и начальное значение больше — поэтому в процентах рост скромнее.`,
      key: `${key}:rel`,
    }
  }
  // Доля одной строки в столбце — подгоняем последнюю строку, чтобы сумма была круглой.
  const j = rng.int(0, t.colNames.length - 1)
  const target = rng.pick([100, 150, 200, 250, 300]) * c.step
  const partial = sum(t.values.slice(0, -1).map((r) => r[j]))
  const last = target - partial
  if (last < c.range[0] * c.step || last > c.range[1] * c.step * 1.5) return null
  t.values[t.values.length - 1][j] = last
  const i = rng.int(0, t.names.length - 1)
  const share = (t.values[i][j] * 100) / target
  if (!Number.isInteger(share)) return null
  return {
    kind: 'number',
    prompt: `${c.title}. Какую долю (в процентах) от суммы столбца «${t.colNames[j]}» составляет значение ${at(c, t.names[i])}?`,
    display: display(c, t),
    answer: String(share),
    hint: 'Сначала найдите сумму столбца, затем разделите нужное значение на эту сумму и умножьте на 100.',
    solution: `Сумма столбца «${t.colNames[j]}»: ${t.values.map((r) => r[j]).join(' + ')} = ${target}. Доля: ${t.values[i][j]} : ${target} × 100 = ${share}%.`,
    key: `${key}:share:${i}:${j}`,
  }
}

// ——— Уровень 5: какое утверждение верно ———

interface Claim {
  text: string
  truth: boolean
}

function claims(c: Context, t: Table, rng: Rng): Claim[] {
  const out: Claim[] = []
  const n = t.names.length
  const m = t.colNames.length
  const rowSum = t.values.map(sum)
  for (let tries = 0; tries < 40; tries++) {
    const kind = rng.int(0, 4)
    const [a, b] = rng.sample([...Array(n).keys()], 2)
    const j = rng.int(0, m - 1)
    const k = rng.int(0, m - 1)
    switch (kind) {
      case 0: {
        if (j === k || t.values[a][j] === t.values[a][k]) break
        const [early, late] = j < k ? [j, k] : [k, j]
        out.push({ text: `${at(c, t.names[a]).replace(/^у/, 'У')} ${monthIn(c, t.colIndex[late])} значение больше, чем ${monthIn(c, t.colIndex[early])}.`, truth: t.values[a][late] > t.values[a][early] })
        break
      }
      case 1: {
        const max = Math.max(...rowSum)
        if (rowSum.filter((x) => x === max).length > 1) break
        out.push({ text: `За весь период больше всего ${c.what} ${at(c, t.names[a])}.`, truth: rowSum[a] === max })
        break
      }
      case 2: {
        if (rowSum[a] === rowSum[b]) break
        out.push({ text: `В среднем за месяц ${at(c, t.names[a])} больше, чем ${at(c, t.names[b])}.`, truth: rowSum[a] > rowSum[b] })
        break
      }
      case 3: {
        const r = t.values[a]
        out.push({ text: `${at(c, t.names[a]).replace(/^у/, 'У')} значение росло каждый месяц.`, truth: r.every((v, x) => x === 0 || v > r[x - 1]) })
        break
      }
      case 4: {
        const col = sum(t.values.map((r) => r[j]))
        if (t.values[a][j] * 3 === col) break
        out.push({ text: `${monthIn(c, t.colIndex[j]).replace(/^в/, 'В')} на долю ${c.of} «${t.names[a]}» пришлось больше трети от суммы столбца.`, truth: t.values[a][j] * 3 > col })
        break
      }
    }
  }
  const seen = new Set<string>()
  return out.filter((x) => !seen.has(x.text) && seen.add(x.text))
}

function statements(rng: Rng): Draft | null {
  const c = rng.pick(CONTEXTS)
  const t = makeTable(c, rng, 4, 4)
  const list = claims(c, t, rng)
  const trueOnes = list.filter((x) => x.truth)
  const falseOnes = list.filter((x) => !x.truth)
  if (!trueOnes.length || falseOnes.length < 3) return null
  const correct = rng.pick(trueOnes)
  const picked = rng.sample(falseOnes, 3)
  const rowSum = t.values.map(sum)
  const check = [correct, ...picked].map((x) => `• ${x.truth ? 'Верно' : 'Неверно'}: ${lower(x.text)}`).join('\n')
  return {
    kind: 'choice',
    prompt: `${c.title}. Какое утверждение верно?`,
    display: display(c, t),
    options: rng.shuffle([correct.text, ...picked.map((x) => x.text)]),
    answer: correct.text,
    hint: 'Проверяйте каждое утверждение по таблице — не полагайтесь на впечатление. Для сравнения «в среднем» достаточно сравнить суммы строк.',
    solution: `Суммы по строкам: ${t.names.map((nm, i) => `${nm} — ${rowSum[i]}`).join(', ')}.\n\n${check}`,
    key: `stm:${c.title}:${t.names.join(',')}:${t.colNames[0]}:${t.values.flat().join(',')}:${correct.text}`,
  }
}

function generate(level: Level, rng: Rng, index: number): Draft | null {
  switch (level) {
    case 1:
      return bars(rng, index)
    case 2:
      return index % 4 === 3 ? bars(rng, index) : totals(rng, index, 2)
    case 3:
      return totals(rng, index, 3)
    case 4:
      return relative(rng, index)
    case 5:
      return index % 3 === 2 ? relative(rng, 0) : statements(rng)
  }
}

export const tablesGenerator: ModuleGenerator = {
  module: 'tables',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function tables(): Task[] {
  return collect(tablesGenerator)
}
