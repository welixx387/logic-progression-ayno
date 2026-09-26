import type { Level } from '../types.ts'
import type { Rng } from './rng.ts'
import { choice, memorize, numeric } from './kit.ts'
import { CITIES, COLORS, colorFor, NAMES, NOUNS, PROFESSIONS, SIGN_NAMES, SIGNS, type Noun } from './memory-data.ts'
import { secs } from './memory-numbers.ts'
import { plural, type Draft, type ModuleGenerator } from './util.ts'

/** Задания на память со словами, парами, именами и символами. */

const T = { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 } as const
const ORD = ['первым', 'вторым', 'третьим', 'четвёртым', 'пятым', 'шестым', 'седьмым', 'восьмым', 'девятым', 'десятым', 'одиннадцатым', 'двенадцатым']
const ORD_NOM = ['первое', 'второе', 'третье', 'четвёртое', 'пятое', 'шестое', 'седьмое', 'восьмое', 'девятое', 'десятое', 'одиннадцатое', 'двенадцатое']
const ORD_M = ['первый', 'второй', 'третий', 'четвёртый', 'пятый', 'шестой', 'седьмой', 'восьмой', 'девятый', 'десятый', 'одиннадцатый', 'двенадцатый']

/** Слова из разных групп — чтобы список не был однородным. */
function words(rng: Rng, n: number, exclude: string[] = []): Noun[] {
  return rng.sample(
    NOUNS.filter((x) => !exclude.includes(x.w)),
    n,
  )
}

/** Отвлекающие слова: на высоких уровнях — из тех же смысловых групп, что и слова списка. */
function lures(rng: Rng, list: Noun[], level: Level, count: number): string[] {
  const used = new Set(list.map((x) => x.w))
  const groups = new Set(list.map((x) => x.c))
  const near = rng.shuffle(NOUNS.filter((x) => !used.has(x.w) && groups.has(x.c)))
  const far = rng.shuffle(NOUNS.filter((x) => !used.has(x.w) && !groups.has(x.c)))
  const pool = level >= 3 ? [...near, ...far] : [...far, ...near]
  return pool.slice(0, count).map((x) => x.w)
}

const listText = (xs: Noun[]) => xs.map((x) => x.w).join(', ')

function wordlist(level: Level, rng: Rng, index: number): Draft {
  const n = level + 4
  const list = words(rng, n)
  const display = memorize(secs(level, n, 1.8), `Запомните ${n} слов.`, { type: 'words', items: list.map((x) => x.w) })
  const negative = level >= 3 && index % 2 === 1
  if (negative) {
    const absent = lures(rng, list, level, 1)[0]
    const present = rng.sample(list, 3).map((x) => x.w)
    return choice(
      'Какого слова НЕ было в списке?',
      absent,
      present,
      rng,
      'Вспомните список целиком и проверьте каждый вариант.',
      [`Список: ${listText(list)}.`, `Слова «${absent}» в нём не было.`, 'Коварные варианты — слова из тех же групп: память легко «достраивает» похожее.'],
      `n:${listText(list)}:${absent}`,
      { display, notes: Object.fromEntries([[absent, 'Этого слова в списке не было.'], ...present.map((w) => [w, 'Было в списке.'])]) },
    )
  }
  const right = rng.pick(list).w
  const wrong = lures(rng, list, level, 3)
  return choice(
    'Какое из этих слов было в списке?',
    right,
    wrong,
    rng,
    'Во время показа свяжите слова в короткую историю — так они держатся дольше.',
    [`Список: ${listText(list)}.`, `Из вариантов в нём было только слово «${right}».`, 'Если придумать образ для каждого слова и связать их сюжетом, список из 10 слов запоминается без труда.'],
    `p:${listText(list)}:${right}`,
    { display, notes: Object.fromEntries([[right, 'Было в списке.'], ...wrong.map((w) => [w, 'Этого слова в списке не было.'])]) },
  )
}

