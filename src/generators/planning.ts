import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, joinAnd, plural, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/**
 * Планирование: дела с длительностями и зависимостями. Людей достаточно,
 * чтобы независимые дела шли одновременно. Ответы считаются по «критическому
 * пути» — самой длинной цепочке зависимых дел.
 */

interface Job {
  name: string
  /** Диапазон длительности. */
  dur: [number, number]
  /** Номера дел, которые должны закончиться раньше. */
  after: number[]
}

interface Scenario {
  title: string
  unit: 'min' | 'hour' | 'day'
  jobs: Job[]
}

const unitWord = (n: number, unit: Scenario['unit']) =>
  `${n} ${unit === 'min' ? 'мин' : unit === 'hour' ? plural(n, 'час', 'часа', 'часов') : plural(n, 'день', 'дня', 'дней')}`
/** «в минутах», «в часах», «в днях». */
const unitIn = (unit: Scenario['unit']) => (unit === 'min' ? 'минутах' : unit === 'hour' ? 'часах' : 'днях')

const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К']

/** Небольшие жизненные сценарии — для первых уровней. */
const SMALL: Scenario[] = [
  {
    title: 'Завтрак',
    unit: 'min',
    jobs: [
      { name: 'Вскипятить чайник', dur: [3, 6], after: [] },
      { name: 'Заварить чай', dur: [3, 5], after: [0] },
      { name: 'Сделать бутерброды', dur: [5, 10], after: [] },
      { name: 'Накрыть на стол', dur: [2, 5], after: [2] },
    ],
  },
  {
    title: 'Стирка и уборка',
    unit: 'min',
    jobs: [
      { name: 'Постирать бельё в машине', dur: [40, 70], after: [] },
      { name: 'Развесить бельё', dur: [10, 15], after: [0] },
      { name: 'Пропылесосить', dur: [20, 35], after: [] },
      { name: 'Помыть пол', dur: [15, 25], after: [2] },
    ],
  },
  {
    title: 'Сборы в поход',
    unit: 'min',
    jobs: [
      { name: 'Составить список вещей', dur: [10, 15], after: [] },
      { name: 'Собрать рюкзак', dur: [20, 40], after: [0] },
      { name: 'Приготовить бутерброды в дорогу', dur: [10, 20], after: [] },
      { name: 'Зарядить телефон', dur: [60, 90], after: [] },
    ],
  },
  {
    title: 'Пицца дома',
    unit: 'min',
    jobs: [
      { name: 'Замесить тесто', dur: [10, 15], after: [] },
      { name: 'Дать тесту подойти', dur: [30, 60], after: [0] },
      { name: 'Нарезать начинку', dur: [10, 20], after: [] },
      { name: 'Собрать пиццу', dur: [5, 10], after: [1, 2] },
      { name: 'Испечь', dur: [15, 25], after: [3] },
    ],
  },
  {
    title: 'Подготовка доклада',
    unit: 'hour',
    jobs: [
      { name: 'Найти источники', dur: [2, 4], after: [] },
      { name: 'Написать текст', dur: [3, 6], after: [0] },
      { name: 'Нарисовать схемы', dur: [2, 5], after: [0] },
      { name: 'Сделать слайды', dur: [2, 4], after: [1, 2] },
    ],
  },
]

