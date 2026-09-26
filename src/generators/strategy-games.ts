import type { Level } from '../types.ts'
import { sup } from './algebra.ts'
import { big, choice, dec, numeric } from './kit.ts'
import type { Rng } from './rng.ts'
import { plural, type Draft, type ModuleGenerator } from './util.ts'

/** Стратегия: оптимальный поиск, когда остановиться, голосование, справедливый делёж, переговоры, аукционы, сотрудничество, крестики-нолики. */

const T = { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 } as const

const sg = (x: number) => (x < 0 ? `−${-x}` : String(x))

// ——— Оптимальный поиск ———

const RANGES = [16, 20, 30, 32, 50, 64, 100, 128, 200, 500, 1000, 1024, 2000, 10000]
const log2ceil = (n: number) => Math.ceil(Math.log2(n) - 1e-9)

const PLACES = [
  { name: 'Карман куртки', short: 'куртка' },
  { name: 'Рюкзак', short: 'рюкзак' },
  { name: 'Машина', short: 'машина' },
  { name: 'Ящик стола', short: 'ящик' },
  { name: 'Кухня', short: 'кухня' },
]

function search(level: Level, rng: Rng, index: number): Draft | null {
  if (level === 1 || (level === 2 && index % 2 === 0)) {
    const n = rng.pick(RANGES)
    const q = log2ceil(n)
    const frames = [
      `Друг загадал целое число от 1 до ${big(n)}. На вопрос «Твоё число больше X?» он отвечает «да» или «нет». Какого наименьшего числа вопросов хватит, чтобы наверняка узнать число?`,
      `В гирлянде ${big(n)} лампочек, одна перегорела. Проверка показывает, есть ли перегоревшая среди любого выбранного участка подряд. Какого наименьшего числа проверок хватит, чтобы наверняка найти её?`,
      `Программа работала в версии 1 и сломалась к версии ${big(n)}. Каждая проверка версии показывает, есть ли в ней ошибка. Какого наименьшего числа проверок хватит, чтобы наверняка найти версию, где ошибка появилась? (Считайте, что подозрительных версий ${big(n)}.)`,
    ]
    const fi = rng.int(0, level === 1 ? 0 : 2)
    const word = fi === 0 ? (k: number) => plural(k, 'вопрос', 'вопроса', 'вопросов') : (k: number) => plural(k, 'проверка', 'проверки', 'проверок')
    return numeric(frames[fi], q, 'Каждый удачный вопрос делит оставшиеся варианты пополам.', [`Если каждый раз делить варианты пополам, их остаётся: ${big(n)} → ${big(Math.ceil(n / 2))} → ${big(Math.ceil(n / 4))} → …`, `2${sup(q)} = ${big(2 ** q)} ≥ ${big(n)}, а 2${sup(q - 1)} = ${big(2 ** (q - 1))} < ${big(n)}.`, `Значит, нужно ${q} ${word(q)}: меньшим числом не различить все варианты. Это двоичный поиск.`], `b:${fi}:${n}`, { ref: 0 })
  }
  if (level === 2) {
    const n = rng.pick([100, 200, 1000, 60, 80])
    const half = n / 2
    const opts = [`Больше ${half}?`, `Больше ${n / 10}?`, `Это число ${rng.int(2, n - 1)}?`, `Меньше ${n - n / 10}?`, `Делится ли на 5?`]
    return choice(`Друг загадал число от 1 до ${n}. Какой первый вопрос лучше всего, чтобы угадать быстрее (в худшем случае)?`, opts[0], opts.slice(1), rng, 'Хороший вопрос оставляет одинаково много вариантов при любом ответе.', [`«${opts[0]}» при любом ответе оставляет ${half} ${plural(half, 'вариант', 'варианта', 'вариантов')} — половину.`, `Остальные вопросы при неудачном ответе оставляют больше: например, «${opts[1]}» при ответе «да» оставит ${n - n / 10}.`], `h:${n}:${opts[2]}`, { ref: 0 })
  }
  // Поиск с разной вероятностью и ценой проверки: выгоднее всего по убыванию «вероятность / время».
  const k = level <= 3 ? 3 : 4
  const places = rng.sample(PLACES, k)
  const probs = rng.pick(k === 3 ? [[50, 30, 20], [60, 30, 10], [40, 40, 20], [70, 20, 10], [40, 30, 30]] : [[40, 30, 20, 10], [50, 20, 20, 10], [30, 30, 20, 20], [60, 20, 10, 10]])
  const p = rng.shuffle(probs)
  const t = places.map(() => rng.int(1, 6) * (level === 5 ? 10 : 1))
  const ratio = p.map((x, i) => x / t[i])
  if (new Set(ratio).size < k) return null
  const order = places.map((_, i) => i).sort((a, b) => ratio[b] - ratio[a])
  const byProb = places.map((_, i) => i).sort((a, b) => p[b] - p[a])
  const unit = 'мин'
  const display = { type: 'table' as const, head: ['Где', 'Вероятность', 'Время проверки'], rows: places.map((pl, i) => [pl.name, `${p[i]}%`, `${t[i]} ${unit}`]) }
  const steps = [`Считаем «вероятность на минуту»: ${places.map((pl, i) => `${pl.short} ${p[i]} : ${t[i]} = ${dec(ratio[i], 1)}`).join('; ')}.`, `Проверяем по убыванию: ${order.map((i) => places[i].short).join(' → ')}.`, 'Самое вероятное место не всегда стоит проверять первым: если оно далеко, выгоднее сначала быстро проверить близкое.']
  const intro = `Вы потеряли ключи. Они точно в одном из мест в таблице.`
  if (level === 3 || (level === 4 && index % 2 === 0)) {
    if (level === 3 && order[0] === byProb[0] && index % 2 === 1) return null
    return choice(`${intro} Где искать первым, чтобы в среднем найти ключи быстрее всего?`, places[order[0]].name, places.filter((_, i) => i !== order[0]).map((x) => x.name), rng, 'Сравните, сколько процентов вероятности «покупает» каждая минута поиска.', steps, `f:${level}:${places.map((x) => x.short).join(',')}:${p.join(',')}:${t.join(',')}`, { display, ref: 1 }, Math.min(4, k))
  }
  if (level === 4) {
    const orderText = (o: number[]) => o.map((i) => places[i].short).join(' → ')
    const wrong = [byProb, [...order].reverse(), [order[1], order[0], ...order.slice(2)], [order[0], order[2], order[1], ...order.slice(3)]].map(orderText)
    return choice(`${intro} В каком порядке проверять места, чтобы в среднем найти ключи быстрее всего?`, orderText(order), wrong, rng, 'Упорядочьте места по «вероятности на минуту».', steps, `o:${places.map((x) => x.short).join(',')}:${p.join(',')}:${t.join(',')}`, { display, ref: 1 })
  }
  // Среднее время поиска при лучшем порядке.
  let cum = 0
  let e = 0
  const parts: string[] = []
  for (const i of order) {
    cum += t[i]
    e += (p[i] * cum) / 100
    parts.push(`${dec(p[i] / 100, 1)} · ${cum}`)
  }
  if (!Number.isInteger(e)) return null
  return numeric(`${intro} Места проверяют в лучшем порядке. Сколько минут в среднем уйдёт на поиск?`, e, 'Если ключи в месте, проверяемом k-м, время поиска = сумма времён первых k мест.', [steps[0], steps[1], `Среднее время: ${parts.join(' + ')} = ${e} мин.`], `e:${places.map((x) => x.short).join(',')}:${p.join(',')}:${t.join(',')}`, { display, ref: 1 })
}

// ——— Когда остановиться ———

const STOP_FRAMES = [
  { what: 'квартир', verb: 'посмотреть', one: 'квартиру', intro: 'Вы ищете квартиру: смотрите их по одной и решаете сразу — к отказанной не вернуться.' },
  { what: 'кандидатов', verb: 'собеседовать', one: 'кандидата', intro: 'Вы нанимаете сотрудника: собеседуете кандидатов по одному, и ответ нужно дать сразу.' },
  { what: 'мест на парковке', verb: 'проехать', one: 'место', intro: 'Вы едете вдоль улицы и ищете место для парковки ближе к входу; развернуться нельзя.' },
]
const N_OK = [10, 20, 30, 40, 60, 70, 100, 200]

