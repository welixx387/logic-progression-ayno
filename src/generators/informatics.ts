import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, plural, withOptions, type Draft, type ModuleGenerator } from './util.ts'
import { sup } from './algebra.ts'

/** Информатика 7–11 классов: уровень 1 = 7 класс. Ответы вычисляются. */

const num = (prompt: string, answer: number, hint: string, solution: string, key: string): Draft => ({ kind: 'number', prompt, answer: String(answer), hint, solution, key })

function grade7(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const k = rng.int(2, 64)
    const pair = rng.pick([
      ['байтах', 'бит', 8, '1 байт = 8 бит'],
      ['Кбайтах', 'байт', 1024, '1 Кбайт = 1024 байта'],
      ['Мбайтах', 'Кбайт', 1024, '1 Мбайт = 1024 Кбайт'],
    ] as const)
    return num(`Сколько ${pair[1]} в ${k} ${pair[0]}?`, k * pair[2], `${pair[3]}.`, `${pair[3]}, поэтому ${k} · ${pair[2]} = ${k * pair[2]} ${pair[1]}.`, `unit:${pair[0]}:${k}`)
  }
  if (t === 1) {
    const chars = rng.pick([64, 128, 256, 512, 1024, 2048, 100, 300])
    const bits = rng.pick([8, 16])
    const bytes = (chars * bits) / 8
    return num(
      `Текст из ${chars} символов записан в кодировке, где каждый символ занимает ${bits} бит. Каков информационный объём текста в байтах?`,
      bytes,
      'Объём = количество символов · бит на символ. Затем переведите биты в байты.',
      `${chars} · ${bits} = ${chars * bits} бит = ${chars * bits} : 8 = ${bytes} байт.`,
      `text:${chars}:${bits}`,
    )
  }
  if (t === 2) {
    const kb = rng.pick([1, 2, 4, 8, 16])
    const bits = rng.pick([8, 16])
    const chars = (kb * 1024 * 8) / bits
    return num(
      `Сколько символов можно записать в ${kb} Кбайт, если каждый символ занимает ${bits} бит?`,
      chars,
      'Переведите объём в биты и разделите на число бит на символ.',
      `${kb} Кбайт = ${kb * 1024} байт = ${kb * 1024 * 8} бит. ${kb * 1024 * 8} : ${bits} = ${chars} ${plural(chars, 'символ', 'символа', 'символов')}.`,
      `chars:${kb}:${bits}`,
    )
  }
  const pages = rng.int(2, 10)
  const lines = rng.pick([32, 40, 64])
  const perLine = rng.pick([32, 50, 64])
  const total = pages * lines * perLine
  return num(
    `В тексте ${pages} страниц, на каждой ${lines} строк по ${perLine} ${plural(perLine, 'символу', 'символа', 'символов')}. Каждый символ занимает 1 байт. Сколько байт занимает текст?`,
    total,
    'Посчитайте общее число символов.',
    `${pages} · ${lines} · ${perLine} = ${total} символов = ${total} байт.`,
    `pages:${pages}:${lines}:${perLine}`,
  )
}

