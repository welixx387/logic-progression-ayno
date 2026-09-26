import type { Level } from '../types.ts'
import type { Rng } from './rng.ts'
import { choice, memorize, numeric } from './kit.ts'
import { CITIES, COLORS, colorFor, ERRANDS, GOODS, NAMES, NOUNS, PLACES, type Name } from './memory-data.ts'
import { secs } from './memory-numbers.ts'
import { plural, type Draft, type ModuleGenerator } from './util.ts'

/** Задания на память со сценами: покупки, маршрут, расписание, рассказ, комната, карточки, план, точки. */

const T = { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 } as const
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const form = (n: number, g: readonly [string, string, string, ...unknown[]]) => plural(n, g[0], g[1], g[2])

function shopping(level: Level, rng: Rng): Draft {
  const n = level + 2
  const goods = rng.sample(GOODS, n)
  const qty = goods.map(() => rng.int(1, level >= 3 ? 12 : 9))
  const withPrice = level >= 4
  const rows = goods.map((g, j) => (withPrice ? [cap(g[0]), String(qty[j]), `${g[3]} ₽`] : [cap(g[0]), String(qty[j])]))
  const display = memorize(secs(level, n, withPrice ? 3.4 : 2.2), withPrice ? 'Запомните список покупок: сколько и почём.' : 'Запомните список покупок.', {
    type: 'table',
    head: withPrice ? ['Товар', 'Сколько', 'Цена за штуку'] : ['Товар', 'Сколько'],
    rows,
  })
  const list = goods.map((g, j) => `${qty[j]} ${form(qty[j], g)}`).join(', ')
  if (withPrice && rng.chance(0.5)) {
    const total = goods.reduce((s, g, j) => s + g[3] * qty[j], 0)
    return numeric(
      'Сколько рублей стоит вся покупка?',
      total,
      'Считайте сумму прямо во время показа, строка за строкой.',
      [`Список: ${goods.map((g, j) => `${qty[j]} × ${g[3]} ₽ (${g[2]})`).join(', ')}.`, `${goods.map((g, j) => `${qty[j]} · ${g[3]}`).join(' + ')} = ${total} ₽.`],
      `t:${rows.flat().join(',')}`,
      { display },
    )
  }
  const i = rng.int(0, n - 1)
  return numeric(
    `Сколько ${goods[i][2]} нужно купить?`,
    qty[i],
    'Свяжите число с предметом образом: «три яблока — как три светофора».',
    [`Список: ${list}.`, `${cap(goods[i][2])} — ${qty[i]}.`],
    `q:${rows.flat().join(',')}:${i}`,
    { display },
  )
}

const DIRS = ['налево', 'прямо', 'направо'] as const
const ARROW: Record<string, string> = { налево: '←', прямо: '↑', направо: '→' }
const SIDES = ['север', 'восток', 'юг', 'запад']

function route(level: Level, rng: Rng, index: number): Draft {
  const n = level + 3
  const steps = Array.from({ length: n }, () => rng.pick(DIRS))
  const display = memorize(secs(level, n, 1.3), `Запомните маршрут: что делать на каждом из ${n} перекрёстков.`, { type: 'sequence', items: steps.map((d) => ARROW[d]) })
  const shown = `Маршрут: ${steps.map((d, j) => `${j + 1}) ${d}`).join(', ')}.`
  const t = level >= 3 ? index % 3 : index % 2
  if (t === 0) {
    const k = rng.int(0, n - 1)
    return choice(`Что нужно сделать на ${k + 1}-м перекрёстке?`, steps[k], DIRS.filter((d) => d !== steps[k]), rng, 'Проговаривайте маршрут ритмом: «лево-прямо-прямо-право».', [shown, `На ${k + 1}-м перекрёстке — ${steps[k]}.`], `k:${steps.join('')}:${k}`, { display }, 3)
  }
  if (t === 1) {
    const d = rng.pick(['налево', 'направо'] as const)
    const c = steps.filter((x) => x === d).length
    return numeric(`Сколько раз нужно повернуть ${d}?`, c, 'Считайте повороты во время показа.', [shown, `${cap(d)}: ${c} ${plural(c, 'раз', 'раза', 'раз')}.`], `c:${steps.join('')}:${d}`, { display })
  }
  let face = 0
  for (const s of steps) face = (face + (s === 'направо' ? 1 : s === 'налево' ? 3 : 0)) % 4
  return choice(
    'Вы начали путь лицом на север. В какую сторону света вы смотрите в конце маршрута?',
    SIDES[face],
    SIDES.filter((_, j) => j !== face),
    rng,
    'Каждый поворот направо — на четверть круга по часовой стрелке, налево — против.',
    [shown, `Поворотов направо: ${steps.filter((x) => x === 'направо').length}, налево: ${steps.filter((x) => x === 'налево').length}.`, `Каждый поворот направо сдвигает направление по кругу «север → восток → юг → запад», налево — обратно. В итоге — ${SIDES[face]}.`],
    `f:${steps.join('')}`,
    { display },
  )
}

const timeStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

function schedule(level: Level, rng: Rng, index: number): Draft {
  const n = level + 2
  const step = level >= 4 ? 15 : 30
  const slots = rng.sample(Array.from({ length: (20 - 8) * (60 / step) }, (_, i) => 8 * 60 + i * step), n).sort((a, b) => a - b)
  const acts = rng.sample(ERRANDS, n)
  const display = memorize(secs(level, n, 2.8), 'Запомните расписание на день.', { type: 'table', head: ['Время', 'Дело'], rows: slots.map((m, j) => [timeStr(m), acts[j]]) })
  const i = rng.int(0, n - 1)
  const all = `Расписание: ${slots.map((m, j) => `${timeStr(m)} — ${acts[j]}`).join('; ')}.`
  const t = level >= 3 ? index % 3 : index % 2
  if (t === 0) {
    const near = [slots[i] - step, slots[i] + step, slots[i] + 60, slots[i] - 60].filter((m) => m >= 7 * 60 && m <= 21 * 60)
    return choice(`Во сколько: ${acts[i]}?`, timeStr(slots[i]), rng.shuffle([...slots.filter((_, j) => j !== i), ...near].map(timeStr)), rng, 'Привяжите дело ко времени суток: утро, обед, вечер.', [all, `${cap(acts[i])} — в ${timeStr(slots[i])}.`], `a:${slots.join(',')}:${acts.join(',')}:${i}`, { display })
  }
  if (t === 1)
    return choice(`Что запланировано на ${timeStr(slots[i])}?`, acts[i], [...acts.filter((_, j) => j !== i), ...rng.sample(ERRANDS.filter((a) => !acts.includes(a)), 2)], rng, 'Представьте день как ленту: утро → вечер, дела по порядку.', [all, `В ${timeStr(slots[i])} — ${acts[i]}.`], `b:${slots.join(',')}:${acts.join(',')}:${i}`, { display })
  const j = rng.int(0, n - 2)
  return choice(`Какое дело идёт сразу после дела «${acts[j]}»?`, acts[j + 1], acts.filter((_, k) => k !== j + 1 && k !== j), rng, 'Запоминайте дела как цепочку: одно ведёт к другому.', [all, `После «${acts[j]}» (${timeStr(slots[j])}) идёт «${acts[j + 1]}» (${timeStr(slots[j + 1])}).`], `c:${slots.join(',')}:${acts.join(',')}:${j}`, { display })
}

// ——— Рассказы ———

/** «В понедельник», «во вторник», «в среду»… */
const DAYS = ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье']
const DAYS_NOM = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
const TRANSPORT = [
  ['поезд', 'поезде'],
  ['автобус', 'автобусе'],
  ['самолёт', 'самолёте'],
] as const
const TOPICS = ['космос', 'динозавров', 'пиратов', 'океан', 'роботов', 'вулканы']
const FLAVORS = ['шоколадный', 'клубничный', 'лимонный', 'ванильный', 'ореховый']
const MUSEUMS = ['музей космонавтики', 'зоологический музей', 'музей железных дорог', 'художественный музей', 'музей шоколада']
const TEAMS = ['Метеор', 'Орлы', 'Звезда', 'Витязь', 'Молния', 'Торпедо', 'Сокол', 'Искра']