function wordorder(level: Level, rng: Rng, index: number): Draft {
  const n = level + 3
  const list = words(rng, n)
  const display = memorize(secs(level, n, 1.9), `Запомните ${n} слов и их порядок.`, { type: 'sequence', items: list.map((x) => x.w) })
  const k = rng.int(0, n - 1)
  if (level >= 4 && index % 2 === 1) {
    return numeric(
      `На каком месте по счёту стояло слово «${list[k].w}»?`,
      k + 1,
      'Мысленно «разложите» слова по знакомому маршруту: прихожая, кухня, комната…',
      [`Порядок: ${list.map((x, j) => `${j + 1} — ${x.w}`).join(', ')}.`, `Слово «${list[k].w}» — на ${k + 1}-м месте.`],
      `q:${listText(list)}:${k}`,
      { display },
    )
  }
  return choice(
    `Какое слово было ${ORD[k]} по счёту?`,
    list[k].w,
    rng.shuffle(list.filter((_, j) => j !== k).map((x) => x.w)),
    rng,
    'Запоминайте слова вместе с номерами: «один — кот, два — лампа».',
    [`Порядок: ${list.map((x, j) => `${j + 1} — ${x.w}`).join(', ')}.`, `${ORD_NOM[k][0].toUpperCase() + ORD_NOM[k].slice(1)} слово — «${list[k].w}».`, 'Метод мест: мысленно расставьте предметы по комнатам своей квартиры в порядке обхода — и порядок сохранится.'],
    `o:${listText(list)}:${k}`,
    { display },
  )
}

function chain(level: Level, rng: Rng): Draft {
  const n = level + 4
  const list = words(rng, n)
  const k = rng.int(0, n - 2)
  const before = rng.chance(0.4) && k > 0
  const target = before ? list[k] : list[k]
  const answer = before ? list[k - 1].w : list[k + 1].w
  const display = memorize(secs(level, n, 1.8), `Запомните цепочку из ${n} предметов.`, { type: 'sequence', items: list.map((x) => x.w) })
  return choice(
    before ? `Какой предмет стоял прямо перед «${target.w}»?` : `Какой предмет шёл сразу после «${target.w}»?`,
    answer,
    rng.shuffle(list.filter((x) => x.w !== answer && x.w !== target.w).map((x) => x.w)),
    rng,
    'Соединяйте соседние предметы в яркие сценки: кот сидит в лампе, лампа плывёт на лодке…',
    [`Цепочка: ${listText(list)}.`, before ? `Перед «${target.w}» стояло слово «${answer}».` : `После «${target.w}» шло слово «${answer}».`, 'В методе цепочки каждый предмет «цепляется» за следующий через смешной или необычный образ — тогда один предмет вытягивает другой.'],
    `h:${listText(list)}:${k}:${before}`,
    { display },
  )
}

function pairs(level: Level, rng: Rng): Draft {
  const n = level + 2
  const all = words(rng, n * 2)
  const ps = Array.from({ length: n }, (_, i) => [all[2 * i], all[2 * i + 1]] as const)
  const i = rng.int(0, n - 1)
  const reverse = rng.chance(0.5)
  const [a, b] = reverse ? [ps[i][1], ps[i][0]] : ps[i]
  const wrong = [...ps.filter((_, j) => j !== i).map((p) => (reverse ? p[0].w : p[1].w)), ...lures(rng, all, level, 2)]
  const display = memorize(secs(level, n, 2.6), `Запомните ${n} ${plural(n, 'пару', 'пары', 'пар')} слов.`, { type: 'lines', lines: ps.map(([x, y]) => `${x.w} — ${y.w}`) })
  return choice(
    `С каким словом было в паре слово «${a.w}»?`,
    b.w,
    rng.shuffle(wrong),
    rng,
    'Для каждой пары представьте картинку, где предметы взаимодействуют: «кот зажигает лампу».',
    [`Пары: ${ps.map(([x, y]) => `${x.w} — ${y.w}`).join('; ')}.`, `Слово «${a.w}» было в паре со словом «${b.w}».`, 'Связанный образ работает лучше, чем повторение: пара превращается в одну картинку.'],
    `r:${ps.map(([x, y]) => x.w + y.w).join(',')}:${i}:${reverse}`,
    { display },
  )
}

