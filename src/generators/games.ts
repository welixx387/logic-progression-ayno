import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, plural, withOptions, type Draft, type ModuleGenerator } from './util.ts'

/**
 * Игры двух игроков с выигрышной стратегией: камни, спички, «кто назовёт
 * число», две и три кучки («Ним»), шоколадка. Ответ всегда проверяется
 * полным разбором позиций.
 */

const stones = (n: number) => `${n} ${plural(n, 'камень', 'камня', 'камней')}`
const matches = (n: number) => `${n} ${plural(n, 'спичка', 'спички', 'спичек')}`
const ordinal = ['первой', 'второй', 'третьей']

/** Для каждой позиции 0..max: выигрывает ли тот, кто ходит (normal — взявший последним выигрывает). */
function winTable(max: number, moves: number[], misere: boolean): boolean[] {
  const win: boolean[] = []
  for (let n = 0; n <= max; n++) {
    if (n === 0) {
      // Камней нет: в обычной игре последний камень взял соперник — он и победил.
      win.push(misere)
      continue
    }
    win.push(moves.some((m) => m <= n && !win[n - m]))
  }
  return win
}

/** «от 1 до 4 камней», «1 или 3 камня», «2, 3 или 5 спичек». */
function movesText(moves: number[], frame: 'stones' | 'matches'): string {
  const last = moves[moves.length - 1]
  const [one, few, many] = frame === 'stones' ? ['камень', 'камня', 'камней'] : ['спичку', 'спички', 'спичек']
  if (moves.length > 2 && moves.every((m, i) => m === i + 1)) return `от 1 до ${last} ${many}`
  const list = moves.length === 2 ? `${moves[0]} или ${last}` : `${moves.slice(0, -1).join(', ')} или ${last}`
  return `${list} ${plural(last, one, few, many)}`
}

const losingList = (win: boolean[], upto: number) =>
  win
    .map((w, n) => (!w && n <= upto ? n : null))
    .filter((n): n is number => n !== null)
    .join(', ')

interface Pile {
  n: number
  moves: number[]
  misere: boolean
  frame: 'stones' | 'matches'
}

/** Одна кучка: кто выиграет или сколько взять первым ходом. */
function pileTask(p: Pile, rng: Rng, askMove: boolean): Draft | null {
  const { n, moves, misere, frame } = p
  const win = winTable(n, moves, misere)
  const winning = moves.filter((m) => m <= n && !win[n - m])
  const obj = frame === 'stones' ? stones : matches
  const noun = frame === 'stones' ? 'камней' : 'спичек'
  const last = frame === 'stones' ? 'последний камень' : 'последнюю спичку'
  const rule = misere
    ? `Проигрывает тот, кто возьмёт ${last}.`
    : moves.includes(1)
      ? `Выигрывает тот, кто возьмёт ${last}.`
      : 'Проигрывает тот, кто не может сделать ход.'
  const intro = `На столе ${obj(n)}. Двое по очереди берут ${movesText(moves, frame)}. ${rule}`
  const simple = moves.every((m, i) => m === i + 1)
  const k = moves[moves.length - 1]
  const lose = losingList(win, n)
  const theory = simple
    ? misere
      ? `Проигрышные позиции для того, кто ходит, — когда ${noun} остаётся 1, ${k + 2}, ${2 * k + 3}… (остаток 1 при делении на ${k + 1}): что бы он ни взял, соперник дополнит его ход до ${k + 1} и в конце оставит ему последн${frame === 'stones' ? 'ий камень' : 'юю спичку'}.`
      : `Проигрышные позиции для того, кто ходит, — числа, кратные ${k + 1}: 0, ${k + 1}, ${2 * (k + 1)}… Что бы он ни взял, соперник дополнит ход до ${k + 1}.`
    : `Разберём позиции от меньших к большим. Позиция проигрышная, если любой ход из неё ведёт в выигрышную для соперника, и выигрышная, если есть ход в проигрышную. Проигрышные позиции здесь: ${lose}.`
  if (askMove) {
    if (winning.length !== 1) return null
    const m = winning[0]
    const others = moves.filter((x) => x !== m && x <= n)
    return {
      kind: 'number',
      prompt: `${intro}\n\nСколько ${noun} должен взять первый игрок первым ходом, чтобы выиграть при любой игре соперника?`,
      answer: String(m),
      hint: simple ? `Найдите позиции, из которых нельзя выиграть, — посмотрите на остаток от деления на ${k + 1}.` : 'Выпишите позиции 0, 1, 2, 3… и для каждой отметьте, выигрышная она или проигрышная.',
      solution: `${theory}\n\n${n} — выигрышная позиция. Нужно оставить сопернику ${n - m} — проигрышную позицию, то есть взять ${m}.${others.length ? ` Другие ходы (${others.join(', ')}) оставят сопернику выигрышную позицию.` : ''}`,
      key: `pile:${misere}:${moves.join(',')}:${n}:move`,
    }
  }
  const firstWins = win[n]
  const correct = firstWins ? 'Первый игрок' : 'Второй игрок'
  return {
    kind: 'choice',
    prompt: `${intro}\n\nКто выиграет при правильной игре?`,
    ...withOptions(correct, [firstWins ? 'Второй игрок' : 'Первый игрок'], rng, 2),
    hint: 'Начните с конца: кто выигрывает, если осталось совсем мало? Затем поднимайтесь вверх.',
    solution: `${theory}\n\n${n} — ${firstWins ? `выигрышная позиция: первый игрок берёт ${winning[0]} и оставляет ${n - winning[0]}` : 'проигрышная позиция: любой ход первого игрока даёт выигрышную позицию второму'}. Выигрывает ${correct.toLowerCase()}.`,
    key: `pile:${misere}:${moves.join(',')}:${n}:who`,
  }
}

