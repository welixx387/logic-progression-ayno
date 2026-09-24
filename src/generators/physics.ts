import type { Level, Task } from '../types.ts'
import type { Rng } from './rng.ts'
import { collect, type Draft, type ModuleGenerator } from './util.ts'

/** Физика 7–11 классов: уровень 1 = 7 класс. g = 10 м/с², ответы вычисляются. */

const n = (x: number) => String(Math.round(x * 1000) / 1000).replace('.', ',')
const task = (prompt: string, answer: number, hint: string, solution: string, key: string): Draft => ({
  kind: 'number',
  prompt,
  answer: String(Math.round(answer * 1000) / 1000),
  hint,
  solution,
  key,
})

function grade7(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const v = rng.pick([4, 5, 12, 15, 20, 36, 45, 54, 60, 72, 80, 90])
    const h = rng.int(2, 6)
    const what = rng.pick(['Велосипедист', 'Автобус', 'Поезд', 'Турист'])
    return task(
      `${what} проехал ${v * h} км за ${h} ч. С какой средней скоростью он двигался (км/ч)?`,
      v,
      'v = s / t.',
      `v = ${v * h} км : ${h} ч = ${v} км/ч.`,
      `speed:${v}:${h}`,
    )
  }
  if (t === 1) {
    const mats = [
      { name: 'алюминия', rho: 2.7 },
      { name: 'льда', rho: 0.9 },
      { name: 'меди', rho: 8.9 },
      { name: 'стекла', rho: 2.5 },
      { name: 'пробки', rho: 0.24 },
      { name: 'свинца', rho: 11.3 },
    ]
    const m = rng.pick(mats)
    const v = rng.pick([10, 20, 50, 100, 200])
    return task(
      `Брусок из ${m.name} объёмом ${v} см³ имеет массу ${n(m.rho * v)} г. Найдите плотность ${m.name} (г/см³).`,
      m.rho,
      'Плотность — масса одного кубического сантиметра: ρ = m / V.',
      `ρ = ${n(m.rho * v)} г : ${v} см³ = ${n(m.rho)} г/см³.`,
      `rho:${m.name}:${v}`,
    )
  }
  if (t === 2) {
    const mass = rng.pick([20, 30, 40, 50, 60, 80, 100, 120])
    const s = rng.pick([0.1, 0.2, 0.4, 0.5, 0.8, 2])
    const p = (mass * 10) / s
    if (!Number.isInteger(p)) return null
    return task(
      `Ящик массой ${mass} кг стоит на полу. Площадь его опоры ${n(s)} м². Какое давление он оказывает на пол (Па)? Примите g = 10 м/с².`,
      p,
      'p = F / S, где сила давления равна весу: F = mg.',
      `F = ${mass} · 10 = ${mass * 10} Н. p = ${mass * 10} Н : ${n(s)} м² = ${p} Па.`,
      `press:${mass}:${s}`,
    )
  }
  const kind = rng.int(0, 1)
  if (kind === 0) {
    const f = rng.pick([50, 100, 150, 200, 250, 400])
    const s = rng.int(2, 20)
    const tt = rng.pick([5, 10, 20, 25, 50])
    const a = f * s
    if (a % tt) return null
    return task(
      `Под действием силы ${f} Н тело переместилось на ${s} м за ${tt} с. Какую мощность развила сила (Вт)?`,
      a / tt,
      'Сначала найдите работу A = F · s, затем мощность N = A / t.',
      `A = ${f} · ${s} = ${a} Дж. N = ${a} : ${tt} = ${a / tt} Вт.`,
      `power:${f}:${s}:${tt}`,
    )
  }
  const f1 = rng.pick([10, 20, 30, 40, 60])
  const l1 = rng.int(2, 8) * 10
  const l2 = rng.int(1, 6) * 10
  const f2 = (f1 * l1) / l2
  if (!Number.isInteger(f2) || l1 === l2) return null
  return task(
    `На рычаг действует сила ${f1} Н с плечом ${l1} см. Какую силу нужно приложить с плечом ${l2} см, чтобы рычаг был в равновесии (Н)?`,
    f2,
    'Правило рычага: F₁ · l₁ = F₂ · l₂.',
    `F₂ = F₁ · l₁ / l₂ = ${f1} · ${l1} / ${l2} = ${f2} Н.`,
    `lever:${f1}:${l1}:${l2}`,
  )
}

