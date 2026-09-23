import type { Level, Task } from '../../src/types.ts'
import type { Rng } from '../lib/rng.ts'
import { collect, permutations, withOptions, type Draft } from '../lib/util.ts'

interface Person {
  nom: string
  gen: string
  ins: string
}

const PEOPLE: Person[] = [
  { nom: 'Аня', gen: 'Ани', ins: 'Аней' },
  { nom: 'Боря', gen: 'Бори', ins: 'Борей' },
  { nom: 'Вера', gen: 'Веры', ins: 'Верой' },
  { nom: 'Гоша', gen: 'Гоши', ins: 'Гошей' },
  { nom: 'Даша', gen: 'Даши', ins: 'Дашей' },
  { nom: 'Егор', gen: 'Егора', ins: 'Егором' },
  { nom: 'Зоя', gen: 'Зои', ins: 'Зоей' },
  { nom: 'Илья', gen: 'Ильи', ins: 'Ильёй' },
  { nom: 'Кира', gen: 'Киры', ins: 'Кирой' },
  { nom: 'Лёва', gen: 'Лёвы', ins: 'Лёвой' },
  { nom: 'Маша', gen: 'Маши', ins: 'Машей' },
  { nom: 'Никита', gen: 'Никиты', ins: 'Никитой' },
  { nom: 'Оля', gen: 'Оли', ins: 'Олей' },
  { nom: 'Петя', gen: 'Пети', ins: 'Петей' },
  { nom: 'Рома', gen: 'Ромы', ins: 'Ромой' },
  { nom: 'Соня', gen: 'Сони', ins: 'Соней' },
  { nom: 'Тимур', gen: 'Тимура', ins: 'Тимуром' },
]

interface Scenario {
  /** «выше», «старше», «быстрее» */
  more: string
  less: string
  /** Глагол перед сравнением: «бегает » или пусто. */
  verb: string
  verbPl: string
  top: string
  bottom: string
  /** «по росту» */
  by: string
  from: string
  sortLabel: string
  sign: string
}

const SCENARIOS: Scenario[] = [
  { more: 'выше', less: 'ниже', verb: '', verbPl: '', top: 'выше всех', bottom: 'ниже всех', by: 'по росту', from: 'считая от самого высокого', sortLabel: 'от самого высокого к самому низкому', sign: 'выше' },
  { more: 'старше', less: 'младше', verb: '', verbPl: '', top: 'старше всех', bottom: 'младше всех', by: 'по возрасту', from: 'считая от самого старшего', sortLabel: 'от самого старшего к самому младшему', sign: 'старше' },
  { more: 'быстрее', less: 'медленнее', verb: 'бегает ', verbPl: 'бегают ', top: 'бегает быстрее всех', bottom: 'бегает медленнее всех', by: 'по скорости бега', from: 'считая от самого быстрого', sortLabel: 'от самого быстрого к самому медленному', sign: 'быстрее' },
]

const ORDINAL = ['первый', 'второй', 'третий', 'четвёртый', 'пятый', 'шестой']
const PLACE = ['первое', 'второе', 'третье', 'четвёртое', 'пятое', 'шестое']
const PLACE_PREP = ['первом', 'втором', 'третьем', 'четвёртом', 'пятом', 'шестом']
const GROUP = ['', 'один человек', 'двое', 'трое', 'четверо', 'пятеро']

/** Порядок — массив индексов людей от «самого-самого» к последнему. */
type Order = number[]

interface Clue {
  text: string
  /** Краткая запись для разбора: «Боря > Аня». */
  note: string
  test: (o: Order) => boolean
}

const at = (o: Order, person: number) => o.indexOf(person)

