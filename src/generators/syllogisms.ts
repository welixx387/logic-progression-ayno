import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, joinAnd, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/**
 * Логические выводы (силлогизмы). Ответ каждой задачи вычисляется перебором
 * всех «миров» — диаграмм Эйлера–Венна: какие области (сочетания классов)
 * непусты. Все классы считаются непустыми.
 */

type Form = 'A' | 'E' | 'I' | 'O'
interface Stmt {
  form: Form
  x: number
  y: number
}

interface Word {
  sg: string
  pl: string
  ins: string
  insPl: string
}

const STEMS = ['брим', 'зуф', 'крап', 'люф', 'мирс', 'тув', 'феб', 'дрип', 'пел', 'снуф', 'вонт', 'трум', 'ранд', 'флон']
const WORDS: Word[] = STEMS.map((s) => ({ sg: s, pl: `${s}ы`, ins: `${s}ом`, insPl: `${s}ами` }))
const INDIVIDUALS = ['Грип', 'Мокс', 'Тарп', 'Зилк']

const TRUE = 'Верно'
const FALSE = 'Неверно'
const UNKNOWN = 'Недостаточно данных'
const VERDICTS = [TRUE, FALSE, UNKNOWN]

const NEGATE: Record<Form, Form> = { A: 'O', O: 'A', E: 'I', I: 'E' }
const neg = (s: Stmt): Stmt => ({ ...s, form: NEGATE[s.form] })
const same = (a: Stmt, b: Stmt) => a.form === b.form && a.x === b.x && a.y === b.y

const popcount = (m: number) => {
  let c = 0
  while (m) {
    m &= m - 1
    c++
  }
  return c
}

class Universe {
  readonly n: number
  readonly regions: number[]
  constructor(n: number) {
    this.n = n
    this.regions = Array.from({ length: (1 << n) - 1 }, (_, i) => i + 1)
  }
  bit(region: number) {
    return 1 << (region - 1)
  }
  mask(pred: (r: number) => boolean) {
    return this.regions.filter(pred).reduce((m, r) => m | this.bit(r), 0)
  }
  has(r: number, c: number) {
    return ((r >> c) & 1) === 1
  }
  /** Области, которые должны быть пусты (A, E), или одна из которых непуста (I, O). */
  area(s: Stmt) {
    const wantY = s.form === 'E' || s.form === 'I'
    return this.mask((r) => this.has(r, s.x) && this.has(r, s.y) === wantY)
  }
  holds(s: Stmt, m: number) {
    const a = this.area(s)
    return s.form === 'A' || s.form === 'E' ? (m & a) === 0 : (m & a) !== 0
  }
  /** Уже посчитанные наборы миров — перебор дорогой, а посылки повторяются. */
  readonly cache = new Map<string, number[]>()
  /** Все миры, где выполнены посылки; все классы считаются непустыми. */
  models(premises: Stmt[], singleton?: number) {
    const cacheKey = `${premises.map((p) => `${p.form}${p.x}${p.y}`).join(',')}|${singleton ?? ''}`
    const hit = this.cache.get(cacheKey)
    if (hit) return hit
    const out: number[] = []
    const withClass = Array.from({ length: this.n }, (_, c) => this.mask((r) => this.has(r, c)))
    for (let m = 1; m < 1 << this.regions.length; m++) {
      if (withClass.some((w) => (m & w) === 0)) continue
      if (singleton !== undefined && popcount(m & withClass[singleton]) !== 1) continue
      if (premises.every((p) => this.holds(p, m))) out.push(m)
    }
    this.cache.set(cacheKey, out)
    return out
  }
  verdict(s: Stmt, models: number[]) {
    const t = models.filter((m) => this.holds(s, m)).length
    return t === models.length ? TRUE : t === 0 ? FALSE : UNKNOWN
  }
}

// ——— Текст ———

const render = (s: Stmt, w: Word[]) => {
  const x = w[s.x]
  const y = w[s.y]
  switch (s.form) {
    case 'A':
      return `Все ${x.pl} — ${y.pl}`
    case 'E':
      return `Ни один ${x.sg} не является ${y.ins}`
    case 'I':
      return `Некоторые ${x.pl} — ${y.pl}`
    case 'O':
      return `Некоторые ${x.pl} не являются ${y.insPl}`
  }
}
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const q = (s: Stmt, w: Word[]) => `«${render(s, w)}»`