function grade8(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const x = rng.int(5, 127)
    return {
      kind: 'text',
      prompt: `Переведите число ${x} из десятичной системы счисления в двоичную.`,
      answer: x.toString(2),
      hint: 'Делите число на 2 и записывайте остатки в обратном порядке.',
      solution: `${x} = ${x
        .toString(2)
        .split('')
        .map((b, i, arr) => (b === '1' ? `2${sup(arr.length - 1 - i)}` : null))
        .filter(Boolean)
        .join(' + ')}, в двоичной системе: ${x.toString(2)}.`,
      key: `d2b:${x}`,
    }
  }
  if (t === 1) {
    const x = rng.int(5, 255)
    return num(
      `Переведите двоичное число ${x.toString(2)}₂ в десятичную систему.`,
      x,
      'Каждая цифра — это степень двойки: справа налево 1, 2, 4, 8, 16…',
      `${x
        .toString(2)
        .split('')
        .map((b, i, arr) => (b === '1' ? String(2 ** (arr.length - 1 - i)) : null))
        .filter(Boolean)
        .join(' + ')} = ${x}.`,
      `b2d:${x}`,
    )
  }
  if (t === 2) {
    const x = rng.int(20, 255)
    const ones = x.toString(2).split('').filter((b) => b === '1').length
    return num(`Сколько единиц в двоичной записи числа ${x}?`, ones, 'Сначала переведите число в двоичную систему.', `${x} = ${x.toString(2)}₂, единиц: ${ones}.`, `ones:${x}`)
  }
  const a = rng.int(0, 1)
  const b = rng.int(0, 1)
  const c = rng.int(0, 1)
  const exprs: [string, (a: number, b: number, c: number) => number][] = [
    ['(A ∧ ¬B) ∨ C', (a, b, c) => Number((a && !b) || c)],
    ['¬(A ∨ B) ∧ C', (a, b, c) => Number(!(a || b) && c)],
    ['(A ∨ B) ∧ ¬C', (a, b, c) => Number((a || b) && !c)],
    ['A ∧ (B ∨ ¬C)', (a, b, c) => Number(a && (b || !c))],
    ['¬A ∨ (B ∧ C)', (a, b, c) => Number(!a || (b && c))],
  ]
  const [text, f] = rng.pick(exprs)
  return num(
    `Найдите значение логического выражения ${text} при A = ${a}, B = ${b}, C = ${c}. (∧ — «И», ∨ — «ИЛИ», ¬ — «НЕ»)`,
    f(a, b, c),
    'Сначала выполните отрицание, затем «И», затем «ИЛИ». Скобки — в первую очередь.',
    `Подставим значения: ${text.replace(/A/g, String(a)).replace(/B/g, String(b)).replace(/C/g, String(c))} = ${f(a, b, c)}.`,
    `logic:${text}:${a}${b}${c}`,
  )
}

function grade9(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const size = rng.int(3, 200)
    const i = Math.ceil(Math.log2(size))
    return num(
      `Алфавит содержит ${size} ${plural(size, 'различный символ', 'различных символа', 'различных символов')}. Какое наименьшее количество бит нужно, чтобы закодировать каждый символ одинаковым числом бит?`,
      i,
      'Нужно, чтобы 2ⁱ ≥ N: подберите наименьшее i.',
      `2${sup(i - 1)} = ${2 ** (i - 1)} < ${size} ≤ ${2 ** i} = 2${sup(i)}, значит, нужно ${i} бит.`,
      `alpha:${size}`,
    )
  }
  if (t === 1) {
    const m = rng.pick([2, 3, 4, 5])
    const k = rng.int(2, m === 2 ? 8 : 4)
    return num(
      `Сколько различных слов длины ${k} можно составить из ${m} букв, если буквы могут повторяться?`,
      m ** k,
      'На каждое место можно поставить любую из букв.',
      `На каждое из ${k} мест — ${m} ${plural(m, 'вариант', 'варианта', 'вариантов')}: ${m}${sup(k)} = ${m ** k}.`,
      `words:${m}:${k}`,
    )
  }
  if (t === 2) {
    const a = rng.int(1, 5)
    const b = rng.int(a + 3, 15)
    const step = rng.pick([1, 2, 3])
    let s = 0
    for (let i = a; i <= b; i++) s += step * i
    return {
      kind: 'number',
      prompt: 'Что выведет программа?',
      display: { type: 'lines', lines: ['s := 0', `нц для i от ${a} до ${b}`, `  s := s + ${step === 1 ? '' : `${step} * `}i`, 'кц', 'вывод s'] },
      answer: String(s),
      hint: 'Цикл перебирает все i от начального до конечного значения включительно.',
      solution: `s = ${step === 1 ? '' : `${step} · (`}${a} + … + ${b}${step === 1 ? '' : ')'} = ${s}.`,
      key: `loop:${a}:${b}:${step}`,
    }
  }
  const n = rng.int(10, 500)
  let k = 0
  let x = n
  while (x > 1) {
    x = Math.floor(x / 2)
    k++
  }
  return {
    kind: 'number',
    prompt: 'Что выведет программа? (div — деление нацело)',
    display: { type: 'lines', lines: [`n := ${n}`, 'k := 0', 'нц пока n > 1', '  n := n div 2', '  k := k + 1', 'кц', 'вывод k'] },
    answer: String(k),
    hint: 'Выпишите значения n на каждом шаге.',
    solution: `n меняется так: ${(() => {
      const seq = [n]
      let y = n
      while (y > 1) {
        y = Math.floor(y / 2)
        seq.push(y)
      }
      return seq.join(' → ')
    })()}. Шагов: ${k}.`,
    key: `while:${n}`,
  }
}