function stopping(level: Level, rng: Rng, index: number): Draft | null {
  if (level === 1 || (level === 2 && index % 2 === 0)) {
    const f = rng.pick(STOP_FRAMES)
    const fi = STOP_FRAMES.indexOf(f)
    const n = rng.pick(N_OK)
    const k = Math.round(n * 0.37)
    return numeric(`${f.intro} Всего будет ${n} ${f.what}. По «правилу 37%»: сначала только смотрите, ничего не выбирая, а потом берите первый вариант лучше всех просмотренных. Сколько первых вариантов нужно пропустить?`, k, 'Примерно 37% от общего числа (это 1/e).', [`37% от ${n} = ${dec(n * 0.37, 1)} ≈ ${k}.`, `Первые ${k} — только для того, чтобы понять, какие варианты бывают. Дальше берём первый, который лучше всех их.`, 'Так лучший вариант выбирается примерно в 37% случаев — больше, чем при любом другом правиле.'], `r:${fi}:${n}`, { ref: 0, ...(Math.round(n / Math.E) !== k ? { accept: [String(Math.round(n / Math.E))] } : {}) })
  }
  if (level === 2 || level === 3) {
    // Моделирование правила: пропустить k, взять первого лучше всех пропущенных.
    const n = level === 2 ? 8 : 10
    const scores = rng.sample(Array.from({ length: 40 }, (_, i) => 50 + i), n)
    const k = level === 2 ? 3 : 4
    const bestSkipped = Math.max(...scores.slice(0, k))
    const pick = scores.slice(k).findIndex((s) => s > bestSkipped)
    const chosen = pick === -1 ? n - 1 : k + pick
    const best = scores.indexOf(Math.max(...scores))
    if (level === 3 && index % 2 === 0) {
      const outcome = pick === -1 ? 'Никто не подошёл — пришлось взять последнего' : chosen === best ? 'Выбран лучший из всех' : 'Выбран не лучший из всех'
      return choice(`Оценки кандидатов по порядку: ${scores.join(', ')}. Правило: первых ${k} только оцениваем, потом берём первого, кто лучше всех из них. Чем закончится выбор?`, outcome, ['Никто не подошёл — пришлось взять последнего', 'Выбран лучший из всех', 'Выбран не лучший из всех'].filter((x) => x !== outcome), rng, `Найдите лучшую оценку среди первых ${k}.`, [`Лучший среди первых ${k}: ${bestSkipped}.`, pick === -1 ? `Дальше никто не превзошёл ${bestSkipped} — лучший был среди пропущенных. Это риск правила.` : `Первый, кто лучше: ${scores[chosen]} (${chosen + 1}-й по счёту).`, `Лучший из всех — ${scores[best]}.`], `o:${scores.join(',')}:${k}`, { ref: 0 }, 3)
    }
    return numeric(`Оценки ${level === 2 ? 'квартир' : 'кандидатов'} по порядку: ${scores.join(', ')}. Правило: первые ${k} только оцениваем, потом берём первый вариант лучше всех из них (если такого нет — последний). Какую оценку получит выбранный вариант?`, scores[chosen], `Найдите лучшую оценку среди первых ${k}.`, [`Лучший среди первых ${k}: ${bestSkipped}.`, pick === -1 ? `Дальше никто не лучше ${bestSkipped}, поэтому берём последний: ${scores[chosen]}.` : `Первый после них, кто лучше ${bestSkipped}: ${scores[chosen]}.`, chosen === best ? 'Это и есть лучший вариант.' : `Лучший был ${scores[best]} — правило не гарантирует успеха, но даёт хороший шанс.`], `s:${scores.join(',')}:${k}`, { ref: 0 })
  }
  // Бросаем кубик несколько раз; можно остановиться и забрать выпавшее. Когда останавливаться?
  const sides = rng.pick([4, 6, 8, 10, 12, 16, 20])
  const throws = level === 4 ? rng.pick([2, 3]) : rng.pick([3, 4])
  // v[j] — ожидаемый выигрыш, если осталось j бросков.
  const v: number[] = [0, (sides + 1) / 2]
  const thr: number[] = [0, 1]
  for (let j = 2; j <= throws; j++) {
    const th = Math.floor(v[j - 1]) + 1
    thr.push(th)
    let e = 0
    for (let x = 1; x <= sides; x++) e += x >= th ? x : v[j - 1]
    v.push(e / sides)
  }
  const t = thr[throws]
  if (index % 2 === 0 || level === 4)
    return numeric(`Вы бросаете кубик с ${sides} гранями (числа от 1 до ${sides}) до ${throws} раз. После любого броска можно остановиться и получить столько монет, сколько выпало; иначе бросок сгорает. При каком наименьшем числе на первом броске стоит остановиться?`, t, 'Решайте с конца: сколько в среднем даст продолжение игры?', [`Если остался 1 бросок, в среднем выпадет ${dec(v[1], 2)}.`, ...thr.slice(2, throws + 1).map((th, j) => `Если осталось ${j + 2} ${plural(j + 2, 'бросок', 'броска', 'бросков')}: останавливаемся при ${th} и больше (это лучше, чем ${dec(v[j + 1], 2)} в среднем от продолжения); средний выигрыш — ${dec(v[j + 2], 2)}.`), `На первом броске из ${throws} останавливаемся при ${t} и больше.`], `d:${sides}:${throws}`, { ref: 1 })
  const x = rng.int(2, sides - 1)
  const stop = x >= t
  return choice(`Вы бросаете кубик с ${sides} гранями до ${throws} раз. После любого броска можно остановиться и получить столько монет, сколько выпало. На первом броске выпало ${x}. Что делать?`, stop ? 'Остановиться' : 'Бросать дальше', ['Остановиться', 'Бросать дальше'].filter((a) => a !== (stop ? 'Остановиться' : 'Бросать дальше')), rng, 'Сравните выпавшее с тем, что в среднем даст продолжение.', [`Если продолжить, осталось ${throws - 1} ${plural(throws - 1, 'бросок', 'броска', 'бросков')}; при правильной игре это в среднем ${dec(v[throws - 1], 2)}.`, `${x} ${stop ? '≥' : '<'} ${dec(v[throws - 1], 2)} — ${stop ? 'останавливаемся' : 'бросаем дальше'}.`], `c:${sides}:${throws}:${x}`, { ref: 1 }, 2)
}

// ——— Голосование и коалиции ———

const PARTIES = ['Зелёные', 'Синие', 'Красные', 'Жёлтые']

function subsets(n: number): number[][] {
  const out: number[][] = []
  for (let m = 1; m < 1 << n; m++) out.push(Array.from({ length: n }, (_, i) => i).filter((i) => m & (1 << i)))
  return out
}

interface Group {
  size: number
  rank: number[]
}

const CAND = ['Анна', 'Борис', 'Вера', 'Глеб']
const CAND_GEN = ['Анны', 'Бориса', 'Веры', 'Глеба']

