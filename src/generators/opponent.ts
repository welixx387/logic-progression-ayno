import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, plural, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/**
 * Ходы наперёд: игра против соперника, который отвечает наилучшим для себя
 * образом. Гарантированный результат (максимин), доминируемые стратегии,
 * устойчивые исходы (равновесие Нэша) и дерево из трёх ходов.
 */

const L = ['А', 'Б', 'В', 'Г']
/** Число с настоящим знаком минуса. */
const fmt = (n: number) => (n < 0 ? `−${-n}` : String(n))
const points = (n: number) => `${n} ${plural(n, 'очко', 'очка', 'очков')}`

/** Ход → ответы соперника; соперник выбирает худший для вас. */
function oneStep(level: Level, rng: Rng, index: number): Draft | null {
  const moves = 3
  const replies = level === 1 ? 2 : 3
  const table = Array.from({ length: moves }, () => Array.from({ length: replies }, () => rng.int(1, 9)))
  const worst = table.map((r) => Math.min(...r))
  const bestWorst = Math.max(...worst)
  if (worst.filter((w) => w === bestWorst).length !== 1) return null
  const best = worst.indexOf(bestWorst)
  // Ловушка: ход с самым большим числом должен быть другим.
  const maxAll = Math.max(...table.flat())
  const greedy = table.findIndex((r) => r.includes(maxAll))
  if (greedy === best || table.flat().filter((x) => x === maxAll).length > 1) return null
  const lines = table.map((r, i) => `Ход ${L[i]} → соперник выбирает: ${r.join(' или ')}`)
  const explain = table.map((r, i) => `• Ход ${L[i]}: худший для вас ответ даёт ${Math.min(...r)}`).join('\n')
  const intro = `Вы делаете ход, затем соперник выбирает один из ответов. Числа — сколько очков вы получите. Соперник умный и всегда выбирает ответ, при котором вы получаете меньше всего.`
  const askValue = level === 2 && index % 2 === 1
  const base = {
    prompt: `${intro}\n\n${askValue ? 'Сколько очков вы можете гарантировать себе при лучшем ходе?' : 'Какой ход лучше всего?'}`,
    display: { type: 'lines' as const, lines },
    hint: 'Для каждого хода найдите, что будет, если соперник ответит самым неприятным для вас образом. Затем выберите лучший из этих худших исходов.',
    solution: `Соперник всегда оставит вам минимум, поэтому смотрим на худший исход каждого хода:\n${explain}\n\nЛучший из худших исходов — ${points(bestWorst)} у хода ${L[best]}. Ход ${L[greedy]} манит числом ${maxAll}, но соперник его просто не допустит.`,
    key: `one:${table.map((r) => r.join(',')).join('|')}:${askValue}`,
  }
  if (askValue) return { kind: 'number', answer: String(bestWorst), ...base }
  return { kind: 'choice', ...withOptions(`Ход ${L[best]}`, [0, 1, 2].filter((i) => i !== best).map((i) => `Ход ${L[i]}`), rng, 3), ...base }
}