function names(level: Level, rng: Rng, index: number): Draft {
  const n = level + 2
  const people = rng.sample(NAMES, n)
  const jobs = rng.sample(PROFESSIONS, n)
  const cities = rng.sample(CITIES, n)
  const withCity = level >= 3
  const rows = people.map((p, j) => (withCity ? [p.n, jobs[j], cities[j]] : [p.n, jobs[j]]))
  const display = memorize(secs(level, n, withCity ? 3.2 : 2.4), withCity ? 'Запомните, кто кем работает и откуда.' : 'Запомните, кто кем работает.', {
    type: 'table',
    head: withCity ? ['Имя', 'Профессия', 'Город'] : ['Имя', 'Профессия'],
    rows,
  })
  const i = rng.int(0, n - 1)
  const t = withCity ? index % 3 : index % 2
  const all = `Все: ${rows.map((r) => r.join(' — ')).join('; ')}.`
  if (t === 0)
    return choice(`Кем работает ${people[i].n}?`, jobs[i], [...jobs.filter((_, j) => j !== i), ...rng.sample(PROFESSIONS.filter((x) => !jobs.includes(x)), 2)], rng, 'Представьте человека за работой: «Ольга в белом халате».', [`${people[i].n} — ${jobs[i]}.`, all], `j:${rows.flat().join(',')}:${i}`, { display })
  if (t === 1)
    return choice(`Как зовут того, кто работает: ${jobs[i]}?`, people[i].n, [...people.filter((_, j) => j !== i).map((p) => p.n), ...rng.sample(NAMES.filter((x) => !people.includes(x)), 2).map((p) => p.n)], rng, 'Свяжите имя с профессией созвучием: «Павел — пилот».', [`${jobs[i][0].toUpperCase() + jobs[i].slice(1)} — ${people[i].n}.`, all], `n:${rows.flat().join(',')}:${i}`, { display })
  return choice(`Из какого города ${people[i].n}?`, cities[i], [...cities.filter((_, j) => j !== i), ...rng.sample(CITIES.filter((x) => !cities.includes(x)), 2)], rng, 'Добавьте к образу человека примету города: «повар из Казани готовит чак-чак».', [`${people[i].n} — из города ${cities[i]}.`, all], `c:${rows.flat().join(',')}:${i}`, { display })
}

function colors(level: Level, rng: Rng): Draft {
  const n = level + 3
  const items = words(rng, n)
  const cols = rng.sample(COLORS, n)
  const lines = items.map((x, j) => `${colorFor(cols[j], x.g)} ${x.w}`)
  const i = rng.int(0, n - 1)
  const g = items[i].g
  const right = colorFor(cols[i], g)
  const wrong = [...cols.filter((_, j) => j !== i).map((c) => colorFor(c, g)), ...rng.sample(COLORS.filter((c) => !cols.includes(c)), 2).map((c) => colorFor(c, g))]
  const verb = g === 'm' ? 'был' : g === 'f' ? 'была' : 'было'
  const display = memorize(secs(level, n, 2.2), 'Запомните предметы и их цвета.', { type: 'words', items: lines })
  return choice(
    `Какого цвета ${verb} ${items[i].w}?`,
    right,
    rng.shuffle(wrong),
    rng,
    'Представьте каждый предмет в его цвете — ярко и крупно.',
    [`Предметы: ${lines.join(', ')}.`, `${items[i].w[0].toUpperCase() + items[i].w.slice(1)} — ${right}.`, 'Необычные сочетания («синий банан») запоминаются лучше обычных — память любит странное.'],
    `k:${lines.join(',')}:${i}`,
    { display },
  )
}

