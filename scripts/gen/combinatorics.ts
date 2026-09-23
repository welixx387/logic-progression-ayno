import type { Level, Task } from '../../src/types.ts'
import type { Rng } from '../lib/rng.ts'
import { binom, collect, factorial, permutations, plural, type Draft } from '../lib/util.ts'

interface Made {
  prompt: string
  answer: number
  solution: string
  hint: string
  key: string
}

type Template = (rng: Rng) => Made | null

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const count = (xs: number[], pred: (x: number) => boolean) => xs.filter(pred).length
const digits = (n: number) => String(n).split('').map(Number)

const FRIENDS: [string, string, string][] = [
  ['друг', 'друга', 'друзей'],
  ['школьник', 'школьника', 'школьников'],
  ['турист', 'туриста', 'туристов'],
  ['спортсмен', 'спортсмена', 'спортсменов'],
]

const L1: Template[] = [
  (rng) => {
    const n = rng.int(7, 25)
    const k = rng.int(2, n - 1)
    const p = rng.pick([
      { nom: 'Катя', ins: 'Катей', f: true },
      { nom: 'Лиза', ins: 'Лизой', f: true },
      { nom: 'Миша', ins: 'Мишей', f: false },
      { nom: 'Дима', ins: 'Димой', f: false },
    ])
    return {
      prompt: `В очереди стоят ${n} человек. ${p.nom} — ${k}-${p.f ? 'я' : 'й'} от начала очереди. Какое место занимает ${p.nom}, если считать от конца?`,
      answer: n - k + 1,
      hint: `Сколько человек стоит после ${p.f ? 'неё' : 'него'}?`,
      solution: `Перед ${p.ins} ${k - 1} ${plural(k - 1, 'человек', 'человека', 'человек')}, после — ${n} − ${k} = ${n - k}. От конца ${p.f ? 'она' : 'он'} следующая после этих ${n - k}: ${n - k} + 1 = ${n - k + 1}.`.replace('следующая', p.f ? 'следующая' : 'следующий'),
      key: `q:${n}:${k}`,
    }
  },
  (rng) => {
    if (rng.chance(0.5)) {
      const parts = rng.int(3, 15)
      return {
        prompt: `Бревно распилили на ${parts} ${plural(parts, 'часть', 'части', 'частей')}. Сколько распилов сделали?`,
        answer: parts - 1,
        hint: 'Один распил — две части. Два распила — сколько частей?',
        solution: `Каждый распил добавляет одну часть: из 1 бревна после первого распила — 2 части. Значит, распилов на один меньше, чем частей: ${parts} − 1 = ${parts - 1}.`,
        key: `cut:${parts}`,
      }
    }
    const cuts = rng.int(3, 15)
    return {
      prompt: `Бревно распилили, сделав ${cuts} ${plural(cuts, 'распил', 'распила', 'распилов')}. Сколько получилось частей?`,
      answer: cuts + 1,
      hint: 'Один распил — две части.',
      solution: `Частей всегда на одну больше, чем распилов: ${cuts} + 1 = ${cuts + 1}.`,
      key: `cuts:${cuts}`,
    }
  },
  (rng) => {
    const d = rng.pick([2, 3, 4, 5, 10])
    const s = rng.int(3, 10)
    return {
      prompt: `Вдоль дорожки длиной ${d * s} м поставили столбики через каждые ${d} м — от самого начала дорожки до самого конца. Сколько столбиков поставили?`,
      answer: s + 1,
      hint: 'Нарисуйте короткую дорожку, например из двух промежутков, и посчитайте столбики.',
      solution: `Промежутков между столбиками ${d * s} : ${d} = ${s}. Столбиков на один больше, чем промежутков (стоят на обоих концах): ${s} + 1 = ${s + 1}.`,
      key: `post:${d}:${s}`,
    }
  },
  (rng) => {
    const st = rng.int(12, 22)
    const f = rng.int(3, 9)
    return {
      prompt: `Чтобы подняться с 1-го этажа на 2-й, нужно пройти ${st} ${plural(st, 'ступеньку', 'ступеньки', 'ступенек')}. Сколько ступенек нужно пройти, чтобы подняться с 1-го этажа на ${f}-й?`,
      answer: st * (f - 1),
      hint: `Сколько лестничных пролётов между 1-м и ${f}-м этажами?`,
      solution: `С 1-го на ${f}-й этаж нужно подняться ${f - 1} раз по ${st} ${plural(st, 'ступеньке', 'ступеньки', 'ступенек')} (а не ${f}!): ${f - 1} × ${st} = ${st * (f - 1)}.`,
      key: `stairs:${st}:${f}`,
    }
  },
]