function describeRegion(u: Universe, r: number, w: Word[], skip: number[] = []) {
  const yes: string[] = []
  const no: string[] = []
  for (let c = 0; c < u.n; c++) {
    if (skip.includes(c)) continue
    ;(u.has(r, c) ? yes : no).push(w[c].sg)
  }
  const head = joinAnd(yes)
  if (!no.length) return head
  const tail = `не ${no.join(' и не ')}`
  return head ? `${head}, но ${tail}` : tail
}

function describeWorld(u: Universe, m: number, w: Word[]) {
  const rs = u.regions.filter((r) => m & u.bit(r))
  return rs.map((r) => `• ${describeRegion(u, r, w)}`).join('\n')
}

function inlineWorld(u: Universe, m: number, w: Word[]) {
  const rs = u.regions.filter((r) => m & u.bit(r))
  return rs.map((r) => describeRegion(u, r, w)).join('; ')
}

function minimalModel(u: Universe, premises: Stmt[], extra: Stmt) {
  let best: number | null = null
  for (const m of u.models(premises)) {
    if (!u.holds(extra, m)) continue
    if (best === null || popcount(m) < popcount(best)) best = m
  }
  return best
}

/**
 * Разбор по случаям: каждая область из `regions` запрещена какой-то общей
 * посылкой. Возвращает строки «если он …, это противоречит «…»».
 */
function caseSplit(u: Universe, regions: number[], fixed: number[], premises: Stmt[], w: Word[]): string[] | null {
  const universal = premises.filter((p) => p.form === 'A' || p.form === 'E')
  const free = Array.from({ length: u.n }, (_, c) => c).filter((c) => !fixed.includes(c))
  let left = regions.slice()
  const lines: string[] = []
  while (left.length) {
    let bestP: Stmt | null = null
    let bestCover: number[] = []
    for (const p of universal) {
      const cover = left.filter((r) => u.area(p) & u.bit(r))
      if (cover.length > bestCover.length) {
        bestP = p
        bestCover = cover
      }
    }
    if (!bestP) return null
    // Общие признаки группы — пытаемся описать её коротко.
    const lits = free.filter((c) => bestCover.every((r) => u.has(r, c) === u.has(bestCover[0], c)))
    const cube = regions.filter((r) => lits.every((c) => u.has(r, c) === u.has(bestCover[0], c)))
    const cubeOk = cube.every((r) => u.area(bestP!) & u.bit(r))
    const groups = cubeOk ? [{ rs: cube, lits }] : bestCover.map((r) => ({ rs: [r], lits: free }))
    for (const g of groups) {
      const pos = g.lits.filter((c) => u.has(g.rs[0], c)).map((c) => w[c].sg)
      const negs = g.lits.filter((c) => !u.has(g.rs[0], c)).map((c) => `не ${w[c].sg}`)
      const cond = pos.length && negs.length ? `${pos.join(' и ')}, но ${negs.join(' и ')}` : [...pos, ...negs].join(' и ')
      lines.push(cond ? `если он ${cond} — это противоречит условию ${q(bestP, w)}` : `это противоречит условию ${q(bestP, w)}`)
      left = left.filter((r) => !g.rs.includes(r))
    }
  }
  return lines
}

const bullets = (lines: string[], lead: string, leadOne: string) =>
  lines.length === 1 ? `${leadOne} ${lines[0]}.` : `${lead}:\n${lines.map((l) => `• ${l}`).join(';\n')}.`

/**
 * Прямая цепочка рассуждений про одно существо: из известных фактов
 * («он брим», «он не зуф») по общим посылкам выводим новые, пока не придём к цели.
 */