function makeClue(kind: string, sc: Scenario, ps: Person[], truth: Order, rng: Rng): Clue | null {
  const n = truth.length
  const pick = () => rng.pick(truth)
  switch (kind) {
    case 'gt': {
      const [a, b] = rng.sample(truth, 2).sort((x, y) => at(truth, x) - at(truth, y))
      const text = rng.chance(0.5)
        ? `${ps[a].nom} ${sc.verb}${sc.more} ${ps[b].gen}.`
        : `${ps[b].nom} ${sc.verb}${sc.less} ${ps[a].gen}.`
      return { text, note: `${ps[a].nom} ${sc.sign} ${ps[b].gen}`, test: (o) => at(o, a) < at(o, b) }
    }
    case 'between': {
      const [a, m, c] = rng.sample(truth, 3).sort((x, y) => at(truth, x) - at(truth, y))
      return {
        text: `${ps[m].nom} ${sc.verb}${sc.less} ${ps[a].gen}, но ${sc.more} ${ps[c].gen}.`,
        note: `${ps[a].nom} ${sc.sign} ${ps[m].gen}, ${ps[m].nom} ${sc.sign} ${ps[c].gen}`,
        test: (o) => at(o, a) < at(o, m) && at(o, m) < at(o, c),
      }
    }
    case 'exact': {
      const a = pick()
      const k = at(truth, a)
      const text =
        k === 0
          ? `Никто не ${sc.verb}${sc.more} ${ps[a].gen}.`
          : k === 1
            ? `Ровно один человек ${sc.verb}${sc.more} ${ps[a].gen}.`
            : `Ровно ${GROUP[k]} ${sc.verbPl}${sc.more} ${ps[a].gen}.`
      return { text, note: `у ${ps[a].gen} ${PLACE[k]} место`, test: (o) => at(o, a) === k }
    }
    case 'notTop': {
      const a = pick()
      if (at(truth, a) === 0) return null
      return { text: `Кто-то ${sc.verb}${sc.more} ${ps[a].gen}.`, note: `${ps[a].nom} — не на первом месте`, test: (o) => at(o, a) !== 0 }
    }
    case 'notBottom': {
      const a = pick()
      if (at(truth, a) === n - 1) return null
      return { text: `Кто-то ${sc.verb}${sc.less} ${ps[a].gen}.`, note: `${ps[a].nom} — не на последнем месте`, test: (o) => at(o, a) !== n - 1 }
    }
    case 'gap': {
      const i = rng.int(0, n - 3)
      const [a, b] = rng.shuffle([truth[i], truth[i + 2]])
      return {
        text: `${sc.by.charAt(0).toUpperCase()}${sc.by.slice(1)} между ${ps[a].ins} и ${ps[b].ins} ровно один человек.`,
        note: `между ${ps[a].ins} и ${ps[b].ins} одно место`,
        test: (o) => Math.abs(at(o, a) - at(o, b)) === 2,
      }
    }
  }
  return null
}

interface Config {
  n: number
  kinds: string[]
  questions: ('top' | 'bottom' | 'rank' | 'sort')[]
  prune: boolean
}

const CONFIG: Record<Level, Config> = {
  1: { n: 3, kinds: ['gt'], questions: ['top', 'bottom'], prune: false },
  2: { n: 4, kinds: ['gt'], questions: ['top', 'bottom', 'rank'], prune: false },
  3: { n: 4, kinds: ['gt', 'gt', 'between'], questions: ['rank', 'sort'], prune: true },
  4: { n: 5, kinds: ['gt', 'between', 'exact', 'notTop', 'notBottom'], questions: ['rank', 'sort'], prune: true },
  5: { n: 6, kinds: ['gt', 'between', 'exact', 'notTop', 'notBottom', 'gap'], questions: ['rank', 'sort', 'rank'], prune: true },
}

