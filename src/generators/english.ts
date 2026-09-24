import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { factDraft, type Fact } from './school.ts'
import { collect, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/**
 * Английский язык 7–11 классов: неправильные глаголы и грамматика —
 * времена, пассив, косвенная речь, условные предложения, герундий и инфинитив,
 * фразовые глаголы, словообразование.
 */

/** Неправильные глаголы: V1, V2, V3, перевод. */
const VERBS: [string, string, string, string][] = [
  ['go', 'went', 'gone', 'идти'],
  ['see', 'saw', 'seen', 'видеть'],
  ['take', 'took', 'taken', 'брать'],
  ['write', 'wrote', 'written', 'писать'],
  ['buy', 'bought', 'bought', 'покупать'],
  ['bring', 'brought', 'brought', 'приносить'],
  ['think', 'thought', 'thought', 'думать'],
  ['catch', 'caught', 'caught', 'ловить'],
  ['teach', 'taught', 'taught', 'учить'],
  ['begin', 'began', 'begun', 'начинать'],
  ['drink', 'drank', 'drunk', 'пить'],
  ['swim', 'swam', 'swum', 'плавать'],
  ['eat', 'ate', 'eaten', 'есть'],
  ['give', 'gave', 'given', 'давать'],
  ['speak', 'spoke', 'spoken', 'говорить'],
  ['break', 'broke', 'broken', 'ломать'],
  ['choose', 'chose', 'chosen', 'выбирать'],
  ['fly', 'flew', 'flown', 'летать'],
  ['know', 'knew', 'known', 'знать'],
  ['forget', 'forgot', 'forgotten', 'забывать'],
  ['ride', 'rode', 'ridden', 'ездить верхом'],
  ['sing', 'sang', 'sung', 'петь'],
  ['wear', 'wore', 'worn', 'носить (одежду)'],
  ['leave', 'left', 'left', 'уходить, оставлять'],
  ['find', 'found', 'found', 'находить'],
  ['build', 'built', 'built', 'строить'],
  ['spend', 'spent', 'spent', 'тратить'],
  ['meet', 'met', 'met', 'встречать'],
  ['sleep', 'slept', 'slept', 'спать'],
  ['tell', 'told', 'told', 'рассказывать'],
  ['sell', 'sold', 'sold', 'продавать'],
  ['win', 'won', 'won', 'побеждать'],
  ['pay', 'paid', 'paid', 'платить'],
]

const g = (q: string, a: string, w: string[], why: string): Fact => ({ q: `Выберите правильный вариант:\n${q}`, a, w, why })

const GAPS: Record<Level, Fact[]> = {
  1: [
    g('She usually ___ to school by bus.', 'goes', ['is going', 'go', 'went'], 'Usually — регулярное действие: Present Simple, для she — окончание -es.'),
    g('Look! The children ___ in the garden.', 'are playing', ['play', 'plays', 'played'], 'Look! — действие происходит сейчас: Present Continuous.'),
    g('He ___ TV every evening.', 'watches', ['watch', 'is watching', 'watching'], 'Every evening — привычка: Present Simple, he → watches.'),
    g('I ___ football yesterday.', 'played', ['play', 'have played', 'am playing'], 'Yesterday — прошлое: Past Simple.'),
    g('My brother is ___ than me.', 'taller', ['more tall', 'tallest', 'the tallest'], 'Короткое прилагательное: сравнительная степень с -er.'),
    g('This book is ___ than that one.', 'more interesting', ['interestinger', 'most interesting', 'the more interesting'], 'Длинное прилагательное: сравнительная степень с more.'),
    g('This is the ___ day of my life.', 'best', ['better', 'goodest', 'most good'], 'Good — better — the best: неправильные формы.'),
    g('How ___ water do you drink a day?', 'much', ['many', 'a few', 'few'], 'Water — неисчисляемое, поэтому much.'),
    g('There aren’t ___ apples left.', 'any', ['some', 'no', 'much'], 'В отрицаниях и вопросах обычно any.'),
  ],
  2: [
    g('I have ___ finished my homework.', 'already', ['yet', 'ago', 'last'], 'Already («уже») ставится между have и V3 в утвердительном предложении.'),
    g('Have you ever ___ to London?', 'been', ['went', 'go', 'being'], 'Present Perfect: have + V3; have been to — «бывать где-то».'),
    g('She ___ in Moscow since 2015.', 'has lived', ['lives', 'lived', 'is living'], 'Since — действие началось в прошлом и продолжается: Present Perfect.'),
    g('I ___ him two days ago.', 'saw', ['have seen', 'see', 'had seen'], 'Ago указывает на точное время в прошлом: Past Simple.'),
    g('Look at those black clouds! It ___ rain.', 'is going to', ['will', 'goes to', 'is'], 'Прогноз по явным признакам — be going to.'),
    g('I think she ___ pass the exam.', 'will', ['is going', 'goes', 'going to'], 'Мнение о будущем (I think) — will.'),
    g('While I ___ dinner, the phone rang.', 'was cooking', ['cooked', 'am cooking', 'have cooked'], 'Длительное действие в прошлом, которое прервали: Past Continuous.'),
    g('He is interested ___ music.', 'in', ['at', 'on', 'of'], 'Устойчивое сочетание: be interested in.'),
    g('Where ___ you yesterday?', 'were', ['was', 'are', 'did'], 'Past Simple глагола to be: you were.'),
  ],
  3: [
    g('The letter ___ yesterday.', 'was sent', ['sent', 'is sent', 'has sent'], 'Письмо не само отправило — его отправили: пассив Past Simple (was + V3).'),
    g('English ___ all over the world.', 'is spoken', ['speaks', 'is speaking', 'spoken'], 'Пассив Present Simple: is + V3.'),
    g('This bridge ___ in 1990.', 'was built', ['built', 'is built', 'has built'], 'Мост построили в 1990 году: пассив Past Simple.'),
    g('If it rains, we ___ at home.', 'will stay', ['would stay', 'stay', 'stayed'], 'Первый тип условных: if + Present Simple, will + V1.'),
    g('If I ___ rich, I would travel around the world.', 'were', ['am', 'will be', 'would be'], 'Второй тип (нереальное настоящее): if + Past Simple; с to be — were.'),
    g('He said that he ___ tired.', 'was', ['is', 'will be', 'be'], 'В косвенной речи после said время сдвигается в прошлое: am → was.'),
    g('She asked me where I ___.', 'lived', ['live', 'do I live', 'did I live'], 'Косвенный вопрос: прямой порядок слов и сдвиг времени.'),
    g('The film was so ___ that we fell asleep.', 'boring', ['bored', 'bore', 'bores'], 'Boring — «скучный» (о том, что вызывает скуку); bored — «скучающий» (о человеке).'),
  ],
  4: [
    g('If I had known about it, I ___ you.', 'would have helped', ['would help', 'will help', 'had helped'], 'Третий тип (нереальное прошлое): if + Past Perfect, would have + V3.'),
    g('I enjoy ___ books.', 'reading', ['to read', 'read', 'to reading'], 'После enjoy — герундий (-ing).'),
    g('She decided ___ a new car.', 'to buy', ['buying', 'buy', 'to buying'], 'После decide — инфинитив с to.'),
    g('I look forward to ___ you.', 'seeing', ['see', 'to see', 'saw'], 'Look forward to + герундий: to здесь предлог.'),
    g('He gave ___ smoking last year.', 'up', ['in', 'out', 'on'], 'Give up — бросить, отказаться от чего-то.'),
    g('Can you look ___ my cat while I’m away?', 'after', ['for', 'at', 'up'], 'Look after — присматривать, заботиться.'),
    g('It’s dark. Please turn ___ the light.', 'on', ['off', 'down', 'over'], 'Turn on — включить; turn off — выключить.'),
    g('I’m used to ___ up early.', 'getting', ['get', 'got', 'be getting'], 'Be used to + герундий — «привык к чему-то».'),
    g('The meeting was put ___ until Monday.', 'off', ['on', 'up', 'in'], 'Put off — отложить.'),
  ],
  5: [
    g('I wish I ___ more free time now.', 'had', ['have', 'will have', 'would have had'], 'Сожаление о настоящем: I wish + Past Simple.'),
    g('If she had studied harder, she ___ a doctor now.', 'would be', ['would have been', 'will be', 'is'], 'Смешанный тип: условие в прошлом (had studied), результат сейчас (now) — would be.'),
    g('He isn’t here. He must ___ the train.', 'have missed', ['miss', 'missed', 'has missed'], 'Уверенное предположение о прошлом: must have + V3.'),
    g('By next June, I ___ from university.', 'will have graduated', ['graduate', 'have graduated', 'graduated'], 'By + момент в будущем — Future Perfect: will have + V3.'),
    g('Hardly ___ home when it started to rain.', 'had I got', ['I had got', 'did I get', 'I got'], 'После hardly в начале предложения — инверсия: had I got.'),
    g('The ___ of the city is growing. (POPULATE)', 'population', ['popular', 'populous', 'populated'], 'Нужно существительное: population — население.'),
    g('She is a very ___ person. (CREATE)', 'creative', ['creation', 'creator', 'creatively'], 'Перед person нужно прилагательное: creative.'),
    g('It’s ___ to swim here. (DANGER)', 'dangerous', ['danger', 'dangerously', 'endanger'], 'После it’s нужно прилагательное: dangerous.'),
    g('I’d rather you ___ smoke here.', 'didn’t', ['don’t', 'won’t', 'not'], 'I’d rather + другой человек + Past Simple.'),
  ],
}

function verbForm(rng: Rng, form: 1 | 2): Draft {
  const i = rng.int(0, VERBS.length - 1)
  const [base, past, part, ru] = VERBS[i]
  const right = form === 1 ? past : part
  const regular = base.endsWith('e') ? `${base}d` : `${base}ed`
  const others = rng.shuffle(VERBS.filter((v) => v[0] !== base).map((v) => v[form]))
  const typical = form === 1 ? [regular, part, `${past}ed`] : [regular, past, `${base}en`]
  return {
    kind: 'choice',
    prompt: `Какая форма ${form === 1 ? 'Past Simple (V2)' : 'Past Participle (V3)'} у глагола «${base}» (${ru})?`,
    ...withOptions(right, [...typical.filter((x) => x !== right && !VERBS.some((v) => v.includes(x) && v[0] !== base)), ...others], rng),
    hint: 'Это неправильный глагол — его формы нужно помнить наизусть.',
    solution: `${base} — ${past} — ${part} (${ru}).`,
    key: `verb:${form}:${base}`,
  }
}

function gap(level: Level, rng: Rng): Draft {
  const i = rng.int(0, GAPS[level].length - 1)
  return factDraft(GAPS[level][i], rng, `gap:${level}:${i}`, 'Определите время или конструкцию по подсказкам в предложении.')
}

function generate(level: Level, rng: Rng, index: number): Draft | null {
  if (level === 1 && index % 3 === 0) return verbForm(rng, 1)
  if (level === 2 && index % 3 === 0) return verbForm(rng, 2)
  return gap(level, rng)
}

export const englishGenerator: ModuleGenerator = {
  module: 'english',
  targets: { 1: 10, 2: 10, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function english(): Task[] {
  return collect(englishGenerator)
}