/** Сценарии побольше — для средних уровней. */
const MEDIUM: Scenario[] = [
  {
    title: 'Праздничный ужин',
    unit: 'min',
    jobs: [
      { name: 'Помыть овощи', dur: [5, 10], after: [] },
      { name: 'Сварить суп', dur: [25, 45], after: [0] },
      { name: 'Нарезать салат', dur: [10, 20], after: [0] },
      { name: 'Заправить салат', dur: [2, 5], after: [2] },
      { name: 'Испечь пирог', dur: [35, 60], after: [] },
      { name: 'Накрыть на стол', dur: [5, 15], after: [] },
      { name: 'Подать ужин', dur: [3, 5], after: [1, 3, 4, 5] },
    ],
  },
  {
    title: 'Ремонт комнаты',
    unit: 'day',
    jobs: [
      { name: 'Вынести мебель', dur: [1, 2], after: [] },
      { name: 'Купить материалы', dur: [1, 4], after: [] },
      { name: 'Снять старые обои', dur: [1, 2], after: [0] },
      { name: 'Заменить проводку', dur: [2, 4], after: [2] },
      { name: 'Выровнять стены', dur: [2, 5], after: [1, 2] },
      { name: 'Поклеить обои', dur: [1, 3], after: [3, 4] },
      { name: 'Вернуть мебель', dur: [1, 1], after: [5] },
    ],
  },
  {
    title: 'Запуск сайта',
    unit: 'day',
    jobs: [
      { name: 'Собрать требования', dur: [2, 4], after: [] },
      { name: 'Нарисовать дизайн', dur: [3, 7], after: [0] },
      { name: 'Написать серверную часть', dur: [5, 10], after: [0] },
      { name: 'Сверстать страницы', dur: [3, 6], after: [1] },
      { name: 'Написать тексты', dur: [2, 6], after: [] },
      { name: 'Протестировать', dur: [2, 4], after: [2, 3] },
      { name: 'Запустить сайт', dur: [1, 1], after: [4, 5] },
    ],
  },
  {
    title: 'Школьный концерт',
    unit: 'day',
    jobs: [
      { name: 'Выбрать программу', dur: [1, 3], after: [] },
      { name: 'Разучить номера', dur: [5, 10], after: [0] },
      { name: 'Сшить костюмы', dur: [4, 8], after: [0] },
      { name: 'Напечатать афиши', dur: [1, 2], after: [0] },
      { name: 'Расклеить афиши', dur: [1, 2], after: [3] },
      { name: 'Генеральная репетиция', dur: [1, 1], after: [1, 2] },
      { name: 'Концерт', dur: [1, 1], after: [4, 5] },
    ],
  },
  {
    title: 'Переезд',
    unit: 'day',
    jobs: [
      { name: 'Найти квартиру', dur: [3, 7], after: [] },
      { name: 'Подписать договор', dur: [1, 2], after: [0] },
      { name: 'Собрать вещи в коробки', dur: [2, 4], after: [] },
      { name: 'Заказать грузовик', dur: [1, 3], after: [1] },
      { name: 'Перевезти вещи', dur: [1, 1], after: [2, 3] },
      { name: 'Подключить интернет', dur: [2, 5], after: [1] },
      { name: 'Разобрать коробки', dur: [2, 3], after: [4] },
    ],
  },
]

interface Plan {
  unit: Scenario['unit']
  names: string[]
  dur: number[]
  after: number[][]
}

function fromScenario(sc: Scenario, rng: Rng): Plan {
  return {
    unit: sc.unit,
    names: sc.jobs.map((j) => j.name),
    dur: sc.jobs.map((j) => rng.int(j.dur[0], j.dur[1])),
    after: sc.jobs.map((j) => j.after),
  }
}

/** Случайный проект из этапов: каждый этап зависит от 0–2 более ранних. */
function randomPlan(n: number, rng: Rng, maxDur: number): Plan {
  const after: number[][] = []
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      after.push([])
      continue
    }
    const k = i < 2 ? rng.int(0, 1) : rng.int(1, Math.min(2, i))
    after.push(rng.sample(Array.from({ length: i }, (_, j) => j), k).sort((a, b) => a - b))
  }
  return {
    unit: 'day',
    names: Array.from({ length: n }, (_, i) => `Этап ${LETTERS[i]}`),
    dur: Array.from({ length: n }, () => rng.int(1, maxDur)),
    after,
  }
}

interface Schedule {
  start: number[]
  finish: number[]
  total: number
  /** Запас: насколько можно задержать дело, не сдвигая общий срок. */
  slack: number[]
}

function schedule(p: Plan): Schedule {
  const n = p.dur.length
  const start: number[] = []
  const finish: number[] = []
  for (let i = 0; i < n; i++) {
    start.push(Math.max(0, ...p.after[i].map((j) => finish[j])))
    finish.push(start[i] + p.dur[i])
  }
  const total = Math.max(...finish)
  // Самый поздний допустимый финиш — идём от конца.
  const late = Array(n).fill(total)
  for (let i = n - 1; i >= 0; i--) {
    for (let k = i + 1; k < n; k++) if (p.after[k].includes(i)) late[i] = Math.min(late[i], late[k] - p.dur[k])
  }
  return { start, finish, total, slack: late.map((l, i) => l - finish[i]) }
}