function grade8(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const m = rng.pick([0.5, 1, 2, 3, 5])
    const dt = rng.pick([10, 20, 40, 50, 80])
    const q = (4200 * m * dt) / 1000
    return task(
      `Сколько теплоты (кДж) нужно, чтобы нагреть ${n(m)} кг воды на ${dt} °C? Удельная теплоёмкость воды 4200 Дж/(кг·°C).`,
      q,
      'Q = c · m · Δt. Не забудьте перевести джоули в килоджоули.',
      `Q = 4200 · ${n(m)} · ${dt} = ${n(4200 * m * dt)} Дж = ${n(q)} кДж.`,
      `heat:${m}:${dt}`,
    )
  }
  if (t === 1) {
    const r = rng.pick([2, 4, 5, 6, 8, 10, 12, 20, 40, 50])
    const i = rng.pick([0.2, 0.5, 1, 2, 3, 4])
    const u = r * i
    const findI = rng.chance(0.5)
    return findI
      ? task(`Напряжение на резисторе ${n(u)} В, его сопротивление ${r} Ом. Найдите силу тока (А).`, i, 'Закон Ома: I = U / R.', `I = ${n(u)} В : ${r} Ом = ${n(i)} А.`, `ohmI:${r}:${i}`)
      : task(`Сила тока в резисторе ${n(i)} А при напряжении ${n(u)} В. Найдите сопротивление (Ом).`, r, 'Закон Ома: R = U / I.', `R = ${n(u)} В : ${n(i)} А = ${r} Ом.`, `ohmR:${r}:${i}`)
  }
  if (t === 2) {
    const r1 = rng.pick([2, 3, 4, 5, 6, 10, 12, 15, 20])
    const r2 = rng.pick([2, 3, 4, 5, 6, 10, 12, 15, 20])
    const parallel = rng.chance(0.5)
    if (parallel) {
      const r = (r1 * r2) / (r1 + r2)
      if (!Number.isInteger(r)) return null
      return task(
        `Два резистора ${r1} Ом и ${r2} Ом соединены параллельно. Найдите общее сопротивление (Ом).`,
        r,
        'При параллельном соединении: 1/R = 1/R₁ + 1/R₂, то есть R = R₁R₂ / (R₁ + R₂).',
        `R = ${r1} · ${r2} / (${r1} + ${r2}) = ${r1 * r2} / ${r1 + r2} = ${r} Ом.`,
        `par:${Math.min(r1, r2)}:${Math.max(r1, r2)}`,
      )
    }
    return task(
      `Два резистора ${r1} Ом и ${r2} Ом соединены последовательно. Найдите общее сопротивление (Ом).`,
      r1 + r2,
      'При последовательном соединении сопротивления складываются.',
      `R = ${r1} + ${r2} = ${r1 + r2} Ом.`,
      `ser:${Math.min(r1, r2)}:${Math.max(r1, r2)}`,
    )
  }
  const p = rng.pick([100, 500, 1000, 1500, 2000, 2500])
  const h = rng.int(2, 10)
  const price = rng.pick([5, 6, 7, 8])
  const kwh = (p * h) / 1000
  const cost = kwh * price
  return task(
    `Электрочайник мощностью ${p} Вт работал ${h} ч. Сколько стоит израсходованная энергия (₽), если 1 кВт·ч стоит ${price} ₽?`,
    cost,
    'Энергия W = P · t. Переведите ватты в киловатты.',
    `W = ${n(p / 1000)} кВт · ${h} ч = ${n(kwh)} кВт·ч. Стоимость: ${n(kwh)} · ${price} = ${n(cost)} ₽.`,
    `bill:${p}:${h}:${price}`,
  )
}