function voting(level: Level, rng: Rng, index: number): Draft | null {
  if (level <= 2 || (level === 5 && index % 2 === 0)) {
    const n = 4
    const seats = level === 2 ? rng.shuffle([rng.int(25, 50), rng.int(5, 25), rng.int(5, 25), rng.int(5, 25)]) : Array.from({ length: n }, () => rng.int(5, 45))
    const total = seats.reduce((s, x) => s + x, 0)
    // Для вопроса о праве вето — квалифицированное большинство (две трети), иначе вето почти не бывает.
    const quota = level === 2 ? Math.ceil((total * 2) / 3) : Math.floor(total / 2) + 1
    if (seats.some((x) => x >= quota)) return null
    const sum = (c: number[]) => c.reduce((s, i) => s + seats[i], 0)
    const wins = subsets(n).filter((c) => sum(c) >= quota)
    const display = { type: 'table' as const, head: ['Партия', 'Мест'], rows: seats.map((x, i) => [PARTIES[i], String(x)]) }
    const head = `В парламенте ${total} ${plural(total, 'место', 'места', 'мест')}; решение принимается, если за него ${level === 2 ? 'не меньше двух третей голосов — ' : ''}${quota} ${plural(quota, 'голос', 'голоса', 'голосов')} или больше. Партии голосуют целиком.`
    if (level === 1) {
      const pairs = wins.filter((c) => c.length === 2)
      if (index % 2 === 1) {
        const lose = subsets(n).filter((c) => c.length === 2 && sum(c) < quota)
        if (!pairs.length || lose.length < 2) return null
        const w = rng.pick(pairs)
        const name = (c: number[]) => c.map((i) => PARTIES[i]).join(' + ')
        return choice(`${head} Какая коалиция из двух партий сможет принять решение?`, name(w), rng.shuffle(lose).map(name), rng, 'Сложите места партий и сравните с порогом.', [...subsets(n).filter((c) => c.length === 2).map((c) => `${name(c)} = ${sum(c)} ${sum(c) >= quota ? '≥' : '<'} ${quota}`), `Из предложенных большинство есть только у коалиции ${name(w)}.`], `w:${seats.join(',')}:${w.join('')}`, { display, ref: 0 }, Math.min(4, lose.length + 1))
      }
      return numeric(`${head} Сколько существует коалиций ровно из двух партий, способных принять решение?`, pairs.length, 'Переберите все пары и сравните сумму мест с порогом.', [...subsets(n).filter((c) => c.length === 2).map((c) => `${c.map((i) => PARTIES[i]).join(' + ')} = ${sum(c)} ${sum(c) >= quota ? '≥' : '<'} ${quota}`), `Подходящих пар: ${pairs.length}.`], `p:${seats.join(',')}`, { display, ref: 0 })
    }
    // Ключевая партия: без неё выигрышная коалиция проигрывает (индекс Банцафа).
    const crit = seats.map((_, i) => wins.filter((c) => c.includes(i) && sum(c) - seats[i] < quota).length)
    if (level === 2) {
      const veto = seats.map((_, i) => wins.every((c) => c.includes(i)))
      const vi = veto.indexOf(true)
      if (veto.filter(Boolean).length > 1 || (vi === -1 && rng.chance(0.5))) return null
      const answer = vi === -1 ? 'Такой партии нет' : PARTIES[vi]
      return choice(`${head} Какая партия входит в любую коалицию, способную принять решение (то есть может заблокировать любое решение)?`, answer, ['Такой партии нет', ...rng.shuffle(PARTIES.slice(0, n))].filter((x) => x !== answer), rng, 'Проверьте: соберут ли все остальные партии вместе нужное число голосов без неё?', [...seats.map((x, i) => `Без партии «${PARTIES[i]}»: ${total - x} ${total - x >= quota ? '≥' : '<'} ${quota}.`), vi === -1 ? 'Каждую партию можно обойти — права вето нет ни у кого.' : `Без партии «${PARTIES[vi]}» решение не принять — у неё фактически право вето.`], `v:${seats.join(',')}`, { display, ref: 0 }, 4)
    }
    const i = rng.int(0, n - 1)
    // Интересно, когда влияние не пропорционально числу мест.
    if (new Set(crit).size === n && crit.every((c, j) => seats.every((s, k) => (s > seats[j]) === (crit[k] > c) || s === seats[j]))) return null
    return numeric(`${head} Партия «${PARTIES[i]}» — ключевая в коалиции, если без неё коалиция теряет большинство. В скольких выигрышных коалициях эта партия ключевая?`, crit[i], 'Переберите выигрышные коалиции с этой партией и проверьте, хватит ли голосов без неё.', [`Выигрышные коалиции с партией «${PARTIES[i]}»: ${wins.filter((c) => c.includes(i)).map((c) => `${c.map((j) => PARTIES[j]).join(' + ')} (${sum(c)})`).join('; ')}.`, `Без неё большинство теряется в ${crit[i]} из них.`, `Для сравнения — у всех партий: ${seats.map((_, j) => `${PARTIES[j]} ${crit[j]}`).join(', ')}. Влияние не пропорционально числу мест: это индекс Банцафа.`], `b:${seats.join(',')}:${i}`, { display, ref: 1 })
  }
  // Способы подсчёта голосов при одних и тех же предпочтениях.
  const c = 3
  const groups: Group[] = Array.from({ length: rng.int(3, 4) }, () => ({ size: rng.int(2, 12), rank: rng.shuffle([0, 1, 2]) }))
  const total = groups.reduce((s, g) => s + g.size, 0)
  const first = Array.from({ length: c }, (_, k) => groups.filter((g) => g.rank[0] === k).reduce((s, g) => s + g.size, 0))
  const prefers = (a: number, b: number) => groups.filter((g) => g.rank.indexOf(a) < g.rank.indexOf(b)).reduce((s, g) => s + g.size, 0)
  const top = (arr: number[]) => {
    const m = Math.max(...arr)
    return arr.filter((x) => x === m).length === 1 ? arr.indexOf(m) : -1
  }
  const plur = top(first)
  const byFirst = [0, 1, 2].sort((a, b) => first[b] - first[a])
  if (first[byFirst[1]] === first[byFirst[2]] || plur === -1) return null
  const [f1, f2] = byFirst
  if (prefers(f1, f2) * 2 === total) return null
  const runoff = prefers(f1, f2) * 2 > total ? f1 : f2
  const borda = [0, 1, 2].map((k) => groups.reduce((s, g) => s + g.size * (2 - g.rank.indexOf(k)), 0))
  const bord = top(borda)
  if (bord === -1) return null
  const condorcet = [0, 1, 2].find((a) => [0, 1, 2].every((b) => a === b || prefers(a, b) * 2 > total))
  const display = { type: 'table' as const, head: ['Избирателей', '1-е место', '2-е место', '3-е место'], rows: groups.map((g) => [String(g.size), ...g.rank.map((k) => CAND[k])]) }
  const head = `${total} ${plural(total, 'избиратель', 'избирателя', 'избирателей')} выбирают старосту. Каждая группа расставила кандидатов в своём порядке (таблица).`
  const firstLine = `Первых мест: ${[0, 1, 2].map((k) => `${CAND[k]} ${first[k]}`).join(', ')}.`
  const variants: { q: string; a: number; steps: string[]; ref: number }[] = [
    { q: 'Кто победит, если каждый голосует только за своего фаворита и побеждает набравший больше всех?', a: plur, steps: [firstLine, `Больше всех первых мест у ${CAND_GEN[plur]}.`], ref: 2 },
    { q: 'Кто победит в системе с двумя турами: во второй тур выходят двое лидеров по первым местам?', a: runoff, steps: [firstLine, `Во второй тур выходят ${CAND[f1]} и ${CAND[f2]}.`, `${CAND[f1]} выше, чем ${CAND[f2]}, у ${prefers(f1, f2)} из ${total}.`, `Побеждает ${CAND[runoff]}.`], ref: 2 },
    { q: 'Кто победит по правилу Борда: 2 очка за первое место, 1 — за второе, 0 — за третье?', a: bord, steps: [...[0, 1, 2].map((k) => `${CAND[k]}: ${groups.map((g) => `${g.size} · ${2 - g.rank.indexOf(k)}`).join(' + ')} = ${borda[k]}.`), `Больше всех очков у ${CAND_GEN[bord]}.`], ref: 2 },
  ]
  if (condorcet !== undefined) variants.push({ q: 'Какой кандидат побеждает каждого соперника в парном сравнении (победитель Кондорсе)?', a: condorcet, steps: [...[[0, 1], [0, 2], [1, 2]].map(([a, b]) => `${CAND[a]} против ${CAND[b]}: ${prefers(a, b)} : ${prefers(b, a)}.`), `${CAND[condorcet]} выигрывает у обоих.`], ref: 3 })
  // Интересно, когда способы подсчёта дают разных победителей.
  const winners = new Set(variants.map((v) => v.a))
  if (level >= 4 && winners.size < 2) return null
  const pickI = level === 3 ? index % 2 : level === 4 ? 1 + (index % 2) : 1 + (index % (variants.length - 1))
  const v = variants[Math.min(pickI, variants.length - 1)]
  return choice(`${head}\n${v.q}`, CAND[v.a], CAND.slice(0, c).filter((_, k) => k !== v.a), rng, 'Считайте аккуратно по таблице: размер группы — это число голосов.', [...v.steps, winners.size > 1 ? 'Обратите внимание: другие правила подсчёта здесь дают другого победителя — результат выборов зависит от правил.' : ''].filter(Boolean), `e:${groups.map((g) => `${g.size}.${g.rank.join('')}`).join(',')}:${variants.indexOf(v)}`, { display, ref: v.ref }, 3)
}