const label = (p: Plan, i: number) => (p.names[i].startsWith('Этап') ? p.names[i] : `${LETTERS[i]}. ${p.names[i]}`)
const isStage = (p: Plan) => p.names[0].startsWith('Этап')
/** «Дело «Написать тексты»» или «Этап Б» — для начала фразы. */
const subject = (p: Plan, i: number) => (isStage(p) ? p.names[i] : `Дело «${p.names[i]}»`)
/** «у дела «…»» / «у этапа Б». */
const atJob = (p: Plan, i: number) => (isStage(p) ? `у этапа ${p.names[i].slice(5)}` : `у дела «${p.names[i]}»`)
const short = (p: Plan, i: number) => (p.names[i].startsWith('Этап') ? p.names[i].slice(5) : LETTERS[i])

function lines(p: Plan): string[] {
  return p.names.map((_, i) => {
    const deps = p.after[i].map((j) => short(p, j))
    return `${label(p, i)} — ${unitWord(p.dur[i], p.unit)}${deps.length ? ` (после ${joinAnd(deps)})` : ' (можно начать сразу)'}`
  })
}

/** Самая длинная цепочка, которая заканчивается делом i. */
function chainTo(p: Plan, s: Schedule, i: number): number[] {
  const prev = p.after[i].find((j) => s.finish[j] === s.start[i])
  return prev === undefined ? [i] : [...chainTo(p, s, prev), i]
}

function explain(p: Plan, s: Schedule): string {
  const rows = p.names.map((_, i) => {
    const deps = p.after[i]
    const from = deps.length ? `начало ${s.start[i]} (когда ${deps.length > 1 ? 'закончатся' : 'закончится'} ${deps.map((j) => `${short(p, j)} — ${s.finish[j]}`).join(', ')})` : 'начало 0'
    return `• ${short(p, i)}: ${from}, конец ${s.start[i]} + ${p.dur[i]} = ${s.finish[i]}`
  })
  const last = s.finish.indexOf(s.total)
  const chain = chainTo(p, s, last).map((i) => short(p, i))
  return `Посчитаем, когда каждое дело может закончиться как можно раньше (в ${unitIn(p.unit)} от начала):\n${rows.join('\n')}\n\nВсё будет готово через ${unitWord(s.total, p.unit)}. Самая длинная цепочка (критический путь): ${chain.join(' → ')}.`
}

const intro = (title: string) =>
  `${title}. Людей хватает, поэтому дела, которые не зависят друг от друга, можно делать одновременно. Дело можно начать только после того, как закончены все дела, указанные в скобках.`

function totalTask(title: string, p: Plan, key: string): Draft {
  const s = schedule(p)
  return {
    kind: 'number',
    prompt: `${intro(title)}\n\nЗа какое наименьшее время (в ${unitIn(p.unit)}) можно сделать всё?`,
    display: { type: 'lines', lines: lines(p) },
    answer: String(s.total),
    hint: 'Сложить все длительности — неверно: часть дел идёт одновременно. Найдите самую длинную цепочку дел, которые должны идти одно за другим.',
    solution: explain(p, s),
    key: `${key}:total:${p.dur.join(',')}`,
  }
}