const L2: Template[] = [
  (rng) => {
    const n = rng.int(4, 12)
    return {
      prompt: `Встретились ${n} ${plural(n, 'друг', 'друга', 'друзей')}, и каждый пожал руку каждому другому по одному разу. Сколько всего было рукопожатий?`,
      answer: (n * (n - 1)) / 2,
      hint: 'Каждый пожимает руку всем остальным. Но одно рукопожатие — это двое людей.',
      solution: `Каждый из ${n} пожал руку ${n - 1} остальным: ${n} × ${n - 1} = ${n * (n - 1)}. Но так каждое рукопожатие посчитано дважды, поэтому делим на 2: ${(n * (n - 1)) / 2}.`,
      key: `hs:${n}`,
    }
  },
  (rng) => {
    const [a, b, c] = [rng.int(2, 6), rng.int(2, 5), rng.int(2, 4)]
    return {
      prompt: `У Оли ${a} ${plural(a, 'футболка', 'футболки', 'футболок')}, ${b} ${plural(b, 'юбка', 'юбки', 'юбок')} и ${c} ${plural(c, 'пара', 'пары', 'пар')} кед. Сколько разных комплектов «футболка + юбка + кеды» она может составить?`,
      answer: a * b * c,
      hint: 'К каждой футболке можно подобрать любую юбку, а к каждой такой паре — любые кеды.',
      solution: `Правило умножения: ${a} × ${b} × ${c} = ${a * b * c}.`,
      key: `outfit:${a}:${b}:${c}`,
    }
  },
  (rng) => {
    const ds = rng.sample(range(1, 9), rng.int(2, 4)).sort()
    const total = count(range(10, 99), (n) => digits(n).every((d) => ds.includes(d)))
    return {
      prompt: `Сколько разных двузначных чисел можно записать с помощью цифр ${ds.join(', ')}, если цифры в числе могут повторяться?`,
      answer: total,
      hint: 'Сколько вариантов для первой цифры? А для второй?',
      solution: `Первую цифру можно выбрать ${ds.length} способами, вторую — тоже ${ds.length} (повторы разрешены): ${ds.length} × ${ds.length} = ${total}.`,
      key: `two:${ds.join('')}`,
    }
  },
  (rng) => {
    const a = rng.int(5, 60)
    const b = a + rng.int(10, 60)
    return {
      prompt: `Сколько целых чисел от ${a} до ${b} включительно?`,
      answer: b - a + 1,
      hint: 'Проверьте себя на маленьком примере: сколько чисел от 1 до 3?',
      solution: `${b} − ${a} = ${b - a} — это количество «шагов» между числами. Самих чисел на одно больше: ${b - a} + 1 = ${b - a + 1}.`,
      key: `span:${a}:${b}`,
    }
  },
]