// ——— Справедливый делёж ———

const NAMES3 = ['Аня', 'Борис', 'Вера']
const GEN3 = ['Ани', 'Бориса', 'Веры']

function fairdiv(level: Level, rng: Rng, index: number): Draft | null {
  if (level === 1) {
    const parts = NAMES3.map(() => rng.int(1, 6) * 100)
    const sum = parts.reduce((s, x) => s + x, 0)
    const mult = rng.int(2, 10)
    const prize = sum * mult
    const i = rng.int(0, 2)
    return numeric(`Аня, Борис и Вера скинулись на лотерейный билет: ${parts.map((x, j) => `${NAMES3[j]} — ${x} ₽`).join(', ')}. Билет выиграл ${big(prize)} ₽. Сколько получит ${NAMES3[i]}, если делить пропорционально взносам?`, parts[i] * mult, 'Сколько рублей выигрыша приходится на каждый вложенный рубль?', [`Всего вложено ${sum} ₽; выигрыш больше вложенного в ${big(prize)} : ${sum} = ${mult} ${plural(mult, 'раз', 'раза', 'раз')}.`, `${NAMES3[i]}: ${parts[i]} · ${mult} = ${big(parts[i] * mult)} ₽.`], `l:${parts.join(',')}:${mult}:${i}`, { ref: 0 })
  }
  if (level === 2) {
    // Такси: каждый участок пути делят поровну те, кто на нём едет.
    const seg = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)].map((x) => x * 6)
    const price = rng.pick([20, 25, 30, 40, 50])
    const cost = seg.map((s) => s * price)
    const pay = [cost[0] / 3, cost[0] / 3 + cost[1] / 2, cost[0] / 3 + cost[1] / 2 + cost[2]]
    const i = index % 3
    const km = [seg[0], seg[0] + seg[1], seg[0] + seg[1] + seg[2]]
    return numeric(`Трое едут на одном такси: Аня выходит через ${km[0]} км, Борис — через ${km[1]} км, Вера — через ${km[2]} км. Километр стоит ${price} ₽. Честно: каждый участок пути оплачивают поровну те, кто на нём едет. Сколько платит ${NAMES3[i]}?`, pay[i], 'Разбейте путь на участки между остановками.', [`Участок 1 (${seg[0]} км, едут трое): ${big(cost[0])} ₽, каждому по ${big(cost[0] / 3)} ₽.`, `Участок 2 (${seg[1]} км, едут двое): ${big(cost[1])} ₽, каждому по ${big(cost[1] / 2)} ₽.`, `Участок 3 (${seg[2]} км, едет одна Вера): ${big(cost[2])} ₽.`, `${NAMES3[i]}: ${big(pay[i])} ₽.`], `t:${seg.join(',')}:${price}:${i}`, { ref: 1 })
  }
  if (level === 3 || (level === 4 && index % 2 === 0)) {
    // Вектор Шепли для двоих: каждый получает своё + половину выгоды от объединения.
    const a = rng.int(2, 20) * 10
    const b = rng.int(2, 20) * 10
    const ab = a + b + rng.int(1, 20) * 20
    const shA = a + (ab - a - b) / 2
    const frames = [`Аня одна за месяц заработает ${a} тыс. ₽, Борис один — ${b} тыс. ₽, а вместе, открыв общее дело, — ${ab} тыс. ₽.`, `Две компании по отдельности получат прибыль ${a} и ${b} млн ₽, а при слиянии — ${ab} млн ₽.`]
    const fi = rng.int(0, 1)
    const who = fi === 0 ? 'Аня' : 'первая компания'
    return numeric(`${frames[fi]} Как честно поделить общий результат по Шепли: каждый получает то, что заработал бы сам, плюс поровну делится выгода от объединения. Сколько получит ${who}?`, shA, 'Выгода объединения = вместе − (первый один + второй один).', [`Выгода объединения: ${ab} − ${a} − ${b} = ${ab - a - b}.`, `Каждому — половина: ${(ab - a - b) / 2}.`, `${who[0].toUpperCase() + who.slice(1)}: ${a} + ${(ab - a - b) / 2} = ${shA}.`], `s:${fi}:${a}:${b}:${ab}`, { ref: 2 })
  }
  if (level === 4) {
    // Процедура Кнастера для двух наследников и одного предмета.
    const va = rng.int(4, 30) * 40
    const vb = rng.int(4, 30) * 40
    if (va === vb) return null
    const [hi, lo] = va > vb ? [0, 1] : [1, 0]
    const vals = [va, vb]
    const payment = (va + vb) / 4
    const who = ['Аня', 'Борис']
    return numeric(`Аня и Борис наследуют дачу. Аня оценивает её в ${big(va)} тыс. ₽, Борис — в ${big(vb)} тыс. ₽. По процедуре Кнастера дача достаётся тому, кто ценит её выше, а он выплачивает другому деньги так, чтобы каждый получил справедливую долю и поровну поделили излишек. Сколько тыс. ₽ заплатит ${who[hi]}?`, payment, 'Справедливая доля каждого — половина его собственной оценки.', [`Справедливые доли (половина своей оценки): ${who[0]} — ${big(va / 2)}, ${who[1]} — ${big(vb / 2)}.`, `Дача достаётся тому, кто ценит её выше: ${who[hi]} (${big(vals[hi])}). Это на ${big(vals[hi] / 2)} больше справедливой доли — столько идёт в общий котёл.`, `Из котла ${who[lo]} получает свою долю: ${big(vals[lo] / 2)}. Остаётся излишек ${big(vals[hi] / 2 - vals[lo] / 2)} — его делят поровну, по ${big((vals[hi] - vals[lo]) / 4)}.`, `Итого ${who[hi]} платит ${big(vals[lo] / 2)} + ${big((vals[hi] - vals[lo]) / 4)} = ${big(payment)} тыс. ₽. Каждый получил больше половины по своей оценке.`], `k:${va}:${vb}`, { ref: 3 })
  }
  // Вектор Шепли для троих: средний вклад по всем порядкам прихода.
  const single = [rng.int(0, 6), rng.int(0, 6), rng.int(0, 6)].map((x) => x * 10)
  const pair = (i: number, j: number) => single[i] + single[j] + [rng.int(0, 6)][0] * 10
  const vAB = pair(0, 1)
  const vAC = pair(0, 2)
  const vBC = pair(1, 2)
  const vAll = Math.max(vAB + single[2], vAC + single[1], vBC + single[0]) + rng.int(1, 6) * 10
  const v = (s: number[]) => {
    const key = [...s].sort().join('')
    return ({ '': 0, '0': single[0], '1': single[1], '2': single[2], '01': vAB, '02': vAC, '12': vBC, '012': vAll } as Record<string, number>)[key]
  }
  const orders = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ]
  const i = rng.int(0, 2)
  const contrib = orders.map((o) => {
    const before = o.slice(0, o.indexOf(i))
    return v([...before, i]) - v(before)
  })
  const sh = contrib.reduce((s, x) => s + x, 0) / 6
  if (!Number.isInteger(sh)) return null
  const display = {
    type: 'table' as const,
    head: ['Кто работает', 'Прибыль, тыс. ₽'],
    rows: [
      ['Аня одна', String(single[0])],
      ['Борис один', String(single[1])],
      ['Вера одна', String(single[2])],
      ['Аня и Борис', String(vAB)],
      ['Аня и Вера', String(vAC)],
      ['Борис и Вера', String(vBC)],
      ['Все трое', String(vAll)],
    ],
  }
  return numeric(`Трое могут работать поодиночке, парами или все вместе (прибыль — в таблице). По Шепли каждому достаётся его средний вклад: представьте, что участники приходят по одному во всех 6 возможных порядках, и усредните, сколько прибыли добавляет приход ${GEN3[i]}. Сколько получит ${NAMES3[i]}?`, sh, 'Для каждого порядка: прибыль после прихода − прибыль до прихода.', [...orders.map((o, k) => `${o.map((j) => NAMES3[j][0]).join('')}: вклад ${sg(contrib[k])}`), `Среднее: (${contrib.join(' + ')}) : 6 = ${sh}.`, 'Сумма долей всех троих равна общей прибыли — делёж получается полным и учитывает вклад каждого.'], `h:${single.join(',')}:${vAB}:${vAC}:${vBC}:${vAll}:${i}`, { display, ref: 2 })
}

