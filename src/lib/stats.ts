import { CATEGORIES } from '../content/categories'
import { MODULE_BY_ID } from '../content/modules'
import type { TaskRecord } from './merge'
import type { CategoryId, Level, ModuleId, Task } from '../types'
import { TASK_BY_ID, TASKS } from './catalog'
import { dayKey } from './dates'

/**
 * Статистика по направлениям. Записи о задачах хранятся по id: у задач курса
 * тема известна из банка, у новых задач она записана в id (g-тема-уровень-…).
 * Самые первые новые задачи (g-… без темы) появились, когда в курсе была
 * только логика, — их относим к логике.
 */
export function recordTask(id: string): { module: ModuleId | null; level: Level | null; category: CategoryId } {
  const t = TASK_BY_ID.get(id)
  if (t) return { module: t.module, level: t.level, category: MODULE_BY_ID[t.module].category }
  const m = id.match(/^g-([a-z]+)-([1-5])-/)
  if (m && m[1] in MODULE_BY_ID) {
    const module = m[1] as ModuleId
    return { module, level: Number(m[2]) as Level, category: MODULE_BY_ID[module].category }
  }
  return { module: null, level: null, category: 'logic' }
}

export interface CategoryStats {
  xp: number
  /** Решено задач курса и всего задач курса в направлении. */
  solved: number
  total: number
  /** Решено новых (сгенерированных) задач. */
  solvedNew: number
  /** Точность: доля задач, решённых с первой попытки, среди завершённых. */
  accuracy: number
  finished: number
  /** Решено задач по дням. */
  days: Record<string, number>
  lastAt: number
  /** Решено задач 5-го уровня. */
  expert: number
}

const courseTasksOf = (category: CategoryId) => TASKS.filter((t) => MODULE_BY_ID[t.module].category === category)

export function categoryStats(records: Record<string, TaskRecord>, category: CategoryId): CategoryStats {
  const stats: CategoryStats = { xp: 0, solved: 0, total: courseTasksOf(category).length, solvedNew: 0, accuracy: 0, finished: 0, days: {}, lastAt: 0, expert: 0 }
  let clean = 0
  for (const [id, r] of Object.entries(records)) {
    if (!r.solved && !r.revealed) continue
    const info = recordTask(id)
    if (info.category !== category) continue
    stats.finished++
    if (r.firstTry) clean++
    if (!r.solved) continue
    stats.xp += r.xp
    if (id.startsWith('g-')) stats.solvedNew++
    else stats.solved++
    if (info.level === 5) stats.expert++
    if (r.at) {
      const day = dayKey(new Date(r.at))
      stats.days[day] = (stats.days[day] ?? 0) + 1
      stats.lastAt = Math.max(stats.lastAt, r.at)
    }
  }
  stats.accuracy = stats.finished ? Math.round((clean / stats.finished) * 100) : 0
  return stats
}

export function allCategoryStats(records: Record<string, TaskRecord>) {
  return Object.fromEntries(CATEGORIES.map((c) => [c.id, categoryStats(records, c.id)])) as Record<CategoryId, CategoryStats>
}

/** Задачи курса направления. */
export function tasksOfCategory(category: CategoryId): Task[] {
  return courseTasksOf(category)
}