function grade10(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const x = rng.int(20, 4095)
    const hex = x.toString(16).toUpperCase()
    if (!/[A-F]/.test(hex)) return null
    const parts = hex.split('').map((d, i) => `${parseInt(d, 16)} · ${16 ** (hex.length - 1 - i)}`)
    return num(`Переведите шестнадцатеричное число ${hex}₁₆ в десятичную систему.`, x, 'Цифры A–F — это 10–15. Разряды: 1, 16, 256…', `${hex}₁₆ = ${parts.join(' + ')} = ${x}.`, `h2d:${x}`)
  }
  if (t === 1) {
    const x = rng.int(9, 511)
    return {
      kind: 'text',
      prompt: `Переведите число ${x} в восьмеричную систему счисления.`,
      answer: x.toString(8),
      hint: 'Делите на 8 и записывайте остатки в обратном порядке. Или переведите в двоичную и разбейте на тройки.',
      solution: `${x} = ${x.toString(2)}₂ = ${x.toString(8)}₈ (тройки двоичных цифр справа налево).`,
      key: `d2o:${x}`,
    }
  }
  if (t === 2) {
    const w = rng.pick([64, 128, 256, 512, 1024])
    const h = rng.pick([64, 128, 256, 512])
    const i = rng.pick([1, 2, 4, 8, 16, 24])
    const kb = (w * h * i) / 8 / 1024
    if (!Number.isInteger(kb)) return null
    return num(
      `Растровое изображение размером ${w}×${h} пикселей, на каждый пиксель отводится ${i} ${plural(i, 'бит', 'бита', 'бит')}. Каков объём изображения в Кбайтах?`,
      kb,
      'Объём = ширина · высота · бит на пиксель. Затем бит → байт → Кбайт.',
      `${w} · ${h} · ${i} = ${w * h * i} бит = ${(w * h * i) / 8} байт = ${kb} Кбайт.`,
      `img:${w}:${h}:${i}`,
    )
  }
  const colors = rng.chance(0.5)
  const i = colors ? rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 16, 24]) : rng.int(2, 16)
  return colors
    ? num(`Сколько цветов можно закодировать, если на пиксель отводится ${i} ${plural(i, 'бит', 'бита', 'бит')}?`, 2 ** i, 'N = 2ⁱ.', `N = 2${sup(i)} = ${2 ** i}.`, `colors:${i}`)
    : num(`Какое наименьшее количество бит на пиксель нужно, чтобы закодировать ${2 ** i} цветов?`, i, 'N = 2ⁱ.', `${2 ** i} = 2${sup(i)}, значит, ${i} ${plural(i, 'бит', 'бита', 'бит')}.`, `bits:${i}`)
}