// ——— Переговоры ———

const DEALS = [
  { item: 'подержанный велосипед', seller: 'Продавец', buyer: 'Покупатель', unit: '₽', scale: 1000 },
  { item: 'дизайн сайта', seller: 'Дизайнер', buyer: 'Заказчик', unit: '₽', scale: 1000 },
  { item: 'аренду помещения на месяц', seller: 'Владелец', buyer: 'Арендатор', unit: '₽', scale: 1000 },
  { item: 'старую машину', seller: 'Продавец', buyer: 'Покупатель', unit: 'тыс. ₽', scale: 10 },
]

function negotiation(level: Level, rng: Rng, index: number): Draft | null {
  const d = rng.pick(DEALS)
  const di = DEALS.indexOf(d)
  const f = (x: number) => `${big(x)} ${d.unit}`
  if (level === 1) {
    const sMin = rng.int(5, 30) * d.scale
    const bMax = sMin + rng.int(-8, 12) * d.scale
    if (bMax === sMin) return null
    const ok = bMax > sMin
    if (index % 2 === 0)
      return choice(`${d.seller} готов отдать ${d.item} не дешевле ${f(sMin)}. ${d.buyer} готов заплатить не больше ${f(bMax)}. Возможна ли сделка, выгодная обоим?`, ok ? 'Да' : 'Нет', [ok ? 'Нет' : 'Да', 'Зависит от того, кто первым назовёт цену'], rng, 'Сравните нижнюю границу продавца и верхнюю границу покупателя.', [ok ? `${f(bMax)} > ${f(sMin)}: есть зона возможного соглашения от ${f(sMin)} до ${f(bMax)}.` : `${f(bMax)} < ${f(sMin)}: зоны соглашения нет — любая цена не устроит одну из сторон.`], `z:${di}:${sMin}:${bMax}`, { ref: 0 }, 3)
    if (!ok) return null
    return numeric(`${d.seller} готов отдать ${d.item} не дешевле ${f(sMin)}. ${d.buyer} готов заплатить не больше ${f(bMax)}. Какова ширина зоны возможного соглашения (${d.unit})?`, bMax - sMin, 'Зона соглашения — цены, которые устраивают обоих.', [`От ${f(sMin)} до ${f(bMax)}: ширина ${f(bMax - sMin)}.`], `w:${di}:${sMin}:${bMax}`, { ref: 0 })
  }
  if (level === 2) {
    // Граница продавца из его лучшей альтернативы (BATNA) с издержками.
    const alt = rng.int(20, 80) * d.scale
    const extra = rng.int(1, 8) * (d.scale / 2)
    const res = alt - extra
    return numeric(`${d.seller} продаёт ${d.item}. Другой покупатель уже предложил ${f(alt)}, но сделка с ним потребует расходов на ${f(extra)} (доставка, оформление). Какую наименьшую цену продавцу имеет смысл принять в текущих переговорах?`, res, 'Лучшая альтернатива (BATNA) — это то, что вы получите, если переговоры сорвутся.', [`Альтернатива на деле даёт ${f(alt)} − ${f(extra)} = ${f(res)}.`, `Соглашаться на меньшее нет смысла: сорвать переговоры выгоднее. Это точка отказа (резервная цена).`], `b:${di}:${alt}:${extra}`, { ref: 1 })
  }
  if (level === 3 || (level === 4 && index % 2 === 0)) {
    // Середина зоны: стороны делят выгоду поровну.
    const sAlt = rng.int(10, 40) * d.scale
    const sCost = rng.int(0, 4) * (d.scale / 2)
    const bAlt = sAlt + rng.int(4, 20) * d.scale
    const bCost = rng.int(0, 4) * (d.scale / 2)
    const sMin = sAlt - sCost
    const bMax = bAlt + bCost
    const mid = (sMin + bMax) / 2
    if (!Number.isInteger(mid) || (level === 3 && (sCost === 0 || bCost === 0))) return null
    return numeric(`${d.seller} может продать ${d.item} другому за ${f(sAlt)}${sCost ? `, но потратит ${f(sCost)} на оформление` : ''}. ${d.buyer} может купить похожее в другом месте за ${f(bAlt)}${bCost ? `, но потратит ещё ${f(bCost)} на поездку` : ''}. Если стороны делят выгоду от сделки поровну, какой будет цена?`, mid, 'Найдите границы зоны соглашения с учётом расходов, затем её середину.', [`Нижняя граница (продавец): ${f(sAlt)}${sCost ? ` − ${f(sCost)}` : ''} = ${f(sMin)}.`, `Верхняя граница (покупатель): ${f(bAlt)}${bCost ? ` + ${f(bCost)}` : ''} = ${f(bMax)}.`, `Середина: (${big(sMin)} + ${big(bMax)}) : 2 = ${f(mid)}. Каждая сторона выигрывает по ${f((bMax - sMin) / 2)} по сравнению со своей альтернативой.`], `m:${di}:${sAlt}:${sCost}:${bAlt}:${bCost}`, { ref: 2 })
  }
  // Несколько вопросов сразу: уступить в том, что для вас дешевле, а для партнёра дороже.
  const issues = [
    ['Цена', 'Срок оплаты', 'Гарантия'],
    ['Зарплата', 'Удалённая работа', 'Отпуск'],
    ['Цена', 'Срок поставки', 'Объём заказа'],
  ][rng.int(0, 2)]
  const a = issues.map(() => rng.int(1, 9))
  const b = issues.map(() => rng.int(1, 9))
  // Пакеты: каждый вопрос решается в пользу A или B. Очки получает тот, в чью пользу решено.
  const packs = subsets(3)
    .concat([[]])
    .map((toA) => ({ toA, sa: toA.reduce((s, i) => s + a[i], 0), sb: [0, 1, 2].filter((i) => !toA.includes(i)).reduce((s, i) => s + b[i], 0) }))
  const best = packs.reduce((m, p) => (p.sa + p.sb > m.sa + m.sb ? p : m), packs[0])
  if (packs.filter((p) => p.sa + p.sb === best.sa + best.sb).length > 1) return null
  if (best.toA.length === 0 || best.toA.length === 3) return null
  const label = (p: (typeof packs)[number]) => issues.map((x, i) => `${x} — ${p.toA.includes(i) ? 'как хочет A' : 'как хочет B'}`).join('; ')
  const display = { type: 'table' as const, head: ['Вопрос', 'Важность для A', 'Важность для B'], rows: issues.map((x, i) => [x, String(a[i]), String(b[i])]) }
  const others = rng.shuffle(packs.filter((p) => p !== best)).slice(0, 3)
  return choice(`Стороны A и B договариваются по трём вопросам. Каждый вопрос решается в пользу одной из сторон, и она получает указанные очки важности. Какой пакет даёт наибольшую суммарную выгоду обеим сторонам?`, label(best), others.map(label), rng, 'Каждый вопрос отдайте той стороне, для которой он важнее.', [...issues.map((x, i) => `${x}: ${a[i]} против ${b[i]} → ${a[i] > b[i] ? 'A' : 'B'}.`), `Сумма: ${best.sa} + ${best.sb} = ${best.sa + best.sb}.`, 'Обмен уступками по разным вопросам даёт больше, чем торг по каждому отдельно: «пирог» становится больше.'], `p:${issues[0]}:${a.join(',')}:${b.join(',')}`, { display, ref: 3 })
}