const L3: Template[] = [
  (rng) => {
    const n = rng.int(3, 6)
    return {
      prompt: `Сколькими способами ${n} ${plural(n, ...rng.pick(FRIENDS))} могут встать в очередь друг за другом?`,
      answer: factorial(n),
      hint: 'Сколько вариантов, кто будет первым? А вторым, когда первый уже выбран?',
      solution: `Первым может встать любой из ${n}, вторым — любой из ${n - 1} оставшихся и т. д.: ${range(1, n)
        .reverse()
        .join(' × ')} = ${factorial(n)}.`,
      key: `perm:${n}`,
    }
  },
  (rng) => {
    const n = rng.int(4, 12)
    const twice = rng.chance(0.4)
    return {
      prompt: `В турнире ${n} ${plural(n, 'команда', 'команды', 'команд')}. Каждая команда сыграла с каждой ${twice ? 'по два раза (дома и в гостях)' : 'ровно один раз'}. Сколько всего было матчей?`,
      answer: twice ? n * (n - 1) : (n * (n - 1)) / 2,
      hint: 'Это та же задача, что и про рукопожатия.',
      solution: twice
        ? `Каждая из ${n} команд принимала у себя ${n - 1} соперников: ${n} × ${n - 1} = ${n * (n - 1)}.`
        : `Каждая команда сыграла ${n - 1} матчей: ${n} × ${n - 1} = ${n * (n - 1)}, но каждый матч посчитан дважды: ${n * (n - 1)} : 2 = ${(n * (n - 1)) / 2}.`,
      key: `rr:${n}:${twice}`,
    }
  },
  (rng) => {
    const k = rng.int(2, 7)
    return {
      prompt: `В тёмном ящике лежат носки ${k} разных цветов, каждого цвета очень много. Какое наименьшее число носков нужно достать не глядя, чтобы среди них точно оказались два одного цвета?`,
      answer: k + 1,
      hint: 'Представьте самый невезучий случай.',
      solution: `В худшем случае первые ${k} носков окажутся разных цветов. Следующий, ${k + 1}-й, обязательно совпадёт по цвету с одним из них. Это принцип Дирихле.`,
      key: `socks:${k}`,
    }
  },
  (rng) => {
    const s = rng.int(4, 16)
    const nums = range(10, 99).filter((n) => digits(n)[0] + digits(n)[1] === s)
    return {
      prompt: `Сколько существует двузначных чисел, сумма цифр которых равна ${s}?`,
      answer: nums.length,
      hint: 'Переберите первую цифру от 1 до 9 и посмотрите, какой тогда должна быть вторая.',
      solution: `Выпишем их: ${nums.join(', ')}. Всего ${nums.length}.`,
      key: `dsum:${s}`,
    }
  },
]

const WORDS = ['МАМА', 'ПАПА', 'КОКОС', 'БАНАН', 'ЛАМПА', 'РОБОТ', 'ШАЛАШ', 'КАРТА', 'САЛАТ', 'ЛОТО', 'СЛОН', 'КОТ', 'ЗАМОК', 'ВАННА', 'КАССА']