function grade11(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const kb = rng.pick([128, 256, 512, 1024, 2048, 4096])
    const speed = rng.pick([1024, 2048, 4096, 8192, 16384, 32768])
    const sec = (kb * 1024 * 8) / speed
    if (!Number.isInteger(sec)) return null
    return num(
      `Файл размером ${kb} Кбайт передают по каналу со скоростью ${speed} бит/с. Сколько секунд займёт передача?`,
      sec,
      'Переведите размер файла в биты и разделите на скорость.',
      `${kb} Кбайт = ${kb} · 1024 · 8 = ${kb * 1024 * 8} бит. t = ${kb * 1024 * 8} : ${speed} = ${sec} с.`,
      `send:${kb}:${speed}`,
    )
  }
  if (t === 1) {
    const f = rng.pick([8000, 16000, 11000, 22000])
    const b = rng.pick([8, 16, 24])
    const sec = rng.int(1, 10)
    const ch = rng.pick([1, 2])
    const bytes = (f * b * sec * ch) / 8
    return num(
      `Звук записан ${ch === 1 ? 'в режиме «моно»' : 'в режиме «стерео» (два канала)'} с частотой дискретизации ${f} Гц и глубиной кодирования ${b} бит (${b / 8} ${plural(b / 8, 'байт', 'байта', 'байт')}). Запись длится ${sec} с. Каков её объём в байтах (без сжатия)?`,
      bytes,
      'Объём = частота · глубина · время · число каналов, затем в байты.',
      `${f} · ${b} · ${sec} · ${ch} = ${f * b * sec * ch} бит = ${bytes} байт.`,
      `sound:${f}:${b}:${sec}:${ch}`,
    )
  }
  if (t === 2) {
    const cols = 'ABCD'
    const dr = rng.int(1, 3)
    const dc = rng.int(0, 1)
    const abs = rng.chance(0.4)
    const src = abs ? '=$A$1*B1' : '=A1+B1'
    const target = `${cols[2 + dc]}${1 + dr}`
    const shift = (col: number, row: number) => `${cols[col + dc]}${row + dr}`
    const right = abs ? `=$A$1*${shift(1, 1)}` : `=${shift(0, 1)}+${shift(1, 1)}`
    const wrong = abs ? [`=$A$${1 + dr}*${shift(1, 1)}`, `=A${1 + dr}*${shift(1, 1)}`, '=$A$1*B1', `=$A$1*B${1 + dr}`] : ['=A1+B1', `=A${1 + dr}+B1`, `=${shift(0, 1)}+B1`, `=A${1 + dr}+B${1 + dr}`]
    return {
      kind: 'choice',
      prompt: `В ячейке C1 записана формула ${src}. Её скопировали в ячейку ${target}. Какая формула окажется в ${target}?`,
      ...withOptions(right, rng.shuffle(wrong), rng),
      hint: 'Относительные ссылки сдвигаются вместе с формулой, а ссылки со знаком $ — нет.',
      solution: `Формулу сдвинули на ${dr} ${dr === 1 ? 'строку' : 'строки'} вниз${dc ? ' и на 1 столбец вправо' : ''}. Относительные ссылки сдвигаются так же${abs ? ', а $A$1 остаётся на месте' : ''}: ${right}.`,
      key: `cells:${abs}:${dr}:${dc}`,
    }
  }
  const exprs: [string, (a: boolean, b: boolean, c: boolean) => boolean][] = [
    ['(A ∨ B) ∧ ¬C', (a, b, c) => (a || b) && !c],
    ['A ∧ B ∨ C', (a, b, c) => (a && b) || c],
    ['¬A ∧ (B ∨ C)', (a, b, c) => !a && (b || c)],
    ['(A → B) ∧ C', (a, b, c) => (!a || b) && c],
    ['A ∨ B ∨ C', (a, b, c) => a || b || c],
    ['(A ≡ B) ∨ C', (a, b, c) => a === b || c],
  ]
  const [text, f] = rng.pick(exprs)
  let count = 0
  const rows: string[] = []
  for (let m = 0; m < 8; m++) {
    const a = !!(m & 4)
    const b = !!(m & 2)
    const c = !!(m & 1)
    if (f(a, b, c)) {
      count++
      rows.push(`${+a}${+b}${+c}`)
    }
  }
  return num(
    `Сколько существует наборов значений переменных A, B, C, при которых выражение ${text} истинно? (→ — импликация, ≡ — эквивалентность)`,
    count,
    'Постройте таблицу истинности: у трёх переменных 8 наборов.',
    `Выражение истинно на наборах ABC = ${rows.join(', ')} — всего ${count}.`,
    `truth:${text}`,
  )
}

const GRADES = [grade7, grade8, grade9, grade10, grade11]

function generate(level: Level, rng: Rng, index: number): Draft | null {
  return GRADES[level - 1](rng, index % 4)
}

export const informaticsGenerator: ModuleGenerator = {
  module: 'informatics',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function informatics(): Task[] {
  return collect(informaticsGenerator)
}
