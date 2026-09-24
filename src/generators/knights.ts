import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, joinAnd, plural, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/** Рыцари всегда говорят правду, лжецы всегда лгут. Решение — единственная непротиворечивая расстановка. */

interface Name {
  nom: string
  acc: string
  ins: string
}

const NAMES: Name[] = [
  { nom: 'Антон', acc: 'Антона', ins: 'Антоном' },
  { nom: 'Борис', acc: 'Бориса', ins: 'Борисом' },
  { nom: 'Виктор', acc: 'Виктора', ins: 'Виктором' },
  { nom: 'Глеб', acc: 'Глеба', ins: 'Глебом' },
]

/** true — рыцарь, false — лжец. */
type World = boolean[]

interface Statement {
  text: string
  holds: (w: World) => boolean
}

type Kind = 'knight' | 'liar' | 'bothLiars' | 'bothKnights' | 'same' | 'diff' | 'someLiar' | 'countKnights' | 'countLiars' | 'or' | 'ifKnightThenLiar' | 'ifKnightThenKnight'

function knightsWord(k: number) {
  return plural(k, 'рыцарь', 'рыцаря', 'рыцарей')
}
function liarsWord(k: number) {
  return plural(k, 'лжец', 'лжеца', 'лжецов')
}

function makeStatement(kind: Kind, speaker: number, n: number, rng: Rng): Statement | null {
  const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== speaker)
  const t = rng.pick(others)
  const [u, v] = rng.sample(others, 2)
  const N = NAMES
  switch (kind) {
    case 'knight':
      return { text: `${N[t].nom} — рыцарь.`, holds: (w) => w[t] }
    case 'liar':
      return { text: `${N[t].nom} — лжец.`, holds: (w) => !w[t] }
    case 'bothLiars':
      return { text: `Мы с ${N[t].ins} оба лжецы.`, holds: (w) => !w[speaker] && !w[t] }
    case 'bothKnights':
      return { text: `Мы с ${N[t].ins} оба рыцари.`, holds: (w) => w[speaker] && w[t] }
    case 'same':
      if (rng.chance(0.5) || v === undefined) return { text: `Мы с ${N[t].ins} одного типа.`, holds: (w) => w[speaker] === w[t] }
      return { text: `${N[u].nom} и ${N[v].nom} — одного типа.`, holds: (w) => w[u] === w[v] }
    case 'diff':
      if (rng.chance(0.5) || v === undefined) return { text: `Мы с ${N[t].ins} разного типа.`, holds: (w) => w[speaker] !== w[t] }
      return { text: `${N[u].nom} и ${N[v].nom} — разного типа.`, holds: (w) => w[u] !== w[v] }
    case 'someLiar':
      return { text: 'Среди нас есть хотя бы один лжец.', holds: (w) => w.some((x) => !x) }
    case 'countKnights': {
      const k = rng.int(0, n)
      const text = k === 0 ? 'Среди нас нет ни одного рыцаря.' : `Среди нас ровно ${k} ${knightsWord(k)}.`
      return { text, holds: (w) => w.filter(Boolean).length === k }
    }
    case 'countLiars': {
      const k = rng.int(1, n)
      return { text: `Среди нас ровно ${k} ${liarsWord(k)}.`, holds: (w) => w.filter((x) => !x).length === k }
    }
    case 'or':
      if (v === undefined) return null
      return { text: `${N[u].nom} или ${N[v].nom} — лжец (а может быть, оба).`, holds: (w) => !w[u] || !w[v] }
    case 'ifKnightThenLiar':
      if (v === undefined) return null
      return { text: `Если ${N[u].nom} — рыцарь, то ${N[v].nom} — лжец.`, holds: (w) => !w[u] || !w[v] }
    case 'ifKnightThenKnight':
      if (v === undefined) return null
      return { text: `Если ${N[u].nom} — рыцарь, то и ${N[v].nom} — рыцарь.`, holds: (w) => !w[u] || w[v] }
  }
}

interface Config {
  n: number
  speakers: [number, number]
  kinds: Kind[]
}

const CONFIG: Record<Level, Config> = {
  1: { n: 2, speakers: [1, 2], kinds: ['knight', 'liar', 'bothLiars', 'bothKnights', 'same', 'diff', 'someLiar', 'countKnights'] },
  2: { n: 2, speakers: [2, 2], kinds: ['knight', 'liar', 'bothLiars', 'bothKnights', 'same', 'diff', 'someLiar', 'countKnights'] },
  3: { n: 3, speakers: [2, 3], kinds: ['knight', 'liar', 'bothLiars', 'same', 'diff', 'countKnights', 'someLiar'] },
  4: { n: 3, speakers: [3, 3], kinds: ['liar', 'same', 'diff', 'countKnights', 'countLiars', 'or', 'ifKnightThenLiar', 'someLiar'] },
  5: { n: 4, speakers: [3, 4], kinds: ['liar', 'knight', 'same', 'diff', 'countKnights', 'countLiars', 'or', 'ifKnightThenLiar', 'ifKnightThenKnight', 'bothLiars'] },
}