// ——— Аукционы ———

const BIDDERS = ['Аня', 'Борис', 'Вера', 'Глеб', 'Даша']
const BIDDERS_GEN = ['Ани', 'Бориса', 'Веры', 'Глеба', 'Даши']
const LOTS = ['картину', 'старинные часы', 'редкую марку', 'автограф футболиста', 'велосипед']

function auctions(level: Level, rng: Rng, index: number): Draft | null {
  const n = level <= 2 ? 3 : 4
  const who = BIDDERS.slice(0, n)
  const step = 100
  const vals = who.map(() => rng.int(10, 60) * step)
  if (new Set(vals).size < n) return null
  const li = rng.int(0, LOTS.length - 1)
  const order = who.map((_, i) => i).sort((a, b) => vals[b] - vals[a])
  const [w, second] = order
  const display = { type: 'table' as const, head: ['Участник', 'Сколько лот стоит для него, ₽'], rows: who.map((x, i) => [x, big(vals[i])]) }
  if (level === 1) {
    if (index % 2 === 0)
      return choice(`Идёт открытый аукцион на ${LOTS[li]}: цену поднимают шагами по ${step} ₽, участник выходит, когда цена превышает ценность лота для него. Кто выиграет?`, who[w], who.filter((_, i) => i !== w), rng, 'Кто остаётся дольше всех?', [`Дольше всех остаётся тот, для кого лот ценнее всего: ${who[w]} (${big(vals[w])} ₽).`], `e:${li}:${vals.join(',')}`, { display, ref: 0 }, n)
    return numeric(`Идёт открытый аукцион на ${LOTS[li]}: цену поднимают шагами по ${step} ₽, участник выходит, когда цена превышает ценность лота для него. Примерно за сколько рублей будет продан лот (назовите цену, на которой выйдет последний соперник)?`, vals[second], 'Торги заканчиваются, когда остаётся один участник.', [`Победит ${who[w]} (${big(vals[w])} ₽), но торги остановятся, когда выйдет ${who[second]} — на ${big(vals[second])} ₽.`, 'Победитель открытого аукциона платит примерно вторую по величине ценность.'], `p:${li}:${vals.join(',')}`, { display, ref: 0 })
  }
  if (level === 2 || level === 3) {
    const bids = vals.map((v) => v - rng.int(0, 5) * step)
    if (new Set(bids).size < n) return null
    const bo = who.map((_, i) => i).sort((a, b) => bids[b] - bids[a])
    const disp = { type: 'table' as const, head: ['Участник', 'Ставка в конверте, ₽'], rows: who.map((x, i) => [x, big(bids[i])]) }
    const first = level === 3 && index % 2 === 1
    const price = first ? bids[bo[0]] : bids[bo[1]]
    return numeric(`Аукцион на ${LOTS[li]} в закрытых конвертах: каждый пишет одну ставку, побеждает наибольшая. ${first ? 'Победитель платит свою ставку (аукцион первой цены).' : 'Победитель платит вторую по величине ставку (аукцион Викри).'} Сколько заплатит победитель?`, price, first ? 'Найдите наибольшую ставку.' : 'Побеждает наибольшая ставка, а цену задаёт следующая за ней.', [`Наибольшая ставка у ${BIDDERS_GEN[BIDDERS.indexOf(who[bo[0]])]} (${big(bids[bo[0]])} ₽).`, first ? `Платит свою ставку: ${big(price)} ₽.` : `Платит вторую ставку: ${big(price)} ₽.`], `${first ? 'f' : 'v'}:${li}:${bids.join(',')}`, { display: disp, ref: 1 })
  }
  if (level === 4 && index % 2 === 0) {
    const v = rng.int(5, 50) * 100
    const kind = rng.pick(['Викри', 'первой цены'] as const)
    const answer = kind === 'Викри' ? `Ровно ${big(v)} ₽` : `Немного меньше ${big(v)} ₽`
    return choice(`Лот стоит для вас ${big(v)} ₽. Какую ставку разумно сделать в закрытом аукционе ${kind === 'Викри' ? 'второй цены (Викри)' : 'первой цены'}?`, answer, [`Ровно ${big(v)} ₽`, `Немного меньше ${big(v)} ₽`, `Больше ${big(v)} ₽, чтобы наверняка выиграть`], rng, 'Подумайте, от чего зависит, сколько вы заплатите при победе.', kind === 'Викри' ? ['В аукционе Викри ставка влияет только на то, выиграете ли вы, а цену задаёт чужая ставка.', `Ставка меньше ${big(v)} может лишить выгодной победы, больше — привести к покупке дороже ценности.`, 'Поэтому честная ставка — лучшая стратегия.'] : ['В аукционе первой цены вы платите свою ставку.', `Ставка ${big(v)} даёт нулевую выгоду даже при победе, поэтому ставят меньше ценности — «подрезают» ставку.`], `t:${v}:${kind}`, { ref: 1 }, 3)
  }
  // Проклятие победителя: истинная ценность — среднее оценок, победитель переоценил.
  const k = level === 4 ? 4 : 5
  const est = Array.from({ length: k }, () => rng.int(20, 80) * 10)
  const mean = est.reduce((s, x) => s + x, 0) / k
  if (!Number.isInteger(mean) || new Set(est).size < k) return null
  const max = Math.max(...est)
  const firms = ['Альфа', 'Бета', 'Гамма', 'Дельта', 'Омега'].slice(0, k)
  const disp = { type: 'table' as const, head: ['Компания', 'Оценка месторождения, млн ₽'], rows: firms.map((x, i) => [x, String(est[i])]) }
  return numeric(`Компании оценивают нефтяное месторождение и делают ставки, равные своим оценкам. Опыт показывает, что настоящая ценность близка к среднему всех оценок. Сколько млн ₽ потеряет победитель, если заплатит свою ставку?`, max - mean, 'Кто выигрывает такой аукцион — тот, кто оценил точнее всех, или тот, кто переоценил сильнее всех?', [`Среднее оценок: (${est.join(' + ')}) : ${k} = ${mean}.`, `Побеждает самая высокая оценка — ${max}.`, `Потеря: ${max} − ${mean} = ${max - mean} млн ₽. Это «проклятие победителя»: побеждает тот, кто сильнее всех ошибся в большую сторону. Поэтому ставку стоит делать ниже своей оценки.`], `c:${est.join(',')}`, { display: disp, ref: 2 })
}

// ——— Сотрудничество: дилемма заключённого ———

interface Pay {
  R: number
  T: number
  S: number
  P: number
}

const PAYS: Pay[] = [
  { R: 3, T: 5, S: 0, P: 1 },
  { R: 4, T: 6, S: 0, P: 1 },
  { R: 3, T: 4, S: 0, P: 1 },
  { R: 5, T: 8, S: 0, P: 2 },
  { R: 4, T: 7, S: 1, P: 2 },
  { R: 6, T: 9, S: 1, P: 3 },
  { R: 4, T: 5, S: 0, P: 1 },
  { R: 6, T: 8, S: 0, P: 3 },
  { R: 3, T: 6, S: 0, P: 1 },
  { R: 5, T: 7, S: 1, P: 3 },
  { R: 7, T: 10, S: 1, P: 4 },
]

const STORIES = [
  { a: 'два соседних кафе', c: 'держать обычные цены', d: 'устроить скидки' },
  { a: 'две страны', c: 'соблюдать договор', d: 'нарушить договор' },
  { a: 'два участника группового проекта', c: 'работать честно', d: 'отлынивать' },
]

type Move = 'С' | 'О'