interface Question {
  q: string
  /** Правильный ответ: число — для ответа вводом, строка — для выбора. */
  a: number | string
  wrong?: string[]
  /** Номер предложения, из которого вопрос. */
  s: number
}

interface Story {
  sentences: string[]
  questions: Question[]
}

const g = (p: Name, m: string, f: string) => (p.female ? f : m)

function trip(rng: Rng): Story {
  const p = rng.pick(NAMES)
  const friend = rng.pick(NAMES.filter((x) => x !== p))
  const day = rng.int(0, 6)
  const city = rng.pick(CITIES)
  const tr = rng.pick(TRANSPORT)
  const time = rng.int(12, 44) * 30
  const room = rng.int(101, 519)
  const cards = rng.int(2, 9)
  const color = rng.pick(COLORS)
  return {
    sentences: [
      `${cap(DAYS[day])} ${p.n} поехал${g(p, '', 'а')} в ${city} на ${tr[1]}.`,
      `${cap(tr[0])} отправился в ${timeStr(time)}.`,
      `В гостинице ${g(p, 'ему', 'ей')} дали номер ${room}.`,
      `Вечером ${p.n} купил${g(p, '', 'а')} ${cards} ${plural(cards, 'открытку', 'открытки', 'открыток')} и ${colorFor(color, 'm')} шарф.`,
      `Перед сном ${g(p, 'он', 'она')} позвонил${g(p, '', 'а')} другу по имени ${friend.n}.`,
      `На следующий день ${p.n} пош${g(p, 'ёл', 'ла')} в музей и провёл${g(p, '', 'а')} там ${rng.int(2, 4)} часа.`,
    ],
    questions: [
      { q: `В какой день ${p.n} поехал${g(p, '', 'а')} в поездку?`, a: DAYS_NOM[day], wrong: DAYS_NOM.filter((_, j) => j !== day), s: 0 },
      { q: `В какой город поехал${g(p, '', 'а')} ${p.n}?`, a: city, wrong: rng.sample(CITIES.filter((c) => c !== city), 4), s: 0 },
      { q: `На чём ${p.n} ехал${g(p, '', 'а')}?`, a: `на ${tr[1]}`, wrong: TRANSPORT.filter((t) => t !== tr).map((t) => `на ${t[1]}`).concat(['на машине']), s: 0 },
      { q: 'Во сколько отправился транспорт?', a: timeStr(time), wrong: [time - 30, time + 30, time + 60, time - 60].map(timeStr), s: 1 },
      { q: 'Какой номер дали в гостинице?', a: room, s: 2 },
      { q: 'Сколько открыток купили?', a: cards, s: 3 },
      { q: 'Какого цвета был шарф?', a: colorFor(color, 'm'), wrong: rng.sample(COLORS.filter((c) => c !== color), 4).map((c) => c[0]), s: 3 },
      { q: `Кому ${p.n} позвонил${g(p, '', 'а')} перед сном?`, a: friend.n, wrong: rng.sample(NAMES.filter((x) => x !== friend && x !== p), 4).map((x) => x.n), s: 4 },
    ],
  }
}

