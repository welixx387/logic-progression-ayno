import type { Level } from '../types'

export interface LevelInfo {
  id: Level
  name: string
  tag: string
  description: string
  /** Опыт за задачу, решённую с первой попытки. */
  xp: number
  /** Класс цвета уровня (Tailwind). */
  text: string
  bg: string
}

export const LEVELS: LevelInfo[] = [
  {
    id: 1,
    name: 'Разминка',
    tag: 'для всех, от 10 лет',
    description: 'Задачи в один шаг. Подходит для первого знакомства с темой.',
    xp: 10,
    text: 'text-lvl1',
    bg: 'bg-lvl1',
  },
  {
    id: 2,
    name: 'Базовый',
    tag: 'нужно внимание',
    description: 'Два-три шага рассуждения: нужно удерживать в голове несколько условий сразу.',
    xp: 15,
    text: 'text-lvl2',
    bg: 'bg-lvl2',
  },
  {
    id: 3,
    name: 'Средний',
    tag: 'нужна система',
    description: 'Комбинации правил и ловушки для невнимательных. Здесь особенно пригодится теория.',
    xp: 25,
    text: 'text-lvl3',
    bg: 'bg-lvl3',
  },
  {
    id: 4,
    name: 'Продвинутый',
    tag: 'для сильных',
    description: 'Многошаговые рассуждения, скрытые закономерности и тонкие различия.',
    xp: 40,
    text: 'text-lvl4',
    bg: 'bg-lvl4',
  },
  {
    id: 5,
    name: 'Эксперт',
    tag: 'олимпиадный уровень',
    description: 'Минимум подсказок — максимум мышления. Задачи уровня олимпиад и сложных тестов.',
    xp: 60,
    text: 'text-lvl5',
    bg: 'bg-lvl5',
  },
]

export const levelInfo = (level: number) => LEVELS[Math.min(Math.max(level, 1), 5) - 1]

/** Класс для уровня в школьном направлении: 1 → 7 … 5 → 11. */
export const gradeOf = (level: number) => level + 6

/** Подпись уровня: «Уровень 2 · Базовый» или «8 класс». */
export function levelLabel(level: number, grades = false): string {
  return grades ? `${gradeOf(level)} класс` : `Уровень ${levelInfo(level).id} · ${levelInfo(level).name}`
}

/** Короткая подпись: «2» или «8 кл.». */
export function levelShort(level: number, grades = false): string {
  return grades ? `${gradeOf(level)} кл.` : String(level)
}

export interface Rank {
  xp: number
  name: string
}

export const RANKS: Rank[] = [
  { xp: 0, name: 'Новичок' },
  { xp: 100, name: 'Любознательный' },
  { xp: 300, name: 'Наблюдатель' },
  { xp: 700, name: 'Логик' },
  { xp: 1500, name: 'Аналитик' },
  { xp: 3000, name: 'Стратег' },
  { xp: 6000, name: 'Мастер логики' },
  { xp: 10000, name: 'Гений ayno' },
]

export function rankFor(xp: number) {
  let index = 0
  RANKS.forEach((r, i) => {
    if (xp >= r.xp) index = i
  })
  const current = RANKS[index]
  const next = RANKS[index + 1] ?? null
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1
  return { current, next, progress, index }
}