function chainProof(premises: Stmt[], start: Map<number, boolean>, goal: [number, boolean][], w: Word[]): string[] | null {
  const known = new Map(start)
  const steps: string[] = []
  const done = () => goal.every(([c, v]) => known.get(c) === v)
  let progress = true
  while (!done() && progress) {
    progress = false
    for (const p of premises) {
      const a = w[p.x]
      const b = w[p.y]
      if (p.form === 'A') {
        if (known.get(p.x) === true && !known.has(p.y)) {
          known.set(p.y, true)
          steps.push(`Раз он ${a.sg}, он и ${b.sg}: ${q(p, w)}.`)
          progress = true
        } else if (known.get(p.y) === false && !known.has(p.x)) {
          known.set(p.x, false)
          steps.push(`Раз он не ${b.sg}, он и не ${a.sg}: ${q(p, w)}.`)
          progress = true
        }
      } else if (p.form === 'E') {
        if (known.get(p.x) === true && !known.has(p.y)) {
          known.set(p.y, false)
          steps.push(`Раз он ${a.sg}, он не ${b.sg}: ${q(p, w)}.`)
          progress = true
        } else if (known.get(p.y) === true && !known.has(p.x)) {
          known.set(p.x, false)
          steps.push(`Раз он ${b.sg}, он не ${a.sg}: ${q(p, w)}.`)
          progress = true
        }
      }
      if (done()) break
    }
  }
  return done() ? steps : null
}

/** Объяснение, почему утверждение s верно при любых раскладах. */
function explainNecessary(u: Universe, premises: Stmt[], s: Stmt, w: Word[]): string {
  const x = w[s.x]
  const y = w[s.y]
  if (s.form === 'A' || s.form === 'E') {
    const steps = chainProof(premises, new Map([[s.x, true]]), [[s.y, s.form === 'A']], w)
    if (steps) return `Возьмём любого ${x.sg}а. ${steps.join(' ')}\nЗначит, ${q(s, w)} — верно.`
    const regions = u.regions.filter((r) => u.area(s) & u.bit(r))
    const lines = caseSplit(u, regions, [s.x, s.y], premises, w)
    const start = `Предположим, что какой-то ${x.sg} оказался ${s.form === 'A' ? 'не ' : ''}${y.ins}.`
    if (lines) {
      return `${start} ${bullets(lines, 'Но', 'Но')}\nЗначит, так не бывает: ${q(s, w)} — верно.`
    }
    return `Попробуйте нарисовать круги Эйлера: при любом расположении, допустимом по условиям, ${lower(render(s, w))}.`
  }
  // Существование: ищем посылку, которая гарантирует нужное существо.
  const target = u.area(s)
  const universal = premises.filter((p) => p.form === 'A' || p.form === 'E')
  const blocked = universal.reduce((m, p) => m | u.area(p), 0)
  const guarantees: { area: number; text: string; fixed: number[]; start: [number, boolean][]; who: string }[] = [
    ...premises
      .filter((p) => p.form === 'I' || p.form === 'O')
      .map((p) => ({
        area: u.area(p),
        text: `По условию ${q(p, w)} существует ${w[p.x].sg}, который ${p.form === 'O' ? 'не ' : ''}является ${w[p.y].ins}.`,
        fixed: [p.x, p.y],
        start: [
          [p.x, true],
          [p.y, p.form === 'I'],
        ] as [number, boolean][],
        who: `этот ${w[p.x].sg}`,
      })),
    ...Array.from({ length: u.n }, (_, c) => ({
      area: u.mask((r) => u.has(r, c)),
      text: `${w[c].pl.charAt(0).toUpperCase()}${w[c].pl.slice(1)} существуют — возьмём любого ${w[c].sg}а.`,
      fixed: [c],
      start: [[c, true]] as [number, boolean][],
      who: `этот ${w[c].sg}`,
    })),
  ]
  const goal: [number, boolean][] = [
    [s.x, true],
    [s.y, s.form === 'I'],
  ]
  for (const g of guarantees) {
    const steps = chainProof(premises, new Map(g.start), goal, w)
    if (steps) {
      const subj = g.fixed[0]
      const what = s.form === 'I' ? (subj === s.x ? y.sg : subj === s.y ? x.sg : `и ${x.sg}, и ${y.sg}`) : subj === s.x ? `не ${y.sg}` : `${x.sg}, но не ${y.sg}`
      return `${g.text}${steps.length ? ` ${steps.join(' ')}` : ''}\nЗначит, ${g.who} — ${what}, и ${q(s, w)} — верно.`
    }
  }
  for (const g of guarantees) {
    const allowed = g.area & ~blocked
    if (!allowed || (allowed & ~target) !== 0) continue
    const bad = u.regions.filter((r) => g.area & u.bit(r) && !(target & u.bit(r)))
    const lines = bad.length ? caseSplit(u, bad, g.fixed, premises, w) : []
    if (!lines) continue
    const subj = g.fixed[0]
    const what =
      s.form === 'I'
        ? subj === s.x
          ? y.sg
          : subj === s.y
            ? x.sg
            : `и ${x.sg}, и ${y.sg}`
        : subj === s.x
          ? `не ${y.sg}`
          : `${x.sg}, но не ${y.sg}`
    const middle = lines.length ? ` ${bullets(lines, 'Каким ещё он может быть? Разберём варианты', 'При этом')}` : ''
    return `${g.text}${middle}\nЗначит, ${g.who} — ${what}, и ${q(s, w)} — верно.`
  }
  return `При любом расположении кругов Эйлера, допустимом по условиям, ${lower(render(s, w))}.`
}