function slackTask(title: string, p: Plan, rng: Rng, key: string): Draft | null {
  const s = schedule(p)
  const loose = p.names.map((_, i) => i).filter((i) => s.slack[i] >= 2)
  if (!loose.length) return null
  const i = rng.pick(loose)
  const delayBy = rng.int(1, s.slack[i])
  const tight = p.names.map((_, j) => j).filter((j) => s.slack[j] < delayBy)
  if (tight.length < 3) return null
  const opts = tight.map((j) => label(p, j))
  return {
    kind: 'choice',
    prompt: `${intro(title)}\n\nКакое дело можно задержать на ${unitWord(delayBy, p.unit)}, и всё равно закончить всё в самый ранний срок?`,
    display: { type: 'lines', lines: lines(p) },
    ...withOptions(label(p, i), rng.shuffle(opts), rng),
    hint: 'Сначала найдите самый ранний срок и критический путь. Дела на критическом пути задерживать нельзя совсем.',
    solution: `${explain(p, s)}\n\nЗапас времени — насколько дело можно сдвинуть, не срывая общий срок. ${atJob(p, i).charAt(0).toUpperCase() + atJob(p, i).slice(1)} запас ${unitWord(s.slack[i], p.unit)}, а у остальных вариантов запас меньше — задержка на ${unitWord(delayBy, p.unit)} сдвинула бы общий срок. Ответ: ${label(p, i)}.`,
    key: `${key}:slack:${p.dur.join(',')}:${i}:${delayBy}`,
  }
}

/** Какое дело имеет смысл ускорить: только то, что стоит на всех критических путях. */
function speedTask(title: string, p: Plan, rng: Rng, key: string): Draft | null {
  const s = schedule(p)
  const helps = (i: number) => p.dur[i] > 1 && schedule({ ...p, dur: p.dur.map((d, j) => (j === i ? d - 1 : d)) }).total < s.total
  const good = p.names.map((_, i) => i).filter(helps)
  const useless = p.names.map((_, i) => i).filter((i) => !helps(i) && s.slack[i] > 0)
  if (!good.length || useless.length < 3) return null
  const i = rng.pick(good)
  return {
    kind: 'choice',
    prompt: `${intro(title)}\n\nСрок нужно сократить. Ускорение какого дела на ${unitWord(1, p.unit)} действительно приблизит окончание всей работы?`,
    display: { type: 'lines', lines: lines(p) },
    ...withOptions(label(p, i), rng.shuffle(useless.map((j) => label(p, j))), rng),
    hint: 'Ускорять имеет смысл только дела на критическом пути — у них нет запаса времени.',
    solution: `${explain(p, s)}\n\n${subject(p, i)} лежит на критическом пути: если сделать его на ${unitWord(1, p.unit)} быстрее, всё закончится через ${unitWord(s.total - 1, p.unit)}. У остальных вариантов есть запас времени — их ускорение ничего не даст, срок определит критический путь.`,
    key: `${key}:speed:${p.dur.join(',')}:${i}`,
  }
}

function generate(level: Level, rng: Rng, index: number): Draft | null {
  switch (level) {
    case 1: {
      const sc = rng.pick(SMALL.slice(0, 3))
      return totalTask(sc.title, fromScenario(sc, rng), sc.title)
    }
    case 2: {
      const sc = rng.pick(SMALL)
      return totalTask(sc.title, fromScenario(sc, rng), sc.title)
    }
    case 3: {
      const sc = rng.pick(MEDIUM)
      const p = fromScenario(sc, rng)
      return index % 3 === 2 ? slackTask(sc.title, p, rng, sc.title) : totalTask(sc.title, p, sc.title)
    }
    case 4: {
      const t = index % 3
      if (t === 0) {
        const p = randomPlan(rng.int(6, 7), rng, 9)
        return totalTask('Проект состоит из этапов, длительность указана в днях', p, `rand:${p.after.map((a) => a.join('+')).join('|')}`)
      }
      const sc = rng.pick(MEDIUM)
      const p = fromScenario(sc, rng)
      return t === 1 ? slackTask(sc.title, p, rng, sc.title) : speedTask(sc.title, p, rng, sc.title)
    }
    case 5: {
      const p = randomPlan(rng.int(7, 9), rng, 12)
      const title = 'Проект состоит из этапов, длительность указана в днях'
      const key = `rand:${p.after.map((a) => a.join('+')).join('|')}`
      const t = index % 3
      return t === 0 ? totalTask(title, p, key) : t === 1 ? slackTask(title, p, rng, key) : speedTask(title, p, rng, key)
    }
  }
}

export const planningGenerator: ModuleGenerator = {
  module: 'planning',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function planning(): Task[] {
  return collect(planningGenerator)
}