function birthday(rng: Rng): Story {
  const p = rng.pick(NAMES)
  const [f1, f2] = rng.sample(NAMES.filter((x) => x !== p), 2)
  const day = rng.int(0, 6)
  const guests = rng.int(3, 12)
  const age = rng.int(7, 17)
  const color = rng.pick(COLORS)
  const item = rng.pick(NOUNS.filter((x) => ['вещи', 'одежда'].includes(x.c)))
  const topic = rng.pick(TOPICS)
  const flavor = rng.pick(FLAVORS)
  const end = rng.int(34, 42) * 30
  return {
    sentences: [
      `${p.n} праздновал${g(p, '', 'а')} день рождения ${DAYS[day]}.`,
      `Пришли ${guests} ${plural(guests, 'гость', 'гостя', 'гостей')}.`,
      `${f1.n} подарил${g(f1, '', 'а')} ${colorFor(color, item.g).replace(/ая$/, 'ую').replace(/яя$/, 'юю')} ${item.g === 'f' ? item.w.replace(/а$/, 'у').replace(/я$/, 'ю') : item.w}, а ${f2.n} — книгу про ${topic}.`,
      `Торт был ${flavor}, на нём горело ${age} ${plural(age, 'свеча', 'свечи', 'свечей')}.`,
      `Праздник закончился в ${timeStr(end)}.`,
    ],
    questions: [
      { q: 'В какой день был праздник?', a: DAYS_NOM[day], wrong: DAYS_NOM.filter((_, j) => j !== day), s: 0 },
      { q: 'Сколько гостей пришло?', a: guests, s: 1 },
      { q: `Что подарил${g(f1, '', 'а')} ${f1.n}?`, a: item.w, wrong: rng.sample(NOUNS.filter((x) => x.c === item.c && x !== item), 4).map((x) => x.w), s: 2 },
      { q: `Про что была книга, которую подарил${g(f2, '', 'а')} ${f2.n}?`, a: `про ${topic}`, wrong: TOPICS.filter((t) => t !== topic).map((t) => `про ${t}`), s: 2 },
      { q: 'Каким был торт?', a: flavor, wrong: FLAVORS.filter((x) => x !== flavor), s: 3 },
      { q: 'Сколько свечей горело на торте?', a: age, s: 3 },
      { q: 'Во сколько закончился праздник?', a: timeStr(end), wrong: [end - 30, end + 30, end - 60, end + 60].map(timeStr), s: 4 },
    ],
  }
}

function museum(rng: Rng): Story {
  const p = rng.pick(NAMES)
  const guide = rng.pick(NAMES.filter((x) => x !== p))
  const day = rng.int(0, 6)
  const m = rng.pick(MUSEUMS)
  const bus = rng.int(10, 99)
  const time = rng.int(16, 22) * 30
  const halls = rng.int(3, 9)
  const pics = rng.int(12, 48)
  const obj = rng.pick(NOUNS.filter((x) => ['животные', 'транспорт', 'природа'].includes(x.c)))
  return {
    sentences: [
      `${cap(DAYS[day])} класс, в котором учится ${p.n}, ездил в ${m}.`,
      `Автобус номер ${bus} выехал от школы в ${timeStr(time)}.`,
      `Экскурсию вел${guide.female ? 'а' : ''} ${guide.n}.`,
      `Ребята обошли ${halls} ${plural(halls, 'зал', 'зала', 'залов')} и увидели ${pics} ${plural(pics, 'экспонат', 'экспоната', 'экспонатов')}.`,
      `Больше всего ${p.n} запомнил${g(p, '', 'а')} экспонат, на котором ${obj.g === 'm' ? 'был изображён' : obj.g === 'f' ? 'была изображена' : 'было изображено'} ${obj.w}.`,
    ],
    questions: [
      { q: 'В какой день была экскурсия?', a: DAYS_NOM[day], wrong: DAYS_NOM.filter((_, j) => j !== day), s: 0 },
      { q: 'Куда ездил класс?', a: m, wrong: MUSEUMS.filter((x) => x !== m), s: 0 },
      { q: 'Какой номер был у автобуса?', a: bus, s: 1 },
      { q: 'Во сколько выехал автобус?', a: timeStr(time), wrong: [time - 30, time + 30, time + 60, time - 60].map(timeStr), s: 1 },
      { q: 'Как звали экскурсовода?', a: guide.n, wrong: rng.sample(NAMES.filter((x) => x !== guide && x !== p), 4).map((x) => x.n), s: 2 },
      { q: 'Сколько залов обошли ребята?', a: halls, s: 3 },
      { q: 'Сколько экспонатов увидели?', a: pics, s: 3 },
      { q: `Что было изображено на экспонате, который запомнил${g(p, '', 'а')} ${p.n}?`, a: obj.w, wrong: rng.sample(NOUNS.filter((x) => x.c === obj.c && x !== obj), 4).map((x) => x.w), s: 4 },
    ],
  }
}