function explainVerdict(u: Universe, premises: Stmt[], s: Stmt, w: Word[], verdict: string): string {
  if (verdict === TRUE) return explainNecessary(u, premises, s, w)
  if (verdict === FALSE) {
    const n = neg(s)
    return `Утверждение ${q(s, w)} ложно, потому что обязательно верно противоположное: ${q(n, w)}.\n${explainNecessary(u, premises, n, w)}`
  }
  const yes = minimalModel(u, premises, s)!
  const no = minimalModel(u, premises, neg(s))!
  return `Условия допускают оба варианта.\n\nПусть существуют только такие существа:\n${describeWorld(u, yes, w)}\nВсе условия выполнены, и утверждение верно.\n\nА теперь пусть существуют только такие:\n${describeWorld(u, no, w)}\nУсловия снова выполнены, а утверждение ложно.\n\nЗначит, данных недостаточно.`
}

// ——— Уровень 1: утверждения про одно существо ———

interface L1Case {
  form: 'A' | 'E'
  about: 'inA' | 'notA' | 'inB' | 'notB'
  /** Что точно следует про второй класс: true — входит, false — не входит, null — неизвестно. */
  follows: boolean | null
  why: (g: string, a: Word, b: Word) => string
}

const L1_CASES: L1Case[] = [
  { form: 'A', about: 'inA', follows: true, why: (g, a, b) => `${g} — ${a.sg}, а все ${a.pl} — ${b.pl}. Значит, ${g} — ${b.sg}.` },
  { form: 'A', about: 'notB', follows: false, why: (g, a, b) => `Если бы ${g} был ${a.ins}, он был бы и ${b.ins} — ведь все ${a.pl} — ${b.pl}. Но ${g} не ${b.sg}, значит, он и не ${a.sg}.` },
  { form: 'A', about: 'inB', follows: null, why: (g, a, b) => `Все ${a.pl} — ${b.pl}, но из этого не следует, что все ${b.pl} — ${a.pl}. ${g} — ${b.sg}, но он может быть как ${a.ins}, так и нет.` },
  { form: 'A', about: 'notA', follows: null, why: (g, a, b) => `Про тех, кто не ${a.sg}, условие ничего не говорит. ${g} может оказаться ${b.ins}, а может и нет.` },
  { form: 'E', about: 'inA', follows: false, why: (g, a, b) => `${g} — ${a.sg}, а ни один ${a.sg} не является ${b.ins}. Значит, ${g} — не ${b.sg}.` },
  { form: 'E', about: 'inB', follows: false, why: (g, a, b) => `${g} — ${b.sg}, а ни один ${a.sg} не является ${b.ins}. Значит, ${g} — не ${a.sg}.` },
  { form: 'E', about: 'notA', follows: null, why: (g, a, b) => `${g} — не ${a.sg}. Про таких условие ничего не говорит: он может быть ${b.ins}, а может и не быть.` },
  { form: 'E', about: 'notB', follows: null, why: (g, a, b) => `${g} — не ${b.sg}. Про таких условие ничего не говорит: он может быть ${a.ins}, а может и не быть.` },
]