const L4: Template[] = [
  (rng) => {
    const n = rng.int(5, 12)
    return {
      prompt: `Сколько диагоналей у выпуклого ${n}-угольника?`,
      answer: (n * (n - 3)) / 2,
      hint: 'Из каждой вершины диагонали идут ко всем вершинам, кроме самой себя и двух соседних.',
      solution: `Из каждой вершины выходит ${n} − 3 = ${n - 3} ${plural(n - 3, 'диагональ', 'диагонали', 'диагоналей')}. ${n} × ${n - 3} = ${n * (n - 3)}, но каждая диагональ посчитана с двух концов: ${n * (n - 3)} : 2 = ${(n * (n - 3)) / 2}.`,
      key: `diag:${n}`,
    }
  },
  (rng) => {
    const withZero = rng.chance(0.5)
    const ds = [...(withZero ? [0] : []), ...rng.sample(range(1, 9), withZero ? 3 : 4)].sort()
    const total = count(range(100, 999), (n) => {
      const d = digits(n)
      return new Set(d).size === 3 && d.every((x) => ds.includes(x))
    })
    const k = ds.length
    return {
      prompt: `Сколько трёхзначных чисел с разными цифрами можно составить из цифр ${ds.join(', ')}?`,
      answer: total,
      hint: withZero ? 'Осторожно с нулём: число не может с него начинаться.' : 'Сколько вариантов для каждой позиции, если цифры не повторяются?',
      solution: withZero
        ? `Первая цифра — любая, кроме 0: ${k - 1} варианта. Вторая — любая из оставшихся (включая 0): ${k - 1}. Третья: ${k - 2}. Итого ${k - 1} × ${k - 1} × ${k - 2} = ${total}.`
        : `Первая цифра — ${k} вариантов, вторая — ${k - 1}, третья — ${k - 2}: ${k} × ${k - 1} × ${k - 2} = ${total}.`,
      key: `three:${ds.join('')}`,
    }
  },
  (rng) => {
    const word = rng.pick(WORDS)
    const total = new Set(permutations(word.split('')).map((p) => p.join(''))).size
    const counts = [...new Set(word)].map((ch) => [ch, word.split(ch).length - 1] as const)
    const repeated = counts.filter(([, c]) => c > 1)
    return {
      prompt: `Сколько разных «слов» (любых сочетаний букв, не обязательно осмысленных) можно составить, переставляя все буквы слова ${word}?`,
      answer: total,
      hint: 'Если бы все буквы были разными — n! вариантов. А одинаковые буквы при перестановке не дают нового слова.',
      solution: repeated.length
        ? `Всего букв ${word.length}: ${word.length}! = ${factorial(word.length)} перестановок. Но ${repeated
            .map(([ch, c]) => `буква ${ch} повторяется ${c} раза`)
            .join(', ')}, и их перестановки между собой дают то же слово. Делим: ${factorial(word.length)} : (${repeated
            .map(([, c]) => `${c}!`)
            .join(' × ')}) = ${total}.`
        : `Все ${word.length} букв разные: ${word.length}! = ${total}.`,
      key: `anag:${word}`,
    }
  },
  (rng) => {
    const r = rng.int(4, 12)
    const b = rng.int(4, 12)
    const k = rng.int(2, 4)
    if (k > r) return null
    const both = rng.chance(0.5)
    return both
      ? {
          prompt: `В коробке ${r} красных и ${b} синих шаров. Сколько шаров нужно вынуть не глядя, чтобы среди них точно были шары обоих цветов?`,
          answer: Math.max(r, b) + 1,
          hint: 'В худшем случае сначала будут попадаться шары одного цвета. Какого?',
          solution: `Самый невезучий случай — сначала вынуть все ${Math.max(r, b)} шаров более многочисленного цвета. Следующий шар точно будет другого цвета: ${Math.max(r, b)} + 1 = ${Math.max(r, b) + 1}.`,
          key: `balls2:${Math.max(r, b)}`,
        }
      : {
          prompt: `В коробке ${r} красных и ${b} синих шаров. Сколько шаров нужно вынуть не глядя, чтобы среди них точно было ${k} красных?`,
          answer: b + k,
          hint: 'В худшем случае сначала попадутся все шары «не того» цвета.',
          solution: `В худшем случае сначала вынем все ${b} синих, а потом ещё ${k} красных: ${b} + ${k} = ${b + k}.`,
          key: `balls:${r}:${b}:${k}`,
        }
  },
  (rng) => {
    const N = rng.pick([50, 60, 70, 80, 99, 100, 120, 150])
    const d = rng.int(1, 9)
    const total = range(1, N).reduce((s, n) => s + digits(n).filter((x) => x === d).length, 0)
    const units = count(range(1, N), (n) => n % 10 === d)
    const tens = count(range(1, N), (n) => Math.floor(n / 10) % 10 === d)
    const hundreds = total - units - tens
    return {
      prompt: `Сколько раз цифра ${d} встречается при записи всех чисел от 1 до ${N}?`,
      answer: total,
      hint: 'Посчитайте отдельно: сколько раз цифра стоит на месте единиц, а сколько — на месте десятков.',
      solution: `На месте единиц: ${units} раз. На месте десятков: ${tens} раз${hundreds ? `. На месте сотен: ${hundreds}` : ''}. Всего ${total}.`,
      key: `digit:${N}:${d}`,
    }
  },
]

