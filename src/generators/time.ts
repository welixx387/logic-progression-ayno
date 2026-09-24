import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { clock, collect, plural, withOptions, type Draft, type ModuleGenerator } from './util.ts'

const DAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
/** Род названия дня: для «был / была / было». */
const DAY_GENDER = ['m', 'm', 'f', 'm', 'f', 'f', 'n']
const PAST = { m: 'был', f: 'была', n: 'было' } as const

const day = (i: number) => DAYS[((i % 7) + 7) % 7]
const past = (i: number) => PAST[DAY_GENDER[((i % 7) + 7) % 7] as 'm' | 'f' | 'n']

const REL: Record<number, string> = { [-2]: 'позавчера', [-1]: 'вчера', 0: 'сегодня', 1: 'завтра', 2: 'послезавтра' }
const REL_GEN: Record<number, string> = { [-2]: 'позавчерашнего', [-1]: 'вчерашнего', 0: 'сегодняшнего', 1: 'завтрашнего', 2: 'послезавтрашнего' }

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const dayOfYear = (m: number, d: number) => MONTH_DAYS.slice(0, m).reduce((s, x) => s + x, 0) + d

const days = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`
const minutes = (n: number) => `${n} ${plural(n, 'минуту', 'минуты', 'минут')}`
const minutesNom = (n: number) => `${n} ${plural(n, 'минута', 'минуты', 'минут')}`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Как сказать «X был/будет D»: «Вчера была среда», «Завтра будет среда». */
function statement(rel: number, d: number) {
  if (rel < 0) return `${cap(REL[rel])} ${past(d)} ${day(d)}.`
  if (rel === 0) return `Сегодня ${day(d)}.`
  return `${cap(REL[rel])} будет ${day(d)}.`
}

function dayQuestion(rel: number) {
  if (rel < 0) return `Какой день недели был ${REL[rel]}?`
  if (rel === 0) return 'Какой день недели сегодня?'
  return `Какой день недели будет ${REL[rel]}?`
}

function dayChoice(answer: number, rng: Rng) {
  return withOptions(day(answer), rng.shuffle([day(answer + 1), day(answer - 1), day(answer + 2), day(answer - 2), day(answer + 3)]), rng)
}

function timeChoice(answer: number, rng: Rng, typical: number[]) {
  const near = [...typical, answer + 10, answer - 10, answer + 60, answer - 60, answer + 5].map(clock)
  return withOptions(clock(answer), near, rng)
}

function angle(h: number, m: number) {
  const raw = Math.abs(30 * (h % 12) - 5.5 * m)
  return Math.min(raw, 360 - raw)
}

const fmt = (x: number) => String(x).replace('.', ',')

type Template = (rng: Rng) => Draft | null

const L1: Template[] = [
  (rng) => {
    const d = rng.int(0, 6)
    const k = rng.int(2, 9)
    return {
      kind: 'choice',
      prompt: `Сегодня ${day(d)}. Какой день недели будет через ${days(k)}?`,
      ...dayChoice(d + k, rng),
      hint: 'Отсчитайте дни по порядку, начиная с завтрашнего.',
      solution: `Отсчитываем ${days(k)} от дня «${day(d)}»: ${Array.from({ length: k }, (_, i) => day(d + i + 1)).join(' → ')}. Ответ: ${day(d + k)}.`,
      key: `l1a:${d}:${k}`,
    }
  },
  (rng) => {
    const start = rng.int(7, 20) * 60 + rng.int(2, 11) * 5
    const add = rng.int(3, 11) * 5
    const end = start + add
    return {
      kind: 'choice',
      prompt: `Сейчас ${clock(start)}. Который час будет через ${minutes(add)}?`,
      ...timeChoice(end, rng, [end - 60]),
      hint: 'До ближайшего целого часа сколько минут? Остаток прибавьте к следующему часу.',
      solution:
        Math.floor(end / 60) > Math.floor(start / 60)
          ? `До ${clock(Math.ceil(start / 60) * 60)} остаётся ${minutes(60 - (start % 60))}, ещё ${minutes(add - (60 - (start % 60)))} — получаем ${clock(end)}.`
          : `${start % 60} + ${add} = ${end % 60} минут, час не меняется: ${clock(end)}.`,
      key: `l1b:${start}:${add}`,
    }
  },
  (rng) => {
    const d = rng.int(0, 6)
    const [x, y] = rng.pick([
      [-1, 1],
      [1, -1],
      [0, 2],
      [0, -2],
    ])
    return {
      kind: 'choice',
      prompt: `${statement(x, d)} ${dayQuestion(y)}`,
      ...dayChoice(d + y - x, rng),
      hint: 'Сначала определите, какой день сегодня.',
      solution: `${statement(x, d)} Значит, сегодня ${day(d - x)}. ${cap(REL[y])} — ${day(d + y - x)}.`,
      key: `l1c:${d}:${x}:${y}`,
    }
  },
]

const L2: Template[] = [
  (rng) => {
    const d = rng.int(0, 6)
    const x = rng.pick([-2, -1, 1, 2])
    const y = rng.pick([-2, -1, 0, 1, 2].filter((v) => v !== x && v !== -x))
    const today = d - x
    return {
      kind: 'choice',
      prompt: `${statement(x, d)} ${dayQuestion(y)}`,
      ...dayChoice(today + y, rng),
      hint: 'Сначала определите, какой день сегодня.',
      solution: `Если ${REL[x]} ${x < 0 ? past(d) : 'будет'} ${day(d)}, то сегодня ${day(today)}.${y === 0 ? '' : ` Тогда ${REL[y]} — ${day(today + y)}.`}`,
      key: `l2a:${d}:${x}:${y}`,
    }
  },
  (rng) => {
    const start = rng.int(14, 23) * 60 + rng.int(0, 11) * 5
    const dur = rng.int(2, 9) * 60 + rng.int(1, 11) * 5
    const end = start + dur
    const h = Math.floor(dur / 60)
    const m = dur % 60
    return {
      kind: 'choice',
      prompt: `Поезд отправился в ${clock(start)} и был в пути ${h} ч ${m} мин. Во сколько он прибыл (по тем же часам)?`,
      ...timeChoice(end, rng, [start + h * 60, end - 60, end + 60]),
      hint: 'Прибавьте сначала часы, потом минуты. Не забудьте, что после 23:59 идёт 0:00.',
      solution: `${clock(start)} + ${h} ч = ${clock(start + h * 60)}; ещё ${m} мин — ${clock(end)}.${end >= 1440 ? ' Поезд прибыл уже на следующие сутки.' : ''}`,
      key: `l2b:${start}:${dur}`,
    }
  },
  (rng) => {
    const first = rng.pick([8 * 60, 8 * 60 + 30, 9 * 60])
    const lesson = rng.pick([40, 45])
    const brk = rng.pick([10, 15])
    const k = rng.int(2, 5)
    const end = first + k * lesson + (k - 1) * brk
    return {
      kind: 'choice',
      prompt: `Первый урок начинается в ${clock(first)}. Каждый урок длится ${lesson} минут, каждая перемена — ${brk} минут. Во сколько закончится ${k}-й урок?`,
      ...timeChoice(end, rng, [first + k * (lesson + brk), first + k * lesson, end - brk]),
      hint: `Между ${k} уроками только ${k - 1} ${plural(k - 1, 'перемена', 'перемены', 'перемен')}.`,
      solution: `До конца ${k}-го урока проходит ${k} ${plural(k, 'урок', 'урока', 'уроков')} и ${k - 1} ${plural(k - 1, 'перемена', 'перемены', 'перемен')}: ${k} × ${lesson} + ${k - 1} × ${brk} = ${k * lesson + (k - 1) * brk} минут. ${clock(first)} + ${k * lesson + (k - 1) * brk} мин = ${clock(end)}.`,
      key: `l2c:${first}:${lesson}:${brk}:${k}`,
    }
  },
]

const L3: Template[] = [
  (rng) => {
    const d = rng.int(0, 6)
    const n = rng.int(10, 200)
    return {
      kind: 'choice',
      prompt: `Сегодня ${day(d)}. Какой день недели будет через ${days(n)}?`,
      ...dayChoice(d + n, rng),
      hint: 'Каждые 7 дней день недели повторяется. Найдите остаток от деления на 7.',
      solution: `${n} = 7 × ${Math.floor(n / 7)} + ${n % 7}. Полные недели ничего не меняют, поэтому достаточно сдвинуться на ${days(n % 7)} от дня «${day(d)}». Это ${day(d + n)}.`,
      key: `l3a:${d}:${n}`,
    }
  },
  (rng) => {
    const h = rng.int(1, 11)
    const a = angle(h, 0)
    return {
      kind: 'number',
      prompt: `Какой угол (в градусах) образуют часовая и минутная стрелки ровно в ${h}:00? Укажите меньший из двух углов.`,
      answer: String(a),
      hint: 'Между соседними цифрами на циферблате 360° : 12 = 30°.',
      solution: `Минутная стрелка смотрит на 12, часовая — на ${h}. Между ними ${Math.min(h, 12 - h)} ${plural(Math.min(h, 12 - h), 'деление', 'деления', 'делений')} по 30°: ${Math.min(h, 12 - h)} × 30° = ${a}°.`,
      key: `l3b:${h}`,
    }
  },
  (rng) => {
    const start = rng.int(10, 20) * 60 + rng.int(0, 11) * 5
    const dur = rng.int(70, 190)
    const end = start + dur
    return {
      kind: 'number',
      prompt: `Фильм начался в ${clock(start)} и закончился в ${clock(end)}. Сколько минут он шёл?`,
      answer: String(dur),
      hint: 'Посчитайте минуты до ближайшего целого часа, потом целые часы, потом остаток.',
      solution: `От ${clock(start)} до ${clock(Math.ceil(start / 60) * 60)} — ${Math.ceil(start / 60) * 60 - start} мин, дальше до ${clock(end)} — ещё ${end - Math.ceil(start / 60) * 60} мин. Всего ${minutesNom(dur)}.`,
      key: `l3c:${start}:${dur}`,
    }
  },
]

const L4: Template[] = [
  (rng) => {
    const h = rng.int(1, 11)
    const m = rng.int(1, 29) * 2
    const a = angle(h, m)
    return {
      kind: 'number',
      prompt: `Какой угол (в градусах) образуют часовая и минутная стрелки в ${h}:${String(m).padStart(2, '0')}? Укажите меньший из двух углов.`,
      answer: String(a),
      hint: 'Минутная стрелка проходит 6° в минуту, а часовая — 0,5° в минуту (30° за час).',
      solution: `Минутная стрелка: ${m} × 6° = ${6 * m}° от отметки 12. Часовая: ${h} × 30° + ${m} × 0,5° = ${fmt(30 * h + 0.5 * m)}°. Разница: ${fmt(Math.abs(30 * h + 0.5 * m - 6 * m))}°${Math.abs(30 * h + 0.5 * m - 6 * m) > 180 ? `, меньший угол — 360° − ${fmt(Math.abs(30 * h + 0.5 * m - 6 * m))}° = ${fmt(a)}°` : ''}.`,
      key: `l4a:${h}:${m}`,
    }
  },
  (rng) => {
    const k = rng.int(2, 6)
    const h1 = rng.int(6, 10)
    const hours = rng.int(3, 9)
    const real = (h1 + hours) * 60
    const shown = real - k * hours
    return {
      kind: 'choice',
      prompt: `Часы отстают на ${minutes(k)} каждый час. В ${h1}:00 их поставили точно. Какое время они покажут, когда на самом деле будет ${clock(real)}?`,
      ...timeChoice(shown, rng, [real - k, real + k * hours, real - k * (hours - 1)]),
      hint: 'Сколько часов прошло? За каждый из них часы теряют одно и то же число минут.',
      solution: `Прошло ${hours} ч, за это время часы отстали на ${hours} × ${k} = ${k * hours} мин. Они покажут ${clock(real)} − ${k * hours} мин = ${clock(shown)}.`,
      key: `l4b:${k}:${h1}:${hours}`,
    }
  },
  (rng) => {
    const m1 = rng.int(0, 10)
    const d1 = rng.int(1, MONTH_DAYS[m1])
    const m2 = m1 + 1
    const d2 = rng.int(1, MONTH_DAYS[m2])
    const wd = rng.int(0, 6)
    const diff = dayOfYear(m2, d2) - dayOfYear(m1, d1)
    return {
      kind: 'choice',
      prompt: `Год невисокосный. ${d1} ${MONTHS_GEN[m1]} — ${day(wd)}. Какой день недели будет ${d2} ${MONTHS_GEN[m2]}?`,
      ...dayChoice(wd + diff, rng),
      hint: `Сколько дней в месяце «${MONTHS[m1]}»? Посчитайте разницу в днях и возьмите остаток от деления на 7.`,
      solution: `В месяце «${MONTHS[m1]}» ${MONTH_DAYS[m1]} ${plural(MONTH_DAYS[m1], 'день', 'дня', 'дней')}. От ${d1} ${MONTHS_GEN[m1]} до ${d2} ${MONTHS_GEN[m2]} проходит ${MONTH_DAYS[m1] - d1} + ${d2} = ${days(diff)}. ${diff} = 7 × ${Math.floor(diff / 7)} + ${diff % 7}, значит, сдвигаемся на ${days(diff % 7)}: ${day(wd + diff)}.`,
      key: `l4c:${m1}:${d1}:${d2}:${wd}`,
    }
  },
]

const L5: Template[] = [
  (rng) => {
    const d = rng.int(0, 6)
    const x = rng.pick([-2, -1, 1, 2])
    const k = rng.int(2, 6)
    const after = rng.chance(0.5)
    const shift = x + (after ? k : -k)
    if (shift === 0) return null
    const today = d - shift
    return {
      kind: 'choice',
      prompt: `Если от ${REL_GEN[x]} дня отсчитать ${days(k)} ${after ? 'вперёд' : 'назад'}, получится ${day(d)}. Какой день недели сегодня?`,
      ...dayChoice(today, rng),
      hint: 'Переведите всё в сдвиги относительно сегодняшнего дня: «вчера» — это −1, «послезавтра» — +2.',
      solution: `${cap(REL[x])} — это сдвиг ${x > 0 ? '+' : '−'}${Math.abs(x)} от сегодня. ${days(k)} ${after ? 'вперёд' : 'назад'} от него — сдвиг ${shift > 0 ? '+' : '−'}${Math.abs(shift)}. Значит, сегодня на ${days(Math.abs(shift))} ${shift > 0 ? 'раньше' : 'позже'}, чем ${day(d)}: ${day(today)}.`,
      key: `l5a:${d}:${x}:${k}:${after}`,
    }
  },
  (rng) => {
    const h = rng.int(1, 11)
    const m = rng.int(1, 59)
    if (m % 2 === 0) return null
    const a = angle(h, m)
    const raw = Math.abs(30 * h + 0.5 * m - 6 * m)
    return {
      kind: 'number',
      prompt: `Какой угол (в градусах) образуют часовая и минутная стрелки в ${h}:${String(m).padStart(2, '0')}? Укажите меньший из двух углов.`,
      answer: String(a),
      accept: [fmt(a)],
      hint: 'Минутная стрелка проходит 6° в минуту, часовая — 0,5° в минуту. Ответ может быть дробным.',
      solution: `Минутная стрелка: ${m} × 6° = ${6 * m}°. Часовая: ${h} × 30° + ${m} × 0,5° = ${fmt(30 * h + 0.5 * m)}°. Разница: ${fmt(raw)}°${raw > 180 ? `, меньший угол — 360° − ${fmt(raw)}° = ${fmt(a)}°` : ''}.`,
      key: `l5b:${h}:${m}`,
    }
  },
  (rng) => {
    const m1 = rng.int(0, 9)
    // 13-е число месяца m1 — пятница; ищем следующий месяц с пятницей 13-го.
    const base = dayOfYear(m1, 13)
    let next = -1
    for (let m = m1 + 1; m < 12; m++) {
      if ((dayOfYear(m, 13) - base) % 7 === 0) {
        next = m
        break
      }
    }
    if (next < 0) return null
    const steps = Array.from({ length: next - m1 }, (_, i) => m1 + i)
    const later = rng.shuffle(MONTHS.slice(m1 + 1).filter((x) => x !== MONTHS[next]))
    const distractors = [...later, ...MONTHS.slice(0, m1)]
    return {
      kind: 'choice',
      prompt: `Год невисокосный. 13 ${MONTHS_GEN[m1]} — пятница. В каком ближайшем месяце этого года 13-е число снова выпадет на пятницу?`,
      ...withOptions(MONTHS[next], distractors, rng),
      hint: 'От 13-го числа одного месяца до 13-го следующего проходит столько дней, сколько в первом месяце. Следите за остатком от деления на 7.',
      solution: `За месяц день недели сдвигается на остаток от деления числа дней в месяце на 7 (31 → +3, 30 → +2, 28 → 0). Складываем сдвиги по модулю 7:\n${steps
        .map((m, i) => {
          const shift = (dayOfYear(m + 1, 13) - base) % 7
          return `• 13 ${MONTHS_GEN[m + 1]}: общий сдвиг +${shift} → ${day(4 + shift)}${i === steps.length - 1 ? ' ✓' : ''}`
        })
        .join('\n')}\nОтвет: ${MONTHS[next]}.`,
      key: `l5c:${m1}`,
    }
  },
  (rng) => {
    const k = rng.pick([2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20])
    const fast = rng.chance(0.5)
    return {
      kind: 'number',
      prompt: `Обычные стрелочные часы ${fast ? 'спешат' : 'отстают'} на ${minutes(k)} в сутки. Их поставили точно. Через сколько суток они впервые снова покажут точное время?`,
      answer: String(720 / k),
      hint: 'Стрелочные часы показывают одно и то же через каждые 12 часов.',
      solution: `Стрелочные часы снова покажут верное время, когда ${fast ? 'убегут вперёд' : 'отстанут'} ровно на 12 часов = 720 минут. 720 : ${k} = ${720 / k} суток.`,
      key: `l5d:${k}:${fast}`,
    }
  },
]

const TEMPLATES: Record<Level, Template[]> = { 1: L1, 2: L2, 3: L3, 4: L4, 5: L5 }

export const timeGenerator: ModuleGenerator = {
  module: 'time',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: (level, rng, index) => {
    const list = TEMPLATES[level]
    return list[index % list.length](rng)
  },
}

export function time(): Task[] {
  return collect(timeGenerator)
}