/** Платёжная таблица: строки — ваши стратегии, столбцы — ответы соперника. */
function matrix(level: Level, rng: Rng, index: number): Draft | null {
  const rows = 3
  const cols = level >= 5 ? 4 : 3
  const m = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rng.int(-4, 9)))
  const head = ['', ...Array.from({ length: cols }, (_, j) => `Ответ ${j + 1}`)]
  const display = { type: 'table' as const, head, rows: m.map((r, i) => [`Стратегия ${L[i]}`, ...r.map(fmt)]) }
  const intro = 'Вы выбираете стратегию, соперник — ответ, не зная вашего выбора. В таблице — ваш выигрыш (отрицательное число — проигрыш). Соперник хочет, чтобы вы получили как можно меньше.'

  if (index % 2 === 1) {
    // Доминируемая стратегия: есть другая, которая не хуже при любом ответе и лучше хотя бы при одном.
    const dominates = (a: number, b: number) => m[a].every((x, j) => x >= m[b][j]) && m[a].some((x, j) => x > m[b][j])
    const dominated = [0, 1, 2].filter((b) => [0, 1, 2].some((a) => a !== b && dominates(a, b)))
    if (dominated.length !== 1) return null
    const d = dominated[0]
    const by = [0, 1, 2].find((a) => a !== d && dominates(a, d))!
    return {
      kind: 'choice',
      prompt: `${intro}\n\nКакую стратегию выбирать точно не стоит — что бы ни сделал соперник?`,
      display,
      ...withOptions(`Стратегия ${L[d]}`, [0, 1, 2].filter((i) => i !== d).map((i) => `Стратегия ${L[i]}`).concat(['Такой стратегии нет']), rng),
      hint: 'Сравните строки попарно: есть ли строка, которая при каждом ответе соперника даёт не меньше другой?',
      solution: `Сравним ${L[by]} и ${L[d]} по каждому ответу соперника: ${m[by].map((x, j) => `${fmt(x)} ${x > m[d][j] ? '>' : '='} ${fmt(m[d][j])}`).join(', ')}. Стратегия ${L[by]} никогда не хуже ${L[d]}, а иногда лучше. Значит, ${L[d]} выбирать нет смысла — это доминируемая стратегия. Остальные строки друг друга не доминируют.`,
      key: `dom:${m.map((r) => r.join(',')).join('|')}`,
    }
  }
  const worst = m.map((r) => Math.min(...r))
  const v = Math.max(...worst)
  if (worst.filter((w) => w === v).length !== 1) return null
  const best = worst.indexOf(v)
  const avg = m.map((r) => r.reduce((a, b) => a + b, 0))
  const avgBest = avg.indexOf(Math.max(...avg))
  if (avgBest === best && level >= 4) return null
  return {
    kind: 'choice',
    prompt: `${intro}\n\nКакая стратегия гарантирует вам наибольший выигрыш при любом ответе соперника?`,
    display,
    ...withOptions(`Стратегия ${L[best]}`, [0, 1, 2].filter((i) => i !== best).map((i) => `Стратегия ${L[i]}`), rng, 3),
    hint: 'В каждой строке найдите минимум — столько вы получите при худшем ответе. Выберите строку, где этот минимум самый большой.',
    solution: `Худший исход каждой стратегии (минимум в строке): ${worst.map((w, i) => `${L[i]} — ${fmt(w)}`).join(', ')}. Наибольший из них — ${fmt(v)} у стратегии ${L[best]}: меньше этого вы не получите, что бы ни сделал соперник.${avgBest !== best ? ` Стратегия ${L[avgBest]} в сумме выглядит привлекательнее, но при неудачном ответе даёт всего ${fmt(worst[avgBest])}.` : ''}`,
    key: `maximin:${m.map((r) => r.join(',')).join('|')}`,
  }
}

interface Side {
  /** «кафе «Утро»» */
  full: string
  /** «кафе «Утро»» в дательном падеже: «команде «Север»». */
  dat: string
  /** «Утро» */
  short: string
}
const side = (kind: [string, string], name: string): Side => ({ full: `${kind[0]} «${name}»`, dat: `${kind[1]} «${name}»`, short: `«${name}»` })

const DUELS: { a: Side; b: Side; s: [string, string]; unit: string }[] = [
  { a: side(['кафе', 'кафе'], 'Утро'), b: side(['кафе', 'кафе'], 'Вечер'), s: ['высокие цены', 'низкие цены'], unit: 'прибыль в тыс. ₽' },
  { a: side(['компания', 'компании'], 'Альфа'), b: side(['компания', 'компании'], 'Бета'), s: ['запустить рекламу', 'не запускать рекламу'], unit: 'прибыль в млн ₽' },
  { a: side(['команда', 'команде'], 'Север'), b: side(['команда', 'команде'], 'Юг'), s: ['атаковать', 'защищаться'], unit: 'в очках' },
  { a: side(['магазин', 'магазину'], 'Колос'), b: side(['магазин', 'магазину'], 'Ромашка'), s: ['работать круглосуточно', 'работать только днём'], unit: 'прибыль в тыс. ₽' },
]

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Устойчивый исход 2×2: никому не выгодно менять решение в одиночку. */
function nash(rng: Rng): Draft | null {
  const d = rng.pick(DUELS)
  // p[i][j] = [выигрыш первого, выигрыш второго]
  const p = [0, 1].map(() => [0, 1].map(() => [rng.int(0, 9), rng.int(0, 9)]))
  const isNash = (i: number, j: number) => p[i][j][0] >= p[1 - i][j][0] && p[i][j][1] >= p[i][1 - j][1]
  const strict = (i: number, j: number) => p[i][j][0] > p[1 - i][j][0] && p[i][j][1] > p[i][1 - j][1]
  const cells = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ]
  const eq = cells.filter(([i, j]) => isNash(i, j))
  if (eq.length !== 1 || !strict(eq[0][0], eq[0][1])) return null
  const [ei, ej] = eq[0]
  const outcome = (i: number, j: number) => `${d.a.short}: ${d.s[i]}, ${d.b.short}: ${d.s[j]}`
  // Интереснее, когда устойчивый исход хуже для обоих, чем какой-то другой («дилемма заключённого»).
  const better = cells.find(([i, j]) => p[i][j][0] > p[ei][ej][0] && p[i][j][1] > p[ei][ej][1])
  const why = cells
    .filter(([i, j]) => !(i === ei && j === ej))
    .map(([i, j]) => {
      if (p[1 - i][j][0] > p[i][j][0]) return `• ${outcome(i, j)} — неустойчиво: ${d.a.dat} выгоднее перейти на «${d.s[1 - i]}» (${p[1 - i][j][0]} > ${p[i][j][0]}).`
      return `• ${outcome(i, j)} — неустойчиво: ${d.b.dat} выгоднее перейти на «${d.s[1 - j]}» (${p[i][1 - j][1]} > ${p[i][j][1]}).`
    })
  return {
    kind: 'choice',
    prompt: `${cap(d.a.full)} и ${d.b.full} одновременно и независимо выбирают стратегию. В таблице — результат каждого (${d.unit}): первое число — для ${d.a.short}, второе — для ${d.b.short}.\n\nКакой исход устойчив — такой, что ни одному из них невыгодно менять своё решение в одиночку?`,
    display: {
      type: 'table',
      head: ['', ...d.s.map((s) => `${d.b.short}: ${s}`)],
      rows: [0, 1].map((i) => [`${d.a.short}: ${d.s[i]}`, ...[0, 1].map((j) => `${p[i][j][0]} / ${p[i][j][1]}`)]),
    },
    ...withOptions(
      outcome(ei, ej),
      cells.filter(([i, j]) => !(i === ei && j === ej)).map(([i, j]) => outcome(i, j)),
      rng,
    ),
    hint: 'Проверьте каждую клетку: выгодно ли кому-то одному поменять решение, если другой останется при своём?',
    solution: `Проверим каждый исход:\n${why.join('\n')}\n• ${outcome(ei, ej)} — устойчиво: ни одному нет смысла менять решение в одиночку.${
      better ? `\n\nОбратите внимание: исход «${outcome(better[0], better[1])}» лучше для обоих, но он неустойчив — каждый соблазняется перейти на другую стратегию. Это и есть «дилемма заключённого».` : ''
    }`,
    key: `nash:${d.a.short}:${p.flat().flat().join(',')}`,
  }
}