/** «Кто первым назовёт N»: прибавлять от 1 до k. */
function raceTask(target: number, k: number): Draft | null {
  const r = target % (k + 1)
  if (r === 0) return null
  const upTo = k === 2 ? '1 или 2' : `от 1 до ${k}`
  const keys = []
  for (let x = r; x <= target; x += k + 1) keys.push(x)
  return {
    kind: 'number',
    prompt: `Двое играют в игру: первый называет число ${upTo}, а дальше каждый по очереди прибавляет к последнему названному числу ${upTo} и называет результат. Выигрывает тот, кто назовёт ${target}.\n\nКакое число должен назвать первый игрок в самом начале, чтобы наверняка выиграть?`,
    answer: String(r),
    hint: `Какое число нужно назвать перед ${target}, чтобы соперник не смог сразу дойти до ${target}, а вы — смогли?`,
    solution: `Если вы назвали ${target - (k + 1)}, соперник прибавит ${upTo}, и вы следующим ходом дойдёте до ${target}. Значит, «ключевые» числа идут с шагом ${k + 1}: ${keys.join(', ')}. Первое из них — ${r}. Назвав его, дальше всегда дополняйте ход соперника до ${k + 1}.`,
    key: `race:${k}:${target}`,
  }
}

/** Две кучки, за ход можно взять сколько угодно камней из одной кучки. */
function twoPiles(a: number, b: number, rng: Rng): Draft | null {
  const intro = `Есть две кучки: в первой ${stones(a)}, во второй — ${stones(b)}. За ход можно взять любое количество камней, но только из одной кучки. Выигрывает тот, кто возьмёт последний камень.`
  if (a === b) {
    return {
      kind: 'choice',
      prompt: `${intro}\n\nКто выиграет при правильной игре?`,
      ...withOptions('Второй игрок', ['Первый игрок'], rng, 2),
      hint: 'Что может сделать второй игрок после любого хода первого, если кучки сейчас равны?',
      solution: `Кучки равны. Сколько бы первый ни взял из одной кучки, второй берёт столько же из другой и снова уравнивает кучки. Поэтому последний камень всегда достанется второму. Выигрывает второй игрок.`,
      key: `two:${Math.min(a, b)}:${Math.max(a, b)}`,
    }
  }
  const big = a > b ? 0 : 1
  const d = Math.abs(a - b)
  const move = (take: number, pile: number) => `Взять ${stones(take)} из ${ordinal[pile]} кучки`
  const distract = [move(d, 1 - big), move(Math.max(1, d - 1), big), move(d + 1, big), move(Math.min(a, b), 1 - big), move(Math.max(a, b), big)].filter(
    (t) => t !== move(d, big),
  )
  // Ход из меньшей кучки на d возможен не всегда — отбрасываем невозможные.
  const possible = distract.filter((t) => {
    const m = t.match(/Взять (\d+) .* из (\S+) кучки/)!
    const take = Number(m[1])
    const pile = ordinal.indexOf(m[2])
    return take <= (pile === 0 ? a : b) && !(pile === big && take === d)
  })
  if (new Set(possible).size < 3) return null
  return {
    kind: 'choice',
    prompt: `${intro}\n\nКаким первым ходом первый игрок гарантирует себе победу?`,
    ...withOptions(move(d, big), rng.shuffle(possible), rng),
    hint: 'Хорошая позиция для вас — когда после вашего хода кучки равны.',
    solution: `Нужно уравнять кучки: взять ${stones(d)} из ${ordinal[big]} кучки, чтобы в обеих осталось по ${Math.min(a, b)}. Дальше повторяйте ходы соперника в другой кучке — последний камень будет вашим.`,
    key: `two:${a}:${b}`,
  }
}

