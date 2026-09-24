import type { CategoryId } from '../types'

export interface CategoryInfo {
  id: CategoryId
  title: string
  /** Короткое название для вкладок. */
  tab: string
  short: string
  description: string
  /** Классы цвета направления (Tailwind). */
  text: string
  bg: string
  soft: string
  border: string
  /** Три оттенка для карты активности — от слабого к сильному. */
  tones: [string, string, string]
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'logic',
    title: 'Логическое мышление',
    tab: 'Логика',
    short: 'Закономерности, выводы и головоломки.',
    description: 'Числовые и буквенные ряды, силлогизмы, рыцари и лжецы, задачи Эйнштейна — умение рассуждать строго и находить закономерности.',
    text: 'text-cat-logic',
    bg: 'bg-cat-logic',
    soft: 'bg-cat-logic/10',
    border: 'border-cat-logic/40',
    tones: ['bg-cat-logic/30', 'bg-cat-logic/60', 'bg-cat-logic'],
  },
  {
    id: 'strategy',
    title: 'Стратегическое мышление',
    tab: 'Стратегия',
    short: 'Думать на ходы вперёд и выбирать лучший план.',
    description: 'Игры с выигрышной стратегией, планирование и критический путь, выгодные решения и ходы с учётом ответа соперника.',
    text: 'text-cat-strategy',
    bg: 'bg-cat-strategy',
    soft: 'bg-cat-strategy/10',
    border: 'border-cat-strategy/40',
    tones: ['bg-cat-strategy/30', 'bg-cat-strategy/60', 'bg-cat-strategy'],
  },
  {
    id: 'analytics',
    title: 'Аналитическое мышление',
    tab: 'Анализ',
    short: 'Данные, проценты, вероятности и выводы.',
    description: 'Таблицы и диаграммы, проценты и доли, вероятность, средние величины — умение разбирать данные и не попадаться на ловушки.',
    text: 'text-cat-analytics',
    bg: 'bg-cat-analytics',
    soft: 'bg-cat-analytics/10',
    border: 'border-cat-analytics/40',
    tones: ['bg-cat-analytics/30', 'bg-cat-analytics/60', 'bg-cat-analytics'],
  },
  {
    id: 'emotional',
    title: 'Эмоциональное мышление',
    tab: 'Эмоции',
    short: 'Понимать и направлять чувства — свои и чужие.',
    description: 'Эмоциональный интеллект: словарь эмоций, распознавание чувств, управление эмоциями, эмпатия и общение.',
    text: 'text-cat-emotional',
    bg: 'bg-cat-emotional',
    soft: 'bg-cat-emotional/10',
    border: 'border-cat-emotional/40',
    tones: ['bg-cat-emotional/30', 'bg-cat-emotional/60', 'bg-cat-emotional'],
  },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryInfo>

export const isCategory = (value: string | null | undefined): value is CategoryId => CATEGORIES.some((c) => c.id === value)