/** Три хода: вы → соперник → вы. Решаем с конца. */
function tree(rng: Rng, index: number): Draft | null {
  const first = 3
  const leaves = Array.from({ length: first }, () => [0, 1].map(() => [rng.int(1, 9), rng.int(1, 9)]))
  if (leaves.flat().some(([x, y]) => x === y)) return null
  const afterReply = leaves.map((r) => r.map((pair) => Math.max(...pair)))
  const value = afterReply.map((r) => Math.min(...r))
  const v = Math.max(...value)
  if (value.filter((x) => x === v).length !== 1) return null
  const best = value.indexOf(v)
  const maxLeaf = Math.max(...leaves.flat(2))
  const greedy = leaves.findIndex((r) => r.flat().includes(maxLeaf))
  if (greedy === best || leaves.flat(2).filter((x) => x === maxLeaf).length > 1) return null
  const lines = leaves.flatMap((r, i) => r.map((pair, j) => `${L[i]}, затем соперник ${j + 1} → вы выбираете: ${pair[0]} или ${pair[1]}`))
  const explain = leaves
    .map((r, i) => `• ${L[i]}: после ответа 1 вы возьмёте ${afterReply[i][0]}, после ответа 2 — ${afterReply[i][1]}; соперник оставит вам ${value[i]}`)
    .join('\n')
  const askValue = index % 2 === 1
  const base = {
    prompt: `Игра в три хода: вы выбираете А, Б или В, затем соперник отвечает 1 или 2, затем снова выбираете вы. Числа — ваши очки. Соперник старается, чтобы вы получили как можно меньше.\n\n${askValue ? 'Сколько очков вы можете гарантировать себе при правильной игре?' : 'С какого хода нужно начать?'}`,
    display: { type: 'lines' as const, lines },
    hint: 'Решайте с конца: сначала поймите, что вы выберете на последнем ходу, затем — что ответит соперник, и только потом — какой первый ход лучше.',
    solution: `Идём с конца. На последнем ходу вы берёте большее число, а соперник перед этим выбирает ответ, после которого вам достанется меньше:\n${explain}\n\nЛучший первый ход — ${L[best]}: он гарантирует ${points(v)}.${greedy !== best ? ` Самое большое число (${maxLeaf}) стоит в ветке ${L[greedy]}, но соперник туда не пустит.` : ''}`,
    key: `tree:${leaves.flat(2).join(',')}:${askValue}`,
  }
  if (askValue) return { kind: 'number', answer: String(v), ...base }
  return { kind: 'choice', ...withOptions(L[best], L.slice(0, first).filter((_, i) => i !== best), rng, 3), ...base }
}

function generate(level: Level, rng: Rng, index: number): Draft | null {
  switch (level) {
    case 1:
      return oneStep(1, rng, index)
    case 2:
      return oneStep(2, rng, index)
    case 3:
      return matrix(3, rng, index)
    case 4:
      return index % 3 === 2 ? matrix(4, rng, index) : nash(rng)
    case 5:
      return index % 3 === 0 ? matrix(5, rng, 0) : tree(rng, index)
  }
}

export const opponentGenerator: ModuleGenerator = {
  module: 'opponent',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function opponent(): Task[] {
  return collect(opponentGenerator)
}