function match(rng: Rng): Story {
  const [t1, t2] = rng.sample(TEAMS, 2)
  const day = rng.int(0, 6)
  const time = rng.int(24, 40) * 30
  const num = rng.int(2, 30)
  let a = rng.int(0, 5)
  let b = rng.int(0, 5)
  if (a === b) a++
  if (a + b === 0) b = 1
  const fans = rng.int(8, 60) * 100
  const winner = a > b ? t1 : t2
  return {
    sentences: [
      `${cap(DAYS[day])} команда «${t1}» играла с командой «${t2}».`,
      `Матч начался в ${timeStr(time)}.`,
      `Первый гол забил игрок под номером ${num}.`,
      `Игра закончилась со счётом ${a}:${b}.`,
      `На трибунах было ${fans} зрителей.`,
    ],
    questions: [
      { q: 'В какой день был матч?', a: DAYS_NOM[day], wrong: DAYS_NOM.filter((_, j) => j !== day), s: 0 },
      { q: 'Во сколько начался матч?', a: timeStr(time), wrong: [time - 30, time + 30, time + 60, time - 60].map(timeStr), s: 1 },
      { q: 'Под каким номером играл автор первого гола?', a: num, s: 2 },
      { q: 'Какая команда победила?', a: `«${winner}»`, wrong: [`«${winner === t1 ? t2 : t1}»`, 'Была ничья'], s: 3 },
      { q: 'С каким счётом закончилась игра?', a: `${a}:${b}`, wrong: [`${b}:${a}`, `${a + 1}:${b}`, `${a}:${b + 1}`, `${Math.max(0, a - 1)}:${b}`].filter((x) => x !== `${a}:${b}`), s: 3 },
      { q: 'Сколько зрителей было на трибунах?', a: fans, s: 4 },
    ],
  }
}

const STORIES = [trip, birthday, museum, match]

function story(level: Level, rng: Rng): Draft | null {
  const st = rng.pick(STORIES)(rng)
  const count = Math.min(st.sentences.length, level + 2)
  const text = st.sentences.slice(0, count).join(' ')
  const qs = st.questions.filter((q) => q.s < count)
  const q = rng.pick(qs)
  const words = text.split(/\s+/).length
  const display = memorize(Math.max(8, Math.round(words * [0.55, 0.5, 0.45, 0.42, 0.4][level - 1])), 'Прочитайте и запомните рассказ. Потом будет вопрос о деталях.', { type: 'text', text })
  const steps = [`Нужная фраза: «${st.sentences[q.s]}»`, `Ответ: ${q.a}.`, 'Читая, задавайте себе вопросы «кто? где? когда? сколько?» — детали, на которые вы обратили внимание, запоминаются намного лучше.']
  const key = `s:${text}:${q.q}`
  if (typeof q.a === 'number') return numeric(q.q, q.a, 'Представьте события рассказа как короткий фильм.', steps, key, { display })
  const wrong = [...new Set(q.wrong!.filter((w) => w !== q.a))]
  return choice(q.q, q.a, rng.shuffle(wrong), rng, 'Представьте события рассказа как короткий фильм.', steps, key, { display }, Math.min(4, wrong.length + 1))
}

// ——— Комната ———

const SPOTS = ['На столе', 'На полке', 'У окна', 'На диване', 'Под кроватью', 'У двери', 'На подоконнике', 'В углу']
/** Предметы: формы для 1, 2–4 и 5+ штук и множественное число. */
const THINGS: [string, string, string, string][] = [
  ['книга', 'книги', 'книг', 'книги'],
  ['чашка', 'чашки', 'чашек', 'чашки'],
  ['подушка', 'подушки', 'подушек', 'подушки'],
  ['игрушка', 'игрушки', 'игрушек', 'игрушки'],
  ['свеча', 'свечи', 'свечей', 'свечи'],
  ['кубок', 'кубка', 'кубков', 'кубки'],
  ['коробка', 'коробки', 'коробок', 'коробки'],
  ['мяч', 'мяча', 'мячей', 'мячи'],
  ['горшок с цветком', 'горшка с цветами', 'горшков с цветами', 'горшки с цветами'],
  ['журнал', 'журнала', 'журналов', 'журналы'],
  ['ракушка', 'ракушки', 'ракушек', 'ракушки'],
  ['фотография', 'фотографии', 'фотографий', 'фотографии'],
]