function grade9(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const v0 = rng.int(0, 10)
    const a = rng.int(1, 5)
    const tt = rng.int(2, 10)
    const dist = rng.chance(0.5)
    return dist
      ? task(
          `Тело движется равноускоренно: начальная скорость ${v0} м/с, ускорение ${a} м/с². Какой путь (м) оно пройдёт за ${tt} с?`,
          v0 * tt + (a * tt * tt) / 2,
          's = v₀t + at²/2.',
          `s = ${v0} · ${tt} + ${a} · ${tt}² / 2 = ${v0 * tt} + ${n((a * tt * tt) / 2)} = ${n(v0 * tt + (a * tt * tt) / 2)} м.`,
          `path:${v0}:${a}:${tt}`,
        )
      : task(
          `Автомобиль разгоняется с ускорением ${a} м/с² из состояния, когда его скорость ${v0} м/с. Какой будет скорость (м/с) через ${tt} с?`,
          v0 + a * tt,
          'v = v₀ + at.',
          `v = ${v0} + ${a} · ${tt} = ${v0 + a * tt} м/с.`,
          `vel:${v0}:${a}:${tt}`,
        )
  }
  if (t === 1) {
    const m = rng.pick([2, 5, 10, 20, 50, 100, 500, 1000])
    const a = rng.pick([0.5, 1, 2, 3, 4, 5])
    return task(
      `Какая сила (Н) сообщает телу массой ${m} кг ускорение ${n(a)} м/с²?`,
      m * a,
      'Второй закон Ньютона: F = ma.',
      `F = ${m} · ${n(a)} = ${n(m * a)} Н.`,
      `newton:${m}:${a}`,
    )
  }
  if (t === 2) {
    const m1 = rng.pick([1, 2, 3, 4, 5, 6])
    const m2 = rng.pick([1, 2, 3, 4, 5, 6])
    const v1 = rng.pick([2, 3, 4, 5, 6, 8, 10, 12])
    const v = (m1 * v1) / (m1 + m2)
    if (!Number.isInteger(v * 2)) return null
    return task(
      `Тележка массой ${m1} кг, движущаяся со скоростью ${v1} м/с, сцепляется с неподвижной тележкой массой ${m2} кг. С какой скоростью (м/с) они поедут вместе?`,
      v,
      'Закон сохранения импульса: m₁v₁ = (m₁ + m₂)v.',
      `m₁v₁ = ${m1} · ${v1} = ${m1 * v1} кг·м/с. v = ${m1 * v1} : (${m1} + ${m2}) = ${n(v)} м/с.`,
      `impulse:${m1}:${m2}:${v1}`,
    )
  }
  const tt = rng.int(1, 6)
  return task(
    `Камень свободно падает без начальной скорости. Какое расстояние (м) он пролетит за ${tt} с? Сопротивлением воздуха пренебречь, g = 10 м/с².`,
    5 * tt * tt,
    'h = gt²/2.',
    `h = 10 · ${tt}² / 2 = ${5 * tt * tt} м.`,
    `fall:${tt}`,
  )
}

function grade10(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const m = rng.pick([0.2, 0.5, 1, 2, 4, 10, 1000])
    const v = rng.pick([2, 4, 5, 10, 20])
    return task(
      `Найдите кинетическую энергию (Дж) тела массой ${n(m)} кг, движущегося со скоростью ${v} м/с.`,
      (m * v * v) / 2,
      'Eₖ = mv²/2.',
      `Eₖ = ${n(m)} · ${v}² / 2 = ${n((m * v * v) / 2)} Дж.`,
      `ek:${m}:${v}`,
    )
  }
  if (t === 1) {
    const v = rng.pick([10, 20, 30, 40, 50])
    return task(
      `Мяч бросили вертикально вверх со скоростью ${v} м/с. На какую наибольшую высоту (м) он поднимется? Сопротивлением воздуха пренебречь, g = 10 м/с².`,
      (v * v) / 20,
      'По закону сохранения энергии mv²/2 = mgh, откуда h = v²/(2g).',
      `h = ${v}² / (2 · 10) = ${v * v} / 20 = ${n((v * v) / 20)} м.`,
      `up:${v}`,
    )
  }
  if (t === 2) {
    const useful = rng.pick([200, 300, 400, 600, 800, 900])
    const total = rng.pick([500, 1000, 1200, 1500, 2000])
    const eta = (useful / total) * 100
    if (useful >= total || !Number.isInteger(eta)) return null
    return task(
      `Механизм совершил полезную работу ${useful} Дж, а затраченная работа составила ${total} Дж. Найдите КПД механизма (%).`,
      eta,
      'η = Aпол / Aзатр · 100%.',
      `η = ${useful} / ${total} · 100% = ${eta}%.`,
      `eta:${useful}:${total}`,
    )
  }
  const p1 = rng.pick([100, 120, 150, 200])
  const v1 = rng.pick([2, 3, 4, 6, 8, 12])
  const v2 = rng.pick([1, 2, 3, 4, 6])
  const p2 = (p1 * v1) / v2
  if (v1 === v2 || !Number.isInteger(p2)) return null
  return task(
    `Газ при постоянной температуре занимал объём ${v1} л при давлении ${p1} кПа. Каким станет давление (кПа), если объём станет ${v2} л?`,
    p2,
    'Закон Бойля — Мариотта: при постоянной температуре p₁V₁ = p₂V₂.',
    `p₂ = p₁V₁ / V₂ = ${p1} · ${v1} / ${v2} = ${p2} кПа.`,
    `boyle:${p1}:${v1}:${v2}`,
  )
}