function cooperation(level: Level, rng: Rng, index: number): Draft | null {
  const pi = rng.int(0, PAYS.length - 1)
  const p = PAYS[pi]
  const st = rng.pick(STORIES)
  const si = STORIES.indexOf(st)
  const rules = `За раунд: оба сотрудничают — по ${p.R}; оба обманывают — по ${p.P}; если один обманул, а другой сотрудничал, — ${p.T} обманщику и ${p.S} честному.`
  const pay = (x: Move, y: Move) => (x === 'С' ? (y === 'С' ? p.R : p.S) : y === 'С' ? p.T : p.P)
  if (level === 1) {
    const display = { type: 'table' as const, head: ['Вы \\ Соперник', 'Сотрудничать', 'Обмануть'], rows: [['Сотрудничать', `${p.R} / ${p.R}`, `${p.S} / ${p.T}`], ['Обмануть', `${p.T} / ${p.S}`, `${p.P} / ${p.P}`]] }
    if (index % 2 === 0)
      return choice(`Это «дилемма заключённого»: ${st.a} выбирают — ${st.c} (сотрудничать) или ${st.d} (обмануть). Очки в клетке: ваши / соперника. Если игра только одна, какой выбор выгоднее для вас, что бы ни сделал соперник?`, 'Обмануть', ['Сотрудничать', 'Зависит от соперника'], rng, 'Сравните по отдельности: соперник сотрудничает — что лучше вам? Соперник обманывает — что лучше вам?', [`Соперник сотрудничает: ${p.T} за обман > ${p.R} за сотрудничество.`, `Соперник обманывает: ${p.P} за обман > ${p.S} за сотрудничество.`, `Обман выгоднее в любом случае. Но если так рассуждают оба, каждый получит по ${p.P}, а могли бы по ${p.R} — в этом и дилемма.`], `o:${pi}:${si}`, { display, ref: 0 }, 3)
    return numeric(`Это «дилемма заключённого»: ${st.a} выбирают — ${st.c} (сотрудничать) или ${st.d} (обмануть). Очки в клетке: ваши / соперника. Сколько очков вместе теряют оба игрока, если оба обманывают, по сравнению с тем, когда оба сотрудничают?`, 2 * (p.R - p.P), 'Сравните суммы очков в клетках «оба сотрудничают» и «оба обманывают».', [`Оба сотрудничают: ${p.R} + ${p.R} = ${2 * p.R}.`, `Оба обманывают: ${p.P} + ${p.P} = ${2 * p.P}.`, `Потеря: ${2 * p.R - 2 * p.P}. Выгодный каждому по отдельности выбор плох для обоих вместе.`], `l:${pi}:${si}`, { display, ref: 0 })
  }
  if (level === 2 || level === 3) {
    // «Око за око» против заданной последовательности ходов соперника.
    const rounds = level === 2 ? 5 : 7
    const opp: Move[] = Array.from({ length: rounds }, () => (rng.chance(0.5) ? 'С' : 'О'))
    const tft: Move[] = opp.map((_, i) => (i === 0 ? 'С' : opp[i - 1]))
    const score = tft.reduce((s, m, i) => s + pay(m, opp[i]), 0)
    const oppScore = tft.reduce((s, m, i) => s + pay(opp[i], m), 0)
    const ask = level === 3 && index % 2 === 1
    return numeric(`${rules}\nВы играете стратегией «Око за око»: в первом раунде сотрудничаете, дальше повторяете прошлый ход соперника. Ходы соперника по раундам (С — сотрудничать, О — обмануть): ${opp.join(', ')}. Сколько очков ${ask ? 'наберёт соперник' : 'вы наберёте'} за ${rounds} раундов?`, ask ? oppScore : score, 'Выпишите свои ходы: первый — С, дальше — ход соперника в прошлом раунде.', [`Ваши ходы: ${tft.join(', ')}.`, `Очки по раундам (ваши / соперника): ${tft.map((m, i) => `${pay(m, opp[i])}/${pay(opp[i], m)}`).join(', ')}.`, `Итого: вы — ${score}, соперник — ${oppScore}.`, '«Око за око» никогда не обыгрывает соперника в отдельной паре, но поощряет сотрудничество и поэтому набирает много в турнирах.'], `t:${pi}:${opp.join('')}:${ask ? 1 : 0}`, { ref: 1 })
  }
  if (index % 2 === (level === 4 ? 0 : 1)) {
    // Когда сотрудничество устойчиво: вероятность продолжения δ ≥ (T − R) / (T − P).
    const th = ((p.T - p.R) / (p.T - p.P)) * 100
    if (!Number.isInteger(th)) return null
    return numeric(`${rules}\nИгра повторяется: после каждого раунда с вероятностью δ будет следующий. Соперник играет «жёстко»: сотрудничает, пока вы сотрудничаете, но после первого обмана обманывает всегда. При какой наименьшей вероятности продолжения (в %) вам выгодно всегда сотрудничать?`, th, 'Сравните: разовый выигрыш от обмана против потерь во всех следующих раундах.', [`Обман даёт ${p.T} − ${p.R} = ${p.T - p.R} сейчас, но дальше каждый раунд приносит ${p.P} вместо ${p.R}: потеря ${p.R - p.P} за раунд.`, `Сотрудничество выгодно, если δ ≥ (T − R) : (T − P) = ${p.T - p.R} : ${p.T - p.P} = ${dec(th / 100, 2)} = ${th}%.`, 'Чем вероятнее будущее общение, тем выгоднее честность — «тень будущего».'], `d:${pi}`, { ref: 2 })
  }
  // Турнир трёх стратегий: каждая играет с каждой (и с копией себя) по 4 раунда.
  const R = 4
  const names = ['Всегда сотрудничать', 'Всегда обманывать', 'Око за око']
  const play = (a: number, b: number) => {
    const ha: Move[] = []
    const hb: Move[] = []
    let sa = 0
    for (let r = 0; r < R; r++) {
      const mv = (s: number, other: Move[]): Move => (s === 0 ? 'С' : s === 1 ? 'О' : r === 0 ? 'С' : other[r - 1])
      const ma = mv(a, hb)
      const mb = mv(b, ha)
      ha.push(ma)
      hb.push(mb)
      sa += pay(ma, mb)
    }
    return sa
  }
  const totals = [0, 1, 2].map((a) => [0, 1, 2].reduce((s, b) => s + play(a, b), 0))
  const i = rng.int(0, 2)
  return numeric(`${rules}\nТурнир: три стратегии — «${names.join('», «')}». Каждая играет по ${R} раунда с каждой из трёх (включая свою копию). Сколько очков всего наберёт «${names[i]}»?`, totals[i], 'Разыграйте три матча этой стратегии по отдельности.', [...[0, 1, 2].map((b) => `Против «${names[b]}»: ${play(i, b)}.`), `Итого: ${totals[i]}. Для сравнения — ${names.map((x, k) => `«${x}» ${totals[k]}`).join(', ')}.`], `r:${pi}:${i}`, { ref: 1 })
}

// ——— Крестики-нолики ———

type Cell = 'X' | 'O' | null
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function won(b: Cell[]): Cell {
  for (const [x, y, z] of LINES) if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x]
  return null
}

const memo = new Map<string, number>()
/** Результат при правильной игре с точки зрения того, кто ходит: 1 — победа, 0 — ничья, −1 — поражение. */
function solve(b: Cell[], me: 'X' | 'O'): number {
  const key = b.map((c) => c ?? '.').join('') + me
  const hit = memo.get(key)
  if (hit !== undefined) return hit
  const other = me === 'X' ? 'O' : 'X'
  let best = -2
  let empty = false
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    empty = true
    b[i] = me
    const r = won(b) === me ? 1 : -solve(b, other)
    b[i] = null
    if (r > best) best = r
    if (best === 1) break
  }
  const res = empty ? best : 0
  memo.set(key, res)
  return res
}

/** Результат хода в клетку i для того, кто ходит. */
function moveValue(b: Cell[], i: number, me: 'X' | 'O'): number {
  b[i] = me
  const r = won(b) === me ? 1 : -solve(b, me === 'X' ? 'O' : 'X')
  b[i] = null
  return r
}

const immediate = (b: Cell[], who: 'X' | 'O') =>
  b
    .map((c, i) => i)
    .filter((i) => {
      if (b[i]) return false
      b[i] = who
      const w = won(b) === who
      b[i] = null
      return w
    })