function scene(level: Level, rng: Rng, index: number): Draft {
  const n = level + 2
  const spots = rng.sample(SPOTS, n)
  const things = rng.sample(THINGS, n)
  const counts = things.map(() => rng.int(1, 7))
  const lines = spots.map((s, j) => `${s}: ${counts[j]} ${form(counts[j], things[j])}`)
  const display = memorize(secs(level, n, 2.6), 'Запомните, что и где лежит в комнате.', { type: 'lines', lines })
  const i = rng.int(0, n - 1)
  const all = `Комната: ${lines.map((l) => l[0].toLowerCase() + l.slice(1)).join('; ')}.`
  const t = index % 3
  if (t === 0) return numeric(`Сколько было ${things[i][2]} (${spots[i].toLowerCase()})?`, counts[i], 'Представьте комнату и «пройдитесь» по ней взглядом по кругу.', [all, `${spots[i]} — ${counts[i]} ${form(counts[i], things[i])}.`], `n:${lines.join(',')}:${i}`, { display })
  if (t === 1)
    return choice(`Какие предметы были здесь: ${spots[i].toLowerCase()}?`, things[i][3], [...things.filter((_, j) => j !== i).map((x) => x[3]), ...rng.sample(THINGS.filter((x) => !things.includes(x)), 2).map((x) => x[3])], rng, 'Свяжите каждое место с предметом: «на подоконнике — ракушки».', [all, `${spots[i]} — ${things[i][3]} (${counts[i]} шт.).`], `w:${lines.join(',')}:${i}`, { display })
  return choice(counts[i] === 1 ? `Где был предмет «${things[i][0]}»?` : `Где были ${things[i][3]}?`, spots[i].toLowerCase(), [...spots.filter((_, j) => j !== i).map((s) => s.toLowerCase()), ...rng.sample(SPOTS.filter((s) => !spots.includes(s)), 2).map((s) => s.toLowerCase())], rng, 'Запоминайте пары «место — предмет» как картинки.', [all, `${cap(counts[i] === 1 ? things[i][0] : things[i][3])} — ${spots[i].toLowerCase()}.`], `p:${lines.join(',')}:${i}`, { display })
}

// ——— Карточки ———

const SURNAMES = [
  ['Смирнова', 'Смирнов', 'Семёнова'],
  ['Кузнецов', 'Кузьмин', 'Кузнецова'],
  ['Орлова', 'Осипова', 'Орлов'],
  ['Лебедев', 'Лебедева', 'Левченко'],
  ['Морозова', 'Морозов', 'Мохова'],
  ['Волков', 'Волкова', 'Воронов'],
  ['Павлова', 'Павлов', 'Панова'],
  ['Соколов', 'Соколова', 'Сорокин'],
]
const STREETS = [
  ['Лесная', 'Луговая', 'Лесной переулок'],
  ['Садовая', 'Советская', 'Садовый проезд'],
  ['Речная', 'Рабочая', 'Речной бульвар'],
  ['Школьная', 'Шоссейная', 'Школьный переулок'],
  ['Полевая', 'Почтовая', 'Полевой проезд'],
  ['Зелёная', 'Заводская', 'Зелёный бульвар'],
]
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