function levelOne(rng: Rng, index: number): Draft {
  const [ia, ib] = rng.sample(Array.from({ length: WORDS.length }, (_, i) => i), 2)
  const w = [WORDS[ia], WORDS[ib]]
  const g = rng.pick(INDIVIDUALS)
  const c = L1_CASES[index % L1_CASES.length]
  const aboutClass = c.about.endsWith('A') ? 0 : 1
  const other = 1 - aboutClass
  const aboutIn = c.about.startsWith('in')
  const askIn = rng.chance(0.5)
  const fact = (cls: number, isIn: boolean) => (isIn ? `${g} — ${w[cls].sg}` : `${g} не является ${w[cls].ins}`)
  const premise = c.form === 'A' ? `Все ${w[0].pl} — ${w[1].pl}` : `Ни один ${w[0].sg} не является ${w[1].ins}`

  // Проверяем шаблон перебором: класс 2 — само существо.
  const u = new Universe(3)
  const prem: Stmt[] = [
    { form: c.form, x: 0, y: 1 },
    { form: aboutIn ? 'A' : 'E', x: 2, y: aboutClass },
  ]
  const models = u.models(prem, 2)
  const verdict = u.verdict({ form: askIn ? 'A' : 'E', x: 2, y: other }, models)
  const expected = c.follows === null ? UNKNOWN : c.follows === askIn ? TRUE : FALSE
  if (verdict !== expected) throw new Error(`Силлогизмы L1: шаблон ${c.form}/${c.about} дал ${verdict}, ожидалось ${expected}`)

  const claim = fact(other, askIn)
  return {
    kind: 'choice',
    prompt: `Условия:\n• ${premise}.\n• ${fact(aboutClass, aboutIn)}.\n\nВерно ли, что ${claim}?`,
    options: VERDICTS,
    answer: verdict,
    hint: 'Слова выдуманы — рассуждайте только по условиям. Нарисуйте два круга: для «все» один внутри другого, для «ни один» — отдельно.',
    solution: `${c.why(g, w[0], w[1])}\nПоэтому ответ: «${verdict}».`,
    key: `l1:${c.form}:${c.about}:${askIn}:${ia}:${ib}`,
  }
}

// ——— Уровни 2–5 ———

const someNote = (stmts: Stmt[]) =>
  stmts.some((s) => s.form === 'I' || s.form === 'O') ? '\n\n«Некоторые» значит «хотя бы один, а может быть, и все». Каждая названная группа не пуста.' : ''

function pickWords(rng: Rng, n: number) {
  return rng.sample(WORDS, n)
}

function randomStmt(rng: Rng, x: number, y: number, forms: Form[]): Stmt {
  const form = rng.pick(forms)
  return rng.chance(0.5) ? { form, x, y } : { form, x: y, y: x }
}

function allStatements(n: number): Stmt[] {
  const out: Stmt[] = []
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++) if (x !== y) for (const form of ['A', 'E', 'I', 'O'] as Form[]) out.push({ form, x, y })
  return out
}

function verdictTask(rng: Rng, index: number, n: number, premises: Stmt[], targetPairs: [number, number][], level: Level): Draft | null {
  const u = new Universe(n)
  const models = u.models(premises)
  if (!models.length) return null
  const wanted = VERDICTS[index % 3]
  const w = pickWords(rng, n)
  const candidates = rng
    .shuffle(targetPairs.flatMap(([x, y]) => (['A', 'E', 'I', 'O'] as Form[]).map((form) => ({ form, x, y }))))
    .filter((s) => !premises.some((p) => same(p, s)))
  const s = candidates.find((c) => u.verdict(c, models) === wanted)
  if (!s) return null
  return {
    kind: 'choice',
    prompt: `Условия:\n${premises.map((p) => `• ${render(p, w)}.`).join('\n')}\n\nВерно ли, что ${lower(render(s, w))}?${someNote([...premises, s])}`,
    options: VERDICTS,
    answer: wanted,
    hint:
      level <= 2
        ? 'Нарисуйте круги Эйлера для каждого условия и совместите их.'
        : 'Попробуйте придумать пример, где все условия выполнены, а утверждение ложно. Если не выходит — оно верно.',
    solution: explainVerdict(u, premises, s, w, wanted),
    key: `v:${n}:${premises.map((p) => `${p.form}${p.x}${p.y}`).join('')}:${s.form}${s.x}${s.y}:${w.map((x) => x.sg).join('')}`,
  }
}