function changes(level: Level, rng: Rng, index: number): Draft {
  const n = level + 4
  const list = words(rng, n)
  const i = rng.int(0, n - 1)
  const fresh = lures(rng, list, level, 1)[0]
  const next = list.map((x) => x.w)
  next[i] = fresh
  const shuffled = level >= 4 ? rng.shuffle(next) : next
  const display = memorize(secs(level, n, 1.8), `Запомните ${n} слов. Потом в списке одно слово поменяется.`, { type: 'words', items: list.map((x) => x.w) })
  const askNew = index % 2 === 0
  const now = `Список сейчас${level >= 4 ? ' (порядок перемешан)' : ''}: ${shuffled.join(', ')}.`
  if (askNew)
    return choice(
      `${now}\nКакое слово появилось вместо одного из старых?`,
      fresh,
      rng.shuffle(next.filter((w) => w !== fresh)),
      rng,
      'Сравнивайте новый список со «снимком» старого слово за словом.',
      [`Было: ${listText(list)}.`, `Стало: ${shuffled.join(', ')}.`, `Новое слово — «${fresh}», оно заменило «${list[i].w}».`],
      `a:${listText(list)}:${i}:${fresh}`,
      { display },
    )
  return choice(
    `${now}\nКакое слово исчезло из списка?`,
    list[i].w,
    [...lures(rng, [...list, { w: fresh, g: 'm', c: '' }], level, 2), ...rng.sample(list.filter((_, j) => j !== i), 2).map((x) => x.w)],
    rng,
    'Вспомните исходный список и найдите слово, которого теперь нет.',
    [`Было: ${listText(list)}.`, `Стало: ${shuffled.join(', ')}.`, `Исчезло слово «${list[i].w}» (вместо него появилось «${fresh}»).`],
    `m:${listText(list)}:${i}:${fresh}`,
    { display },
  )
}

function signs(level: Level, rng: Rng, index: number): Draft {
  const n = level + 4
  const seq = Array.from({ length: n }, () => rng.pick(SIGNS.slice(0, 4 + level)))
  const display = memorize(secs(level, n, 1.1), `Запомните последовательность из ${n} знаков.`, { type: 'sequence', items: seq })
  const named = seq.map((s) => SIGN_NAMES[s]).join(', ')
  if (index % 2 === 0) {
    const k = rng.int(0, n - 1)
    const pool = [...new Set(SIGNS.slice(0, 4 + level))].filter((s) => s !== seq[k])
    return choice(`Какой знак был ${ORD[k]}?`, seq[k], rng.shuffle(pool), rng, 'Называйте знаки словами — «круг, звезда, круг…»: слова держатся лучше картинок.', [`Последовательность: ${seq.join(' ')} (${named}).`, `${ORD_M[k][0].toUpperCase() + ORD_M[k].slice(1)} знак — ${seq[k]} (${SIGN_NAMES[seq[k]]}).`], `s:${seq.join('')}:${k}`, { display })
  }
  const s = rng.pick(seq)
  const count = seq.filter((x) => x === s).length
  return numeric(`Сколько раз встречался знак ${s} (${SIGN_NAMES[s]})?`, count, 'Ищите повторы и ритм: «круг через один».', [`Последовательность: ${seq.join(' ')}.`, `Знак ${s} встречался ${count} ${plural(count, 'раз', 'раза', 'раз')}.`], `t:${seq.join('')}:${s}`, { display })
}

const make = (module: ModuleGenerator['module'], fn: (level: Level, rng: Rng, index: number) => Draft | null): ModuleGenerator => ({ module, targets: T, make: fn })

export const MEMORY_WORD_GENERATORS: ModuleGenerator[] = [
  make('wordlist', wordlist),
  make('wordorder', wordorder),
  make('chain', chain),
  make('pairs', pairs),
  make('names', names),
  make('colors', colors),
  make('changes', changes),
  make('signs', signs),
]