function cards(level: Level, rng: Rng): Draft {
  const order = rng.int(1000, 9999)
  const sum = rng.int(12, 480) * 10
  const day = rng.int(1, 27)
  const month = rng.int(0, 11)
  const sur = rng.pick(SURNAMES)
  const st = rng.pick(STREETS)
  const house = rng.int(2, 99)
  const box = rng.int(10, 99)
  const fields: [string, string, () => Draft][] = [
    ['Заказ', `№ ${order}`, () => numeric('Какой номер у заказа?', order, 'Разбейте номер на две пары цифр.', [`Номер заказа — ${order}.`], `o:${order}`)],
    ['Сумма', `${sum} ₽`, () => numeric('Какая сумма заказа (в рублях)?', sum, 'Округлите в уме: «почти полторы тысячи» — и уточните хвост.', [`Сумма — ${sum} ₽.`], `s:${sum}`)],
    ['Получатель', sur[0], () => choice('Кто получатель заказа?', sur[0], sur.slice(1), rng, 'Обращайте внимание на окончания фамилий.', [`Получатель — ${sur[0]}.`, 'Похожие фамилии отличаются одной-двумя буквами или родом — это типичная ошибка при быстром чтении.'], `p:${sur[0]}`, {}, 3)],
    ['Дата доставки', `${day} ${MONTHS[month]}`, () => choice('Когда доставка?', `${day} ${MONTHS[month]}`, [`${day + 1} ${MONTHS[month]}`, `${day} ${MONTHS[(month + 1) % 12]}`, `${day === 1 ? 2 : day - 1} ${MONTHS[month]}`], rng, 'Запоминайте дату как «число + месяц», связав её с праздником или днём недели.', [`Доставка — ${day} ${MONTHS[month]}.`], `d:${day}.${month}`)],
    ['Улица', `ул. ${st[0]}`, () => choice('На какой улице адрес доставки?', `ул. ${st[0]}`, st.slice(1).map((x) => (x.includes(' ') ? x : `ул. ${x}`)), rng, 'Представьте табличку с названием улицы.', [`Улица — ${st[0]}.`], `a:${st[0]}`, {}, 3)],
    ['Дом', `${house}`, () => numeric('Какой номер дома в адресе?', house, 'Свяжите номер дома с чем-то знакомым.', [`Дом — ${house}.`], `h:${house}`)],
    ['Ячейка постамата', `${box}`, () => numeric('Какой номер ячейки постамата?', box, 'Ячейку запоминайте отдельно от номера заказа.', [`Ячейка — ${box}.`], `b:${box}`)],
  ]
  const shown = rng.sample(fields, Math.min(fields.length, level + 2))
  const pick = rng.pick(shown)
  const base = pick[2]()
  const display = memorize(secs(level, shown.length, 2.6), 'Запомните данные заказа.', { type: 'table', head: ['Поле', 'Значение'], rows: shown.map(([k, v]) => [k, v]) })
  return {
    ...base,
    display,
    solution: `${base.solution}\nВся карточка: ${shown.map(([k, v]) => `${k.toLowerCase()} — ${v}`).join('; ')}.`,
    key: `${shown.map(([k, v]) => k + v).join(',')}:${base.key}`,
  }
}

// ——— План города ———

function citymap(level: Level, rng: Rng, index: number): Draft | null {
  const size = level <= 2 ? 3 : 4
  const count = [5, 7, 9, 11, 14][level - 1]
  const cells = rng.sample(Array.from({ length: size * size }, (_, i) => i), count)
  const places = rng.sample(PLACES, count)
  const at = new Map<number, string>()
  cells.forEach((c, j) => at.set(c, places[j]))
  const rows = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => at.get(r * size + c) ?? '—'))
  const display = memorize(secs(level, count, 1.9), 'Запомните план района: что где находится (север — сверху).', { type: 'grid', rows })
  const t = index % 3
  const others = (right: string) => rng.shuffle(places.filter((p) => p !== right))
  if (t === 0) {
    // Соседи: справа, слева, сверху (к северу), снизу (к югу).
    const opts: [number, number, string][] = []
    for (const c of cells) {
      const r = Math.floor(c / size)
      const k = c % size
      if (k + 1 < size && at.has(c + 1)) opts.push([c, c + 1, 'справа от'])
      if (r + 1 < size && at.has(c + size)) opts.push([c, c + size, 'к югу от'])
      if (r > 0 && at.has(c - size)) opts.push([c, c - size, 'к северу от'])
    }
    if (!opts.length) return null
    const [from, to, rel] = rng.pick(opts)
    return choice(`Что находится прямо ${rel} места «${at.get(from)}»?`, at.get(to)!, others(at.get(to)!).filter((p) => p !== at.get(from)), rng, 'Запоминайте план полосами: верхний ряд, средний, нижний.', [`План (сверху — север):\n${rows.map((r) => r.join(' | ')).join('\n')}`, `${cap(rel)} места «${at.get(from)}» — «${at.get(to)}».`], `n:${rows.flat().join(',')}:${from}:${to}`, { display })
  }
  if (t === 1) {
    const corners = [0, size - 1, size * (size - 1), size * size - 1].filter((c) => at.has(c))
    if (!corners.length) return null
    const c = rng.pick(corners)
    const name = ['в левом верхнем (северо-западном) углу', 'в правом верхнем (северо-восточном) углу', 'в левом нижнем (юго-западном) углу', 'в правом нижнем (юго-восточном) углу'][[0, size - 1, size * (size - 1), size * size - 1].indexOf(c)]
    return choice(`Что было ${name}?`, at.get(c)!, others(at.get(c)!), rng, 'Углы плана — опорные точки: запомните их первыми.', [`План:\n${rows.map((r) => r.join(' | ')).join('\n')}`, `${cap(name)} — «${at.get(c)}».`], `c:${rows.flat().join(',')}:${c}`, { display })
  }
  const c = rng.pick(cells)
  const r = Math.floor(c / size) + 1
  const k = (c % size) + 1
  return numeric(`В каком ряду сверху находилось место «${at.get(c)}»? Введите номер ряда (1 — верхний).`, r, 'Запоминайте, что стоит в каждом ряду.', [`План:\n${rows.map((row) => row.join(' | ')).join('\n')}`, `«${at.get(c)}» — ряд ${r}, столбец ${k}.`], `r:${rows.flat().join(',')}:${c}`, { display })
}