function tictactoe(level: Level, rng: Rng, index: number): Draft | null {
  const moves = level === 1 ? rng.int(4, 6) : level === 2 ? rng.int(3, 5) : level === 5 ? rng.int(2, 4) : rng.int(2, 5)
  const b: Cell[] = Array(9).fill(null)
  for (let k = 0; k < moves; k++) {
    const free = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0)
    b[rng.pick(free)] = k % 2 === 0 ? 'X' : 'O'
    if (won(b)) return null
  }
  const me: 'X' | 'O' = moves % 2 === 0 ? 'X' : 'O'
  const other = me === 'X' ? 'O' : 'X'
  const myName = me === 'X' ? 'крестики' : 'нолики'
  const sym = (c: Cell) => (c === 'X' ? '✕' : c === 'O' ? '○' : '')
  const display = { type: 'grid' as const, rows: [0, 1, 2].map((r) => [0, 1, 2].map((c) => sym(b[r * 3 + c]) || String(r * 3 + c + 1))) }
  const free = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0)
  const vals = free.map((i) => moveValue(b, i, me))
  const label = (i: number) => `Клетка ${i + 1}`
  const verdict = (v: number) => (v === 1 ? 'ведёт к победе при правильной игре' : v === 0 ? 'ведёт к ничьей' : 'соперник выигрывает при правильной игре')
  const notes = Object.fromEntries(free.map((i, k) => [label(i), `${label(i)}: ${verdict(vals[k])}.`]))
  const mine = immediate(b, me)
  const theirs = immediate(b, other)
  const head = `Ходят ${myName} (${sym(me)}). Свободные клетки пронумерованы.`
  const key = `${level}:${b.map((c) => c ?? '.').join('')}`
  const opts = (answer: number) => {
    const wrong = rng.shuffle(free.filter((i) => i !== answer))
    // Сначала — «правдоподобные» ошибки: ходы, которые не проигрывают сразу.
    return wrong.map(label)
  }
  if (level === 1) {
    if (mine.length !== 1 || free.length < 3) return null
    return choice(`${head} Куда поставить ${sym(me)}, чтобы выиграть сразу?`, label(mine[0]), opts(mine[0]), rng, 'Ищите линию, где уже стоят два ваших знака и одна клетка свободна.', [`В клетке ${mine[0] + 1} ${myName} замыкают линию из трёх знаков.`], key, { display, notes, ref: 0 }, Math.min(4, free.length))
  }
  if (level === 2) {
    if (mine.length || theirs.length !== 1 || free.length < 3) return null
    const block = theirs[0]
    return choice(`${head} Соперник грозит выиграть. Куда нужно поставить ${sym(me)}?`, label(block), opts(block), rng, 'Найдите линию, где у соперника два знака и одна свободная клетка.', [`У соперника два знака в линии с клеткой ${block + 1}. Любой другой ход — и он выиграет следующим ходом.`, 'Сначала проверяйте свою победу в один ход, потом — угрозы соперника.'], key, { display, notes, ref: 0 }, Math.min(4, free.length))
  }
  if (level === 3) {
    // Вилка: единственный выигрывающий ход, но не мгновенная победа.
    const winMoves = free.filter((_, k) => vals[k] === 1)
    if (mine.length || theirs.length || winMoves.length !== 1 || free.length < 4) return null
    const wm = winMoves[0]
    const gen = myName === 'крестики' ? 'крестиков' : 'ноликов'
    b[wm] = me
    const threats = immediate(b, me)
    let line = `После хода в клетку ${wm + 1} соперник не может помешать: следующим ходом ${myName} создают вилку.`
    if (threats.length >= 2) line = `После хода в клетку ${wm + 1} у ${gen} сразу две угрозы (клетки ${threats.map((x) => x + 1).join(' и ')}) — закрыть обе соперник не успеет.`
    else if (threats.length === 1) {
      const blockAt = threats[0]
      b[blockAt] = other
      const oppThreat = immediate(b, me === 'X' ? 'O' : 'X')
      const cand = oppThreat.length ? oppThreat : b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0)
      const fork = cand.find((i) => {
        b[i] = me
        const two = immediate(b, me).length >= 2
        b[i] = null
        return two
      })
      if (fork !== undefined) {
        b[fork] = me
        const t2 = immediate(b, me)
        b[fork] = null
        line = `Ход в клетку ${wm + 1} создаёт угрозу в клетке ${blockAt + 1}. Соперник вынужден закрыть её, и тогда ход в клетку ${fork + 1} даёт вилку: угрозы в клетках ${t2.map((x) => x + 1).join(' и ')}.`
      }
      b[blockAt] = null
    }
    b[wm] = null
    return choice(`${head} Только один ход гарантирует победу. Какой?`, label(wm), opts(wm), rng, 'Ищите ход, который создаёт сразу две угрозы — «вилку» — или вынуждает соперника защищаться и готовит вилку.', [line, 'Остальные ходы позволяют сопернику удержать ничью или выиграть (см. разбор вариантов).'], key, { display, notes, ref: 1 }, Math.min(4, free.length))
  }
  if (level === 4 || index % 2 === 0) {
    // Единственный ход, который не проигрывает, и это не очевидная защита.
    const safe = free.filter((_, k) => vals[k] >= 0)
    if (mine.length || theirs.length || safe.length !== 1 || free.length < 4) return null
    const s = safe[0]
    return choice(`${head} Все ходы, кроме одного, при правильной игре соперника ведут к поражению. Какой ход спасает партию?`, label(s), opts(s), rng, 'Для каждого хода подумайте: сможет ли соперник ответить вилкой?', [`Ход в клетку ${s + 1} ${verdict(vals[free.indexOf(s)])}.`, 'После любого другого хода соперник создаёт вилку — две угрозы сразу — и выигрывает.', 'Защищаться нужно не только от готовых угроз, но и от будущих вилок.'], key, { display, notes, ref: 1 }, Math.min(4, free.length))
  }
  // Кто выиграет при правильной игре обеих сторон.
  if (mine.length || free.length < 5) return null
  const res = solve(b, me)
  const answer = res === 0 ? 'Ничья' : res === 1 ? (me === 'X' ? 'Выиграют крестики' : 'Выиграют нолики') : me === 'X' ? 'Выиграют нолики' : 'Выиграют крестики'
  if (res === 0 && rng.chance(0.5)) return null
  const bestMoves = free.filter((_, k) => vals[k] === res)
  return choice(`${head} Чем закончится партия, если обе стороны будут играть безошибочно?`, answer, ['Выиграют крестики', 'Выиграют нолики', 'Ничья'].filter((x) => x !== answer), rng, 'Переберите ходы и ответы соперника: метод «минимакс» — вы выбираете лучший ход, соперник — худший для вас.', [`${bestMoves.length > 1 ? 'Лучшие ходы' : 'Лучший ход'} ${myName === 'крестики' ? 'крестиков' : 'ноликов'} — ${bestMoves.length > 1 ? 'в клетки' : 'в клетку'} ${bestMoves.map((x) => x + 1).join(', ')}: ${res === 1 ? 'победа' : res === 0 ? 'ничья' : 'поражение при любом ходе'}.`, res === 0 ? 'Обе стороны могут отбить все угрозы — партия заканчивается вничью.' : res === 1 ? 'Ходящий может создать вилку, от которой нет защиты.' : 'Как бы ни пошли, соперник создаёт вилку.'], `${key}:r`, { display, notes, ref: 2 }, 3)
}

const make = (module: ModuleGenerator['module'], fn: (level: Level, rng: Rng, index: number) => Draft | null): ModuleGenerator => ({ module, targets: T, make: fn })

export const STRATEGY_GAME_GENERATORS: ModuleGenerator[] = [
  make('search', search),
  make('stopping', stopping),
  make('voting', voting),
  make('fairdiv', fairdiv),
  make('negotiation', negotiation),
  make('auctions', auctions),
  make('cooperation', cooperation),
  make('tictactoe', tictactoe),
]