/** Шоколадка m×n: число разломов всегда m·n − 1, стратегия не важна. */
function chocolate(m: number, n: number, rng: Rng): Draft {
  const breaks = m * n - 1
  const first = breaks % 2 === 1
  const correct = first ? 'Первый игрок' : 'Второй игрок'
  return {
    kind: 'choice',
    prompt: `Шоколадку ${m}×${n} долек двое разламывают по очереди. За ход берут любой кусок и ломают его по прямой линии между дольками на две части. Проигрывает тот, кто не может сделать ход (все куски — отдельные дольки).\n\nКто выиграет?`,
    ...withOptions(correct, [first ? 'Второй игрок' : 'Первый игрок', 'Зависит от того, как ломать'], rng, 3),
    hint: 'Каждый разлом увеличивает число кусков ровно на 1. Сколько всего будет разломов?',
    solution: `Каждый разлом превращает один кусок в два, то есть добавляет ровно один кусок. Было 1, станет ${m * n} — значит, разломов всегда ${breaks}, как ни ломай. Число ${breaks} ${first ? 'нечётное: последний разлом сделает первый игрок' : 'чётное: последний разлом сделает второй игрок'}. Выигрывает ${correct.toLowerCase()} — и стратегия здесь вообще не важна.`,
    key: `choco:${Math.min(m, n)}:${Math.max(m, n)}`,
  }
}

const binary = (n: number, width: number) => n.toString(2).padStart(width, '0')

/** «Ним» с тремя кучками: выигрышный ход — сделать XOR размеров равным нулю. */
function nim(piles: number[], rng: Rng): Draft | null {
  const x = piles[0] ^ piles[1] ^ piles[2]
  const width = Math.max(...piles).toString(2).length
  const intro = `Есть три кучки камней: ${piles.join(', ')}. За ход можно взять любое количество камней из одной кучки. Выигрывает тот, кто возьмёт последний камень.`
  const table = piles.map((p) => `${String(p).padStart(2)} = ${binary(p, width)}`).join('\n')
  const theory = `Запишем размеры кучек в двоичной системе и сложим «без переноса» (по каждому разряду: чётное число единиц — 0, нечётное — 1):\n${table}\nсумма = ${binary(x, width)}`
  if (x === 0) {
    return {
      kind: 'choice',
      prompt: `${intro}\n\nКто выиграет при правильной игре?`,
      ...withOptions('Второй игрок', ['Первый игрок'], rng, 2),
      hint: 'Запишите размеры кучек в двоичной системе и посмотрите на число единиц в каждом разряде.',
      solution: `${theory}\n\nСумма равна нулю — это проигрышная позиция для того, кто ходит: любой ход сделает сумму ненулевой, а соперник снова вернёт её к нулю. Выигрывает второй игрок.`,
      key: `nim:${piles.slice().sort((a, b) => a - b).join(',')}`,
    }
  }
  const moveText = (pile: number, take: number) => `Взять ${stones(take)} из ${ordinal[pile]} кучки`
  const winning: string[] = []
  const losing: string[] = []
  piles.forEach((p, i) => {
    for (let take = 1; take <= p; take++) {
      const after = piles.map((q, j) => (j === i ? q - take : q))
      ;(after[0] ^ after[1] ^ after[2] ? losing : winning).push(moveText(i, take))
    }
  })
  if (!winning.length || losing.length < 3) return null
  const correct = rng.pick(winning)
  const m = correct.match(/Взять (\d+) .* из (\S+) кучки/)!
  const pile = ordinal.indexOf(m[2])
  const target = piles[pile] ^ x
  return {
    kind: 'choice',
    prompt: `${intro}\n\nКакой ход первого игрока ведёт к победе?`,
    ...withOptions(correct, rng.shuffle(losing), rng),
    hint: 'Выигрышный ход оставляет позицию, в которой двоичная сумма размеров кучек (без переноса) равна нулю.',
    solution: `${theory}\n\nСумма не равна нулю — позиция выигрышная. Нужно оставить сопернику позицию с нулевой суммой. Если ${pile === 1 ? 'во' : 'в'} ${ordinal[pile]} кучке оставить ${target} (${piles[pile]} → ${target}), сумма станет 0. Для этого нужно ${correct.toLowerCase()}. Остальные варианты оставляют ненулевую сумму — и тогда выигрывает соперник.`,
    key: `nim:${piles.join(',')}:${correct}`,
  }
}