// ——— Точки ———

function dots(level: Level, rng: Rng, index: number): Draft | null {
  const size = level <= 2 ? 3 : level <= 4 ? 4 : 5
  const count = [3, 4, 5, 7, 9][level - 1]
  const on = new Set(rng.sample(Array.from({ length: size * size }, (_, i) => i), count))
  const rows = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => (on.has(r * size + c) ? '●' : '·')))
  const display = memorize(secs(level, count, 1.3), 'Запомните, в каких клетках стоят точки.', { type: 'grid', rows })
  const pic = rows.map((r) => r.join(' ')).join('\n')
  const perRow = rows.map((r) => r.filter((x) => x === '●').length)
  const t = index % 3
  if (t === 0) {
    const r = rng.int(0, size - 1)
    return numeric(`Сколько точек было в ${r + 1}-й строке сверху?`, perRow[r], 'Запоминайте узор — фигуру, которую образуют точки.', [`Поле:\n${pic}`, `В ${r + 1}-й строке — ${perRow[r]}.`], `r:${pic}:${r}`, { display })
  }
  if (t === 1) {
    const cell = rng.int(0, size * size - 1)
    const r = Math.floor(cell / size) + 1
    const c = (cell % size) + 1
    const yes = on.has(cell)
    return choice(`Была ли точка в клетке: строка ${r}, столбец ${c}?`, yes ? 'Да' : 'Нет', [yes ? 'Нет' : 'Да'], rng, 'Узнавайте в узоре знакомые фигуры: уголок, диагональ, буква.', [`Поле:\n${pic}`, `В строке ${r}, столбце ${c} ${yes ? 'была точка' : 'точки не было'}.`], `c:${pic}:${cell}`, { display }, 2)
  }
  const max = Math.max(...perRow)
  if (perRow.filter((x) => x === max).length > 1) return null
  const best = perRow.indexOf(max)
  return choice('В какой строке было больше всего точек?', `${best + 1}-я`, rows.map((_, j) => `${j + 1}-я`).filter((_, j) => j !== best), rng, 'Считайте точки по строкам во время показа.', [`Поле:\n${pic}`, `Точек по строкам: ${perRow.join(', ')}. Больше всего — в ${best + 1}-й.`], `m:${pic}`, { display }, Math.min(4, size))
}

const make = (module: ModuleGenerator['module'], fn: (level: Level, rng: Rng, index: number) => Draft | null): ModuleGenerator => ({ module, targets: T, make: fn })

export const MEMORY_SCENE_GENERATORS: ModuleGenerator[] = [
  make('shopping', shopping),
  make('route', route),
  make('schedule', schedule),
  make('story', story),
  make('scene', scene),
  make('cards', cards),
  make('citymap', citymap),
  make('dots', dots),
]