function grade11(rng: Rng, t: number): Draft | null {
  if (t === 0) {
    const f = rng.pick([170, 340, 680, 85, 1700])
    return task(
      `Звук частотой ${f} Гц распространяется в воздухе со скоростью 340 м/с. Найдите длину волны (м).`,
      340 / f,
      'λ = v / ν.',
      `λ = 340 / ${f} = ${n(340 / f)} м.`,
      `wave:${f}`,
    )
  }
  if (t === 1) {
    const tHalf = rng.pick([2, 3, 5, 8, 10])
    const k = rng.int(1, 4)
    const n0 = rng.pick([800, 1600, 3200, 6400, 1000])
    const rest = n0 / 2 ** k
    if (!Number.isInteger(rest)) return null
    return task(
      `Период полураспада изотопа — ${tHalf} суток. Было ${n0} ядер. Сколько ядер останется нераспавшимися через ${tHalf * k} суток?`,
      rest,
      'За каждый период полураспада остаётся половина ядер.',
      `${tHalf * k} суток — это ${k} ${k === 1 ? 'период' : 'периода'} полураспада. N = ${n0} / 2${'⁰¹²³⁴'[k]} = ${rest}.`,
      `half:${tHalf}:${k}:${n0}`,
    )
  }
  if (t === 2) {
    const u1 = rng.pick([220, 110, 380])
    const n1 = rng.pick([1000, 2000, 500, 1100])
    const n2 = rng.pick([50, 100, 200, 250, 5000, 4000])
    const u2 = (u1 * n2) / n1
    if (!Number.isInteger(u2)) return null
    return task(
      `Первичная обмотка трансформатора содержит ${n1} витков и подключена к напряжению ${u1} В. Во вторичной обмотке ${n2} витков. Каково напряжение на вторичной обмотке (В)?`,
      u2,
      'U₁ / U₂ = N₁ / N₂.',
      `U₂ = U₁ · N₂ / N₁ = ${u1} · ${n2} / ${n1} = ${u2} В.`,
      `trans:${u1}:${n1}:${n2}`,
    )
  }
  const F = rng.pick([5, 10, 12, 15, 20])
  const d = F + rng.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30])
  const f = (d * F) / (d - F)
  if (!Number.isInteger(f)) return null
  return task(
    `Предмет находится на расстоянии ${d} см от собирающей линзы с фокусным расстоянием ${F} см. На каком расстоянии (см) от линзы получится изображение?`,
    f,
    'Формула тонкой линзы: 1/F = 1/d + 1/f.',
    `1/f = 1/${F} − 1/${d} = ${d - F}/${d * F}, f = ${d * F}/${d - F} = ${f} см.`,
    `lens:${F}:${d}`,
  )
}

const GRADES = [grade7, grade8, grade9, grade10, grade11]

function generate(level: Level, rng: Rng, index: number): Draft | null {
  return GRADES[level - 1](rng, index % 4)
}

export const physicsGenerator: ModuleGenerator = {
  module: 'physics',
  targets: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 },
  make: generate,
}

export function physics(): Task[] {
  return collect(physicsGenerator)
}