function allWorlds(n: number): World[] {
  return Array.from({ length: 1 << n }, (_, m) => Array.from({ length: n }, (_, i) => ((m >> (n - 1 - i)) & 1) === 1))
}

const fmtWorld = (w: World) => {
  const knights = w.map((k, i) => (k ? NAMES[i].nom : null)).filter(Boolean) as string[]
  const liars = w.map((k, i) => (!k ? NAMES[i].nom : null)).filter(Boolean) as string[]
  if (!knights.length) return 'Все лжецы'
  if (!liars.length) return 'Все рыцари'
  return `Рыцари: ${knights.join(', ')} · Лжецы: ${liars.join(', ')}`
}

const shortWorld = (w: World) => w.map((k, i) => `${NAMES[i].nom} — ${k ? 'Р' : 'Л'}`).join(', ')

function generate(level: Level, rng: Rng, index: number): Draft | null {
  const cfg = CONFIG[level]
  // На втором уровне каждая вторая задача — уже про трёх жителей.
  const n = level === 2 && index % 2 === 1 ? 3 : cfg.n
  const count = rng.int(cfg.speakers[0], cfg.speakers[1])
  const speakers = rng.sample(Array.from({ length: n }, (_, i) => i), count).sort()
  const said: { speaker: number; st: Statement }[] = []
  for (const sp of speakers) {
    const st = makeStatement(rng.pick(cfg.kinds), sp, n, rng)
    if (!st) return null
    said.push({ speaker: sp, st })
  }
  const worlds = allWorlds(n)
  const consistent = (w: World) => said.every(({ speaker, st }) => st.holds(w) === w[speaker])
  const good = worlds.filter(consistent)
  if (good.length !== 1) return null
  const solution = good[0]
  // Совсем очевидные задачи (все рыцари) на высоких уровнях не берём.
  if (level >= 3 && solution.every(Boolean)) return null

  const names = NAMES.slice(0, n).map((x) => x.nom)
  const lines = said.map(({ speaker, st }) => `${NAMES[speaker].nom}: «${st.text.replace(/\.$/, '')}».`)
  const silent = names.filter((_, i) => !speakers.includes(i))

  const check = worlds
    .map((w) => {
      if (consistent(w)) return `• ${shortWorld(w)}: ✓ противоречий нет`
      const bad = said.find(({ speaker, st }) => st.holds(w) !== w[speaker])!
      const who = NAMES[bad.speaker].nom
      return `• ${shortWorld(w)}: ✗ ${who} ${w[bad.speaker] ? 'рыцарь, но его слова ложны' : 'лжец, но его слова правдивы'}`
    })
    .join('\n')

  const askCount = level === 4 && index % 2 === 1
  const knights = solution.filter(Boolean).length
  const base = {
    prompt: `На острове живут рыцари, которые всегда говорят правду, и лжецы, которые всегда лгут. Вы встретили ${joinAnd(NAMES.slice(0, n).map((x) => x.acc))}.${
      silent.length ? ` ${joinAnd(silent)} ${silent.length > 1 ? 'промолчали' : 'промолчал'}.` : ''
    }\n\n${lines.join('\n')}\n\n${askCount ? 'Сколько среди них рыцарей?' : 'Кто из них рыцарь, а кто лжец?'}`,
    hint: 'Переберите варианты: предположите, что первый говорящий — рыцарь, и проверьте, не возникает ли противоречий.',
    solution: `Проверим все варианты (Р — рыцарь, Л — лжец):\n${check}\n\nОтвет: ${askCount ? `${knights} ${knightsWord(knights)}` : fmtWorld(solution)}.`,
    key: `${n}:${lines.join('|')}`,
  }
  if (askCount) return { kind: 'number', answer: String(knights), ...base }
  const others = rng.shuffle(worlds.filter((w) => !consistent(w))).map(fmtWorld)
  return { kind: 'choice', ...withOptions(fmtWorld(solution), others, rng), ...base }
}

export const knightsGenerator: ModuleGenerator = {
  module: 'knights',
  targets: { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10 },
  make: generate,
}

export function knights(): Task[] {
  return collect(knightsGenerator)
}