function choiceTask(rng: Rng, n: number, premises: Stmt[], mode: 'follows' | 'false'): Draft | null {
  const u = new Universe(n)
  const models = u.models(premises)
  if (!models.length) return null
  const w = pickWords(rng, n)
  const all = allStatements(n).filter((s) => !premises.some((p) => same(p, s)))
  const want = mode === 'follows' ? TRUE : FALSE
  // «Тривиальные» выводы следуют из одной посылки — их не берём ни в ответы, ни в ловушки.
  const single = premises.map((p) => u.models([p]))
  const trivial = (s: Stmt) => single.some((m) => u.verdict(s, m) === want)
  const good = rng.shuffle(all.filter((s) => u.verdict(s, models) === want && !trivial(s)))
  if (!good.length) return null
  const answer = good[0]
  const bad = all.filter((s) => u.verdict(s, models) !== want)
  const samePair = rng.shuffle(bad.filter((s) => (s.x === answer.x && s.y === answer.y) || (s.x === answer.y && s.y === answer.x)))
  const rest = rng.shuffle(bad.filter((s) => !samePair.includes(s)))
  const distractors = [...samePair.slice(0, 2), ...rest].slice(0, 3)
  if (distractors.length < 3) return null
  const texts = distractors.map((s) => render(s, w))
  const { options } = withOptions(render(answer, w), texts, rng)
  const why = explainNecessary(u, premises, mode === 'follows' ? answer : neg(answer), w)
  const others = distractors
    .map((s) => {
      const m = minimalModel(u, premises, mode === 'follows' ? neg(s) : s)!
      return `• ${q(s, w)} — ${mode === 'follows' ? 'может быть ложным' : 'может быть верным'}: например, если существуют только такие существа: ${inlineWorld(u, m, w)}.`
    })
    .join('\n')
  const header =
    mode === 'follows'
      ? `Обязательно следует ${q(answer, w)}.\n${why}`
      : `Утверждение ${q(answer, w)} обязательно ложно, ведь верно противоположное: ${q(neg(answer), w)}.\n${why}`
  return {
    kind: 'choice',
    prompt: `Условия:\n${premises.map((p) => `• ${render(p, w)}.`).join('\n')}\n\n${mode === 'follows' ? 'Какое утверждение обязательно следует из условий?' : 'Какое утверждение обязательно ЛОЖНО, если условия верны?'}${someNote([...premises, ...distractors, answer])}`,
    options,
    answer: render(answer, w),
    hint: 'Проверяйте каждый вариант: можно ли придумать мир, где условия выполнены, а вариант — нет?',
    solution: `${header}\n\nОстальные варианты не подходят:\n${others}`,
    key: `c:${mode}:${n}:${premises.map((p) => `${p.form}${p.x}${p.y}`).join('')}:${w.map((x) => x.sg).join('')}`,
  }
}

function chain(rng: Rng, n: number, forms: Form[], needExistential = false): Stmt[] {
  const premises: Stmt[] = []
  for (let i = 0; i + 1 < n; i++) premises.push(randomStmt(rng, i, i + 1, forms))
  if (needExistential && !premises.some((p) => p.form === 'I' || p.form === 'O')) {
    const i = rng.int(0, premises.length - 1)
    premises[i] = randomStmt(rng, i, i + 1, ['I', 'O'])
  }
  return premises
}

export const syllogismsGenerator: ModuleGenerator = {
  module: 'syllogisms',
  targets: { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10 },
  make: (level, rng, index) => {
    switch (level) {
      case 1:
        return levelOne(rng, index)
      case 2:
        return verdictTask(rng, index, 3, chain(rng, 3, ['A', 'A', 'E']), [
          [0, 2],
          [2, 0],
        ], 2)
      case 3:
        return index % 2 === 0
          ? verdictTask(rng, index / 2, 3, chain(rng, 3, ['A', 'E', 'I', 'O'], true), [
              [0, 2],
              [2, 0],
            ], 3)
          : choiceTask(rng, 3, chain(rng, 3, ['A', 'A', 'E', 'I']), 'follows')
      case 4:
        return index % 2 === 0
          ? verdictTask(rng, index / 2, 4, chain(rng, 4, ['A', 'A', 'E', 'I']), [
              [0, 3],
              [3, 0],
              [0, 2],
              [1, 3],
            ], 4)
          : choiceTask(rng, 4, chain(rng, 4, ['A', 'A', 'E']), 'follows')
      case 5: {
        const order = rng.shuffle([0, 1, 2, 3])
        const premises = chain(rng, 4, ['A', 'E', 'I', 'O']).map((p) => ({ ...p, x: order[p.x], y: order[p.y] }))
        return choiceTask(rng, 4, premises, index % 2 === 0 ? 'follows' : 'false')
      }
    }
  },
}

export function syllogisms(): Task[] {
  return collect(syllogismsGenerator)
}