/**
 * Размер кучки из диапазона: для вопроса «кто выиграет» примерно в половине
 * случаев берём проигрышную для первого игрока позицию, иначе ответ почти
 * всегда был бы «первый».
 */
function pickN(rng: Rng, min: number, max: number, moves: number[], misere: boolean, askMove: boolean): number {
  const win = winTable(max, moves, misere)
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const wantWin = askMove || rng.chance(0.5)
  const fit = range.filter((n) => win[n] === wantWin)
  return rng.pick(fit.length ? fit : range)
}

function pile(rng: Rng, min: number, max: number, moves: number[], misere: boolean, frame: Pile['frame'], askMove: boolean) {
  return pileTask({ n: pickN(rng, min, max, moves, misere, askMove), moves, misere, frame }, rng, askMove)
}

function generate(level: Level, rng: Rng, index: number): Draft | null {
  const frame = rng.chance(0.5) ? 'stones' : 'matches'
  switch (level) {
    case 1: {
      if (index % 3 === 2) return raceTask(rng.int(10, 30), 2)
      return pile(rng, 4, 21, [1, 2], false, frame, index % 3 === 1)
    }
    case 2: {
      const k = rng.int(3, 5)
      if (index % 3 === 2) return raceTask(rng.int(20, 50), rng.pick([3, 4, 5, 6, 9, 10]))
      return pile(rng, 10, 35, Array.from({ length: k }, (_, i) => i + 1), false, frame, index % 3 === 1)
    }
    case 3: {
      const t = index % 4
      if (t === 0) {
        const k = rng.int(2, 4)
        return pile(rng, 8, 30, Array.from({ length: k }, (_, i) => i + 1), true, frame, rng.chance(0.5))
      }
      if (t === 3) return twoPiles(rng.int(3, 12), rng.int(3, 12), rng)
      const moves = rng.pick([
        [1, 3],
        [1, 4],
        [2, 3],
        [1, 3, 4],
        [1, 2, 4],
        [2, 5],
      ])
      return pile(rng, 9, 24, moves, false, frame, t === 2)
    }
    case 4: {
      const t = index % 4
      if (t === 0) return chocolate(rng.int(2, 9), rng.int(3, 10), rng)
      if (t === 1) return twoPiles(rng.int(5, 25), rng.int(5, 25), rng)
      const moves = rng.pick([
        [1, 3, 4],
        [1, 4, 5],
        [2, 3, 5],
        [1, 2, 6],
        [1, 5, 6],
        [3, 4],
      ])
      return pile(rng, 15, 40, moves, t === 3 && moves.includes(1), frame, rng.chance(0.6))
    }
    case 5: {
      if (index % 4 === 3) {
        const moves = rng.pick([
          [1, 3, 4],
          [2, 3, 7],
          [1, 4, 6],
          [1, 2, 5, 6],
          [3, 5, 7],
        ])
        return pile(rng, 30, 70, moves, rng.chance(0.4) && moves.includes(1), frame, true)
      }
      const piles = [rng.int(3, 15), rng.int(3, 15), rng.int(3, 15)]
      if (new Set(piles).size < 3) return null
      return nim(piles, rng)
    }
  }
}

export const gamesGenerator: ModuleGenerator = {
  module: 'games',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function games(): Task[] {
  return collect(gamesGenerator)
}