function generate(level: Level, rng: Rng, index: number): Draft | null {
  const cfg = CONFIG[level]
  const sc = SCENARIOS[index % SCENARIOS.length]
  const ps = rng.sample(PEOPLE, cfg.n)
  const ids = ps.map((_, i) => i)
  const truth = rng.shuffle(ids)
  const all = permutations(ids)
  const qType = cfg.questions[index % cfg.questions.length]
  const rank = qType === 'top' ? 0 : qType === 'bottom' ? cfg.n - 1 : qType === 'rank' ? rng.int(1, cfg.n - 2) : -1

  const determined = (cands: Order[]) =>
    qType === 'sort' ? cands.length === 1 : cands.every((o) => o[rank] === cands[0][rank])

  const clues: Clue[] = []
  let cands = all
  if (level === 1) {
    // Цепочка из двух сравнений.
    const [a, b, c] = truth
    const t1 = rng.chance(0.5) ? `${ps[a].nom} ${sc.verb}${sc.more} ${ps[b].gen}.` : `${ps[b].nom} ${sc.verb}${sc.less} ${ps[a].gen}.`
    const t2 = rng.chance(0.5) ? `${ps[b].nom} ${sc.verb}${sc.more} ${ps[c].gen}.` : `${ps[c].nom} ${sc.verb}${sc.less} ${ps[b].gen}.`
    clues.push(
      { text: t1, note: `${ps[a].nom} ${sc.sign} ${ps[b].gen}`, test: (o) => at(o, a) < at(o, b) },
      { text: t2, note: `${ps[b].nom} ${sc.sign} ${ps[c].gen}`, test: (o) => at(o, b) < at(o, c) },
    )
    if (rng.chance(0.5)) clues.reverse()
    cands = all.filter((o) => clues.every((c) => c.test(o)))
  } else {
    let guard = 0
    while (!determined(cands) && guard++ < 200) {
      const clue = makeClue(rng.pick(cfg.kinds), sc, ps, truth, rng)
      if (!clue) continue
      const next = cands.filter(clue.test)
      if (next.length === cands.length) continue
      clues.push(clue)
      cands = next
    }
    if (!determined(cands)) return null
    if (cfg.prune) {
      for (const c of rng.shuffle(clues.slice())) {
        const rest = clues.filter((x) => x !== c)
        const rc = all.filter((o) => rest.every((x) => x.test(o)))
        if (determined(rc)) {
          clues.splice(clues.indexOf(c), 1)
          cands = rc
        }
      }
    }
  }
  if (clues.length < 2) return null

  const fmtOrder = (o: Order) => o.map((i) => ps[i].nom).join(' → ')
  const sorted = cands.length === 1
  let question: string
  let answer: string
  let options: string[]
  if (qType === 'sort') {
    question = `Расставьте всех ${sc.sortLabel}.`
    answer = fmtOrder(truth)
    const swaps = rng.shuffle(
      Array.from({ length: cfg.n - 1 }, (_, i) => {
        const o = truth.slice()
        ;[o[i], o[i + 1]] = [o[i + 1], o[i]]
        return fmtOrder(o)
      }),
    )
    ;({ options } = withOptions(answer, swaps, rng))
  } else {
    question =
      qType === 'top' ? `Кто ${sc.top}?` : qType === 'bottom' ? `Кто ${sc.bottom}?` : `Кто ${ORDINAL[rank]} ${sc.by} (${sc.from})?`
    answer = ps[truth[rank]].nom
    options = rng.shuffle(ps.map((p) => p.nom))
  }

  const notes = clues.map((c) => `• ${c.note}`).join('\n')
  const conclusion = sorted
    ? `Подходит только один порядок (${sc.sortLabel}): ${fmtOrder(cands[0])}.`
    : cands.length <= 4
      ? `Подходят порядки (${sc.sortLabel}):\n${cands.map((o) => `• ${fmtOrder(o)}`).join('\n')}\nВо всех ${qType === 'top' || qType === 'bottom' ? 'на этом месте' : `на ${PLACE_PREP[rank]} месте`} стоит ${answer}.`
      : `Как бы ни располагались остальные, на нужном месте всегда оказывается ${answer}.`
  return {
    kind: 'choice',
    prompt: `${clues.map((c) => c.text).join('\n')}\n\n${question}`,
    options,
    answer,
    hint: 'Нарисуйте вертикальную линию и расставляйте имена по одному условию за раз.',
    solution: `Запишем условия коротко:\n${notes}\n\n${conclusion}${qType === 'sort' ? '' : `\nОтвет: ${answer}.`}`,
    key: `${level}:${clues.map((c) => c.text).join('|')}:${question}`,
  }
}

export function order(): Task[] {
  return collect('order', { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10 }, generate)
}
