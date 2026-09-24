import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { capitalize, collect, joinAnd, permutations, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/**
 * Логические таблицы («задачи Эйнштейна»). Подсказки добавляются, пока
 * решение не станет единственным, затем лишние подсказки убираются.
 */

interface Value {
  v: string
  /** Подлежащее: «хозяин кошки», «Аня». */
  subj: string
  gen: string
  ins: string
  /** Сказуемое: «держит кошку». */
  pred: string
}

interface Category {
  id: string
  label: string
  values: Value[]
  /** Вопрос о значении этой категории у человека. */
  ask: (person: Value) => string
}

const NAMES: Category = {
  id: 'name',
  label: 'Имена',
  values: [
    ['Аня', 'Ани', 'Аней'],
    ['Борис', 'Бориса', 'Борисом'],
    ['Вика', 'Вики', 'Викой'],
    ['Гриша', 'Гриши', 'Гришей'],
    ['Даша', 'Даши', 'Дашей'],
  ].map(([v, gen, ins]) => ({ v, subj: v, gen, ins, pred: `— это ${v}` })),
  ask: () => '',
}

const ATTRS: Category[] = [
  {
    id: 'pet',
    label: 'Питомцы',
    values: [
      ['кошка', 'кошку', 'кошки'],
      ['собака', 'собаку', 'собаки'],
      ['попугай', 'попугая', 'попугая'],
      ['рыбки', 'рыбок', 'рыбок'],
      ['хомяк', 'хомяка', 'хомяка'],
    ].map(([v, acc, gen]) => ({ v, subj: `хозяин ${gen}`, gen: `хозяина ${gen}`, ins: `хозяином ${gen}`, pred: `держит ${acc}` })),
    ask: (p) => `Какой питомец у ${p.gen}?`,
  },
  {
    id: 'drink',
    label: 'Напитки',
    values: [
      ['чай', 'чая'],
      ['кофе', 'кофе'],
      ['сок', 'сока'],
      ['молоко', 'молока'],
      ['какао', 'какао'],
    ].map(([v, gen]) => ({ v, subj: `любитель ${gen}`, gen: `любителя ${gen}`, ins: `любителем ${gen}`, pred: `пьёт ${v}` })),
    ask: (p) => `Что пьёт ${p.subj}?`,
  },
  {
    id: 'color',
    label: 'Цвет дома',
    values: [
      ['красный', 'красном', 'красного'],
      ['синий', 'синем', 'синего'],
      ['зелёный', 'зелёном', 'зелёного'],
      ['жёлтый', 'жёлтом', 'жёлтого'],
      ['белый', 'белом', 'белого'],
    ].map(([v, prep, gen]) => ({ v, subj: `житель ${gen} дома`, gen: `жителя ${gen} дома`, ins: `жителем ${gen} дома`, pred: `живёт в ${prep} доме` })),
    ask: (p) => `Какого цвета дом, в котором живёт ${p.subj}?`,
  },
  {
    id: 'hobby',
    label: 'Увлечения',
    values: [
      ['шахматы', 'шахматист', 'шахматиста', 'шахматистом', 'играет в шахматы'],
      ['футбол', 'футболист', 'футболиста', 'футболистом', 'играет в футбол'],
      ['плавание', 'пловец', 'пловца', 'пловцом', 'занимается плаванием'],
      ['теннис', 'теннисист', 'теннисиста', 'теннисистом', 'играет в теннис'],
      ['рисование', 'художник', 'художника', 'художником', 'рисует'],
    ].map(([v, subj, gen, ins, pred]) => ({ v, subj, gen, ins, pred })),
    ask: (p) => `Чем увлекается ${p.subj}?`,
  },
]

const OWN: Record<string, string> = { pet: 'свой питомец', drink: 'свой любимый напиток', color: 'дом своего цвета', hobby: 'своё увлечение' }
const HOUSES: Record<number, string> = { 3: 'трёх', 4: 'четырёх', 5: 'пяти' }

const ORD_PREP = ['в первом', 'во втором', 'в третьем', 'в четвёртом', 'в пятом']
const ORD_NOM = ['первый', 'второй', 'третий', 'четвёртый', 'пятый']

/** Кандидат: для каждой категории — какое значение в каком слоте (доме или у человека). */
type Cand = number[][]

interface Entity {
  cat: number
  val: number
}

interface Clue {
  text: string
  test: (c: Cand) => boolean
  /** Прямо связывает эти две сущности (для выбора вопроса). */
  links?: [Entity, Entity]
  /** Прямо называет дом этой сущности. */
  fixes?: Entity
}

interface Puzzle {
  cats: Category[]
  n: number
  positional: boolean
}

const slot = (c: Cand, e: Entity) => c[e.cat].indexOf(e.val)

function enumerate(p: Puzzle): Cand[] {
  const perms = permutations(Array.from({ length: p.n }, (_, i) => i))
  const identity = perms[0]
  let out: Cand[] = [[]]
  p.cats.forEach((_, ci) => {
    const choices = !p.positional && ci === 0 ? [identity] : perms
    const next: Cand[] = []
    for (const partial of out) for (const perm of choices) next.push([...partial, perm])
    out = next
  })
  return out
}

function valueOf(p: Puzzle, e: Entity) {
  return p.cats[e.cat].values[e.val]
}

function makeClue(p: Puzzle, kind: string, truth: Cand, rng: Rng): Clue | null {
  const e1: Entity = { cat: rng.int(0, p.cats.length - 1), val: rng.int(0, p.n - 1) }
  let e2: Entity = { cat: rng.int(0, p.cats.length - 1), val: rng.int(0, p.n - 1) }
  const v1 = valueOf(p, e1)
  const S1 = capitalize(v1.subj)
  const isColor = (e: Entity) => p.cats[e.cat].id === 'color'
  const s1 = slot(truth, e1)
  switch (kind) {
    case 'same':
    case 'notSame': {
      if (e1.cat === e2.cat) return null
      if (kind === 'same') e2 = { cat: e2.cat, val: truth[e2.cat][s1] }
      else if (truth[e2.cat][s1] === e2.val) return null
      const want = kind === 'same'
      // Имя — лучшее подлежащее: «Аня держит кошку».
      const [a, b] = e2.cat === 0 ? [e2, e1] : [e1, e2]
      const va = valueOf(p, a)
      const vb = valueOf(p, b)
      const text = `${capitalize(va.subj)} ${want ? '' : 'не '}${vb.pred}.`
      return {
        text,
        test: (c) => (slot(c, e1) === slot(c, e2)) === want,
        links: want ? [e1, e2] : undefined,
      }
    }
    case 'pos':
    case 'notPos': {
      if (!p.positional) return null
      const want = kind === 'pos'
      const at = want ? s1 : rng.pick(Array.from({ length: p.n }, (_, i) => i).filter((i) => i !== s1))
      const text = isColor(e1)
        ? `${capitalize(v1.v)} дом — ${want ? '' : 'не '}${ORD_NOM[at]} слева.`
        : `${S1} живёт ${want ? '' : 'не '}${ORD_PREP[at]} доме.`
      return { text, test: (c) => (slot(c, e1) === at) === want, fixes: want ? e1 : undefined }
    }
    case 'ends': {
      if (!p.positional || (s1 !== 0 && s1 !== p.n - 1)) return null
      const text = isColor(e1) ? `${capitalize(v1.v)} дом — крайний.` : `${S1} живёт в одном из крайних домов.`
      return { text, test: (c) => slot(c, e1) === 0 || slot(c, e1) === p.n - 1 }
    }
    case 'left':
    case 'leftAny':
    case 'next':
    case 'notNext': {
      if (!p.positional) return null
      if (kind === 'left') {
        if (s1 === p.n - 1) return null
        e2 = { cat: e2.cat, val: truth[e2.cat][s1 + 1] }
      }
      const s2 = slot(truth, e2)
      if (e1.cat === e2.cat && e1.val === e2.val) return null
      if (s1 === s2) return null
      const v2 = valueOf(p, e2)
      if (kind === 'left') return { text: `${S1} живёт сразу слева от ${v2.gen}.`, test: (c) => slot(c, e1) + 1 === slot(c, e2) }
      if (kind === 'leftAny') {
        const [l, r] = s1 < s2 ? [e1, e2] : [e2, e1]
        return {
          text: `${capitalize(valueOf(p, l).subj)} живёт левее ${valueOf(p, r).gen}.`,
          test: (c) => slot(c, l) < slot(c, r),
        }
      }
      const adj = Math.abs(s1 - s2) === 1
      if ((kind === 'next') !== adj) return null
      return {
        text: `${S1} ${kind === 'next' ? '' : 'не '}живёт по соседству с ${v2.ins}.`,
        test: (c) => (Math.abs(slot(c, e1) - slot(c, e2)) === 1) === adj,
      }
    }
  }
  return null
}

interface Config {
  n: number
  attrs: number
  positional: boolean
  kinds: string[]
  prune: boolean
}

function config(level: Level, index: number): Config {
  switch (level) {
    case 1:
      return { n: 3, attrs: 1, positional: false, kinds: ['same', 'notSame', 'notSame'], prune: true }
    case 2:
      return { n: 3, attrs: 2, positional: false, kinds: ['same', 'notSame', 'notSame'], prune: true }
    case 3:
      return { n: 3, attrs: 2, positional: true, kinds: ['same', 'notSame', 'pos', 'left', 'next', 'leftAny'], prune: true }
    case 4:
      return { n: 4, attrs: 2, positional: true, kinds: ['same', 'same', 'notSame', 'pos', 'notPos', 'left', 'next', 'leftAny', 'ends'], prune: true }
    case 5:
      return index % 2 === 0
        ? { n: 4, attrs: 2, positional: true, kinds: ['same', 'notSame', 'notPos', 'left', 'next', 'notNext', 'leftAny', 'ends'], prune: true }
        : { n: 5, attrs: 2, positional: false, kinds: ['same', 'notSame', 'notSame', 'notSame'], prune: true }
  }
}

function generate(level: Level, rng: Rng, index: number): Draft | null {
  const cfg = config(level, index)
  const attrs = rng.sample(ATTRS, cfg.attrs)
  const cats: Category[] = [NAMES, ...attrs].map((c) => ({ ...c, values: c.id === 'name' ? rng.sample(c.values, cfg.n) : c.values.slice(0, cfg.n) }))
  const p: Puzzle = { cats, n: cfg.n, positional: cfg.positional }
  const all = enumerate(p)
  const truth = rng.pick(all)

  const clues: Clue[] = []
  let cands = all
  let guard = 0
  while (cands.length > 1 && guard++ < 600) {
    const clue = makeClue(p, rng.pick(cfg.kinds), truth, rng)
    if (!clue) continue
    const next = cands.filter(clue.test)
    if (next.length === cands.length) continue
    clues.push(clue)
    cands = next
  }
  if (cands.length !== 1) return null
  if (cfg.prune) {
    for (const c of rng.shuffle(clues.slice())) {
      const rest = clues.filter((x) => x !== c)
      if (all.filter((cand) => rest.every((x) => x.test(cand))).length === 1) clues.splice(clues.indexOf(c), 1)
    }
  }
  if (level <= 2 && clues.length > 6) return null

  // Вопрос о факте, который не записан ни в одной подсказке напрямую.
  const linked = (a: Entity, b: Entity) =>
    clues.some((c) => c.links && c.links.some((x) => x.cat === a.cat && x.val === a.val) && c.links.some((x) => x.cat === b.cat && x.val === b.val))
  const person = (s: number): Entity => ({ cat: 0, val: truth[0][s] })
  let question: { text: string; answer: string; options: string[] } | null = null
  for (let attempt = 0; attempt < 30 && !question; attempt++) {
    const s = rng.int(0, cfg.n - 1)
    const ac = rng.int(1, cats.length - 1)
    const attr: Entity = { cat: ac, val: truth[ac][s] }
    if (linked(person(s), attr)) continue
    const mode = cfg.positional && rng.chance(0.3) ? 'where' : rng.chance(0.5) ? 'who' : 'what'
    if (mode === 'who') {
      question = { text: `Кто ${valueOf(p, attr).pred}?`, answer: cats[0].values[truth[0][s]].v, options: cats[0].values.map((v) => v.v) }
    } else if (mode === 'what') {
      const cat = cats[ac]
      question = { text: cat.ask(cats[0].values[truth[0][s]]), answer: valueOf(p, attr).v, options: cat.values.map((v) => v.v) }
    } else {
      if (clues.some((c) => c.fixes && c.fixes.cat === attr.cat && c.fixes.val === attr.val)) continue
      question = {
        text: `В каком по счёту доме (слева) живёт ${valueOf(p, attr).subj}?`,
        answer: `${ORD_PREP[s]}`,
        options: ORD_PREP.slice(0, cfg.n),
      }
    }
  }
  if (!question) return null

  const names = cats[0].values.map((v) => v.v)
  const lists = attrs.map((a, i) => `${a.label}: ${cats[i + 1].values.map((v) => v.v).join(', ')}.`).join('\n')
  const own = joinAnd(attrs.map((a) => OWN[a.id]))
  const intro = cfg.positional
    ? `${joinAnd(names)} живут в ${HOUSES[cfg.n]} домах, стоящих в ряд (дома считаются слева направо). У каждого ${own}, и ни один вариант не повторяется.\n${lists}`
    : `${joinAnd(names)} — друзья. У каждого ${own}, и ни один вариант не повторяется.\n${lists}`

  const table = Array.from({ length: cfg.n }, (_, s) => {
    const who = cats[0].values[truth[0][s]].v
    const rest = attrs.map((_, i) => cats[i + 1].values[truth[i + 1][s]].v).join(', ')
    return cfg.positional ? `• Дом ${s + 1}: ${who} — ${rest}` : `• ${who}: ${rest}`
  }).join('\n')

  return {
    kind: 'choice',
    prompt: `${intro}\n\nИзвестно:\n${clues.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}\n\n${question.text}`,
    ...withOptions(question.answer, rng.shuffle(question.options), rng, Math.min(4, question.options.length)),
    hint: cfg.positional
      ? 'Нарисуйте дома в ряд и начните с подсказок о конкретном доме или о соседях.'
      : 'Нарисуйте таблицу: строки — имена, столбцы — варианты. Ставьте «+» и «−» по каждой подсказке.',
    solution: `Если последовательно применить все подсказки, остаётся единственный вариант:\n${table}\n\nОтвет: ${question.answer}.`,
    key: `${level}:${clues.map((c) => c.text).join('|')}`,
  }
}

export const zebraGenerator: ModuleGenerator = {
  module: 'zebra',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function zebra(): Task[] {
  return collect(zebraGenerator)
}