const L5: Template[] = [
  (rng) => {
    const N = rng.int(5, 50) * 10 + rng.int(0, 9)
    const total = range(1, N).reduce((s, n) => s + String(n).length, 0)
    const one = Math.min(N, 9)
    const two = Math.max(0, Math.min(N, 99) - 9)
    const three = Math.max(0, N - 99)
    return {
      prompt: `Сколько цифр понадобится, чтобы пронумеровать все страницы книги с 1-й по ${N}-ю?`,
      answer: total,
      hint: 'Разбейте страницы на однозначные, двузначные и трёхзначные номера.',
      solution: `Однозначных номеров ${one} (по 1 цифре), двузначных — ${two} (по 2)${three ? `, трёхзначных — ${three} (по 3)` : ''}. Всего ${one} + ${two * 2}${three ? ` + ${three * 3}` : ''} = ${total}.`,
      key: `pages:${N}`,
    }
  },
  (rng) => {
    const N = rng.pick([50, 60, 100, 120, 150, 200])
    const [a, b] = rng.pick([
      [2, 3],
      [2, 5],
      [3, 5],
      [3, 4],
      [4, 6],
      [3, 7],
    ])
    const total = count(range(1, N), (n) => n % a === 0 || n % b === 0)
    const lcm = (a * b) / (function g(x: number, y: number): number {
      return y ? g(y, x % y) : x
    })(a, b)
    const ca = Math.floor(N / a)
    const cb = Math.floor(N / b)
    const cab = Math.floor(N / lcm)
    return {
      prompt: `Сколько чисел от 1 до ${N} делятся на ${a} или на ${b} (хотя бы на одно из них)?`,
      answer: total,
      hint: 'Сложите количество кратных каждому числу и вычтите тех, кого посчитали дважды.',
      solution: `Кратных ${a}: ${ca}. Кратных ${b}: ${cb}. Кратных обоим (то есть ${lcm}): ${cab} — их посчитали дважды. ${ca} + ${cb} − ${cab} = ${total}.`,
      key: `ie:${N}:${a}:${b}`,
    }
  },
  (rng) => {
    const m = rng.int(2, 5)
    const n = rng.int(2, 5)
    return {
      prompt: `Прямоугольник разбит на клетки: ${m} клетки в ширину и ${n} в высоту. Сколько существует кратчайших путей по линиям сетки из левого нижнего угла в правый верхний?`,
      answer: binom(m + n, m),
      hint: 'Любой кратчайший путь состоит из одних и тех же шагов «вправо» и «вверх» — различается только порядок.',
      solution: `Любой кратчайший путь — это ${m} шагов вправо и ${n} вверх, всего ${m + n} шагов. Нужно выбрать, какие ${m} из ${m + n} будут «вправо»: C(${m + n}, ${m}) = ${binom(m + n, m)}.`,
      key: `paths:${Math.min(m, n)}:${Math.max(m, n)}`,
    }
  },
  (rng) => {
    const m = rng.int(2, 4)
    const n = rng.int(2, 5)
    const total = binom(m + 1, 2) * binom(n + 1, 2)
    return {
      prompt: `Сколько всего прямоугольников (включая квадраты) можно найти на клетчатой доске ${m} × ${n} клеток? Стороны прямоугольников идут по линиям сетки.`,
      answer: total,
      hint: 'Прямоугольник задаётся парой вертикальных линий и парой горизонтальных.',
      solution: `Вертикальных линий ${m + 1}, из них пару можно выбрать C(${m + 1}, 2) = ${binom(m + 1, 2)} способами. Горизонтальных — ${n + 1}, пару выбираем C(${n + 1}, 2) = ${binom(n + 1, 2)} способами. Итого ${binom(m + 1, 2)} × ${binom(n + 1, 2)} = ${total}.`,
      key: `rect:${Math.min(m, n)}:${Math.max(m, n)}`,
    }
  },
  (rng) => {
    const c = rng.int(3, 6)
    const k = rng.int(3, 5)
    return {
      prompt: `В мешке лежат шарики ${c} цветов, каждого цвета много. Какое наименьшее число шариков нужно вынуть не глядя, чтобы среди них точно оказались ${k} ${plural(k, 'шарик', 'шарика', 'шариков')} одного цвета?`,
      answer: c * (k - 1) + 1,
      hint: 'В худшем случае шарики распределятся по цветам как можно равномернее.',
      solution: `В худшем случае вынем по ${k - 1} ${plural(k - 1, 'шарику', 'шарика', 'шариков')} каждого из ${c} цветов — это ${c} × ${k - 1} = ${c * (k - 1)} шариков, и ${k} одного цвета ещё нет. Следующий шарик даст ${k}-й шарик какого-то цвета: ${c * (k - 1)} + 1 = ${c * (k - 1) + 1}.`,
      key: `pig:${c}:${k}`,
    }
  },
]

const TEMPLATES: Record<Level, Template[]> = { 1: L1, 2: L2, 3: L3, 4: L4, 5: L5 }

export function combinatorics(): Task[] {
  return collect('combinatorics', { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 }, (level, rng, index): Draft | null => {
    const list = TEMPLATES[level]
    const made = list[index % list.length](rng)
    if (!made) return null
    return { kind: 'number', prompt: made.prompt, answer: String(made.answer), hint: made.hint, solution: made.solution, key: made.key }
  })
}
